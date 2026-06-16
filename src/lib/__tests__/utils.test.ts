import { sanitizeUrl } from "../utils";
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility function', () => {
  it('should merge basic class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle undefined, null, and false values gracefully', () => {
    expect(cn('class1', undefined, null, false, 'class2')).toBe('class1 class2');
  });

  it('should conditionally apply classes using objects', () => {
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
  });

  it('should conditionally apply classes using arrays', () => {
    expect(cn('class1', ['class2', { class3: true }])).toBe('class1 class2 class3');
  });

  it('should resolve tailwind class conflicts using tailwind-merge', () => {
    // p-3 should override p-1 and p-2 since it comes last and targets the same CSS property (padding)
    expect(cn('p-1', 'p-2', 'p-3')).toBe('p-3');
    // text-lg should override text-sm
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('should combine clsx behavior with tailwind-merge behavior', () => {
    expect(
      cn(
        'bg-red-500 p-2',
        { 'bg-blue-500': true, 'p-4': false },
        ['text-white', 'p-6']
      )
    ).toBe('bg-blue-500 text-white p-6');
  });
});

  describe('sanitizeUrl', () => {
    it('should return valid urls', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });
    it('should prepend https to schemeless urls', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com/');
    });
    it('should block javascript urls', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined();
    });
    it('should strip control characters', () => {
      expect(sanitizeUrl('\x08javascript:alert(1)')).toBeUndefined();
      expect(sanitizeUrl('java\x08script:alert(1)')).toBeUndefined();
    });
  });
