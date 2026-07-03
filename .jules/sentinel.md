## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.
## 2024-07-04 - Missing IDOR Check in send-notification Message Event
**Vulnerability:** The `send-notification` edge function lacked an authorization check for the `message` event, allowing attackers to spoof messages by providing another user's `user_id`.
**Learning:** In the `send-notification` edge function, the `user_id` payload represents the sender for the `message` event (requiring auth check) but the recipient for other events.
**Prevention:** Always extract and verify the authenticated user via the `Authorization` header in edge functions when the action implies the user is acting as the sender, enforcing `user.id === payload.user_id` checks to prevent IDOR.
