## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-21 - Missing Role Verification in Campus Operations
**Vulnerability:** The `invite-student` Edge Function allowed any authenticated user to bypass campus authorization checks by simply providing their own `user.id` as the `campus_id` parameter, because it only checked `user.id !== campus_id` without verifying the user actually had the 'campus' role.
**Learning:** When validating access to operations that are specific to a certain role (like campus administrators), do not assume that a matching ID implies authorization. You must query the `profiles` table to explicitly verify their role (e.g., `role === 'campus'`) in addition to any ownership checks.
**Prevention:** Always verify the user's role contextually before allowing them to execute role-specific operations on behalf of an ID.
