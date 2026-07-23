'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface EpisodeDTO {
  id: string;
  series_id: string;
  title: string;
  order: number;
  viewer_mode: 'scroll' | 'page';
  is_subscriber_only: boolean;
  is_adult: boolean;
  images: { id: string; url: string | null; order: number; width: number | null; height: number | null }[];
  stats: { views: number; likes: number; comments: number };
  prev_episode_id: string | null;
  next_episode_id: string | null;
  published_at: string | null;
  created_at: string;
}

interface EpisodeSummary {
  id: string;
  title: string;
  order: number;
  published_at: string | null;
  stats: { views: number; likes: number };
}

interface SeriesInfo {
  id: string;
  title: string;
}

export default function EpisodeViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [episode, setEpisode] = useState<EpisodeDTO | null>(null);
  const [series, setSeries] = useState<SeriesInfo | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageLoading, setImageLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    params.then(async ({ id }) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/v1/episodes/${id}`);
        if (!res.ok) {
          if (res.status === 401) { refreshAuth(); }
          const errData = await res.json().catch(() => null);
          setLoadError(`[${res.status}] ${errData?.error?.message ?? '응답 파싱 실패'}`);
          return;
        }
        const data = await res.json() as { episode: EpisodeDTO };
        setEpisode(data.episode);
        setCurrentPage(1);

        const seriesRes = await fetch(`/api/v1/series/${data.episode.series_id}`);
        if (seriesRes.ok) {
          const seriesData = await seriesRes.json() as { series: SeriesInfo };
          setSeries(seriesData.series);
        }

        const episodesRes = await fetch(`/api/v1/episodes?seriesId=${data.episode.series_id}`);
        if (episodesRes.ok) {
          const epsData = await episodesRes.json() as { episodes: EpisodeSummary[] };
          setEpisodes(epsData.episodes ?? []);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    });
  }, [params, refreshAuth]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      setImageLoading(true);
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const handleNext = useCallback(() => {
    if (episode && currentPage < episode.images.length) {
      setImageLoading(true);
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, episode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setShowList(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePrev, handleNext]);

  const handleNavigateEpisode = useCallback((episodeId: string) => {
    setShowList(false);
    router.push(`/episodes/${episodeId}`);
  }, [router]);

  if (loading) {
    return (
      <div className="viewer-app">
        <div className="viewer-loading"><span className="spinner" /></div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="viewer-app">
        <div className="viewer-loading">
          <p>에피소드를 불러올 수 없습니다.</p>
          {loadError && <p style={{ color: 'var(--danger)', fontSize: 12, maxWidth: 500 }}>{loadError}</p>}
          <Link href="/" className="btn btn-ghost">홈으로</Link>
        </div>
      </div>
    );
  }

  const totalPages = episode.images.length;
  const currentImage = episode.images[currentPage - 1];

  return (
    <div className="viewer-app">
      {/* Top bar */}
      <header className="viewer-header">
        <div className="viewer-header-inner">
          <button className="viewer-back" onClick={() => router.push(`/series/${episode.series_id}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="viewer-info">
            <span className="viewer-series">{series?.title ?? ''}</span>
            <span className="viewer-episode-title">{episode.order}화. {episode.title}</span>
          </div>
          <div className="viewer-actions">
            <button className="viewer-btn-list" onClick={() => setShowList(!showList)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Viewer content */}
      <main className="viewer-main" onClick={handleNext}>
        <div className={`viewer-panel ${imageLoading ? 'loading' : ''}`}>
          <div className="viewer-panel-inner">
            {currentImage?.url ? (
              <img
                src={currentImage.url}
                alt={`${episode.title} - ${currentPage}페이지`}
                className="viewer-panel-img"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            ) : (
              <div className="viewer-panel-placeholder">
                <div className="viewer-panel-gradient" style={{
                  '--g1': '#2d1b69', '--g2': '#0d0c10',
                } as React.CSSProperties}>
                  <span className="viewer-panel-label">{series?.title ?? ''}</span>
                  <span className="viewer-panel-sub">{episode.order}화 · {episode.title}</span>
                  <span className="viewer-panel-page">{currentPage} / {totalPages}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="viewer-nav">
          <button className="viewer-nav-btn" onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentPage <= 1}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            이전
          </button>
          <span className="viewer-page-indicator">{currentPage} / {totalPages}</span>
          <button className="viewer-nav-btn" onClick={(e) => { e.stopPropagation(); handleNext(); }} disabled={currentPage >= totalPages}>
            다음
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </main>

      {/* Episode list drawer */}
      {showList && (
        <div className="viewer-drawer-overlay" onClick={() => setShowList(false)}>
          <div className="viewer-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-drawer-header">
              <h3>에피소드 목록</h3>
              <button className="viewer-drawer-close" onClick={() => setShowList(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="viewer-drawer-list">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  className={`viewer-drawer-item ${ep.id === episode.id ? 'active' : ''}`}
                  onClick={() => handleNavigateEpisode(ep.id)}
                >
                  <span className="viewer-drawer-num">{ep.order}화</span>
                  <div className="viewer-drawer-info">
                    <span className="viewer-drawer-title">{ep.title}</span>
                    <span className="viewer-drawer-meta">조회 {ep.stats.views}</span>
                  </div>
                  {ep.id === episode.id && <span className="viewer-drawer-current">현재</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <footer className="viewer-footer">
        <div className="viewer-footer-inner">
          {episode.prev_episode_id ? (
            <Link href={`/episodes/${episode.prev_episode_id}`} className="viewer-footer-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              이전화
            </Link>
          ) : (
            <button className="viewer-footer-btn" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              이전화
            </button>
          )}
          <div className="viewer-progress">
            <div className="viewer-progress-bar" style={{ width: `${(currentPage / totalPages) * 100}%` }} />
          </div>
          {episode.next_episode_id ? (
            <Link href={`/episodes/${episode.next_episode_id}`} className="viewer-footer-btn">
              다음화
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          ) : (
            <button className="viewer-footer-btn" disabled>
              다음화
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
