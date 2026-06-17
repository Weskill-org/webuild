## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-20 - Missing Authorization in Notification Edge Function
**Vulnerability:** The `send-notification` Edge Function (`supabase/functions/send-notification/index.ts`) allows unauthenticated invocations and allows arbitrary users to spoof messages as other users via the `message` event.
**Learning:** Edge Functions configured with `verify_jwt = false` bypass all built-in API gateway authentication. They must manually parse the `Authorization` header and enforce role checks or impersonation protections natively using `supabase.auth.getUser()`, particularly when allowing backend service-role triggers alongside client invocations.
**Prevention:** Implement explicit `Authorization` header extraction and validation for any externally exposed function, ensuring users can only dispatch requests that match their verified authenticated identity (e.g., verifying `authUser.id === requested_user_id`).
