import axios from "axios";

import { API_BASE_URL } from "@/config/env";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  config.headers["Content-Type"] = "application/json";
  return config;
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Error inesperado";
}
