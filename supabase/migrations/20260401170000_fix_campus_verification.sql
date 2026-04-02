-- Fix: Update handle_new_user trigger to also save university and company_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, university, company_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'company_name',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    university = COALESCE(EXCLUDED.university, profiles.university),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name);
  RETURN NEW;
END;
$$;

-- Create a trigger function that marks campus profiles as verified when their email is confirmed
-- This fires when auth.users is updated (e.g. email confirmation)
CREATE OR REPLACE FUNCTION public.handle_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When email_confirmed_at changes from NULL to a value, the user just confirmed their email
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Only auto-verify campus users
    UPDATE public.profiles
    SET verified = true, verified_at = now()
    WHERE id = NEW.id
      AND role = 'campus';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email confirmation
DROP TRIGGER IF EXISTS on_user_verified ON auth.users;
CREATE TRIGGER on_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_verified();

-- Backfill: Mark existing campus users who already confirmed their email as verified
UPDATE public.profiles p
SET verified = true, verified_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'campus'
  AND u.email_confirmed_at IS NOT NULL
  AND (p.verified IS NULL OR p.verified = false);
