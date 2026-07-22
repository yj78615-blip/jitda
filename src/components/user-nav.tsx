'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserNav() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  if (loading) {
    return (
      <nav className="user-nav">
        <span className="btn btn-ghost" style={{ opacity: 0.5 }}>—</span>
      </nav>
    );
  }

  if (user) {
    return (
      <nav className="user-nav">
        <Link className="btn btn-ghost" href="/studio">{user.display_name}님</Link>
        <button className="btn btn-ghost btn-logout" onClick={handleLogout}>로그아웃</button>
      </nav>
    );
  }

  return (
    <nav className="user-nav">
      <Link className="btn btn-ghost" href="/auth">로그인</Link>
      <Link className="btn btn-primary" href="/studio">스튜디오</Link>
    </nav>
  );
}
