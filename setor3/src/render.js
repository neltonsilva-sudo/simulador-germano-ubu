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
import { B, LV } from './layout.js?v=20261003175719';
import { installBoxProjection, buildEnvironment } from './render_env.js?v=20261003175719';
import { PhoneShader } from './render_post.js?v=20261003175719';
import { UpscaleShader } from './render_upscale.js?v=20261003175719';

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
  fogIn: .010,        // névoa de pó dentro do prédio (FogExp2)
  fogOut: .0016,
  aoScale: .6,
  bloom: [.16, .25, 2.6],
  ao: { radius: .9, distanceExponent: 1.6, thickness: .6, scale: 1.15, samples: 12, distanceFallOff: 1.0 },
};
for (const kv of (Q.get('lk') || '').split(',').filter(Boolean)) { const [k, v] = kv.split(':'); if (k.startsWith('ao.')) LOOK.ao[k.slice(3)] = +v; else if (k in LOOK && typeof LOOK[k] === 'number') LOOK[k] = +v; }

installBoxProjection();

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
  hills(250, 46, '#7f949c', 0); hills(256, 30, '#4f6b3c', 7); hills(258, 12, '#3f5a30', 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.position.set(B.W / 2, -20, B.D / 2); m.renderOrder = -10; m.frustumCulled = false; m.name = 'sky';
  // MeshBasic: ganho > 1 deixa o céu claro como na foto (estoura levemente depois do tone mapping)
  m.material.color.setScalar(1.6);
  return m;
}

export function buildLighting(scene, renderer, lamps = []) {
  scene.background = new THREE.Color(0xa9c9e6);
  scene.add(skyDome());
  scene.environment = buildEnvironment(renderer, lamps, { sky: LOOK.sky, lamp: 40 });
  scene.environmentIntensity = HIGH ? LOOK.env : LOOK.env * 1.25;
  const fog = new THREE.FogExp2(0xa8927e, LOOK.fogIn); scene.fog = fog;
  const hemi = new THREE.HemisphereLight(0xcfe0f0, 0x5a3a28, HIGH ? LOOK.hemi : LOOK.hemi * 2.5); scene.add(hemi);
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
    const crusher = p.x > B.screenEnd + 2 && p.y < 12, underL2 = p.y < LV.L2;
    if (!(crusher || underL2 || i % 4 === 0)) return;
    if (!HIGH && !crusher) return;
    const l = new THREE.SpotLight(0xffe6c4, LOOK.lamp * (crusher ? 1.3 : 1), 0, 1.25, .9, 2);
    l.position.set(p.x, p.y - .05, p.z); l.target.position.set(p.x, 0, p.z); scene.add(l, l.target);
  });
  // anisotropia máxima em todas as texturas (piso/chapas não borram em ângulo rasante)
  const maxA = renderer.capabilities.getMaxAnisotropy();
  scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'roughnessMap', 'normalMap', 'bumpMap', 'alphaMap', 'metalnessMap']) if (m[k]) m[k].anisotropy = maxA; });
  // peças finas (chapas/planos) entram no mapa de sombra pelas duas faces
  scene.traverse((o) => { if (o.isMesh && o.castShadow) for (const m of [].concat(o.material)) if (m && m.shadowSide == null) m.shadowSide = THREE.DoubleSide; });
  // por quadro: névoa mais densa dentro do prédio; sombras atualizadas a cada ~0,4 s (peças móveis são pequenas)
  let lastSh = 0;
  scene.onBeforeRender = (r, s, cam) => {
    const p = cam.position, inside = p.x > -1 && p.x < B.W + 1 && p.z > -1 && p.z < B.D + 1 && p.y < B.H;
    fog.density = inside ? LOOK.fogIn : LOOK.fogOut;
    const now = performance.now(); if (now - lastSh > 400) { lastSh = now; r.shadowMap.needsUpdate = true; }
  };
  window.__look = { LOOK, sun, hemi, scene, fog };
  return { sun, hemi };
}


