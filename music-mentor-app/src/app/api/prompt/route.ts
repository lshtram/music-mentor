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
    .select('prompt, last_user_prompt')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Prompt fetch error:', error);
    return Response.json({ error: 'Failed to load prompt' }, { status: 500 });
  }

  return Response.json({
    prompt: data?.prompt || null,
    lastUserPrompt: data?.last_user_prompt || null,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const source = typeof body.source === 'string' ? body.source : 'auto';
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: {
      user_id: string;
      prompt: string;
      last_user_prompt?: string;
    } = { user_id: userId, prompt };

    if (source === 'user' && prompt) {
      payload.last_user_prompt = prompt;
    }

    const { error } = await supabaseServer
      .from('user_prompts')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('Prompt save error:', error);
      return Response.json({ error: 'Failed to save prompt' }, { status: 500 });
    }

    if (prompt) {
      const { data: lastEntry, error: historyError } = await supabaseServer
        .from('user_prompt_history')
        .select('prompt')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historyError) {
        console.error('Prompt history fetch error:', historyError);
      } else if (!lastEntry || lastEntry.prompt !== prompt) {
        const { error: insertError } = await supabaseServer
          .from('user_prompt_history')
          .insert({ user_id: userId, prompt, source });

        if (insertError) {
          console.error('Prompt history insert error:', insertError);
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Prompt save error:', error);
    return Response.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}
