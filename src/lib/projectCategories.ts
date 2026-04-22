/**
 * Project Type & Category System
 * 
 * Pre-defined, standardized categories for project classification.
 * All categories and sub-categories are hardcoded to maintain
 * consistency and standardization across the platform.
 */

export const PROJECT_CATEGORIES: Record<string, string[]> = {
  "Technical": [
    "Software Development",
    "Web Development",
    "Mobile App Development",
    "Data Analytics",
    "AI/ML",
    "Cloud & DevOps",
    "Cybersecurity",
    "IoT & Embedded Systems",
  ],
  "Finance": [
    "Accounting",
    "Financial Modeling",
    "Tax Planning",
    "Audit & Compliance",
    "Investment Analysis",
  ],
  "Marketing": [
    "Digital Marketing",
    "Content Marketing",
    "SEO/SEM",
    "Social Media Management",
    "Brand Strategy",
    "Market Research",
    "Influencer Marketing",
  ],
  "Operations": [
    "Supply Chain Management",
    "Process Optimization",
    "Project Management",
    "Quality Assurance",
    "Logistics",
  ],
  "Design": [
    "UI/UX Design",
    "Graphic Design",
    "Product Design",
    "Motion Graphics",
    "3D Modeling",
  ],
  "Human Resources": [
    "Recruitment",
    "Training & Development",
    "HR Analytics",
    "Compensation & Benefits",
  ],
  "Legal": [
    "Contract Management",
    "Intellectual Property",
    "Regulatory Compliance",
    "Legal Research",
  ],
  "Research": [
    "Academic Research",
    "R&D",
    "Scientific Analysis",
    "Survey & Data Collection",
  ],
};

/** All main project types */
export const PROJECT_TYPES = Object.keys(PROJECT_CATEGORIES);

/** Get sub-categories for a given project type */
export function getSubCategories(projectType: string): string[] {
  return PROJECT_CATEGORIES[projectType] ?? [];
}

/** Get all sub-categories across all types (flat list) */
export function getAllSubCategories(): string[] {
  return Object.values(PROJECT_CATEGORIES).flat();
}

/** Category color mapping for badges */
export const CATEGORY_COLORS: Record<string, string> = {
  "Technical": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Finance": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Marketing": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Operations": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Design": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Human Resources": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "Legal": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "Research": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

/** Get badge color classes for a project type */
export function getCategoryColor(projectType: string): string {
  return CATEGORY_COLORS[projectType] ?? "bg-muted text-muted-foreground";
}
