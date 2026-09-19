"""
Om, synthesised as a voice rather than as a tone.

The previous version summed sine harmonics and scaled them by a formant curve. That gets the
spectrum roughly right and still sounds like an organ, because what the ear uses to decide
"this is a person" is not the spectral envelope — it is the glottal buzz, the damped ring of
the vocal tract after each pulse, and the tiny period-to-period irregularity of a real larynx.
So this models the source and the filter separately, the way a voice actually works:

    glottal pulse train (with jitter and shimmer) -> vocal tract resonators -> lip radiation

Pitch and formants are set for an adult male chanting voice, which is what a traditional Om is.
Switch VOICE to 'female' to scale both up; nothing else needs to change.
"""
import wave, struct, math, random

SR = 44100
VOICE = 'male'

if VOICE == 'male':
    F0 = 118.0          # deep male chant; female speech sits around 200-230
    # 0.93 rather than 1.0: measured by LPC against a real CC0 recording of a man chanting Om
    # (Freesound 26244), whose F3/F4/F5 came in ~7% below the textbook male averages. Chanting
    # is produced with a lowered larynx, which lengthens the tract and drops every formant.
    TRACT = 0.93
else:
    F0 = 220.0
    TRACT = 1.10        # shorter vocal tract pushes every formant up

# The same real recording measured -10.6 dB/octave across its harmonics, and an earlier
# revision darkened the source to match. That was a misapplication: the reference is a closed
# hum, and a hum is dark because the lips are shut, not because the glottis is soft. Applying
# its tilt to the open "aa" muffled the one part of the chant that should be bright, while the
# M here is already 99% below 300 Hz from its nasal formants alone. No global tilt is applied.

# (frequency Hz, bandwidth Hz) per formant. Male values; TRACT scales them for the female voice.
AA = [(650, 80), (1080, 90), (2450, 140), (3200, 200), (3900, 260)]   # open "aa"
OO = [(350, 60), (740, 80), (2400, 150), (3150, 210), (3850, 270)]    # rounded "oo"
MM = [(250, 90), (1100, 160), (2150, 220), (3000, 260), (3800, 320)]  # nasal murmur "mmm"

def scaled(formants):
    return [(f * TRACT, b * TRACT) for f, b in formants]

AA, OO, MM = scaled(AA), scaled(OO), scaled(MM)

def lerp(a, b, t):
    return [(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t) for x, y in zip(a, b)]

CYCLE = 11.0    # one unhurried breath; the M is the longest of the three sounds
N = int(SR * CYCLE)

def vowel_at(t):
    """A -> U -> M across the breath, with real glides between them."""
    if t < 0.22:  return AA
    if t < 0.33:  return lerp(AA, OO, (t - 0.22) / 0.11)    # jaw closes, lips round
    if t < 0.45:  return OO
    if t < 0.55:  return lerp(OO, MM, (t - 0.45) / 0.10)    # lips meet, sound goes nasal
    return MM

def openness(t):
    """How much sound escapes the lips. The nasal M radiates far less than the open A."""
    if t < 0.45:  return 1.0
    if t < 0.55:  return 1.0 - 0.55 * (t - 0.45) / 0.10
    return 0.45

def envelope(t):
    if t < 0.05:  return (t / 0.05) ** 1.5
    if t < 0.50:  return 1.0
    if t < 0.90:  return 0.55 + 0.45 * (1.0 - (t - 0.50) / 0.40)
    return 0.55 * (1.0 - (t - 0.90) / 0.10) ** 1.2

class Resonator:
    """One formant: a two-pole filter whose impulse response rings at F and decays with B."""
    def __init__(self):
        self.y1 = self.y2 = 0.0
        self.a1 = self.a2 = self.gain = 0.0
    def tune(self, f, b):
        r = math.exp(-math.pi * b / SR)
        self.a1 = 2 * r * math.cos(2 * math.pi * f / SR)
        self.a2 = -r * r
        self.gain = 1 - self.a1 - self.a2      # unity at DC, so cascading stays level
    def step(self, x):
        y = self.gain * x + self.a1 * self.y1 + self.a2 * self.y2
        self.y2, self.y1 = self.y1, y
        return y

# --- the glottis ------------------------------------------------------------------------
# Rosenberg pulse: a slow opening, a faster closing, then a closed phase. The abrupt closure
# is what injects the high harmonics; a smooth wave has none and sounds like a flute.
def glottal(phase, oq=0.58, sq=0.36):
    if phase >= oq:
        return 0.0
    rise = oq * (1 - sq)
    if phase < rise:
        return 0.5 * (1 - math.cos(math.pi * phase / rise))
    return math.cos(math.pi * (phase - rise) / (2 * (oq - rise)))

random.seed(1729)
resonators = [Resonator() for _ in AA]
buf = [0.0] * N

phase = 0.0
period_jitter = 0.0
amplitude = 1.0
prev_flow = 0.0
BLOCK = 64

for start in range(0, N, BLOCK):
    t = start / N
    for r, (f, b) in zip(resonators, vowel_at(t)):
        r.tune(f, b)
    env = envelope(t) * openness(t)
    # Aspiration: a real chant leaks a little breath. Tiny, but its absence is audible as
    # "synthetic" even when nobody can say why.
    breath = 0.012 if t < 0.45 else 0.005

    for i in range(start, min(start + BLOCK, N)):
        tt = i / SR
        vibrato = 1.0 + 0.0042 * math.sin(2 * math.pi * 4.7 * tt) + 0.0018 * math.sin(2 * math.pi * 0.63 * tt)
        # Jitter and shimmer: a larynx is never exactly periodic, and the ear is extremely
        # sensitive to that. Random-walked so the variation drifts rather than buzzing.
        period_jitter += (random.random() - 0.5) * 0.0016
        period_jitter *= 0.995
        amplitude += (random.random() - 0.5) * 0.010
        amplitude = max(0.9, min(1.1, amplitude * 0.998 + 0.002))

        f0 = F0 * vibrato * (1 + period_jitter)
        phase += f0 / SR
        if phase >= 1.0:
            phase -= 1.0
        flow = glottal(phase) * amplitude
        # Lip radiation is very nearly a derivative: it is what tilts the spectrum up 6 dB
        # per octave and turns a dull buzz into a voice.
        source = (flow - prev_flow) * SR / 300.0
        prev_flow = flow
        source += (random.random() - 0.5) * breath

        x = source
        for r in resonators:
            x = r.step(x)
        buf[i] = x * env

# Seamless loop: the tail of the M crossfades into the head of the next A.
XF = int(SR * 0.45)
for i in range(XF):
    a = math.cos(0.5 * math.pi * i / XF)
    b = math.sin(0.5 * math.pi * i / XF)
    buf[i] = buf[i] * b + buf[N - XF + i] * a
buf = buf[:N - XF]

peak = max(abs(x) for x in buf)
scale = 0.9 * 32767 / peak
out = struct.pack('<%dh' % len(buf), *[max(-32768, min(32767, int(x * scale))) for x in buf])

w = wave.open('assets/om-background.wav', 'wb')
w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(out); w.close()
print('wrote %s voice, F0=%.1f Hz, %.2f s @ %d' % (VOICE, F0, len(buf) / SR, SR))
