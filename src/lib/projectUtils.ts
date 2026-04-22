import { Project } from "@/types/database";

export function formatProjectBudget(project: Project): string {
  const { pricing_type, budget_min, budget_max, commission_type, commission_min, commission_max } = project;

  const formatCurrency = (val: number) => `₹${val.toLocaleString()}`;
  const formatCommission = (val: number) => commission_type === 'percentage' ? `${val}%` : `₹${val.toLocaleString()}`;

  const budgetStr = budget_min === budget_max ? formatCurrency(budget_min) : `${formatCurrency(budget_min)}–${formatCurrency(budget_max)}`;
  const commissionStr = commission_min === commission_max ? formatCommission(commission_min) : `${formatCommission(commission_min)}–${formatCommission(commission_max)}`;

  if (pricing_type === 'commission') {
    return `${commissionStr} Commission`;
  }

  if (pricing_type === 'fixed_plus_commission') {
    return `${budgetStr} + ${commissionStr} Commission`;
  }

  if (pricing_type === 'hourly') {
    return `${budgetStr} / hr`;
  }

  return budgetStr;
}
