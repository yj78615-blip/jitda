import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import { requireUser, getSessionFromRequest } from '@/lib/auth/session';
import { z } from 'zod';
import type { ContentTargetType, ReactionType } from '@prisma/client';

export const runtime = 'nodejs';

const ToggleSchema = z.object({
  target_type: z.enum(['EPISODE', 'POST', 'COMMENT', 'SALON', 'USER']),
  target_id: z.string().min(1),
  type: z.enum(['LIKE', 'HEART', 'FIRE', 'SAD', 'WOW']),
});

const COUNT_TARGETS: Record<string, { table: string; field: string }> = {
  EPISODE: { table: 'episode', field: 'likesCount' },
  POST: { table: 'post', field: 'likesCount' },
};

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const parsed = ToggleSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('잘못된 요청 형식입니다.');

  const { target_type, target_id, type } = parsed.data;

  const existing = await db.reaction.findUnique({
    where: {
      userId_targetType_targetId_type: {
        userId: user.id,
        targetType: target_type as ContentTargetType,
        targetId: target_id,
        type: type as ReactionType,
      },
    },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    const ct = COUNT_TARGETS[target_type];
    if (ct) {
      await (db as any)[ct.table].update({
        where: { id: target_id },
        data: { [ct.field]: { decrement: 1 } },
      });
    }
    return jsonOk({ reacted: false, type: null });
  }

  await db.reaction.create({
    data: {
      userId: user.id,
      targetType: target_type as ContentTargetType,
      targetId: target_id,
      type: type as ReactionType,
    },
  });

  const ct = COUNT_TARGETS[target_type];
  if (ct) {
    await (db as any)[ct.table].update({
      where: { id: target_id },
      data: { [ct.field]: { increment: 1 } },
    });
  }

  return jsonOk({ reacted: true, type });
});

export const GET = withErrors(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);

  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('target_type');
  const targetId = searchParams.get('target_id');
  const type = searchParams.get('type');

  if (!targetType || !targetId) throw badRequest('target_type과 target_id가 필요합니다.');

  const where: Record<string, unknown> = {
    targetType: targetType as ContentTargetType,
    targetId,
  };
  if (type) where.type = type as ReactionType;

  const [reactions, count] = await Promise.all([
    db.reaction.findMany({
      where: where as any,
      select: { id: true, userId: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.reaction.count({ where: where as any }),
  ]);

  const userReaction = session
    ? reactions.find((r) => r.userId === session.sub)?.type ?? null
    : null;

  const counts: Record<string, number> = {};
  for (const r of reactions) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
  }

  return jsonOk({
    reactions: reactions.slice(0, 20),
    counts,
    total: count,
    user_reaction: userReaction,
  });
});
