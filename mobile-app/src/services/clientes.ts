import { http } from "@/services/http";
import { ApiResponse, ClienteDetail, ClienteListItem } from "@/types/api";

interface PaginatedPayload<T> {
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ClienteDetailResponse {
  success?: boolean;
  error?: string;
  client: ClienteDetail;
  invoices?: unknown[];
  tickets?: unknown[];
  subscriptions?: unknown[];
  history?: unknown[];
}

export async function getClientes(search = ""): Promise<ClienteListItem[]> {
  const response = await http.get<ApiResponse<PaginatedPayload<ClienteListItem>>>("/api/clientes", {
    params: {
      page: 1,
      limit: 1000,
      search,
      sortBy: "nombre",
      sortOrder: "asc",
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo cargar clientes");
  }

  const payload = response.data.data;

  if (Array.isArray(payload)) {
    return payload as ClienteListItem[];
  }

  return payload.data || [];
}

export async function getClienteById(clienteId: string): Promise<ClienteDetailResponse> {
  const response = await http.get<ClienteDetailResponse>(`/api/clientes/${clienteId}`);

  if (response.data.success === false) {
    throw new Error(response.data.error || "No se pudo cargar detalle del cliente");
  }

  return response.data;
}
