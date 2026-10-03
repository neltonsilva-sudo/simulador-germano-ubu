// Materiais procedurais (texturas em canvas): aço pintado empoeirado de minério, concreto com manchas/poças,
// pintura bege dos britadores, amarelo de segurança, borracha/poliuretano, grade de piso, correia.
import * as THREE from 'three';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvasTex(size, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function blotches(x, s, n, rMin, rMax, colorFn) {
  for (let i = 0; i < n; i++) {
    const r = rMin + rnd() * (rMax - rMin), cx = rnd() * s, cy = rnd() * s;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = colorFn(); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
}
function speckle(x, s, n, a, col) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${col},${a * rnd()})`; const w = 1 + rnd() * 2; x.fillRect(rnd() * s, rnd() * s, w, w); } }
function streaks(x, s, n, col) { for (let i = 0; i < n; i++) { const px = rnd() * s, len = s * (.1 + rnd() * .5), w = 1 + rnd() * 3; const g = x.createLinearGradient(px, 0, px, len); g.addColorStop(0, `rgba(${col},${.25 + rnd() * .3})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(px, rnd() * s * .3, w, len); } }

// cor base + poeira de minério (marrom-avermelhado) + escorridos
function dusty(base, { dust = .5, stain = 30, streak = 40, size = 512, repeat = [1, 1] } = {}) {
  return canvasTex(size, (x, s) => {
    x.fillStyle = base; x.fillRect(0, 0, s, s);
    blotches(x, s, stain, s * .05, s * .3, () => `rgba(120,58,30,${.12 * dust + rnd() * .25 * dust})`);
    blotches(x, s, stain / 2, s * .03, s * .15, () => `rgba(60,34,22,${rnd() * .18 * dust})`);
    streaks(x, s, streak * dust, '96,46,24');
    speckle(x, s, 4000, .25, '70,35,20'); speckle(x, s, 2500, .2, '230,220,200');
  }, { repeat });
}
function roughMap(size, base, puddles = 0, repeat = [1, 1]) {
  return canvasTex(size, (x, s) => {
    const v = Math.round(base * 255); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, 0, s, s);
    blotches(x, s, 40, s * .04, s * .2, () => `rgba(255,255,255,${rnd() * .15})`);
    if (puddles) blotches(x, s, puddles, s * .06, s * .22, () => `rgba(0,0,0,${.6 + rnd() * .35})`);
  }, { repeat, srgb: false });
}

