import { supabaseServer } from '@/lib/supabaseServer';
import { Album } from '@/lib/types';

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const albumKey = (title: string, artistName: string) =>
  `${normalizeText(title)}|${normalizeText(artistName)}`;

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
    .from('library_albums')
    .select('id, title, artist_id, artist_name, cover_url, preview_url, apple_music_url, rating, listened, skipped, date_added')
    .eq('user_id', userId)
    .order('date_added', { ascending: false });

  if (error) {
    console.error('Library fetch error:', error);
    return Response.json({ error: 'Failed to load library' }, { status: 500 });
  }

  const albums: Album[] = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    artist: {
      id: row.artist_id,
      name: row.artist_name,
    },
    coverUrl: row.cover_url || '',
    previewUrl: row.preview_url || undefined,
    appleMusicUrl: row.apple_music_url || undefined,
    summary: '',
    rating: row.rating ?? undefined,
    listened: row.listened ?? true,
    dateAdded: row.date_added || undefined,
    skipped: row.skipped ?? false,
    personnel: undefined,
    releaseYear: undefined,
    genres: undefined,
  }));

  return Response.json(albums);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const album: Album | undefined = body.album;
    const userId = await getUserId(request);

    if (!userId || !album) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = {
      user_id: userId,
      id: album.id,
      album_key: albumKey(album.title, album.artist.name),
      title: album.title,
      artist_id: album.artist.id,
      artist_name: album.artist.name,
      cover_url: album.coverUrl || null,
      preview_url: album.previewUrl || null,
      apple_music_url: album.appleMusicUrl || null,
      rating: album.rating ?? null,
      listened: album.listened ?? true,
      skipped: album.skipped ?? false,
      date_added: album.dateAdded || new Date().toISOString(),
      artist_bio: null,
      summary: null,
      personnel: null,
      release_year: null,
      genres: null,
    };

    const { error } = await supabaseServer
      .from('library_albums')
      .upsert(payload, { onConflict: 'user_id,album_key' });

    if (error) {
      console.error('Library upsert error:', error);
      return Response.json({ error: 'Failed to save album' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Library save error:', error);
    return Response.json({ error: 'Failed to save album' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const albumId = url.searchParams.get('albumId')?.trim();
  const userId = await getUserId(request);

  if (!userId || !albumId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseServer
    .from('library_albums')
    .delete()
    .eq('user_id', userId)
    .eq('id', albumId);

  if (error) {
    console.error('Library delete error:', error);
    return Response.json({ error: 'Failed to delete album' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
