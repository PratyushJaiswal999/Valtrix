import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Mic, BrainCircuit, Moon, Sun, ShieldCheck,
  Briefcase, GraduationCap, ArrowLeft, CheckCircle2
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';

type AuthStep = 'role' | 'signin' | 'signup' | 'forgot';
type UserRole = 'recruiter' | 'candidate';

const Auth = () => {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('signin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (step === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) toast({ title: 'System Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Access Reset', description: 'Verification link dispatched.' });
      setLoading(false);
      return;
    }

    if (step === 'signup') {
      if (!selectedRole) {
        toast({ title: 'Role required', description: 'Please select your role first.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName, selectedRole);
      if (error) toast({ title: 'Registration Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Verification Required', description: 'Please confirm your email to complete registration.' });
    } else {
      // signin — pass selected role so localStorage is corrected even for returning users
      const { error } = await signIn(email, password, selectedRole ?? undefined);
      if (error) toast({ title: 'Authentication Failed', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const roleConfig = {
    recruiter: {
      icon: Briefcase,
      gradient: 'from-violet-600 to-indigo-600',
      glowColor: 'rgba(124,58,237,0.5)',
      accentColor: 'text-violet-400',
      borderColor: 'border-violet-500/40',
      bgColor: 'bg-violet-500/10',
      tagline: 'Hire & Assess Talent',
      description: 'Create assessments, evaluate candidates, and streamline your hiring pipeline.',
      badge: 'Recruiter Portal',
    },
    candidate: {
      icon: GraduationCap,
      gradient: 'from-blue-600 to-cyan-500',
      glowColor: 'rgba(37,99,235,0.5)',
      accentColor: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgColor: 'bg-blue-500/10',
      tagline: 'Practice & Ace Interviews',
      description: 'Simulate real interviews, get AI feedback, and land your dream job.',
      badge: 'Candidate Portal',
    },
  };

  const currentRoleConfig = selectedRole ? roleConfig[selectedRole] : null;
  const primaryGradient = currentRoleConfig
    ? `bg-gradient-to-r ${currentRoleConfig.gradient}`
    : 'bg-blue-600';

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 noise-bg transition-colors duration-300">
      <AuroraBackground />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-8 right-8 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 shadow-sm backdrop-blur-md hover:scale-110 transition-all active:scale-95"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-indigo-600" />}
      </button>

      <div className="relative z-10 w-full max-w-[500px]">
        {/* Branding */}
        <div className="mb-10 text-center">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${selectedRole ? `bg-gradient-to-br ${currentRoleConfig!.gradient}` : 'bg-primary'} shadow-2xl transition-all duration-500`}
            style={{ boxShadow: `0 0 40px -10px ${currentRoleConfig?.glowColor ?? 'rgba(37,99,235,0.6)'}` }}
          >
            {selectedRole
              ? (() => { const Icon = currentRoleConfig!.icon; return <Icon className="h-8 w-8 text-white" />; })()
              : <ShieldCheck className="h-8 w-8 text-white" />
            }
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            {selectedRole === 'recruiter' ? 'Recruiter Hub' : selectedRole === 'candidate' ? 'Candidate Portal' : 'AI Interviewer'}
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-500">
            {selectedRole ? currentRoleConfig!.badge : 'for Valtrix'}
          </p>
        </div>

        {/* ─── STEP 0: ROLE SELECTOR ─── */}
        {step === 'role' && (
          <div className="space-y-5">
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-widest">
                Who are you?
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Select your role to get a tailored experience
              </p>
            </div>

            {/* Recruiter Card */}
            <button
              onClick={() => handleRoleSelect('recruiter')}
              className="group relative w-full overflow-hidden rounded-[20px] border border-violet-500/20 bg-background/50 p-7 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-violet-500/50 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)] active:scale-[0.99]"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-80 transition-opacity" />

              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-display text-xl font-bold text-foreground">Recruiter</span>
                    <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">
                      Hire
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-semibold mb-1">
                    {roleConfig.recruiter.tagline}
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    {roleConfig.recruiter.description}
                  </p>
                </div>
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/40 group-hover:border-violet-500/50 group-hover:bg-violet-500/10 transition-all">
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                </div>
              </div>
            </button>

            {/* Candidate Card */}
            <button
              onClick={() => handleRoleSelect('candidate')}
              className="group relative w-full overflow-hidden rounded-[20px] border border-blue-500/20 bg-background/50 p-7 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/50 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] active:scale-[0.99]"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-80 transition-opacity" />

              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-display text-xl font-bold text-foreground">Candidate</span>
                    <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400">
                      Practice
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-semibold mb-1">
                    {roleConfig.candidate.tagline}
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    {roleConfig.candidate.description}
                  </p>
                </div>
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/40 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all">
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            </button>

            {/* Feature Pills */}
            <div className="mt-6 flex justify-center gap-4">
              {[
                { icon: Mic, label: 'Voice Powered' },
                { icon: BrainCircuit, label: 'AI Intelligence' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground shadow-sm">
                  <Icon className="h-3.5 w-3.5 text-blue-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEPS: SIGNIN / SIGNUP / FORGOT ─── */}
        {(step === 'signin' || step === 'signup' || step === 'forgot') && (
          <>
            {/* Role Badge + Back Button */}
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => { setStep('role'); setSelectedRole(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>

              {selectedRole && (
                <div className={`flex items-center gap-2 rounded-lg border ${currentRoleConfig!.borderColor} ${currentRoleConfig!.bgColor} px-3 py-1.5`}>
                  {(() => { const Icon = currentRoleConfig!.icon; return <Icon className={`h-3.5 w-3.5 ${currentRoleConfig!.accentColor}`} />; })()}
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${currentRoleConfig!.accentColor}`}>
                    {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  </span>
                  <CheckCircle2 className={`h-3 w-3 ${currentRoleConfig!.accentColor}`} />
                </div>
              )}
            </div>

            {/* Auth Card */}
            <div className="relative overflow-hidden rounded-[24px] border border-border/50 bg-background/60 p-10 shadow-2xl backdrop-blur-2xl">
              {/* Gradient top line */}
              <div
                className="absolute top-0 left-0 h-[2px] w-full opacity-60"
                style={{
                  background: selectedRole === 'recruiter'
                    ? 'linear-gradient(to right, transparent, rgb(139,92,246), transparent)'
                    : 'linear-gradient(to right, transparent, rgb(59,130,246), transparent)'
                }}
              />

              <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
                {step === 'signin'
                  ? selectedRole === 'recruiter' ? 'Recruiter Login' : 'Candidate Login'
                  : step === 'signup'
                  ? selectedRole === 'recruiter' ? 'Create Recruiter Account' : 'Create Candidate Account'
                  : 'Secure Recovery'}
              </h2>
              <p className="mb-8 text-sm text-muted-foreground/90 font-medium">
                {step === 'signin'
                  ? selectedRole === 'recruiter'
                    ? 'Access your hiring dashboard and candidate assessments.'
                    : 'Access your interview sessions and performance analytics.'
                  : step === 'signup'
                  ? selectedRole === 'recruiter'
                    ? 'Set up your recruiter profile and start assessing candidates.'
                    : 'Create your profile and start practicing interviews.'
                  : 'Enter your email to receive a password reset link.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      className="h-11 border-border/50 bg-background/50 focus:ring-blue-500"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={selectedRole === 'recruiter' ? 'Jane Smith' : 'Alex Johnson'}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {selectedRole === 'recruiter' ? 'Corporate Email' : 'Email Address'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-11 border-border/50 bg-background/50"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === 'recruiter' ? 'recruiter@company.com' : 'you@email.com'}
                  />
                </div>

                {step !== 'forgot' && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="h-11 border-border/50 bg-background/50"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className={`h-12 w-full font-bold uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] ${
                    selectedRole === 'recruiter'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/30'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/30'
                  }`}
                  disabled={loading}
                >
                  {loading
                    ? 'Processing...'
                    : step === 'signin'
                    ? 'Sign In'
                    : step === 'signup'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/40 pt-6 text-[11px] font-bold uppercase tracking-widest">
                {step === 'signin' && (
                  <>
                    <button
                      onClick={() => setStep('forgot')}
                      className="text-muted-foreground hover:text-blue-500 transition-colors"
                    >
                      Forgot Password?
                    </button>
                    <div className="text-muted-foreground/60">
                      New here?{' '}
                      <button
                        onClick={() => setStep('signup')}
                        className={`${selectedRole === 'recruiter' ? 'text-violet-400 hover:text-violet-300' : 'text-blue-500 hover:text-blue-400'} hover:underline transition-colors`}
                      >
                        Create Account
                      </button>
                    </div>
                  </>
                )}
                {step === 'signup' && (
                  <div className="text-muted-foreground/60">
                    Already have an account?{' '}
                    <button
                      onClick={() => setStep('signin')}
                      className={`${selectedRole === 'recruiter' ? 'text-violet-400 hover:text-violet-300' : 'text-blue-500 hover:text-blue-400'} hover:underline transition-colors`}
                    >
                      Sign In
                    </button>
                  </div>
                )}
                {step === 'forgot' && (
                  <button
                    onClick={() => setStep('signin')}
                    className="text-blue-500 hover:underline transition-colors"
                  >
                    Back to Sign In
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-10 text-center space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
          <div className="flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-[0.15em] text-blue-400/90">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
            Enterprise Secure Portal v4.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;