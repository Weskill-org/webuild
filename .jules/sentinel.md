## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.
## 2026-06-25 - IDOR in invite-student
**Vulnerability:** IDOR vulnerability in invite-student where an attacker could provide their own user.id as the campus_id to bypass the ID check.
**Learning:** Relying solely on user.id === target_id without validating the role allows attackers to bypass checks by passing their own ID in the request payload.
**Prevention:** Explicitly query and verify the role of the user (e.g. role === 'campus') alongside ID matching for sensitive operations.
