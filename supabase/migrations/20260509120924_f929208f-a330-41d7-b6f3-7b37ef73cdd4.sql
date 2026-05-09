
-- 1) Admins table + helper
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = _uid) $$;

-- Only admins can read/manage admins table
DROP POLICY IF EXISTS "Admins read admins" ON public.admins;
CREATE POLICY "Admins read admins" ON public.admins FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage admins" ON public.admins;
CREATE POLICY "Admins manage admins" ON public.admins FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Bootstrap: promote oldest consultor to admin
INSERT INTO public.admins (user_id)
SELECT user_id FROM public.user_roles
WHERE role = 'consultor'
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

-- 2) Restrict user_roles management to admins only (no self-edit)
DROP POLICY IF EXISTS "Consultor manages roles delete" ON public.user_roles;
DROP POLICY IF EXISTS "Consultor manages roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Consultor manages roles update" ON public.user_roles;

CREATE POLICY "Admin manages roles insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

CREATE POLICY "Admin manages roles update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

CREATE POLICY "Admin manages roles delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());

-- 3) Drop paypal_client_secret column from brand_settings (now in Secrets only)
ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS paypal_client_secret;

-- 4) Lock down lead_answers public insert; provide secure RPC for public submission
DROP POLICY IF EXISTS "Anyone inserts answers" ON public.lead_answers;
DROP POLICY IF EXISTS "Anyone inserts leads" ON public.leads;

CREATE OR REPLACE FUNCTION public.submit_public_lead(p_lead jsonb, p_answers jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  _id := COALESCE(NULLIF(p_lead->>'id','')::uuid, gen_random_uuid());

  INSERT INTO public.leads (id, contact_name, contact_email, contact_whatsapp, solution_type)
  VALUES (
    _id,
    NULLIF(p_lead->>'contact_name',''),
    NULLIF(p_lead->>'contact_email',''),
    NULLIF(p_lead->>'contact_whatsapp',''),
    NULLIF(p_lead->>'solution_type','')
  );

  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' AND jsonb_array_length(p_answers) > 0 THEN
    INSERT INTO public.lead_answers (lead_id, question_id, question_label, answer)
    SELECT
      _id,
      NULLIF(a->>'question_id','')::uuid,
      a->>'question_label',
      a->>'answer'
    FROM jsonb_array_elements(p_answers) a;
  END IF;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.submit_public_lead(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_lead(jsonb, jsonb) TO anon, authenticated;
