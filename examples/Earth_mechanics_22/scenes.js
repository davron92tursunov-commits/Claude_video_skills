// "What if Earth had no tilt" — sahnalar: Yer (o'q egilishi, quyosh burchagi, muz, yomg'ir kamari, quruq/nam kamarlar), Oy, Mars, bog'.
import {THREE, camera, PI, D2R, clamp, lerp, seg, sm, eo, eio, fbm, rng} from './core.js';
import {G, TEX, makeEarth, space} from './globe.js';
import {loadHero, hero, poseHero} from './person.js';

TEX.day.wrapS = TEX.brc.wrapS = TEX.masks.wrapS = THREE.RepeatWrapping;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FOV = 36;
function frame(c, dist, yPx, fov = FOV, az = 0, el = 0) {
  const visH = 2 * dist * Math.tan(fov * D2R / 2), dy = (yPx - 960) / 1920 * visH;
  const p = V(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist).add(c);
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(p); camera.up.set(0, 1, 0);
  camera.lookAt(c.x, c.y + dy, c.z); camera.updateMatrixWorld(); G.camPos.value.copy(p);
}
const camAt = (p, l, fov = 40) => { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(l); camera.updateMatrixWorld(); G.camPos.value.copy(p); };

function planetTex(kind) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), r = rng(kind === 'mars' ? 4 : 9);
  if (kind === 'mars') {
    x.fillStyle = '#b4532c'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() > .5 ? '120,50,28' : '230,150,100'},${.05 + r() * .12})`; x.beginPath(); x.ellipse(r() * 1024, 40 + r() * 430, 5 + r() * 30, 3 + r() * 16, r() * 3, 0, 6.283); x.fill(); }
    x.fillStyle = 'rgba(245,240,235,.95)'; x.fillRect(0, 0, 1024, 26); x.fillRect(0, 486, 1024, 26);
  } else {
    x.fillStyle = '#9a9a9c'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 900; i++) { const px = r() * 1024, py = r() * 512, rr = 3 + r() * 20; x.fillStyle = `rgba(60,60,64,${.12 + r() * .18})`; x.beginPath(); x.arc(px, py, rr, 0, 6.283); x.fill(); x.fillStyle = `rgba(200,200,205,${.08 + r() * .1})`; x.beginPath(); x.arc(px - rr * .2, py - rr * .2, rr * .8, 0, 6.283); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- 1) Yer / Oy / Mars: egilish, quyosh, muz, yomg'ir kamarlari ---------- */
export function earthScene() {
  const L0 = V(-1, .12, .6).normalize(), S = space(L0, 7), E = makeEarth(1), out = {scene: S.scene, exposure: 1};
  const tilter = new THREE.Group(); S.scene.add(tilter); tilter.add(E.g);
  const axLine = new THREE.Group(); tilter.add(axLine);
  const gm = new THREE.MeshBasicMaterial({color: 0xffd23f});
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 3.2, 12), gm); shaft.position.y = 0; axLine.add(shaft);
  const capN = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 16), gm); capN.position.y = 1.7; axLine.add(capN);
  const capS = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), gm); capS.position.y = -1.6; axLine.add(capS);
  const ref = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, -1.6, 0), V(0, 1.7, 0)]), new THREE.LineDashedMaterial({color: 0xcfe2ff, dashSize: .06, gapSize: .06, transparent: true, opacity: .75})); ref.computeLineDistances(); S.scene.add(ref);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.27, 64, 32), new THREE.MeshStandardMaterial({map: planetTex('moon'), roughness: 1})); moon.position.set(1.25, 1.55, 0); S.scene.add(moon);
  const mars = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshStandardMaterial({map: planetTex('mars'), roughness: .95})); tilter.add(mars);
  S.scene.add(new THREE.AmbientLight(0x6678aa, .35));
  out.update = (lt, P) => {
    const az = P.az ?? -1.0, el = .12, L = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    G.sunDir.value.copy(L); S.dl.position.copy(L).multiplyScalar(100); S.sun.position.copy(L).multiplyScalar(1500);
    const dist = P.dist ?? 6.4, yPx = P.y ?? 1200, body = P.body || 'earth';
    frame(V(0, 0, 0), dist, yPx, FOV, 0, 0);
    tilter.rotation.set(0, 0, (P.tilt || 0) * D2R);
    E.g.visible = body === 'earth' || body === 'moon'; mars.visible = body === 'mars'; moon.visible = body === 'moon';
    E.g.rotation.set((P.lat ?? 12) * D2R, -PI / 2 - (P.lon ?? 20) * D2R + (P.spin || 0), 0, 'XYZ');
    mars.rotation.set(0, (P.spin || 0) * .9 + lt * .2, 0); moon.rotation.y = lt * .1;
    const u = E.U; u.uIce.value = P.ice ?? 90; u.uBandLat.value = P.band || 0; u.uBandA.value = P.bandA || 0; u.uWetB.value = P.wetB || 0; u.uDryB.value = P.dryB || 0; u.uGreen.value = 0; u.uHL.value = 0; u.uUS.value = 0; u.uLake.value = 0; u.uDry.value = 0; u.uRain.value = 0;
    E.clouds(lt + (P.cl || 0)); E.place(V(0, 0, 0), 1); out.exposure = P.exp ?? 1;
    axLine.visible = !!P.axis; ref.visible = !!P.axis && body !== 'mars' || (!!P.axis && body === 'mars');
    out.moonPos = moon.position;
  };
  return out;
}

/* ---------- 2) Bog': daraxtlar, yashil -> pushti -> oltin barg, qahramon ---------- */
const skyFS = `uniform vec3 uSun;varying vec3 vD;
void main(){vec3 d=normalize(vD);float y=max(d.y,0.);
 vec3 col=mix(vec3(.62,.5,.4),vec3(.04,.14,.4),pow(y,.45));
 float s=max(dot(d,normalize(uSun)),0.);col+=vec3(1.,.82,.55)*(pow(s,500.)*4.+pow(s,8.)*.35);
 gl_FragColor=vec4(col,1.);}`;
export async function parkScene() {
  await loadHero();
  const scene = new THREE.Scene(), out = {scene, exposure: 1}, sunV = V(-.6, .5, .5).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, uniforms: {uSun: {value: sunV}}, vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);}', fragmentShader: skyFS}));
  sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(0xb89d80, 40, 180);
  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 256; const gx = gcv.getContext('2d'), rr = rng(3);
  gx.fillStyle = '#3c7a2a'; gx.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { gx.fillStyle = `rgba(${rr() > .5 ? '20,70,20' : '120,170,60'},${.08 + rr() * .14})`; gx.fillRect(rr() * 256, rr() * 256, 2 + rr() * 5, 2 + rr() * 5); }
  const gt = new THREE.CanvasTexture(gcv); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(40, 40); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({map: gt, roughness: 1})); ground.rotation.x = -PI / 2; scene.add(ground);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.0); sun.position.copy(sunV).multiplyScalar(100); scene.add(sun, new THREE.HemisphereLight(0xaac8ff, 0x6a8a40, 1.1));
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'), gl = new GLTFLoader();
  const tree = (await gl.loadAsync('models/nature/tree_default.glb')).scene, bush = (await gl.loadAsync('models/nature/plant_bush.glb')).scene;
  const leaves = []; tree.traverse(o => { if (o.isMesh && o.material.name.startsWith('leafs')) leaves.push(o.material); });
  const bb = new THREE.Box3().setFromObject(tree), th = bb.max.y - bb.min.y, pr = rng(11);
  for (let i = 0; i < 26; i++) { const x = (pr() - .5) * 46, z = -4 - pr() * 38; if (Math.abs(x) < 2.2 && z > -14) continue; const t = tree.clone(true), w = new THREE.Group(); w.add(t); const h = 6 + pr() * 4; w.scale.setScalar(h / th); w.position.set(x, 0, z); w.rotation.y = pr() * 6.28; scene.add(w); }
  for (let i = 0; i < 40; i++) { const x = (pr() - .5) * 30, z = 6 - pr() * 36, b = bush.clone(true); b.scale.setScalar(1.2 + pr()); b.position.set(x, 0, z); b.rotation.y = pr() * 6; scene.add(b); }
  const H = hero(scene, {scale: 1});
  const green = new THREE.Color(0x29c9aa), pink = new THREE.Color(1, .78, .92), gold = new THREE.Color(1, .6, .12), tmp = new THREE.Color();
  out.update = (lt, P) => {
    const pk = P.pink || 0, gd = P.gold || 0; tmp.copy(green).lerp(pink, pk).lerp(gold, gd); leaves.forEach(m => { m.color.copy(tmp); m.emissive = m.emissive || new THREE.Color(); m.emissive.copy(tmp).multiplyScalar(.28); });
    poseHero(H, {x: 0, y: 0, z: 2.4, ry: PI, lookUp: .35 + .1 * Math.sin(lt * 1.3), point: P.point || 0, t: lt});
    camAt(V(.4 + lerp(0, -.4, lt / 4), 2.4, 9.6 - lt * .1), V(0, 3.6, -14), 50);
    scene.updateMatrixWorld(true);
  };
  return out;
}
