import { http } from "@/services/http";
import { ApiResponse, UserSummary } from "@/types/api";

interface LoginData {
  token: string;
  sessionId: string;
  user: UserSummary;
}

interface SessionData {
  user: UserSummary | null;
}

export async function loginRequest(username: string, password: string): Promise<LoginData> {
  const response = await http.post<ApiResponse<LoginData>>("/api/auth/login", {
    username,
    password,
  });

  if (!response.data.success) {
    throw new Error(response.data.error || "No se pudo iniciar sesión");
  }

  return response.data.data;
}

export async function getSessionRequest(): Promise<SessionData> {
  const response = await http.get<SessionData & { success?: boolean; error?: string }>("/api/auth/session");

  if (response.data.success === false) {
    throw new Error(response.data.error || "No se pudo validar sesión");
  }

  return {
    user: response.data.user || null,
  };
}
