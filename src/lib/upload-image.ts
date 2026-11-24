// 이미지 한 장 업로드: 서명 URL 발급 → Storage 직접 PUT → READY 전환. 성공하면 이미지 ID.
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const IMAGE_ACCEPT = TYPES.join(',');
const MAX_SIZE = 20 * 1024 * 1024; // 서버 한도와 동일

export async function uploadImage(
  file: File, purpose: 'episode_page' | 'series_cover', token: string,
): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error(`${file.name}: JPG·PNG·WebP·GIF 만 올릴 수 있습니다.`);
  if (file.size > MAX_SIZE) throw new Error(`${file.name}: 20MB 이하만 올릴 수 있습니다.`);

  const headers = { 'Content-Type': 'application/json', authorization: `Bearer ${token}` };
  const meta = { content_type: file.type, file_size: file.size };
  const fail = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return new Error(data?.error?.message || `${file.name} ${fallback}`);
  };

  const initRes = await fetch('/api/v1/images/upload', {
    method: 'POST', headers, body: JSON.stringify({ purpose, ...meta }),
  });
  if (!initRes.ok) throw await fail(initRes, '업로드 초기화 실패');
  const { image } = await initRes.json();

  // Vercel body 제한을 피해 Storage 로 직접 보낸다
  const putRes = await fetch(image.upload_url, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!putRes.ok) throw new Error(`${file.name} 스토리지 업로드 실패 (${putRes.status})`);

  const readyRes = await fetch(`/api/v1/images/${image.id}`, {
    method: 'PATCH', headers, body: JSON.stringify({ status: 'READY', url: image.public_url, ...meta }),
  });
  if (!readyRes.ok) throw await fail(readyRes, '상태 갱신 실패');
  return image.id;
}
