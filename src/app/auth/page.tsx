'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

type Tab = 'login' | 'signup';

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="auth-page" />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const { login, signup } = useAuth();
  const redirectTo = searchParams.get('redirect') || '/';
  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', handle: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        if (form.password !== form.confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          setLoading(false);
          return;
        }
        await signup({
          email: form.email,
          password: form.password,
          display_name: form.name,
          handle: form.handle,
        });
      } else {
        await login(form.email, form.password);
      }
      // hard navigation — ensures middleware sees refresh cookie
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Link href="/" className="auth-brand">
          <span className="brand-mark">IF</span>
          
        </Link>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
              role="tab"
              aria-selected={tab === 'login'}
            >
              로그인
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setError(''); }}
              role="tab"
              aria-selected={tab === 'signup'}
            >
              회원가입
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <>
                <div className="auth-field">
                  <label htmlFor="name">이름</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="작가명 또는 닉네임"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    maxLength={30}
                    autoComplete="name"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="handle">@핸들</label>
                  <input
                    id="handle"
                    type="text"
                    placeholder="myname"
                    value={form.handle}
                    onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-z0-9_]{3,20}"
                    autoComplete="username"
                  />
                  <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                    영문 소문자·숫자·언더스코어(_) 3~20자. 프로필 주소: <code>if.kr/@{form.handle || 'myname'}</code>
                  </small>
                </div>
              </>
            )}

            <div className="auth-field">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                placeholder="hello@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={10}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'signup' && (
              <div className="auth-field">
                <label htmlFor="confirmPassword">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : tab === 'login' ? (
                '로그인'
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>또는</span>
          </div>

          <div className="auth-social">
            <button className="auth-social-btn google" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google로 계속
            </button>
            <button className="auth-social-btn naver" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#03C75A" d="M16.273 12.845 7.727 3.818H3.818v16.364h3.909V8.127l8.546 9.027h3.909V3.818h-3.909z"/></svg>
              네이버로 계속
            </button>
          </div>

          <p className="auth-terms">
            가입하면 <Link href="/legal/terms">이용약관</Link>과{' '}
            <Link href="/legal/privacy">개인정보처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
