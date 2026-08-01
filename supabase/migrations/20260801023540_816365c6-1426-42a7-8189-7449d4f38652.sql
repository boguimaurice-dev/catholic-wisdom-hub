CREATE TABLE public.institution_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  institution_name text NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  max_users integer NOT NULL DEFAULT 5,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.institution_codes TO authenticated;
GRANT ALL ON public.institution_codes TO service_role;
ALTER TABLE public.institution_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view institution codes" ON public.institution_codes
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Deny client inserts on institution_codes" ON public.institution_codes
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on institution_codes" ON public.institution_codes
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on institution_codes" ON public.institution_codes
FOR DELETE TO authenticated USING (false);

CREATE TABLE public.institution_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.institution_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

GRANT SELECT ON public.institution_code_redemptions TO authenticated;
GRANT ALL ON public.institution_code_redemptions TO service_role;
ALTER TABLE public.institution_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON public.institution_code_redemptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all redemptions" ON public.institution_code_redemptions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Deny client inserts on redemptions" ON public.institution_code_redemptions
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates on redemptions" ON public.institution_code_redemptions
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on redemptions" ON public.institution_code_redemptions
FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER update_institution_codes_updated_at
BEFORE UPDATE ON public.institution_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.redeem_institution_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rec public.institution_codes%ROWTYPE;
  _plan public.plans%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _rec FROM public.institution_codes
  WHERE upper(btrim(code)) = upper(btrim(_code))
  FOR UPDATE;

  IF NOT FOUND OR _rec.is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF _rec.expires_at IS NOT NULL AND _rec.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF EXISTS (SELECT 1 FROM public.institution_code_redemptions
             WHERE code_id = _rec.id AND user_id = _uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  IF _rec.used_count >= _rec.max_users THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached');
  END IF;

  SELECT * INTO _plan FROM public.plans WHERE id = _rec.plan_id;

  INSERT INTO public.institution_code_redemptions (code_id, user_id)
  VALUES (_rec.id, _uid);

  UPDATE public.institution_codes
  SET used_count = used_count + 1
  WHERE id = _rec.id;

  UPDATE public.user_subscriptions
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = _uid AND status = 'active';

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  VALUES (_uid, _rec.plan_id, 'active', now(), COALESCE(_rec.expires_at, now() + interval '365 days'));

  RETURN jsonb_build_object(
    'success', true,
    'plan_name', _plan.name,
    'institution_name', _rec.institution_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_institution_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_institution_code(text) TO authenticated;