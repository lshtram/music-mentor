import { GoogleGenerativeAI } from '@google/generative-ai';
import { Album } from '@/lib/types';
import { supabaseServer } from '@/lib/supabaseServer';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const getUserId = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
};

const buildLibrarySummary = (libraryAlbums: Album[]) => {
  if (!libraryAlbums.length) {
    return 'User has no listening history yet.';
  }
  return libraryAlbums
    .slice(0, 20)
    .map(
      (album) =>
        `- "${album.title}" by ${album.artist.name}${
          album.rating ? ` (rated ${album.rating}/5)` : ''
        }`
    )
    .join('\n');
};

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const currentPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const libraryAlbums = Array.isArray(body?.libraryAlbums) ? body.libraryAlbums : [];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const libraryContext = buildLibrarySummary(libraryAlbums);

    const prompt = `You are a thoughtful music mentor. Create ONE new listening prompt that feels adjacent to the user's taste but opens it up slightly. Keep it concise, human, and specific.

Current prompt: "${currentPrompt || 'No prompt yet'}"
Library highlights:
${libraryContext}

Return ONLY a valid JSON object in this exact format:
{
  "prompt": "..."
}

Rules:
- One sentence max.
- Avoid repeating the current prompt verbatim.
- Do not mention specific albums or artists.
- The sentence must start with "How about albums like".
- Be specific about the angle (era, region, instrument, production style, or mood).
- No markdown or extra text.`;

    const result = await model.generateContent(prompt);
    let content = result.response.text().trim();

    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '').replace(/\n?```/g, '');
    }
    content = content.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(content);
    let nextPrompt =
      typeof parsed?.prompt === 'string' ? parsed.prompt.trim() : '';
    if (nextPrompt && !nextPrompt.toLowerCase().startsWith('how about albums like')) {
      nextPrompt = `How about albums like ${nextPrompt.replace(/^[^a-z0-9]+/i, '')}`;
    }

    if (!nextPrompt) {
      return Response.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

    return Response.json({ prompt: nextPrompt });
  } catch (error) {
    console.error('Prompt randomize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate prompt';
    return Response.json({ error: message }, { status: 500 });
  }
}
