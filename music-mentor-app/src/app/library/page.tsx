'use client';

import { useEffect, useMemo, useState } from 'react';
import AlbumCover from '@/components/AlbumCover';
import AlbumModal from '@/components/AlbumModal';
import { useMusic } from '@/context/MusicContext';
import { Album } from '@/lib/types';
import { paginate } from '@/lib/pagination';

interface AlbumSearchResult {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl?: string;
}

export default function LibraryPage() {
  const {
    library,
    addAlbumToLibrary,
    removeAlbumFromLibrary,
    handleRate,
    getPlaybackUrl,
    getPlaybackLabel,
    isLoading,
    isAuthenticated,
    authReady,
  } = useMusic();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [isAdding, setIsAdding] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [searchResults, setSearchResults] = useState<AlbumSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [modalAlbum, setModalAlbum] = useState<Album | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [page, setPage] = useState(1);

  const selectedAlbum = useMemo(
    () => library.find(album => album.id === selectedAlbumId) || null,
    [library, selectedAlbumId]
  );

  const openAlbumModal = async (album: typeof library[number]) => {
    setSelectedAlbumId(album.id);
    setModalAlbum(null);
    setModalError('');
    setIsModalLoading(true);
    try {
      const response = await fetch('/api/album-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albums: [{ title: album.title, artist: album.artist.name }],
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to load album details');
      }
      const [details] = await response.json();
      if (!details) {
        throw new Error('Album details not found');
      }
      setModalAlbum({
        ...details,
        id: album.id,
        rating: album.rating,
        listened: album.listened,
        skipped: album.skipped,
        dateAdded: album.dateAdded,
      });
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to load album details');
    } finally {
      setIsModalLoading(false);
    }
  };

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

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredAndSortedLibrary.length / 20));
    if (page > maxPage) {
      setPage(1);
    }
  }, [filteredAndSortedLibrary.length, page]);

  const { items: pagedLibrary, totalPages, page: currentPage } = paginate(filteredAndSortedLibrary, page, 20);

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <h1 className="text-4xl font-serif mb-8">Library</h1>
      
      {/* Controls */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by album or artist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow p-2 bg-transparent border-b divider focus:outline-none text-muted"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-2 bg-transparent border-b divider focus:outline-none text-muted"
        >
          <option value="dateAdded">Sort by Date Added</option>
          <option value="rating">Sort by Rating</option>
          <option value="artist">Sort by Artist</option>
        </select>
        <button
          onClick={() => setIsAdding((prev) => !prev)}
          className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
        >
          {isAdding ? 'Close' : 'Add Album'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-10">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Type album and artist (e.g. Selected Ambient Works Aphex Twin)"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              className="flex-grow p-2 bg-transparent border-b divider focus:outline-none text-muted"
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
                    void addAlbumToLibrary({ title: results[0].title, artist: results[0].artist });
                    setAddQuery('');
                    setSearchResults([]);
                    setIsAdding(false);
                  } else {
                    setSearchResults(results);
                  }
                } catch (err) {
                  setAddError('Search failed. Try again.');
                } finally {
                  setIsSearching(false);
                }
              }}
              className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
              disabled={!addQuery.trim() || isSearching || isLoading}
            >
              {isSearching ? 'Searching...' : 'Find Album'}
            </button>
          </div>
          {addError && <p className="text-sm text-red-700 mt-3">{addError}</p>}

          {searchResults.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted mb-3">
                Multiple matches found. Click an album to add it to your library.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map((album) => (
                  <button
                    key={`${album.title}-${album.artist}`}
                    onClick={async () => {
                      void addAlbumToLibrary({ title: album.title, artist: album.artist });
                      setSearchResults([]);
                      setAddQuery('');
                      setIsAdding(false);
                    }}
                    className="text-left"
                  >
                    <div className="relative w-full h-40">
                      <AlbumCover src={album.coverUrl} alt={album.title} />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold">{album.title}</p>
                      <p className="text-xs text-muted">{album.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!authReady ? (
        <p className="text-muted">Checking sign-in status...</p>
      ) : !isAuthenticated ? (
        <div className="mt-10">
          <h2 className="text-3xl font-serif mb-2">Sign in required</h2>
          <p className="text-muted">Sign in to view and manage your library.</p>
        </div>
      ) : filteredAndSortedLibrary.length > 0 ? (
        <>
        <div className="space-y-3">
          {pagedLibrary.map(album => (
            <div
              key={album.id}
              className="flex items-center gap-4 pb-4 border-b divider"
            >
              <button
                onClick={() => openAlbumModal(album)}
                className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden"
              >
                <AlbumCover src={album.coverUrl} alt={album.title} />
              </button>
              <button
                onClick={() => openAlbumModal(album)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-semibold truncate">{album.title}</p>
                <p className="text-sm text-muted truncate">{album.artist.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRate(album.id, star as 1 | 2 | 3 | 4 | 5);
                      }}
                      className={star <= (album.rating || 0) ? 'text-yellow-600' : 'text-muted'}
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
                  href={getPlaybackUrl(album)}
                  className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
                >
                  {getPlaybackLabel()}
                </a>
                <button
                  onClick={() => setConfirmRemoveId(album.id)}
                  className="text-sm text-muted underline decoration-transparent hover:decoration-current underline-offset-4"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-muted">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
            >
              Next
            </button>
          </div>
        )}
        </>
      ) : (
        <div className="py-10">
          <p className="text-muted">Your library is empty.</p>
          <p className="text-muted text-sm">Albums you rate or mark as &apos;Listened&apos; will appear here.</p>
        </div>
      )}

      {selectedAlbum && modalAlbum && (
        <AlbumModal
          album={modalAlbum}
          onClose={() => {
            setSelectedAlbumId(null);
            setModalAlbum(null);
            setModalError('');
          }}
        />
      )}

      {selectedAlbum && isModalLoading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg)] rounded-lg shadow-xl max-w-sm w-full p-6">
            <p className="text-sm text-muted">Loading album details...</p>
          </div>
        </div>
      )}

      {selectedAlbum && modalError && !isModalLoading && !modalAlbum && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg)] rounded-lg shadow-xl max-w-sm w-full p-6">
            <p className="text-sm text-red-700">{modalError}</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setSelectedAlbumId(null);
                  setModalError('');
                }}
                className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemoveId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg)] rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-serif mb-3">Remove album?</h3>
            <p className="text-sm text-muted mb-5">
              This will remove the album from your library.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeAlbumFromLibrary(confirmRemoveId);
                  setConfirmRemoveId(null);
                }}
                className="text-sm text-red-700 underline decoration-transparent hover:decoration-current underline-offset-4"
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
