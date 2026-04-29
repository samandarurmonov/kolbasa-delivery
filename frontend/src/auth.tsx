import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { tokenStore } from "./storage";
import { api } from "./api";

export type Role = "admin" | "agent" | "warehouse";

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: Role;
  is_active: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = await tokenStore.getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await api<AuthUser>("/auth/me");
      setUser(me);
      await tokenStore.setUser(me);
    } catch {
      await tokenStore.clearToken();
      await tokenStore.clearUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (phone: string, pin: string) => {
    const res = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { phone, pin },
      auth: false,
    });
    await tokenStore.setToken(res.token);
    await tokenStore.setUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clearToken();
    await tokenStore.clearUser();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      await signOut();
    }
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signOut, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
