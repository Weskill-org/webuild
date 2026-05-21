import { describe, it, expect } from 'vitest';
import { formatProjectBudget } from '../projectUtils';
import { Project } from '@/types/database';

// Helper to create a complete project mock with defaults
const createMockProject = (overrides: Partial<Project>): Project => {
  return {
    budget_min: 0,
    budget_max: 0,
    commission_min: 0,
    commission_max: 0,
    commission_type: null,
    pricing_type: 'fixed',
    ...overrides,
  } as Project;
};

describe('formatProjectBudget', () => {
  it('formats fixed pricing with same min and max', () => {
    const project = createMockProject({
      pricing_type: 'fixed',
      budget_min: 10000,
      budget_max: 10000,
    });
    expect(formatProjectBudget(project)).toBe('₹10,000');
  });

  it('formats fixed pricing with a range', () => {
    const project = createMockProject({
      pricing_type: 'fixed',
      budget_min: 10000,
      budget_max: 20000,
    });
    expect(formatProjectBudget(project)).toBe('₹10,000–₹20,000');
  });

  it('formats commission pricing with percentage same min and max', () => {
    const project = createMockProject({
      pricing_type: 'commission',
      commission_type: 'percentage',
      commission_min: 10,
      commission_max: 10,
    });
    expect(formatProjectBudget(project)).toBe('10% Commission');
  });

  it('formats commission pricing with percentage range', () => {
    const project = createMockProject({
      pricing_type: 'commission',
      commission_type: 'percentage',
      commission_min: 10,
      commission_max: 15,
    });
    expect(formatProjectBudget(project)).toBe('10%–15% Commission');
  });

  it('formats commission pricing with fixed amount', () => {
    const project = createMockProject({
      pricing_type: 'commission',
      commission_type: 'fixed',
      commission_min: 500,
      commission_max: 1000,
    });
    expect(formatProjectBudget(project)).toBe('₹500–₹1,000 Commission');
  });

  it('formats fixed_plus_commission pricing', () => {
    const project = createMockProject({
      pricing_type: 'fixed_plus_commission',
      budget_min: 5000,
      budget_max: 10000,
      commission_type: 'percentage',
      commission_min: 5,
      commission_max: 10,
    });
    expect(formatProjectBudget(project)).toBe('₹5,000–₹10,000 + 5%–10% Commission');
  });

  it('formats hourly pricing', () => {
    const project = createMockProject({
      pricing_type: 'hourly',
      budget_min: 500,
      budget_max: 1000,
    });
    expect(formatProjectBudget(project)).toBe('₹500–₹1,000 / hr');
  });

  it('formats hourly pricing with same min and max', () => {
    const project = createMockProject({
      pricing_type: 'hourly',
      budget_min: 500,
      budget_max: 500,
    });
    expect(formatProjectBudget(project)).toBe('₹500 / hr');
  });
});
