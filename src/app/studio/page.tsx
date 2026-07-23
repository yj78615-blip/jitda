'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useAuth, getAccessToken, type AuthUser } from '@/lib/auth-context';
import { GENRES } from '@/lib/genres';
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
            onRefresh={async () => { if (user) await fetchSeries(user.id); }}
          />
        )}
        {section === 'upload' && (
          <UploadSection
            series={series}
            onCreated={async () => {
              if (user) await fetchSeries(user.id);
              setSection('works');
            }}
          />
        )}
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
  series, tab, onTabChange, loading, onNav, onRefresh,
}: {
  series: SeriesItem[]; tab: WorksTab; onTabChange: (t: WorksTab) => void;
  loading: boolean; onNav: (s: Section) => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteSeries = async (id: string, title: string) => {
    if (!confirm(`"${title}" 작품 전체를 삭제하시겠어요? 회차·이미지도 함께 사라지고 되돌릴 수 없습니다.`)) return;
    const token = getAccessToken();
    if (!token) { setDeleteError('로그인이 필요합니다.'); return; }
    setDeletingId(id); setDeleteError(null);
    try {
      const res = await fetch(`/api/v1/series/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err?.error?.message ?? '삭제 실패');
        return;
      }
      if (expandedId === id) setExpandedId(null);
      await onRefresh();
    } catch {
      setDeleteError('네트워크 오류');
    } finally {
      setDeletingId(null);
    }
  };
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

      {deleteError && (
        <div style={{
          padding: '10px 12px', marginBottom: 12, fontSize: 13, borderRadius: 8,
          background: 'color-mix(in oklab, var(--danger) 12%, transparent)',
          color: 'var(--danger)',
        }}>
          {deleteError}
        </div>
      )}

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
                  <Fragment key={s.id}>
                    <tr>
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
                          <button
                            className="studio-row-btn"
                            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                          >
                            {expandedId === s.id ? '회차 접기' : '회차 관리'}
                          </button>
                          <button className="studio-row-btn" onClick={() => onNav('upload')}>+ 새 회차</button>
                          <button
                            className="studio-row-btn"
                            onClick={() => deleteSeries(s.id, s.title)}
                            disabled={deletingId === s.id}
                            style={{ color: 'var(--danger)' }}
                          >
                            {deletingId === s.id ? '삭제 중...' : '작품 삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === s.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <EpisodeManagePanel seriesId={s.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
   회차 관리 패널 (Works 확장 행)
   ================================================================ */

interface EpisodeItem {
  id: string;
  title: string;
  order: number;
  published_at: string | null;
  stats: { views: number; likes: number };
}

function EpisodeManagePanel({ seriesId }: { seriesId: string }) {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEps = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/v1/series/${seriesId}/episodes?sort=order_asc`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err?.error?.message ?? '회차 목록을 불러올 수 없습니다.');
        return;
      }
      const data = await res.json() as { items: EpisodeItem[] };
      setEpisodes(data.items ?? []);
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => { fetchEps(); }, [fetchEps]);

  const deleteEpisode = async (id: string, title: string) => {
    if (!confirm(`"${title}" 회차를 삭제하시겠어요? 되돌릴 수 없습니다.`)) return;
    const token = getAccessToken();
    if (!token) { setError('로그인이 필요합니다.'); return; }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/episodes/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        setError(err?.error?.message ?? '삭제 실패');
        return;
      }
      await fetchEps();
    } catch {
      setError('네트워크 오류');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}><span className="spinner" /></div>;
  if (error) return <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>;
  if (episodes.length === 0) {
    return (
      <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
        아직 회차가 없어요. "+ 새 회차" 로 첫 회차를 만드세요.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 20px', background: 'color-mix(in oklab, var(--paper) 40%, transparent)' }}>
      <div style={{ display: 'grid', gap: 4 }}>
        {episodes.map((ep) => (
          <div
            key={ep.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr auto auto auto',
              gap: 12,
              alignItems: 'center',
              padding: '8px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{ep.order}화</span>
            <Link href={`/episodes/${ep.id}`} style={{
              color: 'var(--ink)', textDecoration: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ep.title}
            </Link>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>조회 {fmtNum(ep.stats.views)}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{ep.published_at ? relTime(ep.published_at) : '미공개'}</span>
            <button
              onClick={() => deleteEpisode(ep.id, ep.title)}
              disabled={deletingId === ep.id}
              style={{
                padding: '4px 10px', fontSize: 12,
                border: '1px solid var(--line)', borderRadius: 4,
                background: 'transparent', color: 'var(--danger)',
                cursor: deletingId === ep.id ? 'wait' : 'pointer',
              }}
            >
              {deletingId === ep.id ? '삭제 중...' : '삭제'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Upload
   ================================================================ */

function UploadSection({
  onCreated, series,
}: {
  onCreated: () => Promise<void> | void;
  series: SeriesItem[];
}) {
  return (
    <>
      <div className="studio-page-head">
        <div>
          <h1 className="studio-page-title">업로드</h1>
          <div className="studio-page-sub">새 시리즈를 만들거나 회차를 게시하세요</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <NewSeriesForm onCreated={onCreated} />
        <NewEpisodeForm series={series} onCreated={onCreated} />
      </div>
    </>
  );
}

/* ---------- 새 시리즈 폼 ---------- */
function NewSeriesForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length >= 3 ? prev : [...prev, g]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (genres.length === 0) { setError('장르를 1개 이상 선택해주세요.'); return; }
    const token = getAccessToken();
    if (!token) { setError('로그인이 필요합니다.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          genres,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error?.message || '시리즈 생성에 실패했습니다.'); return; }
      setOk(true);
      setTitle(''); setDescription(''); setGenres([]);
      await onCreated();
    } catch {
      setError('네트워크 오류. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="studio-card" style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>새 시리즈 만들기</h3>

      <div>
        <label htmlFor="s-title" className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
          제목 <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <input id="s-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={100} required placeholder="예: 달빛 아래 우리" style={INPUT_STYLE} />
      </div>

      <div>
        <label htmlFor="s-desc" className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>소개</label>
        <textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)}
          maxLength={2000} rows={4} placeholder="작품 소개를 짧게 적어주세요."
          style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      <div>
        <label className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
          장르 <span style={{ color: 'var(--accent)' }}>*</span>{' '}
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>(최대 3개)</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {GENRES.map((g) => {
            const active = genres.includes(g.slug);
            return (
              <button type="button" key={g.slug} onClick={() => toggleGenre(g.slug)} style={PILL_STYLE(active)}>
                {g.nameKo}
              </button>
            );
          })}
        </div>
      </div>

      {error && <FormMsg tone="danger">{error}</FormMsg>}
      {ok && !error && <FormMsg tone="success">시리즈를 만들었습니다.</FormMsg>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn studio-btn-accent" disabled={submitting}>
          {submitting ? '만드는 중...' : '시리즈 만들기'}
        </button>
      </div>
    </form>
  );
}

/* ---------- 새 회차 폼 (이미지 업로드) ---------- */
interface StagedFile { key: string; file: File; preview: string }

function NewEpisodeForm({
  series, onCreated,
}: {
  series: SeriesItem[];
  onCreated: () => Promise<void> | void;
}) {
  const [seriesId, setSeriesId] = useState('');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!seriesId && series.length > 0) setSeriesId(series[0]!.id);
  }, [series, seriesId]);

  // 언마운트 시 preview URL 정리
  useEffect(() => {
    return () => { files.forEach((f) => URL.revokeObjectURL(f.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickFiles = (input: FileList | null) => {
    if (!input) return;
    const picked: StagedFile[] = [];
    for (let i = 0; i < input.length; i++) {
      const f = input[i]!;
      if (!f.type.startsWith('image/')) continue;
      picked.push({
        key: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
      });
    }
    setFiles((prev) => [...prev, ...picked]);
  };

  const moveFile = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const removeFile = (i: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i]!.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!seriesId) { setError('시리즈를 선택해주세요.'); return; }
    if (!title.trim()) { setError('회차 제목을 입력해주세요.'); return; }
    if (files.length === 0) { setError('이미지를 최소 1장 이상 선택해주세요.'); return; }
    const token = getAccessToken();
    if (!token) { setError('로그인이 필요합니다.'); return; }

    setSubmitting(true);
    setProgress(`0/${files.length} 업로드 준비 중...`);
    try {
      const imageIds: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!.file;
        setProgress(`${i + 1}/${files.length} 업로드 중 (${f.name})...`);

        // 1) 서명된 URL 발급
        const initRes = await fetch('/api/v1/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            purpose: 'episode_page',
            content_type: f.type,
            file_size: f.size,
          }),
        });
        if (!initRes.ok) {
          const errData = await initRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `${f.name} 업로드 초기화 실패`);
        }
        const { image } = await initRes.json();

        // 2) Supabase Storage 로 직접 PUT (Vercel body 제한 우회)
        const putRes = await fetch(image.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': f.type },
          body: f,
        });
        if (!putRes.ok) {
          throw new Error(`${f.name} 스토리지 업로드 실패 (${putRes.status})`);
        }

        // 3) READY 로 전환
        const readyRes = await fetch(`/api/v1/images/${image.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            status: 'READY',
            url: image.public_url,
            content_type: f.type,
            file_size: f.size,
          }),
        });
        if (!readyRes.ok) {
          const errData = await readyRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `${f.name} 상태 갱신 실패`);
        }

        imageIds.push(image.id);
      }
      setProgress(`${files.length}/${files.length} 회차 생성 중...`);
      const res = await fetch(`/api/v1/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), image_ids: imageIds }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || '회차 생성에 실패했습니다.');
      }
      setOk(true);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]); setTitle('');
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  if (series.length === 0) {
    return (
      <div className="studio-card" style={{ maxWidth: 640, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>새 회차 게시</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
          시리즈를 먼저 만든 뒤 회차를 추가할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="studio-card" style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>새 회차 게시</h3>

      <div>
        <label htmlFor="e-series" className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
          시리즈 <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <select id="e-series" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} style={INPUT_STYLE}>
          {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="e-title" className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
          회차 제목 <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <input id="e-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={100} required placeholder="예: 1화 — 시작" style={INPUT_STYLE} />
      </div>

      <div>
        <label className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
          이미지 <span style={{ color: 'var(--accent)' }}>*</span>{' '}
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>(최대 20MiB · jpg/png/webp/gif)</span>
        </label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
          onChange={(e) => { onPickFiles(e.target.files); e.target.value = ''; }}
          style={{ fontSize: 13 }} />
      </div>

      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {files.map((f, i) => (
            <div key={f.key} style={{
              position: 'relative', border: '1px solid var(--line)', borderRadius: 8,
              overflow: 'hidden', aspectRatio: '3/4', background: 'var(--surface-alt, #f8f7f4)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{
                position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)',
                color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4,
              }}>{i + 1}</div>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', gap: 2, padding: 2, background: 'rgba(0,0,0,0.55)',
              }}>
                <button type="button" onClick={() => moveFile(i, -1)} disabled={i === 0}
                  style={MINI_BTN_STYLE} title="위로">↑</button>
                <button type="button" onClick={() => moveFile(i, 1)} disabled={i === files.length - 1}
                  style={MINI_BTN_STYLE} title="아래로">↓</button>
                <button type="button" onClick={() => removeFile(i)}
                  style={{ ...MINI_BTN_STYLE, marginLeft: 'auto' }} title="삭제">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <FormMsg tone="danger">{error}</FormMsg>}
      {ok && !error && <FormMsg tone="success">회차를 게시했습니다.</FormMsg>}
      {progress && !error && !ok && <FormMsg tone="neutral">{progress}</FormMsg>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn studio-btn-accent" disabled={submitting || files.length === 0}>
          {submitting ? '게시 중...' : '회차 게시하기'}
        </button>
      </div>
    </form>
  );
}

/* ---------- 공용 스타일·컴포넌트 ---------- */
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: '1px solid var(--line)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--ink)',
};

const PILL_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 13, borderRadius: 999,
  border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
  background: active ? 'var(--accent)' : 'var(--surface)',
  color: active ? '#fff' : 'var(--ink)',
  cursor: 'pointer', fontWeight: active ? 600 : 400,
});

const MINI_BTN_STYLE: React.CSSProperties = {
  padding: '4px 8px', fontSize: 12, color: '#fff',
  background: 'transparent', border: 'none', cursor: 'pointer',
};

function FormMsg({ tone, children }: { tone: 'danger' | 'success' | 'neutral'; children: React.ReactNode }) {
  const bg = tone === 'danger'
    ? 'color-mix(in oklab, var(--danger) 12%, transparent)'
    : tone === 'success'
    ? 'color-mix(in oklab, var(--success) 12%, transparent)'
    : 'color-mix(in oklab, var(--muted) 12%, transparent)';
  const fg = tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--ink)';
  return (
    <div style={{ padding: '10px 12px', fontSize: 13, borderRadius: 8, background: bg, color: fg }}>
      {children}
    </div>
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