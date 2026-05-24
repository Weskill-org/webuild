## 2025-05-21 - [Chat Thread Re-renders]
**Learning:** In chat applications, long lists of messages often re-render completely when typing indicators change or new messages arrive. Using React.memo on the individual message bubble components prevents O(n) re-renders, assuming the parent preserves object references for unmodified message objects.
**Action:** Always wrap list item components in React.memo when rendering potentially long lists where most items remain static (like chat history).

## 2026-05-22 - [Memoize Array Filtering in Renders]
**Learning:** Filtering and sorting large lists directly in the render body creates new array references on every render, which can defeat memoization of child components and cause performance bottlenecks. If a calculation depends on an unmemoized array variable defined within the render, wrapping the calculation in `useMemo` requires moving the unmemoized array creation into the `useMemo` block as well.
**Action:** Always wrap expensive list filtering and sorting in `useMemo` and ensure any intermediate derived arrays are calculated within the hook to maintain stable references and valid dependencies.

## 2026-05-24 - [Loop Consolidation in React Renders]
**Learning:** Running multiple separate `.filter()` array passes to derive simple stats (like counting statuses) during a render cycle causes unnecessary iterations (O(n) times the number of passes). If these passes happen on every render or keystroke without memoization, it easily creates a performance bottleneck in large datasets.
**Action:** When computing multiple derived stats from a single list, consolidate them into a single loop (e.g., using a traditional `for` loop or `reduce`) and wrap the calculation in `useMemo` to achieve optimal O(n) performance instead of O(x * n).
