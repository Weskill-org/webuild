## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-24 - Cross-Site Scripting (XSS) via User Profiles
**Vulnerability:** User-provided URLs (like website and LinkedIn profile links) were rendered directly in `href` attributes in `PublicProfile.tsx` and `ProjectDetails.tsx`. This could allow Cross-Site Scripting (XSS) if a user inputted a malicious `javascript:` or `data:` URI.
**Learning:** Directly binding user input to executable attributes like `href` without validation implicitly trusts the user data, enabling potential execution of scripts in the context of other users viewing the profile.
**Prevention:** Always sanitize user-provided URLs before rendering them in `href` attributes. Use a utility function (like `sanitizeUrl`) to parse the URL and ensure the protocol is safe (`http:`, `https:`, `mailto:`), defaulting to a safe fallback (like `#`) for unsafe schemes.
