-- 015_fix_anon_user_trigger.sql
-- Fix: anonymous sign-in users have no email, causing the trigger to fail
-- with "Database error creating anonymous user" (NOT NULL violation on users.email).
-- Solution: skip the users row for anonymous users — they don't need a profile.

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Anonymous users have no email — skip profile creation
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
