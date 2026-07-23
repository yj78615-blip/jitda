import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, jsonOk, badRequest } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { idFor } from '@/lib/id';
import { uploadImage } from '@/lib/storage';

export const runtime = 'nodejs';

// IDOR 방지: 업로드 시 episode/post 링크를 받지 않는다.
// attach 는 PATCH /episodes/{id} · POST /series/{id}/episodes 의
// image_ids 경로에서 assertOwnedReadyImages 를 통과할 때만.

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);
const PURPOSES = new Set(['episode_page', 'series_cover', 'post_page', 'avatar', 'banner']);

function extFor(ct: string): string {
  return ct === 'image/jpeg' ? 'jpg'
       : ct === 'image/png'  ? 'png'
       : ct === 'image/webp' ? 'webp'
       : ct === 'image/gif'  ? 'gif'
       : 'bin';
}

export const POST = withErrors(async (req: NextRequest) => {
  const { user } = await requireUser(req);

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    throw badRequest('multipart/form-data 요청이 필요합니다.');
  }

  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest('form 파싱에 실패했습니다.');

  const purpose = form.get('purpose');
  const file = form.get('file');
  if (typeof purpose !== 'string' || !PURPOSES.has(purpose)) {
    throw badRequest('purpose 가 올바르지 않습니다.');
  }
  if (!(file instanceof File)) throw badRequest('file 필드가 필요합니다.');
  if (file.size === 0) throw badRequest('빈 파일입니다.');
  if (file.size > MAX_FILE_SIZE) {
    throw badRequest(`파일이 너무 큽니다 (최대 ${MAX_FILE_SIZE / 1024 / 1024} MiB).`);
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw badRequest('지원하지 않는 이미지 형식입니다.');
  }

  const id = idFor.image();
  const path = `${purpose}/${user.id}/${id}.${extFor(file.type)}`;
  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadImage({ path, bytes, contentType: file.type });

  const image = await db.image.create({
    data: {
      id,
      uploaderId: user.id,
      purpose,
      url: publicUrl,
      status: 'READY',
      contentType: file.type,
      fileSize: file.size,
    },
  });

  return jsonOk({
    image: {
      id: image.id,
      url: image.url,
      status: image.status,
      content_type: image.contentType,
      file_size: image.fileSize,
    },
  });
});
