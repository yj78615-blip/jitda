import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import { getSessionFromRequest } from '@/lib/auth/session';

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
