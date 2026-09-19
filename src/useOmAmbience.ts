import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';

/** Where the swell tops out. Ambience has to sit under thought, not compete with it. */
const PEAK = 0.72;
/** The rise. Long enough that no single moment is the moment it "turned on" — which is the
 *  point: a sound that arrives is an interruption, a sound that was always there is a room. */
const RISE_MS = 18000;
/** The fall. Faster than the rise, because a user reaching for stop wants it gone, but not
 *  instant, because a hard cut on a sustained tone is startling. */
const FALL_MS = 1600;
const STEP_MS = 60;

/** Perceived loudness tracks roughly the cube of amplitude, so a linear volume ramp sounds
 *  like it leaps early then stalls. Shaping the curve makes the swell feel even the whole way
 *  up — the growth is in the ear, not in the number. */
const shape = (t: number) => t * t * t;

export type OmAmbience = {
  playing: boolean;
  /** 0..1 swell position, for showing the user that the sound is still building. */
  level: number;
  toggle: () => void;
};

/**
 * The Om ambience, as a slow swell rather than a switch.
 *
 * The old version snapped to a fixed low volume, which made it read as a background track that
 * had failed to start. Fading in from silence over the better part of a minute does something
 * different: attention never gets a discrete onset to latch onto, so the sound settles below
 * conscious notice and the room feels changed instead of the app feeling noisy. It keeps
 * growing until the user stops it, and the meter on screen shows the rise so the first quiet
 * seconds read as "beginning" rather than "broken".
 */
export function useOmAmbience(source: number): OmAmbience {
  const player = useAudioPlayer(source);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useRef(0);

  const clear = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  useEffect(() => { player.loop = true; player.volume = 0; }, [player]);
  useEffect(() => clear, []);

  const toggle = useCallback(() => {
    clear();
    if (playing) {
      const from = progress.current;
      const started = Date.now();
      timer.current = setInterval(() => {
        const t = Math.min(1, (Date.now() - started) / FALL_MS);
        const value = from * (1 - t);
        progress.current = value;
        player.volume = shape(value) * PEAK;
        setLevel(value);
        if (t >= 1) { clear(); player.pause(); void player.seekTo(0); setPlaying(false); }
      }, STEP_MS);
      return;
    }
    progress.current = 0;
    player.volume = 0;
    player.play();
    setPlaying(true);
    const started = Date.now();
    timer.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / RISE_MS);
      progress.current = t;
      player.volume = shape(t) * PEAK;
      setLevel(t);
      if (t >= 1) clear();      // reached full; it simply stays there until stopped
    }, STEP_MS);
  }, [player, playing]);

  return { playing, level, toggle };
}
