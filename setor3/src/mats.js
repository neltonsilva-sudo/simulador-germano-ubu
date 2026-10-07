// Materiais procedurais (texturas em canvas) com desgaste e sujeira — modelo das texturas do gêmeo do Lab. de Eletricidade
// (room_tex/benches_tex/props_tex): aço pintado gasto, pó de minério marrom-avermelhado, concreto manchado, telhas
// trapezoidais, chapas parafusadas, poliuretano, borracha, proteções amarelas perfuradas, minério.
// Cada superfície é pintada em TRÊS camadas coerentes (mesmos sorteios): cor (sRGB), altura (→ normalMap) e ORM
// (G = rugosidade, B = metalicidade; linear). Lascas de tinta afundam e mostram metal liso/primer; ferrugem e pó sobem
// e ficam foscos; arranhões viram sulcos brilhantes; juntas do piso afundam.
// Shader "grime" (três ≥ r152): mapeamento triplanar em coordenadas do mundo (cor, normal e ORM — escala constante em
// vigas de 24 m, fim do aspecto de "madeira"), variação macro em escala de metros (quebra a repetição), pó acumulado nas
// faces voltadas para cima, escorridos nas faces verticais e bordas gastas/polidas (normal inclinada, tinta mais clara,
// rugosidade menor). Sem o shader (simulador r147) o material continua funcionando só com as texturas (UV).
// Modo leve (embed/celular/?q=low): texturas menores e só a cor (rugosidade/metalicidade escalares, sem normalMap).
import * as THREE from 'three';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const SHADER_OK = parseInt(THREE.REVISION, 10) >= 152;
const TEX = [];   // todas as texturas criadas (para setAnisotropy)
let ANISO = 16;   // valor seguro: o WebGL limita ao máximo da placa

// anisotropia = máximo do renderer em todas as texturas geradas aqui (chamar depois de criar o renderer)
export function setAnisotropy(renderer) {
  ANISO = (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy()) || ANISO;
  for (const t of TEX) { if (t.anisotropy !== ANISO) { t.anisotropy = ANISO; t.needsUpdate = true; } }
  return ANISO;
}
function texOf(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = ANISO;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c; TEX.push(t);
  return t;
}
function canvasTex(size, draw, { repeat = [1, 1], srgb = true, h = size } = {}) {
  const c = document.createElement('canvas'); c.width = size; c.height = h;
  const x = c.getContext('2d'); draw(x, size, h);
  return texOf(c, { repeat, srgb });
}
function blotches(x, s, n, rMin, rMax, colorFn, h = s) {
  for (let i = 0; i < n; i++) {
    const r = rMin + rnd() * (rMax - rMin), cx = rnd() * s, cy = rnd() * h;
    const c = colorFn();
    // desenha também as cópias deslocadas de um período nas bordas → a textura continua sem emenda
    for (const ox of [0, -s, s]) for (const oy of [0, -h, h]) {
      if (cx + ox + r < 0 || cx + ox - r > s || cy + oy + r < 0 || cy + oy - r > h) continue;
      const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
      g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)'));
      x.fillStyle = g; x.beginPath(); x.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); x.fill();
    }
  }
}
// forma irregular (polígono com raio variável) — ferrugem, lascas, lama. pts: forma reutilizável nas 3 camadas
function shape(r) { const n = 7 + (rnd() * 7 | 0), p = []; for (let k = 0; k < n; k++) p.push(r * (.45 + rnd() * .75)); return p; }
function poly(x, cx, cy, p, k, col) { const n = p.length; x.fillStyle = col; x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * 6.283, q = p[i % n] * k; i ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + q, cy); } x.fill(); }
function splat(x, cx, cy, r, col) { poly(x, cx, cy, shape(r), 1, col); }
function speckle(x, s, n, a, col, h = s) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${col},${a * rnd()})`; const w = 1 + rnd() * 2; x.fillRect(rnd() * s, rnd() * h, w, w); } }
// escorridos verticais finos (pó de minério lavado pela água / óleo)
function drips(x, s, n, col, aMax = .35, h = s) {
  for (let i = 0; i < n; i++) {
    const px = rnd() * s, y0 = rnd() * h * .7, len = h * (.05 + rnd() * .35), w = .6 + rnd() * 2.6;
    const g = x.createLinearGradient(0, y0, 0, y0 + len); g.addColorStop(0, `rgba(${col},${.08 + rnd() * aMax})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(px, y0, w, len);
  }
}
// grão por pixel (variação fina — o que tira o "chapado")
function grain(x, s, amp, h = s) { const id = x.getImageData(0, 0, s, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * amp; d[i] += n; d[i + 1] += n * .95; d[i + 2] += n * .9; } x.putImageData(id, 0, 0); }

// ---------- ruído fBm periódico (sem emenda) e quantis ----------
const FN = 256;   // resolução dos campos; amostrados com interpolação bilinear em qualquer tamanho de textura
function field(cells, oct = 4, gain = .5, ax = 1, ay = 1) {
  const n = FN, f = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const cx = (cells * ax) << o, cy = (cells * ay) << o, lat = new Float32Array(cx * cy);
    for (let i = 0; i < lat.length; i++) lat[i] = rnd();
    for (let y = 0; y < n; y++) {
      const fy = y / n * cy, y0 = fy | 0, ty = fy - y0, y1 = (y0 + 1) % cy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < n; x++) {
        const fx = x / n * cx, x0 = fx | 0, tx = fx - x0, x1 = (x0 + 1) % cx, sx = tx * tx * (3 - 2 * tx);
        const a = lat[y0 * cx + x0], b = lat[y0 * cx + x1], c = lat[y1 * cx + x0], d = lat[y1 * cx + x1];
        const top = a + (b - a) * sx; f[y * n + x] += amp * (top + (c + (d - c) * sx - top) * sy);
      }
    }
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < f.length; i++) f[i] /= tot;
  return f;
}
// amostrador bilinear do campo para uma textura de lado s (tabelas pré-calculadas — sem módulo por pixel)
function sampler(s, h = s) {
  const n = FN, X0 = new Int32Array(s), X1 = new Int32Array(s), TX = new Float32Array(s), Y0 = new Int32Array(h), Y1 = new Int32Array(h), TY = new Float32Array(h);
  for (let x = 0; x < s; x++) { const u = x * n / s, a = Math.floor(u); X0[x] = a % n; X1[x] = (a + 1) % n; TX[x] = u - a; }
  for (let y = 0; y < h; y++) { const v = y * n / h, a = Math.floor(v); Y0[y] = (a % n) * n; Y1[y] = ((a + 1) % n) * n; TY[y] = v - a; }
  return (f, x, y) => { const xa = X0[x], xb = X1[x], ya = Y0[y], yb = Y1[y], tx = TX[x], a = f[ya + xa], b = f[ya + xb], c = f[yb + xa], top = a + (b - a) * tx; return top + (c + (f[yb + xb] - c) * tx - top) * TY[y]; };
}
function quant(f, q) { const a = Float32Array.from(f).sort(); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * a.length)))]; }
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const parse = (c) => { if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return c.split(',').map(Number); };

