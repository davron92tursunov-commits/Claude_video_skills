// Earth_mechanics_20: umumiy dvigatel (Three.js renderer + post). Earth_mechanics_19 core.js dan qisqartirilgan: terrain/suv/tuman yo'q.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
export {THREE};

const CV = document.getElementById('gl');
export const W = CV.width, H = CV.height, PI = Math.PI, D2R = PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a)), sm = k => k * k * (3 - 2 * k), eo = k => 1 - Math.pow(1 - k, 3), eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
export const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
  return lerp(lerp(hash(i, j), hash(i + 1, j), fx), lerp(hash(i, j + 1), hash(i + 1, j + 1), fx), fy) * 2 - 1; }
export const fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * vn(x * f, y * f); f *= 2.03; a *= .5; } return s; };
export const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

export const renderer = new THREE.WebGLRenderer({canvas: CV, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.toneMapping = THREE.ACESFilmicToneMapping;
export const camera = new THREE.PerspectiveCamera(40, W / H, .05, 4000);

export const renderPass = new RenderPass(new THREE.Scene(), camera);
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .45, .55, .95);
export const grade = new ShaderPass({
  uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uSat: {value: 1.08}, uCon: {value: 1.04}, uVig: {value: .3}, uGrain: {value: .03}, uCA: {value: .0014}},
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uSat,uCon,uVig,uGrain,uCA;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 c=vUv-.5;float r2=dot(c,c);
 vec3 col=vec3(texture2D(tDiffuse,vUv+c*uCA*r2*4.).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-c*uCA*r2*4.).b);
 float L=dot(col,vec3(.2126,.7152,.0722));
 col=mix(vec3(L),col,uSat);col=(col-.5)*uCon+.5;
 col*=1.-uVig*smoothstep(.12,.62,r2*1.6);
 col+=(h(gl_FragCoord.xy+fract(uTime*7.3)*91.)-.5)*uGrain;
 gl_FragColor=vec4(clamp(col,0.,1.),1.);}`});
export const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);
