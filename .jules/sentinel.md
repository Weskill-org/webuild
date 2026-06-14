## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-24 - Missing Authentication on send-notification Edge Function
**Vulnerability:** The `send-notification` edge function lacked explicit authentication validation () despite being configured with `verify_jwt = false`. This exposed the endpoint to unauthenticated access, allowing potential attackers to spoof notifications.
**Learning:** Edge Functions configured with `verify_jwt = false` bypass API gateway authentication. They must manually parse the `Authorization` header and validate the JWT to prevent unauthorized execution.
**Prevention:** Always extract the token and verify it using `supabaseClient.auth.getUser()` when creating Edge Functions that bypass default authentication.

## 2024-05-24 - Missing Authentication on send-notification Edge Function
**Vulnerability:** The `send-notification` edge function lacked explicit authentication validation (supabase.auth.getUser()) despite being configured with verify_jwt = false. This exposed the endpoint to unauthenticated access, allowing potential attackers to spoof notifications.
**Learning:** Edge Functions configured with verify_jwt = false bypass API gateway authentication. They must manually parse the Authorization header and validate the JWT to prevent unauthorized execution.
**Prevention:** Always extract the token and verify it using supabaseClient.auth.getUser() when creating Edge Functions that bypass default authentication.
