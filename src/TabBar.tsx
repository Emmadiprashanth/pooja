import React, { useEffect } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DURATION, haptic, iosEase, useAnimatedValue, useReduceMotion } from './motion';
import { colors } from './theme';

export type Tab<T extends string> = { key: T; icon: string; label: string };

/**
 * One tab, with the selected state carried by three signals at once — a filled pill, a colour
 * change and a weight change. Redundant on purpose: colour alone fails for the ~8% of men with
 * a red-green deficiency, and this palette leans entirely on warm reds.
 */
function Item<T extends string>({ tab, active, onPress }: { tab: Tab<T>; active: boolean; onPress: () => void }) {
  const lift = useAnimatedValue(active ? 1 : 0);
  const reduced = useReduceMotion();
  useEffect(() => {
    Animated.spring(lift, { toValue: active ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 300, mass: 0.6 }).start();
  }, [active, lift]);
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return <Pressable
    onPress={onPress}
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    accessibilityLabel={tab.label}
    style={styles.item}
    hitSlop={6}
  >
    <Animated.View style={[styles.pill, active && styles.pillOn, { transform: [{ scale: reduced ? 1 : scale }] }]}>
      <Text style={[styles.icon, active && styles.iconOn]}>{tab.icon}</Text>
    </Animated.View>
    <Text style={[styles.label, active && styles.labelOn]}>{tab.label}</Text>
  </Pressable>;
}

/**
 * The tab bar lives at the bottom and stays there, which is not a stylistic choice.
 *
 * It is the only region of a phone a thumb reaches without regripping, and it is the one
 * control that must never be a reach — these are the app's four permanent places, and a
 * permanent place should cost nothing to return to. Labels stay under the icons rather than
 * being dropped for a cleaner look: an unfamiliar glyph is a guess, and this audience spans
 * a wide age range with no shared icon vocabulary. Four items is also the ceiling here — past
 * five, targets narrow faster than accuracy holds, and mis-taps start teaching people to be
 * careful, which is the opposite of what a home base is for.
 */
export default function TabBar<T extends string>({ tabs, active, onSelect, visible }: {
  tabs: Tab<T>[];
  active: T;
  onSelect: (key: T) => void;
  visible: boolean;
}) {
  const shown = useAnimatedValue(1);
  const reduced = useReduceMotion();
  useEffect(() => {
    Animated.timing(shown, { toValue: visible ? 1 : 0, duration: DURATION.page, easing: iosEase, useNativeDriver: true }).start();
  }, [shown, visible]);
  // Hidden during a ritual: once the Pooja has started, the four ways out are a distraction,
  // and the one control that matters is the pinned action at the bottom of the page.
  const drop = shown.interpolate({ inputRange: [0, 1], outputRange: [86, 0] });
  return <Animated.View
    style={[styles.bar, { transform: [{ translateY: reduced ? 0 : drop }], opacity: shown }]}
    pointerEvents={visible ? 'auto' : 'none'}
    accessibilityRole="tablist"
  >
    {tabs.map(tab => <Item key={tab.key} tab={tab} active={tab.key === active} onPress={() => onSelect(tab.key)} />)}
  </Animated.View>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  pill: { minWidth: 46, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.pale },
  icon: { color: '#9B7D6D', fontSize: 18 },
  iconOn: { color: colors.red },
  label: { color: '#9B7D6D', fontSize: 10, marginTop: 3 },
  labelOn: { color: colors.red, fontWeight: '800' },
});
