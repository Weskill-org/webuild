1. **Apply `useMemo` in `AdminDashboard.tsx` to `filtered` variables**: Ensure that we don't recalculate the `filtered` results on every single render unless the dependencies (`search`, `roleFilter`, etc.) have changed.
2. **Apply `useMemo` to `paged` calculation in `AdminDashboard.tsx`**: Ensure the paged data calculation does not occur on every render unless the page index or the filtered results have changed.
3. **Verify the change with `read_file`**: Ensure the file was modified properly.
4. **Run `pnpm test` and `pnpm lint`**: Ensure formatting is correct and everything builds properly.
5. **Pre-commit step**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit PR**.
