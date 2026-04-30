import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "sg_mobile_token";
const USER_KEY = "sg_mobile_user";

const isWeb = Platform.OS === "web";

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
}

export async function clearToken(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function saveUser(user: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(USER_KEY, user);
  } else {
    await SecureStore.setItemAsync(USER_KEY, user);
  }
}

export async function getSavedUser(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(USER_KEY);
  } else {
    return SecureStore.getItemAsync(USER_KEY);
  }
}

export async function clearUser(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(USER_KEY);
  } else {
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}
