import { db } from './db';

/** 시리즈 행에 cover 를 붙인다 (Series-Image 관계가 없어 한 번에 따로 조회). */
export async function withCovers<T extends { coverImageId: string | null }>(rows: T[]) {
  const ids = rows.flatMap((r) => r.coverImageId ?? []);
  const images = ids.length
    ? await db.image.findMany({
        where: { id: { in: ids }, status: 'READY' },
        select: { id: true, url: true, width: true, height: true },
      })
    : [];
  const byId = new Map(images.map((i) => [i.id, i]));
  return rows.map((r) => ({ ...r, cover: r.coverImageId ? byId.get(r.coverImageId) ?? null : null }));
}
