import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest, APIError } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { idFor } from '@/lib/id';
import { createSignedUploadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

// IDOR 방지: 업로드 시 episode/post 링크를 받지 않는다.
// attach 는 PATCH /episodes/{id} · POST /series/{id}/episodes 의
// image_ids 경로에서 assertOwnedReadyImages 를 통과할 때만.
//
// Body 는 JSON metadata 만. 파일 바이트는 클라가 반환된 signedUrl 로 직접 PUT.
// 업로드 완료 후 클라는 PATCH /images/{id} 로 url + status=READY 로 전환.

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB (Storage 는 더 크지만 안전선)
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const UploadSchema = z.object({
  purpose: z.enum(['episode_page', 'series_cover', 'post_page', 'avatar', 'banner']),
  content_type: z.enum(ALLOWED_CONTENT_TYPES),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

function extFor(ct: string): string {
  return ct === 'image/jpeg' ? 'jpg'
       : ct === 'image/png'  ? 'png'
       : ct === 'image/webp' ? 'webp'
       : ct === 'image/gif'  ? 'gif'
       : 'bin';
}

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') throw badRequest('JSON 본문이 필요합니다.');

  const parsed = UploadSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('잘못된 업로드 요청입니다.');
  const { purpose, content_type, file_size, width, height } = parsed.data;

  const id = idFor.image();
  const path = `${purpose}/${user.id}/${id}.${extFor(content_type)}`;

  let signedUrl: string; let publicUrl: string; let token: string;
  try {
    ({ signedUrl, publicUrl, token } = await createSignedUploadUrl(path));
  } catch (e) {
    // Storage 실패는 500 이지만 원인은 클라이언트에도 노출 (env 미설정, bucket 없음 등).
    const msg = e instanceof Error ? e.message : 'Storage 오류';
    throw new APIError(500, 'internal_error', `Storage: ${msg}`);
  }

  // Storage 는 아직 파일 없음 — url 은 미리 넣어두지만 status 는 AWAITING_UPLOAD.
  // 클라가 PUT 완료 후 PATCH 로 READY 전환.
  try {
    await db.image.create({
      data: {
        id,
        uploaderId: user.id,
        purpose,
        url: publicUrl,
        status: 'AWAITING_UPLOAD',
        contentType: content_type,
        fileSize: file_size ?? null,
        width: width ?? null,
        height: height ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'DB 오류';
    throw new APIError(500, 'internal_error', `DB image.create: ${msg}`);
  }

  return jsonOk({
    image: {
      id,
      upload_url: signedUrl,
      upload_token: token,
      public_url: publicUrl,
      status: 'AWAITING_UPLOAD',
    },
  });
});
