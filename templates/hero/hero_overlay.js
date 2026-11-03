// Shorts (2D kanvas dvigateli) uchun yuzsiz qahramon: offscreen WebGL'da render qilib, 2D kanvasga chiziladi (drawGlobeGL kabi).
// O'rnatish: shu papkani loyihaga hf/hero/ qilib nusxalang (hero_overlay.js, person.js, hero.glb), hamda
// hf/vendor/three/addons/loaders/GLTFLoader.js + addons/utils/{BufferGeometryUtils,SkeletonUtils}.js bo'lsin.
// index.html: <script type="module" src="hero/hero_overlay.js"></script>, keyin oddiy skriptda:
//   await window.HERO.ready;                       // timeline'ni shundan keyin ro'yxatdan o'tkazing
//   HERO.draw(ctx, {x: 540, y: 1500, h: 520, ry: 0, pose: {armsUp: 1}, t});
// x,y — oyoq ostidagi nuqta (kanvas px), h — bo'yi (px). ry: 0 = tomoshabinga qaraydi, Math.PI = orqasi bilan.
// pose: armsUp (0 pastda .. 1 tepada), point, wave, sit, step (yurish fazasi), lookUp, lean.  hoodie: rang (ixtiyoriy ikkinchi odam).
// light: [x,y,z] yorug'lik yo'nalishi, amb: atrof yorug'ligi (0..2), tint: yorug'lik rangi (masalan tunda 0x9fb4ff).
// YUZSIZ — doim. Modelga ko'z/og'iz qo'shilmaydi.
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/three/addons/loaders/GLTFLoader.js';
import {clone as skClone} from '../vendor/three/addons/utils/SkeletonUtils.js';
import {poseHero} from './person.js';

const OW = 600, OH = 1200;                         // offscreen o'lchami (1:2)
const canvas = document.createElement('canvas'); canvas.width = OW; canvas.height = OH;
const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(OW, OH, false); renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(22, OW / OH, .1, 50);
const VIEW_H = 2 * 7 * Math.tan(11 * Math.PI / 180), FOCUS_Y = 1.02;   // kadr balandligi (m) va markaz
cam.position.set(0, FOCUS_Y, 7); cam.lookAt(0, FOCUS_Y, 0);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a2a34, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(sun);

let tpl = null; const inst = {};
function get(hoodie) {
  const key = hoodie ?? 'base';
  if (inst[key]) return inst[key];
  const root = skClone(tpl), g = new THREE.Group(); g.add(root); scene.add(g);
  const bones = {};
  root.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) { o.frustumCulled = false;
      if (hoodie != null && (o.material.name === 'Yellow' || o.material.name === 'Pocket')) {
        o.material = o.material.clone(); o.material.color.set(hoodie); if (o.material.name === 'Pocket') o.material.color.multiplyScalar(.85); } }
  });
  return (inst[key] = {g, bones});
}

const FEET_PX = OH / 2 + (FOCUS_Y / VIEW_H) * OH;   // offscreen'da oyoq chizig'i
const MODEL_H = 2.05;
function draw(ctx, {x, y, h, ry = 0, pose = {}, t = 0, hoodie = null, light = [-.5, .8, .6], amb = 1, tint = 0xffffff, shadow = .35, alpha = 1} = {}) {
  if (!tpl) return;
  Object.values(inst).forEach(p => p.g.visible = false);
  const p = get(hoodie); p.g.visible = true;
  poseHero(p, {...pose, ry, t});
  sun.position.set(...light).normalize().multiplyScalar(10); sun.color.set(tint); hemi.intensity = amb;
  renderer.render(scene, cam);
  const k = h / (MODEL_H / VIEW_H * OH);
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow > 0 && !pose.sit) { ctx.fillStyle = `rgba(0,0,0,${shadow})`; ctx.beginPath(); ctx.ellipse(x, y, h * .2, h * .035, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.drawImage(canvas, x - OW / 2 * k, y - FEET_PX * k, OW * k, OH * k);
  ctx.restore();
}

const here = new URL('.', import.meta.url).href;
window.HERO = {draw, ready: new GLTFLoader().loadAsync(here + 'hero.glb').then(g => { tpl = g.scene; return true; })};
