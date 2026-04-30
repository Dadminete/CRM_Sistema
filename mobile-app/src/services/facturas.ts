import { http } from "@/services/http";
import { ApiResponse, FacturaListItem } from "@/types/api";

interface FacturasDashboardData {
  resumen: {
    cobradoMesActual: number;
    facturadoMesActual: number;
    montoPendienteGlobal: number;
    montoAdelantadoPendiente: number;
    facturasParciales: number;
    pagadasMesActual: {
      count: number;
      monto: number;
    };
    tendenciaCobros: {
      dia: string;
      monto: number;
    }[];
    // Legacy support fields
    totalFacturas: number;
    montoFacturado: number;
    facturasPendientes: number;
    montoPendiente: number;
    montoParcialPendiente: number;
    facturasAdelantadas: number;
    facturasPagadas: number;
    montoPagado: number;
    facturasAnuladas: number;
    montoAnulado: number;
  };
  recientes: FacturaListItem[];
  vencidas: unknown[];
  topDeudores: unknown[];
}

export async function getFacturasDashboard(): Promise<FacturasDashboardData> {
  const response = await http.get<ApiResponse<FacturasDashboardData>>("/api/facturas/dashboard");
  
  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo cargar el dashboard de facturas");
  }

  return response.data.data;
}

export async function getFacturasList(search = "", status = ""): Promise<FacturaListItem[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  
  const response = await http.get<ApiResponse<FacturaListItem[]>>(`/api/facturas/dashboard/listados?${params.toString()}`);
  
  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo cargar la lista de facturas");
  }

  return response.data.data;
}

export interface PaymentPayload {
  facturaId: string;
  clienteId: string;
  monto: number;
  metodoPago: "efectivo" | "transferencia" | "tarjeta";
  descuento?: number;
  numeroReferencia?: string;
  cajaId?: string;
  cuentaBancariaId?: string;
  observaciones?: string;
}

export async function pagarFactura(payload: PaymentPayload): Promise<any> {
  const response = await http.post<ApiResponse<any>>("/api/facturas/pagar", payload);
  
  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo procesar el pago");
  }

  return response.data.data;
}
