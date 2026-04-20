
-- Restrict leads: deny SELECT/UPDATE/DELETE (no policies). INSERT remains for public form submissions.
-- Currently no SELECT policy exists, but authenticated users could still hit it. Add explicit deny via no-policy + revoke.
REVOKE SELECT, UPDATE, DELETE ON public.leads FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.lead_answers FROM anon, authenticated;

-- brand_settings: keep public SELECT (used to render branding), but ensure no public write
REVOKE INSERT, UPDATE, DELETE ON public.brand_settings FROM anon, authenticated;

-- form_questions: keep public SELECT, ensure no public write
REVOKE INSERT, UPDATE, DELETE ON public.form_questions FROM anon, authenticated;

-- Storage: lock down brand-assets bucket writes & listing
DROP POLICY IF EXISTS "Public upload brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public update brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public delete brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public list brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;

-- Allow public READ of individual files (bucket is public, used for <img src>) but not LIST
CREATE POLICY "Read individual brand-assets file"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'brand-assets');

-- No INSERT/UPDATE/DELETE policies = only service role (used by edge function) can write.
