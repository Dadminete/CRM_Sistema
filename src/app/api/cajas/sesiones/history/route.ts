import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sesionesCaja, cajas, usuarios, movimientosContables, categoriasCuentas } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, or, nvl, ne } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get("cajaId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const traspasoCat = await db
      .select({ id: categoriasCuentas.id })
      .from(categoriasCuentas)
      .where(eq(categoriasCuentas.codigo, "TRASP-001"))
      .limit(1);
    const traspasoCatId = traspasoCat[0]?.id ?? null;

    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let baseQuery = db
      .select({
        id: sesionesCaja.id,
        cajaId: sesionesCaja.cajaId,
        usuarioId: sesionesCaja.usuarioId,
        fechaApertura: sesionesCaja.fechaApertura,
        fechaCierre: sesionesCaja.fechaCierre,
        montoApertura: sesionesCaja.montoApertura,
        montoCierre: sesionesCaja.montoCierre,
        estado: sesionesCaja.estado,
        observaciones: sesionesCaja.observaciones,
        cajaNombre: cajas.nombre,
        usuarioNombre: usuarios.nombre,
      })
      .from(sesionesCaja)
      .leftJoin(cajas, eq(sesionesCaja.cajaId, cajas.id))
      .leftJoin(usuarios, eq(sesionesCaja.usuarioId, usuarios.id));

    const filters = [];
    if (cajaId) filters.push(eq(sesionesCaja.cajaId, cajaId));
    if (startDate) filters.push(gte(sesionesCaja.fechaApertura, startDate));
    if (endDate) filters.push(lte(sesionesCaja.fechaApertura, endDate));

    if (filters.length > 0) {
      baseQuery.where(and(...filters));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sesionesCaja)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const sessions = await baseQuery.orderBy(desc(sesionesCaja.fechaApertura)).limit(limit).offset(offset);

    // Para cada sesión, calculamos ingresos y gastos
    const detailedSessions = await Promise.all(
      sessions.map(async (s) => {
        const isOpen = s.estado === "abierta";
        const rangeStart = s.fechaApertura;
        const rangeEnd = s.fechaCierre;

        const baseFilters = [eq(movimientosContables.cajaId, s.cajaId), gte(movimientosContables.fecha, rangeStart)];

        if (!isOpen && rangeEnd) {
          baseFilters.push(lte(movimientosContables.fecha, rangeEnd));
        }

        const { inArray } = require('drizzle-orm');
        const [ingresos, gastos] = await Promise.all([
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(and(...baseFilters, inArray(movimientosContables.tipo, ['ingreso', 'traspaso']))),
          db
            .select({ total: sql<string>`COALESCE(SUM(monto), 0)` })
            .from(movimientosContables)
            .where(and(...baseFilters, inArray(movimientosContables.tipo, ['gasto', 'egreso']))),
        ]);

        // Note: the above query is inefficient inside a map, let's optimize it.
        // But for now, let's fix the cajaId access.
        // Correction: sessions already has access to cajaId if I select it.
        return {
          ...s,
          totalIngresos: parseFloat(ingresos[0].total),
          totalGastos: parseFloat(gastos[0].total),
        };
      }),
    );

    // Optimized approach would be better, but let's first refine the selected fields
    return NextResponse.json({
      success: true,
      data: detailedSessions,
      pagination: {
        total: totalCount[0].count,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error("Error fetching session history:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, montoApertura, montoCierre, observaciones } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de sesión requerido" }, { status: 400 });
    }

    await db
      .update(sesionesCaja)
      .set({
        montoApertura: montoApertura ? montoApertura.toString() : undefined,
        montoCierre: montoCierre ? montoCierre.toString() : undefined,
        observaciones,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sesionesCaja.id, id));

    return NextResponse.json({ success: true, message: "Sesión actualizada correctamente" });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
