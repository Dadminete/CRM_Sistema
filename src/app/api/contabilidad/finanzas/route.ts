import { sql, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { categoriasCuentas, configuraciones } from "@/lib/db/schema";
import { cacheGet, cacheSet } from "@/lib/api-cache";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FINANZAS_CACHE_TTL = 30_000; // 30 segundos

const FINANCE_RULE_PROFILE = {
  sourceDocument: "Plan de Mejora Financiera y Consolidacion de Deuda - Daniel Beras Sanchez",
  version: "2026.05",
  goals: {
    targetSavingsRate: 20,
    maxExpenseRatio: 60,
    maxReceivablesOverdueRatio: 25,
    maxDebtPressureRatio: 120,
  },
};
const RULES_CONFIG_KEY = "contabilidad.finanzas.reglas";

type InsightItem = {
  title: string;
  detail: string;
  metric?: string;
};

type RecommendationItem = {
  title: string;
  action: string;
  priority: "alta" | "media" | "baja";
};

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function toPercent(value: number) {
  return Math.round(value * 100) / 100;
}

async function loadPersistedRules() {
  const existing = await db
    .select({ valor: configuraciones.valor })
    .from(configuraciones)
    .where(eq(configuraciones.clave, RULES_CONFIG_KEY))
    .limit(1);

  if (!existing[0]?.valor) {
    return FINANCE_RULE_PROFILE;
  }

  try {
    const parsed = JSON.parse(existing[0].valor);
    return {
      sourceDocument: parsed?.sourceDocument?.trim() || FINANCE_RULE_PROFILE.sourceDocument,
      version: parsed?.version?.trim() || FINANCE_RULE_PROFILE.version,
      goals: {
        targetSavingsRate: Number(parsed?.goals?.targetSavingsRate ?? FINANCE_RULE_PROFILE.goals.targetSavingsRate),
        maxExpenseRatio: Number(parsed?.goals?.maxExpenseRatio ?? FINANCE_RULE_PROFILE.goals.maxExpenseRatio),
        maxReceivablesOverdueRatio: Number(
          parsed?.goals?.maxReceivablesOverdueRatio ?? FINANCE_RULE_PROFILE.goals.maxReceivablesOverdueRatio,
        ),
        maxDebtPressureRatio: Number(parsed?.goals?.maxDebtPressureRatio ?? FINANCE_RULE_PROFILE.goals.maxDebtPressureRatio),
      },
    };
  } catch {
    return FINANCE_RULE_PROFILE;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get("days") ?? 30), 7), 365);

    const cacheKey = `finanzas:${days}`;
    const cached = cacheGet<object>(cacheKey);
    if (cached) {
      return jsonResponse(cached, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
    }

    // Cargar reglas y categoría de traspasos en paralelo (antes eran secuenciales)
    const [rules, traspasoCatRows] = await Promise.all([
      loadPersistedRules(),
      db.select({ id: categoriasCuentas.id }).from(categoriasCuentas).where(eq(categoriasCuentas.codigo, "TRASP-001")).limit(1),
    ]);

    const targetSavingsRate = Math.min(
      Math.max(Number(searchParams.get("targetSavingsRate") ?? rules.goals.targetSavingsRate), 1),
      80,
    );
    const maxExpenseRatio = Math.min(
      Math.max(Number(searchParams.get("maxExpenseRatio") ?? rules.goals.maxExpenseRatio), 10),
      95,
    );

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - (days - 1));

    const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const traspasoCatId = traspasoCatRows[0]?.id ?? null;
    const traspasoFilter = traspasoCatId ? sql`AND mc.categoria_id <> ${traspasoCatId}` : sql``;

    const [totalsRaw, topCategoriesRaw, monthlyTrendRaw, receivablesRaw, monthlyCategoryRaw] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN LOWER(mc.tipo) = 'ingreso' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) AS ingresos,
          COALESCE(SUM(CASE WHEN LOWER(mc.tipo) IN ('gasto', 'egreso') THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) AS gastos
        FROM movimientos_contables mc
        WHERE mc.fecha >= ${periodStart.toISOString()}
          AND mc.fecha <= ${now.toISOString()}
          ${traspasoFilter}
      `),
      db.execute(sql`
        SELECT
          cc.id,
          cc.codigo,
          cc.nombre,
          COALESCE(SUM(CAST(mc.monto AS DECIMAL)), 0) AS total
        FROM movimientos_contables mc
        LEFT JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
        WHERE mc.fecha >= ${periodStart.toISOString()}
          AND mc.fecha <= ${now.toISOString()}
          AND LOWER(mc.tipo) IN ('gasto', 'egreso')
          ${traspasoFilter}
        GROUP BY cc.id, cc.codigo, cc.nombre
        ORDER BY total DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT
          DATE_TRUNC('month', mc.fecha)::date AS month_date,
          COALESCE(SUM(CASE WHEN LOWER(mc.tipo) = 'ingreso' THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) AS ingresos,
          COALESCE(SUM(CASE WHEN LOWER(mc.tipo) IN ('gasto', 'egreso') THEN CAST(mc.monto AS DECIMAL) ELSE 0 END), 0) AS gastos
        FROM movimientos_contables mc
        WHERE mc.fecha >= ${sixMonthsStart.toISOString()}
          AND mc.fecha <= ${now.toISOString()}
          ${traspasoFilter}
        GROUP BY DATE_TRUNC('month', mc.fecha)
        ORDER BY DATE_TRUNC('month', mc.fecha) ASC
      `),
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN cpc.monto_pendiente > 0 THEN 1 ELSE 0 END), 0) AS docs_abiertos,
          COALESCE(SUM(CASE WHEN cpc.monto_pendiente > 0 THEN CAST(cpc.monto_pendiente AS DECIMAL) ELSE 0 END), 0) AS monto_abierto,
          COALESCE(SUM(CASE WHEN cpc.monto_pendiente > 0 AND cpc.dias_vencido > 0 THEN 1 ELSE 0 END), 0) AS docs_vencidos,
          COALESCE(SUM(CASE WHEN cpc.monto_pendiente > 0 AND cpc.dias_vencido > 0 THEN CAST(cpc.monto_pendiente AS DECIMAL) ELSE 0 END), 0) AS monto_vencido
        FROM cuentas_por_cobrar cpc
      `),
      db.execute(sql`
        SELECT
          DATE_TRUNC('month', mc.fecha)::date AS month_date,
          COALESCE(cc.nombre, 'Sin categoria') AS categoria,
          COALESCE(SUM(CAST(mc.monto AS DECIMAL)), 0) AS total
        FROM movimientos_contables mc
        LEFT JOIN categorias_cuentas cc ON cc.id = mc.categoria_id
        WHERE mc.fecha >= ${sixMonthsStart.toISOString()}
          AND mc.fecha <= ${now.toISOString()}
          AND LOWER(mc.tipo) IN ('gasto', 'egreso')
          ${traspasoFilter}
        GROUP BY DATE_TRUNC('month', mc.fecha), cc.nombre
        ORDER BY DATE_TRUNC('month', mc.fecha) ASC, total DESC
      `),
    ]);

    const totalsRow = (totalsRaw.rows?.[0] ?? {}) as Record<string, unknown>;
    const ingresos = toNumber(totalsRow.ingresos);
    const gastos = toNumber(totalsRow.gastos);
    const balance = ingresos - gastos;

    const savingsRate = ingresos > 0 ? toPercent((balance / ingresos) * 100) : 0;
    const expenseRatio = ingresos > 0 ? toPercent((gastos / ingresos) * 100) : gastos > 0 ? 100 : 0;

    const monthKeys: string[] = [];
    const monthLabels = new Map<string, string>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
      monthLabels.set(key, d.toLocaleDateString("es-DO", { month: "short", year: "numeric" }));
    }

    const monthlyAggMap = new Map<string, { ingresos: number; gastos: number }>();
    for (const row of monthlyTrendRaw.rows ?? []) {
      const d = new Date((row as any).month_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "00")}`;
      monthlyAggMap.set(key, {
        ingresos: toNumber((row as any).ingresos),
        gastos: toNumber((row as any).gastos),
      });
    }

    const monthlyTrend = monthKeys.map((key) => {
      const agg = monthlyAggMap.get(key) ?? { ingresos: 0, gastos: 0 };
      return {
        key,
        month: monthLabels.get(key) ?? key,
        ingresos: agg.ingresos,
        gastos: agg.gastos,
        balance: agg.ingresos - agg.gastos,
      };
    });

    const lastMonth = monthlyTrend.at(-1);
    const prevMonth = monthlyTrend.at(-2);
    const balanceTrend =
      lastMonth && prevMonth ? toPercent(lastMonth.balance - prevMonth.balance) : 0;

    const topExpenseCategories = (topCategoriesRaw.rows ?? []).map((row: any) => ({
      id: String(row.id ?? ""),
      codigo: row.codigo ? String(row.codigo) : null,
      nombre: row.nombre ? String(row.nombre) : "Sin categoria",
      total: toNumber(row.total),
      percentage: gastos > 0 ? toPercent((toNumber(row.total) / gastos) * 100) : 0,
    }));

    const receivableRow = (receivablesRaw.rows?.[0] ?? {}) as Record<string, unknown>;
    const docsAbiertos = toNumber(receivableRow.docs_abiertos);
    const docsVencidos = toNumber(receivableRow.docs_vencidos);
    const montoAbierto = toNumber(receivableRow.monto_abierto);
    const montoVencido = toNumber(receivableRow.monto_vencido);
    const overdueRatio = montoAbierto > 0 ? toPercent((montoVencido / montoAbierto) * 100) : 0;
    const debtPressureRatio = ingresos > 0 ? toPercent((montoAbierto / ingresos) * 100) : montoAbierto > 0 ? 100 : 0;

    const monthlyCategoryMap = new Map<string, number[]>();
    for (const row of monthlyCategoryRaw.rows ?? []) {
      const d = new Date((row as any).month_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const category = String((row as any).categoria ?? "Sin categoria");
      const total = toNumber((row as any).total);

      if (!monthlyCategoryMap.has(category)) {
        monthlyCategoryMap.set(category, Array.from({ length: monthKeys.length }, () => 0));
      }

      const idx = monthKeys.indexOf(key);
      if (idx >= 0) {
        const series = monthlyCategoryMap.get(category)!;
        series[idx] = total;
      }
    }

    const categorySeries = Array.from(monthlyCategoryMap.entries())
      .map(([name, values]) => {
        const total = values.reduce((acc, v) => acc + v, 0);
        const last = values[values.length - 1] ?? 0;
        const prev = values[values.length - 2] ?? 0;
        const last3 = values.slice(-3);
        const increasing3m = last3.length === 3 && last3[0] < last3[1] && last3[1] < last3[2];
        const decreasing3m = last3.length === 3 && last3[0] > last3[1] && last3[1] > last3[2];

        return {
          name,
          total,
          values,
          last,
          prev,
          change: toPercent(last - prev),
          changePct: prev > 0 ? toPercent(((last - prev) / prev) * 100) : last > 0 ? 100 : 0,
          increasing3m,
          decreasing3m,
        };
      })
      .sort((a, b) => b.total - a.total);

    const topCategorySeries = categorySeries.slice(0, 6);

    const strengths: InsightItem[] = [];
    const weaknesses: InsightItem[] = [];
    const recommendations: RecommendationItem[] = [];
    const alerts: string[] = [];
    const monthlyPatterns: Array<{ title: string; detail: string; type: "positive" | "warning" }> = [];

    if (savingsRate >= targetSavingsRate) {
      strengths.push({
        title: "Buen nivel de ahorro",
        detail: `Tu tasa de ahorro actual (${savingsRate}%) supera la meta configurada (${targetSavingsRate}%).`,
        metric: `${savingsRate}%`,
      });
    } else {
      weaknesses.push({
        title: "Ahorro por debajo de la meta",
        detail: `Tu tasa de ahorro actual es ${savingsRate}% y la meta es ${targetSavingsRate}%.`,
        metric: `${savingsRate}%`,
      });
      recommendations.push({
        title: "Subir ahorro mensual",
        action: "Reduce gastos variables no esenciales hasta alcanzar al menos la meta de ahorro.",
        priority: "alta",
      });
    }

    if (expenseRatio <= maxExpenseRatio) {
      strengths.push({
        title: "Control de gasto saludable",
        detail: `El gasto representa ${expenseRatio}% de tus ingresos dentro del periodo analizado.`,
        metric: `${expenseRatio}%`,
      });
    } else {
      weaknesses.push({
        title: "Gasto elevado frente al ingreso",
        detail: `Tus gastos consumen ${expenseRatio}% de los ingresos, por encima del maximo de ${maxExpenseRatio}%.`,
        metric: `${expenseRatio}%`,
      });
      alerts.push("Gasto mensual por encima del umbral recomendado.");
      recommendations.push({
        title: "Ajustar presupuesto de gastos",
        action: "Establece topes por categoria y revisa semanalmente desviaciones para corregir a tiempo.",
        priority: "alta",
      });
    }

    if (overdueRatio <= rules.goals.maxReceivablesOverdueRatio) {
      strengths.push({
        title: "Cartera con bajo vencimiento",
        detail: `Solo ${overdueRatio}% del monto pendiente se encuentra vencido (meta <= ${rules.goals.maxReceivablesOverdueRatio}%).`,
        metric: `${overdueRatio}%`,
      });
    } else {
      weaknesses.push({
        title: "Cuentas por cobrar vencidas",
        detail: `${overdueRatio}% del saldo pendiente esta vencido (${docsVencidos} de ${docsAbiertos} documentos).`,
        metric: `${overdueRatio}%`,
      });
      alerts.push("Nivel alto de cuentas por cobrar vencidas.");
      recommendations.push({
        title: "Plan de cobros",
        action: "Prioriza seguimiento de facturas vencidas y define recordatorios de cobro por antiguedad.",
        priority: "media",
      });
    }

    if (debtPressureRatio <= rules.goals.maxDebtPressureRatio) {
      strengths.push({
        title: "Presion de deuda controlada",
        detail: `El saldo por cobrar representa ${debtPressureRatio}% de los ingresos del periodo.`,
        metric: `${debtPressureRatio}%`,
      });
    } else {
      weaknesses.push({
        title: "Presion de deuda elevada",
        detail: `El saldo por cobrar representa ${debtPressureRatio}% de los ingresos (${montoAbierto.toFixed(2)} pendiente).`,
        metric: `${debtPressureRatio}%`,
      });
      recommendations.push({
        title: "Consolidar y priorizar deuda",
        action: "Ordena obligaciones por costo/riesgo y define un plan mensual de pago con prioridad alta en las mas caras.",
        priority: "alta",
      });
    }

    const topCategory = topExpenseCategories[0];
    if (topCategory && topCategory.percentage >= 35) {
      weaknesses.push({
        title: "Dependencia de una categoria de gasto",
        detail: `La categoria ${topCategory.nombre} concentra ${topCategory.percentage}% del gasto del periodo.`,
        metric: `${topCategory.percentage}%`,
      });
      recommendations.push({
        title: "Diversificar y optimizar costos",
        action: `Analiza la categoria ${topCategory.nombre} para negociar costos o sustituir consumos innecesarios.`,
        priority: "media",
      });
    }

    if (balance >= 0) {
      strengths.push({
        title: "Balance positivo",
        detail: `El periodo cierra con un balance positivo de ${balance.toFixed(2)}.`,
      });
    } else {
      weaknesses.push({
        title: "Balance negativo",
        detail: `Tus gastos superan a los ingresos por ${Math.abs(balance).toFixed(2)} en el periodo.`,
      });
      alerts.push("Balance negativo en el periodo analizado.");
      recommendations.push({
        title: "Recuperar flujo de caja",
        action: "Recorta gastos de baja prioridad y acelera cobros para volver a balance positivo.",
        priority: "alta",
      });
    }

    if (lastMonth && prevMonth) {
      if (balanceTrend >= 0) {
        strengths.push({
          title: "Tendencia mensual favorable",
          detail: `El balance mejoro ${balanceTrend.toFixed(2)} respecto al mes anterior.`,
          metric: `${balanceTrend.toFixed(2)}`,
        });
        monthlyPatterns.push({
          title: "Balance mensual mejorando",
          detail: `El ultimo mes mejoro ${balanceTrend.toFixed(2)} frente al mes anterior.`,
          type: "positive",
        });
      } else {
        weaknesses.push({
          title: "Tendencia mensual en descenso",
          detail: `El balance empeoro ${Math.abs(balanceTrend).toFixed(2)} frente al mes anterior.`,
          metric: `${Math.abs(balanceTrend).toFixed(2)}`,
        });
        monthlyPatterns.push({
          title: "Balance mensual en deterioro",
          detail: `El ultimo mes cayo ${Math.abs(balanceTrend).toFixed(2)} frente al mes anterior.`,
          type: "warning",
        });
      }
    }

    const last3Global = monthlyTrend.slice(-3);
    if (last3Global.length === 3) {
      const gastosIncreasing =
        last3Global[0].gastos < last3Global[1].gastos && last3Global[1].gastos < last3Global[2].gastos;
      const ingresosDecreasing =
        last3Global[0].ingresos > last3Global[1].ingresos && last3Global[1].ingresos > last3Global[2].ingresos;

      if (gastosIncreasing) {
        weaknesses.push({
          title: "Gastos subiendo 3 meses seguidos",
          detail: "Hay una aceleracion de gasto sostenida en los ultimos 3 meses.",
        });
        monthlyPatterns.push({
          title: "Patron de gasto creciente",
          detail: "Los gastos muestran una secuencia ascendente durante 3 meses.",
          type: "warning",
        });
        recommendations.push({
          title: "Congelar crecimiento de gasto",
          action: "Define un tope quincenal por categoria para romper el patron de aumento continuo.",
          priority: "alta",
        });
      }

      if (ingresosDecreasing) {
        weaknesses.push({
          title: "Ingresos cayendo 3 meses seguidos",
          detail: "Se detecta tendencia descendente continua en ingresos.",
        });
        monthlyPatterns.push({
          title: "Patron de ingreso descendente",
          detail: "Los ingresos muestran una secuencia descendente durante 3 meses.",
          type: "warning",
        });
        recommendations.push({
          title: "Recuperar flujo de ingresos",
          action: "Refuerza cobro de pendientes y activa acciones comerciales para levantar ingresos del siguiente mes.",
          priority: "alta",
        });
      }
    }

    const categoriesRising = topCategorySeries.filter((c) => c.increasing3m);
    const categoriesFalling = topCategorySeries.filter((c) => c.decreasing3m);

    for (const cat of categoriesRising.slice(0, 3)) {
      monthlyPatterns.push({
        title: `Categoria en alza: ${cat.name}`,
        detail: `Sube por 3 meses seguidos. Cambio ultimo mes: ${cat.changePct.toFixed(2)}%.`,
        type: "warning",
      });
      recommendations.push({
        title: `Controlar ${cat.name}`,
        action: `Revisa contratos y consumos en ${cat.name}; define un presupuesto limite para el proximo mes.`,
        priority: "media",
      });
    }

    for (const cat of categoriesFalling.slice(0, 2)) {
      monthlyPatterns.push({
        title: `Categoria optimizada: ${cat.name}`,
        detail: `Baja por 3 meses seguidos. Cambio ultimo mes: ${cat.changePct.toFixed(2)}%.`,
        type: "positive",
      });
    }

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          40 +
            (savingsRate >= targetSavingsRate ? 20 : -15) +
            (expenseRatio <= maxExpenseRatio ? 20 : -20) +
            (overdueRatio <= rules.goals.maxReceivablesOverdueRatio ? 10 : -10) +
            (balance >= 0 ? 10 : -10),
        ),
      ),
    );

    const estadoFinanciero = healthScore >= 75 ? "saludable" : healthScore >= 50 ? "estable" : "en_riesgo";

    const responsePayload = {
      success: true,
      data: {
        rules: {
          ...rules,
          goals: {
            ...rules.goals,
            targetSavingsRate,
            maxExpenseRatio,
          },
        },
        period: {
          days,
          start: periodStart.toISOString(),
          end: now.toISOString(),
        },
        kpis: {
          ingresos,
          gastos,
          balance,
          savingsRate,
          expenseRatio,
          debtPressureRatio,
          receivablesOpenAmount: montoAbierto,
          receivablesOverdueAmount: montoVencido,
          receivablesOverdueRatio: overdueRatio,
          receivablesOpenDocs: docsAbiertos,
          receivablesOverdueDocs: docsVencidos,
        },
        summary: {
          healthScore,
          estadoFinanciero,
          targetSavingsRate,
          maxExpenseRatio,
        },
        strengths,
        weaknesses,
        recommendations,
        alerts,
        monthlyPatterns,
        monthlyCategoryTrends: topCategorySeries.map((c) => ({
          categoria: c.name,
          total: c.total,
          lastMonth: c.last,
          previousMonth: c.prev,
          change: c.change,
          changePct: c.changePct,
          increasing3m: c.increasing3m,
          decreasing3m: c.decreasing3m,
          series: c.values,
        })),
        topExpenseCategories,
        monthlyTrend,
      },
    };

    cacheSet(cacheKey, responsePayload, FINANZAS_CACHE_TTL);

    return jsonResponse(responsePayload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error en analisis financiero:", error);
    return jsonResponse(
      { success: false, error: error?.message ?? "Error interno" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
