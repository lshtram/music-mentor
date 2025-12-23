'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Album, AlbumSeed, Artist } from '@/lib/types';
import { supabaseClient } from '@/lib/supabaseClient';

const DEFAULT_PROMPT = "Recommend albums that explore minimalism and repetition, across genres, with emotional depth. Avoid mainstream pop.";

interface MusicContextType {
  recommendations: Album[];
  library: Album[];
  prompt: string;
  setPrompt: (prompt: string) => void;
  regenerateRecommendations: (replaceAll?: boolean) => Promise<void>;
  addAlbumToLibrary: (seed: AlbumSeed) => Promise<void>;
  removeAlbumFromLibrary: (albumId: string) => void;
  handleRate: (albumId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  handleMarkAsListened: (albumId: string) => void;
  handleSkip: (albumId: string) => void;
  getArtistDetails: (artistId: string) => Artist | undefined;
  getAlbumsByArtist: (artistId: string) => Album[];
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  authReady: boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const albumKey = (title: string, artistName: string) =>
  `${normalizeText(title)}|${normalizeText(artistName)}`;

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [prompt, setPromptState] = useState(DEFAULT_PROMPT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const regenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegeneratingRef = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const library = albums.filter(a => a.listened || a.rating !== undefined);
  const recommendations = albums.filter(a => !a.listened && a.rating === undefined && !a.skipped).slice(0, 5);

  useEffect(() => {
    let isActive = true;
    const init = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!isActive) return;
      if (data.session?.user) {
        setUserId(data.session.user.id);
        setUserEmail(data.session.user.email || null);
        setAccessToken(data.session.access_token);
      }
      setAuthReady(true);
    };
    init();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        setAccessToken(session.access_token);
      } else {
        setUserId(null);
        setUserEmail(null);
        setAccessToken(null);
        setAlbums([]);
        setPromptState(DEFAULT_PROMPT);
        setHasHydrated(false);
      }
      setAuthReady(true);
    });

    return () => {
      isActive = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) return;
      try {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const [promptRes, libraryRes] = await Promise.all([
          fetch(`/api/prompt`, { headers }),
          fetch(`/api/library`, { headers }),
        ]);

        if (promptRes.ok) {
          const data = await promptRes.json();
          if (data?.prompt) {
            setPromptState(data.prompt);
          }
        }

        if (libraryRes.ok) {
          const data: Album[] = await libraryRes.json();
          setAlbums(data);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setHasHydrated(true);
      }
    };

    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (!userId || !hasHydrated || !accessToken) return;
    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ prompt }),
        });
      } catch (err) {
        console.error('Error saving prompt:', err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [prompt, userId, hasHydrated, accessToken]);

  const regenerateRecommendations = useCallback(async (replaceAll: boolean = false) => {
    // Prevent concurrent regenerations
    if (isRegeneratingRef.current) return;
    isRegeneratingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const libraryAlbums = albums.filter(a => a.listened || a.rating !== undefined);

      // Calculate how many new recommendations we need
      const currentRecs = albums.filter(a => !a.listened && a.rating === undefined && !a.skipped);
      const desiredCount = replaceAll ? 5 : Math.max(0, 5 - currentRecs.length);
      if (desiredCount <= 0) return;

      const excludeSeeds: AlbumSeed[] = [];
      const excludeKeys = new Set<string>();
      [...libraryAlbums, ...currentRecs].forEach(album => {
        const key = albumKey(album.title, album.artist.name);
        if (!excludeKeys.has(key)) {
          excludeKeys.add(key);
          excludeSeeds.push({ title: album.title, artist: album.artist.name });
        }
      });

      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          libraryAlbums,
          excludeAlbums: excludeSeeds,
          replaceAll,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      const albumSeeds: AlbumSeed[] = await response.json();

      const detailsResponse = await fetch('/api/album-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albums: albumSeeds }),
      });

      if (!detailsResponse.ok) {
        const data = await detailsResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to build album details');
      }

      const newAlbums: Album[] = await detailsResponse.json();

      setAlbums(prev => {
        // Keep library items stable
        const libraryItems = prev.filter(a => a.listened || a.rating !== undefined);
        const libraryKeys = new Set(libraryItems.map(a => albumKey(a.title, a.artist.name)));

        // Existing active recommendations (to be preserved when not replacing all)
        const existingRecs = prev.filter(a => !a.listened && a.rating === undefined && !a.skipped);
        const existingKeys = new Set(existingRecs.map(a => albumKey(a.title, a.artist.name)));

        // Filter out any incoming albums that collide with library or existing
        const filteredNew = newAlbums.filter(a => {
          const key = albumKey(a.title, a.artist.name);
          return !libraryKeys.has(key) && !existingKeys.has(key);
        });

        const now = new Date().toISOString();

        if (replaceAll) {
          // Replace all active recommendations
          const toTake = filteredNew.slice(0, 5);
          return [...libraryItems, ...toTake.map(a => ({ ...a, dateAdded: now }))];
        } else {
          // Fill only missing slots up to 5
          const slotsLeft = Math.max(0, 5 - existingRecs.length);
          const toTake = filteredNew.slice(0, slotsLeft);
          // Keep library + existingRecs + new fills
          const merged = [...libraryItems, ...existingRecs, ...toTake.map(a => ({ ...a, dateAdded: now }))];
          return merged;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Error regenerating recommendations:', err);
    } finally {
      isRegeneratingRef.current = false;
      setIsLoading(false);
    }
  }, [prompt, albums]);

  const setPrompt = useCallback((newPrompt: string) => {
    setPromptState(newPrompt);
  }, []);

  const addAlbumToLibrary = useCallback(async (seed: AlbumSeed) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/album-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albums: [seed] }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add album');
      }

      const [album] = await response.json();
      if (!album) {
        throw new Error('Album details not found');
      }

      setAlbums(prev => {
        const now = new Date().toISOString();
        const key = albumKey(album.title, album.artist.name);
        const existingIndex = prev.findIndex(item => albumKey(item.title, item.artist.name) === key);
        if (existingIndex >= 0) {
          const updated = prev.map((item, index) =>
            index === existingIndex
              ? { ...item, listened: true, skipped: false, dateAdded: now }
              : item
          );
          return updated;
        }
        return [...prev, { ...album, listened: true, skipped: false, dateAdded: now }];
      });

      if (userId && accessToken) {
        await fetch('/api/library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ album: { ...album, listened: true, skipped: false } }),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add album';
      setError(message);
      console.error('Error adding album:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, accessToken]);

  const removeAlbumFromLibrary = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(album => album.id !== albumId));
    if (userId && accessToken) {
      fetch(`/api/library?albumId=${encodeURIComponent(albumId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch((err) => console.error('Error removing album:', err));
    }
  }, [userId, accessToken]);

  const processAlbumAction = useCallback((albumId: string, updates: Partial<Album>) => {
    // Clear any pending regeneration
    if (regenerationTimeoutRef.current) {
      clearTimeout(regenerationTimeoutRef.current);
    }

    let updatedAlbum: Album | null = null;
    setAlbums(prevAlbums => {
      const now = new Date().toISOString();
      return prevAlbums.map(a => {
        if (a.id !== albumId) return a;
        updatedAlbum = { ...a, ...updates, dateAdded: now };
        return updatedAlbum;
      });
    });

    if (updatedAlbum && userId && accessToken && (updatedAlbum.listened || updatedAlbum.rating !== undefined)) {
      fetch('/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ album: updatedAlbum }),
      }).catch((err) => console.error('Error saving album:', err));
    }

    // Schedule regeneration to fill any gaps
    regenerationTimeoutRef.current = setTimeout(() => {
      setAlbums(prev => {
        const activeRecommendations = prev.filter(
          a => !a.listened && a.rating === undefined && !a.skipped
        );
        if (activeRecommendations.length < 5 && !isRegeneratingRef.current) {
          // Trigger regeneration
          regenerateRecommendations(false);
        }
        return prev;
      });
    }, 50);
  }, [regenerateRecommendations, userId, accessToken]);

  const signInWithEmail = useCallback(async (email: string) => {
    setError(null);
    const { error: authError } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (authError) {
      setError(authError.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
  }, []);

  const handleRate = (albumId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    processAlbumAction(albumId, { rating, listened: true, skipped: false });
  };

  const handleMarkAsListened = (albumId: string) => {
    processAlbumAction(albumId, { listened: true, skipped: false });
  };

  const handleSkip = (albumId: string) => {
    processAlbumAction(albumId, { skipped: true });
  };

  const getArtistDetails = (artistId: string): Artist | undefined => {
    const album = albums.find(a => a.artist.id === artistId);
    return album?.artist;
  }

  const getAlbumsByArtist = (artistId: string): Album[] => {
    return albums.filter(a => a.artist.id === artistId);
  }

  return (
    <MusicContext.Provider value={{
      recommendations,
      library,
      prompt,
      setPrompt,
      regenerateRecommendations,
      addAlbumToLibrary,
      removeAlbumFromLibrary,
      handleRate,
      handleMarkAsListened,
      handleSkip,
      getArtistDetails,
      getAlbumsByArtist,
      isLoading,
      error,
      userEmail,
      signInWithEmail,
      signOut,
      isAuthenticated: Boolean(userId),
      authReady
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
