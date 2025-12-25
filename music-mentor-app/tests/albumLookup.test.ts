import { describe, expect, it } from 'vitest';
import { albumSeedKey, dedupeAlbumSeeds } from '@/lib/albumLookup';

describe('albumLookup', () => {
  it('builds normalized album keys', () => {
    expect(albumSeedKey('Kind of Blue', 'Miles Davis')).toBe('kind of blue|miles davis');
    expect(albumSeedKey('  Kind  of  Blue  ', 'MILES DAVIS')).toBe('kind of blue|miles davis');
  });

  it('dedupes album seeds by title/artist', () => {
    const seeds = dedupeAlbumSeeds([
      { title: 'Kind of Blue', artist: 'Miles Davis' },
      { title: 'Kind of Blue', artist: 'Miles Davis' },
      { title: 'In a Silent Way', artist: 'Miles Davis' },
    ]);
    expect(seeds).toHaveLength(2);
  });
});
