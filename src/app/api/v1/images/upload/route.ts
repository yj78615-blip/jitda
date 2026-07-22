import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { z } from 'zod';

export const runtime = 'nodejs';

const UploadSchema = z.object({
  purpose: z.enum(['episode_page', 'series_cover', 'post_page', 'avatar', 'banner']),
  episode_id: z.string().optional(),
  post_id: z.string().optional(),
  content_type: z.string().optional(),
  file_size: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const parsed = UploadSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('잘못된 업로드 요청입니다.');

  const { purpose, episode_id, post_id, content_type, file_size, width, height } = parsed.data;

  const { customAlphabet } = await import('nanoid');
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 20);
  const id = `img_${nanoid()}`;

  const image = await db.image.create({
    data: {
      id,
      uploaderId: user.id,
      purpose,
      episodeId: episode_id ?? null,
      postId: post_id ?? null,
      ownerType: episode_id ? 'EPISODE' : post_id ? 'POST' : null,
      ownerId: episode_id ?? post_id ?? null,
      contentType: content_type ?? null,
      fileSize: file_size ?? null,
      width: width ?? null,
      height: height ?? null,
      status: 'AWAITING_UPLOAD',
    },
  });

  return jsonOk({
    image: {
      id: image.id,
      upload_url: `/api/v1/images/${image.id}/file`,
      status: image.status,
    },
  });
});
