// Ambiente de reflexão (PMREM) do prédio do setor 3 + projeção em caixa (parallax-corrected cubemap).
// Portado do gêmeo do Laboratório de Eletricidade (render_env.js) e adaptado: a "sala-proxy" é o prédio
// B.W × B.H × B.D (64 × 24 × 24 m) com telhas escuras por dentro, piso empoeirado, luminárias de galpão e as
// grandes ABERTURAS laterais por onde entra a luz do dia (céu claro, vegetação e terreno lá fora).
import * as THREE from 'three';
import { B, LV } from './layout.js?v=20261026180016';

let patched = false;
export const BOX = {
  min: { value: new THREE.Vector3(0, 0, 0) },
  max: { value: new THREE.Vector3(B.W, B.H, B.D) },
  probe: { value: new THREE.Vector3(B.W / 2, 8, B.D / 2) },
  directSpec: { value: 0.55 },
};
// LUZ NATURAL DAS ABERTURAS (termo barato no shader, substitui as RectAreaLight): cada vão do fechamento é um retângulo
// emissor (céu / pátio iluminado pelo sol); o fator de forma (integral de contorno, mesma aproximação LTC das luzes de área
// do three) dá o gradiente fotográfico — claro junto às aberturas, caindo com a distância para o miolo do galpão — e o
// ambiente difuso PMREM (igual em todo ponto) é reduzido no interior. Float32Array: não é clonado pelo three, então o
// valor muda por quadro. x = intensidade, y = liga (câmera dentro do prédio), z = fator do ambiente difuso no interior.
export const OPEN = { value: new Float32Array([0, 0, 1, 0]) };
const f = (v) => (+v).toFixed(3);
function openingGLSL() {
  const W = B.W, D = B.D, oH = LV.L2 + 2;
  // vãos: [plano (eixo e valor), faixa horizontal (u0,u1), altura (y0,y1), peso]. Cada vão é cortado na altura do ponto
  // sombreado: o que fica ACIMA dele mostra céu (frio, claro); o que fica ABAIXO mostra o pátio de minério ao sol (quente,
  // escuro) — assim a face de baixo de um piso não "acende" com o céu, como numa foto real.
  const R = [['z', D, 0, W, 0, oH, 1], ['x', W, 0, D, 0, 6, .95], ['x', 0, 0, D, 0, 6, .9], ['z', 0, 0, W, 0, 4, .85]];
  const calls = R.map(([ax, v, u0, u1, y0, y1, k]) => `e += ${f(k)} * twinOpening${ax.toUpperCase()}( p, n, ${f(v)}, ${f(u0)}, ${f(u1)}, ${f(y0)}, ${f(y1)} );`).join('\n    ');
  return /* glsl */`
  float twinRectFF( vec3 p, vec3 n, vec3 a, vec3 b, vec3 c, vec3 d ) {
    vec3 v0 = normalize( a - p ), v1 = normalize( b - p ), v2 = normalize( c - p ), v3 = normalize( d - p );
    vec3 F = LTC_EdgeVectorFormFactor( v0, v1 ) + LTC_EdgeVectorFormFactor( v1, v2 ) + LTC_EdgeVectorFormFactor( v2, v3 ) + LTC_EdgeVectorFormFactor( v3, v0 );
    F *= dot( F, 0.25 * ( a + b + c + d ) - p ) < 0.0 ? -1.0 : 1.0;
    float l = length( F ); return max( ( l * l + dot( F, n ) ) / ( l + 1.0 ), 0.0 );
  }
  const vec3 twSky = vec3( 0.80, 0.88, 0.97 ), twGnd = vec3( 0.40, 0.29, 0.21 );
  vec3 twinOpeningZ( vec3 p, vec3 n, float z, float x0, float x1, float y0, float y1 ) {
    float ys = clamp( p.y, y0, y1 ); vec3 e = vec3( 0.0 );
    if ( ys < y1 - 0.01 ) e += twSky * twinRectFF( p, n, vec3( x0, ys, z ), vec3( x1, ys, z ), vec3( x1, y1, z ), vec3( x0, y1, z ) );
    if ( ys > y0 + 0.01 ) e += twGnd * twinRectFF( p, n, vec3( x0, y0, z ), vec3( x1, y0, z ), vec3( x1, ys, z ), vec3( x0, ys, z ) );
    return e;
  }
  vec3 twinOpeningX( vec3 p, vec3 n, float x, float z0, float z1, float y0, float y1 ) {
    float ys = clamp( p.y, y0, y1 ); vec3 e = vec3( 0.0 );
    if ( ys < y1 - 0.01 ) e += twSky * twinRectFF( p, n, vec3( x, ys, z0 ), vec3( x, ys, z1 ), vec3( x, y1, z1 ), vec3( x, y1, z0 ) );
    if ( ys > y0 + 0.01 ) e += twGnd * twinRectFF( p, n, vec3( x, y0, z0 ), vec3( x, y0, z1 ), vec3( x, ys, z1 ), vec3( x, ys, z0 ) );
    return e;
  }
  float twinInside( vec3 p ) { vec3 q = min( p, vec3(${f(W)}, ${f(B.H)}, ${f(D)}) - p ); return smoothstep( 0.05, 0.5, min( min( q.x, q.y ), q.z ) ); }
  vec3 twinOpeningIrr( vec3 p, vec3 n ) {
    vec3 e = vec3( 0.0 );
    ${calls}
    return e;
  }
`;
}
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
  C.lights_physical_pars_fragment = 'uniform float uDirectSpec;\nuniform vec4 uOpen;\n' + C.lights_physical_pars_fragment + openingGLSL();
  C.lights_fragment_maps += /* glsl */`
#if defined( RE_IndirectDiffuse ) && defined( STANDARD )
  if ( uOpen.y > 0.5 ) {
    vec3 twP = cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz;
    float twM = twinInside( twP );
    if ( twM > 0.0 ) {
      irradiance += twM * uOpen.x * twinOpeningIrr( twP, inverseTransformDirection( geometryNormal, viewMatrix ) );
      iblIrradiance *= mix( 1.0, uOpen.z, twM );
    }
  }
#endif
`;
  for (const k of ['standard', 'physical']) {
    const u = THREE.ShaderLib[k].uniforms;
    u.uBoxMin = BOX.min; u.uBoxMax = BOX.max; u.uBoxProbe = BOX.probe; u.uDirectSpec = BOX.directSpec; u.uOpen = OPEN;
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
  plane(W, D, mat(.085 * k, .062 * k, .05 * k), [W / 2, 0, D / 2], [-Math.PI / 2, 0, 0]);
  plane(W, D, mat(.04 * k, .031 * k, .026 * k), [W / 2, H, D / 2], [Math.PI / 2, 0, 0]);
  const wallM = mat(.05 * k, .037 * k, .03 * k);
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
  // claraboias (telhas translúcidas) e as manchas de sol que elas fazem no piso +14 e na parede do fundo
  const skM = mat(sky * .55, sky * .57, sky * .58), spotM = mat(.55, .48, .4);
  for (const r of opt.skylights || []) {
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, w = Math.abs(r.x1 - r.x0), d = Math.abs(r.z1 - r.z0);
    plane(w, d, skM, [cx, H - .02, cz], [Math.PI / 2, 0, 0]);
    if (cz > D / 2) plane(w * 1.2, d * .9, spotM, [cx + 5.5, LV.L2 + .02, Math.max(.5, cz - 15)], [-Math.PI / 2, 0, 0]);
    else plane(w * 1.2, d * 1.3, spotM, [cx + 2.5, H - 4, .04], [0, 0, 0]);
  }
  // luminárias de galpão: discos muito brilhantes (alimentam reflexos alongados em chapas e poças)
  const lm = mat(opt.lamp ?? 40, (opt.lamp ?? 40) * .95, (opt.lamp ?? 40) * .85);
  for (const p of lamps) { const d = new THREE.Mesh(new THREE.CircleGeometry(.5, 12), lm); d.position.set(p.x, p.y + .25, p.z); d.rotation.x = Math.PI / 2; g.add(d); }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, opt.sigma ?? 0.04, 0.1, 200);
  pm.dispose();
  sc.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  return rt.texture;
}
