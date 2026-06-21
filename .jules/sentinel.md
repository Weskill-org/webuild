## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-06-22 - Missing Authorization in Send-Notification Edge Function
**Vulnerability:** The send-notification Edge Function allows any unauthenticated user to trigger arbitrary emails and push notifications.
**Learning:** Edge Functions with `verify_jwt = false` bypass all built-in authentication and require manual authorization checks of the `Authorization` header.
**Prevention:** Always manually verify the caller's JWT token (using `supabase.auth.getUser()`) or the service role key before executing logic in unprotected Edge Functions.
