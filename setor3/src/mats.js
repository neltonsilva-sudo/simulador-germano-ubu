// Materiais procedurais (texturas em canvas) com desgaste e sujeira — modelo das texturas do gêmeo do Lab. de Eletricidade
// (room_tex/benches_tex/props_tex): aço pintado gasto, pó de minério marrom-avermelhado, concreto manchado, telhas
// trapezoidais, chapas parafusadas, poliuretano, borracha, proteções amarelas perfuradas, minério.
// Shader "grime" (três ≥ r152): mapeamento triplanar em coordenadas do mundo (escala constante em vigas de 24 m — fim
// do aspecto de "madeira"), pó acumulado nas faces voltadas para cima, escorridos nas faces verticais e bordas gastas
// e chanfradas (normal inclinada + tinta mais clara nas arestas das caixas). Sem o shader (simulador r147) o material
// continua funcionando só com as texturas.
import * as THREE from 'three';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const SHADER_OK = parseInt(THREE.REVISION, 10) >= 152;

function canvasTex(size, draw, { repeat = [1, 1], srgb = true, h = size } = {}) {
  const c = document.createElement('canvas'); c.width = size; c.height = h;
  const x = c.getContext('2d'); draw(x, size, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  return t;
}
function blotches(x, s, n, rMin, rMax, colorFn, h = s) {
  for (let i = 0; i < n; i++) {
    const r = rMin + rnd() * (rMax - rMin), cx = rnd() * s, cy = rnd() * h;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = colorFn(); g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)'));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
}
// manchas irregulares (polígono com raio variável) — ferrugem, lascas, lama
function splat(x, cx, cy, r, col) { const n = 7 + (rnd() * 6 | 0); x.fillStyle = col; x.beginPath(); for (let k = 0; k <= n; k++) { const a = k / n * 6.283, q = r * (.45 + rnd() * .75); k ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + q, cy); } x.fill(); }
function speckle(x, s, n, a, col, h = s) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${col},${a * rnd()})`; const w = 1 + rnd() * 2; x.fillRect(rnd() * s, rnd() * h, w, w); } }
// escorridos verticais finos (pó de minério lavado pela água / óleo)
function drips(x, s, n, col, aMax = .35, h = s) {
  for (let i = 0; i < n; i++) {
    const px = rnd() * s, y0 = rnd() * h * .7, len = h * (.05 + rnd() * .35), w = .6 + rnd() * 2.6;
    const g = x.createLinearGradient(0, y0, 0, y0 + len); g.addColorStop(0, `rgba(${col},${.08 + rnd() * aMax})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(px, y0, w, len);
  }
}
function scratches(x, s, n, col, h = s) { for (let i = 0; i < n; i++) { const px = rnd() * s, py = rnd() * h, L = 4 + rnd() * s * .05, a = rnd() * 6.28; x.strokeStyle = `rgba(${col},${.15 + rnd() * .35})`; x.lineWidth = .5 + rnd(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); } }
// grão por pixel (variação fina — o que tira o "chapado")
function grain(x, s, amp, h = s) { const id = x.getImageData(0, 0, s, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * amp; d[i] += n; d[i + 1] += n * .95; d[i + 2] += n * .9; } x.putImageData(id, 0, 0); }

