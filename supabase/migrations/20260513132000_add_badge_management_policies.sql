-- Add management policies for skill_badges to allow admins to manage badge records
CREATE POLICY "Admins can manage badges" ON public.skill_badges 
FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
