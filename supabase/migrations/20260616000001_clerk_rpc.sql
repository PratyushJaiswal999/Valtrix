-- 1. Create database helper function to return the parsed Clerk UID
CREATE OR REPLACE FUNCTION public.get_my_uid()
RETURNS text AS $$
  SELECT public.clerk_uid();
$$ LANGUAGE sql STABLE;

-- 2. Create sync_user RPC function to match the frontend query
CREATE OR REPLACE FUNCTION public.sync_user(email text, role text)
RETURNS void AS $$
DECLARE
  current_user_id text := public.clerk_uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (current_user_id, split_part(email, '@', 1))
  ON CONFLICT (user_id) DO UPDATE
  SET updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
