'use client';

import { Artist } from '@/lib/types';
import WikiSummary from './WikiSummary';

interface ArtistModalProps {
  artist: Artist;
  onClose: () => void;
}

export default function ArtistModal({ artist, onClose }: ArtistModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-3xl font-bold text-white">{artist.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>
        
        <WikiSummary name={artist.name} fallback={artist.bio} />
      </div>
    </div>
  );
}
