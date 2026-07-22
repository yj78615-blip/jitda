'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SeriesDTO, PostDTO } from '@/lib/mappers';

/* ================================================================
   AuthorContent — 탭 (작품/포스트) + 시리즈/포스트 그리드
   목업: public/mockups/author.html
   ================================================================ */

interface Props {
  authorId: string;
  series: SeriesDTO[];
}

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};

const GENRE_NAMES: Record<string, string> = {
  romance: '로맨스', fantasy: '판타지', thriller: '스릴러', daily: '일상',
  bl_gl: 'BL/GL', action: '액션', comedy: '개그', drama: '드라마',
  youth: '청춘', horror: '공포',
};

export default function AuthorContent({ authorId, series }: Props) {
  const [tab, setTab] = useState<'series' | 'posts'>('series');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // 포스트 목록 (탭 전환 or 정렬 변경 시 API 재조회)
  useEffect(() => {
    if (tab !== 'posts') return;
    setPostsLoading(true);
    fetch(`/api/v1/posts?author_id=${authorId}&sort=${sort}&limit=20`)
      .then(r => r.json())
      .then(d => setPosts(d.items ?? []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort, authorId]);

  return (
    <>
      {/* Tabs row */}
      <div className="author-tabs-row">
        <div className="author-tabs">
          <button className={`author-tab${tab === 'series' ? ' active' : ''}`} onClick={() => setTab('series')}>
            작품
            <span className="author-tab-count">{series.length}</span>
          </button>
          <button className={`author-tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>
            포스트
          </button>
        </div>
        <select className="author-sort-select" value={sort}
          onChange={e => setSort(e.target.value as 'latest' | 'popular')}>
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
        </select>
      </div>

      {/* Series */}
      <div className={`author-panel${tab === 'series' ? ' active' : ''}`}>
        {series.length === 0 ? (
          <div className="author-empty-state">아직 작품이 없습니다.</div>
        ) : (
          <div className="author-series-grid">
            {series.map((s) => {
              const genre = s.genres[0];
              return (
                <Link key={s.id} href={`/series/${s.id}`} className="author-series-card">
                  <div className="author-series-thumb"
                    style={{ '--g1': genre ? 'var(--g-' + genre + ')' : '#999', '--g2': '#555' } as React.CSSProperties}
                  >
                    <span className="author-series-thumb-title">{s.title}</span>
                    {s.status === 'completed' && <span className="author-badge author-badge-end">완결</span>}
                  </div>
                  <div className="author-series-meta">
                    <h3 className="author-series-card-title">{s.title}</h3>
                    <div className="author-series-stats">
                      {genre && <span className="author-series-genre">{GENRE_NAMES[genre] || genre}</span>}
                      <span>{s.episode_count}화</span>
                      <span>·</span>
                      <span>조회 {fmtNum(s.stats.views_total)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Posts */}
      <div className={`author-panel${tab === 'posts' ? ' active' : ''}`}>
        {postsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '0 40px 60px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="author-skel-gradient" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="author-empty-state">아직 포스트가 없습니다.</div>
        ) : (
          <div className="author-post-grid">
            {posts.map((p) => (
              <div key={p.id} className="author-post-cell">
                <span className="author-post-cell-title">{p.title}</span>
                <div className="author-post-overlay">
                  <div className="author-post-overlay-title">{p.title}</div>
                  <div className="author-post-overlay-stats">
                    <span>♥ {fmtNum(p.stats.likes)}</span>
                    <span>조회 {fmtNum(p.stats.views)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
