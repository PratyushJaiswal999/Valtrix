# 🎯 Interview Preparation — ValtrixAI (AI Interview Platform)
> Deployed at: **https://valtrix-lilac.vercel.app/**

---

## 1. What problem does your project solve?

**Answer:**
Most students and job seekers prepare for interviews alone — reading theory, doing mock interviews with friends, or paying expensive coaching services. None of these give real-time, unbiased, intelligent feedback. ValtrixAI solves this by providing an **AI-powered mock interview platform** that simulates a real interview environment with a conversational AI interviewer, voice interaction, and detailed post-interview analysis.

It removes the barrier of cost, availability, and subjectivity — anyone can practice anytime and get structured, actionable feedback instantly.

---

## 2. Why did you choose this project?

**Answer:**
I chose this project because it sits at the intersection of **AI, real-time audio processing, and full-stack web development** — three areas I wanted to build deep expertise in. Also, interview anxiety is a real problem I've personally experienced, and I wanted to build something that directly helps students like me prepare better. It was also a good opportunity to work with cutting-edge APIs like Google Gemini and Deepgram in a real-world application.

---

## 3. What was your contribution?

**Answer:**
I built the entire full-stack application from scratch. Specifically:
- Designed and implemented the **React + TypeScript frontend** — all pages: Landing, Auth, Dashboard, Setup Wizard, Interview Room, and Debrief.
- Built the **Supabase Edge Functions** (Deno runtime) that call Google Gemini AI to generate interview questions and post-interview debrief reports.
- Integrated **Deepgram's real-time Speech-to-Text API** for voice input during interviews.
- Implemented **authentication** using Supabase Auth with email/password, role management (candidate/recruiter), and onboarding flow.
- Designed the **PostgreSQL database schema** with 18+ tables including Row Level Security policies.
- Deployed the frontend on **Vercel** and the backend on **Supabase**.

---

## 4. What technologies did you use?

**Answer:**

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Library | Tailwind CSS, Shadcn UI (Radix UI primitives) |
| State & Data | TanStack Query (React Query), React Context API |
| Routing | React Router v6 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| AI Engine | Google Gemini 2.5 Flash (`@google/genai`) |
| Voice STT | Deepgram Nova-3 (real-time WebSocket streaming) |
| Voice TTS | Web Speech API (`SpeechSynthesisUtterance`) |
| Edge Runtime | Deno (for Supabase Edge Functions) |
| Deployment | Vercel (frontend), Supabase Cloud (backend) |
| Testing | Vitest + React Testing Library |
| Build Tool | Vite (with SWC plugin for fast compilation) |

---

## 5. Why did you choose those technologies?

**Answer:**
- **React + TypeScript:** Industry standard for building scalable UIs; TypeScript adds type safety that prevented many runtime bugs.
- **Vite:** Extremely fast development server compared to CRA; great HMR (Hot Module Replacement).
- **Supabase:** Gives a full BaaS (Backend-as-a-Service) — PostgreSQL, Auth, Storage, and Edge Functions in one platform, avoiding the need to manage separate servers. Row Level Security (RLS) gives fine-grained data access control out of the box.
- **Google Gemini 2.5 Flash:** State-of-the-art LLM with low latency; ideal for generating contextual interview questions mid-conversation. It's context-aware, so it can follow up on exactly what the candidate said.
- **Deepgram Nova-3:** Best-in-class real-time Speech-to-Text with WebSocket streaming. Much lower latency than alternatives like Whisper for live use cases.
- **TanStack Query:** Handles server-state synchronization, caching, background refetching — far better than managing fetch calls manually.
- **Shadcn UI:** Component library built on accessible Radix primitives; gives a premium look without locking you into a design system you can't customize.

---

## 6. Explain the architecture.

**Answer:**

