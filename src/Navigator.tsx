import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { DURATION, haptic, iosEase, useAnimatedValue, useReduceMotion } from './motion';
import { colors } from './theme';

/** Screen edge that listens for the back swipe. UIKit uses ~20pt; a little more forgiving
 *  here because this app is used kneeling on the floor, one-handed, mid-ritual. */
const EDGE = 30;
/** Past this fraction of the screen, letting go completes the pop. Deliberately low: a
 *  half-committed gesture should still succeed, because failing it costs the user a retry. */
const COMMIT = 0.3;
/** How far the covered screen travels while the top one crosses the full width. The 1:3.5
 *  ratio is what reads as "behind" rather than "beside". */
const PARALLAX = 0.28;

type Nav<T extends string> = {
  root: T;
  stack: T[];
  push: (screen: T) => void;
  pop: () => void;
  /** Dismisses the whole stack with a dissolve rather than a retreat — see finish(). */
  finish: () => void;
  selectTab: (screen: T) => void;
  canGoBack: boolean;
};

const NavContext = createContext<Nav<string> | null>(null);
export function useNav<T extends string>() {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav must be used inside <Navigator>');
  return value as unknown as Nav<T>;
}

type Mode = 'idle' | 'slide' | 'fade';

/**
 * A tab controller with a navigation stack, on the iOS model — and not out of nostalgia.
 *
 * Spatial consistency is the whole trick: a screen that arrives from the right leaves to the
 * right, so people build a mental map of "deeper" and "back" without reading a single label.
 * The covered screen parallaxes at roughly a third of the top screen's speed and dims — that
 * depth cue is what says the previous page still exists underneath, which is what makes going
 * back feel free rather than like a fresh load. Switching tabs cross-fades instead, because
 * sibling tabs are not deeper than one another and animating them as if they were would be a
 * lie about the hierarchy — and people do notice, even when they cannot name what is wrong.
 *
 * The edge swipe matters more than the transition. A back button is a target you must aim at;
 * a swipe is a direction you throw. Once someone trusts that the gesture always works, they
 * explore more freely, because undo is cheap.
 *
 * Every screen in the stack stays mounted at a fixed position in the tree, which is the part
 * that is easy to get wrong: if a covered screen unmounts, going back silently discards what
 * the user typed or ticked, and nothing erodes trust in a back gesture faster than losing work
 * by using it. Only a genuine pop tears a screen down.
 */
