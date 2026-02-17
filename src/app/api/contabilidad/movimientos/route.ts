import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movimientosContables, categoriasCuentas, banks, cuentasBancarias, cajas } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") || "gasto";

    const movimientos = await db
      .select({
        id: movimientosContables.id,
        tipo: movimientosContables.tipo,
        monto: movimientosContables.monto,
        categoriaId: movimientosContables.categoriaId,
        categoriaNombre: categoriasCuentas.nombre,
        categoriaCodigo: categoriasCuentas.codigo,
        metodo: movimientosContables.metodo,
        cajaId: movimientosContables.cajaId,
        cajaNombre: cajas.nombre,
        bankId: movimientosContables.bankId,
        bankNombre: banks.nombre,
        cuentaBancariaId: movimientosContables.cuentaBancariaId,
        cuentaBancariaNombre: cuentasBancarias.numeroCuenta,
        descripcion: movimientosContables.descripcion,
        fecha: movimientosContables.fecha,
        usuarioId: movimientosContables.usuarioId,
        cuentaPorPagarId: movimientosContables.cuentaPorPagarId,
        createdAt: movimientosContables.createdAt,
      })
      .from(movimientosContables)
      .leftJoin(categoriasCuentas, eq(movimientosContables.categoriaId, categoriasCuentas.id))
      .leftJoin(banks, eq(movimientosContables.bankId, banks.id))
      .leftJoin(cuentasBancarias, eq(movimientosContables.cuentaBancariaId, cuentasBancarias.id))
      .leftJoin(cajas, eq(movimientosContables.cajaId, cajas.id))
      .where(eq(movimientosContables.tipo, tipo))
      .orderBy(desc(movimientosContables.fecha));

    return NextResponse.json({ success: true, data: movimientos });
  } catch (error: any) {
    console.error("Error fetching movimientos:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tipo,
      monto,
      categoriaId,
      metodo,
      cajaId,
      bankId,
      cuentaBancariaId,
      descripcion,
      fecha,
      usuarioId,
      cuentaPorPagarId,
    } = body;

    if (!tipo || !monto || !categoriaId || !metodo || !usuarioId) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos requeridos: tipo, monto, categoriaId, metodo, usuarioId",
        },
        { status: 400 },
      );
    }

    const newMovimiento = await db
      .insert(movimientosContables)
      .values({
        tipo,
        monto: String(monto),
        categoriaId,
        metodo,
        cajaId: cajaId || null,
        bankId: bankId || null,
        cuentaBancariaId: cuentaBancariaId || null,
        descripcion: descripcion || null,
        fecha: fecha || new Date().toISOString(),
        usuarioId,
        cuentaPorPagarId: cuentaPorPagarId || null,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ success: true, data: newMovimiento[0] });
  } catch (error: any) {
    console.error("Error creating movimiento:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      tipo,
      monto,
      categoriaId,
      metodo,
      cajaId,
      bankId,
      cuentaBancariaId,
      descripcion,
      fecha,
      cuentaPorPagarId,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const updated = await db
      .update(movimientosContables)
      .set({
        tipo,
        monto: String(monto),
        categoriaId,
        metodo,
        cajaId: cajaId || null,
        bankId: bankId || null,
        cuentaBancariaId: cuentaBancariaId || null,
        descripcion: descripcion || null,
        fecha: fecha || undefined,
        cuentaPorPagarId: cuentaPorPagarId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(movimientosContables.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("Error updating movimiento:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    await db.delete(movimientosContables).where(eq(movimientosContables.id, id));

    return NextResponse.json({ success: true, message: "Movimiento eliminado" });
  } catch (error: any) {
    console.error("Error deleting movimiento:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
