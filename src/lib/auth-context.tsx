'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ---- Types ----

export interface AuthUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_author: boolean;
  created_at: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (body: { email: string; password: string; display_name: string; handle: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ---- Context ----

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = 'jitda_access_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/v1/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('session expired');
        return res.json() as Promise<{ user: AuthUser }>;
      })
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setStoredToken(null);
        return fetch('/api/v1/auth/refresh', { method: 'POST' })
          .then((r) => {
            if (!r.ok) throw new Error('refresh failed');
            return r.json() as Promise<{ access_token: string }>;
          })
          .then((data) => {
            setStoredToken(data.access_token);
            return fetch('/api/v1/auth/me', {
              headers: { authorization: `Bearer ${data.access_token}` },
            });
          })
          .then((r) => {
            if (!r.ok) throw new Error('me failed');
            return r.json() as Promise<{ user: AuthUser }>;
          })
          .then((data) => setUser(data.user))
          .catch(() => setUser(null));
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { access_token?: string; user?: AuthUser; error?: { message: string } };
    if (!res.ok) throw new Error(data.error?.message ?? '로그인에 실패했습니다.');
    setStoredToken(data.access_token!);
    setUser(data.user ?? null);
  }, [router]);

  const signup = useCallback(async (body: { email: string; password: string; display_name: string; handle: string }) => {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { error?: { message: string } };
    if (!res.ok) throw new Error(data.error?.message ?? '회원가입에 실패했습니다.');
    await login(body.email, body.password);
  }, [login]);

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    setStoredToken(null);
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/v1/auth/refresh', { method: 'POST' });
    if (!res.ok) {
      setStoredToken(null);
      setUser(null);
      return;
    }
    const data = await res.json() as { access_token: string };
    setStoredToken(data.access_token);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getAccessToken(): string | null {
  return getStoredToken();
}
