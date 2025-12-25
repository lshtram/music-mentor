import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
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
              text: () => JSON.stringify({ prompt: 'Explore nocturnal jazz textures.' }),
            },
          }),
        };
      }
    },
  };
});

describe('/api/prompt-randomize', () => {
  it('returns a new prompt', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    const { POST } = await import('@/app/api/prompt-randomize/route');
    const request = new Request('http://localhost/api/prompt-randomize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'Old prompt', libraryAlbums: [] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.prompt.toLowerCase()).toContain('how about albums like');
  });
});
