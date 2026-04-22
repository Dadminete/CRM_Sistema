import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { format } from "date-fns";

import { db } from "@/lib/db";
import {
  cajas,
  cuentasBancarias,
  cuentasContables,
  movimientosContables,
  traspasos,
  categoriasCuentas,
} from "@/lib/db/schema";
import { withAuth } from "@/lib/api-auth";
import { getTotalCount, createPaginationMeta, getPaginationOffset } from "@/lib/pagination";
import { jsonResponse } from "@/lib/serializers";


type TransferBody = {
  monto: number;
  concepto: string;
  fecha?: string;
  origenTipo: "caja" | "banco";
  origenId: string;
  destinoTipo: "caja" | "banco";
  destinoId: string;
};

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

async function getTraspasoCategoryId(tx = db) {
  const row = await tx
    .select({ id: categoriasCuentas.id })
    .from(categoriasCuentas)
    .where(eq(categoriasCuentas.codigo, "TRASP-001"))
    .limit(1);
  if (row.length) return row[0].id;

  const [created] = await tx
    .insert(categoriasCuentas)
    .values({
      codigo: "TRASP-001",
      nombre: "Traspasos",
      tipo: "Transferencia",
      subtipo: "Interna",
      esDetalle: true,
      activa: true,
      nivel: 1,
    })
    .returning({ id: categoriasCuentas.id });

  return created.id;
}

