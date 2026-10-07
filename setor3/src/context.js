// Entorno do setor 3: o restante do processo de Germano na mesma disposição do simulador (página principal), em escala real
// e com geometria simples: mina/cava (1) → correia da mina → TCLD → setor 3 → produto → pilha de regularização (4) →
// retomada → concentradores (5) → espessadores (6) → estação de bombas e minerodutos (10); filtragem de rejeito arenoso (7).
// Posições convertidas do simulador: x_gêmeo = (x_sim + 91,2)/0,38 ; z_gêmeo = (z_sim + 2,6)/0,38.
import * as THREE from 'three';
import { B } from './layout.js?v=20261007202849';
import { V, box, beam, cyl } from './util.js?v=20261007202849';

const AREAS = {
  mina: { n: 1, nome: 'Mina de Alegria e pilha pulmão', x: 4, z: -80 },
  pilha: { n: 4, nome: 'Pilha de regularização', x: 30, z: 62 },
  conc: { n: 5, nome: 'Concentradores · moagem, deslamagem e flotação', x: 112, z: 14 },
  esp: { n: 6, nome: 'Espessamento e tanques de estocagem', x: 160, z: 60 },
  sf: { n: 7, nome: 'Filtragem de rejeito arenoso', x: 70, z: 112 },
  bombas: { n: 10, nome: 'Estação de Bombas 1 e minerodutos', x: 190, z: -20 },
};

