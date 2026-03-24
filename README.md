# AiInterviewer for Valtrix
LINK : https://valtrix-lilac.vercel.app/
AiInterviewer is an enterprise-grade, highly interactive AI-driven interview
platform designed to simulate realistic interview scenarios. It provides dynamic
conversational intelligence for various interview types, real-time voice
integration, and comprehensive post-interview analysis.

## 🚀 Key Features

- **Robust Authentication:** Secure access portal powered by Supabase Auth.
- **Intuitive Dashboard:** A central hub to track performance metrics and review
  past assessment ledgers.
- **Interview Setup Wizard:** Highly customizable interview configuration.
  Select from multiple types (HR, Behavioral, Technical, Coding, Custom),
  difficulties, and durations. Add custom contexts like target company and job
  descriptions.
- **Real-time Interview Room:** An immersive testing environment featuring text
  and voice support, visual waveforms, and dynamic AI interaction.
- **Comprehensive Debriefs:** Automated post-interview evaluation generating
  actionable feedback, performance scoring, verified transcripts, and pass/fail
  thresholds.
- **Premium UI/UX:** Built with Tailwind CSS and Shadcn UI, featuring a
  polished, enterprise-ready design with full Dark/Light mode support.

## 🛠️ Technology Stack

**Frontend Architecture:**

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
  (Radix UI primitives)
- [React Router](https://reactrouter.com/) for navigation
- [TanStack Query](https://tanstack.com/query/latest) for data fetching &
  caching
- [Lucide React](https://lucide.dev/) for iconography

**Backend & AI Infrastructure:**

- **[Supabase](https://supabase.com/):** PostgreSQL Database, Authentication,
  and Edge Functions.
- **Google Gemini AI:** Powers the conversational logic, question generation
  (`generate-question` edge function), and post-interview analysis
  (`generate-debrief` edge function).
- **Deepgram (Audio):** Utilized for high-speed, real-time Speech-to-Text (STT)
  and Text-to-Speech (TTS) capabilities.

## ⚙️ Local Development Setup

### 1. Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+)
- npm, yarn, bun, or pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local backend and
  edge functions)

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and configure your essential keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

_Note: Supabase Edge Functions will also require the `GEMINI_API_KEY` to be set
in your Supabase project secrets._

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080` (or the port
specified by Vite).

### 5. Running Supabase Edge Functions Locally

To test the AI integration locally, you can serve the Supabase functions:

```bash
supabase start
supabase functions serve --env-file ./supabase/.env.local
```

## 📂 Project Structure Overview

- `/src/pages/`: Main application views (`Auth`, `Dashboard`, `SetupWizard`,
  `InterviewRoom`, `Debrief`).
- `/src/components/`: Reusable UI components including Shadcn building blocks
  and layout wrappers.
- `/src/contexts/`: Global state management (`AuthContext`, `ThemeContext`).
- `/src/integrations/`: Third-party service initializations (e.g., Supabase
  client).
- `/supabase/functions/`: Deno-based edge functions handling interactions with
  the Gemini AI models.

## 🔒 Security

This application is designed for enterprise use. Access to the dashboard and
interview functions requires authentication. Database interactions are secured
using Supabase Row Level Security (RLS) policies to ensure users can only access
their own session data.
