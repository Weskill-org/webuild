

# WeBuild - Full Production Implementation Plan

## Current State

- **Database**: Empty -- no tables exist in Supabase
- **Frontend**: Basic pages exist (Landing, Login, Signup, Dashboard, Messages, Notifications, ProfileSettings) but are mostly shells
- **Auth**: Uses Supabase Auth (not Firebase despite earlier discussion), but `signIn` return type mismatch causes build errors
- **Types**: `src/integrations/supabase/types.ts` has no table definitions, causing all TypeScript errors
- **Realtime hook**: References non-existent tables, all broken

## Phase 1: Database Schema & Fix Build Errors

### 1.1 Create Supabase Tables (Migration)

Create all tables with RLS:

- **profiles** - id (uuid, FK to auth.users), full_name, role (company/student/campus), university, company_name, website, logo_url, skills (text[]), linkedin, bio, created_at
- **projects** - id, owner_id (uuid), title, description, category, required_skills (text[]), budget_min, budget_max, pricing_type, duration, start_date, end_date, status (draft/open/in_progress/completed/cancelled), created_at, updated_at
- **project_milestones** - id, project_id, title, description, due_date, completed, order_index
- **project_applications** - id, project_id, applicant_id, status (pending/accepted/rejected/withdrawn), cover_letter, created_at
- **wallets** - id, owner_id (unique), balance (numeric default 0), currency, created_at, updated_at
- **transactions** - id, wallet_id, type (credit/debit/commission), amount, description, reference_id, created_at
- **messages** - id, sender_id, recipient_id, subject, body, read (boolean), created_at
- **certificates** - id, project_id, student_id, company_name, project_title, issued_at, certificate_uid (unique), qr_data
- **batches** - id, campus_id, name, department, start_date, end_date, created_at
- **batch_students** - id, batch_id, student_id, joined_at

Also create:
- Auto-create profile trigger on auth.users insert
- Auto-create wallet trigger on profile insert
- `updated_at` trigger function
- RLS policies for all tables
- Avatars storage bucket

### 1.2 Fix TypeScript Errors

- Fix `signIn` return type in `AuthProvider.tsx` to match hook's actual return (`Promise<User>` not `Promise<{user, profile}>`)
- Fix `use-realtime.ts` to cast Supabase queries with explicit types (since generated types won't include table defs immediately, use manual type definitions)
- Create a `src/types/database.ts` with manual interfaces for all tables until types auto-regenerate

## Phase 2: Auth & Core Infrastructure

### 2.1 Complete Auth Flow
- Fix Google OAuth setup (redirect URL)
- Add Forgot Password page + Reset Password page
- Add email confirmation handling
- Add loading spinner component for PrivateRoute

### 2.2 Shared Layout Components
- Create `DashboardLayout` component with sidebar navigation (role-aware)
- Create `TopBar` component with notifications, messages, wallet, profile
- Create `Sidebar` component with role-based menu items

## Phase 3: Role-Based Dashboards

### 3.1 Student Dashboard
- Recommended projects widget (based on skills)
- Active projects progress tracker
- Wallet balance card
- Certificates earned count
- Recent messages preview

### 3.2 Company Dashboard
- "Post New Project" CTA
- Active projects summary with progress bars
- Recent applicants list
- Earnings overview chart (recharts)
- Messages preview

### 3.3 Campus Dashboard
- Active batches overview
- Student participation chart
- Total campus commissions
- Projects hosted by campus

## Phase 4: Project System

### 4.1 Project Creation (Company)
- Multi-step form: Title, Description, Category, Required Skills, Budget, Timeline, Milestones
- Project blueprint/roadmap upload (Supabase Storage)
- Publish to marketplace

### 4.2 Project Marketplace (Student)
- Browse/search projects with filters (category, skills, budget, duration)
- Project detail page with company info, roadmap, apply button
- Application flow with cover letter

### 4.3 Project Management
- Project detail view with milestone tracker
- Accept/reject applicants (company)
- Update milestone status
- Mark project complete -> auto-generate certificate

## Phase 5: Messaging System

- Real-time chat between users (Supabase Realtime)
- Conversation list view
- Message thread view
- File attachments via Supabase Storage
- Online/offline status indicators
- Mark as read functionality

## Phase 6: Wallet & Payments

- Wallet dashboard with balance display
- Transaction history (credits/debits)
- Commission breakdown for campus
- Withdraw request flow (edge function)
- Company: add funds flow

## Phase 7: Certificate System

- Auto-generate certificate on project completion (edge function)
- Certificate template with student name, company, project, dates, unique ID
- QR code for verification
- PDF export
- Public verification page (`/verify/:certificateId`)

## Phase 8: Polish & Production Readiness

- Input validation with Zod on all forms
- Error boundaries
- Responsive design audit (mobile/tablet/desktop)
- Loading states and skeleton screens
- Empty states for all lists
- SEO meta tags
- 404 page improvement
- Rate limiting on auth endpoints
- Security audit of all RLS policies

---

## Technical Approach

- **Database**: Single Supabase migration with all tables, RLS, triggers
- **State management**: React Query for server state, React context for auth
- **Realtime**: Supabase Realtime channels for messages and project updates
- **File storage**: Supabase Storage for avatars, project blueprints, attachments
- **Charts**: Recharts (already installed)
- **Forms**: React Hook Form + Zod (already installed)
- **Routing**: React Router with role-based route guards

## Implementation Order

Due to the scope, this will be implemented incrementally:
1. Database + fix all build errors (immediate)
2. Auth flow + layout components
3. Student dashboard + project marketplace
4. Company dashboard + project creation
5. Campus dashboard + batch management
6. Messaging system
7. Wallet system
8. Certificate system
9. Polish and security hardening

