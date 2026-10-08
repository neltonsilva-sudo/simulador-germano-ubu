// Entorno do setor 3: o restante do processo de Germano na mesma disposição do simulador (página principal), em escala real:
// mina/cava (1) → correia da mina → TCLD → setor 3 → produto → empilhadeira e pilha de regularização (4) → retomada →
// concentradores (5) → espessadores (6) → estação de bombas e minerodutos (10); filtragem de rejeito arenoso (7).
// Posições convertidas do simulador: x_gêmeo = (x_sim + 91,2)/0,38 ; z_gêmeo = (z_sim + 2,6)/0,38.
// Regra de vizinhança: nada do entorno a menos de ~25 m das paredes do setor 3 (x 0–64, z 0–24), exceto correias e estradas.
import * as THREE from 'three';
import { B } from './layout.js?v=20261008063521';
import { V, box, beam, cyl, flatU, railing, stairs, rockGeometry } from './util.js?v=20261008063521';
import { mergeStatic } from './merge.js?v=20261008063521';
import { HIGH } from './render.js?v=20261008063521';

const AREAS = {
  mina: { n: 1, nome: 'Mina de Alegria e pilha pulmão', x: 4, z: -80 },
  pilha: { n: 4, nome: 'Pilha de regularização', x: 30, z: 62 },
  conc: { n: 5, nome: 'Concentradores · moagem, deslamagem e flotação', x: 112, z: 14 },
  esp: { n: 6, nome: 'Espessamento e tanques de estocagem', x: 160, z: 60 },
  sf: { n: 7, nome: 'Filtragem de rejeito arenoso', x: 70, z: 112 },
  bombas: { n: 10, nome: 'Estação de Bombas 1 e minerodutos', x: 190, z: -20 },
};

