-- Allow accepted applicants to update the project status (e.g. to 'submitted' or 'completed')
CREATE POLICY "Accepted applicants can update projects" ON public.projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_applications
      WHERE project_applications.project_id = projects.id
        AND project_applications.applicant_id = auth.uid()
        AND project_applications.status = 'accepted'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_applications
      WHERE project_applications.project_id = projects.id
        AND project_applications.applicant_id = auth.uid()
        AND project_applications.status = 'accepted'
    )
  );
