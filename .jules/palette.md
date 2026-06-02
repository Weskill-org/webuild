## 2024-06-02 - Missing ARIA Labels on Icon Buttons
**Learning:** A common accessibility pattern in this repository is the use of icon-only buttons (`<Button size="icon">`) without corresponding `aria-label`s. This severely hinders screen readers from interpreting the button's action.
**Action:** When creating or reviewing components with icon-only buttons, always explicitly add an `aria-label` attribute describing the button's action to ensure full accessibility for screen readers.
