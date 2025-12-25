import { supabaseServer } from '@/lib/supabaseServer';
import { Album } from '@/lib/types';

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
    .from('user_recommendations')
    .select('recommendations')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Recommendations fetch error:', error);
    return Response.json({ error: 'Failed to load recommendations' }, { status: 500 });
  }

  const stored = Array.isArray(data?.recommendations) ? data.recommendations : null;
  return Response.json({ recommendations: stored });
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const recommendations: Album[] | null = Array.isArray(body.recommendations)
      ? body.recommendations.slice(0, 10)
      : null;

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseServer
      .from('user_recommendations')
      .upsert(
        {
          user_id: userId,
          recommendations,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Recommendations save error:', error);
      return Response.json({ error: 'Failed to save recommendations' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Recommendations save error:', error);
    return Response.json({ error: 'Failed to save recommendations' }, { status: 500 });
  }
}