// mapa de normais a partir de um canvas de altura (cinza)
function normalFromHeight(hc, strength = 2, repeat = [1, 1]) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const id = x.createImageData(w, h), d = id.data;
  const H = (i, j) => src[(((j + h) % h) * w + ((i + w) % w)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * strength, dy = (H(i, j + 1) - H(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    d[k] = (-dx / l * .5 + .5) * 255; d[k + 1] = (dy / l * .5 + .5) * 255; d[k + 2] = (1 / l * .5 + .5) * 255; d[k + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
}

// aço pintado gasto: tom de demão, pó de minério, ferrugem com halo, escorridos, arranhões, grão
function paintTex(size, o) {
  return canvasTex(size, (x, s) => {
    x.fillStyle = o.base; x.fillRect(0, 0, s, s);
    blotches(x, s, 50, s * .04, s * .3, () => `rgba(255,250,240,${.02 + rnd() * .06})`);
    blotches(x, s, 50, s * .04, s * .3, () => `rgba(0,0,0,${.03 + rnd() * .08})`);
    blotches(x, s, 40 * o.dust, s * .03, s * .22, () => `rgba(${o.dustRGB || '118,62,36'},${.08 + rnd() * .22})`);
    for (let i = 0; i < 90 * o.rust; i++) { const cx = rnd() * s, cy = rnd() * s, r = s * (.004 + rnd() * rnd() * .03); splat(x, cx, cy, r * 1.6, 'rgba(150,80,40,.25)'); splat(x, cx, cy, r, `rgba(${70 + rnd() * 30 | 0},${36 + rnd() * 14 | 0},${22 + rnd() * 8 | 0},${.5 + rnd() * .4})`); }
    drips(x, s, 160 * o.drip, o.dripRGB || '92,48,28', .3);
    scratches(x, s, 160 * (o.scratch ?? 1), o.scratchRGB || '200,190,175');
    speckle(x, s, s * 8, .3, '40,24,16'); speckle(x, s, s * 3, .2, '220,210,190');
    grain(x, s, o.grain ?? 10);
  });
}

// ---------- shader de sujeira/pó/bordas (onBeforeCompile) ----------
const G_HEAD = /* glsl */`
uniform float uTri; uniform float uDust; uniform float uEdge; uniform float uGrime; uniform vec3 uDustCol;
float gHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float gNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(gHash(i), gHash(i + vec2(1., 0.)), f.x), mix(gHash(i + vec2(0., 1.)), gHash(i + vec2(1., 1.)), f.x), f.y); }
float gFbm(vec2 p){ return .5 * gNoise(p) + .25 * gNoise(p * 2.07) + .125 * gNoise(p * 4.13) + .0625 * gNoise(p * 8.31); }
`;
const G_MAP = (tri) => /* glsl */`
vec3 gP = cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz;
vec3 gN = normalize( ( vec4( vNormal, 0.0 ) * viewMatrix ).xyz );
#ifdef DOUBLE_SIDED
  gN *= gl_FrontFacing ? 1.0 : -1.0;
#endif
#ifdef USE_MAP
` + (tri ? `
  vec3 gw = pow( abs( gN ), vec3( 4.0 ) ); gw /= ( gw.x + gw.y + gw.z );
  vec4 sampledDiffuseColor = texture2D( map, gP.zy * uTri ) * gw.x + texture2D( map, gP.xz * uTri ) * gw.y + texture2D( map, gP.xy * uTri ) * gw.z;
` : `
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
`) + `
  diffuseColor *= sampledDiffuseColor;
#endif
`;
const G_DUST = /* glsl */`
{
  float gUp = smoothstep( .25, .9, gN.y );
  float gN1 = gFbm( gP.xz * 1.3 + gP.y * .21 ), gN2 = gFbm( gP.xz * 11. + gP.y * 4.7 );
  float dm = clamp( gUp * uDust * ( .35 + 1.0 * gN1 ), 0., 1. );
  float side = 1. - abs( gN.y );
  float drip = side * uGrime * smoothstep( .5, .85, gNoise( vec2( dot( gP.xz, vec2( 6.3, 5.1 ) ), gP.y * .45 ) ) ) * ( .5 + gN1 );
  vec3 dc = uDustCol * ( .75 + .5 * gN2 );
  diffuseColor.rgb = mix( diffuseColor.rgb, dc, clamp( max( dm, drip * .5 ), 0., 1. ) );
  roughnessFactor = mix( roughnessFactor, .97, dm );
  metalnessFactor = mix( metalnessFactor, 0., dm );
#ifdef USE_MAP
  if ( uEdge > 0. ) {
    vec2 dux = dFdx( vMapUv ), duy = dFdy( vMapUv ); vec3 dpx = dFdx( gP ), dpy = dFdy( gP );
    float det = dux.x * duy.y - duy.x * dux.y;
    if ( abs( det ) > 1e-14 ) {
      vec3 dpdu = ( dpx * duy.y - dpy * dux.y ) / det, dpdv = ( dpy * dux.x - dpx * duy.x ) / det;
      float lu = max( length( dpdu ), 1e-5 ), lv = max( length( dpdv ), 1e-5 );
      vec2 uvc = fract( vMapUv );
      float eu = min( uvc.x, 1. - uvc.x ) * lu, ev = min( uvc.y, 1. - uvc.y ) * lv;
      float px = length( fwidth( gP ) );
      float e = ( 1. - smoothstep( .004, .02, min( eu, ev ) ) ) * ( 1. - smoothstep( .012, .05, px ) ) * uEdge;
      vec3 dirW = eu < ev ? dpdu / lu * sign( uvc.x - .5 ) : dpdv / lv * sign( uvc.y - .5 );
      normal = normalize( normal + ( viewMatrix * vec4( dirW, 0. ) ).xyz * e * .9 );
      diffuseColor.rgb = mix( diffuseColor.rgb, min( diffuseColor.rgb * 1.55 + .025, vec3( 1. ) ), e * .55 * ( 1. - dm ) );
    }
  }
#endif
}
`;
// o: { tri: repetições por metro (0 = usa o UV), dust, edge, grime, dustCol: '#rrggbb' }
function grime(mat, o = {}) {
  if (!SHADER_OK) return mat;
  const tri = o.tri || 0, U = { uTri: { value: tri }, uDust: { value: o.dust ?? .6 }, uEdge: { value: o.edge ?? .8 }, uGrime: { value: o.grime ?? .5 }, uDustCol: { value: new THREE.Color(o.dustCol || '#7a4630') } };
  mat.userData.grime = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + G_HEAD)
      .replace('#include <map_fragment>', G_MAP(tri > 0))
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + G_DUST);
  };
  mat.customProgramCacheKey = () => 'grime' + (tri > 0 ? 't' : 'u');
  return mat;
}

export function buildMaterials(opt = {}) {
  seed = 7;
  const HI = !opt.embed && typeof navigator !== 'undefined' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && !/[?&]q=low/.test(location.search);
  const BIG = HI ? 2048 : 1024, MID = 1024, SM = HI ? 1024 : 512;
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);

  // ---- PISO de concreto escurecido por pó/lama de minério: trilhas de passagem, poças, juntas, trincas
  const fH = document.createElement('canvas'); fH.width = fH.height = MID; const fh = fH.getContext('2d'); fh.fillStyle = '#808080'; fh.fillRect(0, 0, MID, MID);
  const floorMap = canvasTex(BIG, (x, s) => {
    x.fillStyle = '#5e5049'; x.fillRect(0, 0, s, s);
    blotches(x, s, 120, s * .03, s * .25, () => `rgba(${95 + rnd() * 40 | 0},${52 + rnd() * 20 | 0},${34 + rnd() * 12 | 0},${.12 + rnd() * .3})`);
    blotches(x, s, 50, s * .05, s * .3, () => `rgba(120,112,104,${.08 + rnd() * .14})`);                  // cimento aparente (trânsito)
    blotches(x, s, 40, s * .02, s * .1, () => `rgba(38,24,18,${.25 + rnd() * .35})`);                    // lama/úmido escuro
    for (let i = 0; i < 26; i++) { const cx = rnd() * s, cy = rnd() * s; for (let k = 0; k < 10; k++) splat(x, cx + (rnd() - .5) * s * .06, cy + (rnd() - .5) * s * .03, s * (.006 + rnd() * .02), `rgba(48,30,22,${.25 + rnd() * .3})`); }
    // trilhas de pneu/bota (faixas longas claras e escuras)
    for (let i = 0; i < 14; i++) { const y = rnd() * s, w = s * (.01 + rnd() * .02); const g = x.createLinearGradient(0, y - w, 0, y + w); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(${rnd() < .5 ? '130,112,100' : '40,28,22'},${.1 + rnd() * .12})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, y - w, s, w * 2); }
    // juntas de dilatação e trincas
    x.strokeStyle = 'rgba(25,16,12,.55)'; x.lineWidth = 2.2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4, s); x.stroke(); x.beginPath(); x.moveTo(0, i * s / 4); x.lineTo(s, i * s / 4); x.stroke(); }
    for (let i = 0; i < 40; i++) { let px = rnd() * s, py = rnd() * s; x.strokeStyle = `rgba(25,16,12,${.3 + rnd() * .3})`; x.lineWidth = .7 + rnd(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (rnd() - .5) * s * .03; py += (rnd() - .3) * s * .03; x.lineTo(px, py); } x.stroke(); }
    // pedriscos de minério soltos
    for (let i = 0; i < s * 3; i++) { const px = rnd() * s, py = rnd() * s, r = .6 + rnd() * rnd() * 3.5; x.fillStyle = `rgba(${40 + rnd() * 50 | 0},${24 + rnd() * 22 | 0},${18 + rnd() * 14 | 0},${.5 + rnd() * .5})`; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); }
    speckle(x, s, s * 14, .3, '30,20,15'); speckle(x, s, s * 5, .22, '170,160,150');
    grain(x, s, 12);
  }, { repeat: [6, 3] });
  // altura do piso (juntas/trincas/pedriscos) → normal; rugosidade: poças lisas
  for (let i = 0; i <= 4; i++) { fh.fillStyle = '#404040'; fh.fillRect(i * MID / 4 - 2, 0, 4, MID); fh.fillRect(0, i * MID / 4 - 2, MID, 4); }
  for (let i = 0; i < MID * 4; i++) { const px = rnd() * MID, py = rnd() * MID, r = .5 + rnd() * rnd() * 2.5; fh.fillStyle = `rgba(${rnd() < .5 ? '200,200,200' : '60,60,60'},.6)`; fh.beginPath(); fh.arc(px, py, r, 0, 6.3); fh.fill(); }
  const floorRough = canvasTex(MID, (x, s) => { x.fillStyle = 'rgb(220,220,220)'; x.fillRect(0, 0, s, s); blotches(x, s, 60, s * .03, s * .2, () => `rgba(255,255,255,${rnd() * .2})`); blotches(x, s, 18, s * .03, s * .12, () => `rgba(40,40,40,${.5 + rnd() * .4})`); }, { repeat: [6, 3], srgb: false });
  M.floor = grime(std({ map: floorMap, roughnessMap: floorRough, normalMap: normalFromHeight(fH, 3, [6, 3]), normalScale: new THREE.Vector2(.6, .6), roughness: 1, metalness: 0 }), { tri: 0, dust: .25, edge: 0, grime: 0, dustCol: '#6a3c28' });

  // ---- concreto (lajes, bases): cinza manchado de minério, triplanar 1 repetição / 3 m
  const concMap = canvasTex(MID, (x, s) => {
    x.fillStyle = '#7a716a'; x.fillRect(0, 0, s, s);
    blotches(x, s, 70, s * .03, s * .25, () => `rgba(${110 + rnd() * 30 | 0},${58 + rnd() * 20 | 0},${36 + rnd() * 10 | 0},${.12 + rnd() * .3})`);
    blotches(x, s, 30, s * .02, s * .1, () => `rgba(50,34,26,${.15 + rnd() * .3})`);
    drips(x, s, 120, '80,42,26', .3); speckle(x, s, s * 10, .3, '40,30,24'); speckle(x, s, s * 4, .25, '190,180,170');
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(40,30,25,${.3 + rnd() * .4})`; x.beginPath(); x.arc(rnd() * s, rnd() * s, .6 + rnd() * 2.2, 0, 6.3); x.fill(); }   // bolhas do concreto
    grain(x, s, 16);
  });
  M.concrete = grime(std({ map: concMap, roughness: .93, metalness: 0 }), { tri: 1 / 3, dust: .8, edge: .5, grime: .6, dustCol: '#6e3d28' });
  M.plinth = grime(std({ map: concMap, color: 0xb59a88, roughness: .95 }), { tri: 1 / 2.5, dust: .9, edge: .6, grime: .8, dustCol: '#6a3a26' });

  // ---- ESTRUTURA METÁLICA: tinta cinza-bege gasta + ferrugem dessaturada + pó de minério (não laranja/madeira)
  const steelMap = paintTex(BIG, { base: '#7a6c62', dust: 1.4, rust: 1.2, drip: 1.2, scratch: 1 });
  M.steel = grime(std({ map: steelMap, roughness: .72, metalness: .35 }), { tri: 1 / 2.2, dust: .95, edge: 1, grime: .7, dustCol: '#7d4630' });
  const steelDkMap = paintTex(MID, { base: '#5b4a40', dust: 1.2, rust: 1.6, drip: 1, scratch: .7 });
  M.steelDk = grime(std({ map: steelDkMap, roughness: .78, metalness: .3 }), { tri: 1 / 2, dust: .9, edge: .9, grime: .6, dustCol: '#74402a' });
  // chutes/caixas: aço marrom-ferrugem escuro, muito sujo
  const chuteMap = paintTex(MID, { base: '#5a3a2a', dust: 1.6, rust: 2.2, drip: 2, scratch: .5 });
  M.chute = grime(std({ map: chuteMap, roughness: .82, metalness: .3 }), { tri: 1 / 2, dust: 1, edge: .8, grime: .8, dustCol: '#6c3a26' });
  // chapas cinza-claras das peneiras e cinzas gerais
  const greyMap = paintTex(BIG, { base: '#a39e98', dust: 1.3, rust: .5, drip: 1.6, scratch: 1.2, dustRGB: '130,72,44' });
  M.grey = grime(std({ map: greyMap, roughness: .6, metalness: .4 }), { tri: 1 / 1.6, dust: .9, edge: 1, grime: .9, dustCol: '#80492f' });
  const greyDkMap = paintTex(SM, { base: '#4f5354', dust: .8, rust: .6, drip: .8, scratch: .8 });
  M.greyDk = grime(std({ map: greyDkMap, roughness: .55, metalness: .5 }), { tri: 1, dust: .7, edge: .8, grime: .4 });
  // amarelo de segurança gasto (guarda-corpos, proteções)
  const yelMap = paintTex(MID, { base: '#d8a419', dust: 1.1, rust: .5, drip: 1, scratch: 1.4, scratchRGB: '90,80,70', grain: 8 });
  M.yellow = grime(std({ map: yelMap, roughness: .55, metalness: .1 }), { tri: 1 / 1.2, dust: .8, edge: .9, grime: .6, dustCol: '#8a5233' });
  M.yellowClean = grime(std({ map: yelMap, color: 0xfff0d0, roughness: .5, metalness: .05 }), { tri: 1, dust: .4, edge: .8, grime: .3 });
  // bege dos britadores (carcaça bege-esverdeada clara muito suja de minério escorrido — foto 1)
  const beigeMap = paintTex(MID, { base: '#c9c4a8', dust: 1.6, rust: .7, drip: 3, scratch: 1, dripRGB: '84,44,26', dustRGB: '120,64,38' });
  M.beige = grime(std({ map: beigeMap, roughness: .55, metalness: .2 }), { tri: 1 / 1.5, dust: 1, edge: .9, grime: 1, dustCol: '#6e3b26' });
  // amarelo Metso desgastado (HP 400 da foto b)
  const hpMap = paintTex(MID, { base: '#d39c1c', dust: 1.6, rust: .8, drip: 2.4, scratch: 1.2, dripRGB: '84,44,26' });
  M.hp = grime(std({ map: hpMap, roughness: .55, metalness: .15 }), { tri: 1 / 1.5, dust: 1, edge: .9, grime: 1, dustCol: '#6e3b26' });
  const orMap = paintTex(SM, { base: '#b5652a', dust: 1.2, rust: 1.5, drip: 1.5, scratch: 1 });
  M.orange = grime(std({ map: orMap, roughness: .6, metalness: .3 }), { tri: 1, dust: .9, edge: .9, grime: .8 });
  // coroa dentada enferrujada
  const rustMap = paintTex(SM, { base: '#6b3d26', dust: 1, rust: 3, drip: 1, scratch: .3 });
  M.rust = grime(std({ map: rustMap, roughness: .85, metalness: .45 }), { tri: 2, dust: .8, edge: 1, grime: .4 });
  M.rubber = grime(std({ map: paintTex(SM, { base: '#252322', dust: 1, rust: 0, drip: 1, scratch: .3, scratchRGB: '90,80,70' }), roughness: .92 }), { tri: 1, dust: .9, edge: .3, grime: .6 });
  // poliuretano dos painéis da tela (cinza coberto de finos de minério)
  const puMap = canvasTex(MID, (x, s) => { x.fillStyle = '#5f5852'; x.fillRect(0, 0, s, s); blotches(x, s, 80, s * .02, s * .15, () => `rgba(${90 + rnd() * 30 | 0},${55 + rnd() * 15 | 0},${40 + rnd() * 10 | 0},${.2 + rnd() * .35})`); speckle(x, s, s * 20, .5, '35,25,20'); speckle(x, s, s * 8, .35, '150,140,130'); grain(x, s, 18); });
  M.pu = grime(std({ map: puMap, roughness: .9 }), { tri: 1 / 1.2, dust: .7, edge: .4, grime: .2, dustCol: '#5a3a2a' });
  M.belt = grime(std({ map: paintTex(SM, { base: '#1d1b1a', dust: 1.2, rust: 0, drip: .4, scratch: .4 }), roughness: .85 }), { tri: 1, dust: .8, edge: .2, grime: .3 });
  // minério (pedras): hematita/itabirito — marrom-avermelhado escuro a cinza metálico (cor por instância)
  const oreMap = canvasTex(SM, (x, s) => { x.fillStyle = '#7a5a4a'; x.fillRect(0, 0, s, s); blotches(x, s, 90, s * .02, s * .1, () => `rgba(${rnd() < .5 ? '120,60,38' : '70,66,64'},${.3 + rnd() * .4})`); speckle(x, s, s * 30, .6, '30,22,18'); speckle(x, s, s * 10, .5, '190,180,175'); grain(x, s, 30); });
  M.ore = grime(std({ map: oreMap, roughness: .78, metalness: .25 }), { tri: 3, dust: .3, edge: 0, grime: 0, dustCol: '#5a3020' });
  M.oreBed = grime(std({ map: oreMap, color: 0x8c7468, roughness: .95, metalness: .1 }), { tri: 2.5, dust: .2, edge: 0, grime: 0, dustCol: '#5a3020' });
  M.motor = grime(std({ map: paintTex(SM, { base: '#56606a', dust: 1, rust: .4, drip: 1, scratch: 1 }), roughness: .5, metalness: .5 }), { tri: 1.2, dust: .8, edge: .9, grime: .6 });
  M.motorBlue = grime(std({ map: paintTex(SM, { base: '#2f5f9a', dust: 1.1, rust: .3, drip: 1, scratch: 1 }), roughness: .45, metalness: .35 }), { tri: 1.2, dust: .8, edge: .9, grime: .6 });
  M.blue = std({ color: 0x2a6cc0, roughness: .4 });
  M.white = std({ color: 0xe9e7e2, roughness: .6 });
  M.black = std({ color: 0x151312, roughness: .7 });
  M.hose = std({ color: 0x121212, roughness: .45, metalness: 0 });
  M.glass = std({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 6, roughness: .2 });

  // ---- TELHAS trapezoidais: marrom-ferrugem escuras por dentro, verdes por fora (normal das nervuras)
  const ribH = canvasTex(SM, (x, s) => { const n = 32, p = s / n; x.fillStyle = '#404040'; x.fillRect(0, 0, s, s); for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * p, 0, i * p + p, 0); g.addColorStop(0, '#404040'); g.addColorStop(.15, '#d0d0d0'); g.addColorStop(.45, '#d0d0d0'); g.addColorStop(.6, '#404040'); g.addColorStop(1, '#404040'); x.fillStyle = g; x.fillRect(i * p, 0, p, s); } }, { srgb: false });
  const cladN = (rep) => normalFromHeight(ribH.userData.canvas, 6, rep);
  const cladInMap = canvasTex(MID, (x, s) => { x.fillStyle = '#4d3529'; x.fillRect(0, 0, s, s); for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.14)' : 'rgba(255,230,210,.04)'; x.fillRect(i * s / 32, 0, s / 64, s); } blotches(x, s, 50, s * .05, s * .3, () => `rgba(${100 + rnd() * 30 | 0},${50 + rnd() * 15 | 0},${30},${.1 + rnd() * .3})`); drips(x, s, 220, '40,24,16', .35); drips(x, s, 120, '120,64,36', .25); grain(x, s, 10); });
  cladInMap.repeat.set(6, 1);
  M.cladIn = grime(std({ map: cladInMap, normalMap: cladN([6, 1]), roughness: .8, metalness: .35, side: THREE.DoubleSide }), { tri: 0, dust: .3, edge: 0, grime: .3 });
  const cladOutMap = canvasTex(MID, (x, s) => { x.fillStyle = '#3c6a52'; x.fillRect(0, 0, s, s); for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.06)'; x.fillRect(i * s / 32, 0, s / 64, s); } blotches(x, s, 40, s * .05, s * .3, () => `rgba(120,64,36,${rnd() * .35})`); drips(x, s, 200, '110,58,34', .3); grain(x, s, 10); });
  cladOutMap.repeat.set(8, 1);
  M.cladOut = grime(std({ map: cladOutMap, normalMap: cladN([8, 1]), roughness: .6, metalness: .3 }), { tri: 0, dust: .5, edge: 0, grime: .2 });
  // terreno externo: terra de minério com capim
  const groundMap = canvasTex(MID, (x, s) => { x.fillStyle = '#6a4632'; x.fillRect(0, 0, s, s); blotches(x, s, 60, s * .04, s * .25, () => `rgba(${rnd() < .35 ? '86,104,52' : '120,74,48'},${.25 + rnd() * .4})`); speckle(x, s, s * 20, .4, '40,28,20'); speckle(x, s, s * 10, .35, '110,130,70'); grain(x, s, 18); }, { repeat: [40, 40] });
  M.ground = std({ map: groundMap, roughness: 1 });

  // grade de piso (alpha) — barras portantes + travessas
  const grate = canvasTex(256, (x, s) => { x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { x.fillRect(i * s / 16, 0, 3, s); } for (let j = 0; j < 6; j++) x.fillRect(0, j * s / 6, s, 4); }, { repeat: [8, 2], srgb: false });
  M.grate = grime(std({ map: chuteMap, color: 0xb0a090, alphaMap: grate, alphaTest: .5, transparent: false, roughness: .7, metalness: .5, side: THREE.DoubleSide }), { tri: 1, dust: .7, edge: 0, grime: 0 });
  // proteção amarela PERFURADA do vibrador (furos oblongos em fileiras) — UV da caixa
  const perfMap = canvasTex(SM, (x, s) => {
    x.fillStyle = '#d6a21c'; x.fillRect(0, 0, s, s);
    blotches(x, s, 30, s * .05, s * .3, () => `rgba(120,64,36,${.1 + rnd() * .25})`);
    const nx = 12, ny = 7; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const cx = (i + .5 + (j % 2) * .5) * s / nx, cy = (j + .5) * s / ny; if (cx > s - 4) continue; x.fillStyle = '#1c130e'; x.beginPath(); x.ellipse(cx, cy, s / nx * .28, s / ny * .16, 0, 0, 6.3); x.fill(); }
    drips(x, s, 60, '84,44,26', .35); scratches(x, s, 60, '90,80,70'); grain(x, s, 10);
  });
  M.perf = grime(std({ map: perfMap, roughness: .55, metalness: .1 }), { tri: 0, dust: .8, edge: .9, grime: .4, dustCol: '#8a5233' });
  // tela (malha) das janelas da proteção de correias do HP 400
  const meshA = canvasTex(128, (x, s) => { x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.fillStyle = '#fff'; for (let i = 0; i < s; i += 8) { x.fillRect(i, 0, 2, s); x.fillRect(0, i, s, 2); } }, { repeat: [6, 4], srgb: false });
  M.wire = std({ color: 0x8a7a62, alphaMap: meshA, alphaTest: .5, roughness: .6, metalness: .6, side: THREE.DoubleSide });

  const plate = (bg, fg, border, t1, t2) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 256); if (border) { x.strokeStyle = border; x.lineWidth = 9; x.strokeRect(8, 8, 496, 240); } x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 40px Arial'; x.fillText(t1, 256, 80); x.font = 'bold 106px Arial'; x.fillText(t2, 256, 203);
    seed += 17; blotches(x, 512, 14, 20, 90, () => `rgba(120,64,36,${.06 + rnd() * .14})`, 256); drips(x, 512, 30, '90,50,30', .25, 256); speckle(x, 512, 3000, .25, '60,40,30', 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return std({ map: t, roughness: .5 }); };
  M.plateY = (t1, t2) => plate('#f2c400', '#111', '#111', t1, t2);
  M.plateW = (t1, t2) => plate('#efeee8', '#111', '#222', t1, t2);
  M.plateB = (t1, t2) => plate('#1f5fb0', '#fff', null, t1, t2);
  M.label = (t1, t2, bg = '#c8501e', fg = '#fff') => plate(bg, fg, null, t1, t2);
  M.warn = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 256, 60); x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.fillText('ATENÇÃO - PERIGO', 128, 42); x.fillStyle = '#111'; x.font = '22px Arial'; ['Não olhe dentro da câmara', 'de britagem enquanto o', 'britador estiver', 'operando'].forEach((l, i) => x.fillText(l, 128, 110 + i * 32)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return std({ map: t, roughness: .5 }); };
  return M;
}
