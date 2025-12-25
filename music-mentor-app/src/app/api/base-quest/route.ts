import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function GET(request: Request) {
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

    const { data, error } = await supabaseServer
      .from('user_prompt_history')
      .select('prompt')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Base quest fetch error:', error);
      return Response.json({ error: 'Failed to load prompt history' }, { status: 500 });
    }

    const prompts = (data || [])
      .map((row: any) => row?.prompt)
      .filter((value: string | null) => typeof value === 'string' && value.trim());

    if (prompts.length === 0) {
      return Response.json({ summary: '' });
    }

    const summaryPrompt = `You are a music mentor. Summarize the user's overall listening quest from their past prompts in 1-2 sentences.

Prompts:
${prompts.map((value) => `- ${value}`).join('\n')}

Return ONLY a valid JSON object in this exact format:
{
  "summary": "..."
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(summaryPrompt);
    let content = result.response.text().trim();

    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '').replace(/\n?```/g, '');
    }
    content = content.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(content);
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';

    return Response.json({ summary });
  } catch (error) {
    console.error('Base quest error:', error);
    return Response.json({ error: 'Failed to build base quest summary' }, { status: 500 });
  }
}
