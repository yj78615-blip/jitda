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
      authorProfile: {
        select: { subscriptionEnabled: true, subscriptionPrice: true, subscriptionCurrency: true },
      },
      _count: { select: { followers: true, subscribers: true, series: true, posts: true } },
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
  const subscription = {
    enabled: author.authorProfile?.subscriptionEnabled ?? false,
    price: author.authorProfile?.subscriptionPrice ?? null,
    currency: author.authorProfile?.subscriptionCurrency ?? 'KRW',
  };

  return (
    <div className="app">
      <div className="page">
        <div className="page-inner">
          <div className="banner" style={{ '--g1': g1, '--g2': g2 } as React.CSSProperties} />

          <div className="hero">
            <div className="hero-avatar" style={{ '--g1': g2, '--g2': g1 } as React.CSSProperties}>
              {initial}
            </div>
            <div className="hero-info">
              <h1 className="hero-name">{author.displayName}</h1>
              <div className="hero-handle">@{author.handle}</div>
              {author.bio && <p className="hero-bio">{author.bio}</p>}
            </div>
            <AuthorHeroActions
              authorId={author.id}
              displayName={author.displayName}
              handle={author.handle}
              subscription={subscription}
            />
          </div>

          <div className="stats">
            <div className="stat"><span className="num">{fmtNum(author._count.followers)}</span> 팔로워</div>
            <div className="stat"><span className="num">{fmtNum(author._count.subscribers)}</span> 구독자</div>
            <div className="stat"><span className="num">{author._count.series}</span> 시리즈</div>
            <div className="stat"><span className="num">{author._count.posts}</span> 포스트</div>
          </div>

          <AuthorContent
            authorId={author.id}
            authorName={author.displayName}
            series={series}
            subscription={subscription}
          />
        </div>
      </div>
    </div>
  );
}
