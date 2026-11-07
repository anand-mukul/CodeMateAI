"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, UserProfile } from "./api";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("codemate_web_token") : null;
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(savedToken);
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch {
      // Attempt silent refresh
      const refreshedToken = await authApi.refreshToken();
      if (refreshedToken) {
        setToken(refreshedToken);
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          return;
        } catch {
          // fall through
        }
      }
      // Invalid or expired token
      if (typeof window !== "undefined") {
        localStorage.removeItem("codemate_web_token");
        localStorage.removeItem("codemate_refresh_token");
        localStorage.removeItem("codemate_user_role");
      }
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Ingest session token from extension deep-link query parameter (?session_token=...)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const sessionToken = url.searchParams.get("session_token");
      const refreshToken = url.searchParams.get("refresh_token");
      if (sessionToken) {
        localStorage.setItem("codemate_web_token", sessionToken);
        if (refreshToken) {
          localStorage.setItem("codemate_refresh_token", refreshToken);
        }
        url.searchParams.delete("session_token");
        url.searchParams.delete("refresh_token");
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
      }

      // 2. Listen for bi-directional auth sync event from extension content script
      const handleSyncMessage = (event: MessageEvent) => {
        if (event.data?.type === "CODEMATE_EXT_AUTH_SYNC" && event.data?.tokens?.access_token) {
          const { access_token, refresh_token: rToken, user: extUser } = event.data.tokens;
          const currentToken = localStorage.getItem("codemate_web_token");
          if (currentToken !== access_token) {
            localStorage.setItem("codemate_web_token", access_token);
            if (rToken) localStorage.setItem("codemate_refresh_token", rToken);
            setToken(access_token);
            if (extUser) setUser(extUser);
            refreshUser();
          }
        }
      };

      window.addEventListener("message", handleSyncMessage);

      // Request credentials from extension if installed and logged in
      window.postMessage({ type: "CODEMATE_REQUEST_AUTH_SYNC" }, "*");

      return () => {
        window.removeEventListener("message", handleSyncMessage);
      };
    }
  }, [refreshUser]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const resp = await authApi.login(email, password);
    setToken(resp.access_token);
    setUser(resp.user);

    // Broadcast auth sync to extension
    if (typeof window !== "undefined") {
      window.postMessage(
        {
          type: "CODEMATE_WEB_AUTH_SYNC",
          tokens: {
            access_token: resp.access_token,
            refresh_token: resp.refresh_token,
            user: resp.user,
          },
        },
        "*"
      );
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    await authApi.register(email, password, displayName);
    await login(email, password);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setToken(null);

    // Broadcast logout sync to extension
    if (typeof window !== "undefined") {
      window.postMessage({ type: "CODEMATE_WEB_LOGOUT_SYNC" }, "*");
    }
  };

  const resendVerification = async (targetEmail?: string) => {
    const emailToSend = targetEmail || user?.email;
    if (!emailToSend) throw new Error("No email available to send verification");
    await authApi.resendVerification(emailToSend);
  };

  const role = user?.role?.toUpperCase() || "";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isSupport = isAdmin || role === "SUPPORT_AGENT";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isSupport,
        login,
        register,
        logout,
        resendVerification,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

