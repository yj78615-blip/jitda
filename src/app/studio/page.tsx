'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, type AuthUser } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

/* ---------- types ---------- */
interface SeriesItem {
  id: string; title: string; status: string; episode_count: number;
  description?: string | null; genres?: string[];
  stats: { views_total: number; likes_total: number; subscribers_only_count: number };
  updated_at: string; created_at: string;
}
interface SeriesListResp { items: SeriesItem[] }

type Section = 'dashboard' | 'works' | 'upload' | 'payouts' | 'settings';
type WorksTab = 'series' | 'posts';

/* ---------- helpers ---------- */
const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};
const fmtKRW = (n: number): string => n.toLocaleString('ko-KR');

const relTime = (iso: string): string => {
  const min = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `${Math.floor(min)}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.floor(min / 60 / 24)}일 전`;
  return `${Math.floor(min / 60 / 24 / 7)}주 전`;
};

const INITIALS = (name?: string | null): string =>
  (name || '?').charAt(0).toUpperCase();

const NAV_ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'dashboard', label: '대시보드', icon: 'M3 3h7v9H3zm11 0h7v5h-7zm0 9h7v9h-7zM3 16h7v5H3z' },
  { key: 'works', label: '작품 관리', icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { key: 'upload', label: '업로드', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m17-7-5-5-5 5m5-5v12' },
  { key: 'payouts', label: '정산', icon: 'M2 5h20v14H2zm0 5h20' },
  { key: 'settings', label: '설정', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-9-3h2m14 0h2M5.64 5.64l1.41 1.41m9.9 9.9 1.41 1.41M4.22 16.78l1.42-1.42m12.72-12.72 1.42 1.42' },
];

/* ================================================================
   Component
   ================================================================ */

export default function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('dashboard');
  const [worksTab, setWorksTab] = useState<WorksTab>('series');
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeries = useCallback(async (uid: string) => {
    try {
      const r = await fetch(`/api/v1/series?author_id=${uid}`);
      if (r.ok) {
        const d: SeriesListResp = await r.json();
        setSeries(d.items ?? []);
      }
    } catch { /* empty fallback */ }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth?redirect=/studio'); return; }
    setLoading(true);
    fetchSeries(user.id).finally(() => setLoading(false));
  }, [user, authLoading, router, fetchSeries]);

  // ⚠️ all hooks must live ABOVE the conditional return (Rules of Hooks)
  const totalViews = series.reduce((s, i) => s + i.stats.views_total, 0);
  const totalLikes = series.reduce((s, i) => s + i.stats.likes_total, 0);
  const topSeries = useMemo(() =>
    [...series].sort((a, b) => b.stats.views_total - a.stats.views_total).slice(0, 5),
    [series]
  );

  if (authLoading) {
    return (
      <div className="studio-page">
        <div className="studio-loading"><span className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="studio-page">
      {/* Sidebar */}
      <aside className="studio-sidebar">
        <div className="studio-sidebar-head">
          <Link href="/" className="brand">
            <span className="brand-mark">IF</span>
          </Link>
        </div>
        <div className="studio-nav-section">Author</div>
        <nav className="studio-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`studio-nav-item${section === item.key ? ' active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="studio-sidebar-foot">
          <div className="studio-me-card">
            <div className="studio-me-avatar">{INITIALS(user?.display_name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="studio-me-name">{user?.display_name || '—'}</div>
              <div className="studio-me-handle">@{user?.handle || '—'}</div>
            </div>
          </div>
          <Link href="/" className="studio-out-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
            IF 사이트로
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="studio-main">
        {section === 'dashboard' && (
          <DashboardSection
            series={series}
            totalViews={totalViews}
            totalLikes={totalLikes}
            topSeries={topSeries}
            loading={loading}
            onNav={setSection}
          />
        )}
        {section === 'works' && (
          <WorksSection
            series={series}
            tab={worksTab}
            onTabChange={setWorksTab}
            loading={loading}
            onNav={setSection}
          />
        )}
        {section === 'upload' && <UploadSection />}
        {section === 'payouts' && <PayoutsSection />}
        {section === 'settings' && <SettingsSection user={user} />}
      </main>
    </div>
  );
}

/* ================================================================
   Dashboard
   ================================================================ */

function DashboardSection({
  series, totalViews, totalLikes, topSeries, loading, onNav,
}: {
  series: SeriesItem[]; totalViews: number; totalLikes: number;
  topSeries: SeriesItem[]; loading: boolean; onNav: (s: Section) => void;
}) {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">대시보드</h1>
          <div className="studio-page-sub">이번 달 활동을 한눈에</div>
        </div>
        <div className="studio-page-actions">
          <button className="btn btn-ghost" onClick={() => onNav('works')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            작품 관리
          </button>
          <button className="btn studio-btn-accent" onClick={() => onNav('upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            새 회차 · 포스트
          </button>
        </div>
      </div>

      {loading ? (
        <div className="studio-loading"><span className="spinner" /></div>
      ) : (
        <>
          <div className="studio-kpi-grid">
            <div className="studio-kpi">
              <div className="studio-kpi-label">
                <span>총 조회수</span>
                <span className="studio-kpi-delta neutral">전체</span>
              </div>
              <div className="studio-kpi-value">{fmtNum(totalViews)}</div>
            </div>
            <div className="studio-kpi">
              <div className="studio-kpi-label"><span>작품 수</span></div>
              <div className="studio-kpi-value">{series.length}</div>
              <div className="studio-kpi-note">
                {series.filter((s) => s.status === 'ONGOING').length}개 연재중
              </div>
            </div>
            <div className="studio-kpi">
              <div className="studio-kpi-label"><span>좋아요</span></div>
              <div className="studio-kpi-value">{fmtNum(totalLikes)}</div>
            </div>
            <div className="studio-kpi accent">
              <div className="studio-kpi-label"><span>예상 정산액</span></div>
              <div className="studio-kpi-value money">{series.length > 0 ? fmtKRW(totalViews) : '0'}</div>
              <div className="studio-kpi-note">준비 중 · 수익 모델 도입 예정</div>
            </div>
          </div>

          <div className="studio-col-2">
            <div className="studio-card">
              <div className="studio-card-head">
                <h2 className="studio-card-title">내 작품<span className="count">{series.length}</span></h2>
                <button className="studio-card-link" onClick={() => onNav('works')}>전체 보기 →</button>
              </div>
              {series.length === 0 ? (
                <div className="studio-empty">아직 작품이 없어요. 업로드에서 시작해보세요.</div>
              ) : (
                <div className="studio-top-list">
                  {series.slice(0, 5).map((s, i) => (
                    <div key={s.id} className="studio-top-item">
                      <div className="studio-top-rank">{i + 1}</div>
                      <div className="studio-top-thumb" />
                      <div className="studio-top-body">
                        <div className="studio-top-line1">{s.title}</div>
                        <div className="studio-top-line2">{fmtNum(s.stats.views_total)} 조회</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="studio-card">
              <div className="studio-card-head">
                <h2 className="studio-card-title">최근 활동</h2>
              </div>
              {series.length === 0 ? (
                <div className="studio-empty">활동 내역이 없어요.</div>
              ) : (
                <div className="studio-tip-list">
                  {topSeries.slice(0, 4).map((s) => (
                    <div key={s.id} className="studio-tip-item">
                      <div className="studio-tip-avatar">{INITIALS(s.title)}</div>
                      <div className="studio-tip-body">
                        <div className="studio-tip-hd">
                          <span className="studio-tip-name">{s.title}</span>
                          <span className="studio-tip-time">{relTime(s.updated_at)}</span>
                        </div>
                        <div className="studio-tip-msg">
                          {s.status === 'COMPLETED' ? '완결' : '연재중'} · {s.episode_count}화
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ================================================================
   Works
   ================================================================ */

function WorksSection({
  series, tab, onTabChange, loading, onNav,
}: {
  series: SeriesItem[]; tab: WorksTab; onTabChange: (t: WorksTab) => void;
  loading: boolean; onNav: (s: Section) => void;
}) {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">작품 관리</h1>
          <div className="studio-page-sub">
            시리즈 {series.length}개{/* · 포스트 0개 */}
          </div>
        </div>
        <div className="studio-page-actions">
          <button className="btn studio-btn-accent" onClick={() => onNav('upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            새로 만들기
          </button>
        </div>
      </div>

      <div className="studio-works-tabs">
        <button
          className={`studio-works-tab${tab === 'series' ? ' active' : ''}`}
          onClick={() => onTabChange('series')}
        >
          시리즈
        </button>
        <button
          className={`studio-works-tab${tab === 'posts' ? ' active' : ''}`}
          onClick={() => onTabChange('posts')}
        >
          개별 포스트
        </button>
      </div>

      {loading ? (
        <div className="studio-loading"><span className="spinner" /></div>
      ) : tab === 'series' ? (
        series.length === 0 ? (
          <div className="studio-empty">아직 시리즈가 없어요. 업로드에서 시작해보세요.</div>
        ) : (
          <div className="studio-table-wrap">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>작품</th>
                  <th>상태</th>
                  <th className="num">회차</th>
                  <th className="num">총 조회수</th>
                  <th className="num">좋아요</th>
                  <th>업데이트</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="studio-table-title-cell">
                        <div className="studio-table-thumb" />
                        <div>
                          <Link href={`/series/${s.id}`} className="studio-table-title">{s.title}</Link>
                          <div className="studio-table-sub">{s.genres?.[0] || '기타'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`studio-status-pill ${s.status === 'COMPLETED' ? 'completed' : 'ongoing'}`}>
                        {s.status === 'COMPLETED' ? '완결' : '연재중'}
                      </span>
                    </td>
                    <td className="num">{s.episode_count}</td>
                    <td className="num">{fmtNum(s.stats.views_total)}</td>
                    <td className="num">{fmtNum(s.stats.likes_total)}</td>
                    <td>{relTime(s.updated_at)}</td>
                    <td>
                      <div className="studio-row-actions">
                        <button className="studio-row-btn">편집</button>
                        <button className="studio-row-btn">+ 새 회차</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="studio-empty">개별 포스트 기능은 준비 중입니다.</div>
      )}
    </>
  );
}

/* ================================================================
   Upload
   ================================================================ */

function UploadSection() {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">업로드</h1>
          <div className="studio-page-sub">새 회차 또는 개별 포스트 업로드</div>
        </div>
      </div>
      <div className="studio-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)"
          strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>업로드 기능 준비 중</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
          이미지 업로드, 에피소드 편집, 포스트 작성 기능이 곧 추가됩니다.
        </p>
      </div>
    </>
  );
}

/* ================================================================
   Payouts
   ================================================================ */

function PayoutsSection() {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">정산</h1>
          <div className="studio-page-sub">수익 현황 및 정산 내역</div>
        </div>
      </div>
      <div className="studio-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)"
          strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>정산 기능 준비 중</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
          수익 모델 도입 후 정산 내역을 확인할 수 있습니다.
        </p>
      </div>
    </>
  );
}

/* ================================================================
   Settings
   ================================================================ */

function SettingsSection({ user }: { user: AuthUser | null }) {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">설정</h1>
          <div className="studio-page-sub">프로필 및 작가 계정 설정</div>
        </div>
      </div>

      <div className="studio-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>프로필</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="studio-kpi-label" style={{ marginBottom: 4 }}>표시 이름</label>
            <div className="studio-table-title">{user?.display_name || '—'}</div>
          </div>
          <div>
            <label className="studio-kpi-label" style={{ marginBottom: 4 }}>핸들</label>
            <div className="studio-table-title">@{user?.handle || '—'}</div>
          </div>
        </div>
      </div>

      <div className="studio-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          추가 설정은 준비 중입니다
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          알림 · 정산 계좌 · 작가 프로필 설정이 곧 추가됩니다.
        </p>
      </div>
    </>
  );
}