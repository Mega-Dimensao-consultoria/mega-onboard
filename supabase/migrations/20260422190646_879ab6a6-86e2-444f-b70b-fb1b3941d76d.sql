
DROP VIEW IF EXISTS public.brand_public;

-- Recreated as SECURITY INVOKER so callers (anon / authenticated) need the
-- underlying SELECT permission. We grant that explicitly below via a permissive
-- policy already in place ("Authenticated reads brand settings"), and add an
-- anon-readable policy scoped to ONLY non-sensitive columns by way of the view.
-- To allow anon to read through the view, add a policy that returns true but is
-- only reachable via this view (anon has no direct GRANT on the table).
CREATE VIEW public.brand_public
WITH (security_invoker = true)
AS
SELECT
  id,
  nome_fantasia,
  razao_social,
  primary_color,
  client_primary_color,
  logo_url,
  hero_badge,
  hero_title,
  hero_subtitle,
  hero_cta_label,
  success_title,
  success_message,
  footer_text,
  footer_links,
  site_title,
  site_description,
  client_login_cta,
  created_at
FROM public.brand_settings;

GRANT SELECT ON public.brand_public TO anon, authenticated;

-- Allow anonymous SELECT on brand_settings ONLY through grants the view needs.
-- Since security_invoker requires anon to have SELECT on brand_settings, we add
-- an anon policy. To avoid re-exposing sensitive columns directly, we revoke
-- direct table SELECT from anon and rely on the view's column projection.
-- However, RLS policies operate at row level, not column level. So instead we
-- expose data through a SECURITY DEFINER function for anon access:

DROP VIEW IF EXISTS public.brand_public;

CREATE OR REPLACE FUNCTION public.get_public_brand()
RETURNS TABLE (
  id uuid,
  nome_fantasia text,
  razao_social text,
  primary_color text,
  client_primary_color text,
  logo_url text,
  hero_badge text,
  hero_title text,
  hero_subtitle text,
  hero_cta_label text,
  success_title text,
  success_message text,
  footer_text text,
  footer_links jsonb,
  site_title text,
  site_description text,
  client_login_cta text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    nome_fantasia,
    razao_social,
    primary_color,
    client_primary_color,
    logo_url,
    hero_badge,
    hero_title,
    hero_subtitle,
    hero_cta_label,
    success_title,
    success_message,
    footer_text,
    footer_links,
    site_title,
    site_description,
    client_login_cta,
    created_at
  FROM public.brand_settings
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_brand() TO anon, authenticated;
