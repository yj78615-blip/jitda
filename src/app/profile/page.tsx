import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { toSeriesDTO, type SeriesDTO } from '@/lib/mappers';
import AuthorContent from '@/components/author-content';
import AuthorHeroActions from '@/components/author-hero-actions';

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};

const GRADIENT_PALETTES: [string, string][] = [
  ['#ff9db6', '#e83e5c'],
  ['#9d7cff', '#4a3fa8'],
  ['#ffdc7a', '#f39a5a'],
  ['#6cb6d9', '#2a4e7a'],
  ['#ff8a3d', '#c93516'],
  ['#7fdcd6', '#2b8f8a'],
  ['#d9a0ff', '#7846d3'],
  ['#ff6c5c', '#6b1e2a'],
];

function pickGradient(handle: string): [string, string] {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) | 0;
  return GRADIENT_PALETTES[Math.abs(h) % GRADIENT_PALETTES.length]!;
}

export default async function AuthorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  if (!handle) notFound();

  const cleanHandle = handle.replace(/^@/, '');
  const [g1, g2] = pickGradient(cleanHandle);

  const author = await db.user.findUnique({
    where: { handle: cleanHandle, deletedAt: null },
    select: {
      id: true,
      handle: true,
      displayName: true,
      bio: true,
      avatarImageId: true,
      createdAt: true,
      authorProfile: { select: { subscriptionEnabled: true, subscriptionPrice: true, subscriptionCurrency: true } },
      _count: { select: { followers: true, series: true, posts: true } },
    },
  });

  if (!author) notFound();

  const seriesRows = await db.series.findMany({
    where: { authorId: author.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: {
      tags: { include: { tag: { select: { slug: true, isGenre: true } } } },
      _count: { select: { episodes: { where: { deletedAt: null } } } },
    },
  });

  const seriesIds = seriesRows.map((s) => s.id);
  const subOnlyGroups = seriesIds.length
    ? await db.episode.groupBy({
        by: ['seriesId'],
        where: { seriesId: { in: seriesIds }, isSubscriberOnly: true, deletedAt: null },
        _count: true,
      })
    : [];
  const subOnlyMap = new Map(subOnlyGroups.map((g) => [g.seriesId, g._count]));

  const series: SeriesDTO[] = seriesRows.map((s) =>
    toSeriesDTO({
      s: s as never,
      author: {
        id: author.id,
        handle: author.handle,
        displayName: author.displayName,
        bio: author.bio,
        createdAt: author.createdAt,
      },
      tags: s.tags.map((t) => t.tag),
      episodeCount: s._count.episodes,
      subscribersOnlyCount: subOnlyMap.get(s.id) ?? 0,
      cover: null,
    })
  );

  const initial = author.displayName.charAt(0).toUpperCase();

  return (
    <div className="author-root">
      <div className="author-banner" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />

      <header className="author-header">
        <nav className="author-top-nav">
          <Link href="/" className="author-logo">IF</Link>
        </nav>
      </header>

      <main className="author-main">
        <div className="author-hero">
          <div className="author-avatar" style={{ background: `linear-gradient(135deg, ${g2}, ${g1})` }}>
            {initial}
          </div>

          <div className="author-hero-info">
            <h1 className="author-name">{author.displayName}</h1>
            <div className="author-handle-line">
              <span className="author-handle">@{author.handle}</span>
            </div>
            {author.bio && <p className="author-bio">{author.bio}</p>}
          </div>

          <AuthorHeroActions
            authorId={author.id}
            displayName={author.displayName}
            handle={author.handle}
            subscription={{
              enabled: author.authorProfile?.subscriptionEnabled ?? false,
              price: author.authorProfile?.subscriptionPrice ?? null,
              currency: author.authorProfile?.subscriptionCurrency ?? 'KRW',
            }}
          />
        </div>

        <div className="author-stats-bar">
          <div className="author-stat">
            <span className="author-stat-num">{fmtNum(author._count.series)}</span>
            <span className="author-stat-label">작품</span>
          </div>
          <div className="author-stat">
            <span className="author-stat-num">{fmtNum(author._count.posts)}</span>
            <span className="author-stat-label">포스트</span>
          </div>
          <div className="author-stat">
            <span className="author-stat-num">{fmtNum(author._count.followers)}</span>
            <span className="author-stat-label">팔로워</span>
          </div>
          <div className="author-stat">
            <span className="author-stat-num">{fmtNum(series.reduce((a, s) => a + s.stats.views_total, 0))}</span>
            <span className="author-stat-label">조회</span>
          </div>
        </div>

        <AuthorContent authorId={author.id} series={series} />
      </main>
    </div>
  );
}
