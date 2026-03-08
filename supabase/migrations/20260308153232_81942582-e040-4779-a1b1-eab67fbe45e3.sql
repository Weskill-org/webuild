
-- Create deliverables storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('deliverables', 'deliverables', false);

-- RLS for deliverables storage
CREATE POLICY "Authenticated users can upload deliverables"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deliverables');

CREATE POLICY "Authenticated users can view deliverables"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'deliverables');

CREATE POLICY "Users can delete own deliverables"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'deliverables' AND (storage.foldername(name))[1] = auth.uid()::text);
