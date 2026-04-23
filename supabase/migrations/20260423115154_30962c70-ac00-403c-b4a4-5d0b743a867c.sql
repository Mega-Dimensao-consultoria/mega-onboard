-- 1) Expand brand_settings
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS foreground_color text,
  ADD COLUMN IF NOT EXISTS client_secondary_color text,
  ADD COLUMN IF NOT EXISTS client_accent_color text,
  ADD COLUMN IF NOT EXISTS client_background_color text,
  ADD COLUMN IF NOT EXISTS client_foreground_color text,
  ADD COLUMN IF NOT EXISTS heading_font text,
  ADD COLUMN IF NOT EXISTS body_font text,
  ADD COLUMN IF NOT EXISTS hero_background_url text,
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS auth_title text,
  ADD COLUMN IF NOT EXISTS auth_subtitle text,
  ADD COLUMN IF NOT EXISTS auth_image_url text,
  ADD COLUMN IF NOT EXISTS auth_accent_color text,
  ADD COLUMN IF NOT EXISTS proposal_title text,
  ADD COLUMN IF NOT EXISTS proposal_intro text,
  ADD COLUMN IF NOT EXISTS proposal_after_accept text,
  ADD COLUMN IF NOT EXISTS proposal_accent_color text,
  ADD COLUMN IF NOT EXISTS client_logo_url text,
  ADD COLUMN IF NOT EXISTS nav_links jsonb DEFAULT '[]'::jsonb;

-- 2) Drop and recreate get_public_brand with new return type
DROP FUNCTION IF EXISTS public.get_public_brand();

CREATE OR REPLACE FUNCTION public.get_public_brand()
 RETURNS TABLE(
   id uuid, nome_fantasia text, razao_social text,
   primary_color text, client_primary_color text,
   secondary_color text, accent_color text, background_color text, foreground_color text,
   client_secondary_color text, client_accent_color text, client_background_color text, client_foreground_color text,
   heading_font text, body_font text,
   logo_url text, client_logo_url text,
   hero_background_url text, hero_overlay_opacity numeric,
   hero_badge text, hero_title text, hero_subtitle text, hero_cta_label text,
   success_title text, success_message text,
   auth_title text, auth_subtitle text, auth_image_url text, auth_accent_color text,
   proposal_title text, proposal_intro text, proposal_after_accept text, proposal_accent_color text,
   footer_text text, footer_links jsonb, nav_links jsonb,
   site_title text, site_description text, client_login_cta text,
   created_at timestamp with time zone
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    id, nome_fantasia, razao_social,
    primary_color, client_primary_color,
    secondary_color, accent_color, background_color, foreground_color,
    client_secondary_color, client_accent_color, client_background_color, client_foreground_color,
    heading_font, body_font,
    logo_url, client_logo_url,
    hero_background_url, hero_overlay_opacity,
    hero_badge, hero_title, hero_subtitle, hero_cta_label,
    success_title, success_message,
    auth_title, auth_subtitle, auth_image_url, auth_accent_color,
    proposal_title, proposal_intro, proposal_after_accept, proposal_accent_color,
    footer_text, footer_links, nav_links,
    site_title, site_description, client_login_cta,
    created_at
  FROM public.brand_settings
  ORDER BY created_at ASC
  LIMIT 1;
$function$;

-- 3) home_sections table
CREATE TABLE IF NOT EXISTS public.home_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL,
  title text,
  subtitle text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads visible home sections" ON public.home_sections;
CREATE POLICY "Anyone reads visible home sections"
  ON public.home_sections FOR SELECT
  USING (visible = true OR has_role(auth.uid(), 'consultor'::app_role));

DROP POLICY IF EXISTS "Consultor inserts home sections" ON public.home_sections;
CREATE POLICY "Consultor inserts home sections"
  ON public.home_sections FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'consultor'::app_role));

DROP POLICY IF EXISTS "Consultor updates home sections" ON public.home_sections;
CREATE POLICY "Consultor updates home sections"
  ON public.home_sections FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'consultor'::app_role));

DROP POLICY IF EXISTS "Consultor deletes home sections" ON public.home_sections;
CREATE POLICY "Consultor deletes home sections"
  ON public.home_sections FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'consultor'::app_role));

DROP TRIGGER IF EXISTS update_home_sections_updated_at ON public.home_sections;
CREATE TRIGGER update_home_sections_updated_at
  BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_home_sections_sort ON public.home_sections (sort_order);