// Britagem primária: 2 britadores cônicos HP 400 (fotos 98/103 e foto1): bloco de concreto baixo, base metálica soldada com
// furos redondos e oblongos, carcaça principal bege-esverdeada muito suja de minério escorrido, flange marrom de lama com
// orelhas, 8 cilindros de alívio com acumuladores, anel de ajuste com faixa laranja "HP 400", coroa dentada enferrujada,
// funil laranja-ocre, motor hidráulico de ajuste com proteção amarela e etiqueta de perigo, mangueiras pretas, contraeixo
// com polia e proteção de correias amarela inclinada (janelas de tela) até o motor elétrico.
// Britagem secundária: 3 Barmac VSI (foto2): bloco de concreto, base metálica marrom-ferrugem com vigas, montantes,
// prateleira e mãos-francesas, coxins, tambor bege com friso marrom e tampa cônica, motores verticais aletados com cúpula
// sobre bases trapezoidais com etiquetas amarelas, placa "BRITADOR SECUNDÁRIO".
// Silos de alimentação acima de cada britador; correias de retorno às peneiras (circuito fechado).
import * as THREE from 'three';
import { CRUSHERS, B, CAMS } from './layout.js?v=20261010011650';
import { V, sh, box, cyl, beam, railing, plateMesh, flatU } from './util.js?v=20261010011650';

const TAU = Math.PI * 2;
let sdC = 11; const rrC = () => ((sdC = (sdC * 16807) % 2147483647) / 2147483647);

// ---------- texturas locais (canvas) ----------
function cvs(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function blotC(x, w, h, n, r0, r1, col) {
  for (let i = 0; i < n; i++) { const r = r0 + rrC() * (r1 - r0), cx = rrC() * w, cy = rrC() * h, c = col(); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
}
// escorrido: filete que nasce opaco e afina/clareia para baixo, com leve ondulação e gota na ponta
function runs(x, w, h, n, rgb, y0a, y0b, la, lb, a0, wa, wb) {
  for (let i = 0; i < n; i++) {
    let px = rrC() * w; const y0 = h * (y0a + rrC() * (y0b - y0a)), L = h * (la + rrC() * (lb - la)), ww = wa + rrC() * (wb - wa), a = a0 * (.4 + rrC() * .6);
    for (let s = 0; s < L; s += 2) { const k = s / L; px += (rrC() - .5) * .7; x.fillStyle = `rgba(${rgb},${a * (1 - k * .85)})`; x.fillRect(px - ww * (1 - k * .6) / 2, y0 + s, ww * (1 - k * .6), 2.4); }
    if (rrC() < .4) { x.fillStyle = `rgba(${rgb},${a * .7})`; x.beginPath(); x.arc(px, y0 + L, ww * .5, 0, TAU); x.fill(); }
  }
}
function spk(x, w, h, n, rgb, a) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${rgb},${a * rrC()})`; const s = 1 + rrC() * 2.2; x.fillRect(rrC() * w, rrC() * h, s, s); } }
function scr(x, w, h, n, rgb) { for (let i = 0; i < n; i++) { const px = rrC() * w, py = rrC() * h, L = 4 + rrC() * 30, a = rrC() * TAU; x.strokeStyle = `rgba(${rgb},${.15 + rrC() * .35})`; x.lineWidth = .6 + rrC(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); } }
function grn(x, w, h, amp) { const id = x.getImageData(0, 0, w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rrC() - .5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n * .9; } x.putImageData(id, 0, 0); }
// chapa pintada suja (UV do cilindro: u em volta, v de baixo para cima → topo do canvas = topo da peça)
function dirtyPaint(w, h, o) {
  return cvs(w, h, (x) => {
    x.fillStyle = o.base; x.fillRect(0, 0, w, h);
    blotC(x, w, h, 60, h * .1, h * .7, () => `rgba(255,252,240,${.03 + rrC() * .06})`);
    blotC(x, w, h, 70, h * .05, h * .5, () => `rgba(${o.dirt},${.05 + rrC() * .14})`);
    if (o.topBand) { const g = x.createLinearGradient(0, 0, 0, h * o.topBand); g.addColorStop(0, `rgba(${o.mud},.92)`); g.addColorStop(.6, `rgba(${o.mud},.55)`); g.addColorStop(1, `rgba(${o.mud},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h * o.topBand); }
    runs(x, w, h, o.runs, o.mud, 0, o.runY ?? .15, .15, .95, .8, 1.5, 7);
    runs(x, w, h, o.runs * .6, o.dirt, 0, .7, .05, .4, .45, 1, 3);
    if (o.bottom) { const g = x.createLinearGradient(0, h, 0, h * (1 - o.bottom)); g.addColorStop(0, `rgba(${o.mud},.75)`); g.addColorStop(1, `rgba(${o.mud},0)`); x.fillStyle = g; x.fillRect(0, h * (1 - o.bottom), w, h * o.bottom); }
    for (let i = 0; i < (o.chips ?? 40); i++) { const cx = rrC() * w, cy = rrC() * h, r = 2 + rrC() * 9; x.fillStyle = `rgba(${o.mud},${.4 + rrC() * .5})`; x.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU, q = r * (.5 + rrC() * .7); k ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + q, cy); } x.fill(); }
    scr(x, w, h, 260, o.scratch || '235,230,215'); spk(x, w, h, w * 6, '50,30,20', .35); spk(x, w, h, w * 2, '240,236,220', .25); grn(x, w, h, 12);
  });
}

// ---------- geometria auxiliar ----------
const flatUV = (gm) => { const u = gm.attributes.uv; if (u) for (let i = 0; i < u.count; i++) u.setXY(i, .5, .5); return gm; };
const GC = new Map();
// caixa chanfrada (chanfro real que pega luz) — geometria em cache por medida
function cboxGeo(w, h, d, b) {
  const k = [w, h, d, b].map((v) => v.toFixed(3)).join('|'); if (GC.has(k)) return GC.get(k);
  b = Math.min(b, w / 3, h / 3, d / 3); const s = new THREE.Shape(); s.moveTo(-w / 2 + b, -d / 2 + b); s.lineTo(w / 2 - b, -d / 2 + b); s.lineTo(w / 2 - b, d / 2 - b); s.lineTo(-w / 2 + b, d / 2 - b); s.closePath();
  const gm = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  gm.rotateX(-Math.PI / 2); gm.translate(0, -(h - 2 * b) / 2, 0); flatUV(gm); gm.computeVertexNormals(); GC.set(k, gm); return gm;
}
function cbox(p, w, h, d, mat, x, y, z, b = .025, ry = 0) { const m = sh(new THREE.Mesh(cboxGeo(w, h, d, b), mat)); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; }
function lathe(p, pts, mat, seg = 48, keepU = false) { const gm = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); if (!keepU) flatU(gm); const m = sh(new THREE.Mesh(gm, mat)); p.add(m); return m; }
function extr(shape, depth, bev = 0) { const gm = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 24 }); gm.translate(0, 0, -depth / 2); return flatUV(gm); }
const circ = (cx, cy, r, cw = false) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, TAU, cw); return p; };
function slot(cx, cy, w, h) { const p = new THREE.Path(), r = Math.min(w, h) / 2; if (w >= h) { p.absarc(cx - w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5, false); p.absarc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2, false); } else { p.absarc(cx, cy - h / 2 + r, r, Math.PI, TAU, false); p.absarc(cx, cy + h / 2 - r, r, 0, Math.PI, false); } p.closePath(); return p; }
// chapa com furos (círculos e oblongos): no plano XY, espessura em Z
function holedPlate(w, h, holes, t) { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); s.holes.push(...holes); return extr(s, t, .004); }
// envoltória convexa de círculos (proteção de correias)
function hullShape(cs, inset = 0) {
  const P = []; for (const [cx, cy, r] of cs) for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; P.push([cx + Math.cos(a) * (r - inset), cy + Math.sin(a) * (r - inset)]); }
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1)); const s = new THREE.Shape(); H.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b))); s.closePath(); return s;
}
function gearGeo(N, rTip, rRoot, rIn, th) {
  const s = new THREE.Shape(), p = TAU / N; let first = true;
  for (let i = 0; i < N; i++) { const a0 = i * p; for (const [f, r] of [[0, rRoot], [.34, rRoot], [.46, rTip], [.8, rTip], [.92, rRoot]]) { const a = a0 + f * p, X = Math.cos(a) * r, Y = Math.sin(a) * r; if (first) { s.moveTo(X, Y); first = false; } else s.lineTo(X, Y); } }
  s.closePath(); s.holes.push(circ(0, 0, rIn, true));
  const gm = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1, curveSegments: 64 });
  gm.rotateX(-Math.PI / 2); return flatUV(gm);
}
// polia em V (perfil com canais) ao longo de Y
function sheaveGeo(r, w, n) { const pts = [[0, -w / 2], [r * .3, -w / 2], [r * .3, -w / 2 + .01], [r, -w / 2 + .01]]; const pw = (w - .02) / n; for (let i = 0; i < n; i++) { const y0 = -w / 2 + .01 + i * pw; pts.push([r, y0 + pw * .15], [r * .86, y0 + pw * .5], [r, y0 + pw * .85]); } pts.push([r, w / 2 - .01], [r * .3, w / 2 - .01], [r * .3, w / 2], [0, w / 2]); return flatU(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 36)); }

