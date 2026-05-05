BEGIN;

-- Private bucket for food handler cert PDFs and other compliance docs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-credentials',
  'chef-credentials',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Chef can only upload to their own folder; reads are server-only via service role
CREATE POLICY "chef_credentials_chef_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chef-credentials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chef_credentials_chef_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chef-credentials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE: chefs re-upload by uploading a new file with a new timestamp
-- No DELETE: preserve audit trail; admin can delete via service role if needed

COMMIT;
