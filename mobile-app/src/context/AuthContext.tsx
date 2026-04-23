import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getSessionRequest, loginRequest } from "@/services/auth";
import { setAuthToken } from "@/services/http";
import { clearToken, clearUser, getSavedUser, getToken, saveToken, saveUser } from "@/storage/session";
import { UserSummary } from "@/types/api";

interface AuthContextValue {
  loading: boolean;
  token: string | null;
  user: UserSummary | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedToken = await getToken();
        const savedUser = await getSavedUser();

        if (!savedToken) {
          setLoading(false);
          return;
        }

        setAuthToken(savedToken);
        setToken(savedToken);

        if (savedUser) {
          setUser(JSON.parse(savedUser) as UserSummary);
        }

        const session = await getSessionRequest();
        if (session.user) {
          setUser(session.user);
          await saveUser(JSON.stringify(session.user));
        }
      } catch {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        await clearToken();
        await clearUser();
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      user,
      signIn: async (username: string, password: string) => {
        const login = await loginRequest(username, password);

        setAuthToken(login.token);
        setToken(login.token);
        setUser(login.user);

        await saveToken(login.token);
        await saveUser(JSON.stringify(login.user));
      },
      signOut: async () => {
        setAuthToken(null);
        setToken(null);
        setUser(null);

        await clearToken();
        await clearUser();
      },
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
