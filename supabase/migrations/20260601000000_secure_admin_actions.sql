-- RPC to securely update a user's role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to change roles';
  END IF;

  -- Update the role
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;

-- RPC to securely toggle a user's verification status
CREATE OR REPLACE FUNCTION public.admin_toggle_user_verified(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to change verification status';
  END IF;

  -- Update the verification status
  UPDATE public.profiles
  SET
    verified = new_status,
    verified_at = CASE WHEN new_status THEN now() ELSE null END
  WHERE id = target_user_id;
END;
$$;

-- Trigger to prevent regular users from escalating privileges via direct UPDATE
CREATE OR REPLACE FUNCTION public.check_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only check if role or verified is actually being changed
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.verified IS DISTINCT FROM OLD.verified THEN
    -- Allow if auth.uid() is null (Service Role / Backend)
    IF auth.uid() IS NOT NULL THEN
      -- Check if the user making the request is an admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        -- If they are not an admin, we simply revert these specific fields to their old values
        -- so the rest of their profile update (like name, bio) still succeeds without an error.
        NEW.role = OLD.role;
        NEW.verified = OLD.verified;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_secure_profile_updates ON public.profiles;
CREATE TRIGGER ensure_secure_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_privilege_escalation();
