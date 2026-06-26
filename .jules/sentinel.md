## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-06-26 - Incomplete IDOR check in invite-student Edge Function
**Vulnerability:** The `invite-student` Edge Function relied on `if (profile?.role !== "admin" && user.id !== campus_id)` for authorization, allowing any user (including students) to supply their own user ID as `campus_id` to bypass the role check and execute operations on behalf of a campus.
**Learning:** When validating access to campus-specific operations, do not rely solely on `user.id === campus_id` for authorization, as users can pass their own ID as the payload to bypass this check.
**Prevention:** You must explicitly query the `profiles` table to verify their role (e.g., `role === 'admin'` or `role === 'campus'`) in combination with the ID matching.
