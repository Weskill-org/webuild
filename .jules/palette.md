## 2024-06-18 - Accessible Star Ratings
**Learning:** Custom rating interactions (like star ratings) without proper ARIA roles and keyboard focus styles are inaccessible to screen readers and keyboard users.
**Action:** Always use `role="radiogroup"` on the container, and `role="radio"`, `aria-checked`, and `aria-label` on the options, alongside keyboard focus styles (e.g., `focus-visible:ring-2`) for custom rating components.
