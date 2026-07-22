import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') ?? 'all';
  const genre = searchParams.get('genre');
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20), 50);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);

  if (!q || q.length < 1) throw badRequest('검색어를 입력해주세요.');

  const keyword = q.replace(/[%_]/g, '\\$&');

  const results: Record<string, unknown[]> = {};
  let total = 0;

  if (type === 'all' || type === 'series') {
    const where: Prisma.SeriesWhereInput = {
      deletedAt: null,
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    };
    if (genre) {
      where.tags = { some: { tag: { slug: genre, isGenre: true } } };
    }

    const [items, count] = await Promise.all([
      db.series.findMany({
        where,
        orderBy: { viewsTotal: 'desc' },
        take: type === 'series' ? limit : 5,
        skip: type === 'series' ? offset : 0,
        select: {
          id: true, title: true, description: true, status: true,
          viewsTotal: true, likesTotal: true,
          author: { select: { handle: true, displayName: true } },
        },
      }),
      db.series.count({ where }),
    ]);
    results.series = items;
    total += count;
  }

  if (type === 'all' || type === 'episode') {
    const where: Prisma.EpisodeWhereInput = {
      deletedAt: null, publishedAt: { not: null, lte: new Date() },
      title: { contains: keyword },
    };
    const [items, count] = await Promise.all([
      db.episode.findMany({
        where,
        orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
        take: type === 'episode' ? limit : 5,
        skip: type === 'episode' ? offset : 0,
        select: {
          id: true, title: true, order: true, viewsCount: true,
          seriesId: true, publishedAt: true,
          series: { select: { title: true } },
        },
      }),
      db.episode.count({ where }),
    ]);
    results.episodes = items;
    total += count;
  }

  if (type === 'all' || type === 'post') {
    const where: Prisma.PostWhereInput = {
      deletedAt: null, publishedAt: { not: null, lte: new Date() },
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    };
    const [items, count] = await Promise.all([
      db.post.findMany({
        where,
        orderBy: { viewsCount: 'desc' },
        take: type === 'post' ? limit : 5,
        skip: type === 'post' ? offset : 0,
        select: {
          id: true, title: true, description: true,
          viewsCount: true, createdAt: true,
          author: { select: { handle: true, displayName: true } },
        },
      }),
      db.post.count({ where }),
    ]);
    results.posts = items;
    total += count;
  }

  if (type === 'all' || type === 'user') {
    const where: Prisma.UserWhereInput = {
      status: 'ACTIVE',
      OR: [
        { displayName: { contains: keyword } },
        { handle: { contains: keyword } },
        { bio: { contains: keyword } },
      ],
    };
    const [items, count] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: type === 'user' ? limit : 5,
        skip: type === 'user' ? offset : 0,
        select: { id: true, handle: true, displayName: true, bio: true },
      }),
      db.user.count({ where }),
    ]);
    results.users = items;
    total += count;
  }

  return jsonOk({ results, total, query: q });
});
