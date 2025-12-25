import { describe, expect, it, vi } from 'vitest';

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () =>
                JSON.stringify([
                  {
                    title: 'Kind of Blue',
                    artist: 'Miles Davis',
                    artistBio: 'Short bio.',
                    summary: 'Short summary.',
                    releaseYear: 1959,
                    genres: ['Jazz'],
                    personnel: [{ name: 'Miles Davis', role: 'Trumpet' }],
                  },
                ]),
            },
          }),
        };
      }
    },
  };
});

vi.mock('@/lib/albumLookup', () => {
  return {
    albumSeedKey: (title: string, artist: string) => `${title}|${artist}`,
    dedupeAlbumSeeds: (seeds: Array<{ title: string; artist: string }>) => seeds,
    findCoverUrlByTitleArtist: async () => 'https://example.com/cover.jpg',
    findPreviewUrlByTitleArtist: async () => 'https://example.com/preview.mp3',
    findReleaseByTitleArtist: async () => ({ collectionViewUrl: 'https://music.apple.com/album/1' }),
  };
});

describe('/api/album-details', () => {
  it('returns enriched album details', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    const { POST } = await import('@/app/api/album-details/route');
    const request = new Request('http://localhost/api/album-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albums: [{ title: 'Kind of Blue', artist: 'Miles Davis' }] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(1);
    expect(json[0].title).toBe('Kind of Blue');
    expect(json[0].coverUrl).toBe('https://example.com/cover.jpg');
    expect(json[0].appleMusicUrl).toContain('music.apple.com');
  });
});
