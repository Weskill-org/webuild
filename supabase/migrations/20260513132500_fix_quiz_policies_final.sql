-- Drop the previous policies that used the broken has_role function
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.skill_quizzes;
DROP POLICY IF EXISTS "Admins can manage badges" ON public.skill_badges;

-- Re-create the policies using the reliable profiles.role check
CREATE POLICY "Admins can manage quizzes" ON public.skill_quizzes 
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

CREATE POLICY "Admins can manage badges" ON public.skill_badges 
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
