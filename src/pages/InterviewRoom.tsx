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
import { Mic, MicOff, Square, MessageSquare, Clock, Send } from 'lucide-react';
import AIAvatar, { type AvatarState } from '@/components/AIAvatar';

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
    const video = candidateVideoRef.current;
    if (!video) return;
    if (candidateStream) {
      video.srcObject = candidateStream;
      // Ensure autoplay fires (needed on some browsers after srcObject set)
      video.play().catch(() => { /* autoplay policy — muted video should always be allowed */ });
    } else {
      video.srcObject = null;
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
    <div className="flex h-screen flex-col bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between border-b border-border/50 px-5 py-2.5 bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow shadow-blue-500/30">
            <span className="text-[11px]">🎙</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground leading-none">AI Interviewer</p>
            <p className="text-[9px] text-muted-foreground capitalize mt-0.5">
              {session.interview_type} · {session.difficulty}{session.role_title ? ` · ${session.role_title}` : ''}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 font-mono text-sm font-semibold">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={elapsed > session.duration_planned * 60 * 0.9 ? 'text-destructive' : 'text-foreground'}>
            {formatTime(elapsed)}
          </span>
          <span className="text-muted-foreground text-xs">/ {session.duration_planned}:00</span>
        </div>

        <Button variant="destructive" size="sm" className="h-8 px-4 text-xs font-bold rounded-lg" onClick={endInterview} disabled={ending}>
          <Square className="mr-1 h-3 w-3" /> End Interview
        </Button>
      </header>

      {/* ── Main body: left column + right column ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ LEFT COLUMN — video panels stacked ═══ */}
        <div className="flex flex-col gap-3 p-3 shrink-0" style={{ width: '420px' }}>

          {/* AI Interviewer panel — live animated avatar */}
          {(() => {
            const avatarState: AvatarState = interviewerSpeaking
              ? 'speaking'
              : waitingForAI
              ? 'thinking'
              : currentSpeaker === 'Candidate'
              ? 'listening'
              : 'idle';
            return (
              <div className="flex-1 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-card flex flex-col items-center justify-center relative overflow-hidden">
                {/* Dynamic ambient gradient based on state */}
                <div className={`absolute inset-0 transition-all duration-700 ${
                  interviewerSpeaking
                    ? 'bg-gradient-to-br from-blue-500/8 via-transparent to-cyan-500/8'
                    : waitingForAI
                    ? 'bg-gradient-to-br from-amber-500/6 via-transparent to-orange-400/6'
                    : currentSpeaker === 'Candidate'
                    ? 'bg-gradient-to-br from-emerald-500/6 via-transparent to-teal-400/6'
                    : 'bg-gradient-to-br from-slate-500/4 via-transparent to-slate-400/4'
                }`} />

                {/* Live avatar — portrait ratio matches the photos */}
                <div className="relative w-full px-5" style={{ aspectRatio: '3/4', maxHeight: '260px' }}>
                  <AIAvatar state={avatarState} className="w-full h-full" />

                  {/* Speaking pulse ring around avatar */}
                  {interviewerSpeaking && (
                    <div className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        boxShadow: '0 0 0 0 rgba(96,165,250,0.5)',
                        animation: 'speaking-ring 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>

                {/* Status label */}
                <div className="text-center mt-3 relative z-10">
                  <p className="font-display font-bold text-sm text-foreground tracking-tight">AI Interviewer</p>
                  <p className={`text-[11px] mt-1 font-semibold transition-colors duration-300 ${
                    interviewerSpeaking ? 'text-blue-400'
                    : waitingForAI     ? 'text-amber-400'
                    : currentSpeaker === 'Candidate' ? 'text-emerald-400'
                    : 'text-muted-foreground'
                  }`}>
                    {interviewerSpeaking
                      ? '🔴 Speaking'
                      : waitingForAI
                      ? '💭 Thinking…'
                      : currentSpeaker === 'Candidate'
                      ? '👂 Listening'
                      : '⏸ Standby'}
                  </p>
                </div>

                {/* Waveform — only during speech */}
                <div className="mt-3 flex items-end gap-1 h-5">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-0.5 rounded-full transition-colors ${
                        interviewerSpeaking ? 'bg-blue-400' : 'bg-border/40'
                      }`}
                      style={{
                        height: '4px',
                        animation: interviewerSpeaking
                          ? `waveform-bar 0.55s ease-in-out ${i * 0.07}s infinite`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* My Camera Feed panel */}
          <div className="flex-1 rounded-2xl border border-border/40 bg-black/60 shadow-card relative overflow-hidden">
            {/* Always-mounted video — srcObject set via ref */}
            <video
              ref={candidateVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${
                candidateStream ? 'opacity-95' : 'opacity-0'
              }`}
            />

            {/* Fallback when no camera */}
            {!candidateStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center text-2xl mb-2">📷</div>
                <p className="text-xs font-medium text-foreground">Camera Offline</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 text-center px-4">Allow camera access in browser</p>
              </div>
            )}

            {/* Status bar */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex justify-between items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] border border-white/10">
              <span className="font-bold text-white">You</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-white/70 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${candidateStream ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  Cam
                </span>
                <span className="flex items-center gap-1 text-white/70 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                  Mic
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN — full Q&A panel ═══ */}
        <div className="flex flex-1 flex-col border-l border-border/40 overflow-hidden">

          {/* Transcript — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {transcript.length === 0 && !waitingForAI && (
              <div className="flex h-full items-center justify-center opacity-40">
                <div className="text-center">
                  <p className="text-2xl mb-2">🎤</p>
                  <p className="text-sm font-medium text-muted-foreground">Interview starting…</p>
                </div>
              </div>
            )}

            {transcript.map((t, i) => (
              <div key={i} className={`flex gap-3 animate-fade-slide-up ${t.speaker === 'Candidate' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm border ${
                  t.speaker === 'Candidate'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-muted border-border/40 text-muted-foreground'
                }`}>
                  {t.speaker === 'Candidate' ? '👤' : '🤖'}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  t.speaker === 'Candidate'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted/60 border border-border/40 text-foreground rounded-tl-sm'
                }`}>
                  <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-widest ${
                    t.speaker === 'Candidate' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>
                    {t.speaker === 'Candidate' ? 'You' : 'Interviewer'}
                  </p>
                  <p>{t.text}</p>
                </div>
              </div>
            ))}

            {/* AI thinking indicator */}
            {waitingForAI && (
              <div className="flex gap-3 animate-fade-slide-up">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border/40 text-sm">🤖</div>
                <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-5 py-3.5">
                  <div className="flex gap-1.5 items-center">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Answer Input bar ── */}
          <div className="border-t border-border/40 bg-card/60 backdrop-blur-sm px-5 py-4 shrink-0">
            <div className="flex items-center gap-3">
              {textMode ? (
                <form onSubmit={handleTextSubmit} className="flex flex-1 gap-2">
                  <Input
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="Type your answer…"
                    disabled={interviewerSpeaking || waitingForAI}
                    className="flex-1 rounded-xl border-border/60 bg-background/60"
                    autoFocus
                  />
                  <Button type="submit" size="icon" className="rounded-xl h-10 w-10 shrink-0" disabled={!textInput.trim() || interviewerSpeaking || waitingForAI}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <Button
                  size="lg"
                  className={`flex-1 gap-2 rounded-xl h-11 font-bold text-sm ${
                    isListening
                      ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20'
                      : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                  }`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={interviewerSpeaking || waitingForAI}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? 'Stop Recording' : 'Push to Talk'}
                </Button>
              )}

              {/* Toggle voice / text */}
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl border-border/60 shrink-0"
                onClick={() => setTextMode(!textMode)}
                title={textMode ? 'Switch to voice' : 'Switch to text'}
              >
                {textMode ? <Mic className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </div>

            <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
              {isListening ? '🔴 Recording — click Stop when done' : interviewerSpeaking ? 'Wait for the interviewer to finish…' : 'Your turn to answer'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};


export default InterviewRoom;
