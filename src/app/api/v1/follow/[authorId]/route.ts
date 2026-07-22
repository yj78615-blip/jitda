import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest, notFound } from '@/lib/api-error';
import { getSessionFromRequest, requireUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const GET = withErrors(async (req: NextRequest, ctx: { params: Promise<{ authorId: string }> }) => {
  const { authorId } = await ctx.params;
  if (!authorId) throw badRequest('올바르지 않은 사용자 ID입니다.');

  const session = await getSessionFromRequest(req);
  if (!session) return jsonOk({ following: false });

  const follow = await db.follow.findUnique({
    where: { followerId_authorId: { followerId: session.sub, authorId } },
    select: { createdAt: true },
  });

  return jsonOk({ following: !!follow, created_at: follow?.createdAt.toISOString() ?? null });
});

export const POST = withErrors(async (req: NextRequest, ctx: { params: Promise<{ authorId: string }> }) => {
  const { authorId } = await ctx.params;
  if (!authorId) throw badRequest('올바르지 않은 사용자 ID입니다.');

  const { user } = await requireUser(req);
  if (authorId === user.id) throw badRequest('자기 자신을 팔로우할 수 없습니다.');

  const author = await db.user.findUnique({ where: { id: authorId }, select: { id: true } });
  if (!author) throw notFound('존재하지 않는 사용자입니다.');

  const existing = await db.follow.findUnique({
    where: { followerId_authorId: { followerId: user.id, authorId } },
    select: { createdAt: true },
  });
  if (existing) return jsonOk({ followed: true, already: true });

  await db.follow.create({ data: { followerId: user.id, authorId } });
  return jsonOk({ followed: true });
});

export const DELETE = withErrors(async (req: NextRequest, ctx: { params: Promise<{ authorId: string }> }) => {
  const { authorId } = await ctx.params;
  if (!authorId) throw badRequest('올바르지 않은 사용자 ID입니다.');

  const { user } = await requireUser(req);

  try {
    await db.follow.delete({
      where: { followerId_authorId: { followerId: user.id, authorId } },
    });
  } catch {
    return jsonOk({ unfollowed: false, message: '팔로우하고 있지 않습니다.' });
  }
  return jsonOk({ unfollowed: true });
});
