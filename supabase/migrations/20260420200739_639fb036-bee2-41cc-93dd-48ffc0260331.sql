-- Add technical solution fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS technical_solution text,
  ADD COLUMN IF NOT EXISTS technical_solution_updated_at timestamp with time zone;

-- Public bucket for briefing PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefings', 'briefings', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for briefings
DROP POLICY IF EXISTS "Public read briefings" ON storage.objects;
CREATE POLICY "Public read briefings"
ON storage.objects FOR SELECT
USING (bucket_id = 'briefings');