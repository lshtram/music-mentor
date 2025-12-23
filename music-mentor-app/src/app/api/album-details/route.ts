import { GoogleGenerativeAI } from '@google/generative-ai';
import { Album, AlbumSeed } from '@/lib/types';
import { albumSeedKey, dedupeAlbumSeeds, findCoverUrlByTitleArtist, findPreviewUrlByTitleArtist, findReleaseByTitleArtist } from '@/lib/albumLookup';

interface AlbumDetailsRequest {
  albums: AlbumSeed[];
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const cleanText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const normalizePersonnel = (personnel: any) => {
  if (!Array.isArray(personnel)) return [];
  return personnel
    .map((member) => ({
      name: cleanText(member?.name),
      role: cleanText(member?.role),
    }))
    .filter((member) => member.name && member.role);
};

export async function POST(request: Request) {
  try {
    const body: AlbumDetailsRequest = await request.json();
    const incoming = Array.isArray(body.albums) ? body.albums : [];
    const seeds = dedupeAlbumSeeds(
      incoming.map(seed => ({
        title: cleanText(seed?.title),
        artist: cleanText(seed?.artist),
      })).filter(seed => seed.title && seed.artist)
    );

    if (seeds.length === 0) {
      return Response.json({ error: 'Album list is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const albumsList = seeds
      .map((album) => `- "${album.title}" by ${album.artist}`)
      .join('\n');

    const promptText = `You are a music historian and critic. Generate album details for the albums listed below.

Albums:
${albumsList}

Return ONLY a valid JSON array. Each item must have this exact structure:
{
  "title": "Album Title",
  "artist": "Artist Name",
  "artistBio": "3-4 sentence bio",
  "summary": "2-3 sentence album summary",
  "releaseYear": 2020,
  "genres": ["Genre 1", "Genre 2"],
  "personnel": [
    {
      "name": "Person Name",
      "role": "Instrument/Role"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Use the exact album titles and artist names provided
- Return only JSON, no markdown or commentary
- Do not include any IDs or extra fields`;

    const result = await model.generateContent(promptText);
    let content = result.response.text().trim();

    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '').replace(/\n?```/g, '');
    }

    content = content.replace(/(['"])([^'"]*?)\1\s*:/g, '"$2":');
    content = content.replace(/,\s*([}\]])/g, '$1');

    let parsed: any[] = [];
    try {
      const json = JSON.parse(content);
      if (Array.isArray(json)) {
        parsed = json;
      }
    } catch (error) {
      console.error('Album details JSON parse error:', error);
      console.error('Content:', content.substring(0, 500));
    }

    const detailsMap = new Map<string, any>();
    parsed.forEach((item) => {
      const title = cleanText(item?.title);
      const artist = cleanText(item?.artist);
      if (!title || !artist) return;
      detailsMap.set(albumSeedKey(title, artist), item);
    });

    const albums: Album[] = [];

    for (const seed of seeds) {
      const key = albumSeedKey(seed.title, seed.artist);
      const detail = detailsMap.get(key) || {};
      const artistSlug = slugify(seed.artist) || Math.random().toString(36).slice(2, 8);
      const albumSlug = slugify(`${seed.artist}-${seed.title}`) || Math.random().toString(36).slice(2, 8);
      const albumId = `album-${albumSlug}`;
      const artistId = `artist-${artistSlug}`;

      const coverUrl = await findCoverUrlByTitleArtist(seed.title, seed.artist);
      const previewUrl = await findPreviewUrlByTitleArtist(seed.title, seed.artist);
      const releaseMatch = await findReleaseByTitleArtist(seed.title, seed.artist);

      const releaseYear = typeof detail?.releaseYear === 'number'
        ? detail.releaseYear
        : undefined;

      const genres = Array.isArray(detail?.genres)
        ? detail.genres.map((genre: any) => cleanText(genre)).filter(Boolean)
        : undefined;

      const personnel = normalizePersonnel(detail?.personnel);

      albums.push({
        id: albumId,
        title: seed.title,
        artist: {
          id: artistId,
          name: seed.artist,
          bio: cleanText(detail?.artistBio),
        },
        coverUrl: coverUrl || '',
        previewUrl: previewUrl || undefined,
        appleMusicUrl: releaseMatch?.collectionViewUrl || undefined,
        summary: cleanText(detail?.summary) || 'Summary not available yet.',
        releaseYear,
        genres: genres && genres.length > 0 ? genres : undefined,
        personnel: personnel.length > 0 ? personnel : undefined,
        listened: false,
      });
    }

    return Response.json(albums);
  } catch (error) {
    console.error('Album details API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build album details';
    return Response.json({ error: message }, { status: 500 });
  }
}
