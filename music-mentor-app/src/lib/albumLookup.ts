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

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const releaseCache = new Map<string, { value: VerifiedRelease | null; expiresAt: number }>();
const previewCache = new Map<string, { value: string; expiresAt: number }>();

const getCached = <T>(cache: Map<string, { value: T; expiresAt: number }>, key: string) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = <T>(cache: Map<string, { value: T; expiresAt: number }>, key: string, value: T) => {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

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

const simplifyTitle = (title: string) => {
  return title
    .replace(/\s*[\[(].*?[\])]/g, '')
    .replace(/:\s*.*/g, '')
    .trim();
};

const pickBestItunesMatch = (results: any[], title: string, artistName: string) => {
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artistName);
  const simplifiedTitle = normalizeText(simplifyTitle(title));

  let best: any = null;
  let bestScore = -1;

  for (const item of results) {
    const itemTitleRaw = typeof item.collectionName === 'string' ? item.collectionName : '';
    const itemArtistRaw = typeof item.artistName === 'string' ? item.artistName : '';
    const itemTitle = normalizeText(itemTitleRaw);
    const itemArtist = normalizeText(itemArtistRaw);
    const itemSimplified = normalizeText(simplifyTitle(itemTitleRaw));

    const artistMatch =
      normalizedArtist.length > 0 &&
      (itemArtist.includes(normalizedArtist) || normalizedArtist.includes(itemArtist));
    if (!artistMatch) continue;

    const exactTitle = itemTitle === normalizedTitle;
    const simplifiedMatch =
      simplifiedTitle.length > 0 &&
      (itemSimplified.includes(simplifiedTitle) || simplifiedTitle.includes(itemSimplified));
    const looseTitle =
      itemTitle.includes(normalizedTitle) || normalizedTitle.includes(itemTitle);

    let score = 0;
    if (exactTitle) score += 4;
    if (simplifiedMatch) score += 2;
    if (looseTitle) score += 1;
    if (itemArtist === normalizedArtist) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
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

  const cacheKey = `${normalizeText(title)}|${normalizeText(artistName)}`;
  const cached = getCached(releaseCache, cacheKey);
  if (cached !== null) {
    return cached;
  }

  const url = buildItunesUrl(title, artistName);
  if (LOOKUP_DEBUG) {
    console.info('[rec] itunes lookup', { title, artistName, url });
  }
  const response = await retryWithBackoff(() => fetchWithTimeout(url, {}, 5000), 2, 800);
  if (!response || !response.ok) {
    if (LOOKUP_DEBUG) {
      console.info('[rec] itunes lookup failed', { title, artistName, status: response?.status });
    }
    setCached(releaseCache, cacheKey, null);
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
  if (!match) {
    setCached(releaseCache, cacheKey, null);
    return null;
  }
  const release = {
    collectionId: match.collectionId,
    title: match.collectionName,
    artist: match.artistName,
    artworkUrl100: match.artworkUrl100,
    artworkUrl600: match.artworkUrl600,
    collectionViewUrl: match.collectionViewUrl,
  } as VerifiedRelease;
  setCached(releaseCache, cacheKey, release);
  return release;
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
  const cacheKey = `${normalizeText(title)}|${normalizeText(artistName)}`;
  const cached = getCached(previewCache, cacheKey);
  if (cached !== null) {
    return cached;
  }
  try {
    const url = buildItunesTrackUrl(title, artistName);
    const response = await retryWithBackoff(() => fetchWithTimeout(url, {}, 5000), 2, 800);
    if (!response || !response.ok) {
      setCached(previewCache, cacheKey, '');
      return '';
    }
    const json = await response.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    const normalizedTitle = normalizeText(title);
    const normalizedArtist = normalizeText(artistName);

    for (const item of results) {
      const collectionName = normalizeText(item.collectionName || '');
      const itemArtist = normalizeText(item.artistName || '');
      if (collectionName && collectionName.includes(normalizedTitle) && itemArtist.includes(normalizedArtist)) {
        const preview = typeof item.previewUrl === 'string' ? item.previewUrl : '';
        setCached(previewCache, cacheKey, preview);
        return preview;
      }
    }

    const first = results.find((item: { previewUrl?: unknown }) => typeof item.previewUrl === 'string');
    const preview = first?.previewUrl || '';
    setCached(previewCache, cacheKey, preview);
    return preview;
  } catch (error) {
    setCached(previewCache, cacheKey, '');
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
