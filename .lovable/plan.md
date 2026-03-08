

# Project Reviews & Ratings System

## Database Changes

### New `reviews` table
```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, reviewer_id, reviewee_id)
);
```

**RLS Policies:**
- SELECT: viewable by everyone (public reputation)
- INSERT: authenticated user can insert where `reviewer_id = auth.uid()` and project is completed
- No UPDATE/DELETE (reviews are permanent)

## Frontend Changes

### 1. Review Submission (on ProjectDetails page)
- When a project is `completed`, show a "Leave Review" button for both the project owner and accepted applicant
- Opens a dialog with 1-5 star selector + textarea for written feedback
- Prevents duplicate reviews (check if review already exists)

### 2. Reviews Display (on ProjectDetails page)
- Below milestones section, show all reviews for that project
- Each review shows: reviewer name, star rating, feedback text, date

### 3. Profile Reviews Section (new component)
- Create `ReviewsSection` component showing all reviews received by a user
- Display average rating (stars) + total review count
- List of individual reviews with project title, reviewer name, rating, feedback
- Add this to `ProfileSettings` page and create a public profile view

### 4. New Public Profile Page
- Route: `/profile/:id`
- Shows user's name, bio, skills, and all received reviews with average rating
- Accessible from project details (click on company/applicant name)

### Files to Create/Edit
- **Migration**: New `reviews` table with RLS
- **`src/types/database.ts`**: Add `Review` interface
- **`src/components/ReviewDialog.tsx`**: Star rating + feedback submission dialog
- **`src/components/ReviewsSection.tsx`**: Display reviews list with avg rating
- **`src/pages/ProjectDetails.tsx`**: Add review button + reviews list for completed projects
- **`src/pages/PublicProfile.tsx`**: New public profile page with reviews
- **`src/App.tsx`**: Add `/profile/:id` route

