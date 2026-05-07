import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { cuentasPorPagar, pagosCuentasPorPagar, proveedores } from "@/lib/db/schema";
import { cacheGet, cacheInvalidate, cacheSet } from "@/lib/api-cache";
import { jsonResponse } from "@/lib/serializers";

const CACHE_KEY = "cuentas-por-pagar";
const CACHE_TTL = 60_000; // 60 segundos

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthKeys(count = 12) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(formatMonthKey(d));
  }
  return keys;
}

function calcDiasVencido(fechaVencimiento: string, montoPendiente: number) {
  if (montoPendiente <= 0) return 0;
  const due = new Date(`${fechaVencimiento}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export async function GET() {
  try {
    const cached = cacheGet<object>(CACHE_KEY);
    if (cached) return jsonResponse(cached);

    const monthKeys = buildMonthKeys(12);
    const historyStart = new Date();
    historyStart.setMonth(historyStart.getMonth() - 11);
    historyStart.setDate(1);

    const [accountsRaw, paymentsRaw] = await Promise.all([
      db
        .select({
          id: cuentasPorPagar.id,
          proveedorId: cuentasPorPagar.proveedorId,
          proveedorNombre: proveedores.nombre,
          numeroDocumento: cuentasPorPagar.numeroDocumento,
          tipoDocumento: cuentasPorPagar.tipoDocumento,
          fechaEmision: cuentasPorPagar.fechaEmision,
          fechaVencimiento: cuentasPorPagar.fechaVencimiento,
          concepto: cuentasPorPagar.concepto,
          montoOriginal: cuentasPorPagar.montoOriginal,
          montoPendiente: cuentasPorPagar.montoPendiente,
          cuotaMensual: cuentasPorPagar.cuotaMensual,
          moneda: cuentasPorPagar.moneda,
          estado: cuentasPorPagar.estado,
          diasVencido: cuentasPorPagar.diasVencido,
          observaciones: cuentasPorPagar.observaciones,
          numeroCuotas: cuentasPorPagar.numeroCuotas,
          tipo: cuentasPorPagar.tipo,
          updatedAt: cuentasPorPagar.updatedAt,
        })
        .from(cuentasPorPagar)
        .leftJoin(proveedores, eq(cuentasPorPagar.proveedorId, proveedores.id))
        .orderBy(desc(cuentasPorPagar.fechaVencimiento)),
      db
        .select({
          id: pagosCuentasPorPagar.id,
          cuentaPorPagarId: pagosCuentasPorPagar.cuentaPorPagarId,
          monto: pagosCuentasPorPagar.monto,
          fechaPago: pagosCuentasPorPagar.fechaPago,
          metodoPago: pagosCuentasPorPagar.metodoPago,
          numeroReferencia: pagosCuentasPorPagar.numeroReferencia,
          observaciones: pagosCuentasPorPagar.observaciones,
          createdAt: pagosCuentasPorPagar.createdAt,
        })
        .from(pagosCuentasPorPagar)
        .where(gte(pagosCuentasPorPagar.fechaPago, historyStart.toISOString().split("T")[0]))
        .orderBy(desc(pagosCuentasPorPagar.fechaPago)),
    ]);

    const paymentMap = new Map<string, typeof paymentsRaw>();
    for (const payment of paymentsRaw) {
      const key = payment.cuentaPorPagarId;
      if (!paymentMap.has(key)) paymentMap.set(key, []);
      paymentMap.get(key)!.push(payment);
    }

    const accounts = accountsRaw.map((account) => {
      const pagos = paymentMap.get(account.id) ?? [];
      const monthlyHistory = monthKeys.map((month) => {
        const monthPayments = pagos.filter((p) => {
          const d = new Date(`${p.fechaPago}T00:00:00`);
          return formatMonthKey(d) === month;
        });

        return {
          month,
          totalPagado: monthPayments.reduce((acc, p) => acc + toNumber(p.monto), 0),
          cantidadPagos: monthPayments.length,
          pagos: monthPayments.map((p) => ({
            id: p.id,
            monto: toNumber(p.monto),
            fechaPago: p.fechaPago,
            metodoPago: p.metodoPago,
            numeroReferencia: p.numeroReferencia,
          })),
        };
      });

      return {
        ...account,
        montoOriginal: toNumber(account.montoOriginal),
        montoPendiente: toNumber(account.montoPendiente),
        cuotaMensual: account.cuotaMensual == null ? null : toNumber(account.cuotaMensual),
        monthlyHistory,
        pagosRecientes: pagos.slice(0, 10).map((p) => ({
          id: p.id,
          monto: toNumber(p.monto),
          fechaPago: p.fechaPago,
          metodoPago: p.metodoPago,
          numeroReferencia: p.numeroReferencia,
        })),
      };
    });

    const totalPendiente = accounts.reduce((acc, a) => acc + a.montoPendiente, 0);
    const totalOriginal = accounts.reduce((acc, a) => acc + a.montoOriginal, 0);
    const vencidas = accounts.filter((a) => a.montoPendiente > 0 && calcDiasVencido(a.fechaVencimiento, a.montoPendiente) > 0);

    const monthlySummary = monthKeys.map((month) => {
      const totalPagado = accounts.reduce((acc, account) => {
        const history = account.monthlyHistory.find((h) => h.month === month);
        return acc + toNumber(history?.totalPagado ?? 0);
      }, 0);

      return {
        month,
        totalPagado,
      };
    });

    const recommendations: Array<{ title: string; detail: string; priority: "alta" | "media" | "baja" }> = [];

    if (vencidas.length > 0) {
      recommendations.push({
        title: "Cuentas por pagar vencidas",
        detail: `Tienes ${vencidas.length} cuenta(s) con atraso. Prioriza su pago para evitar recargos y tension de caja.`,
        priority: "alta",
      });
    }

    const debtRatio = totalOriginal > 0 ? (totalPendiente / totalOriginal) * 100 : 0;
    if (debtRatio > 50) {
      recommendations.push({
        title: "Alto saldo pendiente",
        detail: `El ${debtRatio.toFixed(2)}% de tus obligaciones sigue pendiente. Evalua aumentar cuota de pago mensual.`,
        priority: "media",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Buen manejo de cuentas por pagar",
        detail: "No se detectan alertas importantes en tu cartera de cuentas por pagar.",
        priority: "baja",
      });
    }

    const payload = {
      success: true,
      data: {
        summary: {
          totalOriginal,
          totalPendiente,
          totalPagado: totalOriginal - totalPendiente,
          cantidadCuentas: accounts.length,
          cantidadVencidas: vencidas.length,
        },
        monthlySummary,
        recommendations,
        accounts,
      },
    };

    cacheSet(CACHE_KEY, payload, CACHE_TTL);
    return jsonResponse(payload);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error cargando cuentas por pagar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      proveedorId,
      numeroDocumento,
      tipoDocumento,
      fechaEmision,
      fechaVencimiento,
      concepto,
      montoOriginal,
      cuotaMensual,
      moneda,
      observaciones,
      numeroCuotas,
      tipo,
    } = body;

    if (!numeroDocumento || !tipoDocumento || !fechaEmision || !fechaVencimiento || !concepto || !montoOriginal) {
      return jsonResponse({ success: false, error: "Campos requeridos incompletos" }, { status: 400 });
    }

    const monto = toNumber(montoOriginal);

    const [created] = await db
      .insert(cuentasPorPagar)
      .values({
        proveedorId: proveedorId || null,
        numeroDocumento: String(numeroDocumento),
        tipoDocumento: String(tipoDocumento),
        fechaEmision: String(fechaEmision),
        fechaVencimiento: String(fechaVencimiento),
        concepto: String(concepto),
        montoOriginal: String(monto),
        montoPendiente: String(monto),
        cuotaMensual: cuotaMensual != null && cuotaMensual !== "" ? String(toNumber(cuotaMensual)) : null,
        moneda: String(moneda || "DOP"),
        estado: "pendiente",
        diasVencido: calcDiasVencido(String(fechaVencimiento), monto),
        observaciones: observaciones ? String(observaciones) : null,
        numeroCuotas: numeroCuotas ? Number(numeroCuotas) : null,
        tipo: String(tipo || "factura"),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, data: created });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error creando cuenta por pagar" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    const current = await db
      .select({
        montoOriginal: cuentasPorPagar.montoOriginal,
        montoPendiente: cuentasPorPagar.montoPendiente,
        fechaVencimiento: cuentasPorPagar.fechaVencimiento,
      })
      .from(cuentasPorPagar)
      .where(eq(cuentasPorPagar.id, id))
      .limit(1);

    if (!current[0]) {
      return jsonResponse({ success: false, error: "Cuenta por pagar no encontrada" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body?.proveedorId !== undefined) patch.proveedorId = body.proveedorId || null;
    if (body?.numeroDocumento !== undefined) patch.numeroDocumento = String(body.numeroDocumento);
    if (body?.tipoDocumento !== undefined) patch.tipoDocumento = String(body.tipoDocumento);
    if (body?.fechaEmision !== undefined) patch.fechaEmision = String(body.fechaEmision);
    if (body?.fechaVencimiento !== undefined) patch.fechaVencimiento = String(body.fechaVencimiento);
    if (body?.concepto !== undefined) patch.concepto = String(body.concepto);
    if (body?.montoOriginal !== undefined) patch.montoOriginal = String(toNumber(body.montoOriginal));
    if (body?.montoPendiente !== undefined) patch.montoPendiente = String(toNumber(body.montoPendiente));
    if (body?.cuotaMensual !== undefined)
      patch.cuotaMensual = body.cuotaMensual != null && body.cuotaMensual !== "" ? String(toNumber(body.cuotaMensual)) : null;
    if (body?.moneda !== undefined) patch.moneda = String(body.moneda || "DOP");
    if (body?.observaciones !== undefined) patch.observaciones = body.observaciones ? String(body.observaciones) : null;
    if (body?.numeroCuotas !== undefined) patch.numeroCuotas = body.numeroCuotas ? Number(body.numeroCuotas) : null;
    if (body?.tipo !== undefined) patch.tipo = String(body.tipo || "factura");

    const nextPendiente =
      body?.montoPendiente !== undefined ? toNumber(body.montoPendiente) : toNumber(current[0].montoPendiente);
    const nextOriginal =
      body?.montoOriginal !== undefined ? toNumber(body.montoOriginal) : toNumber(current[0].montoOriginal);
    const nextVencimiento =
      body?.fechaVencimiento !== undefined ? String(body.fechaVencimiento) : String(current[0].fechaVencimiento);

    const validEstados = ["pendiente", "parcial", "pagada"];
    const estadoManual = body?.estadoManual && validEstados.includes(String(body.estadoManual)) ? String(body.estadoManual) : null;
    const estadoCalculado = nextPendiente <= 0 ? "pagada" : nextPendiente < nextOriginal ? "parcial" : "pendiente";
    patch.estado = estadoManual ?? estadoCalculado;
    patch.diasVencido = calcDiasVencido(nextVencimiento, nextPendiente);

    const [updated] = await db.update(cuentasPorPagar).set(patch).where(eq(cuentasPorPagar.id, id)).returning();
    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, data: updated });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error actualizando cuenta por pagar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    await db.delete(cuentasPorPagar).where(eq(cuentasPorPagar.id, id));
    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, message: "Cuenta por pagar eliminada" });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error eliminando cuenta por pagar" }, { status: 500 });
  }
}
