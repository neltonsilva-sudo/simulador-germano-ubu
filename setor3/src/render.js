// Renderização fotográfica do setor 3 — técnica portada do gêmeo do Laboratório de Eletricidade (render.js):
// Pipeline (q=high): RenderPass (MSAA 4x, HalfFloat) → GTAO (meia resolução) → Bloom leve → OutputPass (Neutral, sRGB)
//                    → PhonePass (assinatura de câmera de celular) → Upscale (estilo FSR, resolução dinâmica).
// Luz: luz do dia (sol com sombra VSM suave entrando pelas aberturas + céu), ambiente PMREM do prédio com projeção em
// caixa (render_env.js), luminárias de galpão como spots reais e névoa leve de pó de minério no ar.
// Acúmulo temporal (equivalente web ao DLSS/TAA): com a câmera parada, jitter subpixel (Halton) + média dos quadros
// → bordas e texturas finas sem serrilhado (guarda-corpos, grades); ao mover volta ao quadro normal. ?taa=0 desliga.
// ?q=low (e celular): renderização direta, sem pós (modo leve). Ajuste por URL: ?lk=exposure:1.1,sun:5
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { B, LV } from './layout.js?v=20261010084418';
import { installBoxProjection, buildEnvironment } from './render_env.js?v=20261010084418';
import { PhoneShader } from './render_post.js?v=20261010084418';
import { UpscaleShader } from './render_upscale.js?v=20261010084418';

const Q = new URLSearchParams(location.search);
const MOBILE = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
export const HIGH = Q.get('q') !== 'low' && !MOBILE;

// Calibração (cor média das fotos: setor escuro, contraste alto, luz do dia forte nas aberturas)
export const LOOK = {
  exposure: 1.0,
  sun: 4.2,           // sol (lux relativo) entrando pelas aberturas
  sky: 3.4,           // radiância do céu vista pelas aberturas (ambiente)
  env: 1.0,           // intensidade do ambiente PMREM
  hemi: .18,          // preenchimento muito fraco
  lamp: 55,           // spots das luminárias (cd)
  lampL2: 11,         // projetores locais do piso +14 (a 2,8 m do piso)
  shaft: .32,         // feixes de luz do dia (claraboias) — espalhamento no pó do ar
  motes: .9,          // brilho das partículas de pó dentro dos feixes
  halo: .22,          // halo das luminárias (sem estourar)
  fogIn: .010,        // névoa de pó dentro do prédio (FogExp2)
  fogOut: .0016,
  aoScale: .6,
  bloom: [.16, .25, 2.6],
  ao: { radius: .9, distanceExponent: 1.6, thickness: .6, scale: 1.15, samples: 12, distanceFallOff: 1.0 },
};
for (const kv of (Q.get('lk') || '').split(',').filter(Boolean)) { const [k, v] = kv.split(':'); if (k.startsWith('ao.')) LOOK.ao[k.slice(3)] = +v; else if (k in LOOK && typeof LOOK[k] === 'number') LOOK[k] = +v; }

installBoxProjection();
const _v2 = new THREE.Vector2();
// claraboias declaradas pelo prédio (building.js → group.userData.skylights), em coordenadas do mundo
function findSkylights(scene) {
  const out = []; scene.updateMatrixWorld(true);
  scene.traverse((o) => { if (o.userData && o.userData.skylights) for (const r of o.userData.skylights) { const a = o.localToWorld(new THREE.Vector3(r.x0, r.y, r.z0)), b = o.localToWorld(new THREE.Vector3(r.x1, r.y, r.z1)); out.push({ x0: a.x, x1: b.x, z0: a.z, z1: b.z, y: a.y }); } });
  return out;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HIGH, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: Q.get('shot') === '1' });
  // computador: devicePixelRatio real (até 2) — a resolução dinâmica reduz só se o fps cair
  renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 2 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = LOOK.exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = HIGH ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  return renderer;
}

