-- 1. Add referred_by_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_code TEXT;

-- 2. Update the auth user trigger function to capture the referral code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, university, company_name, referred_by_code, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'referral_code', -- Capture here
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email        = EXCLUDED.email,
    full_name    = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role         = COALESCE(EXCLUDED.role, profiles.role),
    phone        = COALESCE(EXCLUDED.phone, profiles.phone),
    university   = COALESCE(EXCLUDED.university, profiles.university),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    referred_by_code = COALESCE(EXCLUDED.referred_by_code, profiles.referred_by_code);
  RETURN NEW;
END;
$function$;

-- 3. Create a function to process the referral reward
CREATE OR REPLACE FUNCTION public.process_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_referrer_id UUID;
    v_reward_amount INT;
    v_max_referrals INT;
    v_current_referrals INT;
    v_settings JSONB;
    v_referrer_wallet_id UUID;
    v_referred_wallet_id UUID;
BEGIN
    -- Only proceed if there's a referral code
    IF NEW.referred_by_code IS NULL OR NEW.referred_by_code = '' THEN
        RETURN NEW;
    END IF;

    -- Get reward settings
    SELECT value INTO v_settings FROM public.platform_settings WHERE key = 'referral_reward';
    IF v_settings IS NULL OR (v_settings->>'enabled')::BOOLEAN = FALSE THEN
        RETURN NEW;
    END IF;

    v_reward_amount := (v_settings->>'amount')::INT;
    v_max_referrals := (v_settings->>'max_referrals_per_user')::INT;

    -- Find referrer
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = NEW.referred_by_code;
    
    -- Anti-fraud: Referrer must exist and not be the same person
    IF v_referrer_id IS NULL OR v_referrer_id = NEW.id THEN
        RETURN NEW;
    END IF;

    -- Anti-fraud: Check max referrals
    SELECT COUNT(*) INTO v_current_referrals FROM public.referrals WHERE referrer_id = v_referrer_id AND status = 'completed';
    IF v_current_referrals >= v_max_referrals THEN
        RETURN NEW;
    END IF;

    -- Anti-fraud: Check if already referred
    IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- Start atomic updates
    -- 1. Create referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referrer_reward, referred_reward, status)
    VALUES (v_referrer_id, NEW.id, NEW.referred_by_code, v_reward_amount, v_reward_amount, 'completed');

    -- 2. Ensure wallets exist
    SELECT id INTO v_referrer_wallet_id FROM public.wallets WHERE owner_id = v_referrer_id;
    SELECT id INTO v_referred_wallet_id FROM public.wallets WHERE owner_id = NEW.id;

    -- 3. Update referrer wallet
    IF v_referrer_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + v_reward_amount WHERE id = v_referrer_wallet_id;
        INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
        VALUES (v_referrer_wallet_id, v_reward_amount, 'credit', 'Referral bonus for inviting ' || COALESCE(NEW.full_name, 'a friend'), NEW.id);
    END IF;

    -- 4. Update referred user wallet
    IF v_referred_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET balance = balance + v_reward_amount WHERE id = v_referred_wallet_id;
        INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
        VALUES (v_referred_wallet_id, v_reward_amount, 'credit', 'Welcome bonus (Referral from ' || NEW.referred_by_code || ')', v_referrer_id);
    END IF;

    -- 5. Send notifications (FIXED: use 'body' instead of 'message')
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES 
    (v_referrer_id, 'Referral Bonus! 🎁', 'You earned ' || v_reward_amount || ' coins for inviting ' || COALESCE(NEW.full_name, 'a friend') || '.', 'referral'),
    (NEW.id, 'Welcome Bonus! 🎁', 'You earned ' || v_reward_amount || ' coins for joining via referral code ' || NEW.referred_by_code || '.', 'referral');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Referral processing failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS trg_process_referral_on_signup ON public.profiles;
CREATE TRIGGER trg_process_referral_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_on_signup();
