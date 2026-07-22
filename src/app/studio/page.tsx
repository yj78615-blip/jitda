'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface SeriesItem {
  id: string;
  title: string;
  status: string;
  episodeCount: number;
  views: number;
  likes: number;
  updatedAt: string;
}

interface StudioStats {
  totalViews: number;
  subscriberCount: number;
  totalRevenue: number;
  totalLikes: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export default function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'series' | 'analytics'>('overview');
  const [showUpload, setShowUpload] = useState(false);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth?redirect=/studio');
      return;
    }

    const fetchData = async () => {
      try {
        const [seriesRes, statsRes] = await Promise.all([
          fetch('/api/v1/series?authorId=' + user.id),
          fetch('/api/v1/users/' + user.id + '/stats'),
        ]);

        if (seriesRes.ok) {
          const data = await seriesRes.json();
          setSeries(data.series ?? data ?? []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch {
        // fallback — show empty state
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="app studio-page">
        <div className="studio-loading"><span className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="app studio-page">
      <header className="studio-header">
        <div className="container">
          <div className="studio-header-left">
            <Link href="/" className="brand">
              <span className="brand-mark">IF</span>
            </Link>
            <span className="studio-badge">STUDIO</span>
          </div>
          <nav className="studio-nav">
            <Link href="/" className="btn btn-ghost">홈으로</Link>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              새 작품
            </button>
          </nav>
        </div>
      </header>

      <main className="studio-main">
        <div className="container">
          <div className="studio-tabs" role="tablist">
            <button className={`studio-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} role="tab">개요</button>
            <button className={`studio-tab ${tab === 'series' ? 'active' : ''}`} onClick={() => setTab('series')} role="tab">작품 관리</button>
            <button className={`studio-tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')} role="tab">분석</button>
          </div>

          {tab === 'overview' && (
            <>
              <div className="studio-stats">
                <div className="studio-stat-card">
                  <div className="studio-stat-label">총 조회수</div>
                  <div className="studio-stat-value">{stats ? fmt(stats.totalViews) : '—'}</div>
                </div>
                <div className="studio-stat-card">
                  <div className="studio-stat-label">구독자</div>
                  <div className="studio-stat-value">{stats ? fmt(stats.subscriberCount) : '—'}</div>
                </div>
                <div className="studio-stat-card">
                  <div className="studio-stat-label">총 수익</div>
                  <div className="studio-stat-value">{stats ? '₩' + fmt(stats.totalRevenue) : '—'}</div>
                </div>
                <div className="studio-stat-card">
                  <div className="studio-stat-label">좋아요</div>
                  <div className="studio-stat-value">{stats ? fmt(stats.totalLikes) : '—'}</div>
                </div>
              </div>

              <section className="studio-section">
                <h2 className="studio-section-title">내 작품</h2>
                {dataLoading ? (
                  <div className="studio-loading"><span className="spinner" /></div>
                ) : series.length === 0 ? (
                  <div className="studio-empty">
                    <p>아직 작품이 없습니다. 첫 작품을 업로드해보세요!</p>
                  </div>
                ) : (
                  <div className="studio-activity">
                    {series.map((s) => (
                      <div key={s.id} className="studio-activity-item">
                        <div className="studio-activity-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="studio-activity-info">
                          <div className="studio-activity-title">{s.title}</div>
                          <div className="studio-activity-meta">{s.episodeCount}화 · {s.updatedAt}</div>
                        </div>
                        <span className={`studio-activity-status status-${s.status === 'COMPLETED' ? 'end' : 'ongoing'}`}>
                          {s.status === 'COMPLETED' ? '완결' : '연재중'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'series' && (
            <section className="studio-section">
              <div className="studio-section-head">
                <h2 className="studio-section-title">내 작품</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>+ 새 작품</button>
              </div>
              {dataLoading ? (
                <div className="studio-loading"><span className="spinner" /></div>
              ) : series.length === 0 ? (
                <div className="studio-empty"><p>아직 작품이 없습니다.</p></div>
              ) : (
                <div className="studio-table-wrap">
                  <table className="studio-table">
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>상태</th>
                        <th>화수</th>
                        <th>조회</th>
                        <th>좋아요</th>
                        <th>최종 업데이트</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((s) => (
                        <tr key={s.id}>
                          <td className="studio-table-title">
                            <Link href={`/series/${s.id}`}>{s.title}</Link>
                          </td>
                          <td>
                            <span className={`studio-badge-sm ${s.status === 'COMPLETED' ? 'badge-end' : 'badge-ongoing'}`}>
                              {s.status === 'COMPLETED' ? '완결' : '연재중'}
                            </span>
                          </td>
                          <td>{s.episodeCount}화</td>
                          <td>{fmt(s.views)}</td>
                          <td>{fmt(s.likes)}</td>
                          <td className="studio-table-muted">{s.updatedAt}</td>
                          <td><button className="btn btn-ghost btn-sm">관리</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'analytics' && (
            <section className="studio-section">
              <h2 className="studio-section-title">조회수 추이</h2>
              <div className="studio-chart-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="studio-chart-icon">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3" strokeWidth="2"/>
                </svg>
                <p>데이터를 불러오는 중...</p>
              </div>
            </section>
          )}
        </div>
      </main>

      {showUpload && (
        <div className="studio-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="studio-modal-title">새 작품 만들기</h2>
            <p className="studio-modal-desc">아직 준비 중인 기능입니다.</p>
            <button className="btn btn-primary" onClick={() => setShowUpload(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
