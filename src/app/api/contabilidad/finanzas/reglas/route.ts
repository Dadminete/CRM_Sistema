import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { configuraciones } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/serializers";

const CONFIG_KEY = "contabilidad.finanzas.reglas";

const DEFAULT_RULES = {
  sourceDocument: "Plan de Mejora Financiera y Consolidacion de Deuda - Daniel Beras Sanchez",
  version: "2026.05",
  goals: {
    targetSavingsRate: 20,
    maxExpenseRatio: 60,
    maxReceivablesOverdueRatio: 25,
    maxDebtPressureRatio: 120,
  },
};

type RulesPayload = {
  sourceDocument?: string;
  version?: string;
  goals?: {
    targetSavingsRate?: number;
    maxExpenseRatio?: number;
    maxReceivablesOverdueRatio?: number;
    maxDebtPressureRatio?: number;
  };
};

function normalizeRules(payload?: RulesPayload) {
  return {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    sourceDocument: payload?.sourceDocument?.trim() || DEFAULT_RULES.sourceDocument,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    version: payload?.version?.trim() || DEFAULT_RULES.version,
    goals: {
      targetSavingsRate: Math.min(
        Math.max(Number(payload?.goals?.targetSavingsRate ?? DEFAULT_RULES.goals.targetSavingsRate), 1),
        80,
      ),
      maxExpenseRatio: Math.min(
        Math.max(Number(payload?.goals?.maxExpenseRatio ?? DEFAULT_RULES.goals.maxExpenseRatio), 10),
        95,
      ),
      maxReceivablesOverdueRatio: Math.min(
        Math.max(
          Number(payload?.goals?.maxReceivablesOverdueRatio ?? DEFAULT_RULES.goals.maxReceivablesOverdueRatio),
          1,
        ),
        100,
      ),
      maxDebtPressureRatio: Math.min(
        Math.max(Number(payload?.goals?.maxDebtPressureRatio ?? DEFAULT_RULES.goals.maxDebtPressureRatio), 1),
        500,
      ),
    },
  };
}

export async function GET() {
  try {
    const existing = await db
      .select({ valor: configuraciones.valor })
      .from(configuraciones)
      .where(eq(configuraciones.clave, CONFIG_KEY))
      .limit(1);

    if (!existing[0]?.valor) {
      return jsonResponse({ success: true, data: DEFAULT_RULES });
    }

    const parsed = normalizeRules(JSON.parse(existing[0].valor));
    return jsonResponse({ success: true, data: parsed });
  } catch (error: unknown) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Error cargando reglas" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as RulesPayload;
    const normalized = normalizeRules(body);

    const existing = await db
      .select({ id: configuraciones.id })
      .from(configuraciones)
      .where(eq(configuraciones.clave, CONFIG_KEY))
      .limit(1);

    if (existing[0]?.id) {
      await db
        .update(configuraciones)
        .set({
          valor: JSON.stringify(normalized),
          descripcion: "Reglas para analitica de salud financiera en contabilidad",
          tipo: "json",
          categoria: "finanzas",
          esPublica: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(configuraciones.id, existing[0].id));
    } else {
      await db.insert(configuraciones).values({
        clave: CONFIG_KEY,
        valor: JSON.stringify(normalized),
        descripcion: "Reglas para analitica de salud financiera en contabilidad",
        tipo: "json",
        categoria: "finanzas",
        esPublica: false,
        updatedAt: new Date().toISOString(),
      });
    }

    return jsonResponse({ success: true, data: normalized });
  } catch (error: unknown) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Error guardando reglas" },
      { status: 500 },
    );
  }
}