// Pilha cônica modelada (o ConeGeometry do three r169 gera só 1 triângulo por face → buracos "serrilhados"):
// ângulo de repouso, topo arredondado, pé espraiado, sulcos de escorregamento, camadas claras/escuras e topo úmido escuro
function pileGeo(R, H, seed = 1, tons = { base: [.15, .085, .058], dark: [.075, .046, .034], wet: [.045, .032, .028] }) {
  const SEG = 128, RINGS = 44, pos = [], col = [], uv = [], idx = [];
  const hsh = (a) => { const x = Math.sin(a * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i <= RINGS; i++) {
    const s = i / RINGS;                                    // 0 = topo, 1 = pé
    for (let j = 0; j <= SEG; j++) {
      const th = j / SEG * Math.PI * 2;
      const lobe = 1 + .05 * Math.sin(th * 3 + seed) + .03 * Math.sin(th * 7 + seed * 2);              // lóbulos da empilhadeira
      const r = s * R * lobe;
      let y = H * (1 - Math.pow(s, 1.0));
      y -= H * .07 * Math.exp(-s * s / .006);                // topo arredondado (cratera rasa do impacto)
      if (s > .86) y *= 1 - .5 * Math.pow((s - .86) / .14, 2);                                        // pé espraiado
      const gul = Math.sin(th * 41 + Math.sin(th * 5 + seed) * 2) * .22 * Math.sin(Math.PI * s) * (.6 + .4 * hsh(Math.floor(th * 41 / 6.283)));
      y += gul + (hsh(i * 131 + j) - .5) * .12 * Math.sin(Math.PI * s);
      pos.push(Math.cos(th) * r, Math.max(0, y), Math.sin(th) * r); uv.push(th / 6.283 * 8, s * 4);
      // cor: camadas por altura + sulcos mais escuros + topo úmido (recém-empilhado) + variação
      const band = .5 + .5 * Math.sin(y * 2.3 + Math.sin(th * 2 + seed) * 1.5), wet = Math.exp(-s * s / .05), n = (hsh(i * 7 + j * 13) - .5) * .06;
      const c = tons.base.map((b, k) => b * (1 - .35 * band) + tons.dark[k] * .35 * band);
      const g2 = gul < 0 ? .85 : 1;
      col.push(...c.map((v, k) => (v * (1 - wet) + tons.wet[k] * wet) * g2 + n));
    }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const a = i * (SEG + 1) + j, b = a + SEG + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- utilidades locais ----------
let sdE = 11;
const rr = () => ((sdE = (sdE * 16807) % 2147483647) / 2147483647);
const hsh = (n) => { const x = Math.sin(n * 127.1 + 17.3) * 43758.5453; return x - Math.floor(x); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const colL = (hex) => new THREE.Color(hex);                 // sRGB → linear (gestão de cor do three)
function ctex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// ruído de valor periódico (3 canais independentes) para manchas grandes no terreno; devolve textura + amostrador JS
function macroNoise(N = 256) {
  const chans = [0, 1, 2].map((c) => {
    const out = new Float32Array(N * N); let amp = 1, tot = 0;
    for (const f of [4, 8, 16, 32]) {
      const g = new Float32Array(f * f); let q = 97 + c * 1013 + f * 7; for (let i = 0; i < f * f; i++) { q = (q * 16807) % 2147483647; g[i] = q / 2147483647; }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = x / N * f, fy = y / N * f, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = g[(y0 % f) * f + x0 % f], b = g[(y0 % f) * f + (x0 + 1) % f], cc = g[((y0 + 1) % f) * f + x0 % f], d = g[((y0 + 1) % f) * f + (x0 + 1) % f];
        out[y * N + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy);
      }
      tot += amp; amp *= .55;
    }
    let mn = 9, mx = -9; for (let i = 0; i < N * N; i++) { out[i] /= tot; mn = Math.min(mn, out[i]); mx = Math.max(mx, out[i]); }
    for (let i = 0; i < N * N; i++) out[i] = (out[i] - mn) / (mx - mn);
    return out;
  });
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[i * 4] = chans[0][i] * 255; data[i * 4 + 1] = chans[1][i] * 255; data[i * 4 + 2] = chans[2][i] * 255; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  const at = (ch, u, v) => { const x = ((u % 1) + 1) % 1 * N, y = ((v % 1) + 1) % 1 * N; return chans[ch][(Math.floor(y) % N) * N + (Math.floor(x) % N)]; };
  return { tex: t, at };
}
// junta geometrias coloridas (vértices não indexados, normais facetadas) para a vegetação instanciada
function colGeo(parts) {
  const pos = [], nor = [], col = [];
  for (const [geo, hex, m4] of parts) {
    const gg = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m4); gg.deleteAttribute('normal'); gg.computeVertexNormals();
    const c = colL(hex), P = gg.attributes.position, N = gg.attributes.normal;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
const TRS = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(sx, sy, sz));

export function buildContext(scene, M, root) {
  const g = new THREE.Group(); g.name = 'entorno'; scene.add(g);
  const labels = [], anim = [], occ = [];
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) { const v = 175 + Math.random() * 80 | 0; x.fillStyle = `rgb(${v},${v},${v})`; const r = Math.random() < .1 ? 2.5 : 1.2; x.fillRect(Math.random() * 256, Math.random() * 256, r, r); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const pileMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 1, metalness: 0 });
  function pileTexMat() { return pileMat(); }
  const addOcc = (x, y, z, w, h, d) => occ.push(new THREE.Box3(new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)));
  const mat = (c, r = .85, m = .1, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
  // aço galvanizado (treliças da empilhadeira, galerias de correia, passarelas): cinza claro com flor de zinco e pó de minério
  const galvT = ctex(256, 256, (x, w, h) => { x.fillStyle = '#a9adaf'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const v = 150 + rr() * 70 | 0; x.fillStyle = `rgba(${v},${v + 2},${v + 4},.35)`; x.beginPath(); const cx = rr() * w, cy = rr() * h, r = 3 + rr() * 9; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + rr(); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.fill(); }
    for (let i = 0; i < 50; i++) { x.fillStyle = `rgba(120,72,48,${.08 + rr() * .14})`; x.fillRect(rr() * w, rr() * h, 2 + rr() * 20, 2 + rr() * 30); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(235,235,225,.18)'; x.fillRect(rr() * w, rr() * h, 2 + rr() * 6, 2 + rr() * 6); } });
  const galv = new THREE.MeshStandardMaterial({ map: galvT, roughness: .55, metalness: .3 });
  const C = { laterita: mat(0x8a5236, 1, 0), banco: mat(0x6e4430, 1, 0), agua: mat(0x3d5a5c, .2, .1), predio: mat(0x9a9488, .8, .3), predioEsc: mat(0x6f6a62, .8, .35), telhado: mat(0x5f6b70, .6, .5),
    tanque: mat(0xb9b6ad, .5, .4), verde: mat(0x2f7d5b, .7, .3), estrada: mat(0x7a6a5c, 1, 0), minerio: M.ore || mat(0x5a3324, 1, 0), areia: mat(0xb39a74, 1, 0), amarelo: M.yellow || mat(0xe8b416), correia: M.belt || mat(0x1f1d1b),
    concreto: mat(0xa8a39a, .95, 0), concDS: mat(0xa29d94, .95, 0, { side: THREE.DoubleSide }), aco: M.steelDk || mat(0x5b4a40, .7, .4), coluna: mat(0x59606a, .6, .45), escuro: mat(0x2f2a27, 1, 0),
    grade: mat(0x7c7b76, .7, .4), leira: mat(0x7a4a34, 1, 0), tubo: mat(0x3a3f44, .5, .6), azul: mat(0x2f5f8f, .5, .4), chute: M.chute || mat(0x6a4a3a, .8, .3), vidro: mat(0x22303a, .2, .6) };
  const steelDS = mat(0x8c8f90, .6, .4, { side: THREE.DoubleSide });

  // ================= TERRENO =================
  // solo laterítico com manchas grandes (ruído periódico em 2 escalas), três amostragens giradas do detalhe (sem repetição
  // aparente) e capim seco/verde em manchas; morros com mata no horizonte próximo (mesmo material, tingido por vértice)
  root.traverse((o) => { if (o.name === 'terreno') o.visible = false; });
  const A = AREAS.mina, PR = 40, PD = 26, NB = 5, BH = PD / NB, WH = 2.8, BWm = 3.0, PER = WH + BWm, RB = PR - NB * PER;   // cava: raio, profundidade, bancadas
  const GC = { x: 40, z: 10 }, GR = 260;                                                                                       // centro/raio do terreno plano
  const MN = macroNoise(256);
  const groundT = ctex(1024, 1024, (x, s) => {
    x.fillStyle = '#7b4a33'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) { const cx = rr() * s, cy = rr() * s, r = 8 + rr() * 60, k = rr(), c = k < .3 ? '150,104,66' : k < .6 ? '88,50,34' : '128,74,46'; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(${c},${.15 + rr() * .25})`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) if (Math.abs(cx + ox - s / 2) < s / 2 + r && Math.abs(cy + oy - s / 2) < s / 2 + r) x.fillRect(cx + ox - r, cy + oy - r, 2 * r, 2 * r); }
    for (let i = 0; i < 9000; i++) { const px = rr() * s, py = rr() * s, r = .6 + rr() * rr() * 3.2, v = rr(); x.fillStyle = v < .5 ? 'rgba(58,34,24,.5)' : v < .8 ? 'rgba(172,124,88,.55)' : 'rgba(122,112,106,.55)'; x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill(); }
    x.strokeStyle = 'rgba(48,28,20,.3)'; x.lineWidth = 1; for (let i = 0; i < 70; i++) { let px = rr() * s, py = rr() * s; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 10; k++) { px += (rr() - .5) * 14; py += (rr() - .5) * 14; x.lineTo(px, py); } x.stroke(); }
    const id = x.getImageData(0, 0, s, s), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (rr() - .5) * 16; d[i] += n; d[i + 1] += n * .9; d[i + 2] += n * .85; } x.putImageData(id, 0, 0);
  });
  const groundMat = new THREE.MeshStandardMaterial({ map: groundT, vertexColors: true, roughness: 1, metalness: 0 });
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.uMacro = { value: MN.tex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWpG;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n\tvWpG = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWpG;\nuniform sampler2D uMacro;')
      .replace('#include <map_fragment>', `
        vec2 wq = vWpG.xz;
        vec3 t1 = texture2D( map, wq / 7.0 ).rgb;
        vec3 t2 = texture2D( map, mat2( .8, -.6, .6, .8 ) * wq / 19.0 + .37 ).rgb;
        vec3 t3 = texture2D( map, mat2( .28, .96, -.96, .28 ) * wq / 53.0 + .71 ).rgb;
        vec3 gd = t1 * .45 + t2 * .35 + t3 * .2;
        vec4 m1 = texture2D( uMacro, wq / 310.0 ), m2 = texture2D( uMacro, wq / 87.0 + .5 );
        float ma = m1.r * .6 + m2.r * .4;
        gd *= mix( vec3( .70, .68, .70 ), vec3( 1.30, 1.17, 1.02 ), ma );
        float gm = smoothstep( .56, .76, m1.g * .55 + m2.g * .45 + ( t2.g - t2.r ) * .5 );
        vec3 gc = mix( vec3( .060, .074, .026 ), vec3( .15, .12, .055 ), m2.b ) * ( .8 + .6 * t1.g / max( t1.r, .02 ) );
        gd = mix( gd, gc, gm * .75 );
        diffuseColor.rgb *= gd;`);
  };
  groundMat.customProgramCacheKey = () => 'ctxGround';
  const grassMask = (x, z) => MN.at(1, x / 310, z / 310) * .55 + MN.at(1, x / 87 + .5, z / 87 + .5) * .45;
  // terreno plano (disco) com a abertura da cava
  {
    const sh = new THREE.Shape(); sh.absarc(GC.x, -GC.z, GR, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(A.x, -A.z, PR + 3, 0, Math.PI * 2, true); sh.holes.push(hole);
    const gg = new THREE.ShapeGeometry(sh, 128); gg.rotateX(-Math.PI / 2);
    gg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 3).fill(1), 3));
    const ground = new THREE.Mesh(gg, groundMat); ground.position.y = -.03; ground.receiveShadow = true; ground.userData.keep = true; g.add(ground);
  }
  // morros do horizonte próximo (anel), com mata mais densa no alto
  const hillH = (r, th) => { const a = smooth(GR + 2, 330, r), b = smooth(320, 420, r);
    const n1 = .5 + .5 * Math.sin(th * 5 + 1.3) * Math.sin(th * 2.3 + .4), n2 = .5 + .5 * Math.sin(th * 9 + 2) * Math.cos(th * 3.7);
    return -.3 + .3 * smooth(GR - .5, GR + 3, r) + a * (4 + 12 * n1 + 3 * n2) + b * (8 + 18 * n2); };
  {
    const RS = [], NT = 256; for (let r = GR - .5; r < 300; r += 2.5) RS.push(r); for (let r = 300; r <= 430; r += 8) RS.push(r);
    const pos = [], col = [], idx = [], forest = colL('#4a6a3a'), dry = colL('#9a8a5a');
    for (let i = 0; i < RS.length; i++) for (let j = 0; j <= NT; j++) {
      const th = j / NT * Math.PI * 2, r = RS[i], y = hillH(r, th); pos.push(GC.x + Math.cos(th) * r, y, GC.z + Math.sin(th) * r);
      const veg = smooth(GR + 4, GR + 45, r), f = smooth(.3, .7, .5 + .5 * Math.sin(th * 13 + r * .04) * Math.cos(th * 4.1 - r * .02));
      const tR = .55 - .25 * f, tG = 1.25 - .3 * f, tB = .8 - .2 * f;      // tinge o solo laterítico para capim/mata (multiplica o detalhe do material)
      col.push(1 + (tR - 1) * veg, 1 + (tG - 1) * veg, 1 + (tB - 1) * veg);
    }
    for (let i = 0; i < RS.length - 1; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hg.setIndex(idx); hg.computeVertexNormals();
    const hills = new THREE.Mesh(hg, groundMat); hills.userData.keep = true; hills.receiveShadow = true; g.add(hills);
    void forest; void dry;
  }

  // ================= 1 · CAVA =================
  // bancadas (talude ~62°, bermas de 3 m) com crista irregular, rampa de acesso em espiral (16 %) cortando as bancadas,
  // faixas de itabirito (hematita cinza, itabirito vermelho, goethita ocre, friável claro) inclinadas, canga no topo,
  // leira de segurança na crista e marcas de pneu na rampa
  const TH0 = Math.PI / 2 + .1 + .264, TT = 2.1 * Math.PI, R0 = PR - 4, R1 = RB + 2, HWR = 4, U0 = -.04;
  const Sx = (u) => R0 * u + (R1 - R0) * u * u / 2;
  const rampR = (u) => R0 + (R1 - R0) * u, rampY = (u) => (u <= 0 ? 0 : -PD * Sx(u) / Sx(1));
  const thExit = TH0 + U0 * TT;
  function bench(r, th) {
    if (r >= PR) { const q = r - PR - 1.5, gap = smooth(.12, .32, Math.abs(Math.atan2(Math.sin(th - thExit), Math.cos(th - thExit)))); return [Math.max(0, 1.2 * (1 - q * q)) * gap, 0]; }
    const rw = r + .7 * Math.sin(th * 7 + 1.3) + .45 * Math.sin(th * 17 + .4);        // crista irregular (desmonte)
    const d = PR - rw, k = Math.floor(d / PER); if (k >= NB || d < 0) return [d < 0 ? 0 : -PD, 0];
    const f = d - k * PER; return f < WH ? [-k * BH - f / WH * BH, 1] : [-(k + 1) * BH, 0];
  }
  function pitAt(r, th) {
    const [yb, wall] = bench(r, th); let best = 0, yr = 0, dl = 0;
    const phi0 = ((th - TH0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    for (const k of [-1, 0, 1]) { const phi = phi0 + k * 2 * Math.PI, u = phi / TT; if (u < U0 || u > 1) continue;
      const dd = r - rampR(u), w = 1 - smooth(HWR, HWR + 1.6, Math.abs(dd)); if (w > best) { best = w; yr = rampY(u); dl = dd; } }
    return { y: yb + (yr - yb) * best, w: best, dl, wall };
  }
  {
    const NR = 124, NT = 384, RMAX = PR + 3, pos = [], uvs = [], idx = [], meta = [];
    pos.push(A.x, -PD, A.z); uvs.push(A.x / 5, A.z / 5); meta.push({ y: -PD, w: 0, dl: 9, wall: 0, th: 0, r: 0 });
    for (let i = 1; i <= NR; i++) { const r = RMAX * i / NR; for (let j = 0; j < NT; j++) {
      const th = j / NT * Math.PI * 2, m = pitAt(r, th); let y = m.y;
      if (m.wall && m.w < .3) y += (hsh(i * 7.1 + j * 13.3) - .5) * .5;
      if (i === NR) y = 0;
      const x = A.x + Math.cos(th) * r, z = A.z + Math.sin(th) * r; pos.push(x, y, z); uvs.push(x / 5, z / 5 - y / 5); m.th = th; m.r = r; m.y = y; meta.push(m);
    } }
    for (let j = 0; j < NT; j++) idx.push(0, 1 + (j + 1) % NT, 1 + j);
    for (let i = 0; i < NR - 1; i++) for (let j = 0; j < NT; j++) { const a = 1 + i * NT + j, b = 1 + i * NT + (j + 1) % NT, c = a + NT, d = b + NT; idx.push(a, b, c, b, d, c); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); pg.setIndex(idx); pg.computeVertexNormals();
    const pal = ['#6a5c5a', '#8c4f37', '#a37b4f', '#54474a', '#a88c74', '#7d4632', '#606066'].map(colL);
    const lat = colL('#7d4b33'), dust = colL('#8d6e57'), roadC = colL('#9a8572'), mud = colL('#4c3a30'), N = pg.attributes.normal, cols = [], c = new THREE.Color(), c2 = new THREE.Color();
    for (let i = 0; i < meta.length; i++) {
      const m = meta[i], ny = N.getY(i), y = m.y, th = m.th;
      const bv = (y + 2.4 * Math.sin(th + .7) + .9 * Math.sin(th * 3 + 1.1)) / 1.15, bi = Math.floor(bv), fr = bv - bi;
      c.copy(pal[Math.floor(hsh(bi + 40) * pal.length)]); if (fr > .82) c.lerp(pal[Math.floor(hsh(bi + 41) * pal.length)], (fr - .82) / .18 * .5);
      if (y > -4) c.lerp(lat, smooth(-4, -1.2, y));
      c.lerp(c2.copy(c).multiplyScalar(.35).add(dust.clone().multiplyScalar(.65)), smooth(.72, .93, ny) * .9);
      if (m.w > .35) { c2.copy(roadC); const a = Math.abs(m.dl); if (Math.abs(a - 1.0) < .32 || Math.abs(a - 2.8) < .32) c2.multiplyScalar(.74); c.lerp(c2, smooth(.35, .85, m.w)); }
      if (y < -PD + .3) c.copy(mud);
      c.multiplyScalar(.88 + hsh(i * .37) * .24); cols.push(c.r, c.g, c.b);
    }
    pg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const pit = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: .97, metalness: 0 })); pit.userData.keep = true; pit.receiveShadow = true; g.add(pit);
  }
  // fundo: poça de água de drenagem e frente de lavra com escavadeira carregando um caminhão
  const thEnd = TH0 + TT;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), mat(0x4a5a52, .12, .05)); pond.rotation.x = -Math.PI / 2; pond.position.set(A.x + Math.cos(thEnd - 1.7) * 6.2, -PD + .06, A.z + Math.sin(thEnd - 1.7) * 6.2); g.add(pond);
  function truck(p) {
    const t = new THREE.Group(); p.add(t); t.userData.dyn = true; const pr = mat(0x1a1a1a, .9, 0), dk = mat(0x2a2a2a, .7, .2);
    box(t, 3.0, .8, 7.6, dk, 0, 1.5, 0);                                                     // chassi
    box(t, 3.8, .25, 5.4, C.amarelo, 0, 2.6, -1.1); for (const s of [-1, 1]) box(t, .2, 1.6, 5.4, C.amarelo, s * 1.9, 3.3, -1.1);   // caçamba
    box(t, 3.8, 2.0, .25, C.amarelo, 0, 3.5, 1.6); box(t, 3.8, .2, 1.8, C.amarelo, 0, 4.5, 2.5);                                 // frente + pala de proteção
    box(t, 1.3, 1.3, 1.5, dk, -1.0, 2.7, 2.9); box(t, 1.25, .6, 1.3, C.vidro, -1.0, 3.0, 2.95); box(t, 3.2, 1.0, .9, C.amarelo, 0, 1.9, 3.5);  // cabine e grade
    for (const sz of [-2.5, 2.6]) for (const sx of [-1.45, 1.45]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .75, 16), pr); w.rotation.z = Math.PI / 2; w.position.set(sx, 1.0, sz); t.add(w); }
    const load = new THREE.Mesh(pileGeo(2.1, 1.3, 5), pileMat()); load.scale.set(.9, 1, 1.25); load.position.set(0, 2.7, -1.1); load.userData.keep = true; t.add(load);
    return { t, load };
  }
  for (let i = 0; i < 3; i++) { const tk = truck(g); tk.t.scale.setScalar(1.05); anim.push({ truck: tk.t, load: tk.load, ph: i * .68, sp: .028 + i * .004 }); }
  { // escavadeira hidráulica (frente de lavra) + caminhão parado sendo carregado
    const ex = new THREE.Group(), ang = thEnd + 2.3, px = A.x + Math.cos(ang) * 5.5, pz = A.z + Math.sin(ang) * 5.5; ex.position.set(px, -PD, pz); ex.rotation.y = -ang - Math.PI / 2; g.add(ex);
    const dk = mat(0x262626, .8, .2); for (const s of [-1.6, 1.6]) box(ex, 1.1, 1.2, 6, dk, s, .6, 0); box(ex, 2.6, .8, 2.6, dk, 0, 1.5, 0);
    const up = new THREE.Group(); up.position.y = 1.9; up.userData.dyn = true; ex.add(up);
    box(up, 4.2, 2.4, 5.2, C.amarelo, 0, 1.2, -.6); box(up, 4.3, 1.5, 1.2, dk, 0, .9, -3.5); box(up, 1.5, 1.8, 1.8, C.amarelo, -1.3, 3.2, 1.2); box(up, 1.4, .9, 1.7, C.vidro, -1.3, 3.4, 1.25);
    for (const s of [-.45, .45]) { beam(up, V(s, 2, 1.4), V(s, 6.6, 5.8), .6, C.amarelo); beam(up, V(s, 6.6, 5.8), V(s, 2.0, 8.6), .5, C.amarelo); }
    box(up, 2.4, 1.7, 1.9, dk, 0, 1.4, 8.9);
    anim.push({ exc: up, r0: 0 });
    const tk = truck(g); tk.t.position.set(A.x + Math.cos(ang + .9) * 6.5, -PD, A.z + Math.sin(ang + .9) * 6.5); tk.t.rotation.y = -(ang + .9);
  }
  // pilha pulmão de ROM junto à cava e britagem primária (moega)
  const pul = new THREE.Mesh(pileGeo(14, 9, 3), pileTexMat()); pul.position.set(A.x + 52, 0, A.z + 8); pul.castShadow = pul.receiveShadow = true; addOcc(A.x + 52, 2.5, A.z + 8, 16, 5, 16); pul.castShadow = pul.receiveShadow = true; g.add(pul);

  // ================= CORREIAS EXTERNAS =================
  // galeria treliçada galvanizada (vãos de ~16 m), passarela lateral com guarda-corpo e cavaletes de 2 pernas contraventados
  function belt(a, b, w = 1.4, o = {}) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(), grp = new THREE.Group(); grp.position.copy(a).addScaledVector(d, .5); g.add(grp); grp.lookAt(b);
    box(grp, w + .4, .35, L, C.aco, 0, 0, 0); box(grp, w, .08, L, C.correia, 0, .2, 0);
    const n = Math.max(2, Math.floor(L * 1.4)), im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.18), C.minerio, n); grp.add(im);
    const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { m4.makeTranslation((Math.random() - .5) * w * .5, .35, -L / 2 + (i + Math.random()) * L / n); im.setMatrixAt(i, m4); }
    anim.push({ belt: im, L, w, n, off: Math.random() * 10 });
    const hw = w / 2 + .35, dep = o.dep ?? 1.3, np = Math.max(1, Math.round(L / 3));
    for (const s of [-1, 1]) {
      beam(grp, V(s * hw, -.1, -L / 2), V(s * hw, -.1, L / 2), .14, galv); beam(grp, V(s * hw, -.1 - dep, -L / 2), V(s * hw, -.1 - dep, L / 2), .14, galv);
      for (let i = 0; i <= np; i++) { const z = -L / 2 + L * i / np; beam(grp, V(s * hw, -.1, z), V(s * hw, -.1 - dep, z), .09, galv);
        if (i < np) { const z2 = -L / 2 + L * (i + 1) / np; beam(grp, V(s * hw, i % 2 ? -.1 : -.1 - dep, z), V(s * hw, i % 2 ? -.1 - dep : -.1, z2), .07, galv); } }
    }
    box(grp, .8, .06, L, C.grade, hw + .45, -.12, 0); railing(grp, V(hw + .85, -.1, -L / 2), V(hw + .85, -.1, L / 2), C.amarelo, 1.0);
    const lat = V(d.z, 0, -d.x).normalize();
    for (let s = 5; s < L - 2; s += 16) { const p = a.clone().addScaledVector(d, s / L); if (p.y < 2.6) continue; const top = p.y - dep - .3;
      const pa = p.clone().addScaledVector(lat, hw + .1), pb = p.clone().addScaledVector(lat, -hw - .1);
      beam(g, V(pa.x, 0, pa.z), V(pa.x, top, pa.z), .3, galv); beam(g, V(pb.x, 0, pb.z), V(pb.x, top, pb.z), .3, galv); beam(g, V(pa.x, top, pa.z), V(pb.x, top, pb.z), .25, galv);
      if (top > 4) { beam(g, V(pa.x, .4, pa.z), V(pb.x, top - .3, pb.z), .1, galv); beam(g, V(pb.x, .4, pb.z), V(pa.x, top - .3, pa.z), .1, galv); }
      box(g, 1, .5, 1, C.concreto, pa.x, .2, pa.z); box(g, 1, .5, 1, C.concreto, pb.x, .2, pb.z); }
    return grp;
  }
  // correia da mina: britagem primária → TCLD (a TCLD sobe ao setor 3 no módulo de fluxos)
  belt(V(A.x + 44, 3, A.z + 30), V(B.screenEnd + 20, 2.5, -30));

  // ================= 4 · PILHA DE REGULARIZAÇÃO E EMPILHADEIRA =================
  const P = AREAS.pilha;
  const pile = new THREE.Mesh(pileGeo(28, 21, 7), pileMat()); pile.position.set(P.x, 0, P.z); addOcc(P.x, 6, P.z, 34, 12, 34); pile.castShadow = pile.receiveShadow = true; g.add(pile);
  box(g, 1.4, 1.2, 1.4, C.chute, B.W + 6.1, 7.4, 32.1);
  // empilhadeira fixa: torre treliçada galvanizada com plataforma giratória, lança treliçada inclinada (~18°) com
  // transportador, passarela e guarda-corpo, mastro em A com tirantes, braço traseiro com contrapeso de concreto
  {
    const T = V(P.x + 35, 0, P.z), PIV = V(T.x, 14.6, T.z), HEAD = V(P.x + 1.8, 24.8, P.z), TH = 12.6;
    box(g, 8, .8, 8, C.concreto, T.x, .4, T.z);
    const legP = (sx, sz, y) => { const b = 2.6 + (1.5 - 2.6) * (y / TH); return V(T.x + sx * b, y, T.z + sz * b); };
    const CN = [[-1, -1], [1, -1], [1, 1], [-1, 1]], NP = 5;
    for (const [sx, sz] of CN) { beam(g, legP(sx, sz, .8), legP(sx, sz, TH), .34, galv); box(g, 1.2, .3, 1.2, galv, legP(sx, sz, .8).x, .95, legP(sx, sz, .8).z); }
    for (let i = 0; i <= NP; i++) { const y = .8 + (TH - .8) * i / NP, y2 = .8 + (TH - .8) * (i + 1) / NP;
      for (let c = 0; c < 4; c++) { const [ax, az] = CN[c], [bx, bz] = CN[(c + 1) % 4]; beam(g, legP(ax, az, y), legP(bx, bz, y), .16, galv);
        if (i < NP) { beam(g, legP(ax, az, y), legP(bx, bz, y2), .1, galv); beam(g, legP(bx, bz, y), legP(ax, az, y2), .1, galv); } } }
    // escada marinheiro na face +x e plataforma de topo com guarda-corpo
    const lx = T.x + 1.5 + .6; for (const s of [-.3, .3]) beam(g, V(lx + .35, .8, T.z + s), V(lx, TH, T.z + s), .06, galv);
    for (let y = 1.1; y < TH; y += .35) { const k = (y - .8) / (TH - .8); box(g, .05, .05, .6, galv, lx + .35 * (1 - k), y, T.z); }
    box(g, 5.2, .15, 5.2, C.grade, T.x, TH, T.z);
    const q = [[-2.6, -2.6], [2.6, -2.6], [2.6, 2.6], [-2.6, 2.6]]; for (let c = 0; c < 4; c++) railing(g, V(T.x + q[c][0], TH, T.z + q[c][1]), V(T.x + q[(c + 1) % 4][0], TH, T.z + q[(c + 1) % 4][1]), C.amarelo, 1.0);
    cyl(g, 2.2, 2.3, .7, C.aco, T.x, TH + .45, T.z, 32); box(g, 1.8, 1.3, 1.8, galv, T.x, TH + 1.45, T.z);
    // lança
    const bm = new THREE.Group(); bm.position.copy(PIV); g.add(bm); bm.lookAt(HEAD); bm.updateMatrixWorld(true);
    const L = PIV.distanceTo(HEAD), hw = 1.1, dep = (z) => 2.4 - 1.0 * Math.max(0, z) / L, z0 = -2.5, sa = (HEAD.y - PIV.y) / L, ca = Math.sqrt(1 - sa * sa);
    for (const s of [-1, 1]) { beam(bm, V(s * hw, 0, z0), V(s * hw, 0, L), .2, galv); beam(bm, V(s * hw, -dep(z0), z0), V(s * hw, -dep(L), L), .2, galv); }
    const NPb = Math.round((L - z0) / 2.6);
    for (let i = 0; i <= NPb; i++) { const z = z0 + (L - z0) * i / NPb, z2 = z0 + (L - z0) * (i + 1) / NPb;
      for (const s of [-1, 1]) { beam(bm, V(s * hw, 0, z), V(s * hw, -dep(z), z), .12, galv); if (i < NPb) beam(bm, V(s * hw, i % 2 ? 0 : -dep(z), z), V(s * hw, i % 2 ? -dep(z2) : 0, z2), .1, galv); }
      beam(bm, V(-hw, -dep(z), z), V(hw, -dep(z), z), .1, galv); beam(bm, V(-hw, 0, z), V(hw, 0, z), .1, galv);
      if (i < NPb) beam(bm, V(-hw, -dep(z), z), V(hw, -dep(z2), z2), .07, galv); }
    box(bm, 2.0, .22, L - z0, C.aco, 0, .15, (L + z0) / 2); box(bm, 1.3, .06, L - z0, C.correia, 0, .3, (L + z0) / 2);
    for (let z = z0 + .5; z < L; z += 1.5) box(bm, 1.7, .1, .12, galv, 0, .3, z);                      // cavaletes dos roletes
    const bo = new THREE.Group(); bo.position.set(0, .0, (L + z0) / 2); bm.add(bo);
    const nb = Math.floor((L - z0) * 1.4), ib = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.18), C.minerio, nb); bo.add(ib); anim.push({ belt: ib, L: L - z0, w: 1.1, n: nb, off: 0 });
    box(bm, .9, .07, L - 1, C.grade, hw + .5, -.05, (L - 1) / 2); railing(bm, V(hw + .95, -.05, 0), V(hw + .95, -.05, L - 1), C.amarelo, 1.0);
    const hp = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.55, .55, 1.6, 20)), C.aco); hp.rotation.z = Math.PI / 2; hp.position.set(0, .1, L); bm.add(hp);
    box(bm, 2.0, 1.3, 2.4, galv, 0, .75, L + .2); box(bm, 1.6, 1.5, 1.3, C.chute, 0, -.75, L + .9);
    const tp = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.45, .45, 1.6, 20)), C.aco); tp.rotation.z = Math.PI / 2; tp.position.set(0, .1, z0); bm.add(tp);
    box(bm, 1.4, 1.1, 1.6, C.azul, 1.7, -.2, z0 + .4); box(bm, .9, .9, 1.4, C.azul, 2.6, -.2, z0 + .4);              // acionamento (motor + redutor)
    // braço traseiro horizontal com contrapeso; mastro em A e tirantes
    const CW = V(0, 10 * sa, -10 * ca);
    for (const s of [-.8, .8]) { beam(bm, V(s, -.6, -1), V(s, CW.y - .6, CW.z), .45, galv); beam(bm, V(s, -dep(0), 0), V(s, CW.y - .6, CW.z), .2, galv); }
    const cwW = bm.localToWorld(CW.clone()); box(g, 3.4, 3.2, 3.4, C.concreto, cwW.x, cwW.y - 2.1, cwW.z);
    const AP = V(0, 8.5, 1.5); for (const s of [-1, 1]) beam(bm, V(s * hw, .1, .8), AP, .26, galv);
    const tie = mat(0x45484a, .5, .6); for (const s of [-.9, .9]) { beam(bm, AP, V(s, .1, L * .55), .05, tie, true); beam(bm, AP, V(s, .1, L - .6), .05, tie, true); beam(bm, AP, V(s * .5, CW.y - .4, CW.z), .06, tie, true); }
    // correia de alimentação (produto do setor 3) chegando sobre a cauda da lança, com chute de transferência
    const feed = bm.localToWorld(V(0, 2.6, z0 + .6)); belt(V(B.W + 6.3, 6.6, 32.4), V(feed.x, feed.y, feed.z - 1.2), 1.2);
    const fd2 = bm.localToWorld(V(0, .9, z0 + .6)); box(g, 1.3, feed.y - fd2.y, 1.6, C.chute, fd2.x, (feed.y + fd2.y) / 2, fd2.z - .4);
    // jato de minério saindo da cabeça (balístico) até o topo da pilha
    const E = bm.localToWorld(V(0, .3, L + .55)), dirB = new THREE.Vector3().subVectors(HEAD, PIV).normalize(), vh = dirB.multiplyScalar(2.6), yL = 19.8;
    const Tf = (vh.y + Math.sqrt(vh.y * vh.y + 19.6 * (E.y - yL))) / 9.8, nS = 150;
    const stream = new THREE.InstancedMesh(rockGeometry(.17, 3), C.minerio, nS); stream.frustumCulled = false; g.add(stream);
    anim.push({ stream, E, vh, T: Tf, n: nS });
  }
  box(g, 5, 4, 70, C.predioEsc, P.x, -1.6, P.z + 10);                  // túnel de retomada (aparece só a cobertura)
  belt(V(P.x, .8, P.z + 44), V(AREAS.conc.x - 22, 14, AREAS.conc.z + 10), 1.2);   // retomada → concentradores

  // ================= PRÉDIOS =================
  // fechamento: telha trapezoidal com faixa de caixilhos, janelas de salas, montantes e sujeira de minério subindo do chão
  const fachada = (base) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 512; i += 6) { x.fillStyle = i % 12 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.07)'; x.fillRect(i, 0, 3, 256); }
    x.fillStyle = 'rgba(40,52,60,.9)'; x.fillRect(0, 40, 512, 26); for (let i = 0; i < 512; i += 32) { x.fillStyle = 'rgba(160,170,175,.6)'; x.fillRect(i, 40, 3, 26); }
    for (let i = 20; i < 512; i += 128) { x.fillStyle = 'rgba(200,205,205,.9)'; x.fillRect(i - 2, 120, 44, 24); x.fillStyle = 'rgba(38,50,58,.95)'; x.fillRect(i, 122, 40, 20); x.fillStyle = 'rgba(200,205,205,.7)'; x.fillRect(i + 19, 122, 2, 20); }
    for (let i = 0; i < 512; i += 64) { x.fillStyle = 'rgba(70,64,58,.35)'; x.fillRect(i, 0, 6, 256); }
    const gr = x.createLinearGradient(0, 256, 0, 150); gr.addColorStop(0, 'rgba(110,58,34,.7)'); gr.addColorStop(1, 'rgba(110,58,34,0)'); x.fillStyle = gr; x.fillRect(0, 150, 512, 106);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(110,60,36,.18)'; x.fillRect(Math.random() * 512, 60 + Math.random() * 60, 2 + Math.random() * 3, 60 + Math.random() * 90); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: .75, metalness: .3 }); };
  const roofT = ctex(256, 128, (x, w, h) => { x.fillStyle = '#737b80'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { const gr = x.createLinearGradient(i, 0, i + 16, 0); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(.5, 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(255,255,255,.12)'); x.fillStyle = gr; x.fillRect(i, 0, 16, h); }
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(125,72,46,${.08 + rr() * .15})`; x.fillRect(rr() * w, 0, 3 + rr() * 12, h); } });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofT, roughness: .55, metalness: .45 });
  const louvreMat = new THREE.MeshStandardMaterial({ map: ctex(64, 64, (x) => { x.fillStyle = '#3b4146'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 8) { x.fillStyle = '#8c9396'; x.fillRect(0, i, 64, 3); } }), roughness: .6, metalness: .4 });
  const doorMat = new THREE.MeshStandardMaterial({ map: ctex(128, 128, (x) => { x.fillStyle = '#9aa0a3'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 6) { x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, i, 128, 1.5); } const gr = x.createLinearGradient(0, 128, 0, 80); gr.addColorStop(0, 'rgba(110,58,34,.6)'); gr.addColorStop(1, 'rgba(110,58,34,0)'); x.fillStyle = gr; x.fillRect(0, 80, 128, 48); }), roughness: .6, metalness: .4 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 2.5 });

  // predio: volume com paredes em planos (aberturas reais), pilares aparentes, rodapé de concreto, telhado em duas águas
  // com lanternim, calhas, portões de enrolar e escada externa em zigue-zague até a cobertura
  function predio(cx, cz, w, h, d, o = {}) {
    addOcc(cx, h / 2, cz, w, h, d);
    const fm = fachada(o.cor || '#a39d92'), x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const F = { s: { u0: x0, u1: x1, t: V(1, 0, 0), n: V(0, 0, 1) }, n: { u0: x0, u1: x1, t: V(1, 0, 0), n: V(0, 0, -1) }, e: { u0: z0, u1: z1, t: V(0, 0, 1), n: V(1, 0, 0) }, w: { u0: z0, u1: z1, t: V(0, 0, 1), n: V(-1, 0, 0) } };
    const W = (f, u, y, off = 0) => (f === 's' ? V(u, y, z1 + off) : f === 'n' ? V(u, y, z0 - off) : f === 'e' ? V(x1 + off, y, u) : V(x0 - off, y, u));
    const ryOf = (v) => Math.atan2(v.x, v.z);
    const seg = (f, a, b, y0, y1, m, inward = false) => {
      const pg = new THREE.PlaneGeometry(b - a, y1 - y0), U = pg.attributes.uv, Pp = pg.attributes.position;
      for (let i = 0; i < U.count; i++) U.setXY(i, (Pp.getX(i) + (a + b) / 2) / 24, (Pp.getY(i) + (y0 + y1) / 2) / h);
      const ms = new THREE.Mesh(pg, m); ms.position.copy(W(f, (a + b) / 2, (y0 + y1) / 2, inward ? -.3 : 0)); ms.rotation.y = ryOf(F[f].n) + (inward ? Math.PI : 0); g.add(ms); return ms;
    };
    const opens = o.open || [];
    for (const f of ['s', 'n', 'e', 'w']) {
      const op = opens.find((q) => q.f === f), { u0, u1 } = F[f];
      const parts = op ? [[u0, op.a, 0, h], [op.b, u1, 0, h], [op.a, op.b, op.h, h]] : [[u0, u1, 0, h]];
      for (const p of parts) { seg(f, p[0], p[1], p[2], p[3], fm); if (o.interior) seg(f, p[0], p[1], p[2], p[3], C.escuro, true); }
      if (op) { for (const u of [op.a, op.b]) { const q = W(f, u, op.h / 2, .1); box(g, .7, op.h, .7, C.coluna, q.x, q.y, q.z); } const q = W(f, (op.a + op.b) / 2, op.h + .4, .1); box(g, f === 's' || f === 'n' ? op.b - op.a + .7 : .7, .8, f === 's' || f === 'n' ? .7 : op.b - op.a + .7, C.coluna, q.x, q.y, q.z); }
      else { const q = W(f, (u0 + u1) / 2, .5, .13); box(g, f === 's' || f === 'n' ? u1 - u0 + .3 : .26, 1.0, f === 's' || f === 'n' ? .26 : u1 - u0 + .3, C.concreto, q.x, q.y, q.z); }
      // pilares aparentes e calha
      const nc = Math.max(2, Math.round((u1 - u0) / 7.5)); for (let i = 0; i <= nc; i++) { const q = W(f, u0 + (u1 - u0) * i / nc, h / 2, .3); box(g, .45, h, .45, C.coluna, q.x, q.y, q.z); }
    }
    for (const s of [-1, 1]) box(g, w + 1.2, .4, .4, C.coluna, cx, h - .1, cz + s * (d / 2 + .45));
    // telhado em duas águas (cumeeira ao longo de x) + oitões + lanternim
    const a = .14, rise = d / 2 * Math.tan(a), sl = d / 2 / Math.cos(a) + .9;
    for (const s of [-1, 1]) { const rg = new THREE.BoxGeometry(w + 1.2, .22, sl), U = rg.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * (w + 1.2) / 4, U.getY(i));
      const rm = new THREE.Mesh(rg, roofMat); rm.rotation.x = s * a; rm.position.set(cx, h + rise / 2 + .12, cz + s * (d / 4 + .2)); g.add(rm); }
    for (const f of ['e', 'w']) { const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, rise); sh.lineTo(-d / 2, 0);
      const tg = new THREE.ShapeGeometry(sh), U = tg.attributes.uv, Pp = tg.attributes.position; for (let i = 0; i < U.count; i++) U.setXY(i, Pp.getX(i) / 24, 1 - Pp.getY(i) / h * .3);
      const tm = new THREE.Mesh(tg, fm); tm.position.copy(W(f, cz, h, 0)); tm.rotation.y = ryOf(F[f].n); g.add(tm); }
    if (o.lantern !== false) { const lw = w * .78; box(g, lw, 1.7, 3.4, louvreMat, cx, h + rise + .75, cz); box(g, lw + .8, .22, 4.8, roofMat, cx, h + rise + 1.7, cz); }
    // portões de enrolar
    for (const gt of o.gates || []) { const q = W(gt.f, gt.u, gt.gh / 2, .06), pg = new THREE.Mesh(new THREE.PlaneGeometry(gt.gw, gt.gh), doorMat); pg.position.copy(q); pg.rotation.y = ryOf(F[gt.f].n); g.add(pg);
      for (const s of [-1, 1]) { const j = W(gt.f, gt.u + s * (gt.gw / 2 + .2), gt.gh / 2 + .3, .2); box(g, .4, gt.gh + .6, .4, C.amarelo, j.x, j.y, j.z); }
      const hd = W(gt.f, gt.u, gt.gh + .6, .35); box(g, gt.f === 's' || gt.f === 'n' ? gt.gw + .8 : .7, .9, gt.f === 's' || gt.f === 'n' ? .7 : gt.gw + .8, C.coluna, hd.x, hd.y, hd.z); }
    // escada externa em zigue-zague (lances de ~4 m, patamares nos extremos) até a cobertura
    if (o.stair) { const f = o.stair.f, us = o.stair.u, nf = Math.ceil(h / 4.2), rs = h / nf, run = rs * 1.35, wd = 1.2, t = F[f].t;
      for (let i = 0; i < nf; i++) { const even = i % 2 === 0, off = 1.0 + wd / 2 + (even ? 0 : wd + .15), st = W(f, even ? us : us + run, i * rs, off);
        stairs(g, st.x, st.y, st.z, rs, run, wd, ryOf(even ? t : t.clone().negate()), galv, C.amarelo);
        const lu = even ? us + run + .7 : us - .7, lc = W(f, lu, (i + 1) * rs, 1.0 + wd + .07), sx = f === 's' || f === 'n';
        box(g, sx ? 1.4 : 2 * wd + .15, .12, sx ? 2 * wd + .15 : 1.4, C.grade, lc.x, lc.y, lc.z);
        for (const k of [-1, 1]) { const pp = W(f, lu + .6 * (even ? 1 : -1), 0, 1.0 + wd + .07 + k * (wd + .07)); beam(g, V(pp.x, 0, pp.z), V(pp.x, (i + 1) * rs, pp.z), .14, galv); }
        const ra = W(f, lu + .7 * (even ? 1 : -1), (i + 1) * rs, 1.0), rb = W(f, lu + .7 * (even ? 1 : -1), (i + 1) * rs, 1.0 + 2 * wd + .15); railing(g, ra, rb, C.amarelo, 1.0); } }
    return { x0, x1, z0, z1, h, rise };
  }

  // ================= 5 · CONCENTRADORES =================
  // prédio recuado (x ≥ 90 → 26 m da parede leste do setor 3); moinhos DENTRO, vistos pela abertura da fachada sul
  const Cc = AREAS.conc;
  const CB = predio(116, Cc.z, 52, 30, 36, { open: [{ f: 's', a: 93, b: 115, h: 15 }], gates: [{ f: 'w', u: Cc.z + 6, gw: 7, gh: 8 }, { f: 'n', u: 132, gw: 6, gh: 7 }], stair: { f: 's', u: 121 }, interior: true });
  {
    const fl = box(g, 51, .2, 35, C.concreto, 116, .1, Cc.z); fl.receiveShadow = true;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(51.4, 35.4), C.escuro); ceil.rotation.x = Math.PI / 2; ceil.position.set(116, CB.h - .25, Cc.z); g.add(ceil);
    const millM = mat(0x2a6648, .6, .3), gearM = mat(0x3a3a38, .6, .5);
    function mill(mx, my, mz, R, Lm) {
      const sh = new THREE.Mesh(flatU(new THREE.CylinderGeometry(R, R, Lm, 40)), millM); sh.rotation.z = Math.PI / 2; sh.position.set(mx, my, mz); g.add(sh);
      for (const s of [-1, 1]) { const hd = new THREE.Mesh(flatU(new THREE.CylinderGeometry(R * .42, R, 1.4, 40)), millM); hd.rotation.z = -s * Math.PI / 2; hd.position.set(mx + s * (Lm / 2 + .7), my, mz); g.add(hd);
        const tr = new THREE.Mesh(flatU(new THREE.CylinderGeometry(R * .3, R * .3, 1.8, 24)), gearM); tr.rotation.z = Math.PI / 2; tr.position.set(mx + s * (Lm / 2 + 2.3), my, mz); g.add(tr);
        box(g, 2.4, my - R * .3, R * 1.5, C.concreto, mx + s * (Lm / 2 + 2.3), (my - R * .3) / 2, mz); }
      const gr = new THREE.Mesh(flatU(new THREE.CylinderGeometry(R + .35, R + .35, .6, 48)), gearM); gr.rotation.z = Math.PI / 2; gr.position.set(mx + Lm / 2 - 1.3, my, mz); g.add(gr);
      box(g, 1.4, 2.0, R * 2 + 1.4, C.amarelo, mx + Lm / 2 - 1.3, my - R + .4, mz);                        // proteção da coroa
      box(g, 3.2, 2.2, 2.2, C.azul, mx + Lm / 2 - 1.3, 1.3, mz + R + 2.4); box(g, 1.6, 1.4, 1.6, gearM, mx + Lm / 2 - 1.3, 1.0, mz + R + .8);   // motor + pinhão
    }
    mill(101, 5.0, Cc.z - 6, 3.0, 11); mill(101, 5.0, Cc.z + 8, 3.0, 11);
    // bateria de ciclones sobre plataforma entre os moinhos
    const cyc = V(101, 13.5, Cc.z + 1); box(g, 8, .3, 6, C.grade, cyc.x, cyc.y, cyc.z);
    for (const [sx, sz] of [[-3.6, -2.6], [3.6, -2.6], [-3.6, 2.6], [3.6, 2.6]]) beam(g, V(cyc.x + sx, 0, cyc.z + sz), V(cyc.x + sx, cyc.y, cyc.z + sz), .3, galv);
    cyl(g, .9, .9, 1.4, C.aco, cyc.x, cyc.y + .9, cyc.z, 20);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, px = cyc.x + Math.cos(a) * 2.3, pz = cyc.z + Math.sin(a) * 2.3; cyl(g, .45, .45, 1.1, steelDS, px, cyc.y + 1.6, pz, 14);
      const cn = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.45, .09, 2.2, 14)), steelDS); cn.position.set(px, cyc.y - .05, pz); g.add(cn); beam(g, V(cyc.x, cyc.y + .9, cyc.z), V(px, cyc.y + 1.6, pz), .12, C.tubo, true); }
    // ponte rolante
    for (const s of [-1, 1]) box(g, 50, .8, .5, C.coluna, 116, CB.h - 4, Cc.z + s * 16.6);
    box(g, 1.0, 1.3, 33.2, C.amarelo, 104, CB.h - 3.3, Cc.z); box(g, 1.8, 1.2, 1.8, C.amarelo, 104, CB.h - 4.4, Cc.z + 3);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) box(g, 1.2, .2, .5, lampMat, 98 + i * 10, CB.h - .6, Cc.z + s * 8);
  }
  predio(Cc.x + 6, Cc.z - 30, 30, 18, 16, { cor: '#7a7570', gates: [{ f: 'n', u: Cc.x + 6, gw: 5, gh: 6 }] });
  { // células de flotação com mecanismos, calha de espuma e passarela
    const fz = Cc.z + 26; for (let i = 0; i < 6; i++) { const fx = 118 + i * 7.2; cyl(g, 3.2, 3.2, 7, C.tanque, fx, 3.5, fz, 28); box(g, 6.6, .45, .8, C.aco, fx, 7.3, fz); cyl(g, .55, .55, 1.3, C.azul, fx, 8.2, fz, 14); }
    box(g, 43, .9, 1.0, C.aco, 136, 6.6, fz - 3.6); box(g, 43, .12, 1.4, C.grade, 136, 7.1, fz + 3.9);
    railing(g, V(114.5, 7.1, fz + 4.6), V(157.5, 7.1, fz + 4.6), C.amarelo, 1.0);
  }

  // ================= 6 · ESPESSADORES E TANQUES =================
  const Es = AREAS.esp;
  const waterT = ctex(512, 512, (x) => { const gr = x.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, '#5e4030'); gr.addColorStop(.13, '#6a4c38'); gr.addColorStop(.3, '#5f6050'); gr.addColorStop(.7, '#506466'); gr.addColorStop(1, '#4c6264'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(255,255,255,.05)'; for (let r = 40; r < 256; r += 9 + rr() * 8) { x.lineWidth = 1 + rr() * 2; x.beginPath(); x.arc(256, 256, r, 0, 6.283); x.stroke(); } });
  const waterM = new THREE.MeshStandardMaterial({ map: waterT, roughness: .12, metalness: 0 });
  function espessador(cx, cz, r, ang) {
    const H = 5.2, yD = 9.6;
    const wl = new THREE.Mesh(flatU(new THREE.CylinderGeometry(r, r + .3, H, 72, 1, true)), C.concDS); wl.position.set(cx, H / 2, cz); g.add(wl);
    const ln = new THREE.Mesh(new THREE.RingGeometry(r, r + 1.5, 72), C.concDS); ln.rotation.x = -Math.PI / 2; ln.position.set(cx, H - .35, cz); g.add(ln);
    const lip = new THREE.Mesh(flatU(new THREE.CylinderGeometry(r + 1.5, r + 1.5, 1.0, 72, 1, true)), C.concDS); lip.position.set(cx, H, cz); g.add(lip);
    const wa = new THREE.Mesh(new THREE.CircleGeometry(r - .02, 72), waterM); wa.rotation.x = -Math.PI / 2; wa.position.set(cx, H - .3, cz); g.add(wa);
    cyl(g, 1.5, 1.7, 9.4, C.concreto, cx, 4.7, cz, 24); box(g, 2.8, 1.4, 2.8, C.azul, cx, 10.1, cz); cyl(g, .45, .45, 1.2, C.azul, cx + .8, 11.4, cz + .8, 14);
    const fw = new THREE.Mesh(flatU(new THREE.CylinderGeometry(3.4, 3.4, 2.4, 40, 1, true)), steelDS); fw.position.set(cx, H - .4, cz); g.add(fw);
    // passarela fixa (centro → borda) com treliças laterais, tubo de alimentação, plataforma e escada
    const dir = V(Math.cos(ang), 0, Math.sin(ang)), lat = V(-dir.z, 0, dir.x), pA = V(cx, yD, cz).addScaledVector(dir, 1.5), pB = V(cx, yD, cz).addScaledVector(dir, r + 3);
    const wk = new THREE.Group(), Lw = pA.distanceTo(pB); wk.position.copy(pA).lerp(pB, .5); g.add(wk); wk.lookAt(pB);
    box(wk, 1.4, .1, Lw, C.grade, 0, 0, 0); const npw = Math.round(Lw / 2.4);
    for (const s of [-.75, .75]) { beam(wk, V(s, 1.1, -Lw / 2), V(s, 1.1, Lw / 2), .08, C.amarelo); beam(wk, V(s, .55, -Lw / 2), V(s, .55, Lw / 2), .05, C.amarelo); beam(wk, V(s, -.9, -Lw / 2), V(s, -.9, Lw / 2), .14, galv);
      for (let i = 0; i <= npw; i++) { const z = -Lw / 2 + Lw * i / npw; beam(wk, V(s, -.9, z), V(s, 1.1, z), .08, galv); if (i < npw) beam(wk, V(s, -.9, z), V(s, 0, z + Lw / npw), .07, galv); } }
    beam(wk, V(.45, -.55, -Lw / 2 - 1), V(.45, -.55, Lw / 2), .2, C.tubo, true);
    box(g, 2.8, .12, 2.8, C.grade, pB.x, yD, pB.z); for (const [a1, b1] of [[1.3, 1.3], [1.3, -1.3], [-1.3, 1.3], [-1.3, -1.3]]) { const pp = pB.clone().addScaledVector(dir, a1).addScaledVector(lat, b1); beam(g, V(pp.x, 0, pp.z), V(pp.x, yD, pp.z), .2, galv); }
    const run = 6.1, ryL = Math.atan2(lat.x, lat.z), s1 = pB.clone().addScaledVector(lat, 1.4).addScaledVector(dir, 1.45 + .7);
    stairs(g, s1.x, 0, s1.z, yD / 2, run, 1.2, ryL, galv, C.amarelo);
    const s2 = pB.clone().addScaledVector(lat, 1.4 + run).addScaledVector(dir, .7 - .7); stairs(g, s2.x, yD / 2, s2.z, yD / 2, run, 1.2, ryL + Math.PI, galv, C.amarelo);
    const lnd = pB.clone().addScaledVector(lat, 1.4 + run + .7).addScaledVector(dir, .7); box(g, 1.4, .12, 2.8, C.grade, lnd.x, yD / 2, lnd.z);
    for (const k of [-1.3, 1.3]) { const pp = lnd.clone().addScaledVector(dir, k); beam(g, V(pp.x, 0, pp.z), V(pp.x, yD / 2, pp.z), .14, galv); }
    // ponte de raspagem giratória (tração periférica): treliça amarela centro → borda com carro de rodas sobre o muro
    const rot = new THREE.Group(); rot.position.set(cx, 0, cz); rot.userData.dyn = true; g.add(rot);
    for (const s of [-.7, .7]) { beam(rot, V(1.8, 6.9, s), V(r + .3, 6.9, s), .12, C.amarelo); beam(rot, V(1.8, 5.9, s), V(r + .3, 5.9, s), .14, C.amarelo);
      const nr = Math.round(r / 2.2); for (let i = 0; i <= nr; i++) { const xx = 1.8 + (r - 1.5) * i / nr; beam(rot, V(xx, 5.9, s), V(xx, 6.9, s), .08, C.amarelo); if (i < nr) beam(rot, V(xx, 5.9, s), V(xx + (r - 1.5) / nr, 6.9, s), .07, C.amarelo); } }
    box(rot, r - 1.5, .08, 1.3, C.grade, (r + 1.8) / 2 + .15, 5.95, 0); box(rot, 1.6, 1.0, 2.2, C.amarelo, r + .2, H + .55, 0); box(rot, .9, .8, .9, C.azul, r - .6, 6.5, 1.1);
    cyl(rot, 2.1, 2.1, .5, C.aco, 0, 6.2, 0, 24); beam(rot, V(1.8, 5.2, 0), V(r - .5, 4.95, 0), .25, C.aco);
    anim.push({ rot, v: .025 * (ang > 0 ? 1 : -1) });
  }
  espessador(Es.x, Es.z, 22, -Math.PI / 2); espessador(Es.x + 52, Es.z + 6, 18, Math.PI * .75);
  for (let i = 0; i < 4; i++) { const tx = Es.x - 14 + i * 18, tz = Es.z + 40;
    cyl(g, 7, 7, 16, C.tanque, tx, 8, tz, 40); addOcc(tx, 8, tz, 10, 16, 10);
    const rf = new THREE.Mesh(flatU(new THREE.CylinderGeometry(.8, 7.25, 1.5, 40)), C.tanque); rf.position.set(tx, 16.75, tz); g.add(rf);
    for (let k = 0; k < 12; k++) { const a1 = k / 12 * 6.283, a2 = (k + 1) / 12 * 6.283; railing(g, V(tx + Math.cos(a1) * 6.8, 16.1, tz + Math.sin(a1) * 6.8), V(tx + Math.cos(a2) * 6.8, 16.1, tz + Math.sin(a2) * 6.8), C.amarelo, 1.0); }
    for (const s of [-.3, .3]) beam(g, V(tx + s, 0, tz + 7.2), V(tx + s, 16.2, tz + 7.2), .06, galv); for (let y = .4; y < 16; y += .35) box(g, .6, .05, .05, galv, tx, y, tz + 7.2);
    for (let y = 2.4; y < 16; y += 1.4) { const hp = new THREE.Mesh(new THREE.TorusGeometry(.45, .03, 4, 12, Math.PI), galv); hp.rotation.x = Math.PI / 2; hp.position.set(tx, y, tz + 7.2); g.add(hp); }
  }

  // ================= 10 · BOMBAS · 7 · FILTRAGEM · moega =================
  const Bo = AREAS.bombas; predio(Bo.x, Bo.z, 34, 12, 20, { cor: '#7a7570', gates: [{ f: 'n', u: Bo.x - 6, gw: 6, gh: 6 }], stair: { f: 's', u: Bo.x - 14 } });
  for (const dz of [-3, 0, 3]) beam(g, V(Bo.x + 17, 1, Bo.z + dz), V(Bo.x + 230, 1, Bo.z + dz - 40), .5, C.tubo, true);   // minerodutos saindo
  const Sf = AREAS.sf; predio(Sf.x, Sf.z, 30, 16, 22, { gates: [{ f: 'n', u: Sf.x - 6, gw: 6, gh: 7 }], stair: { f: 'e', u: Sf.z - 8 } });
  const ar = new THREE.Mesh(pileGeo(16, 9, 11, { base: [.36, .28, .18], dark: [.27, .2, .13], wet: [.22, .17, .11] }), pileMat()); ar.position.set(Sf.x + 30, 0, Sf.z + 4); g.add(ar);
  predio(A.x + 38, A.z + 28, 12, 9, 10, { cor: '#7a7570', lantern: false, gates: [{ f: 'w', u: A.z + 28, gw: 5, gh: 5 }] });

  // ================= ESTRADAS =================
  // cascalho compactado com 4 trilhas de pneu, bordas de material solto e leiras laterais
  const roadT = ctex(256, 1024, (x, w, h) => { x.fillStyle = '#8e7866'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = rr(); x.fillStyle = v < .5 ? 'rgba(70,48,36,.35)' : 'rgba(190,170,150,.35)'; x.fillRect(rr() * w, rr() * h, 1 + rr() * 2, 1 + rr() * 2); }
    for (const [k, u] of [[0, .2], [1, .34], [2, .66], [3, .8]]) for (let y = 0; y < h; y += 2) { const off = Math.sin(y * .012 + k) * 4 + Math.sin(y * .05 + k * 3); x.fillStyle = `rgba(62,44,34,${.16 + rr() * .1})`; x.fillRect(u * w - 9 + off, y, 18, 2); x.fillStyle = 'rgba(40,28,22,.1)'; x.fillRect(u * w - 9 + off + (y % 8 < 4 ? 2 : 10), y, 4, 2); }
    for (const s of [0, 1]) { const gr = x.createLinearGradient(s ? w : 0, 0, s ? w - 26 : 26, 0); gr.addColorStop(0, 'rgba(110,64,42,.75)'); gr.addColorStop(1, 'rgba(110,64,42,0)'); x.fillStyle = gr; x.fillRect(s ? w - 26 : 0, 0, 26, h); } });
  const roadM = new THREE.MeshStandardMaterial({ map: roadT, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ROADS = [[[-20, -30], [94, -12]], [[84, -13.6], [84, 48]], [[84, 48], [98, 96]], [[84, 48], [150, 90]], [[94, -12], [100, -34]], [[100, -34], [190, -40]],
    [[A.x + Math.cos(thExit) * 44, A.z + Math.sin(thExit) * 44], [A.x + Math.cos(thExit) * 44 + 2, -26.4]]];
  const leiraG = new THREE.CylinderGeometry(.9, .9, 1, 3); leiraG.rotateX(-Math.PI / 2); leiraG.scale(1, .55, 1);
  for (const [a, b] of ROADS) {
    const pa = V(a[0], .02, a[1]), pb = V(b[0], .02, b[1]), L = pa.distanceTo(pb), rg = new THREE.Group(); rg.position.copy(pa).lerp(pb, .5); g.add(rg); rg.lookAt(pb);
    const pg = new THREE.PlaneGeometry(9, L + 4), U = pg.attributes.uv; for (let i = 0; i < U.count; i++) U.setY(i, U.getY(i) * (L + 4) / 40);
    const rm = new THREE.Mesh(pg, roadM); rm.rotation.x = -Math.PI / 2; rm.receiveShadow = true; rg.add(rm);
    if (L > 24) for (const s of [-1, 1]) { const lm = new THREE.Mesh(leiraG, C.leira); lm.scale.z = L - 18; lm.position.set(s * 5.3, .22, 0); rg.add(lm); }
  }
  // ligações de processo entre as áreas (tubulações de polpa)
  beam(g, V(CB.x1, 2, Cc.z + 10), V(Es.x - 22, 2, Es.z), .6, C.tubo, true);
  beam(g, V(Es.x + 30, 2, Es.z + 6), V(Bo.x - 17, 2, Bo.z), .6, C.tubo, true);
  beam(g, V(Cc.x - 18, 2, CB.z1), V(Sf.x, 2, Sf.z - 11), .5, C.tubo, true);

  // ================= VEGETAÇÃO (instanciada) =================
  // capim em touceiras nas manchas de capim, arbustos e árvores de cerrado esparsas, eucaliptos em talhões nos morros
  {
    const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
    const RECTS = [[-25, 89, -25, 49], [86, 146, -8, 36], [99, 137, -28, -4], [110, 162, 33, 47], [169, 211, -34, -6], [51, 89, 97, 127], [32, 52, -61, -43], [60, 72, 55, 69], [137, 209, 89, 111], [70, 120, 25, 70]];
    const CIRC = [[A.x, A.z, PR + 8], [P.x, P.z, 34], [A.x + 52, A.z + 8, 18], [Es.x, Es.z, 30], [Es.x + 52, Es.z + 6, 26], [Sf.x + 30, Sf.z + 4, 20]];
    const LINES = [...ROADS.map((r) => [r[0], r[1], 8]), [[A.x + 44, A.z + 30], [B.screenEnd + 20, -30], 5], [[P.x, P.z + 44], [Cc.x - 22, Cc.z + 10], 5], [[B.W + 6, 32], [65, 60], 5], [[Bo.x + 17, Bo.z], [Bo.x + 230, Bo.z - 40], 4]];
    const free = (x, z) => { for (const r of RECTS) if (x > r[0] - 4 && x < r[1] + 4 && z > r[2] - 4 && z < r[3] + 4) return false;
      for (const c of CIRC) if (Math.hypot(x - c[0], z - c[1]) < c[2]) return false; for (const l of LINES) if (segD(x, z, l[0], l[1]) < l[2]) return false; return true; };
    const yAt = (x, z) => { const r = Math.hypot(x - GC.x, z - GC.z); return r > GR ? hillH(r, Math.atan2(z - GC.z, x - GC.x)) : 0; };
    const vegM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 });
    const I4 = new THREE.Matrix4();
    const kinds = {
      capim: colGeo([[new THREE.CylinderGeometry(.001, .32, .6, 5), '#ffffff', TRS(0, .28, 0)], [new THREE.CylinderGeometry(.001, .22, .45, 5), '#ffffff', TRS(.25, .2, .1)], [new THREE.CylinderGeometry(.001, .2, .5, 5), '#ffffff', TRS(-.15, .22, -.2)]]),
      arbusto: colGeo([[new THREE.IcosahedronGeometry(1, 0), '#5c6b3a', TRS(0, .4, 0, 1.1, .65, 1.0)], [new THREE.IcosahedronGeometry(.7, 0), '#6b7a44', TRS(.6, .55, .3, 1, .7, 1)]]),
      cerrado: colGeo([[new THREE.CylinderGeometry(.13, .22, 3.2, 5), '#5a4434', TRS(0, 1.6, 0)], [new THREE.CylinderGeometry(.07, .1, 1.6, 4), '#5a4434', TRS(.45, 3.0, 0).multiply(new THREE.Matrix4().makeRotationZ(-.5))],
        [new THREE.IcosahedronGeometry(1.7, 0), '#4d6a33', TRS(0, 3.8, 0, 1.25, .62, 1.15)], [new THREE.IcosahedronGeometry(1.2, 0), '#5e7b3c', TRS(.9, 4.2, .4, 1.1, .6, 1.1)]]),
      eucalipto: colGeo([[new THREE.CylinderGeometry(.14, .26, 11, 5), '#b9ad9a', TRS(0, 5.5, 0)], [new THREE.IcosahedronGeometry(1.9, 0), '#54704a', TRS(0, 10.8, 0, 1, 1.7, 1)], [new THREE.IcosahedronGeometry(1.3, 0), '#62805a', TRS(.3, 13.4, -.2, 1, 1.5, 1)]]),
    };
    void I4;
    const K = HIGH ? 1 : .45, q4 = new THREE.Quaternion(), sc = new THREE.Vector3(), pp = new THREE.Vector3(), m4 = new THREE.Matrix4(), cc = new THREE.Color();
    function scatter(geo, n, pick, colFn, sMin, sMax) {
      const im = new THREE.InstancedMesh(geo, vegM, n); let k = 0, guard = 0;
      while (k < n && guard++ < n * 40) { const p = pick(); if (!p || !free(p[0], p[1])) continue; const s = sMin + rr() * (sMax - sMin);
        pp.set(p[0], yAt(p[0], p[1]) - .05, p[1]); q4.setFromAxisAngle(V(0, 1, 0), rr() * 6.283); sc.set(s * (.85 + rr() * .3), s, s * (.85 + rr() * .3)); im.setMatrixAt(k, m4.compose(pp, q4, sc)); im.setColorAt(k, colFn(cc, p)); k++; }
      im.count = k; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; g.add(im); return im;
    }
    const ring = (r0, r1) => () => { const a = rr() * 6.283, r = Math.sqrt(r0 * r0 + rr() * (r1 * r1 - r0 * r0)); return [GC.x + Math.cos(a) * r, GC.z + Math.sin(a) * r]; };
    const pickGrass = () => { const p = ring(20, GR - 2)(); return rr() < .25 + grassMask(p[0], p[1]) * 1.1 ? p : null; };
    scatter(kinds.capim, Math.round(3200 * K), pickGrass, (c) => c.setRGB(.42 + rr() * .2, .38 + rr() * .14, .16 + rr() * .06).convertSRGBToLinear(), .8, 1.6);
    scatter(kinds.arbusto, Math.round(700 * K), ring(40, GR + 40), (c) => c.setScalar(.8 + rr() * .4), .7, 1.8);
    scatter(kinds.cerrado, Math.round(260 * K), ring(110, GR - 4), (c) => c.setRGB(.85 + rr() * .3, .85 + rr() * .3, .8 + rr() * .2), .8, 1.4);
    scatter(kinds.cerrado, Math.round(320 * K), ring(GR + 6, 300), (c) => c.setRGB(.8 + rr() * .3, .85 + rr() * .3, .8 + rr() * .2), 1.0, 1.6);
    const CL = [...Array(7)].map((_, i) => { const a = i / 7 * 6.283 + .4 + rr() * .5, r = 268 + rr() * 26; /* talhões perto o bastante para não flutuarem na névoa do horizonte */ return [GC.x + Math.cos(a) * r, GC.z + Math.sin(a) * r]; });
    scatter(kinds.eucalipto, Math.round(300 * K), () => { const c = CL[Math.floor(rr() * CL.length)]; return [c[0] + (rr() - .5) * 46, c[1] + (rr() - .5) * 46]; }, (c) => c.setScalar(.85 + rr() * .3), .8, 1.25);
  }

  // etiquetas numeradas das áreas (mesmo padrão da página principal)
  for (const a of Object.values(AREAS)) labels.push({ pos: V(a.x, a === AREAS.mina ? 8 : a === AREAS.pilha ? 27 : 34, a.z), kind: 'area', text: () => `${a.n} · ${a.nome}` });

  // sombras: só o que fica perto do setor 3 (dentro do mapa de sombra do sol) projeta; geometria com cor por vértice não é fundida
  g.updateMatrixWorld(true); const ctr = V(32, 0, 12), bs = new THREE.Sphere();
  g.traverse((o) => { if (!o.isMesh) return; o.receiveShadow = true; if (o.geometry.attributes.color) o.userData.keep = true;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); if (bs.center.distanceTo(ctr) > 80 || o.isInstancedMesh) o.castShadow = o.castShadow && !o.isInstancedMesh && bs.center.distanceTo(ctr) <= 80; });
  pile.castShadow = true;
  const stats = mergeStatic(g); console.log('entorno: malhas fundidas', stats);

  let t = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), p2 = new THREE.Vector3(), eu = new THREE.Euler();
  const rampPos = (u, lane, out) => { const uc = Math.max(U0, Math.min(1, u)), r = rampR(uc) + lane, th = TH0 + uc * TT; return out.set(A.x + Math.cos(th) * r, rampY(uc) + .05, A.z + Math.sin(th) * r); };
  return {
    group: g, labels, occ,
    update(dt) {
      t += dt;
      for (const a of anim) {
        if (a.truck) { const ph = ((t * a.sp + a.ph) % 2 + 2) % 2, down = ph < 1, u = U0 + (1 - U0) * (down ? ph : 2 - ph), lane = down ? -1.9 : 1.9;
          rampPos(u, lane, p); rampPos(u + (down ? .004 : -.004), lane, p2); a.truck.position.copy(p); a.truck.lookAt(p2); a.load.visible = !down; }
        else if (a.belt) { for (let i = 0; i < a.n; i++) { const z = ((i / a.n * a.L + t * 2.2 + a.off) % a.L) - a.L / 2; m4.makeTranslation(((i * 37) % 10 / 10 - .5) * a.w * .5, .35, z); a.belt.setMatrixAt(i, m4); } a.belt.instanceMatrix.needsUpdate = true; }
        else if (a.stream) { const { E, vh, T, n } = a; for (let i = 0; i < n; i++) { const u = (i / n + t * 1.15 + hsh(i) * .37) % 1, tt = u * T, ox = (hsh(i * 3.1) - .5) * .9 * tt, oz = (hsh(i * 5.7) - .5) * 1.1 * tt;
          p.set(E.x + vh.x * tt + ox, E.y + vh.y * tt - 4.9 * tt * tt, E.z + vh.z * tt + oz); q.setFromEuler(eu.set(i + t * 3, i * .37, 0)); s1.setScalar(.6 + hsh(i * 9.3) * .9); a.stream.setMatrixAt(i, m4.compose(p, q, s1)); }
          s1.set(1, 1, 1); a.stream.instanceMatrix.needsUpdate = true; }
        else if (a.rot) a.rot.rotation.y += dt * a.v;
        else if (a.exc) a.exc.rotation.y = a.r0 + .7 * Math.sin(t * .35);
      }
    },
  };
}
