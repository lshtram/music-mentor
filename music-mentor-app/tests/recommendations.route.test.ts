import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseServer', () => {
  return {
    supabaseServer: {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ data: [], error: null }),
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
              text: () =>
                JSON.stringify([
                  { title: 'Fire Music', artist: 'Archie Shepp' },
                  { title: 'The Magic City', artist: 'Sun Ra' },
                  { title: 'Space Is the Place', artist: 'Sun Ra' },
                ]),
            },
          }),
        };
      }
    },
  };
});

describe('/api/recommendations', () => {
  it('returns normalized verified releases', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('itunes.apple.com/search')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                collectionName: 'Fire Music',
                artistName: 'Archie Shepp',
                collectionId: 1,
                artworkUrl100: 'https://example.com/100.jpg',
                collectionViewUrl: 'https://music.apple.com/album/1',
              },
              {
                collectionName: 'The Magic City (Remastered 2017)',
                artistName: 'Sun Ra',
                collectionId: 2,
                artworkUrl100: 'https://example.com/100.jpg',
                collectionViewUrl: 'https://music.apple.com/album/2',
              },
              {
                collectionName: 'Space Is the Place',
                artistName: 'Sun Ra',
                collectionId: 3,
                artworkUrl100: 'https://example.com/100.jpg',
                collectionViewUrl: 'https://music.apple.com/album/3',
              },
            ],
          })
        );
      }
      return new Response(JSON.stringify({}));
    });

    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/recommendations/route');

    const request = new Request('http://localhost/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Spiritual jazz and cosmic themes',
        libraryAlbums: [],
        excludeAlbums: [],
        desiredCount: 3,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(3);
    expect(json[1].title).toContain('The Magic City');
    expect(json[1].artist).toBe('Sun Ra');
  });
});
