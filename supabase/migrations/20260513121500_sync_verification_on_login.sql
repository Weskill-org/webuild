
-- Update handle_new_user to also set verified status if email is already confirmed (e.g. OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, university, company_name, verified, verified_at, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'company_name',
    (NEW.email_confirmed_at IS NOT NULL),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    university = COALESCE(EXCLUDED.university, profiles.university),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    verified = COALESCE(profiles.verified, EXCLUDED.verified),
    verified_at = COALESCE(profiles.verified_at, EXCLUDED.verified_at);
  RETURN NEW;
END;
$$;

-- Create a function to sync verification status whenever a user logs in
CREATE OR REPLACE FUNCTION public.handle_user_login_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If email is confirmed but profile is not verified, update it
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET verified = true, verified_at = COALESCE(verified_at, now())
    WHERE id = NEW.id AND (verified IS NULL OR verified = false);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for login (last_sign_in_at update)
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login_sync();
