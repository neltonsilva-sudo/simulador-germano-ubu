// 8 peneiras vibratórias tipo banana, 2 decks (foto 03PN002, foto de cima das peneiras e câmera do prédio):
// · laterais em chapa cinza com cantoneiras de reforço (verticais e longitudinais), flanges das travessas e fileiras de
//   parafusos huck (InstancedMesh por peneira), borda superior alta na alimentação e "torre" sob o vibrador, forro
//   interno marrom-ferrugem (caixa funda e escura vista de cima);
// · conjunto vibrador atravessado sobre a peneira: viga-caixão, 4 excitadores sob proteções amarelas PERFURADAS
//   arredondadas, eixo com acoplamentos flangeados, eixo cardã com 2 cruzetas até o motor elétrico azul aletado
//   (ventoinha, caixa de ligação, pés) sobre pedestal metálico entre as peneiras, com proteção amarela do acoplamento;
// · decks de painéis modulares de poliuretano (textura com furos e relevo) e leito CONTÍNUO de minério que escoa
//   (mais grosso na alimentação, afinando e falhando na descarga) + pedras irregulares de tamanhos variados;
// · bica de alimentação revestida de borracha, molas helicoidais sob as orelhas de apoio, caixa de descarga;
// · alimentadores 03AL no piso superior com placa azul e sinaleiro.
import * as THREE from 'three';
import { SCREENS, LV } from './layout.js?v=20261008063521';
import { V, sh, box, cyl, beam, railing, plateMesh, rockGeometry, oreColors } from './util.js?v=20261008063521';

const SEG = [[2.6, 28], [2.4, 18], [2.3, 9]];   // segmentos da banana: comprimento (m), inclinação (graus)
const W = SCREENS.w, HW = W / 2, TP = .025;      // largura útil e espessura da chapa lateral
// perfil da linha média do deck superior (z, y) no referencial do corpo vibrante
const PTS = (() => { let z = 0, y = 0; const p = [[0, 0]]; for (const [L, a] of SEG) { const r = a * Math.PI / 180; z += L * Math.cos(r); y -= L * Math.sin(r); p.push([z, y]); } return p; })();
const ZE = PTS[3][0], YE = PTS[3][1];
const D = (z) => { for (let k = 0; k < 3; k++) { const [z0, y0] = PTS[k], [z1, y1] = PTS[k + 1]; if (z <= z1 || k === 2) return y0 + (z - z0) * (y1 - y0) / (z1 - z0); } return 0; };
const lerpPoly = (P, z) => { for (let k = 0; k < P.length - 1; k++) if (z <= P[k + 1][0] || k === P.length - 2) { const [a, b] = P[k], [c, d] = P[k + 1]; return b + (z - a) * (d - b) / (c - a); } return 0; };
// borda superior da lateral: alta na caixa de alimentação, torre sob o vibrador, acompanhando o deck na descarga
const TOP = [[-.08, 1.45], [1.75, 1.45], [2.7, D(2.7) + 1.0], [4.6, D(4.6) + .82], [ZE + .04, D(ZE) + .68]];
const T = (z) => lerpPoly(TOP, z), Bt = (z) => D(z) - .95;
const SG = SEG.map((_, k) => { const [z0, y0] = PTS[k], [z1, y1] = PTS[k + 1], L = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y0 - y1, z1 - z0); return { z0, y0, z1, y1, L, ang, dz: (z1 - z0) / L, dy: (y1 - y0) / L, nz: Math.sin(ang), ny: Math.cos(ang) }; });
let _acc = 0; SG.forEach((s) => { s.s0 = _acc; _acc += s.L; }); const TOT = _acc;
function onDeck(s, o) { let j = 0; while (j < 2 && s > SG[j].s0 + SG[j].L) j++; const g = SG[j], d = s - g.s0; o.z = g.z0 + g.dz * d; o.y = g.y0 + g.dy * d; o.nz = g.nz; o.ny = g.ny; return o; }
// velocidade do leito ao longo do deck (m/s a plena vibração): rápida no 28°, desacelerando no 18° e no 9°
const VSEG = [1.15, .78, .48];
function vDeck(s) { const c = SG.map((q) => q.s0 + q.L / 2); if (s <= c[0]) return VSEG[0]; if (s >= c[2]) return VSEG[2]; const j = s < c[1] ? 0 : 1, u = (s - c[j]) / (c[j + 1] - c[j]); return VSEG[j] + (VSEG[j + 1] - VSEG[j]) * u * u * (3 - 2 * u); }
const S0 = .85;                                                              // ponto de impacto da cortina de alimentação no deck
const thick = (f) => .03 + .055 * Math.pow(Math.max(0, 1 - f), 1.6) - Math.max(0, f - .85) * .08;   // camada contínua de finos sobre os degraus
const PP = .305, TA = .05, TB = .022;                                       // passo dos painéis, dente em degrau, célula piramidal
const tooth = (s, x) => { const ph = ((s / PP) % 1 + 1) % 1, a = ph < .82 ? ph / .82 : (1 - ph) / .18; const c = ((x / PP) % 1 + 1) % 1; return TA * a + TB * (1 - 2 * Math.abs(c - .5)); };

