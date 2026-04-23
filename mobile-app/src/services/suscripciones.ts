import { http } from "@/services/http";
import { ApiResponse, SuscripcionItem } from "@/types/api";

interface SuscripcionesPayload {
  suscripciones: SuscripcionItem[];
  total: number;
}

export async function getSuscripciones(search = ""): Promise<SuscripcionItem[]> {
  const response = await http.get<ApiResponse<SuscripcionesPayload>>("/api/suscripciones", {
    params: {
      search,
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo cargar suscripciones");
  }

  return response.data.data.suscripciones || [];
}
