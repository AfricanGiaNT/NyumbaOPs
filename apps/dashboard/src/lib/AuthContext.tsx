"use client";

import { createContext, useContext, useEffect, useState } from "react";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") + "/api";

const TOKEN_KEY = "nyumbaops_token";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const stored = localStorage.getItem(`${TOKEN_KEY}_user`);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser({ id: payload.sub, email: "", role: payload.role });
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(`${TOKEN_KEY}_user`);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.message ?? "Invalid email or password");
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(`${TOKEN_KEY}_user`, JSON.stringify(data.user));
    setUser(data.user);
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(`${TOKEN_KEY}_user`);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
