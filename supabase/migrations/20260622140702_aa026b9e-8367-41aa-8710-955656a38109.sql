
-- Revoke default PUBLIC EXECUTE on SECURITY DEFINER functions that should not be callable via the API
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_brand_for_authenticated() FROM PUBLIC, anon;

-- has_role still needs to be callable by authenticated users (used in RLS policy evaluation via auth.uid())
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brand_for_authenticated() TO authenticated;

-- Ensure the three intentionally public functions remain callable
GRANT EXECUTE ON FUNCTION public.submit_public_lead(jsonb, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_brand() TO anon, authenticated;
