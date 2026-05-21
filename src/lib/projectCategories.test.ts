import { describe, it, expect } from 'vitest';
import { getSubCategories, PROJECT_CATEGORIES } from './projectCategories';

describe('projectCategories', () => {
  describe('getSubCategories', () => {
    it('returns sub-categories for a known project type', () => {
      const type = 'Technical';
      const expected = PROJECT_CATEGORIES[type];
      expect(getSubCategories(type)).toEqual(expected);
      expect(getSubCategories(type).length).toBeGreaterThan(0);
    });

    it('returns an empty array for an unknown project type', () => {
      expect(getSubCategories('UnknownType123')).toEqual([]);
    });

    it('returns an empty array when empty string is provided', () => {
      expect(getSubCategories('')).toEqual([]);
    });
  });
});
