
-- Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  interval text NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_consultations_per_day integer NOT NULL DEFAULT 3,
  paystack_plan_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  paystack_subscription_code text,
  paystack_customer_code text,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily consultation count tracking
CREATE TABLE public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  consultation_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.daily_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.daily_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.daily_usage
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Seed plans
INSERT INTO public.plans (name, slug, price_amount, currency, features, max_consultations_per_day) VALUES
  ('Basique', 'basique', 0, 'XOF', '["3 consultations par jour", "Accès aux 8 experts", "Historique 7 jours"]'::jsonb, 3),
  ('Premium', 'premium', 2500, 'XOF', '["15 consultations par jour", "Accès aux 8 experts", "Historique illimité", "Synthèse vocale", "Export PDF"]'::jsonb, 15),
  ('Elite', 'elite', 5000, 'XOF', '["Consultations illimitées", "Accès aux 8 experts", "Historique illimité", "Synthèse vocale", "Export PDF", "Réponses prioritaires", "Support dédié"]'::jsonb, 999);
