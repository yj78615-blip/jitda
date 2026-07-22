'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SeriesDTO, PostDTO } from '@/lib/mappers';

/* ================================================================
   AuthorContent — 탭 (시리즈 · 포스트 · 사랑방) + 그리드
   목업: public/mockups/author.html
   ================================================================ */

interface Props {
  authorId: string;
  authorName: string;
  series: SeriesDTO[];
  subscription: { enabled: boolean; price: number | null; currency: string };
}

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};
const fmtKRW = (n: number) => n.toLocaleString('ko-KR') + '원';

const GENRE_NAMES: Record<string, string> = {
  romance: '로맨스', fantasy: '판타지', thriller: '스릴러', daily: '일상',
  bl_gl: 'BL/GL', action: '액션', comedy: '개그', drama: '드라마',
  youth: '청춘', horror: '공포',
};

type Tab = 'series' | 'posts' | 'salon';

export default function AuthorContent({ authorId, authorName, series, subscription }: Props) {
  const [tab, setTab] = useState<Tab>('series');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'posts') return;
    setPostsLoading(true);
    fetch(`/api/v1/posts?author_id=${authorId}&sort=${sort}&limit=20`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setPosts(d.items ?? []); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [tab, sort, authorId]);

  const sortedSeries = [...series].sort((a, b) =>
    sort === 'popular'
      ? b.stats.views_total - a.stats.views_total
      : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <>
      <div className="tabs-row">
        <div className="tabs" role="tablist">
          <button
            className={`tab${tab === 'series' ? ' active' : ''}`}
            onClick={() => setTab('series')}
            role="tab"
            aria-selected={tab === 'series'}
          >
            시리즈<span className="tab-count">{series.length}</span>
          </button>
          <button
            className={`tab${tab === 'posts' ? ' active' : ''}`}
            onClick={() => setTab('posts')}
            role="tab"
            aria-selected={tab === 'posts'}
          >
            포스트<span className="tab-count">{posts.length || 0}</span>
          </button>
          <button
            className={`tab${tab === 'salon' ? ' active' : ''}`}
            onClick={() => setTab('salon')}
            role="tab"
            aria-selected={tab === 'salon'}
          >
            <svg className="tab-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            사랑방
          </button>
        </div>
        {tab !== 'salon' && (
          <select
            className="sort-select"
            value={sort}
            onChange={e => setSort(e.target.value as 'latest' | 'popular')}
            aria-label="정렬"
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
          </select>
        )}
      </div>

      {tab === 'series' && (
        <div className="panel active" data-panel="series">
          {sortedSeries.length === 0 ? (
            <div className="empty-state">아직 시리즈가 없어요.</div>
          ) : (
            <div className="series-grid">
              {sortedSeries.map((s) => {
                const genre = s.genres[0];
                return (
                  <Link key={s.id} href={`/series/${s.id}`} className="series-card">
                    <div
                      className="thumb"
                      style={{
                        '--g1': genre ? `var(--g-${genre}, #999)` : '#999',
                        '--g2': '#333',
                      } as React.CSSProperties}
                    >
                      {s.status === 'completed' && <span className="badge badge-end">완결</span>}
                      {s.status !== 'completed' && s.stats.subscribers_only_count > 0 && (
                        <span className="badge badge-sub">구독자 전용 회차</span>
                      )}
                      <span className="thumb-title">{s.title}</span>
                    </div>
                    <div className="series-meta">
                      <div className="series-title">{s.title}</div>
                      <div className="series-sub">
                        {s.episode_count}화 {s.status === 'completed' ? '완결' : '연재중'}
                      </div>
                      <div className="series-stats">
                        {genre && <span className="series-genre">{GENRE_NAMES[genre] || genre}</span>}
                        <span>조회 {fmtNum(s.stats.views_total)}</span>
                        <span>❤ {fmtNum(s.stats.likes_total)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'posts' && (
        <div className="panel active" data-panel="posts">
          {postsLoading ? (
            <div className="post-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="post-cell skeleton" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">아직 포스트가 없어요.</div>
          ) : (
            <div className="post-grid">
              {posts.map((p) => (
                <Link key={p.id} href={`/posts/${p.id}`} className="post-cell">
                  <span className="post-cell-title">{p.title}</span>
                  <div className="post-overlay">
                    <div className="post-overlay-title">{p.title}</div>
                    <div className="post-overlay-stats">
                      <span>❤ {fmtNum(p.stats.likes)}</span>
                      <span>💬 {fmtNum(p.stats.comments)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'salon' && (
        <div className="panel active" data-panel="salon">
          {subscription.enabled ? (
            <div className="locked-state">
              <div className="locked-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <div className="locked-title">구독자 전용 사랑방</div>
              <div className="locked-desc">
                <strong>{authorName}</strong>님을 구독하면 사랑방에서 작가와 직접 이야기를 나눌 수 있어요.
                {subscription.price != null && <><br />월 {fmtKRW(subscription.price)}</>}
              </div>
              <div className="locked-desc" style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
                (Phase 2 오픈 예정)
              </div>
            </div>
          ) : (
            <div className="empty-state">이 작가는 구독을 아직 열지 않았어요.</div>
          )}
        </div>
      )}
    </>
  );
}