```
┌─────────────────────────────────────────────────┐
│               USER (Browser)                    │
│                                                 │
│  React SPA (Vite + TypeScript)                  │
│  ├── Pages: Auth / Dashboard / SetupWizard /    │
│  │          InterviewRoom / Debrief             │
│  ├── Context: AuthContext, ThemeContext,         │
│  │            PreferencesContext                │
│  └── TanStack Query for server-state            │
└────────────┬────────────────────────────────────┘
             │ HTTPS / WebSocket
┌────────────▼────────────────────────────────────┐
│           Supabase (BaaS)                        │
│                                                 │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Auth Module │  │   PostgreSQL Database     │  │
│  │(JWT sessions│  │  (18 tables, RLS enabled) │  │
│  └─────────────┘  └──────────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Storage    │  │   Edge Functions (Deno)   │  │
│  │(Audio files)│  │  generate-question        │  │
│  └─────────────┘  │  generate-debrief         │  │
│                   └──────────┬───────────────┘  │
└──────────────────────────────┼──────────────────┘
                               │
              ┌────────────────▼──────────────────┐
              │       Google Gemini 2.5 Flash AI   │
              └───────────────────────────────────┘
                               
             Deepgram (WebSocket STT) — direct from browser
```

**Key architectural decisions:**
- **Edge Functions** run at the network edge (close to users), reducing latency for AI calls.
- **RLS (Row Level Security)** in PostgreSQL ensures users can only query their own data — no need for a separate authorization layer.
- **Deepgram connects directly from the browser** via WebSocket to minimize audio round-trip latency.
- The frontend is a **Single Page Application** hosted on Vercel's global CDN.

---

## 7. Explain the database.

**Answer:**

The database is **PostgreSQL** hosted on Supabase. Key tables include:

| Table | Purpose |
|---|---|
| `users` | Core user accounts (linked to Supabase Auth) with role: `candidate`, `recruiter`, `admin` |
| `candidates` | Candidate profiles — bio, resume, skills, experience, pgvector embedding for AI matching |
| `recruiters` | Recruiter profiles linked to companies |
| `companies` | Company records |
| `skills_master` | Master list of skills with proficiency levels |
| `candidate_skills` | Junction table: candidate ↔ skill with scores |
| `jobs` | Job postings with JSON skills requirements and pgvector embedding |
| `interview_sessions` | Each mock interview session: type, difficulty, duration, status, config |
| `session_debriefs` | Stores AI-generated debrief JSON and full transcript |
| `assessment_sessions` | Formal assessment sessions linked to job applications |
| `assessment_results` | Scores, verdict (hire/no-hire/borderline), strengths/weaknesses |
| `applications` | Candidate-to-job applications with match score and pipeline status |
| `messages` | Agent-to-agent and human messages per application |
| `proctoring_logs` | Proctoring events (face not detected, tab switch, etc.) |
| `notifications` | User notifications |
| `agent_state` | AI agent state for autonomous matching agents |
| `pending_actions` | Actions awaiting human approval from agents |

**Notable design choices:**
- Uses **pgvector extension** for 1536-dimensional embeddings (for semantic job-candidate matching).
- **`pgcrypto`** extension for UUID generation.
- **Trigger (`on_auth_user_created`)**: When a user signs up via Supabase Auth, a database trigger automatically creates their `users` and `candidates` rows — no manual call needed.
- **RLS policies** ensure data isolation between users.
- All relationships use **UUID primary keys** with proper foreign key constraints.

---

## 8. Explain the complete flow.

**Answer:**

**Step 1 — Authentication:**
User signs up with email + password. They choose their role (candidate or recruiter). Supabase Auth creates a JWT session. A database trigger creates the user's profile rows automatically.

**Step 2 — Onboarding:**
First-time users go through an onboarding wizard to complete their profile (name, skills, job preferences).

**Step 3 — Dashboard:**
Candidate sees their interview history, performance metrics, and can start a new interview.

**Step 4 — Setup Wizard (5 steps):**
1. Choose interview type (HR, Behavioral, Technical, Coding, Custom)
2. Choose difficulty (Easy / Medium / Hard)
3. Set duration (15, 30, 60, or 120 minutes)
4. Add context: company name, role title, job description, goals
5. A/V check — browser requests camera + microphone permissions

On completion, an `interview_sessions` record is created in Supabase with `status: 'active'`.

