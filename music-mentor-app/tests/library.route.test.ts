import { describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn(async () => ({ error: null }));
const deleteMock = vi.fn(async () => ({ error: null }));

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  id: '1',
                  title: 'Kind of Blue',
                  artist_id: 'a1',
                  artist_name: 'Miles Davis',
                  cover_url: 'https://example.com/cover.jpg',
                  preview_url: null,
                  apple_music_url: null,
                  rating: 5,
                  listened: true,
                  skipped: false,
                  date_added: '2020-01-01',
                },
              ],
              error: null,
            }),
          }),
        }),
        upsert: upsertMock,
        delete: () => ({
          eq: () => ({
            eq: deleteMock,
          }),
        }),
      }),
    },
  };
});

describe('/api/library', () => {
  it('returns minimal album fields', async () => {
    const { GET } = await import('@/app/api/library/route');
    const request = new Request('http://localhost/api/library', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const json = await response.json();
    expect(json).toHaveLength(1);
    expect(json[0].summary).toBe('');
  });

  it('writes library albums', async () => {
    const { POST } = await import('@/app/api/library/route');
    const request = new Request('http://localhost/api/library', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        album: {
          id: '1',
          title: 'Kind of Blue',
          artist: { id: 'a1', name: 'Miles Davis' },
          coverUrl: '',
          summary: '',
          listened: true,
        },
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalled();
  });
});
