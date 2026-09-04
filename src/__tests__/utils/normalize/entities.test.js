/**
 * @fileoverview Tests for the entities response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {normalizeEntitiesResponse, normalizeRelevantEntityIds} from '@/utils/normalize/entities.js';

describe('normalize/entities', () => {
  describe('normalizeEntitiesResponse', () => {
    it('should return array as-is if response is array', () => {
      const input = [{id: 1, name: 'Station A'}, {id: 2, name: 'Station B'}];
      expect(normalizeEntitiesResponse(input)).toEqual(input);
    });

    it('should extract entities property from object', () => {
      const input = {
        entities: [{id: 1, name: 'Station A'}]
      };
      expect(normalizeEntitiesResponse(input)).toEqual(input.entities);
    });

    it('should return empty array for null', () => {
      expect(normalizeEntitiesResponse(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(normalizeEntitiesResponse(undefined)).toEqual([]);
    });

    it('should return empty array for object without entities', () => {
      expect(normalizeEntitiesResponse({other: 'data'})).toEqual([]);
    });

    it('should return empty array for non-array entities property', () => {
      expect(normalizeEntitiesResponse({entities: 'not array'})).toEqual([]);
    });
  });

  describe('normalizeRelevantEntityIds', () => {
    it('should extract entity_ids from object', () => {
      const input = {entity_ids: [1, 2, 3]};
      const result = normalizeRelevantEntityIds(input);
      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract entities_ids (alternate spelling)', () => {
      const input = {entities_ids: [1, 2, 3]};
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract ids property', () => {
      const input = {ids: [1, 2, 3]};
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract from entities array', () => {
      const input = {entities: [{id: 1}, {id: 2}]};
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2]);
    });

    it('should handle array of objects with id', () => {
      const input = [{id: 1}, {entity_id: 2}, {id: 3}];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result).sort()).toEqual([1, 2, 3]);
    });

    it('should handle array of primitives', () => {
      const input = [1, 2, 3];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should filter out null/undefined ids', () => {
      const input = [{id: 1}, {id: null}, {entity_id: 2}, {}];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result).sort()).toEqual([1, 2]);
    });

    it('should return empty Set for null', () => {
      const result = normalizeRelevantEntityIds(null);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });
});
