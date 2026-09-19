import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DURATION, haptic, useAnimatedValue, useEntrance, useReduceMotion } from './motion';
import { colors, styles as s } from './theme';

/**
 * Every tappable thing dips slightly and taps back. The scale is small on purpose — 3% is
 * under the threshold where motion becomes decoration, but well over the threshold where the
 * hand registers "that took". Without it, a flat surface gives no evidence a tap was received,
 * and people re-tap, which is how double-submissions happen.
 */
export function Press({ children, onPress, style, containerStyle, grow, scale = 0.97, feedback = 'light', accessibilityLabel, accessibilityRole = 'button', disabled }: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * The animated wrapper is the element the parent lays out, so anything that decides this
   * item's size or position within its parent belongs here — widths, flex, percentages.
   * Putting them on `style` only reaches the Pressable inside, which then sizes to its own
   * content while the parent lays the wrapper out as if it were empty.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /** Shorthand for the common case of filling a row. */
  grow?: boolean;
  scale?: number;
  feedback?: 'light' | 'select' | 'medium' | 'none';
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
  disabled?: boolean;
}) {
  const value = useAnimatedValue(1);
  const reduced = useReduceMotion();
  const to = (toValue: number) => Animated.spring(value, { toValue, useNativeDriver: true, damping: 22, stiffness: 420, mass: 0.7 }).start();
  return <Animated.View style={[grow && styles.grow, containerStyle, { transform: [{ scale: reduced ? 1 : value }] }]}>
    <Pressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={() => !disabled && to(scale)}
      onPressOut={() => to(1)}
      onPress={() => { if (disabled) return; if (feedback !== 'none') haptic[feedback](); onPress?.(); }}
      style={({ pressed }) => [style, pressed && !reduced && { opacity: 0.94 }, disabled && { opacity: 0.45 }]}
    >
      {children}
    </Pressable>
  </Animated.View>;
}

/**
 * The large title scrolls away and reappears as a compact centred one, which is Apple's answer
 * to a real tension: a title has to be big enough to orient someone arriving cold, but a
 * permanent big title steals a third of a small screen from the content they came for. Letting
 * it collapse means the label is loud exactly when it is needed — at arrival — and quiet once
 * the user has clearly found what they wanted. The hairline only draws once content is actually
 * underneath the bar, so the chrome stays invisible until it has something to separate.
 */
function CollapsingBar({ title, subtitle, scrollY, onBack, backLabel, trailing }: {
  title: string;
  subtitle?: string;
  scrollY: Animated.Value;
  onBack?: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
}) {
  const compact = scrollY.interpolate({ inputRange: [18, 44], outputRange: [0, 1], extrapolate: 'clamp' });
  const rise = scrollY.interpolate({ inputRange: [18, 44], outputRange: [7, 0], extrapolate: 'clamp' });
  return <View style={styles.bar} pointerEvents="box-none">
    <Animated.View style={[StyleSheet.absoluteFill, styles.barFill, { opacity: compact }]} pointerEvents="none" />
    <View style={styles.barRow} pointerEvents="box-none">
      <View style={styles.barSide}>
        {onBack && <Press style={styles.backTarget} onPress={onBack} accessibilityLabel={backLabel && backLabel !== 'Back' ? `Back to ${backLabel}` : 'Go back'} scale={0.9}>
          <Text style={styles.backChevron}>‹</Text>
          {!!backLabel && <Text style={styles.backLabel} numberOfLines={1}>{backLabel}</Text>}
        </Press>}
      </View>
      <Animated.View style={[styles.barTitleWrap, { opacity: compact, transform: [{ translateY: rise }] }]} pointerEvents="none">
        <Text style={styles.barTitle} numberOfLines={1}>{title}</Text>
      </Animated.View>
      <View style={[styles.barSide, styles.barSideEnd]}>{trailing}</View>
    </View>
  </View>;
}

/**
 * One page shell for every screen, because consistency is what lets someone stop looking. When
 * the back control, the title and the primary action live in the same place on all seven
 * screens, navigation drops out of conscious attention and the ritual gets it back.
 */
