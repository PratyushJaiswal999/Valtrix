import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuroraBackground from '@/components/AuroraBackground';
import { useToast } from '@/hooks/use-toast';
import { Mic, BrainCircuit, BarChart3 } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

const Auth = () => {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Check your email', description: 'Password reset link sent.' });
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, displayName);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Check your email', description: 'Confirm your account to get started.' });
    } else {
      const { error } = await signIn(email, password);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 noise-bg">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow">
            <Mic className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-display tracking-tight">InterviewAI</h1>
          <p className="mt-2 text-muted-foreground">Voice-first interview coaching, powered by AI</p>
        </div>

        {/* Features pills */}
        <div className="mb-8 flex justify-center gap-3">
          {[
            { icon: Mic, label: 'Voice-First' },
            { icon: BrainCircuit, label: 'AI Coach' },
            { icon: BarChart3, label: 'Deep Debrief' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="glass rounded-xl p-8 shadow-card">
          <h2 className="mb-1 font-display text-xl font-semibold">
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === 'forgot'
              ? "Enter your email and we'll send a reset link."
              : mode === 'signup'
                ? 'Start practicing interviews today.'
                : 'Sign in to continue your practice.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('forgot')} className="text-primary hover:underline">Forgot password?</button>
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-primary hover:underline">Sign up</button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className="text-primary hover:underline">Sign in</button>
              </p>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('signin')} className="text-primary hover:underline">Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