// ---------- camadas coerentes: cor (A), altura (H), rugosidade/metalicidade (R) ----------
const orm = (r, m, a = 1) => `rgba(255,${Math.round(Math.min(1, Math.max(0, r)) * 255)},${Math.round(Math.min(1, Math.max(0, m)) * 255)},${a})`;
function layers(s, full, h = s) {
  const mk = () => { const c = document.createElement('canvas'); c.width = s; c.height = h; return c; };
  const ca = mk(), A = ca.getContext('2d', { willReadFrequently: true });
  let ch = null, H = null, cr = null, R = null;
  if (full) {
    ch = mk(); H = ch.getContext('2d', { willReadFrequently: true }); H.fillStyle = '#808080'; H.fillRect(0, 0, s, h);
    cr = mk(); R = cr.getContext('2d', { willReadFrequently: true });
  }
  return { ca, ch, cr, A, H, R, s, h, sp: sampler(s, h) };
}
// passada por pixel nas três camadas: fn(i, x, y, a, hh, r) — com L.sp(campo, x, y) para amostrar ruído
function pixels(L, fn) {
  const { s, h } = L, ia = L.A.getImageData(0, 0, s, h), a = ia.data;
  const ih = L.H ? L.H.getImageData(0, 0, s, h) : null, ir = L.R ? L.R.getImageData(0, 0, s, h) : null;
  const hh = ih ? ih.data : null, r = ir ? ir.data : null;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < s; x++, i += 4) fn(i, x, y, a, hh, r);
  L.A.putImageData(ia, 0, 0); if (ih) L.H.putImageData(ih, 0, 0); if (ir) L.R.putImageData(ir, 0, 0);
}
// mapa de normais a partir de um canvas de altura (cinza)
function normalFromHeight(hc, strength = 2, repeat = [1, 1]) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const id = x.createImageData(w, h), d = id.data;
  const k255 = strength / 255;
  for (let j = 0; j < h; j++) { const ju = ((j + h - 1) % h) * w, jd = ((j + 1) % h) * w, jr = j * w; for (let i = 0; i < w; i++) {
    const il = (i + w - 1) % w, ir = (i + 1) % w;
    const dx = (src[(jr + ir) * 4] - src[(jr + il) * 4]) * k255, dy = (src[(jd + i) * 4] - src[(ju + i) * 4]) * k255;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    d[k] = (-dx / l * .5 + .5) * 255; d[k + 1] = (dy / l * .5 + .5) * 255; d[k + 2] = (1 / l * .5 + .5) * 255; d[k + 3] = 255;
  } }
  x.putImageData(id, 0, 0);
  return texOf(c, { repeat, srgb: false });
}
function finish(L, { repeat = [1, 1], nStr = 2 } = {}) {
  const out = { map: texOf(L.ca, { repeat }) };
  if (L.H) { out.nrm = normalFromHeight(L.ch, nStr * L.s / 1024, repeat); out.orm = texOf(L.cr, { repeat, srgb: false }); }
  return out;
}
// lascas de tinta: borda escura, fundo de primer (marrom-avermelhado) ou metal nu; afundadas, metal liso e metálico
function chips(L, n, o) {
  const { A, H, R, s } = L;
  for (let i = 0; i < n; i++) {
    const cx = rnd() * s, cy = rnd() * s, r = s * (.0015 + rnd() * rnd() * (o.chipR || .012)), p = shape(r), bare = rnd() < (o.bare ?? .45);
    poly(A, cx, cy, p, 1.25, `rgba(${o.rimRGB || '40,28,22'},.32)`);
    poly(A, cx, cy, p, 1, bare ? `rgb(${112 + rnd() * 30 | 0},${106 + rnd() * 26 | 0},${100 + rnd() * 22 | 0})` : `rgb(${o.primer || '104,58,40'})`);
    const rusty = rnd() < (o.chipRust ?? .5);
    if (rusty) poly(A, cx + r * .1, cy + r * .15, p, .7, `rgba(${84 + rnd() * 24 | 0},${44 + rnd() * 12 | 0},${28 + rnd() * 8 | 0},.85)`);
    if (H) { poly(H, cx, cy, p, 1.1, 'rgba(96,96,96,.6)'); poly(H, cx, cy, p, 1, '#6a6a6a'); if (rusty) poly(H, cx, cy, p, .6, 'rgba(150,150,150,.7)'); }
    if (R) { poly(R, cx, cy, p, 1, bare ? orm(.36, .85) : orm(.72, .25)); if (rusty) poly(R, cx, cy, p, .7, orm(.93, .12)); }
  }
}
// escorridos coerentes: mais escuros, um pouco mais foscos e levemente em relevo (crosta de lama)
function dripsL(L, n, col, aMax = .35) {
  const { A, H, R, s } = L;
  for (let i = 0; i < n; i++) {
    const px = rnd() * s, y0 = rnd() * s * .7, len = s * (.05 + rnd() * .35), w = .6 + rnd() * 2.6 * s / 1024, a = .08 + rnd() * aMax;
    const g = A.createLinearGradient(0, y0, 0, y0 + len); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    A.fillStyle = g; A.fillRect(px, y0, w, len);
    if (R) { const gr = R.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, orm(.92, .1, a * 1.5)); gr.addColorStop(1, orm(.92, .1, 0)); R.fillStyle = gr; R.fillRect(px, y0, w, len); }
    if (H) { const gh = H.createLinearGradient(0, y0, 0, y0 + len); gh.addColorStop(0, `rgba(170,170,170,${a})`); gh.addColorStop(1, 'rgba(170,170,170,0)'); H.fillStyle = gh; H.fillRect(px, y0, w, len); }
  }
}
// arranhões: risco claro (metal), sulco na altura, liso e metálico no ORM
function scratchesL(L, n, col, mOn = true) {
  const { A, H, R, s } = L;
  for (let i = 0; i < n; i++) {
    const px = rnd() * s, py = rnd() * s, Ln = 4 + rnd() * s * .05, ang = rnd() * 6.28, bend = (rnd() - .5) * .5, lw = (.5 + rnd()) * Math.max(1, s / 1024);
    const ex = px + Math.cos(ang) * Ln, ey = py + Math.sin(ang) * Ln, mx = px + Math.cos(ang + bend) * Ln * .5, my = py + Math.sin(ang + bend) * Ln * .5;
    const path = (x) => { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(mx, my, ex, ey); x.stroke(); };
    A.strokeStyle = `rgba(${col},${.15 + rnd() * .35})`; A.lineWidth = lw; path(A);
    if (H) { H.strokeStyle = 'rgba(70,70,70,.7)'; H.lineWidth = lw; path(H); }
    if (R && mOn) { R.strokeStyle = orm(.4, .8, .7); R.lineWidth = lw; path(R); }
  }
}

