-- Add positions column to projects (default 1 for backward compatibility)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS positions integer NOT NULL DEFAULT 1;
ALTER TABLE public.projects ADD CONSTRAINT projects_positions_check CHECK (positions >= 1);

-- Add per-applicant certificate and payout tracking to project_applications
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS certificate_issued boolean NOT NULL DEFAULT false;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS payout_released boolean NOT NULL DEFAULT false;
