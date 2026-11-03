// Short: "What if every tree vanished". Kadrlar Fola ovozining so'z vaqtlariga (words.json) bog'langan.
import {THREE, composer, renderer, renderPass, grade, camera, clamp, seg, sm, eo, eio, lerp} from './core.js';
import {earthScene, parkScene} from './scenes.js';

const $ = id => document.getElementById(id);
const [ES, PS] = [earthScene(), await parkScene()];
const fmt = n => Math.round(n).toLocaleString('en-US');
const cnt = (t, a, b, from, to) => from + (to - from) * eo(seg(t, a, b));
const T = 67.3, PI = Math.PI;

// barcha vaqtlar — video soniyalari
const SHOTS = [
  [0, 4.1, PS, (t, k) => ({vanish: eo(seg(t, .15, 2.8))}),
    t => ({small: 'EVERY TREE AROUND YOU', big: t > 2.5 ? 'GONE.' : ''})],                                                                                 // gone 2.8
  [4.1, 5.8, PS, (t, k) => ({vanish: 1}), t => ({red: 'RIGHT NOW?', big: 'ALL GONE?'})],                                                                    // right 4.12
  [5.8, 7.3, PS, (t, k) => ({vanish: 1 - eo(seg(t, 5.9, 6.7))}), t => ({small: 'NOT YET.'})],                                                                 // not 5.86
  [7.3, 10.9, ES, (t, k) => ({lon: -55, lat: 10, dist: lerp(6.6, 5.4, eio(k)), y: 1230, tilt: 0, az: -.9, spin: t * .04}), t => ({small: 'SO, WHAT IF EVERY TREE', big: t > 9.3 ? 'VANISHED?' : ''})],   // vanished 9.54
  [10.9, 13.5, ES, (t, k) => ({lon: -55, lat: 10, dist: 5.2, y: 1230, tilt: 0, az: -.9, spin: t * .04}),
    t => ({small: 'EARTH HAS', big: fmt(cnt(t, 11.4, 12.7, 0, 3000000000000)), sub: t > 12.45 ? 'TREES' : '', src: 'CROWTHER ET AL. · NATURE · 2015 · ≈ 3.04 TRILLION'})],    // three 11.44
  [13.5, 15.65, ES, (t, k) => ({lon: lerp(-55, 60, eio(k)), lat: 30, dist: 5.2, y: 1230, tilt: 0, az: -.9, tree: .5 * eo(seg(t, 13.8, 15.0))}),
    t => ({small: 'ALREADY GONE', big: cnt(t, 13.84, 14.7, 0, 46).toFixed(0) + '%', src: 'SINCE THE START OF HUMAN CIVILIZATION · ≈ 46%'})],    // half 13.84
  [15.65, 19.2, ES, (t, k) => ({lon: lerp(60, -50, eio(k)), lat: 15, dist: 5.0, y: 1230, tilt: 0, az: -.9, tree: .5 + .5 * eo(seg(t, 16.0, 18.4))}),
    t => ({small: 'NOW, ALL THE REST', big: t > 17.8 ? 'TONIGHT' : '', src: 'FOREST GREEN → ASH · ILLUSTRATIVE'})],    // rest 16.92, tonight 17.98
  [19.2, 21.05, PS, (t, k) => ({vanish: 1, mud: .0}), t => ({small: 'BUT YOU WOULDN’T', big: t > 19.9 ? 'SUFFOCATE' : ''})],    // suffocate 19.94
  [21.05, 26.2, ES, (t, k) => ({lon: 10, lat: 15, dist: 5.6, y: 1260, tilt: 0, az: -.9, tree: 1, spin: t * .04}),
    t => ({small: 'THE AIR IS', big: t > 21.8 ? fmt(cnt(t, 21.9, 22.7, 0, 21)) + '% OXYGEN' : '', sub: t > 23.5 ? 'IT WOULD LAST THOUSANDS OF YEARS' : '', src: 'OXYGEN ≈ 21% OF THE AIR · DURATION ≈ ESTIMATE', g: .21, gt: '21%'})],    // 21 21.94, last 23.86
  [26.2, 28.7, ES, (t, k) => ({lon: 10, lat: 15, dist: 5.2, y: 1230, tilt: 0, az: -.9, tree: 1, co2: .35 * eo(seg(t, 27.3, 28.6)), exp: .95, spin: t * .04}), t => ({small: 'THE TROUBLE IS', big: t > 27.3 ? 'CARBON' : ''})],    // carbon 27.42
  [28.7, 32.8, ES, (t, k) => ({lon: 10, lat: 15, dist: 5.2, y: 1230, tilt: 0, az: -.9, tree: 1, co2: .35, exp: .95, spin: t * .04}),
    t => ({small: 'FORESTS SOAK UP ABOUT', big: t > 29.9 ? cnt(t, 29.9, 30.5, 0, 25).toFixed(0) + '%' : '', sub: t > 30.5 ? 'OF THE CO₂ WE RELEASE' : '', src: 'GLOBAL CARBON PROJECT · ROUNDED'})],    // quarter 30.06
  [32.8, 36.1, ES, (t, k) => ({lon: 10, lat: 15, dist: 5.0, y: 1230, tilt: 0, az: -.9, tree: 1, co2: .35 + .65 * eo(seg(t, 33.2, 35.6)), exp: lerp(.95, .8, k), spin: t * .04}),
    t => ({small: 'WITHOUT THEM, IT ALL', big: t > 33.9 ? 'STAYS IN THE SKY' : '', src: 'ILLUSTRATIVE'})],    // stays 34.1
  [36.1, 41.8, PS, (t, k) => ({vanish: 1, hill: 1, mud: eo(seg(t, 36.4, 38.4)), slide: eo(seg(t, 38.6, 40.4)), river: eo(seg(t, 39.6, 40.8))}),
    t => t < 37.8 ? {small: 'ROOTS HOLD THE', big: 'GROUND TOGETHER', src: 'ILLUSTRATIVE'} : {small: 'HILLS SLIDE, RIVERS', big: t > 39.7 ? 'RUN BROWN' : '', src: 'ILLUSTRATIVE'}],    // roots 36.18, hills 38.76, brown 40.4
  [41.8, 46.0, ES, (t, k) => ({lon: -55, lat: 5, dist: 4.8, y: 1230, tilt: 0, az: -.9, tree: 1, dry: eo(seg(t, 43.2, 45.0)), dryB: eo(seg(t, 44.3, 45.5)), spin: t * .02}),
    t => t < 44.2 ? {small: 'FORESTS PUMP WATER', big: t > 42.7 ? 'INTO THE AIR' : '', src: 'FORESTS RECYCLE RAINFALL · SIMPLIFIED'} : {small: 'RAIN BELTS', big: 'DRY OUT', src: 'ESTIMATE · ILLUSTRATIVE'}],    // pump 42.1, rain 44.26
  [46.0, 49.7, PS, (t, k) => ({vanish: 1, mud: .55, hot: eo(seg(t, 46.2, 47.8)), hotPose: 1}),
    t => ({small: 'YOUR CITY GETS HOTTER', big: t > 47.6 ? 'BY SEVERAL °C' : '', src: 'SHADE + EVAPORATION ≈ 1–5 °C COOLING · ESTIMATE'})],    // hotter 46.92, degrees 48.34
  [49.7, 52.0, ES, (t, k) => ({lon: 10, lat: 15, dist: lerp(5.4, 4.8, k), y: 1200, tilt: 0, az: -.9, tree: 1, co2: 1, exp: lerp(.9, .75, k)}), t => ({small: 'THEN COMES', big: t > 50.3 ? 'THE SCARY PART' : ''})],    // scary 50.64
  [52.0, 56.2, ES, (t, k) => ({lon: 85, lat: 22, dist: 4.4, y: 1250, tilt: 0, az: 2.7, tree: 1, exp: 1.2}),
    t => ({small: 'PEOPLE WHO DEPEND ON FORESTS', big: fmt(cnt(t, 52.08, 53.3, 0, 1600000000)), src: 'WORLD BANK · UN ESTIMATE ≈ 1.6 BILLION'})],    // 1.6 52.08
  [56.2, 57.2, ES, (t, k) => ({lon: 20, lat: 15, dist: 6.0, y: 1230, tilt: 0, az: -.9, tree: 1 - eo(seg(t, 56.3, 57.1))}), t => ({small: 'DON’T WORRY.'})],    // worry 56.48
  [57.2, 62.7, ES, (t, k) => ({lon: lerp(20, 100, eio(k)), lat: 25, dist: 5.6, y: 1230, tilt: 0, az: -.9, tree: -eo(seg(t, 59.6, 61.8))}),
    t => t < 59.3 ? {small: 'TREES CAN’T VANISH', big: t > 58.0 ? 'OVERNIGHT' : '', src: ''} : {small: 'MORE GREEN LEAVES THAN', big: t > 61.0 ? '20 YEARS AGO' : '', src: 'NASA SATELLITES · LEAF AREA +5% SINCE 2000'}],    // overnight 58.2, leaves 61.16, twenty 61.68
  [62.7, 67.3, ES, (t, k) => ({lon: 20, lat: 20, dist: 9.3, y: 1470, tilt: 0, az: -.9, tree: -.4, spin: (t - 62.7) * .03}), t => ({end: 1})],
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
  $('tag').style.opacity = h.end ? 0 : eo(seg(t, 4.3, 4.9));
  $('gauge').style.opacity = h.g !== undefined ? o : 0;
  if (h.g !== undefined) { $('gfill').style.width = (h.g * 900) + 'px'; $('gmk').style.left = (h.g * 900) + 'px'; $('gval').textContent = h.gt || ''; }
  const e = h.end ? eo(seg(t, 63.2, 63.7)) * (1 - seg(t, 66.7, 67.3)) : 0; $('end').style.opacity = e;
  if (h.end) { const kk = sm(seg(t, 63.9, 64.8)), cx = lerp(820, 560, kk), cy = lerp(1560, 1150, kk), tap = t > 65.0 && t < 65.2;
    $('cur').style.transform = `translate(${cx}px,${cy}px) scale(${tap ? .85 : 1})`;
    $('pill').textContent = t > 65.15 ? 'FOLLOWING' : 'FOLLOW'; $('pill').style.background = t > 65.15 ? '#3a3f4a' : '#ff3b30'; }
  const edge = Math.min(t - s0, s1 - t);
  $('cut').style.opacity = t < .01 ? 0 : Math.max(1 - clamp(edge / .1), seg(t, 66.7, 67.3) * .9);
}
window.__timelines = window.__timelines || {};
Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).then(() => {
  render(0);
  const tl = gsap.timeline({paused: true}), st = {t: 0};
  tl.to(st, {t: T, duration: T, ease: 'none', onUpdate: () => render(st.t)}, 0);
  window.__timelines['main'] = tl; window.__render = render; window.ready = true;
});