// aço pintado gasto: tom de demão, pó de minério, ferrugem orgânica (manchas recortadas, não bolinhas), lascas, escorridos, arranhões, grão
// o: base, dust, rust, drip, scratch, chip, r (rugosidade da tinta), m (metalicidade), dustRGB, dripRGB, scratchRGB, rustRGB, grain
function paintTex(size, o, full = true) {
  const L = layers(size, full), { A, R } = L, s = size;
  A.fillStyle = o.base; A.fillRect(0, 0, s, s);
  if (R) { R.fillStyle = orm(o.r ?? .65, o.m ?? .3); R.fillRect(0, 0, s, s); }
  // demão irregular (mais clara/escura) e pintura retocada em placas
  blotches(A, s, 50, s * .04, s * .3, () => `rgba(255,250,240,${.02 + rnd() * .06})`);
  blotches(A, s, 50, s * .04, s * .3, () => `rgba(0,0,0,${.03 + rnd() * .08})`);
  if (R) blotches(R, s, 40, s * .05, s * .3, () => orm((o.r ?? .65) + (rnd() - .5) * .25, o.m ?? .3, .35));
  blotches(A, s, 26 * o.dust, s * .03, s * .18, () => `rgba(${o.dustRGB || '118,62,36'},${.05 + rnd() * .14})`);
  dripsL(L, 160 * o.drip, o.dripRGB || '92,48,28', .3);
  chips(L, 70 * (o.chip ?? 1), o);
  scratchesL(L, 160 * (o.scratch ?? 1), o.scratchRGB || '200,190,175', o.mScr ?? true);
  // campos de ruído: tom largo, pó (manchas), ferrugem (recortada pelo detalhe fino), detalhe fino
  const nT = field(2, 4), nD = field(3, 5, .55), nR0 = field(4, 5, .6), nF = field(24, 3, .5);
  const nR = nR0.map((v, i) => v * .72 + nF[i] * .28);
  const dCov = Math.min(.6, .2 * o.dust), rCov = Math.min(.25, .028 * o.rust);
  const d0 = quant(nD, 1 - dCov * 2), d1 = quant(nD, 1 - dCov * .7);
  const rh = quant(nR, 1 - rCov * 2.6), r0 = quant(nR, 1 - rCov), r1 = quant(nR, 1 - rCov * .45);
  const DC = parse(o.dustRGB || '118,62,36'), RC = parse(o.rustRGB || '96,52,32'), RD = [64, 40, 30], G = o.grain ?? 10;
  const sp = L.sp;
  pixels(L, (i, x, y, a, hh, r) => {
    const t = sp(nT, x, y), d = sp(nD, x, y), q = sp(nR, x, y), f = sp(nF, x, y);
    let c0 = a[i], c1 = a[i + 1], c2 = a[i + 2];
    const tone = .9 + .2 * t; c0 *= tone; c1 *= tone; c2 *= tone;
    const dm = sst(d0, d1, d) * .75 * (.7 + .6 * f);
    const df = .8 + .4 * f; c0 += (DC[0] * df - c0) * dm; c1 += (DC[1] * df - c1) * dm; c2 += (DC[2] * df - c2) * dm;
    const halo = sst(rh, r0, q) * .3, core = sst(r0, r1, q);
    c0 += (RC[0] * 1.15 - c0) * halo; c1 += (RC[1] * 1.15 - c1) * halo; c2 += (RC[2] * 1.15 - c2) * halo;
    const mix = core * (.85 + .15 * f), rc0 = RC[0] + (RD[0] - RC[0]) * f, rc1 = RC[1] + (RD[1] - RC[1]) * f, rc2 = RC[2] + (RD[2] - RC[2]) * f;
    c0 += (rc0 - c0) * mix; c1 += (rc1 - c1) * mix; c2 += (rc2 - c2) * mix;
    const g = (rnd() - .5) * G; a[i] = c0 + g; a[i + 1] = c1 + g * .95; a[i + 2] = c2 + g * .9;
    if (hh) { const e = hh[i] + dm * 14 + halo * 10 + core * (18 + 46 * f) + (rnd() - .5) * 10; hh[i] = hh[i + 1] = hh[i + 2] = e; }
    if (r) {
      let rg = r[i + 1] / 255, mt = r[i + 2] / 255;
      rg += (.96 - rg) * dm; mt += (.02 - mt) * dm;
      rg += (.92 - rg) * Math.max(core, halo * .6); mt += (.12 - mt) * core;
      rg += (rnd() - .5) * .05 + (t - .5) * .08;
      r[i + 1] = rg * 255; r[i + 2] = mt * 255;
    }
  });
  return finish(L, { nStr: o.nStr ?? 2 });
}

