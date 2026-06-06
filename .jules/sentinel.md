## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-06-07 - Cross-Site Scripting (XSS) via Profile Links
**Vulnerability:** User-provided URLs (website and linkedin) in profiles were being directly rendered in `href` attributes without sanitization. An attacker could set their website URL to `javascript:alert(1)` and padding it with control characters to evade rudimentary checks, potentially executing malicious scripts when another user clicks the link.
**Learning:** React escapes content inside HTML elements, but `href` attributes evaluate the scheme before clicking, making them vulnerable to `javascript:` or `data:` URIs. Relying on front-end input types is not enough.
**Prevention:** Always sanitize URLs passing into `href` properties (e.g. using `new URL()` to check for `http:` / `https:` protocols) and strip control characters (`/[\x00-\x1F\x7F]/g`) to prevent XSS bypasses using protocol padding.
