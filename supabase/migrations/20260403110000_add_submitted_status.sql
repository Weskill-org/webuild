-- Add 'submitted' to the project status check constraint
-- This allows distinguishing between student submission and company confirmation

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'open', 'in_progress', 'submitted', 'completed', 'cancelled'));
