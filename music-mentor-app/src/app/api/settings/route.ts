import { supabaseServer } from '@/lib/supabaseServer';

const getUserId = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
};

const clampRecommendationCount = (value: number) => {
  if (Number.isNaN(value)) return 5;
  return Math.min(10, Math.max(3, Math.round(value)));
};

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('user_settings')
    .select('recommendations_count, preferred_music_app')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Settings fetch error:', error);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }

  return Response.json({
    recommendationsCount: data?.recommendations_count ?? 5,
    preferredMusicApp: data?.preferred_music_app ?? 'apple',
  });
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const recommendationsCount = clampRecommendationCount(Number(body?.recommendationsCount ?? 5));
    const preferredMusicApp =
      typeof body?.preferredMusicApp === 'string' ? body.preferredMusicApp : 'apple';

    const { error } = await supabaseServer
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          recommendations_count: recommendationsCount,
          preferred_music_app: preferredMusicApp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Settings save error:', error);
      return Response.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return Response.json({
      ok: true,
      recommendationsCount,
      preferredMusicApp,
    });
  } catch (error) {
    console.error('Settings save error:', error);
    return Response.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
