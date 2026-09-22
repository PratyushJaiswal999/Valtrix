import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuroraBackground from '@/components/AuroraBackground';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, LogOut, Save, Moon, Sun,
  GraduationCap, Briefcase, Building2, Globe,
  Github, Code2, FileText, BookOpen, Target,
  Sparkles, Users, Mail, User2, CheckCircle2,
} from 'lucide-react';

/* ─── Shared Field ─── */
const Field = ({
  label, id, value, onChange, placeholder, type = 'text', icon: Icon, hint, readOnly,
}: {
  label: string; id: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ElementType; hint?: string; readOnly?: boolean;
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
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`h-11 border-border/50 bg-background/50 ${readOnly ? 'opacity-60 cursor-not-allowed' : 'focus:ring-primary'}`}
    />
    {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
  </div>
);

/* ─── Section Card ─── */
const SectionCard = ({
  title, subtitle, children, accentColor = 'blue', onSave, saving,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  accentColor?: 'blue' | 'violet'; onSave?: () => void; saving?: boolean;
}) => {
  const via = accentColor === 'violet' ? 'via-violet-500' : 'via-blue-500';
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-7 shadow-xl backdrop-blur-md">
      <div className={`absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent ${via} to-transparent opacity-40`} />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className={`shrink-0 gap-1.5 text-xs font-bold uppercase tracking-wider text-white ${
              accentColor === 'violet'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20'
            } shadow-lg`}
          >
            {saving ? 'Saving...' : <><Save className="h-3.5 w-3.5" /> Save</>}
          </Button>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   CANDIDATE PROFILE
═══════════════════════════════════════════ */
const CandidateProfile = () => {
  const { user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [form, setForm] = useState({
    college: '', cgpa: '', github_url: '', leetcode_url: '', skills: '', resume_url: '',
  });

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!user) return;
    // Fetch profiles
    supabase.from('profiles').select('full_name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setFullName(data.full_name || ''); });
    // Fetch candidate profile
    supabase.from('candidate_profiles').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({
          college: data.college || '',
          cgpa: data.cgpa || '',
          github_url: data.github_url || '',
          leetcode_url: data.leetcode_url || '',
          skills: data.skills || '',
          resume_url: data.resume_url || '',
        });
      });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Name updated!' });
    setSavingName(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('candidate_profiles').upsert({
      user_id: user.id,
      college: form.college || null,
      cgpa: form.cgpa || null,
      github_url: form.github_url || null,
      leetcode_url: form.leetcode_url || null,
      skills: form.skills || null,
      resume_url: form.resume_url || null,
    }, { onConflict: 'user_id' });

    if (error) toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Profile updated!' });
      await refreshProfile();
    }
    setSaving(false);
  };

  const skills = form.skills ? form.skills.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Avatar / Identity */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-cyan-600/5 p-7 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-bold text-white shadow-xl shadow-blue-500/30">
            {(fullName || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-display text-2xl font-bold">{fullName || user?.email?.split('@')[0]}</p>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Candidate
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user?.email}
            </p>
            {form.college && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground/70 mt-0.5">
                <BookOpen className="h-3.5 w-3.5" />
                {form.college}{form.cgpa ? ` · ${form.cgpa}` : ''}
              </p>
            )}
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.slice(0, 8).map(s => (
              <span key={s} className="rounded-full bg-blue-500/15 border border-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-400">
                {s}
              </span>
            ))}
            {skills.length > 8 && (
              <span className="rounded-full bg-muted/40 border border-border/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                +{skills.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Account Info */}
      <SectionCard title="Account" subtitle="Your public name and email" accentColor="blue"
        onSave={saveName} saving={savingName}>
        <Field label="Full Name" id="full_name" icon={User2}
          value={fullName} onChange={setFullName} placeholder="Your full name" />
        <Field label="Email Address" id="email" icon={Mail}
          value={user?.email || ''} readOnly />
      </SectionCard>

      {/* Academic */}
      <SectionCard title="Academic Background" subtitle="Your education details" accentColor="blue"
        onSave={saveProfile} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="College / University" id="college" icon={BookOpen}
            value={form.college} onChange={set('college')} placeholder="IIT Bombay" />
          <Field label="CGPA / Score" id="cgpa" icon={Target}
            value={form.cgpa} onChange={set('cgpa')} placeholder="8.5 / 10" />
        </div>
      </SectionCard>

      {/* Online Profiles */}
      <SectionCard title="Online Profiles" subtitle="Your coding and professional links" accentColor="blue"
        onSave={saveProfile} saving={saving}>
        <Field label="GitHub URL" id="github" icon={Github}
          value={form.github_url} onChange={set('github_url')}
          placeholder="https://github.com/username" type="url" />
        <Field label="LeetCode URL" id="leetcode" icon={Code2}
          value={form.leetcode_url} onChange={set('leetcode_url')}
          placeholder="https://leetcode.com/username" type="url" />
        <Field label="Resume URL" id="resume" icon={FileText}
          value={form.resume_url} onChange={set('resume_url')}
          placeholder="https://drive.google.com/your-resume" type="url" />
      </SectionCard>

      {/* Skills */}
      <SectionCard title="Skills" subtitle="Technologies and competencies" accentColor="blue"
        onSave={saveProfile} saving={saving}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Skills
          </Label>
          <textarea
            value={form.skills}
            onChange={(e) => set('skills')(e.target.value)}
            placeholder="React, Node.js, Python, SQL..."
            rows={3}
            className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map(s => (
              <span key={s} className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[11px] font-semibold text-blue-400">
                {s}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Logout */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
        <h2 className="font-display text-base font-bold text-destructive mb-1">Sign Out</h2>
        <p className="text-sm text-muted-foreground/70 mb-4">You will be logged out of your account.</p>
        <Button variant="destructive" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   RECRUITER PROFILE
═══════════════════════════════════════════ */
const RecruiterProfile = () => {
  const { user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [form, setForm] = useState({
    company_name: '', designation: '', company_size: '', website: '',
  });

  const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setFullName(data.full_name || ''); });
    supabase.from('recruiter_profiles').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({
          company_name: data.company_name || '',
          designation: data.designation || '',
          company_size: data.company_size || '',
          website: data.website || '',
        });
      });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Name updated!' });
    setSavingName(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('recruiter_profiles').upsert({
      user_id: user.id,
      company_name: form.company_name || null,
      designation: form.designation || null,
      company_size: form.company_size || null,
      website: form.website || null,
    }, { onConflict: 'user_id' });

    if (error) toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Profile updated!' });
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Avatar / Identity */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-indigo-600/5 p-7 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl font-bold text-white shadow-xl shadow-violet-500/30">
            {(form.company_name || fullName || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-display text-2xl font-bold">{fullName || user?.email?.split('@')[0]}</p>
              <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-400 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Recruiter
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user?.email}
            </p>
            {form.company_name && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground/70 mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                {form.designation ? `${form.designation} at ` : ''}{form.company_name}
                {form.company_size ? ` · ${form.company_size} employees` : ''}
              </p>
            )}
            {form.website && (
              <a
                href={form.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
              >
                <Globe className="h-3 w-3" />
                {form.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>

        {form.company_size && (
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-[11px] font-bold text-violet-400 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> {form.company_size} employees
            </span>
            <span className="rounded-full bg-muted/30 border border-border/40 px-3 py-1 text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Verified Recruiter
            </span>
          </div>
        )}
      </div>

      {/* Account Info */}
      <SectionCard title="Account" subtitle="Your name and email" accentColor="violet"
        onSave={saveName} saving={savingName}>
        <Field label="Full Name" id="full_name" icon={User2}
          value={fullName} onChange={setFullName} placeholder="Your full name" />
        <Field label="Email Address" id="email" icon={Mail}
          value={user?.email || ''} readOnly />
      </SectionCard>

      {/* Company Details */}
      <SectionCard title="Company Details" subtitle="Your organisation information" accentColor="violet"
        onSave={saveProfile} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" id="company_name" icon={Building2}
            value={form.company_name} onChange={set('company_name')} placeholder="Acme Corp" />
          <Field label="Your Designation" id="designation" icon={Target}
            value={form.designation} onChange={set('designation')} placeholder="HR Manager" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Company Size
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {COMPANY_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => set('company_size')(size)}
                className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold transition-all ${
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
      </SectionCard>

      {/* Online Presence */}
      <SectionCard title="Online Presence" subtitle="Website and company links" accentColor="violet"
        onSave={saveProfile} saving={saving}>
        <Field label="Company Website" id="website" icon={Globe}
          value={form.website} onChange={set('website')}
          placeholder="https://yourcompany.com" type="url" />
      </SectionCard>

      {/* Logout */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
        <h2 className="font-display text-base font-bold text-destructive mb-1">Sign Out</h2>
        <p className="text-sm text-muted-foreground/70 mb-4">You will be logged out of your recruiter account.</p>
        <Button variant="destructive" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   ROOT PROFILE PAGE
═══════════════════════════════════════════ */
const Profile = () => {
  const { userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isRecruiter = userRole === 'recruiter';
  const accentGradient = isRecruiter
    ? 'from-violet-600 to-indigo-600'
    : 'from-blue-600 to-cyan-500';
  const accentText = isRecruiter ? 'text-violet-400' : 'text-blue-400';

  return (
    <div className="relative min-h-screen noise-bg transition-colors duration-500">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-[680px] px-4 py-8">
        {/* Page Header */}
        <header className="mb-10 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-4 py-2 text-sm font-semibold text-muted-foreground backdrop-blur-md hover:text-foreground hover:border-border transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-2`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${accentGradient}`}>
                {isRecruiter
                  ? <Briefcase className="h-3.5 w-3.5 text-white" />
                  : <GraduationCap className="h-3.5 w-3.5 text-white" />
                }
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${accentText}`}>
                {isRecruiter ? 'Recruiter' : 'Candidate'}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-background/50 backdrop-blur-md hover:bg-accent transition-all"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground/70">
            View and edit your {isRecruiter ? 'recruiter' : 'candidate'} profile details.
          </p>
        </div>

        {/* Role-specific content */}
        {isRecruiter ? <RecruiterProfile /> : <CandidateProfile />}

        {/* Footer */}
        <div className="mt-12 text-center space-y-2 pb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400/60 font-medium">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
