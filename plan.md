1. **Optimize palette counts calculation in `src/pages/SkillQuizzes.tsx`**
   - The `counts` object in the active exam portal render block (around line 922) iterates over `Object.values(paletteStatuses)` multiple times (`.filter(...).length`) for each status type. Since `timeLeft` changes every second during the active exam mode, this entire component re-renders every second.
   - The memory note "Loop Consolidation in React Renders" specifically mentions: "Running multiple separate `.filter()` array passes to derive simple stats (like counting statuses) during a render cycle causes unnecessary iterations... When computing multiple derived stats from a single list, consolidate them into a single loop... and wrap the calculation in `useMemo`".
   - I will consolidate these five `.filter()` passes into a single iteration using `.reduce()` (or a simple loop) inside a `useMemo` hook, with `paletteStatuses` as the dependency.

2. **Run lint and tests**
   - Execute `pnpm lint` and `pnpm test` to ensure code quality and avoid regressions.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run the pre_commit_instructions tool and follow its directions.

4. **Submit PR**
   - Create a PR with the title format `⚡ Bolt: [performance improvement]`.
   - The description will contain What, Why, Impact, and Measurement details.
