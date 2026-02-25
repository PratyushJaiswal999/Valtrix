import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuroraBackground from '@/components/AuroraBackground';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { DebriefJSON, TranscriptTurn } from '@/types/interview';
import { ArrowLeft, RotateCcw, Star, AlertTriangle, TrendingUp, Calendar, Zap, Clock, Target, MessageSquare } from 'lucide-react';

const SCORE_LABELS: Record<string, string> = {
  communication_clarity: 'Communication',
  structure_star: 'Structure (STAR)',
  role_fit: 'Role Fit',
  confidence_delivery: 'Confidence',
  technical_depth: 'Technical Depth',
};

const Debrief = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [debrief, setDebrief] = useState<DebriefJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);

  const fetchDebrief = async () => {
    // Check for existing debrief
    const { data: existing } = await supabase
      .from('session_debriefs')
      .select('debrief_json')
      .eq('session_id', id!)
      .single();

    if (existing?.debrief_json && Object.keys(existing.debrief_json as object).length > 1) {
      setDebrief(existing.debrief_json as unknown as DebriefJSON);
      setLoading(false);
      return;
    }

    // Fetch transcript
    const { data: turns } = await supabase
      .from('transcript_turns')
      .select('*')
      .eq('session_id', id!)
      .order('turn_index', { ascending: true });

    const tt = (turns || []) as TranscriptTurn[];
    setTranscript(tt);

    if (tt.length < 2) {
      setError("We couldn't capture enough transcript data. Please try Chrome or enable microphone access.");
      setLoading(false);
      return;
    }

    // Generate debrief
    await generateDebrief(tt);
  };

  const generateDebrief = async (turns?: TranscriptTurn[]) => {
    setGenerating(true);
    setError(null);
    const turnsToUse = turns || transcript;

    // Fetch session info
    const { data: sessionData } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', id!)
      .single();

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-debrief', {
        body: {
          session: sessionData,
          transcript_turns: turnsToUse,
        },
      });

      if (fnErr) throw fnErr;
      if (!data?.debrief) throw new Error('No debrief returned');

      const debriefData = data.debrief as DebriefJSON;
      setDebrief(debriefData);

      // Save to DB
      const { data: existingDebrief } = await supabase
        .from('session_debriefs')
        .select('id')
        .eq('session_id', id!)
        .single();

      if (existingDebrief) {
        await supabase.from('session_debriefs').update({
          debrief_json: debriefData as any,
        }).eq('session_id', id!);
      } else {
        await supabase.from('session_debriefs').insert({
          session_id: id!,
          debrief_json: debriefData as any,
        });
      }

      // Update session status
      await supabase.from('interview_sessions').update({ status: 'done' }).eq('id', id!);
    } catch (e: any) {
      setError(e.message || 'Failed to generate debrief');
      await supabase.from('interview_sessions').update({ status: 'failed' }).eq('id', id!);
    }
    setGenerating(false);
    setLoading(false);
  };

  useEffect(() => { fetchDebrief(); }, [id]);

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-accent';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  if (loading || generating) {
    return (
      <div className="relative min-h-screen noise-bg">
        <AuroraBackground />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <h2 className="font-display text-heading">Generating Debrief…</h2>
          <p className="text-sm text-muted-foreground">Analyzing your interview performance</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen noise-bg">
        <AuroraBackground />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="font-display text-heading">Debrief Error</h2>
          <p className="max-w-md text-center text-muted-foreground">{error}</p>
          <div className="flex gap-3">
            <Button onClick={() => { setLoading(true); fetchDebrief(); }}>
              <RotateCcw className="mr-1 h-4 w-4" /> Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!debrief) return null;

  return (
    <div className="relative min-h-screen noise-bg">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <Button variant="outline" size="sm" onClick={() => generateDebrief()}>
            <RotateCcw className="mr-1 h-4 w-4" /> Regenerate
          </Button>
        </div>

        {/* Summary header */}
        <div className="mb-8 glass rounded-xl p-6 shadow-card">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                  {debrief.session_summary.interview_type}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                  {debrief.session_summary.difficulty}
                </span>
                {debrief.session_summary.session_status === 'ended_early' && (
                  <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">Partial</span>
                )}
              </div>
              <h1 className="font-display text-display">
                {debrief.session_summary.company || 'Interview'} Debrief
              </h1>
              <p className="text-sm text-muted-foreground">
                {debrief.session_summary.role_guess} · {debrief.session_summary.actual_duration_minutes} min
              </p>
              {debrief.notes_if_low_data && (
                <p className="mt-1 text-xs text-warning">{debrief.notes_if_low_data}</p>
              )}
            </div>
            {/* Overall score */}
            <div className="ml-auto flex flex-col items-center">
              <div className={`animate-score-reveal flex h-24 w-24 items-center justify-center rounded-full border-4 ${scoreColor(debrief.scores.overall)} border-current`}>
                <span className="font-display text-3xl font-bold">{debrief.scores.overall}</span>
              </div>
              <p className="mt-1 text-sm font-medium">Overall</p>
            </div>
          </div>
        </div>

        {/* Category scores */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(SCORE_LABELS).map(([key, label]) => {
            const score = debrief.scores[key as keyof typeof debrief.scores] as number;
            return (
              <div key={key} className="glass rounded-xl p-4 text-center shadow-card">
                <p className={`font-display text-2xl font-bold ${scoreColor(score)}`}>{score}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            );
          })}
        </div>

        {/* Topics discussed */}
        {debrief.session_summary.topics_discussed.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-heading flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Topics Discussed
            </h2>
            <div className="glass rounded-xl p-6 shadow-card space-y-3">
              {debrief.session_summary.topics_discussed.map((t, i) => (
                <div key={i}>
                  <p className="font-medium">{t.topic}</p>
                  <ul className="ml-4 mt-1 list-disc text-sm text-muted-foreground">
                    {t.notes.map((n, j) => <li key={j}>{n}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Strengths */}
          <section>
            <h2 className="mb-4 font-display text-heading flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" /> Strengths
            </h2>
            <div className="space-y-3">
              {debrief.strengths.map((s, i) => (
                <div key={i} className="glass rounded-xl p-5 shadow-card animate-fade-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.why_it_matters}</p>
                  {s.evidence.quote && (
                    <blockquote className="mt-2 border-l-2 border-accent pl-3 text-sm italic text-muted-foreground">
                      "{s.evidence.quote}"
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Improvements */}
          <section>
            <h2 className="mb-4 font-display text-heading flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Areas to Improve
            </h2>
            <div className="space-y-3">
              {debrief.improvements.map((imp, i) => (
                <div key={i} className="glass rounded-xl p-5 shadow-card animate-fade-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <p className="font-medium">{imp.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{imp.issue}</p>
                  {imp.evidence.quote && (
                    <blockquote className="mt-2 border-l-2 border-destructive pl-3 text-sm italic text-muted-foreground">
                      "{imp.evidence.quote}"
                    </blockquote>
                  )}
                  {imp.better_answer_example && (
                    <div className="mt-2 rounded-lg bg-accent/5 p-3">
                      <p className="text-xs font-medium text-accent">Better answer:</p>
                      <p className="text-sm">{imp.better_answer_example}</p>
                    </div>
                  )}
                  {imp.micro_exercise && (
                    <p className="mt-2 text-xs text-muted-foreground">💡 Exercise: {imp.micro_exercise}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Delivery metrics */}
        <section className="mt-8 mb-8">
          <h2 className="mb-4 font-display text-heading flex items-center gap-2">
            <Zap className="h-5 w-5" /> Delivery Metrics
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4 text-center shadow-card">
              <p className="font-display text-2xl font-bold">{debrief.delivery_metrics.filler_word_estimate}</p>
              <p className="text-xs text-muted-foreground">Filler words</p>
            </div>
            <div className="glass rounded-xl p-4 text-center shadow-card">
              <p className="font-display text-2xl font-bold">{debrief.delivery_metrics.pace_wpm_estimate}</p>
              <p className="text-xs text-muted-foreground">WPM</p>
            </div>
            <div className="glass rounded-xl p-4 text-center shadow-card">
              <p className="font-display text-2xl font-bold">{debrief.delivery_metrics.long_pause_estimate}</p>
              <p className="text-xs text-muted-foreground">Long pauses</p>
            </div>
          </div>
        </section>

        {/* Moments that mattered */}
        {debrief.moments_that_mattered.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-heading flex items-center gap-2">
              <Target className="h-5 w-5" /> Moments That Mattered
            </h2>
            <div className="space-y-2">
              {debrief.moments_that_mattered.map((m, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-xl p-4 shadow-card">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{m.label}</p>
                    <p className="text-sm text-muted-foreground">{m.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.timestamp_start}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7-day plan */}
        {debrief.practice_plan_7_days.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-heading flex items-center gap-2">
              <Calendar className="h-5 w-5" /> 7-Day Practice Plan
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {debrief.practice_plan_7_days.map(day => (
                <div key={day.day} className="glass rounded-xl p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Day {day.day}</p>
                    <span className="text-xs text-muted-foreground">{day.time_minutes} min</span>
                  </div>
                  <p className="mt-1 text-sm text-primary">{day.focus}</p>
                  <ul className="mt-2 space-y-1">
                    {day.tasks.map((t, i) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                        <span className="mt-0.5">•</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Debrief;
