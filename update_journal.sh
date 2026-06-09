mkdir -p .jules
cat << 'MD' >> .jules/palette.md
## $(date +%Y-%m-%d) - Added ARIA labels to DashboardLayout icon-only buttons
**Learning:** Found multiple instances of icon-only buttons (`<button>` and `<Button size="icon">`) without accessible names in `DashboardLayout.tsx` (sidebar toggle, notifications, profile settings, and mobile menu close), making them inaccessible to screen readers.
**Action:** Always ensure icon-only buttons have an explicit `aria-label` attribute describing their action or target.
MD
