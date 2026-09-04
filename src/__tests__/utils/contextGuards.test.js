import {describe, expect, it} from 'vitest';
import {
  deriveConfigId,
  isMethodSelectionValid,
  methodExists
} from '@/utils/contextGuards.js';

describe('contextGuards', () => {
  describe('isMethodSelectionValid', () => {
    it('should return false for null selection', () => {
      expect(isMethodSelectionValid(null, 'workspace')).toBe(false);
    });

    it('should return false for undefined selection', () => {
      expect(isMethodSelectionValid(undefined, 'workspace')).toBe(false);
    });

    it('should return false if method is missing', () => {
      const selection = {config: {id: 1}};
      expect(isMethodSelectionValid(selection, 'workspace')).toBe(false);
    });

    it('should return true for valid selection without workspace', () => {
      const selection = {method: {id: 1}};
      expect(isMethodSelectionValid(selection, 'workspace')).toBe(true);
    });

    it('should return true for valid selection with matching workspace', () => {
      const selection = {method: {id: 1}, _workspace: 'workspace'};
      expect(isMethodSelectionValid(selection, 'workspace')).toBe(true);
    });

    it('should return false for mismatched workspace', () => {
      const selection = {method: {id: 1}, _workspace: 'other'};
      expect(isMethodSelectionValid(selection, 'workspace')).toBe(false);
    });

    it('should handle empty objects', () => {
      expect(isMethodSelectionValid({}, 'workspace')).toBe(false);
    });
  });

  describe('methodExists', () => {
    const methodTree = [
      {id: 1, name: 'Method 1'},
      {id: 2, name: 'Method 2'},
      {id: 3, name: 'Method 3'}
    ];

    it('should return true if method exists', () => {
      expect(methodExists(methodTree, 1)).toBe(true);
      expect(methodExists(methodTree, 2)).toBe(true);
      expect(methodExists(methodTree, 3)).toBe(true);
    });

    it('should return false if method does not exist', () => {
      expect(methodExists(methodTree, 999)).toBe(false);
    });

    it('should return false for null tree', () => {
      expect(methodExists(null, 1)).toBe(false);
    });

    it('should return false for undefined tree', () => {
      expect(methodExists(undefined, 1)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(methodExists([], 1)).toBe(false);
    });

    it('should return false for non-array tree', () => {
      expect(methodExists('not an array', 1)).toBe(false);
    });

    it('should handle string IDs', () => {
      const treeWithStringIds = [
        {id: 'method1'},
        {id: 'method2'}
      ];
      expect(methodExists(treeWithStringIds, 'method1')).toBe(true);
      expect(methodExists(treeWithStringIds, 'method3')).toBe(false);
    });
  });

  describe('deriveConfigId', () => {
    const methodTree = [
      {
        id: 1,
        name: 'Method 1',
        children: [
          {id: 101, name: 'Config 1-1'},
          {id: 102, name: 'Config 1-2'}
        ]
      },
      {
        id: 2,
        name: 'Method 2',
        children: [
          {id: 201, name: 'Config 2-1'}
        ]
      }
    ];

    it('should return config id if present in selection', () => {
      const selection = {
        method: {id: 1},
        config: {id: 101}
      };
      expect(deriveConfigId(selection, methodTree)).toBe(101);
    });

    it('should return first config id if config not in selection', () => {
      const selection = {
        method: {id: 1}
      };
      expect(deriveConfigId(selection, methodTree)).toBe(101);
    });

    it('should return null if method not in selection', () => {
      const selection = {};
      expect(deriveConfigId(selection, methodTree)).toBeNull();
    });

    it('should return null if selection is null', () => {
      expect(deriveConfigId(null, methodTree)).toBeNull();
    });

    it('should return null if method not found in tree', () => {
      const selection = {method: {id: 999}};
      expect(deriveConfigId(selection, methodTree)).toBeNull();
    });

    it('should return null if method has no children', () => {
      const treeWithoutChildren = [{id: 1, name: 'Method 1'}];
      const selection = {method: {id: 1}};
      expect(deriveConfigId(selection, treeWithoutChildren)).toBeNull();
    });

    it('should return null if method has empty children', () => {
      const treeWithEmptyChildren = [{id: 1, children: []}];
      const selection = {method: {id: 1}};
      expect(deriveConfigId(selection, treeWithEmptyChildren)).toBeNull();
    });
  });
});
