-- Adiciona whm_package à products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS whm_package TEXT DEFAULT NULL;

-- Adiciona cpanel_domain e whm_data à profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpanel_domain TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whm_data JSONB DEFAULT NULL;

-- Adiciona flags de automação à brand_settings
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS whm_auto_provision BOOLEAN DEFAULT FALSE;
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS whm_auto_suspend BOOLEAN DEFAULT FALSE;

-- Garantir que os tipos do Supabase sejam atualizados
-- (Será feito automaticamente após a migração)
