## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2025-06-05 - Cross-Site Scripting (XSS) via Unsanitized External Links
**Vulnerability:** User-provided URLs (like `website` or `linkedin` profile links) were rendered directly in `href` attributes without sanitization. An attacker could provide a malicious URL like `javascript:alert(1)` to execute arbitrary code when another user clicks the link.
**Learning:** URL parser bypassing techniques exist. For example, prepending a control character (e.g., `\x08javascript:alert(1)`) can cause standard JavaScript URL parsers or custom sanitization scripts to fail, while still being executed by modern browsers.
**Prevention:** Always strip control characters (`/[\x00-\x1F\x7F]/g`) from input before attempting to parse or validate it as a URL. Use a robust, centralized `sanitizeUrl` utility for all user-provided links to ensure they use safe protocols (`http:`, `https:`, `mailto:`).
