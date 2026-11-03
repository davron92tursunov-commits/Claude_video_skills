// "What if the Sahara turned green" — sahnalar: Yer (haqiqiy Sahara/Amazon/AQSh maskalari) va 3D sahro (dunalar, yomg'ir, o'simlik, ko'l, begemotlar, qahramon).
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
export const projv = v => { const q = v.clone().project(camera); return [(q.x * .5 + .5) * 1080, (-q.y * .5 + .5) * 1920]; };

const ll2v = (lat, lon, r = 1) => { const a = lat * D2R, b = lon * D2R; return V(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b)); };  // Yer tekstura koordinatasida (lon 0 = +x)

/* ---------- 1) Yer: yashil to'lqin, ko'l, chang, Amazon, o'q tebranishi ---------- */
export function earthScene() {
  const L = V(-.45, .3, .85).normalize(), S = space(L, 7), E = makeEarth(1), out = {scene: S.scene, exposure: 1};
  const tilter = new THREE.Group(); S.scene.add(tilter); tilter.add(E.g);
  // chang zarralari: Sahara -> Amazon (Yer koordinatasida, Yer bilan birga aylanadi)
  const N = 1700, r = rng(21), pa = new Float32Array(N), sp = new Float32Array(N), jx = new Float32Array(N * 3), hs = new Float32Array(N), alpha = new Float32Array(N), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pa[i] = r(); sp[i] = .035 + .03 * r(); hs[i] = r(); jx[i * 3] = (r() - .5) * .16; jx[i * 3 + 1] = (r() - .5) * .16; jx[i * 3 + 2] = (r() - .5) * .16; }
  const A0 = ll2v(19, 6), A1 = ll2v(-3, -60), om = Math.acos(A0.dot(A1));
  const sl = s => A0.clone().multiplyScalar(Math.sin((1 - s) * om) / Math.sin(om)).add(A1.clone().multiplyScalar(Math.sin(s * om) / Math.sin(om)));
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('aA', new THREE.BufferAttribute(alpha, 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: 'attribute float aA;varying float vA;void main(){vA=aA;gl_PointSize=17.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.2,1.,d))*vA;gl_FragColor=vec4(vec3(.96,.7,.34),a);}'}));
  dust.frustumCulled = false; E.g.add(dust);
  // o'q va prosessiya doirasi
  const ax = new THREE.Group(); S.scene.add(ax);
  const axLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, -1.9, 0), V(0, 2.1, 0)]), new THREE.LineBasicMaterial({color: 0xffd23f, transparent: true, opacity: .95}));
  tilter.add(axLine);
  const th = 23.4 * D2R, ringPts = []; for (let i = 0; i <= 96; i++) { const q = i / 96 * 6.283; ringPts.push(V(Math.sin(th) * Math.sin(q) * 2.1, Math.cos(th) * 2.1, Math.sin(th) * Math.cos(q) * 2.1)); }
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({color: 0x9fd0ff, dashSize: .06, gapSize: .05, transparent: true, opacity: .8})); ring.computeLineDistances(); ax.add(ring);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 12), new THREE.MeshBasicMaterial({color: 0xffd23f})); ax.add(tip);
  axLine.visible = ring.visible = tip.visible = false;
  out.update = (lt, P) => {
    G.sunDir.value.copy(L);
    const dist = P.dist ?? 7.4, yPx = P.y ?? 1200;
    frame(V(0, 0, 0), dist, yPx, FOV, P.az || 0, P.el || 0);
    E.g.rotation.set((P.lat ?? 23) * D2R, -PI / 2 - (P.lon ?? 17) * D2R + (P.spin || 0), 0, 'XYZ');
    const u = E.U; u.uGreen.value = P.green || 0; u.uRain.value = P.rain || 0; u.uLake.value = P.lake || 0; u.uDry.value = P.dry || 0; u.uHL.value = P.hl || 0; u.uUS.value = P.us || 0;
    E.clouds(lt + (P.cl || 0)); E.place(V(0, 0, 0), 1);
    out.exposure = P.exp ?? 1;
    // chang
    const amt = P.dust || 0, t = lt + (P.dt || 0), pa2 = pos;
    for (let i = 0; i < N; i++) { const s = (pa[i] + t * sp[i]) % 1, p = sl(s).normalize(), hgt = 1.03 + .06 * Math.sin(s * PI) + .02 * hs[i];
      pa2[i * 3] = p.x * hgt + jx[i * 3] * s; pa2[i * 3 + 1] = p.y * hgt + jx[i * 3 + 1] * s; pa2[i * 3 + 2] = p.z * hgt + jx[i * 3 + 2] * s;
      alpha[i] = hs[i] < amt ? Math.min(1, s * 8) * Math.min(1, (1 - s) * 8) : 0; }
    dg.attributes.position.needsUpdate = true; dg.attributes.aA.needsUpdate = true; dust.visible = amt > .001;
    // o'q tebranishi
    const wob = P.wobble !== undefined, psi = (P.wobble || 0) * 6.283;
    axLine.visible = ring.visible = tip.visible = wob;
    if (wob) { tilter.rotation.set(Math.sin(th) * Math.sin(psi) * 0 + th * Math.cos(psi) * 1, 0, -th * Math.sin(psi), 'XYZ'); tilter.rotation.set(th * Math.cos(psi), 0, -th * Math.sin(psi)); tip.position.set(Math.sin(th) * Math.sin(psi) * 2.1, Math.cos(th) * 2.1, Math.sin(th) * Math.cos(psi) * 2.1); tip.position.set(Math.sin(psi) * Math.sin(th) * 2.1, Math.cos(th) * 2.1, Math.cos(psi) * Math.sin(th) * 2.1); }
    else tilter.rotation.set(0, 0, 0);
    ax.visible = wob; ax.rotation.set(0, 0, 0);
  };
  return out;
}

