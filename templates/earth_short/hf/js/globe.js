// Haqiqiy Yer (Realistic_Earth_test shaderlari) — ixtiyoriy radius/markaz, qalinligi o'zgaruvchan atmosfera (gaz rejimi), Yupiter, yulduzlar.
import {THREE, renderer, W, H, clamp, rng} from './core.js';

const TL = new THREE.TextureLoader(), AN = renderer.capabilities.getMaxAnisotropy();
const T = (f, s) => new Promise(r => TL.load('tex/' + f, t => { t.anisotropy = AN; if (s) t.colorSpace = THREE.SRGBColorSpace; r(t); }));
const [day, night, brc, spec, masks] = await Promise.all([T('earth_day_4096.jpg', 1), T('earth_night_4096.jpg', 1), T('earth_bump_roughness_clouds_4096.jpg'), T('earth_specular_2048.jpg'), T('masks.png')]);
export const TEX = {day, night, brc, spec, masks};

// har kadrda main.js yangilaydi
export const G = {sunDir: {value: new THREE.Vector3(1, .3, .6).normalize()}, camPos: {value: new THREE.Vector3()}};

const earthVS = `varying vec2 vUv;varying vec3 vN;varying vec3 vP;
void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const earthFS = `uniform sampler2D dayMap,nightMap,brcMap,specMap,maskMap;uniform vec3 sunDir,camPos;uniform float cloudOff,bump,uGreen,uRain,uLake,uDry,uHL,uUS,uIce,uBandLat,uBandA,uWetB,uDryB,uTree;
varying vec2 vUv;varying vec3 vN;varying vec3 vP;
void main(){
 vec3 Ng=normalize(vN),V=normalize(camPos-vP),L=normalize(sunDir);
 float h=texture2D(brcMap,vUv).r;vec3 dx=dFdx(vP),dy=dFdy(vP);float hx=dFdx(h),hy=dFdy(h);
 vec3 r1=cross(dy,Ng),r2=cross(Ng,dx);float det=dot(dx,r1);vec3 g=sign(det)*(hx*r1+hy*r2);
 vec3 N=normalize(abs(det)*Ng-bump*g);
 float mu=dot(Ng,L),dayMix=smoothstep(-.12,.22,mu);
 vec3 day=texture2D(dayMap,vUv).rgb;
 float ocean=texture2D(specMap,vUv).r;
 vec3 mk=texture2D(maskMap,vUv).rgb,mb=texture2D(maskMap,vUv,5.).rgb;
 float lat=(vUv.y-.5)*180.,lon=(vUv.x-.5)*360.;
 float fl=mix(4.,41.,uGreen);
 float gr=mk.r*(1.-smoothstep(fl-5.,fl,lat))*step(.001,uGreen);
 float Ld=dot(day,vec3(.3,.5,.2));
 vec3 grass=mix(vec3(.03,.12,.02),vec3(.16,.32,.05),clamp(Ld*1.1,0.,1.));
 day=mix(day,day*vec3(.74,.62,.46),mk.r*(1.-gr));
 day=mix(day,grass,gr*.94);
 float band=exp(-pow((lat-fl+1.5)/2.6,2.))*uRain*mk.r*step(.001,uGreen)*step(uGreen,.995);
 day+=vec3(.15,.45,1.)*band*.9;
 vec2 ld=vec2((lon-17.)/(3.7*uLake+.001),(lat-15.3)/(3.1*uLake+.001));float lk=(1.-smoothstep(.82,1.,length(ld)))*step(.001,uLake);
 day=mix(day,vec3(.03,.2,.45),lk*.95);ocean=max(ocean,lk);
 day=mix(day,vec3(.55,.43,.3)*(.5+Ld),mk.g*uDry*.85);
 float edge=smoothstep(.12,.5,mb.r)*(1.-smoothstep(.5,.88,mb.r));
 float landM=1.-ocean;
 float forest=smoothstep(.004,.03,day.g-max(day.r,day.b*.9))*landM;
 day=mix(day,vec3(.7,.56,.4)*(.8+Ld),forest*max(uTree,0.)*.97);
 day=mix(day,day*vec3(.72,1.45,.65),forest*max(-uTree,0.)*.85);
 float ice=smoothstep(uIce-2.5,uIce+.5,abs(lat))*step(uIce,89.);
 day=mix(day,vec3(.8,.9,1.)*(.7+.5*Ld),ice*.92);
 day=mix(day,vec3(.78,.4,.14)*(.55+Ld),smoothstep(10.,16.,abs(lat))*(1.-smoothstep(34.,40.,abs(lat)))*landM*uDryB*.95);
 day=mix(day,day*vec3(.35,1.4,.4)+vec3(0.,.06,0.),(1.-smoothstep(6.,11.,abs(lat)))*landM*uWetB*.9);
 day+=vec3(.15,.5,1.)*exp(-pow((lat-uBandLat)/4.,2.))*uBandA*.75;
 day+=vec3(1.,.5,.08)*(edge*.55+mk.r*.02)*uHL;
 float edgeU=smoothstep(.12,.5,mb.b)*(1.-smoothstep(.5,.88,mb.b));
 day+=vec3(.3,.7,1.)*(edgeU*.9+mk.b*.05)*uUS;
 vec2 sh=vec2(cloudOff,0.)-vec2(dot(L,cross(vec3(0.,1.,0.),Ng)),L.y-dot(L,Ng)*Ng.y)*.004;
 float cs=texture2D(brcMap,vUv+sh).b;
 vec3 col=day*max(dot(N,L),0.)*2.15*(1.-.55*smoothstep(.2,.9,cs));
 vec3 Hh=normalize(L+V);float sp=pow(max(dot(Ng,Hh),0.),160.)*ocean*dayMix;
 col+=vec3(1.,.93,.82)*sp*.45+vec3(.9,.85,.75)*pow(max(dot(Ng,Hh),0.),18.)*ocean*dayMix*.12;
 col+=vec3(.05,.12,.25)*ocean*pow(1.-max(dot(Ng,V),0.),3.)*dayMix;
 float cl=texture2D(brcMap,vUv+vec2(cloudOff,0.)).b;
 vec3 nl=texture2D(nightMap,vUv).rgb;nl=pow(nl,vec3(1.4))*vec3(1.,.78,.48)*2.4;
 col+=nl*(1.-dayMix)*(1.-.75*smoothstep(.2,.8,cl));
 float fr=pow(1.-max(dot(Ng,V),0.),2.2);
 vec3 sky=mix(vec3(1.,.42,.15),vec3(.35,.62,1.),smoothstep(-.1,.45,mu));
 float lit=smoothstep(-.25,.6,mu);
 col=mix(col,sky*1.1*lit,fr*.5*lit)+sky*fr*.2*lit;
 col+=vec3(.25,.45,.9)*.04*lit;
 gl_FragColor=vec4(col,1.);
}`;
const cloudFS = `uniform sampler2D brcMap;uniform vec3 sunDir,camPos;uniform float cloudOff;
varying vec2 vUv;varying vec3 vN;varying vec3 vP;
void main(){
 vec3 Ng=normalize(vN),V=normalize(camPos-vP),L=normalize(sunDir);
 float c=texture2D(brcMap,vUv+vec2(cloudOff,0.)).b;float a=smoothstep(.12,.85,c);
 float mu=dot(Ng,L),lit=smoothstep(-.18,.35,mu);
 vec3 tint=mix(vec3(1.,.55,.3),vec3(1.),smoothstep(0.,.35,mu));
 vec3 col=tint*(.05+1.75*max(mu,0.)+.18*lit);
 float fr=pow(1.-max(dot(Ng,V),0.),2.);
 gl_FragColor=vec4(col*lit+vec3(.003,.006,.015),a*(.92-.4*fr));
}`;
// atmosfera: markaz uC, radius uR, qalinlik uTh (R ulushida), uGas=1 -> vodorod (binafsha) + geliy (sariq) qatlamlari
const atmoVS = `varying vec3 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const atmoFS = `uniform vec3 sunDir,camPos,uC;uniform float uR,uTh,uGas,uA;varying vec3 vP;
void main(){
 vec3 rd=normalize(vP-camPos),L=normalize(sunDir);
 float t=dot(uC-camPos,rd);vec3 cp=camPos+rd*t;float d=length(cp-uC)/uR;
 if(d<1.)discard;
 float hgt=(d-1.)/uTh;float dens=exp(-hgt*mix(4.2,2.4,uGas))*(1.-smoothstep(.85,1.,hgt));
 vec3 n=(cp-uC)/(d*uR);float mu=dot(n,L);
 vec3 sky=mix(vec3(1.,.38,.12),vec3(.32,.6,1.),smoothstep(-.15,.45,mu));
 vec3 gas=mix(vec3(.55,.42,1.),vec3(1.,.82,.4),smoothstep(.25,.85,hgt));
 sky=mix(sky,gas,uGas);
 float lit=mix(smoothstep(-.35,.35,mu),.8,uGas);
 float fwd=pow(max(dot(rd,L),0.),10.);
 vec3 col=sky*dens*(lit*1.6+fwd*3.5*smoothstep(-.4,.1,mu))*uA;
 gl_FragColor=vec4(col,1.);
}`;

