exec(open('sfx_lib.py', encoding='utf-8-sig').read())
from scipy.io import wavfile
# Foydalanuvchi talabi: whoosh/riser/swept-noise va "shhh" fon YO'Q — faqat tonal/past tovushlar va real ob'ekt tovushlari.
def eio(k):
    k = min(1.0, max(0.0, k)); return 4*k**3 if k < .5 else 1 - (-2*k + 2)**3 / 2
def descend(d=3.0, f0=300, f1=40, power=.8):
    t = t_(d); s = sweep_sine(d, f0, f1, power) * (1 - (t / d) ** 3); return fade(s, .02, .1)
def pad(d=3.0, f=110, a=1.0):
    t = t_(d); x = (np.sin(2*np.pi*f*t) + .6*np.sin(2*np.pi*f*1.5*t+.3) + .4*np.sin(2*np.pi*f*2.01*t)) * (np.sin(np.pi * t / d) ** 1.5)
    return fade(x * .45 * a, .05, .2)
def heartbeat(d=.9):
    t = t_(d); x = np.zeros(len(t))
    for st, a in ((0, 1), (.22, .7)):
        tt = np.clip(t - st, 0, None); x += np.sin(2*np.pi*48*tt) * np.exp(-16*tt) * (t > st) * a
    return fade(x, .001, .05)
def cross_times(a, b, steps, f):
    out = []
    for i in range(1, steps + 1):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            m = (lo + hi) / 2
            if f(m) >= i / steps: hi = m
            else: lo = m
        out.append(a + hi * (b - a))
    return out

put(drone(DUR), 0, .16)
ease=lambda k: 1 - (1 - k) ** 3
# 0.0 EVERY TREE AROUND YOU. GONE. (daraxtlar birin-ketin yo'qoladi 0.15-2.8)
put(boom(2.6, 140, 28, .9), 0.0, 1.0); put(hit(), 0.0, .7)
for i, tt in enumerate(cross_times(.2, 2.7, 12, lambda k: k)): put(pop(.1, 700 - i * 30, 200), tt, .22)
put(hit(), 2.8, .6); put(descend(1.0, 500, 60, .6), 2.8, .4)
# 4.12 RIGHT NOW?  5.86 NOT YET.
put(pop(.2, 700, 200), 4.12, .6); put(hit(), 4.14, .5); put(heartbeat(), 4.5, .5); put(heartbeat(), 5.1, .45)
for i in range(6): put(pop(.1, 400 + i * 50, 200), 5.95 + i * .1, .25)
put(ding(1318, 1.2), 6.5, .3)
# 7.4 SO WHAT IF ... 9.54 VANISHED
put(pad(3.2, 165, .5), 7.35, .32); put(pop(), 7.5, .3); put(boom(2.0, 110, 30, .6), 9.54, .7); put(ding(880, 1.4), 9.56, .3)
# 11.44 THREE TRILLION
for tt in cross_times(11.4, 12.7, 24, ease): put(tick(), tt, .13)
put(pad(2.8, 196, .4), 10.95, .25); put(hit(), 12.75, .55); put(ding(1568, 1.2), 12.8, .3)
# 13.84 ALMOST HALF GONE
for tt in cross_times(13.84, 14.7, 10, ease): put(tick(), tt, .14)
put(hit(), 14.64, .55); put(descend(1.2, 600, 80, .6), 14.7, .35)
# 15.7 NOW ALL THE REST, 17.98 TONIGHT
put(pad(2.6, 130, .4), 15.7, .25); put(boom(2.0, 90, 30, .5), 16.9, .6); put(hit(), 17.98, .6); put(descend(1.5, 500, 50, .6), 18.0, .4)
# 19.24 BUT YOU WOULDN'T SUFFOCATE (tinch)
put(pad(2.6, 220, .5), 19.2, .3); put(sparkle(1.4), 19.95, .3)
# 21.94 21% oxygen
for tt in cross_times(21.9, 22.7, 8, ease): put(tick(), tt, .13)
put(ding(1318, 1.4), 22.75, .35); put(hit(), 22.76, .4); put(pad(3.0, 175, .4), 23.6, .25)
# 26.6 carbon, 27.42
put(boom(1.8, 100, 30, .5), 27.42, .6); put(descend(1.4, 500, 70, .6), 27.4, .35)
# 29.92 a quarter
for tt in cross_times(29.9, 30.5, 6, ease): put(tick(), tt, .13)
put(hit(), 30.55, .5); put(ding(1175, 1.3), 30.6, .3)
# 33.62 stays in the sky
put(hum(3.0, 55), 33.4, .35); put(descend(1.8, 400, 50, .6), 34.1, .4)
# 36.18 roots, 38.76 hills slide, 40.4 brown
put(pad(2.4, 147, .4), 36.2, .25); put(boom(2.4, 80, 28, .6), 38.76, .75); put(rumble(2.6, 120, 1.0), 38.8, .5); put(pop(.3, 240, 100), 40.4, .45)
# 41.8 forests pump water, 44.26 rain belts dry
put(sparkle(1.4), 41.9, .3); put(pop(.2, 600, 200), 42.1, .35)
for i in range(6): put(pop(.1, 520 - i * 30, 200), 44.0 + i * .12, .2)
put(hit(), 44.4, .5); put(descend(1.2, 500, 70, .6), 44.45, .35)
# 45.96 your city hotter, 47.92 several degrees
put(hum(3.2, 70), 46.0, .35); put(hit(), 47.9, .5); put(ding(880, 1.2), 47.95, .3)
# 49.74 scary part
put(boom(2.8, 80, 26, .5), 49.8, .85); put(descend(1.8, 400, 50, .6), 50.1, .4); put(hit(), 50.64, .6)
# 52.08 1.6 billion
for tt in cross_times(52.08, 53.3, 18, ease): put(tick(), tt, .13)
put(pad(3.0, 175, .4), 52.0, .25); put(hit(), 53.35, .5); put(ding(1318, 1.4), 53.4, .3)
# 56.26 don't worry
put(pad(3.4, 220, .5), 56.2, .3); put(sparkle(1.6), 56.5, .25)
# 59.44 satellites, 61.16 green leaves, 61.68 twenty
put(sparkle(1.4), 59.9, .3); put(ding(1568, 1.3), 61.2, .3)
for tt in cross_times(61.1, 62.0, 8, ease): put(tick(), tt, .12)
put(hit(), 62.1, .45)
# 62.9 FOLLOW
put(boom(2.4, 140, 28, .9), 62.9, .95); put(hit(), 62.95, .65); put(sparkle(1.4), 63.0, .4)
put(pop(), 63.95, .35); put(pop(), 64.4, .3)
put(click(), 65.0, .85); put(ding(1568, 1.1), 65.05, .55); put(ding(2093, 1.0), 65.2, .35)

st = np.stack([np.tanh(L * 1.15), np.tanh(R * 1.15)], 1)
rms = np.sqrt((st ** 2).mean()); st = st * (0.115 / rms) if rms > 0 else st
st = np.tanh(st * 1.1) / 1.05
fi = int(.005 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
wavfile.write('sfx.wav', SR, (st * 32767).astype(np.int16))
print('sfx ok', st.shape)