**Step 5 — Interview Room:**
- AI Interviewer greets the candidate (difficulty-based greeting)
- Candidate responds via **voice (Deepgram WebSocket STT)** or **text input**
- Each candidate answer is sent to the `generate-question` Supabase Edge Function
- Edge Function sends the full conversation transcript to **Gemini 2.5 Flash** with a system prompt tailored to interview type and difficulty
- Gemini returns the next question; it's spoken aloud via **Web Speech API TTS**
- This loop continues until the candidate clicks "End"

**Step 6 — Post-Interview:**
- Audio chunks (recorded every 5 seconds) are uploaded to Supabase Storage
- Session status is updated to `done`
- Full transcript is saved to `session_debriefs`
- User is redirected to the Debrief page

**Step 7 — Debrief:**
- The `generate-debrief` Edge Function is called with the session info and transcript
- Gemini generates a structured JSON report with:
  - Overall score (0–100) and sub-scores (Communication, STAR Structure, Role Fit, Confidence, Technical Depth)
  - Strengths (with quoted evidence from transcript)
  - Improvement areas (with better answer examples)
  - Delivery metrics (filler words, WPM, long pauses)
  - Key moments that mattered
  - 7-day personalized practice plan
- The report is saved to `session_debriefs` and displayed to the user

---

## 9. What challenges did you face?

**Answer:**

1. **Real-time voice interaction latency:** Combining Deepgram STT → AI question generation → Web Speech TTS in sequence introduced noticeable delays. I minimized this by using Gemini Flash (faster model) and streaming audio in 250ms chunks to Deepgram.

2. **State synchronization in the Interview Room:** The transcript state in React was becoming stale inside async callbacks (a classic React closure problem). I solved this by using a `transcriptRef` alongside the React state — the ref always holds the latest value and is used inside async functions.

3. **Auth state timing:** There was a race condition where the app would redirect before Supabase Auth had confirmed the session. I fixed this with a `loading` state in AuthContext that blocks route rendering until `onAuthStateChange` fires.

4. **Supabase Edge Function cold starts:** Edge Functions on Deno can have cold start delays. I added a graceful fallback question if the AI call fails or times out, so the interview never breaks.

5. **Database trigger for auto-profile creation:** Getting the PostgreSQL trigger to correctly create both `users` and `candidates` rows on signup — handling the UUID mapping from Supabase Auth — required careful SECURITY DEFINER setup.

---

## 10. What bugs did you encounter?

**Answer:**

1. **Transcript reference bug:** When `submitCandidateAnswer` was called inside event handlers, it was reading a stale copy of the `transcript` state from the React closure. The latest answer was not being included in the Gemini API call. **Fix:** Added `transcriptRef` that's kept in sync with `useEffect`, and used `transcriptRef.current` in async functions.

2. **Deepgram WebSocket race condition:** The connection's `open` event sometimes fired before the `MediaRecorder` was fully initialized. **Fix:** Moved `MediaRecorder.start()` inside the `connection.on("open")` callback.

3. **`interview_sessions` RLS blocking inserts:** The Supabase RLS policy was too restrictive and blocked new session creation. **Fix:** Correctly scoped the INSERT policy to check `user_id = auth.uid()`.

4. **SpeechSynthesisUtterance voice loading:** `getVoices()` returns an empty array if called before voices are loaded. **Fix:** Added fallback — if no preferred voice found, let the browser pick its default.

5. **Audio upload path collision:** Multiple sessions by the same user overwrote each other. **Fix:** Changed the storage path to include both `user.id` and `session.id`.

---

## 11. How did you solve them?

