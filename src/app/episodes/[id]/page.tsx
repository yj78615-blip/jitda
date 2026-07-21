'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Episode {
  id: string;
  title: string;
  order: number;
  seriesId: string;
  seriesTitle: string;
  publishedAt: string;
  viewsCount: number;
  likesCount: number;
  panelCount: number;
}

const MOCK_EPISODE: Episode = {
  id: 'ep-001',
  title: '첫 만남',
  order: 1,
  seriesId: 'series-001',
  seriesTitle: '별이 빛나는 밤에',
  publishedAt: '2026-07-15',
  viewsCount: 4523,
  likesCount: 891,
  panelCount: 8,
};

export default function EpisodeViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [episode] = useState<Episode>(MOCK_EPISODE);
  const [showList, setShowList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => {
      console.log('Episode ID:', p.id);
    });
  }, [params]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      setLoading(true);
      setCurrentPage((p) => p - 1);
      setTimeout(() => setLoading(false), 300);
    }
  }, [currentPage]);

  const handleNext = useCallback(() => {
    if (currentPage < episode.panelCount) {
      setLoading(true);
      setCurrentPage((p) => p + 1);
      setTimeout(() => setLoading(false), 300);
    }
  }, [currentPage, episode.panelCount]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setShowList(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePrev, handleNext]);

  return (
    <div className="viewer-app">
      {/* Top bar */}
      <header className="viewer-header">
        <div className="viewer-header-inner">
          <button className="viewer-back" onClick={() => router.push(`/series/${episode.seriesId}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="viewer-info">
            <span className="viewer-series">{episode.seriesTitle}</span>
            <span className="viewer-episode-title">{episode.order}화. {episode.title}</span>
          </div>
          <div className="viewer-actions">
            <button className={`viewer-btn-like ${episode.likesCount > 0 ? 'liked' : ''}`} disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
              <span>{episode.likesCount}</span>
            </button>
            <button className="viewer-btn-list" onClick={() => setShowList(!showList)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Viewer content */}
      <main className="viewer-main" onClick={handleNext}>
        <div className={`viewer-panel ${loading ? 'loading' : ''}`}>
          <div className="viewer-panel-inner">
            <div className="viewer-panel-placeholder">
              <div className="viewer-panel-gradient" style={{
                '--g1': '#2d1b69', '--g2': '#0d0c10',
              } as React.CSSProperties}>
                <span className="viewer-panel-label">{episode.seriesTitle}</span>
                <span className="viewer-panel-sub">{episode.order}화 · {episode.title}</span>
                <span className="viewer-panel-page">{currentPage} / {episode.panelCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="viewer-nav">
          <button className="viewer-nav-btn" onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentPage <= 1}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            이전
          </button>
          <span className="viewer-page-indicator">{currentPage} / {episode.panelCount}</span>
          <button className="viewer-nav-btn" onClick={(e) => { e.stopPropagation(); handleNext(); }} disabled={currentPage >= episode.panelCount}>
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
              {Array.from({ length: 5 }, (_, i) => (
                <button key={i} className={`viewer-drawer-item ${i === 0 ? 'active' : ''}`}
                  onClick={() => { setCurrentPage(1); setShowList(false); }}>
                  <span className="viewer-drawer-num">{i + 1}화</span>
                  <div className="viewer-drawer-info">
                    <span className="viewer-drawer-title">
                      {['첫 만남', '두근거림', '비밀', '고백', '새로운 시작'][i]}
                    </span>
                    <span className="viewer-drawer-meta">조회 {1234 + i * 300}</span>
                  </div>
                  {i === 0 && <span className="viewer-drawer-current">현재</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom progress bar */}
      <footer className="viewer-footer">
        <div className="viewer-footer-inner">
          <button className="viewer-footer-btn" onClick={handlePrev} disabled={currentPage <= 1}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            이전화
          </button>
          <div className="viewer-progress">
            <div className="viewer-progress-bar" style={{ width: `${(currentPage / episode.panelCount) * 100}%` }} />
          </div>
          <button className="viewer-footer-btn" onClick={handleNext} disabled={currentPage >= episode.panelCount}>
            다음화
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
