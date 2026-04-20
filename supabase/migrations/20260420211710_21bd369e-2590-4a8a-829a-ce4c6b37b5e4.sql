-- Restrict public SELECT on brand_settings: drop the public policy.
-- Public reads will now go through the edge function `public-brand` action, which only exposes non-sensitive fields.
DROP POLICY IF EXISTS "Anyone reads brand" ON public.brand_settings;