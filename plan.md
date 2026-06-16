1. **Refactor the `counts` calculation in `SkillQuizzes.tsx`**
   - The current calculation of `counts` in `src/pages/SkillQuizzes.tsx` runs five separate `.filter()` operations over the `paletteStatuses` object values on every render.
   - Because `timeLeft` is updating every second, this component re-renders completely every second, meaning it computes these `.filter()` operations over and over again needlessly.
   - I will consolidate the five passes into a single `.reduce()` or a loop pass, and wrap it in a `useMemo` block with `paletteStatuses` as its dependency. This turns it from an O(5 * n) operation every second into an O(n) operation only when `paletteStatuses` changes.
2. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run the pre commit steps via the `pre_commit_instructions` tool to verify no regressions were introduced.
3. **Submit the Pull Request**
   - Submit the PR with the title formatted as `⚡ Bolt: [performance improvement]`.
