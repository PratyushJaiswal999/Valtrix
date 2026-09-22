import { useEffect, useState, useRef } from 'react';

export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking';

// Map each state to its photo
const PHOTO: Record<AvatarState, string> = {
  idle:      '/avatars/idle.jpg',
  speaking:  '/avatars/speaking.jpg',
  listening: '/avatars/listening.jpg',
  thinking:  '/avatars/listening.jpg', // same focused look for thinking
};

// Speaking state cycles through mouth-open frames via CSS pulsing
// We stack all 3 images and crossfade between them

interface AIAvatarProps {
  state: AvatarState;
  className?: string;
}

export default function AIAvatar({ state, className = '' }: AIAvatarProps) {
  // Track which image is "active" with a fade transition
  const [displayed, setDisplayed] = useState<AvatarState>('idle');
  const [transitioning, setTransitioning] = useState(false);
  const prevState = useRef<AvatarState>('idle');

  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;

    // Quick crossfade: fade out, swap, fade in
    setTransitioning(true);
    const t = setTimeout(() => {
      setDisplayed(state);
      setTransitioning(false);
    }, 180); // half of the CSS transition duration
    return () => clearTimeout(t);
  }, [state]);

  // Determine ambient ring color per state
  const ringColor =
    state === 'speaking'  ? 'rgba(96,165,250,0.55)'   // blue
    : state === 'listening' ? 'rgba(52,211,153,0.45)'  // emerald
    : state === 'thinking'  ? 'rgba(251,191,36,0.45)'  // amber
    : 'rgba(148,163,184,0.3)';                          // slate

  const isSpeaking = state === 'speaking';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        animation: isSpeaking
          ? 'avatar-bob 0.55s ease-in-out infinite alternate'
          : state === 'listening'
          ? 'avatar-tilt 3.5s ease-in-out infinite alternate'
          : 'avatar-breathe 4s ease-in-out infinite',
      }}
    >
      {/* ── Photo ── */}
      <img
        src={PHOTO[displayed]}
        alt="AI Interviewer"
        className="w-full h-full object-cover object-top"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.18s ease-in-out',
          display: 'block',
        }}
      />

      {/* ── Speaking pulse overlay — animated shimmer when talking ── */}
      {isSpeaking && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 55%, rgba(96,165,250,0.08) 100%)',
            animation: 'avatar-speaking-glow 1s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* ── Listening focus vignette ── */}
      {state === 'listening' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(52,211,153,0.07) 100%)',
          }}
        />
      )}

      {/* ── Ambient glow ring around the photo card ── */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: `0 0 0 3px ${ringColor}, 0 0 24px 4px ${ringColor}`,
          transition: 'box-shadow 0.5s ease',
          animation: isSpeaking ? 'speaking-ring 1.3s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  );
}
