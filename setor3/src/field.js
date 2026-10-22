// Dispositivos de campo (funcionais): botoeiras de comando local junto a cada equipamento e chaves de cordão de emergência
// ao longo das correias, com lâmpadas que mostram o estado real (ligado, falha, bloqueado). Clicar abre o painel de comando local.
import * as THREE from 'three';
import { SCREENS, CRUSHERS, LV, B } from './layout.js?v=20261022120845';
import { V, box, beam } from './util.js?v=20261022120845';

export function buildField(root, M, opt = {}) {
  if (opt.embed) return {};   // no simulador (escala reduzida) os dispositivos não aparecem
  const g = new THREE.Group(); g.name = 'campo'; root.add(g);
  const pick = [], lamps = [];
  const encl = new THREE.MeshStandardMaterial({ color: 0x8d969e, roughness: .55, metalness: .35 });
  const blk = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: .6 });
  const yel = M.yellow || new THREE.MeshStandardMaterial({ color: 0xe0b020 });
  const cordM = new THREE.MeshStandardMaterial({ color: 0xd8401f, roughness: .6 });
  const lampM = (c) => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: c, emissiveIntensity: 0, roughness: .3 });
  const keep = (o) => { o.traverse((q) => { q.userData.keep = true; }); return o; };
  const sph = new THREE.SphereGeometry(.035, 12, 8), btn = new THREE.CylinderGeometry(.03, .03, .03, 14), mush = new THREE.CylinderGeometry(.055, .045, .045, 18);
  // botoeira: pedestal + caixa com lâmpadas (vermelha = ligado, âmbar = falha), botões I/O, seletor e cogumelo de emergência
  function station(tag, x, y, z, ry = 0) {
    const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry; g.add(s);
    box(s, .07, 1.05, .07, yel, 0, .52, 0); box(s, .34, .44, .16, encl, 0, 1.2, 0); box(s, .36, .04, .18, encl, 0, 1.44, 0);
    const lr = lampM(0xff3b2f), la = lampM(0xffb020), lk = lampM(0xffd24a);
    for (const [m, xx] of [[lr, -.1], [la, 0], [lk, .1]]) { const l = new THREE.Mesh(sph, m); l.position.set(xx, 1.36, .085); s.add(l); }
    const bG = new THREE.Mesh(btn, new THREE.MeshStandardMaterial({ color: 0x1fa060 })), bR = new THREE.Mesh(btn, new THREE.MeshStandardMaterial({ color: 0xc8261b }));
    for (const [b, xx] of [[bG, -.09], [bR, .09]]) { b.rotation.x = Math.PI / 2; b.position.set(xx, 1.24, .09); s.add(b); }
    const sel = new THREE.Mesh(new THREE.BoxGeometry(.03, .08, .02), blk); sel.position.set(0, 1.24, .095); s.add(sel);
    const es = new THREE.Mesh(mush, new THREE.MeshStandardMaterial({ color: 0xd0180c, roughness: .4 })); es.rotation.x = Math.PI / 2; es.position.set(0, 1.08, .1); s.add(es);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .01, 20), yel); ring.rotation.x = Math.PI / 2; ring.position.set(0, 1.08, .082); s.add(ring);
    keep(s); s.updateMatrixWorld(true); pick.push({ tag, box: new THREE.Box3().setFromObject(s).expandByScalar(.08) });
    lamps.push({ tag, lr, la, lk, sel, es });
  }
  // chave de cordão (caixa amarela) e cordão vermelho esticado ao longo da correia
  function cord(tag, a, b, n) {
    const d = new THREE.Vector3().subVectors(b, a);
    beam(g, a, b, .012, cordM, true);
    for (let i = 0; i <= n; i++) { const p = a.clone().addScaledVector(d, i / n), s = new THREE.Group(); s.position.copy(p); g.add(s);
      box(s, .2, .26, .14, yel, 0, 0, 0); const lv = box(s, .03, .16, .03, blk, 0, .18, 0); lv.rotation.z = .4;
      const la = lampM(0xff3b2f), l = new THREE.Mesh(sph, la); l.position.set(0, .05, .075); s.add(l); keep(s); s.updateMatrixWorld(true);
      pick.push({ tag, box: new THREE.Box3().setFromObject(s).expandByScalar(.15) }); lamps.push({ tag, la, cord: true }); }
  }
  CRUSHERS.cones.forEach((c) => station(c.tag, c.x - 2.8, 0, c.z + 3.6));
  CRUSHERS.vsi.forEach((c) => station(c.tag, c.x - 2.3, 0, c.z - 3.3, Math.PI));
  SCREENS.xs.forEach((x, i) => station(SCREENS.tags[i], x + 2.1, LV.L1, 3.2));
  const E = B.screenEnd;
  cord('03TC001', V(-.3, 17.8, 3.3), V(E + 2, 17.8, 3.3), 4);   // lado da passarela
  cord('03TC002', V(3, 7.0, 12.0), V(E + .8, 7.0, 12.0), 4);
  cord('03TC003', V(3, 6.1, 14.75), V(E + .4, 6.1, 14.75), 4);
  cord('03TC004', V(E + 2.8, 2.0, 14.1), V(B.W - 1.2, 2.0, 14.1), 2);
  cord('03TC005', V(2.2, 1.9, 19.6), V(E + 1.8, 1.9, 19.6), 4);
  station('03TC006', E + 17, 0, -26);
  station('03TC004', B.W - 2.6, 0, 15.2);
  station('03TC005', E + 3.2, 0, 18.6);
  let acc = 0;
  return { group: g, pick, update(dt, t, S) { if ((acc += dt) < .25 || !S) return; acc = 0;
    for (const L of lamps) { const o = (S.eq && S.eq[L.tag]) || (S.belts && S.belts[L.tag]); if (!o) continue;
      if (L.cord) { L.la.emissiveIntensity = o.cord ? (Math.sin(t * 8) > 0 ? 2.2 : .2) : 0; continue; }
      const blink = Math.sin(t * 7) > 0;
      L.lr.emissiveIntensity = o.on ? 2.2 : 0; L.la.emissiveIntensity = (o.trip || o.es || o.cord) ? (blink ? 2.4 : .3) : 0; L.lk.emissiveIntensity = o.lock || o.mnt ? 1.6 : 0;
      L.sel.rotation.z = o.mode === 'L' ? -.7 : .7; L.es.position.z = o.es ? .085 : .1; } } };
}