// ---------- texturas locais (canvas) ----------
let sdS = 1234; const rrS = () => ((sdS = (sdS * 16807) % 2147483647) / 2147483647);
function cnv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
function nrm(hc, k = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, [c, x] = cnv(w, h), id = x.createImageData(w, h), d = id.data;
  const H = (i, j) => src[(((j + h) % h) * w + ((i + w) % w)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (H(i + 1, j) - H(i - 1, j)) * k, dy = (H(i, j + 1) - H(i, j - 1)) * k, l = Math.hypot(dx, dy, 1), q = (j * w + i) * 4; d[q] = (-dx / l * .5 + .5) * 255; d[q + 1] = (dy / l * .5 + .5) * 255; d[q + 2] = (1 / l * .5 + .5) * 255; d[q + 3] = 255; }
  x.putImageData(id, 0, 0); return tex(c, false);
}
function blotS(x, s, n, r0, r1, col) { for (let i = 0; i < n; i++) { const r = r0 + rrS() * (r1 - r0), cx = rrS() * s, cy = rrS() * s, g = x.createRadialGradient(cx, cy, 0, cx, cy, r), c = col(); g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill(); } }
function speck(x, s, n, a, col) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${col},${a * rrS()})`; const w = 1 + rrS() * 2; x.fillRect(rrS() * s, rrS() * s, w, w); } }
function rrect(x, cx, cy, w, h, r) { x.beginPath(); x.moveTo(cx - w / 2 + r, cy - h / 2); x.arcTo(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r); x.arcTo(cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2, r); x.arcTo(cx - w / 2, cy + h / 2, cx - w / 2, cy - h / 2, r); x.arcTo(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, r); x.closePath(); }
// pó só nas faces voltadas para cima (materiais locais, sem o shader "grime" de mats.js)
function dusty(mat, col, amt) {
  const U = { uDC: { value: new THREE.Color(col) }, uDA: { value: amt } };
  mat.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uDC; uniform float uDA;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 wN = inverseTransformDirection( normal, viewMatrix ); float up = smoothstep( .15, .95, wN.y ) * uDA; diffuseColor.rgb = mix( diffuseColor.rgb, uDC * ( .85 + .3 * diffuseColor.g ), clamp( up, 0., 1. ) ); roughnessFactor = mix( roughnessFactor, .95, up ); }'); };
  mat.customProgramCacheKey = () => 'pnDusty'; return mat;
}
function makeTextures() {
  // painéis de poliuretano 305 × 610 mm (4 × 2 painéis num quadro de 1,22 m), furos quadrados ~32 mm, juntas e finos
  const S = 512, [pc, px] = cnv(S), [ph, hx] = cnv(S);
  px.fillStyle = '#6a625b'; px.fillRect(0, 0, S, S); hx.fillStyle = '#c8c8c8'; hx.fillRect(0, 0, S, S);
  for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) {
    const x0 = a * 128, y0 = b * 256; px.fillStyle = `rgb(${100 + rrS() * 14 | 0},${94 + rrS() * 10 | 0},${86 + rrS() * 8 | 0})`; px.fillRect(x0 + 2, y0 + 2, 124, 252);
    px.fillStyle = '#2a221d'; px.fillRect(x0, y0, 128, 2); px.fillRect(x0, y0, 2, 256); hx.fillStyle = '#404040'; hx.fillRect(x0, y0, 128, 3); hx.fillRect(x0, y0, 3, 256);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 11; j++) { const cx = x0 + 15 + i * 24.5, cy = y0 + 13 + j * 23; px.fillStyle = '#16100d'; px.fillRect(cx - 7, cy - 7, 14, 14); px.fillStyle = 'rgba(160,150,140,.35)'; px.fillRect(cx - 7, cy + 7, 14, 2); hx.fillStyle = '#101010'; hx.fillRect(cx - 7, cy - 7, 14, 14); }
  }
  blotS(px, S, 70, 10, 70, () => `rgba(${105 + rrS() * 30 | 0},${58 + rrS() * 14 | 0},${38},${.18 + rrS() * .3})`); speck(px, S, 9000, .45, '40,26,18'); speck(px, S, 2500, .3, '170,150,130');
  const puT = tex(pc), puN = nrm(ph, 3);
  // proteção perfurada do vibrador: furos oblongos alternados (quadro de 0,30 m), amarelo gasto com pó e escorridos
  const G = 256, [gc, gx] = cnv(G), [gh, ghx] = cnv(G);
  gx.fillStyle = '#d8aa2c'; gx.fillRect(0, 0, G, G); ghx.fillStyle = '#d0d0d0'; ghx.fillRect(0, 0, G, G);
  blotS(gx, G, 18, 10, 60, () => `rgba(255,240,200,${.05 + rrS() * .08})`);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) for (const dx of [0, G, -G]) for (const dy of [0, G, -G]) {
    const cx = (i + .5 + (j % 2) * .5) * G / 5 + dx, cy = (j + .5) * G / 3 + dy;
    gx.fillStyle = '#1b130d'; rrect(gx, cx, cy, 15, 46, 7); gx.fill(); gx.fillStyle = 'rgba(255,230,160,.45)'; rrect(gx, cx, cy + 24, 13, 3, 1.5); gx.fill();
    ghx.fillStyle = '#202020'; rrect(ghx, cx, cy, 15, 46, 7); ghx.fill();
  }
  blotS(gx, G, 26, 6, 40, () => `rgba(120,64,36,${.12 + rrS() * .25})`);
  for (let i = 0; i < 40; i++) { const x0 = rrS() * G, y0 = rrS() * G, L = 10 + rrS() * 50; const g = gx.createLinearGradient(0, y0, 0, y0 + L); g.addColorStop(0, 'rgba(90,48,28,.35)'); g.addColorStop(1, 'rgba(90,48,28,0)'); gx.fillStyle = g; gx.fillRect(x0, y0, 1 + rrS() * 2, L); }
  speck(gx, G, 1600, .35, '70,40,24');
  const gT = tex(gc), gN = nrm(gh, 2.5);
  // carcaça do excitador (UV: u ao longo do eixo, v ao longo do perfil arredondado): amarelo gasto, 4 painéis com
  // furação densa nos ombros, rasgos de ventilação junto à base, pó cinza-marrom no topo e escorridos para os lados
  // canvas 512 × 1024 desenhado num espaço lógico 512 × 512 (escala 1 × 2): furos redondos no metal (perfil ≈ 1,55 m × eixo 0,58 m)
  const HS = 512, [hc, hx2] = cnv(HS, HS * 2), [hh, hhx] = cnv(HS, HS * 2); hx2.setTransform(1, 0, 0, 2, 0, 0); hhx.setTransform(1, 0, 0, 2, 0, 0);
  hx2.fillStyle = '#d3a226'; hx2.fillRect(0, 0, HS, HS); hhx.fillStyle = '#a0a0a0'; hhx.fillRect(0, 0, HS, HS);
  blotS(hx2, HS, 30, 20, 90, () => (rrS() < .5 ? `rgba(255,226,140,${.06 + rrS() * .08})` : `rgba(150,96,20,${.05 + rrS() * .08})`));
  for (const [u0, u1] of [[.07, .45], [.55, .93]]) for (const [v0, v1] of [[.17, .42], [.58, .83]]) {
    const x0 = u0 * HS, x1 = u1 * HS, y0 = (1 - v1) * HS, y1 = (1 - v0) * HS;
    hhx.fillStyle = '#c4c4c4'; rrect(hhx, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 + 10, y1 - y0 + 6, 5); hhx.fill();
    hx2.strokeStyle = 'rgba(90,60,10,.55)'; hx2.lineWidth = 2; rrect(hx2, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 + 10, y1 - y0 + 6, 5); hx2.stroke();
    for (let yy = y0 + 5, r = 0; yy < y1 - 3; yy += 8, r++) for (let xx = x0 + 8 + (r % 2) * 10.5; xx < x1 - 6; xx += 21) {
      hx2.fillStyle = '#1c130b'; hx2.beginPath(); hx2.ellipse(xx, yy, 6.2, 2.3, 0, 0, 6.3); hx2.fill(); hx2.fillStyle = 'rgba(255,225,150,.4)'; hx2.fillRect(xx - 4, yy + 2.1, 8, .7);
      hhx.fillStyle = '#383838'; hhx.beginPath(); hhx.ellipse(xx, yy, 6.2, 2.3, 0, 0, 6.3); hhx.fill();
    }
  }
  for (const [v0, v1] of [[.035, .12], [.88, .965]]) for (let k = 0; k < 14; k++) {          // rasgos de ventilação junto à base
    const cx = (.08 + k * .064) * HS, cy = (1 - (v0 + v1) / 2) * HS, hgt = (v1 - v0) * HS * .8;
    hx2.fillStyle = '#1a120b'; rrect(hx2, cx, cy, 10, hgt, 2.5); hx2.fill(); hhx.fillStyle = '#303030'; rrect(hhx, cx, cy, 10, hgt, 2.5); hhx.fill();
  }
  hhx.fillStyle = '#d0d0d0'; hhx.fillRect(HS * .485, 0, HS * .03, HS);                           // nervura central
  { const gg = hx2.createLinearGradient(0, 0, 0, HS); gg.addColorStop(0, 'rgba(105,88,72,0)'); gg.addColorStop(.32, 'rgba(105,88,72,.3)'); gg.addColorStop(.5, 'rgba(112,94,78,.5)'); gg.addColorStop(.68, 'rgba(105,88,72,.3)'); gg.addColorStop(1, 'rgba(105,88,72,0)'); hx2.fillStyle = gg; hx2.fillRect(0, 0, HS, HS); }
  blotS(hx2, HS, 40, 8, 50, () => `rgba(${96 + rrS() * 30 | 0},${70 + rrS() * 20 | 0},${52},${.12 + rrS() * .25})`);
  for (let i = 0; i < 90; i++) { const x0 = rrS() * HS, up = rrS() < .5, y0 = HS * (.42 + rrS() * .16), L = 30 + rrS() * 150; const gg = hx2.createLinearGradient(0, y0, 0, up ? y0 - L : y0 + L); gg.addColorStop(0, 'rgba(92,62,40,.4)'); gg.addColorStop(1, 'rgba(92,62,40,0)'); hx2.fillStyle = gg; hx2.fillRect(x0, up ? y0 - L : y0, 1 + rrS() * 2.5, L); }
  { const gu = hx2.createLinearGradient(0, 0, HS, 0); gu.addColorStop(0, 'rgba(60,40,24,.35)'); gu.addColorStop(.06, 'rgba(60,40,24,0)'); gu.addColorStop(.94, 'rgba(60,40,24,0)'); gu.addColorStop(1, 'rgba(60,40,24,.35)'); hx2.fillStyle = gu; hx2.fillRect(0, 0, HS, HS); }
  speck(hx2, HS, 5000, .35, '70,48,30'); speck(hx2, HS, 1500, .25, '230,220,200');
  const hT = tex(hc), hN = nrm(hh, 3);
  // caixa do alimentador: chapa bege com ferrugem, escorridos e sujeira de minério na base
  const FS = 512, [fc, fx] = cnv(FS);
  fx.fillStyle = '#9a7c5e'; fx.fillRect(0, 0, FS, FS);
  blotS(fx, FS, 40, 20, 110, () => (rrS() < .5 ? `rgba(206,190,160,${.08 + rrS() * .12})` : `rgba(140,112,84,${.08 + rrS() * .12})`));
  blotS(fx, FS, 60, 6, 70, () => `rgba(${118 + rrS() * 30 | 0},${60 + rrS() * 16 | 0},${32},${.2 + rrS() * .35})`);
  for (let i = 0; i < 70; i++) { const x0 = rrS() * FS, y0 = rrS() * FS * .7, L = 30 + rrS() * 180; const gg = fx.createLinearGradient(0, y0, 0, y0 + L); gg.addColorStop(0, 'rgba(118,62,32,.45)'); gg.addColorStop(1, 'rgba(118,62,32,0)'); fx.fillStyle = gg; fx.fillRect(x0, y0, 1 + rrS() * 3, L); }
  { const gg = fx.createLinearGradient(0, FS * .6, 0, FS); gg.addColorStop(0, 'rgba(96,52,32,0)'); gg.addColorStop(1, 'rgba(96,52,32,.6)'); fx.fillStyle = gg; fx.fillRect(0, 0, FS, FS); }
  speck(fx, FS, 6000, .35, '80,46,28'); speck(fx, FS, 1500, .3, '220,205,180');
  const fT = tex(fc);
  // leito de minério: finos cinza-escuros/marrons com grânulos de hematita/itabirito (quadro de 1,25 m), altura → normal
  const O = 512, [oc, ox] = cnv(O), [oh, ohx] = cnv(O);
  ox.fillStyle = '#37302c'; ox.fillRect(0, 0, O, O); ohx.fillStyle = '#606060'; ohx.fillRect(0, 0, O, O);
  const PAL = [[78, 64, 56], [66, 58, 54], [88, 70, 58], [54, 48, 46], [82, 80, 80], [96, 74, 60], [60, 46, 40]];
  const grain = (n, r0, r1) => { for (let i = 0; i < n; i++) { const r = r0 + rrS() * rrS() * (r1 - r0), cx0 = rrS() * O, cy0 = rrS() * O, c = PAL[rrS() * PAL.length | 0], j = .75 + rrS() * .5; for (const dx of [0, O, -O]) for (const dy of [0, O, -O]) { const cx = cx0 + dx, cy = cy0 + dy; if (cx < -r1 || cx > O + r1 || cy < -r1 || cy > O + r1) continue; ox.fillStyle = 'rgba(20,12,9,.55)'; ox.beginPath(); ox.ellipse(cx + r * .25, cy + r * .3, r * 1.05, r * .95, 0, 0, 6.3); ox.fill(); ox.fillStyle = `rgb(${c[0] * j | 0},${c[1] * j | 0},${c[2] * j | 0})`; ox.beginPath(); ox.ellipse(cx, cy, r, r * (.7 + rrS() * .3), rrS() * 3, 0, 6.3); ox.fill(); ox.fillStyle = 'rgba(230,210,195,.22)'; ox.beginPath(); ox.ellipse(cx - r * .3, cy - r * .3, r * .4, r * .3, 0, 0, 6.3); ox.fill(); const g = ohx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, '#f0f0f0'); g.addColorStop(1, 'rgba(96,96,96,0)'); ohx.fillStyle = g; ohx.beginPath(); ohx.arc(cx, cy, r, 0, 6.3); ohx.fill(); } } };
  grain(16000, 1, 3.2); grain(700, 3, 7); grain(30, 6, 11);
  blotS(ox, O, 24, 30, 110, () => `rgba(${rrS() < .5 ? '96,66,48' : '34,28,26'},${.08 + rrS() * .12})`); speck(ox, O, 9000, .45, '24,18,14');
  const oT = tex(oc), oN = nrm(oh, 4);
  return { puT, puN, gT, gN, hT, hN, fT, oT, oN };
}
// ---------- geometria auxiliar ----------
function normUV(g) { const u = g.attributes.uv; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < u.count; i++) { a = Math.min(a, u.getX(i)); b = Math.max(b, u.getX(i)); c = Math.min(c, u.getY(i)); d = Math.max(d, u.getY(i)); } for (let i = 0; i < u.count; i++) u.setXY(i, .002 + (u.getX(i) - a) / (b - a) * .996, .002 + (u.getY(i) - c) / (d - c) * .996); return g; }
// chapa no plano (z, y) do corpo, extrudada em x (de 0 a -t), chanfrada
function plateGeo(pts, t, bev = .005) { const s = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); const g = new THREE.ExtrudeGeometry(s, { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 }); g.translate(0, 0, bev); g.rotateY(-Math.PI / 2); return normUV(g); }
// perfil arredondado (proteções): largura w (z), altura h (y), extrudado ao longo de x (comprimento L, centrado)
function roundGeo(w, h, L, r, bev = .012) { const s = new THREE.Shape(); s.moveTo(-w / 2 + .03, 0); s.lineTo(w / 2 - .03, 0); s.quadraticCurveTo(w / 2, 0, w / 2, .03); s.lineTo(w / 2, h - r); s.quadraticCurveTo(w / 2, h, w / 2 - r, h); s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r); s.lineTo(-w / 2, .03); s.quadraticCurveTo(-w / 2, 0, -w / 2 + .03, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: L - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, bev - L / 2); g.rotateY(-Math.PI / 2); return g; }
// mola helicoidal (eixo Y, base em y = 0)
function springGeo(h = .45, R = .085, r = .019, turns = 5.5) {
  class Helix extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * turns * Math.PI * 2, e = .05; const y = u < e ? 0 : u > 1 - e ? h : (u - e) / (1 - 2 * e) * h; return o.set(Math.cos(a) * R, Math.min(h, Math.max(0, y)) + r, Math.sin(a) * R); } }
  return new THREE.TubeGeometry(new Helix(), 140, r, 6, false);
}
// perfil de carcaça do excitador (plano z-y, base em y = 0): parede curta + cúpula superelíptica ("barril" deitado)
function barrelProfS(w, h, y0 = .14, n = 2.7, N = 26) {
  const a = w / 2, b = h - y0, p = [[-a, 0]];
  for (let k = 0; k <= N; k++) { const th = Math.PI * (1 - k / N), c = Math.cos(th), s = Math.sin(th); p.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y0 + b * Math.pow(Math.abs(s), 2 / n)]); }
  p.push([a, 0]); return p;
}
// casca extrudada ao longo de x (comprimento L), levemente abaulada no meio; u = posição no eixo, v = posição no perfil
function barrelGeoS(w, h, L, bulge = .035, NX = 8) {
  const P = barrelProfS(w, h), sl = [0]; for (let k = 1; k < P.length; k++) sl.push(sl[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const tot = sl[sl.length - 1], pos = [], uv = [], idx = [], NP = P.length;
  for (let i = 0; i <= NX; i++) { const u = i / NX, xx = (u - .5) * L, k = 1 + bulge * (1 - Math.pow(2 * u - 1, 2)); P.forEach(([z, y], j) => { pos.push(xx, y * k, z * k); uv.push(u, sl[j] / tot); }); }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NP - 1; j++) { const a = i * NP + j, b = a + NP; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const top = (NX >> 1) * NP + (NP >> 1); if (g.attributes.normal.getY(top) < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } g.computeVertexNormals(); }
  return g;
}
// tampa lateral (chapa do perfil, chanfrada), extrudada para fora em +x (s = 1) ou -x (s = -1)
function barrelCapS(w, h, t, s) { const sp = new THREE.Shape(); barrelProfS(w, h).forEach(([z, y], i) => (i ? sp.lineTo(z, y) : sp.moveTo(z, y))); const g = new THREE.ExtrudeGeometry(sp, { depth: t, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 1, curveSegments: 4 }); g.rotateY(s * Math.PI / 2); return g; }
const triGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.46, 0); s.lineTo(0, .42); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .016, bevelEnabled: false }); g.translate(0, 0, -.008); return normUV(g); })();
// conjunto de peças repetidas (parafusos, molas) → um InstancedMesh no grupo dono
class Inst {
  constructor() { this.l = []; }
  add(parent, x, y, z, dx = 0, dy = 1, dz = 0, s = 1) { this.l.push({ parent, p: V(x, y, z), d: V(dx, dy, dz).normalize(), s: typeof s === 'number' ? V(s, s, s) : s }); }
  flush(owner, geo, mat, cast = false) {
    if (!this.l.length) return null; owner.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(owner.matrixWorld).invert(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
    const im = new THREE.InstancedMesh(geo, mat, this.l.length);
    this.l.forEach((b, i) => { b.parent.updateMatrixWorld(true); q.setFromUnitVectors(up, b.d); m.compose(b.p, q, b.s).premultiply(b.parent.matrixWorld).premultiply(inv); im.setMatrixAt(i, m); });
    im.castShadow = cast; im.receiveShadow = true; owner.add(im); this.l = []; return im;
  }
}
const rod = (p, a, b, r, mat) => beam(p, a, b, r, mat, true);

export function buildScreens(scene, M) {
  const g = new THREE.Group(); scene.add(g);
  const vib = [], beacons = {}, hot = [], flows = [];
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3(), Q = {};
  const TX = makeTextures();
  const puMat = dusty(new THREE.MeshStandardMaterial({ map: TX.puT, normalMap: TX.puN, roughness: .9, metalness: 0 }), '#6e4430', .3);
  const pu2T = TX.puT.clone(); pu2T.repeat.set(2, 2); const pu2N = TX.puN.clone(); pu2N.repeat.set(2, 2);
  const puMat2 = dusty(new THREE.MeshStandardMaterial({ map: pu2T, normalMap: pu2N, roughness: .9, metalness: 0 }), '#6e4430', .5);
  TX.gT.repeat.set(1 / .3, 1 / .3); TX.gN.repeat.set(1 / .3, 1 / .3);
  const guardMat = dusty(new THREE.MeshStandardMaterial({ map: TX.gT, normalMap: TX.gN, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .55, metalness: .1 }), '#8f5a3a', .7);
  const houseMat = dusty(new THREE.MeshStandardMaterial({ map: TX.hT, normalMap: TX.hN, normalScale: new THREE.Vector2(1.1, 1.1), roughness: .6, metalness: .08 }), '#7e6450', .5);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: .18, flatShading: true });   // pedras das peneiras (cor por instância; escurece com umidade)
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xa8180e, roughness: .4 });
  const feedMat = dusty(new THREE.MeshStandardMaterial({ map: TX.fT, color: 0xcdb8a0, roughness: .82, metalness: .12 }), '#7c5e48', .6);
  const Mot = M.motorBlue || M.motor, Yel = M.yellow, Rub = M.rubber || M.black, Lin = M.chute, StD = M.steelDk || M.greyDk;
  const houseGeo = barrelGeoS(.84, .66, .58), bandGeo = barrelGeoS(.88, .69, .045, 0, 1), capP = barrelCapS(.8, .63, .022, 1), capN = barrelCapS(.8, .63, .022, -1);
  const boltGeo = new THREE.CylinderGeometry(.011, .017, .026, 6); boltGeo.translate(0, .013, 0);
  const sideGeo = plateGeo([[-.08, Bt(-.08)], ...PTS.slice(1, 3).map(([z]) => [z, Bt(z)]), [ZE + .04, Bt(ZE + .04)], ...TOP.slice().reverse()], TP);
  const linerGeo = (() => { const N = 24, top = [], bot = []; for (let k = 0; k <= N; k++) { const z = .02 + (ZE - .06) * k / N; bot.push([z, D(z) + .07]); top.push([z, T(z) - .06]); } return plateGeo([...bot, ...top.reverse()], .02, .003); })();
  const guardGeo = roundGeo(.8, .64, .64, .22), cguardGeo = roundGeo(.44, .4, .36, .14), spGeo = springGeo();
  const rockA = rockGeometry(1, 1), rockB = rockGeometry(1, 2.3), rockC = rockGeometry(1, 3.7);
  const springs = new Inst(), sBolts = new Inst();
  const uvm = (geo, su, sv) => { const u = geo.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * su, u.getY(i) * sv); return geo; };
  const planeY = (w, L) => uvm(new THREE.PlaneGeometry(w, L).rotateX(-Math.PI / 2), w / 1.22, L / 1.22);

  SCREENS.xs.forEach((x, i) => {
    const tag = SCREENS.tags[i];
    const base = new THREE.Group(); base.position.set(x, LV.L1, SCREENS.zFeed); base.userData.pickTag = tag; g.add(base);
    const Y0 = 3.6;
    const body = new THREE.Group(); body.userData.dyn = true; body.position.set(0, Y0, 0); base.add(body); vib.push({ g: body, y0: Y0, ph: i * 1.7 });
    const bb = new Inst();                                              // parafusos huck do corpo (vibram junto)
    const bolt = (p, x0, y0, z0, sx) => bb.add(p, x0, y0, z0, sx, 0, 0);

    // ---- APOIOS: vigas transversais (perfil I), assentos, pares de molas helicoidais e orelhas do corpo
    for (const [zz, ys] of [[.6, 2.05], [6.6, .15]]) {
      box(base, W + 1.6, .025, .3, StD, 0, ys + .15, zz); box(base, W + 1.6, .025, .3, StD, 0, ys - .15, zz); box(base, W + 1.6, .3, .02, StD, 0, ys, zz);
      for (const s of [-1, 1]) {
        if (ys > .5) { box(base, .22, ys - .16, .22, StD, s * 2.3, (ys - .16) / 2, zz); box(base, .4, .03, .4, StD, s * 2.3, .015, zz); }
        box(base, .46, .04, .66, StD, s * 1.82, ys + .18, zz);
        for (const dz of [-.16, .16]) { springs.add(base, s * 1.82, ys + .2, zz + dz); cyl(base, .1, .1, .03, StD, s * 1.82, ys + .215, zz + dz, 14); }
        const yb = ys + .2 + .45 + .04 + .025 - Y0;                       // chapa de assento do corpo
        box(body, .52, .05, .7, M.grey, s * (HW + TP + .26), yb, zz);
        for (const dz of [-.16, .16]) cyl(body, .1, .1, .03, M.grey, s * 1.82, yb - .04, zz + dz, 14);
        for (const dz of [-.3, 0, .3]) { const t = new THREE.Mesh(triGeo, M.grey); sh(t); t.position.set(s * (HW + TP), yb + .025, zz + dz); t.rotation.y = s > 0 ? 0 : Math.PI; body.add(t); }
        for (let k = 0; k < 6; k++) bolt(body, s * (HW + TP), yb + .12 + (k % 3) * .1, zz + (k < 3 ? -.15 : .15), s);
      }
    }

    // ---- LATERAIS: chapa cinza chanfrada + forro interno ferrugem + cantoneiras + flanges das travessas + parafusos
    for (const s of [-1, 1]) {
      const sp = new THREE.Mesh(sideGeo, M.grey); sh(sp); sp.position.x = s > 0 ? HW + TP : -HW; body.add(sp);
      const ln = new THREE.Mesh(linerGeo, Lin); sh(ln); ln.position.x = s > 0 ? HW : -HW + .02; body.add(ln);
      const xo = s * (HW + TP);                                         // face externa
      // cantoneiras de borda (superior e inferior) seguindo o contorno
      const edge = (P, yo) => { for (let k = 0; k < P.length - 1; k++) { const [za, ya] = P[k], [zb, yb] = P[k + 1], L = Math.hypot(zb - za, yb - ya); const e = box(body, .1, .022, L + .02, M.grey, s * (HW + TP / 2), (ya + yb) / 2 + yo, (za + zb) / 2); e.rotation.x = Math.atan2(ya - yb, zb - za); } };
      edge(TOP, .011); edge([[-.08, Bt(-.08)], ...PTS.slice(1, 3).map(([z]) => [z, Bt(z)]), [ZE + .04, Bt(ZE + .04)]], -.011);
      // cantoneiras verticais com duas colunas de parafusos
      for (const zv of [.12, 1.0, 1.75, PTS[1][0], 3.45, PTS[2][0], 5.55, ZE - .12]) {
        const y0 = Bt(zv) + .05, y1 = T(zv) - .05, h = y1 - y0;
        box(body, .012, h, .11, M.grey, s * (HW + TP + .006), (y0 + y1) / 2, zv); box(body, .08, h, .014, M.grey, s * (HW + TP + .04), (y0 + y1) / 2, zv);
        for (let yy = y0 + .08; yy < y1 - .04; yy += .16) for (const dz of [-.034, .034]) bolt(body, xo + s * .012, yy, zv + dz, s);
      }
      // cantoneiras longitudinais (apoio dos decks) por segmento, parafusadas
      SG.forEach((q) => {
        const sg = new THREE.Group(); sg.position.set(0, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2); sg.rotation.x = q.ang; body.add(sg);
        for (const yo of [-.04, -.62]) {
          box(sg, .012, .12, q.L - .14, M.grey, s * (HW + TP + .006), yo, 0); box(sg, .08, .014, q.L - .14, M.grey, s * (HW + TP + .04), yo, 0);
          for (let zz = -q.L / 2 + .14; zz < q.L / 2 - .1; zz += .16) for (const dy of [-.04, .04]) bolt(sg, xo + s * .012, yo + dy, zz, s);
        }
      });
      // flanges circulares das travessas tubulares (círculo de parafusos)
      for (const zc of [1.38, 2.0, 2.85, 4.0, 5.05, 6.0]) {
        const yc = D(zc) - .3; const f = cyl(body, .16, .16, .02, M.grey, s * (HW + TP + .01), yc, zc, 20); f.rotation.z = Math.PI / 2;
        const hb = cyl(body, .085, .085, .07, M.greyDk, s * (HW + TP + .035), yc, zc, 16); hb.rotation.z = Math.PI / 2;
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; bolt(body, xo + s * .02, yc + Math.cos(a) * .125, zc + Math.sin(a) * .125, s); }
      }
    }

    // ---- DECKS: painéis de poliuretano (superior furo grande, inferior furo pequeno), longarinas, travessas
    SG.forEach((q) => {
      const sg = new THREE.Group(); sg.position.set(0, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2); sg.rotation.x = q.ang; body.add(sg);
      const top = new THREE.Mesh(planeY(W - .02, q.L), puMat); top.position.y = .04; top.receiveShadow = true; sg.add(top);
      box(sg, W - .04, .06, q.L, M.greyDk, 0, .0, 0);
      for (let b = 1; b < 6; b++) box(sg, .05, .22, q.L, M.greyDk, -HW + b * W / 6, -.14, 0);
      const lo = new THREE.Mesh(planeY(W - .02, q.L), puMat2); lo.position.y = -.51; lo.receiveShadow = true; sg.add(lo);
      box(sg, W - .04, .05, q.L, M.greyDk, 0, -.545, 0);
      for (let b = 1; b < 6; b++) box(sg, .04, .16, q.L, M.greyDk, -HW + b * W / 6, -.65, 0);
      cyl(sg, .1, .1, W, M.greyDk, 0, -.3, -q.L / 2 + .2, 14).rotation.z = Math.PI / 2;   // travessa tubular
    });
    // bicos de descarga dos decks (lábio de borracha)
    for (const [yo, mt] of [[0, Rub], [-.55, M.greyDk]]) { const lip = box(body, W - .04, .05, .32, mt, 0, YE + yo - .02, ZE + .14); lip.rotation.x = SG[2].ang + .12; }

    // ---- CAIXA DE ALIMENTAÇÃO: chapa traseira com reforços, placa de impacto de borracha
    box(body, W + .06, 2.58, .03, M.grey, 0, .33, -.095);
    for (const yy of [-.4, .5, 1.2]) box(body, W + .06, .1, .06, M.grey, 0, yy, -.14);
    box(body, W - .06, 1.45, .05, Rub, 0, .75, -.055);
    for (let k = 0; k < 9; k++) for (const yy of [-.4, .5, 1.2]) bb.add(body, -HW + .2 + k * (W - .4) / 8, yy, -.17, 0, 0, -1);

    // ---- LEITO CONTÍNUO DE MINÉRIO (malha deformada, cor por vértice, textura escoando) + pedras
    const bedT = TX.oT.clone(), bedN = TX.oN.clone(); bedT.needsUpdate = bedN.needsUpdate = true;
    const bedMat = new THREE.MeshStandardMaterial({ map: bedT, normalMap: bedN, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: .93, metalness: .12 });
    const NS = 72, NX = 18, hw = HW - .04, pos = [], col = [], uv = [], idx = [];
    const nz = (a, b) => .5 * Math.sin(a * 7.1 + b * 3.3) + .3 * Math.sin(a * 13.7 - b * 9.1 + 1.3) + .2 * Math.sin(b * 17.3 + a * 3.1 + i);
    let tau = 0, sPrev = .05;
    for (let a = 0; a <= NS; a++) {
      const sS = .05 + (TOT - .07) * a / NS, f = sS / TOT; onDeck(sS, Q); tau += (sS - sPrev) / vDeck((sS + sPrev) / 2); sPrev = sS;
      for (let b = 0; b <= NX; b++) {
        const xx = -hw + 2 * hw * b / NX, ex = 1 - .45 * Math.pow(Math.abs(xx) / hw, 4), n = nz(xx, sS);
        let h = thick(f) * ex * (1 + .3 * n) + .008 * nz(xx * 3.1, sS * 2.7);
        h = Math.max(.012, h); const yy = .045 + h;
        pos.push(xx, Q.y + Q.ny * yy, Q.z + Q.nz * yy); uv.push(xx * .8, tau * .8);                  // v = tempo de trânsito → textura escoa com a velocidade local
        const dk = .84 + .1 * (1 - Math.min(1, h / .12)) + .04 * n - .08 * f; col.push(dk, dk * .97, dk * .95);
      }
    }
    for (let a = 0; a < NS; a++) for (let b = 0; b < NX; b++) { const p = a * (NX + 1) + b; idx.push(p, p + NX + 1, p + 1, p + 1, p + NX + 1, p + NX + 2); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx); bg.computeVertexNormals();
    const bed = new THREE.Mesh(bg, bedMat); bed.receiveShadow = true; bed.castShadow = true; bed.userData.keep = true; body.add(bed);
    // pedras: retidos (grossos, percorrem o deck todo e caem na calha de descarga do 1º deck), médios (passam pela tela ao
    // longo do caminho, mais no início) e cortina de finos sob o deck (1º → 2º deck → moega do passante)
    const NB = 44, NM = 120, NU = 130;
    const big = oreColors(new THREE.InstancedMesh(i % 2 ? rockA : rockC, rockMat, NB), i * 3 + 1), med = oreColors(new THREE.InstancedMesh(rockB, rockMat, NM), i * 3 + 2), und = oreColors(new THREE.InstancedMesh(rockB, rockMat, NU), i * 3 + 3);
    for (const im of [big, med]) { im.castShadow = im.receiveShadow = true; im.frustumCulled = false; body.add(im); }
    und.frustumCulled = false; body.add(und);
    const mk = (r0, r1) => { const r = r0 + Math.pow(Math.random(), 2) * (r1 - r0); return { s: 0, x: 0, r, sc: V(r * (.8 + Math.random() * .5), r * (.6 + Math.random() * .4), r * (.8 + Math.random() * .5)), a: Math.random() * 6.3, b: Math.random() * 6.3, v: .85 + Math.random() * .3, ph: Math.random() * 6.3, pass: TOT }; };
    const bigP = Array.from({ length: NB }, () => mk(.045, .11)), medP = Array.from({ length: NM }, () => mk(.016, .038));
    const xLim = (p) => hw - .1 - p.r;
    bigP.forEach((p) => { p.s = S0 + Math.random() * (TOT + .5 - S0); p.x = (Math.random() * 2 - 1) * xLim(p); });
    medP.forEach((p) => { p.pass = S0 + (TOT - S0) * .95 * Math.pow(Math.random(), 1.4); p.s = S0 + Math.random() * (p.pass - S0); p.x = (Math.random() * 2 - 1) * xLim(p); });
    const undP = Array.from({ length: NU }, (_, k) => ({ s: S0 + Math.random() * (TOT - S0 - .3), x: (Math.random() * 2 - 1) * (hw - .15), u: Math.random(), lo: k % 3 === 0, r: .01 + Math.random() * .014, v: .8 + Math.random() * .5 }));

    // ---- CONJUNTO VIBRADOR: viga-caixão, 4 excitadores com proteções perfuradas, eixo e acoplamentos
    const ex = new THREE.Group(); ex.position.set(0, 0, 3.1); body.add(ex);
    // viga-caixão amarela (como na foto da 03PN002) com mesas e chapas de ligação cinza nas laterais
    box(ex, W + .36, .46, .44, Yel, 0, .3, 0); box(ex, W + .36, .03, .5, Yel, 0, .545, 0); box(ex, W + .36, .03, .5, Yel, 0, .055, 0);
    for (const s of [-1, 1]) { box(ex, .03, .62, .6, M.grey, s * (HW + .19), .3, 0); for (let k = 0; k < 8; k++) bb.add(ex, s * (HW + .205), .06 + (k % 4) * .16, k < 4 ? -.24 : .24, s, 0, 0); }
    const GX = [-1.14, -.38, .38, 1.14];
    for (const cx of GX) {
      box(ex, .66, .035, .92, Yel, cx, .5725, 0);                         // base flangeada da carcaça
      const gd = new THREE.Mesh(houseGeo, houseMat); sh(gd); gd.position.set(cx, .59, 0); ex.add(gd);      // carcaça arredondada (barril)
      const bd = new THREE.Mesh(bandGeo, Yel); sh(bd); bd.position.set(cx, .585, 0); ex.add(bd);           // cinta central
      for (const s of [-1, 1]) {                                          // tampas laterais parafusadas
        const cp = new THREE.Mesh(s > 0 ? capP : capN, Yel); sh(cp); cp.position.set(cx + s * .29, .59, 0); ex.add(cp);
        barrelProfS(.66, .5).forEach(([z, y], k) => { if (k % 3 === 1) bb.add(ex, cx + s * .32, .62 + y, z, s, 0, 0, .9); });
      }
      box(ex, .1, .07, .045, Yel, cx, 1.29, 0);                           // olhal de içamento sobre a cinta
      for (const dz of [-.42, .42]) for (const dx of [-.26, -.09, .09, .26]) bb.add(ex, cx + dx, .59, dz, 0, 1, 0);
    }
    const shaft = cyl(ex, .05, .05, 3.42, M.greyDk, -.16, .9, 0, 12); shaft.rotation.z = Math.PI / 2;
    // cardãs curtos entre as carcaças: flanges parafusados + cruzeta
    for (const gx of [-.76, 0, .76]) { for (const dx of [-.045, .045]) { const fl = cyl(ex, .09, .09, .022, M.greyDk, gx + dx, .9, 0, 16); fl.rotation.z = Math.PI / 2; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; bb.add(ex, gx + dx * 1.35, .9 + Math.cos(a) * .065, Math.sin(a) * .065, Math.sign(dx), 0, 0, .8); } }
      box(ex, .05, .15, .05, M.greyDk, gx, .9, 0); box(ex, .05, .05, .15, M.greyDk, gx, .9, 0); }
    const brg = cyl(ex, .12, .12, .13, M.greyDk, -1.56, .9, 0, 18); brg.rotation.z = Math.PI / 2;
    box(ex, .16, .32, .3, M.greyDk, -1.56, .72, 0);
    const fl0 = cyl(ex, .1, .1, .03, M.greyDk, -1.86, .9, 0, 16); fl0.rotation.z = Math.PI / 2;
    const ec = cyl(ex, .17, .17, .1, M.grey, 1.53, .9, 0, 22); ec.rotation.z = Math.PI / 2; const ec2 = cyl(ex, .12, .14, .06, M.grey, 1.61, .9, 0, 18); ec2.rotation.z = Math.PI / 2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; bb.add(ex, 1.58, .9 + Math.cos(a) * .145, Math.sin(a) * .145, 1, 0, 0); }

    // ---- MOTOR + CARDÃ (estáticos, sobre pedestal entre as peneiras, lado -x)
    const MZ = 3.1, MY = 4.32, A = V(-2.5, MY, MZ), Bc = V(-1.875, Y0 + .9, MZ), dir = Bc.clone().sub(A).normalize(), at = (d) => A.clone().addScaledVector(dir, d), bt = (d) => Bc.clone().addScaledVector(dir, -d);
    rod(base, at(0), at(.03), .1, M.greyDk); rod(base, at(.03), at(.1), .055, M.greyDk); box(base, .08, .08, .08, M.greyDk, at(.125).x, at(.125).y, at(.125).z);
    rod(base, at(.15), at(.2), .055, M.greyDk); rod(base, at(.2), at(.36), .048, M.greyDk); rod(base, at(.36), bt(.2), .038, M.greyDk);
    rod(base, bt(.2), bt(.15), .055, M.greyDk); box(base, .08, .08, .08, M.greyDk, bt(.125).x, bt(.125).y, bt(.125).z); rod(base, bt(.1), bt(.03), .055, M.greyDk); rod(base, bt(.03), Bc, .1, M.greyDk);
    const mo = new THREE.Group(); mo.position.set(-3.0, MY, MZ); base.add(mo);
    const hub = cyl(mo, .085, .085, .1, M.greyDk, .45, 0, 0, 16); hub.rotation.z = Math.PI / 2;
    const sft = cyl(mo, .035, .035, .12, M.greyDk, .38, 0, 0, 10); sft.rotation.z = Math.PI / 2;
    for (const [xx, r, L] of [[.33, .25, .06], [.0, .26, .64], [-.33, .25, .05], [-.44, .29, .2]]) { const c = cyl(mo, r, r, L, Mot, xx, 0, 0, 28); c.rotation.z = Math.PI / 2; }
    for (let k = 0; k < 30; k++) { const th = k / 30 * Math.PI * 2; if (Math.abs(Math.sin(th) + 1) < .18) continue; const f = box(mo, .6, .045, .012, Mot, 0, Math.sin(th) * .282, Math.cos(th) * .282); f.rotation.x = Math.PI / 2 - th; }
    const grille = new THREE.Mesh(new THREE.CircleGeometry(.27, 28), M.black); grille.rotation.y = -Math.PI / 2; grille.position.x = -.545; mo.add(grille);
    for (const r of [.08, .15, .22]) { const tr = new THREE.Mesh(new THREE.TorusGeometry(r, .009, 6, 32), Mot); tr.rotation.y = Math.PI / 2; tr.position.x = -.547; mo.add(tr); }
    for (let k = 0; k < 6; k++) { const bar = box(mo, .012, .5, .018, Mot, -.548, 0, 0); bar.rotation.x = k / 6 * Math.PI; }
    for (const xx of [.25, -.22]) box(mo, .12, .1, .62, Mot, xx, -.29, 0);
    box(mo, .24, .16, .26, Mot, -.02, .33, .06); box(mo, .26, .025, .28, Mot, -.02, .42, .06);
    cyl(mo, .025, .025, .06, M.black, -.02, .33, .21, 10).rotation.x = Math.PI / 2;
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.035, .01, 6, 14), M.greyDk); eye.position.set(.12, .3, 0); mo.add(eye);
    rod(base, V(-3.02, MY + .33, MZ + .25), V(-3.02, MY - .1, MZ + .5), .016, M.hose); rod(base, V(-3.02, MY - .1, MZ + .5), V(-3.2, .1, MZ + .45), .016, M.hose);
    for (const [xx, zz] of [[.25, -.25], [.25, .25], [-.22, -.25], [-.22, .25]]) sBolts.add(mo, xx, -.24, zz, 0, 1, 0, 1.4);
    // proteção amarela perfurada do acoplamento motor–cardã
    const cg = new THREE.Mesh(cguardGeo, guardMat); sh(cg); cg.position.set(-2.44, MY - .2, MZ); base.add(cg);
    box(base, .4, .03, .5, Yel, -2.44, MY - .21, MZ);
    // pedestal do motor (perfis, contraventamento, chapa de topo)
    const LX = [-2.4, -3.2], LZ = [MZ - .32, MZ + .32], TOPY = MY - .34;
    for (const lx of LX) for (const lz of LZ) { box(base, .1, TOPY, .1, StD, lx, TOPY / 2, lz); box(base, .22, .02, .22, StD, lx, .01, lz); }
    for (const lz of LZ) { box(base, 1.0, .12, .08, StD, -2.8, TOPY - .06, lz); box(base, .9, .07, .07, StD, -2.8, 1.4, lz); rod(base, V(-2.4, .15, lz), V(-3.2, 1.4, lz), .025, StD); rod(base, V(-3.2, 1.45, lz), V(-2.4, TOPY - .12, lz), .025, StD); }
    for (const lx of LX) { box(base, .08, .12, .72, StD, lx, TOPY - .06, MZ); box(base, .07, .07, .64, StD, lx, 1.4, MZ); }
    box(base, 1.05, .03, .76, StD, -2.82, TOPY + .015, MZ);

    // ---- CAIXA DE DESCARGA (estática) sob a descarga dos dois decks
    const z0 = 6.95, z1 = 7.85, zm = (z0 + z1) / 2, yb0 = -.3, yt = 1.25, xw = HW + .14;
    box(base, 2 * xw, yt - yb0, .03, Lin, 0, (yt + yb0) / 2, z1); box(base, 2 * xw - .06, yt - yb0 - .1, .03, Rub, 0, (yt + yb0) / 2, z1 - .03);
    box(base, 2 * xw, .6, .03, Lin, 0, yb0 + .3, z0);
    for (const s of [-1, 1]) { box(base, .03, yt - yb0, z1 - z0, Lin, s * xw, (yt + yb0) / 2, zm); box(base, .03, yt - yb0 - .1, z1 - z0 - .06, Rub, s * (xw - .03), (yt + yb0) / 2, zm); }
    box(base, .025, yt - yb0 - .2, z1 - z0 - .06, Lin, 0, (yt + yb0) / 2 - .1, zm);
    box(base, 2 * xw + .12, .05, .1, StD, 0, yt + .025, z1 + .03); for (const s of [-1, 1]) box(base, .1, .05, z1 - z0 + .1, StD, s * (xw + .03), yt + .025, zm);
    for (const zz of [z0 + .15, z1 - .15]) box(base, 4.7, .2, .16, StD, 0, yb0 - .1, zz);
    for (let k = 0; k < 12; k++) sBolts.add(base, -xw + .1 + k * (2 * xw - .2) / 11, yt + .05, z1 + .03, 0, 1, 0);

    // ---- PASSANTE: moega sob o piso L1 até a correia de finos
    box(base, W + .4, 1.8, 3.8, Lin, 0, -.7, 3.8);
    const funnel = cyl(base, .4, 1.5, 3.2, Lin, 0, -3.3, 3.8, 4); funnel.rotation.y = Math.PI / 4;
    beam(base, V(0, -4.9, 3.8), V(0, -6.0, 3.8 + (20.5 - SCREENS.zFeed - 3.8) * .9), .5, Lin);

    // ---- BICA DE ALIMENTAÇÃO revestida de borracha (alimentador → caixa de alimentação), flanges parafusados
    const cA = V(x, LV.L2 + .05, 3.75), cB = V(x, LV.L1 + Y0 + 1.75, SCREENS.zFeed + .45), cd = cB.clone().sub(cA), cL = cd.length();
    const ch = new THREE.Group(); ch.position.copy(cA); ch.quaternion.setFromUnitVectors(V(0, -1, 0), cd.clone().normalize()); g.add(ch);
    const cw = 1.05, cdp = .75;
    for (const s of [-1, 1]) { box(ch, cw, cL, .02, Lin, 0, -cL / 2, s * cdp / 2); box(ch, .02, cL, cdp, Lin, s * cw / 2, -cL / 2, 0); box(ch, cw - .04, cL, .035, Rub, 0, -cL / 2, s * (cdp / 2 - .028)); box(ch, .035, cL, cdp - .09, Rub, s * (cw / 2 - .028), -cL / 2, 0); }
    for (const yy of [-.3, -cL + .04]) { for (const s of [-1, 1]) { box(ch, cw + .14, .03, .07, StD, 0, yy, s * (cdp / 2 + .035)); box(ch, .07, .03, cdp + .14, StD, s * (cw / 2 + .035), yy, 0); } for (let k = 0; k < 7; k++) for (const s of [-1, 1]) sBolts.add(ch, -cw / 2 + k * cw / 6, yy + .015, s * (cdp / 2 + .04), 0, 1, 0); }
    for (let k = 0; k < 10; k++) { const strip = box(ch, cw / 10 - .008, .28, .015, Rub, -cw / 2 + (k + .5) * cw / 10, -cL - .12, cdp / 2 - .02); strip.rotation.x = .05; }
    // jato de alimentação (cortina de minério escoando da bica sobre o deck)
    const jt = new THREE.Vector3(x, LV.L1 + Y0 + D(.75) + .2, SCREENS.zFeed + .75), jA = cB.clone().add(V(0, -.05, 0)), jd = jt.clone().sub(jA), jL = jd.length();
    const jetT = TX.oT.clone(); jetT.needsUpdate = true; const jetMat = new THREE.MeshStandardMaterial({ map: jetT, color: 0xb0a49a, roughness: .93, metalness: .1 });
    const jet = new THREE.Mesh(uvm(new THREE.BoxGeometry(.78, jL, .12), .62, jL * .8), jetMat); jet.position.copy(jA).addScaledVector(jd, .5); jet.quaternion.setFromUnitVectors(V(0, 1, 0), jd.normalize()); jet.userData.keep = true; jet.castShadow = true; g.add(jet);
    const N2 = 44, fall = oreColors(new THREE.InstancedMesh(rockA, rockMat, N2), i + 40); fall.frustumCulled = false; fall.castShadow = true; g.add(fall);
    const fall0 = jA.clone(), fall1 = jt.clone();
    const drops = Array.from({ length: N2 }, () => ({ u: Math.random(), x: (Math.random() - .5) * .68, z: (Math.random() - .5) * .16, r: .03 + Math.random() * .065 }));

    flows.push({ tag, big, med, und, bigP, medP, undP, xLim, bedT, bedN, bedMat, jetT, jet, fall, drops, fall0, fall1, hw });

    // ---- guarda-corpo frontal com a placa da peneira (foto 03PN002)
    railing(base, V(-W / 2 - .7, 0, 9.0), V(W / 2 + .7, 0, 9.0), Yel);
    plateMesh(base, M.plateY('PENEIRA VIBRATÓRIA PRIMÁRIA', tag), .9, 0, .62, 9.04);
    hot.push({ tag, tipo: 'Peneira vibratória banana · 2 decks', pos: V(x, LV.L1 + 3.6, SCREENS.zFeed + 3.6), info: `${tag} · peneira banana 3,0 × 7,3 m, 2 decks. 1º deck → britagem primária (HP 400); 2º deck → britagem secundária (Barmac); passante < 12,5 mm → pilha.` });

    bb.flush(body, boltGeo, M.greyDk);

    // ---- ALIMENTADOR DE CORREIA (03AL) no piso +14 m: chassi, correia, caixa de guias (saia) bege-ferrugem com
    //      portas de inspeção, moega de recebimento sob o tripper, capota de cabeça sobre a bica, motorredutor e sinaleiro
    const tagA = tag.replace('PN', 'AL');
    const al = new THREE.Group(); al.position.set(x, LV.L2, 0); al.userData.pickTag = tagA; g.add(al);
    const zt = .7, zh = 3.5, zm2 = (zt + zh) / 2, Lf = zh - zt, yP = .42;         // cauda, cabeça, eixo dos tambores
    for (const s of [-1, 1]) {
      box(al, .1, .26, Lf + .7, StD, s * .78, yP, zm2 + .1); box(al, .16, .02, Lf + .7, StD, s * .74, yP + .13, zm2 + .1); box(al, .16, .02, Lf + .7, StD, s * .74, yP - .13, zm2 + .1);
      for (const zz of [zt + .2, zm2, zh - .2]) { box(al, .12, yP - .13, .12, StD, s * .74, (yP - .13) / 2, zz); box(al, .26, .02, .26, StD, s * .74, .01, zz); }
      for (const zz of [zt - .1, zh + .1]) { box(al, .2, .3, .26, M.greyDk, s * .7, yP, zz); }     // mancais dos tambores
    }
    for (const zz of [zt - .1, zh + .1]) cyl(al, .22, .22, 1.28, M.greyDk, 0, yP, zz, 20).rotation.z = Math.PI / 2;
    box(al, 1.2, .02, Lf + .2, Rub, 0, yP + .23, zm2); box(al, 1.2, .02, Lf + .2, Rub, 0, yP - .23, zm2);
    // caixa de guias (saias) com tampa, montantes, cantoneira superior, borracha de vedação e portas de inspeção
    const yS0 = yP + .18, yS1 = 1.55, zs0 = zt - .3, zs1 = zh - .25, Ls = zs1 - zs0, zsm = (zs0 + zs1) / 2;
    for (const s of [-1, 1]) {
      box(al, .035, yS1 - yS0, Ls, feedMat, s * .7, (yS0 + yS1) / 2, zsm); box(al, .05, .1, Ls, Rub, s * .66, yS0 - .03, zsm);
      box(al, .09, .06, Ls + .04, feedMat, s * .7, yS1 + .01, zsm);
      for (let zz = zs0 + .05; zz <= zs1 - .02; zz += .45) box(al, .06, yS1 - yS0, .07, feedMat, s * .735, (yS0 + yS1) / 2, zz);
      for (const zz of [zs0 + .9, zs0 + 2.1]) {
        box(al, .03, .55, .62, feedMat, s * .735, 1.05, zz); box(al, .04, .5, .03, StD, s * .76, 1.05, zz - .25);
        const hd = cyl(al, .018, .018, .14, M.greyDk, s * .77, 1.05, zz + .2, 8); hd.rotation.x = Math.PI / 2;
        for (const dy of [-.22, .22]) for (const dz of [-.25, .25]) sBolts.add(al, s * .75, 1.05 + dy, zz + dz, s, 0, 0);
      }
    }
    box(al, 1.48, .05, Ls, feedMat, 0, yS1 + .045, zsm); box(al, 1.44, yS1 - yS0, .035, feedMat, 0, (yS0 + yS1) / 2, zs0);
    // moega de recebimento (bocal do tripper) com minério à vista
    const hz = 1.45, hop = cyl(al, 1.25, .72, .6, feedMat, 0, yS1 + .37, hz, 4); hop.rotation.y = Math.PI / 4;
    box(al, 1.82, .06, .08, StD, 0, yS1 + .68, hz - .9); box(al, 1.82, .06, .08, StD, 0, yS1 + .68, hz + .9); box(al, .08, .06, 1.82, StD, -.9, yS1 + .68, hz); box(al, .08, .06, 1.82, StD, .9, yS1 + .68, hz);
    box(al, 1.6, .04, 1.6, M.ore, 0, yS1 + .675, hz);
    // capota de cabeça (envolve o tambor motriz e despeja na bica), com flange horizontal parafusado
    const zc0 = zh - .3, zc1 = zh + .62, zcm = (zc0 + zc1) / 2, ycT = 1.75;
    for (const s of [-1, 1]) box(al, .035, ycT, zc1 - zc0, feedMat, s * .82, ycT / 2, zcm);
    box(al, 1.68, ycT, .035, feedMat, 0, ycT / 2, zc1); box(al, 1.68, ycT - yS1, .035, feedMat, 0, (ycT + yS1) / 2, zc0); box(al, 1.72, .05, zc1 - zc0 + .04, feedMat, 0, ycT + .02, zcm);
    box(al, 1.76, .05, .08, StD, 0, .95, zc1 + .02); for (const s of [-1, 1]) box(al, .08, .05, zc1 - zc0, StD, s * .86, .95, zcm);
    for (let k = 0; k < 8; k++) sBolts.add(al, -.75 + k * 1.5 / 7, .975, zc1 + .02, 0, 1, 0);
    box(al, 1.0, .5, .03, feedMat, 0, 1.4, zc1 + .02);                  // porta de inspeção da cabeça
    for (const xx of [-.42, .42]) box(al, .07, ycT - .1, .05, feedMat, xx, (ycT - .1) / 2, zc1 + .03);   // nervuras da capota
    for (const s of [-1, 1]) for (const zz of [zc0 + .3, zc1 - .3]) box(al, .05, ycT - .1, .07, feedMat, s * .845, (ycT - .1) / 2, zz);
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) sBolts.add(al, s * (.12 + k * .07), 1.67, zc1 + .035, 0, 0, 1);
    plateMesh(al, M.plateY('ALIMENTADOR', tagA), .72, 0, .55, zc1 + .025);
    // motorredutor de eixo oco no tambor motriz (lado +x), motor horizontal, braço de torção e proteção
    const xg = 1.1;
    cyl(al, .05, .05, .32, M.greyDk, .95, yP, zh + .1, 10).rotation.z = Math.PI / 2;
    box(al, .3, .62, .5, M.grey, xg, yP + .08, zh + .1); cyl(al, .24, .24, .3, M.grey, xg, yP + .1, zh + .1, 20).rotation.z = Math.PI / 2;
    box(al, .34, .05, .54, M.greyDk, xg, yP + .4, zh + .1);
    const bell = cyl(al, .13, .16, .22, M.grey, xg, yP + .24, zh - .26, 16); bell.rotation.x = Math.PI / 2;
    const mt = cyl(al, .17, .17, .48, Mot, xg, yP + .24, zh - .62, 22); mt.rotation.x = Math.PI / 2;
    const fan = cyl(al, .16, .16, .1, Mot, xg, yP + .24, zh - .91, 22); fan.rotation.x = Math.PI / 2;
    box(al, .14, .12, .16, Mot, xg, yP + .45, zh - .6);
    for (let k = 0; k < 10; k++) { const th = k / 10 * Math.PI * 2; const f = box(al, .012, .04, .44, Mot, xg + Math.cos(th) * .185, yP + .24 + Math.sin(th) * .185, zh - .62); f.rotation.z = th; }
    beam(al, V(xg, yP - .2, zh + .1), V(xg, .02, zh + .1), .06, StD); box(al, .2, .02, .2, StD, xg, .01, zh + .1);
    rod(al, V(xg, yP + .5, zh - .6), V(xg + .25, yP + .9, zh - .4), .014, M.hose); rod(al, V(xg + .25, yP + .9, zh - .4), V(xg + .3, .05, zh - .1), .014, M.hose);
    // botoeira local e sinaleiro de status (azul = operando)
    beam(al, V(-1.1, 0, zc1 - .1), V(-1.1, 1.25, zc1 - .1), .06, StD); box(al, .22, .3, .14, M.grey, -1.1, 1.1, zc1 - .02); cyl(al, .03, .03, .03, btnMat, -1.1, 1.15, zc1 + .06, 10).rotation.x = Math.PI / 2;
    cyl(al, .05, .06, .1, M.greyDk, .6, ycT + .1, zc1 - .15, 12);
    const bc = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5ff0ff, emissive: 0x5ff0ff, emissiveIntensity: 4 })); bc.scale.y = 1.25; bc.position.set(.6, ycT + .23, zc1 - .15); bc.userData.keep = true; al.add(bc); beacons[tag] = bc;
    hot.push({ tag: tag.replace('PN', 'AL'), tipo: 'Alimentador da peneira', pos: V(x, LV.L2 + 2.2, 3.2), info: `${tag.replace('PN', 'AL')} · alimentador da peneira ${tag}. Sinaleiro: azul = operando.` });
  });
  springs.flush(g, spGeo, M.yellowClean || Yel, true);
  sBolts.flush(g, boltGeo, M.greyDk);

  const COL = { ok: 0x5ff0ff, warn: 0xffb020, crit: 0xff3b2f, off: 0x4a525a };
  // caixas de seleção por equipamento (para o clique no 3D), calculadas antes da fusão das malhas
  const pick = []; g.updateMatrixWorld(true);
  g.children.forEach((c) => { if (c.userData.pickTag) pick.push({ tag: c.userData.pickTag, box: new THREE.Box3().setFromObject(c) }); });

  // posição de uma pedra no deck (ou em queda livre após o bico de descarga): apoiada no leito, meio enterrada, com os
  // "pulos" da vibração (16 Hz) e rolando conforme anda; nunca além das laterais nem flutuando
  const G2 = SG[2], vEnd = VSEG[2];
  const place = (im, i, p, t, k, sink, hw) => {
    if (p.s <= TOT) {
      onDeck(p.s, Q); const f = p.s / TOT, ex = 1 - .45 * Math.pow(Math.min(1, Math.abs(p.x) / hw), 4);
      const hop = k > 0 ? (.006 + .01 * (1 - f)) * Math.max(0, Math.sin(t * 100.5 + p.ph)) : 0;
      const hh = .045 + Math.max(.012, thick(f) * ex * .9) + p.r * .35 + hop - sink;
      p4.set(p.x, Q.y + Q.ny * hh, Q.z + Q.nz * hh);
    } else { const tau = (p.s - TOT) / (vEnd * p.v), v0 = vEnd * p.v; p4.set(p.x, YE + .06 + p.r * .5 + G2.dy * v0 * tau - 4.9 * tau * tau, ZE + .05 + G2.dz * v0 * tau); }
    e4.set(p.a + p.s / (p.r * 2.2), p.b, p.a * .5 + p.s / (p.r * 4)); q4.setFromEuler(e4); m4.compose(p4, q4, p.sc); im.setMatrixAt(i, m4);
  };
  const adv = (p, dt, k) => { p.s += dt * k * p.v * (p.s < TOT ? vDeck(p.s) : vEnd); };
  const rnd = (n) => Math.random() * n;
  return { group: g, hotspots: hot, pick, beacons, update(dt, t, S) {
    const E = S ? S.eq : {}; dt = Math.min(dt, .1);
    // umidade alta (> 9 %): minério mais escuro, mais brilhante (molhado) e escoando mais devagar
    const wf = S && S.moist != null ? Math.min(1, Math.max(0, (S.moist - 9) / 2.5)) : 0, wetK = 1 - .4 * wf;
    { const w = 1 - .5 * wf; rockMat.color.setRGB(.44 * w, .37 * w, .33 * w); }   // cor por instância é linear: escala para albedo de minério (~120/255) rockMat.roughness = .78 - .33 * wf;
    // vibração do corpo: 16 Hz (≈ 100 rad/s), curso de ~10 mm em elipse
    vib.forEach((v, i) => { const e = E[SCREENS.tags[i]] || { on: true, flow: 800, load: .55 }; const a = e.on && e.flow > 0 ? .0045 + .0015 * Math.min(1.3, e.load) : 0; v.g.position.y = v.y0 + Math.sin(t * 100.5 + v.ph) * a; v.g.position.z = Math.cos(t * 100.5 + v.ph) * a * .7; });
    for (const f of flows) {
      const e = E[f.tag] || { on: true, flow: 800, load: .55 }, run = !!(e.on && e.flow > 0);
      f.jet.visible = f.fall.visible = f.und.visible = run;
      f.bedMat.color.setScalar(1 - .38 * wf); f.jet.material.color.setRGB(.69 * (1 - .38 * wf), .64 * (1 - .38 * wf), .6 * (1 - .38 * wf));
      if (!run && f.init) continue;                                  // peneira parada: o material fica parado no deck
      f.init = true;
      const L = run ? Math.min(1, Math.max(.2, .25 + e.flow / 1200)) : .5;   // vazão → quantidade de material
      const k = run ? (.85 + .25 * Math.min(1.3, e.load)) * wetK : 0;        // carga/umidade → velocidade de escoamento
      f.bedT.offset.y -= dt * k * .8; f.bedN.offset.y = f.bedT.offset.y; f.jetT.offset.y -= dt * (run ? 2.6 : 0);
      f.jet.scale.x = .45 + .55 * L;
      const nb = Math.max(4, Math.round(f.bigP.length * L)); f.big.count = nb;
      for (let i = 0; i < nb; i++) { const p = f.bigP[i]; adv(p, dt, k); if (p.s > TOT + vEnd * p.v * .55) { p.s = S0 + rnd(.3); p.x = (rnd(2) - 1) * f.xLim(p); } place(f.big, i, p, t, k, 0, f.hw); }
      const nm = Math.round(f.medP.length * L); f.med.count = nm;
      for (let i = 0; i < nm; i++) { const p = f.medP[i]; adv(p, dt, k); if (p.s > p.pass) { p.pass = S0 + (TOT - S0) * .95 * Math.pow(Math.random(), 1.4) + .2; p.s = S0 + rnd(.3); p.x = (rnd(2) - 1) * f.xLim(p); } const sink = Math.min(1, Math.max(0, (p.s - (p.pass - .3)) / .3)) * (p.r * 1.6 + .03); place(f.med, i, p, t, k, sink, f.hw); }
      f.big.instanceMatrix.needsUpdate = f.med.instanceMatrix.needsUpdate = true;
      // cortina de finos sob o deck: 1º deck → 2º deck (curta) e 2º deck → moega do passante (longa)
      const nu = Math.round(f.undP.length * L); f.und.count = nu;
      for (let i = 0; i < nu; i++) { const d = f.undP[i]; d.u += dt * (d.lo ? 1.1 : 2.4) * d.v * (run ? 1 : 0);
        if (d.u > 1) { d.u -= 1; d.s = S0 + (TOT - S0 - .3) * Math.pow(Math.random(), 1.5); d.x = (rnd(2) - 1) * (f.hw - .15); }
        onDeck(d.s, Q); const y0 = d.lo ? -.6 : -.05, y1 = d.lo ? -3.3 - Q.y : -.48, yy = y0 + (y1 - y0) * d.u * d.u;
        p4.set(d.x, Q.y + Q.ny * Math.min(y0, -.05) + (yy - y0), Q.z + Q.nz * y0); e4.set(t * 5 + i, i, 0); q4.setFromEuler(e4); s4.set(d.r, d.r * 1.6, d.r); m4.compose(p4, q4, s4); f.und.setMatrixAt(i, m4); }
      f.und.instanceMatrix.needsUpdate = true;
      // cortina de alimentação: pedras acelerando da bica até o deck
      const nd = Math.round(f.drops.length * L); f.fall.count = nd;
      for (let i = 0; i < nd; i++) { const d = f.drops[i]; d.u += dt * 1.7 * (run ? 1 : 0); if (d.u > 1) { d.u -= 1; d.x = (Math.random() - .5) * .68; } p4.lerpVectors(f.fall0, f.fall1, d.u * d.u); p4.x += d.x * (.55 + .45 * d.u); p4.z += d.z; e4.set(t * 4 + i, i, 0); q4.setFromEuler(e4); s4.set(d.r, d.r * .75, d.r * 1.1); m4.compose(p4, q4, s4); f.fall.setMatrixAt(i, m4); }
      f.fall.instanceMatrix.needsUpdate = true;
    }
    for (const [tag, b] of Object.entries(beacons)) { const e = E[tag] || { st: 'ok' }; const c = COL[e.st] || COL.ok; b.material.color.setHex(c); b.material.emissive.setHex(c); b.material.emissiveIntensity = e.st === 'off' ? .15 : e.st === 'crit' ? (Math.sin(t * 9) > 0 ? 6 : .5) : 2.5 + Math.max(0, Math.sin(t * 6 + tag.length)) * 3; }
  } };
}