// ---- acúmulo temporal: média progressiva dos quadros com a câmera parada (HDR, antes do bloom/tone mapping)
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
class AccumPass extends Pass {
  constructor() {
    super(); const o = { type: THREE.HalfFloatType, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(1, 1, o); this.b = new THREE.WebGLRenderTarget(1, 1, o); this.n = 0; this.minAlpha = .08;
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
  composer.addPass(gtao);
  const TAA = Q.get('taa') !== '0', accum = TAA ? new AccumPass() : null; if (accum) composer.addPass(accum);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), ...LOOK.bloom); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const phone = new ShaderPass(PhoneShader);
  phone.uniforms.sharpen.value = .32; phone.uniforms.vignette.value = .3; phone.uniforms.grain.value = .014; phone.uniforms.chroma.value = .0007;
  phone.uniforms.wb.value.set(1.03, 1.0, .95); phone.uniforms.contrast.value = 1.05; phone.uniforms.saturation.value = .92; phone.uniforms.distortion.value = .03;
  composer.addPass(phone);
  const up = new ShaderPass(UpscaleShader); up.uniforms.srcSize.value = new THREE.Vector2(size.x * dpr, size.y * dpr); composer.addPass(up);
  const forced = Q.has('rs') ? Math.min(1, Math.max(.4, +Q.get('rs') || 1)) : null;
  let rs = forced ?? 1.0; const RS_MIN = .5;
  const fps = { n: 0, t: 0, last: performance.now(), next: performance.now() + 2500 };
  function apply() {
    composer.setPixelRatio(dpr * rs); composer.setSize(size.x, size.y);
    const sw = Math.round(size.x * dpr * rs), sh = Math.round(size.y * dpr * rs);
    phone.uniforms.resolution.value.set(sw, sh); up.uniforms.srcSize.value.set(sw, sh); up.uniforms.sharp.value = .18 + (1 - rs) * .9;
  }
  function adapt() {
    const now = performance.now(), dt = now - fps.last; fps.last = now;
    if (forced != null || document.hidden || dt > 250) return;          // ignora pausas e o modo sem GPU
    fps.n++; fps.t += dt; if (now < fps.next) return;
    const avg = 1000 / (fps.t / fps.n); fps.n = 0; fps.t = 0; fps.next = now + 2000;
    let nr = rs; if (avg < 42) nr = Math.max(RS_MIN, rs - .1); else if (avg > 57 && rs < 1) nr = Math.min(1, rs + .05);
    if (Math.abs(nr - rs) > .001) { rs = nr; apply(); }
    window.__rs = { scale: +rs.toFixed(2), fps: Math.round(avg) };
  }
  const clock = new THREE.Clock(), lastM = new THREE.Matrix4(); let lastFov = 0, lastAsp = 0;
  apply();
  return {
    composer, passes: { gtao, bloom, phone, up, accum },
    setSize(w, h) { size.set(w, h); apply(); },
    render() {
      phone.uniforms.time.value = clock.getElapsedTime();
      // câmera parada → jitter subpixel e acúmulo; mexeu → recomeça (quadro normal, sem rastro)
      let jit = false;
      if (accum) {
        camera.updateMatrixWorld();
        const moved = !camera.matrixWorld.equals(lastM) || camera.fov !== lastFov || camera.aspect !== lastAsp;
        lastM.copy(camera.matrixWorld); lastFov = camera.fov; lastAsp = camera.aspect;
        if (moved) accum.reset();
        else { const k = (accum.n % 32) + 1, sw = Math.round(size.x * dpr * rs), sh = Math.round(size.y * dpr * rs); camera.setViewOffset(sw, sh, halton(k, 2) - .5, halton(k, 3) - .5, sw, sh); jit = true; }
      }
      composer.render();
      if (jit) camera.clearViewOffset();
      adapt();
    },
  };
}
