import { describe, it, expect } from 'vitest';
import { getSubCategories, PROJECT_CATEGORIES, PROJECT_TYPES } from './projectCategories';

describe('getSubCategories', () => {
  it('should return the correct sub-categories for a known project type', () => {
    // Testing an existing category using a dynamic key
    const knownCategory = PROJECT_TYPES[0];
    const result = getSubCategories(knownCategory);
    expect(result).toEqual(PROJECT_CATEGORIES[knownCategory]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an empty array for an unknown project type', () => {
    const result = getSubCategories('UnknownType');
    expect(result).toEqual([]);
  });

  it('should return an empty array for an empty string', () => {
    const result = getSubCategories('');
    expect(result).toEqual([]);
  });
});
