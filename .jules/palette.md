## 2024-06-05 - Add aria-label to icon-only buttons
**Learning:** Icon-only buttons without `aria-label` are a widespread accessibility issue pattern across this app's components, especially in `ProjectDetails.tsx`, `BlogPostDetails.tsx`, `SkillQuizzes.tsx`, and `CreateProject.tsx`.
**Action:** Always add `aria-label` to icon-only buttons (`<Button size="icon">`) to improve screen reader accessibility.