async function generateNumeroTraspaso(tx = db) {
  const prefix = `TR-${format(new Date(), "yyyyMM")}-`;
  const last = await tx.execute(
    sql`SELECT numero_traspaso FROM traspasos WHERE numero_traspaso LIKE ${prefix + "%"} ORDER BY numero_traspaso DESC LIMIT 1`,
  );
  const lastNum = (last.rows?.[0] as any)?.numero_traspaso as string | undefined;
  const seq = lastNum ? parseInt(lastNum.slice(-5), 10) + 1 : 1;
  return `${prefix}${seq.toString().padStart(5, "0")}`;
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : (pageParam - 1) * limit;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters = [] as any[];
    if (from) filters.push(gte(traspasos.fechaTraspaso, from));
    if (to) filters.push(lte(traspasos.fechaTraspaso, to));

    const rows = await db
      .select({
        id: traspasos.id,
        numero: traspasos.numeroTraspaso,
        fecha: traspasos.fechaTraspaso,
        monto: traspasos.monto,
        moneda: traspasos.moneda,
        concepto: traspasos.conceptoTraspaso,
        estado: traspasos.estado,
        cajaOrigenId: traspasos.cajaOrigenId,
        cajaDestinoId: traspasos.cajaDestinoId,
        bancoOrigenId: traspasos.bancoOrigenId,
        bancoDestinoId: traspasos.bancoDestinoId,
        autorizadoPor: traspasos.autorizadoPor,
      })
      .from(traspasos)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(traspasos.fechaTraspaso))
      .limit(limit)
      .offset(offset);

    const total = await getTotalCount(traspasos, filters.length ? and(...filters) : undefined);
    const page = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: createPaginationMeta(page, limit, total),
    });

  } catch (error: any) {
    console.error("GET /api/traspasos error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = (await request.json()) as TransferBody;
    const { monto, concepto, origenTipo, origenId, destinoTipo, destinoId } = body;
    const fechaTraspaso = body.fecha || new Date().toISOString();

    if (!monto || Number(monto) <= 0) return badRequest("El monto debe ser mayor a 0.");
    if (!concepto || !concepto.trim()) return badRequest("El concepto es requerido.");
    const autorizadoPorId = user.id;
    if (!origenId || !destinoId) return badRequest("Debes indicar origen y destino.");
    if (origenTipo === destinoTipo && origenId === destinoId) return badRequest("Origen y destino no pueden ser iguales.");

    const categoriaId = await getTraspasoCategoryId();
    const numero = await generateNumeroTraspaso();

    console.log(`Iniciando traspaso ${numero}: $${monto} de ${origenTipo}:${origenId} a ${destinoTipo}:${destinoId}`);

    const result = await db.transaction(async (tx) => {
      let origenCuentaContableId: string | null = null;
      let destinoCuentaContableId: string | null = null;
      let bankOrigenId: string | null = null;
      let bankDestinoId: string | null = null;

      if (origenTipo === "caja") {
        const rows = await tx.select().from(cajas).where(eq(cajas.id, origenId)).limit(1);
        if (!rows.length) throw new Error("Caja origen no encontrada");
        origenCuentaContableId = rows[0].cuentaContableId ?? null;
      } else {
        const rows = await tx.select().from(cuentasBancarias).where(eq(cuentasBancarias.id, origenId)).limit(1);
        if (!rows.length) throw new Error("Cuenta bancaria origen no encontrada");
        origenCuentaContableId = rows[0].cuentaContableId;
        bankOrigenId = rows[0].bankId;
      }

      if (destinoTipo === "caja") {
        const rows = await tx.select().from(cajas).where(eq(cajas.id, destinoId)).limit(1);
        if (!rows.length) throw new Error("Caja destino no encontrada");
        destinoCuentaContableId = rows[0].cuentaContableId ?? null;
      } else {
        const rows = await tx.select().from(cuentasBancarias).where(eq(cuentasBancarias.id, destinoId)).limit(1);
        if (!rows.length) throw new Error("Cuenta bancaria destino no encontrada");
        destinoCuentaContableId = rows[0].cuentaContableId;
        bankDestinoId = rows[0].bankId;
      }

      // Insertar traspaso
      const [created] = await tx
        .insert(traspasos)
        .values({
          numeroTraspaso: numero,
          fechaTraspaso,
          monto: String(monto),
          moneda: "DOP",
          conceptoTraspaso: concepto,
          cajaOrigenId: origenTipo === "caja" ? origenId : null,
          cajaDestinoId: destinoTipo === "caja" ? destinoId : null,
          bancoOrigenId: origenTipo === "banco" ? origenId : null,
          bancoDestinoId: destinoTipo === "banco" ? destinoId : null,
          estado: "completado",
          autorizadoPor: autorizadoPorId,
          createdAt: fechaTraspaso,
        })
        .returning();

      const descripcion = `Traspaso ${numero}: ${concepto}`;

      // Mov origen (salida como gasto)
      await tx.insert(movimientosContables).values({
        tipo: "gasto",
        monto: String(monto),
        categoriaId,
        metodo: origenTipo === "banco" ? "banco" : "caja",
        cajaId: origenTipo === "caja" ? origenId : null,
        bankId: bankOrigenId,
        cuentaBancariaId: origenTipo === "banco" ? origenId : null,
        descripcion,
        fecha: fechaTraspaso,
        usuarioId: autorizadoPorId,
        createdAt: fechaTraspaso,
        updatedAt: fechaTraspaso,
      });

      // Mov destino (entrada como ingreso)
      await tx.insert(movimientosContables).values({
        tipo: "ingreso",
        monto: String(monto),
        categoriaId,
        metodo: destinoTipo === "banco" ? "banco" : "caja",
        cajaId: destinoTipo === "caja" ? destinoId : null,
        bankId: bankDestinoId,
        cuentaBancariaId: destinoTipo === "banco" ? destinoId : null,
        descripcion,
        fecha: fechaTraspaso,
        usuarioId: autorizadoPorId,
        createdAt: fechaTraspaso,
        updatedAt: fechaTraspaso,
      });

      // Ajuste de saldos (usando cast decimal para mayor seguridad con numeric)
      if (origenTipo === "caja") {
        await tx.execute(sql`UPDATE cajas SET saldo_actual = (saldo_actual::numeric - ${monto}::numeric)::numeric WHERE id = ${origenId}`);
      } else if (origenCuentaContableId) {
        await tx.execute(
          sql`UPDATE cuentas_contables SET saldo_actual = (saldo_actual::numeric - ${monto}::numeric)::numeric WHERE id = ${origenCuentaContableId}`,
        );
      }

      if (destinoTipo === "caja") {
        await tx.execute(sql`UPDATE cajas SET saldo_actual = (saldo_actual::numeric + ${monto}::numeric)::numeric WHERE id = ${destinoId}`);
      } else if (destinoCuentaContableId) {
        await tx.execute(
          sql`UPDATE cuentas_contables SET saldo_actual = (saldo_actual::numeric + ${monto}::numeric)::numeric WHERE id = ${destinoCuentaContableId}`,
        );
      }

      console.log(`Traspaso ${numero} completado exitosamente.`);
      return created;
    });

    return jsonResponse({ success: true, data: result });
  } catch (error: any) {
    console.error("POST /api/traspasos error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
});