"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserResponse } from "@/types/user";
import { getCurrentUser } from "@/lib/api/meetings";
import { getToken, removeToken } from "@/lib/auth";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  authenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      removeToken();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      refreshUser();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const authenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
