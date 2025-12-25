'use client';

import { useEffect, useRef, useState } from 'react';
import { Album } from '@/lib/types';
import { useMusic } from '@/context/MusicContext';
import AlbumCover from './AlbumCover';
import AlbumModal from './AlbumModal';
import ArtistModal from './ArtistModal';

// SVG Icon Components
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-6 h-6 ${filled ? 'text-yellow-600' : 'text-gray-400'} cursor-pointer`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.368-2.448a1 1 0 00-1.176 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
  </svg>
);

export default function AlbumCard({ album, isRefreshing }: { album: Album; isRefreshing?: boolean }) {
  const { handleRate, handleMarkAsListened, handleSkip, getPlaybackUrl, getPlaybackLabel } = useMusic();
  const [hoverRating, setHoverRating] = useState(0);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rating = album.rating || 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const handlePreviewToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!album.previewUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(album.previewUrl);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioRef.current.src !== album.previewUrl) {
      audioRef.current.src = album.previewUrl;
    }

    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
    });
  };

  return (
    <>
      <div className={`relative flex flex-col md:flex-row gap-5 pb-6 border-b divider ${isRefreshing ? 'opacity-60' : ''}`}>
        {isRefreshing && (
          <div className="absolute bottom-4 right-4 z-10">
            <div className="loading-pill text-[10px] uppercase tracking-[0.28em] text-[var(--bg)] px-3 py-1 rounded-full shadow-lg">
              Refreshing
            </div>
          </div>
        )}
        {/* Album Cover - Clickable */}
        <button
          onClick={() => setShowAlbumModal(true)}
          className="relative w-full h-72 hover:opacity-90 transition-opacity md:w-56 md:h-56 md:shrink-0"
        >
          <AlbumCover src={album.coverUrl} alt={album.title} />
          <div className="absolute bottom-2 left-2">
            <button
              onClick={handlePreviewToggle}
              disabled={!album.previewUrl}
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                album.previewUrl ? 'bg-[var(--bg)] border-[var(--text)]' : 'bg-transparent border-[var(--divider)] cursor-not-allowed'
              }`}
              aria-label={album.previewUrl ? 'Play preview' : 'Preview unavailable'}
              title={album.previewUrl ? 'Play preview' : 'Preview unavailable'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5">
                  <path d="M6 5v14l12-7z" />
                </svg>
              )}
            </button>
          </div>
        </button>
        <div className="flex flex-col flex-grow">
          {/* Album Title - Clickable */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowAlbumModal(true)}
              className="text-2xl font-serif text-left hover:underline underline-offset-4"
            >
              {album.title}
            </button>
            
            {/* Artist Name - Clickable */}
            <button
              onClick={() => setShowArtistModal(true)}
              className="text-base uppercase tracking-[0.2em] text-muted hover:text-[var(--text)] hover:underline text-left"
            >
              {album.artist.name}
            </button>
          </div>
          
          <p className="text-base text-muted mt-4 leading-relaxed">{album.summary}</p>
          
          <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">Rating</span>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleRate(album.id, star as any)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-105"
                    >
                      <div className="text-lg cursor-pointer">
                        <StarIcon filled={hoverRating >= star || rating >= star} />
                      </div>
                    </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <button onClick={() => handleMarkAsListened(album.id)} className="underline decoration-transparent hover:decoration-current underline-offset-4">Save to library</button>
                 <a
                  href={getPlaybackUrl(album)}
                  className="underline decoration-transparent hover:decoration-current underline-offset-4"
                >
                  {getPlaybackLabel()}
                </a>
                <button onClick={() => handleSkip(album.id)} className="underline decoration-transparent hover:decoration-current underline-offset-4 text-muted">Set aside</button>
              </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAlbumModal && <AlbumModal album={album} onClose={() => setShowAlbumModal(false)} />}
      {showArtistModal && <ArtistModal artist={album.artist} onClose={() => setShowArtistModal(false)} />}
    </>
  );
}
