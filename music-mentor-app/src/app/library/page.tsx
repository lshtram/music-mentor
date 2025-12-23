'use client';

import { useMemo, useState } from 'react';
import AlbumCover from '@/components/AlbumCover';
import AlbumModal from '@/components/AlbumModal';
import { useMusic } from '@/context/MusicContext';

interface AlbumSearchResult {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl?: string;
}

export default function LibraryPage() {
  const { library, addAlbumToLibrary, removeAlbumFromLibrary, handleRate, isLoading, isAuthenticated, authReady } = useMusic();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [isAdding, setIsAdding] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [searchResults, setSearchResults] = useState<AlbumSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const selectedAlbum = useMemo(
    () => library.find(album => album.id === selectedAlbumId) || null,
    [library, selectedAlbumId]
  );

  const filteredAndSortedLibrary = library
    .filter(album => 
      album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      album.artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'artist':
          return a.artist.name.localeCompare(b.artist.name);
        case 'dateAdded':
        default:
          return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime();
      }
    });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">Your Library</h1>
      
      {/* Controls */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by album or artist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        >
          <option value="dateAdded">Sort by Date Added</option>
          <option value="rating">Sort by Rating</option>
          <option value="artist">Sort by Artist</option>
        </select>
        <button
          onClick={() => setIsAdding((prev) => !prev)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold"
        >
          {isAdding ? 'Close' : 'Add Album'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Type album and artist (e.g. Selected Ambient Works Aphex Twin)"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              className="flex-grow p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
              disabled={isSearching || isLoading}
            />
            <button
              onClick={async () => {
                const query = addQuery.trim();
                if (!query) return;
                setIsSearching(true);
                setAddError('');
                setSearchResults([]);
                try {
                  const response = await fetch(`/api/album-search?q=${encodeURIComponent(query)}`);
                  if (!response.ok) {
                    throw new Error('Search failed');
                  }
                  const results: AlbumSearchResult[] = await response.json();
                  if (results.length === 0) {
                    setAddError('No matches found. Try a different spelling.');
                  } else if (results.length === 1) {
                    await addAlbumToLibrary({ title: results[0].title, artist: results[0].artist });
                    setAddQuery('');
                  } else {
                    setSearchResults(results);
                  }
                } catch (err) {
                  setAddError('Search failed. Try again.');
                } finally {
                  setIsSearching(false);
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold disabled:bg-gray-600"
              disabled={!addQuery.trim() || isSearching || isLoading}
            >
              {isSearching ? 'Searching...' : 'Find Album'}
            </button>
          </div>
          {addError && <p className="text-sm text-red-300 mt-3">{addError}</p>}

          {searchResults.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-3">
                Multiple matches found. Click an album to add it to your library.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchResults.map((album) => (
                  <button
                    key={`${album.title}-${album.artist}`}
                    onClick={async () => {
                      await addAlbumToLibrary({ title: album.title, artist: album.artist });
                      setSearchResults([]);
                      setAddQuery('');
                    }}
                    className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-400 transition-colors text-left"
                  >
                    <div className="relative w-full h-40">
                      <AlbumCover src={album.coverUrl} alt={album.title} />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white">{album.title}</p>
                      <p className="text-xs text-gray-400">{album.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!authReady ? (
        <p className="text-gray-400">Checking sign-in status...</p>
      ) : !isAuthenticated ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-gray-200">
          <h2 className="text-xl font-bold mb-2">Sign in required</h2>
          <p className="text-gray-400">Sign in to view and manage your library.</p>
        </div>
      ) : filteredAndSortedLibrary.length > 0 ? (
        <div className="space-y-3">
          {filteredAndSortedLibrary.map(album => (
            <div
              key={album.id}
              className="flex items-center gap-4 bg-gray-800 rounded-lg p-3 border border-gray-700"
            >
              <button
                onClick={() => setSelectedAlbumId(album.id)}
                className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden"
              >
                <AlbumCover src={album.coverUrl} alt={album.title} />
              </button>
              <button
                onClick={() => setSelectedAlbumId(album.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-white font-semibold truncate">{album.title}</p>
                <p className="text-sm text-gray-400 truncate">{album.artist.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRate(album.id, star as 1 | 2 | 3 | 4 | 5);
                      }}
                      className={star <= (album.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}
                      aria-label={`Rate ${album.title} ${star} stars`}
                      title={`Rate ${star} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={
                    album.appleMusicUrl
                      ? album.appleMusicUrl.replace(/^https?:\/\//, 'music://')
                      : `music://music.apple.com/us/search?term=${encodeURIComponent(album.title)}+${encodeURIComponent(album.artist.name)}`
                  }
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Play
                </a>
                <button
                  onClick={() => setConfirmRemoveId(album.id)}
                  className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-400">Your library is empty.</p>
          <p className="text-gray-500 text-sm">Albums you rate or mark as &apos;Listened&apos; will appear here.</p>
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbumId(null)}
        />
      )}

      {confirmRemoveId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Remove album?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This will remove the album from your library.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeAlbumFromLibrary(confirmRemoveId);
                  setConfirmRemoveId(null);
                }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
