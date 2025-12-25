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
  restoreOriginalPrompt: () => void;
  regenerateRecommendations: (replaceAll?: boolean) => Promise<void>;
  randomizePrompt: () => Promise<void>;
  addAlbumToLibrary: (seed: AlbumSeed) => Promise<void>;
  removeAlbumFromLibrary: (albumId: string) => void;
  updatePassword: (password: string) => Promise<void>;
  settings: {
    recommendationsCount: number;
    preferredMusicApp: 'apple' | 'spotify' | 'other';
  };
  updateSettings: (next: { recommendationsCount?: number; preferredMusicApp?: 'apple' | 'spotify' | 'other' }) => Promise<void>;
  getPlaybackUrl: (album: Album) => string;
  getPlaybackLabel: () => string;
  handleRate: (albumId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  handleMarkAsListened: (albumId: string) => void;
  handleSkip: (albumId: string) => void;
  getArtistDetails: (artistId: string) => Artist | undefined;
  getAlbumsByArtist: (artistId: string) => Album[];
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
  signInWithEmail: (email: string, password: string, mode: 'sign-in' | 'sign-up') => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  authReady: boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const albumKey = (title: string, artistName: string) =>
  `${normalizeText(title)}|${normalizeText(artistName)}`;

const DEFAULT_RANDOM_PROMPTS = [
  "I'm a rock lover and I want to learn about the rock of the 80's, especially albums with bold production.",
  "I want to discover the roots of ambient music and how it shaped modern electronic sound.",
  "I'm curious about vocal jazz and the albums that define intimate, late-night listening.",
  "I want to understand minimalist composers and the works that introduced repetition as beauty.",
  "I love hip-hop and want to explore lyrical storytelling from the 90's underground.",
  "I'm new to classical music and want a path into 20th-century orchestral color and mood.",
  "I want to explore experimental electronic albums that feel cinematic and textural.",
];

const jazzLeaningPrompt = "I want to learn about new and exciting sax players and the albums that define their sound.";
const electronicLeaningPrompt = "I'm interested in forward-thinking electronic producers reshaping rhythm and texture.";
const rockLeaningPrompt = "I want to dive into overlooked rock albums with daring arrangements and strong identity.";

const promptSignals = [
  { keywords: ['jazz', 'sax'], prompt: jazzLeaningPrompt },
  { keywords: ['electronic', 'ambient', 'synth'], prompt: electronicLeaningPrompt },
  { keywords: ['rock', 'guitar'], prompt: rockLeaningPrompt },
];

const pickRandomItem = (items: string[], exclude?: string) => {
  const filtered = exclude ? items.filter(item => item !== exclude) : items;
  if (filtered.length === 0) return items[0];
  return filtered[Math.floor(Math.random() * filtered.length)];
};

const pickRandomPrompt = (library: Album[], currentPrompt: string) => {
  const promptLower = currentPrompt.toLowerCase();
  const signalMatch = promptSignals.find(signal =>
    signal.keywords.some(keyword => promptLower.includes(keyword))
  );
  if (signalMatch) {
    return signalMatch.prompt;
  }

  const jazzCount = library.filter(album =>
    (album.genres || []).some(genre => genre.toLowerCase().includes('jazz'))
  ).length;
  const electronicCount = library.filter(album =>
    (album.genres || []).some(genre => genre.toLowerCase().includes('electronic'))
  ).length;
  const rockCount = library.filter(album =>
    (album.genres || []).some(genre => genre.toLowerCase().includes('rock'))
  ).length;

  const totals = [
    { key: 'jazz', count: jazzCount, prompt: jazzLeaningPrompt },
    { key: 'electronic', count: electronicCount, prompt: electronicLeaningPrompt },
    { key: 'rock', count: rockCount, prompt: rockLeaningPrompt },
  ];

  const dominant = totals.reduce((prev, current) => (current.count > prev.count ? current : prev), totals[0]);
  if (dominant.count >= 3) {
    return dominant.prompt === currentPrompt
      ? pickRandomItem(DEFAULT_RANDOM_PROMPTS, currentPrompt)
      : dominant.prompt;
  }

  return pickRandomItem(DEFAULT_RANDOM_PROMPTS, currentPrompt);
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [prompt, setPromptState] = useState(DEFAULT_PROMPT);
  const [lastUserPrompt, setLastUserPrompt] = useState(DEFAULT_PROMPT);
  const promptSourceRef = useRef<'user' | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const regenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegeneratingRef = useRef(false);
  const backgroundFillAttemptsRef = useRef(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState({
    recommendationsCount: 5,
    preferredMusicApp: 'apple' as 'apple' | 'spotify' | 'other',
  });

  const library = albums.filter(a => a.listened || a.rating !== undefined);
  const recommendations = albums
    .filter(a => !a.listened && a.rating === undefined && !a.skipped)
    .slice(0, settings.recommendationsCount);

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
        setLastUserPrompt(DEFAULT_PROMPT);
        promptSourceRef.current = 'auto';
        setSettings({
          recommendationsCount: 5,
          preferredMusicApp: 'apple',
        });
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
        const headers: Record<string, string> = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};
        const [promptRes, libraryRes, recsRes, settingsRes] = await Promise.all([
          fetch(`/api/prompt`, { headers }),
          fetch(`/api/library`, { headers }),
          fetch(`/api/recommendations-store`, { headers }),
          fetch(`/api/settings`, { headers }),
        ]);

        let libraryData: Album[] = [];
        if (libraryRes.ok) {
          const data: Album[] = await libraryRes.json();
          libraryData = data;
          setAlbums(data);
        }

        let nextPrompt = '';
        let fetchedLastUserPrompt = '';
        if (promptRes.ok) {
          const data = await promptRes.json();
          if (data?.prompt) {
            nextPrompt = data.prompt;
          }
          if (data?.lastUserPrompt) {
            fetchedLastUserPrompt = data.lastUserPrompt;
          }
        }

        if (!nextPrompt) {
          const randomPrompt = pickRandomPrompt(libraryData, '');
          setPromptState(randomPrompt);
          setLastUserPrompt(fetchedLastUserPrompt || DEFAULT_PROMPT);
          nextPrompt = randomPrompt;
        } else {
          setPromptState(nextPrompt);
          setLastUserPrompt(fetchedLastUserPrompt || DEFAULT_PROMPT);
        }

        let recommendationsCount = settings.recommendationsCount;
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const nextSettings = {
            recommendationsCount: data?.recommendationsCount ?? 5,
            preferredMusicApp: data?.preferredMusicApp ?? 'apple',
          };
          setSettings(nextSettings);
          recommendationsCount = nextSettings.recommendationsCount;
        }

        if (recsRes.ok) {
          const data = await recsRes.json();
          if (data?.recommendations && Array.isArray(data.recommendations)) {
            const libraryItems = libraryData.filter(a => a.listened || a.rating !== undefined);
            const libraryKeys = new Set(libraryItems.map(a => albumKey(a.title, a.artist.name)));
            const filteredRecs = data.recommendations.slice(0, recommendationsCount).filter((rec: Album) => {
              const key = albumKey(rec.title, rec.artist.name);
              return !libraryKeys.has(key);
            });
            setAlbums([...libraryItems, ...filteredRecs]);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setHasHydrated(true);
      }
    };

    loadUserData();
  }, [userId, accessToken, settings.recommendationsCount]);

  useEffect(() => {
    if (!userId || !hasHydrated || !accessToken) return;
    const source = promptSourceRef.current;
    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ prompt, source }),
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
    if (replaceAll) {
      backgroundFillAttemptsRef.current = 0;
    }
    try {
      const libraryAlbums = albums.filter(a => a.listened || a.rating !== undefined);

      // Calculate how many new recommendations we need
      const currentRecs = albums.filter(a => !a.listened && a.rating === undefined && !a.skipped);
      const desiredCount = replaceAll
        ? settings.recommendationsCount
        : Math.max(0, settings.recommendationsCount - currentRecs.length);
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
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          prompt,
          libraryAlbums,
          excludeAlbums: excludeSeeds,
          replaceAll,
          desiredCount,
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

      let nextActiveCount = 0;
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
          const toTake = filteredNew.slice(0, settings.recommendationsCount);
          const merged = [...libraryItems, ...toTake.map(a => ({ ...a, dateAdded: now }))];
          nextActiveCount = merged.filter(a => !a.listened && a.rating === undefined && !a.skipped).length;
          if (userId && accessToken) {
            fetch('/api/recommendations-store', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ recommendations: toTake }),
            }).catch((err) => console.error('Error saving recommendations:', err));
          }
          return merged;
        } else {
          // Fill only missing slots up to 5
          const slotsLeft = Math.max(0, settings.recommendationsCount - existingRecs.length);
          const toTake = filteredNew.slice(0, slotsLeft);
          // Keep library + existingRecs + new fills
          const merged = [...libraryItems, ...existingRecs, ...toTake.map(a => ({ ...a, dateAdded: now }))];
          nextActiveCount = merged.filter(a => !a.listened && a.rating === undefined && !a.skipped).length;
          if (userId && accessToken) {
            const recsToStore = merged
              .filter(a => !a.listened && a.rating === undefined && !a.skipped)
              .slice(0, settings.recommendationsCount);
            fetch('/api/recommendations-store', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ recommendations: recsToStore }),
            }).catch((err) => console.error('Error saving recommendations:', err));
          }
          return merged;
        }
      });

      if (nextActiveCount >= settings.recommendationsCount) {
        backgroundFillAttemptsRef.current = 0;
      } else if (nextActiveCount > 0 && backgroundFillAttemptsRef.current < 2) {
        backgroundFillAttemptsRef.current += 1;
        setTimeout(() => {
          if (!isRegeneratingRef.current) {
            regenerateRecommendations(false);
          }
        }, 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Error regenerating recommendations:', err);
    } finally {
      isRegeneratingRef.current = false;
      setIsLoading(false);
    }
  }, [prompt, albums, userId, accessToken, settings.recommendationsCount]);

  const randomizePrompt = useCallback(async () => {
    try {
      if (!accessToken) {
        const fallbackPrompt = pickRandomPrompt(library, prompt);
        setPromptState(fallbackPrompt);
        return;
      }
      const response = await fetch('/api/prompt-randomize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt, libraryAlbums: library }),
      });
      if (!response.ok) {
        throw new Error('Prompt randomize failed');
      }
      const data = await response.json();
      if (typeof data?.prompt === 'string' && data.prompt.trim()) {
        setPromptState(data.prompt.trim());
        promptSourceRef.current = 'auto';
        return;
      }
      throw new Error('Prompt randomize returned empty prompt');
    } catch (error) {
      console.error('Prompt randomize error:', error);
      const fallbackPrompt = pickRandomPrompt(library, prompt);
      setPromptState(fallbackPrompt);
      promptSourceRef.current = 'auto';
    }
  }, [accessToken, library, prompt]);

  const setPrompt = useCallback((newPrompt: string) => {
    setPromptState(newPrompt);
    setLastUserPrompt(newPrompt);
    promptSourceRef.current = 'user';
  }, []);

  const restoreOriginalPrompt = useCallback(() => {
    const fallback = lastUserPrompt || DEFAULT_PROMPT;
    setPromptState(fallback);
    promptSourceRef.current = 'user';
  }, [lastUserPrompt]);

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

  const updatePassword = useCallback(async (password: string) => {
    setError(null);
    if (!password) {
      setError('Password is required.');
      return;
    }
    const { error: authError } = await supabaseClient.auth.updateUser({ password });
    if (authError) {
      setError(authError.message);
    }
  }, []);

  const updateSettings = useCallback(async (next: { recommendationsCount?: number; preferredMusicApp?: 'apple' | 'spotify' | 'other' }) => {
    if (!accessToken) return;
    const previousCount = settings.recommendationsCount;
    const payload = {
      recommendationsCount: next.recommendationsCount ?? settings.recommendationsCount,
      preferredMusicApp: next.preferredMusicApp ?? settings.preferredMusicApp,
    };
    setSettings({
      recommendationsCount: payload.recommendationsCount,
      preferredMusicApp: payload.preferredMusicApp,
    });
    if (payload.recommendationsCount > previousCount) {
      setTimeout(() => {
        if (!isRegeneratingRef.current) {
          regenerateRecommendations(false);
        }
      }, 0);
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }, [accessToken, regenerateRecommendations, settings.preferredMusicApp, settings.recommendationsCount]);

  const getPlaybackUrl = useCallback((album: Album) => {
    const title = encodeURIComponent(album.title);
    const artist = encodeURIComponent(album.artist.name);
    if (settings.preferredMusicApp === 'spotify') {
      return `https://open.spotify.com/search/${title}%20${artist}`;
    }
    if (settings.preferredMusicApp === 'other') {
      return `https://www.google.com/search?q=${title}%20${artist}%20album`;
    }
    return album.appleMusicUrl
      ? album.appleMusicUrl.replace(/^https?:\/\//, 'music://')
      : `music://music.apple.com/us/search?term=${title}%20${artist}`;
  }, [settings.preferredMusicApp]);

  const getPlaybackLabel = useCallback(() => {
    if (settings.preferredMusicApp === 'spotify') return 'Play in Spotify';
    if (settings.preferredMusicApp === 'other') return 'Play in Music App';
    return 'Play in AppleMusic';
  }, [settings.preferredMusicApp]);

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

    const now = new Date().toISOString();
    const currentAlbum = albums.find(a => a.id === albumId);
    const updatedAlbum = currentAlbum
      ? ({ ...currentAlbum, ...updates, dateAdded: now } as Album)
      : null;

    setAlbums(prevAlbums =>
      prevAlbums.map(a => (a.id === albumId ? { ...a, ...updates, dateAdded: now } : a))
    );

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
        if (activeRecommendations.length < settings.recommendationsCount && !isRegeneratingRef.current) {
          // Trigger regeneration
          regenerateRecommendations(false);
        }
        return prev;
      });
    }, 50);
  }, [regenerateRecommendations, userId, accessToken, albums, settings.recommendationsCount]);

  const signInWithEmail = useCallback(async (email: string, password: string, mode: 'sign-in' | 'sign-up') => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    const authCall = mode === 'sign-up'
      ? supabaseClient.auth.signUp({ email: trimmedEmail, password })
      : supabaseClient.auth.signInWithPassword({ email: trimmedEmail, password });

    const { error: authError } = await authCall;
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
      randomizePrompt,
      restoreOriginalPrompt,
      addAlbumToLibrary,
      removeAlbumFromLibrary,
      updatePassword,
      settings,
      updateSettings,
      getPlaybackUrl,
      getPlaybackLabel,
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
