import { buildAccountingDashboardMetrics, getAccountingDashboardData } from "@/lib/contabilidad/dashboard-data";
import { jsonResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CONNECTION_KEYWORDS = ["econnrefused", "etimedout", "enotfound", "network", "connect"];
const DATABASE_KEYWORDS = ["relation", "column", "syntax", "database", "password", "authentication"];

function getDashboardDiagnostics(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado";
  const normalized = message.toLowerCase();

  if (CONNECTION_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return {
      kind: "connection",
      message: "Sin datos disponibles por el momento. Revise la conexión con la base de datos.",
      error: message,
    };
  }

  if (DATABASE_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return {
      kind: "database",
      message: "Sin datos disponibles por el momento. La base de datos no respondió correctamente.",
      error: message,
    };
  }

  return {
    kind: "unknown",
    message: "Sin datos disponibles por el momento. No fue posible cargar la información financiera.",
    error: message,
  };
}

function getEmptyDashboardData() {
  return buildAccountingDashboardMetrics({
    movements: [],
    cajas: [],
    cuentasBancarias: [],
    periodLabel: "Sin datos",
  });
}

export async function GET() {
  try {
    const data = await getAccountingDashboardData();
    return jsonResponse({ success: true, data, diagnostics: { kind: "ok", message: "Datos cargados correctamente" } });
  } catch (error: unknown) {
    const diagnostics = getDashboardDiagnostics(error);
    console.error("[contabilidad dashboard] fallback", diagnostics);
    return jsonResponse({ success: true, data: getEmptyDashboardData(), diagnostics }, 200);
  }
}
