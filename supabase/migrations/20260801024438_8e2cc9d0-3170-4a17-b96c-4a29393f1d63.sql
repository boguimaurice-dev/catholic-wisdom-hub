REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
REVOKE ALL ON FUNCTION public.redeem_institution_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_institution_code(text) TO authenticated, service_role;