import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  { prompt: 'Explore early ambient music and repetition.' },
                  { prompt: 'Find late-night jazz albums with saxophone.' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    },
  };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => JSON.stringify({ summary: 'A journey through ambient minimalism and nocturnal jazz.' }),
            },
          }),
        };
      }
    },
  };
});

describe('/api/base-quest', () => {
  it('returns a summarized base quest', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    const { GET } = await import('@/app/api/base-quest/route');
    const request = new Request('http://localhost/api/base-quest', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.summary).toContain('ambient');
  });
});
