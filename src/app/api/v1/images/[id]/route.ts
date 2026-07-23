import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withErrors, jsonOk, notFound, badRequest, forbidden, APIError } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { toImageDTO } from '@/lib/mappers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

// url 은 Supabase Storage 공개 오브젝트 URL 만 허용.
// ponytail: 도메인 화이트리스트를 env 로 뺄지는 Storage 실제 연결 시 결정.
const ALLOWED_URL_HOSTS = /^https:\/\/([a-z0-9-]+\.)*supabase\.(co|in)\/storage\/v1\/object\/public\//i;

const PatchImageSchema = z.object({
  url: z.string().url().max(2048).regex(ALLOWED_URL_HOSTS, '허용되지 않은 URL 입니다.').optional(),
  status: z.enum(['READY', 'FAILED']).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE).optional(),
  content_type: z.enum(ALLOWED_CONTENT_TYPES).optional(),
}).strict();

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
  if (image.uploaderId !== user.id) throw forbidden('소유자만 수정할 수 있습니다.');

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const parsed = PatchImageSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('잘못된 이미지 업데이트 요청입니다.');
  const body = parsed.data;

  // READY 로 전환하려면 url 이 반드시 함께 있어야 한다.
  const nextStatus = body.status ?? image.status;
  const nextUrl = body.url ?? image.url;
  if (nextStatus === 'READY' && !nextUrl) {
    throw badRequest('READY 상태는 url 이 필요합니다.');
  }

  let updated;
  try {
    updated = await db.image.update({
      where: { id },
      data: {
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.width !== undefined ? { width: body.width } : {}),
        ...(body.height !== undefined ? { height: body.height } : {}),
        ...(body.file_size !== undefined ? { fileSize: body.file_size } : {}),
        ...(body.content_type !== undefined ? { contentType: body.content_type } : {}),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'DB 오류';
    throw new APIError(500, 'internal_error', `DB image.update: ${msg}`);
  }

  return jsonOk({ image: toImageDTO(updated) });
});
