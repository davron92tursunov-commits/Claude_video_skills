// Short: "What if Earth had no tilt". Kadrlar Fola ovozining so'z vaqtlariga (words.json) bog'langan.
import {THREE, composer, renderer, renderPass, grade, camera, clamp, seg, sm, eo, eio, lerp} from './core.js';
import {earthScene, parkScene} from './scenes.js';

const $ = id => document.getElementById(id);
const [ES, PS] = [earthScene(), await parkScene()];
const fmt = n => Math.round(n).toLocaleString('en-US');
const cnt = (t, a, b, from, to) => from + (to - from) * eo(seg(t, a, b));
const T = 65.2, PI = Math.PI, D = 23.4;

// barcha vaqtlar — video soniyalari
const SHOTS = [
  [0, 3.0, ES, (t, k) => ({lon: 20, lat: 8, dist: lerp(5.2, 4.5, eo(k)), y: 1180, tilt: D * Math.cos(t * 2.1), axis: 1, spin: t * .06}),
    t => ({small: 'NO SUMMER.', big: t > 1.5 ? 'NO WINTER.' : ''})],                                                                                         // winter 1.76
  [3.0, 4.3, ES, (t, k) => ({lon: 20, lat: 8, dist: 4.5, y: 1180, tilt: D * Math.cos(t * 2.1), axis: 1, spin: t * .06}), t => ({red: 'RIGHT NOW?', big: 'NO WINTER?'})],
  [4.3, 5.9, ES, (t, k) => ({lon: 20, lat: 8, dist: lerp(4.5, 5.2, k), y: 1180, tilt: D, axis: 1, spin: t * .06}), t => ({small: 'NOT YET.'})],              // not 4.36
  [5.9, 8.6, ES, (t, k) => ({lon: 20, lat: 8, dist: lerp(5.2, 6.8, eio(k)), y: 1230, tilt: D * (1 - eio(seg(t, 7.3, 8.5))), axis: 1, spin: t * .06}),
    t => ({small: 'SO, WHAT IF EARTH HAD', big: t > 7.1 ? 'NO TILT?' : ''})],                                                                              // tilt 7.38
  [8.6, 11.0, ES, (t, k) => ({lon: 20, lat: 8, dist: 6.8, y: 1250, tilt: D, axis: 1, spin: t * .06}),
    t => ({small: 'TODAY, IT LEANS', big: cnt(t, 9.4, 10.0, 0, D).toFixed(1) + '°', sub: t > 10.1 ? 'TILT OF EARTH’S AXIS' : '', src: 'AXIAL TILT = 23.4° · NASA'})],       // 23 9.5
  [11.0, 14.1, ES, (t, k) => ({lon: 20, lat: 8, dist: 6.8, y: 1250, tilt: D * Math.cos((t - 11) * 1.7), axis: 1, spin: t * .06}),
    t => ({small: 'THE ONLY REASON YOU HAVE', big: t > 12.55 ? 'SEASONS' : '', src: 'TILT TOWARD THE SUN = SUMMER · AWAY = WINTER'})],                         // seasons 12.68
  [14.1, 19.5, ES, (t, k) => ({lon: 20, lat: 0, dist: 6.2, y: 1230, tilt: D * (1 - eio(seg(t, 14.3, 16.1))), axis: 1, spin: t * .5}),
    t => t < 16.2 ? {small: 'STRAIGHTEN IT UP', big: (D * (1 - eio(seg(t, 14.3, 16.1)))).toFixed(1) + '°'} : {small: 'THE SUN STAYS ABOVE THE', big: 'EQUATOR', sub: t > 17.0 ? 'AT NOON · EVERY DAY' : '', src: 'ZERO TILT → SUN OVER THE EQUATOR ALL YEAR'}],   // straighten 14.18, equator 16.3
  [19.5, 22.7, ES, (t, k) => ({lon: 20, lat: 50, dist: 5.4, y: 1250, tilt: 0, axis: 0, spin: t * .6, az: -PI / 2 + .35}),
    t => ({small: 'DAY AND NIGHT: EACH', big: t > 20.2 ? '12 HOURS' : '', sub: t > 21.8 ? 'ALL YEAR' : '', src: 'ZERO TILT → TERMINATOR THROUGH BOTH POLES', g: .5, gt: '12 H DAY · 12 H NIGHT'})],   // 12 20.32, year 21.92
  [22.7, 26.1, PS, (t, k) => ({pink: seg(t, 23.0, 23.5) * (1 - seg(t, 24.2, 24.55)), gold: seg(t, 24.75, 25.1) * (1 - seg(t, 25.6, 25.95)), k}),
    t => t < 24.5 ? {small: 'NO BLOOMING', big: t > 23.5 ? 'SPRING.' : '', src: 'NO TILT → NO SEASONAL CHANGE · ILLUSTRATIVE'} : {small: 'NO GOLDEN', big: t > 25.05 ? 'AUTUMN.' : '', src: 'NO TILT → NO SEASONAL CHANGE · ILLUSTRATIVE'}],     // blooming 23.22, autumn 25.08
  [26.1, 30.0, ES, (t, k) => ({lon: 20, lat: 78, dist: 5.0, y: 1250, tilt: 0, spin: t * .25, az: -PI / 2 + .1}),
    t => t < 28.0 ? {small: 'THE POLES CHANGE THE', big: t > 27.1 ? 'MOST' : ''} : {small: 'THE SUN SITS ON THE', big: t > 28.7 ? 'HORIZON' : '', sub: t > 29.8 ? 'FOREVER' : '', src: 'SUN ≈ 0° ABOVE THE HORIZON · ILLUSTRATIVE'}],    // poles 26.36, horizon 28.8
  [30.0, 34.3, ES, (t, k) => ({lon: 20, lat: 62, dist: 4.4, y: 1250, tilt: 0, ice: lerp(80, 54, eio(seg(t, 31.0, 34))), spin: t * .1, az: -PI / 2 + .1}),
    t => t < 32.4 ? {small: 'BARELY ANY WARMTH', src: 'LESS SUNLIGHT AT THE POLES · ESTIMATE'} : {small: 'ICE KEEPS', big: 'BUILDING', src: 'ESTIMATE · ILLUSTRATIVE'}],    // warmth 31.54, ice 32.36
  [34.3, 37.9, ES, (t, k) => ({lon: 80, lat: 18, dist: 4.6, y: 1230, tilt: D * Math.sin((t - 34.3) * 1.7), band: 20 * Math.sin((t - 34.3) * 1.7), bandA: 1, axis: 0, az: -1.0}),
    t => t < 35.4 ? {small: 'AND THE', big: t > 34.5 ? 'MONSOON?' : ''} : {small: 'IT FOLLOWS THE SUN', big: 'NORTH ↔ SOUTH', src: 'RAIN BELT FOLLOWS THE OVERHEAD SUN · SIMPLIFIED'}],    // monsoon 34.54, follows 35.64
  [37.9, 40.4, ES, (t, k) => ({lon: 80, lat: 22, dist: 3.6, y: 1250, tilt: 0, az: 2.7, exp: 1.25}),
    t => ({small: 'MORE THAN', big: fmt(cnt(t, 38.1, 39.5, 0, 1000000000)) + '+', sub: t > 38.8 ? 'PEOPLE LIVE UNDER IT' : '', src: 'INDIAN MONSOON REGION · ESTIMATE'})],    // one billion 38.32
  [40.4, 42.9, ES, (t, k) => ({lon: 80, lat: 18, dist: 4.6, y: 1230, tilt: D * Math.sin((t - 40.4) * 1.7) * (1 - eo(seg(t, 40.8, 42.4))), band: 20 * Math.sin((t - 40.4) * 1.7) * (1 - eo(seg(t, 40.8, 42.4))), bandA: 1 - seg(t, 41.8, 42.8), az: -1.0}),
    t => ({small: 'WITHOUT THAT SWING', big: t > 41.4 ? 'IT WEAKENS' : '', src: 'ESTIMATE · ILLUSTRATIVE'})],    // swing 40.98, weakens 41.58
  [42.9, 44.9, ES, (t, k) => ({lon: 30, lat: 10, dist: lerp(5.4, 4.8, k), y: 1200, tilt: 0, exp: lerp(1, .8, k), az: -1.0}), t => ({small: 'THEN COMES', big: t > 43.4 ? 'THE SCARY PART' : ''})],    // scary 43.58
  [44.9, 50.9, ES, (t, k) => ({lon: 25, lat: 10, dist: 4.8, y: 1200, tilt: 0, exp: .85, wetB: eo(seg(t, 45.1, 46.2)), dryB: eo(seg(t, 46.8, 47.8)), band: 0, bandA: .9 * eo(seg(t, 45.0, 45.8)) * (1 - eo(seg(t, 46.8, 47.6))), az: -1.0}),
    t => t < 46.7 ? {small: 'RAIN BELTS STOP', big: t > 45.7 ? 'MOVING' : ''} : t < 48.3 ? {small: 'SOME PLACES', big: t > 47.45 ? 'STAY WET' : ''} : t < 49.7 ? {small: 'OTHERS', big: 'STAY DRY'} : {small: 'OTHERS STAY DRY', big: 'FOREVER.', src: 'ESTIMATE · ILLUSTRATIVE'}],    // stop 45.42, wet 47.52, dry 48.82, forever 49.74
  [50.9, 52.0, ES, (t, k) => ({lon: 25, lat: 10, dist: 6.0, y: 1200, tilt: D, axis: 0, az: -1.0}), t => ({small: 'DON’T WORRY.'})],    // worry 51.24
  [52.0, 56.2, ES, (t, k) => ({body: 'moon', lon: 20, lat: 8, dist: 8.2, y: 1250, tilt: D + 1.2 * Math.sin((t - 52) * 2.2), axis: 1, spin: t * .06, az: -1.0}),
    t => ({small: 'THE MOON KEEPS THE TILT STEADY', big: t > 54.1 ? '22.1° – 24.5°' : '', src: 'TILT CYCLE ≈ 41,000 YEARS · NASA'})],    // moon 52.16, within 54.16
  [56.2, 60.9, ES, (t, k) => ({body: 'mars', dist: 6.0, y: 1250, tilt: 36 + 22 * Math.sin((t - 56.2) * 1.1), axis: 1, spin: t * .1, az: -1.0}),
    t => ({small: 'MARS TILT', big: Math.round(36 + 22 * Math.sin((t - 56.2) * 1.1)) + '°', sub: t > 58.3 ? 'SWINGS BY TENS OF DEGREES' : '', src: 'ILLUSTRATIVE · SIMULATED OVER MILLIONS OF YEARS'})],    // Mars 56.2, tens 59.38
  [60.9, 65.2, ES, (t, k) => ({lon: 20, lat: 20, dist: 9.3, y: 1470, tilt: D, axis: 0, spin: (t - 60.9) * .03, az: -1.0}), t => ({end: 1})],
];

