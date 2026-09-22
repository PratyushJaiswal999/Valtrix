import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Plus, TrendingUp, ShieldCheck, Clock, BarChart3,
  Moon, Sun, LogOut, Briefcase, GraduationCap, Users,
  Building2, Target, Sparkles, ChevronRight, UserCircle2
} from 'lucide-react';
import type { InterviewSession } from '@/types/interview';
import AuroraBackground from '@/components/AuroraBackground';

/* ─────────────────────────────────────────────
   Candidate Dashboard
───────────────────────────────────────────── */
const CandidateDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [performanceIndex, setPerformanceIndex] = useState('—');
  const [complianceRating, setComplianceRating] = useState('—');
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      const { data: sessionData, error: sessionError } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionData && !sessionError) {
        const mapped = sessionData.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          status: s.status,
          interview_type: s.interview_type || 'behavioral',
          difficulty: s.difficulty || 'medium',
          duration_planned: s.duration_planned || 30,
          duration_actual: s.duration_actual || undefined,
          company: s.company || '',
          role_title: s.role_title || '',
          job_description: s.job_description || '',
          company_url: s.company_url || '',
          goals: s.goals || '',
          panel_size: s.panel_size || 1,
          audio_url: s.audio_url || undefined,
          created_at: s.created_at,
          updated_at: s.updated_at || s.created_at,
        }));
        setSessions(mapped as InterviewSession[]);
      }

      const { data: allSessions } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', user.id);

      if (allSessions && allSessions.length > 0) {
        const ids = allSessions.map(s => s.id);
        const { data: debriefData } = await supabase
          .from('session_debriefs')
          .select('debrief_json')
          .in('session_id', ids);

        if (debriefData && debriefData.length > 0) {
          let totalPerf = 0, count = 0;
          debriefData.forEach((d: any) => {
            const debrief = d.debrief_json?.debrief;
            const overall = debrief?.scores?.overall;
            if (overall !== undefined) {
              totalPerf += Number(overall);
              count++;
            }
          });
          if (count > 0) {
            setPerformanceIndex((totalPerf / count).toFixed(1));
            setComplianceRating((totalPerf / count).toFixed(1) + '%');
          }
        }
      }
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  const doneSessions = sessions.filter(s => s.status === 'done');

  return (
    <div className="relative min-h-screen noise-bg transition-colors duration-500">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 py-8">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">AI Interviewer</h1>
                <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold">Candidate Dashboard</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/80 font-medium italic mt-1">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-border bg-background/50 backdrop-blur-md hover:bg-accent transition-all">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate('/profile')}
              title="My Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:scale-105 transition-all border-2 border-white/10"
            >
              {user?.email?.[0].toUpperCase()}
            </button>
            <Button variant="destructive" size="icon" className="rounded-lg shadow-lg" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { icon: BarChart3, label: 'Total Sessions', value: doneSessions.length.toString(), color: 'text-blue-400' },
            { icon: TrendingUp, label: 'Performance Index', value: performanceIndex, color: 'text-emerald-400' },
            { icon: ShieldCheck, label: 'Compliance Rating', value: complianceRating, color: 'text-amber-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="relative overflow-hidden rounded-xl border border-border/40 bg-background/40 p-6 shadow-xl backdrop-blur-md transition-all hover:border-primary/30 group">
              <div className="absolute top-0 right-0 h-16 w-16 opacity-[0.03] transition-opacity group-hover:opacity-10">
                <Icon className="h-full w-full" />
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 border border-border/50 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60">{label}</p>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Start Interview CTA */}
        <div className="mb-12">
          <Button
            size="lg"
            className="h-14 gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl px-10 text-sm font-bold uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(37,99,235,0.5)] transition-all hover:scale-[1.01] active:scale-[0.98]"
            onClick={() => navigate('/setup')}
          >
            <Plus className="h-5 w-5" />
            Start New Interview
          </Button>
        </div>

        {/* Session History */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold tracking-tight">Recent Sessions</h2>
            <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border/50 via-border/10 to-transparent" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/20 border border-border/20" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center bg-muted/5">
              <GraduationCap className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="font-bold text-lg text-muted-foreground">No sessions yet</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Start your first interview to see your history here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => {
                const isActive = s.status === 'in_progress';
                const isDone   = s.status === 'done';

                const handleAbandon = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const { error } = await supabase
                    .from('interview_sessions')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('id', s.id);
                  if (!error) {
                    setSessions(prev =>
                      prev.map(x => x.id === s.id ? { ...x, status: 'failed' } : x)
                    );
                  }
                };

                return (
                  <div
                    key={s.id}
                    className="group flex w-full items-center gap-5 rounded-xl border border-border/30 bg-background/30 p-5 text-left shadow-sm transition-all hover:bg-background/60 hover:border-blue-500/30 backdrop-blur-sm"
                  >
                    {/* Icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                      <Clock className="h-5 w-5" />
                    </div>

                    {/* Info — clickable to debrief for done sessions */}
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => isDone ? navigate(`/debrief/${s.id}`) : isActive ? navigate(`/interview/${s.id}`) : null}
                    >
                      <p className="text-sm font-bold uppercase tracking-wide truncate">{s.interview_type} Interview</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {s.company || 'Standard'} • {s.difficulty} • {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </button>

                    {/* Status badge + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && (
                        <>
                          {/* Resume button */}
                          <button
                            onClick={() => navigate(`/interview/${s.id}`)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-500/20"
                          >
                            <ChevronRight className="h-3 w-3" />
                            Resume
                          </button>
                          {/* Abandon button */}
                          <button
                            onClick={handleAbandon}
                            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 active:scale-95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive transition-all"
                          >
                            End
                          </button>
                        </>
                      )}

                      <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        isDone                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : s.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : isActive              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {isDone ? 'Completed' : isActive ? 'Active' : s.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </section>

        {/* Footer */}
        <div className="mt-16 text-center space-y-2 pb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400/60 font-medium">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
          <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.15em] text-blue-400/80 font-bold">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Enterprise Secure Portal v4.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Recruiter Dashboard
───────────────────────────────────────────── */
const RecruiterDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [recruiterProfile, setRecruiterProfile] = useState<{
    company_name?: string;
    designation?: string;
    company_size?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // recruiter_profiles table not yet in schema — just stop loading
    setLoading(false);
  }, [user]);


  const quickActions = [
    {
      icon: Plus,
      title: 'Create Assessment',
      description: 'Design a new interview template for candidates.',
      color: 'from-violet-600 to-indigo-600',
      glow: 'shadow-violet-500/30',
      badge: 'New',
      onClick: () => navigate('/setup'),
    },
    {
      icon: Users,
      title: 'Manage Candidates',
      description: 'View candidate profiles and assessment results.',
      color: 'from-indigo-600 to-blue-600',
      glow: 'shadow-indigo-500/30',
      badge: 'Coming Soon',
      onClick: () => {},
    },
    {
      icon: Target,
      title: 'Hiring Pipeline',
      description: 'Track candidates through your hiring funnel.',
      color: 'from-blue-600 to-cyan-600',
      glow: 'shadow-blue-500/30',
      badge: 'Coming Soon',
      onClick: () => {},
    },
  ];

  const stats = [
    { icon: Users, label: 'Candidates Assessed', value: '—', color: 'text-violet-400' },
    { icon: Target, label: 'Positions Open', value: '—', color: 'text-indigo-400' },
    { icon: TrendingUp, label: 'Avg. Pass Rate', value: '—', color: 'text-emerald-400' },
  ];

  return (
    <div className="relative min-h-screen noise-bg transition-colors duration-500">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 py-8">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Recruiter Hub</h1>
                <span className="text-[9px] uppercase tracking-widest text-violet-400 font-bold">
                  {recruiterProfile?.company_name ?? 'Recruiter Dashboard'}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/80 font-medium italic mt-1">
              {recruiterProfile?.designation
                ? `${recruiterProfile.designation} · ${user?.email?.split('@')[0]}`
                : `Welcome back, ${user?.email?.split('@')[0]}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-border bg-background/50 backdrop-blur-md hover:bg-accent transition-all">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate('/profile')}
              title="My Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:scale-105 transition-all border-2 border-white/10"
            >
              {user?.email?.[0].toUpperCase()}
            </button>
            <Button variant="destructive" size="icon" className="rounded-lg shadow-lg" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="relative overflow-hidden rounded-xl border border-border/40 bg-background/40 p-6 shadow-xl backdrop-blur-md transition-all hover:border-violet-500/20 group">
              <div className="absolute top-0 right-0 h-16 w-16 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Icon className="h-full w-full" />
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 border border-border/50 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60">{label}</p>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold tracking-tight">Quick Actions</h2>
            <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border/50 via-border/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {quickActions.map(({ icon: Icon, title, description, color, glow, badge, onClick }) => (
              <button
                key={title}
                onClick={onClick}
                className="group relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 p-6 text-left shadow-lg backdrop-blur-md transition-all hover:border-violet-500/30 hover:scale-[1.02]"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg ${glow}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-base">{title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    badge === 'New'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted/60 text-muted-foreground border border-border/50'
                  }`}>
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">{description}</p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-violet-400 transition-colors">
                  {badge === 'New' ? 'Get started' : 'Coming soon'}
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Company Info (if available) */}
        {!loading && recruiterProfile && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold tracking-tight">Your Profile</h2>
              <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border/50 via-border/10 to-transparent" />
            </div>
            <div className="rounded-xl border border-border/30 bg-background/30 p-6 backdrop-blur-md flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20">
                <Building2 className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <p className="font-bold text-lg">{recruiterProfile.company_name || 'Your Company'}</p>
                <p className="text-sm text-muted-foreground">{recruiterProfile.designation || 'Recruiter'}</p>
                {recruiterProfile.company_size && (
                  <p className="text-xs text-muted-foreground/60 mt-1">{recruiterProfile.company_size} employees</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Coming Soon Banner */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 p-8 text-center backdrop-blur-md">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-400 animate-pulse" />
          <p className="font-display font-bold text-lg">Full Recruiter Suite Coming Soon</p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Candidate tracking, bulk assessments, team collaboration, and ATS integrations are in development.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center space-y-2 pb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400/60 font-medium">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
          <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.15em] text-violet-400/80 font-bold">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Recruiter Portal v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Root Dashboard — Role Router
───────────────────────────────────────────── */
const Dashboard = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (userRole === 'recruiter') return <RecruiterDashboard />;
  return <CandidateDashboard />;
};

export default Dashboard;
