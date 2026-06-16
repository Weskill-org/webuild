## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## $(date +%Y-%m-%d) - XSS via Unsanitized `href` Links
**Vulnerability:** User-provided URLs (like `profile.website`, `profile.linkedin`, `owner.website`) were directly embedded in `href` attributes in React components (e.g., `src/pages/PublicProfile.tsx` and `src/pages/ProjectDetails.tsx`). This allows Cross-Site Scripting (XSS) if an attacker provides a `javascript:` or `data:` URL.
**Learning:** React escapes text nodes by default, but it does not sanitize URLs inside `href` properties. An attacker can achieve code execution simply by tricking users into clicking these malicious links.
**Prevention:** Always pass user-supplied links through a robust URL sanitization function (like `sanitizeUrl` which validates against allowed protocols such as `http:`, `https:`, and strips control characters) before rendering them in an `href` attribute.
