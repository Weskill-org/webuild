
-- Fix function search_path security warning
ALTER FUNCTION public.update_updated_at() SET search_path = public;
