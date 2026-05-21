-- Alter wallets table default currency to 'INR'
ALTER TABLE public.wallets ALTER COLUMN currency SET DEFAULT 'INR';

-- Update the handle_new_profile trigger function to default to 'INR'
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (owner_id, balance, currency, created_at)
  VALUES (NEW.id, 0, 'INR', now())
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update existing wallets to 'INR'
UPDATE public.wallets SET currency = 'INR' WHERE currency = 'USD';
