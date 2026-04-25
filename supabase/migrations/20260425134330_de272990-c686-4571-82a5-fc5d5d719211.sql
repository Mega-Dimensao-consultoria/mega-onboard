-- Recriar get_public_brand sem paypal_username
CREATE OR REPLACE FUNCTION public.get_public_brand()
 RETURNS TABLE(id uuid, nome_fantasia text, razao_social text, primary_color text, client_primary_color text, secondary_color text, accent_color text, background_color text, foreground_color text, client_secondary_color text, client_accent_color text, client_background_color text, client_foreground_color text, heading_font text, body_font text, logo_url text, client_logo_url text, hero_background_url text, hero_overlay_opacity numeric, hero_badge text, hero_title text, hero_subtitle text, hero_cta_label text, success_title text, success_message text, auth_title text, auth_subtitle text, auth_image_url text, auth_accent_color text, proposal_title text, proposal_intro text, proposal_after_accept text, proposal_accent_color text, footer_text text, footer_links jsonb, nav_links jsonb, site_title text, site_description text, client_login_cta text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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

ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS paypal_username;