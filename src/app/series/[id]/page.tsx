import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const series = await db.series.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { handle: true, displayName: true } },
      tags: { include: { tag: { select: { slug: true, nameKo: true, isGenre: true } } } },
      episodes: {
        where: { deletedAt: null, publishedAt: { not: null, lte: new Date() } },
        orderBy: { order: 'desc' },
        select: { id: true, title: true, order: true, publishedAt: true, viewsCount: true, likesCount: true },
      },
      _count: { select: { episodes: true } },
    },
  });

  if (!series) notFound();

  const genreTag = series.tags.find((t) => t.tag.isGenre);
  const genreName = genreTag?.tag.nameKo ?? '기타';
  const statusLabel = series.status === 'COMPLETED' ? '완결' : series.status === 'HIATUS' ? '휴재' : '연재중';
  const statusClass = series.status === 'COMPLETED' ? 'status-end' : series.status === 'HIATUS' ? 'status-hiatus' : 'status-ongoing';

  return (
    <div className="app">
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand">
            <span className="brand-mark">IF</span>
            
          </Link>
          <div className="searchbox">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" placeholder="작품 · 작가 · 태그 검색" aria-label="검색" />
          </div>
          <nav className="user-nav">
            <Link className="btn btn-ghost" href="/auth">로그인</Link>
            <Link className="btn btn-primary" href="/studio">스튜디오</Link>
          </nav>
        </div>
      </header>

      <main className="series-detail">
        <div className="container">
          <div className="series-hero">
            <div className="series-thumb">
              <div className="series-thumb-gradient" style={{
                '--g1': '#6b5580',
                '--g2': '#1a0e26',
              } as React.CSSProperties}>
                <span className="series-thumb-label">{series.title}</span>
              </div>
            </div>
            <div className="series-info">
              <div className="series-genre-row">
                <span className="chip active">{genreName}</span>
                <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
              </div>
              <h1 className="series-title">{series.title}</h1>
              <Link href={`/@${series.author.handle}`} className="series-author">
                <div className="series-author-avatar">
                  {series.author.displayName[0]}
                </div>
                <span>{series.author.displayName}</span>
              </Link>
              {series.description && (
                <p className="series-desc">{series.description}</p>
              )}
              <div className="series-stats">
                <div className="series-stat">
                  <span className="series-stat-value">{fmt(series.viewsTotal)}</span>
                  <span className="series-stat-label">조회수</span>
                </div>
                <div className="series-stat">
                  <span className="series-stat-value">{fmt(series.likesTotal)}</span>
                  <span className="series-stat-label">좋아요</span>
                </div>
                <div className="series-stat">
                  <span className="series-stat-value">{series._count.episodes}</span>
                  <span className="series-stat-label">화</span>
                </div>
              </div>
              <div className="series-actions">
                <Link className="btn btn-primary btn-read" href={`/episodes/${series.episodes[0]?.id ?? '#'}`}>
                  {series.episodes.length > 0 ? '첫화 보기' : '준비중'}
                </Link>
                <button className="btn btn-like" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                  좋아요
                </button>
              </div>
            </div>
          </div>

          {series.description && (
            <section className="series-section">
              <h2 className="series-section-title">시놉시스</h2>
              <p className="series-synopsis">{series.description}</p>
            </section>
          )}

          <section className="series-section">
            <div className="series-section-head">
              <h2 className="series-section-title">에피소드</h2>
              <span className="series-section-count">{series._count.episodes}화</span>
            </div>
            {series.episodes.length === 0 ? (
              <div className="empty-state">아직 에피소드가 없습니다.</div>
            ) : (
              <div className="episode-list">
                {series.episodes.map((ep, i) => (
                  <Link key={ep.id} href={`/episodes/${ep.id}`} className="episode-item">
                    <div className="episode-num">{series.episodes.length - i}</div>
                    <div className="episode-info">
                      <div className="episode-title">{ep.title}</div>
                      <div className="episode-meta">
                        <span>{relTime(ep.publishedAt)}</span>
                        <span>·</span>
                        <span>조회 {fmt(ep.viewsCount)}</span>
                        <span>·</span>
                        <span>❤ {fmt(ep.likesCount)}</span>
                      </div>
                    </div>
                    <svg className="episode-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {series.tags.length > 0 && (
            <section className="series-section">
              <h2 className="series-section-title">태그</h2>
              <div className="series-tags">
                {series.tags.map((t) => (
                  <span key={t.tag.slug} className={`series-tag ${t.tag.isGenre ? 'genre' : ''}`}>
                    {t.tag.nameKo}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div>© 2026 IF</div>
          <div className="footer-links">
            <Link href="/">홈</Link>
            <Link href="/studio">스튜디오</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function relTime(d: Date | null): string {
  if (!d) return '';
  const min = Math.max(0, (Date.now() - d.getTime()) / 60_000);
  if (min < 60) return `${Math.floor(min)}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.floor(min / 60 / 24)}일 전`;
  return `${Math.floor(min / 60 / 24 / 7)}주 전`;
}
