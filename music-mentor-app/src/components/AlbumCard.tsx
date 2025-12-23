'use client';

import { useEffect, useRef, useState } from 'react';
import { Album } from '@/lib/types';
import { useMusic } from '@/context/MusicContext';
import AlbumCover from './AlbumCover';
import AlbumModal from './AlbumModal';
import ArtistModal from './ArtistModal';

// SVG Icon Components
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-6 h-6 ${filled ? 'text-yellow-400' : 'text-gray-600'} cursor-pointer`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.368-2.448a1 1 0 00-1.176 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
  </svg>
);

export default function AlbumCard({ album }: { album: Album }) {
  const { handleRate, handleMarkAsListened, handleSkip } = useMusic();
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
      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-300 ease-in-out flex flex-col sm:flex-row md:flex-col">
        {/* Album Cover - Clickable */}
        <button
          onClick={() => setShowAlbumModal(true)}
          className="relative w-full h-56 hover:opacity-90 transition-opacity sm:w-28 sm:h-28 sm:shrink-0 md:w-full md:h-56"
        >
          <AlbumCover src={album.coverUrl} alt={album.title} />
          <div className="absolute bottom-2 left-2">
            <button
              onClick={handlePreviewToggle}
              disabled={!album.previewUrl}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg border border-black/30 ${
                album.previewUrl ? 'bg-white/90 hover:bg-white' : 'bg-gray-500/70 cursor-not-allowed'
              }`}
              aria-label={album.previewUrl ? 'Play preview' : 'Preview unavailable'}
              title={album.previewUrl ? 'Play preview' : 'Preview unavailable'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-900">
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-900 ml-0.5">
                  <path d="M6 5v14l12-7z" />
                </svg>
              )}
            </button>
          </div>
        </button>
        <div className="p-4 flex flex-col flex-grow sm:py-3 sm:px-4 md:p-4">
          {/* Album Title - Clickable */}
          <button
            onClick={() => setShowAlbumModal(true)}
            className="text-xl font-bold text-white hover:text-blue-400 transition-colors text-left"
          >
            {album.title}
          </button>
          
          {/* Artist Name - Clickable */}
          <button
            onClick={() => setShowArtistModal(true)}
            className="text-md text-gray-300 hover:text-blue-400 hover:underline transition-colors text-left"
          >
            {album.artist.name}
          </button>
          
          <p className="text-sm text-gray-400 mt-2 flex-grow">{album.summary}</p>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm font-semibold text-gray-300 mb-2">Rating</p>
              <div className="flex items-center space-x-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleRate(album.id, star as any)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <div className={`w-6 h-6 ${hoverRating >= star || rating >= star ? 'text-yellow-400' : 'text-gray-600'} cursor-pointer`}>
                        <StarIcon filled={hoverRating >= star || rating >= star} />
                      </div>
                    </button>
                ))}
              </div>
              <button onClick={() => handleMarkAsListened(album.id)} className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-full mb-2">Listened</button>
            
              <div className="flex space-x-2">
                <a
                  href={
                    album.appleMusicUrl
                      ? album.appleMusicUrl.replace(/^https?:\/\//, 'music://')
                      : `music://music.apple.com/us/search?term=${encodeURIComponent(album.title)}+${encodeURIComponent(album.artist.name)}`
                  }
                  className="flex-1 text-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Play
                </a>
                <button onClick={() => handleSkip(album.id)} className="flex-1 px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded-md">Skip</button>
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
