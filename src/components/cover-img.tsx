// 그라디언트 썸네일 위에 커버를 덮는다. 없거나 못 불러오면 아래 그라디언트가 보인다.
export default function CoverImg({ url }: { url?: string | null }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="cover-img" src={url} alt="" loading="lazy" />;
}
