import { http } from "@/services/http";
import { ApiResponse } from "@/types/api";

export interface Movement {
  id: string;
  tipo: string;
  monto: string;
  descripcion: string;
  fecha: string;
  metodo: string;
  categoria: string;
}

export interface MonthData {
  mes: string;
  ingresos: number;
  gastos: number;
}

export interface DashboardStats {
  totalClientes: number;
  recentMovements: Movement[];
  finance: {
    saldoTotalEfectivo: number;
    cajaPrincipal: number;
    cajaPapeleria: number;
    history: MonthData[];
  };
}

export async function getDashboardData(): Promise<DashboardStats> {
  const [clientsRes, movementsRes, cajaStatsRes, cajaPrincipalRes, papeleriaStatsRes] = await Promise.allSettled([
    http.get("/api/clientes", { params: { limit: 1 } }),
    http.get("/api/recent-movements"),
    http.get("/api/caja-stats"),
    http.get("/api/caja-principal"),
    http.get("/api/papeleria-stats")
  ]);

  const val = <T>(r: PromiseSettledResult<{ data: T }>) =>
    r.status === "fulfilled" ? r.value.data : null;

  return {
    totalClientes: (val(clientsRes) as any)?.meta?.pagination?.total || 0,
    recentMovements: (val(movementsRes) as any)?.data || [],
    finance: {
      saldoTotalEfectivo: (val(cajaStatsRes) as any)?.data?.saldoTotal || 0,
      cajaPrincipal: (val(cajaPrincipalRes) as any)?.data?.balanceActual || 0,
      cajaPapeleria: (val(papeleriaStatsRes) as any)?.data?.balanceActual || 0,
      history: (val(cajaStatsRes) as any)?.data?.ultimosMeses || []
    }
  };
}
export interface LookupData {
  cajas: { id: string; nombre: string }[];
  cuentasBancarias: { id: string; numeroCuenta: string; bankNombre: string; nombreOficialCuenta: string }[];
}

export async function getLookupData(): Promise<LookupData> {
  const response = await http.get<ApiResponse<LookupData>>("/api/contabilidad/lookup");
  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo cargar la información de cuentas");
  }
  return response.data.data;
}
