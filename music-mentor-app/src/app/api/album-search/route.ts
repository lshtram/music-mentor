export const dynamic = 'force-dynamic';

import { albumSeedKey } from '@/lib/albumLookup';

interface AlbumSearchResult {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl?: string;
}

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() || '';

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=6`;
    const response = await fetch(itunesUrl);
    if (!response.ok) {
      return Response.json({ error: 'Search failed' }, { status: 502 });
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const seen = new Set<string>();

    const albums: AlbumSearchResult[] = results
      .map((item: any) => {
        const title = typeof item.collectionName === 'string' ? item.collectionName.trim() : '';
        const artist = typeof item.artistName === 'string' ? item.artistName.trim() : '';
        const coverUrl = typeof item.artworkUrl600 === 'string'
          ? item.artworkUrl600
          : typeof item.artworkUrl100 === 'string'
            ? item.artworkUrl100.replace(/\/[0-9]+x[0-9]+bb\.(jpg|png)$/i, `/600x600bb.$1`)
            : '';
        const previewUrl = typeof item.previewUrl === 'string' ? item.previewUrl : undefined;
        return { title, artist, coverUrl, previewUrl };
      })
      .filter((item: AlbumSearchResult) => item.title && item.artist)
      .filter((item: AlbumSearchResult) => {
        const key = albumSeedKey(item.title, item.artist);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a: AlbumSearchResult, b: AlbumSearchResult) => {
        const aScore = normalizeText(`${a.title} ${a.artist}`).includes(normalizeText(query)) ? 1 : 0;
        const bScore = normalizeText(`${b.title} ${b.artist}`).includes(normalizeText(query)) ? 1 : 0;
        return bScore - aScore;
      });

    return Response.json(albums);
  } catch (error) {
    console.error('Album search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
