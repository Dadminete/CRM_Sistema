import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientes, cuentasPorCobrar, facturasClientes, pagosClientes } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, gt, ilike, lt, or, sql } from "drizzle-orm";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const PAID_STATES = ["pagada", "pagado"];
const PENDING_STATES = ["pendiente", "PENDIENTE"];
const PARTIAL_STATES = ["parcial", "pago parcial", "parcialmente pagada", "pago parcial"];
const ADVANCE_STATES = ["adelantado", "pago adelantado", "adelantada", "pago adelantado"];
const VOID_STATES = ["anulada", "anulado", "cancelada", "cancelado"];

const sumField = (field: any, alias: string) => sql<string>`COALESCE(SUM(${field}), 0)`.as(alias);

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totals] = await db
      .select({
        totalFacturas: sql<number>`COUNT(*)::int`.as("total_facturas"),
        montoFacturado: sumField(facturasClientes.total, "monto_facturado"),
      })
      .from(facturasClientes);

    const [pendientes] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), or(...PENDING_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const [parciales] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), or(...PARTIAL_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const [adelantadas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), or(...ADVANCE_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const [pagadas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(or(...PAID_STATES.map((state) => ilike(facturasClientes.estado, state))));

    const [anuladas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(or(...VOID_STATES.map((state) => ilike(facturasClientes.estado, state))));

    const [cobradoMes] = await db
      .select({
        monto: sumField(pagosClientes.monto, "monto"),
      })
      .from(pagosClientes)
      .where(and(gte(pagosClientes.fechaPago, monthStart.toISOString().split("T")[0]), lt(pagosClientes.fechaPago, nextMonthStart.toISOString().split("T")[0])));

    const [facturadoMes] = await db
      .select({
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(and(gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]), lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0])));

    const topDeudoresRaw = await db
      .select({
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        facturaEstado: facturasClientes.estado,
        montoPendiente: cuentasPorCobrar.montoPendiente,
      })
      .from(cuentasPorCobrar)
      .innerJoin(clientes, eq(cuentasPorCobrar.clienteId, clientes.id))
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(gt(cuentasPorCobrar.montoPendiente, "0"));

    // Procesar agrupamiento manual para mayor detalle
    const topDeudoresMap = new Map<string, any>();
    topDeudoresRaw.forEach(row => {
      if (!topDeudoresMap.has(row.clienteId)) {
        topDeudoresMap.set(row.clienteId, {
          clienteId: row.clienteId,
          clienteNombre: row.clienteNombre,
          clienteApellidos: row.clienteApellidos,
          facturasPendientes: 0,
          facturasParciales: 0,
          facturasAdelantadas: 0,
          deudaTotal: 0
        });
      }
      const data = topDeudoresMap.get(row.clienteId);
      data.deudaTotal += Number(row.montoPendiente);
      if (PARTIAL_STATES.includes(row.facturaEstado)) {
        data.facturasParciales++;
      } else if (ADVANCE_STATES.includes(row.facturaEstado)) {
        data.facturasAdelantadas++;
      } else {
        data.facturasPendientes++;
      }
    });

    const topDeudores = Array.from(topDeudoresMap.values())
      .sort((a, b) => b.deudaTotal - a.deudaTotal)
      .slice(0, 10);

    // Current Month Specific Totals
    const [pendientesMes] = await db
      .select({ count: sql<number>`COUNT(*)::int`.as("count"), monto: sumField(cuentasPorCobrar.montoPendiente, "monto") })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]), lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]), gt(cuentasPorCobrar.montoPendiente, "0"), or(...PENDING_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const [parcialesMes] = await db
      .select({ count: sql<number>`COUNT(*)::int`.as("count"), monto: sumField(cuentasPorCobrar.montoPendiente, "monto") })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]), lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]), gt(cuentasPorCobrar.montoPendiente, "0"), or(...PARTIAL_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const [adelantadasMes] = await db
      .select({ count: sql<number>`COUNT(*)::int`.as("count"), monto: sumField(cuentasPorCobrar.montoPendiente, "monto") })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]), lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]), gt(cuentasPorCobrar.montoPendiente, "0"), or(...ADVANCE_STATES.map((state) => ilike(facturasClientes.estado, state)))));

    const recientes = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        fechaFactura: facturasClientes.fechaFactura,
        estado: facturasClientes.estado,
        total: facturasClientes.total,
        ultimaFechaPago: sql<string>`MAX(${pagosClientes.fechaPago})`.as("ultima_fecha_pago"),
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .leftJoin(pagosClientes, eq(facturasClientes.id, pagosClientes.facturaId))
      .groupBy(facturasClientes.id, clientes.id)
      .orderBy(sql`ultima_fecha_pago DESC NULLS LAST`, desc(facturasClientes.fechaFactura))
      .limit(20);

    const tendenciaCobros = await db
      .select({
        dia: sql<string>`TO_CHAR(${pagosClientes.fechaPago}, 'YYYY-MM-DD')`.as("dia"),
        monto: sumField(pagosClientes.monto, "monto"),
      })
      .from(pagosClientes)
      .where(
        and(
          gte(pagosClientes.fechaPago, monthStart.toISOString().split("T")[0]),
          lt(pagosClientes.fechaPago, nextMonthStart.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`dia`)
      .orderBy(asc(sql`dia`));

    return jsonResponse({
      success: true,
      data: {
        resumen: {
          // Mobile Specific (Matching FacturasScreen.tsx expectations)
          facturadoMesActual: Number(facturadoMes?.monto || 0),
          cobradoMesActual: Number(cobradoMes?.monto || 0),
          montoPendienteGlobal: Number(pendientes?.montoPendiente || 0),
          montoAdelantadoPendiente: Number(adelantadas?.montoPendiente || 0),
          facturasParciales: Number(parciales?.count || 0),
          
          // Original/Legacy fields for web compat
          montoFacturadoMes: Number(facturadoMes?.monto || 0),
          montoPagadoMes: Number(cobradoMes?.monto || 0),
          montoPendienteMes: Number(pendientesMes?.monto || 0),
          montoParcialMes: Number(parcialesMes?.monto || 0),
          montoAdelantadoMes: Number(adelantadasMes?.monto || 0),
          facturasPendientesMes: Number(pendientesMes?.count || 0),
          facturasParcialesMes: Number(parcialesMes?.count || 0),
          facturasAdelantadasMes: Number(adelantadasMes?.count || 0),

          // Daily Trend
          tendenciaCobros: tendenciaCobros.map(t => ({
            dia: t.dia,
            monto: Number(t.monto)
          })),
        },
        recientes,
      },
    });
  } catch (error: any) {
    console.error("Error fetching facturas dashboard:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
}
