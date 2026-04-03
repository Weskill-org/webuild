-- Add flags to projects table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS payout_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false;

-- Add fields to certificates table
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS course_name TEXT,
  ADD COLUMN IF NOT EXISTS payout_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS display_id TEXT;

-- Projects RLS is already allowing updates if auth.uid() == owner_id.
-- Let's ensure companies can insert certificates.
-- Check if policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'certificates' AND policyname = 'Companies can issue certificates for their projects'
  ) THEN
    CREATE POLICY "Companies can issue certificates for their projects"
      ON certificates
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = certificates.project_id
          AND projects.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
