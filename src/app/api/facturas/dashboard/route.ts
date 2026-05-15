import { NextResponse } from "next/server";

import { and, asc, desc, eq, gte, gt, ilike, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes, cuentasPorCobrar, facturasClientes, pagosClientes } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAID_STATES = ["pagada", "pagado"];
const PENDING_STATES = ["pendiente"];
const PARTIAL_STATES = ["parcial", "pago parcial", "parcialmente pagada"];
const ADVANCE_STATES = ["adelantado", "pago adelantado", "adelantada"];
const VOID_STATES = ["anulada", "anulado", "cancelada", "cancelado"];

interface TopDeudorAgg {
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string | null;
  facturasPendientes: number;
  facturasParciales: number;
  facturasAdelantadas: number;
  deudaTotal: number;
}

const sumField = (field: unknown, alias: string) => sql<string>`COALESCE(SUM(${field as never}), 0)`.as(alias);
const hasAnyState = (field: unknown, states: string[]) => or(...states.map((state) => ilike(field as never, state)));

// eslint-disable-next-line complexity
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
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), hasAnyState(facturasClientes.estado, PENDING_STATES)));

    const [parciales] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), hasAnyState(facturasClientes.estado, PARTIAL_STATES)));

    const [adelantadas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(and(gt(cuentasPorCobrar.montoPendiente, "0"), hasAnyState(facturasClientes.estado, ADVANCE_STATES)));

    const [pendienteGlobal] = await db
      .select({
        montoPendiente: sumField(cuentasPorCobrar.montoPendiente, "monto_pendiente"),
      })
      .from(cuentasPorCobrar)
      .where(gt(cuentasPorCobrar.montoPendiente, "0"));

    const [pagadas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(hasAnyState(facturasClientes.estado, PAID_STATES));

    const [pagadasMes] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(
        and(
          hasAnyState(facturasClientes.estado, PAID_STATES),
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
        ),
      );

    const [anuladas] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(hasAnyState(facturasClientes.estado, VOID_STATES));

    const [cobradoMes] = await db
      .select({
        monto: sumField(pagosClientes.monto, "monto"),
      })
      .from(pagosClientes)
      .where(
        and(
          gte(pagosClientes.fechaPago, monthStart.toISOString().split("T")[0]),
          lt(pagosClientes.fechaPago, nextMonthStart.toISOString().split("T")[0]),
        ),
      );

    const [facturadoMes] = await db
      .select({
        monto: sumField(facturasClientes.total, "monto"),
      })
      .from(facturasClientes)
      .where(
        and(
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
        ),
      );

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
    const topDeudoresMap = new Map<string, TopDeudorAgg>();
    topDeudoresRaw.forEach((row) => {
      if (!topDeudoresMap.has(row.clienteId)) {
        topDeudoresMap.set(row.clienteId, {
          clienteId: row.clienteId,
          clienteNombre: row.clienteNombre,
          clienteApellidos: row.clienteApellidos,
          facturasPendientes: 0,
          facturasParciales: 0,
          facturasAdelantadas: 0,
          deudaTotal: 0,
        });
      }
      const data = topDeudoresMap.get(row.clienteId);
      if (!data) return;
      const estado = String(row.facturaEstado ?? "").toLowerCase();
      data.deudaTotal += Number(row.montoPendiente);
      if (PARTIAL_STATES.includes(estado)) {
        data.facturasParciales++;
      } else if (ADVANCE_STATES.includes(estado)) {
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
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(cuentasPorCobrar.montoPendiente, "monto"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
          gt(cuentasPorCobrar.montoPendiente, "0"),
          hasAnyState(facturasClientes.estado, PENDING_STATES),
        ),
      );

    const [parcialesMes] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(cuentasPorCobrar.montoPendiente, "monto"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
          gt(cuentasPorCobrar.montoPendiente, "0"),
          hasAnyState(facturasClientes.estado, PARTIAL_STATES),
        ),
      );

    const [adelantadasMes] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
        monto: sumField(cuentasPorCobrar.montoPendiente, "monto"),
      })
      .from(cuentasPorCobrar)
      .innerJoin(facturasClientes, eq(cuentasPorCobrar.facturaId, facturasClientes.id))
      .where(
        and(
          gte(facturasClientes.fechaFactura, monthStart.toISOString().split("T")[0]),
          lt(facturasClientes.fechaFactura, nextMonthStart.toISOString().split("T")[0]),
          gt(cuentasPorCobrar.montoPendiente, "0"),
          hasAnyState(facturasClientes.estado, ADVANCE_STATES),
        ),
      );

    const todayIso = now.toISOString().split("T")[0];
    const vencidas = await db
      .select({
        id: facturasClientes.id,
        numeroFactura: facturasClientes.numeroFactura,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteApellidos: clientes.apellidos,
        fechaVencimiento: facturasClientes.fechaVencimiento,
        montoPendiente: cuentasPorCobrar.montoPendiente,
        diasVencido: sql<number>`GREATEST(CURRENT_DATE - ${facturasClientes.fechaVencimiento}::date, 0)::int`.as(
          "dias_vencido",
        ),
        estado: facturasClientes.estado,
      })
      .from(facturasClientes)
      .innerJoin(clientes, eq(facturasClientes.clienteId, clientes.id))
      .innerJoin(cuentasPorCobrar, eq(facturasClientes.id, cuentasPorCobrar.facturaId))
      .where(
        and(
          gt(cuentasPorCobrar.montoPendiente, "0"),
          lt(facturasClientes.fechaVencimiento, todayIso),
          sql`${facturasClientes.fechaVencimiento} IS NOT NULL`,
          sql`NOT (${hasAnyState(facturasClientes.estado, [...PAID_STATES, ...VOID_STATES])})`,
        ),
      )
      .orderBy(desc(sql`dias_vencido`), desc(cuentasPorCobrar.montoPendiente))
      .limit(10);

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
          lt(pagosClientes.fechaPago, nextMonthStart.toISOString().split("T")[0]),
        ),
      )
      .groupBy(sql`dia`)
      .orderBy(asc(sql`dia`));

    return jsonResponse(
      {
        success: true,
        data: {
          resumen: {
            totalFacturas: Number(totals?.totalFacturas ?? 0),
            montoFacturado: Number(totals?.montoFacturado ?? 0),
            facturasPendientes: Number(pendientes?.count ?? 0),
            montoPendiente: Number(pendientes?.montoPendiente ?? 0),
            facturasParciales: Number(parciales?.count ?? 0),
            montoParcialPendiente: Number(parciales?.montoPendiente ?? 0),
            facturasAdelantadas: Number(adelantadas?.count ?? 0),
            montoAdelantadoPendiente: Number(adelantadas?.montoPendiente ?? 0),
            facturasPagadas: Number(pagadas?.count ?? 0),
            montoPagado: Number(pagadas?.monto ?? 0),
            facturasAnuladas: Number(anuladas?.count ?? 0),
            montoAnulado: Number(anuladas?.monto ?? 0),
            cobradoMesActual: Number(cobradoMes?.monto ?? 0),
            facturadoMesActual: Number(facturadoMes?.monto ?? 0),
            montoPendienteGlobal: Number(pendienteGlobal?.montoPendiente ?? 0),
            pagadasMesActual: {
              count: Number(pagadasMes?.count ?? 0),
              monto: Number(pagadasMes?.monto ?? 0),
            },

            // Legacy/mobile compatibility
            montoFacturadoMes: Number(facturadoMes?.monto ?? 0),
            montoPagadoMes: Number(cobradoMes?.monto ?? 0),
            montoPendienteMes: Number(pendientesMes?.monto ?? 0),
            montoParcialMes: Number(parcialesMes?.monto ?? 0),
            montoAdelantadoMes: Number(adelantadasMes?.monto ?? 0),
            facturasPendientesMes: Number(pendientesMes?.count ?? 0),
            facturasParcialesMes: Number(parcialesMes?.count ?? 0),
            facturasAdelantadasMes: Number(adelantadasMes?.count ?? 0),
            tendenciaCobros: tendenciaCobros.map((t) => ({
              dia: t.dia,
              monto: Number(t.monto),
            })),
          },
          topDeudores,
          recientes,
          vencidas,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching facturas dashboard:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
