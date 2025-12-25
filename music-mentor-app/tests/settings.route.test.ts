import { describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn(async () => ({ error: null }));
const selectMock = vi.fn(async () => ({
  data: { recommendations_count: 7, preferred_music_app: 'spotify' },
  error: null,
}));

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: selectMock,
          }),
        }),
        upsert: upsertMock,
      }),
    },
  };
});

describe('/api/settings', () => {
  it('returns settings defaults when present', async () => {
    const { GET } = await import('@/app/api/settings/route');
    const request = new Request('http://localhost/api/settings', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.recommendationsCount).toBe(7);
    expect(json.preferredMusicApp).toBe('spotify');
  });

  it('clamps recommendation count on save', async () => {
    const { POST } = await import('@/app/api/settings/route');
    const request = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recommendationsCount: 100,
        preferredMusicApp: 'apple',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.recommendationsCount).toBe(10);
    expect(upsertMock).toHaveBeenCalled();
  });
});
