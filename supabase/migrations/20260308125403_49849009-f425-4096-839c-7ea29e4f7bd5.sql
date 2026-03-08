
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, reviewer_id, reviewee_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews (public reputation)
CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

-- Authenticated users can insert reviews for completed projects
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = reviews.project_id
        AND projects.status = 'completed'
    )
  );