// ---------- shader de sujeira/pó/bordas (onBeforeCompile) ----------
const G_HEAD = /* glsl */`
uniform float uTri; uniform float uDust; uniform float uEdge; uniform float uGrime; uniform float uMacro; uniform vec3 uDustCol;
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
` + (tri ? `
vec3 gw = pow( abs( gN ), vec3( 4.0 ) ); gw /= ( gw.x + gw.y + gw.z );
vec2 gUx = gP.zy * uTri + vec2( .37, .11 ), gUy = gP.xz * uTri + vec2( .71, .53 ), gUz = gP.xy * uTri;
#define G_TRI( t ) ( texture2D( t, gUx ) * gw.x + texture2D( t, gUy ) * gw.y + texture2D( t, gUz ) * gw.z )
` : '') + `
#ifdef USE_MAP
` + (tri ? `
  vec4 sampledDiffuseColor = G_TRI( map );
` : `
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
`) + `
  diffuseColor *= sampledDiffuseColor;
#endif
{
  // variação macro (metros) — quebra a repetição de qualquer textura
  float gM = gFbm( gP.xz * .11 + gP.y * .05 + vec2( 3.1, 7.7 ) );
  diffuseColor.rgb *= mix( 1. - uMacro, 1. + uMacro * .6, gM );
}
`;
// rugosidade/metalicidade/normal triplanares (mesma projeção da cor → relevo coerente com o albedo)
const G_ROUGH = /* glsl */`
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  roughnessFactor *= G_TRI( roughnessMap ).g;
#endif
`;
const G_METAL = /* glsl */`
float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
  metalnessFactor *= G_TRI( metalnessMap ).b;
#endif
`;
const G_NORMAL = /* glsl */`
#ifdef USE_NORMALMAP
{
  vec3 tX = texture2D( normalMap, gUx ).xyz * 2. - 1., tY = texture2D( normalMap, gUy ).xyz * 2. - 1., tZ = texture2D( normalMap, gUz ).xyz * 2. - 1.;
  tX.xy *= normalScale; tY.xy *= normalScale; tZ.xy *= normalScale;
  vec3 pW = vec3( 0., tX.y, tX.x ) * gw.x + vec3( tY.x, 0., tY.y ) * gw.y + vec3( tZ.x, tZ.y, 0. ) * gw.z;
  normal = normalize( normal + ( viewMatrix * vec4( pW, 0. ) ).xyz );
}
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
  // pó espesso esconde o relevo da tinta
  normal = normalize( mix( normal, nonPerturbedNormal, dm * .7 ) );
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
      float ew = e * ( 1. - dm ) * ( .6 + .8 * gN2 );   // aresta gasta: tinta mais clara, polida pela abrasão
      diffuseColor.rgb = mix( diffuseColor.rgb, min( diffuseColor.rgb * 1.55 + .025, vec3( 1. ) ), ew * .55 );
      roughnessFactor = mix( roughnessFactor, roughnessFactor * .6, ew );
    }
  }
#endif
}
`;
// o: { tri: repetições por metro (0 = usa o UV), dust, edge, grime, macro, dustCol: '#rrggbb' }
function grime(mat, o = {}) {
  if (!SHADER_OK) return mat;
  const tri = o.tri || 0, U = { uTri: { value: tri }, uDust: { value: o.dust ?? .6 }, uEdge: { value: o.edge ?? .8 }, uGrime: { value: o.grime ?? .5 }, uMacro: { value: o.macro ?? .14 }, uDustCol: { value: new THREE.Color(o.dustCol || '#7a4630') } };
  mat.userData.grime = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    let f = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + G_HEAD)
      .replace('#include <map_fragment>', G_MAP(tri > 0));
    if (tri > 0) f = f.replace('#include <roughnessmap_fragment>', G_ROUGH).replace('#include <metalnessmap_fragment>', G_METAL).replace('#include <normal_fragment_maps>', G_NORMAL + G_DUST);
    else f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + G_DUST);
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'grime2' + (tri > 0 ? 't' : 'u');
  return mat;
}

