import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const author = await db.user.findUnique({
    where: { handle, deletedAt: null, role: { in: ['CREATOR', 'ADMIN'] } },
    select: {
      handle: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      series: {
        where: { deletedAt: null },
        orderBy: [{ viewsTotal: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          viewsTotal: true,
          likesTotal: true,
          tags: {
            include: { tag: { select: { slug: true, name: true, isGenre: true } } },
          },
          _count: { select: { episodes: true } },
        },
      },
    },
  });

  if (!author) notFound();

  const totalViews = author.series.reduce((s, series) => s + series.viewsTotal, 0);
  const totalLikes = author.series.reduce((s, series) => s + series.likesTotal, 0);
  const totalEpisodes = author.series.reduce((s, series) => s + series._count.episodes, 0);

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

      <main className="author-page">
        <div className="container">
          <div className="author-profile">
            <div className="author-avatar-large">{author.displayName[0]}</div>
            <div className="author-info">
              <h1 className="author-name">{author.displayName}</h1>
              <p className="author-handle">@{author.handle}</p>
              {author.bio && <p className="author-bio">{author.bio}</p>}
              <div className="author-stats">
                <div className="author-stat">
                  <span className="author-stat-value">{author.series.length}</span>
                  <span className="author-stat-label">작품</span>
                </div>
                <div className="author-stat">
                  <span className="author-stat-value">{fmt(totalEpisodes)}</span>
                  <span className="author-stat-label">화</span>
                </div>
                <div className="author-stat">
                  <span className="author-stat-value">{fmt(totalViews)}</span>
                  <span className="author-stat-label">조회</span>
                </div>
                <div className="author-stat">
                  <span className="author-stat-value">{fmt(totalLikes)}</span>
                  <span className="author-stat-label">좋아요</span>
                </div>
              </div>
            </div>
          </div>

          <section className="author-section">
            <h2 className="author-section-title">작품</h2>
            {author.series.length === 0 ? (
              <div className="empty-state">아직 작품이 없습니다.</div>
            ) : (
              <div className="author-series-grid">
                {author.series.map((series) => {
                  const genreTag = series.tags.find((t) => t.tag.isGenre);
                  return (
                    <Link key={series.id} href={`/series/${series.id}`} className="author-series-card">
                      <div className="author-series-thumb" style={{
                        '--g1': genreTag ? '#6b5580' : '#3f3946',
                        '--g2': genreTag ? '#1a0e26' : '#17141a',
                      } as React.CSSProperties}>
                        <span className="author-series-thumb-title">{series.title}</span>
                        {series.status === 'COMPLETED' && <span className="badge badge-end">완결</span>}
                      </div>
                      <div className="author-series-body">
                        <h3 className="author-series-title">{series.title}</h3>
                        {series.description && <p className="author-series-desc">{series.description}</p>}
                        <div className="author-series-meta">
                          <span>{series._count.episodes}화</span>
                          <span>·</span>
                          <span>조회 {fmt(series.viewsTotal)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
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
