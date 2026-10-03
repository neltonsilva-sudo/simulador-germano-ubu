// Primitivas de modelagem compartilhadas (metros, Y para cima).
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function sh(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }
export function box(p, w, h, d, mat, x, y, z, ry = 0) { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; }
// cilindros: u constante (sem 'aresta' falsa na costura do UV para o shader de bordas gastas)
export function flatU(g) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setX(i, .5); return g; }
export function cyl(p, rt, rb, h, mat, x, y, z, seg = 24) { const m = sh(new THREE.Mesh(flatU(new THREE.CylinderGeometry(rt, rb, h, seg)), mat)); m.position.set(x, y, z); p.add(m); return m; }
export function beam(p, a, b, s, mat, round = false) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = round ? flatU(new THREE.CylinderGeometry(s, s, L, 10)) : new THREE.BoxGeometry(s, L, s);
  const m = sh(new THREE.Mesh(g, mat)); m.position.copy(a).addScaledVector(d, .5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); p.add(m); return m;
}
// perfil I (coluna/viga) entre dois pontos verticais ou horizontais
export function ibeam(p, a, b, h, w, mat) {
  const g = new THREE.Group(); const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const fl = .025 * (h / .4), web = .02 * (h / .4);
  box(g, w, L, fl, mat, 0, 0, h / 2 - fl / 2); box(g, w, L, fl, mat, 0, 0, -h / 2 + fl / 2); box(g, web, L, h, mat, 0, 0, 0);
  g.position.copy(a).addScaledVector(d, .5); g.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); p.add(g); return g;
}
// guarda-corpo amarelo: corrimão, travessa intermediária, rodapé e montantes
export function railing(p, a, b, mat, h = 1.1) {
  beam(p, V(a.x, a.y + h, a.z), V(b.x, b.y + h, b.z), .025, mat, true);
  beam(p, V(a.x, a.y + h * .5, a.z), V(b.x, b.y + h * .5, b.z), .02, mat, true);
  const L = a.distanceTo(b), n = Math.max(1, Math.round(L / 1.5));
  for (let i = 0; i <= n; i++) { const q = a.clone().lerp(b, i / n); beam(p, q, V(q.x, q.y + h, q.z), .025, mat, true); }
  const kick = beam(p, V(a.x, a.y + .07, a.z), V(b.x, b.y + .07, b.z), .005, mat); kick.scale.set(1, 1, 30);
}
// escada reta com degraus e corrimãos dos dois lados
export function stairs(p, x, y0, z, rise, run, width, dir, mat, rail) {
  const n = Math.round(rise / .18), g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = dir; p.add(g);
  for (let i = 0; i < n; i++) box(g, width, .04, run / n * 1.1, mat, 0, (i + 1) * rise / n, (i + .5) * run / n);
  for (const s of [-1, 1]) {
    beam(g, V(s * width / 2, 0, 0), V(s * width / 2, rise, run), .06, mat);
    railing(g, V(s * (width / 2 + .03), 0, 0), V(s * (width / 2 + .03), rise, run), rail, 1.0);
  }
  return g;
}
export function plateMesh(p, mat, w, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), mat); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; }
// pedra irregular (facetada) para o minério: icosaedro com deslocamento radial coerente por posição (sem rachar faces)
export function rockGeometry(r = 1, k = 1) {
  const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position, v = new THREE.Vector3();
  const h = (x, y, z) => { const s = Math.sin(x * 12.9898 * k + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const q = .62 + .55 * h(Math.round(v.x * 100), Math.round(v.y * 100), Math.round(v.z * 100)); v.multiplyScalar(q * r); v.y *= .72; P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
// cores de minério de ferro por instância (hematita cinza-metálica, itabirito marrom-avermelhado, finos escuros)
const ORE_COLS = [[.62, .42, .34], [.48, .33, .27], [.55, .53, .54], [.38, .3, .27], [.7, .5, .4], [.44, .42, .43]];
export function oreColors(im, seed = 1) { const c = new THREE.Color(); let s = seed * 9301 + 49297; for (let i = 0; i < im.count; i++) { s = (s * 9301 + 49297) % 233280; const k = ORE_COLS[Math.floor(s / 233280 * ORE_COLS.length)], j = .85 + (s % 97) / 97 * .3; c.setRGB(k[0] * j, k[1] * j, k[2] * j); im.setColorAt(i, c); } if (im.instanceColor) im.instanceColor.needsUpdate = true; return im; }
