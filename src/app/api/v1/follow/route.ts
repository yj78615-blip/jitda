import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest, notFound } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');
  const authorId = raw.author_id as string;
  if (!authorId || typeof authorId !== 'string') throw badRequest('author_id가 필요합니다.');
  if (authorId === user.id) throw badRequest('자기 자신을 팔로우할 수 없습니다.');

  const author = await db.user.findUnique({ where: { id: authorId }, select: { id: true } });
  if (!author) throw notFound('존재하지 않는 사용자입니다.');

  const existing = await db.follow.findUnique({
    where: { followerId_authorId: { followerId: user.id, authorId } },
  });
  if (existing) return jsonOk({ followed: true, already: true });

  await db.follow.create({ data: { followerId: user.id, authorId } });
  return jsonOk({ followed: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');
  const authorId = raw.author_id as string;
  if (!authorId || typeof authorId !== 'string') throw badRequest('author_id가 필요합니다.');

  try {
    await db.follow.delete({
      where: { followerId_authorId: { followerId: user.id, authorId } },
    });
  } catch {
    return jsonOk({ unfollowed: false, message: '팔로우하고 있지 않습니다.' });
  }
  return jsonOk({ unfollowed: true });
});
