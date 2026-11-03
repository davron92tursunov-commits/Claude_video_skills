// Bloksimon odam (what-if-3d skilldagi person()/pose() asosida).
// YUZSIZ — doim: bosh bitta oddiy teri rangli kub, ko'z/og'iz yo'q (foydalanuvchi talabi). Hissiyot faqat tana harakati bilan.
// Asosiy qahramon (hero) qizil kepkada. Odam -z tomonga qaraydi (kepka soyabonı oldinda). 1 birlik = 1 m, scale bilan kattalashtiriladi.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, roughness: .85, flatShading: true, ...o});
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function mesh(geo, mat, x, y, z, p) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); return m; }

export function person(parent, {shirt = 0xf2f2f2, pants = 0x2c3e66, skin = 0xf1c49b, cap = null, scale = 1} = {}) {
  const g = new THREE.Group(); g.scale.setScalar(scale); parent.add(g);
  const hips = new THREE.Group(); hips.position.y = .9; g.add(hips);
  const up = new THREE.Group(); hips.add(up); mesh(box(.6, .7, .34), M(shirt), 0, .36, 0, up);
  const head = new THREE.Group(); head.position.y = .72; up.add(head);
  mesh(box(.46, .46, .46), M(skin, {roughness: .6}), 0, .24, 0, head);          // yuzsiz bosh
  if (cap) { mesh(box(.5, .16, .5), M(cap), 0, .52, 0, head); mesh(box(.5, .05, .25), M(cap), 0, .47, -.33, head); }
  const limb = (x, y, p, len, c) => { const q = new THREE.Group(); q.position.set(x, y, 0); p.add(q); mesh(box(.2, len, .22), M(c), 0, -len / 2, 0, q); return q; };
  return {g, hips, up, head, aL: limb(-.4, .66, up, .62, skin), aR: limb(.4, .66, up, .62, skin), lL: limb(-.16, 0, hips, .9, pants), lR: limb(.16, 0, hips, .9, pants)};
}

// poza: armsUp (0..1 qo'llar tepaga), wave, point (o'ng qo'l bilan ko'rsatish), lean (oldinga egilish), sit, step (yurish fazasi), lookUp (boshni ko'tarish)
export function pose(p, {x = 0, y = 0, z = 0, ry = 0, lean = 0, sit = 0, armsUp = 0, wave = 0, point = 0, step = 0, lookUp = 0} = {}) {
  p.g.position.set(x, y, z); p.g.rotation.set(0, ry, 0); p.hips.position.y = .9; p.up.rotation.set(-lean, 0, 0);
  p.head.rotation.set(lookUp * .5, 0, 0);
  const s = Math.sin(step) * .5;
  p.lL.rotation.set(s, 0, 0); p.lR.rotation.set(-s, 0, 0);
  p.aL.rotation.set(-armsUp * 2.6 - s * .8, 0, -.1 - wave); p.aR.rotation.set(-armsUp * 2.6 - point * 1.5 + s * .8, 0, .1 + wave);
  if (sit) { p.hips.position.y = .35; p.lL.rotation.x = p.lR.rotation.x = -1.5; p.aL.rotation.set(-.4, 0, .2); p.aR.rotation.set(-.4, 0, -.2); }
}

// ---- GLB qahramon (models/hero.glb: sariq kapyushonli, yuzsiz "Blank head", 19 suyakli skelet) ----
// Model +z ga qaraydi, bo'yi ~2.05 m, dastlabki pozada qo'llar tepada (suyak burilishlari nol).
let HERO_TPL = null;
export async function loadHero(url = 'models/hero.glb') {
  const [{GLTFLoader}, SU] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js')]);
  const g = await new GLTFLoader().loadAsync(url);
  HERO_TPL = {scene: g.scene, clone: SU.clone};
  return HERO_TPL;
}
export function hero(parent, {scale = 1, hoodie = null, pants = null} = {}) {
  const root = HERO_TPL.clone(HERO_TPL.scene), wrap = new THREE.Group(); wrap.add(root); wrap.scale.setScalar(scale); parent.add(wrap);
  const bones = {};
  root.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.frustumCulled = false;
      const n = o.material.name;
      if ((hoodie && (n === 'Yellow' || n === 'Pocket')) || (pants && n === 'Trousers')) {
        o.material = o.material.clone();
        const c = new THREE.Color(n === 'Trousers' ? pants : hoodie); if (n === 'Pocket') c.multiplyScalar(.85); o.material.color.copy(c);
      }
    }
  });
  return {g: wrap, bones};
}
// poza: armsUp 0 = qo'llar pastda, 1 = tepada; point = o'ng qo'l oldinga; wave = chap qo'l silkitadi; sit; step (yurish fazasi); lookUp; lean
// ry: 0 = kameraga (+z) qaraydi, Math.PI = kameradan teskari (-z)
export function poseHero(p, {x = 0, y = 0, z = 0, ry = 0, armsUp = 0, point = 0, wave = 0, sit = 0, step = 0, lookUp = 0, lean = 0, t = 0} = {}) {
  const b = p.bones, D = Math.PI / 180, s = Math.sin(step) * .45;
  p.g.position.set(x, y, z); p.g.rotation.set(0, ry, 0);
  const down = 157 * D;
  b.LeftUpperArm.rotation.set(-s * .7, 0, (1 - armsUp) * down);
  b.RightUpperArm.rotation.set(s * .7, 0, -(1 - armsUp) * down);
  if (point) b.RightUpperArm.rotation.set(85 * D * point, 0, -(1 - point) * down);
  if (wave) b.LeftUpperArm.rotation.set(0, 0, (20 + 25 * Math.sin(t * 9)) * D * wave + (1 - wave) * down);
  b.LeftForeArm.rotation.set(0, 0, 0); b.RightForeArm.rotation.set(0, 0, 0);
  b.LeftUpperLeg.rotation.set(s, 0, 0); b.RightUpperLeg.rotation.set(-s, 0, 0);
  b.LeftLowerLeg.rotation.set(Math.max(0, -s) * .6, 0, 0); b.RightLowerLeg.rotation.set(Math.max(0, s) * .6, 0, 0);
  b.Head.rotation.set(-lookUp * .5, 0, 0); b.Spine.rotation.set(lean, 0, 0);
  if (sit) {
    b.LeftUpperLeg.rotation.x = b.RightUpperLeg.rotation.x = -88 * D; b.LeftLowerLeg.rotation.x = b.RightLowerLeg.rotation.x = 80 * D;
    p.g.position.y = y - .75 * p.g.scale.y;  // son (0.83 m) tosh sathiga tushadi
  }
}

// yer sathiga qo'yish: (x,z) nuqtadan pastga nur tashlab, berilgan mesh(lar)ning balandligini topadi
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
export function groundY(meshes, x, z, def = 0) {
  [].concat(meshes).forEach(m => m.updateWorldMatrix(true, false));  // birinchi renderdan oldin ham to'g'ri joy
  from.set(x, 2000, z); ray.set(from, down);
  const hit = ray.intersectObjects([].concat(meshes), false)[0];
  return hit ? hit.point.y : def;
}