export function buildContext(scene, M, root) {
  const g = new THREE.Group(); g.name = 'entorno'; scene.add(g);
  const labels = [], anim = [], occ = [];
  const addOcc = (x, y, z, w, h, d) => occ.push(new THREE.Box3(new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)));
  const mat = (c, r = .85, m = .1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const C = { laterita: mat(0x8a5236, 1, 0), banco: mat(0x6e4430, 1, 0), agua: mat(0x3d5a5c, .2, .1), predio: mat(0x9a9488, .8, .3), predioEsc: mat(0x6f6a62, .8, .35), telhado: mat(0x5f6b70, .6, .5),
    tanque: mat(0xb9b6ad, .5, .5), verde: mat(0x2f7d5b, .7, .3), estrada: mat(0x7a6a5c, 1, 0), minerio: M.ore || mat(0x5a3324, 1, 0), areia: mat(0xb39a74, 1, 0), amarelo: M.yellow || mat(0xe8b416), correia: M.belt || mat(0x1f1d1b) };

  // ---- terreno: substitui o plano do prédio por um maior, com a abertura da cava
  root.traverse((o) => { if (o.name === 'terreno') o.visible = false; });
  const A = AREAS.mina, PR = 40, PD = 26;
  const sh = new THREE.Shape(); sh.moveTo(-450, -450); sh.lineTo(450, -450); sh.lineTo(450, 450); sh.lineTo(-450, 450); sh.lineTo(-450, -450);
  const hole = new THREE.Path(); hole.absarc(A.x - 32, -(A.z) - 0, PR, 0, Math.PI * 2, true); sh.holes.push(hole);
  const gg = new THREE.ShapeGeometry(sh, 64); gg.rotateX(-Math.PI / 2); gg.translate(32, 0, 0);
  const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 400, uv.getY(i) / 400);
  const ground = new THREE.Mesh(gg, M.ground || C.laterita); ground.position.y = -.03; ground.receiveShadow = true; g.add(ground);

  // ---- 1 · cava em bancadas (paredes cônicas + bermas), fundo com água e caminhões subindo a rampa
  const NB = 5;
  for (let k = 0; k < NB; k++) {
    const r0 = PR - k * 6.5, r1 = r0 - 3.2, y0 = -k * PD / NB, y1 = y0 - PD / NB;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, y0 - y1, 64, 1, true), k % 2 ? C.banco : C.laterita); wall.material.side = THREE.BackSide; wall.position.set(A.x, (y0 + y1) / 2, A.z); wall.receiveShadow = true; g.add(wall);
    const berm = new THREE.Mesh(new THREE.RingGeometry(r1 - 3.3, r1, 64), C.laterita); berm.material.side = THREE.DoubleSide; berm.rotation.x = -Math.PI / 2; berm.position.set(A.x, y1, A.z); g.add(berm);
  }
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(PR - NB * 6.5, 48), C.agua); fundo.rotation.x = -Math.PI / 2; fundo.position.set(A.x, -PD + .05, A.z); g.add(fundo);
  for (let i = 0; i < 4; i++) {           // caminhões fora de estrada percorrendo as bermas
    const t = new THREE.Group(); box(t, 3.4, 1.4, 7, C.amarelo, 0, 1.5, 0); box(t, 3.2, 1.6, 3, mat(0x222222), 0, 2.9, 1.6); box(t, 3.0, 1.2, 2.2, C.amarelo, 0, 2.6, -2.2);
    for (const sx of [-1.6, 1.6]) for (const sz of [-2.4, 2.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .7, 14), mat(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(sx, .9, sz); t.add(w); }
    g.add(t); anim.push({ t, k: i % (NB - 1), a: i * 1.7, v: .05 + i * .012 });
  }
  // pilha pulmão de ROM junto à cava e britagem primária (moega)
  const pul = new THREE.Mesh(new THREE.ConeGeometry(14, 9, 40), pileTexMat()); pul.position.set(A.x + 52, 4.5, A.z + 8); addOcc(A.x + 52, 2.5, A.z + 8, 16, 5, 16); pul.castShadow = pul.receiveShadow = true; g.add(pul);
  box(g, 12, 9, 10, C.predioEsc, A.x + 38, 4.5, A.z + 28); box(g, 13, .6, 11, C.telhado, A.x + 38, 9.3, A.z + 28);

  function pileTexMat() { return new THREE.MeshStandardMaterial({ color: 0x5a3526, roughness: 1, metalness: 0 }); }
  // ---- correias simples (estáticas) com apoios
  function belt(a, b, w = 1.4) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(), grp = new THREE.Group(); grp.position.copy(a).addScaledVector(d, .5); grp.lookAt(b); g.add(grp);
    box(grp, w + .4, .35, L, M.steelDk || C.predioEsc, 0, 0, 0); box(grp, w, .08, L, C.correia, 0, .2, 0);
    const n = Math.max(2, Math.floor(L * 1.4)), im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.18), C.minerio, n); grp.add(im);
    const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation((Math.random() - .5) * w * .5, .35, -L / 2 + (i + Math.random()) * L / n); im.setMatrixAt(i, m4); }
    anim.push({ belt: im, L, w, n, off: Math.random() * 10 });
    for (let s = 6; s < L - 2; s += 12) { const p = a.clone().addScaledVector(d, s / L); if (p.y > 1.2) beam(g, V(p.x, 0, p.z), V(p.x, p.y - .2, p.z), .3, M.steelDk || C.predioEsc); }
    return grp;
  }
  // correia da mina: britagem primária → TCLD (a TCLD sobe ao setor 3 no módulo de fluxos)
  belt(V(A.x + 44, 3, A.z + 30), V(B.screenEnd + 20, 2.5, -30));

  // ---- 4 · pilha de regularização: cone de minério com empilhadeira e retomada em túnel
  const P = AREAS.pilha;
  const pileTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#4b2c1f'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) { x.fillStyle = i % 2 ? 'rgba(120,70,45,.35)' : 'rgba(30,18,12,.35)'; x.fillRect(0, i * 10 + Math.sin(i) * 3, 256, 5 + (i % 3) * 2); }
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '20,12,8' : '140,90,60'},.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); return t; })();
  const pile = new THREE.Mesh(new THREE.ConeGeometry(28, 21, 64, 6), new THREE.MeshStandardMaterial({ map: pileTex, roughness: 1, metalness: 0 })); pile.position.set(P.x, 10.5, P.z); addOcc(P.x, 6, P.z, 34, 12, 34); pile.castShadow = pile.receiveShadow = true; g.add(pile);
  box(g, 1.4, 1.2, 1.4, M.chute || C.predioEsc, B.W + 6.1, 7.4, 32.1);
  belt(V(B.W + 6.3, 6.6, 32.4), V(P.x + 4, 23.5, P.z - 4), 1.2);           // correia do produto do setor 3 até a cabeça da empilhadeira
  beam(g, V(P.x + 4, 0, P.z - 4), V(P.x + 4, 23, P.z - 4), .7, M.steelDk || C.predioEsc);
  const fall = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.22), C.minerio, 60); g.add(fall); anim.push({ fall, top: V(P.x + 3, 23, P.z - 3), bot: V(P.x, 21, P.z) });
  box(g, 5, 4, 70, C.predioEsc, P.x, -1.6, P.z + 10);                  // túnel de retomada (aparece só a cobertura)
  belt(V(P.x, .8, P.z + 44), V(AREAS.conc.x - 30, 14, AREAS.conc.z + 10), 1.2);   // retomada → concentradores

  // ---- prédios das demais áreas (volumes simples, cores do simulador)
  // fechamento: telha ondulada cinza com faixa de janelas, montantes e sujeira de minério subindo do chão
  const fachada = (base, w, h) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 512; i += 6) { x.fillStyle = i % 12 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.07)'; x.fillRect(i, 0, 3, 256); }
    x.fillStyle = 'rgba(40,52,60,.9)'; x.fillRect(0, 40, 512, 26); for (let i = 0; i < 512; i += 32) { x.fillStyle = 'rgba(160,170,175,.6)'; x.fillRect(i, 40, 3, 26); }
    for (let i = 0; i < 512; i += 64) { x.fillStyle = 'rgba(70,64,58,.35)'; x.fillRect(i, 0, 6, 256); }
    const gr = x.createLinearGradient(0, 256, 0, 150); gr.addColorStop(0, 'rgba(110,58,34,.7)'); gr.addColorStop(1, 'rgba(110,58,34,0)'); x.fillStyle = gr; x.fillRect(0, 150, 512, 106);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(110,60,36,.18)'; x.fillRect(Math.random() * 512, 60 + Math.random() * 60, 2 + Math.random() * 3, 60 + Math.random() * 90); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 24)), 1); t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: .75, metalness: .35 }); };
  function predio(a, w, h, d, cor) { addOcc(a.x, h / 2, a.z, w, h, d); box(g, w, h, d, fachada(cor === C.predioEsc ? '#7a7570' : '#a39d92', w, h), a.x, h / 2, a.z); box(g, w + 1, .8, d + 1, C.telhado, a.x, h + .4, a.z); }
  const Cc = AREAS.conc; predio(Cc, 60, 30, 36); predio({ x: Cc.x + 6, z: Cc.z - 30 }, 30, 18, 16, C.predioEsc);
  for (let i = 0; i < 6; i++) cyl(g, 3.2, 3.2, 8, C.tanque, Cc.x - 22 + i * 9, 4, Cc.z + 26, 24);             // células de flotação
  for (const dz of [-8, 8]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 12, 24), C.verde); m.rotation.z = Math.PI / 2; m.position.set(Cc.x - 34, 5, Cc.z + dz); g.add(m); }  // moinhos
  const Es = AREAS.esp; for (const [dx, dz, r] of [[0, 0, 22], [52, 6, 18]]) { cyl(g, r, r, 5, C.tanque, Es.x + dx, 2.5, Es.z + dz, 48); const w = new THREE.Mesh(new THREE.CircleGeometry(r - .6, 48), C.agua); w.rotation.x = -Math.PI / 2; w.position.set(Es.x + dx, 5.05, Es.z + dz); g.add(w);
    const ponte = box(g, r * 2, .6, 1.4, C.amarelo, Es.x + dx, 6, Es.z + dz); anim.push({ rake: ponte, v: .03 }); }
  for (let i = 0; i < 4; i++) { cyl(g, 7, 7, 16, C.tanque, Es.x - 14 + i * 18, 8, Es.z + 40, 32); addOcc(Es.x - 14 + i * 18, 8, Es.z + 40, 10, 16, 10); }          // tanques de estocagem
  const Bo = AREAS.bombas; predio(Bo, 34, 12, 20, C.predioEsc);
  for (const dz of [-3, 0, 3]) beam(g, V(Bo.x + 17, 1, Bo.z + dz), V(Bo.x + 230, 1, Bo.z + dz - 40), .5, mat(0x3a3f44, .5, .6), true);   // minerodutos saindo
  const Sf = AREAS.sf; predio(Sf, 30, 16, 22); const ar = new THREE.Mesh(new THREE.ConeGeometry(16, 9, 40), C.areia); ar.position.set(Sf.x + 30, 4.5, Sf.z + 4); g.add(ar);
  // estradas
  for (const [a, b] of [[[-20, -30], [B.W + 30, -12]], [[B.W + 30, -12], [Cc.x, -16]], [[Cc.x, -16], [Bo.x, -40]], [[B.W + 30, -12], [B.W + 34, 100]]]) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), r = new THREE.Mesh(new THREE.PlaneGeometry(9, L), C.estrada); r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.atan2(dx, dz); r.position.set((a[0] + b[0]) / 2, .02, (a[1] + b[1]) / 2); r.receiveShadow = true; g.add(r);
  }
  // ligações de processo entre as áreas (tubulações de polpa)
  beam(g, V(Cc.x + 30, 2, Cc.z + 10), V(Es.x - 22, 2, Es.z), .6, mat(0x3a3f44, .5, .6), true);
  beam(g, V(Es.x + 30, 2, Es.z + 6), V(Bo.x - 17, 2, Bo.z), .6, mat(0x3a3f44, .5, .6), true);
  beam(g, V(Cc.x - 20, 2, Cc.z + 18), V(Sf.x, 2, Sf.z - 11), .5, mat(0x3a3f44, .5, .6), true);

  // etiquetas numeradas das áreas (mesmo padrão da página principal)
  for (const a of Object.values(AREAS)) labels.push({ pos: V(a.x, a === AREAS.mina ? 8 : a === AREAS.pilha ? 27 : 34, a.z), kind: 'area', text: () => `${a.n} · ${a.nome}` });

  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  let t = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  return {
    group: g, labels, occ,
    update(dt) {
      t += dt;
      for (const a of anim) {
        if (a.t) { const k = a.k, r = PR - k * 6.5 - 3.2 - 1.6, ang = a.a + t * a.v; a.t.position.set(A.x + Math.cos(ang) * r, -(k + 1) * PD / NB + .05, A.z + Math.sin(ang) * r); a.t.rotation.y = -ang; }
        else if (a.belt) { for (let i = 0; i < a.n; i++) { const z = ((i / a.n * a.L + t * 2.2 + a.off) % a.L) - a.L / 2; m4.makeTranslation(((i * 37) % 10 / 10 - .5) * a.w * .5, .35, z); a.belt.setMatrixAt(i, m4); } a.belt.instanceMatrix.needsUpdate = true; }
        else if (a.fall) { for (let i = 0; i < 60; i++) { const u = (i / 60 + t * .9) % 1; p.lerpVectors(a.top, a.bot, u); p.y = a.top.y - u * u * (a.top.y - a.bot.y); p.x += Math.sin(i * 7.3) * .35; m4.compose(p, q, s1); a.fall.setMatrixAt(i, m4); } a.fall.instanceMatrix.needsUpdate = true; }
        else if (a.rake) a.rake.rotation.y += dt * a.v;
      }
    },
  };
}
