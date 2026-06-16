-- 1. Drop existing RLS policies that depend on the old user_id columns
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users view own sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users delete own sessions" ON public.interview_sessions;

DROP POLICY IF EXISTS "Users view own turns" ON public.transcript_turns;
DROP POLICY IF EXISTS "Users insert own turns" ON public.transcript_turns;

DROP POLICY IF EXISTS "Users view own debriefs" ON public.session_debriefs;
DROP POLICY IF EXISTS "Users insert own debriefs" ON public.session_debriefs;
DROP POLICY IF EXISTS "Users update own debriefs" ON public.session_debriefs;

DROP POLICY IF EXISTS "Users upload own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users view own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users view own files" ON storage.objects;

-- 2. Drop foreign keys and neutralize Supabase's auth.users trigger
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_user_id_fkey;

-- Redefine handle_new_user to be a no-op (safely bypasses schema permission issues with dropping trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Alter column types in public.profiles and public.interview_sessions to TEXT
-- Since user_id columns are UUID, we cast them to TEXT.
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.interview_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. Create helper function in public schema to extract Clerk User ID from JWT claims
CREATE OR REPLACE FUNCTION public.clerk_uid()
RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE sql STABLE;

-- 5. Recreate RLS policies for public.profiles using public.clerk_uid()
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (public.clerk_uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (public.clerk_uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (public.clerk_uid() = user_id);

-- 6. Recreate RLS policies for public.interview_sessions using public.clerk_uid()
CREATE POLICY "Users view own sessions" ON public.interview_sessions FOR SELECT USING (public.clerk_uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.interview_sessions FOR INSERT WITH CHECK (public.clerk_uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.interview_sessions FOR UPDATE USING (public.clerk_uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.interview_sessions FOR DELETE USING (public.clerk_uid() = user_id);

-- 7. Recreate RLS policies for public.transcript_turns using public.clerk_uid()
CREATE POLICY "Users view own turns" ON public.transcript_turns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = public.clerk_uid()));
CREATE POLICY "Users insert own turns" ON public.transcript_turns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = public.clerk_uid()));

-- 8. Recreate RLS policies for public.session_debriefs using public.clerk_uid()
CREATE POLICY "Users view own debriefs" ON public.session_debriefs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = public.clerk_uid()));
CREATE POLICY "Users insert own debriefs" ON public.session_debriefs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = public.clerk_uid()));
CREATE POLICY "Users update own debriefs" ON public.session_debriefs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = public.clerk_uid()));

-- 9. Recreate Storage RLS Policies using public.clerk_uid()
CREATE POLICY "Users upload own audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-audio' AND public.clerk_uid() = (storage.foldername(name))[1]);
CREATE POLICY "Users view own audio" ON storage.objects FOR SELECT USING (bucket_id = 'interview-audio' AND public.clerk_uid() = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-uploads' AND public.clerk_uid() = (storage.foldername(name))[1]);
CREATE POLICY "Users view own files" ON storage.objects FOR SELECT USING (bucket_id = 'interview-uploads' AND public.clerk_uid() = (storage.foldername(name))[1]);
