1. **Optimize palette counts computation in `src/pages/SkillQuizzes.tsx`**
   - The current code loops through `Object.values(paletteStatuses)` 5 separate times using `.filter()` to calculate the lengths of `answered`, `not_answered`, `marked`, `answered_marked`, and `not_visited`.
   - I will replace these multiple `.filter()` passes with a single `Object.values(paletteStatuses).reduce()` block wrapped in a `useMemo` hook (dependent on `paletteStatuses`) to derive all counts in O(n) instead of O(5n). This will prevent unnecessary O(n*5) array operations on every timer tick or re-render during active exams.
2. **Add a critical learning entry to `.jules/bolt.md`**
   - I will add a new entry to the journal detailing the performance pattern of consolidating array iterations into single `reduce` passes for status counts in heavily updated components (like active exam views with timers).
3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run tests, check for format and lint errors, and ensure everything remains functional.
4. **Submit a PR**
   - Create a PR using the required format `⚡ Bolt: [performance improvement]` explaining what was optimized, why, the expected impact, and how to verify.
