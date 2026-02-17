"use client";
// AuthProvider for login persistence and auto-logout
// Only wraps, does not modify existing logic
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthToStorage, getAuthFromStorage, isAuthExpired, clearAuthStorage } from '../lib/auth/storage';

// AuthContext provides auth state and actions
interface AuthContextType {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  setAuth: (token: string | null, user: any | null) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  setAuth: (_token: string | null, _user: any | null) => { },
  logout: () => { },
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}
export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Called after successful login
  const setAuth = useCallback((token: string | null, user: any | null) => {
    setToken(token);
    setUser(user);
    saveAuthToStorage(token, user);
  }, []);

  // Logout and clear storage
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAuthStorage();
    // Navigate to server-side logout to ensure cookies are cleared before redirect
    window.location.href = '/api/auth/logout';
  }, []);

  // On mount, restore session if valid
  useEffect(() => {
    const run = async () => {
      // Prefer cookie-backed session as source of truth (avoids stale localStorage perms/token).
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data?.token && data?.user) {
            setToken(data.token);
            setUser(data.user);
            saveAuthToStorage(data.token, data.user);
            setIsLoading(false);
            return;
          }
        } else {
          // If company isn't selected, route to selector (don’t treat as logout)
          try {
            const j = await res.json();
            if (res.status === 400 && j?.code === 'NO_COMPANY') {
              setIsLoading(false);
              if (typeof window !== 'undefined' && window.location.pathname !== '/select-company') {
                router.replace('/select-company');
              }
              return;
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore and fallback to local storage
      }

      // Fallback: local storage (best-effort)
      const data = getAuthFromStorage();
      if (data && data.token && data.user && !isAuthExpired(data.loginTime)) {
        setToken(data.token);
        setUser(data.user);
        setIsLoading(false);
        return;
      }

      if (data) clearAuthStorage();
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    run().catch(() => {
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
  }, [router]);

  // Auto-logout after 24h
  useEffect(() => {
    if (!token) return;
    const data = getAuthFromStorage();
    if (!data || !data.loginTime) return;
    const expiresIn = 24 * 60 * 60 * 1000 - (Date.now() - data.loginTime);
    if (expiresIn <= 0) {
      logout();
      return;
    }
    const timeout = setTimeout(() => {
      logout();
    }, expiresIn);
    return () => clearTimeout(timeout);
  }, [token, logout]);

  // Provide loader while validating session
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
