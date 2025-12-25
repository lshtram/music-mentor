'use client';

import { useState } from 'react';
import AlbumCover from './AlbumCover';
import { Album, PersonnelMember } from '@/lib/types';
import WikiSummary from './WikiSummary';

interface AlbumModalProps {
  album: Album;
  onClose: () => void;
}

const PersonnelSection = ({
  personnel,
  onArtistClick,
}: {
  personnel?: PersonnelMember[];
  onArtistClick: (name: string) => void;
}) => {
  if (!personnel || personnel.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-serif mb-3">Personnel</h3>
      <div className="space-y-3">
        {personnel.map((member, idx) => (
          <div key={idx} className="border-b divider pb-2">
            <p className="text-muted">
              <span className="font-semibold text-[var(--text)]">{member.role}:</span>{' '}
              <button
                onClick={() => onArtistClick(member.name)}
                className="text-[var(--accent)] hover:underline"
              >
                {member.name}
              </button>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AlbumModal({ album, onClose }: AlbumModalProps) {
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  const handleArtistClick = (artistName: string) => {
    // For now, we'll show a simple popup. In a full implementation,
    // you'd fetch the artist details from your backend
    setSelectedArtist(artistName);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg)] rounded-lg shadow-2xl max-w-4xl w-full p-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-4xl font-serif flex-1">
            {album.title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-[var(--text)] text-2xl font-bold ml-4"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Album Cover */}
          <div className="md:col-span-1">
            <div className="relative w-full aspect-square">
              {album.coverUrl ? (
                <AlbumCover src={album.coverUrl} alt={album.title} />
              ) : (
                <div className="w-full h-full bg-[var(--divider)] rounded-lg flex items-center justify-center">
                  <span className="text-muted">No cover art</span>
                </div>
              )}
            </div>
            <div className="mt-5">
              <p className="text-muted mb-1 text-sm">Artist</p>
              <button
                onClick={() => handleArtistClick(album.artist.name)}
                className="text-[var(--accent)] hover:underline text-lg font-semibold"
              >
                {album.artist.name}
              </button>
            </div>
            {album.releaseYear && (
              <p className="text-muted mt-3 text-sm">Released {album.releaseYear}</p>
            )}
            {album.genres && album.genres.length > 0 && (
              <div className="mt-3">
                <p className="text-muted text-sm mb-2">Genres</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {album.genres.map((genre) => (
                    <span
                      key={genre}
                      className="text-muted"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Album Details */}
          <div className="md:col-span-2">
            <div className="mb-8">
              <h3 className="text-xl font-serif mb-3">About</h3>
              <p className="text-muted leading-relaxed text-base">{album.summary}</p>
            </div>

            <PersonnelSection
              personnel={album.personnel}
              onArtistClick={handleArtistClick}
            />
          </div>
        </div>
      </div>

      {/* Artist Popup */}
      {selectedArtist && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg)] rounded-lg shadow-2xl max-w-2xl w-full p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-serif">{selectedArtist}</h2>
              <button
                onClick={() => setSelectedArtist(null)}
                className="text-muted hover:text-[var(--text)] text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <WikiSummary name={selectedArtist} />
          </div>
        </div>
      )}
    </div>
  );
}
