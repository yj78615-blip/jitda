import Link from 'next/link';
import { db } from '@/lib/db';
import { GENRES, isGenreSlug, type GenreSlug } from '@/lib/genres';
import type { Prisma } from '@prisma/client';

const GENRE_BASE: Record<string, [string, string]> = {
  romance: ['#ff9db6', '#e83e5c'], fantasy: ['#9d7cff', '#4a3fa8'],
  thriller: ['#ff6c5c', '#6b1e2a'], daily: ['#ffdc7a', '#f39a5a'],
  bl_gl: ['#d9a0ff', '#7846d3'], action: ['#ff8a3d', '#c93516'],
  comedy: ['#ffe266', '#ffa626'], drama: ['#6cb6d9', '#2a4e7a'],
  youth: ['#7fdcd6', '#2b8f8a'], horror: ['#6b5580', '#1a0e26'],
};
const GENRE_NAME_KO: Record<string, string> = Object.fromEntries(GENRES.map((g) => [g.slug, g.nameKo]));

function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function shiftHue(hex: string, dh: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s: number, l = (mx + mn) / 2;
  if (mx === mn) s = 0;
  else {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    switch (mx) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; }
    h /= 6;
  }
  h = (h + dh / 360 + 1) % 1;
  const hue2 = (p: number, q: number, t: number) => { t = (t + 1) % 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const to255 = (x: number) => Math.round(x * 255);
  return '#' + [to255(hue2(p, q, h + 1/3)), to255(hue2(p, q, h)), to255(hue2(p, q, h - 1/3))].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function gradientFor(genre: string | undefined, seed: string): [string, string] {
  const base = GENRE_BASE[genre ?? 'daily'] ?? GENRE_BASE.daily!;
  const dh = (hashStr(seed) % 24) - 12;
  return [shiftHue(base[0], dh), shiftHue(base[1], dh)];
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
  if (min < 60*24) return `${Math.floor(min/60)}시간 전`;
  if (min < 60*24*7) return `${Math.floor(min/60/24)}일 전`;
  return `${Math.floor(min/60/24/7)}주 전`;
}

type Tab = 'series' | 'posts' | 'latest';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; genre?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === 'posts' || sp.tab === 'latest' ? sp.tab : 'series';
  const activeGenre: GenreSlug | null = sp.genre && isGenreSlug(sp.genre) ? sp.genre : null;

  const genreFilter: Prisma.SeriesWhereInput['tags'] | undefined = activeGenre
    ? { some: { tag: { slug: activeGenre, isGenre: true } } }
    : undefined;

  const authorSel = { select: { handle: true, displayName: true } };
  const tagsSel = { include: { tag: { select: { slug: true, isGenre: true } } } };

  const [popularSeries, popularPosts, latestSeries] = await Promise.all([
    db.series.findMany({
      where: { deletedAt: null, isAdult: false, ...(genreFilter ? { tags: genreFilter } : {}) },
      orderBy: [{ viewsTotal: 'desc' }, { id: 'desc' }],
      take: 10,
      include: { author: authorSel, tags: tagsSel },
    }),
    db.post.findMany({
      where: {
        deletedAt: null, isAdult: false,
        publishedAt: { not: null, lte: new Date() },
        ...(activeGenre ? { tags: { some: { tag: { slug: activeGenre, isGenre: true } } } } : {}),
      },
      orderBy: [{ viewsCount: 'desc' }, { id: 'desc' }],
      take: 10,
      include: { author: authorSel, tags: tagsSel },
    }),
    db.series.findMany({
      where: { deletedAt: null, isAdult: false, ...(genreFilter ? { tags: genreFilter } : {}) },
      orderBy: [{ updatedAt: 'desc' }],
      take: 3,
      include: {
        author: authorSel,
        tags: tagsSel,
        episodes: {
          where: { deletedAt: null, publishedAt: { not: null, lte: new Date() } },
          orderBy: { order: 'desc' },
          take: 1,
          select: { id: true, order: true, publishedAt: true },
        },
      },
    }),
  ]);

  const hrefWith = (params: Record<string, string | null>) => {
    const cur = new URLSearchParams();
    if (sp.tab) cur.set('tab', sp.tab);
    if (sp.genre) cur.set('genre', sp.genre);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) cur.delete(k); else cur.set(k, v);
    }
    const q = cur.toString();
    return q ? `/?${q}` : '/';
  };

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

      <nav className="genre-strip" aria-label="장르">
        <div className="container">
          <Link className={`chip ${!activeGenre ? 'active' : ''}`} href={hrefWith({ genre: null })}>전체</Link>
          {GENRES.map((g) => (
            <Link key={g.slug} className={`chip ${activeGenre === g.slug ? 'active' : ''}`}
                  href={hrefWith({ genre: g.slug })}>{g.nameKo}</Link>
          ))}
        </div>
      </nav>

      <main className="main">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">이번 주 · 라이브 DB</div>
            <h1 className="section-title">지금 IF에서 가장 뜨거운 것</h1>
          </div>

          <div className="tabs" role="tablist">
            <Link className={`tab ${tab === 'series' ? 'active' : ''}`} href={hrefWith({ tab: null })}>
              인기 작품<span className="tab-count">TOP 10</span>
            </Link>
            <Link className={`tab ${tab === 'posts' ? 'active' : ''}`} href={hrefWith({ tab: 'posts' })}>
              인기 포스트<span className="tab-count">TOP 10</span>
            </Link>
            <Link className={`tab ${tab === 'latest' ? 'active' : ''}`} href={hrefWith({ tab: 'latest' })}>
              최신작<span className="tab-count">TOP 3</span>
            </Link>
          </div>

          {tab === 'series' && (
            popularSeries.length === 0
              ? <EmptyState kind="series" hasGenre={!!activeGenre} />
              : <div className="rank-grid">
                  {popularSeries.map((s, i) => <SeriesRankCard key={s.id} s={s} rank={i + 1} />)}
                </div>
          )}
          {tab === 'posts' && (
            popularPosts.length === 0
              ? <EmptyState kind="posts" hasGenre={!!activeGenre} />
              : <div className="rank-grid">
                  {popularPosts.map((p, i) => <PostRankCard key={p.id} p={p} rank={i + 1} />)}
                </div>
          )}
          {tab === 'latest' && (
            latestSeries.length === 0
              ? <EmptyState kind="series" hasGenre={!!activeGenre} />
              : <div className="latest-grid">
                  {latestSeries.map((s) => <LatestCard key={s.id} s={s} />)}
                </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div>© 2026 IF · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>LIVE</span></div>
          <div className="footer-links">
            <Link href="/search">검색</Link>
            <Link href="/studio">스튜디오</Link>
            <Link href="/auth">로그인</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

type SeriesRow = Awaited<ReturnType<typeof loadPopularSeries>>[number];
// Type helper — never actually called, just for inference
async function loadPopularSeries() {
  return db.series.findMany({
    include: {
      author: { select: { handle: true, displayName: true } },
      tags: { include: { tag: { select: { slug: true, isGenre: true } } } },
    },
  });
}

function SeriesRankCard({ s, rank }: { s: SeriesRow; rank: number }) {
  const genre = s.tags.find((t) => t.tag.isGenre)?.tag.slug;
  const [g1, g2] = gradientFor(genre, s.id);
  const genreName = genre ? GENRE_NAME_KO[genre] ?? genre : '기타';
  const badge = s.status === 'COMPLETED' ? <span className="badge badge-end">완결</span> : null;
  return (
    <Link className="rank-card" href={`/series/${s.id}`} style={{ ['--g1' as string]: g1, ['--g2' as string]: g2 } as React.CSSProperties}>
      <div className="thumb">
        <span className="rank-num">{String(rank).padStart(2, '0')}</span>
        {badge}
        <span className="thumb-title">{s.title}</span>
      </div>
      <div className="rank-meta">
        <div className="rank-title">{s.title}</div>
        <div className="rank-author"><strong>{s.author.displayName}</strong> · {s.status === 'COMPLETED' ? '완결' : '연재중'}</div>
        <div className="rank-stats">
          <span className="rank-genre">{genreName}</span>
          <span>조회 {fmt(s.viewsTotal)}</span>
          <span>❤ {fmt(s.likesTotal)}</span>
        </div>
      </div>
    </Link>
  );
}

type PostRow = Awaited<ReturnType<typeof loadPopularPosts>>[number];
async function loadPopularPosts() {
  return db.post.findMany({
    include: {
      author: { select: { handle: true, displayName: true } },
      tags: { include: { tag: { select: { slug: true, isGenre: true } } } },
    },
  });
}

function PostRankCard({ p, rank }: { p: PostRow; rank: number }) {
  const genre = p.tags.find((t) => t.tag.isGenre)?.tag.slug;
  const [g1, g2] = gradientFor(genre, p.id);
  return (
    <Link className="rank-card post-card" href={`/@${p.author.handle}`} style={{ ['--g1' as string]: g1, ['--g2' as string]: g2 } as React.CSSProperties}>
      <div className="thumb">
        <span className="rank-num">{String(rank).padStart(2, '0')}</span>
        <span className="thumb-title">{p.title}</span>
      </div>
      <div className="rank-meta">
        <div className="rank-title">{p.title}</div>
        <div className="rank-author"><strong>{p.author.displayName}</strong> · {relTime(p.publishedAt)}</div>
        <div className="rank-stats">
          <span className="rank-genre">{genre ? GENRE_NAME_KO[genre] : '기타'}</span>
          <span>조회 {fmt(p.viewsCount)}</span>
          <span>❤ {fmt(p.likesCount)}</span>
        </div>
      </div>
    </Link>
  );
}

type LatestRow = SeriesRow & { episodes: { id: string; order: number; publishedAt: Date | null }[] };

function LatestCard({ s }: { s: LatestRow }) {
  const genre = s.tags.find((t) => t.tag.isGenre)?.tag.slug;
  const [g1, g2] = gradientFor(genre, s.id);
  const latestEp = s.episodes[0];
  const isNew = !latestEp || latestEp.order <= 3;
  const publishedAt = latestEp?.publishedAt ?? s.updatedAt;
  return (
    <Link className="feature-card" href={`/series/${s.id}`} style={{ ['--g1' as string]: g1, ['--g2' as string]: g2 } as React.CSSProperties}>
      <div className="thumb">
        <span className="feature-tag">{isNew ? '신작' : '업데이트'}</span>
        <span className="feature-time">{relTime(publishedAt)}</span>
        <span className="feature-thumb-title">{s.title}</span>
      </div>
      <div className="feature-body">
        <div className="feature-title-line">
          <div className="feature-title">{s.title}</div>
          {latestEp && <div className="feature-episode">{latestEp.order}화</div>}
        </div>
        <div className="feature-meta">
          <span className="author">{s.author.displayName}</span>
          <span>·</span>
          <span>{genre ? GENRE_NAME_KO[genre] : '기타'}</span>
        </div>
        {s.description && <div className="feature-desc">{s.description}</div>}
      </div>
    </Link>
  );
}

function EmptyState({ kind, hasGenre }: { kind: 'series' | 'posts'; hasGenre: boolean }) {
  return (
    <div className="empty-state">
      {hasGenre ? '이 장르에 아직 ' : '아직 '}
      {kind === 'series' ? '작품이' : '포스트가'} 없어요.
      <br />
      <Link href="/portal.html">스튜디오</Link>에서 첫 {kind === 'series' ? '시리즈' : '포스트'}를 올려보세요.
    </div>
  );
}
