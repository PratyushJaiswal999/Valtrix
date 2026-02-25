import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { InterviewSession, TranscriptTurn } from '@/types/interview';
import { Mic, MicOff, Square, MessageSquare, Clock, Send, BookmarkPlus, ChevronRight } from 'lucide-react';

const InterviewRoom = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    supabase.from('interview_sessions').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setSession(data as InterviewSession);
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

  // Start audio recording
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(5000); // chunk every 5s
    }).catch(() => {
      // Can't record - that's ok, text mode still works
    });
    return () => { mediaRecorderRef.current?.stop(); };
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

    // Save to DB
    if (id) {
      supabase.from('transcript_turns').insert({
        session_id: id,
        speaker: turn.speaker,
        text: turn.text,
        timestamp_start: turn.timestamp_start,
        timestamp_end: (Date.now() - startTimeRef.current) / 1000,
        turn_index: turn.turn_index,
      }).then(() => {});
    }

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

  // Speech recognition setup
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTextMode(true);
      toast({ title: 'Speech not supported', description: 'Using text mode instead.' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        submitCandidateAnswer(finalTranscript.trim());
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTextMode(true);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const submitCandidateAnswer = async (text: string) => {
    const turn: TranscriptTurn = {
      speaker: 'Candidate',
      text,
      timestamp_start: (Date.now() - startTimeRef.current) / 1000,
      turn_index: turnIndexRef.current++,
    };
    setTranscript(prev => [...prev, turn]);

    // Save to DB
    if (id) {
      await supabase.from('transcript_turns').insert({
        session_id: id,
        speaker: 'Candidate',
        text,
        timestamp_start: turn.timestamp_start,
        timestamp_end: (Date.now() - startTimeRef.current) / 1000,
        turn_index: turn.turn_index,
      });
    }

    // Get AI follow-up
    setWaitingForAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-question', {
        body: {
          session_config: session,
          transcript: [...transcriptRef.current, turn],
        },
      });
      if (error) throw error;
      const nextQ = data?.question || "Can you elaborate on that?";
      addInterviewerTurn(nextQ);
    } catch {
      addInterviewerTurn("Interesting. Can you tell me more about that?");
    }
    setWaitingForAI(false);
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

    // Update session
    await supabase.from('interview_sessions').update({
      status: 'debrief_generating',
      duration_actual: durationActual,
      audio_url: audioUrl || null,
    }).eq('id', id!);

    // Navigate to debrief (which will trigger generation)
    navigate(`/debrief/${id}`);
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
        {/* Interviewer avatar */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl transition-all ${
            interviewerSpeaking ? 'speaking-ring' : ''
          }`}>
            👤
          </div>
          <div className="text-center">
            <p className="font-display font-semibold">Interviewer</p>
            <p className="text-sm text-muted-foreground">
              {interviewerSpeaking ? 'Speaking…' : waitingForAI ? 'Thinking…' : currentSpeaker === 'Candidate' ? 'Your turn' : ''}
            </p>
          </div>

          {/* Waveform */}
          {interviewerSpeaking && (
            <div className="flex items-center gap-1">
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
          )}
        </div>

        {/* Transcript / Captions */}
        <div className="mx-auto max-w-[700px] flex-1 overflow-auto px-4">
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
