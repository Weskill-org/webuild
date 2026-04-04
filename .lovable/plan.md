

## Full-Stack Admin Console Plan

### Current State
The existing `/admin` page has basic stats (users, projects, revenue) and a users table with search/filter and "Grant Admin" action. The Projects tab is a placeholder. No management for disputes, reports, gift cards, certificates, wallets, or platform settings.

### What Will Be Built

The admin dashboard will be expanded into a comprehensive, tabbed console with these sections:

**1. Overview Tab (enhance existing)**
- Stats cards: Total Users, Projects, Revenue (INR ₹), Active Projects, Open Disputes, Pending Reports
- Users-by-role breakdown (existing)
- Recent activity feed summary (last 10 items from `activity_feed`)

**2. Users Tab (enhance existing)**
- Existing search + role filter
- Add: email column, verified status badge
- Actions: View Profile, Grant/Revoke Admin, Revoke Moderator
- Pagination (50 per page)

**3. Projects Tab (replace placeholder)**
- Table: Title, Owner (profile name), Status, Budget, Category, Created date
- Search by title, filter by status
- Actions: View details (navigate), Delete project (admin override via RLS -- need migration to allow admin delete)

**4. Disputes Tab**
- Table of all disputes (admin can already see via RLS `has_role`)
- Show: Project title, Raised by, Against, Status, Reason
- Actions: Resolve dispute (update status + resolution text)

**5. Reports/Moderation Tab**
- Table from `reports` table (admin can view via RLS)
- Show: Target type, Reason, Status, Reporter
- Actions: Mark reviewed, dismiss, or take action

**6. Gift Cards Tab**
- Table of all gift cards with code, amount, redeemed status
- Create new gift card form (code + amount)
- Admin can create via existing RLS policy

**7. Certificates Tab**
- Table of all issued certificates
- Show: Student, Project, Company, Issued date, UID

**8. Wallets & Transactions Tab**
- Summary: total platform balance across all wallets
- Note: Admin cannot currently view all wallets (RLS restricts to owner). Need migration to add admin SELECT policy on `wallets` and `transactions`.

### Database Migrations Required

1. **Admin can view all wallets**: Add SELECT policy on `wallets` for admins
2. **Admin can view all transactions**: Add SELECT policy on `transactions` for admins  
3. **Admin can delete projects**: Add DELETE policy on `projects` for admins

```sql
-- Allow admins to view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any project
CREATE POLICY "Admins can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### Technical Approach

- **Single file**: Expand `src/pages/AdminDashboard.tsx` using the existing `Tabs` pattern
- Each tab will be a self-contained section with its own data fetching via `useEffect`
- Lazy-load tab data only when that tab is active to avoid fetching everything upfront
- Use existing UI components: `Table`, `Dialog`, `Badge`, `Select`, `Input`, `Card`, `Tabs`
- All admin checks use the existing `user_roles` table query pattern
- Currency displayed as INR (₹) throughout

### Files to Modify
- `src/pages/AdminDashboard.tsx` -- complete rewrite with all 8 tabs
- 1 new migration for the 3 RLS policies above

