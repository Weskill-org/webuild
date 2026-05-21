## 2025-05-21 - [Chat Thread Re-renders]
**Learning:** In chat applications, long lists of messages often re-render completely when typing indicators change or new messages arrive. Using React.memo on the individual message bubble components prevents O(n) re-renders, assuming the parent preserves object references for unmodified message objects.
**Action:** Always wrap list item components in React.memo when rendering potentially long lists where most items remain static (like chat history).
