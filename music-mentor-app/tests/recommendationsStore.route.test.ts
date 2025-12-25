import { describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn(async () => ({ error: null }));

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { recommendations: Array.from({ length: 8 }, (_, i) => ({ id: `${i}` })) },
              error: null,
            }),
          }),
        }),
        upsert: upsertMock,
      }),
    },
  };
});

describe('/api/recommendations-store', () => {
  it('returns stored recommendations', async () => {
    const { GET } = await import('@/app/api/recommendations-store/route');
    const request = new Request('http://localhost/api/recommendations-store', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const json = await response.json();
    expect(json.recommendations).toHaveLength(8);
  });

  it('stores recommendations payload', async () => {
    const { POST } = await import('@/app/api/recommendations-store/route');
    const request = new Request('http://localhost/api/recommendations-store', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recommendations: Array.from({ length: 12 }, (_, i) => ({ id: `${i}` })) }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalled();
  });
});
