## $(date +%Y-%m-%d) - Added missing ARIA Labels on Icon-only buttons
**Learning:** Found multiple instances where Shadcn `Button` component with `size="icon"` lacked `aria-label` attributes. This is an accessibility anti-pattern because screen readers cannot announce the button's purpose without an explicit label or text content.
**Action:** Always ensure that any button containing only an icon (like `Trash2`, `Bell`, `Sun`/`Moon`, `MessageSquare`, or `ArrowLeft`) includes a descriptive `aria-label` attribute (e.g., `aria-label="Delete batch"`) to provide context to assistive technologies.
