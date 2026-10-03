// 8 peneiras vibratórias tipo banana, 2 decks (fotos 03PN002 e câmera do prédio): laterais de aço com nervuras e parafusos,
// caixa de alimentação, deck superior de painéis de poliuretano com relevo piramidal, deck inferior, vibradores amarelos modulares,
// molas sobre vigas, calhas de descarga, moegas de passante; alimentadores 03AL no piso superior com placa azul e sinaleiro.
import * as THREE from 'three';
import { SCREENS, LV } from './layout.js?v=20261003134812';
import { V, box, cyl, beam, railing, plateMesh } from './util.js?v=20261003134812';

const SEG = [[2.6, 28], [2.4, 18], [2.3, 9]];   // segmentos da banana: comprimento (m), inclinação (graus)

export function buildScreens(scene, M) {
  const g = new THREE.Group(); scene.add(g);
  const vib = [], beacons = {}, hot = [], flows = [];
  const rockGeo = new THREE.DodecahedronGeometry(.075); const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3();
  const pyrGeo = new THREE.ConeGeometry(.17, .1, 4); pyrGeo.rotateY(Math.PI / 4);
  const boltGeo = new THREE.CylinderGeometry(.025, .025, .04, 6); boltGeo.rotateZ(Math.PI / 2);
  SCREENS.xs.forEach((x, i) => {
    const tag = SCREENS.tags[i], w = SCREENS.w;
    const base = new THREE.Group(); base.position.set(x, LV.L1, SCREENS.zFeed); base.userData.pickTag = tag; g.add(base);
    // vigas de apoio e molas
    const Y0 = 3.6;
    const body = new THREE.Group(); body.userData.dyn = true; body.position.set(0, Y0, 0); base.add(body); vib.push({ g: body, y0: Y0, ph: i * 1.7 });
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
    // fluxo de minério sobre o deck (partículas deslizando pela banana) e jato caindo do alimentador
    const N = 90, deck = new THREE.InstancedMesh(rockGeo, M.ore, N); deck.castShadow = true; body.add(deck);
    const pl = pts.map(([zz, yy]) => new THREE.Vector3(0, yy + .16, zz)); const segL = []; let tot = 0; for (let k = 0; k < 3; k++) { segL.push(pl[k].distanceTo(pl[k + 1])); tot += segL[k]; }
    const part = Array.from({ length: N }, () => ({ u: Math.random(), x: (Math.random() - .5) * (w - .5), r: Math.random() * 6, s: .6 + Math.random() * .8 }));
    const N2 = 40, fall = new THREE.InstancedMesh(rockGeo, M.ore, N2); g.add(fall);
    const fall0 = new THREE.Vector3(x, LV.L2 - .2, 3.7), fall1 = new THREE.Vector3(x, LV.L1 + 3.6 + .9, SCREENS.zFeed + .7);
    const drops = Array.from({ length: N2 }, () => ({ u: Math.random(), x: (Math.random() - .5) * .5, z: (Math.random() - .5) * .4 }));
    flows.push({ tag, deck, part, pl, segL, tot, fall, drops, fall0, fall1, body });

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
    const al = new THREE.Group(); al.position.set(x, LV.L2, 3.2); al.userData.pickTag = tag.replace('PN', 'AL'); g.add(al);
    box(al, 2.2, 1.6, 2.6, M.grey, 0, .8, 0); box(al, 2.0, .2, 2.4, M.greyDk, 0, 1.7, 0);
    box(al, .9, .7, .9, M.motor, 1.45, .55, -.4); cyl(al, .28, .28, .9, M.motor, 1.45, .55, .45, 14).rotation.x = Math.PI / 2;
    plateMesh(al, M.plateB('ALIMENTADOR', tag.replace('PN', 'AL')), .8, -.3, 1.15, 1.31);
    const bc = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5ff0ff, emissive: 0x5ff0ff, emissiveIntensity: 4 })); bc.position.set(.7, 1.95, 1.2); bc.userData.keep = true; al.add(bc); beacons[tag] = bc;
    beam(g, V(x, LV.L2, 3.6), V(x, LV.L1 + 3.9, SCREENS.zFeed + .7), .8, M.chute);
    hot.push({ tag: tag.replace('PN', 'AL'), tipo: 'Alimentador da peneira', pos: V(x, LV.L2 + 2.2, 3.2), info: `${tag.replace('PN', 'AL')} · alimentador da peneira ${tag}. Sinaleiro: azul = operando.` });
  });
  const COL = { ok: 0x5ff0ff, warn: 0xffb020, crit: 0xff3b2f, off: 0x4a525a };
  // caixas de seleção por equipamento (para o clique no 3D), calculadas antes da fusão das malhas
  const pick = []; g.updateMatrixWorld(true);
  g.children.forEach((c) => { if (c.userData.pickTag) pick.push({ tag: c.userData.pickTag, box: new THREE.Box3().setFromObject(c) }); });
  return { group: g, hotspots: hot, pick, beacons, update(dt, t, S) {
    const E = S ? S.eq : {};
    vib.forEach((v, i) => { const e = E[SCREENS.tags[i]] || { on: true, load: .8 }; const a = e.on && e.flow > 0 ? .012 + .006 * Math.min(1.3, e.load) : 0; v.g.position.y = v.y0 + Math.sin(t * 47 + v.ph) * a; v.g.position.z = Math.cos(t * 47 + v.ph) * a * .7; });
    for (const f of flows) {
      const e = E[f.tag] || { on: true, flow: 1000, load: .7 }, run = e.on && e.flow > 0, k = run ? Math.min(1.3, .45 + e.load) : 0;
      f.deck.visible = f.fall.visible = run;
      if (!run) continue;
      const nVis = Math.round(f.part.length * Math.min(1, .35 + e.load * .7)); f.deck.count = nVis;
      for (let i = 0; i < nVis; i++) {
        const p = f.part[i]; p.u += dt * .22 * p.s * k; if (p.u > 1) { p.u -= 1; p.x = (Math.random() - .5) * (SCREENS.w - .5); }
        let d = p.u * f.tot, j = 0; while (j < 2 && d > f.segL[j]) { d -= f.segL[j]; j++; }
        p4.lerpVectors(f.pl[j], f.pl[j + 1], Math.min(1, d / f.segL[j])); p4.x = p.x + Math.sin(t * 9 + p.r) * .03; p4.y += Math.abs(Math.sin(t * 23 + p.r)) * .05;
        e4.set(p.r + t * 3 * p.s, p.r, 0); q4.setFromEuler(e4); s4.setScalar(.7 + (p.r % 1) * .9); m4.compose(p4, q4, s4); f.deck.setMatrixAt(i, m4);
      }
      f.deck.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < f.drops.length; i++) { const d = f.drops[i]; d.u += dt * 1.6 * k; if (d.u > 1) d.u -= 1; p4.lerpVectors(f.fall0, f.fall1, d.u * d.u); p4.x += d.x; p4.z += d.z; e4.set(t * 4 + i, i, 0); q4.setFromEuler(e4); s4.setScalar(1.2); m4.compose(p4, q4, s4); f.fall.setMatrixAt(i, m4); }
      f.fall.instanceMatrix.needsUpdate = true;
    }
    for (const [tag, b] of Object.entries(beacons)) { const e = E[tag] || { st: 'ok' }; const c = COL[e.st] || COL.ok; b.material.color.setHex(c); b.material.emissive.setHex(c); b.material.emissiveIntensity = e.st === 'off' ? .15 : e.st === 'crit' ? (Math.sin(t * 9) > 0 ? 6 : .5) : 2.5 + Math.max(0, Math.sin(t * 6 + tag.length)) * 3; }
  } };
}
