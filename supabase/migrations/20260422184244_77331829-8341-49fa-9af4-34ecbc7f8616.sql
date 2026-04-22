CREATE TABLE public.plan_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  contract_id UUID NOT NULL,
  current_item_id UUID,
  current_product_id UUID,
  desired_product_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  client_note TEXT,
  consultor_note TEXT,
  decided_by UUID,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client creates own request"
  ON public.plan_change_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Client and consultor read"
  ON public.plan_change_requests FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultor updates"
  ON public.plan_change_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultor deletes"
  ON public.plan_change_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'consultor'::app_role));

CREATE TRIGGER set_pcr_updated_at
  BEFORE UPDATE ON public.plan_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pcr_client ON public.plan_change_requests(client_id);
CREATE INDEX idx_pcr_status ON public.plan_change_requests(status) WHERE status = 'pending';