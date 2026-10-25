// Modo realista (padrão): texturas escaneadas de materiais reais (Poly Haven, CC0) + céu real de pedreira.
// Cada material ganha a sua receita (nada de "tudo avermelhado"):
//  · estrutura principal (pilares/vigas) em aço pintado cinza; secundária (contraventos, travessas, quadros) em cinza-escuro;
//  · grades de piso galvanizadas (metálicas, sem tinta); chapas cinza-claras das peneiras;
//  · amarelo de segurança gasto (guarda-corpos e escadas) com lascas e pontos de ferrugem da própria foto;
//  · piso de concreto com poças d'água e manchas de óleo (shader de mats.js); chutes e concreto seguem procedurais.
// A ferrugem fica só onde faz sentido: base das peças junto a cada piso e escorridos (uRust do shader de sujeira);
// o pó de minério continua acumulando nas faces de cima (uDust).
// Tinta: as fotos de tinta verde/azul gasta são recoloridas no navegador — só os pixels da cor da tinta mudam;
// ferrugem, arranhões e manchas (cores diferentes da tinta) ficam como na foto.
// Liga e desliga em tempo real: guarda mapas, cores, escalas de normal e parâmetros do shader originais para voltar
// exatamente ao visual padrão. As texturas só entram quando todas carregaram (sem material preto no meio da carga).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const base = 'tex/', KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'roughness', 'metalness'];
const GU = ['uTri', 'uDust', 'uGrime', 'uEdge', 'uMacro', 'uRust', 'uWet'];   // parâmetros do shader de sujeira que a receita pode trocar
// recoloração da tinta: [foto, cor-alvo da tinta (sRGB 0–255), contraste do detalhe, limiar de "não é tinta" (início, fim)]
const REC = {
  gmrN: ['green_metal_rust', [200, 200, 196], 1.5, .16, .38],    // tinta neutra (a cor final vem do material)
  gmrY: ['green_metal_rust', [226, 170, 28], 1.35, .16, .38],    // amarelo de segurança
  bmpN: ['blue_metal_plate', [196, 196, 194], 1.25, .28, .6],    // chapa pintada neutra (riscos de metal nu preservados)
};
// [material, foto (normal + ARM), difusa: 'd' = foto original | receita de REC, cor, opções]
// opções: rep (repetição no UV — só materiais sem triplanar), ns (escala da normal), r/m (multiplicadores de rugosidade/
// metalicidade sobre o ARM), metal (metalicidade fixa, sem mapa — galvanizado), e parâmetros do shader (uTri = repetições por metro…)
const PLAN = [
  ['floor', 'concrete_floor_worn_001', 'd', 0xd2ad96, { rep: [18, 6.75], ns: .8, uWet: 1 }],
  ['slab', 'concrete_floor_worn_001', 'd', 0xd8c0b0, { ns: .8, uWet: .45 }],
  ['steel', 'green_metal_rust', 'gmrN', 0x9c9d9a, { uTri: 1 / 1.2, ns: .9, uRust: .7, uEdge: 1 }],
  ['steelDk', 'blue_metal_plate', 'bmpN', 0x7c7f80, { uTri: 1 / 2.5, ns: .8, uRust: .55 }],
  ['grey', 'blue_metal_plate', 'bmpN', 0xcfcdc6, { uTri: 1 / 2.5, ns: .8, uRust: .3 }],
  ['grate', 'blue_metal_plate', 'bmpN', 0xb4b6b4, { uTri: 1 / 2.5, ns: .5, metal: .75, r: .85, uRust: .25 }],
  ['yellow', 'green_metal_rust', 'gmrY', 0xffffff, { uTri: 1 / 1.1, ns: .9, uRust: .45 }],
  ['orange', 'green_metal_rust', 'gmrY', 0xffb09a, { uTri: 1 / 1.1, ns: .9, uRust: .45 }],
];
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// troca a cor da tinta da foto pela cor-alvo, mantendo o detalhe (luminância relativa) e o que não é tinta
export function recolor(im, T, k, d0, d1) {
  const w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const id = x.getImageData(0, 0, w, h), D = id.data, lum = (i) => .3 * D[i] + .59 * D[i + 1] + .11 * D[i + 2] + .5;
  // cor média da tinta: média geral, depois só os pixels de cromaticidade próxima dela (tira ferrugem/arranhões da conta)
  let mr = 0, mg = 0, mb = 0, n = 0;
  for (let i = 0; i < D.length; i += 4) { mr += D[i]; mg += D[i + 1]; mb += D[i + 2]; n++; }
  mr /= n; mg /= n; mb /= n;
  for (let pass = 0; pass < 2; pass++) {
    const mL = .3 * mr + .59 * mg + .11 * mb + .5, cr = mr / mL, cg = mg / mL, cb = mb / mL; let ar = 0, ag = 0, ab = 0, an = 0;
    for (let i = 0; i < D.length; i += 16) { const L = lum(i); if (L < 20) continue; if (Math.hypot(D[i] / L - cr, D[i + 1] / L - cg, D[i + 2] / L - cb) < d0) { ar += D[i]; ag += D[i + 1]; ab += D[i + 2]; an++; } }
    if (an > 100) { mr = ar / an; mg = ag / an; mb = ab / an; }
  }
  const mL = .3 * mr + .59 * mg + .11 * mb + .5, cr = mr / mL, cg = mg / mL, cb = mb / mL;
  for (let i = 0; i < D.length; i += 4) {
    const r = D[i], g = D[i + 1], b = D[i + 2], L = lum(i);
    const p = 1 - sst(d0, d1, Math.hypot(r / L - cr, g / L - cg, b / L - cb)) * sst(14, 40, L);   // 1 = tinta
    const q = Math.max(.05, 1 + (L / mL - 1) * k);
    D[i] = r + (T[0] * q - r) * p; D[i + 1] = g + (T[1] * q - g) * p; D[i + 2] = b + (T[2] * q - b) * p;
  }
  x.putImageData(id, 0, 0);
  return c;
}

