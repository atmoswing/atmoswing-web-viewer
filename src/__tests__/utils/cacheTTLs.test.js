import {describe, expect, it} from 'vitest';
import {DEFAULT_TTL, LONG_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';

describe('cacheTTLs', () => {
  it('should export SHORT_TTL constant', () => {
    expect(SHORT_TTL).toBeDefined();
    expect(typeof SHORT_TTL).toBe('number');
    expect(SHORT_TTL).toBe(120000); // 2 minutes
  });

  it('should export DEFAULT_TTL constant', () => {
    expect(DEFAULT_TTL).toBeDefined();
    expect(typeof DEFAULT_TTL).toBe('number');
    expect(DEFAULT_TTL).toBe(300000); // 5 minutes
  });

  it('should export LONG_TTL constant', () => {
    expect(LONG_TTL).toBeDefined();
    expect(typeof LONG_TTL).toBe('number');
    expect(LONG_TTL).toBe(900000); // 15 minutes
  });

  it('should have TTLs in ascending order', () => {
    expect(SHORT_TTL).toBeLessThan(DEFAULT_TTL);
    expect(DEFAULT_TTL).toBeLessThan(LONG_TTL);
  });

  it('should have positive TTL values', () => {
    expect(SHORT_TTL).toBeGreaterThan(0);
    expect(DEFAULT_TTL).toBeGreaterThan(0);
    expect(LONG_TTL).toBeGreaterThan(0);
  });
});

