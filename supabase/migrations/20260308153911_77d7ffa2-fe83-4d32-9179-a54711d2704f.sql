
-- 1. Company verification badge
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 2. Bookmarked projects
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Skill assessments / quizzes
CREATE TABLE public.skill_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  title text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]',
  passing_score integer DEFAULT 70,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skill_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes viewable by everyone" ON public.skill_quizzes FOR SELECT TO authenticated USING (true);

CREATE TABLE public.skill_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES public.skill_quizzes(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  score integer NOT NULL,
  passed boolean DEFAULT false,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);
ALTER TABLE public.skill_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.skill_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own badges" ON public.skill_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Learning resources
CREATE TABLE public.learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  skill_tags text[] DEFAULT '{}',
  resource_type text DEFAULT 'article',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources viewable by everyone" ON public.learning_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage resources" ON public.learning_resources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Campus-Company partnerships
CREATE TABLE public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campus_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties can view own partnerships" ON public.partnership_requests FOR SELECT TO authenticated USING (auth.uid() = company_id OR auth.uid() = campus_id);
CREATE POLICY "Companies can request partnerships" ON public.partnership_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = company_id);
CREATE POLICY "Parties can update partnerships" ON public.partnership_requests FOR UPDATE TO authenticated USING (auth.uid() = company_id OR auth.uid() = campus_id);

-- 6. Disputes
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  raised_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  against uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties can view own disputes" ON public.disputes FOR SELECT TO authenticated USING (auth.uid() = raised_by OR auth.uid() = against OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can raise disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Content reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Activity feed
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity viewable by everyone" ON public.activity_feed FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert activity" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
