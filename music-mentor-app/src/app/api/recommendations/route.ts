import { GoogleGenerativeAI } from '@google/generative-ai';
import { Album, AlbumSeed } from '@/lib/types';
import { albumSeedKey, dedupeAlbumSeeds, verifyAlbumExists } from '@/lib/albumLookup';

interface RecommendationRequest {
  prompt: string;
  libraryAlbums: Album[];
  excludeAlbums?: AlbumSeed[];
  replaceAll?: boolean;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body: RecommendationRequest = await request.json();
    const { prompt, libraryAlbums, excludeAlbums = [] } = body;

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

      return `You are an expert music curator. Recommend exactly 5 NEW, UNIQUE albums based on the user's request and listening history. These must be different from what they've already heard.

${libraryContext}
${excludedAlbumList}${extraAvoidList}

User's request: "${prompt}"

Return ONLY a valid JSON array with exactly 5 items. Each item MUST have this structure:
{
  "title": "Album Title",
  "artist": "Artist Name"
}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON array, no markdown, no explanations
- Exactly 5 albums that ACTUALLY EXIST (real releases)
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

    for (let attempt = 0; attempt < 3 && verified.length < 5; attempt++) {
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
        if (verified.length >= 5) break;
        const key = albumSeedKey(candidate.title, candidate.artist);
        if (!key || excludedKeys.has(key)) continue;

        const isReal = await verifyAlbumExists(candidate.title, candidate.artist);
        if (REC_DEBUG) {
          console.info('[rec] verify result', {
            title: candidate.title,
            artist: candidate.artist,
            isReal,
          });
        }
        if (isReal) {
          verified.push(candidate);
          excludedKeys.add(key);
        } else {
          rejected.push(candidate);
        }
      }
    }

    if (verified.length < 5) {
      const fallbackSeeds = await searchItunesByPrompt(prompt);
      for (const seed of fallbackSeeds) {
        if (verified.length >= 5) break;
        const key = albumSeedKey(seed.title, seed.artist);
        if (!key || excludedKeys.has(key)) continue;
        verified.push(seed);
        excludedKeys.add(key);
      }
    }

    if (verified.length < 5) {
      throw new Error('Unable to verify 5 real albums for recommendations');
    }

    return Response.json(verified.slice(0, 5));
  } catch (error) {
    console.error('Recommendation API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations';
    return Response.json({ error: message }, { status: 500 });
  }
}