const GEO = {hi: new THREE.SphereGeometry(1, 256, 128), lo: new THREE.SphereGeometry(1, 72, 36)};

// R: radius; lo: kichik geometriya; atmo: atmosfera qobig'i
export function makeEarth(R = 1, {lo = false, atmo = true, th = .06, gas = 0} = {}) {
  const g = new THREE.Group(), geo = lo ? GEO.lo : GEO.hi;
  const U = {sunDir: G.sunDir, camPos: G.camPos, cloudOff: {value: 0}, bump: {value: .016}, uGreen: {value: 0}, uRain: {value: 0}, uLake: {value: 0}, uDry: {value: 0}, uHL: {value: 0}, uUS: {value: 0}, uIce: {value: 90}, uBandLat: {value: 0}, uBandA: {value: 0}, uWetB: {value: 0}, uDryB: {value: 0}, uTree: {value: 0}};
  g.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({vertexShader: earthVS, fragmentShader: earthFS, uniforms: {...U, dayMap: {value: day}, nightMap: {value: night}, brcMap: {value: brc}, specMap: {value: spec}, maskMap: {value: masks}}})));
  const cm = new THREE.Mesh(geo, new THREE.ShaderMaterial({vertexShader: earthVS, fragmentShader: cloudFS, uniforms: {...U, brcMap: {value: brc}}, transparent: true, depthWrite: false}));
  cm.scale.setScalar(1.007); g.add(cm);
  const A = {sunDir: G.sunDir, camPos: G.camPos, uC: {value: new THREE.Vector3()}, uR: {value: R}, uTh: {value: th}, uGas: {value: gas}, uA: {value: 1}};
  let am = null;
  if (atmo) { am = new THREE.Mesh(GEO.lo, new THREE.ShaderMaterial({vertexShader: atmoVS, fragmentShader: atmoFS, uniforms: A, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})); g.add(am); }
  g.scale.setScalar(R);
  const E = {g, U, A, cm, am, R,
    // r: radius, p: markaz; kamera masofasiga qarab relyef kuchi
    place(p, r = E.R) { E.R = r; g.position.copy(p); g.scale.setScalar(r); A.uC.value.copy(p); A.uR.value = r;
      if (am) am.scale.setScalar(1 + A.uTh.value * 1.08);
      const d = p.distanceTo(G.camPos.value), px = d * 2 * Math.tan(20 * Math.PI / 180) / H;
      U.bump.value = clamp(.016 * px / .0016, .004, .06) * r / r; },
    thick(v) { A.uTh.value = v; if (am) am.scale.setScalar(1 + v * 1.08); },
    clouds(t) { U.cloudOff.value = t * .0035; }};
  return E;
}

