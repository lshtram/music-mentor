import { supabaseServer } from '@/lib/supabaseServer';

const getUserId = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
};

export async function GET(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('user_prompts')
    .select('prompt')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Prompt fetch error:', error);
    return Response.json({ error: 'Failed to load prompt' }, { status: 500 });
  }

  return Response.json({ prompt: data?.prompt || null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseServer
      .from('user_prompts')
      .upsert(
        { user_id: userId, prompt },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Prompt save error:', error);
      return Response.json({ error: 'Failed to save prompt' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Prompt save error:', error);
    return Response.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}
