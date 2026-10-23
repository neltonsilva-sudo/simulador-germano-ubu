// Dispositivos de campo (funcionais): botoeiras de comando local junto a cada equipamento e chaves de cordão de emergência
// ao longo das correias, com lâmpadas que mostram o estado real (ligado, falha, bloqueado). Clicar abre o painel de comando local.
import * as THREE from 'three';
import { SCREENS, CRUSHERS, LV, B } from './layout.js?v=20261023100504';
import { V, box, beam } from './util.js?v=20261023100504';

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
  // BOTOEIRA (estação de comando local) realista e funcional: caixa industrial cinza com tampa parafusada e para-sol, plaqueta da tag,
  // lâmpadas com aro e legenda, botões I/O/R com aro e legenda, chave seletora LOC/REM, cogumelo de emergência sobre placa amarela,
  // prensa-cabo e eletroduto pelo pedestal, cadeado com etiqueta quando bloqueada. Cada botão é clicável no 3D (btns → comando real).
  const TXC = {}, txt = (t, w = 256, h = 64, fg = '#111', bg = '#e9e9e4', font = 'bold 34px Arial') => { const k = t + w + h + fg + bg + font; if (TXC[k]) return TXC[k];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    String(t).split('\n').forEach((l, i, a) => x.fillText(l, w / 2, h / 2 + (i - (a.length - 1) / 2) * (h / a.length))); const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; if ('colorSpace' in tx) tx.colorSpace = 'srgb'; return TXC[k] = new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }); };
  const paint = new THREE.MeshStandardMaterial({ color: 0xbfc3bd, roughness: .48, metalness: .25 }), paintDk = new THREE.MeshStandardMaterial({ color: 0x9da29b, roughness: .55, metalness: .25 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: .25, metalness: .8 }), rubber = new THREE.MeshStandardMaterial({ color: 0x121314, roughness: .9 });
  const cyl = (r, h, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);
  const btns = [];
  const plane = (p, w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); p.add(m); return m; };
  const onFace = (p, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); p.add(m); return m; };
  function station(tag, x, y, z, ry = 0) {
    const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry; g.add(s); const F = .086;   // face frontal da caixa (z local)
    box(s, .3, .02, .3, M.steelDk || chrome, 0, .01, 0); box(s, .075, 1.0, .075, yel, 0, .5, 0); box(s, .2, .05, .1, yel, 0, .93, .02);   // base, pedestal e suporte
    box(s, .34, .62, .16, paint, 0, 1.26, 0); box(s, .352, .632, .012, paintDk, 0, 1.26, .082);   // corpo e tampa (aba)
    const hood = box(s, .4, .022, .22, paint, 0, 1.585, .02); hood.rotation.x = -.12;   // para-sol
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) onFace(s, cyl(.009, .006, 10), chrome, sx * .155, 1.26 + sy * .295, F + .004);   // parafusos da tampa
    plane(s, .22, .05, txt(tag, 256, 60, '#fff', '#1d4f91', 'bold 40px Arial'), 0, 1.525, F + .007);   // plaqueta da tag
    // lâmpadas sinalizadoras com aro e legenda
    const lampDef = [['LIGADO', 0xff3b2f], ['FALHA', 0xffb020], ['BLOQ.', 0xffd24a]], L = {};
    lampDef.forEach(([lb, c], i) => { const xx = -.1 + i * .1; onFace(s, cyl(.026, .012), chrome, xx, 1.455, F + .006);
      const lm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.35), emissive: c, emissiveIntensity: 0, roughness: .2, transparent: true, opacity: .95 }); onFace(s, cyl(.019, .016), lm, xx, 1.455, F + .014);
      plane(s, .07, .018, txt(lb, 128, 32, '#111', '#e9e9e4', 'bold 20px Arial'), xx, 1.418, F + .007); L[lb] = lm; });
    // chave seletora LOC/REM
    onFace(s, cyl(.03, .01), chrome, 0, 1.36, F + .005); const sel = new THREE.Group(); sel.position.set(0, 1.36, F + .014); s.add(sel);
    onFace(sel, cyl(.02, .01), rubber, 0, 0, 0); const knob = new THREE.Mesh(new THREE.BoxGeometry(.014, .056, .024), new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: .5 })); knob.position.z = .01; sel.add(knob);
    const mk = new THREE.Mesh(new THREE.BoxGeometry(.003, .03, .002), new THREE.MeshBasicMaterial({ color: 0xffffff })); mk.position.set(0, .01, .023); sel.add(mk);
    plane(s, .12, .02, txt('LOC        REM', 256, 40, '#111', '#e9e9e4', 'bold 26px Arial'), 0, 1.325, F + .007);
    knob.userData = { tag, act: 'mode', press: sel }; btns.push(knob);
    // botões I (verde), O (vermelho) e R (azul, rearme) com aro e legenda
    [['start', 0x1fa060, 'I LIGA', -.1], ['stop', 0xc8261b, 'O DESL.', 0], ['reset', 0x2a63c9, 'R REARME', .1]].forEach(([act, c, lb, xx]) => {
      onFace(s, cyl(.03, .01), chrome, xx, 1.255, F + .005); const bg = new THREE.Group(); bg.position.set(xx, 1.255, F + .013); s.add(bg);
      const b = onFace(bg, cyl(.022, .016), new THREE.MeshStandardMaterial({ color: c, roughness: .35 }), 0, 0, 0); b.userData = { tag, act, press: bg }; btns.push(b);
      plane(s, .085, .018, txt(lb, 160, 34, '#111', '#e9e9e4', 'bold 20px Arial'), xx, 1.218, F + .007); });
    // emergência: placa amarela circular com legenda + cogumelo vermelho
    onFace(s, cyl(.062, .004, 28), new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: .5 }), 0, 1.115, F + .004);
    plane(s, .12, .018, txt('EMERGÊNCIA', 220, 34, '#111', '#ffd21f', 'bold 22px Arial'), 0, 1.036, F + .007);
    const esg = new THREE.Group(); esg.position.set(0, 1.12, F + .012); s.add(esg); onFace(esg, cyl(.012, .02, 12), chrome, 0, 0, .004);
    const mush = onFace(esg, new THREE.CylinderGeometry(.044, .036, .026, 28), new THREE.MeshStandardMaterial({ color: 0xd0180c, roughness: .35 }), 0, 0, .022); mush.userData = { tag, act: 'es', press: esg }; btns.push(mush);
    // prensa-cabo e eletroduto descendo pelo pedestal
    const gl = box(s, .03, .03, .03, chrome, 0, .935, 0); gl.rotation.y = 0;
    const cv = new THREE.CatmullRomCurve3([V(0, .94, -.02), V(0, .85, -.06), V(0, .4, -.065), V(0, .05, -.07), V(0, .01, -.16)]);
    s.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, .011, 8), rubber));
    // cadeado e etiqueta de bloqueio (visíveis com LOTO aplicado)
    const lk = new THREE.Group(); lk.position.set(.19, 1.12, .02); s.add(lk); box(lk, .012, .05, .05, chrome, -.01, 0, 0);
    const pad = new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: .4 }); box(lk, .02, .045, .035, pad, .015, -.035, 0);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(.014, .003, 6, 12, Math.PI), chrome); sh.rotation.y = Math.PI / 2; sh.position.set(.015, -.012, 0); lk.add(sh);
    const tg = plane(lk, .06, .09, txt('PERIGO\nNÃO OPERE\nBLOQUEADO', 120, 180, '#fff', '#c81e1e', 'bold 24px Arial'), .03, -.12, 0); tg.rotation.y = Math.PI / 2; tg.material = tg.material.clone(); tg.material.side = THREE.DoubleSide; lk.visible = false;
    keep(s); s.updateMatrixWorld(true); pick.push({ tag, box: new THREE.Box3().setFromObject(s).expandByScalar(.08) });
    lamps.push({ tag, lr: L['LIGADO'], la: L['FALHA'], lk: L['BLOQ.'], sel, es: esg, lock: lk });
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
  return { group: g, pick, btns, update(dt, t, S) { if ((acc += dt) < .25 || !S) return; acc = 0;
    for (const L of lamps) { const o = (S.eq && S.eq[L.tag]) || (S.belts && S.belts[L.tag]); if (!o) continue;
      if (L.cord) { L.la.emissiveIntensity = o.cord ? (Math.sin(t * 8) > 0 ? 2.2 : .2) : 0; continue; }
      const blink = Math.sin(t * 7) > 0;
      L.lr.emissiveIntensity = o.on ? 2.2 : 0; L.la.emissiveIntensity = (o.trip || o.es || o.cord) ? (blink ? 2.4 : .3) : 0; L.lk.emissiveIntensity = o.lock || o.mnt ? 1.6 : 0;
      L.sel.rotation.z = o.mode === 'L' ? .7 : -.7; L.es.position.z = o.es ? .086 - .008 : .098; if (L.lock) L.lock.visible = !!(o.lock || o.mnt); } } };
}
