
CREATE POLICY "Anyone reads brand settings"
ON public.brand_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Consultor inserts brand"
ON public.brand_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'consultor'));

CREATE POLICY "Consultor updates brand"
ON public.brand_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'consultor'));

CREATE POLICY "Consultor deletes brand"
ON public.brand_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'consultor'));
