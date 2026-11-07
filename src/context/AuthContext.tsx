/**
 * CodeMate AI — Authentication & SaaS State Context
 * Provides global reactive state for current user, subscription tier, devices, and sessions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  SubscriptionSummary,
  SubscriptionPlan,
  UserDevice,
  UserSession,
} from '../types/auth';
import { AuthService } from '../services/auth-service';

interface AuthContextType {
  user: UserProfile | null;
  subscription: SubscriptionSummary | null;
  devices: UserDevice[];
  sessions: UserSession[];
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  login: (email: string, pwd: string) => Promise<void>;
  register: (email: string, pwd: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await AuthService.getSubscription();
      setSubscription(sub);
    } catch {
      // Ignored if unauthenticated or offline
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const devList = await AuthService.getDevices();
      setDevices(devList);
    } catch {
      // Ignored
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const sessList = await AuthService.getSessions();
      setSessions(sessList);
    } catch {
      // Ignored
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AuthService.getAccessToken();
      if (!token) {
        setUser(null);
        setSubscription(null);
        return;
      }

      const profile = await AuthService.getProfile();
      setUser(profile);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ codemate_user_v1: profile });
      }
      await Promise.all([refreshSubscription(), refreshDevices(), refreshSessions()]);
    } catch (err) {
      setUser(null);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSubscription, refreshDevices, refreshSessions]);

  useEffect(() => {
    refreshAuth();
    AuthService.getPlans().then(setPlans).catch(() => {});
  }, [refreshAuth]);

  const login = async (email: string, pwd: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const tokens = await AuthService.login(email, pwd);
      setUser(tokens.user);
      await Promise.all([refreshSubscription(), refreshDevices(), refreshSessions()]);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pwd: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.register(email, pwd, name);
      // Automatically log in after registration
      await login(email, pwd);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setSubscription(null);
      setDevices([]);
      setSessions([]);
      setIsLoading(false);
    }
  };

  const logoutAll = async () => {
    setIsLoading(true);
    try {
      await AuthService.logoutAll();
    } finally {
      setUser(null);
      setSubscription(null);
      setDevices([]);
      setSessions([]);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        devices,
        sessions,
        plans,
        isLoading,
        error,
        login,
        register,
        logout,
        logoutAll,
        refreshAuth,
        refreshSubscription,
        refreshDevices,
        refreshSessions,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
