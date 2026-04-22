CREATE TABLE public.lead_proposed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  custom_name TEXT,
  custom_price_cents INTEGER,
  billing_cycle TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_proposed_items_lead ON public.lead_proposed_items(lead_id);

ALTER TABLE public.lead_proposed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads proposed items"
ON public.lead_proposed_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Consultor inserts proposed items"
ON public.lead_proposed_items
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultor updates proposed items"
ON public.lead_proposed_items
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultor deletes proposed items"
ON public.lead_proposed_items
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'consultor'::app_role));

CREATE TRIGGER update_lead_proposed_items_updated_at
BEFORE UPDATE ON public.lead_proposed_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();