
-- Remove client write access on daily_usage (server increments via service role)
DROP POLICY IF EXISTS "Users can insert own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.daily_usage;

-- Remove client insert on user_subscriptions (only webhook/verify with service role can create)
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;

-- Revoke EXECUTE on internal trigger function from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
