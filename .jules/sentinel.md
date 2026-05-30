## 2024-05-20 - Missing Authorization in Razorpay Edge Function
**Vulnerability:** The `razorpay` Edge Function (`supabase/functions/razorpay/index.ts`) allows any unauthenticated user to call the `release_payment` action and release funds from escrow.
**Learning:** Edge Functions invoked via `supabase.functions.invoke()` need explicit authentication checks (e.g., parsing the JWT token from the `Authorization` header) when performing sensitive operations like transferring funds. Simply using `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and assumes the backend has verified the request.
**Prevention:** Always verify the caller's JWT token (using `createClient` with `SUPABASE_ANON_KEY` and `auth.getUser(token)`) and ensure they are authorized to perform the action (e.g., verifying they are the owner of the project) before executing sensitive business logic in Edge Functions.

## 2024-05-24 - [XSS via User-Provided URLs]
**Vulnerability:** Found unvalidated user inputs (like `website` and `linkedin` fields from user profiles) directly rendered in `<a href={...}>` tags.
**Learning:** This can lead to Stored Cross-Site Scripting (XSS) if a user updates their profile link to a malicious URI like `javascript:alert(1)` or `data:text/html,...`. React protects against HTML injection within text, but it does NOT prevent XSS in `href` attributes automatically.
**Prevention:** Always validate and sanitize user-provided URLs using a utility function (e.g., `sanitizeUrl`) that ensures the URL uses a safe protocol (like `http:`, `https:`, or `mailto:`) before rendering it in an `href` attribute.
