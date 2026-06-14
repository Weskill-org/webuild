## 2026-06-14 - Accessible Custom Star Ratings
**Learning:** Custom star rating components built with a container and separate interactive elements are inaccessible to screen readers and keyboard users without explicit ARIA roles (radiogroup and radio). Users cannot navigate or interpret the state properly.
**Action:** Always apply `role="radiogroup"` to the container with an `aria-label`, and `role="radio"`, `aria-checked`, `aria-label` (to announce the value), and proper keyboard focus styles (e.g., `focus-visible:ring-2`) to each individual option button to ensure full accessibility.
