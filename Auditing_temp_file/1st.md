
Diagnose performance issues
60
Performance
94
Accessibility
96
Best Practices
100
SEO
60
FCP
+1
LCP
+1
TBT
+29
CLS
+25
SI
+4
Performance
Values are estimated and may vary. The performance score is calculated directly from these metrics.See calculator.
0–49
50–89
90–100
Final Screenshot

Metrics
Expand view
First Contentful Paint
5.2 s
Largest Contentful Paint
8.2 s
Total Blocking Time
110 ms
Cumulative Layout Shift
0
Speed Index
6.4 s
Captured at Apr 21, 2026, 1:18 PM GMT+5:30
Emulated Moto G Power with Lighthouse 13.1.0
Single page session
Initial page load
Slow 4G throttling
Using HeadlessChromium 146.0.7680.177 with lr
View Treemap
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Show audits relevant to:

All

FCP

LCP

TBT
Insights
Render blocking requests Est savings of 1,020 ms
Use efficient cache lifetimes Est savings of 58 KiB
Legacy JavaScript Est savings of 20 KiB
LCP breakdown
Network dependency tree
3rd parties
These insights are also available in the Chrome DevTools Performance Panel - record a trace to view more detailed information.
Diagnostics
Reduce unused JavaScript Est savings of 477 KiB
Reduce unused CSS Est savings of 38 KiB
Avoid long main-thread tasks 8 long tasks found
User Timing marks and measures 4 user timings
More information about the performance of your application. These numbers don't directly affect the Performance score.


2. General
Issues were logged in the Issues panel in Chrome Devtools
Issues logged to the Issues panel in Chrome Devtools indicate unresolved problems. They can come from network request failures, insufficient security controls, and other browser concerns. Open up the Issues panel in Chrome DevTools for more details on each issue.
Issue type
Cookie
…checkout/public?traffic_env=…(api.razorpay.com)
Missing source maps for large first-party JavaScript
Source maps translate minified code to the original source code. This helps developers debug in production. In addition, Lighthouse is able to provide further insights. Consider deploying source maps to take advantage of these benefits. Learn more about source maps.Unscored
URL
Map URL
weskill.org 1st party
/assets/index-BIwZ5rtu.js(webuild.weskill.org)
Large JavaScript file is missing a source map

3. Trust and Safety
Ensure CSP is effective against XSS attacks
A strong Content Security Policy (CSP) significantly reduces the risk of cross-site scripting (XSS) attacks. Learn how to use a CSP to prevent XSSUnscored
Description
Directive
Severity
No CSP found in enforcement mode
High
Use a strong HSTS policy
Deployment of the HSTS header significantly reduces the risk of downgrading HTTP connections and eavesdropping attacks. A rollout in stages, starting with a low max-age is recommended. Learn more about using a strong HSTS policy.Unscored
Description
Directive
Severity
No `includeSubDomains` directive found
includeSubDomains
Medium
No `preload` directive found
preload
Medium
Ensure proper origin isolation with COOP
The Cross-Origin-Opener-Policy (COOP) can be used to isolate the top-level window from other documents such as pop-ups. Learn more about deploying the COOP header.Unscored
Description
Directive
Severity
No COOP header found
High
Mitigate clickjacking with XFO or CSP
The X-Frame-Options (XFO) header or the frame-ancestors directive in the Content-Security-Policy (CSP) header control where a page can be embedded. These can mitigate clickjacking attacks by blocking some or all sites from embedding the page. Learn more about mitigating clickjacking.Unscored
Description
Severity
No frame control policy found
High
Mitigate DOM-based XSS with Trusted Types
The require-trusted-types-for directive in the Content-Security-Policy (CSP) header instructs user agents to control the data passed to DOM XSS sink functions. Learn more about mitigating DOM-based XSS with Trusted Types.Unscored
Description
Severity
No `Content-Security-Policy` header with Trusted Types directive found
High
Browser Compatibility

4. 