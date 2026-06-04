## 2026-06-04 - Add aria-labels to Dashboard icon buttons
**Learning:** Found several icon-only buttons in the main `DashboardLayout.tsx` (Notifications, Profile, Menu toggles) missing `aria-label` attributes, which breaks accessibility for screen reader users as they lack context.
**Action:** When adding or reviewing layout components with interactive icons (like Shadcn `<Button size="icon">`), always ensure an explicit `aria-label` or accessible alternative text is provided.
