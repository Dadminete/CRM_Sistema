import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "sg_mobile_token";
const USER_KEY = "sg_mobile_user";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, user);
}

export async function getSavedUser(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function clearUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}