// céu de fundo: gradiente + morros com vegetação no horizonte (o que se vê pelas aberturas do prédio)
function skyDome() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#5f97cf'); g.addColorStop(.35, '#a9c9e6'); g.addColorStop(.49, '#e6eef3'); g.addColorStop(.5, '#7d8a6a'); g.addColorStop(.56, '#6d5040'); g.addColorStop(1, '#5a3d2e');
  x.fillStyle = g; x.fillRect(0, 0, 2048, 512);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // nuvens leves
  for (let i = 0; i < 70; i++) { const cx = r() * 2048, cy = 60 + r() * 150, rr = 20 + r() * 70; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
  // morros distantes (azulados) e próximos (verde-escuro com copas)
  const hills = (base, amp, col, bump) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 260); let h = 0; for (let px = 0; px <= 2048; px += 4) { h = base - amp * (.5 + .5 * Math.sin(px / 2048 * Math.PI * 6 + base) * Math.sin(px / 2048 * Math.PI * 2.6 + 1.3)) - (bump ? r() * bump : 0); x.lineTo(px, h); } x.lineTo(2048, 262); x.closePath(); x.fill(); };
  // morros com perspectiva aérea (névoa azulada, desfocados — sem recorte de "desenho")
  x.filter = 'blur(3px)'; hills(250, 46, '#9aa9ae', 0); x.filter = 'blur(1.5px)'; hills(256, 30, '#6f7f62', 5); x.filter = 'blur(.8px)'; hills(258, 12, '#58684a', 6); x.filter = 'none';
  const hz = x.createLinearGradient(0, 200, 0, 262); hz.addColorStop(0, 'rgba(225,232,236,0)'); hz.addColorStop(1, 'rgba(225,232,236,.35)'); x.fillStyle = hz; x.fillRect(0, 200, 2048, 62);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.position.set(B.W / 2, -20, B.D / 2); m.renderOrder = -10; m.frustumCulled = false; m.name = 'sky';
  // MeshBasic: ganho > 1 deixa o céu claro como na foto (estoura levemente depois do tone mapping)
  m.material.color.setScalar(1.6);
  return m;
}

// ---- efeitos de luz (feixes, poeira, halos): ficam fora do GTAO (não fazem sombra de oclusão nem escrevem profundidade)
const FX = { group: null, shafts: null, mat: null, motes: null };
// primeira superfície atingida por um raio de sol que desce de uma claraboia (pisos, laje +14, deck dos britadores, paredes)
function shaftEnd(o, d) {
  let best = 80;
  const tryY = (y, ok) => { if (d.y >= 0) return; const t = (y - o.y) / d.y; if (t > .5 && t < best) { const x = o.x + d.x * t, z = o.z + d.z * t; if (ok(x, z)) best = t; } };
  tryY(LV.L2 + .3, (x, z) => x < B.screenEnd && z < 8.7);
  tryY(LV.L1, (x) => x < B.screenEnd);
  tryY(5.5, (x, z) => x > 48.6 && ((z > 3.2 && z < 10) || z > 14));
  tryY(0, () => true);
  if (d.z < 0) { const t = -o.z / d.z; if (t > .5 && t < best && o.y + d.y * t > 4) best = t; }
  if (d.z > 0) { const t = (B.D - o.z) / d.z; if (t > .5 && t < best && o.y + d.y * t > LV.L2 + 2) best = t; }
  if (d.x > 0) { const t = (B.W - o.x) / d.x; if (t > .5 && t < best && o.y + d.y * t > 6) best = t; }
  if (d.x < 0) { const t = -o.x / d.x; if (t > .5 && t < best && o.y + d.y * t > 6) best = t; }
  return best;
}
const SHAFT_VS = /* glsl */`
varying float vS; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){ vS = position.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vV = -mv.xyz;
  vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const SHAFT_FS = /* glsl */`
