import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';
import { DeepgramClient } from "@deepgram/sdk";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { InterviewSession, TranscriptTurn } from '@/types/interview';
import { Mic, MicOff, Square, MessageSquare, Clock, Send, BookmarkPlus, ChevronRight } from 'lucide-react';

const InterviewRoom = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { captionsEnabled } = usePreferences();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<'InterviewerA' | 'Candidate'>('InterviewerA');
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);

  const [candidateStream, setCandidateStream] = useState<MediaStream | null>(null);
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number>();
  const turnIndexRef = useRef(0);
  const transcriptRef = useRef<TranscriptTurn[]>([]);

  // Keep transcriptRef in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Fetch session
  useEffect(() => {
    if (!id) return;
    supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          const mapped: InterviewSession = {
            id: data.id,
            user_id: data.user_id,
            status: data.status === 'done' || data.status === 'completed' ? 'done' : data.status === 'ended_early' || data.status === 'failed' ? 'failed' : data.status,
            interview_type: data.interview_type || 'behavioral',
            difficulty: data.difficulty || 'medium',
            duration_planned: data.duration_planned || 30,
            duration_actual: data.duration_actual || undefined,
            company: data.company || '',
            role_title: data.role_title || '',
            job_description: data.job_description || '',
            company_url: data.company_url || '',
            goals: data.goals || '',
            panel_size: data.panel_size || 1,
            audio_url: data.audio_url || undefined,
            created_at: data.created_at,
            updated_at: data.updated_at || data.created_at,
          };
          setSession(mapped);
        }
      });
  }, [id]);

  // Timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Start candidate camera/mic stream
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        setCandidateStream(stream);
      })
      .catch(err => {
        console.error('Failed to get candidate video stream', err);
      });

    return () => {
      setCandidateStream(prev => {
        if (prev) {
          prev.getTracks().forEach(t => t.stop());
        }
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (candidateStream && candidateVideoRef.current) {
      candidateVideoRef.current.srcObject = candidateStream;
    }
  }, [candidateStream]);

  // Start audio recording for archival chunks
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      activeStream = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(5000); // chunk every 5s
    }).catch(() => {
      // Can't record - that's ok, text mode still works
    });
    return () => {
      mediaRecorderRef.current?.stop();
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Start with interviewer greeting
  useEffect(() => {
    if (session) {
      const greeting = getGreeting(session);
      addInterviewerTurn(greeting);
    }
  }, [session]);

  const getGreeting = (s: InterviewSession) => {
    const name = user?.user_metadata?.display_name || 'there';
    const company = s.company || 'our company';
    if (s.difficulty === 'easy') return `Hi ${name}! Welcome, I'm excited to chat with you today about the ${s.role_title || 'role'} at ${company}. This will be a relaxed conversation — just be yourself. Let's start: Can you tell me a bit about yourself and what drew you to this opportunity?`;
    if (s.difficulty === 'hard') return `Let's begin. I'm interviewing you for the ${s.role_title || 'position'} at ${company}. I'll be direct — I need to see concrete evidence of your capabilities. Start by telling me your most impactful achievement in the last two years. Be specific with numbers.`;
    return `Good to meet you. I'll be conducting your ${s.interview_type} interview for the ${s.role_title || 'role'} at ${company}. Let's get started. Tell me about yourself and why you're interested in this position.`;
  };

  const addInterviewerTurn = useCallback((text: string) => {
    const turn: TranscriptTurn = {
      speaker: 'InterviewerA',
      text,
      timestamp_start: (Date.now() - startTimeRef.current) / 1000,
      turn_index: turnIndexRef.current++,
    };
    setTranscript(prev => [...prev, turn]);
    setCurrentSpeaker('InterviewerA');
    setInterviewerSpeaking(true);

    // Speak
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) utter.voice = preferredVoice;
    utter.onend = () => {
      setInterviewerSpeaking(false);
      setCurrentSpeaker('Candidate');
    };
    synthRef.current.speak(utter);
  }, [id]);

  const submitCandidateAnswer = async (text: string) => {
    const turn: TranscriptTurn = {
      speaker: 'Candidate',
      text,
      timestamp_start: (Date.now() - startTimeRef.current) / 1000,
      turn_index: turnIndexRef.current++,
    };
    setTranscript(prev => [...prev, turn]);

    // Get AI follow-up
    setWaitingForAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-question', {
        body: {
          session_config: session,
          transcript: [...transcriptRef.current, turn],
        }
      });
      if (error) throw error;
      const nextQ = data?.question || "Can you elaborate on that?";
      addInterviewerTurn(nextQ);
    } catch (error) {
      console.error(error);
      addInterviewerTurn("Interesting. Can you tell me more about that?");
    }
    setWaitingForAI(false);
  };

  // Speech recognition setup using Deepgram
  const startListening = useCallback(async () => {
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const client = new DeepgramClient({ apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || "proxy" });
      const connection = await client.listen.v1.connect({
        model: "nova-3",
        language: "en-US",
        smart_format: "true"
      });

      connection.on("open", () => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.socket?.readyState === 1) {
            connection.socket.send(event.data);
          }
        };
        mediaRecorder.start(250);
        
        recognitionRef.current = { 
          stop: () => { 
            mediaRecorder.stop(); 
            connection.socket?.close(); 
            stream.getTracks().forEach(t => t.stop()); 
          } 
        };
      });

      connection.on("message", (data: any) => {
        if (data.type === "Results" && data.channel?.alternatives?.[0]) {
          const transcriptText = data.channel.alternatives[0].transcript;
          if (transcriptText.trim() && data.is_final) {
            submitCandidateAnswer(transcriptText.trim());
          }
        }
      });

      connection.on("close", () => {
        setIsListening(false);
      });

      connection.on("error", (err: any) => {
        console.error(err);
        setIsListening(false);
        setTextMode(true);
      });

      connection.connect();

    } catch (err) {
      console.error(err);
      toast({ title: 'Speech not supported', description: 'Using text mode instead.' });
      setTextMode(true);
      setIsListening(false);
    }
  }, [toast, submitCandidateAnswer]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };


  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    submitCandidateAnswer(textInput.trim());
    setTextInput('');
  };

  const endInterview = async () => {
    setEnding(true);
    synthRef.current.cancel();
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();

    const durationActual = Math.round(elapsed / 60);
    const plannedMin = session?.duration_planned || 30;
    const status = durationActual < plannedMin ? 'ended_early' : 'completed';

    // Upload audio if available
    let audioUrl: string | undefined;
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const path = `${user!.id}/${id}.webm`;
      const { error: uploadErr } = await supabase.storage.from('interview-audio').upload(path, blob, { upsert: true });
      if (!uploadErr) audioUrl = path;
    }

    // Update session status and audio
    await supabase
      .from('interview_sessions')
      .update({
        status: 'done',
        duration_actual: durationActual,
        audio_url: audioUrl || null,
      })
      .eq('id', id!);

    // Insert/upsert session_debriefs with transcript
    await supabase
      .from('session_debriefs')
      .upsert({
        session_id: id!,
        debrief_json: { transcript_turns: transcriptRef.current }
      }, { onConflict: 'session_id' });

    // Navigate to debrief (which will trigger generation)
    navigate(`/debrief/${id}`, { replace: true });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!session) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">{session.interview_type}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{session.difficulty}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatTime(elapsed)}</span>
          <span className="text-muted-foreground">/ {session.duration_planned}:00</span>
        </div>
        <Button variant="destructive" size="sm" onClick={endInterview} disabled={ending}>
          <Square className="mr-1 h-3 w-3" /> End
        </Button>
      </header>

      {/* Interview area */}
      <div className="flex flex-1 flex-col">
        {/* Interview area split-screen */}
        <div className="flex flex-col md:flex-row gap-6 max-w-[850px] mx-auto w-full px-4 py-6">
          {/* Left Pane: Interviewer */}
          <div className="flex-1 glass border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] md:h-[240px] shadow-card relative">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl transition-all ${
              interviewerSpeaking ? 'speaking-ring' : ''
            }`}>
              👤
            </div>
            <div className="text-center mt-3">
              <p className="font-display font-semibold text-foreground">Interviewer</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {interviewerSpeaking ? 'Speaking…' : waitingForAI ? 'Thinking…' : currentSpeaker === 'Candidate' ? 'Listening to you' : 'Standby'}
               </p>
            </div>
            
            {/* Waveform */}
            {interviewerSpeaking ? (
              <div className="flex items-center gap-1 mt-4 h-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-primary"
                    style={{
                      height: '4px',
                      animation: `waveform-bar 0.6s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-6 mt-4 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/45 tracking-widest font-mono">STANDBY</span>
              </div>
            )}
          </div>

          {/* Right Pane: Candidate Video Feed */}
          <div className="flex-1 glass border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] md:h-[240px] shadow-card relative overflow-hidden bg-black/30">
            {candidateStream ? (
              <video
                ref={candidateVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-90 transition-opacity duration-300"
              />
            ) : (
              <div className="flex flex-col items-center text-center text-muted-foreground p-4">
                <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center text-destructive mb-2">📷</div>
                <p className="font-medium text-xs text-foreground">Camera Offline</p>
                <p className="text-[10px] text-muted-foreground max-w-[150px] mt-0.5">Check browser camera permissions.</p>
              </div>
            )}
            
            {/* Candidate Status Overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border/40 text-[10px] shadow-sm">
              <span className="font-bold text-foreground">You</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-muted-foreground font-semibold">
                  <span className={`h-1.5 w-1.5 rounded-full ${candidateStream ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  Cam
                </span>
                <span className="flex items-center gap-0.5 text-muted-foreground font-semibold">
                  <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                  Mic
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript / Captions */}
        <div className="mx-auto max-w-[700px] flex-1 overflow-auto px-4">
          {captionsEnabled ? (
            <div className="space-y-3 pb-4">
            {transcript.map((t, i) => (
              <div key={i} className={`flex gap-3 animate-fade-slide-up ${t.speaker === 'Candidate' ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  t.speaker === 'Candidate'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass'
                }`}>
                  <p className="mb-1 text-xs font-medium opacity-70">{t.speaker === 'Candidate' ? 'You' : 'Interviewer'}</p>
                  <p>{t.text}</p>
                </div>
              </div>
            ))}
            {waitingForAI && (
              <div className="flex gap-3">
                <div className="glass rounded-2xl px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="flex h-full items-center justify-center opacity-50">
              <div className="flex flex-col items-center gap-2">
                <MicOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Captions Disabled</p>
                <p className="text-xs text-muted-foreground">You can enable them in Settings</p>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t bg-card p-4">
          <div className="mx-auto flex max-w-[700px] items-center gap-3">
            {textMode ? (
              <form onSubmit={handleTextSubmit} className="flex flex-1 gap-2">
                <Input
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Type your answer…"
                  disabled={interviewerSpeaking || waitingForAI}
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!textInput.trim() || interviewerSpeaking || waitingForAI}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button
                size="lg"
                className={`flex-1 gap-2 rounded-xl py-6 ${isListening ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={interviewerSpeaking || waitingForAI}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isListening ? 'Stop Recording' : 'Push to Talk'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTextMode(!textMode)}
              title={textMode ? 'Switch to voice' : 'Switch to text'}
            >
              {textMode ? <Mic className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
