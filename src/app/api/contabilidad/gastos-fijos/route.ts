import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { pagosFijos, pagosPagosFijos } from "@/lib/db/schema";
import { cacheGet, cacheInvalidate, cacheSet } from "@/lib/api-cache";
import { jsonResponse } from "@/lib/serializers";

const CACHE_KEY = "gastos-fijos";
const CACHE_TTL = 60_000; // 60 segundos

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildLastMonths(count = 12) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(buildMonthKey(d));
  }
  return keys;
}

export async function GET() {
  try {
    const cached = cacheGet<object>(CACHE_KEY);
    if (cached) return jsonResponse(cached);

    const currentMonthStart = monthStart();
    const historyStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 11, 1);

    const [fixedRaw, paymentsRaw] = await Promise.all([
      db.select().from(pagosFijos).orderBy(desc(pagosFijos.activo), pagosFijos.nombre),
      db
        .select({
          id: pagosPagosFijos.id,
          pagoFijoId: pagosPagosFijos.pagoFijoId,
          fechaPago: pagosPagosFijos.fechaPago,
          montoPagado: pagosPagosFijos.montoPagado,
          metodoPago: pagosPagosFijos.metodoPago,
          numeroReferencia: pagosPagosFijos.numeroReferencia,
          observaciones: pagosPagosFijos.observaciones,
        })
        .from(pagosPagosFijos)
        .where(gte(pagosPagosFijos.fechaPago, historyStart.toISOString().split("T")[0]))
        .orderBy(desc(pagosPagosFijos.fechaPago)),
    ]);

    const monthKeys = buildLastMonths(12);
    const paymentsByFixed = new Map<string, typeof paymentsRaw>();
    for (const p of paymentsRaw) {
      const key = p.pagoFijoId;
      if (!paymentsByFixed.has(key)) paymentsByFixed.set(key, []);
      paymentsByFixed.get(key)!.push(p);
    }

    const fixedExpenses = fixedRaw.map((f) => {
      const payments = paymentsByFixed.get(f.id) ?? [];
      const latest = payments[0] ?? null;
      const paidCurrentMonth = payments.some((p) => {
        const d = new Date(p.fechaPago);
        return d.getFullYear() === currentMonthStart.getFullYear() && d.getMonth() === currentMonthStart.getMonth();
      });

      const monthlyHistory = monthKeys.map((monthKey) => {
        const monthPayments = payments.filter((p) => {
          const d = new Date(p.fechaPago);
          return buildMonthKey(d) === monthKey;
        });

        const total = monthPayments.reduce((acc, p) => acc + toNumber(p.montoPagado), 0);
        return {
          month: monthKey,
          total,
          count: monthPayments.length,
          pagos: monthPayments.map((p) => ({
            id: p.id,
            fechaPago: p.fechaPago,
            montoPagado: toNumber(p.montoPagado),
            metodoPago: p.metodoPago,
            numeroReferencia: p.numeroReferencia,
          })),
        };
      });

      return {
        id: f.id,
        nombre: f.nombre,
        descripcion: f.descripcion,
        monto: toNumber(f.monto),
        moneda: f.moneda,
        diaVencimiento: f.diaVencimiento,
        activo: f.activo,
        observaciones: f.observaciones,
        proximoVencimiento: f.proximoVencimiento,
        paidCurrentMonth,
        latestPayment: latest
          ? {
              fechaPago: latest.fechaPago,
              montoPagado: toNumber(latest.montoPagado),
              metodoPago: latest.metodoPago,
            }
          : null,
        monthlyHistory,
      };
    });

    const monthlySummary = monthKeys.map((monthKey) => {
      const totalProgramado = fixedExpenses
        .filter((f) => f.activo)
        .reduce((acc, f) => acc + toNumber(f.monto), 0);

      const totalPagado = fixedExpenses.reduce((acc, f) => {
        const monthData = f.monthlyHistory.find((m) => m.month === monthKey);
        return acc + toNumber(monthData?.total ?? 0);
      }, 0);

      return {
        month: monthKey,
        totalProgramado,
        totalPagado,
        diferencia: totalProgramado - totalPagado,
      };
    });

    const activeFixed = fixedExpenses.filter((f) => f.activo);
    const unpaidCurrentMonth = activeFixed.filter((f) => !f.paidCurrentMonth);
    const overdueLikely = unpaidCurrentMonth.filter((f) => new Date().getDate() > Number(f.diaVencimiento));

    const recommendations = [] as Array<{ title: string; detail: string; priority: "alta" | "media" | "baja" }>;

    if (overdueLikely.length > 0) {
      recommendations.push({
        title: "Gastos fijos con posible atraso",
        detail: `${overdueLikely.length} gasto(s) fijo(s) superan su dia de vencimiento y no tienen pago registrado este mes.`,
        priority: "alta",
      });
    }

    const overExecuted = activeFixed.filter((f) => {
      const currentMonth = buildMonthKey(new Date());
      const monthData = f.monthlyHistory.find((m) => m.month === currentMonth);
      return toNumber(monthData?.total ?? 0) > toNumber(f.monto) * 1.15;
    });

    if (overExecuted.length > 0) {
      recommendations.push({
        title: "Pagos por encima del monto planificado",
        detail: `${overExecuted.length} gasto(s) fijo(s) llevan un pago mensual mayor al 115% de su monto configurado.`,
        priority: "media",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Buen control de gastos fijos",
        detail: "No se detectaron desviaciones relevantes en los pagos fijos del periodo reciente.",
        priority: "baja",
      });
    }

    const payload = {
      success: true,
      data: {
        fixedExpenses,
        monthlySummary,
        recommendations,
      },
    };

    cacheSet(CACHE_KEY, payload, CACHE_TTL);
    return jsonResponse(payload);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error cargando gastos fijos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nombre = String(body?.nombre ?? "").trim();
    const monto = Number(body?.monto ?? 0);
    const diaVencimiento = Number(body?.diaVencimiento ?? 0);

    if (!nombre || !monto || !diaVencimiento) {
      return jsonResponse({ success: false, error: "nombre, monto y diaVencimiento son requeridos" }, { status: 400 });
    }

    const now = new Date();
    const prox = new Date(now.getFullYear(), now.getMonth(), Math.min(Math.max(diaVencimiento, 1), 28));

    const [created] = await db
      .insert(pagosFijos)
      .values({
        nombre,
        descripcion: body?.descripcion ? String(body.descripcion) : null,
        monto: String(monto),
        moneda: String(body?.moneda ?? "DOP"),
        diaVencimiento: Math.min(Math.max(diaVencimiento, 1), 31),
        observaciones: body?.observaciones ? String(body.observaciones) : null,
        activo: true,
        proximoVencimiento: prox.toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
      })
      .returning();

    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, data: created });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error creando gasto fijo" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body?.nombre !== undefined) patch.nombre = String(body.nombre).trim();
    if (body?.descripcion !== undefined) patch.descripcion = body.descripcion ? String(body.descripcion) : null;
    if (body?.monto !== undefined) patch.monto = String(Number(body.monto));
    if (body?.diaVencimiento !== undefined) patch.diaVencimiento = Math.min(Math.max(Number(body.diaVencimiento), 1), 31);
    if (body?.moneda !== undefined) patch.moneda = String(body.moneda || "DOP");
    if (body?.activo !== undefined) patch.activo = Boolean(body.activo);
    if (body?.observaciones !== undefined) patch.observaciones = body.observaciones ? String(body.observaciones) : null;

    const [updated] = await db.update(pagosFijos).set(patch).where(eq(pagosFijos.id, id)).returning();
    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, data: updated });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error actualizando gasto fijo" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonResponse({ success: false, error: "id requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(pagosFijos)
      .set({ activo: false, updatedAt: new Date().toISOString() })
      .where(eq(pagosFijos.id, id))
      .returning();

    cacheInvalidate(CACHE_KEY);
    return jsonResponse({ success: true, data: updated, message: "Gasto fijo desactivado" });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message ?? "Error eliminando gasto fijo" }, { status: 500 });
  }
}
