
-- 1) Lock down has_role: revoke from public/anon, keep authenticated (needed for RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Explicit deny policies for authenticated users on daily_usage (writes must go through edge functions / service role)
DROP POLICY IF EXISTS "Deny client inserts on daily_usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Deny client updates on daily_usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Deny client deletes on daily_usage" ON public.daily_usage;
CREATE POLICY "Deny client inserts on daily_usage" ON public.daily_usage
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on daily_usage" ON public.daily_usage
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on daily_usage" ON public.daily_usage
  FOR DELETE TO authenticated USING (false);

-- 3) Explicit deny policies on user_roles (role assignment only via service role)
DROP POLICY IF EXISTS "Deny client inserts on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny client updates on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny client deletes on user_roles" ON public.user_roles;
CREATE POLICY "Deny client inserts on user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (false);

-- 4) Explicit deny policies on user_subscriptions (managed by Paystack webhook / edge functions)
DROP POLICY IF EXISTS "Deny client inserts on user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Deny client updates on user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Deny client deletes on user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Deny client inserts on user_subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on user_subscriptions" ON public.user_subscriptions
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on user_subscriptions" ON public.user_subscriptions
  FOR DELETE TO authenticated USING (false);
