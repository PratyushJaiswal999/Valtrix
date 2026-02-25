
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  voice_preference TEXT DEFAULT 'default',
  captions_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Interview sessions
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','in_progress','ended_early','completed','debrief_generating','done','failed')),
  interview_type TEXT NOT NULL DEFAULT 'behavioral',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  duration_planned INTEGER NOT NULL DEFAULT 30,
  duration_actual INTEGER,
  company TEXT,
  role_title TEXT,
  job_description TEXT,
  company_url TEXT,
  cv_url TEXT,
  cover_letter_url TEXT,
  goals TEXT,
  panel_size INTEGER DEFAULT 1,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

-- Transcript turns
CREATE TABLE public.transcript_turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp_start REAL NOT NULL DEFAULT 0,
  timestamp_end REAL,
  turn_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transcript_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own turns" ON public.transcript_turns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own turns" ON public.transcript_turns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Session debriefs
CREATE TABLE public.session_debriefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  debrief_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_debriefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own debriefs" ON public.session_debriefs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own debriefs" ON public.session_debriefs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users update own debriefs" ON public.session_debriefs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.interview_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_debriefs_updated_at BEFORE UPDATE ON public.session_debriefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-audio', 'interview-audio', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-uploads', 'interview-uploads', false);

CREATE POLICY "Users upload own audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own audio" ON storage.objects FOR SELECT USING (bucket_id = 'interview-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own files" ON storage.objects FOR SELECT USING (bucket_id = 'interview-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
