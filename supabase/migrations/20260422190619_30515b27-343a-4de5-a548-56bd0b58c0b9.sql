
-- =========================================================
-- 1. brand_settings: remove anon access to sensitive fields
-- =========================================================
DROP POLICY IF EXISTS "Anyone reads brand settings" ON public.brand_settings;

-- Authenticated users (consultor + cliente) can still read full row
CREATE POLICY "Authenticated reads brand settings"
  ON public.brand_settings FOR SELECT
  TO authenticated
  USING (true);

-- Public view exposing only non-sensitive branding fields
CREATE OR REPLACE VIEW public.brand_public AS
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

-- =========================================================
-- 2. briefings bucket: make private
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id = 'briefings';

DROP POLICY IF EXISTS "Public read briefings" ON storage.objects;

CREATE POLICY "Consultor reads briefings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'briefings' AND public.has_role(auth.uid(), 'consultor'::public.app_role));

-- =========================================================
-- 3. lead_proposed_items: lock down, expose via SECURITY DEFINER RPC
-- =========================================================
DROP POLICY IF EXISTS "Anyone reads proposed items" ON public.lead_proposed_items;

CREATE POLICY "Consultor reads proposed items"
  ON public.lead_proposed_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'consultor'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.lead_id = lead_proposed_items.lead_id
        AND c.client_id = auth.uid()
    )
  );

-- Public RPC: returns proposal items for a specific lead id (UUID is unguessable).
CREATE OR REPLACE FUNCTION public.get_public_proposal(_lead_id uuid)
RETURNS TABLE (
  lead_id uuid,
  contact_name text,
  solution_type text,
  technical_solution text,
  technical_solution_updated_at timestamptz,
  lead_created_at timestamptz,
  accepted boolean,
  item_id uuid,
  product_id uuid,
  custom_name text,
  custom_price_cents integer,
  billing_cycle text,
  quantity integer,
  sort_order integer,
  product_name text,
  product_price_cents integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id AS lead_id,
    l.contact_name,
    l.solution_type,
    l.technical_solution,
    l.technical_solution_updated_at,
    l.created_at AS lead_created_at,
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.lead_id = l.id) AS accepted,
    i.id AS item_id,
    i.product_id,
    i.custom_name,
    i.custom_price_cents,
    i.billing_cycle,
    i.quantity,
    i.sort_order,
    p.name AS product_name,
    p.price_cents AS product_price_cents
  FROM public.leads l
  LEFT JOIN public.lead_proposed_items i ON i.lead_id = l.id
  LEFT JOIN public.products p ON p.id = i.product_id
  WHERE l.id = _lead_id
  ORDER BY i.sort_order NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO anon, authenticated;

-- =========================================================
-- 4. Fix mutable search_path on queue helpers
-- =========================================================
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
