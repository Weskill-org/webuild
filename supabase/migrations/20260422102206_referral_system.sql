-- ============================================================
-- 1. Add referral_code column to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- ============================================================
-- 2. Function to generate unique referral codes
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'WB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Trigger to auto-generate referral_code on profile insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code();

-- ============================================================
-- 4. Backfill referral codes for existing profiles
-- ============================================================
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================
-- 5. Create referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'revoked')),
  referrer_reward NUMERIC NOT NULL DEFAULT 0,
  referred_reward NUMERIC NOT NULL DEFAULT 0,
  referrer_credited BOOLEAN NOT NULL DEFAULT FALSE,
  referred_credited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Anti-fraud constraints
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referred_id),
  CONSTRAINT referrals_unique_referred UNIQUE (referred_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- ============================================================
-- 6. Enable RLS on referrals
-- ============================================================
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
  );

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update referrals (e.g., revoke)
CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 7. Seed referral_reward in platform_settings
-- ============================================================
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'referral_reward',
  '{"amount": 150, "currency": "INR", "enabled": true, "max_referrals_per_user": 50}'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
