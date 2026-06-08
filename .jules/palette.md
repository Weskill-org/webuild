
## 2024-06-08 - Icon-Only Button Accessibility Pattern
**Learning:** Found multiple instances where the application uses Shadcn's `<Button size="icon">` pattern (which removes the visible text slot to strictly show an icon) without an accompanying `aria-label` attribute. This is a recurring anti-pattern across various components (Batches, CreateProject, ProjectDetails, ReferEarn) that renders critical actions invisible to screen readers.
**Action:** When working with or reviewing Shadcn `size="icon"` buttons, always enforce the addition of an explicit `aria-label` that clearly describes the action (e.g., `aria-label="Delete batch"`).