Covered in the bugs section above — the key patterns I used were:
- **Refs for mutable values in async code** (React's stale closure problem)
- **Event-driven initialization** for WebSocket APIs
- **Defensive defaults/fallbacks** so no single point of failure breaks the user experience
- **Reading Supabase RLS policy docs** carefully to understand the auth context within policies

---

## 12. What would you improve?

**Answer:**

1. **Streaming AI responses:** Currently Gemini's response is awaited completely before TTS starts. Implementing streaming responses (token by token) would make the interviewer feel more natural and reduce perceived latency.

2. **Real proctoring:** The database has a `proctoring_logs` table with events like `face_not_detected` and `tab_switch`, but the actual webcam face detection (using a library like `face-api.js`) isn't implemented yet.

3. **Recruiter dashboard:** The schema supports recruiters posting jobs and reviewing candidates, but the recruiter-facing UI pages aren't fully built.

4. **pgvector semantic matching:** The `candidates` and `jobs` tables have `profile_embedding` and `description_embedding` columns for AI-powered job-candidate matching using cosine similarity — this feature is designed but not yet wired to the frontend.

5. **Rate limiting:** Currently, if many users simultaneously hit the Gemini API, rate limits could be hit. I'd implement a queue or token bucket system.

6. **Mobile responsiveness:** The Interview Room split-screen layout needs better optimization for small screens.

---

## 13. What happens if users increase significantly?

**Answer:**

- **Frontend:** Hosted on Vercel's global CDN, it auto-scales to handle any number of users — static assets are cached at the edge.
- **Database:** Supabase PostgreSQL can be scaled vertically (larger instance) and read replicas can be added. Connection pooling via PgBouncer (built into Supabase) handles many concurrent connections.
- **Edge Functions:** Supabase Edge Functions auto-scale horizontally — each invocation is isolated.
- **AI API (Gemini):** This is the bottleneck. Under heavy load, we'd hit rate limits. Solutions: implement a request queue, use multiple API keys, or negotiate higher quota with Google.
- **Deepgram:** Deepgram's API is designed for high concurrency — each WebSocket connection is independent.
- **Audio Storage:** Supabase Storage uses S3-compatible object storage — essentially unlimited scale.

---

## 14. What happens if the database goes down?

**Answer:**

- Users can't log in (Auth depends on the DB), create sessions, or retrieve debriefs.
- The Interview Room itself would still function for voice Q&A — the AI calls go through Edge Functions — but saving the transcript and ending the session would fail.
- **Mitigation:** Supabase has built-in high availability with automatic failover. For a production system, I'd also save the transcript to `localStorage` as a backup so it isn't lost if the session save fails. I'd also add retry logic with exponential backoff on DB writes.

---

## 15. Why SQL/NoSQL?

**Answer:**
I chose **SQL (PostgreSQL)** because:
- The data has clear **relational structure** — users have profiles, profiles link to sessions, sessions have debriefs — foreign keys enforce this integrity.
- **Transactions** are important — when ending an interview, I need to update the session status AND insert the debrief atomically.
- **Supabase provides PostgreSQL** natively with excellent tooling, migrations, and the pgvector extension for AI embeddings.
- The `debrief_json` and `config` columns use **JSONB** (PostgreSQL's binary JSON) for flexible, schema-less data within SQL — giving the best of both worlds.

NoSQL would make sense for unstructured data like logs or real-time message streams, but the core entities here are well-defined and relational.

---

## 16. How did authentication work?

**Answer:**

Authentication uses **Supabase Auth** (built on GoTrue):

1. **Sign Up:** `supabase.auth.signUp()` is called with email, password, and user metadata (display name, role). Supabase creates a user in `auth.users` and sends a confirmation email.

2. **Sign In:** `supabase.auth.signInWithPassword()` validates credentials and returns a **JWT access token** (valid 1 hour) and a **refresh token** (valid 30 days). These are stored in `localStorage` by the Supabase client automatically.

3. **Session Management:** `supabase.auth.onAuthStateChange()` subscribes to auth events — the `AuthContext` listens to this and updates the global React state whenever the session changes.

4. **Role Management:** User roles (`candidate`/`recruiter`) are stored in `user_metadata` (set during signUp) and also cached in `localStorage` using per-user keys (e.g., `valtrix_role_<userId>`). This avoids extra DB calls on every page load.

5. **Protected Routes:** Components check `AuthContext.user` and `AuthContext.loading` to guard routes — unauthenticated users are redirected to `/auth`.

6. **Password Reset:** `supabase.auth.resetPasswordForEmail()` sends a magic link that redirects to `/reset-password`.

7. **RLS (Row Level Security):** All Supabase DB queries automatically include the user's JWT. PostgreSQL RLS policies use `auth.uid()` to ensure users can only access their own rows.

---

## 17. How did you test your project?

**Answer:**

- **Unit Tests:** Used **Vitest** + **React Testing Library** (`@testing-library/react`) for component-level tests. Configuration is in `vitest.config.ts` with jsdom environment.
- **Manual Integration Testing:** Tested the full user flow — sign up → onboarding → create session → complete interview → view debrief — on both Chrome and Edge browsers.
- **API Testing:** Tested Supabase Edge Functions locally using `supabase functions serve` with a local `.env` file containing test API keys.
- **Cross-browser voice testing:** Tested Deepgram STT and Web Speech TTS on Chrome (where support is best) and verified the text-mode fallback works on browsers where mic isn't available.
- **Edge case testing:** Tested what happens when the AI API fails (verified the fallback question appears), when the user ends the interview early (verified "ended_early" status), and when no transcript is captured (verified error message).

---

## 18. How did you deploy it?

**Answer:**

**Frontend (Vercel):**
1. Pushed code to GitHub.
2. Connected the repository to Vercel.
3. Set environment variables in Vercel: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Vercel automatically runs `npm run build` (Vite builds a static bundle) and deploys to their global CDN.
5. Every push to `main` triggers an automatic redeployment.

**Backend (Supabase):**
1. Created a Supabase project at supabase.com.
2. Ran the SQL migration files in the Supabase SQL Editor to create all tables, indexes, triggers, and RLS policies.
3. Deployed Edge Functions using: `supabase functions deploy generate-question` and `supabase functions deploy generate-debrief`.
4. Set `GEMINI_API_KEY` as a Supabase project secret (available to Edge Functions at runtime via `Deno.env.get()`).
5. Configured Supabase Storage bucket (`interview-audio`) with appropriate access policies.

---

## 19. What happens if one component fails?

**Answer:**

| Component | Failure | Impact | Mitigation |
|---|---|---|---|
| **Gemini AI** | Rate limit / outage | No new questions generated | Fallback question shown ("Can you elaborate on that?") — interview continues |
| **Deepgram STT** | API error / network | Voice input stops | App switches to text-mode automatically with a toast notification |
| **Web Speech TTS** | Browser not supported | Interviewer voice silent | Transcript is still shown on screen — interview continues visually |
| **Supabase DB** | Down | Can't save sessions/read data | Session state maintained in React state / localStorage during the interview |
| **Supabase Auth** | Down | Login fails | No recovery — user must wait. Mitigated by Supabase's HA setup |
| **Vercel CDN** | Edge outage | Site unreachable | Vercel has 99.99% SLA; app is served from nearest healthy edge node |
| **Audio Storage** | Upload fails | Audio not saved | Interview transcript still saved — only audio archival is lost |

---

## 20. What exactly did YOU build?

**Answer:**

I personally built:

- **All frontend pages:** Auth (login/signup/reset-password), Landing, Dashboard with performance charts, the 5-step Setup Wizard with A/V permission checking, the Interview Room with split-screen video/AI panel and voice+text input, the Debrief page with scored analysis and 7-day practice plan, Onboarding, Profile, Settings.

- **Auth system:** The entire `AuthContext` — role management, onboarding state, localStorage helpers for multi-account support, and JWT session handling via Supabase.

- **Interview Room logic:** The real-time turn-based interview engine — Deepgram WebSocket integration, MediaRecorder for audio chunking, SpeechSynthesis for TTS, the `transcriptRef` fix for stale closures, and the endInterview flow.

- **Both Supabase Edge Functions:** `generate-question` (contextual AI question generation with difficulty-calibrated system prompts) and `generate-debrief` (structured JSON performance report generation).

- **Database schema:** Designed and wrote all 18 table migrations, indexes, foreign key relationships, RLS policies, and the `handle_new_user` trigger in PostgreSQL/plpgsql.

- **Deployment pipeline:** Vercel setup for frontend, Supabase function deployment, storage bucket configuration, environment variables.