export function buildMaterials(renderer) {
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // concreto do piso: cinza com lama de minério e poças (foto noturna dos britadores)
  const floorMap = canvasTex(1024, (x, s) => {
    x.fillStyle = '#8e8277'; x.fillRect(0, 0, s, s);
    blotches(x, s, 90, s * .03, s * .18, () => `rgba(${130 + rnd() * 40 | 0},${60 + rnd() * 25 | 0},${35 + rnd() * 15 | 0},${.2 + rnd() * .35})`);
    blotches(x, s, 30, s * .02, s * .08, () => `rgba(80,45,30,${.3 + rnd() * .3})`);
    speckle(x, s, 20000, .25, '40,25,18'); speckle(x, s, 8000, .2, '200,190,175');
    x.strokeStyle = 'rgba(40,28,20,.35)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4, s); x.stroke(); x.beginPath(); x.moveTo(0, i * s / 4); x.lineTo(s, i * s / 4); x.stroke(); }
  }, { repeat: [6, 3] });
  M.floor = std({ map: floorMap, roughnessMap: roughMap(512, .85, 16, [6, 3]), roughness: 1, metalness: 0 });
  M.concrete = std({ map: dusty('#a39a90', { dust: .7, repeat: [2, 2] }), roughness: .92 });
  M.plinth = std({ map: dusty('#8f7a6a', { dust: 1.2, repeat: [1, 1] }), roughness: .9 });
  // estrutura metálica: laranja-ferrugem (pintura + pó de minério)
  M.steel = std({ map: dusty('#9a5a32', { dust: .9, repeat: [1, 3] }), roughness: .7, metalness: .35 });
  M.steelDk = std({ map: dusty('#6e3f25', { dust: 1, repeat: [1, 2] }), roughness: .75, metalness: .3 });
  M.chute = std({ map: dusty('#7d4a2e', { dust: 1.2, streak: 80, repeat: [1, 1] }), roughness: .8, metalness: .4 });
  M.grey = std({ map: dusty('#9aa0a2', { dust: .7, repeat: [1, 1] }), roughness: .55, metalness: .5 });
  M.greyDk = std({ map: dusty('#5d6466', { dust: .5 }), roughness: .5, metalness: .55 });
  M.yellow = std({ map: dusty('#e8b416', { dust: .55, streak: 25 }), roughness: .5, metalness: .1 });
  M.yellowClean = std({ color: 0xf0c020, roughness: .45, metalness: .05 });
  M.beige = std({ map: dusty('#d8d0bb', { dust: .8, streak: 70 }), roughness: .55, metalness: .25 });
  M.orange = std({ map: dusty('#c0702c', { dust: .7 }), roughness: .55, metalness: .3 });
  M.rubber = std({ color: 0x2a2a2a, roughness: .9 });
  M.pu = std({ map: dusty('#77736d', { dust: .9, repeat: [1, 1] }), roughness: .85 });
  M.belt = std({ color: 0x1f1d1b, roughness: .85 });
  M.ore = std({ map: dusty('#6b3a22', { dust: 1.5, repeat: [2, 2] }), roughness: .95 });
  M.motor = std({ map: dusty('#4a5a68', { dust: .5 }), roughness: .45, metalness: .6 });
  M.blue = std({ color: 0x2a6cc0, roughness: .4 });
  M.white = std({ color: 0xe9e7e2, roughness: .6 });
  M.black = std({ color: 0x151515, roughness: .6 });
  M.glass = std({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 6, roughness: .2 });
  M.cladIn = std({ map: canvasTex(512, (x, s) => { x.fillStyle = '#7d6a5c'; x.fillRect(0, 0, s, s); for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.06)'; x.fillRect(i * s / 32, 0, s / 64, s); } blotches(x, s, 40, s * .05, s * .3, () => `rgba(110,55,30,${rnd() * .35})`); streaks(x, s, 80, '90,45,25'); }, { repeat: [6, 1] }), roughness: .75, metalness: .4, side: THREE.DoubleSide });
  M.cladOut = std({ map: canvasTex(512, (x, s) => { x.fillStyle = '#1f7a4f'; x.fillRect(0, 0, s, s); for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.08)'; x.fillRect(i * s / 32, 0, s / 64, s); } blotches(x, s, 30, s * .05, s * .3, () => `rgba(120,60,30,${rnd() * .3})`); }, { repeat: [8, 1] }), roughness: .6, metalness: .3 });
  // grade de piso (alpha)
  const grate = canvasTex(256, (x, s) => { x.fillStyle = '#000'; x.fillRect(0, 0, s, s); x.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { x.fillRect(i * s / 16, 0, 3, s); } for (let j = 0; j < 6; j++) x.fillRect(0, j * s / 6, s, 4); }, { repeat: [8, 2], srgb: false });
  M.grate = std({ color: 0x8a5634, alphaMap: grate, alphaTest: .5, transparent: false, roughness: .7, metalness: .5, side: THREE.DoubleSide });
  M.plateY = (t1, t2) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#ffd400'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#111'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 240); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 40px Arial'; x.fillText(t1, 256, 80); x.font = 'bold 110px Arial'; x.fillText(t2, 256, 205); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return std({ map: t, roughness: .5 }); };
  M.plateW = (t1, t2) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f3f2ee'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#222'; x.lineWidth = 8; x.strokeRect(8, 8, 496, 240); x.fillStyle = '#111'; x.textAlign = 'center'; x.font = 'bold 40px Arial'; x.fillText(t1, 256, 80); x.font = 'bold 104px Arial'; x.fillText(t2, 256, 200); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return std({ map: t, roughness: .5 }); };
  M.plateB = (t1, t2) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#1f5fb0'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 44px Arial'; x.fillText(t1, 256, 90); x.font = 'bold 100px Arial'; x.fillText(t2, 256, 205); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return std({ map: t, roughness: .4 }); };
  M.warn = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 256, 60); x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.fillText('ATENÇÃO - PERIGO', 128, 42); x.fillStyle = '#111'; x.font = '22px Arial'; ['Não olhe dentro da câmara', 'de britagem enquanto o', 'britador estiver', 'operando'].forEach((l, i) => x.fillText(l, 128, 110 + i * 32)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return std({ map: t, roughness: .5 }); };
  return M;
}
