import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, notFound, badRequest } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { toImageDTO } from '@/lib/mappers';

export const runtime = 'nodejs';

export const GET = withErrors(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!id.startsWith('img_')) throw badRequest('올바르지 않은 이미지 ID입니다.');

  const image = await db.image.findUnique({ where: { id } });
  if (!image) throw notFound();

  return jsonOk({ image: toImageDTO(image) });
});

export const PATCH = withErrors(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!id.startsWith('img_')) throw badRequest('올바르지 않은 이미지 ID입니다.');

  const { user } = await requireUser(req);

  const image = await db.image.findUnique({ where: { id } });
  if (!image) throw notFound();
  if (image.uploaderId !== user.id) throw badRequest('소유자만 수정할 수 있습니다.');

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const data: Record<string, unknown> = {};
  if (raw.url) data.url = raw.url;
  if (raw.width) data.width = raw.width;
  if (raw.height) data.height = raw.height;
  if (raw.file_size) data.fileSize = raw.file_size;
  if (raw.content_type) data.contentType = raw.content_type;
  if (raw.status) data.status = raw.status;

  const updated = await db.image.update({
    where: { id },
    data: data as any,
  });

  return jsonOk({ image: toImageDTO(updated) });
});
