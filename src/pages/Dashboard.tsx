import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import AuroraBackground from '@/components/AuroraBackground';
import { Plus, TrendingUp, Target, Flame, LogOut, Settings, Clock, BarChart3 } from 'lucide-react';
import type { InterviewSession } from '@/types/interview';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

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
  const streak = doneSessions.length; // simplified streak

  return (
    <div className="relative min-h-screen noise-bg">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 py-8">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-display text-display tracking-tight">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Quick stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: BarChart3, label: 'Sessions', value: doneSessions.length.toString(), color: 'text-primary' },
            { icon: TrendingUp, label: 'Best Score', value: '—', color: 'text-accent' },
            { icon: Flame, label: 'Streak', value: `${streak} day${streak !== 1 ? 's' : ''}`, color: 'text-warning' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-xl p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Start Interview CTA */}
        <div className="mb-8">
          <Button size="lg" className="gap-2 rounded-xl px-8 py-6 text-base shadow-glow" onClick={() => navigate('/setup')}>
            <Plus className="h-5 w-5" />
            Start New Interview
          </Button>
        </div>

        {/* Recent sessions */}
        <section>
          <h2 className="mb-4 font-display text-heading">Recent Sessions</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center shadow-card">
              <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No sessions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Start your first interview to see results here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => s.status === 'done' ? navigate(`/debrief/${s.id}`) : null}
                  className="glass flex w-full items-center gap-4 rounded-xl p-4 text-left shadow-card transition-all hover:shadow-soft"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize">{s.interview_type} Interview</p>
                    <p className="text-sm text-muted-foreground">
                      {s.company || 'General'} · {s.difficulty} · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.status === 'done' ? 'bg-accent/10 text-accent'
                    : s.status === 'failed' ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {s.status === 'done' ? 'Reviewed' : s.status === 'in_progress' ? 'In Progress' : s.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
