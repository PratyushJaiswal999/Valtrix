import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuroraBackground from '@/components/AuroraBackground';
import {
  GraduationCap, Briefcase, Github, Link2, BookOpen,
  Building2, Users, Globe, ArrowRight, ArrowLeft,
  Check, Sparkles, FileText, Code2, Target,
} from 'lucide-react';

/* ─── Types ─── */
interface CandidateForm {
  college: string;
  cgpa: string;
  github_url: string;
  leetcode_url: string;
  skills: string;
  resume_url: string;
}

interface RecruiterForm {
  company_name: string;
  designation: string;
  company_size: string;
  website: string;
}

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

/* ─── Step Progress ─── */
const StepProgress = ({
  steps, current, color,
}: {
  steps: string[]; current: number; color: 'blue' | 'violet';
}) => {
  const active = color === 'violet'
    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
    : 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30';
  const done = color === 'violet'
    ? 'bg-violet-500/20 border border-violet-500/40 text-violet-400'
    : 'bg-blue-500/20 border border-blue-500/40 text-blue-400';

  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
              i < current ? done : i === current ? active : 'bg-muted/50 border border-border/50 text-muted-foreground'
            }`}>
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
              i === current
                ? color === 'violet' ? 'text-violet-400' : 'text-blue-400'
                : 'text-muted-foreground/60'
            }`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-3 mb-5 h-px w-10 transition-all duration-500 ${
              i < current
                ? color === 'violet' ? 'bg-violet-500/50' : 'bg-blue-500/50'
                : 'bg-border/40'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── Field Component ─── */
const Field = ({
  label, id, value, onChange, placeholder, type = 'text', icon: Icon, hint,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ElementType; hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 border-border/50 bg-background/50 focus:ring-primary"
    />
    {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
  </div>
);

/* ═══════════════════════════════════════════
   CANDIDATE ONBOARDING
═══════════════════════════════════════════ */
const CandidateOnboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CandidateForm>({
    college: '', cgpa: '', github_url: '', leetcode_url: '', skills: '', resume_url: '',
  });

  const set = (key: keyof CandidateForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const STEPS = ['Academic', 'Profiles', 'Skills'];

  const handleFinish = () => {
    if (!user) return;
    setSaving(true);
    // candidate_profiles table doesn't exist in the current schema.
    // Store profile data in localStorage keyed by user ID so Profile page can read it.
    try {
      localStorage.setItem(`valtrix_candidate_profile_${user.id}`, JSON.stringify(form));
    } catch { /* ignore */ }
    toast({ title: 'Profile saved!', description: 'Welcome to Valtrix!' });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="w-full max-w-[520px]">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-2xl shadow-blue-500/40">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Candidate Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground/70">
          Tell us about yourself so we can personalise your experience.
        </p>
      </div>

      <StepProgress steps={STEPS} current={step} color="blue" />

      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

        {/* Step 0 — Academic */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold">Academic Background</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">Where did you study?</p>
            </div>
            <Field label="College / University" id="college" icon={BookOpen}
              value={form.college} onChange={set('college')}
              placeholder="e.g. IIT Bombay, Delhi University" />
            <Field label="CGPA / Percentage" id="cgpa" icon={Target}
              value={form.cgpa} onChange={set('cgpa')}
              placeholder="e.g. 8.5 / 10  or  85%" hint="Your most recent academic score" />
          </div>
        )}

        {/* Step 1 — Online Profiles */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold">Online Profiles</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">Link your coding & professional profiles.</p>
            </div>
            <Field label="GitHub URL" id="github" icon={Github}
              value={form.github_url} onChange={set('github_url')}
              placeholder="https://github.com/yourusername" type="url" />
            <Field label="LeetCode URL" id="leetcode" icon={Code2}
              value={form.leetcode_url} onChange={set('leetcode_url')}
              placeholder="https://leetcode.com/yourusername" type="url" />
            <Field label="Resume URL" id="resume" icon={FileText}
              value={form.resume_url} onChange={set('resume_url')}
              placeholder="https://drive.google.com/your-resume" type="url"
              hint="Link to your Google Drive, Notion, or any public URL" />
          </div>
        )}

        {/* Step 2 — Skills */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold">Skills</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">What technologies and skills do you have?</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skills" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Skills
              </Label>
              <textarea
                id="skills"
                value={form.skills}
                onChange={(e) => set('skills')(e.target.value)}
                placeholder="e.g. React, Node.js, Python, System Design, SQL..."
                rows={4}
                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
              <p className="text-[11px] text-muted-foreground/60">Comma-separated or one per line — as detailed as you like</p>
            </div>

            {/* Preview skill tags */}
            {form.skills && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.skills.split(/[,\n]/).filter(Boolean).map(skill => skill.trim()).filter(Boolean).map(skill => (
                  <span key={skill} className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[11px] font-semibold text-blue-400">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/30"
          >
            {saving ? 'Saving...' : 'Complete Setup'}
            {!saving && <Check className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground/50">
        All fields are optional — you can update them later from your profile.
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════
   RECRUITER ONBOARDING
═══════════════════════════════════════════ */
const RecruiterOnboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RecruiterForm>({
    company_name: '', designation: '', company_size: '', website: '',
  });

  const set = (key: keyof RecruiterForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const STEPS = ['Company', 'Presence'];

  const handleFinish = () => {
    if (!user) return;
    setSaving(true);
    // recruiter_profiles table doesn't exist in the current schema.
    // Store profile data in localStorage keyed by user ID so Profile page can read it.
    try {
      localStorage.setItem(`valtrix_recruiter_profile_${user.id}`, JSON.stringify(form));
    } catch { /* ignore */ }
    toast({ title: 'Profile saved!', description: 'Welcome to Valtrix Recruiter Hub!' });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="w-full max-w-[520px]">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/40">
          <Briefcase className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Recruiter Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground/70">
          Tell us about your company so candidates know who they're talking to.
        </p>
      </div>

      <StepProgress steps={STEPS} current={step} color="violet" />

      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

        {/* Step 0 — Company */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold">Company Details</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">Tell us about your organisation.</p>
            </div>
            <Field label="Company Name" id="company_name" icon={Building2}
              value={form.company_name} onChange={set('company_name')}
              placeholder="e.g. Acme Corp, Google, Startup Inc." />
            <Field label="Your Designation" id="designation" icon={Target}
              value={form.designation} onChange={set('designation')}
              placeholder="e.g. HR Manager, Technical Recruiter, Founder" />
            {/* Company Size */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Company Size
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {COMPANY_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => set('company_size')(size)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                      form.company_size === size
                        ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                        : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Online Presence */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold">Online Presence</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">Help candidates find and learn about your company.</p>
            </div>
            <Field label="Company Website" id="website" icon={Globe}
              value={form.website} onChange={set('website')}
              placeholder="https://yourcompany.com" type="url" />

            {/* Preview card */}
            {(form.company_name || form.designation) && (
              <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <p className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-3 font-bold">Profile Preview</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-lg">
                    {form.company_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-bold">{form.company_name || '—'}</p>
                    <p className="text-sm text-muted-foreground">{form.designation || '—'}</p>
                    {form.company_size && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{form.company_size} employees</p>
                    )}
                  </div>
                </div>
                {form.website && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-violet-400">
                    <Link2 className="h-3 w-3" />
                    <span className="truncate">{form.website}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/30"
          >
            {saving ? 'Saving...' : 'Complete Setup'}
            {!saving && <Check className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground/50">
        All fields are optional — you can update them later from your profile.
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════
   ROLE PICKER (shown when userRole is null)
═══════════════════════════════════════════ */
const RolePicker = ({ onSelect }: { onSelect: (role: 'candidate' | 'recruiter') => void }) => (
  <div className="w-full max-w-[520px]">
    <div className="mb-10 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-2xl shadow-blue-500/30">
        <Sparkles className="h-8 w-8 text-white animate-pulse" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Who are you?</h1>
      <p className="mt-2 text-sm text-muted-foreground/70">
        Select your role to get a personalised experience.
      </p>
    </div>

    <div className="space-y-4">
      {/* Recruiter card */}
      <button
        onClick={() => onSelect('recruiter')}
        className="group relative w-full overflow-hidden rounded-[20px] border border-violet-500/20 bg-background/50 p-7 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-violet-500/50 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)] active:scale-[0.99]"
      >
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-80 transition-opacity" />
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-display text-xl font-bold">Recruiter</span>
              <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Hire</span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground/80 mb-1">Hire & Assess Talent</p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">Create assessments, evaluate candidates, and streamline your hiring pipeline.</p>
          </div>
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/40 group-hover:border-violet-500/50 group-hover:bg-violet-500/10 transition-all">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
          </div>
        </div>
      </button>

      {/* Candidate card */}
      <button
        onClick={() => onSelect('candidate')}
        className="group relative w-full overflow-hidden rounded-[20px] border border-blue-500/20 bg-background/50 p-7 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/50 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] active:scale-[0.99]"
      >
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-80 transition-opacity" />
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-display text-xl font-bold">Candidate</span>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400">Practice</span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground/80 mb-1">Practice & Ace Interviews</p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">Simulate real interviews, get AI feedback, and land your dream job.</p>
          </div>
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/40 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   ROOT ONBOARDING PAGE
═══════════════════════════════════════════ */
const Onboarding = () => {
  const { user, signOut, setOnboardingComplete } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Pre-fill from context (role was stored in localStorage during signUp).
  // Only shows the RolePicker if no role is known yet.
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter' | null>(null);

  const handleRoleSelect = (role: 'candidate' | 'recruiter') => {
    if (!user) return;
    // Store role in localStorage so it survives a page refresh during onboarding,
    // but do NOT mark onboarding complete yet — that only happens in handleComplete.
    try { localStorage.setItem(`valtrix_role_${user.id}`, role); } catch { /* ignore */ }
    setSelectedRole(role);
  };

  const handleComplete = () => {
    if (!user || !selectedRole) {
      toast({ title: 'Error', description: 'Could not complete setup. Please try again.', variant: 'destructive' });
      return;
    }
    // Mark onboarding complete in localStorage + context
    setOnboardingComplete(user.id, selectedRole);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6 noise-bg">
      <AuroraBackground />

      {/* Top-right: show who's logged in + sign-out escape hatch */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md shadow-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {user?.email}
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-md shadow-sm hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="relative z-10 w-full flex justify-center">
        {!selectedRole ? (
          <RolePicker onSelect={handleRoleSelect} />
        ) : selectedRole === 'recruiter' ? (
          <RecruiterOnboarding onComplete={handleComplete} />
        ) : (
          <CandidateOnboarding onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
