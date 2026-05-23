## 2025-05-21 - [Chat Thread Re-renders]
**Learning:** In chat applications, long lists of messages often re-render completely when typing indicators change or new messages arrive. Using React.memo on the individual message bubble components prevents O(n) re-renders, assuming the parent preserves object references for unmodified message objects.
**Action:** Always wrap list item components in React.memo when rendering potentially long lists where most items remain static (like chat history).

## 2026-05-22 - [Memoize Array Filtering in Renders]
**Learning:** Filtering and sorting large lists directly in the render body creates new array references on every render, which can defeat memoization of child components and cause performance bottlenecks. If a calculation depends on an unmemoized array variable defined within the render, wrapping the calculation in `useMemo` requires moving the unmemoized array creation into the `useMemo` block as well.
**Action:** Always wrap expensive list filtering and sorting in `useMemo` and ensure any intermediate derived arrays are calculated within the hook to maintain stable references and valid dependencies.
## 2024-05-23 - Memoization of Unnecessary List Recomputations
**Learning:** Certain high-complexity pages like `SkillQuizzes` contain highly active state updates (e.g., an exam timer decrementing every second). This triggers full component re-renders. Unmemoized derived state, such as large array filters (e.g., `quizzes.filter(...)`), are re-evaluated pointlessly on every tick, hurting performance.
**Action:** When filtering or transforming large datasets in components that have frequently updating states like timers, always wrap the derived list computation in a `useMemo` block using the correct dependency arrays.
