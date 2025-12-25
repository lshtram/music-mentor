import { describe, expect, it, vi } from 'vitest';

const historyInsert = vi.fn(async () => ({ error: null }));
const promptUpsert = vi.fn(async () => ({ error: null }));

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: (table: string) => {
        if (table === 'user_prompts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { prompt: 'Old prompt', last_user_prompt: 'Old prompt' },
                  error: null,
                }),
              }),
            }),
            upsert: promptUpsert,
          };
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: { prompt: 'Old prompt' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: historyInsert,
        };
      },
    },
  };
});

describe('/api/prompt', () => {
  it('returns prompt and last user prompt', async () => {
    const { GET } = await import('@/app/api/prompt/route');
    const request = new Request('http://localhost/api/prompt', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const json = await response.json();
    expect(json.prompt).toBe('Old prompt');
    expect(json.lastUserPrompt).toBe('Old prompt');
  });

  it('writes prompt and history when source is user', async () => {
    const { POST } = await import('@/app/api/prompt/route');
    const request = new Request('http://localhost/api/prompt', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'New prompt', source: 'user' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(promptUpsert).toHaveBeenCalled();
    expect(historyInsert).toHaveBeenCalled();
  });
});
