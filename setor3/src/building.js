// Prédio do setor 3: estrutura metálica (perfis I laranja-ferrugem), pisos de concreto/grade, escadas, guarda-corpos,
// fechamento lateral verde com grandes aberturas, cobertura com treliças e luminárias de galpão.
import * as THREE from 'three';
import { B, LV, SCREENS } from './layout.js?v=20261003175719';
import { V, box, beam, ibeam, railing, stairs, cyl } from './util.js?v=20261003175719';

export function buildBuilding(scene, M, opt = {}) {
  const g = new THREE.Group(); scene.add(g);
  const lamps = [];
  // terreno externo e piso
  const out = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.ground || new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 1 }));
  out.rotation.x = -Math.PI / 2; out.position.set(B.W / 2, -.02, B.D / 2); out.receiveShadow = true; if (!opt.embed) g.add(out);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(B.W, B.D), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(B.W / 2, .005, B.D / 2); fl.receiveShadow = true; g.add(fl);
  // colunas (perfil I 0,6 m) e vigas por nível
  for (const x of B.colX) for (const z of B.colZ) { ibeam(g, V(x, 0, z), V(x, B.H, z), .6, .4, M.steel); box(g, 1, .25, 1, M.concrete, x, .12, z); }
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
  for (const [a, b] of holes) { railing(g, V(a, y1, 3.4), V(a, y1, B.D - 5.6), M.yellow); railing(g, V(b, y1, 3.4), V(b, y1, B.D - 5.6), M.yellow); }
  for (const [a, b] of holes) railing(g, V(a, y1, B.D - 5.6), V(b, y1, B.D - 5.6), M.yellow);   // frente de cada vão (lado da circulação)
  railing(g, V(B.screenEnd, y1, 0.3), V(B.screenEnd, y1, B.D - .3), M.yellow);
  // PISO DOS ALIMENTADORES (L2): faixa sobre a alimentação das peneiras, com grade e guarda-corpo voltado ao vão
  const E = B.screenEnd;
  box(g, E, t, 6.5, M.concrete, E / 2, LV.L2 - t / 2, 3.25);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(E, 2.2), M.grate); gr.rotation.x = -Math.PI / 2; gr.position.set(E / 2, LV.L2 + .01, 7.6); g.add(gr);
  beam(g, V(0, LV.L2 - .1, 8.7), V(E, LV.L2 - .1, 8.7), .18, M.steel);
  railing(g, V(.3, LV.L2, 8.6), V(E - .3, LV.L2, 8.6), M.yellow);
  // torre dos britadores (x 34–48): piso intermediário em grade a 5,5 m para inspeção da alimentação
  const gt = new THREE.Mesh(new THREE.PlaneGeometry(B.W - E, 4), M.grate); gt.rotation.x = -Math.PI / 2; gt.position.set((B.W + E) / 2, 5.5, 12); g.add(gt);
  railing(g, V(E + .2, 5.5, 10), V(B.W - .2, 5.5, 10), M.yellow); railing(g, V(E + .2, 5.5, 14), V(B.W - .2, 5.5, 14), M.yellow);
  // escadas
  stairs(g, 1.6, 0, 10, LV.L1, 10, 1.1, 0, M.yellow, M.yellow);
  stairs(g, E - 1.2, LV.L1, 21, LV.L2 - LV.L1, 8, 1.1, Math.PI, M.yellow, M.yellow);
  stairs(g, E + 1.2, 0, 23, 5.5, 6.5, 1.0, Math.PI, M.yellow, M.yellow);

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
  for (const x of [51, 59]) for (const z of [4, 20]) addLamp(x, 10.5, z);
  // tubulação de água/ar ao longo das colunas (detalhe das fotos)
  for (const x of [8, 24, 40, 56]) { beam(g, V(x + .5, 0, 12.4), V(x + .5, LV.L2, 12.4), .05, M.grey, true); }
  // vista em corte: de fora/acima do prédio a cobertura some para mostrar o processo
  return { group: g, lamps, update(dt, t, S, cam) { if (!cam || opt.embed) return; const p = cam.position, outside = p.y > B.H + 1 || p.x < -1 || p.x > B.W + 1 || p.z < -1 || p.z > B.D + 1; (g.parent || g).traverse((m) => { if (m.userData.shell) m.visible = !outside; }); } };
}
