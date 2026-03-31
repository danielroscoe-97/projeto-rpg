-- 048_fix_anon_triggers.sql
-- Fix: ensure ALL auth.users triggers gracefully handle anonymous players.
-- The onboarding trigger (046) was not skipping anonymous users, which can
-- cause a 500 on signInAnonymously() if the INSERT hits any constraint issue.
-- Also adds EXCEPTION guard to both triggers so auth signup is NEVER blocked.

-- 1. Re-apply the auth user profile trigger (from 015) with EXCEPTION guard
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Anonymous users (players joining via /join/[token]) have no email.
  -- Skip profile creation — they don't need a users row.
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, display_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth signup due to profile creation failure
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix onboarding trigger — skip anonymous users + add EXCEPTION guard
CREATE OR REPLACE FUNCTION create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Anonymous players don't need onboarding rows
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_onboarding (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_user_onboarding failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
