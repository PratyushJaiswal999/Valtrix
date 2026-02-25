export type SessionStatus = 'setup' | 'in_progress' | 'ended_early' | 'completed' | 'debrief_generating' | 'done' | 'failed';
export type InterviewType = 'hr' | 'technical' | 'coding' | 'behavioral' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TranscriptTurn {
  id?: string;
  session_id?: string;
  speaker: 'InterviewerA' | 'InterviewerB' | 'Candidate';
  text: string;
  timestamp_start: number;
  timestamp_end?: number;
  turn_index: number;
}

export interface SessionConfig {
  interview_type: InterviewType;
  difficulty: Difficulty;
  duration_planned: number;
  company?: string;
  role_title?: string;
  job_description?: string;
  company_url?: string;
  goals?: string;
  panel_size: number;
  cv_url?: string;
  cover_letter_url?: string;
}

export interface DebriefJSON {
  session_summary: {
    session_status: string;
    planned_duration_minutes: number;
    actual_duration_minutes: number;
    role_guess: string;
    company: string;
    interview_type: string;
    difficulty: string;
    topics_discussed: { topic: string; notes: string[] }[];
  };
  scores: {
    overall: number;
    communication_clarity: number;
    structure_star: number;
    role_fit: number;
    confidence_delivery: number;
    technical_depth: number;
  };
  strengths: {
    title: string;
    evidence: { timestamp_start: string; timestamp_end: string; quote: string };
    why_it_matters: string;
  }[];
  improvements: {
    title: string;
    issue: string;
    evidence: { timestamp_start: string; timestamp_end: string; quote: string };
    better_answer_example: string;
    micro_exercise: string;
  }[];
  delivery_metrics: {
    filler_word_estimate: number;
    pace_wpm_estimate: number;
    long_pause_estimate: number;
  };
  moments_that_mattered: {
    label: string;
    timestamp_start: string;
    timestamp_end: string;
    reason: string;
  }[];
  practice_plan_7_days: {
    day: number;
    focus: string;
    tasks: string[];
    time_minutes: number;
  }[];
  notes_if_low_data: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  status: SessionStatus;
  interview_type: InterviewType;
  difficulty: Difficulty;
  duration_planned: number;
  duration_actual?: number;
  company?: string;
  role_title?: string;
  job_description?: string;
  company_url?: string;
  cv_url?: string;
  cover_letter_url?: string;
  goals?: string;
  panel_size: number;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}
