// Prédio do setor 3: estrutura metálica (perfis I laranja-ferrugem), pisos de concreto/grade, escadas, guarda-corpos,
// fechamento lateral verde com grandes aberturas, cobertura com treliças e luminárias de galpão.
import * as THREE from 'three';
import { B, LV, SCREENS, CRUSHERS } from './layout.js?v=20261008063521';
import { V, box, beam, ibeam, railing, stairs, cyl, rockGeometry, oreColors } from './util.js?v=20261008063521';

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
  // laje: face de cima em concreto escurecido por pó de minério (M.slab, coordenadas do mundo); laterais e fundo em concreto
  const slabMats = M.slab ? [M.concrete, M.concrete, M.slab, M.concrete, M.concrete, M.concrete] : M.concrete;
  const slab = (w, h, d, x, y, z) => { const m = box(g, w, h, d, slabMats, x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const holes = SCREENS.xs.map((x) => [x - 2.2, x + 2.2]);
  let x0 = 0; for (const [a, b] of holes) { slab(a - x0, t, B.D, (a + x0) / 2, y1 - t / 2, B.D / 2); x0 = b; }
  slab(B.screenEnd - x0, t, B.D, (B.screenEnd + x0) / 2, y1 - t / 2, B.D / 2);
  for (const [a, b] of holes) { slab(b - a, t, 3.4, (a + b) / 2, y1 - t / 2, 1.7); slab(b - a, t, 5.6, (a + b) / 2, y1 - t / 2, B.D - 2.8); }
  // tela de arame preenchendo o guarda-corpo (foto da 03PN002)
  const meshTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = 'rgba(205,190,150,1)'; x.lineWidth = 2.5;
    for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const telaMat = (L) => { const t = meshTex.clone(); t.needsUpdate = true; t.repeat.set(L / .6, 1.6); t.anisotropy = 8; return new THREE.MeshStandardMaterial({ color: 0x9c9a8c, map: t, alphaMap: t, alphaToCoverage: true, transparent: false, roughness: .6, metalness: .5, side: THREE.DoubleSide }); };   // malha ~7,5 cm de arame fino, borda suave (alpha-to-coverage, sem pontilhado)
  const tela = (a, b) => { railing(g, a, b, M.yellow); const L = a.distanceTo(b); const m = new THREE.Mesh(new THREE.PlaneGeometry(L, .9), telaMat(L)); m.position.set((a.x + b.x) / 2, a.y + .58, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); g.add(m); };
  for (const [a, b] of holes) { tela(V(a, y1, 3.4), V(a, y1, B.D - 5.6)); tela(V(b, y1, 3.4), V(b, y1, B.D - 5.6)); }
  holes.forEach(([a, b], i) => tela(V(i ? a : a + 1.2, y1, B.D - 5.6), V(b, y1, B.D - 5.6)));   // no 1º vão fica a chegada da escada   // frente de cada vão (lado da circulação)
  railing(g, V(B.screenEnd, y1, 0.3), V(B.screenEnd, y1, B.D - .3), M.yellow);
  // PISO DOS ALIMENTADORES (L2): faixa sobre a alimentação das peneiras, com grade e guarda-corpo voltado ao vão
  const E = B.screenEnd, y2 = LV.L2;
  slab(E, t, 6.5, E / 2, y2 - t / 2, 3.25);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(E, 2.2), M.grate); gr.rotation.x = -Math.PI / 2; gr.position.set(E / 2, y2 + .01, 7.6); g.add(gr);
  beam(g, V(0, y2 - .1, 8.7), V(E, y2 - .1, 8.7), .18, M.steel);
  railing(g, V(.3, y2, 8.6), V(E - 1.85, y2, 8.6), M.orange || M.yellow);   // abertura para a chegada da escada (x 44,2–45,4)
  railing(g, V(E - .6, y2, 8.6), V(E - .3, y2, 8.6), M.orange || M.yellow);
  // detalhes do piso +14: vigas secundárias (perfil I a cada 2 m) sob laje e grade, cantoneira de borda laje/grade,
  // painéis de grade de 1 m com barras de amarração, rodapé (chapa 15 cm) na borda e vigas de apoio da grade
  for (let x = 2; x < E; x += 2) { if (B.colX.includes(x)) continue; const b = ibeam(g, V(x, y2 - t - .2, 0), V(x, y2 - t - .2, 8.7), .4, .18, M.steel); b.rotation.x = Math.PI / 2; }
  box(g, E, .1, .07, M.steelDk, E / 2, y2 - .04, 6.52); box(g, E, .02, .1, M.steelDk, E / 2, y2 + .005, 6.56);
  beam(g, V(0, y2 - .12, 7.6), V(E, y2 - .12, 7.6), .14, M.steelDk);
  for (let x = 1; x < E; x += 1) box(g, .05, .035, 2.18, M.steelDk, x, y2 + .012, 7.6);
  for (const [a, b] of [[.3, E - 1.85], [E - .6, E - .3]]) box(g, b - a, .15, .01, M.orange || M.yellow, (a + b) / 2, y2 + .075, 8.67);
  // pó de minério no piso +14 (junto às saias dos alimentadores, ao pé da parede e na passagem), +7,5 e térreo; pedrinhas soltas
  if (M.dust) {
    let sd = 11; const r1 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const dGeo = [0, 1, 2, 3].map((q) => { const pg = new THREE.PlaneGeometry(1, 1), uv = pg.attributes.uv, ox = (q % 2) * .5, oy = (q >> 1) * .5; for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * .5, oy + uv.getY(i) * .5); return pg; });
    const decal = (x, y, z, w, d) => { const m = new THREE.Mesh(dGeo[(r1() * 4) | 0], M.dust); m.rotation.set(-Math.PI / 2, 0, r1() * 6.28); m.scale.set(w, d, 1); m.position.set(x, y + .006, z); m.receiveShadow = true; m.castShadow = false; g.add(m); };
    for (const x of SCREENS.xs) {
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) decal(x + s * (.95 + r1() * .5), y2, .9 + r1() * 3.2, .8 + r1() * 1.2, .8 + r1() * 1.4);
      decal(x + (r1() - .5), y2, 4.5 + r1() * .8, 1.2 + r1(), .8 + r1() * .6);
    }
    for (let x = .8; x < E; x += 1.6 + r1() * 1.5) decal(x, y2, .35 + r1() * .3, 1.2 + r1() * 1.4, .7 + r1() * .5);
    for (let k = 0; k < 18; k++) decal(r1() * E, y2, 4.6 + r1() * 1.8, .6 + r1() * 1.2, .6 + r1());
    const solidL1 = (x, z) => x > .4 && x < E - .4 && !holes.some(([a, b]) => x > a - .3 && x < b + .3 && z > 3.1 && z < B.D - 5.3);
    for (let k = 0, n = 0; k < 400 && n < 60; k++) { const x = r1() * E, z = .4 + r1() * (B.D - .8); if (!solidL1(x, z)) continue; decal(x, y1, z, .7 + r1() * 1.6, .6 + r1() * 1.2); n++; }
    for (const [a, b] of holes) for (const z of [3.2, B.D - 5.4]) decal((a + b) / 2 + (r1() - .5) * 2, y1, z + (z < 10 ? -.3 : .3), 1.4 + r1() * 1.5, .7 + r1() * .5);
    for (const x of B.colX) for (const z of B.colZ) if (r1() < .7) decal(x + (r1() - .5) * .6, 0, z + (r1() - .5) * .6, 1.6 + r1(), 1.4 + r1());
    // pedrinhas de minério caídas (InstancedMesh)
    if (M.ore) {
      const pts = [];
      for (const x of SCREENS.xs) for (let k = 0; k < 26; k++) { const s = r1() < .5 ? -1 : 1; pts.push([x + s * (.8 + r1() * .7), y2, .6 + r1() * 3.8]); }
      for (let k = 0; k < 90; k++) pts.push([r1() * E, y2, r1() * 6.3]);
      for (let k = 0, n = 0; k < 900 && n < 220; k++) { const x = r1() * E, z = .3 + r1() * (B.D - .6); if (solidL1(x, z)) { pts.push([x, y1, z]); n++; } }
      const im = new THREE.InstancedMesh(rockGeometry(1, 3), M.ore, pts.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
      pts.forEach(([x, y, z], i) => { const r = .015 + r1() * r1() * .06; e.set(r1() * 3, r1() * 6.28, r1() * 3); q.setFromEuler(e); sc.set(r, r, r); mt.compose(V(x, y + r * .45, z), q, sc); im.setMatrixAt(i, mt); });
      im.receiveShadow = true; im.castShadow = false; oreColors(im, 5); g.add(im);
    }
  }
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
  // longarinas de fechamento (terças de parede) por dentro das telhas: quebram o plano e seguram o pó
  const girt = (a, b) => { const m = beam(g, a, b, .1, M.steelDk); m.userData.shell = true; };
  for (let y = 6; y < B.H - .5; y += 2.4) girt(V(0, y, .2), V(B.W, y, .2));
  for (let y = 8; y < B.H - .5; y += 2.4) for (const x of [.2, B.W - .2]) girt(V(x, y, 0), V(x, y, B.D));
  for (let y = LV.L2 + 3.2; y < B.H - .5; y += 2.4) girt(V(0, y, B.D - .2), V(B.W, y, B.D - .2));
  // cobertura: telha + treliças, com telhas translúcidas (claraboias) alternadas em duas fileiras — o sol entra por elas
  // (manchas de sol no piso +14 e na parede do fundo; feixes com poeira em render.js)
  const SKY = [];
  for (const x of [4, 20, 36, 52]) SKY.push([x - .75, x + .75, 17.3, 19.7]);
  for (const x of [12, 28, 44, 60]) SKY.push([x - .75, x + .75, 5.3, 7.7]);
  const RX0 = -.5, RX1 = B.W + .5, RZ0 = -.5, RZ1 = B.D + .5;
  const roofRect = (x0, x1, z0, z1) => {
    if (x1 - x0 < .01 || z1 - z0 < .01) return;
    const mk = (mat, y, rx) => { const pg = new THREE.PlaneGeometry(x1 - x0, z1 - z0), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0) - RX0) / (RX1 - RX0), (z0 + uv.getY(i) * (z1 - z0) - RZ0) / (RZ1 - RZ0));
      const m = new THREE.Mesh(pg, mat); m.rotation.x = rx; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.userData.shell = true; m.castShadow = true; m.receiveShadow = true; g.add(m); };
    mk(M.cladIn, B.H + .8, Math.PI / 2); mk(M.cladOut, B.H + .85, -Math.PI / 2);
  };
  const zb = [RZ0, 5.3, 7.7, 17.3, 19.7, RZ1];
  for (let k = 0; k < zb.length - 1; k++) {
    const z0 = zb[k], z1 = zb[k + 1], row = SKY.filter((r) => r[2] === z0).sort((a, b) => a[0] - b[0]);
    let xa = RX0; for (const r of row) { roofRect(xa, r[0], z0, z1); xa = r[1]; } roofRect(xa, RX1, z0, z1);
  }
  const skyMat = M.skylight || M.glass;
  for (const [x0, x1, z0, z1] of SKY) {
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), skyMat); sk.rotation.x = Math.PI / 2; sk.position.set((x0 + x1) / 2, B.H + .82, (z0 + z1) / 2);
    sk.castShadow = false; sk.receiveShadow = false; sk.userData.shell = true; sk.userData.keep = true; sk.name = 'claraboia'; g.add(sk);
    for (const z of [z0, z1]) box(g, x1 - x0 + .1, .06, .08, M.steelDk, (x0 + x1) / 2, B.H + .77, z);
  }
  g.userData.skylights = SKY.map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, y: B.H + .8 }));
  for (const x of B.colX) { beam(g, V(x, B.H, 0), V(x, B.H + .8, 12), .14, M.steel); beam(g, V(x, B.H + .8, 12), V(x, B.H, B.D), .14, M.steel); for (let k = 1; k < 6; k++) beam(g, V(x, B.H, k * 4), V(x, B.H + .8 * (1 - Math.abs(k * 4 - 12) / 12), k * 4), .08, M.steelDk); }
  for (let z = 2; z < B.D; z += 3) beam(g, V(0, B.H + .7 - Math.abs(z - 12) / 12 * .7, z), V(B.W, B.H + .7 - Math.abs(z - 12) / 12 * .7, z), .1, M.steelDk);
  // luminárias de galpão (high-bay) sob a cobertura e sob o piso L2
  const lampGeo = new THREE.CylinderGeometry(.35, .5, .35, 18, 1, true);
  const addLamp = (x, y, z) => { const sh = new THREE.Mesh(lampGeo, M.greyDk); sh.position.set(x, y, z); g.add(sh); const d = new THREE.Mesh(new THREE.CircleGeometry(.42, 18), M.glass); d.rotation.x = Math.PI / 2; d.position.set(x, y - .17, z); g.add(d); lamps.push(V(x, y - .3, z)); };
  for (let x = 4; x < B.W; x += 8) for (const z of [6, 18]) addLamp(x, B.H - .8, z);
  for (let x = 4; x < E; x += 8) addLamp(x, LV.L2 - .7, 14);
  // iluminação local do piso +14: projetores LED presos sob a passarela da correia, entre os alimentadores
  for (const x of [6.25, 17.25, 28.25, 39.25]) {
    const yL = 16.75, zL = 4.6;
    box(g, .5, .1, .3, M.greyDk, x, yL + .06, zL); beam(g, V(x, yL + .1, zL), V(x, 16.97, 4.2), .03, M.steelDk);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(.42, .22), M.glass); d.rotation.x = Math.PI / 2; d.position.set(x, yL + .005, zL); g.add(d);
    const p = V(x, yL - .05, zL); p.kind = 'l2'; lamps.push(p);
  }
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
