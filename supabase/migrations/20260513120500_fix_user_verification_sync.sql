
-- Update handle_user_verified to sync verification for all roles
CREATE OR REPLACE FUNCTION public.handle_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When email_confirmed_at changes from NULL to a value, the user just confirmed their email
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) OR 
     (OLD.email_confirmed_at IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    -- Mark profile as verified for all roles
    UPDATE public.profiles
    SET verified = true, verified_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: Mark all users with confirmed emails as verified in profiles
UPDATE public.profiles p
SET verified = true, verified_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND (p.verified IS NULL OR p.verified = false);