// yulduzlar + quyosh dog'i; L — quyosh yo'nalishi
export function space(L, seed = 7) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010208);
  const r = rng(seed), N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.set([q * Math.cos(a) * 1800, u * 1800, q * Math.sin(a) * 1800], i * 3);
    const b = Math.pow(r(), 3) * 1.4 + .12, w = r(); col.set([b * (.85 + .15 * w), b * .92, b * (1.05 - .15 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({size: 2.2, sizeAttenuation: false, vertexColors: true})); scene.add(stars);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.12, '#fff8e8'); gr.addColorStop(.3, 'rgba(255,220,170,.35)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({map: t, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(6, 5.6, 5)}));
  sun.scale.set(1100, 1100, 1); sun.position.copy(L).multiplyScalar(1500); scene.add(sun);
  const dl = new THREE.DirectionalLight(0xfff2e0, 3.2); dl.position.copy(L).multiplyScalar(100); scene.add(dl, new THREE.AmbientLight(0x4466aa, .12));
  return {scene, sun, dl, stars, L};
}

// Yupiter: kanvasda chiziqlar + Katta Qizil Dog'
export function makeJupiter(R = 11) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), r = rng(11);
  const bands = ['#d9b48a', '#b5753f', '#e7d2b0', '#a45a2c', '#d8b07c', '#8f5a3a', '#e9d9bd', '#b8794a', '#d3a574', '#c98e5a', '#e5cfa8', '#a8703f'];
  let y = 0, i = 0; while (y < 512) { const h = 22 + r() * 34; x.fillStyle = bands[i++ % bands.length]; x.fillRect(0, y, 1024, h + 2); y += h; }
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${r() > .5 ? '255,235,205' : '90,50,25'},${.05 + r() * .09})`; const yy = r() * 512; x.beginPath(); x.ellipse(r() * 1024, yy, 20 + r() * 90, 1.5 + r() * 4, 0, 0, 6.283); x.fill(); }
  x.fillStyle = '#b4452b'; x.beginPath(); x.ellipse(690, 322, 58, 30, 0, 0, 6.283); x.fill(); x.fillStyle = 'rgba(240,200,160,.4)'; x.beginPath(); x.ellipse(690, 322, 36, 17, 0, 0, 6.283); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = AN;
  const m = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.MeshStandardMaterial({map: t, roughness: .95}));
  return m;
}
// gaz gigant (mini-Neptun): ko'k-moviy chiziqli
export function makeGasPlanet(R = 2.5) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), r = rng(3);
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5f86d9'); gr.addColorStop(.5, '#7fa8ef'); gr.addColorStop(1, '#4a6dc2'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 160; k++) { x.fillStyle = `rgba(${r() > .5 ? '230,240,255' : '30,50,120'},${.05 + r() * .1})`; x.beginPath(); x.ellipse(r() * 512, r() * 256, 30 + r() * 80, 1 + r() * 3, 0, 0, 6.283); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.SphereGeometry(R, 96, 48), new THREE.MeshStandardMaterial({map: t, roughness: .9, emissive: 0x16306a, emissiveIntensity: .25}));
}
