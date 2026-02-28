

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, ShieldCheck, LogOut, Settings, Clock, BarChart3, Moon, Sun } from 'lucide-react';
import type { InterviewSession } from '@/types/interview';
import AuroraBackground from '@/components/AuroraBackground';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setSessions((data as InterviewSession[]) || []);
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  const doneSessions = sessions.filter(s => s.status === 'done');

  return (
    <div className="relative min-h-screen noise-bg transition-colors duration-500">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-[1100px] px-4 py-8">
        {/* Professional Header */}
        <header className="mb-12 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold tracking-tight">AiInterviewer</h1>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">for valtrix</span>
            </div>
            <p className="text-sm text-muted-foreground/80 font-medium italic">Authorized Access: {user?.user_metadata?.display_name || user?.email?.split('@')[0]}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-border bg-background/50 backdrop-blur-md hover:bg-accent transition-all">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="outline" size="icon" className="rounded-lg" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" className="rounded-lg shadow-lg" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Global Performance Metrics */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { icon: BarChart3, label: 'Total Assessments', value: doneSessions.length.toString(), color: 'text-blue-400' },
            // TODO: Wire up Performance Index and Compliance Rating to user stats from Supabase
            { icon: TrendingUp, label: 'Performance Index', value: '—', color: 'text-emerald-400' },
            { icon: ShieldCheck, label: 'Compliance Rating', value: '90.0%', color: 'text-amber-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="relative overflow-hidden rounded-xl border border-border/40 bg-background/40 p-6 shadow-xl backdrop-blur-md transition-all hover:border-primary/30 group">
              <div className="absolute top-0 right-0 h-16 w-16 opacity-[0.03] transition-opacity group-hover:opacity-10">
                <Icon className="h-full w-full" />
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 border border-border/50 ${color}`}>
                  <Icon className="h-6 w-6 shadow-glow" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60">{label}</p>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Primary Action Zone */}
        <div className="mb-12">
          <Button size="lg" className="h-14 gap-3 rounded-xl px-10 text-sm font-bold uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(var(--primary),0.4)] transition-all hover:scale-[1.01] active:scale-[0.98]" onClick={() => navigate('/setup')}>
            <Plus className="h-5 w-5" />
            Initiate Assessment
          </Button>
        </div>

        {/* Historical Ledger */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold tracking-tight">Recent Assessments</h2>
            <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border/50 via-border/10 to-transparent"></div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/20 border border-border/20" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center bg-muted/5">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="font-bold text-lg text-muted-foreground">System Idle</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Initiate your first recruitment session to populate the ledger.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => s.status === 'done' ? navigate(`/debrief/${s.id}`) : null}
                  className="group flex w-full items-center gap-5 rounded-xl border border-border/30 bg-background/30 p-5 text-left shadow-sm transition-all hover:bg-background/60 hover:border-primary/40 backdrop-blur-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase tracking-wide truncate">{s.interview_type} Interview Protocol</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {s.company || 'Standard'} • {s.difficulty} • {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    s.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : s.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {s.status === 'done' ? 'Verified' : s.status === 'in_progress' ? 'Active' : s.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Global Footer */}
        <div className="mt-16 text-center space-y-2 pb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400/60 font-medium">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
          <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.15em] text-blue-400/80 font-bold">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            Enterprise Secure Portal v4.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



