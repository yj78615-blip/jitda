'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, getAccessToken } from '@/lib/auth-context';

interface EpisodeDTO {
  id: string;
  series_id: string;
  title: string;
  order: number;
  images: { id: string; url: string | null; order: number }[];
}

// 편집 화면의 이미지 상태 — 기존(existing)과 새로 스테이지된(staged) 것을 섞어서 순서 관리.
type ImgItem =
  | { kind: 'existing'; imgId: string; url: string; key: string }
  | { kind: 'staged'; key: string; file: File; preview: string };

export default function EditEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: episodeId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [items, setItems] = useState<ImgItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/auth?redirect=/studio/episodes/${episodeId}/edit`); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/episodes/${episodeId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setLoadError(`[${res.status}] ${err?.error?.message ?? '불러오기 실패'}`);
          return;
        }
        const ep = await res.json() as EpisodeDTO;
        setTitle(ep.title);
        setSeriesId(ep.series_id);
        const existing = [...ep.images]
          .filter((img) => img.url)
          .sort((a, b) => a.order - b.order)
          .map<ImgItem>((img) => ({ kind: 'existing', imgId: img.id, url: img.url!, key: `e-${img.id}` }));
        setItems(existing);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    })();
  }, [episodeId, user, authLoading, router]);

  useEffect(() => {
    return () => {
      items.forEach((it) => { if (it.kind === 'staged') URL.revokeObjectURL(it.preview); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickFiles = (input: FileList | null) => {
    if (!input) return;
    const picked: ImgItem[] = [];
    for (let i = 0; i < input.length; i++) {
      const f = input[i]!;
      if (!f.type.startsWith('image/')) continue;
      picked.push({
        kind: 'staged',
        key: `s-${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
      });
    }
    setItems((prev) => [...prev, ...picked]);
  };

  const moveItem = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const removeItem = (i: number) => {
    setItems((prev) => {
      const item = prev[i]!;
      if (item.kind === 'staged') URL.revokeObjectURL(item.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!title.trim()) { setError('회차 제목을 입력해주세요.'); return; }
    if (items.length === 0) { setError('이미지를 최소 1장 이상 남겨주세요.'); return; }
    const token = getAccessToken();
    if (!token) { setError('로그인이 필요합니다.'); return; }

    setSubmitting(true);
    setProgress('업로드 준비...');
    try {
      const imageIds: string[] = [];
      let stagedIdx = 0;
      const stagedTotal = items.filter((it) => it.kind === 'staged').length;
      for (const it of items) {
        if (it.kind === 'existing') {
          imageIds.push(it.imgId);
          continue;
        }
        stagedIdx += 1;
        setProgress(`새 이미지 ${stagedIdx}/${stagedTotal} 업로드 (${it.file.name})...`);
        const initRes = await fetch('/api/v1/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            purpose: 'episode_page',
            content_type: it.file.type,
            file_size: it.file.size,
          }),
        });
        if (!initRes.ok) {
          const err = await initRes.json().catch(() => ({}));
          throw new Error(err?.error?.message || `${it.file.name} 업로드 초기화 실패`);
        }
        const { image } = await initRes.json();
        const putRes = await fetch(image.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': it.file.type },
          body: it.file,
        });
        if (!putRes.ok) throw new Error(`${it.file.name} 스토리지 업로드 실패 (${putRes.status})`);
        const readyRes = await fetch(`/api/v1/images/${image.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            status: 'READY',
            url: image.public_url,
            content_type: it.file.type,
            file_size: it.file.size,
          }),
        });
        if (!readyRes.ok) {
          const err = await readyRes.json().catch(() => ({}));
          throw new Error(err?.error?.message || `${it.file.name} 상태 갱신 실패`);
        }
        imageIds.push(image.id);
      }

      setProgress('회차 저장 중...');
      const res = await fetch(`/api/v1/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), image_ids: imageIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '회차 저장 실패');
      }
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>;
  }

  if (loadError) {
    return (
      <div style={{ padding: 40, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{loadError}</p>
        <Link href="/studio" className="btn btn-ghost">스튜디오로</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/studio" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>
          ← 스튜디오
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>회차 편집</h1>
      </div>

      <form onSubmit={submit} className="studio-card" style={{ display: 'grid', gap: 20 }}>
        <div>
          <label htmlFor="e-title" className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
            회차 제목 <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            id="e-title" type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100} required
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid var(--line)', borderRadius: 8,
              background: 'var(--surface)', color: 'var(--ink)',
            }}
          />
        </div>

        <div>
          <label className="studio-kpi-label" style={{ marginBottom: 6, display: 'block' }}>
            이미지 (총 {items.length}장){' '}
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>기존 · 신규 혼합. 순서·삭제·추가 가능.</span>
          </label>
          <input
            type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
            onChange={(e) => { onPickFiles(e.target.files); e.target.value = ''; }}
            style={{ fontSize: 13 }}
          />
        </div>

        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {items.map((it, i) => (
              <div key={it.key} style={{
                position: 'relative', border: `1px solid ${it.kind === 'staged' ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4',
                background: 'var(--surface-alt, #f8f7f4)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.kind === 'staged' ? it.preview : it.url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)',
                  color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4,
                }}>{i + 1}</div>
                {it.kind === 'staged' && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4, background: 'var(--accent)',
                    color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  }}>NEW</div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  display: 'flex', gap: 2, padding: 2, background: 'rgba(0,0,0,0.55)',
                }}>
                  <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0}
                    style={MINI_BTN} title="위로">↑</button>
                  <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}
                    style={MINI_BTN} title="아래로">↓</button>
                  <button type="button" onClick={() => removeItem(i)}
                    style={{ ...MINI_BTN, marginLeft: 'auto' }} title="삭제">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 12px', fontSize: 13, borderRadius: 8,
            background: 'color-mix(in oklab, var(--danger) 12%, transparent)',
            color: 'var(--danger)',
          }}>{error}</div>
        )}
        {ok && !error && (
          <div style={{
            padding: '10px 12px', fontSize: 13, borderRadius: 8,
            background: 'color-mix(in oklab, var(--success) 12%, transparent)',
            color: 'var(--success)',
          }}>
            저장 완료.{seriesId && <> <Link href={`/series/${seriesId}`}>시리즈로 이동</Link></>}
          </div>
        )}
        {progress && !error && !ok && (
          <div style={{
            padding: '10px 12px', fontSize: 13, borderRadius: 8,
            background: 'color-mix(in oklab, var(--muted) 12%, transparent)',
            color: 'var(--ink)',
          }}>{progress}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href="/studio" className="btn btn-ghost">취소</Link>
          <button type="submit" className="btn studio-btn-accent" disabled={submitting || items.length === 0}>
            {submitting ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

const MINI_BTN: React.CSSProperties = {
  padding: '4px 8px', fontSize: 12, color: '#fff',
  background: 'transparent', border: 'none', cursor: 'pointer',
};
