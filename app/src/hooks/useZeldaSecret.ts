import { useCallback, useRef } from 'react';

const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

/**
 * Programmatically generates the classic Zelda "secret discovered" jingle
 * using the Web Audio API — no external audio files needed.
 * Notes approximate the iconic ascending arpeggio from the original game.
 */
export function useZeldaSecret() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    if (!AudioCtx) return;

    const ctx = ctxRef.current ?? new AudioCtx();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Classic "secret discovered" notes (frequencies in Hz)
    const notes: [number, number, number][] = [
      // [frequency, startTime, duration]
      [587.33, 0.0, 0.12],    // D5
      [622.25, 0.12, 0.12],   // Eb5
      [659.25, 0.24, 0.12],   // E5
      [698.46, 0.36, 0.12],   // F5
      [739.99, 0.48, 0.12],   // F#5
      [783.99, 0.60, 0.12],   // G5
      [830.61, 0.72, 0.12],   // Ab5
      [880.00, 0.84, 0.12],   // A5
      [932.33, 0.96, 0.12],   // Bb5
      [987.77, 1.08, 0.35],   // B5 (held longer)
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const lastNote = notes[notes.length - 1];
    const totalDuration = lastNote[1] + lastNote[2] + 0.1;

    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + start + 0.01);
      gain.gain.setValueAtTime(0.7, ctx.currentTime + start + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    // Disconnect master gain after playback to avoid building up the audio graph
    setTimeout(() => {
      masterGain.disconnect();
    }, totalDuration * 1000 + 200);
  }, []);

  return play;
}
