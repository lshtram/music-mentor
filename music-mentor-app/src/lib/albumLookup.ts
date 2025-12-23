const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const buildKey = (title: string, artistName: string) => {
  return `${normalizeText(title)}|${normalizeText(artistName)}`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 800
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(initialDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
};

const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const buildItunesUrl = (title: string, artistName: string) => {
  const term = encodeURIComponent(`${title} ${artistName}`);
  return `https://itunes.apple.com/search?term=${term}&entity=album&limit=5`;
};

const buildItunesTrackUrl = (title: string, artistName: string) => {
  const term = encodeURIComponent(`${title} ${artistName}`);
  return `https://itunes.apple.com/search?term=${term}&entity=song&limit=8`;
};

const pickBestItunesMatch = (results: any[], title: string, artistName: string) => {
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artistName);

  for (const item of results) {
    const itemTitle = normalizeText(item.collectionName || '');
    const itemArtist = normalizeText(item.artistName || '');
    if (itemTitle === normalizedTitle && itemArtist.includes(normalizedArtist)) {
      return item;
    }
  }

  for (const item of results) {
    const itemTitle = normalizeText(item.collectionName || '');
    const itemArtist = normalizeText(item.artistName || '');
    const titleMatch = itemTitle.includes(normalizedTitle) || normalizedTitle.includes(itemTitle);
    const artistMatch = normalizedArtist.length > 0 && itemArtist.includes(normalizedArtist);
    if (titleMatch && artistMatch) {
      return item;
    }
  }

  return null;
};

export interface VerifiedRelease {
  collectionId: number;
  title: string;
  artist: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  collectionViewUrl?: string;
}

export const findReleaseByTitleArtist = async (title: string, artistName: string) => {
  const LOOKUP_DEBUG = process.env.REC_DEBUG === '1';
  if (!title || !artistName) return null;

  const url = buildItunesUrl(title, artistName);
  if (LOOKUP_DEBUG) {
    console.info('[rec] itunes lookup', { title, artistName, url });
  }
  const response = await retryWithBackoff(() => fetchWithTimeout(url, {}, 5000), 2, 800);
  if (!response || !response.ok) {
    if (LOOKUP_DEBUG) {
      console.info('[rec] itunes lookup failed', { title, artistName, status: response?.status });
    }
    return null;
  }
  const json = await response.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  const match = pickBestItunesMatch(results, title, artistName);
  if (LOOKUP_DEBUG) {
    console.info('[rec] itunes match', {
      title,
      artistName,
      resultCount: results.length,
      matched: Boolean(match),
      matchedTitle: match?.collectionName,
      matchedArtist: match?.artistName,
    });
  }
  if (!match) return null;
  return {
    collectionId: match.collectionId,
    title: match.collectionName,
    artist: match.artistName,
    artworkUrl100: match.artworkUrl100,
    artworkUrl600: match.artworkUrl600,
    collectionViewUrl: match.collectionViewUrl,
  } as VerifiedRelease;
};

export const verifyAlbumExists = async (title: string, artistName: string) => {
  const release = await findReleaseByTitleArtist(title, artistName);
  return release !== null;
};

const upscaleItunesArtwork = (url: string, size: number) => {
  return url.replace(/\/[0-9]+x[0-9]+bb\.(jpg|png)$/i, `/${size}x${size}bb.$1`);
};

export const findCoverUrlByTitleArtist = async (title: string, artistName: string) => {
  const release = await findReleaseByTitleArtist(title, artistName);
  if (!release) return '';

  if (release.artworkUrl600) {
    return release.artworkUrl600;
  }
  if (release.artworkUrl100) {
    return upscaleItunesArtwork(release.artworkUrl100, 600);
  }
  return '';
};

export const findPreviewUrlByTitleArtist = async (title: string, artistName: string) => {
  if (!title || !artistName) return '';
  try {
    const url = buildItunesTrackUrl(title, artistName);
    const response = await retryWithBackoff(() => fetchWithTimeout(url, {}, 5000), 2, 800);
    if (!response || !response.ok) return '';
    const json = await response.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    const normalizedTitle = normalizeText(title);
    const normalizedArtist = normalizeText(artistName);

    for (const item of results) {
      const collectionName = normalizeText(item.collectionName || '');
      const itemArtist = normalizeText(item.artistName || '');
      if (collectionName && collectionName.includes(normalizedTitle) && itemArtist.includes(normalizedArtist)) {
        return typeof item.previewUrl === 'string' ? item.previewUrl : '';
      }
    }

    const first = results.find((item: { previewUrl?: unknown }) => typeof item.previewUrl === 'string');
    return first?.previewUrl || '';
  } catch (error) {
    return '';
  }
};

export const dedupeAlbumSeeds = (seeds: Array<{ title: string; artist: string }>) => {
  const seen = new Set<string>();
  return seeds.filter(seed => {
    const key = buildKey(seed.title, seed.artist);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const albumSeedKey = (title: string, artistName: string) => buildKey(title, artistName);
