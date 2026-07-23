import { createClient } from '@supabase/supabase-js';

// Supabase Storage 헬퍼.
// 클라 SDK 없이 서버가 직접 업로드 → 서비스 롤 키만 필요 (RLS 우회).
// bucket: `images` (public read). AGENTS.md Phase 1 backlog.

const BUCKET = 'images';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface UploadArgs {
  path: string;
  bytes: ArrayBuffer;
  contentType: string;
}

export async function uploadImage({ path, bytes, contentType }: UploadArgs): Promise<{ publicUrl: string }> {
  const c = client();
  const { error } = await c.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  });
  if (error) throw new Error(`Storage 업로드 실패: ${error.message}`);
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

// CSP · 검증에 필요한 Supabase 호스트 (예: xxx.supabase.co)
export function supabaseStorageHost(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) return '';
  try { return new URL(url).host; } catch { return ''; }
}
