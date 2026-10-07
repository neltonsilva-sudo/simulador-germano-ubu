// Prédio do setor 3: estrutura metálica (perfis I laranja-ferrugem), pisos de concreto/grade, escadas, guarda-corpos,
// fechamento lateral verde com grandes aberturas, cobertura com treliças e luminárias de galpão.
import * as THREE from 'three';
import { B, LV, SCREENS, CRUSHERS } from './layout.js?v=20261007204435';
import { V, box, beam, ibeam, railing, stairs, cyl } from './util.js?v=20261007204435';

export function buildBuilding(scene, M, opt = {}) {
  const g = new THREE.Group(); scene.add(g);
  const lamps = [];
  // terreno externo e piso
  const out = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.ground || new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 1 }));
  out.rotation.x = -Math.PI / 2; out.position.set(B.W / 2, -.02, B.D / 2); out.receiveShadow = true; out.name = 'terreno'; out.userData.keep = true; if (!opt.embed) g.add(out);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(B.W, B.D), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(B.W / 2, .005, B.D / 2); fl.receiveShadow = true; g.add(fl);
  // colunas (perfil I 0,6 m) e vigas por nível
  // colunas: perfil I sobre bloco de concreto, chapa de base com 4 chumbadores (porca + arruela) e enrijecedores
  const bolt = new THREE.CylinderGeometry(.035, .035, .16, 8), nut = new THREE.CylinderGeometry(.06, .06, .05, 6);
  for (const x of B.colX) for (const z of B.colZ) {
    ibeam(g, V(x, 0, z), V(x, B.H, z), .6, .4, M.steel); box(g, 1.1, .35, 1.1, M.concrete, x, .17, z);
    box(g, .8, .04, .9, M.steelDk, x, .37, z);
    for (const sx of [-.3, .3]) for (const sz of [-.34, .34]) { const b1 = new THREE.Mesh(bolt, M.greyDk); b1.position.set(x + sx, .45, z + sz); g.add(b1); const n1 = new THREE.Mesh(nut, M.greyDk); n1.position.set(x + sx, .41, z + sz); g.add(n1); }
    for (const sz of [-1, 1]) box(g, .02, .35, .22, M.steel, x, .56, z + sz * .31);
    for (const y of [LV.L1, LV.L2]) box(g, .5, .3, .5, M.steelDk, x, y - .45, z);    // consoles de apoio das vigas
  }
  for (const y of [LV.L1, LV.L2, B.H]) {
    for (const z of B.colZ) ibeam(g, V(0, y, z), V(B.W, y, z), .55, .3, M.steel).rotation.z = Math.PI / 2;
    for (const x of B.colX) { const b = ibeam(g, V(x, y, 0), V(x, y, B.D), .55, .3, M.steel); b.rotation.x = Math.PI / 2; b.rotation.z = 0; }
  }
  // contraventamentos em X nas faces
  for (let i = 0; i < B.colX.length - 1; i += 2) for (const z of [0, B.D]) { beam(g, V(B.colX[i], LV.L2, z), V(B.colX[i + 1], B.H, z), .12, M.steelDk); beam(g, V(B.colX[i + 1], LV.L2, z), V(B.colX[i], B.H, z), .12, M.steelDk); }

  // PISO DAS PENEIRAS (L1): laje de concreto com vãos sob cada peneira + bordas com guarda-corpo
  const t = .3, y1 = LV.L1;
  const holes = SCREENS.xs.map((x) => [x - 2.2, x + 2.2]);
  let x0 = 0; for (const [a, b] of holes) { box(g, a - x0, t, B.D, M.concrete, (a + x0) / 2, y1 - t / 2, B.D / 2); x0 = b; }
  box(g, B.screenEnd - x0, t, B.D, M.concrete, (B.screenEnd + x0) / 2, y1 - t / 2, B.D / 2);
  for (const [a, b] of holes) { box(g, b - a, t, 3.4, M.concrete, (a + b) / 2, y1 - t / 2, 1.7); box(g, b - a, t, 5.6, M.concrete, (a + b) / 2, y1 - t / 2, B.D - 2.8); }
  // tela de arame preenchendo o guarda-corpo (foto da 03PN002)
  const meshTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = 'rgba(205,190,150,1)'; x.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const telaMat = (L) => { const t = meshTex.clone(); t.needsUpdate = true; t.repeat.set(L / .5, 1.8); return new THREE.MeshStandardMaterial({ color: 0xb8a878, map: t, alphaMap: t, alphaTest: .45, roughness: .6, metalness: .5, side: THREE.DoubleSide }); };
  const tela = (a, b) => { railing(g, a, b, M.yellow); const L = a.distanceTo(b); const m = new THREE.Mesh(new THREE.PlaneGeometry(L, .9), telaMat(L)); m.position.set((a.x + b.x) / 2, a.y + .58, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); g.add(m); };
  for (const [a, b] of holes) { tela(V(a, y1, 3.4), V(a, y1, B.D - 5.6)); tela(V(b, y1, 3.4), V(b, y1, B.D - 5.6)); }
  holes.forEach(([a, b], i) => tela(V(i ? a : a + 1.2, y1, B.D - 5.6), V(b, y1, B.D - 5.6)));   // no 1º vão fica a chegada da escada   // frente de cada vão (lado da circulação)
  railing(g, V(B.screenEnd, y1, 0.3), V(B.screenEnd, y1, B.D - .3), M.yellow);
  // PISO DOS ALIMENTADORES (L2): faixa sobre a alimentação das peneiras, com grade e guarda-corpo voltado ao vão
  const E = B.screenEnd;
  box(g, E, t, 6.5, M.concrete, E / 2, LV.L2 - t / 2, 3.25);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(E, 2.2), M.grate); gr.rotation.x = -Math.PI / 2; gr.position.set(E / 2, LV.L2 + .01, 7.6); g.add(gr);
  beam(g, V(0, LV.L2 - .1, 8.7), V(E, LV.L2 - .1, 8.7), .18, M.steel);
  railing(g, V(.3, LV.L2, 8.6), V(E - 1.85, LV.L2, 8.6), M.orange || M.yellow);   // abertura para a chegada da escada (x 44,2–45,4)
  railing(g, V(E - .6, LV.L2, 8.6), V(E - .3, LV.L2, 8.6), M.orange || M.yellow);
  // torre dos britadores (x 34–48): piso intermediário em grade a 5,5 m para inspeção da alimentação
  const gt = new THREE.Mesh(new THREE.PlaneGeometry(B.W - E, 4), M.grate); gt.rotation.x = -Math.PI / 2; gt.position.set((B.W + E) / 2, 5.5, 12); g.add(gt);
  railing(g, V(E + .2, 5.5, 10), V(B.W - .2, 5.5, 10), M.yellow);
  // borda z = 14 com abertura para o patamar da escada (x 48,6–49,6)
  railing(g, V(E + .2, 5.5, 14), V(48.6, 5.5, 14), M.yellow); railing(g, V(49.6, 5.5, 14), V(B.W - .2, 5.5, 14), M.yellow);
  { const lp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .95), M.grate); lp.rotation.x = -Math.PI / 2; lp.position.set(49.1, 5.51, 14.47); g.add(lp);
    beam(g, V(48.6, 5.4, 14.95), V(49.6, 5.4, 14.95), .12, M.steel); beam(g, V(48.6, 0, 14.9), V(48.6, 5.4, 14.9), .12, M.steel);
    railing(g, V(48.6, 5.5, 14), V(48.6, 5.5, 14.95), M.yellow); railing(g, V(48.6, 5.5, 14.95), V(49.5, 5.5, 14.95), M.yellow); }
  // escadas
  stairs(g, 1.9, 0, B.D - 5.6 - 10, LV.L1, 10, 1.1, 0, M.yellow, M.yellow);   // sobe pelo vão da 1ª peneira e chega à borda da laje (z 18,4)
  stairs(g, E - 1.2, LV.L1, 8.7 + 8, LV.L2 - LV.L1, 8, 1.1, Math.PI, M.yellow, M.yellow);   // do piso +7,5 (z 16,7) até a borda do piso +14 (z 8,7)
  stairs(g, 56.1, 0, 14.5, 5.5, 6.5, .7, -Math.PI / 2, M.yellow, M.yellow);   // sobe ao lado da plataforma (sentido −x) e chega ao patamar
  // escadas de inspeção ENTRE as peneiras (foto do peneiramento): sobem do piso L1 a uma plataforma junto aos vibradores
  for (let i = 0; i < SCREENS.xs.length - 1; i += 2) {
    const xm = (SCREENS.xs[i] + SCREENS.xs[i + 1]) / 2, yP = y1 + 2.4, z0 = 15.2, run = 3.2, zP = z0 - run;
    stairs(g, xm, y1, z0, 2.4, run, .75, Math.PI, M.yellow, M.yellow);
    box(g, .8, .06, 2.4, M.grate, xm, yP, zP - 1.2);
    for (const sx of [-1, 1]) { railing(g, V(xm + sx * .42, yP, zP), V(xm + sx * .42, yP, zP - 2.4), M.yellow); beam(g, V(xm + sx * .36, y1, zP - 2.3), V(xm + sx * .36, yP, zP - 2.3), .06, M.yellow); }
    railing(g, V(xm - .42, yP, zP - 2.4), V(xm + .42, yP, zP - 2.4), M.yellow);
  }
  // passarela de inspeção ao longo da correia de distribuição (y ≈ 17 m) com guarda-corpo e tirantes à cobertura
  { const yW = 17.05, zW = 3.75;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(E, .9), M.grate); w.rotation.x = -Math.PI / 2; w.position.set(E / 2, yW, zW); g.add(w);
    for (const zz of [zW - .45, zW + .45]) beam(g, V(0, yW - .08, zz), V(E, yW - .08, zz), .12, M.steelDk);
    railing(g, V(.2, yW, zW + .45), V(E - .2, yW, zW + .45), M.yellow);
    for (let x = 4; x < E; x += 4) { beam(g, V(x, yW - .1, zW + .45), V(x, B.H, zW + .45), .03, M.steelDk, true); beam(g, V(x, yW - .14, zW - .5), V(x, yW - .14, zW + .5), .1, M.steelDk); }
  }

  // FECHAMENTO: telha verde por fora / marrom empoeirada por dentro, com grandes aberturas (luz do dia como na foto da peneira)
  const walls = [];
  const wall = (w, h, x, y, z, ry) => { for (const m of [M.cladOut, M.cladIn]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); walls.push(p); p.userData.shell = true; p.position.set(x, y, z); p.rotation.y = ry + (m === M.cladIn ? Math.PI : 0); p.position.x += m === M.cladIn ? Math.sin(ry) * -.05 : 0; p.position.z += m === M.cladIn ? Math.cos(ry) * -.05 : 0; p.receiveShadow = true; p.castShadow = true; g.add(p); } };
  // fundo (z=0) fechado acima de 4 m, abertura baixa
  wall(B.W, B.H - 4, B.W / 2, 4 + (B.H - 4) / 2, -.02, Math.PI);
  // frente (z=D): fechada só acima de L2 (a frente baixa fica aberta como na foto da peneira)
  wall(B.W, B.H - LV.L2 - 2, B.W / 2, LV.L2 + 2 + (B.H - LV.L2 - 2) / 2, B.D + .02, 0);
  wall(B.D, B.H - 6, -.02, 6 + (B.H - 6) / 2, B.D / 2, -Math.PI / 2);
  wall(B.D, B.H - 6, B.W + .02, 6 + (B.H - 6) / 2, B.D / 2, Math.PI / 2);
  // cobertura: telha + treliças
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(B.W + 1, B.D + 1), M.cladIn); roof.rotation.x = Math.PI / 2; roof.position.set(B.W / 2, B.H + .8, B.D / 2); g.add(roof);
  const roofO = new THREE.Mesh(new THREE.PlaneGeometry(B.W + 1, B.D + 1), M.cladOut); roofO.rotation.x = -Math.PI / 2; roofO.position.set(B.W / 2, B.H + .85, B.D / 2); g.add(roofO);
  roof.userData.shell = roofO.userData.shell = true; roof.castShadow = roofO.castShadow = true;
  for (const x of B.colX) { beam(g, V(x, B.H, 0), V(x, B.H + .8, 12), .14, M.steel); beam(g, V(x, B.H + .8, 12), V(x, B.H, B.D), .14, M.steel); for (let k = 1; k < 6; k++) beam(g, V(x, B.H, k * 4), V(x, B.H + .8 * (1 - Math.abs(k * 4 - 12) / 12), k * 4), .08, M.steelDk); }
  for (let z = 2; z < B.D; z += 3) beam(g, V(0, B.H + .7 - Math.abs(z - 12) / 12 * .7, z), V(B.W, B.H + .7 - Math.abs(z - 12) / 12 * .7, z), .1, M.steelDk);
  // luminárias de galpão (high-bay) sob a cobertura e sob o piso L2
  const lampGeo = new THREE.CylinderGeometry(.35, .5, .35, 18, 1, true);
  const addLamp = (x, y, z) => { const sh = new THREE.Mesh(lampGeo, M.greyDk); sh.position.set(x, y, z); g.add(sh); const d = new THREE.Mesh(new THREE.CircleGeometry(.42, 18), M.glass); d.rotation.x = Math.PI / 2; d.position.set(x, y - .17, z); g.add(d); lamps.push(V(x, y - .3, z)); };
  for (let x = 4; x < B.W; x += 8) for (const z of [6, 18]) addLamp(x, B.H - .8, z);
  for (let x = 4; x < E; x += 8) addLamp(x, LV.L2 - .7, 14);
  // SALA DOS BRITADORES: forro baixo e escuro (piso de chapa xadrez sobre vigas a 5,5 m, fotos dos HP 400 e do Barmac)
  // com vãos para as bicas dos silos; luminárias pontuais logo abaixo do forro.
  const yD = 5.5, holes2 = [...CRUSHERS.cones.map((c) => [c.x - 1.3, c.x + 1.3, c.z - 1.3, c.z + 1.3]), ...CRUSHERS.vsi.map((c) => [c.x - 1.2, c.x + 1.2, c.z - 1.2, c.z + 1.2])];
  const deck = (x0, x1, z0, z1) => {
    const hs = holes2.filter((h) => h[0] < x1 && h[1] > x0 && h[2] < z1 && h[3] > z0);
    const xs = [...new Set([x0, x1, ...hs.flatMap((h) => [Math.max(x0, h[0]), Math.min(x1, h[1])])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], gaps = hs.filter((h) => h[0] < b - 1e-3 && h[1] > a + 1e-3).map((h) => [Math.max(z0, h[2]), Math.min(z1, h[3])]).sort((p, q) => p[0] - q[0]);
      let z = z0; for (const [g0, g1] of [...gaps, [z1, z1]]) { if (g0 - z > .05) box(g, b - a, .08, g0 - z, M.steelDk, (a + b) / 2, yD, (z + g0) / 2); z = Math.max(z, g1); }
    }
    for (let x = x0 + .9; x < x1 - .3; x += 2.1) {                       // vigas I sob a chapa (pulam os vãos)
      if (hs.some((h) => x > h[0] - .25 && x < h[1] + .25)) continue;
      const b = ibeam(g, V(x, yD - .26, z0), V(x, yD - .26, z1), .42, .2, M.steel); b.rotation.x = Math.PI / 2;
    }
    for (const z of [z0, z1]) ibeam(g, V(x0, yD - .3, z), V(x1, yD - .3, z), .5, .25, M.steel).rotation.z = Math.PI / 2;
  };
  deck(48.6, B.W - .3, 3.2, 10); deck(48.6, B.W - .3, 14, B.D - .3);
  for (const x of [51, 59]) for (const z of [4.3, 9.6]) addLamp(x, yD - .6, z);
  for (const x of [52.75, 58.25]) for (const z of [15, 21]) addLamp(x, yD - .6, z);
  // tubulação de água/ar ao longo das colunas (detalhe das fotos)
  for (const x of [8, 24, 40, 56]) { beam(g, V(x + .5, 0, 12.4), V(x + .5, LV.L2, 12.4), .05, M.grey, true); }
  // vista em corte: de fora/acima do prédio a cobertura some para mostrar o processo
  return { group: g, lamps, update(dt, t, S, cam) { if (!cam || opt.embed) return; const p = cam.position, outside = p.y > B.H + 1 || p.x < -1 || p.x > B.W + 1 || p.z < -1 || p.z > B.D + 1; (g.parent || g).traverse((m) => { if (m.userData.shell) m.visible = !outside; }); } };
}
