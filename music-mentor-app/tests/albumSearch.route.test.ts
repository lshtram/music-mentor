import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn(async () => {
  return new Response(
    JSON.stringify({
      results: [
        { collectionName: 'Album A', artistName: 'Artist A', artworkUrl100: 'https://example.com/100x100bb.jpg' },
        { collectionName: 'Album A', artistName: 'Artist A', artworkUrl100: 'https://example.com/100x100bb.jpg' },
        { collectionName: 'Album B', artistName: 'Artist B', artworkUrl600: 'https://example.com/600x600bb.jpg' },
      ],
    })
  );
}));

describe('/api/album-search', () => {
  it('dedupes results and returns cover urls', async () => {
    const { GET } = await import('@/app/api/album-search/route');
    const request = new Request('http://localhost/api/album-search?q=album');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(2);
    expect(json[0].coverUrl).toContain('600x600');
  });
});
