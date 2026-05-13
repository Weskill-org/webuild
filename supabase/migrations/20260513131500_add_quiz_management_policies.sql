-- Add management policies for skill_quizzes to allow admins to create/update/delete quizzes
CREATE POLICY "Admins can manage quizzes" ON public.skill_quizzes 
FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
