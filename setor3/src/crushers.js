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
import { CRUSHERS, B, CAMS } from './layout.js?v=20261007205259';
import { V, sh, box, cyl, beam, railing, plateMesh, flatU } from './util.js?v=20261007205259';

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
  const mFriso = tint(M.beige, [.82, .6, .5]);                                       // friso/tampa marrom-rosado (foto2)
  const mLid = tint(M.beige, [.95, .82, .72]);
  const mVsiBase = tint(M.orange, [1.02, .86, .78]);                                 // base metálica marrom-ferrugem (foto2)
  const mPed = tint(M.beige, [1.04, 1.0, .9]);                                        // bases trapezoidais bege
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

  function silo(x, z, r, yb, h) {
    const s = new THREE.Group(); s.position.set(x, yb, z); g.add(s);
    cyl(s, r, r, h, M.steel, 0, h / 2 + 2.2, 0, 28); cyl(s, r, .5, 2.2, M.steel, 0, 1.1, 0, 28);
    const lr = r + 1.6;                                   // pernas fora da área do britador abaixo
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .78, lx = Math.cos(a) * lr, lz = Math.sin(a) * lr; beam(s, V(lx, -yb, lz), V(lx, h + 2.2, lz), .26, M.steelDk); beam(s, V(lx, 2.4, lz), V(Math.cos(a) * r, 2.4, Math.sin(a) * r), .18, M.steelDk); }
    for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 2 + .78, a1 = a0 + Math.PI / 2; beam(s, V(Math.cos(a0) * lr, 2.4, Math.sin(a0) * lr), V(Math.cos(a1) * lr, 2.4, Math.sin(a1) * lr), .2, M.steelDk); }
    for (let k = 0; k < 5; k++) cyl(s, r + .03, r + .03, .08, M.steelDk, 0, 2.6 + k * h / 5, 0, 28);
    railing(s, V(-r, h + 2.2, -r), V(r, h + 2.2, -r), M.yellow); railing(s, V(-r, h + 2.2, r), V(r, h + 2.2, r), M.yellow);
    return s;
  }
  // grupo orientado: x local = direção radial do ângulo a (a medido de +x para +z), z local = tangente
  const radial = (par, a) => { const G = new THREE.Group(); G.rotation.y = -a; par.add(G); return G; };
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
      const pts = [V(1.98, 1.8, oz), V(2.02, 1.55, oz * 2), V(2.2, 1.3, oz * 3 + .1), V(2.35, 1.02, .3 + ex), V(2.45, .55, .5 + ex), V(2.75, .08, .9 + ex), V(3.6, .04, 1.3 + ex)];
      const hm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .024, 8), M.hose); sh(hm); MG.add(hm);
      cyl(MG, .035, .035, .06, mChrome, 1.98, 1.79, oz, 6);
    }
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
    silo(c.x, c.z, 2.2, 7.5, 5.5);
    beam(g, V(c.x, 7.7, c.z), V(c.x, 4.05, c.z), .33, M.chute, true); cyl(g, .45, .45, .08, M.chute, c.x, 4.08, c.z, 24); cyl(g, .45, .45, .08, M.chute, c.x, 7.5, c.z, 24);
    hot.push({ tag: c.tag, tipo: 'Britador cônico HP 400 · britagem primária', pos: V(c.x, 4.0, c.z), info: `${c.tag} · britador cônico HP 400 (compressão). Recebe o retido no 1º deck das peneiras pelo silo; o produto volta às peneiras (circuito fechado).` });
  });

  // =====================================================================================================
  // ---- britagem secundária: Barmac VSI (frente +z, foto 03BR006)
  // =====================================================================================================
  const bh2 = .78, gT = 2.0;                                                         // topo do concreto e topo da base metálica
  CRUSHERS.vsi.forEach((c) => {
    const T = new THREE.Group(); T.position.set(c.x, 0, c.z); T.userData.pickTag = c.tag; g.add(T);
    cbox(T, 5.25, bh2, 3.8, M.plinth, 0, bh2 / 2, 0, .05);
    const fr = new THREE.Group(); T.add(fr); const mF = mVsiBase;
    cbox(fr, 5.0, .04, 3.36, mF, 0, bh2 + .02, 0, .01);                               // chapa de fundo
    for (const s of [-1, 1]) {                                                       // vigas-caixão longitudinais (frente/fundo)
      cbox(fr, 5.5, .56, .03, mF, 0, 1.72, s * 1.63, .008); cbox(fr, 5.5, .56, .03, mF, 0, 1.72, s * 1.33, .008);
      cbox(fr, 5.52, .035, .38, mF, 0, gT - .0175, s * 1.48, .01); cbox(fr, 5.5, .03, .36, mF, 0, 1.455, s * 1.48, .008);
      for (let k = 0; k < 7; k++) { const xx = -2.55 + k * .85; cbox(fr, .02, .5, .1, mF, xx, 1.72, s * 1.68, .005); }
      for (const xx of [-2.73, 2.73]) cbox(fr, .03, .56, .33, mF, xx, 1.72, s * 1.48, .008);
      // furos/pequenos detalhes da viga e "M2"
      if (s > 0) { for (const xx of [.55, .62]) { const h0 = new THREE.Mesh(new THREE.CircleGeometry(.018, 10), M.black); h0.position.set(xx, 1.72, 1.648); fr.add(h0); } const m2 = new THREE.Mesh(new THREE.PlaneGeometry(.3, .11), mM2); m2.position.set(1.98, 1.85, 1.648); fr.add(m2); const m2b = m2.clone(); m2b.position.x = 2.32; fr.add(m2b); }
      for (let k = 0; k < 14; k++) bolt(fr, -2.6 + k * .4, gT, s * 1.6, 0, 1, 0, .022, M.steelDk);
    }
    for (const xx of [-2.2, -1.1, 0, 1.1, 2.2]) cbox(fr, .26, .56, 2.66, mF, xx, 1.72, 0, .01);        // transversinas
    for (const xx of [-2.45, -1.55, -.45, .6, 1.6, 2.45]) cbox(fr, .03, .66, 3.2, mF, xx, bh2 + .37, 0, .006);   // montantes
    for (const [x0, x1] of [[-1.55, -.45], [.6, 1.6]]) cbox(fr, x1 - x0, .03, 3.2, mF, (x0 + x1) / 2, 1.1, 0, .006);   // prateleiras
    box(fr, 4.6, .6, 2.4, M.black, 0, 1.1, 0);                                        // fundo escuro entre montantes
    // mãos-francesas nas extremidades
    const gus = extr(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, .66), new THREE.Vector2(-.42, .66)]), .025);
    for (const sx of [-1, 1]) for (const zz of [-1.45, -.5, .5, 1.45]) { const gm = sh(new THREE.Mesh(gus, mF)); gm.position.set(sx * 2.5, bh2 + .02, zz); gm.scale.x = sx; fr.add(gm); }
    // assento do tambor sobre coxins
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const cx = sx * 1.15, cz = sz * 1.45; cbox(T, .4, .025, .32, M.steelDk, cx, gT + .012, cz, .006); cbox(T, .3, .05, .24, M.rubber, cx, gT + .05, cz, .012); cbox(T, .34, .02, .28, M.steelDk, cx, gT + .085, cz, .005); cbox(T, .3, .05, .24, M.rubber, cx, gT + .12, cz, .012); cbox(T, .4, .025, .32, M.steelDk, cx, gT + .157, cz, .006); bolt(T, cx - .15, gT + .025, cz, 0, 1, 0, .02, M.steelDk); bolt(T, cx + .15, gT + .025, cz, 0, 1, 0, .02, M.steelDk); }
    cbox(T, 2.8, .08, 3.2, mPed, 0, gT + .21, 0, .02);
    for (let k = 0; k < 4; k++) { const R = radial(T, k * Math.PI / 2 + Math.PI / 4); cbox(R, .55, .22, .14, mPed, 1.05, gT + .36, 0, .02); }
    cyl(T, 1.1, 1.1, .2, M.black, 0, gT + .35, 0, 40);
    // tambor, friso, tampa cônica e tubo de alimentação
    { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 1.08, 80, 1, true), mDrum)); m.position.y = 3.01; T.add(m); }
    cyl(T, 1.36, 1.36, .06, mPed, 0, 2.5, 0, 80);
    cyl(T, 1.37, 1.37, .28, mFriso, 0, 3.69, 0, 80); cyl(T, 1.43, 1.43, .04, mFriso, 0, 3.57, 0, 80); cyl(T, 1.43, 1.43, .04, mFriso, 0, 3.83, 0, 80);
    boltRing(T, 1.4, 3.85, 48, .022, M.steelDk); boltRing(T, 1.4, 3.55, 48, .022, M.steelDk, 0, g, -1);
    lathe(T, [[1.34, 3.85], [1.34, 3.9], [1.22, 4.06], [1.0, 4.36], [.86, 4.44], [.6, 4.48], [.6, 4.5]], mLid, 72);
    for (let k = 0; k < 3; k++) { const R = radial(T, k * TAU / 3 + .5); cbox(R, .25, .2, .04, mLid, 1.05, 4.32, 0, .01).rotation.z = .6; }
    cyl(T, .46, .46, .55, mLid, 0, 4.76, 0, 32); cyl(T, .54, .54, .05, mLid, 0, 4.5, 0, 32); cyl(T, .54, .54, .05, mLid, 0, 5.02, 0, 32); boltRing(T, .5, 5.045, 12, .018, M.steelDk);
    const rot = cyl(T, .9, .9, .08, M.greyDk, 0, 3.42, 0, 6); rot.userData.keep = true; spin.push({ tag: c.tag, o: rot, ax: 'y', w: 14 });
    // motores verticais aletados com cúpula, sobre bases trapezoidais com etiquetas amarelas
    for (const s of [-1, 1]) {
      const mx = s * 2.12;
      const ped = cyl(T, .5, .88, .78, mPed, mx, gT + .39, 0, 4); ped.rotation.y = Math.PI / 4;
      cbox(T, .8, .05, .8, mPed, mx, gT + .8, 0, .01);
      for (const [lm, ox] of [[mLblA, -.14], [mLblB, .16]]) { const lb = new THREE.Mesh(new THREE.PlaneGeometry(.26, .2), lm); lb.position.set(mx + ox, gT + .38, .497); lb.rotation.x = -.331; T.add(lb); }
      cbox(T, .5, .1, .5, M.rubber, mx, gT + .88, 0, .02);                            // coxim do motor
      cbox(T, 1.05, .14, .95, mFriso, mx - s * .1, gT + 1.0, 0, .02);               // placa de montagem (articulada)
      cbox(T, .55, .12, .3, mFriso, s * 1.45, gT + 1.0, 0, .02);                       // braço até o tambor
      for (let k = 0; k < 4; k++) bolt(T, mx - s * .1 + (k % 2 - .5) * .8, gT + 1.07, (k < 2 ? -.36 : .36), 0, 1, 0, .024, M.steelDk);
      cyl(T, .44, .44, .78, mMotDk, mx, gT + 1.47, 0, 40);
      for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; box(T, .06, .72, .018, mMotDk, mx + Math.cos(a) * .47, gT + 1.47, Math.sin(a) * .47, -a); }
      cyl(T, .5, .5, .06, mMotDk, mx, gT + 1.88, 0, 40);
      lathe(T, [[.52, gT + 1.9], [.53, gT + 1.95], [.5, gT + 2.15], [.4, gT + 2.32], [.22, gT + 2.4], [0, gT + 2.42]], mPed, 48).position.x = mx;
      cbox(T, .26, .3, .2, mMotDk, mx - s * .2, gT + 1.5, .5, .02);                    // caixa de ligação
      beam(T, V(mx - s * .2, gT + 1.35, .58), V(mx - s * .2, gT + .9, .9), .025, M.hose, true);
    }
    plateMesh(T, M.plateW('BRITADOR SECUNDÁRIO', c.tag), .78, -.425, 1.72, 1.65);
    const b = bc(); b.position.set(.62, 5.0, .2); T.add(b); beacons[c.tag] = b; beam(T, V(.46, 4.8, .2), V(.6, 4.8, .2), .03, M.steelDk, true);
    stream(c.tag, c.x, c.z, 9.4, 5.0);
    silo(c.x, c.z, 1.9, 7.5, 5);
    beam(g, V(c.x, 7.7, c.z), V(c.x, 5.05, c.z), .3, M.chute, true); cyl(g, .42, .42, .08, M.chute, c.x, 7.5, c.z, 24);
    hot.push({ tag: c.tag, tipo: 'Britador de impacto Barmac (VSI) · britagem secundária', pos: V(c.x, 4.5, c.z), info: `${c.tag} · britador de impacto vertical Barmac (rotor). Recebe o retido no 2º deck das peneiras; o produto volta às peneiras.` });
  });

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
    const oreG = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.13), M.ore, Math.floor(L * 3)); const m4 = new THREE.Matrix4();
    const rk = Array.from({ length: oreG.count }, (_, k) => ({ z: -L / 2 + k / 3 + Math.random() * .2, x: (Math.random() - .5) * w * .6, r: Math.random() * 6 })); grp.add(oreG); belts.push({ im: oreG, rk, L });
    for (let s = 0; s < L; s += 1.2) { box(grp, w + .3, .08, .1, M.grey, 0, .08, -L / 2 + s); }
    for (const zz of [-L / 2, L / 2]) { const dr = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, w + .3, 16), M.greyDk); dr.rotation.z = Math.PI / 2; dr.position.set(0, .02, zz); grp.add(dr); }
    grp.userData.L = L; return grp; };
  // retorno: correia sob os britadores (→ +x) → correia transversal junto à parede do fundo → correia de alta
  // inclinação (sidewall) encostada na parede z ≈ 2, por fora dos silos → cauda da correia de distribuição (y 17,4 m)
  const E2 = B.screenEnd, sidewall = (rg, w) => { const L = rg.userData.L; for (const sx of [-1, 1]) box(rg, .06, .55, L, M.rubber, sx * w * .46, .45, 0); for (let s2 = .4; s2 < L - .2; s2 += .55) box(rg, w * .9, .22, .06, M.rubber, 0, .3, -L / 2 + s2); };
  const chute = (a, b) => { beam(g, a, b, .9, M.chute); box(g, 1.3, .5, 1.3, M.chute, a.x, a.y + .1, a.z); };
  belt(V(E2 + 2.6, 1.4, 12), V(B.W - .9, 1.4, 12));
  chute(V(B.W - .7, 1.35, 12), V(B.W - .7, .95, 11.6));
  belt(V(B.W - .7, .85, 11.5), V(B.W - .7, .85, 2.2), 1.0);
  chute(V(B.W - .7, .8, 1.9), V(B.W - 1.3, .75, 2.0));
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
