'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getAccessToken } from '@/lib/auth-context';

/* ================================================================
   AuthorHeroActions — 팔로우/구독/후원 버튼 + 모달
   목업: public/mockups/author.html (act-btn 규약)
   ================================================================ */

interface Props {
  authorId: string;
  displayName: string;
  handle: string;
  subscription: { enabled: boolean; price: number | null; currency: string };
}

const fmtKRW = (n: number) => n.toLocaleString('ko-KR') + '원';

export default function AuthorHeroActions({ authorId, displayName, handle, subscription }: Props) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [modal, setModal] = useState<'subscribe' | 'tip' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const token = getAccessToken();
    if (!token) return;
    fetch(`/api/v1/follow/${authorId}`, { headers: { authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setFollowing(d.following); })
      .catch(() => {});
  }, [authorId, user, authLoading]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleFollow = useCallback(async () => {
    if (!user) { router.push('/auth?redirect=/@' + handle); return; }
    const token = getAccessToken();
    if (!token) { router.push('/auth?redirect=/@' + handle); return; }

    setFollowLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch(`/api/v1/follow/${authorId}`, {
        method,
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) { showToast('잠시 후 다시 시도해주세요'); return; }
      if (following) { setFollowing(false); showToast('팔로우를 취소했습니다'); }
      else { setFollowing(true); showToast(`${displayName}님을 팔로우합니다`); }
    } catch { showToast('잠시 후 다시 시도해주세요'); }
    finally { setFollowLoading(false); }
  }, [user, following, authorId, displayName, handle, router, showToast]);

  const requireLogin = () => { router.push('/auth?redirect=/@' + handle); };

  return (
    <>
      <div className="hero-actions">
        <button
          className={`act-btn ${following ? 'following' : 'follow'}`}
          onClick={toggleFollow}
          disabled={followLoading}
        >
          {following ? '팔로잉' : '＋ 팔로우'}
        </button>

        {subscription.enabled && (
          <button
            className="act-btn subscribe"
            onClick={() => (user ? setModal('subscribe') : requireLogin())}
          >
            구독하기{subscription.price != null && ` · ${fmtKRW(subscription.price)}/월`}
          </button>
        )}

        <button
          className="act-btn tip"
          onClick={() => (user ? setModal('tip') : requireLogin())}
        >
          💝 팁 보내기
        </button>
      </div>

      {modal === 'subscribe' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">정기 구독</div>
                <div className="modal-subtitle">{displayName}님의 구독 작품을 모두 감상하세요</div>
              </div>
              <button className="modal-close" onClick={() => setModal(null)} aria-label="닫기">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {subscription.price != null && (
              <div className="price-block">
                <span className="price-amount">{subscription.price.toLocaleString('ko-KR')}</span>
                <span className="price-per">원 / 월</span>
              </div>
            )}
            <div className="benefits">
              <div className="benefit">구독자 전용 회차 열람</div>
              <div className="benefit">사랑방 이용</div>
              <div className="benefit">신작 알림 우선 수신</div>
            </div>
            <button className="modal-cta" disabled>Stripe 결제 준비 중</button>
            <div className="modal-note">매월 자동 결제되며 언제든지 해지할 수 있습니다.</div>
          </div>
        </div>
      )}

      {modal === 'tip' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">팁 보내기</div>
                <div className="modal-subtitle">{displayName}님을 응원합니다</div>
              </div>
              <button className="modal-close" onClick={() => setModal(null)} aria-label="닫기">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button className="modal-cta" disabled>Stripe 결제 준비 중</button>
            <div className="modal-note">후원은 Stripe를 통해 안전하게 처리됩니다.</div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-root" aria-live="polite">
          <div className="toast">{toast}</div>
        </div>
      )}
    </>
  );
}
