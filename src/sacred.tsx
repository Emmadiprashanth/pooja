import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { useBreathe, useFlicker, useReduceMotion, useSpin } from './motion';
import { colors } from './theme';

/**
 * The devotional ornament, drawn rather than illustrated.
 *
 * Every motif here is generated from its own geometry — petals placed by angle, kolam loops
 * traced around a dot grid, an arch built from cusps. That is not showing off: a mandala whose
 * petal count is a parameter can be tuned to the space it sits in and stays crisp at any size,
 * where a bitmap would be a fixed, blurry compromise. It also keeps the ornament honest. These
 * are the real forms — a torana is a temple doorway, a kolam is a continuous line looped
 * around dots, a moon phase is the actual terminator — not decorative gestures at them.
 *
 * Restraint is the rule throughout. Ornament sits behind content at low opacity and never
 * competes with a word the user needs to read.
 */

const TAU = Math.PI * 2;
const polar = (cx: number, cy: number, r: number, angle: number) =>
  [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;

/** One petal: a teardrop from the centre outward, drawn as two mirrored quadratic curves. */
function petalPath(cx: number, cy: number, inner: number, outer: number, angle: number, width: number) {
  const [tipX, tipY] = polar(cx, cy, outer, angle);
  const [baseX, baseY] = polar(cx, cy, inner, angle);
  const [leftX, leftY] = polar(cx, cy, (inner + outer) / 2, angle - width);
  const [rightX, rightY] = polar(cx, cy, (inner + outer) / 2, angle + width);
  return `M ${baseX} ${baseY} Q ${leftX} ${leftY} ${tipX} ${tipY} Q ${rightX} ${rightY} ${baseX} ${baseY} Z`;
}

/**
 * A mandala of concentric petal rings, rotating slowly enough to read as stillness.
 * Rings counter-rotate against one another, which is what gives it depth rather than the look
 * of a single decal spinning.
 */
export function Mandala({ size, color = colors.gold, opacity = 0.16, period = 90000 }: {
  size: number; color?: string; opacity?: number; period?: number;
}) {
  const spinOuter = useSpin(period);
  const spinInner = useSpin(period * 0.7, true);
  const c = size / 2;

  const rings = useMemo(() => ([
    { petals: 16, inner: c * 0.46, outer: c * 0.94, width: 0.16, strokeWidth: size * 0.004 },
    { petals: 12, inner: c * 0.22, outer: c * 0.52, width: 0.2, strokeWidth: size * 0.005 },
  ]), [c, size]);

  const ringPath = (ring: typeof rings[number]) =>
    Array.from({ length: ring.petals }, (_, i) =>
      petalPath(c, c, ring.inner, ring.outer, (i / ring.petals) * TAU, ring.width)).join(' ');

  return <View style={{ width: size, height: size }} pointerEvents="none">
    <Animated.View style={{ position: 'absolute', transform: [{ rotate: spinOuter }] }}>
      <Svg width={size} height={size}>
        <G opacity={opacity}>
          <Path d={ringPath(rings[0])} stroke={color} strokeWidth={rings[0].strokeWidth} fill="none" />
          <Circle cx={c} cy={c} r={c * 0.96} stroke={color} strokeWidth={size * 0.003} fill="none" />
        </G>
      </Svg>
    </Animated.View>
    <Animated.View style={{ position: 'absolute', transform: [{ rotate: spinInner }] }}>
      <Svg width={size} height={size}>
        <G opacity={opacity * 1.25}>
          <Path d={ringPath(rings[1])} stroke={color} strokeWidth={rings[1].strokeWidth} fill="none" />
          <Circle cx={c} cy={c} r={c * 0.17} stroke={color} strokeWidth={size * 0.004} fill="none" />
        </G>
      </Svg>
    </Animated.View>
  </View>;
}

/**
 * A kolam band: the continuous looping line drawn in rice flour around a grid of dots on a
 * threshold every morning. Here it marks the boundary between sections, which is close to its
 * actual job — a kolam is drawn where one space becomes another.
 *
 * Built from overlapping circles rather than paired arcs. Two arcs between the same pair of
 * points simply retrace one another, which is why the first attempt drew half-loops; whole
 * circles that overlap give the interlaced sikku-kolam weave with no arc-flag arithmetic at all.
 */
export function Kolam({ width, color = colors.gold, opacity = 0.55, dots = 11 }: {
  width: number; color?: string; opacity?: number; dots?: number;
}) {
  const step = width / dots;
  // The loop radius must exceed half the spacing or the circles sit apart and the weave is
  // lost; the band's height follows from the radius rather than clamping it.
  const r = step * 0.62;
  const height = Math.ceil(r * 2 + 4);
  const mid = height / 2;

  return <View pointerEvents="none" style={{ width, height, alignItems: 'center' }}>
    <Svg width={width} height={height}>
      <G opacity={opacity}>
        {Array.from({ length: dots }, (_, i) => {
          const x = step * (i + 0.5);
          return <Circle key={`loop-${i}`} cx={x} cy={mid} r={r} stroke={color} strokeWidth={1} fill="none" />;
        })}
        {Array.from({ length: dots }, (_, i) => (
          <Circle key={`dot-${i}`} cx={step * (i + 0.5)} cy={mid} r={1.3} fill={color} />
        ))}
        {/* The tapered rules either side stop the chain from looking like it was cut off. */}
        <Path d={`M 0 ${mid} H ${step * 0.3}`} stroke={color} strokeWidth={0.8} opacity={0.5} />
        <Path d={`M ${width - step * 0.3} ${mid} H ${width}`} stroke={color} strokeWidth={0.8} opacity={0.5} />
      </G>
    </Svg>
  </View>;
}

/**
 * A torana — the cusped temple doorway arch, framing the hero so that opening it feels like
 * entering somewhere rather than tapping a card.
 *
 * Properly constructed: the lobes are sampled along a half-ellipse and each span between
 * samples is an arc bulging inward, which is what makes a multifoil arch read as carved. The
 * earlier version merely nudged a polyline upward and looked like a scalloped blob, because a
 * cusped arch is not a wavy line — it is a dome with bites taken out of it.
 */
export function Torana({ width, height, color = colors.gold, opacity = 0.3, cusps = 11, crown = false }: {
  width: number; height: number; color?: string; opacity?: number; cusps?: number;
  /** Omit the posts and draw only the dome. Full-height posts read as stray vertical lines
   *  when there is content between them; a crown keeps the arch and loses the confusion. */
  crown?: boolean;
}) {
  const inset = width * 0.05;
  const cx = width / 2;
  const a = cx - inset;                 // half-span of the opening
  const spring = height * 0.92;         // where the arch springs from the posts
  const b = height * 0.62;              // rise of the dome

  const point = (i: number) => {
    const t = Math.PI - (i / cusps) * Math.PI;      // left round to right
    return [cx + a * Math.cos(t), spring - b * Math.sin(t)] as const;
  };

  let d = crown ? `M ${inset} ${spring}` : `M ${inset} ${height} L ${inset} ${spring}`;
  for (let i = 1; i <= cusps; i++) {
    const [px, py] = point(i - 1);
    const [qx, qy] = point(i);
    const chord = Math.hypot(qx - px, qy - py);
    // sweep 0 traversing left→right along the dome bulges each lobe into the opening
    d += ` A ${chord * 0.62} ${chord * 0.62} 0 0 0 ${qx} ${qy}`;
  }
  if (!crown) d += ` L ${width - inset} ${height}`;

  const [apexX, apexY] = point(cusps / 2);

  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
    <Svg width={width} height={height}>
      <G opacity={opacity}>
        <Path d={d} stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* A finial at the crown, the way a real torana carries a kalasha. */}
        <Circle cx={apexX} cy={apexY - height * 0.055} r={height * 0.022} stroke={color} strokeWidth={1.1} fill="none" />
        <Path d={`M ${apexX} ${apexY - height * 0.03} V ${apexY}`} stroke={color} strokeWidth={1.1} />
      </G>
    </Svg>
  </View>;
}