function fit(el, max) { el.style.fontSize = ''; let f = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > max && f > 24) { f -= 4; el.style.fontSize = f + 'px'; } }

function render(t) {
  const sh = SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
  const [s0, s1, S, pf, hf] = sh, lt = t - s0, k = seg(t, s0, s1), h = hf(t), P = pf(t, k);
  S.update(lt, P);
  renderer.toneMappingExposure = S.exposure; renderPass.scene = S.scene; grade.uniforms.uTime.value = t;
  composer.render();
  const o = eo(seg(t - s0, .05, .4)) * (1 - seg(t, s1 - .25, s1 - .05));
  $('small').textContent = h.small || ''; $('big').textContent = h.big || ''; $('sub').textContent = h.sub || '';
  fit($('big'), 960); fit($('sub'), 960); fit($('small'), 960);
  for (const id of ['small', 'big', 'sub']) { $(id).style.opacity = o; $(id).style.filter = `blur(${(1 - o) * 8}px)`; }
  $('big').style.top = h.red ? '330px' : '392px'; $('sub').style.top = h.red ? '470px' : ($('big').offsetHeight > 130 ? '640px' : '540px');
  $('redt').textContent = h.red || ''; $('red').style.opacity = h.red ? o * (.65 + .35 * Math.round((Math.sin(t * 6) + 1) / 2)) : 0;
  $('src').textContent = h.src || ''; $('src').style.opacity = o * .9;
  $('tag').style.opacity = h.end ? 0 : eo(seg(t, 3.8, 4.4));
  $('gauge').style.opacity = h.g !== undefined ? o : 0;
  if (h.g !== undefined) { $('gfill').style.width = (h.g * 900) + 'px'; $('gmk').style.left = (h.g * 900) + 'px'; $('gval').textContent = h.gt || ''; }
  const e = h.end ? eo(seg(t, 61.4, 61.9)) * (1 - seg(t, 64.6, 65.2)) : 0; $('end').style.opacity = e;
  if (h.end) { const kk = sm(seg(t, 62.1, 63.0)), cx = lerp(820, 560, kk), cy = lerp(1560, 1150, kk), tap = t > 63.2 && t < 63.4;
    $('cur').style.transform = `translate(${cx}px,${cy}px) scale(${tap ? .85 : 1})`;
    $('pill').textContent = t > 63.35 ? 'FOLLOWING' : 'FOLLOW'; $('pill').style.background = t > 63.35 ? '#3a3f4a' : '#ff3b30'; }
  const edge = Math.min(t - s0, s1 - t);
  $('cut').style.opacity = t < .01 ? 0 : Math.max(1 - clamp(edge / .1), seg(t, 64.6, 65.2) * .9);
}
window.__timelines = window.__timelines || {};
Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).then(() => {
  render(0);
  const tl = gsap.timeline({paused: true}), st = {t: 0};
  tl.to(st, {t: T, duration: T, ease: 'none', onUpdate: () => render(st.t)}, 0);
  window.__timelines['main'] = tl; window.__render = render; window.ready = true;
});