let ctx = null;
function prep(scene, M, renderer) {
  if (ctx) return ctx;
  const an = Math.min(8, renderer.capabilities.getMaxAnisotropy()), imgs = {}, texs = {};
  const img = (f) => imgs[f] || (imgs[f] = new Promise((ok, no) => new THREE.ImageLoader().load(base + f, ok, undefined, no)));
  const mk = (src, srgb) => { const t = new THREE.Texture(src); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = an; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  const tex = (f, srgb) => texs[f] || (texs[f] = img(f).then((im) => mk(im, srgb)));
  const recs = {};
  const rec = (id) => recs[id] || (recs[id] = (async () => { const [a, T, k, d0, d1] = REC[id], im = await img(a + '_diff_1k.jpg'); await new Promise((r) => setTimeout(r, 0)); return mk(recolor(im, T, k, d0, d1), true); })());
  // estado original de cada material (para voltar exatamente)
  const orig = PLAN.filter(([k]) => M[k]).map(([k, a, dif, col, o]) => {
    const m = M[k], U = (m.userData && m.userData.grime) || {}, s = { m, k, a, dif, col, o, color: m.color.clone(), ns: m.normalScale && m.normalScale.clone(), U, u: {} };
    KEYS.forEach((q) => (s[q] = m[q])); GU.forEach((q) => { if (U[q]) s.u[q] = U[q].value; });
    return s;
  });
  const dome = scene.getObjectByName('sky');
  ctx = { orig, dome, domeMap: dome && dome.material.map, domeCol: dome && dome.material.color.clone(), sky: null, on: false };
  // carrega tudo (cada material independente: se uma foto falhar, só aquele material fica no visual padrão)
  ctx.ready = Promise.all(orig.map(async (s) => {
    try {
      const rep = s.o.rep, cl = (t) => { if (!rep) return t; const c = t.clone(); c.repeat.set(...rep); c.needsUpdate = true; return c; };
      const [nor, arm, map] = await Promise.all([tex(s.a + '_nor_1k.jpg'), tex(s.a + '_arm_1k.jpg'), s.dif === 'd' ? tex(s.a + '_diff_1k.jpg', true) : s.dif ? rec(s.dif) : null]);
      const A = cl(arm);
      s.real = { normalMap: cl(nor), roughnessMap: A, metalnessMap: s.o.metal != null ? null : A, roughness: s.o.r ?? 1, metalness: s.o.metal ?? s.o.m ?? 1 };
      if (map) s.real.map = cl(map);
    } catch (e) { console.warn('modo realista: textura não carregou', s.k, e); }
  }));
  /* céu de pedreira: o HDR vira uma imagem comum (tons comprimidos) aplicada na cúpula do céu */
  new RGBELoader().setDataType(THREE.FloatType).load(base + 'quarry_01_puresky_1k.hdr', (h) => {
    const w = h.image.width, H = h.image.height, D = h.image.data, c = document.createElement('canvas'); c.width = w; c.height = H; const x = c.getContext('2d'), im = x.createImageData(w, H);
    for (let p = 0, q = 0; p < w * H; p++, q += 4) { for (let k = 0; k < 3; k++) { let v = D[p * 4 + k] * 1.3; v = v / (1 + v); im.data[q + k] = Math.min(255, Math.pow(v, 1 / 2.2) * 255); } im.data[q + 3] = 255; }
    x.putImageData(im, 0, 0); ctx.sky = new THREE.CanvasTexture(c); ctx.sky.colorSpace = THREE.SRGBColorSpace; h.dispose(); if (ctx.on) setDome(true); });
  return ctx;
}
function setDome(on) { const d = ctx.dome; if (!d) return; if (on && ctx.sky) { d.material.map = ctx.sky; d.material.color.setScalar(1.25); } else { d.material.map = ctx.domeMap; d.material.color.copy(ctx.domeCol); } d.material.needsUpdate = true; }
function apply(on) {
  for (const s of ctx.orig) {
    const m = s.m;
    if (on && s.real) {
      Object.assign(m, s.real); m.color.set(s.col);
      if (s.ns && s.o.ns != null) m.normalScale.set(s.o.ns, s.o.ns);
      GU.forEach((q) => { if (s.o[q] != null && s.U[q]) s.U[q].value = s.o[q]; });
    } else {
      KEYS.forEach((q) => (m[q] = s[q])); m.color.copy(s.color); if (s.ns) m.normalScale.copy(s.ns);
      GU.forEach((q) => { if (q in s.u) s.U[q].value = s.u[q]; });
    }
    m.needsUpdate = true;
  }
}
export function setReal(scene, M, renderer, on) {
  prep(scene, M, renderer); ctx.on = on;
  setDome(on);
  return ctx.ready.then(() => apply(ctx.on));
}