/**
 * A diya with a live flame.
 *
 * The flame is the one place on the screen allowed to move continuously, because a lamp that
 * holds perfectly still is the one thing a lamp never does. Its light also spills onto the
 * surroundings via a radial glow that brightens with the flame, so the flicker reads as
 * illumination rather than a wobbling shape.
 */
export function Diya({ size = 64 }: { size?: number }) {
  const flame = useFlicker();
  const w = size, h = size;
  const bowlTop = h * 0.62;

  return <View style={{ width: w, height: h }} pointerEvents="none">
    <Animated.View style={{ position: 'absolute', width: w, height: h, opacity: flame.glow }}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="diyaGlow" cx="50%" cy="38%" r="52%">
            <Stop offset="0%" stopColor="#FFD98A" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#FFD98A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={w / 2} cy={h * 0.38} r={w * 0.5} fill="url(#diyaGlow)" />
      </Svg>
    </Animated.View>

    <Animated.View style={{
      position: 'absolute', width: w, height: h,
      opacity: flame.opacity,
      transform: [{ translateY: h * 0.2 }, { scaleY: flame.scaleY }, { scaleX: flame.scaleX }, { translateY: -h * 0.2 }],
    }}>
      <Svg width={w} height={h}>
        {/* Outer flame, then a brighter core — a single-colour flame reads as a leaf. */}
        <Path
          d={`M ${w / 2} ${h * 0.12} C ${w * 0.68} ${h * 0.33} ${w * 0.64} ${h * 0.52} ${w / 2} ${h * 0.58} C ${w * 0.36} ${h * 0.52} ${w * 0.32} ${h * 0.33} ${w / 2} ${h * 0.12} Z`}
          fill="#F5A623"
        />
        <Path
          d={`M ${w / 2} ${h * 0.26} C ${w * 0.59} ${h * 0.38} ${w * 0.57} ${h * 0.5} ${w / 2} ${h * 0.55} C ${w * 0.43} ${h * 0.5} ${w * 0.41} ${h * 0.38} ${w / 2} ${h * 0.26} Z`}
          fill="#FFE9A8"
        />
      </Svg>
    </Animated.View>

    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      {/* The clay bowl: a shallow crescent with a lip, and a wick bridging it to the flame. */}
      <Path d={`M ${w / 2} ${bowlTop - h * 0.06} L ${w / 2} ${bowlTop}`} stroke="#8A5A2B" strokeWidth={w * 0.035} />
      <Path
        d={`M ${w * 0.16} ${bowlTop} Q ${w * 0.5} ${bowlTop + h * 0.34} ${w * 0.84} ${bowlTop} Q ${w * 0.5} ${bowlTop + h * 0.1} ${w * 0.16} ${bowlTop} Z`}
        fill={colors.red}
      />
      <Path
        d={`M ${w * 0.16} ${bowlTop} Q ${w * 0.5} ${bowlTop + h * 0.1} ${w * 0.84} ${bowlTop}`}
        stroke={colors.gold} strokeWidth={w * 0.022} fill="none"
      />
    </Svg>
  </View>;
}

