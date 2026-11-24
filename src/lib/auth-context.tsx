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

// 액세스 토큰은 메모리에만 둔다 (보안 명세 §3.3). 새로고침하면 refresh 쿠키로 복원.
let accessToken: string | null = null;

// refresh 토큰은 1회용이라 탭끼리 겹쳐 쓰면 한쪽이 죽는다. 쿠키를 바꾸는 요청은 탭 간에 줄 세운다.
function withAuthLock<T>(fn: () => Promise<T>): Promise<T> {
  // ponytail: Web Locks 미지원 환경은 잠금 없이 진행 (서버 유예가 받쳐준다)
  if (!navigator.locks) return fn();
  return navigator.locks.request('jitda_auth', fn) as Promise<T>;
}

// 같은 탭의 동시 호출(StrictMode 이중 effect 등)은 요청 하나를 공유한다.
let inflight: Promise<AuthUser | null> | null = null;

function refreshSession(): Promise<AuthUser | null> {
  inflight ??= withAuthLock(async () => {
    accessToken = null;
    const res = await fetch('/api/v1/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string; user: AuthUser };
    accessToken = data.access_token;
    return data.user;
  }).catch(() => null).finally(() => { inflight = null; });
  return inflight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 부팅 시 세션 복원: refresh 왕복 1회.
  useEffect(() => {
    // 예전 버전이 localStorage 에 남긴 토큰 제거
    try { localStorage.removeItem('jitda_access_token'); } catch { /* noop */ }

    let cancelled = false;
    refreshSession().then((u) => {
      if (cancelled) return;
      setUser(u);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await withAuthLock(() => fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }));
    const data = await res.json() as { access_token?: string; user?: AuthUser; error?: { message: string } };
    if (!res.ok) throw new Error(data.error?.message ?? '로그인에 실패했습니다.');
    accessToken = data.access_token!;
    setUser(data.user ?? null);
  }, [router]);

  const signup = useCallback(async (body: { email: string; password: string; display_name: string; handle: string }) => {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json() as {
      error?: { message: string; details?: { fields?: Record<string, string> } };
    };
    if (!res.ok) {
      const fields = data.error?.details?.fields;
      const detail = fields
        ? Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(' · ')
        : null;
      throw new Error(detail ? `${data.error?.message ?? '회원가입 실패'} (${detail})` : (data.error?.message ?? '회원가입에 실패했습니다.'));
    }
    await login(body.email, body.password);
  }, [login]);

  const logout = useCallback(async () => {
    await withAuthLock(() => fetch('/api/v1/auth/logout', { method: 'POST' })).catch(() => {});
    accessToken = null;
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  const refresh = useCallback(async () => {
    setUser(await refreshSession());
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
  return accessToken;
}
