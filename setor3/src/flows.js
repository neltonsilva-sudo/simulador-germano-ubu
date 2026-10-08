// Fluxos de material do circuito real (entra → circula → sai), com correias animadas e etiquetas de vazão ao vivo:
// ENTRADA ROM pela TCLD → tripper de distribuição sobre os alimentadores 03AL → peneiras;
// retido 1º deck → correia → silos dos HP 400; retido 2º deck → correia → silos dos Barmac;
// britado → correia de retorno → peneiras; SAÍDA passante < 12,5 mm → correia → pilha de regularização.
import * as THREE from 'three';
import { SCREENS, LV, B, CRUSHERS } from './layout.js?v=20261008184715';
import { V, box, beam, cyl } from './util.js?v=20261008184715';

export function buildFlows(scene, M, opt = {}) {
  const g = new THREE.Group(); scene.add(g);
  const belts = [], labels = [];
  const rockGeo = new THREE.DodecahedronGeometry(.06);   // minério britado (< ~12 cm), em camada densa
  function belt(a, b, w, key, oreMat = M.ore) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const grp = new THREE.Group(); grp.position.copy(a).addScaledVector(d, .5); grp.lookAt(b); g.add(grp);
    box(grp, w + .25, .3, L, M.steelDk, 0, 0, 0); box(grp, w, .06, L, M.belt, 0, .18, 0);
    for (let s = .6; s < L; s += 1.3) { box(grp, w + .35, .07, .1, M.grey, 0, .09, -L / 2 + s); }
    for (const sx of [-1, 1]) box(grp, .05, .5, L, M.steel, sx * (w / 2 + .25), .3, 0);           // saias/cobertura lateral
    // tambores de cabeça e de cauda: a correia termina "fechada" nas duas pontas
    for (const zz of [-L / 2, L / 2]) { const dr = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, w + .3, 16), M.greyDk); dr.rotation.z = Math.PI / 2; dr.position.set(0, .02, zz); grp.add(dr); }
    // correia de alta inclinação (> 25°): bordas laterais onduladas e taliscas (sidewall), que seguram o minério na subida
    if (Math.abs(d.y) / L > .42) { for (const sx of [-1, 1]) box(grp, .06, .55, L, M.rubber, sx * w * .46, .45, 0); for (let s2 = .4; s2 < L - .2; s2 += .55) box(grp, w * .9, .22, .06, M.rubber, 0, .3, -L / 2 + s2); }
    const n = Math.floor(L * 14), im = new THREE.InstancedMesh(rockGeo, oreMat, n); im.castShadow = true; grp.add(im);
    const rk = Array.from({ length: n }, (_, k) => ({ z: -L / 2 + (k + Math.random()) * L / n, x: (Math.random() - .5) * w * .7, r: Math.random() * 6, s: .6 + Math.random() * .9 }));
    // embaralha a ordem: quando a vazão mostra só parte das pedras, elas ficam espalhadas por toda a correia (sem trechos vazios)
    for (let i = rk.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rk[i], rk[j]] = [rk[j], rk[i]]; }
    belts.push({ im, rk, L, key, w });
    // apoios até o chão quando a correia está alta
    for (let s = 3; s < L - 1; s += 8) { const p = a.clone().addScaledVector(d, s / L); if (p.y > 1.5) beam(g, V(p.x, 0, p.z), V(p.x, p.y - .15, p.z), .18, M.steelDk); }
    return grp;
  }
  const E = B.screenEnd, zD1 = 12.8, zD2 = 13.9, yD1 = 6.4, yD2 = 5.5, yTop = 17.4;
  // ponto de transferência: chute da cabeça de uma correia até a cauda da seguinte (mais baixa)
  const xfer = (a, b, w = .9) => { beam(g, a, b, w, M.chute); box(g, w + .4, .5, w + .4, M.chute, a.x, a.y + .1, a.z); };
  // ENTRADA: TCLD chegando de fora pelo fundo do prédio até o topo, e tripper sobre os alimentadores
  // a distribuição corre do fim do prédio (lado dos britadores, x ≈ 48) para o início: ROM novo e retorno caem na cauda
  if (!opt.embed) { belt(V(E + 20, 2.5, -30), V(E - .6, yTop + 1.6, 1.9), 1.4, 'F'); xfer(V(E - .6, yTop + 1.5, 2.0), V(E - .8, yTop + .4, 2.3)); }
  belt(V(E + 2.2, yTop, 2.4), V(-.5, yTop, 2.4), 1.4, 'T');
  const trip = new THREE.Group(); g.add(trip); box(trip, 2.4, 1.2, 2.2, M.yellow, 0, yTop + .7, 2.4); box(trip, 1.0, 1.4, 1.0, M.chute, 0, yTop - .4, 2.4);
  // retidos sob as descargas das peneiras
  SCREENS.xs.forEach((x) => { beam(g, V(x - .6, LV.L1 + .9, 11.9), V(x - .6, yD1 + .3, zD1), .5, M.chute); beam(g, V(x + .6, LV.L1 + .5, 11.9), V(x + .6, yD2 + .3, zD2), .5, M.chute); });
  // retidos sobem por correias de alta inclinação no corredor entre o fim dos pisos (x 46) e as pernas dos silos
  const zC = CRUSHERS.cones[0].z, zV = CRUSHERS.vsi[0].z, x1 = E + 1.5, x2 = E + .75;
  belt(V(2.8, yD1, zD1), V(E + 1, yD1, zD1), 1.0, 'R1');
  xfer(V(E + 1.3, yD1 - .1, zD1), V(x1, yD1 - .75, zD1 - .35));
  belt(V(x1, yD1 - .85, zD1 - .45), V(x1, 16.9, zC + .2), 1.0, 'R1');
  xfer(V(x1, 16.8, zC + .1), V(x1 + .4, 16.15, zC));
  belt(V(x1 + .4, 16.0, zC), V(62, 16.0, zC), 1.0, 'R1');
  belt(V(2.8, yD2, zD2), V(E + .6, yD2, zD2), 1.0, 'R2');
  xfer(V(E + .8, yD2 - .1, zD2), V(x2, yD2 - .7, zD2 + .45));
  belt(V(x2, yD2 - .8, zD2 + .55), V(x2, 16.0, zV - .2), 1.0, 'R2');
  xfer(V(x2, 15.9, zV - .1), V(x2 + .4, 15.35, zV));
  belt(V(x2 + .4, 15.2, zV), V(63, 15.2, zV), 1.0, 'R2');
  // descarga em cada silo: arado/bica sob a correia sobre o centro do silo
  CRUSHERS.cones.forEach((c) => { box(g, 1.5, .6, 1.5, M.chute, c.x, 15.55, zC); box(g, .4, 1.2, 1.7, M.yellow, c.x, 16.6, zC); });
  CRUSHERS.vsi.forEach((c) => { box(g, 1.3, .5, 1.3, M.chute, c.x, 14.85, zV); box(g, .4, 1.2, 1.7, M.yellow, c.x, 15.8, zV); });
  // SAÍDA: produto < 12,5 mm saindo pela lateral rumo à pilha
  xfer(V(E + 2.3, 1.25, 20.5), V(E + 2.9, .95, 20.6), .8);
  belt(V(E + 2.9, .85, 20.6), opt.embed ? V(B.W + 4, 2.4, 22) : V(B.W + 6, 7.6, 32), 1.2, 'P', M.ore);
  // etiquetas de vazão (texto atualizado pela interface)
  const fmt = (v) => Math.round(v).toLocaleString('pt-BR');
  labels.push({ pos: V(-12, 10.5, -16), kind: 'in', text: (K) => `ENTRADA · ROM da TCLD · ${fmt(K.F)} t/h` });
  labels.push({ pos: V(20, yTop + 2.2, 2.4), kind: 'mid', text: (K) => `Alimentação das peneiras (nova + retorno) · ${fmt(K.T)} t/h` });
  labels.push({ pos: V(30, yD1 + 1.2, zD1), kind: 'mid', text: (K) => `Retido 1º deck → britagem primária HP 400 · ${fmt(K.T * K.r1)} t/h` });
  labels.push({ pos: V(30, yD2 + 1.0, zD2 + .4), kind: 'mid', text: (K) => `Retido 2º deck → britagem secundária Barmac · ${fmt(K.T * K.r2)} t/h` });
  labels.push({ pos: V(56, 2.2, 12), kind: 'mid', text: (K) => `Britado → retorno às peneiras · ${fmt(K.T - K.prod)} t/h (carga circulante ${Math.round(K.circ)} %)` });
  labels.push({ pos: V(B.W + 8, 6, 24), kind: 'out', text: (K) => `SAÍDA · produto < 12,5 mm → pilha de regularização · ${fmt(K.prod)} t/h` });
  const p4 = new THREE.Vector3(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(1, 1, 1), m4 = new THREE.Matrix4();
  return {
    group: g, labels,
    update(dt, t, S) {
      const K = S ? S.kpi : { F: 3800, T: 6300, prod: 3800, r1: .2, r2: .2 };
      for (const b of belts) {
        const q = b.key === 'F' ? K.F : b.key === 'T' ? K.T : b.key === 'R1' ? K.T * K.r1 : b.key === 'R2' ? K.T * K.r2 : K.prod;
        const run = q > 1; b.im.visible = run; if (!run) continue;
        const dens = Math.min(1, .6 + q / 6000);   // camada contínua; a vazão só muda a espessura b.im.count = Math.max(1, Math.round(b.rk.length * dens));
        for (let i = 0; i < b.im.count; i++) { const r = b.rk[i]; r.z += dt * 2.6; if (r.z > b.L / 2) r.z -= b.L; p4.set(r.x, .24 + (1 - Math.abs(r.x) / (b.w || 1)) * .06, r.z); e4.set(r.r, r.r * 1.7, 0); q4.setFromEuler(e4); s4.setScalar(r.s); m4.compose(p4, q4, s4); b.im.setMatrixAt(i, m4); }
        b.im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