/**
 * The Moon as it actually looks tonight, drawn from the elongation the Panchangam already
 * computes. The tithi *is* this shape — showing it turns an unfamiliar Sanskrit name into
 * something anyone can verify by stepping outside and looking up.
 */
export function MoonPhase({ size = 34, elongationDeg, color = colors.gold, shadow = '#2A1409' }: {
  size?: number; elongationDeg: number; color?: string; shadow?: string;
}) {
  const r = size / 2 - 1;
  const c = size / 2;
  const angle = ((elongationDeg % 360) + 360) % 360;
  const waning = angle > 180;
  const k = Math.cos((angle * Math.PI) / 180);   // +1 at new moon, -1 at full
  const rx = Math.abs(k) * r;
  // Right half of the disc, closed by the terminator ellipse. Which side the terminator bulges
  // toward is what separates a crescent from a gibbous.
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${rx} ${r} 0 0 ${k > 0 ? 0 : 1} ${c} ${c - r} Z`;

  return <View style={{ width: size, height: size }} pointerEvents="none">
    <Svg width={size} height={size}>
      <G transform={waning ? `translate(${size}, 0) scale(-1, 1)` : undefined}>
        <Circle cx={c} cy={c} r={r} fill={shadow} opacity={0.82} />
        <Path d={lit} fill={color} />
        <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={0.8} fill="none" opacity={0.55} />
      </G>
    </Svg>
  </View>;
}

/**
 * A lotus mark: a broad outer row of petals with a shorter inner row filling the gaps.
 *
 * The two rows are what make it a flower. A single fan of narrow petals — the first attempt —
 * reads as a sunburst, because what the eye uses to identify a lotus is the overlap between
 * layers, not the count of points.
 */
export function Lotus({ size = 34, color = colors.gold, opacity = 0.95 }: { size?: number; color?: string; opacity?: number }) {
  const cx = size / 2;
  const base = size * 0.78;
  const fan = (count: number, inner: number, outer: number, width: number, spread: number) =>
    Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = Math.PI + (0.5 - spread / 2 + t * spread) * Math.PI;
      return petalPath(cx, base, size * inner, size * outer, angle, width);
    }).join(' ');

  return <View style={{ width: size, height: size }} pointerEvents="none">
    <Svg width={size} height={size}>
      <G opacity={opacity}>
        {/* Petals wide enough to touch their neighbours. Narrow ones never resolve into a
            flower no matter how many are added — they just make a finer sunburst. */}
        <Path d={fan(5, 0.05, 0.46, 0.52, 1.02)} fill={color} opacity={0.5} />
        <Path d={fan(4, 0.04, 0.33, 0.58, 0.62)} fill={color} opacity={0.85} />
        <Circle cx={cx} cy={base} r={size * 0.05} fill={color} />
      </G>
    </Svg>
  </View>;
}

/**
 * A halo that breathes — the aarti glow. Sits behind a deity mark or a play control to say
 * "this is the live thing on the screen" without resorting to a coloured border.
 */
export function Halo({ size, color = colors.gold, strength = 0.4, style }: {
  size: number; color?: string;
  /** Peak opacity of the ring. Needs raising on pale surfaces, where a soft gold glow has
   *  almost nothing to register against. */
  strength?: number;
  style?: ViewStyle;
}) {
  const breath = useBreathe(5200, 0.1);
  return <Animated.View
    pointerEvents="none"
    style={[{ position: 'absolute', width: size, height: size, opacity: breath.opacity, transform: [{ scale: breath.scale }] }, style]}
  >
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="42%" stopColor={color} stopOpacity="0" />
          <Stop offset="74%" stopColor={color} stopOpacity={String(strength)} />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo)" />
    </Svg>
  </Animated.View>;
}

/**
 * A fall of flower petals — pushpavrishti, the offering flung at the close of a Pooja.
 *
 * Reserved for exactly one moment: finishing. A celebration that fires often stops being a
 * celebration, and an app that congratulates you for scrolling is insulting. Each petal gets
 * its own drift, spin and duration from a fixed seed, so the fall looks scattered without
 * needing randomness at runtime — which also keeps it identical on every device.
 */
export function PetalFall({ width, height, count = 18, onDone }: {
  width: number; height: number; count?: number; onDone?: () => void;
}) {
  const reduced = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  const petals = useMemo(() => {
    let seed = 20260915;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    return Array.from({ length: count }, () => ({
      x: random() * width,
      drift: (random() - 0.5) * width * 0.35,
      size: 13 + random() * 16,
      delay: random() * 0.42,
      fall: 0.5 + random() * 0.45,
      spin: (random() - 0.5) * 3,
      tint: random() > 0.55 ? colors.gold : '#F0A34A',
    }));
  }, [count, width]);

  useEffect(() => {
    if (reduced) { onDone?.(); return; }
    Animated.timing(progress, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true })
      .start(({ finished }) => { if (finished) onDone?.(); });
  }, [onDone, progress, reduced]);

  if (reduced) return null;

  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }}>
    {petals.map((petal, i) => {
      const end = Math.min(1, petal.delay + petal.fall);
      const range = [0, petal.delay, end, 1];
      return <Animated.View
        key={i}
        style={{
          position: 'absolute', left: petal.x, top: -petal.size,
          opacity: progress.interpolate({ inputRange: range, outputRange: [0, 0.95, 0, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: range, outputRange: [0, 0, height + petal.size, height + petal.size] }) },
            { translateX: progress.interpolate({ inputRange: range, outputRange: [0, 0, petal.drift, petal.drift] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${petal.spin * 360}deg`] }) },
          ],
        }}
      >
        <Lotus size={petal.size} color={petal.tint} opacity={0.9} />
      </Animated.View>;
    })}
  </View>;
}
