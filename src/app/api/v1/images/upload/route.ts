import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { z } from 'zod';

export const runtime = 'nodejs';

// IDOR 방지: 업로드 시 episode/post 링크를 받지 않는다.
// attach 는 PATCH /episodes/{id} · PATCH /posts/{id} 의 image_ids 경로에서
// assertOwnedReadyImages 를 통과할 때만 일어난다.
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const UploadSchema = z.object({
  purpose: z.enum(['episode_page', 'series_cover', 'post_page', 'avatar', 'banner']),
  content_type: z.enum(ALLOWED_CONTENT_TYPES).optional(),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const parsed = UploadSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('잘못된 업로드 요청입니다.');

  const { purpose, content_type, file_size, width, height } = parsed.data;

  const { customAlphabet } = await import('nanoid');
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 20);
  const id = `img_${nanoid()}`;

  const image = await db.image.create({
    data: {
      id,
      uploaderId: user.id,
      purpose,
      episodeId: null,
      postId: null,
      ownerType: null,
      ownerId: null,
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
