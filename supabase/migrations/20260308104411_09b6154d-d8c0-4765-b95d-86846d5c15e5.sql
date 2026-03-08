
-- =============================================
-- WeBuild Full Database Schema
-- =============================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  role text CHECK (role IN ('company', 'student', 'campus')),
  university text,
  company_name text,
  website text,
  logo_url text,
  skills text[] DEFAULT '{}',
  linkedin text,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS TABLE
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  required_skills text[] DEFAULT '{}',
  budget_min numeric DEFAULT 0,
  budget_max numeric DEFAULT 0,
  pricing_type text CHECK (pricing_type IN ('fixed', 'hourly', 'milestone')) DEFAULT 'fixed',
  duration text,
  start_date date,
  end_date date,
  status text CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by everyone" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete projects" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- 3. PROJECT MILESTONES
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones viewable by everyone" ON public.project_milestones
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage milestones" ON public.project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_milestones.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- 4. PROJECT APPLICATIONS
CREATE TABLE public.project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
  cover_letter text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, applicant_id)
);

ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications" ON public.project_applications
  FOR SELECT USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_applications.project_id
        AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can apply" ON public.project_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update own applications" ON public.project_applications
  FOR UPDATE USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_applications.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- 5. WALLETS
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = owner_id);

-- 6. TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('credit', 'debit', 'commission')) NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
        AND wallets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
        AND wallets.owner_id = auth.uid()
    )
  );

-- 7. MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject text,
  body text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- 8. CERTIFICATES
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_name text,
  project_title text,
  issued_at timestamptz DEFAULT now(),
  certificate_uid text UNIQUE DEFAULT gen_random_uuid()::text,
  qr_data text
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates viewable by everyone" ON public.certificates
  FOR SELECT USING (true);

CREATE POLICY "System can insert certificates" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 9. BATCHES
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  department text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Batches viewable by everyone" ON public.batches
  FOR SELECT USING (true);

CREATE POLICY "Campus can manage batches" ON public.batches
  FOR ALL USING (auth.uid() = campus_id);

-- 10. BATCH STUDENTS
CREATE TABLE public.batch_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (batch_id, student_id)
);

ALTER TABLE public.batch_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Batch students viewable by campus and student" ON public.batch_students
  FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.batches
      WHERE batches.id = batch_students.batch_id
        AND batches.campus_id = auth.uid()
    )
  );

CREATE POLICY "Campus can manage batch students" ON public.batch_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.batches
      WHERE batches.id = batch_students.batch_id
        AND batches.campus_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-create wallet on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (owner_id, balance, currency, created_at)
  VALUES (NEW.id, 0, 'USD', now())
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_wallets
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;
