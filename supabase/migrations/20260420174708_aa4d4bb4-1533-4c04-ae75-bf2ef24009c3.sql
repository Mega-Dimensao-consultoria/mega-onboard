
-- Brand settings (single row)
CREATE TABLE public.brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT,
  razao_social TEXT DEFAULT 'Mega Dimensão Consultoria',
  nome_fantasia TEXT DEFAULT 'Mega Dimensão',
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  primary_color TEXT DEFAULT '210 65% 24%',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form questions
CREATE TABLE public.form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step INT NOT NULL DEFAULT 1,
  step_title TEXT,
  order_index INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text, textarea, email, radio, select, select_multi, masked
  options JSONB DEFAULT '[]'::jsonb,
  mask TEXT,
  required BOOLEAN DEFAULT true,
  -- conditional logic: show this question only if (depends_on question's answer) equals depends_value
  depends_on UUID REFERENCES public.form_questions(id) ON DELETE SET NULL,
  depends_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  solution_type TEXT,
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead answers
CREATE TABLE public.lead_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
  question_label TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.form_questions(step, order_index);
CREATE INDEX ON public.lead_answers(lead_id);

-- RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_answers ENABLE ROW LEVEL SECURITY;

-- Public read of brand & questions (white-label form needs them)
CREATE POLICY "Anyone reads brand" ON public.brand_settings FOR SELECT USING (true);
CREATE POLICY "Anyone reads questions" ON public.form_questions FOR SELECT USING (true);

-- Public can create lead & answers (form submission)
CREATE POLICY "Anyone inserts leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone inserts answers" ON public.lead_answers FOR INSERT WITH CHECK (true);

-- No public select on leads/answers; consultor reads via edge function (service role)

-- Storage bucket for brand assets (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);

CREATE POLICY "Public read brand-assets" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets');
CREATE POLICY "Public upload brand-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets');
CREATE POLICY "Public update brand-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'brand-assets');

-- Initial brand row
INSERT INTO public.brand_settings (razao_social, nome_fantasia, primary_color)
VALUES ('Mega Dimensão Consultoria', 'Mega Dimensão', '210 65% 24%');

-- Seed questions
DO $$
DECLARE
  q1 UUID; q2 UUID; q9 UUID;
BEGIN
  -- STEP 1: IDENTIFICAÇÃO
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options)
  VALUES (1, 'Identificação', 1, 'Qual a natureza da contratação?', 'radio',
    '[{"label":"Pessoa Física","value":"PF"},{"label":"Pessoa Jurídica","value":"PJ"}]'::jsonb)
  RETURNING id INTO q1;

  -- PF branch
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (1, 'Identificação', 2, 'Nome Completo', 'text', q1, 'PF');

  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (1, 'Identificação', 3, 'O projeto é para uso pessoal ou um novo empreendimento?', 'select',
    '[{"label":"Uso Pessoal","value":"Uso Pessoal"},{"label":"Novo Empreendimento","value":"Novo Empreendimento"}]'::jsonb,
    q1, 'PF');

  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (1, 'Identificação', 4, 'Já possui registro de marca ou domínio no seu nome?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb,
    q1, 'PF');

  -- PJ branch
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (1, 'Identificação', 5, 'Razão Social e Nome Fantasia', 'text', q1, 'PJ');

  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (1, 'Identificação', 6, 'Setor de Atuação', 'text', q1, 'PJ');

  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (1, 'Identificação', 7, 'Quem são os tomadores de decisão?', 'textarea', q1, 'PJ');

  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (1, 'Identificação', 8, 'O sistema deve ser integrado a algum ERP/CRM existente?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb,
    q1, 'PJ');

  -- STEP 2: SOLUÇÃO
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options)
  VALUES (2, 'Solução', 1, 'Qual solução sua empresa busca no momento?', 'select',
    '[{"label":"Loja Virtual","value":"Loja Virtual"},{"label":"Site Institucional / Landing Page","value":"Site Institucional"},{"label":"Blog / Portal de Conteúdo","value":"Blog"},{"label":"Sistema Customizado na Nuvem","value":"SaaS"}]'::jsonb)
  RETURNING id INTO q9;

  -- Loja Virtual
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (2, 'Solução', 2, 'Volume de Vendas: qual a expectativa de pedidos mensais?', 'text', q9, 'Loja Virtual');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (2, 'Solução', 3, 'Catálogo: quantas variações de produtos?', 'text', q9, 'Loja Virtual');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 4, 'Logística: qual gateway de frete utilizará?', 'select_multi',
    '[{"label":"Correios","value":"Correios"},{"label":"Transportadora Própria","value":"Transportadora Própria"},{"label":"Melhor Envio","value":"Melhor Envio"},{"label":"Frenet","value":"Frenet"}]'::jsonb,
    q9, 'Loja Virtual');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 5, 'Pagamento: já possui conta em gateway?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'Loja Virtual');

  -- Site Institucional
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 6, 'Objetivo de Conversão', 'select_multi',
    '[{"label":"Formulário","value":"Formulário"},{"label":"WhatsApp","value":"WhatsApp"},{"label":"Apresentação de Marca","value":"Apresentação de Marca"}]'::jsonb,
    q9, 'Site Institucional');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 7, 'Conteúdo: já possui textos e fotos profissionais?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Precisarei de auxílio","value":"Precisarei de auxílio"}]'::jsonb,
    q9, 'Site Institucional');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 8, 'Multilíngue: o site precisa de mais de um idioma?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'Site Institucional');

  -- Blog
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 9, 'Frequência de Postagem', 'select',
    '[{"label":"Diária","value":"Diária"},{"label":"Semanal","value":"Semanal"},{"label":"Mensal","value":"Mensal"}]'::jsonb,
    q9, 'Blog');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 10, 'Monetização: pretende exibir anúncios?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'Blog');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 11, 'Hierarquia: haverá múltiplos autores?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'Blog');

  -- SaaS
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, depends_on, depends_value)
  VALUES (2, 'Solução', 12, 'Descreva o processo manual que o sistema deve automatizar', 'textarea', q9, 'SaaS');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 13, 'Tipos de usuários (níveis de acesso)', 'select_multi',
    '[{"label":"Admin","value":"Admin"},{"label":"Operacional","value":"Operacional"},{"label":"Cliente Final","value":"Cliente Final"}]'::jsonb,
    q9, 'SaaS');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 14, 'O sistema lidará com arquivos pesados?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'SaaS');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options, depends_on, depends_value)
  VALUES (2, 'Solução', 15, 'Necessidade de conformidade LGPD específica?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb, q9, 'SaaS');

  -- STEP 3: INFRAESTRUTURA
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options)
  VALUES (3, 'Infraestrutura', 1, 'Domínio: já possui endereço ou precisamos registrar?', 'radio',
    '[{"label":"Já possuo","value":"Já possuo"},{"label":"Preciso registrar","value":"Preciso registrar"}]'::jsonb);
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options)
  VALUES (3, 'Infraestrutura', 2, 'Hospedagem: prefere que a Mega Dimensão gerencie?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Já possuo servidor","value":"Já possuo servidor"}]'::jsonb);
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, options)
  VALUES (3, 'Infraestrutura', 3, 'Manutenção: precisará de contrato de suporte pós-entrega?', 'radio',
    '[{"label":"Sim","value":"Sim"},{"label":"Não","value":"Não"}]'::jsonb);

  -- STEP 4: CONTATO
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type, mask)
  VALUES (4, 'Contato', 1, 'WhatsApp para contato', 'masked', '(99) 99999-9999');
  INSERT INTO public.form_questions (step, step_title, order_index, label, field_type)
  VALUES (4, 'Contato', 2, 'E-mail corporativo', 'email');
END $$;
