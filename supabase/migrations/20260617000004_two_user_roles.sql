-- Drop old profile triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing profile tables if they exist
DROP TABLE IF EXISTS public.candidate_profiles CASCADE;
DROP TABLE IF EXISTS public.recruiter_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create candidate_profiles table
CREATE TABLE public.candidate_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_url TEXT,
  github_url TEXT,
  leetcode_url TEXT,
  college TEXT,
  cgpa TEXT,
  skills TEXT
);

-- Create recruiter_profiles table
CREATE TABLE public.recruiter_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  designation TEXT,
  website TEXT,
  company_size TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can select own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Candidate Profiles Policies
CREATE POLICY "Users can select own candidate profile" ON public.candidate_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate profile" ON public.candidate_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate profile" ON public.candidate_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Recruiter Profiles Policies
CREATE POLICY "Users can select own recruiter profile" ON public.recruiter_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recruiter profile" ON public.recruiter_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recruiter profile" ON public.recruiter_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract metadata fields, fallback to reasonable values
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidate');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, role, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    user_full_name,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.created_at, now())
  );
  
  -- Insert default role-specific profiles
  IF user_role = 'candidate' THEN
    INSERT INTO public.candidate_profiles (user_id)
    VALUES (NEW.id);
  ELSIF user_role = 'recruiter' THEN
    INSERT INTO public.recruiter_profiles (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind the trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
