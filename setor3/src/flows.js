// Fluxos de material do circuito real (entra → circula → sai), com correias animadas e etiquetas de vazão ao vivo:
// ENTRADA ROM pela TCLD → tripper de distribuição sobre os alimentadores 03AL → peneiras;
// retido 1º deck → correia → silos dos HP 400; retido 2º deck → correia → silos dos Barmac;
// britado → correia de retorno → peneiras; SAÍDA passante < 12,5 mm → correia → pilha de regularização.
// Correias: longarinas, cavaletes com roletes de carga em calha (3 rolos, 30°) e de retorno, rolos de impacto na zona de carga,
// tambores de cabeça/cauda revestidos, raspadores primário/secundário, acionamento, saias de vedação e chutes revestidos.
// Minério: leito contínuo (finos) + pedras de granulometria variada por correia (InstancedMesh, só a translação é atualizada),
// derramamento acumulado sob cabeças, caudas e transferências, e poeira leve nas quedas.
import * as THREE from 'three';
import { SCREENS, LV, B, CRUSHERS } from './layout.js?v=20261021215024';
import { V, box, beam, flatU, rockGeometry } from './util.js?v=20261021215024';

const hashF = (a, b = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
// pedrisco facetado (icosaedro sem subdivisão), deslocamento coerente por posição (não abre as faces)
function grainGeoF(k) {
  const g = new THREE.IcosahedronGeometry(1, 0), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const q = .72 + .5 * hashF(Math.round(v.x * 50) + k, Math.round(v.y * 50) * 3 + Math.round(v.z * 50) * 7); v.multiplyScalar(q); v.y *= .68; P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
// faixa (superfície) ao longo de z com seção dada por pf(i, z, out) → out.x, out.y; th > 0 cria a face de baixo também
function ribbonGeoF(nu, zs, pf, th = 0) {
  const nz = zs.length, ly = th ? 2 : 1, pos = new Float32Array(nu * nz * 3 * ly), uv = new Float32Array(nu * nz * 2 * ly), idx = [], o = { x: 0, y: 0 };
  for (let l = 0; l < ly; l++) for (let j = 0; j < nz; j++) for (let i = 0; i < nu; i++) {
    const k = l * nu * nz + j * nu + i; pf(i, zs[j], o); pos[k * 3] = o.x; pos[k * 3 + 1] = o.y - l * th; pos[k * 3 + 2] = zs[j]; uv[k * 2] = i / (nu - 1); uv[k * 2 + 1] = j / (nz - 1);
  }
  for (let l = 0; l < ly; l++) for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nu - 1; i++) {
    const a = l * nu * nz + j * nu + i, b = a + 1, c = a + nu, d = c + 1;
    if (l === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// monte de derramamento (meia esfera achatada e irregular, base no piso)
function moundGeoF(k) {
  const g = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i); const h = hashF(Math.round(v.x * 40) + k * 13, Math.round(v.z * 40) * 5 + Math.round(v.y * 40) * 11);
    const rr = .75 + .45 * h; v.x *= rr; v.z *= rr; v.y = v.y * (.6 + .6 * h) * (v.y > .99 ? .85 : 1); P.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}

const DRUMS_F = [];   // tambores de cabeça/cauda (giram com a correia)
export function buildFlows(scene, M, opt = {}) {
  const g = new THREE.Group(); scene.add(g);
  const belts = [], labels = [], embed = !!opt.embed;
  const LOW = embed || (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) || (typeof location !== 'undefined' && /[?&]q=low/.test(location.search));
  let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const lumpGeo = rockGeometry(1, 5), grainGeo = grainGeoF(3);
  // minério de ferro úmido: marrom-avermelhado escuro, hematita cinza-chumbo e finos quase pretos (cores lineares, multiplicam a textura de M.ore)
  const WET = [[.5, .29, .21], [.42, .24, .18], [.58, .35, .25], [.34, .21, .17], [.44, .38, .36], [.5, .33, .26]];
  const FIN = [[.44, .26, .19], [.36, .21, .16], [.5, .31, .23], [.3, .19, .15]];
  const DRY = [[.62, .42, .32], [.55, .37, .29], [.5, .4, .36], [.68, .48, .36]];
  const col = new THREE.Color(), setCol = (im, i, pal) => { const k = pal[(rnd() * pal.length) | 0], j = .82 + rnd() * .3; im.setColorAt(i, col.setRGB(k[0] * j, k[1] * j, k[2] * j)); };
  // granulometria por correia: [nº pedras/m, escala mín, máx, nº grãos/m, escala grão mín, máx, espessura do leito]
  const GRADE = { F: [8, .05, .14, 20, .02, .04, .09], T: [8, .05, .13, 20, .02, .04, .09], R1: [12, .045, .11, 8, .022, .04, .07],
    R2: [12, .03, .065, 16, .018, .032, .07], P: [3, .02, .035, 34, .011, .022, .06] };
  const dens0 = LOW ? .5 : 1;
  // instâncias estáticas compartilhadas por todas as correias (roletes, rolos de impacto, cavaletes, pedras derramadas)
  const ROLL = [], IMP = [], FRM = [], SPILL = [];
  const mt = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), Y = V(0, 1, 0), X = V(1, 0, 0);
  const rollAt = (list, grp, x, y, z, dir, len, r) => { qt.setFromUnitVectors(Y, dir); mt.compose(V(x, y, z), qt, sc.set(r, len, r)); list.push(new THREE.Matrix4().multiplyMatrices(grp.matrix, mt)); };
  const frmAt = (grp, x, y, z, sx, sy, sz) => { mt.compose(V(x, y, z), qt.identity(), sc.set(sx, sy, sz)); FRM.push(new THREE.Matrix4().multiplyMatrices(grp.matrix, mt)); };

  // ---------- piso abaixo de um ponto (raio para baixo contra o prédio e os equipamentos já montados) ----------
  const rc = new THREE.Raycaster(); rc.far = 26; const DOWN = V(0, -1, 0), nW = new THREE.Vector3();
  let targets = null;
  const floorAt = (p) => {
    if (embed) return null;
    if (!targets) { scene.updateMatrixWorld(true); targets = scene.children.filter((o) => o !== g); }
    rc.set(V(p.x, p.y - .05, p.z), DOWN);
    let hits = []; try { hits = rc.intersectObjects(targets, true); } catch (e) { return null; }
    for (const h of hits) {
      const m = h.object.material; if (!h.object.isMesh || !h.face || !m || Array.isArray(m) || m.transparent || !h.object.visible) continue;
      nW.copy(h.face.normal).transformDirection(h.object.matrixWorld); if (nW.y < .6) continue;
      return h.point.y;
    }
    return null;
  };
  // ---------- derramamento: monte achatado + pedras soltas + mancha de pó no piso ----------
  const dGeo = [0, 1, 2, 3].map((q) => { const pg = new THREE.PlaneGeometry(1, 1), uv = pg.attributes.uv, ox = (q % 2) * .5, oy = (q >> 1) * .5; for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * .5, oy + uv.getY(i) * .5); return pg; });
  const mGeo = [moundGeoF(1), moundGeoF(2), moundGeoF(3)];
  const spillRock = (x, y, z, s) => { qt.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)); mt.compose(V(x, y + s * .25, z), qt, sc.set(s * (.8 + rnd() * .5), s * (.6 + rnd() * .4), s * (.8 + rnd() * .5))); SPILL.push(mt.clone()); };
  const spill = (p, size = 1, dx = 0, dz = 0) => {
    const fy = floorAt(p); if (fy == null || p.y - fy < .25) return;
    const cx = p.x + dx, cz = p.z + dz;
    if (size > .35) {
      const r = .35 + .5 * size * (.7 + rnd() * .5), h = .07 + .16 * size * (.6 + rnd() * .6);
      const md = new THREE.Mesh(mGeo[(rnd() * 3) | 0], M.oreBed); md.scale.set(r * (.8 + rnd() * .4), h, r * (.8 + rnd() * .4)); md.rotation.y = rnd() * 6.28; md.position.set(cx, fy - .015, cz); md.receiveShadow = true; md.castShadow = false; g.add(md);
      if (size > .7) { const m2 = new THREE.Mesh(mGeo[(rnd() * 3) | 0], M.oreBed); m2.scale.set(r * .55, h * .7, r * .5); m2.position.set(cx + (rnd() - .5) * r * 1.4, fy - .01, cz + (rnd() - .5) * r * 1.4); m2.receiveShadow = true; m2.castShadow = false; g.add(m2); }
    }
    const nr = Math.round((LOW ? 8 : 18) * size + 2);
    for (let i = 0; i < nr; i++) { const an = rnd() * 6.28, rr = (.2 + 1.1 * Math.sqrt(rnd())) * (.4 + size * .8); spillRock(cx + Math.cos(an) * rr, fy, cz + Math.sin(an) * rr, .025 + .07 * rnd() * rnd()); }
    if (M.dust) { const dc = new THREE.Mesh(dGeo[(rnd() * 4) | 0], M.dust); dc.rotation.set(-Math.PI / 2, 0, rnd() * 6.28); const ds = 1.2 + size * 1.8; dc.scale.set(ds * (.8 + rnd() * .5), ds * (.7 + rnd() * .5), 1); dc.position.set(cx, fy + .008, cz); dc.receiveShadow = true; dc.castShadow = false; g.add(dc); }
  };
  // ---------- poeira leve nas quedas (pontos translúcidos, uma única chamada de desenho) ----------
  const EMIT = [];
  const dustAt = (p, k = 1) => { if (!embed) EMIT.push({ p: p.clone(), k }); };

  function belt(a, b, w, key) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(), steep = Math.abs(d.y) / L > .42, G = GRADE[key] || GRADE.T;
    const grp = new THREE.Group(); grp.position.copy(a).addScaledVector(d, .5); grp.lookAt(b); g.add(grp); grp.updateMatrix();
    const toG = (x, y, z) => V(x, y, z).applyMatrix4(grp.matrix);
    const tro = steep ? 0 : .52, lc = steep ? w : w * .4, hw = w / 2, wing = (w - lc) / 2, yS = .2, Z0 = -L / 2, Z1 = L / 2;
    const trans = (z) => Math.min(1, Math.max(0, (Math.min(z - Z0, Z1 - z) - .3) / 1.1));   // calha → plana junto aos tambores
    // ponto da superfície da correia na coordenada transversal sx (medida sobre a lona, a partir do centro)
    const surf = (sx, z, o) => { const as = Math.abs(sx); if (as <= lc / 2) { o.x = sx; o.y = yS; return o; } const an = tro * trans(z), e = as - lc / 2; o.x = Math.sign(sx) * (lc / 2 + e * Math.cos(an)); o.y = yS + e * Math.sin(an); return o; };
    const zs = []; for (let z = Z0; z < Z1 - .01; z += .5) zs.push(z); zs.push(Z1);
    // lona de carga (em calha) e de retorno
    const SX = [-hw, -lc / 2, lc / 2, hw];
    const lona = new THREE.Mesh(ribbonGeoF(4, zs, (i, z, o) => surf(SX[i], z, o), .016), M.belt); lona.castShadow = true; lona.receiveShadow = true; grp.add(lona);
    const r = .3, yc = yS - .006 - r, yRet = yc - r - .008;
    box(grp, w, .014, L, M.belt, 0, yRet, 0);
    // longarinas (perfil U) e chapas laterais da cabeça e da cauda
    for (const s of [-1, 1]) { box(grp, .07, .24, L - .3, M.steelDk, s * (hw + .2), -.07, 0); box(grp, .03, .08, L - .3, M.steelDk, s * (hw + .165), .035, 0); box(grp, .03, .08, L - .3, M.steelDk, s * (hw + .165), -.175, 0); }
    // tambores revestidos (a lona envolve), eixo, mancais e chapas de apoio
    for (const zz of [Z0, Z1]) {
      const dr = new THREE.Mesh(flatU(new THREE.CylinderGeometry(r, r, w + .12, 22)), M.greyDk); dr.rotation.z = Math.PI / 2; dr.position.set(0, yc, zz); dr.castShadow = true; grp.add(dr);
      for (const sy of [-1, 1]) { for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, .02, .06), M.steelDk || M.greyDk); sp.position.y = sy * (w / 2 + .065); sp.rotation.y = k * Math.PI / 3; dr.add(sp); }
        const mk = new THREE.Mesh(new THREE.BoxGeometry(r * .55, .025, .07), M.yellow); mk.position.set(r * .5, sy * (w / 2 + .07), 0); dr.add(mk); }
      dr.userData.keep = true; DRUMS_F.push({ o: dr, w: 2.2 / r });
      const wr = new THREE.Mesh(flatU(new THREE.CylinderGeometry(r + .014, r + .014, w, 22)), M.belt); wr.rotation.z = Math.PI / 2; wr.position.set(0, yc, zz); grp.add(wr);
      const ax = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.055, .055, w + .95, 10)), M.steel); ax.rotation.z = Math.PI / 2; ax.position.set(0, yc, zz); grp.add(ax);
      for (const s of [-1, 1]) { box(grp, .2, .2, .3, M.greyDk, s * (hw + .4), yc, zz); box(grp, .26, .05, .4, M.steelDk, s * (hw + .4), yc - .12, zz); box(grp, .06, .62, 1.1, M.steelDk, s * (hw + .24), yc + .02, zz + (zz > 0 ? -.35 : .35)); }
    }
    // raspador primário (lâmina de PU encostada no tambor de cabeça) e secundário (sob a lona, logo após o tambor)
    box(grp, w * .86, .14, .035, M.pu, 0, yc - .06, Z1 + r + .03).rotation.x = .55;
    const t1 = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.045, .045, w + .75, 10)), M.yellow); t1.rotation.z = Math.PI / 2; t1.position.set(0, yc - .16, Z1 + r + .14); grp.add(t1);
    for (let k = 0; k < 4; k++) box(grp, .05, .1, .06, M.greyDk, (k / 3 - .5) * w * .8, yc - .1, Z1 + r + .09);
    box(grp, w * .82, .07, .03, M.pu, 0, yRet - .045, Z1 - .5);
    const t2 = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.04, .04, w + .7, 10)), M.yellow); t2.rotation.z = Math.PI / 2; t2.position.set(0, yRet - .12, Z1 - .5); grp.add(t2);
    // acionamento (redutor + motor) ao lado do tambor de cabeça
    if (!embed && L > 6) {
      const sx0 = -(hw + .78);
      box(grp, .5, .52, .6, M.greyDk, sx0, yc, Z1); box(grp, .7, .05, 1.5, M.steelDk, sx0, yc - .3, Z1 - .35);
      const mo = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.2, .2, .7, 16)), M.motorBlue || M.motor); mo.rotation.x = Math.PI / 2; mo.position.set(sx0, yc + .02, Z1 - .68); mo.castShadow = true; grp.add(mo);
      const fc = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.17, .17, .14, 14)), M.motor); fc.rotation.x = Math.PI / 2; fc.position.set(sx0, yc + .02, Z1 - 1.1); grp.add(fc);
      box(grp, .4, .1, .1, M.steelDk, sx0 + .35, yc - .1, Z1 - .15);
    }
    // zona de carga: rolos de impacto, saias de vedação (chapa + borracha) e capota
    const zA = Z0 + .45, Ls = Math.min(3.2, Math.max(1.2, L * .22)), zB = zA + Ls;
    const skS = lc / 2 + wing * .42, skX = lc / 2 + wing * .42 * Math.cos(tro), skY = yS + wing * .42 * Math.sin(tro);
    for (const s of [-1, 1]) {
      box(grp, .035, .44, Ls, M.chute, s * skX, skY + .27, zA + Ls / 2);
      box(grp, .022, .11, Ls, M.rubber, s * (skX + .03), skY + .045, zA + Ls / 2);
      for (let z = zA + .25; z < zB; z += .55) { box(grp, .16, .05, .06, M.steelDk, s * (skX + .1), skY + .15, z); box(grp, .05, .3, .05, M.steelDk, s * (skX + .2), skY + .05, z); }
    }
    box(grp, 2 * skX + .12, .035, Ls, M.chute, 0, skY + .5, zA + Ls / 2); box(grp, 2 * skX + .12, .5, .035, M.chute, 0, skY + .25, zA);
    for (let z = zA + .4; z < zB; z += .8) box(grp, 2 * skX + .16, .06, .05, M.steelDk, 0, skY + .54, z);
    // cavaletes de carga (3 rolos em calha) e de retorno
    const rr = .065, ycR = yS - .008 - rr, lw = wing + .05;
    for (let z = Z0 + .9; z < Z1 - .7; z += (z > zA - .2 && z < zB) ? .42 : 1.2) {
      const an = tro * trans(z), list = (z > zA - .2 && z < zB) ? IMP : ROLL;
      rollAt(list, grp, 0, ycR, z, X, lc - .02, rr);
      if (wing > .05) for (const s of [-1, 1]) { const dir = V(s * Math.cos(an), Math.sin(an), 0), x0 = s * (lc / 2 + .02); rollAt(list, grp, x0 + dir.x * lw / 2, ycR + dir.y * lw / 2, z, dir, lw, rr); }
      frmAt(grp, 0, ycR - rr - .03, z, 2 * hw + .42, .05, .07);
      for (const s of [-1, 1]) {
        if (wing > .05) { const ex = lc / 2 + .02 + lw * Math.cos(an), ey = ycR + lw * Math.sin(an); frmAt(grp, s * (ex + .04), (ycR - rr + ey) / 2, z, .045, ey - ycR + rr + .02, .06); frmAt(grp, s * (lc / 2 + .01), ycR - rr + .01, z, .04, .07, .06); }
        else frmAt(grp, s * (hw + .05), ycR, z, .045, .16, .06);
      }
    }
    const ycRet = yRet - .008 - rr;
    for (let z = Z0 + 1.6; z < Z1 - 1; z += 3) { rollAt(ROLL, grp, 0, ycRet, z, X, w + .04, rr); for (const s of [-1, 1]) frmAt(grp, s * (hw + .11), (ycRet - .19) / 2 - .02, z, .045, -.19 - ycRet + .1, .055); }
    // correia de alta inclinação (> 25°): bordas laterais onduladas e taliscas (sidewall), que seguram o minério na subida
    if (steep) { for (const sx of [-1, 1]) box(grp, .06, .55, L, M.rubber, sx * w * .46, .45, 0); for (let s2 = .4; s2 < L - .2; s2 += .55) box(grp, w * .9, .22, .06, M.rubber, 0, .3, -L / 2 + s2); }
    // leito contínuo de finos (seção em lombo sobre a calha; a espessura acompanha a vazão)
    const zr0 = zA + .12, span = Z1 + .05 - zr0, wo = (steep ? .8 : .84) * w, t0 = G[6] * Math.min(1.3, w / 1.2), NU = 9;
    const bzs = zs.filter((z) => z > zr0); bzs.unshift(zr0);
    const bedTh = (sx) => { const u = sx / (wo / 2); return Math.pow(Math.max(0, 1 - u * u), .6); };
    const so = { x: 0, y: 0 };
    const bedG = ribbonGeoF(NU, bzs, (i, z, o) => { const sx = (i / (NU - 1) - .5) * wo; surf(sx, z, o); o.y += .004; }); const bedP = bedG.attributes.position, base = Float32Array.from(bedP.array);
    const bed = new THREE.Mesh(bedG, M.oreBed); bed.receiveShadow = true; bed.castShadow = false; bed.userData.keep = true; grp.add(bed);
    const setBed = (h) => { for (let k = 0; k < bedP.count; k++) { const i = k % NU, sx = (i / (NU - 1) - .5) * wo, z = base[k * 3 + 2], wav = 1 + .12 * Math.sin(z * 2.3 + i) * (i % (NU - 1) ? 1 : 0); bedP.setY(k, base[k * 3 + 1] + t0 * h * bedTh(sx) * wav); } bedP.needsUpdate = true; bedG.computeVertexNormals(); };
    // pedras (blocos e grãos): z inicial estratificado e embaralhado → qualquer fração visível fica espalhada pela correia toda
    const mkRocks = (geo, perM, s0, s1, pal, cast) => {
      const n = Math.max(4, Math.round(L * perM * Math.min(1.3, w / 1.2) * dens0)), im = new THREE.InstancedMesh(geo, M.ore, n); im.castShadow = cast; im.receiveShadow = true;
      const z0 = new Float32Array(n), sx = new Float32Array(n), up = new Float32Array(n);
      for (let k = 0; k < n; k++) z0[k] = (k + rnd()) / n * span;
      for (let k = n - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0, t = z0[k]; z0[k] = z0[j]; z0[j] = t; }
      for (let k = 0; k < n; k++) {
        const s = s0 + (s1 - s0) * Math.pow(rnd(), 1.8); sx[k] = (rnd() + rnd() - 1) * wo * .48; up[k] = s * (cast ? (.15 + .35 * rnd()) : (-.35 + .5 * rnd()));
        qt.setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28)); mt.compose(V(0, 0, 0), qt, sc.set(s * (.85 + rnd() * .35), s * (.75 + rnd() * .3), s * (.85 + rnd() * .35))); im.setMatrixAt(k, mt); setCol(im, k, cast ? WET : FIN);
      }
      im.instanceColor.needsUpdate = true; im.boundingSphere = new THREE.Sphere(V(0, .2, 0), L / 2 + 1); grp.add(im);
      return { im, n, z0, sx, up };
    };
    const lump = mkRocks(lumpGeo, G[0], G[1], G[2], WET, true), grain = mkRocks(grainGeo, G[3], G[4], G[5], FIN, false);
    const B0 = { key, grp, L, span, zr0, off: rnd() * span, lump, grain, bed, setBed, hs: -1, surf, bedTh, t0, wo, so, ctr: grp.position.clone(), rad: L / 2 + 1.5 };
    belts.push(B0);
    // apoios (pórticos de duas pernas com travessa) até o piso abaixo quando a correia está alta; derramamento sob cabeça e cauda e ao longo
    for (let z = Z0 + 3; z < Z1 - 1; z += 6) {
      const pa = toG(-(hw + .2), -.19, z), pb = toG(hw + .2, -.19, z), fa = floorAt(pa) ?? (embed ? 0 : null), fb = floorAt(pb) ?? (embed ? 0 : null);
      const ya = fa ?? 0, yb = fb ?? 0; if (pa.y - ya < 1.2 || pb.y - yb < 1.2) continue;
      beam(g, pa, V(pa.x, ya, pa.z), .14, M.steelDk); beam(g, pb, V(pb.x, yb, pb.z), .14, M.steelDk);
      const ym = Math.max(ya, yb) + (Math.min(pa.y, pb.y) - Math.max(ya, yb)) * .5; beam(g, V(pa.x, ym, pa.z), V(pb.x, ym, pb.z), .1, M.steelDk);
      if (!embed) { box(g, .36, .03, .36, M.steelDk, pa.x, ya + .015, pa.z); box(g, .36, .03, .36, M.steelDk, pb.x, yb + .015, pb.z); }
    }
    if (!embed) {
      spill(toG(0, -.5, Z1 - .45), 1.0, (rnd() - .5) * .4, (rnd() - .5) * .4);   // carryback sob o raspador
      spill(toG(0, -.5, zA + Ls * .4), .7);
      for (let z = Z0 + 2; z < Z1 - 2; z += 2.6) { if (rnd() < .45) continue; const s = rnd() < .5 ? -1 : 1; spill(toG(s * (hw + .1 + rnd() * .5), -.5, z + rnd()), .12 + rnd() * .22); }
    }
    return grp;
  }

  const E = B.screenEnd, zD1 = 12.8, zD2 = 13.9, yD1 = 6.4, yD2 = 5.5, yTop = 17.4;
  // ponto de transferência: capota da cabeça + chute revestido (chapas de desgaste parafusadas, juntas a cada ~0,5 m, flanges) até a cauda da seguinte
  const xfer = (a, b, w = .9) => {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(), n = Math.max(1, Math.round(L / .5));
    beam(g, a, b, w - .02, M.steelDk);
    for (let i = 0; i < n; i++) beam(g, a.clone().addScaledVector(d, (i + .05) / n), a.clone().addScaledVector(d, (i + .95) / n), w + .035, M.chute);
    for (const t of [.02, .98]) { const p = a.clone().addScaledVector(d, t); beam(g, p.clone().addScaledVector(d, -.03 / L), p.clone().addScaledVector(d, .03 / L), w + .14, M.steelDk); }
    box(g, w + .55, .8, w + .75, M.chute, a.x, a.y + .25, a.z); box(g, w + .65, .06, w + .85, M.steelDk, a.x, a.y + .66, a.z);
    box(g, .04, .34, .3, M.greyDk, a.x + (w + .55) / 2 + .02, a.y + .25, a.z);   // porta de inspeção
    dustAt(V(b.x, b.y + .25, b.z), 1); if (!embed) spill(V(b.x, b.y - .3, b.z), .8, (rnd() - .5) * .6, (rnd() - .5) * .6);
  };
  // ENTRADA: TCLD chegando de fora pelo fundo do prédio até o topo, e tripper sobre os alimentadores
  // a distribuição corre do fim do prédio (lado dos britadores, x ≈ 48) para o início: ROM novo e retorno caem na cauda
  if (!opt.embed) { belt(V(E + 20, 2.5, -30), V(E - .6, yTop + 1.6, 1.9), 1.4, 'F'); xfer(V(E - .6, yTop + 1.5, 2.0), V(E - .8, yTop + .4, 2.3)); }
  belt(V(E + 2.2, yTop, 2.4), V(-.5, yTop, 2.4), 1.4, 'T');
  const trip = new THREE.Group(); g.add(trip); box(trip, 2.4, 1.2, 2.2, M.yellow, 0, yTop + .7, 2.4); box(trip, 1.0, 1.4, 1.0, M.chute, 0, yTop - .4, 2.4);
  // retidos sob as descargas das peneiras (bicas com poeira na queda sobre as correias)
  SCREENS.xs.forEach((x) => {
    beam(g, V(x - .6, LV.L1 + .9, 11.9), V(x - .6, yD1 + .3, zD1), .5, M.chute); beam(g, V(x + .6, LV.L1 + .5, 11.9), V(x + .6, yD2 + .3, zD2), .5, M.chute);
    dustAt(V(x - .6, yD1 + .45, zD1), .7); dustAt(V(x + .6, yD2 + .45, zD2), .7);
  });
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
  CRUSHERS.cones.forEach((c) => { box(g, 1.5, .6, 1.5, M.chute, c.x, 15.55, zC); box(g, .4, 1.2, 1.7, M.yellow, c.x, 16.6, zC); dustAt(V(c.x, 15.7, zC + .9), .6); });
  CRUSHERS.vsi.forEach((c) => { box(g, 1.3, .5, 1.3, M.chute, c.x, 14.85, zV); box(g, .4, 1.2, 1.7, M.yellow, c.x, 15.8, zV); dustAt(V(c.x, 15.0, zV - .8), .6); });
  // SAÍDA: produto < 12,5 mm saindo pela lateral rumo à pilha
  xfer(V(E + 2.3, 1.25, 20.5), V(E + 2.9, .95, 20.6), .8);
  belt(V(E + 2.9, .85, 20.6), opt.embed ? V(B.W + 4, 2.4, 22) : V(B.W + 6, 7.6, 32), 1.2, 'P');

  // instâncias estáticas: roletes (aço), rolos de impacto (borracha), cavaletes e pedras derramadas
  const inst = (geo, mat, list, cast = true) => { if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = cast; im.receiveShadow = true; if (im.computeBoundingSphere) im.computeBoundingSphere(); g.add(im); return im; };
  const rollGeo = flatU(new THREE.CylinderGeometry(1, 1, 1, LOW ? 8 : 12));
  inst(rollGeo, M.greyDk, ROLL); inst(rollGeo, M.rubber, IMP); inst(new THREE.BoxGeometry(1, 1, 1), M.steelDk, FRM);
  const spIm = inst(lumpGeo, M.ore, SPILL, false); if (spIm) { for (let i = 0; i < SPILL.length; i++) setCol(spIm, i, rnd() < .6 ? DRY : WET); spIm.instanceColor.needsUpdate = true; }

  // poeira: partículas que nascem nas quedas, sobem devagar, espalham e somem (idades defasadas → emissão contínua)
  let dust = null;
  if (EMIT.length) {
    const PER = LOW ? 8 : 16, N = EMIT.length * PER, pos = new Float32Array(N * 3), colA = new Float32Array(N * 4), P = [];
    for (let i = 0; i < N; i++) { const life = 2.4 + rnd() * 2.2; P.push({ e: EMIT[(i / PER) | 0], age: rnd() * life, life, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0, seed: rnd() }); }
    const respawn = (q) => { const e = q.e.p; q.x = e.x + (rnd() - .5) * .5; q.y = e.y + (rnd() - .5) * .2; q.z = e.z + (rnd() - .5) * .5; q.vx = (rnd() - .5) * .22; q.vy = .08 + rnd() * .22; q.vz = (rnd() - .5) * .22; };
    P.forEach((q) => { respawn(q); q.x += q.vx * q.age; q.y += q.vy * q.age; q.z += q.vz * q.age; });
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d');
    const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(colA, 4));
    const pm = new THREE.PointsMaterial({ map: tex, size: .85, sizeAttenuation: true, transparent: true, depthWrite: false, vertexColors: true, fog: true });
    const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 4; g.add(pts);
    dust = { P, pos, colA, pg, respawn };
  }

  // etiquetas de vazão (texto atualizado pela interface)
  const fmt = (v) => Math.round(v).toLocaleString('pt-BR');
  labels.push({ pos: V(-12, 10.5, -16), kind: 'in', text: (K) => `ENTRADA · ROM da TCLD · ${fmt(K.F)} t/h` });
  labels.push({ pos: V(20, yTop + 2.2, 2.4), kind: 'mid', text: (K) => `Alimentação das peneiras (nova + retorno) · ${fmt(K.T)} t/h` });
  labels.push({ pos: V(8, LV.L1 + 1.6, 21.5), kind: 'mid', text: (K) => `Peneiramento primário: fino < 12,5 mm direto ao produto · ${fmt(K.fines || 0)} t/h` });
  labels.push({ pos: V(30, yD1 + 1.2, zD1), kind: 'mid', text: (K) => `Retido 1º deck → britagem primária HP 400 · ${fmt(K.T * K.r1)} t/h` });
  labels.push({ pos: V(30, yD2 + 1.0, zD2 + .4), kind: 'mid', text: (K) => `Retido 2º deck → britagem secundária Barmac · ${fmt(K.T * K.r2)} t/h` });
  labels.push({ pos: V(56, 2.2, 13.2), kind: 'mid', text: (K) => `Britado → retorno às peneiras · ${fmt((K.ret ?? (K.T - K.prod)))} t/h (carga circulante ${Math.round(K.circ)} %)` });
  labels.push({ pos: V(B.W + 8, 6, 24), kind: 'out', text: (K) => `SAÍDA · produto < 12,5 mm → pilha de regularização · ${fmt(K.prod)} t/h` });

  const SPD = 2.6, fr = new THREE.Frustum(), pmF = new THREE.Matrix4(), sph = new THREE.Sphere();
  // posiciona as pedras visíveis: z contínuo (offset global da correia, volta pela capota da zona de carga), y sobre a calha + leito
  const place = (bt, R, cnt) => {
    const A = R.im.instanceMatrix.array, o = bt.so, h = bt.hs * bt.t0;
    for (let i = 0; i < cnt; i++) {
      let z = R.z0[i] + bt.off; if (z >= bt.span) z -= bt.span; z += bt.zr0;
      const sx = R.sx[i]; bt.surf(sx, z, o);
      const k = i * 16; A[k + 12] = o.x; A[k + 13] = o.y + h * bt.bedTh(sx) + R.up[i]; A[k + 14] = z;
    }
    R.im.count = cnt; (R.im.instanceMatrix.clearUpdateRanges ? R.im.instanceMatrix.clearUpdateRanges() : 0); (R.im.instanceMatrix.addUpdateRange ? R.im.instanceMatrix.addUpdateRange(0, cnt * 16) : (R.im.instanceMatrix.updateRange.offset = 0, R.im.instanceMatrix.updateRange.count = cnt * 16)); R.im.instanceMatrix.needsUpdate = true;
  };
  return {
    group: g, labels,
    update(dt, t, S, cam) {
      const K = S && S.kpi ? S.kpi : { F: 3800, T: 6300, prod: 3800, r1: .2, r2: .2 };
      dt = Math.min(Math.max(dt || 0, 0), .25);
      if ((K.F || 0) > 0) for (const d of DRUMS_F) d.o.rotation.x += dt * d.w;
      let useFr = false;
      if (cam && cam.isCamera) { pmF.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(pmF); useFr = true; }
      for (const b of belts) {
        const q = b.key === 'F' ? K.F : b.key === 'T' ? K.T : b.key === 'R1' ? K.T * K.r1 : b.key === 'R2' ? K.T * K.r2 : K.prod;
        const run = q > 1; b.lump.im.visible = b.grain.im.visible = b.bed.visible = run;
        b.off = (b.off + dt * SPD) % b.span;           // avança sempre (mesmo fora da tela): sem saltos ao voltar a olhar
        if (!run) continue;
        const dens = Math.min(1, .6 + q / 6000);       // camada contínua; a vazão muda a densidade de pedras e a espessura do leito
        if (Math.abs(dens - b.hs) > .02) { b.hs = dens; b.setBed(dens); }
        if (useFr) { sph.center.copy(b.ctr).applyMatrix4(g.matrixWorld); sph.radius = b.rad * g.matrixWorld.getMaxScaleOnAxis(); if (!fr.intersectsSphere(sph)) continue; }
        place(b, b.lump, Math.max(1, Math.round(b.lump.n * dens))); place(b, b.grain, Math.max(1, Math.round(b.grain.n * dens)));
      }
      if (dust) {
        const { P, pos, colA, pg, respawn } = dust;
        for (let i = 0; i < P.length; i++) {
          const p = P[i]; p.age += dt; if (p.age >= p.life) { p.age -= p.life; respawn(p); }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= .995; p.vz *= .995;
          pos[i * 3] = p.x + Math.sin(t * .7 + p.seed * 9) * .05; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          const f = p.age / p.life, al = Math.sin(Math.PI * f) * .2 * p.e.k;
          colA[i * 4] = .66; colA[i * 4 + 1] = .46; colA[i * 4 + 2] = .34; colA[i * 4 + 3] = al;
        }
        pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
      }
    },
  };
}
