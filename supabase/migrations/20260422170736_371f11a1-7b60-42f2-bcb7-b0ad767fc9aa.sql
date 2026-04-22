
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS hero_badge text DEFAULT 'Onboarding inteligente',
  ADD COLUMN IF NOT EXISTS hero_title text DEFAULT 'Vamos desenhar o projeto certo para você.',
  ADD COLUMN IF NOT EXISTS hero_subtitle text DEFAULT 'Em poucos minutos, você responde as perguntas estratégicas que orientam o briefing técnico do seu projeto.',
  ADD COLUMN IF NOT EXISTS hero_cta_label text DEFAULT 'Começar agora',
  ADD COLUMN IF NOT EXISTS success_title text DEFAULT 'Tudo certo!',
  ADD COLUMN IF NOT EXISTS success_message text DEFAULT 'Recebemos suas respostas. Em breve um consultor entrará em contato para apresentar a proposta.',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '© {year} Mega Dimensão Consultoria · Prospekta',
  ADD COLUMN IF NOT EXISTS footer_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS site_title text DEFAULT 'Prospekta · Onboarding Mega Dimensão',
  ADD COLUMN IF NOT EXISTS site_description text DEFAULT 'Onboarding inteligente da Mega Dimensão Consultoria.',
  ADD COLUMN IF NOT EXISTS client_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_login_cta text DEFAULT 'Acesse sua área do cliente';