export default function Screen({ title, subtitle, eyebrow, onBack, backLabel, trailing, action, children, largeTitle = true }: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
  /** Pinned bottom bar. Kept out of the scroll on purpose — see ActionBar. */
  action?: React.ReactNode;
  children: React.ReactNode;
  largeTitle?: boolean;
}) {
  const scrollY = useAnimatedValue(0);
  // Two beats, not one: the title lands, then the content settles under it. A screen that
  // assembles in reading order feels composed; the same content arriving all at once feels
  // dumped. Both beats are done inside a third of a second, so nobody waits for the ceremony.
  const titleEntrance = useEntrance(0, 10);
  const bodyEntrance = useEntrance(1, 16);
  return <View style={styles.screen}>
    <CollapsingBar title={title} subtitle={subtitle} scrollY={scrollY} onBack={onBack} backLabel={backLabel} trailing={trailing} />
    <Animated.ScrollView
      contentContainerStyle={[s.content, { paddingTop: 4, paddingBottom: action ? 116 : 34 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
    >
      {largeTitle && <Animated.View style={[styles.largeWrap, titleEntrance]}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.largeTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.largeSubtitle}>{subtitle}</Text>}
      </Animated.View>}
      <Animated.View style={bodyEntrance}>{children}</Animated.View>
    </Animated.ScrollView>
    {action}
  </View>;
}

/**
 * The primary action is pinned to the bottom rather than parked at the end of the scroll.
 *
 * Two reasons, and they compound. Reach: the bottom third of a phone is the only area a thumb
 * covers comfortably, and this app is used with one hand while the other holds a lamp. And
 * visibility: an action at the end of a long checklist is an action the user has to go looking
 * for, which quietly turns "continue" into a puzzle. Pinning it also lets the button carry live
 * status — "3 of 6 ready" sits on the control it qualifies, so the state and the next move are
 * read in one glance instead of two.
 */
export function ActionBar({ label, hint, onPress, disabled, secondary }: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: { label: string; onPress: () => void };
}) {
  return <View style={styles.actionBar}>
    {!!hint && <Text style={styles.actionHint}>{hint}</Text>}
    <View style={styles.actionRow}>
      {secondary && <Press style={[styles.action, styles.actionGhost]} onPress={secondary.onPress} accessibilityLabel={secondary.label}>
        <Text style={styles.actionGhostText}>{secondary.label}</Text>
      </Press>}
      <Press grow style={[styles.action, styles.actionPrimary]} onPress={onPress} disabled={disabled} feedback="medium" accessibilityLabel={label}>
        <Text style={styles.actionText}>{label}</Text>
      </Press>
    </View>
  </View>;
}

/**
 * Three screens stand between deciding to do a Pooja and doing one. Naming the position in that
 * sequence is the cheapest anxiety reduction available: people abandon flows of unknown length,
 * and finish flows whose end they can see. The filled dots also give the goal-gradient a surface
 * to work on — progress visibly accelerates toward the last step.
 */
export function StepTrail({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return <View style={styles.trail} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}: ${labels[step - 1]}`}>
    {Array.from({ length: total }, (_, i) => <View key={i} style={styles.trailItem}>
      <View style={[styles.trailDot, i < step && styles.trailDotDone, i === step - 1 && styles.trailDotNow]} />
      <Text style={[styles.trailLabel, i === step - 1 && styles.trailLabelNow]} numberOfLines={1}>{labels[i]}</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, height: 52 },
  barFill: { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  barSide: { minWidth: 92, flexDirection: 'row', alignItems: 'center' },
  barSideEnd: { justifyContent: 'flex-end' },
  // 44pt is the smallest target most adults hit reliably on the first try; back is used often
  // enough that missing it is a real cost.
  backTarget: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  backChevron: { color: colors.red, fontSize: 32, lineHeight: 34, marginTop: -3 },
  backLabel: { color: colors.red, fontSize: 15, fontWeight: '600', marginLeft: 1, maxWidth: 74 },
  barTitleWrap: { flex: 1, alignItems: 'center' },
  barTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  largeWrap: { paddingTop: 54, paddingBottom: 12 },
  eyebrow: { color: colors.orange, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 5, textTransform: 'uppercase' },
  largeTitle: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.6 },
  largeSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14,
    backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  actionHint: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  grow: { flex: 1 },
  actionPrimary: { flex: 1, backgroundColor: colors.red },
  actionText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  actionGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionGhostText: { color: colors.red, fontSize: 15, fontWeight: '800' },
  trail: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  trailItem: { flex: 1, alignItems: 'center' },
  trailDot: { width: '100%', height: 4, borderRadius: 3, backgroundColor: colors.border },
  trailDotDone: { backgroundColor: colors.orange },
  trailDotNow: { backgroundColor: colors.red },
  trailLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 6 },
  trailLabelNow: { color: colors.red, fontWeight: '900' },
});
