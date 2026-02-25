import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AuroraBackground from '@/components/AuroraBackground';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const deleteAllSessions = async () => {
    if (!confirm('Delete all your interview sessions? This cannot be undone.')) return;
    setDeleting(true);
    await supabase.from('interview_sessions').delete().eq('user_id', user!.id);
    toast({ title: 'Sessions deleted' });
    setDeleting(false);
  };

  return (
    <div className="relative min-h-screen noise-bg">
      <AuroraBackground />
      <div className="relative z-10 mx-auto max-w-[600px] px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="mb-8 font-display text-display tracking-tight">Settings</h1>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6 shadow-card">
            <h2 className="mb-4 font-display text-lg font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="outline" className="mt-4" onClick={signOut}>Sign Out</Button>
          </div>

          <div className="glass rounded-xl p-6 shadow-card">
            <h2 className="mb-4 font-display text-lg font-semibold">Preferences</h2>
            <div className="flex items-center justify-between">
              <Label>Show live captions</Label>
              <Switch checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
            </div>
          </div>

          <div className="glass rounded-xl p-6 shadow-card">
            <h2 className="mb-4 font-display text-lg font-semibold text-destructive">Danger Zone</h2>
            <Button variant="destructive" onClick={deleteAllSessions} disabled={deleting}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete All Sessions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
