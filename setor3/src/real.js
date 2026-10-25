// Modo realista (teste): texturas escaneadas de materiais reais (Poly Haven, CC0) no piso, estruturas e equipamentos + céu real de pedreira.
// Liga e desliga em tempo real (guarda os mapas originais para voltar exatamente ao visual padrão).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const base = 'tex/', KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'roughness', 'metalness'];
let ctx = null;
function prep(scene, M, renderer) {
  if (ctx) return ctx;
  const L = new THREE.TextureLoader(), an = Math.min(8, renderer.capabilities.getMaxAnisotropy()), cache = {};
  const tx = (f, srgb) => cache[f] || (cache[f] = (() => { const t = L.load(base + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = an; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; })());
  const plan = [['floor', 'concrete_floor_worn_001', 0xd2ad96, true], ['slab', 'concrete_floor_worn_001', 0xd8c0b0, true], ['steel', 'rusty_painted_metal', null, true], ['steelDk', 'rusty_painted_metal', 0x8c7c72, true],
    ['hp', 'rusty_painted_metal', null, false], ['yellow', 'rusty_painted_metal', null, false], ['orange', 'rusty_painted_metal', null, false]];
  const orig = plan.filter(([k]) => M[k]).map(([k, a, tint, col]) => { const m = M[k], o = { m, color: m.color.clone() }; KEYS.forEach((q) => (o[q] = m[q]));
    o.real = { normalMap: tx(a + '_nor_1k.jpg'), roughnessMap: tx(a + '_arm_1k.jpg'), metalnessMap: tx(a + '_arm_1k.jpg'), roughness: 1, metalness: 1, ...(col ? { map: tx(a + '_diff_1k.jpg', true) } : {}) }; o.tint = tint; return o; });
  const dome = scene.getObjectByName('sky'); ctx = { orig, dome, domeMap: dome && dome.material.map, domeCol: dome && dome.material.color.clone(), sky: null };
  /* céu de pedreira: o HDR vira uma imagem comum (tons comprimidos) aplicada na cúpula do céu */
  new RGBELoader().setDataType(THREE.FloatType).load(base + 'quarry_01_puresky_1k.hdr', (h) => {
    const w = h.image.width, H = h.image.height, D = h.image.data, c = document.createElement('canvas'); c.width = w; c.height = H; const x = c.getContext('2d'), im = x.createImageData(w, H);
    for (let p = 0, q = 0; p < w * H; p++, q += 4) { for (let k = 0; k < 3; k++) { let v = D[p * 4 + k] * 1.3; v = v / (1 + v); im.data[q + k] = Math.min(255, Math.pow(v, 1 / 2.2) * 255); } im.data[q + 3] = 255; }
    x.putImageData(im, 0, 0); ctx.sky = new THREE.CanvasTexture(c); ctx.sky.colorSpace = THREE.SRGBColorSpace; h.dispose(); if (ctx.on) setDome(true); });
  return ctx;
}
function setDome(on) { const d = ctx.dome; if (!d) return; if (on && ctx.sky) { d.material.map = ctx.sky; d.material.color.setScalar(1.25); } else { d.material.map = ctx.domeMap; d.material.color.copy(ctx.domeCol); } d.material.needsUpdate = true; }
export function setReal(scene, M, renderer, on) {
  prep(scene, M, renderer); ctx.on = on;
  for (const o of ctx.orig) { const m = o.m; if (on) { Object.assign(m, o.real); if (o.tint != null && o.real.map) m.color.set(o.tint); } else { KEYS.forEach((q) => (m[q] = o[q])); m.color.copy(o.color); } m.needsUpdate = true; }
  setDome(on);
}