export function buildCrushers(scene, M) {
  const g = new THREE.Group(); scene.add(g);
  const spin = [], beacons = {}, hot = [], streams = [], belts = [], rings = [];
  const rockGeo = new THREE.DodecahedronGeometry(.09); const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3();
  const stream = (tag, x, z, y0, y1) => { const n = 46, im = new THREE.InstancedMesh(rockGeo, M.ore, n); g.add(im); streams.push({ tag, im, x, z, y0, y1, d: Array.from({ length: n }, () => ({ u: Math.random(), x: (Math.random() - .5) * .45, z: (Math.random() - .5) * .45 })) }); };
  const bc = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5ff0ff, emissive: 0x5ff0ff, emissiveIntensity: 4 })); m.userData.keep = true; return m; };

  // ---- materiais locais (clonam o shader de sujeira do material base)
  const tint = (base, rgb, o = {}) => { const m = base.clone(); m.onBeforeCompile = base.onBeforeCompile; if (Object.prototype.hasOwnProperty.call(base, 'customProgramCacheKey')) m.customProgramCacheKey = base.customProgramCacheKey; if (rgb) m.color.setRGB(...rgb); Object.assign(m, o); return m; };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // como tint, mas com parâmetros próprios do shader de sujeira (uDust, uGrime, uEdge, uMacro, uDustCol)
  const gUni = (s, gp) => { for (const [k, v] of Object.entries(gp)) s.uniforms[k] = { value: k === 'uDustCol' ? new THREE.Color(v) : v }; };
  const tintG = (base, rgb, gp = {}, o = {}) => { const m = tint(base, rgb, o); const ob = base.onBeforeCompile; if (base.userData && base.userData.grime) m.onBeforeCompile = (s, r) => { ob(s, r); gUni(s, gp); }; return m; };
  // sujeira em modo UV (sem triplanar) para materiais com textura própria mapeada no UV
  const uvBase = [M.cladIn, M.cladOut, M.floor].find((m) => m && m.userData && m.userData.grime && !(m.userData.grime.uTri.value > 0));
  const grimeUV = (mat, gp = {}) => { if (!uvBase) return mat; const ob = uvBase.onBeforeCompile; mat.onBeforeCompile = (s, r) => { ob(s, r); gUni(s, gp); }; mat.customProgramCacheKey = uvBase.customProgramCacheKey; return mat; };
  const mBeige = tint(M.beige, [.97, 1, .93]);                                       // bege-esverdeado claro (HP 400)
  const mMud = tint(M.chute, [1.05, 1, .98]);                                        // flange/orelhas cobertas de lama de minério
  const mBase = tint(M.orange, [.98, .78, .66]);                                     // base soldada laranja-ferrugem (foto 103)
  const mHop = tint(M.hp || M.orange, [1.02, .74, .82]);                             // funil/anel superior laranja-ocre
  const mGear = tint(M.rust, [1.45, 1.22, 1.05]);                                    // coroa dentada enferrujada
  const mHmot = tint(M.motor, [.95, 1.08, .95]);                                     // motor hidráulico cinza-esverdeado
  const mChrome = std({ color: 0xb9b6ae, roughness: .25, metalness: 1 });
  const mBolt = tint(M.beige, [.8, .78, .7]), mBoltDk = M.greyDk;
  const mShell = std({ map: dirtyPaint(2048, 384, { base: '#c6c7ad', dirt: '120,70,45', mud: '86,50,34', topBand: .22, runs: 260, runY: .1, bottom: .25, chips: 70 }), roughness: .62, metalness: .12 });
  const mRing = std({ map: dirtyPaint(2048, 256, { base: '#cdcdb4', dirt: '110,66,44', mud: '96,58,40', runs: 120, runY: .05, bottom: .12, chips: 50 }), roughness: .6, metalness: .12 });
  const mDrum = std({ map: dirtyPaint(2048, 512, { base: '#d9cfbb', dirt: '140,90,66', mud: '120,74,52', topBand: .06, runs: 70, runY: .04, bottom: .18, chips: 30, scratch: '120,100,90' }), roughness: .55, metalness: .1 });
  const mMotDk = tint(M.greyDk || M.motor, [.8, .8, .8]);
  const bandTex = cvs(1024, 176, (x, w, h) => {
    x.fillStyle = '#cc5a1d'; x.fillRect(0, 0, w, h); blotC(x, w, h, 26, 20, 120, () => `rgba(90,40,20,${.08 + rrC() * .2})`);
    x.fillStyle = '#f4efe6'; x.font = 'italic bold 142px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('HP 400', w / 2, h / 2 + 6);
    runs(x, w, h, 50, '80,44,28', 0, .3, .2, .9, .6, 1, 4); scr(x, w, h, 120, '230,210,190'); spk(x, w, h, 4000, '60,30,20', .3); grn(x, w, h, 10);
  });
  const mBand = std({ map: bandTex, roughness: .55, metalness: .1 });
  const yLabel = (lines, bg = '#f2c400') => std({ roughness: .5, map: cvs(256, 192, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 34px Arial'; x.fillText(lines[0], w / 2, 50, w - 24); x.font = '20px Arial'; lines.slice(1).forEach((l, i) => x.fillText(l, w / 2, 86 + i * 26, w - 24)); blotC(x, w, h, 10, 20, 70, () => `rgba(110,60,30,${.1 + rrC() * .2})`); spk(x, w, h, 1500, '60,40,30', .3); }) });
  const mLblA = yLabel(['ATENÇÃO', 'Partes móveis', 'Não remover a', 'proteção']), mLblB = yLabel(['PERIGO', 'Alta tensão', 'Desligar antes de', 'intervir']);
  const mM2 = std({ roughness: .5, map: cvs(256, 96, (x, w, h) => { x.fillStyle = '#f2c400'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.font = 'bold 70px Arial'; x.textAlign = 'center'; x.fillText('M2', w / 2, 74); spk(x, w, h, 800, '60,40,30', .3); }) });
  const mWarn = M.warn();

  // ---- parafusos/porcas: InstancedMesh por (raiz, material)
  const nutGeo = new THREE.LatheGeometry([[0, 0], [1.45, 0], [1.45, .16], [1, .16], [1, 1], [.5, 1], [.5, 1.55], [.38, 1.62], [0, 1.62]].map(([a, b]) => new THREE.Vector2(a, b)), 6); flatU(nutGeo);
  const BL = new Map(); const UP = V(0, 1, 0), nv = new THREE.Vector3(), qq = new THREE.Quaternion();
  const bolt = (par, x, y, z, nx, ny, nz, s = .028, mat = mBolt, root = g) => { const k = root.uuid + mat.uuid; if (!BL.has(k)) BL.set(k, { root, mat, list: [] }); qq.setFromUnitVectors(UP, nv.set(nx, ny, nz).normalize()); BL.get(k).list.push({ par, m: new THREE.Matrix4().compose(V(x, y, z), qq.clone(), V(s, s * .9, s)) }); };
  const boltRing = (par, r, y, n, s, mat, a0 = 0, root = g, up = 1) => { for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU; bolt(par, Math.cos(a) * r, y, Math.sin(a) * r, 0, up, 0, s, mat, root); } };

  // grupo orientado: x local = direção radial do ângulo a (a medido de +x para +z), z local = tangente
  const radial = (par, a) => { const G = new THREE.Group(); G.rotation.y = -a; par.add(G); return G; };

  // ---- silos de alimentação: chapas calandradas com costuras e ferrugem escorrida (UV), cantoneiras de reforço,
  // nervuras verticais, cobertura cônica coberta de pó de minério, guarda-corpo circular e escada de marinheiro com gaiola
  const siloTex = cvs(1024, 512, (x, w, h) => {
    x.fillStyle = '#857264'; x.fillRect(0, 0, w, h);
    blotC(x, w, h, 80, 20, 170, () => `rgba(${118 + rrC() * 40 | 0},${64 + rrC() * 22 | 0},${40 + rrC() * 14 | 0},${.08 + rrC() * .2})`);    // manchas de ferrugem
    blotC(x, w, h, 40, 20, 120, () => `rgba(175,165,152,${.05 + rrC() * .1})`);                                                         // tinta desbotada
    for (let i = 0; i < 8; i++) { const px = (i + .5) / 8 * w; x.fillStyle = 'rgba(38,24,18,.6)'; x.fillRect(px - 1.5, 0, 3, h); x.fillStyle = 'rgba(214,196,176,.28)'; x.fillRect(px + 1.5, 0, 1.5, h); }   // costuras verticais
    for (let j = 1; j < 4; j++) { const py = j / 4 * h; x.fillStyle = 'rgba(38,24,18,.6)'; x.fillRect(0, py - 1.5, w, 3); x.fillStyle = 'rgba(214,196,176,.25)'; x.fillRect(0, py + 1.5, w, 1.5); }
    runs(x, w, h, 120, '104,50,26', 0, 1, .05, .45, .75, 1.5, 6);                 // ferrugem escorrida das costuras
    runs(x, w, h, 60, '70,40,28', 0, .3, .2, .8, .55, 2, 8);                       // lama de minério que transbordou
    { const gd = x.createLinearGradient(0, 0, 0, h * .18); gd.addColorStop(0, 'rgba(128,70,44,.7)'); gd.addColorStop(1, 'rgba(128,70,44,0)'); x.fillStyle = gd; x.fillRect(0, 0, w, h * .18); }
    { const gd = x.createLinearGradient(0, h, 0, h * .8); gd.addColorStop(0, 'rgba(96,52,34,.6)'); gd.addColorStop(1, 'rgba(96,52,34,0)'); x.fillStyle = gd; x.fillRect(0, h * .8, w, h * .2); }
    scr(x, w, h, 200, '200,185,165'); spk(x, w, h, 7000, '50,30,20', .35); spk(x, w, h, 2000, '220,200,180', .2); grn(x, w, h, 12);
  });
  siloTex.repeat.set(2, 1);
  const mSilo = grimeUV(std({ map: siloTex, roughness: .72, metalness: .3 }), { uDust: .9, uGrime: .6, uDustCol: '#6c3a26', uEdge: 0, uMacro: .16 });
  const mSiloRib = tintG(M.steelDk, null, { uDust: 1.3, uDustCol: '#74402a' });
  const mSiloRoof = tintG(M.steel, [.9, .82, .78], { uDust: 1.7, uGrime: .9, uDustCol: '#7a4430' });
  // escada de marinheiro com gaiola, encostada no costado (raio rr) do ângulo a, de y0 a y1 (coordenadas do pai)
  function ladderC(par, a, rS, y0, y1, yShell) {
    const L = radial(par, a), rr = rS + .3, hw = .22;
    for (const sz of [-hw, hw]) beam(L, V(rr, y0, sz), V(rr, y1, sz), .022, M.yellow, true);
    for (let y = y0 + .3; y < y1 - .05; y += .3) beam(L, V(rr, y, -hw), V(rr, y, hw), .013, M.steel, true);
    for (let y = Math.max(y0 + .8, yShell + .3); y < y1 - .5; y += 1.5) for (const sz of [-hw, hw]) beam(L, V(rr, y, sz), V(rS + .02, y, sz), .022, M.steelDk);
    const hoop = new THREE.TorusGeometry(.38, .013, 5, 18, Math.PI), hs = [];
    for (let y = y0 + 2.2; y <= y1 + .01; y += .75) { if (Math.abs(y - 2.4) < .25) continue; const m = sh(new THREE.Mesh(hoop, M.yellow)); m.rotation.order = 'YXZ'; m.rotation.set(Math.PI / 2, Math.PI / 2, 0); m.position.set(rr + .04, y, 0); L.add(m); hs.push(y); }
    if (hs.length > 1) for (const ang of [-1.2, -.6, 0, .6, 1.2]) beam(L, V(rr + .04 + Math.cos(ang) * .38, hs[0], Math.sin(ang) * .38), V(rr + .04 + Math.cos(ang) * .38, hs[hs.length - 1], Math.sin(ang) * .38), .012, M.yellow);
    return L;
  }
  function silo(x, z, r, yb, h, o = {}) {
    const s = new THREE.Group(); s.position.set(x, yb, z); g.add(s);
    const y0 = 2.2, yT = y0 + h;
    { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true), mSilo)); m.position.y = y0 + h / 2; s.add(m); }
    { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, .5, y0, 48, 1, true), mSilo)); m.position.y = y0 / 2; s.add(m); }
    cyl(s, .58, .58, .1, mSiloRib, 0, .05, 0, 24);                                      // flange de descarga
    for (let j = 0; j <= 4; j++) cyl(s, r + .05, r + .05, j ? .08 : .14, mSiloRib, 0, y0 + j * h / 4 + (j === 4 ? -.04 : 0), 0, 48);   // cantoneiras
    for (let k = 0; k < 16; k++) { const a = (k + .5) / 16 * TAU; box(s, .1, h, .07, mSiloRib, Math.sin(a) * (r + .035), y0 + h / 2, Math.cos(a) * (r + .035), a); }   // nervuras
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; const R = radial(s, a); const gs = sh(new THREE.Mesh(extr(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, .9), new THREE.Vector2(.55, .9)]), .03), mSiloRib)); gs.position.set(r - .55 + .02, y0 - .9, 0); R.add(gs); }
    // cobertura cônica com pó, boca de carga, boca de visita e respiro
    lathe(s, [[r + .07, yT - .02], [r + .07, yT + .05], [.62, yT + .5], [.62, yT + .53]], mSiloRoof, 48);
    cyl(s, .62, .62, .55, mSiloRib, 0, yT + .8, 0, 24); cyl(s, .7, .7, .05, mSiloRib, 0, yT + 1.07, 0, 24);
    { const R = radial(s, 2.4); cyl(R, .3, .3, .1, mSiloRib, r * .55, yT + .05 + (r + .07 - r * .55) / (r + .07 - .62) * .45, 0, 20); }
    { const R = radial(s, -.9); cyl(R, .1, .1, .5, mSiloRib, r * .6, yT + .6, 0, 12); cyl(R, .2, .1, .14, mSiloRib, r * .6, yT + .9, 0, 14); }
    for (let k = 0; k < 14; k++) { const a0 = k / 14 * TAU, a1 = (k + 1) / 14 * TAU, rr = r + .1; railing(s, V(Math.cos(a0) * rr, yT + .05, Math.sin(a0) * rr), V(Math.cos(a1) * rr, yT + .05, Math.sin(a1) * rr), M.yellow, 1.0); }
    // pernas (do piso ou do deck da sala dos britadores), mãos-francesas até o anel de apoio, travessas
    const legA = o.legA || [0, 1, 2, 3].map((k) => k * Math.PI / 2 + .78), lr = o.lr || r + 1.6, yL = (o.legY ?? 0) - yb;
    const LP = legA.map((a) => [Math.cos(a) * lr, Math.sin(a) * lr]);
    for (const [i, a] of legA.entries()) {
      const [lx, lz] = LP[i]; beam(s, V(lx, yL, lz), V(lx, yT, lz), .26, M.steelDk); beam(s, V(lx, 2.4, lz), V(Math.cos(a) * r, 2.4, Math.sin(a) * r), .18, M.steelDk);
      beam(s, V(lx, 1.2, lz), V(Math.cos(a) * (r - .1), 2.3, Math.sin(a) * (r - .1)), .1, M.steelDk);
      cbox(s, .5, .04, .5, M.steelDk, lx, yL + .02, lz, .008);
      for (const [ox, oz] of [[-.17, -.17], [.17, .17], [-.17, .17], [.17, -.17]]) bolt(s, lx + ox, yL + .04, lz + oz, 0, 1, 0, .022, M.steelDk);
    }
    for (let i = 0; i < LP.length; i++) { const p = LP[i], q = LP[(i + 1) % LP.length]; beam(s, V(p[0], 2.4, p[1]), V(q[0], 2.4, q[1]), .2, M.steelDk); }
    ladderC(s, o.ladA ?? Math.PI / 2, r + .05, o.ladY0 ?? yL, yT + 1.05, y0);
    return s;
  }
  const camA = (c, cam) => Math.atan2(cam.pos[2] - c.z, cam.pos[0] - c.x);

  // =====================================================================================================
  // ---- britagem primária: cônicos HP 400
  // =====================================================================================================
  const DRIVE = { '03BR001': [0, -1], '03BR002': [-Math.PI / 2, -1] };                // direção do contraeixo e lado do motor
  const PT = .42, BF = 1.2;                                                          // topo do bloco e topo da base metálica
  CRUSHERS.cones.forEach((c) => {
    const T = new THREE.Group(); T.position.set(c.x, 0, c.z); T.userData.pickTag = c.tag; g.add(T);
    const aF = camA(c, CAMS.britadores), aM = aF - Math.PI / 4;                       // frente (câmera) e motor de ajuste
    // bloco de concreto baixo, chanfrado, com chapas de assentamento e chumbadores
    cbox(T, 4.3, PT, 4.3, M.plinth, 0, PT / 2, 0, .05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [ox, oz] of [[0, 0], [-.9, 0], [0, -.9]]) {
      const px = sx * (1.62 + (ox ? 0 : 0)) + sx * ox, pz = sz * 1.62 + sz * oz; cbox(T, .46, .05, .46, M.steelDk, px, PT + .025, pz, .008);
      bolt(T, px - .15, PT + .05, pz - .15, 0, 1, 0, .03, M.steelDk); bolt(T, px + .15, PT + .05, pz + .15, 0, 1, 0, .03, M.steelDk);
    }
    // base metálica soldada (foto 103): mesas, almas com furos redondos, colunas-caixão com oblongos, interior escuro
    const bh = BF - PT - .1, by = PT + .05 + bh / 2;
    cbox(T, 3.72, .05, 3.72, mBase, 0, PT + .075, 0, .01); cbox(T, 3.66, .05, 3.66, mBase, 0, BF - .025, 0, .012);
    box(T, 3.1, bh - .02, 3.1, M.black, 0, by, 0);
    const web = holedPlate(3.4, bh, [circ(-.92, 0, .21), circ(.92, 0, .21)], .025);
    const colF = holedPlate(.44, bh, [0, 1, 2].flatMap((j) => [slot(-.1, (j - 1) * .17, .055, .1), slot(.1, (j - 1) * .17, .055, .1)]), .02);
    for (let k = 0; k < 4; k++) {
      const F = radial(T, k * Math.PI / 2); const wm = sh(new THREE.Mesh(web, mBase)); wm.position.set(1.68, by, 0); wm.rotation.y = Math.PI / 2; F.add(wm);
      for (const oz of [-1.45, 0, 1.45]) { const cm = sh(new THREE.Mesh(colF, mBase)); cm.position.set(1.8, by, oz); cm.rotation.y = Math.PI / 2; F.add(cm); for (const s2 of [-1, 1]) box(F, .12, bh, .02, mBase, 1.74, by, oz + s2 * .21); }
      for (const oz of [-.92, .92]) { const rg = new THREE.Mesh(new THREE.TorusGeometry(.215, .012, 6, 24), mBase); rg.position.set(1.695, by, oz); rg.rotation.y = Math.PI / 2; F.add(rg); }
      for (let j = 0; j < 9; j++) bolt(F, 1.72, BF, -1.6 + j * .4, 0, 1, 0, .026, M.steelDk);
    }
    // carcaça principal: flange inferior, corpo com lama escorrida, flange superior marrom com orelhas
    cyl(T, 1.42, 1.44, .1, mMud, 0, BF + .05, 0, 64); boltRing(T, 1.36, BF + .1, 28, .03, M.steelDk);
    { const gm = new THREE.CylinderGeometry(1.29, 1.17, .84, 72, 1, true); const m = sh(new THREE.Mesh(gm, mShell)); m.position.y = BF + .1 + .42; T.add(m); }
    cyl(T, 1.53, 1.5, .25, mMud, 0, 2.245, 0, 72);
    lathe(T, [[1.29, 1.93], [1.36, 2.04], [1.5, 2.12]], mMud, 72);              // transição com lama acumulada
    // 8 cilindros de alívio (tramp release) com acumuladores, porcas e hastes cromadas
    const cylA = [...Array(8)].map((_, k) => aM + Math.PI / 8 + k * Math.PI / 4);
    for (const a of cylA) {
      const R = radial(T, a);
      cbox(R, .62, .24, .4, mMud, 1.78, 2.245, 0, .03);                                // orelha do quadro principal
      cbox(R, .58, .42, .36, mBeige, 1.76, 2.6, 0, .03);                               // orelha do anel de ajuste
      cyl(R, .155, .155, .66, mBeige, 1.85, 1.69, 0, 24); cyl(R, .18, .18, .06, mMud, 1.85, 2.0, 0, 24); cyl(R, .175, .175, .07, mBeige, 1.85, 1.35, 0, 24);
      for (let j = 0; j < 3; j++) cyl(R, .162, .162, .015, mMud, 1.85, 1.5 + j * .16, 0, 24);   // anéis de lama
      cyl(R, .05, .05, .24, mChrome, 1.85, 1.2, 0, 12);
      const n1 = cyl(R, .12, .12, .1, mMud, 1.85, 2.42, 0, 6); n1.rotation.y = .3; cyl(R, .14, .14, .025, mMud, 1.85, 2.38, 0, 24);
      cyl(R, .05, .05, .2, mChrome, 1.85, 2.9, 0, 12); const n2 = cyl(R, .115, .115, .1, mBeige, 1.85, 2.86, 0, 6); n2.rotation.y = .2; cyl(R, .135, .135, .025, mBeige, 1.85, 2.82, 0, 24);
      cyl(R, .03, .03, .06, mChrome, 1.85, 3.0, 0, 8);
      // acumulador pendurado por cotovelo (foto 103)
      const tz = .32; beam(R, V(1.85, 1.86, .12), V(1.85, 1.86, tz), .03, M.steel, true); beam(R, V(1.85, 1.86, tz), V(1.85, 1.78, tz), .03, M.steel, true);
      const ac = lathe(R, [[0, 1.2], [.07, 1.205], [.11, 1.24], [.125, 1.3], [.125, 1.66], [.11, 1.72], [.06, 1.76], [.035, 1.77], [.035, 1.8], [0, 1.8]], mBeige, 28); ac.position.set(1.85, 0, tz);
      cyl(R, .016, .016, .06, mChrome, 1.85, 1.18, tz, 8);
      for (const oz of [-.12, .12]) bolt(R, 2.07, 2.6 + oz, oz * 1.2, 1, 0, 0, .024, mBolt);
    }
    { const tor = new THREE.Mesh(new THREE.TorusGeometry(1.56, .02, 6, 96), M.steel); tor.rotation.x = Math.PI / 2; tor.position.y = 1.92; sh(tor); T.add(tor); }   // anel de óleo dos cilindros
    for (const a of cylA) beam(T, V(Math.cos(a) * 1.57, 1.92, Math.sin(a) * 1.57), V(Math.cos(a) * 1.71, 1.92, Math.sin(a) * 1.71), .016, M.steel, true);
    // anel de ajuste: corpo, mesas, faixa laranja "HP 400", orelhas verticais com pino de graxa
    { const gm = new THREE.CylinderGeometry(1.5, 1.5, .44, 72, 1, true); const m = sh(new THREE.Mesh(gm, mRing)); m.position.y = 2.6; T.add(m); }
    cyl(T, 1.57, 1.57, .05, mBeige, 0, 2.395, 0, 72); cyl(T, 1.56, 1.56, .05, mBeige, 0, 2.815, 0, 72);
    { const span = 1.05, th0 = Math.PI / 2 - aF - span / 2; const m = new THREE.Mesh(new THREE.CylinderGeometry(1.506, 1.506, .3, 32, 1, true, th0, span), mBand); m.position.y = 2.6; T.add(m); }
    boltRing(T, 1.53, 2.84, 40, .024, mBolt, .05);
    for (const da of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const R = radial(T, aM + da); cbox(R, .1, .8, .26, mBeige, 1.6, 2.52, 0, .02); cbox(R, .16, .1, .3, mBeige, 1.56, 2.93, 0, .015);
      const pn = cyl(R, .045, .045, .07, mChrome, 1.6, 3.0, 0, 6); pn.rotation.y = .4; cyl(R, .06, .06, .02, mBeige, 1.6, 2.97, 0, 18);
      cbox(R, .06, .12, .2, mBeige, 1.66, 2.08, 0, .015);
    }
    // calota de ajuste (gira com o ajuste da APF): coroa dentada, corpo, funil laranja-ocre com minério
    const RG = new THREE.Group(); RG.userData.keep = true; T.add(RG);
    cyl(RG, 1.47, 1.47, .06, mBeige, 0, 2.87, 0, 72);
    { const gm = sh(new THREE.Mesh(gearGeo(96, 1.64, 1.55, 1.34, .16), mGear)); gm.position.y = 2.9; RG.add(gm); }
    lathe(RG, [[1.42, 3.06], [1.42, 3.08], [1.39, 3.28], [1.3, 3.32], [1.27, 3.34]], mBeige, 72);
    boltRing(RG, 1.47, 3.06, 32, .024, mBolt, 0, RG);
    lathe(RG, [[1.24, 3.33], [1.28, 3.37], [1.54, 3.72], [1.6, 3.73], [1.6, 3.8], [1.53, 3.8], [1.48, 3.76], [.58, 3.38], [.55, 3.3]], mHop, 72);
    lathe(RG, [[1.45, 3.71], [1.44, 3.7], [1.2, 3.58], [.8, 3.5], [.35, 3.56], [0, 3.58]], M.oreBed || M.ore, 48);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; const R = radial(RG, a); cbox(R, .3, .3, .05, mHop, 1.5, 3.55, 0, .01).rotation.z = -.9; }
    rings.push({ tag: c.tag, ring: RG });
    // motor hidráulico de ajuste: suporte bege, pinhão, proteção amarela, etiqueta de perigo, mangueiras pretas
    const MG = radial(T, aM);
    cbox(MG, .62, .46, .6, mBeige, 1.86, 2.62, 0, .03); cbox(MG, .44, .1, .7, mBeige, 1.74, 2.36, 0, .02);
    for (const s2 of [-1, 1]) { const gs = sh(new THREE.Mesh(extr(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, .42), new THREE.Vector2(.45, .42)]), .04), mBeige)); gs.position.set(1.55, 1.89, s2 * .27); MG.add(gs); }
    const pin = cyl(MG, .17, .17, .15, mGear, 1.76, 2.98, 0, 18); pin.userData.keep = true; spin.push({ tag: c.tag, o: pin, ax: 'y', w: .4 });
    cbox(MG, .6, .4, .72, M.yellow, 1.86, 3.1, 0, .02); cbox(MG, .3, .12, .72, M.yellow, 1.72, 3.36, 0, .02);
    const wn = new THREE.Mesh(new THREE.PlaneGeometry(.34, .28), mWarn); wn.position.set(2.175, 2.64, .05); wn.rotation.y = Math.PI / 2; MG.add(wn);
    for (const oz of [-.22, .22]) for (const oy of [2.45, 2.8]) bolt(MG, 2.17, oy, oz, 1, 0, 0, .026, mBolt);
    cyl(MG, .2, .2, .05, mHmot, 1.98, 2.3, 0, 24); cyl(MG, .16, .16, .3, mHmot, 1.98, 2.12, 0, 24); cyl(MG, .19, .19, .05, mHmot, 1.98, 1.96, 0, 24); cyl(MG, .12, .14, .14, mHmot, 1.98, 1.87, 0, 24);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; bolt(MG, 1.98 + Math.cos(a) * .17, 2.325, Math.sin(a) * .17, 0, 1, 0, .016, mBoltDk); }
    for (const [oz, ex] of [[-.06, 0], [.06, .25]]) {
      // mangueiras curtas do motor de ajuste até o bloco de válvulas preso na base (antes caíam soltas no piso)
      const pts = [V(1.98, 1.8, oz), V(2.03, 1.58, oz * 1.5), V(2.14, 1.38, oz + .12), V(2.22, 1.2, .3 + ex * .4)];
      const hm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .024, 8), M.hose); sh(hm); MG.add(hm);
      cyl(MG, .035, .035, .06, mChrome, 1.98, 1.79, oz, 6);
    }
    cbox(MG, .26, .22, .56, mHmot, 2.24, 1.08, .4, .02);   // bloco de válvulas hidráulicas
    // tubo vertical (lubrificação) com abraçadeiras
    beam(MG, V(2.3, PT, -.62), V(2.3, 6.8, -.62), .045, M.steel, true);
    for (const y of [1.4, 2.7, 4.0, 5.3]) { box(MG, .12, .05, .14, M.steelDk, 2.3, y, -.62); }
    plateMesh(T, M.plateW('BRITADOR PRIMÁRIO', c.tag), .62, Math.cos(aF) * 1.255, 1.62, Math.sin(aF) * 1.255, Math.PI / 2 - aF);
    // acionamento: contraeixo → polia → proteção de correias amarela inclinada (2 janelas de tela) → motor elétrico
    const [aD, sg] = DRIVE[c.tag] || [0, -1]; const DG = radial(T, aD), yS = 1.6, yM = .84, zM = sg * 2.45;
    beam(DG, V(1.05, yS, 0), V(2.05, yS, 0), .2, mMud, true); cyl(DG, .3, .3, .06, mMud, 1.42, yS, 0, 28).rotation.z = Math.PI / 2;
    cyl(DG, .27, .27, .2, mBeige, 1.86, yS, 0, 28).rotation.z = Math.PI / 2; cyl(DG, .05, .05, .3, mChrome, 2.06, yS, 0, 12).rotation.z = Math.PI / 2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; bolt(DG, 1.45, yS + Math.cos(a) * .25, Math.sin(a) * .25, 1, 0, 0, .02, M.steelDk); }
    beam(DG, V(1.86, BF, 0), V(1.86, yS - .2, 0), .14, mBase);
    const sv = new THREE.Mesh(sheaveGeo(.44, .2, 5), M.greyDk); sv.rotation.z = Math.PI / 2; sv.position.set(2.2, yS, 0); sv.userData.keep = true; sh(sv); DG.add(sv); spin.push({ tag: c.tag, o: sv, ax: 'x', w: 9 });
    const mv = new THREE.Mesh(sheaveGeo(.17, .2, 5), M.greyDk); mv.rotation.z = Math.PI / 2; mv.position.set(2.2, yM, zM); mv.userData.keep = true; sh(mv); DG.add(mv); spin.push({ tag: c.tag, o: mv, ax: 'x', w: 24 });
    // correias (trechos retos tangentes)
    for (const s2 of [-1, 1]) { const dz = zM, dy = yM - yS, L = Math.hypot(dz, dy), nz = -dy / L * s2, ny = dz / L * s2; beam(DG, V(2.2, yS + ny * .42, nz * .42), V(2.2, yM + ny * .16, zM + nz * .16), .05, M.belt || M.black); }
    const C2 = [[0, yS, .6], [zM, yM, .36]], gx = (o) => { o.rotation.y = -Math.PI / 2; return o; };
    const rim = sh(new THREE.Mesh((() => { const s0 = hullShape(C2); s0.holes.push(new THREE.Path(hullShape(C2, .035).getPoints().reverse())); return extr(s0, .34); })(), M.yellow)); gx(rim); rim.position.set(2.2, 0, 0); DG.add(rim);
    // mapeamento: shape (x = z local, y = y) — rotação -90° em y leva x→+z
    const face = (() => { const s0 = hullShape(C2); s0.holes.push(circ(0, yS, .46, true), circ(zM, yM, .24, true)); return extr(s0, .008); })();
    const fo = sh(new THREE.Mesh(face, M.yellow)); gx(fo); fo.position.set(2.37, 0, 0); DG.add(fo);
    const bk = sh(new THREE.Mesh(extr(hullShape(C2), .008), M.yellow)); gx(bk); bk.position.set(2.03, 0, 0); DG.add(bk);
    for (const [cz, cy, r] of [[0, yS, .46], [zM, yM, .24]]) { const wm = new THREE.Mesh(new THREE.CircleGeometry(r, 32), M.wire); wm.position.set(2.372, cy, cz); wm.rotation.y = Math.PI / 2; DG.add(wm); const fr = new THREE.Mesh(new THREE.TorusGeometry(r, .016, 6, 40), M.yellow); fr.position.set(2.375, cy, cz); fr.rotation.y = Math.PI / 2; sh(fr); DG.add(fr); }
    for (let k = 0; k < 10; k++) { const t = k / 9, a = t * TAU; bolt(DG, 2.37, yS + Math.cos(a) * .55, Math.sin(a) * .55, 1, 0, 0, .018, M.steelDk); }
    beam(DG, V(2.2, PT, zM * .45), V(2.2, (yS + yM) / 2 - .3, zM * .5), .07, M.yellow); beam(DG, V(2.2, 0, zM), V(2.2, yM - .3, zM), .07, M.yellow);
    // motor elétrico (TEFC aletado) sobre base deslizante e pedestal de concreto
    const mx0 = 1.0, mx1 = 2.0; cbox(DG, 1.4, .34, .95, M.plinth, (mx0 + mx1) / 2, .17, zM, .03);
    for (const s2 of [-1, 1]) cbox(DG, 1.3, .1, .1, M.steelDk, (mx0 + mx1) / 2, .39, zM + s2 * .3, .01);
    cbox(DG, .9, .1, .62, mMotDk, (mx0 + mx1) / 2 + .05, .49, zM, .015);
    const mb = cyl(DG, .3, .3, .82, M.motor, 1.55, yM, zM, 36); mb.rotation.z = Math.PI / 2;
    for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; if (Math.sin(a) < -.75) continue; const f = box(DG, .76, .07, .014, M.motor, 1.55, yM + Math.sin(a) * .32, zM + Math.cos(a) * .32); f.rotation.x = Math.PI / 2 - a; }
    cyl(DG, .33, .33, .05, M.motor, 1.97, yM, zM, 36).rotation.z = Math.PI / 2;
    cyl(DG, .34, .32, .2, M.motor, 1.07, yM, zM, 36).rotation.z = Math.PI / 2; const gr = new THREE.Mesh(new THREE.CircleGeometry(.3, 32), M.black); gr.position.set(.965, yM, zM); gr.rotation.y = -Math.PI / 2; DG.add(gr);
    cbox(DG, .3, .2, .26, M.motor, 1.65, yM + .4, zM, .02); cyl(DG, .05, .05, .07, mChrome, 2.08, yM, zM, 10).rotation.z = Math.PI / 2;
    for (const s2 of [-1, 1]) for (const ox of [1.25, 1.85]) { cbox(DG, .12, .16, .1, M.motor, ox, .6, zM + s2 * .24, .01); bolt(DG, ox, .54, zM + s2 * .29, 0, 1, 0, .02, M.steelDk); }
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(.26, .2), mLblA); lb.position.set(2.377, yS - .5, zM * .45); lb.rotation.y = Math.PI / 2; DG.add(lb);
    // alimentação: tubo do silo até o funil; sinalizador
    const b = bc(); const R0 = radial(T, aF + Math.PI / 2); beam(R0, V(1.45, 2.7, 0), V(1.88, 2.7, 0), .035, M.steelDk, true); beam(R0, V(1.85, 2.7, 0), V(1.85, 3.95, 0), .035, M.steelDk, true); b.position.set(1.85, 4.05, 0); R0.add(b); beacons[c.tag] = b;
    stream(c.tag, c.x, c.z, 9.4, 3.6);
    silo(c.x, c.z, 2.2, 7.5, 5.5, { ladY0: 5.5 - 7.5 });                             // escada de marinheiro a partir do deck (+5,5 m)
    beam(g, V(c.x, 7.7, c.z), V(c.x, 4.05, c.z), .33, M.chute, true); cyl(g, .45, .45, .08, M.chute, c.x, 4.08, c.z, 24); cyl(g, .45, .45, .08, M.chute, c.x, 7.5, c.z, 24);
    hot.push({ tag: c.tag, tipo: 'Britador cônico HP 400 · britagem primária', pos: V(c.x, 4.0, c.z), info: `${c.tag} · britador cônico HP 400 (compressão). Recebe o retido no 1º deck das peneiras pelo silo; o produto volta às peneiras (circuito fechado).` });
  });

  // =====================================================================================================
  // ---- britagem secundária: Barmac VSI (frente +z, foto 03BR006)
  // =====================================================================================================
  const bh2 = .78, gT = 2.0;                                                         // topo do concreto e topo da base metálica
  // materiais do Barmac (foto2): menos "pintas" de pó que o HP 400 — bege-claro limpo, base marrom-ferrugem empoeirada
  // (sem o mapa de tinta do bege: as manchas de ferrugem dele viram "pintas"; a variação vem do pó, escorridos e ruído macro)
  const flat = (base, hex, gp) => { const m = tintG(base, null, gp, { map: null }); m.color.set(hex); return m; };
  const mF = flat(M.beige, '#9c6a54', { uDust: .7, uGrime: .8, uDustCol: '#b08a72', uMacro: .22 });             // base metálica marrom-ferrugem
  const mFin = std({ color: 0x2a1a13, roughness: .92 });                                                    // fundo escuro da base
  const mPlV = tintG(M.plinth, [.95, .68, .58], { uDust: .75, uGrime: 1, uDustCol: '#5a3024' });            // concreto manchado de lama
  const mCream = flat(M.beige, '#d6ccb9', { uDust: .35, uGrime: .45, uDustCol: '#9a7462', uMacro: .12 });       // bege-claro
  const mFrisoV = flat(M.beige, '#8e5e4d', { uDust: .35, uGrime: .45, uDustCol: '#a48270' });                  // friso marrom-rosado
  const mMotG = flat(M.motor, '#5c625f', { uDust: .35, uGrime: .3, uDustCol: '#7a5a4a' });                    // carcaça aletada cinza-escura
  const mDome = flat(M.beige, '#c9c9c1', { uDust: .25, uGrime: .25, uDustCol: '#8a7468', uMacro: .08 });       // cúpula cinza-clara
  const wetA = cvs(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const cx = w * (.3 + rrC() * .4), cy = h * (.3 + rrC() * .4), r = w * (.12 + rrC() * .18); const gd = x.createRadialGradient(cx, cy, 0, cx, cy, r); gd.addColorStop(0, 'rgba(255,255,255,.55)'); gd.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gd; x.fillRect(0, 0, w, h); } }, false);
  const mWet = std({ color: 0x3a2116, roughness: .1, metalness: 0, alphaMap: wetA, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const frisoTex = cvs(2048, 128, (x, w, h) => {
    x.fillStyle = '#8f5e4c'; x.fillRect(0, 0, w, h);
    blotC(x, w, h, 90, 10, 60, () => `rgba(205,172,152,${.05 + rrC() * .12})`); blotC(x, w, h, 40, 10, 50, () => `rgba(70,40,30,${.05 + rrC() * .12})`);
    x.fillStyle = 'rgba(232,220,204,.62)'; x.font = '600 28px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('Barmac B9100SE VSI', w * .935, h * .5, 210);                       // escrita discreta, à esquerda da frente (u ≈ 0,93)
    runs(x, w, h, 40, '70,40,28', 0, .3, .2, .9, .5, 1, 3); scr(x, w, h, 140, '215,195,178'); spk(x, w, h, 3000, '50,30,20', .3); grn(x, w, h, 8);
  });
  const mFrisoT = grimeUV(std({ map: frisoTex, roughness: .6, metalness: .12 }), { uDust: .3, uGrime: .3, uEdge: 0, uDustCol: '#a48270', uMacro: .08 });
  const mLblW = std({ roughness: .5, map: cvs(192, 128, (x, w, h) => { x.fillStyle = '#f1efe8'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8102e'; x.fillRect(0, 0, w, 30); x.fillStyle = '#fff'; x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.fillText('BLOQUEIO', w / 2, 22); x.fillStyle = '#222'; x.font = '15px Arial'; ['Ponto de bloqueio', 'elétrico — NR-10', 'M2 · 440 V'].forEach((l, i) => x.fillText(l, w / 2, 56 + i * 22, w - 16)); spk(x, w, h, 900, '60,40,30', .3); }) });
  // tronco de pirâmide (faces planas) — bases trapezoidais dos motores
  const frustGeo = (wb, db, wt, dt, hh) => { const gm = new THREE.BoxGeometry(wb, hh, db); const P = gm.attributes.position; for (let i = 0; i < P.count; i++) if (P.getY(i) > 0) P.setXYZ(i, P.getX(i) * wt / wb, P.getY(i), P.getZ(i) * dt / db); gm.computeVertexNormals(); return flatUV(gm); };
  const pedGeo = frustGeo(1.25, .9, .42, .36, .62), pedT = Math.atan(((.9 - .36) / 2) / .62);
  const gusV = extr(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(.42, 0), new THREE.Vector2(0, .64)]), .025);   // mão-francesa: larga embaixo
  const finGeo = new THREE.BoxGeometry(.05, .62, .016);
  CRUSHERS.vsi.forEach((c) => {
    const T = new THREE.Group(); T.position.set(c.x, 0, c.z); T.userData.pickTag = c.tag; g.add(T);
    // bloco de concreto manchado de lama, com poças sobre o topo e no piso à frente
    cbox(T, 5.25, bh2, 4.2, mPlV, 0, bh2 / 2, 0, .05);
    for (const [px, pz, sx, sz, y] of [[-1.6, 1.9, .55, .14, bh2], [.9, 1.92, .8, .12, bh2], [2.2, 1.85, .3, .16, bh2], [-.6, 2.55, 1.1, .32, .008], [1.7, 2.45, .6, .22, .008]]) {
      const pd = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mWet); pd.rotation.x = -Math.PI / 2; pd.scale.set(sx, sz, 1); pd.position.set(px, y + .004, pz); pd.receiveShadow = true; T.add(pd);
    }
    const fr = new THREE.Group(); T.add(fr);
    cbox(fr, 5.0, .04, 3.36, mF, 0, bh2 + .02, 0, .01);                               // chapa de fundo
    for (const s of [-1, 1]) {                                                       // vigas-caixão longitudinais (frente/fundo)
      cbox(fr, 5.5, .56, .03, mF, 0, 1.72, s * 1.63, .008); cbox(fr, 5.5, .56, .03, mF, 0, 1.72, s * 1.33, .008);
      cbox(fr, 5.52, .035, .38, mF, 0, gT - .0175, s * 1.48, .01); cbox(fr, 5.5, .03, .36, mF, 0, 1.455, s * 1.48, .008);
      cbox(fr, 5.4, .025, .08, mF, 0, 1.43, s * 1.69, .006);                         // aba inferior saliente
      for (let k = 0; k < 7; k++) { const xx = -2.55 + k * .85; cbox(fr, .02, .5, .1, mF, xx, 1.72, s * 1.68, .005); }
      for (const xx of [-2.73, 2.73]) cbox(fr, .03, .56, .33, mF, xx, 1.72, s * 1.48, .008);
      // furos/pequenos detalhes da viga e "M2"
      if (s > 0) { for (const xx of [.55, .62]) { const h0 = new THREE.Mesh(new THREE.CircleGeometry(.018, 10), M.black); h0.position.set(xx, 1.72, 1.648); fr.add(h0); } const m2 = new THREE.Mesh(new THREE.PlaneGeometry(.3, .11), mM2); m2.position.set(1.98, 1.85, 1.648); fr.add(m2); const m2b = m2.clone(); m2b.position.x = 2.32; fr.add(m2b); }
      for (let k = 0; k < 14; k++) bolt(fr, -2.6 + k * .4, gT, s * 1.6, 0, 1, 0, .022, M.steelDk);
    }
    for (const xx of [-2.2, -1.1, 0, 1.1, 2.2]) cbox(fr, .26, .56, 2.66, mF, xx, 1.72, 0, .01);        // transversinas
    for (const xx of [-2.2, -1.55, -.45, .6, 1.6, 2.2]) cbox(fr, .03, .66, 3.2, mF, xx, bh2 + .37, 0, .006);   // montantes
    for (const [x0, x1] of [[-1.55, -.45], [.6, 1.6]]) { cbox(fr, x1 - x0, .03, 3.2, mF, (x0 + x1) / 2, 1.1, 0, .006); cbox(fr, x1 - x0, .1, .03, mF, (x0 + x1) / 2, 1.06, 1.58, .006); }   // prateleiras com aba
    box(fr, 4.3, .6, 2.4, mFin, 0, 1.1, 0);                                           // fundo escuro entre montantes
    for (const xx of [-1.0, .05, 2.0]) cbox(fr, .025, .64, .5, mF, xx, bh2 + .36, 1.35, .005);   // chapas de reforço visíveis na frente
    // mãos-francesas: as vigas-caixão em balanço nas extremidades apoiadas por chapas triangulares sobre o bloco
    for (const sx of [-1, 1]) for (const zz of [-1.45, -.75, 0, .75, 1.45]) { const gm = sh(new THREE.Mesh(gusV, mF)); gm.position.set(sx * 2.2, bh2 + .04, zz); gm.rotation.y = sx > 0 ? 0 : Math.PI; fr.add(gm); }
    for (const sx of [-1, 1]) cbox(fr, .4, .03, 3.2, mF, sx * 2.4, bh2 + .055, 0, .006);
    // assento do tambor: coxins (borracha empilhada com chapas), placa bege, suportes e vão escuro de descarga
    const yC = gT + .02;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * 1.05, cz = sz * 1.15; cbox(T, .42, .02, .36, M.steelDk, cx, yC, cz, .005);
      for (let i = 0; i < 3; i++) { cyl(T, .13, .14, .042, M.rubber, cx, yC + .031 + i * .054, cz, 20); if (i < 2) cyl(T, .145, .145, .012, M.steelDk, cx, yC + .058 + i * .054, cz, 20); }
      cbox(T, .42, .02, .36, M.steelDk, cx, yC + .17, cz, .005);
      for (const [ox, oz] of [[-.17, -.14], [.17, .14], [-.17, .14], [.17, -.14]]) bolt(T, cx + ox, yC + .01, cz + oz, 0, 1, 0, .018, M.steelDk);
    }
    const yB = yC + .23;                                                             // placa de assento (bege)
    cbox(T, 2.9, .1, 3.0, mCream, 0, yB, 0, .02);
    for (let k = 0; k < 4; k++) { const R = radial(T, k * Math.PI / 2 + Math.PI / 4); cbox(R, .6, .24, .18, mCream, 1.0, yB + .17, 0, .02); cbox(R, .03, .2, .3, mCream, .78, yB + .15, 0, .005); bolt(R, 1.2, yB + .29, -.05, 0, 1, 0, .02, M.steelDk); bolt(R, 1.2, yB + .29, .05, 0, 1, 0, .02, M.steelDk); }
    cyl(T, 1.1, 1.1, .24, mFin, 0, yB + .17, 0, 40);
    cyl(T, 1.37, 1.37, .07, mFrisoV, 0, yB + .32, 0, 80);                            // flange inferior marrom
    // tambor bege-claro, friso marrom com a escrita, faixa superior, tampa cônica e tubo de alimentação
    { const y0 = yB + .355, y1 = 3.55; const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, y1 - y0, 80, 1, true), mDrum)); m.position.y = (y0 + y1) / 2; T.add(m); }
    { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.37, 1.37, .24, 96, 1, true), mFrisoT)); m.position.y = 3.69; T.add(m); }
    cyl(T, 1.43, 1.43, .04, mFrisoV, 0, 3.57, 0, 80); cyl(T, 1.43, 1.43, .04, mFrisoV, 0, 3.83, 0, 80);
    boltRing(T, 1.4, 3.85, 48, .022, M.steelDk); boltRing(T, 1.4, 3.55, 48, .022, M.steelDk, 0, g, -1);
    { const m = sh(new THREE.Mesh(flatU(new THREE.CylinderGeometry(1.36, 1.36, .12, 80, 1, true)), mCream)); m.position.y = 3.91; T.add(m); }
    lathe(T, [[1.36, 3.97], [1.3, 3.99], [1.24, 4.03], [.66, 4.5], [.6, 4.52], [.6, 4.54]], mCream, 72);
    for (let k = 0; k < 4; k++) { const R = radial(T, k * Math.PI / 2 + Math.PI / 4); const lg = cbox(R, .22, .16, .04, mCream, 1.02, 4.31, 0, .01); lg.rotation.z = .68; cyl(R, .03, .03, .06, M.steelDk, 1.04, 4.36, 0, 10).rotation.x = Math.PI / 2; }
    cyl(T, .46, .46, .5, mCream, 0, 4.78, 0, 32); cyl(T, .54, .54, .05, mCream, 0, 4.55, 0, 32); cyl(T, .54, .54, .05, mCream, 0, 5.02, 0, 32); boltRing(T, .5, 5.045, 12, .018, M.steelDk);
    for (let k = 0; k < 6; k++) { const R = radial(T, k / 6 * TAU); cbox(R, .1, .4, .025, mCream, .52, 4.78, 0, .005); }    // nervuras do tubo
    const rot = cyl(T, .9, .9, .08, M.greyDk, 0, 3.42, 0, 6); rot.userData.keep = true; spin.push({ tag: c.tag, o: rot, ax: 'y', w: 14 });
    // braço de içamento da tampa (atrás): coluna, lança, cilindro hidráulico e gancho
    { const DV = radial(T, -Math.PI / 2); cbox(DV, .16, 2.95, .16, mCream, 1.64, gT + 1.475, 0, .015); cbox(DV, .3, .03, .3, mCream, 1.64, gT + .015, 0, .005);
      cbox(DV, 1.05, .12, .1, mCream, 1.2, 4.9, 0, .01); beam(DV, V(1.58, 3.9, 0), V(1.12, 4.84, 0), .035, M.steel, true); beam(DV, V(1.58, 3.9, 0), V(1.42, 4.23, 0), .05, mCream, true);
      beam(DV, V(.75, 4.84, 0), V(.75, 4.45, 0), .012, M.steelDk, true); }
    // motores verticais (corpo aletado pendurado na placa articulada, cúpula cinza-clara em cima), bases trapezoidais
    for (const s of [-1, 1]) {
      const px = s * 1.95, pz = .42, mx = s * 2.3, mz = -.46, yP = gT + .62;
      const ped = sh(new THREE.Mesh(pedGeo, mCream)); ped.position.set(px, gT + .31, pz); T.add(ped);
      cbox(T, 1.35, .03, 1.0, mCream, px, gT + .015, pz, .006);
      for (const [lm, ox, oy, w, hh] of [[mLblA, -.08, .11, .2, .15], [mLblB, -.08, -.08, .2, .15], [mLblW, s * .24, .0, .15, .1]]) {
        const lb = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), lm); lb.rotation.x = -pedT; lb.position.set(px + ox, gT + .31 + oy, pz + (.9 + .36) / 4 - oy * Math.tan(pedT) + .006); T.add(lb);
      }
      for (let i = 0; i < 3; i++) cyl(T, .15, .16, .04, M.rubber, px, yP + .025 + i * .05, pz, 20);   // coxim do motor
      cbox(T, 1.45, .1, 1.5, mF, s * 2.05, yP + .2, -.15, .02);                       // placa de montagem (articulada)
      cbox(T, .26, .5, .36, mFrisoV, s * 1.45, 2.95, -.2, .02);                       // orelha do tambor
      { const pn = cyl(T, .05, .05, .5, mChrome, s * 1.5, yP + .26, -.2, 12); pn.rotation.x = Math.PI / 2; }
      for (const [ox, oz] of [[-.6, .45], [-.2, .5], [.2, .5], [.6, .45], [-.6, -.82], [.6, -.82]]) bolt(T, s * 2.05 + ox, yP + .25, oz, 0, 1, 0, .024, M.steelDk);
      cyl(T, .4, .4, .66, mMotG, mx, gT + .44, mz, 40);
      for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; const f = sh(new THREE.Mesh(finGeo, mMotG)); f.position.set(mx + Math.cos(a) * .425, gT + .45, mz + Math.sin(a) * .425); f.rotation.y = -a; T.add(f); }
      lathe(T, [[0, gT + .06], [.3, gT + .06], [.38, gT + .1], [.41, gT + .12]], mMotG, 32).position.set(mx, 0, mz);
      cyl(T, .5, .5, .05, mMotG, mx, yP + .275, mz, 40);                                // flange
      cyl(T, .44, .44, .1, mMotG, mx, yP + .35, mz, 40);
      lathe(T, [[.48, yP + .4], [.49, yP + .46], [.48, yP + .66], [.43, yP + .8], [.32, yP + .9], [.16, yP + .95], [0, yP + .96]], mDome, 48).position.set(mx, 0, mz);
      cbox(T, .22, .28, .22, mMotG, mx + s * .5, gT + .5, mz, .02);                    // caixa de ligação
      beam(T, V(mx + s * .5, gT + .36, mz), V(mx + s * .62, gT + .02, mz + .3), .025, M.hose, true);
    }
    plateMesh(T, M.plateW('BRITADOR SECUNDÁRIO', c.tag), .78, -.425, 1.72, 1.65);
    const b = bc(); b.position.set(.62, 5.0, .2); T.add(b); beacons[c.tag] = b; beam(T, V(.46, 4.8, .2), V(.6, 4.8, .2), .03, M.steelDk, true);
    stream(c.tag, c.x, c.z, 9.4, 5.0);
    silo(c.x, c.z, 1.9, 7.5, 5, { legY: 5.5, legA: [1, 2, 4, 5].map((k) => k * Math.PI / 3), lr: 2.6, ladA: 0 });   // apoiado no deck (+5,5 m)
    beam(g, V(c.x, 7.7, c.z), V(c.x, 5.05, c.z), .3, M.chute, true); cyl(g, .42, .42, .08, M.chute, c.x, 7.5, c.z, 24);
    hot.push({ tag: c.tag, tipo: 'Britador de impacto Barmac (VSI) · britagem secundária', pos: V(c.x, 4.5, c.z), info: `${c.tag} · britador de impacto vertical Barmac (rotor). Recebe o retido no 2º deck das peneiras; o produto volta às peneiras.` });
  });

  // =====================================================================================================
  // ---- sala dos britadores: prateleiras de peças, unidade hidráulica, tubulações, mangueiras e refletores
  // =====================================================================================================
  {
    const RM = new THREE.Group(); g.add(RM);
    const mRackU = tintG(M.grey, [.35, .5, 1.1], { uDust: .7 });                    // montantes azuis
    const mRackB = tintG(M.orange, [1.1, .85, .7], { uDust: .7 });                   // longarinas laranja
    const mWood = tintG(M.beige, [.85, .6, .36], { uDust: .9, uGrime: .5 });
    const mBinB = tintG(M.grey, [.3, .45, 1.15], { uDust: .6 }), mBinY = tintG(M.yellow, [1, .95, .9], { uDust: .6 }), mRed = tintG(M.grey, [1.4, .35, .25], { uDust: .6 });
    const mMn = tintG(M.greyDk, [.9, .85, .82], { uDust: .8 });                       // aço-manganês (revestimentos)
    const mWhite = tintG(M.beige, [1.15, 1.15, 1.15], { uDust: .6 });
    const mPipeG = tintG(M.grey, [.55, .9, .6], { uDust: .9 }), mPipeB = tintG(M.grey, [.45, .6, 1.1], { uDust: .9 }), mPipeY = tintG(M.yellow, [1, 1, 1], { uDust: .9 });
    const torus = (p, r, t, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 24), mat)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); p.add(m); return m; };
    const item = (P, x, y, z, room) => {                                              // um item de prateleira; devolve a largura usada
      const t = rrC(), hMax = Math.min(room, .46);
      if (t < .22) { const w = .4 + rrC() * .2, h = Math.min(hMax, .28 + rrC() * .16); cbox(P, w, h, .5, mWood, x + w / 2, y + h / 2, z, .01); return w; }
      if (t < .4) { const w = .36, h = Math.min(hMax, .24); const mb = rrC() < .6 ? mBinB : mBinY; cbox(P, w, h, .5, mb, x + w / 2, y + h / 2, z, .015); cbox(P, w - .04, .02, .46, mFin, x + w / 2, y + h - .005, z, .002); return w; }
      if (t < .55) { const n = 1 + (rrC() * 3 | 0); for (let i = 0; i < n; i++) { torus(P, .14, .05, M.steelDk, x + .19, y + .05 + i * .1, z); cyl(P, .1, .1, .09, M.steel, x + .19, y + .05 + i * .1, z, 18); } return .38; }
      if (t < .68) { const n = 1 + (rrC() * 2 | 0); for (let i = 0; i < n; i++) cyl(P, .13, .12, Math.min(hMax, .32), rrC() < .5 ? mBinY : mRed, x + .14 + i * .28, y + Math.min(hMax, .32) / 2, z + (rrC() - .5) * .1, 18); return n * .28; }
      if (t < .8) { const n = 1 + (rrC() * 2 | 0); for (let i = 0; i < n; i++) torus(P, .2, .045, M.hose, x + .25, y + .05 + i * .09, z); return .5; }
      if (t < .92) { const n = 2 + (rrC() * 3 | 0); for (let i = 0; i < n; i++) cbox(P, .5, .045, .34, mMn, x + .26, y + .025 + i * .05, z + (rrC() - .5) * .04, .006); return .52; }
      for (let i = 0; i < 3; i++) cyl(P, .07, .07, .28, mWhite, x + .08 + i * .16, y + .14, z, 14); return .48;
    };
    function rack(x, z, len, ry) {
      const P = new THREE.Group(); P.position.set(x, 0, z); P.rotation.y = ry; RM.add(P);
      const d = .6, lv = [.12, .8, 1.48, 2.16], nb = Math.max(1, Math.round(len / 1.3)), bw = len / nb;
      for (let i = 0; i <= nb; i++) { const xx = -len / 2 + i * bw; for (const sz of [-d / 2, d / 2]) { box(P, .07, 2.45, .06, mRackU, xx, 1.225, sz); cbox(P, .14, .01, .12, M.steelDk, xx, .005, sz, .002); }
        for (let k = 0; k < 4; k++) beam(P, V(xx, .25 + k * .55, -d / 2), V(xx, .25 + (k + 1) * .55, d / 2), .022, mRackU); }
      for (const y of lv) { for (const sz of [-d / 2, d / 2]) box(P, len, .09, .045, mRackB, 0, y, sz); box(P, len, .02, d, M.steelDk, 0, y + .055, 0); }
      for (const [j, y] of lv.entries()) for (let i = 0; i < nb; i++) { let px = -len / 2 + i * bw + .08; const end = -len / 2 + (i + 1) * bw - .08, room = (j < 3 ? lv[j + 1] - y - .16 : .5); while (px < end - .5) { if (rrC() < .12) { px += .3; continue; } px += item(P, px, y + .065, (rrC() - .5) * .06, room) + .04; } }
      return P;
    }
    rack(51.3, .65, 4.6, 0); rack(58.0, .65, 2.4, 0); rack(63.33, 14.0, 2.3, Math.PI / 2);
    // palete com manto de reposição do HP 400 e caixas de pontas de rotor do Barmac
    { const PL = new THREE.Group(); PL.position.set(55, 0, 10.5); PL.rotation.y = .12; RM.add(PL);
      for (const zz of [-.5, 0, .5]) cbox(PL, 1.5, .1, .12, mWood, 0, .05, zz, .01); for (let k = 0; k < 7; k++) cbox(PL, .14, .025, 1.2, mWood, -.66 + k * .22, .115, 0, .004);
      lathe(PL, [[0, .13], [.74, .13], [.74, .18], [.62, .55], [.42, .95], [.36, .99], [0, .99]], mMn, 48).position.x = -.1;
      cbox(PL, .4, .3, .35, mWood, .55, .28, .3, .01); cbox(PL, .4, .3, .35, mWood, .55, .28, -.15, .01); cbox(PL, .38, .25, .33, mWood, .55, .555, .1, .01); }
    // unidade hidráulica (HPU) do ajuste/alívio dos HP 400: tanque, motobomba, filtros, acumuladores e manômetros
    const HP = new THREE.Group(); HP.position.set(55.2, 0, 3.3); RM.add(HP);
    { const mTank = tintG(M.grey, [.42, .56, .9], { uDust: .9 });
      cbox(HP, 1.7, .1, .95, M.steelDk, 0, .05, 0, .01); cbox(HP, 1.5, .75, .8, mTank, 0, .5, 0, .03);
      cbox(HP, .04, .3, .06, mWhite, -.4, .55, .405, .005); box(HP, .02, .24, .01, M.black, -.4, .55, .44);          // visor de nível
      const mb = cyl(HP, .17, .17, .5, M.motor, -.35, 1.08, 0, 28); mb.rotation.z = Math.PI / 2; cyl(HP, .2, .2, .04, M.motor, -.1, 1.08, 0, 28).rotation.z = Math.PI / 2;
      cbox(HP, .5, .2, .3, M.steelDk, -.35, .9, 0, .01); const pmp = cyl(HP, .11, .11, .22, mHmot, .08, 1.02, 0, 20); pmp.rotation.z = Math.PI / 2;
      for (const zz of [-.22, .22]) { cyl(HP, .065, .065, .3, mWhite, .5, 1.03, zz, 14); cyl(HP, .075, .075, .04, M.steelDk, .5, 1.2, zz, 14); }
      for (const xx of [-.62, .62]) lathe(HP, [[0, .88], [.09, .9], [.12, .96], [.12, 1.42], [.08, 1.5], [.03, 1.53], [0, 1.53]], mHmot, 20).position.set(xx, 0, -.28);
      for (const xx of [.25, .38]) { const gg = cyl(HP, .045, .045, .025, M.steelDk, xx, 1.2, .2, 16); gg.rotation.x = Math.PI / 2; const fc = new THREE.Mesh(new THREE.CircleGeometry(.038, 16), mWhite); fc.position.set(xx, 1.2, .214); HP.add(fc); beam(HP, V(xx, .88, .2), V(xx, 1.17, .2), .008, mChrome, true); }
      cbox(HP, .3, .4, .16, M.yellow, .55, .55, .48, .01); const wn = new THREE.Mesh(new THREE.PlaneGeometry(.22, .18), mLblA); wn.position.set(.55, .58, .562); HP.add(wn); }
    // tubulação: suporte sob o deck (z ≈ 10,4 e 13,9) — hidráulico, lubrificação, água e ar comprimido
    const pipes = [[.032, M.steel, 4.82, 10.22], [.028, mPipeY, 4.82, 10.38], [.055, mPipeG, 4.74, 10.58], [.04, mPipeB, 4.8, 10.8]];
    for (const [r, m, y, z] of pipes) beam(RM, V(48.75, y, z), V(63.5, y, z), r, m, true);
    const pipes2 = [[.028, mPipeY, 4.82, 13.7], [.05, mPipeG, 4.76, 13.88], [.038, mPipeB, 4.82, 14.06]];
    for (const [r, m, y, z] of pipes2) beam(RM, V(48.3, y, z), V(63.5, y, z), r, m, true);
    for (let x = 49.3; x < 63.5; x += 2.05) for (const [z0, z1] of [[10.1, 10.92], [13.58, 14.18]]) {    // pendurais em trapézio
      for (const zz of [z0, z1]) beam(RM, V(x, 4.62, zz), V(x, 5.46, zz), .012, M.steelDk, true);
      box(RM, .06, .05, z1 - z0 + .06, M.steelDk, x, 4.6, (z0 + z1) / 2);
      for (const [r, , y, z] of (z0 < 12 ? pipes : pipes2)) { const cl = new THREE.Mesh(new THREE.TorusGeometry(r + .012, .006, 4, 14), M.steelDk); cl.position.set(x, y, z); cl.rotation.y = Math.PI / 2; RM.add(cl); }
    }
    // HPU → suporte: subida, travessia sob o deck até z 10,2
    for (const [i, zz] of [-.12, 0, .12].entries()) { const xx = 55.75 + i * .1; beam(RM, V(xx, .88, 3.3 + zz), V(xx, 4.62 - i * .06, 3.3 + zz), .022, M.steel, true); beam(RM, V(xx, 4.62 - i * .06, 3.3 + zz), V(xx, 4.62 - i * .06, 10.2), .022, M.steel, true); }
    // descidas para os HP 400 (bloco de válvulas + mangueiras até o anel de ajuste)
    const hose = (pts, r = .022) => { const m = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8), M.hose)); RM.add(m); return m; };
    CRUSHERS.cones.forEach((c) => {
      const x = c.x + .7; beam(RM, V(x, 4.82, 10.22), V(x, 3.0, 10.22), .032, M.steel, true); beam(RM, V(x, 3.0, 10.22), V(x, 3.0, 9.35), .032, M.steel, true);
      cbox(RM, .22, .26, .16, mHmot, x, 3.0, 9.3, .01); for (const oy of [-.06, .06]) { const v = cyl(RM, .03, .03, .1, M.yellow, x + .14, 3.0 + oy, 9.3, 10); v.rotation.z = Math.PI / 2; }
      hose([V(x - .05, 2.88, 9.24), V(x - .1, 2.55, 9.0), V(x - .25, 2.4, 8.75), V(x - .4, 2.62, 8.5)]);
      hose([V(x + .05, 2.88, 9.24), V(x + .1, 2.45, 9.05), V(x - .05, 2.2, 8.7), V(x - .2, 2.1, 8.45)], .018);
      beam(RM, V(x - .25, 4.74, 10.58), V(x - .25, 1.2, 10.58), .055, mPipeG, true);      // água de lavagem com mangueira enrolada
      { const v = cyl(RM, .07, .07, .12, mRed, x - .25, 1.15, 10.58, 12); v.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 4; i++) torus(RM, .26, .03, M.hose, x - .25, .9 - i * .055, 10.82).rotation.x = Math.PI / 2 + .15;
    });
    // descidas para os Barmac (lubrificação dos rolamentos + ar de limpeza), mangueiras até o tambor
    CRUSHERS.vsi.forEach((c, i) => {
      const x = [c.x - 1.6, c.x + 1.1, c.x - 1.6][i] ?? c.x - 1.6;
      beam(RM, V(x, 4.82, 13.7), V(x, 2.35, 13.7), .028, mPipeY, true); beam(RM, V(x, 2.35, 13.7), V(x, 2.35, 15.5), .028, mPipeY, true);
      beam(RM, V(x + .1, 4.82, 14.06), V(x + .1, 2.5, 14.06), .038, mPipeB, true); beam(RM, V(x + .1, 2.5, 14.06), V(x + .1, 2.5, 15.5), .038, mPipeB, true);
      cbox(RM, .3, .3, .14, M.steelDk, x + .05, 2.42, 15.55, .01);
      const dx = c.x - x, sx = Math.sign(dx) || 1, tx = c.x - sx * .85;
      hose([V(x, 2.36, 15.62), V(x + sx * .15, 2.2, 15.9), V(tx - sx * .2, 2.6, 16.2), V(tx, 3.1, 16.35)]);
      hose([V(x + .1, 2.5, 15.62), V(x + .1 + sx * .2, 2.4, 15.95), V(tx - sx * .1, 2.9, 16.25), V(tx + sx * .1, 3.35, 16.3)], .018);
    });
    // refletores LED nas colunas (luz fria pontual sobre os britadores)
    for (const [p, t] of [[[56.35, 4.3, 12.4], [61, 2.2, 17.5]], [[48.35, 4.3, 11.62], [51, 2.4, 7]], [[63.62, 4.3, 11.62], [59, 2.4, 7]], [[48.35, 4.3, 12.4], [52.5, 1.8, 17.5]]]) {
      const F = new THREE.Group(); F.position.set(...p); RM.add(F); F.lookAt(V(...t));
      cbox(F, .34, .26, .07, M.greyDk, 0, 0, 0, .01); for (let k = 0; k < 6; k++) box(F, .3, .012, .03, M.greyDk, 0, -.1 + k * .04, -.05);
      const fc = new THREE.Mesh(new THREE.PlaneGeometry(.29, .21), M.glass); fc.position.z = .037; F.add(fc);
      beam(F, V(0, -.14, -.02), V(0, -.25, -.2), .02, M.steelDk);
      const L = new THREE.SpotLight(0xeef2ff, 26, 0, .75, .7, 2); L.position.set(...p); L.target.position.set(...t); g.add(L, L.target);
    }
  }


  // ---- instâncias de parafusos (uma chamada de desenho por raiz/material)
  g.updateMatrixWorld(true);
  for (const { root, mat, list } of BL.values()) {
    const im = new THREE.InstancedMesh(nutGeo, mat, list.length); im.castShadow = true; im.receiveShadow = true;
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), tm = new THREE.Matrix4();
    list.forEach((r, i) => { tm.multiplyMatrices(inv, r.par.matrixWorld).multiply(r.m); im.setMatrixAt(i, tm); });
    root.add(im);
  }

  // correias: produto dos britadores → retorno às peneiras (circuito fechado)
  const belt = (a, b, w = 1.2) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const grp = new THREE.Group(); grp.position.copy(a).addScaledVector(d, .5); grp.lookAt(b); g.add(grp);
    box(grp, w + .2, .25, L, M.steelDk, 0, 0, 0); box(grp, w, .06, L, M.belt, 0, .16, 0);
    const oreG = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.065), M.ore, Math.floor(L * 12)); const m4 = new THREE.Matrix4();
    const rk = Array.from({ length: oreG.count }, (_, k) => ({ z: -L / 2 + k / 12 + Math.random() * .08, x: (Math.random() - .5) * w * .7, r: Math.random() * 6 })); grp.add(oreG); belts.push({ im: oreG, rk, L });
    for (let s = 0; s < L; s += 1.2) { box(grp, w + .3, .08, .1, M.grey, 0, .08, -L / 2 + s); }
    for (const zz of [-L / 2, L / 2]) { const dr = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, w + .3, 16), M.greyDk); dr.rotation.z = Math.PI / 2; dr.position.set(0, .02, zz); grp.add(dr); }
    grp.userData.L = L; return grp; };
  // retorno: correia sob os britadores (→ +x) → correia transversal junto à parede do fundo → correia de alta
  // inclinação (sidewall) encostada na parede z ≈ 2, por fora dos silos → cauda da correia de distribuição (y 17,4 m)
  const E2 = B.screenEnd, sidewall = (rg, w) => { const L = rg.userData.L; for (const sx of [-1, 1]) box(rg, .06, .55, L, M.rubber, sx * w * .46, .45, 0); for (let s2 = .4; s2 < L - .2; s2 += .55) box(rg, w * .9, .22, .06, M.rubber, 0, .3, -L / 2 + s2); };
  const chute = (a, b) => { beam(g, a, b, .9, M.chute); box(g, 1.3, .5, 1.3, M.chute, a.x, a.y + .1, a.z); };
  belt(V(E2 + 2.6, 1.4, 13.2), V(B.W - .9, 1.4, 13.2));   // fora da linha de colunas z = 12
  chute(V(B.W - 1.1, 1.35, 13.2), V(B.W - 1.1, .95, 12.9));
  belt(V(B.W - 1.1, .85, 12.8), V(B.W - 1.1, .85, 2.2), 1.0);   // afastada das colunas x = 64
  chute(V(B.W - 1.1, .8, 1.9), V(B.W - 1.5, .75, 2.0));
  sidewall(belt(V(B.W - 1.4, .7, 2.0), V(E2 + 2.6, 18.9, 2.0), 1.0), 1.0);
  chute(V(E2 + 2.4, 18.8, 2.0), V(E2 + 2.0, 17.75, 2.4));
  belt(V(2, 1.3, 20.5), V(B.screenEnd + 2, 1.3, 20.5), 1.2);                    // correia do passante (< 12,5 mm) → pilha
  const COL = { ok: 0x5ff0ff, warn: 0xffb020, crit: 0xff3b2f, off: 0x4a525a };
  const pick = []; g.updateMatrixWorld(true);
  g.children.forEach((c) => { if (c.userData.pickTag) pick.push({ tag: c.userData.pickTag, box: new THREE.Box3().setFromObject(c) }); });
  return { group: g, hotspots: hot, pick, beacons, update(dt, t, S) {
    const E = S ? S.eq : {}, K = S ? S.kpi : { F: 1 };
    for (const s of spin) { const e = E[s.tag] || { on: true, flow: 1 }; if (e.on && e.flow > 0) s.o.rotation[s.ax] += dt * s.w; }
    for (const r of rings) { const tgt = (S ? S.css : 18) * .12; r.ring.rotation.y += (tgt - r.ring.rotation.y) * Math.min(1, dt * 1.5); }
    for (const st of streams) { const e = E[st.tag] || { on: true, flow: 1, load: .7 }, run = e.on && e.flow > 0; st.im.visible = run; if (!run) continue;
      const k = .6 + Math.min(1.2, e.load); for (let i = 0; i < st.d.length; i++) { const d = st.d[i]; d.u += dt * 1.4 * k; if (d.u > 1) d.u -= 1; p4.set(st.x + d.x, st.y0 + (st.y1 - st.y0) * d.u * d.u, st.z + d.z); e4.set(t * 5 + i, i, 0); q4.setFromEuler(e4); s4.setScalar(1); m4.compose(p4, q4, s4); st.im.setMatrixAt(i, m4); } st.im.instanceMatrix.needsUpdate = true; }
    const run = K.F > 0; for (const b of belts) { b.im.visible = run; if (!run) continue; for (let i = 0; i < b.rk.length; i++) { const r = b.rk[i]; r.z += dt * 2.2; if (r.z > b.L / 2) r.z -= b.L; p4.set(r.x, .25, r.z); e4.set(r.r, r.r * 2, 0); q4.setFromEuler(e4); s4.setScalar(1); m4.compose(p4, q4, s4); b.im.setMatrixAt(i, m4); } b.im.instanceMatrix.needsUpdate = true; }
    for (const [tag, b] of Object.entries(beacons)) { const e = E[tag] || { st: 'ok' }; const c = COL[e.st] || COL.ok; b.material.color.setHex(c); b.material.emissive.setHex(c); b.material.emissiveIntensity = e.st === 'off' ? .15 : e.st === 'crit' ? (Math.sin(t * 9) > 0 ? 6 : .5) : 2.5 + Math.max(0, Math.sin(t * 6 + tag.length)) * 3; }
  } };
}
