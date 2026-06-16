-- 1. Drop Clerk RLS policies
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

-- 2. Alter column types in public.profiles and public.interview_sessions back to UUID
-- Note: This requires casting existing string user_ids to UUID.
-- If we have non-UUID Clerk IDs, they will fail to cast. In this case, we truncate the tables first.
TRUNCATE TABLE public.session_debriefs CASCADE;
TRUNCATE TABLE public.transcript_turns CASCADE;
TRUNCATE TABLE public.interview_sessions CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

ALTER TABLE public.profiles ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.interview_sessions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- 3. Restore foreign key constraints referencing auth.users(id)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.interview_sessions ADD CONSTRAINT interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Re-enable auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Recreate original RLS policies using auth.uid()
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own sessions" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own turns" ON public.transcript_turns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own turns" ON public.transcript_turns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users view own debriefs" ON public.session_debriefs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own debriefs" ON public.session_debriefs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users update own debriefs" ON public.session_debriefs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- 6. Recreate Storage RLS Policies
CREATE POLICY "Users upload own audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own audio" ON storage.objects FOR SELECT USING (bucket_id = 'interview-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own files" ON storage.objects FOR SELECT USING (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Drop Clerk specific functions
DROP FUNCTION IF EXISTS public.clerk_uid();
DROP FUNCTION IF EXISTS public.get_my_uid();
DROP FUNCTION IF EXISTS public.sync_user(text, text);
