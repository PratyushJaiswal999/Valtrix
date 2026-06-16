import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuroraBackground from '@/components/AuroraBackground';
import { 
  ShieldCheck, 
  Mic, 
  BrainCircuit, 
  Sparkles, 
  ChevronRight, 
  Users, 
  Code, 
  GraduationCap, 
  Settings,
  ArrowRight
} from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStart = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="relative min-h-screen noise-bg overflow-x-hidden">
      <AuroraBackground />

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/50 backdrop-blur-md">
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          {/* Logo Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-foreground">AI Interviewer</span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.25em] text-blue-500">VALTRIX PROTOCOL</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#protocols" className="hover:text-foreground transition-colors">Protocols</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-border/60 text-xs font-bold uppercase tracking-wider">
                Go to Dashboard
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="outline" className="border-border/60 text-xs font-bold uppercase tracking-wider">
                Authorized Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-20 px-6 max-w-[1100px] mx-auto text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary shadow-[0_0_20px_rgba(37,99,235,0.15)] mb-8">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-500" />
          Enterprise Assessment Engine
        </div>

        {/* Heading */}
        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
          Simulate Realistic Boardroom &{' '}
          <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Technical Assessments
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
          Valtrix AI Interviewer provides dynamic conversational intelligence, sub-second latency speech analytics, and professional grade pass/fail score debriefs.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button 
            onClick={handleStart}
            size="lg"
            className="h-14 gap-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 rounded-xl px-10 text-sm font-bold uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(var(--primary),0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {user ? 'Open Dashboard' : 'Initiate Protocol'}
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <a href="#features">
            <Button size="lg" variant="ghost" className="h-14 rounded-xl px-8 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Review Capabilities
            </Button>
          </a>
        </div>

        {/* Dashboard Visual Mock */}
        <div className="mt-16 relative rounded-2xl border border-border/40 bg-background/40 p-3 shadow-2xl backdrop-blur-md max-w-4xl mx-auto overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60"></div>
          <div className="rounded-xl border border-border/20 bg-background/50 overflow-hidden relative aspect-video flex items-center justify-center p-8">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
            
            {/* Visual simulation represent */}
            <div className="z-10 flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-blue-500 animate-pulse">
                <Mic className="h-8 w-8" />
              </div>
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">System Operational Check</p>
              <div className="flex items-center gap-1.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-6 rounded-full bg-blue-500/60"
                    style={{
                      animation: `waveform-bar 0.7s ease-in-out ${i * 0.12}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Specs */}
      <section id="features" className="relative z-10 py-24 border-t border-border/40 bg-background/20">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight">Core Competencies</h2>
            <p className="mt-2 text-sm text-muted-foreground">Engineered for realistic candidate simulation and feedback.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: Mic, 
                title: 'High-Fidelity Audio', 
                desc: 'Integrated with sub-second Speech-To-Text (STT) parsing to ensure natural flow without lag.' 
              },
              { 
                icon: BrainCircuit, 
                title: 'Gemini Intelligence', 
                desc: 'Dynamic, contextual follow-up questioning based on gaps, vagueness, or technical depth.' 
              },
              { 
                icon: ShieldCheck, 
                title: 'Compliance Metrics', 
                desc: 'Passing threshold parameters, confidence analysis, and STAR-structured response evaluations.' 
              }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass border border-border/30 rounded-2xl p-8 hover:border-primary/40 transition-all shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-blue-500 mb-6">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interview Types */}
      <section id="protocols" className="relative z-10 py-24 border-t border-border/40 bg-background/10">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold tracking-tight">Evaluation Frameworks</h2>
            <p className="mt-2 text-sm text-muted-foreground">Pre-configured interview templates for various departments.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: Users, label: 'HR & Cultural Fit', desc: 'Core alignment' },
              { icon: GraduationCap, label: 'Behavioral Skills', desc: 'STAR methodology' },
              { icon: Code, label: 'Technical depth', desc: 'System architecture' },
              { icon: Settings, label: 'Custom Protocol', desc: 'Define your parameters' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-6 rounded-xl border border-border/20 bg-background/30 backdrop-blur-sm flex flex-col justify-between min-h-[140px] hover:border-blue-500/30 transition-all">
                <div className="text-blue-500">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mt-4">{label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer className="relative z-10 border-t border-border/30 py-12 text-center bg-background/80 backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-medium">
          Valtrix Intelligent Systems &copy; 2026. All rights reserved.
        </p>
        <p className="text-[8px] uppercase tracking-wider text-blue-500/70 font-semibold mt-2">
          Enterprise Secure Portal Access Protocol
        </p>
      </footer>
    </div>
  );
};

export default Landing;
