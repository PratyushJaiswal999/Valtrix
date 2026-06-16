-- ============================================================
-- AI JOB MATCHING PLATFORM — SUPABASE SCHEMA
-- Run this entire script in Supabase SQL Editor (one go)
-- ============================================================

-- 1. Enable required extensions
create extension if not exists "pgcrypto";   -- for gen_random_uuid()
create extension if not exists "vector";     -- pgvector for embeddings


-- ============================================================
-- 2. USERS
-- ============================================================
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text unique not null,
  email           text unique not null,
  role            text not null check (role in ('candidate','recruiter','admin')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_users_clerk_id on users (clerk_user_id);


-- ============================================================
-- 3. COMPANIES
-- ============================================================
create table if not exists companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  domain        text unique,
  website       text,
  industry      text,
  verified      boolean not null default false,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);


-- ============================================================
-- 4. CANDIDATES
-- ============================================================
create table if not exists candidates (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid unique not null references users(id) on delete cascade,
  full_name                 text,
  phone                     text,
  bio                       text,
  resume_s3_key             text,
  experience_years          numeric,
  location                  text,
  preferred_location        text,
  preferred_job_type        text check (preferred_job_type in ('remote','hybrid','onsite')),
  agent_comm_enabled        boolean not null default false,
  profile_embedding         vector(1536),   -- pgvector: candidate profile embedding
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_candidates_user_id on candidates (user_id);


-- ============================================================
-- 5. RECRUITERS
-- ============================================================
create table if not exists recruiters (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique not null references users(id) on delete cascade,
  company_id          uuid references companies(id) on delete set null,
  full_name           text,
  designation         text,
  agent_comm_enabled  boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_recruiters_user_id on recruiters (user_id);
create index if not exists idx_recruiters_company_id on recruiters (company_id);


-- ============================================================
-- 6. SKILLS_MASTER
-- ============================================================
create table if not exists skills_master (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  category    text,
  verifiable  boolean not null default false
);


-- ============================================================
-- 7. CANDIDATE_SKILLS
-- ============================================================
create table if not exists candidate_skills (
  id                       uuid primary key default gen_random_uuid(),
  candidate_id             uuid not null references candidates(id) on delete cascade,
  skill_id                 uuid not null references skills_master(id) on delete cascade,
  proficiency_self_rated   text check (proficiency_self_rated in ('beginner','intermediate','advanced')),
  verified                 boolean not null default false,
  score                    numeric check (score >= 0 and score <= 100),
  verification_platform    text,
  last_verified_at         timestamptz,
  created_at               timestamptz not null default now(),
  unique (candidate_id, skill_id)
);

create index if not exists idx_candidate_skills_candidate on candidate_skills (candidate_id);
create index if not exists idx_candidate_skills_skill on candidate_skills (skill_id);


-- ============================================================
-- 8. JOBS
-- ============================================================
create table if not exists jobs (
  id                  uuid primary key default gen_random_uuid(),
  recruiter_id        uuid not null references recruiters(id) on delete cascade,
  title               text not null,
  description         text,
  skills_required     jsonb not null default '[]',  -- [{skill_id, weight, min_score}]
  experience_level    text check (experience_level in ('entry','mid','senior','lead')),
  location            text,
  job_type            text check (job_type in ('remote','hybrid','onsite')),
  status              text not null default 'draft' check (status in ('open','closed','draft')),
  description_embedding vector(1536),  -- pgvector: JD embedding for semantic match
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_jobs_recruiter on jobs (recruiter_id);
create index if not exists idx_jobs_status on jobs (status);


-- ============================================================
-- 9. ASSESSMENT_TEMPLATES
-- ============================================================
create table if not exists assessment_templates (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references jobs(id) on delete cascade,
  type                text not null check (type in ('coding','voice_interview','proctored_exam')),
  config              jsonb not null default '{}',  -- problem sets / interview blueprint
  time_limit_minutes  integer,
  created_by          uuid not null references recruiters(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_assessment_templates_job on assessment_templates (job_id);


-- ============================================================
-- 10. APPLICATIONS
-- ============================================================
create table if not exists applications (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  status        text not null default 'applied'
                  check (status in ('applied','screening','assessment_pending',
                                     'interview_scheduled','shortlisted','rejected','hired')),
  match_score   numeric,
  applied_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create index if not exists idx_applications_candidate on applications (candidate_id);
create index if not exists idx_applications_job on applications (job_id);
create index if not exists idx_applications_status on applications (status);


-- ============================================================
-- 11. MESSAGES (agent-to-agent, no thread table)
-- ============================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  sender_type     text not null check (sender_type in
                    ('candidate_agent','recruiter_agent','candidate_human','recruiter_human')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_application on messages (application_id);
create index if not exists idx_messages_created_at on messages (created_at);


-- ============================================================
-- 12. ASSESSMENT_SESSIONS
-- ============================================================
create table if not exists assessment_sessions (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references applications(id) on delete cascade, -- Nullable for stand-alone mock runs
  candidate_id    uuid not null references candidates(id) on delete cascade,
  template_id     uuid references assessment_templates(id) on delete set null,
  session_token   text unique not null,
  type            text not null check (type in ('coding','voice_interview','proctored_exam','mock')),
  status          text not null default 'pending'
                    check (status in ('pending','in_progress','completed','expired','abandoned')),
  platform        text,  -- e.g. 'veltrix', 'voiceai'
  config          jsonb not null default '{}'::jsonb, -- Stores mock interview config (difficulty, role, company, CV, etc.)
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  expires_at      timestamptz not null
);

create index if not exists idx_sessions_application on assessment_sessions (application_id);
create index if not exists idx_sessions_candidate on assessment_sessions (candidate_id);
create index if not exists idx_sessions_token on assessment_sessions (session_token);


-- ============================================================
-- 13. ASSESSMENT_RESULTS
-- ============================================================
create table if not exists assessment_results (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid unique not null references assessment_sessions(id) on delete cascade,
  scores            jsonb not null default '{}',
  overall_score     numeric,
  verdict           text check (verdict in ('hire','no_hire','borderline')),
  strengths         text,
  weaknesses        text,
  recommendation    text,
  raw_report_json   jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_results_session on assessment_results (session_id);


-- ============================================================
-- 14. PROCTORING_LOGS
-- ============================================================
create table if not exists proctoring_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references assessment_sessions(id) on delete cascade,
  event_type  text not null check (event_type in
                ('face_not_detected','gaze_away','tab_switch','window_blur','multiple_faces')),
  severity    text check (severity in ('low','medium','high')),
  metadata    jsonb default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists idx_proctoring_session on proctoring_logs (session_id);


-- ============================================================
-- 15. NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null check (type in
                ('agent_message','skill_verified','stage_changed','interview_scheduled','new_applicant')),
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications (user_id);
create index if not exists idx_notifications_read on notifications (read);


-- ============================================================
-- 16. NOTIFICATION_PREFERENCES
-- ============================================================
create table if not exists notification_preferences (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  notification_type   text not null,
  email_enabled       boolean not null default true,
  in_app_enabled      boolean not null default true,
  unique (user_id, notification_type)
);

create index if not exists idx_notif_prefs_user on notification_preferences (user_id);


-- ============================================================
-- 17. AGENT_STATE
-- ============================================================
create table if not exists agent_state (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,  -- candidate_id or recruiter_id
  agent_type  text not null check (agent_type in ('candidate','recruiter')),
  state_json  jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create index if not exists idx_agent_state_owner on agent_state (owner_id);


-- ============================================================
-- 18. PENDING_ACTIONS
-- ============================================================
create table if not exists pending_actions (
  id              uuid primary key default gen_random_uuid(),
  agent_state_id  uuid not null references agent_state(id) on delete cascade,
  action_type     text not null,
  payload         jsonb not null default '{}',
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists idx_pending_actions_agent on pending_actions (agent_state_id);
create index if not exists idx_pending_actions_status on pending_actions (status);


-- ============================================================
-- 19. TRIGGER TO SYNC SIGNUPS FROM auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_uuid uuid;
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, clerk_user_id, email, role, is_active)
  VALUES (
    NEW.id, 
    NEW.id::text, -- Map Supabase UUID to clerk_user_id text column
    NEW.email, 
    'candidate', 
    true
  )
  RETURNING id INTO new_user_uuid;

  -- Insert into public.candidates
  INSERT INTO public.candidates (user_id, full_name)
  VALUES (
    new_user_uuid, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
