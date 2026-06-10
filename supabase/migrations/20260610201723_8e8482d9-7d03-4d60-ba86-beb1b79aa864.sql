ALTER TABLE public.profiles DROP COLUMN IF EXISTS whm_data;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpanel_username;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpanel_domain;

ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS whm_config;
ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS whm_auto_provision;
ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS whm_auto_suspend;

ALTER TABLE public.products DROP COLUMN IF EXISTS whm_package;