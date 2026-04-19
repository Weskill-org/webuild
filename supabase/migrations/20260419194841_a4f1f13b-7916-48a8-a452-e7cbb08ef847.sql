CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
ON public.platform_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));