export function Navigator<T extends string>({ initial, tabs, renderScreen, renderTabBar, hideTabBarOnPush = true }: {
  initial: T;
  tabs: T[];
  renderScreen: (screen: T) => React.ReactNode;
  renderTabBar: (args: { active: T; select: (screen: T) => void; visible: boolean }) => React.ReactNode;
  hideTabBarOnPush?: boolean;
}) {
  const width = Dimensions.get('window').width;
  const reduced = useReduceMotion();
  const [root, setRoot] = useState<T>(initial);
  const [stack, setStack] = useState<T[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [leaving, setLeaving] = useState<React.ReactNode | null>(null);
  const [finishing, setFinishing] = useState(false);

  const slide = useAnimatedValue(0);     // 0 = top card seated, 1 = top card fully off to the right
  const fade = useAnimatedValue(1);      // tab cross-fade
  const dismiss = useAnimatedValue(1);   // ritual completion dissolve
  const busy = useRef(false);
  const render = useRef(renderScreen);
  render.current = renderScreen;

  const layers = useMemo(() => [root, ...stack], [root, stack]);
  const topIndex = stack.length;
  const canGoBack = topIndex > 0;

  const settle = useCallback(() => { busy.current = false; setMode('idle'); setLeaving(null); slide.setValue(0); fade.setValue(1); }, [fade, slide]);

  const push = useCallback((screen: T) => {
    if (busy.current) return;
    busy.current = true;
    haptic.light();
    setStack(list => [...list, screen]);
    setMode('slide');
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: reduced ? DURATION.fade : DURATION.page, easing: iosEase, useNativeDriver: true }).start(settle);
  }, [reduced, settle, slide]);

  /** `from` lets an interactive swipe hand over mid-flight instead of restarting from zero. */
  const pop = useCallback((from = 0) => {
    if (!canGoBack || busy.current) return;
    busy.current = true;
    haptic.light();
    slide.setValue(from);
    setMode('slide');
    Animated.timing(slide, { toValue: 1, duration: reduced ? DURATION.fade : Math.max(170, DURATION.page * (1 - from)), easing: iosEase, useNativeDriver: true })
      .start(() => { setStack(list => list.slice(0, -1)); settle(); });
  }, [canGoBack, reduced, settle, slide]);

  /**
   * Completing the ritual is not the same motion as backing out of it, so it does not animate
   * like one. A slide to the right would say "you retreated"; a dissolve says the thing you
   * were doing is finished and released. Getting this distinction right is most of why a set
   * of transitions feels considered rather than merely present.
   */
  const finish = useCallback(() => {
    if (!canGoBack || busy.current) return;
    busy.current = true;
    haptic.success();
    setFinishing(true);
    dismiss.setValue(1);
    Animated.timing(dismiss, { toValue: 0, duration: reduced ? DURATION.fade : DURATION.page, easing: iosEase, useNativeDriver: true })
      .start(() => { setStack([]); setFinishing(false); dismiss.setValue(1); settle(); });
  }, [canGoBack, dismiss, reduced, settle]);

  const selectTab = useCallback((screen: T) => {
    if (busy.current) return;
    if (screen === root && !stack.length) return;   // re-tapping the active tab is a no-op, not a reload
    haptic.select();
    busy.current = true;
    setLeaving(render.current(layers[topIndex]));
    setRoot(screen);
    setStack([]);
    setMode('fade');
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: DURATION.fade, easing: iosEase, useNativeDriver: true }).start(settle);
  }, [fade, layers, root, settle, stack.length, topIndex]);

  // Interactive back: the page tracks the finger 1:1 so the gesture stays reversible right up
  // until release. Direct manipulation — you are moving the page, not requesting a navigation.
  const pan = useMemo(() => PanResponder.create({
    // Capture phase, not bubble. The page under the finger is a ScrollView, and a ScrollView
    // will happily claim a horizontal drag and turn it into a text selection or a nudge. The
    // back gesture has to get first refusal, or it works only on the parts of a screen that
    // happen to be empty — which is worse than not having it, because it is unpredictable.
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (event, state) =>
      canGoBack && !busy.current && event.nativeEvent.pageX - state.dx < EDGE && state.dx > 6 && Math.abs(state.dx) > Math.abs(state.dy) * 1.4,
    // Once the swipe is ours it stays ours; nothing underneath may reclaim it mid-flight.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { slide.setValue(0); setMode('slide'); },
    onPanResponderMove: (_, state) => slide.setValue(Math.max(0, Math.min(1, state.dx / width))),
    onPanResponderRelease: (_, state) => {
      const travelled = Math.max(0, Math.min(1, state.dx / width));
      if (travelled > COMMIT || state.vx > 0.4) pop(travelled);
      else Animated.timing(slide, { toValue: 0, duration: 180, easing: iosEase, useNativeDriver: true }).start(() => setMode('idle'));
    },
    onPanResponderTerminate: () => Animated.timing(slide, { toValue: 0, duration: 180, easing: iosEase, useNativeDriver: true }).start(() => setMode('idle')),
  }), [canGoBack, pop, slide, width]);

  // Escape is the desktop equivalent of the edge swipe. Same promise: back is always one move.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && canGoBack) pop(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canGoBack, pop]);

  const frontShift = slide.interpolate({ inputRange: [0, 1], outputRange: [0, width] });
  const underShift = slide.interpolate({ inputRange: [0, 1], outputRange: [-width * PARALLAX, 0] });
  const underDim = slide.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] });

  const value: Nav<string> = {
    root, stack,
    push: push as (s: string) => void,
    pop: () => pop(),
    finish,
    selectTab: selectTab as (s: string) => void,
    canGoBack,
  };

  return <NavContext.Provider value={value}>
    <View style={styles.host} {...pan.panHandlers}>
      {layers.map((screen, index) => {
        const isTop = index === topIndex;
        const isUnder = index === topIndex - 1;
        // Only the top two cards are ever on screen; the rest stay mounted but out of layout,
        // which is what preserves their state for the trip back.
        const shown = finishing ? (index === 0 || isTop) : (isTop || isUnder);
        return <Animated.View
          key={`${screen}-${index}`}
          style={[
            StyleSheet.absoluteFill,
            styles.card,
            isTop && canGoBack && styles.lifted,
            !shown && styles.parked,
            {
              transform: [{ translateX: reduced || !shown ? 0 : isTop ? frontShift : underShift }],
              opacity: isTop ? (finishing ? dismiss : mode === 'fade' ? fade : 1) : 1,
            },
          ]}
          pointerEvents={isTop && shown && mode === 'idle' && !finishing ? 'auto' : 'none'}
        >
          {render.current(screen)}
          {isUnder && !finishing && <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: underDim }]} pointerEvents="none" />}
        </Animated.View>;
      })}

      {mode === 'fade' && leaving && <Animated.View
        style={[StyleSheet.absoluteFill, styles.card, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        pointerEvents="none"
      >
        {leaving}
      </Animated.View>}
    </View>
    {renderTabBar({ active: root, select: selectTab, visible: !(hideTabBarOnPush && canGoBack) })}
  </NavContext.Provider>;
}

const styles = StyleSheet.create({
  // userSelect off: on the web build a back-swipe would otherwise drag a text selection
  // across the page before the gesture is recognised, which looks broken. Inputs are unaffected.
  host: { flex: 1, overflow: 'hidden', backgroundColor: colors.background, userSelect: 'none' },
  card: { backgroundColor: colors.background },
  /** Mounted, stateful, and entirely out of the way. */
  parked: { display: 'none' },
  // The left-edge shadow is the depth cue that sells "this page sits on top of that one".
  lifted: { shadowColor: '#3A1D0E', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: -5, height: 0 }, elevation: 14 },
  scrim: { backgroundColor: '#2A1409' },
});
