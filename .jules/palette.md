## 2026-07-02 - Added accessible star rating
**Learning:** Custom icon-based rating components (like stars) are often completely inaccessible to screen readers out-of-the-box and need explicit `role="group"`, descriptive `aria-label`s for each value, and `aria-pressed` states, along with visible keyboard focus rings.
**Action:** Always verify custom form controls or interactive widgets that rely on icons to ensure they have descriptive labels and proper ARIA states.
