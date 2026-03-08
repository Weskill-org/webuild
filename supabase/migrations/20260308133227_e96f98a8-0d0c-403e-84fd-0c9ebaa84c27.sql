
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, company_name, university, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'university',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE WHEN COALESCE(profiles.full_name, '') = '' THEN COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name) ELSE profiles.full_name END,
    company_name = CASE WHEN profiles.company_name IS NULL THEN NEW.raw_user_meta_data->>'company_name' ELSE profiles.company_name END,
    university = CASE WHEN profiles.university IS NULL THEN NEW.raw_user_meta_data->>'university' ELSE profiles.university END;
  RETURN NEW;
END;
$function$;
