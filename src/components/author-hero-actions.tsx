'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/* ================================================================
   AuthorHeroActions — 팔로우/구독/후원 버튼 + 모달 (히어로 영역)
   목업: public/mockups/author.html
   ================================================================ */

interface Props {
  authorId: string;
  displayName: string;
  handle: string;
  subscription: { enabled: boolean; price: number | null; currency: string };
}

export default function AuthorHeroActions({ authorId, displayName, handle, subscription }: Props) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [modal, setModal] = useState<'subscribe' | 'tip' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetch(`/api/v1/follow/${authorId}`)
      .then(r => r.json())
      .then(d => setFollowing(d.following))
      .catch(() => {});
  }, [authorId, user, authLoading]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleFollow = useCallback(async () => {
    if (!user) { router.push('/auth?redirect=/' + handle); return; }
    setFollowLoading(true);
    try {
      if (following) {
        await fetch(`/api/v1/follow/${authorId}`, { method: 'DELETE' });
        setFollowing(false);
        showToast('팔로우를 취소했습니다');
      } else {
        await fetch(`/api/v1/follow/${authorId}`, { method: 'POST' });
        setFollowing(true);
        showToast(`${displayName}님을 팔로우합니다`);
      }
    } catch { showToast('잠시 후 다시 시도해주세요'); }
    setFollowLoading(false);
  }, [user, following, authorId, displayName, handle, router, showToast]);

  return (
    <>
      <div className="author-hero-actions">
        <button
          className={`author-act-btn ${following ? 'author-act-following' : 'author-act-follow'}`}
          onClick={toggleFollow}
          disabled={followLoading}
        >
          {following ? '팔로잉' : '팔로우'}
        </button>
        {subscription.enabled && (
          <button className="author-act-btn author-act-subscribe" onClick={() => {
            if (!user) { router.push('/auth?redirect=/' + handle); return; }
            setModal('subscribe');
          }}>
            구독하기
          </button>
        )}
        <button className="author-act-btn author-act-tip" onClick={() => {
          if (!user) { router.push('/auth?redirect=/' + handle); return; }
          setModal('tip');
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M2 12h20" />
          </svg>
          후원
        </button>
      </div>

      {/* Subscribe modal */}
      {modal === 'subscribe' && (
        <div className="author-modal-backdrop" onClick={() => setModal(null)}>
          <div className="author-modal" onClick={e => e.stopPropagation()}>
            <div className="author-modal-head">
              <div>
                <div className="author-modal-title">정기 구독</div>
                <div className="author-modal-subtitle">{displayName}님의 구독 작품을 모두 감상하세요</div>
              </div>
              <button className="author-modal-close" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="author-price-block">
              <span className="author-price-amount">{subscription.price?.toLocaleString('ko-KR')}</span>
              <span className="author-price-per">원 / 월</span>
            </div>
            <div className="author-benefits">
              <div className="author-benefit">
                <span className="author-benefit-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                구독자 전용 에피소드 열람
              </div>
              <div className="author-benefit">
                <span className="author-benefit-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                광고 없는 감상
              </div>
              <div className="author-benefit">
                <span className="author-benefit-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                새 작품 알림 우선 수신
              </div>
            </div>
            <button className="author-modal-cta" disabled>스트라이프 결제 준비 중</button>
            <div className="author-modal-note">매월 자동 결제되며, 언제든지 해지할 수 있습니다.</div>
          </div>
        </div>
      )}

      {/* Tip modal */}
      {modal === 'tip' && (
        <div className="author-modal-backdrop" onClick={() => setModal(null)}>
          <div className="author-modal" onClick={e => e.stopPropagation()}>
            <div className="author-modal-head">
              <div>
                <div className="author-modal-title">후원하기</div>
                <div className="author-modal-subtitle">{displayName}님을 응원합니다</div>
              </div>
              <button className="author-modal-close" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="author-price-block">
              <span className="author-price-amount">—</span>
              <span className="author-price-per">원</span>
            </div>
            <button className="author-modal-cta" disabled>스트라이프 결제 준비 중</button>
            <div className="author-modal-note">후원은 PayPal/Stripe를 통해 안전하게 처리됩니다.</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="author-toast-root" aria-live="polite">
          <div className="author-toast">{toast}</div>
        </div>
      )}
    </>
  );
}
