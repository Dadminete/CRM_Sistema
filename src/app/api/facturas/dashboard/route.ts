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

    const recientes = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        fechaFactura: facturasClientes.fechaFactura,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        estado: facturasClientes.estado,
        total: facturasClientes.total,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .orderBy(desc(facturasClientes.fechaFactura), desc(facturasClientes.createdAt))
      .limit(10);

    const vencidas = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        fechaVencimiento: cuentasPorCobrar.fechaVencimiento,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        diasVencido: cuentasPorCobrar.diasVencido,
        estado: facturasClientes.estado,
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .innerJoin(clientes, eq(cuentasPorCobrar.clienteId, clientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), gte(cuentasPorCobrar.diasVencido, 1)))
      .orderBy(desc(cuentasPorCobrar.diasVencido), asc(cuentasPorCobrar.fechaVencimiento))
      .limit(10);

    const [pendienteGlobal] = await db
      .select({
        monto: sumField(cuentasPorCobrar.montoPendiente, "monto"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          gt(cuentasPorCobrar.montoPendiente, "0"),
          or(
            ...PENDING_STATES.map((state) => ilike(facturasClientes.estado, state)),
            ...PARTIAL_STATES.map((state) => ilike(facturasClientes.estado, state)),
            ...ADVANCE_STATES.map((state) => ilike(facturasClientes.estado, state))
          )
        )
      );

    const [pagadasMes] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(
        and(
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
          or(...PAID_STATES.map((state) => ilike(facturasClientes.estado, state)))
        )
      );

    return jsonResponse({
      success: true,
      data: {
        resumen: {
          totalFacturas: Number(totals?.totalFacturas || 0),
          montoFacturado: Number(totals?.montoFacturado || 0),
          facturasPendientes: Number(pendientes?.count || 0),
          montoPendiente: Number(pendientes?.montoPendiente || 0),
          facturasParciales: Number(parciales?.count || 0),
          montoParcialPendiente: Number(parciales?.montoPendiente || 0),
          facturasAdelantadas: Number(adelantadas?.count || 0),
          montoAdelantadoPendiente: Number(adelantadas?.montoPendiente || 0),
          facturasPagadas: Number(pagadas?.count || 0),
          montoPagado: Number(pagadas?.monto || 0),
          facturasAnuladas: Number(anuladas?.count || 0),
          montoAnulado: Number(anuladas?.monto || 0),
          cobradoMesActual: Number(cobradoMes?.monto || 0),
          facturadoMesActual: Number(facturadoMes?.monto || 0),
          montoPendienteGlobal: Number(pendienteGlobal?.monto || 0),
          pagadasMesActual: {
            count: Number(pagadasMes?.count || 0),
            monto: Number(pagadasMes?.monto || 0),
          },
        },
        topDeudores,
        recientes,
        vencidas,
      },
    });
  } catch (error: any) {
    console.error("Error fetching facturas dashboard:", error);
    return NextResponse.json({ success: false, error: error.message ?? "Internal error" }, { status: 500 });
  }
}
