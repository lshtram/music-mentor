import { describe, expect, it } from 'vitest';
import { paginate } from '@/lib/pagination';

describe('paginate', () => {
  it('returns correct page slice and total pages', () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);
    const result = paginate(items, 2, 20);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe(21);
    expect(result.totalPages).toBe(3);
  });
});
