import { Platform } from "react-native";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "");
}

function getDefaultApiBaseUrl(): string {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://127.0.0.1:3000";
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultApiBaseUrl(),
);
