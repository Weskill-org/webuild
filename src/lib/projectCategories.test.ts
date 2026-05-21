import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoriesFromDB, fetchSubcategoriesFromDB, fetchCategoryMap } from './projectCategories';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Database-driven helpers in projectCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCategoriesFromDB', () => {
    it('should fetch and return categories on success', async () => {
      const mockCategories = [
        { id: '1', name: 'Technical', slug: 'technical', color: 'blue' },
        { id: '2', name: 'Design', slug: 'design', color: 'pink' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchCategoriesFromDB();

      expect(supabase.from).toHaveBeenCalledWith('admin_categories');
      expect(mockSelect).toHaveBeenCalledWith('id, name, slug, color');
      expect(mockEq).toHaveBeenCalledWith('is_enabled', true);
      expect(mockOrder).toHaveBeenCalledWith('display_order');

      expect(result).toEqual(mockCategories);
    });

    it('should return empty array on database error', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchCategoriesFromDB();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null but no error', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchCategoriesFromDB();

      expect(result).toEqual([]);
    });
  });

  describe('fetchSubcategoriesFromDB', () => {
    it('should fetch and return subcategories on success', async () => {
      const mockSubcategories = [
        { id: '11', name: 'Web Dev', slug: 'web-dev' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockSubcategories, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchSubcategoriesFromDB('1');

      expect(supabase.from).toHaveBeenCalledWith('admin_subcategories');
      expect(mockSelect).toHaveBeenCalledWith('id, name, slug');
      expect(mockEq1).toHaveBeenCalledWith('category_id', '1');
      expect(mockEq2).toHaveBeenCalledWith('is_enabled', true);
      expect(mockOrder).toHaveBeenCalledWith('display_order');

      expect(result).toEqual(mockSubcategories);
    });

    it('should return empty array on database error', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchSubcategoriesFromDB('1');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const result = await fetchSubcategoriesFromDB('1');

      expect(result).toEqual([]);
    });
  });

  describe('fetchCategoryMap', () => {
    it('should return map of categories to subcategories', async () => {
      const mockCategories = [
        { id: '1', name: 'Technical', slug: 'technical', color: 'blue' },
        { id: '2', name: 'Design', slug: 'design', color: 'pink' },
      ];

      const mockSubcategoriesTech = [
        { id: '11', name: 'Web Dev', slug: 'web-dev' },
        { id: '12', name: 'Mobile', slug: 'mobile' },
      ];

      const mockSubcategoriesDesign = [
        { id: '21', name: 'UI/UX', slug: 'ui-ux' },
      ];

      // To handle multiple queries appropriately, we simulate the supabase behaviour simpler
      // We know fetchCategoryMap calls fetchCategoriesFromDB and then fetchSubcategoriesFromDB

      // First call is to admin_categories
      const mockCategoriesOrder = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
      const mockCategoriesEq = vi.fn().mockReturnValue({ order: mockCategoriesOrder });
      const mockCategoriesSelect = vi.fn().mockReturnValue({ eq: mockCategoriesEq });

      // Second/Third calls are to admin_subcategories
      const mockSubTechOrder = vi.fn().mockResolvedValue({ data: mockSubcategoriesTech, error: null });
      const mockSubTechEq2 = vi.fn().mockReturnValue({ order: mockSubTechOrder });
      const mockSubTechEq1 = vi.fn().mockReturnValue({ eq: mockSubTechEq2 });
      const mockSubTechSelect = vi.fn().mockReturnValue({ eq: mockSubTechEq1 });

      const mockSubDesignOrder = vi.fn().mockResolvedValue({ data: mockSubcategoriesDesign, error: null });
      const mockSubDesignEq2 = vi.fn().mockReturnValue({ order: mockSubDesignOrder });
      const mockSubDesignEq1 = vi.fn().mockReturnValue({ eq: mockSubDesignEq2 });
      const mockSubDesignSelect = vi.fn().mockReturnValue({ eq: mockSubDesignEq1 });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'admin_categories') return { select: mockCategoriesSelect } as any;
        if (table === 'admin_subcategories') {
            // Need a way to distinguish which category ID is passed in
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((col, val) => {
                        if (col === 'category_id' && val === '1') return { eq: mockSubTechEq2 };
                        if (col === 'category_id' && val === '2') return { eq: mockSubDesignEq2 };
                        return { eq: vi.fn() };
                    })
                })
            } as any;
        }
        return {} as any;
      });

      const result = await fetchCategoryMap();

      expect(result).toEqual({
        'Technical': ['Web Dev', 'Mobile'],
        'Design': ['UI/UX']
      });
    });
  });
});
