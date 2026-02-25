import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AuroraBackground from '@/components/AuroraBackground';
import { useToast } from '@/hooks/use-toast';
import type { SessionConfig, InterviewType, Difficulty } from '@/types/interview';
import { ArrowLeft, ArrowRight, Briefcase, GraduationCap, Code, Users, Wrench, Mic, Check } from 'lucide-react';

const STEPS = ['Type', 'Difficulty', 'Duration', 'Details', 'Sound Check'];

const TYPES: { value: InterviewType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'hr', label: 'HR', icon: Users, desc: 'Culture fit, motivation, soft skills' },
  { value: 'behavioral', label: 'Behavioral', icon: GraduationCap, desc: 'STAR method, past experiences' },
  { value: 'technical', label: 'Technical', icon: Wrench, desc: 'Domain knowledge, system design' },
  { value: 'coding', label: 'Coding', icon: Code, desc: 'Problem solving, algorithms' },
  { value: 'custom', label: 'Custom', icon: Briefcase, desc: 'Mixed / your own focus' },
];

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', desc: 'Supportive, friendly, helps you succeed' },
  { value: 'medium', label: 'Medium', desc: 'Professional, probing follow-ups' },
  { value: 'hard', label: 'Hard', desc: 'Strict panel, pushes for clarity' },
];

const DURATIONS = [15, 30, 60, 120];

const SetupWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

  const [config, setConfig] = useState<SessionConfig>({
    interview_type: 'behavioral',
    difficulty: 'medium',
    duration_planned: 30,
    panel_size: 1,
    company: '',
    role_title: '',
    job_description: '',
    company_url: '',
    goals: '',
  });

  const update = <K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) =>
    setConfig(c => ({ ...c, [key]: value }));

  const testMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicOk(true);
    } catch {
      setMicOk(false);
    }
  };

  const startInterview = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user!.id,
        status: 'in_progress',
        interview_type: config.interview_type,
        difficulty: config.difficulty,
        duration_planned: config.duration_planned,
        panel_size: config.panel_size,
        company: config.company || null,
        role_title: config.role_title || null,
        job_description: config.job_description || null,
        company_url: config.company_url || null,
        goals: config.goals || null,
      })
      .select('id')
      .single();

    if (error || !data) {
      toast({ title: 'Error', description: 'Could not create session', variant: 'destructive' });
      setCreating(false);
      return;
    }
    navigate(`/interview/${data.id}`);
  };

  return (
    <div className="relative min-h-screen noise-bg">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[600px] px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < step ? 'bg-accent text-accent-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-[11px] text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-8 shadow-card animate-fade-slide-up" key={step}>
          {/* Step 0: Type */}
          {step === 0 && (
            <>
              <h2 className="mb-1 font-display text-heading">Interview Type</h2>
              <p className="mb-6 text-sm text-muted-foreground">What kind of interview are you preparing for?</p>
              <div className="space-y-3">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => update('interview_type', t.value)}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      config.interview_type === t.value ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <t.icon className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-sm text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 1: Difficulty */}
          {step === 1 && (
            <>
              <h2 className="mb-1 font-display text-heading">Difficulty Level</h2>
              <p className="mb-6 text-sm text-muted-foreground">How challenging should the interviewer be?</p>
              <div className="space-y-3">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => update('difficulty', d.value)}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      config.difficulty === d.value ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{d.label}</p>
                      <p className="text-sm text-muted-foreground">{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <>
              <h2 className="mb-1 font-display text-heading">Duration</h2>
              <p className="mb-6 text-sm text-muted-foreground">How long should the interview last?</p>
              <div className="grid grid-cols-2 gap-3">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => update('duration_planned', d)}
                    className={`rounded-xl border-2 p-4 text-center transition-all ${
                      config.duration_planned === d ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <p className="text-2xl font-semibold">{d}</p>
                    <p className="text-sm text-muted-foreground">minutes</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <>
              <h2 className="mb-1 font-display text-heading">Interview Details</h2>
              <p className="mb-6 text-sm text-muted-foreground">Optional: personalize your practice.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input value={config.company || ''} onChange={e => update('company', e.target.value)} placeholder="Google" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={config.role_title || ''} onChange={e => update('role_title', e.target.value)} placeholder="Senior PM" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Website</Label>
                  <Input value={config.company_url || ''} onChange={e => update('company_url', e.target.value)} placeholder="https://company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Job Description</Label>
                  <Textarea value={config.job_description || ''} onChange={e => update('job_description', e.target.value)} placeholder="Paste JD here…" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Your goals for this session</Label>
                  <Textarea value={config.goals || ''} onChange={e => update('goals', e.target.value)} placeholder="Practice STAR answers, work on confidence…" rows={2} />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Sound Check */}
          {step === 4 && (
            <>
              <h2 className="mb-1 font-display text-heading">Sound Check</h2>
              <p className="mb-6 text-sm text-muted-foreground">Test your microphone before we begin.</p>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                  micOk === true ? 'bg-accent/10' : micOk === false ? 'bg-destructive/10' : 'bg-muted'
                }`}>
                  <Mic className={`h-8 w-8 ${micOk === true ? 'text-accent' : micOk === false ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                {micOk === null && <Button variant="outline" onClick={testMic}>Test Microphone</Button>}
                {micOk === true && <p className="text-sm font-medium text-accent">Microphone working!</p>}
                {micOk === false && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-destructive">Microphone not detected</p>
                    <p className="mt-1 text-xs text-muted-foreground">You can still use text input mode.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={testMic}>Retry</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={startInterview} disabled={creating} className="shadow-glow">
              {creating ? 'Starting…' : 'Start Interview'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
