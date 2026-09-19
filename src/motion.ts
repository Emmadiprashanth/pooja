import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** UIKit's navigation curve. Fast out of the gate, long gentle settle — the reason an
 *  iOS push feels like the page was already moving before you touched it. */
export const iosEase = Easing.bezier(0.32, 0.72, 0, 1);
/** Doherty threshold: interactions under ~400ms read as instant. Never exceed it. */
export const DURATION = { press: 110, fade: 220, page: 340, sheet: 300 };

/** Motion must be decoration, never information. Anyone with Reduce Motion on gets
 *  cross-fades instead of travel, and every screen stays reachable. */
export function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => alive && setReduced(value));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

/** Haptics confirm an action landed before the pixels do, which is what makes a tap feel
 *  "accepted". Silently absent where the hardware or browser cannot oblige. */
const tap = (run: () => Promise<void>) => { if (Platform.OS !== 'web') run().catch(() => {}); };
export const haptic = {
  select: () => tap(() => Haptics.selectionAsync()),
  light: () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};

export function useAnimatedValue(initial: number) {
  const ref = useRef<Animated.Value | null>(null);
  if (!ref.current) ref.current = new Animated.Value(initial);
  return ref.current;
}


/**
 * A slow, continuous rotation. Used behind the hero and the deity marks, at periods long
 * enough (a minute or more) that the eye never catches it moving — it only notices that the
 * screen is not quite static. Ornament that announces itself stops being ornament.
 */
export function useSpin(periodMs: number, reverse = false) {
  const value = useAnimatedValue(0);
  const reduced = useReduceMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); value.setValue(0); };
  }, [periodMs, reduced, value]);
  return value.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'] });
}

/**
 * The breath: a slow swell and settle. Deliberately asymmetric — the rise is longer than the
 * fall, the way an actual inhalation is — because a perfectly symmetric pulse reads as a
 * machine blinking rather than something alive.
 */
export function useBreathe(periodMs = 4200, depth = 0.06) {
  const value = useAnimatedValue(0);
  const reduced = useReduceMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: periodMs * 0.55, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: periodMs * 0.45, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); value.setValue(0); };
  }, [depth, periodMs, reduced, value]);
  return {
    scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + depth] }),
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }),
    raw: value,
  };
}

/**
 * A lamp flame. The trick is irregularity: a flame that oscillates on a fixed period looks
 * like a pulsing light bulb. Each cycle picks a new duration and a new height, so the motion
 * never resolves into a pattern the eye can predict — which is the whole difference between
 * "flame" and "animation".
 */
export function useFlicker() {
  const value = useAnimatedValue(0.5);
  const reduced = useReduceMotion();
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    // Seeded from a counter rather than a clock so the flames on one screen drift apart
    // instead of beating in unison.
    let seed = 7;
    const next = () => {
      if (!alive) return;
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const random = seed / 2147483648;
      Animated.timing(value, {
        toValue: 0.35 + random * 0.65,
        duration: 90 + random * 220,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) next(); });
    };
    next();
    return () => { alive = false; };
  }, [reduced, value]);
  return {
    scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }),
    scaleX: value.interpolate({ inputRange: [0, 1], outputRange: [1.06, 0.93] }),
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
    glow: value.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }),
  };
}

/**
 * Staggered entrance. Content rises a few points and fades in, each item a beat behind the
 * last, so a screen assembles itself in reading order instead of arriving as a wall. The
 * offsets are small and the whole cascade finishes inside a third of a second — long enough
 * to feel composed, short enough that nobody waiting on the content notices they waited.
 */
export function useEntrance(index = 0, distance = 14) {
  const value = useAnimatedValue(0);
  const reduced = useReduceMotion();
  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: reduced ? 1 : 420,
      delay: reduced ? 0 : Math.min(index, 8) * 55,
      easing: iosEase,
      useNativeDriver: true,
    }).start();
  }, [index, reduced, value]);
  return {
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}
