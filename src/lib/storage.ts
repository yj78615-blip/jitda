import { createClient } from '@supabase/supabase-js';

// Supabase Storage 헬퍼.
// 클라 → Storage 직접 PUT (presigned upload URL) 방식 → Vercel 4.5 MiB body 제한 우회.
// 서버는 서명된 URL 만 발급, 파일 바이트는 서버를 거치지 않음.

const BUCKET = 'images';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// 서명된 업로드 URL 을 발급. 클라이언트는 이 URL 로 파일을 PUT 한다.
export async function createSignedUploadUrl(path: string): Promise<{ signedUrl: string; publicUrl: string; token: string }> {
  const c = client();
  const { data, error } = await c.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(`signed URL 발급 실패: ${error.message}`);
  const { data: pub } = c.storage.from(BUCKET).getPublicUrl(path);
  return {
    signedUrl: data.signedUrl,
    publicUrl: pub.publicUrl,
    token: data.token,
  };
}

// (미사용, 소용량 · 서버 프록시 경로가 필요할 때만 쓰이는 백업 헬퍼)
// ponytail: 지금은 signed URL 로 통일. 실제로 안 쓰면 다음 청소 때 삭제.
export async function uploadImageServerSide(opts: { path: string; bytes: ArrayBuffer; contentType: string }): Promise<{ publicUrl: string }> {
  const c = client();
  const { error } = await c.storage.from(BUCKET).upload(opts.path, opts.bytes, {
    contentType: opts.contentType, upsert: false, cacheControl: '31536000',
  });
  if (error) throw new Error(`Storage 업로드 실패: ${error.message}`);
  const { data } = c.storage.from(BUCKET).getPublicUrl(opts.path);
  return { publicUrl: data.publicUrl };
}
