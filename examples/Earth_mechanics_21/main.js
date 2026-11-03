// Short: "What if the Sahara turned green". Kadrlar Fola ovozining so'z vaqtlariga (words.json) bog'langan.
// [start, end, sahna, param(t), hud(t) -> {small, big, sub, src, red, g, gt, end}]
import {THREE, composer, renderer, renderPass, grade, camera, clamp, seg, sm, eo, eio, lerp} from './core.js';
import {earthScene, desertScene} from './scenes.js';

const $ = id => document.getElementById(id);
const [ES, DS] = [earthScene(), await desertScene()];
const fmt = n => Math.round(n).toLocaleString('en-US');
const cnt = (t, a, b, from, to) => from + (to - from) * eo(seg(t, a, b));
const T = 62.0, PI = Math.PI;
const Vv = (x, y, z) => new THREE.Vector3(x, y, z);
const golden = Vv(-.6, .16, .6);

// barcha vaqtlar — video soniyalari
const SHOTS = [
  [0, 2.7, ES, (t, k) => ({lon: 17, lat: 20, dist: lerp(5.6, 4.5, eo(k)), y: 1180, green: eo(seg(t, .1, 1.5)), rain: 1, cl: t}),
    t => ({small: 'THE SAHARA IS A', big: t > 1.15 ? 'JUNGLE.' : ''})],                                                                                  // jungle 1.32
  [2.7, 4.05, ES, (t, k) => ({lon: 17, lat: 20, dist: lerp(4.5, 4.3, k), y: 1180, green: 1, cl: t}), t => ({red: 'RIGHT NOW?', big: 'JUNGLE?'})],         // right 2.78
  [4.05, 5.8, ES, (t, k) => ({lon: 17, lat: 20, dist: lerp(4.3, 4.8, k), y: 1180, green: 1 - eo(seg(t, 4.15, 5.1)), rain: 1 - seg(t, 4.1, 4.6), cl: t}), t => ({small: 'NOT YET.'})],   // not 4.12
  [5.8, 9.0, ES, (t, k) => ({lon: 17, lat: 20, dist: lerp(4.8, 6.8, eio(seg(t, 5.8, 8.6))), y: 1230, hl: eo(seg(t, 6.7, 7.5)), cl: t}), t => ({small: 'SO, WHAT IF THE SAHARA', big: t > 7.15 ? 'TURNED GREEN?' : ''})],  // green 7.54
  [9.0, 11.8, ES, (t, k) => ({lon: 17, lat: 20, dist: lerp(6.8, 5.4, eio(k)), y: 1230, hl: 1, cl: t}),
    t => ({small: 'THE SAHARA COVERS', big: fmt(cnt(t, 9.04, 10.6, 0, 9200000)) + ' KM²', sub: t > 10.7 ? 'OF SAND' : '', src: 'AREA ≈ 9.2 MILLION KM² · NATURAL EARTH'})],           // nine 9.04, sand 10.78
  [11.8, 14.3, ES, (t, k) => ({lon: lerp(17, -96, eio(seg(t, 12.0, 13.4))), lat: lerp(20, 36, eio(seg(t, 12.0, 13.4))), dist: 6.6, y: 1230, hl: 1, us: eo(seg(t, 12.7, 13.4)), cl: t}),
    t => ({small: 'ALMOST THE SIZE OF', big: t > 12.55 ? 'THE USA' : '', sub: t > 13.4 ? '9.8 vs 9.2 MILLION KM²' : '', src: 'USA ≈ 9.8 MILLION KM² · SAHARA ≈ 9.2 MILLION KM²'})],     // size 12.3, United 12.7
  [14.3, 18.4, DS, (t, k) => ({shot: 'dry', k}),
    t => ({small: 'TODAY IT GETS LESS THAN', big: t > 15.3 ? '100 MM' : '', sub: t > 16.8 ? 'OF RAIN A YEAR' : '', src: 'SAHARA AVERAGE · MOST OF THE DESERT', g: eo(seg(t, 15.3, 16.2)) * .1, gt: '< 100 MM'})],   // 100 15.42, rain 16.88
  [18.4, 20.78, DS, (t, k) => ({shot: 'rain', k, over: eo(seg(t, 18.4, 19.3)), rainA: eo(seg(t, 18.5, 19.3)), wet: eo(seg(t, 19, 20.5)), sun: Vv(-.5, .35, .3)}),
    t => ({small: 'NOW THE RAIN', big: t > 18.7 ? 'COMES BACK' : '', src: 'ILLUSTRATIVE', g: lerp(.1, .5, eo(seg(t, 18.9, 20.6))), gt: 'MORE RAIN'})],     // now 18.44, rain 18.86
  [20.78, 23.34, DS, (t, k) => ({shot: 'grow', k, over: .8 * (1 - eo(seg(t, 20.8, 22.2))), rainA: 1 - eo(seg(t, 20.8, 21.8)), wet: .6 * (1 - seg(t, 21.5, 23)), grass: eo(seg(t, 20.8, 22.4)), trees: eo(seg(t, 22.1, 23.3)), sun: Vv(-.7, .3, .25)}),
    t => t < 22.08 ? {small: 'FIRST', big: 'GRASS', g: .5 + .0, gt: 'MORE RAIN'} : {small: 'THEN', big: 'TREES'}],     // grass 20.78, trees 22.24
  [23.34, 24.65, DS, (t, k) => ({shot: 'lake', k, grass: 1, trees: 1, water: eo(seg(t, 23.45, 24.5)), sun: Vv(-.6, .3, .35)}), t => ({small: 'THEN', big: 'LAKES.'})],   // lakes 23.5
  [24.65, 28.5, ES, (t, k) => ({lon: 17, lat: 16, dist: lerp(4.9, 3.1, eio(seg(t, 24.65, 28))), y: 1200, green: 1, lake: eo(seg(t, 24.9, 26.9)), cl: t}),
    t => ({small: 'ONE LAKE GROWS TO', big: t > 25.5 ? fmt(cnt(t, 25.6, 27.4, 0, 400000)) + ' KM²' : '', src: 'LAKE MEGACHAD · PEAK SIZE ≈ 400,000 KM² · ESTIMATE'})],      // one 24.7, 400 25.66
  [28.5, 31.65, DS, (t, k) => ({shot: 'hippo', k, grass: 1, trees: 1, water: 1, hip: eo(seg(t, 28.7, 29.8)), sun: golden}),
    t => ({small: 'HIPPOS SWIM WHERE', big: t > 29.75 ? 'DUNES STAND' : ''})],                                                                              // hippo 28.58, dunes 29.88
  [31.65, 36.3, DS, (t, k) => ({shot: 'hero', k, grass: 1, trees: 1, water: 1, hip: 1, hero: 1, point: eo(seg(t, 32.4, 33.2)), look: 0, sun: golden}),
    t => t < 33.5 ? {small: 'THIS ISN’T', big: 'FANTASY.'} : {small: t > 35.0 ? 'AND IT WAS REAL' : 'IT HAPPENED', big: fmt(cnt(t, 33.58, 34.6, 0, 6000)) + ' YEARS AGO', src: 'AFRICAN HUMID PERIOD · ENDED ≈ 5,500–6,000 YEARS AGO'}],   // 6,000 33.58, real 35.12
  [36.3, 39.25, ES, (t, k) => ({lon: 17, lat: 0, dist: 8.6, y: 1250, wobble: lerp(0, .5, eio(k)), cl: t}),
    t => ({small: 'A SLOW WOBBLE OF', big: t > 37.45 ? 'EARTH’S AXIS' : '', sub: t > 38.1 ? 'DID IT' : '', src: 'AXIAL PRECESSION · ILLUSTRATIVE'})],                                  // wobble 36.98, axis 37.96
  [39.25, 42.95, ES, (t, k) => ({lon: 17, lat: 20, dist: 5.2, y: 1230, green: .5 + .5 * Math.sin((t - 39.3) * 1.5 - PI / 2), rain: 1, cl: t}),
    t => ({small: 'EVERY', big: t > 39.5 ? fmt(cnt(t, 39.58, 40.8, 0, 23000)) + ' YEARS' : '', sub: t > 40.8 ? 'IT PULLS THE RAIN NORTH' : '', src: 'PRECESSION CYCLE ≈ 23,000 YEARS'})],   // 23,000 39.58, pulls 40.86
  [42.95, 44.6, ES, (t, k) => ({lon: -22, lat: 8, dist: 4.8, y: 1200, exp: lerp(1, .8, k), cl: t}), t => ({small: 'THEN COMES', big: t > 43.4 ? 'THE SCARY PART' : ''})],   // scary 43.62
  [44.6, 46.4, ES, (t, k) => ({lon: -22, lat: 8, dist: 4.8, y: 1200, exp: .8, dust: t < 45.2 ? 1 : 1 - eo(seg(t, 45.2, 46.1)), dt: t, cl: t}), t => ({small: 'THE DUST', big: t > 45.15 ? 'STOPS.' : ''})],   // dust 44.94, stops 45.22
  [46.4, 50.3, ES, (t, k) => ({lon: -22, lat: 8, dist: 4.8, y: 1200, dust: eo(seg(t, 46.4, 46.9)), dt: t, cl: t}),
    t => ({small: 'DUST TO THE AMAZON', big: fmt(cnt(t, 46.48, 47.7, 0, 27000000)) + ' T', sub: t > 48.9 ? 'EVERY YEAR' : '', src: 'NASA CALIPSO · YU ET AL. 2015 · ROUNDED'})],   // 27 46.48, Amazon 48.32, year 49.18
  [50.3, 53.6, ES, (t, k) => ({lon: -22, lat: 8, dist: 4.8, y: 1200, green: eo(seg(t, 50.4, 52)), rain: 0, dust: 1 - eo(seg(t, 50.5, 52)), dt: t, dry: eo(seg(t, 51.8, 53.3)), cl: t}),
    t => ({small: 'A GREEN SAHARA', big: t > 51.35 ? 'COULD STARVE' : '', sub: t > 51.8 ? 'THE RAINFOREST' : '', src: 'SCIENTIFIC HYPOTHESIS · SIMPLIFIED'})],            // green 50.6, starve 51.44, rainforest 52.02
  [53.6, 58.0, ES, (t, k) => ({lon: lerp(-22, 17, eio(seg(t, 53.6, 56))), lat: lerp(8, 20, eio(seg(t, 53.6, 56))), dist: 6.4, y: 1230, dry: 1 - eo(seg(t, 53.7, 55)), cl: t}),
    t => t < 54.55 ? {small: 'DON’T WORRY.'} : {small: 'THE NEXT GREEN PHASE IS', big: t > 55.6 ? '≈ ' + fmt(cnt(t, 55.86, 57.1, 0, 10000)) + ' YEARS' : '', sub: t > 56.7 ? 'AWAY' : '', src: 'MODEL-BASED ESTIMATE'}],    // worry 53.88, 10,000 55.86
  [58.0, 62.0, ES, (t, k) => ({lon: 17, lat: 20, dist: 9.3, y: 1470, spin: (t - 58) * .03, cl: t}), t => ({end: 1})],
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
  const e = h.end ? eo(seg(t, 58.2, 58.7)) * (1 - seg(t, 61.4, 62)) : 0; $('end').style.opacity = e;
  if (h.end) { const kk = sm(seg(t, 58.9, 59.8)), cx = lerp(820, 560, kk), cy = lerp(1560, 1150, kk), tap = t > 60.0 && t < 60.2;
    $('cur').style.transform = `translate(${cx}px,${cy}px) scale(${tap ? .85 : 1})`;
    $('pill').textContent = t > 60.15 ? 'FOLLOWING' : 'FOLLOW'; $('pill').style.background = t > 60.15 ? '#3a3f4a' : '#ff3b30'; }
  const edge = Math.min(t - s0, s1 - t);
  $('cut').style.opacity = t < .01 ? 0 : Math.max(1 - clamp(edge / .1), seg(t, 61.4, 62) * .9);
}
window.__timelines = window.__timelines || {};
Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).then(() => {
  render(0);
  const tl = gsap.timeline({paused: true}), st = {t: 0};
  tl.to(st, {t: T, duration: T, ease: 'none', onUpdate: () => render(st.t)}, 0);
  window.__timelines['main'] = tl; window.__render = render; window.ready = true;
});
