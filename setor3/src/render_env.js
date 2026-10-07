// Ambiente de reflexão (PMREM) do prédio do setor 3 + projeção em caixa (parallax-corrected cubemap).
// Portado do gêmeo do Laboratório de Eletricidade (render_env.js) e adaptado: a "sala-proxy" é o prédio
// B.W × B.H × B.D (64 × 24 × 24 m) com telhas escuras por dentro, piso empoeirado, luminárias de galpão e as
// grandes ABERTURAS laterais por onde entra a luz do dia (céu claro, vegetação e terreno lá fora).
import * as THREE from 'three';
import { B, LV } from './layout.js?v=20261007202849';

let patched = false;
export const BOX = {
  min: { value: new THREE.Vector3(0, 0, 0) },
  max: { value: new THREE.Vector3(B.W, B.H, B.D) },
  probe: { value: new THREE.Vector3(B.W / 2, 8, B.D / 2) },
  directSpec: { value: 0.55 },
};
// Instala uma vez, antes da primeira compilação de shader (limites da caixa = uniforms globais compartilhados).
export function installBoxProjection() {
  if (patched) return; patched = true;
  const C = THREE.ShaderChunk;
  const helper = /* glsl */`
    uniform vec3 uBoxMin; uniform vec3 uBoxMax; uniform vec3 uBoxProbe;
    vec3 twinWorldPos() { return cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz; }
    vec3 twinBoxProject( vec3 v, vec3 wp ) {
      vec3 p = clamp( wp, uBoxMin + 0.01, uBoxMax - 0.01 );
      vec3 s = vec3( v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0, v.z >= 0.0 ? 1.0 : -1.0 );
      vec3 vv = s * max( abs( v ), vec3( 1e-4 ) );
      vec3 tmax = ( uBoxMax - p ) / vv; vec3 tmin = ( uBoxMin - p ) / vv;
      vec3 t = max( tmax, tmin );
      float d = min( min( t.x, t.y ), t.z );
      return normalize( p + vv * d - uBoxProbe );
    }
  `;
  let s = C.envmap_physical_pars_fragment;
  s = s.replace('#ifdef USE_ENVMAP', '#ifdef USE_ENVMAP\n' + helper);
  s = s.replace(
    'vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );',
    'vec3 bn = normalize( mix( worldNormal, twinBoxProject( worldNormal, twinWorldPos() ), 0.5 ) );\n\t\t\tvec4 envMapColor = textureCubeUV( envMap, envMapRotation * bn, 1.0 );');
  s = s.replace(
    'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\t\tvec4 envMapColor',
    'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\t\treflectVec = twinBoxProject( reflectVec, twinWorldPos() );\n\t\t\tvec4 envMapColor');
  C.envmap_physical_pars_fragment = s;
  // especular DIRETO atenuado (o sol e as lâmpadas pontuais fariam pontinhos duros); o brilho vem do ambiente.
  C.lights_physical_pars_fragment = C.lights_physical_pars_fragment.replace(
    'reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );',
    'reflectedLight.directSpecular += uDirectSpec * irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );');
  C.lights_physical_pars_fragment = 'uniform float uDirectSpec;\n' + C.lights_physical_pars_fragment;
  for (const k of ['standard', 'physical']) {
    const u = THREE.ShaderLib[k].uniforms;
    u.uBoxMin = BOX.min; u.uBoxMax = BOX.max; u.uBoxProbe = BOX.probe; u.uDirectSpec = BOX.directSpec;
  }
}

// Textura da abertura vista de dentro: céu claro em cima, morro com vegetação e terreno de minério embaixo.
function openingTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#9fc3e6'); g.addColorStop(.55, '#e4eef5'); g.addColorStop(.62, '#6f8a52'); g.addColorStop(.78, '#4f6a3a'); g.addColorStop(.8, '#8a6a52'); g.addColorStop(1, '#6e4a36');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// lamps: posições das luminárias (Vector3); sky: radiância do céu nas aberturas (linear)
export function buildEnvironment(renderer, lamps = [], opt = {}) {
  const W = B.W, D = B.D, H = B.H;
  const probe = BOX.probe.value.clone();
  const sc = new THREE.Scene();
  const g = new THREE.Group(); g.position.copy(probe).multiplyScalar(-1); sc.add(g);
  const mat = (r, gg, b, map) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r, gg, b), side: THREE.DoubleSide, map: map || null });
  const plane = (w, h, m, pos, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.set(...rot); g.add(p); return p; };
  const k = opt.bounce ?? 1, sky = opt.sky ?? 3.2;
  // superfícies principais (radiância média, linear): piso de concreto com pó de minério, telha marrom-ferrugem escura
  plane(W, D, mat(.085 * k, .055 * k, .038 * k), [W / 2, 0, D / 2], [-Math.PI / 2, 0, 0]);
  plane(W, D, mat(.028 * k, .02 * k, .016 * k), [W / 2, H, D / 2], [Math.PI / 2, 0, 0]);
  const wallM = mat(.05 * k, .034 * k, .025 * k);
  plane(D, H, wallM, [0, H / 2, D / 2], [0, Math.PI / 2, 0]);
  plane(D, H, wallM, [W, H / 2, D / 2], [0, -Math.PI / 2, 0]);
  plane(W, H, wallM, [W / 2, H / 2, 0], [0, 0, 0]);
  plane(W, H, wallM, [W / 2, H / 2, D], [0, Math.PI, 0]);
  // pisos intermediários (L1 e L2) como faixas escuras horizontais: dão o "teto baixo" nos reflexos
  plane(B.screenEnd, D, mat(.06 * k, .042 * k, .03 * k), [B.screenEnd / 2, LV.L1, D / 2], [Math.PI / 2, 0, 0]);
  // ABERTURAS (luz do dia): frente baixa (z = D, até L2 + 2), fundo baixo (z = 0, até 4 m), laterais (até 6 m)
  const om = mat(sky, sky, sky, openingTex());
  const oH = LV.L2 + 2;
  plane(W, oH, om, [W / 2, oH / 2, D - .05], [0, Math.PI, 0]);
  plane(W, 4, om, [W / 2, 2, .05], [0, 0, 0]);
  plane(D, 6, om, [.05, 3, D / 2], [0, Math.PI / 2, 0]);
  plane(D, 6, om, [W - .05, 3, D / 2], [0, -Math.PI / 2, 0]);
  // luminárias de galpão: discos muito brilhantes (alimentam reflexos alongados em chapas e poças)
  const lm = mat(opt.lamp ?? 40, (opt.lamp ?? 40) * .95, (opt.lamp ?? 40) * .85);
  for (const p of lamps) { const d = new THREE.Mesh(new THREE.CircleGeometry(.5, 12), lm); d.position.set(p.x, p.y + .25, p.z); d.rotation.x = Math.PI / 2; g.add(d); }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, opt.sigma ?? 0.04, 0.1, 200);
  pm.dispose();
  sc.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  return rt.texture;
}