/* ---------- 2) Sahro: dunalar, yomg'ir, o'simlik, ko'l, begemotlar, qahramon ---------- */
const LAKE = {x: 0, z: -36};
export function gh(x, z) {
  const d = fbm(x * .016 + 3, z * .016 + 5, 3), u = x * Math.cos(.5) + z * Math.sin(.5) + d * 30, rid = 1 - Math.abs(Math.sin(u * .12));
  let h = Math.pow(rid, 1.3) * 8 * (.6 + .6 * fbm(x * .03 + 9, z * .03, 2)) + d * 8 + fbm(x * .008, z * .008, 2) * 12;
  const rr = Math.hypot(x - LAKE.x, z - LAKE.z); return lerp(-3.4, h, sm(clamp((rr - 15) / 17)));
}
let CR = null;
function findCrest() { let b = {y: -99}; for (let x = -34; x <= 34; x += 2) for (let z = 4; z <= 34; z += 2) { const y = gh(x, z); if (y > b.y) b = {x, y, z}; } return b; }
const terrVS = 'varying vec3 vW,vN;void main(){vN=normal;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const terrFS = `uniform vec3 uSun,uCam;uniform float uGrass,uWet,uOver;varying vec3 vW,vN;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){return .5*n2(p)+.25*n2(p*2.03)+.125*n2(p*4.1)+.0625*n2(p*8.3);}
void main(){
 vec3 N=normalize(vN);float rp=n2(vW.xz*.8)+n2(vW.xz*3.1)*.5;
 N=normalize(N+vec3(sin(vW.x*4.5+rp*6.),0.,sin(vW.z*4.5+rp*5.))*.05*(1.-uGrass*.6));
 vec3 L=normalize(uSun);
 float nz=fb(vW.xz*.05),nz2=fb(vW.xz*.45);
 float low=clamp((1.5-vW.y)*.2,0.,1.);
 float ga=smoothstep(0.,.3,uGrass*1.5-nz*.85+low*.5-.12);
 vec3 sand=mix(vec3(.55,.30,.13),vec3(.86,.58,.30),nz2*.5+.5*smoothstep(-1.,6.,vW.y));
 vec3 grass=mix(vec3(.04,.12,.025),vec3(.24,.38,.07),fb(vW.xz*.8))*(.75+.5*n2(vW.xz*7.))*mix(vec3(1.),vec3(1.25,1.1,.6),smoothstep(.5,.8,nz));
 vec3 alb=mix(sand,grass,ga)*(1.-uWet*.35);
 float dif=max(dot(N,L),0.);
 vec3 col=alb*(dif*vec3(1.,.82,.58)*1.35*(1.-uOver*.6)+vec3(.12,.16,.28)*(.5+.5*N.y)*(1.-uOver*.2));
 float d=length(vW-uCam);float fog=1.-exp(-d*d*.000006-d*.0009);
 col=mix(col,mix(vec3(.66,.48,.34),vec3(.28,.32,.4),uOver),fog*.85);
 gl_FragColor=vec4(col,1.);}`;
const skyFS = `uniform vec3 uSun;uniform float uOver,uTime;varying vec3 vD;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){vec3 d=normalize(vD);float y=max(d.y,0.);
 vec3 hor=mix(vec3(.72,.46,.28),vec3(.3,.34,.4),uOver),zen=mix(vec3(.03,.12,.36),vec3(.1,.12,.17),uOver);
 vec3 col=mix(hor,zen,pow(y,.5));
 float s=max(dot(d,normalize(uSun)),0.);col+=vec3(1.,.82,.55)*(pow(s,600.)*4.+pow(s,10.)*.4)*(1.-uOver);
 vec2 cp=d.xz/(d.y+.25)*2.2+vec2(uTime*.02,0.);float c=n2(cp)*.6+n2(cp*2.1)*.3;
 col=mix(col,mix(vec3(.7,.55,.45),vec3(.16,.18,.22),uOver),smoothstep(.5-uOver*.3,.9,c)*(.25+.7*uOver)*smoothstep(0.,.35,d.y));
 gl_FragColor=vec4(col,1.);}`;

export async function desertScene() {
  await loadHero();
  const scene = new THREE.Scene(), out = {scene, exposure: 1};
  const U = {uSun: {value: V(-.8, .45, .1).normalize()}, uCam: {value: new THREE.Vector3()}, uGrass: {value: 0}, uWet: {value: 0}, uOver: {value: 0}, uTime: {value: 0}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, uniforms: U, vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);}', fragmentShader: skyFS}));
  sky.frustumCulled = false; scene.add(sky);
  const tg = new THREE.PlaneGeometry(320, 320, 320, 320); tg.rotateX(-PI / 2); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, gh(tp.getX(i), tp.getZ(i) - 40)); tg.translate(0, 0, -40); tg.computeVertexNormals();
  scene.add(new THREE.Mesh(tg, new THREE.ShaderMaterial({uniforms: U, vertexShader: terrVS, fragmentShader: terrFS})));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.0); scene.add(sun, new THREE.HemisphereLight(0xaac8ff, 0x8a6a40, 1.0));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshStandardMaterial({color: 0x2d9ab5, emissive: 0x0b4a5c, roughness: .35, metalness: 0, transparent: true, opacity: .92})); water.rotation.x = -PI / 2; water.position.set(LAKE.x, -3, LAKE.z); scene.add(water);
  // yomg'ir
  const RN = 3200, rr = rng(5), rp = new Float32Array(RN * 6), rs = new Float32Array(RN * 2);
  for (let i = 0; i < RN; i++) { const x = (rr() - .5) * 70, y = rr() * 40, z = (rr() - .5) * 70; rp.set([x, y, z, x + .25, y + 1.2, z], i * 6); rs[i * 2] = rs[i * 2 + 1] = rr(); }
  const rgm = new THREE.BufferGeometry(); rgm.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rgm.setAttribute('aS', new THREE.BufferAttribute(rs, 1));
  const RU = {uT: {value: 0}, uA: {value: 0}};
  const rain = new THREE.LineSegments(rgm, new THREE.ShaderMaterial({uniforms: RU, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aS;uniform float uT;void main(){vec3 p=position;float f=fract((p.y-uT*(30.+aS*12.))/40.);p.y=f*40.-6.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'uniform float uA;void main(){gl_FragColor=vec4(.78,.86,1.,.5*uA);}'})); rain.frustumCulled = false; scene.add(rain);
  // o'simlik (Kenney nature-kit, CC0)
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'), gl = new GLTFLoader(), tpl = {};
  for (const n of ['tree_palmTall', 'tree_palmShort', 'tree_palmBend', 'plant_bushLarge', 'plant_bush', 'grass_large', 'cactus_tall', 'stone_largeA', 'stone_largeC']) { const g = await gl.loadAsync(`models/nature/${n}.glb`); const b = new THREE.Box3().setFromObject(g.scene); tpl[n] = {s: g.scene, h: b.max.y - b.min.y || 1}; }
  CR = findCrest(); const plants = [], pr = rng(77);
  const add = (n, x, z, hgt, kind, delay, yaw) => { const t = tpl[n], o = t.s.clone(true), w = new THREE.Group(); w.add(o); w.position.set(x, gh(x, z - 0), z); w.rotation.y = yaw; scene.add(w); w.visible = false; plants.push({w, k: hgt / t.h, kind, delay}); };
  const place = (n, cnt, hmin, hmax, kind, rmin, rmax) => { let c = 0, tries = 0; while (c < cnt && tries++ < cnt * 40) { const x = (pr() - .5) * 120, z = 40 - pr() * 130, rl = Math.hypot(x - LAKE.x, z - LAKE.z); if (rl < rmin || rl > rmax) continue;
    if (gh(x, z) < -.2 || Math.hypot(x - CR.x, z - CR.z) < 7) continue; add(n, x, z, hmin + pr() * (hmax - hmin), kind, pr(), pr() * 6.28); c++; } };
  place('tree_palmTall', 30, 8, 12, 't', 16, 90); place('tree_palmShort', 26, 6, 9, 't', 15, 90); place('tree_palmBend', 20, 7, 10, 't', 18, 90);
  place('plant_bushLarge', 80, 1.6, 2.8, 'g', 10, 110); place('plant_bush', 80, 1.1, 1.9, 'g', 8, 110); place('grass_large', 200, .8, 1.5, 'g', 6, 120);
  place('cactus_tall', 6, 2.5, 4, 'c', 20, 110);
  // begemotlar (bloksimon, hayvon)
  const hipM = new THREE.MeshStandardMaterial({color: 0x8d7d86, emissive: 0x241c22, roughness: .8, flatShading: true}), hipP = new THREE.MeshStandardMaterial({color: 0xc99a98, emissive: 0x3a2020, roughness: .75, flatShading: true}), hipD = new THREE.MeshStandardMaterial({color: 0x1d1a22, roughness: .6});
  const hips = [[-6.5, -20], [.5, -24], [6.5, -20.5], [-3, -29]].map(([x, z], i) => { const g = new THREE.Group(), bx = (w, h, d, m, px, py, pz) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(px, py, pz); g.add(q); return q; };
    bx(2.2, 1.0, 3.0, hipM, 0, -.45, 1.7); bx(1.7, 1.1, 1.3, hipM, 0, .1, -.5); bx(1.8, .75, 1.0, hipP, 0, -.15, -1.45); bx(.3, .22, .3, hipD, -.42, .22, -1.9); bx(.3, .22, .3, hipD, .42, .22, -1.9);
    bx(.34, .34, .26, hipM, -.78, .78, -.1); bx(.34, .34, .26, hipM, .78, .78, -.1); bx(.24, .24, .24, hipD, -.5, .7, -.95); bx(.24, .24, .24, hipD, .5, .7, -.95);
    g.rotation.y = PI + (i % 2 ? .3 : -.25); g.scale.setScalar(.95); g.position.set(x, -3, z); scene.add(g); return {g, x, z, i}; });
  const H = hero(scene, {scale: 1}), HP = V(CR.x, CR.y, CR.z), HD = V(LAKE.x - CR.x, 0, LAKE.z - CR.z).normalize();
  const rg = new THREE.Group(); scene.add(rg);
  const base = (x, z, dy) => V(x, gh(x, z) + dy, z);
  out.pts = {};
  out.update = (lt, P) => {
    const shot = P.shot, wl = lerp(-3.3, -.45, eo(P.water || 0));
    U.uGrass.value = P.grass || 0; U.uWet.value = P.wet || 0; U.uOver.value = P.over || 0; U.uTime.value = lt;
    const sd = P.sun || V(-.8, .42, .1); U.uSun.value.copy(sd).normalize(); sun.position.copy(U.uSun.value).multiplyScalar(100);
    sun.intensity = 3.2 * (1 - (P.over || 0) * .6); scene.children.forEach(c => { if (c.isHemisphereLight) c.intensity = 1 + (P.over || 0) * .3; });
    water.position.y = wl; water.visible = (P.water || 0) > .01;
    for (const p of plants) { let g = p.kind === 't' ? P.trees || 0 : p.kind === 'g' ? P.grass || 0 : 0; if (p.kind === 'c') g = 1 - seg(P.grass || 0, .1, .5); if (p.kind === 's') g = 1;
      const s = p.kind === 's' || p.kind === 'c' ? g : eo(seg(g * 1.25, p.delay * .6, p.delay * .6 + .45)); p.w.visible = s > .02; p.w.scale.setScalar(p.k * Math.max(s, .001)); }
    // begemotlar
    for (const h of hips) { const up = eo(seg(P.hip || 0, h.i * .12, h.i * .12 + .35)), bob = Math.sin(lt * 1.3 + h.i * 2) * .06 + (P.hip > .7 && h.i % 2 ? Math.sin(lt * 2.2 + h.i) * .05 : 0);
      h.g.position.y = wl - .15 + up * .35 - (1 - up) * 1.8 + bob; h.g.visible = (P.hip || 0) > .01 && wl > -1; }
    // qahramon
    const hv = (P.hero || 0) > 0; H.g.visible = hv;
    if (hv) poseHero(H, {x: HP.x, y: HP.y, z: HP.z, ry: Math.atan2(HD.x, HD.z), point: P.point || 0, lookUp: P.look || 0, lean: 0, armsUp: 0, step: 0, t: lt});
    // yomg'ir
    RU.uT.value = lt; RU.uA.value = P.rainA || 0; rain.visible = (P.rainA || 0) > .01;
    // kamera
    let cp, ct, fov = 40; const k = P.k ?? 0;
    if (shot === 'dry') { cp = base(lerp(-24, 8, k), lerp(70, 30, k), 2.4); ct = V(0, 9, -70); fov = 46; }
    else if (shot === 'rain') { cp = base(lerp(8, 4, k), lerp(30, 18, k), 2.4); ct = V(0, 8, -60); fov = 46; }
    else if (shot === 'grow') { cp = V(CR.x + lerp(-7, -1, k), CR.y + 3.4, CR.z + lerp(7, 0, k)); ct = V(0, 2, -42); fov = 48; }
    else if (shot === 'lake') { cp = V(CR.x + lerp(0, 4, k), CR.y + 3.6, CR.z - lerp(0, 6, k)); ct = V(0, wl + .5, -40); fov = 48; }
    else if (shot === 'hippo') { cp = V(lerp(-1.5, 1.5, k), Math.max(wl + 1.5, gh(0, -3) + 1.6), -3); ct = V(0, wl + .5, -24); fov = 46; }
    else { cp = V(HP.x - HD.x * lerp(10.5, 7.2, k) + HD.z * 1.4, HP.y + lerp(2.6, 2.0, k), HP.z - HD.z * lerp(10.5, 7.2, k) - HD.x * 1.4); ct = V(HP.x + HD.x * 18, HP.y + 1.3, HP.z + HD.z * 18); fov = 40; }
    camAt(cp, ct, fov); U.uCam.value.copy(cp);
    rg.position.copy(cp); rain.position.copy(cp);
    scene.updateMatrixWorld(true);
  };
  return out;
}
