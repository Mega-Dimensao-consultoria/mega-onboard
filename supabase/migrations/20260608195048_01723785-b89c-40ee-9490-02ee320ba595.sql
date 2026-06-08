-- Adiciona whm_config à brand_settings (armazenará host, user, api_token, port)
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS whm_config JSONB DEFAULT NULL;

-- Adiciona cpanel_username ao profile para vincular à conta WHM
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpanel_username TEXT DEFAULT NULL;

-- Garante que whm_config em brand_settings só seja acessível por consultores/admins (já protegido por RLS existente no select *, mas reforçando via RPC se necessário)
-- Como brand_settings já tem RLS que restringe o SELECT * apenas para consultores, estamos seguros.

GRANT SELECT, UPDATE ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
