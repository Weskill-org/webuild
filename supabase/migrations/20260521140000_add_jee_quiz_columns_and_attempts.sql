-- Alter table public.skill_quizzes to add columns for JEE exams
ALTER TABLE public.skill_quizzes
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 180,
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS total_marks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb;

-- Create table public.quiz_attempts to store student attempts and details
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id uuid REFERENCES public.skill_quizzes(id) ON DELETE CASCADE,
    started_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone DEFAULT now(),
    score integer DEFAULT 0,
    total_marks integer DEFAULT 0,
    percentage numeric(5,2) DEFAULT 0.00,
    passed boolean DEFAULT false,
    section_scores jsonb DEFAULT '{}'::jsonb,
    answers jsonb DEFAULT '{}'::jsonb,
    correct_answers_count integer DEFAULT 0,
    wrong_answers_count integer DEFAULT 0,
    unattempted_answers_count integer DEFAULT 0,
    performance_summary text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy: users can read their own attempts
CREATE POLICY "Users can read their own attempts" ON public.quiz_attempts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create policy: users can insert their own attempts
CREATE POLICY "Users can insert their own attempts" ON public.quiz_attempts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create policy: admins can manage all attempts
CREATE POLICY "Admins can manage attempts" ON public.quiz_attempts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
