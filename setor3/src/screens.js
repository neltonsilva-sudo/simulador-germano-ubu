// 8 peneiras vibratórias tipo banana, 2 decks (fotos 03PN002 e câmera do prédio): laterais de aço com nervuras e parafusos,
// caixa de alimentação, deck superior de painéis de poliuretano com relevo piramidal, deck inferior, vibradores amarelos modulares,
// molas sobre vigas, calhas de descarga, moegas de passante; alimentadores 03AL no piso superior com placa azul e sinaleiro.
import * as THREE from 'three';
import { SCREENS, LV } from './layout.js';
import { V, box, cyl, beam, railing, plateMesh } from './util.js';

const SEG = [[2.6, 28], [2.4, 18], [2.3, 9]];   // segmentos da banana: comprimento (m), inclinação (graus)

export function buildScreens(scene, M) {
  const g = new THREE.Group(); scene.add(g);
  const vib = [], beacons = {}, hot = [];
  const pyrGeo = new THREE.ConeGeometry(.17, .1, 4); pyrGeo.rotateY(Math.PI / 4);
  const boltGeo = new THREE.CylinderGeometry(.025, .025, .04, 6); boltGeo.rotateZ(Math.PI / 2);
  SCREENS.xs.forEach((x, i) => {
    const tag = SCREENS.tags[i], w = SCREENS.w;
    const base = new THREE.Group(); base.position.set(x, LV.L1, SCREENS.zFeed); g.add(base);
    // vigas de apoio e molas
    const Y0 = 3.6;
    const body = new THREE.Group(); body.position.set(0, Y0, 0); base.add(body); vib.push({ g: body, y0: Y0, ph: i * 1.7 });
    // apoios: viga transversal na alimentação e na descarga, com pares de molas sob as orelhas laterais
    for (const [zz, ys] of [[.6, 2.05], [6.6, .15]]) {
      box(base, w + 1.4, .35, .35, M.steelDk, 0, ys, zz);
      for (const s of [-1, 1]) { for (let k = 0; k < 2; k++) cyl(base, .09, .09, .38, M.yellowClean, s * (w / 2 + .32), ys + .37, zz + (k - .5) * .26, 12); box(base, .4, .08, .7, M.grey, s * (w / 2 + .32), ys + .6, zz); }
      for (const s of [-1, 1]) box(base, .3, Math.max(.1, ys), .3, M.steelDk, s * (w / 2 + .6), ys / 2, zz);
    }
    // decks em banana: perfil (z, y) acumulado
    let z = 0, y = 0; const pts = [[z, y]];
    for (const [L, a] of SEG) { const r = a * Math.PI / 180; z += L * Math.cos(r); y -= L * Math.sin(r); pts.push([z, y]); }
    for (let k = 0; k < SEG.length; k++) {
      const [z0, y0] = pts[k], [z1, y1] = pts[k + 1], L = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y0 - y1, z1 - z0);
      const seg = new THREE.Group(); seg.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); seg.rotation.x = ang; body.add(seg);
      box(seg, w - .1, .08, L, M.pu, 0, 0, 0);                         // deck superior (poliuretano)
      const nz = Math.floor(L / .42), nx = Math.floor((w - .3) / .42);
      const im = new THREE.InstancedMesh(pyrGeo, M.pu, nz * nx); let c = 0; const m4 = new THREE.Matrix4();
      for (let a = 0; a < nz; a++) for (let b = 0; b < nx; b++) { m4.makeTranslation(-(w - .3) / 2 + .21 + b * .42, .09, -L / 2 + .21 + a * .42); im.setMatrixAt(c++, m4); }
      im.castShadow = true; im.receiveShadow = true; seg.add(im);
      box(seg, w - .1, .06, L, M.greyDk, 0, -.55, 0);                 // deck inferior
      for (let b = 1; b < 4; b++) box(seg, .08, .5, L, M.grey, -w / 2 + b * w / 4, -.3, 0); // travessas longitudinais
      for (const s of [-1, 1]) {                                        // laterais com nervuras e parafusos
        box(seg, .05, 1.35, L + .02, M.grey, s * w / 2, .05, 0);
        for (let r = 0; r < 4; r++) box(seg, .09, 1.35, .1, M.grey, s * (w / 2 + .04), .05, -L / 2 + (r + .5) * L / 4);
        const bi = new THREE.InstancedMesh(boltGeo, M.greyDk, 24); let q = 0;
        for (let a = 0; a < 12; a++) for (const yy of [.6, -.5]) { m4.makeTranslation(s * (w / 2 + .03), yy, -L / 2 + (a + .5) * L / 12); bi.setMatrixAt(q++, m4); }
        seg.add(bi);
      }
    }
    // caixa de alimentação (paredes altas, onde cai o minério do alimentador)
    box(body, w + .1, 1.6, .08, M.grey, 0, .7, -.05);
    for (const s of [-1, 1]) box(body, .08, 1.6, 1.4, M.grey, s * (w / 2 + .02), .7, .65);
    const ore = new THREE.Mesh(new THREE.BoxGeometry(w - .3, .25, 2.2), M.ore); ore.position.set(0, .2, 1.2); ore.rotation.x = .45; body.add(ore);
    // conjunto vibrador: viga transversal + 4 módulos amarelos com aletas (foto)
    const ex = new THREE.Group(); ex.position.set(0, 1.25, 3.1); body.add(ex);
    box(ex, w + .9, .3, .45, M.grey, 0, 0, 0);
    for (let k = 0; k < 4; k++) { const m = box(ex, .62, .62, .78, M.yellow, -1.05 + k * .7, .45, 0); for (let f = 0; f < 4; f++) box(ex, .64, .04, .06, M.black, -1.05 + k * .7, .28 + f * .11, .4); }
    cyl(ex, .07, .07, w + .7, M.greyDk, 0, .45, 0, 10).rotation.z = Math.PI / 2;
    // calhas de descarga e moega do passante (abaixo, até a correia do térreo)
    const zEnd = pts[3][0], yEnd = pts[3][1];
    box(body, w, .5, .9, M.chute, 0, yEnd - .2, zEnd + .3);
    box(base, w + .4, 1.8, 3.8, M.chute, 0, -.7, 3.8);                                   // moega do passante, sob o piso L1
    const funnel = cyl(base, .4, 1.5, 3.2, M.chute, 0, -3.3, 3.8, 4); funnel.rotation.y = Math.PI / 4;
    beam(base, V(0, -4.9, 3.8), V(0, -6.0, 3.8 + (20.5 - SCREENS.zFeed - 3.8) * .9), .5, M.chute);
    // guarda-corpo frontal com a placa da peneira (como na foto 03PN002)
    railing(base, V(-w / 2 - .7, 0, 9.0), V(w / 2 + .7, 0, 9.0), M.yellow);
    plateMesh(base, M.plateY('PENEIRA VIBRATÓRIA PRIMÁRIA', tag), .9, 0, .62, 9.04);
    hot.push({ tag, tipo: 'Peneira vibratória banana · 2 decks', pos: V(x, LV.L1 + 3.6, SCREENS.zFeed + 3.6), info: `${tag} · peneira banana 3,0 × 7,3 m, 2 decks. 1º deck → britagem primária (HP 400); 2º deck → britagem secundária (Barmac); passante < 12,5 mm → pilha.` });
    // alimentador no piso superior (03AL) com placa azul e sinaleiro ciano
    const al = new THREE.Group(); al.position.set(x, LV.L2, 3.2); g.add(al);
    box(al, 2.2, 1.6, 2.6, M.grey, 0, .8, 0); box(al, 2.0, .2, 2.4, M.greyDk, 0, 1.7, 0);
    box(al, .9, .7, .9, M.motor, 1.45, .55, -.4); cyl(al, .28, .28, .9, M.motor, 1.45, .55, .45, 14).rotation.x = Math.PI / 2;
    plateMesh(al, M.plateB('ALIMENTADOR', tag.replace('PN', 'AL')), .8, -.3, 1.15, 1.31);
    const bc = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5ff0ff, emissive: 0x5ff0ff, emissiveIntensity: 4 })); bc.position.set(.7, 1.95, 1.2); al.add(bc); beacons[tag] = bc;
    beam(g, V(x, LV.L2, 3.6), V(x, LV.L1 + 3.9, SCREENS.zFeed + .7), .8, M.chute);
    hot.push({ tag: tag.replace('PN', 'AL'), tipo: 'Alimentador da peneira', pos: V(x, LV.L2 + 2.2, 3.2), info: `${tag.replace('PN', 'AL')} · alimentador da peneira ${tag}. Sinaleiro: azul = operando.` });
  });
  return { group: g, hotspots: hot, beacons, update(dt, t) { for (const v of vib) v.g.position.y = v.y0 + Math.sin(t * 47 + v.ph) * .012; } };
}
