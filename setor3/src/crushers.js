// Britagem primária: 2 britadores cônicos (HP 400) sobre base de concreto, quadro metálico com furos, coroa dentada,
// acumuladores hidráulicos (fotos noturnas e de detalhe). Britagem secundária: 3 Barmac VSI (tambor bege, base metálica, motores).
// Silos de alimentação acima de cada britador; correias de retorno às peneiras (circuito fechado).
import * as THREE from 'three';
import { CRUSHERS, B } from './layout.js?v=20261003175555';
import { V, box, cyl, beam, railing, plateMesh } from './util.js?v=20261003175555';

export function buildCrushers(scene, M) {
  const g = new THREE.Group(); scene.add(g);
  const spin = [], beacons = {}, hot = [], streams = [], belts = [], rings = [];
  const rockGeo = new THREE.DodecahedronGeometry(.09); const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3();
  const stream = (tag, x, z, y0, y1) => { const n = 46, im = new THREE.InstancedMesh(rockGeo, M.ore, n); g.add(im); streams.push({ tag, im, x, z, y0, y1, d: Array.from({ length: n }, () => ({ u: Math.random(), x: (Math.random() - .5) * .45, z: (Math.random() - .5) * .45 })) }); };
  const bc = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5ff0ff, emissive: 0x5ff0ff, emissiveIntensity: 4 })); m.userData.keep = true; return m; };
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
  // ---- britagem primária: cônicos HP 400
  CRUSHERS.cones.forEach((c) => {
    const T = new THREE.Group(); T.position.set(c.x, 0, c.z); T.userData.pickTag = c.tag; g.add(T);
    box(T, 4.2, .6, 4.2, M.plinth, 0, .3, 0);                                    // bloco de concreto
    box(T, 3.4, 1.2, 3.4, M.chute, 0, 1.2, 0);                                   // quadro metálico
    for (const [dx, dz, ry] of [[1.71, 0, 0], [-1.71, 0, 0], [0, 1.71, Math.PI / 2], [0, -1.71, Math.PI / 2]]) for (const o of [-.9, .9]) { const h = new THREE.Mesh(new THREE.CircleGeometry(.24, 18), M.black); h.position.set(dx + (ry ? o : 0), 1.2, dz + (ry ? 0 : o)); h.rotation.y = ry ? 0 : Math.PI / 2; if (dx < 0 || dz < 0) h.rotation.y += Math.PI; T.add(h); }
    cyl(T, 1.45, 1.55, 1.3, M.beige, 0, 2.45, 0, 32);                             // carcaça inferior
    const ring = cyl(T, 1.75, 1.75, .3, M.orange, 0, 3.25, 0, 40); ring.userData.keep = true;               // coroa de ajuste
    const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .26, .16), M.orange, 44); const m4 = new THREE.Matrix4();
    for (let k = 0; k < 44; k++) { const a = k / 44 * Math.PI * 2; m4.makeRotationY(-a).setPosition(Math.cos(a) * 1.8, 3.25, Math.sin(a) * 1.8); teeth.setMatrixAt(k, m4); } T.add(teeth);
    cyl(T, 1.35, 1.6, .7, M.beige, 0, 3.75, 0, 32); cyl(T, .7, 1.1, .7, M.beige, 0, 4.4, 0, 24);   // cuba superior e funil
    for (let k = 0; k < 6; k++) {                                                // cilindros hidráulicos + acumuladores
      const a = k / 6 * Math.PI * 2 + .3, ax = Math.cos(a) * 1.75, az = Math.sin(a) * 1.75;
      cyl(T, .14, .14, 1.4, M.beige, ax, 2.3, az, 12);
      const acc = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 10), M.beige); acc.scale.y = 1.45; acc.position.set(ax * 1.12, 2.15, az * 1.12); acc.castShadow = true; T.add(acc);
    }
    box(T, 1.2, .9, 1.0, M.motor, 2.6, 1.05, 0); const sh = cyl(T, .12, .12, 1.4, M.greyDk, 1.9, 1.3, 0, 10); sh.rotation.z = Math.PI / 2;  // motor e eixo
    const cp = cyl(T, .26, .26, .16, M.orange, 1.55, 1.3, 0, 8); cp.rotation.z = Math.PI / 2; cp.userData.keep = true; spin.push({ tag: c.tag, o: cp, ax: 'x', w: 30 });
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), M.warn()); warn.position.set(1.0, 3.85, 1.27); warn.rotation.y = .7; T.add(warn);
    plateMesh(T, M.plateW('BRITADOR PRIMÁRIO', c.tag), .8, 0, 1.25, 1.72);
    const b = bc(); b.position.set(1.4, 4.9, .9); T.add(b); beacons[c.tag] = b; rings.push({ tag: c.tag, ring, teeth });
    stream(c.tag, c.x, c.z, 9.4, 4.75);
    silo(c.x, c.z, 2.2, 7.5, 5.5); beam(g, V(c.x, 9.6, c.z), V(c.x, 4.8, c.z), .45, M.chute);
    hot.push({ tag: c.tag, tipo: 'Britador cônico HP 400 · britagem primária', pos: V(c.x, 4.6, c.z), info: `${c.tag} · britador cônico HP 400 (compressão). Recebe o retido no 1º deck das peneiras pelo silo; o produto volta às peneiras (circuito fechado).` });
  });
  // ---- britagem secundária: Barmac VSI
  CRUSHERS.vsi.forEach((c) => {
    const T = new THREE.Group(); T.position.set(c.x, 0, c.z); T.userData.pickTag = c.tag; g.add(T);
    box(T, 5.2, .5, 3.6, M.plinth, 0, .25, 0);
    const fr = new THREE.Group(); T.add(fr);                                      // base metálica em grelha (foto 03BR006)
    box(fr, 5.0, .25, 3.4, M.chute, 0, 1.55, 0); box(fr, 5.0, .2, 3.4, M.chute, 0, .62, 0);
    for (let k = 0; k < 6; k++) box(fr, .14, .9, 3.3, M.chute, -2.3 + k * .92, 1.08, 0);
    for (const s of [-1, 1]) box(fr, 5.0, .9, .1, M.chute, 0, 1.08, s * 1.65);
    cyl(T, 1.5, 1.5, 1.55, M.beige, 0, 2.48, 0, 40);                              // tambor
    cyl(T, 1.56, 1.56, .2, M.chute, 0, 3.3, 0, 40); cyl(T, 1.56, 1.56, .14, M.chute, 0, 1.75, 0, 40);
    cyl(T, .7, 1.0, .9, M.beige, 0, 3.85, 0, 24); cyl(T, .45, .45, .5, M.steel, 0, 4.5, 0, 16);
    const rot = cyl(T, .9, .9, .08, M.greyDk, 0, 3.42, 0, 6); rot.userData.keep = true; spin.push({ tag: c.tag, o: rot, ax: 'y', w: 14 });
    stream(c.tag, c.x, c.z, 9.4, 4.75);
    for (const s of [-1, 1]) {                                                    // motores laterais com aletas e proteção das correias
      const mx = s * 2.35; box(T, 1.0, 1.1, 1.3, M.motor, mx, 2.35, -.3);
      for (let f = 0; f < 7; f++) box(T, 1.02, .04, 1.32, M.greyDk, mx, 1.9 + f * .14, -.3);
      box(T, .6, .9, 2.2, M.beige, s * 1.75, 2.6, -.3);
    }
    plateMesh(T, M.plateW('BRITADOR SECUNDÁRIO', c.tag), .9, -.8, 1.5, 1.76);
    const b = bc(); b.position.set(1.2, 4.6, .9); T.add(b); beacons[c.tag] = b;
    silo(c.x, c.z, 1.9, 7.5, 5); beam(g, V(c.x, 9.6, c.z), V(c.x, 4.7, c.z), .4, M.chute);
    hot.push({ tag: c.tag, tipo: 'Britador de impacto Barmac (VSI) · britagem secundária', pos: V(c.x, 4.3, c.z), info: `${c.tag} · britador de impacto vertical Barmac (rotor). Recebe o retido no 2º deck das peneiras; o produto volta às peneiras.` });
  });
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
    for (const r of rings) { const tgt = (S ? S.css : 18) * .12; r.ring.rotation.y += (tgt - r.ring.rotation.y) * Math.min(1, dt * 1.5); r.teeth.rotation.y = r.ring.rotation.y; }
    for (const st of streams) { const e = E[st.tag] || { on: true, flow: 1, load: .7 }, run = e.on && e.flow > 0; st.im.visible = run; if (!run) continue;
      const k = .6 + Math.min(1.2, e.load); for (let i = 0; i < st.d.length; i++) { const d = st.d[i]; d.u += dt * 1.4 * k; if (d.u > 1) d.u -= 1; p4.set(st.x + d.x, st.y0 + (st.y1 - st.y0) * d.u * d.u, st.z + d.z); e4.set(t * 5 + i, i, 0); q4.setFromEuler(e4); s4.setScalar(1); m4.compose(p4, q4, s4); st.im.setMatrixAt(i, m4); } st.im.instanceMatrix.needsUpdate = true; }
    const run = K.F > 0; for (const b of belts) { b.im.visible = run; if (!run) continue; for (let i = 0; i < b.rk.length; i++) { const r = b.rk[i]; r.z += dt * 2.2; if (r.z > b.L / 2) r.z -= b.L; p4.set(r.x, .25, r.z); e4.set(r.r, r.r * 2, 0); q4.setFromEuler(e4); s4.setScalar(1); m4.compose(p4, q4, s4); b.im.setMatrixAt(i, m4); } b.im.instanceMatrix.needsUpdate = true; }
    for (const [tag, b] of Object.entries(beacons)) { const e = E[tag] || { st: 'ok' }; const c = COL[e.st] || COL.ok; b.material.color.setHex(c); b.material.emissive.setHex(c); b.material.emissiveIntensity = e.st === 'off' ? .15 : e.st === 'crit' ? (Math.sin(t * 9) > 0 ? 6 : .5) : 2.5 + Math.max(0, Math.sin(t * 6 + tag.length)) * 3; }
  } };
}
