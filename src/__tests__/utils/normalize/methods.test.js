/**
 * @fileoverview Tests for the methods response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {normalizeMethodsAndConfigs} from '@/utils/normalize/methods.js';

describe('normalize/methods', () => {
  it('normalizeMethodsAndConfigs builds children array', () => {
    const resp = {methods: [{id: 1, name: 'A', configurations: [{id: 10, name: 'Cfg'}]}]};
    const out = normalizeMethodsAndConfigs(resp);
    expect(out[0].children[0].id).toBe(10);
  });
});
