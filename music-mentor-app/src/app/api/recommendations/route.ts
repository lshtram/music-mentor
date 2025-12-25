import { GoogleGenerativeAI } from '@google/generative-ai';
import { Album, AlbumSeed } from '@/lib/types';
import { albumSeedKey, dedupeAlbumSeeds, findReleaseByTitleArtist } from '@/lib/albumLookup';
import { supabaseServer } from '@/lib/supabaseServer';

interface RecommendationRequest {
  prompt: string;
  libraryAlbums: Album[];
  excludeAlbums?: AlbumSeed[];
  replaceAll?: boolean;
  desiredCount?: number;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const getUserId = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
};

export async function POST(request: Request) {
  try {
    const body: RecommendationRequest = await request.json();
    const { prompt, libraryAlbums, excludeAlbums = [], desiredCount } = body;
    const targetCount = Math.min(10, Math.max(3, Number(desiredCount) || 5));
    const userId = await getUserId(request);

    if (!prompt || prompt.trim().length === 0) {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const libraryContext = libraryAlbums.length > 0
      ? `User's listening library (${libraryAlbums.length} albums):\n${libraryAlbums
          .slice(0, 20)
          .map(
            (album) =>
              `- "${album.title}" by ${album.artist.name}${
                album.rating ? ` (rated ${album.rating}/5)` : ''
              }`
          )
          .join('\n')}`
      : 'User has no listening history yet (first recommendations)';

    const excludedAlbumList = excludeAlbums.length > 0
      ? `\nAvoid these albums already seen or rejected:\n${excludeAlbums
          .map((album) => `- "${album.title}" by ${album.artist}`)
          .join('\n')}`
      : '';

    const buildPrompt = (extraAvoid: AlbumSeed[]) => {
      const extraAvoidList = extraAvoid.length > 0
        ? `\nAdditional exclusions:\n${extraAvoid
            .map((album) => `- "${album.title}" by ${album.artist}`)
            .join('\n')}`
        : '';

      return `You are an expert music curator. Recommend exactly ${targetCount} NEW, UNIQUE albums based on the user's request and listening history. These must be different from what they've already heard.

${libraryContext}
${excludedAlbumList}${extraAvoidList}

User's request: "${prompt}"

Return ONLY a valid JSON array with exactly ${targetCount} items. Each item MUST have this structure:
{
  "title": "Album Title",
  "artist": "Artist Name"
}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON array, no markdown, no explanations
- Exactly ${targetCount} albums that ACTUALLY EXIST (real releases)
- Each album must be NEW (not in the user's library or exclusion list)
- Each album must be UNIQUE (no duplicates)
- Use the EXACT album title as it appears on the release
- Do not include any IDs, URLs, summaries, or extra fields`;
    };

    const parseAlbumSeeds = (content: string): AlbumSeed[] => {
      let cleaned = content.trim();
      if (cleaned.includes('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.replace(/```\n?/g, '').replace(/\n?```/g, '');
      }
      cleaned = cleaned.replace(/(['"])([^'"]*?)\1\s*:/g, '"$2":');
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array');
      }
      return parsed
        .map((item: any) => ({
          title: typeof item?.title === 'string' ? item.title.trim() : '',
          artist: typeof item?.artist === 'string' ? item.artist.trim() : '',
        }))
        .filter(item => item.title && item.artist);
    };

    const excludedKeys = new Set<string>(
      excludeAlbums.map(album => albumSeedKey(album.title, album.artist))
    );
    const seenKeys = new Set<string>();

    if (userId) {
      const [seenRes, libraryRes] = await Promise.all([
        supabaseServer
          .from('user_seen_recommendations')
          .select('album_key')
          .eq('user_id', userId),
        supabaseServer
          .from('library_albums')
          .select('album_key')
          .eq('user_id', userId),
      ]);

      if (!seenRes.error && Array.isArray(seenRes.data)) {
        seenRes.data.forEach((row: any) => {
          if (row?.album_key) seenKeys.add(row.album_key);
        });
      }
      if (!libraryRes.error && Array.isArray(libraryRes.data)) {
        libraryRes.data.forEach((row: any) => {
          if (row?.album_key) seenKeys.add(row.album_key);
        });
      }
    }

    seenKeys.forEach((key) => excludedKeys.add(key));

    const verified: AlbumSeed[] = [];
    const rejected: AlbumSeed[] = [];
    const REC_DEBUG = process.env.REC_DEBUG === '1';

    const normalizeText = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const searchItunesByPrompt = async (query: string) => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=12`;
      const response = await fetch(url);
      if (!response.ok) return [] as AlbumSeed[];
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results
        .map((item: any) => ({
          title: typeof item.collectionName === 'string' ? item.collectionName.trim() : '',
          artist: typeof item.artistName === 'string' ? item.artistName.trim() : '',
        }))
        .filter((item: AlbumSeed) => item.title && item.artist);
    };

    for (let attempt = 0; attempt < 3 && verified.length < targetCount; attempt++) {
      const extraAvoid = [...rejected, ...verified];
      const result = await model.generateContent(buildPrompt(extraAvoid));
      let content = result.response.text();

      let candidates: AlbumSeed[];
      try {
        candidates = parseAlbumSeeds(content);
      } catch (error) {
        console.error('JSON parse error:', error);
        console.error('Content:', content.substring(0, 500));
        throw new Error(`Invalid JSON from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      candidates = dedupeAlbumSeeds(candidates).filter(candidate => {
        const key = albumSeedKey(candidate.title, candidate.artist);
        return key && !excludedKeys.has(key);
      });
      if (REC_DEBUG) {
        console.info('[rec] candidates', { attempt: attempt + 1, count: candidates.length, candidates });
      }

      for (const candidate of candidates) {
        if (verified.length >= targetCount) break;
        const key = albumSeedKey(candidate.title, candidate.artist);
        if (!key || excludedKeys.has(key)) continue;

        const release = await findReleaseByTitleArtist(candidate.title, candidate.artist);
        const isReal = release !== null;
        if (REC_DEBUG) {
          console.info('[rec] verify result', {
            title: candidate.title,
            artist: candidate.artist,
            isReal,
          });
        }
        if (isReal) {
          const normalizedSeed = {
            title: release?.title || candidate.title,
            artist: release?.artist || candidate.artist,
          };
          const normalizedKey = albumSeedKey(normalizedSeed.title, normalizedSeed.artist);
          if (normalizedKey && !excludedKeys.has(normalizedKey)) {
            verified.push(normalizedSeed);
            excludedKeys.add(normalizedKey);
          }
        } else {
          rejected.push(candidate);
        }
      }
    }

    if (verified.length < 5) {
      const fallbackSeeds = await searchItunesByPrompt(prompt);
      for (const seed of fallbackSeeds) {
        if (verified.length >= targetCount) break;
        const key = albumSeedKey(seed.title, seed.artist);
        if (!key || excludedKeys.has(key)) continue;
        verified.push(seed);
        excludedKeys.add(key);
      }
    }

    if (verified.length === 0) {
      throw new Error('Unable to verify any real albums for recommendations');
    }

    if (userId) {
      const rows = verified.map((album) => ({
        user_id: userId,
        album_key: albumSeedKey(album.title, album.artist),
      }));
      await supabaseServer
        .from('user_seen_recommendations')
        .upsert(rows, { onConflict: 'user_id,album_key' });
    }

    return Response.json(verified.slice(0, targetCount));
  } catch (error) {
    console.error('Recommendation API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations';
    return Response.json({ error: message }, { status: 500 });
  }
}
