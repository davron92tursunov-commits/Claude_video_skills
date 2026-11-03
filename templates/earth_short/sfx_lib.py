import numpy as np, json
from scipy.signal import sosfilt, butter
from scipy.io import wavfile

SR = 44100
DUR = 67.3
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def t_(d): return np.arange(int(SR * d)) / SR
def env_exp(d, k): return np.exp(-k * t_(d))
def fade(x, a=0.005, b=0.02):
    n = len(x); na = max(1, int(a * SR)); nb = max(1, int(b * SR))
    x = x.copy(); x[:na] *= np.linspace(0, 1, na); x[-nb:] *= np.linspace(1, 0, nb); return x
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, f1, f2): return sosfilt(butter(2, [f1, f2], 'band', fs=SR, output='sos'), x)
def swept_noise(d, f0, f1, q=.6):
    """noise through band-pass whose centre sweeps f0->f1 (exp)"""
    n = int(SR * d); x = rng.standard_normal(n); out = np.zeros(n); B = 1024
    zi = None
    for i in range(0, n, B):
        k = i / n; fc = f0 * (f1 / f0) ** k
        sos = butter(2, [fc * (1 - q / 2), min(fc * (1 + q), SR / 2 - 100)], 'band', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y, zi = sosfilt(sos, x[i:i + B], zi=zi); out[i:i + B] = y
    return out / (np.max(np.abs(out)) + 1e-9)
def sweep_sine(d, f0, f1, power=1.0):
    t = t_(d); k = (t / d) ** power; f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def put(x, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(x), N - i)
    if n <= 0: return
    lg = gain * np.sqrt((1 - pan) / 2) * 1.414; rg = gain * np.sqrt((1 + pan) / 2) * 1.414
    L[i:i + n] += x[:n] * lg; R[i:i + n] += x[:n] * rg

# ---------- sound designs ----------
def whoosh(d=0.9, up=True, f0=400, f1=5000):
    x = swept_noise(d, f0, f1) if up else swept_noise(d, f1, f0)
    t = t_(d); e = np.sin(np.pi * (t / d) ** (0.6 if up else 1.6)) ** 1.5
    return fade(x * e)
def boom(d=2.2, f0=110, f1=32, noise=.5):
    t = t_(d); s = sweep_sine(d, f0, f1, .35) * np.exp(-1.8 * t)
    n = lp(rng.standard_normal(len(t)), 420) * np.exp(-3.5 * t) * noise
    return fade(s + n, .002, .05)
def hit(d=1.6):
    t = t_(d); b = boom(d, 150, 38, .6)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-60 * t) * .5
    return b + click
def riser(d=3.0, f0=200, f1=4000):
    t = t_(d); n = swept_noise(d, f0, f1, .9) * (t / d) ** 2
    s = sweep_sine(d, f0 * .6, f1 * .5, 2.0) * (t / d) ** 2.5 * .35
    return fade(n + s, .01, .03)
def ding(f=1318, d=1.6):
    t = t_(d); x = np.zeros(len(t))
    for h, a, dec in [(1, 1, 3.2), (2.76, .5, 5), (5.4, .25, 8), (8.9, .1, 12)]:
        x += a * np.sin(2 * np.pi * f * h * t) * np.exp(-dec * t)
    return fade(x * .6, .001, .05)
def pop(d=.18, f0=900, f1=220):
    t = t_(d); return fade(sweep_sine(d, f0, f1, .5) * np.exp(-22 * t), .001, .01)
def click(n=2):
    out = np.zeros(int(SR * .12))
    for k in range(n):
        c = hp(rng.standard_normal(int(SR * .012)), 1500) * np.exp(-t_(.012) * 350)
        i = int(k * .055 * SR); out[i:i + len(c)] += c * (1 if k == 0 else .6)
    return out
def shimmer(d=2.2, base=1400):
    t = t_(d); x = np.zeros(len(t))
    for i in range(14):
        f = base * (1 + i * .37 + rng.random() * .2); st = rng.random() * d * .5; tt = np.clip(t - st, 0, None)
        x += np.sin(2 * np.pi * f * t) * np.exp(-3.5 * tt) * (t > st) * (.4 / (1 + i * .15))
    return fade(x * .5, .005, .3)
def rumble(d=3.0, f=160, k=1.2):
    t = t_(d); n = lp(rng.standard_normal(len(t)), f) * np.exp(-k * t); n /= np.max(np.abs(n)); return fade(n, .01, .1)
def water(d=3.4):
    t = t_(d); n = swept_noise(d, 300, 1800, .8) * (.35 + .65 * t / d)
    g = np.sin(2 * np.pi * (3 + 2 * t / d) * t) * .25 + .75; return fade(n * g * .9, .15, .3)
def spin(d=6.0, r0=14, r1=2.2):
    t = t_(d); r = r0 + (r1 - r0) * (t / d) ** .7; ph = 2 * np.pi * np.cumsum(r) / SR
    n = bp(rng.standard_normal(len(t)), 300, 2600); am = (.55 + .45 * np.sin(ph)) ** 2
    return fade(n * am * (0.6 + .4 * (1 - t / d)), .1, .5)
def hum(d=5.0, f=70):
    t = t_(d); a = (t / d) ** 1.8
    x = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.01 * t) + .3 * np.sin(2 * np.pi * f * 3.0 * t)) * a
    return fade(x * .6, .05, .1)
def sparkle(d=1.6):
    t = t_(d); x = np.zeros(len(t))
    for i in range(9):
        f = 2400 * (1.25 ** i); st = i * .035
        x += np.sin(2 * np.pi * f * t) * np.exp(-5 * np.clip(t - st, 0, None)) * (t > st) * .25
    return fade(x, .001, .2)
def tick(d=.06):
    t = t_(d); return hp(rng.standard_normal(len(t)), 3000) * np.exp(-80 * t) + np.sin(2 * np.pi * 1800 * t) * np.exp(-120 * t) * .4

def crackle(d=.5, dens=140):
    n = int(SR * d); x = np.zeros(n); k = rng.integers(0, n, max(1, int(dens * d)))
    x[k] = rng.standard_normal(len(k)) * rng.random(len(k)) ** 2
    y = bp(x, 900, 9000) * np.exp(-2.2 * t_(d)); y /= (np.max(np.abs(y)) + 1e-9)
    return fade(y, .001, .05)
def burn(d=1.2):
    t = t_(d); c = crackle(d, 300); n = swept_noise(d, 4500, 900, .8) * np.exp(-2.2 * t) * .55
    return fade(c * .9 + n, .005, .2)
def drone(total):
    n = int(SR * total); t = np.arange(n) / SR; x = np.zeros(n)
    for f, a, lf in [(55, .5, .07), (82.4, .28, .05), (110, .2, .09), (164.8, .08, .04)]:
        x += a * np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * lf * t)) * (.75 + .25 * np.sin(2 * np.pi * lf * 2 * t + f))
    x += lp(rng.standard_normal(n), 300) * .25
    x /= np.max(np.abs(x)); f = np.ones(n); f[:int(2 * SR)] = np.linspace(0, 1, int(2 * SR)); f[-int(3 * SR):] = np.linspace(1, 0, int(3 * SR))
    return x * f

