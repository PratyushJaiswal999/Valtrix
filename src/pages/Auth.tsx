import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mic, BrainCircuit, Moon, Sun, ShieldCheck } from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';

type AuthMode = 'signin' | 'signup' | 'forgot';

const Auth = () => {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { theme, toggleTheme } = useTheme();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) toast({ title: 'System Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Access Reset', description: 'Verification link dispatched.' });
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, displayName);
      if (error) toast({ title: 'Registration Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Verification Required', description: 'Please confirm corporate credentials.' });
    } else {
      const { error } = await signIn(email, password);
      if (error) toast({ title: 'Authentication Failed', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 noise-bg transition-colors duration-300">
      <AuroraBackground />

      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="fixed top-8 right-8 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 shadow-sm backdrop-blur-md hover:scale-110 transition-all active:scale-95"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-indigo-600" />}
      </button>

      <div className="relative z-10 w-full max-w-[460px]">
        {/* Branding */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)]">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">AiInterviewer</h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-500">for valtrix</p>
        </div>

        {/* Feature Spec Pills */}
        <div className="mb-10 flex justify-center gap-4">
          {[
            { icon: Mic, label: 'Global Voice Standard' },
            { icon: BrainCircuit, label: 'Executive Intelligence' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground shadow-sm">
              <Icon className="h-3.5 w-3.5 text-blue-500" />
              {label}
            </div>
          ))}
        </div>

        {/* Authentication Card */}
        <div className="relative overflow-hidden rounded-[24px] border border-border/50 bg-background/60 p-10 shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          
          <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
            {mode === 'signin' ? 'Portal Access' : mode === 'signup' ? 'Identity Request' : 'Secure Recovery'}
          </h2>
          <p className="mb-8 text-sm text-muted-foreground/90 font-medium">
            Authorized personnel only. Please provide your credentials.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
                <Input id="name" className="h-11 border-border/50 bg-background/50 focus:ring-blue-500" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Johnson" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Corporate Email</Label>
              <Input id="email" type="email" className="h-11 border-border/50 bg-background/50" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credential Password</Label>
                <Input id="password" type="password" className="h-11 border-border/50 bg-background/50" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            )}
            <Button type="submit" className="h-12 w-full bg-blue-600 font-bold uppercase tracking-widest text-white shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? 'Processing...' : mode === 'signin' ? 'Authorize' : mode === 'signup' ? 'Request Access' : 'Send Link'}
            </Button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/40 pt-6 text-[11px] font-bold uppercase tracking-widest">
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('forgot')} className="text-muted-foreground hover:text-blue-500">Recovery</button>
                <div className="text-muted-foreground/40">
                  New? <button onClick={() => setMode('signup')} className="text-blue-500 hover:underline">Apply for account</button>
                </div>
              </>
            )}
            {mode !== 'signin' && <button onClick={() => setMode('signin')} className="text-blue-500 hover:underline">Return to login</button>}
          </div>
        </div>
        
        {/* Fixed Footer with High Visibility */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Powered by Valtrix Intelligent Systems &copy; 2026
          </p>
          <div className="flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-[0.15em] text-blue-400/90">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
            Enterprise Secure Portal v4.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;