export function buildMaterials(opt = {}) {
  seed = 7; TEX.length = 0;
  const HI = !opt.embed && typeof navigator !== 'undefined' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && !/[?&]q=low/.test(location.search);
  const BIG = HI ? 2048 : 1024, MID = HI ? 1024 : 512, SM = HI ? 1024 : 512, TINY = 512;   // 2048 só no piso (5,3 m por repetição)
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // material a partir de camadas: com ORM/normal no modo completo; escalares no leve
  const pm = (T, o, extra = {}) => {
    const p = { map: T.map, roughness: o.r ?? .65, metalness: o.m ?? .3, ...extra };
    if (T.orm) Object.assign(p, { roughnessMap: T.orm, metalnessMap: T.orm, roughness: 1, metalness: 1, normalMap: T.nrm, normalScale: new THREE.Vector2(o.ns ?? .8, o.ns ?? .8) });
    if (extra.roughness != null && T.orm) p.roughness = extra.roughness;   // multiplicador sobre o mapa
    return std(p);
  };
  const paint = (size, o) => { const T = paintTex(size, o, HI); T.o = o; return T; };

  // ---- PISO de concreto coberto de pó fino de minério (cinza-marrom arroxeado, foto 99): trilhas de passagem, juntas,
  // trincas, pedriscos, montinhos de finos e alguns pontos úmidos (lisos/escuros)
  {
    const s = BIG, L = layers(s, true), { A, H, R } = L;
    A.fillStyle = '#4c4441'; A.fillRect(0, 0, s, s);
    R.fillStyle = orm(.9, 0); R.fillRect(0, 0, s, s);
    blotches(A, s, 90, s * .03, s * .22, () => `rgba(${92 + rnd() * 30 | 0},${56 + rnd() * 14 | 0},${42 + rnd() * 10 | 0},${.1 + rnd() * .22})`);   // finos avermelhados
    blotches(A, s, 40, s * .05, s * .25, () => `rgba(118,112,108,${.06 + rnd() * .12})`);                                        // cimento aparente
    // trilhas de passagem (ao longo de x): faixa compactada mais lisa e um pouco mais clara, com marcas de pneu/bota
    for (let i = 0; i < 9; i++) {
      const y = rnd() * s, w = s * (.025 + rnd() * .04), lite = rnd() < .6;
      for (let k = 0; k < 40; k++) {
        const yy = y + (rnd() - .5) * w, ww = .8 + rnd() * 3 * s / 1024, a = .03 + rnd() * .07;
        A.fillStyle = lite ? `rgba(128,118,112,${a})` : `rgba(32,24,22,${a})`; A.fillRect(0, yy, s, ww);
        R.fillStyle = orm(.66, 0, a * 2.5); R.fillRect(0, yy, s, ww);
      }
      const g = A.createLinearGradient(0, y - w, 0, y + w); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, lite ? 'rgba(120,110,104,.12)' : 'rgba(34,26,22,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); A.fillStyle = g; A.fillRect(0, y - w, s, w * 2);
      const gr = R.createLinearGradient(0, y - w, 0, y + w); gr.addColorStop(0, orm(.75, 0, 0)); gr.addColorStop(.5, orm(.72, 0, .45)); gr.addColorStop(1, orm(.75, 0, 0)); R.fillStyle = gr; R.fillRect(0, y - w, s, w * 2);
    }
    // pontos úmidos/lama: escuros e lisos (reflexo fraco do ambiente)
    for (let i = 0; i < 14; i++) { const cx = rnd() * s, cy = rnd() * s; for (let k = 0; k < 6; k++) { const x0 = cx + (rnd() - .5) * s * .05, y0 = cy + (rnd() - .5) * s * .025, r = s * (.006 + rnd() * .018), p = shape(r); poly(A, x0, y0, p, 1, `rgba(34,24,20,${.25 + rnd() * .3})`); poly(R, x0, y0, p, .9, orm(.35 + rnd() * .2, 0, .8)); poly(H, x0, y0, p, 1, 'rgba(110,110,110,.5)'); } }
    // montinhos de finos (pó solto, relevo alto e muito fosco)
    for (let i = 0; i < 70; i++) { const cx = rnd() * s, cy = rnd() * s, r = s * (.004 + rnd() * .02); const g = H.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(200,200,200,.6)'); g.addColorStop(1, 'rgba(200,200,200,0)'); H.fillStyle = g; H.beginPath(); H.arc(cx, cy, r, 0, 6.3); H.fill(); const ga = A.createRadialGradient(cx, cy, 0, cx, cy, r); ga.addColorStop(0, 'rgba(100,66,52,.35)'); ga.addColorStop(1, 'rgba(100,66,52,0)'); A.fillStyle = ga; A.beginPath(); A.arc(cx, cy, r, 0, 6.3); A.fill(); R.fillStyle = orm(1, 0, .4); R.beginPath(); R.arc(cx, cy, r * .7, 0, 6.3); R.fill(); }
    // juntas de dilatação (2 por repetição em cada eixo) e trincas
    for (let i = 0; i <= 2; i++) { const p = i * s / 2; A.fillStyle = 'rgba(22,15,12,.6)'; A.fillRect(p - 2, 0, 4, s); A.fillRect(0, p - 2, s, 4); H.fillStyle = '#303030'; H.fillRect(p - 3, 0, 6, s); H.fillRect(0, p - 3, s, 6); R.fillStyle = orm(1, 0); R.fillRect(p - 3, 0, 6, s); R.fillRect(0, p - 3, s, 6); }
    for (let i = 0; i < 46; i++) { let px = rnd() * s, py = rnd() * s; const pts = [[px, py]]; for (let k = 0; k < 9; k++) { px += (rnd() - .5) * s * .03; py += (rnd() - .3) * s * .03; pts.push([px, py]); } const lw = (.7 + rnd()) * s / 1024; for (const [x, c] of [[A, `rgba(22,15,12,${.3 + rnd() * .3})`], [H, 'rgba(50,50,50,.8)']]) { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); pts.forEach(([a, b], j) => j ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); } }
    // pedriscos de minério soltos (relevo, metálicos em parte — hematita)
    for (let i = 0; i < s * 3; i++) { const px = rnd() * s, py = rnd() * s, r = (.6 + rnd() * rnd() * 3.5) * s / 1024; const met = rnd() < .3; A.fillStyle = met ? `rgba(${70 + rnd() * 20 | 0},${66 + rnd() * 18 | 0},${66 + rnd() * 18 | 0},.8)` : `rgba(${40 + rnd() * 50 | 0},${24 + rnd() * 22 | 0},${18 + rnd() * 14 | 0},${.5 + rnd() * .5})`; A.beginPath(); A.arc(px, py, r, 0, 6.3); A.fill(); H.fillStyle = 'rgba(220,220,220,.8)'; H.beginPath(); H.arc(px, py, r, 0, 6.3); H.fill(); if (met) { R.fillStyle = orm(.5, .6); R.beginPath(); R.arc(px, py, r, 0, 6.3); R.fill(); } }
    // ruído: manchas grandes de pó escuro × cimento claro + grão
    const nT = field(3, 5, .55), nF = field(32, 2);
    pixels(L, (i, x, y, a, hh, r) => {
      const t = L.sp(nT, x, y), f = L.sp(nF, x, y), k = .78 + .44 * t, g = (rnd() - .5) * 14;
      a[i] = a[i] * k + g; a[i + 1] = a[i + 1] * k + g * .95; a[i + 2] = a[i + 2] * (k * .98) + g * .95;
      hh[i] = hh[i + 1] = hh[i + 2] = hh[i] + (f - .5) * 30 + (rnd() - .5) * 18;
      r[i + 1] = Math.min(255, r[i + 1] + (rnd() - .5) * 14 + (t - .5) * 20);
    });
    speckle(A, s, s * 10, .3, '28,20,16'); speckle(A, s, s * 4, .2, '160,150,142');
    const T = finish(L, { repeat: [12, 6], nStr: 2.4 });
    M.floor = grime(std({ map: T.map, roughnessMap: T.orm, normalMap: T.nrm, normalScale: new THREE.Vector2(.7, .7), roughness: 1, metalness: 0, metalnessMap: T.orm }), { tri: 0, dust: .2, edge: 0, grime: 0, macro: .22, dustCol: '#56423a' });
    M.floor.metalness = 1;   // metalicidade vem do mapa (só os pedriscos de hematita)
  }

  // ---- concreto (lajes, bases): cinza manchado de minério, bolhas, escorridos; triplanar 1 repetição / 3 m
  const concT = (() => {
    const s = MID, L = layers(s, HI), { A, H, R } = L;
    A.fillStyle = '#76706b'; A.fillRect(0, 0, s, s); if (R) { R.fillStyle = orm(.92, 0); R.fillRect(0, 0, s, s); }
    blotches(A, s, 60, s * .03, s * .25, () => `rgba(${100 + rnd() * 26 | 0},${60 + rnd() * 16 | 0},${44 + rnd() * 10 | 0},${.1 + rnd() * .25})`);
    blotches(A, s, 30, s * .02, s * .1, () => `rgba(48,34,28,${.15 + rnd() * .3})`);
    if (R) blotches(R, s, 30, s * .03, s * .15, () => orm(.75 + rnd() * .25, 0, .4));
    dripsL(L, 120, '74,42,30', .3);
    // bolhas da concretagem (furinhos afundados) e lascas de quina
    for (let i = 0; i < 260; i++) { const px = rnd() * s, py = rnd() * s, r = (.6 + rnd() * 2.2) * s / 1024; A.fillStyle = `rgba(36,28,24,${.3 + rnd() * .4})`; A.beginPath(); A.arc(px, py, r, 0, 6.3); A.fill(); if (H) { H.fillStyle = '#383838'; H.beginPath(); H.arc(px, py, r, 0, 6.3); H.fill(); } }
    const nT = field(3, 5, .55);
    pixels(L, (i, x, y, a, hh, r) => { const t = L.sp(nT, x, y), k = .86 + .28 * t, g = (rnd() - .5) * 16; a[i] = a[i] * k + g; a[i + 1] = a[i + 1] * k + g; a[i + 2] = a[i + 2] * k + g; if (hh) hh[i] = hh[i + 1] = hh[i + 2] = hh[i] + (t - .5) * 50 + (rnd() - .5) * 26; });
    speckle(A, s, s * 8, .3, '40,30,24'); speckle(A, s, s * 3, .25, '180,172,165');
    return finish(L, { nStr: 2 });
  })();
  M.concrete = grime(pm(concT, { r: .93, m: 0, ns: .7 }), { tri: 1 / 3, dust: .7, edge: .5, grime: .6, macro: .16, dustCol: '#5c4236' });
  M.plinth = grime(pm(concT, { r: .95, m: 0, ns: .7 }, { color: 0xb09888 }), { tri: 1 / 2.5, dust: .8, edge: .6, grime: .8, dustCol: '#5a3e32' });

  // ---- ESTRUTURA METÁLICA: tinta cinza-bege gasta + ferrugem dessaturada + pó de minério (não laranja/madeira)
  const steelT = paint(MID, { base: '#7a6c62', dust: 1.4, rust: 1.2, drip: 1.2, scratch: 1, chip: 1, r: .7, m: .35, rustRGB: '98,56,38' });
  M.steel = grime(pm(steelT, steelT.o), { tri: 1 / 2.2, dust: .95, edge: 1, grime: .7, dustCol: '#7a4632' });
  const steelDkT = paint(TINY, { base: '#5b4a40', dust: 1.2, rust: 1.6, drip: 1, scratch: .7, chip: 1, r: .75, m: .3, rustRGB: '92,52,34' });
  M.steelDk = grime(pm(steelDkT, steelDkT.o), { tri: 1 / 2, dust: .9, edge: .9, grime: .6, dustCol: '#72402c' });
  // chutes/caixas: aço marrom-ferrugem escuro, muito sujo, borda polida pelo minério
  const chuteT = paint(MID, { base: '#5a3a2a', dust: 1.6, rust: 2.2, drip: 2, scratch: .9, chip: 1.4, bare: .7, chipRust: .35, r: .8, m: .3, rustRGB: '88,48,30' });
  M.chute = grime(pm(chuteT, chuteT.o), { tri: 1 / 2, dust: 1, edge: .9, grime: .8, dustCol: '#6a3a28' });
  // chapas cinza-claras das peneiras e cinzas gerais
  const greyT = paint(MID, { base: '#a39e98', dust: 1.3, rust: .5, drip: 1.6, scratch: 1.2, chip: .8, r: .6, m: .4, dustRGB: '130,72,44', rustRGB: '108,62,40' });
  M.grey = grime(pm(greyT, greyT.o), { tri: 1 / 1.6, dust: .9, edge: 1, grime: .9, dustCol: '#7e4a32' });
  const greyDkT = paint(TINY, { base: '#4f5354', dust: .8, rust: .6, drip: .8, scratch: .8, chip: .7, r: .55, m: .5 });
  M.greyDk = grime(pm(greyDkT, greyDkT.o), { tri: 1, dust: .7, edge: .8, grime: .4 });
  // amarelo de segurança gasto (guarda-corpos, proteções): pó marrom, lascas mostrando primer/metal/ferrugem
  const yelT = paint(MID, { base: '#d8a419', dust: 1.1, rust: .5, drip: 1, scratch: 1.4, chip: 2.4, chipR: .009, bare: .35, chipRust: .55, rimRGB: '70,50,20', scratchRGB: '90,80,70', mScr: false, grain: 8, r: .58, m: .1, rustRGB: '110,64,36' });
  M.yellow = grime(pm(yelT, yelT.o), { tri: 1 / 1.2, dust: .8, edge: .9, grime: .6, dustCol: '#8a5536' });
  M.yellowClean = grime(pm(yelT, { r: .52, m: .05, ns: .6 }, { color: 0xfff0d0 }), { tri: 1, dust: .4, edge: .8, grime: .3 });
  // bege dos britadores (carcaça bege-esverdeada clara muito suja de minério escorrido — foto 1)
  const beigeT = paint(MID, { base: '#c9c4a8', dust: 1.6, rust: .7, drip: 3, scratch: 1, chip: 1.2, dripRGB: '84,44,26', dustRGB: '120,64,38', r: .58, m: .2, rustRGB: '104,58,36' });
  M.beige = grime(pm(beigeT, beigeT.o), { tri: 1 / 1.5, dust: 1, edge: .9, grime: 1, dustCol: '#6c3b28' });
  // amarelo de britador desgastado (HP 400 da foto b)
  const hpT = paint(TINY, { base: '#d39c1c', dust: 1.6, rust: .8, drip: 2.4, scratch: 1.2, chip: 1.6, dripRGB: '84,44,26', r: .56, m: .15 });
  M.hp = grime(pm(hpT, hpT.o), { tri: 1 / 1.5, dust: 1, edge: .9, grime: 1, dustCol: '#6c3b28' });
  const orT = paint(TINY, { base: '#b5652a', dust: 1.2, rust: 1.5, drip: 1.5, scratch: 1, r: .62, m: .3 });
  M.orange = grime(pm(orT, orT.o), { tri: 1, dust: .9, edge: .9, grime: .8 });
  // coroa dentada enferrujada
  const rustT = paint(TINY, { base: '#6b3d26', dust: 1, rust: 3, drip: 1, scratch: .3, chip: .4, r: .85, m: .45 });
  M.rust = grime(pm(rustT, rustT.o), { tri: 2, dust: .8, edge: 1, grime: .4 });
  // borracha (bicas/revestimentos): preta fosca, sem lascas metálicas
  const rubT = paint(TINY, { base: '#252322', dust: 1, rust: 0, drip: 1, scratch: .3, chip: 0, scratchRGB: '90,80,70', mScr: false, r: .92, m: 0, nStr: 1.2 });
  M.rubber = grime(pm(rubT, rubT.o), { tri: 1, dust: .9, edge: .3, grime: .6 });
  // poliuretano dos painéis da tela: cinza, com finos de minério nos furos e nas bordas
  const puT = (() => {
    const s = MID, L = layers(s, HI), { A, H, R } = L;
    A.fillStyle = '#66625f'; A.fillRect(0, 0, s, s); if (R) { R.fillStyle = orm(.82, 0); R.fillRect(0, 0, s, s); }
    blotches(A, s, 70, s * .02, s * .14, () => `rgba(${84 + rnd() * 26 | 0},${58 + rnd() * 12 | 0},${46 + rnd() * 10 | 0},${.18 + rnd() * .3})`);
    if (R) blotches(R, s, 50, s * .02, s * .12, () => orm(.95, 0, .5));
    // desgaste do fluxo de minério (raspado, mais liso e claro) no sentido do escoamento
    for (let i = 0; i < 160; i++) { const px = rnd() * s, py = rnd() * s, len = s * (.03 + rnd() * .12), w = (1 + rnd() * 3) * s / 1024; A.fillStyle = `rgba(150,146,140,${.04 + rnd() * .08})`; A.fillRect(px, py, w, len); if (R) { R.fillStyle = orm(.6, 0, .4); R.fillRect(px, py, w, len); } if (H) { H.fillStyle = 'rgba(100,100,100,.4)'; H.fillRect(px, py, w, len); } }
    const nT = field(4, 4);
    pixels(L, (i, x, y, a, hh) => { const t = L.sp(nT, x, y), k = .85 + .3 * t, g = (rnd() - .5) * 18; a[i] = a[i] * k + g; a[i + 1] = a[i + 1] * k + g; a[i + 2] = a[i + 2] * k + g; if (hh) hh[i] = hh[i + 1] = hh[i + 2] = hh[i] + (rnd() - .5) * 30; });
    speckle(A, s, s * 20, .5, '35,25,20'); speckle(A, s, s * 8, .35, '150,140,130');
    return finish(L, { nStr: 1.5 });
  })();
  M.pu = grime(pm(puT, { r: .82, m: 0, ns: .6 }), { tri: 1 / 1.2, dust: .55, edge: .4, grime: .2, dustCol: '#55413a' });
  const beltT = paint(TINY, { base: '#1d1b1a', dust: 1.2, rust: 0, drip: .4, scratch: .4, chip: 0, mScr: false, r: .85, m: 0, nStr: 1 });
  M.belt = grime(pm(beltT, beltT.o), { tri: 1, dust: .8, edge: .2, grime: .3 });
  // minério (pedras): hematita/itabirito — marrom-avermelhado escuro a cinza metálico, com brilho especular de hematita
  const oreT = (() => {
    const s = SM, L = layers(s, HI), { A, H, R } = L;
    A.fillStyle = '#5e4a43'; A.fillRect(0, 0, s, s); if (R) { R.fillStyle = orm(.78, .2); R.fillRect(0, 0, s, s); }
    for (let i = 0; i < 120; i++) { const cx = rnd() * s, cy = rnd() * s, r = s * (.015 + rnd() * .07), p = shape(r), grey = rnd() < .45; poly(A, cx, cy, p, 1, grey ? `rgba(${78 + rnd() * 20 | 0},${74 + rnd() * 18 | 0},${76 + rnd() * 18 | 0},${.35 + rnd() * .4})` : `rgba(${104 + rnd() * 30 | 0},${54 + rnd() * 16 | 0},${36 + rnd() * 10 | 0},${.35 + rnd() * .4})`); if (R) poly(R, cx, cy, p, 1, grey ? orm(.5, .55, .6) : orm(.88, .1, .6)); if (H) { const v = rnd() < .5 ? 175 : 85; poly(H, cx, cy, p, 1, `rgba(${v},${v},${v},.4)`); } }
    if (H) { const nT = field(6, 5, .6); pixels(L, (i, x, y, a, hh) => { const t = L.sp(nT, x, y); hh[i] = hh[i + 1] = hh[i + 2] = 60 + t * 140 + (rnd() - .5) * 30; }); }
    // faíscas metálicas (cristais de hematita especular)
    for (let i = 0; i < s * 6; i++) { const px = rnd() * s, py = rnd() * s; A.fillStyle = `rgba(${120 + rnd() * 50 | 0},${118 + rnd() * 46 | 0},${120 + rnd() * 46 | 0},${.3 + rnd() * .4})`; A.fillRect(px, py, 1, 1); if (R) { R.fillStyle = orm(.3, .9); R.fillRect(px, py, 1, 1); } }
    speckle(A, s, s * 24, .6, '30,22,18'); grain(A, s, 26);
    return finish(L, { nStr: 3 });
  })();
  M.ore = grime(pm(oreT, { r: .78, m: .25, ns: 1 }), { tri: 3, dust: .3, edge: 0, grime: 0, macro: .2, dustCol: '#5a3020' });
  M.oreBed = grime(pm(oreT, { r: .95, m: .1, ns: .8 }, { color: 0x8c7468 }), { tri: 2.5, dust: .2, edge: 0, grime: 0, macro: .2, dustCol: '#5a3020' });
  const motorT = paint(TINY, { base: '#56606a', dust: 1, rust: .4, drip: 1, scratch: 1, r: .5, m: .5 });
  M.motor = grime(pm(motorT, motorT.o), { tri: 1.2, dust: .8, edge: .9, grime: .6 });
  const motorBT = paint(TINY, { base: '#2f5f9a', dust: 1.1, rust: .3, drip: 1, scratch: 1, r: .45, m: .35 });
  M.motorBlue = grime(pm(motorBT, motorBT.o), { tri: 1.2, dust: .8, edge: .9, grime: .6 });
  M.blue = std({ color: 0x2a6cc0, roughness: .4 });
  M.white = std({ color: 0xe9e7e2, roughness: .6 });
  M.black = std({ color: 0x151312, roughness: .7 });
  M.hose = std({ color: 0x121212, roughness: .45, metalness: 0 });
  M.glass = std({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 6, roughness: .2 });

  // ---- TELHAS trapezoidais: marrom-ferrugem escuras por dentro, verdes por fora (normal das nervuras)
  const ribH = canvasTex(SM, (x, s) => { const n = 32, p = s / n; x.fillStyle = '#404040'; x.fillRect(0, 0, s, s); for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * p, 0, i * p + p, 0); g.addColorStop(0, '#404040'); g.addColorStop(.15, '#d0d0d0'); g.addColorStop(.45, '#d0d0d0'); g.addColorStop(.6, '#404040'); g.addColorStop(1, '#404040'); x.fillStyle = g; x.fillRect(i * p, 0, p, s); } }, { srgb: false });
  const cladN = (rep) => normalFromHeight(ribH.userData.canvas, 6 * SM / 1024, rep);
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
  M.grate = grime(pm(chuteT, { r: .7, m: .5, ns: .6 }, { color: 0xb0a090, alphaMap: grate, alphaTest: .5, transparent: false, side: THREE.DoubleSide }), { tri: 1, dust: .7, edge: 0, grime: 0 });
  // proteção amarela PERFURADA do vibrador (furos oblongos em fileiras) — UV da caixa
  const perfMap = canvasTex(SM, (x, s) => {
    x.fillStyle = '#d6a21c'; x.fillRect(0, 0, s, s);
    blotches(x, s, 30, s * .05, s * .3, () => `rgba(120,64,36,${.1 + rnd() * .25})`);
    const nx = 12, ny = 7; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const cx = (i + .5 + (j % 2) * .5) * s / nx, cy = (j + .5) * s / ny; if (cx > s - 4) continue; x.fillStyle = '#1c130e'; x.beginPath(); x.ellipse(cx, cy, s / nx * .28, s / ny * .16, 0, 0, 6.3); x.fill(); }
    drips(x, s, 60, '84,44,26', .35);
    for (let i = 0; i < 60; i++) { const cx = rnd() * s, cy = rnd() * s, r = s * (.002 + rnd() * rnd() * .01); splat(x, cx, cy, r * 1.2, 'rgba(70,50,20,.3)'); splat(x, cx, cy, r, rnd() < .5 ? 'rgb(104,58,40)' : 'rgb(122,116,108)'); }
    for (let i = 0; i < 60; i++) { const px = rnd() * s, py = rnd() * s, L = 4 + rnd() * s * .05, a = rnd() * 6.28; x.strokeStyle = `rgba(90,80,70,${.15 + rnd() * .35})`; x.lineWidth = .5 + rnd(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
    grain(x, s, 10);
  });
  M.perf = grime(std({ map: perfMap, roughness: .55, metalness: .1 }), { tri: 0, dust: .8, edge: .9, grime: .4, dustCol: '#8a5233' });
  // tela (malha) das janelas da proteção de correias do HP 400
  const meshA = canvasTex(128, (x, s) => { x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.fillStyle = '#fff'; for (let i = 0; i < s; i += 8) { x.fillRect(i, 0, 2, s); x.fillRect(0, i, s, 2); } }, { repeat: [6, 4], srgb: false });
  M.wire = std({ color: 0x8a7a62, alphaMap: meshA, alphaTest: .5, roughness: .6, metalness: .6, side: THREE.DoubleSide });

  // texto das placas: reduz a fonte até caber na largura (nada cortado)
  const fit = (x, t, cx, y, maxW, size, w = 'bold') => { let s = size; do { x.font = `${w} ${s}px Arial`; s -= 1; } while (x.measureText(t).width > maxW && s > 8); x.fillText(t, cx, y); };
  const plate = (bg, fg, border, t1, t2) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 256); if (border) { x.strokeStyle = border; x.lineWidth = 9; x.strokeRect(8, 8, 496, 240); } x.fillStyle = fg; x.textAlign = 'center'; fit(x, t1, 256, 80, 456, 40); fit(x, t2, 256, 203, 466, 106);
    seed += 17; blotches(x, 512, 14, 20, 90, () => `rgba(120,64,36,${.06 + rnd() * .14})`, 256); drips(x, 512, 30, '90,50,30', .25, 256); speckle(x, 512, 3000, .25, '60,40,30', 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; TEX.push(t); return std({ map: t, roughness: .5 }); };
  M.plateY = (t1, t2) => plate('#f2c400', '#111', '#111', t1, t2);
  M.plateW = (t1, t2) => plate('#efeee8', '#111', '#222', t1, t2);
  M.plateB = (t1, t2) => plate('#1f5fb0', '#fff', null, t1, t2);
  M.label = (t1, t2, bg = '#c8501e', fg = '#fff') => plate(bg, fg, null, t1, t2);
  M.warn = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 256, 60); x.fillStyle = '#fff'; x.textAlign = 'center'; fit(x, 'ATENÇÃO - PERIGO', 128, 42, 236, 30); x.fillStyle = '#111'; ['Não olhe dentro da câmara', 'de britagem enquanto o', 'britador estiver', 'operando'].forEach((l, i) => fit(x, l, 128, 110 + i * 32, 232, 22, 'normal')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; TEX.push(t); return std({ map: t, roughness: .5 }); };
  return M;
}
