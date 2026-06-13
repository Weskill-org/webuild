## 2024-06-13 - Icon-only buttons need aria-labels
**Learning:** Icon-only buttons, especially those that are dynamically generated like removing items from a list (e.g., milestones in CreateProject), often lack accessible names, making them unreadable by screen readers.
**Action:** Always ensure that icon-only `Button` components are given an `aria-label` attribute describing their function.
