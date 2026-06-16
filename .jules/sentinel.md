## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-28 - [Prevent XSS from User Profile URLs]
**Vulnerability:** User-provided URLs (like `profile.website`, `profile.linkedin`, `owner.website`) were being rendered directly into `href` attributes without prior sanitization. This allowed for Cross-Site Scripting (XSS) attacks if a user provided a malicious payload like `javascript:alert(1)`.
**Learning:** React protects against XSS in text nodes but NOT when values are injected directly into attributes like `href`. If a user controls an `href` value without protocol validation, they can execute arbitrary JavaScript when the link is clicked.
**Prevention:** Always validate and sanitize user-provided URLs before rendering them. Ensure the URL starts with a safe protocol (`http:`, `https:`, `mailto:`) using a utility function like `sanitizeUrl` using the native `URL` constructor.