uniform vec3 uCol; uniform float uI; uniform float uT;
varying float vS; varying vec3 vN; varying vec3 vV; varying vec3 vW;
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(facing, 1.8);
  float along = smoothstep(0.0, 0.08, vS) * (1.0 - smoothstep(0.82, 1.0, vS)) * mix(1.0, 0.55, vS);
  vec3 q = vW * 0.7 + vec3(uT * 0.03, -uT * 0.05, uT * 0.02);
  float dust = 0.6 + 0.55 * n3(q) + 0.3 * n3(q * 3.3 + 7.1);
  float dist = length(vV);
  float near = smoothstep(0.6, 3.0, dist);            // some ao atravessar o feixe (sem "parede" na cara da câmera)
  gl_FragColor = vec4(uCol * (uI * core * along * dust * near), 1.0);
}`;
const MOTE_VS = /* glsl */`
attribute float aPh; uniform float uT; uniform float uScale; varying float vA;
void main(){
  vec3 p = position + vec3(sin(uT * 0.23 + aPh * 6.28), sin(uT * 0.17 + aPh * 11.0) * 0.7, cos(uT * 0.19 + aPh * 8.3)) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  float d = -mv.z; gl_PointSize = clamp(uScale * 0.018 / d, 1.0, 4.0);
  vA = (0.45 + 0.55 * sin(uT * 0.7 + aPh * 40.0)) * smoothstep(0.8, 3.0, d) * (1.0 - smoothstep(14.0, 30.0, d));
}`;
const MOTE_FS = /* glsl */`
uniform vec3 uCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(c)); gl_FragColor = vec4(uCol * a * vA, 1.0); }`;

function buildLightFX(scene, sun, lamps) {
  const grp = new THREE.Group(); grp.name = 'luz-fx'; scene.add(grp); FX.group = grp;
  const d = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize();
  const sky = findSkylights(scene).map((r) => ({ a: new THREE.Vector3(r.x0, r.y, r.z0), b: new THREE.Vector3(r.x1, r.y, r.z1) }));
  // feixes: cilindro de seção elíptica (pegada da claraboia) cisalhado ao longo da direção do sol
  if (sky.length) {
    const geo = new THREE.CylinderGeometry(.5, .5, 1, 24, 1, true); geo.translate(0, .5, 0);
    const mat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(0xffe9cf) }, uI: { value: LOOK.shaft }, uT: { value: 0 } }, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, fog: false });
    FX.mat = mat; const shafts = new THREE.Group(); grp.add(shafts); FX.shafts = shafts;
    const mPos = [], mPh = [];
    for (const { a, b } of sky) {
      const c = a.clone().add(b).multiplyScalar(.5); c.y -= .1;
      const L = shaftEnd(c, d), w = Math.abs(b.x - a.x) * .95, dz = Math.abs(b.z - a.z) * .95;
      const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.frustumCulled = false;
      m.matrix.makeBasis(new THREE.Vector3(w, 0, 0), d.clone().multiplyScalar(L), new THREE.Vector3(0, 0, dz)).setPosition(c);
      m.renderOrder = 5; shafts.add(m);
      // partículas de pó em suspensão dentro do feixe
      for (let i = 0; i < 70; i++) { const s = .06 + Math.random() * .8, r = Math.sqrt(Math.random()) * .45, an = Math.random() * 6.28;
        mPos.push(c.x + d.x * L * s + Math.cos(an) * r * w, c.y + d.y * L * s, c.z + d.z * L * s + Math.sin(an) * r * dz); mPh.push(Math.random()); }
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3)); pg.setAttribute('aPh', new THREE.Float32BufferAttribute(mPh, 1));
    const pm = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uScale: { value: 800 }, uCol: { value: new THREE.Color(0xfff0dc).multiplyScalar(LOOK.motes) } }, vertexShader: MOTE_VS, fragmentShader: MOTE_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const motes = new THREE.Points(pg, pm); motes.frustumCulled = false; motes.renderOrder = 6; grp.add(motes); FX.motes = motes;
  }
  // halos das luminárias: brilho suave em volta do vidro (aditivo, moderado — o bloom fica só no núcleo)
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.15, 'rgba(255,255,255,.55)'); gr.addColorStop(.45, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const ht = new THREE.CanvasTexture(c);
  const hm = (k) => new THREE.SpriteMaterial({ map: ht, color: new THREE.Color(0xffdcb0).multiplyScalar(LOOK.halo * k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true });
  const hBig = hm(1), hSmall = hm(.8);
  for (const p of lamps) {
    const big = p.y > LV.L2 + 4, sp = new THREE.Sprite(big ? hBig : hSmall);
    sp.position.set(p.x, p.y + .12, p.z); sp.scale.setScalar(big ? 2.4 : p.kind === 'l2' ? 1.0 : 1.4); grp.add(sp);
  }
}

export function buildLighting(scene, renderer, lamps = []) {
  scene.background = new THREE.Color(0xa9c9e6);
  scene.add(skyDome());
  scene.environment = buildEnvironment(renderer, lamps, { sky: LOOK.sky, lamp: 40, skylights: findSkylights(scene) });
  scene.environmentIntensity = HIGH ? LOOK.env : LOOK.env * 1.25;
  const fog = new THREE.FogExp2(0xa08c7c, LOOK.fogIn); scene.fog = fog;
  // meia-luz quente: céu azulado por cima, rebatimento marrom-acinzentado (pó de minério) por baixo
  const hemi = new THREE.HemisphereLight(0xd6e2ee, 0x56443a, HIGH ? LOOK.hemi : LOOK.hemi * 2.5); scene.add(hemi);
  // sol: alto, vindo da frente aberta (z = D) e um pouco de lado — entra pelas aberturas e faz faixas de luz no piso
  const sun = new THREE.DirectionalLight(0xfff0dc, LOOK.sun);
  sun.position.set(B.W / 2 - 22, 42, B.D + 46); sun.target.position.set(B.W / 2, 0, B.D / 2);
  sun.castShadow = true; sun.shadow.mapSize.set(HIGH ? 4096 : 2048, HIGH ? 4096 : 2048);
  const c = sun.shadow.camera; c.left = -44; c.right = 44; c.top = 34; c.bottom = -34; c.near = 10; c.far = 160; c.updateProjectionMatrix();
  sun.shadow.bias = HIGH ? -.0003 : -.0006; sun.shadow.normalBias = .03;
  if (HIGH) { sun.shadow.radius = 5; sun.shadow.blurSamples = 12; }
  scene.add(sun, sun.target);
  // luminárias: spots abertos apontando para baixo (não acendem o teto) — britagem, sob o piso L2 e algumas high-bay
  lamps.forEach((p, i) => {
    const crusher = p.x > B.screenEnd + 2 && p.y < 12, underL2 = p.y < LV.L2, l2 = p.kind === 'l2';
    if (!(crusher || underL2 || l2 || i % 4 === 0)) return;
    if (!HIGH && !crusher && !l2) return;
    const l = new THREE.SpotLight(0xffdcb4, l2 ? LOOK.lampL2 : LOOK.lamp * (crusher ? 1.3 : 1), 0, l2 ? 1.05 : 1.25, .9, 2);
    l.position.set(p.x, p.y - .05, p.z); l.target.position.set(p.x, 0, p.z); scene.add(l, l.target);
  });
  buildLightFX(scene, sun, lamps);
  // anisotropia máxima em todas as texturas (piso/chapas não borram em ângulo rasante)
  const maxA = renderer.capabilities.getMaxAnisotropy();
  scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'roughnessMap', 'normalMap', 'bumpMap', 'alphaMap', 'metalnessMap']) if (m[k]) m[k].anisotropy = maxA; });
  // peças finas (chapas/planos) entram no mapa de sombra pelas duas faces
  scene.traverse((o) => { if (o.isMesh && o.castShadow) for (const m of [].concat(o.material)) if (m && m.shadowSide == null) m.shadowSide = THREE.DoubleSide; });
  // por quadro: névoa mais densa dentro do prédio; sombras atualizadas a cada ~0,4 s (peças móveis são pequenas)
  let lastSh = 0;
  const t0 = performance.now();
  scene.onBeforeRender = (r, s, cam) => {
    const p = cam.position, inside = p.x > -1 && p.x < B.W + 1 && p.z > -1 && p.z < B.D + 1 && p.y < B.H;
    fog.density = inside ? LOOK.fogIn : LOOK.fogOut;
    // feixes e poeira só com o prédio fechado (de fora a cobertura some e o feixe ficaria solto no ar)
    const tt = (performance.now() - t0) / 1000;
    if (FX.shafts) { FX.shafts.visible = inside; FX.mat.uniforms.uT.value = tt; FX.mat.uniforms.uI.value = LOOK.shaft; }
    if (FX.motes) { FX.motes.visible = inside; FX.motes.material.uniforms.uT.value = tt; FX.motes.material.uniforms.uScale.value = r.getDrawingBufferSize(_v2).y / (2 * Math.tan(THREE.MathUtils.degToRad((cam.fov || 60) / 2))); }
    const now = performance.now(); if (now - lastSh > 400) { lastSh = now; r.shadowMap.needsUpdate = true; }
  };
  window.__look = { LOOK, sun, hemi, scene, fog, FX };
  return { sun, hemi };
}


// ---- acúmulo temporal: média progressiva dos quadros com a câmera parada (HDR, antes do bloom/tone mapping)
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
class AccumPass extends Pass {
  constructor() {
    super(); const o = { type: THREE.HalfFloatType, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(1, 1, o); this.b = new THREE.WebGLRenderTarget(1, 1, o); this.n = 0; this.minAlpha = .45;   // peso alto do quadro novo: objetos em movimento (minério, correias) não deixam rastro
    this.blend = new THREE.ShaderMaterial({ uniforms: { tNew: { value: null }, tHist: { value: null }, alpha: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D tNew; uniform sampler2D tHist; uniform float alpha; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(tHist, vUv), texture2D(tNew, vUv), alpha); }' });
    this.copy = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }' });
    this.q = new FullScreenQuad(null);
  }
  reset() { this.n = 0; }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); this.n = 0; }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.blend.uniforms; u.tNew.value = readBuffer.texture; u.tHist.value = this.a.texture; u.alpha.value = this.n === 0 ? 1 : Math.max(this.minAlpha, 1 / (this.n + 1));
    this.q.material = this.blend; renderer.setRenderTarget(this.b); this.q.render(renderer);
    this.copy.uniforms.t.value = this.b.texture; this.q.material = this.copy; renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.q.render(renderer);
    const t = this.a; this.a = this.b; this.b = t; this.n++;
  }
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

// Compositor com resolução dinâmica (igual ao lab): calcula em escala 'rs' e amplia com nitidez.
export function createComposer(renderer, scene, camera) {
  if (!HIGH) return null;
  const dpr = renderer.getPixelRatio();
  const size = new THREE.Vector2(innerWidth, innerHeight);
  const rt = new THREE.WebGLRenderTarget(size.x * dpr, size.y * dpr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, size.x, size.y, undefined, LOOK.ao, { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  const baseSetSize = gtao.setSize.bind(gtao);
  gtao.setSize = (w, h) => baseSetSize(Math.max(2, Math.round(w * LOOK.aoScale)), Math.max(2, Math.round(h * LOOK.aoScale)));
  gtao.blendIntensity = 1.0; gtao.normalMaterial.side = THREE.DoubleSide;
  { const r0 = gtao.render.bind(gtao); gtao.render = (...a) => { const g = FX.group, v = g && g.visible; if (g) g.visible = false; r0(...a); if (g) g.visible = v; }; }   // feixes/halos fora da oclusão
  composer.addPass(gtao);
  const TAA = Q.get('taa') === '1',   // desligado por padrão: o acúmulo deixava rastro no minério e nas correias em movimento (MSAA 4x já suaviza as bordas)
   accum = TAA ? new AccumPass() : null; if (accum) composer.addPass(accum);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), ...LOOK.bloom); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const phone = new ShaderPass(PhoneShader);
  phone.uniforms.sharpen.value = .14; phone.uniforms.vignette.value = .3; phone.uniforms.grain.value = 0; /* sem granulado (aparecia como pontilhado fixo) */ phone.uniforms.chroma.value = .0007;
  phone.uniforms.wb.value.set(1.03, 1.0, .95); phone.uniforms.contrast.value = 1.05; phone.uniforms.saturation.value = .92; phone.uniforms.distortion.value = .03;
  composer.addPass(phone);
  const up = new ShaderPass(UpscaleShader); up.uniforms.srcSize.value = new THREE.Vector2(size.x * dpr, size.y * dpr); composer.addPass(up);
  const forced = Q.has('rs') ? Math.min(1, Math.max(.4, +Q.get('rs') || 1)) : null;
  let rs = forced ?? 1.0; const RS_MIN = .75;   // abaixo disso a ampliação deixa a imagem granulada/pixelada
  const fps = { n: 0, t: 0, last: performance.now(), next: performance.now() + 2500 };
  function apply() {
    composer.setPixelRatio(dpr * rs); composer.setSize(size.x, size.y);
    const sw = Math.round(size.x * dpr * rs), sh = Math.round(size.y * dpr * rs);
    phone.uniforms.resolution.value.set(sw, sh); up.uniforms.srcSize.value.set(sw, sh); up.uniforms.sharp.value = .08 + (1 - rs) * .6;
  }
  function adapt() {
    const now = performance.now(), dt = now - fps.last; fps.last = now;
    if (forced != null || document.hidden || dt > 250) return;          // ignora pausas e o modo sem GPU
    fps.n++; fps.t += dt; if (now < fps.next) return;
    const avg = 1000 / (fps.t / fps.n); fps.n = 0; fps.t = 0; fps.next = now + 2000;
    // histerese: só reduz após 2 janelas seguidas abaixo de 36 fps e só aumenta após 4 janelas acima de 58 fps,
    // com no mínimo 8 s entre mudanças — evita a resolução "pulsar" (imagem tremendo)
    fps.lo = avg < 30 ? (fps.lo || 0) + 1 : 0; fps.hi = avg > 58 ? (fps.hi || 0) + 1 : 0;
    let nr = rs; if (fps.lo >= 2) nr = Math.max(RS_MIN, rs - .1); else if (fps.hi >= 4 && rs < 1) nr = Math.min(1, rs + .05);
    if (Math.abs(nr - rs) > .001 && now - (fps.chg || 0) > 8000) { rs = nr; fps.chg = now; fps.lo = fps.hi = 0; apply(); }
    window.__rs = { scale: +rs.toFixed(2), fps: Math.round(avg) };
  }
  const clock = new THREE.Clock(), lastM = new THREE.Matrix4(); let lastFov = 0, lastAsp = 0, still = 0;
  apply();
  return {
    composer, passes: { gtao, bloom, phone, up, accum },
    setSize(w, h) { size.set(w, h); apply(); },
    render() {
      phone.uniforms.time.value = 0;   // granulado fixo: ruído animado cintilava (efeito de imagem tremendo)
      // câmera parada → jitter subpixel e acúmulo; mexeu → recomeça (quadro normal, sem rastro)
      let jit = false;
      if (accum) {
        camera.updateMatrixWorld();
        const a = camera.matrixWorld.elements, b = lastM.elements; let dm = 0; for (let i = 0; i < 16; i++) dm = Math.max(dm, Math.abs(a[i] - b[i]));
        const moved = dm > 2e-5 || Math.abs(camera.fov - lastFov) > 1e-4 || Math.abs(camera.aspect - lastAsp) > 1e-4;
        lastM.copy(camera.matrixWorld); lastFov = camera.fov; lastAsp = camera.aspect;
        if (moved) { accum.reset(); still = 0; }
        else if (++still > 8) { const k = (accum.n % 32) + 1, sw = Math.round(size.x * dpr * rs), sh = Math.round(size.y * dpr * rs); camera.setViewOffset(sw, sh, halton(k, 2) - .5, halton(k, 3) - .5, sw, sh); jit = true; }
      }
      composer.render();
      if (jit) camera.clearViewOffset();
      adapt();
    },
  };
}
