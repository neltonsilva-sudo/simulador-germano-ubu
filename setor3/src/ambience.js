// Som ambiente espacial do setor 3 (sintetizado com Web Audio, nada é baixado).
// Fontes posicionadas em 3D (PannerNode; HRTF nas máquinas principais) e ouvinte preso à câmera:
// britadores cônicos HP 400 (ronco grave da excêntrica + esmagamento), Barmac VSI (rotor que "assobia" e cascata de pedra),
// peneiras banana (batida ritmada dos vibradores + chiado das pedras nos decks), correias (rolos, tambores e minério),
// quedas de minério nos chutes, motores elétricos, ar do galpão, vento do lado de fora e um fundo distante da usina.
// Tudo segue a simulação: equipamento desligado fica em silêncio (o rotor do Barmac desacelera aos poucos), carga e vazão
// mudam a intensidade. Eventos: buzina de partida sequencial, pedra batendo no chute, ar de limpeza, ré de caminhão ao longe.
// Modo caminhar: passos (concreto com minério no térreo e no +7,5; grade metálica no +14).
// Política dos navegadores: o áudio só nasce no primeiro clique/toque/tecla. Liga/desliga: window.__s3som(true|false),
// sem argumento alterna; preferência guardada em localStorage 's3som'; ?som=0 começa desligado. Evento 's3som' no document.
import { LV, B, SCREENS, CRUSHERS } from './layout.js?v=20261025151330';

export const SR = 22050;                                   // texturas em 22 kHz (economia; o contexto reamostra)
const TAU = Math.PI * 2;

// ================= SÍNTESE (funções puras sobre Float32Array; laços contínuos sem emenda) =================
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const white = (n, r) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = r() * 2 - 1; return o; };
// biquad RBJ; circ = filtra duas vezes e guarda a 2ª passada (estado do fim vira o do começo → laço sem estalo)
function filt(x, type, f, Q = .707, circ = true, sr = SR) {
  const w = TAU * Math.min(f, sr * .45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q); let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al, a1 = -2 * c / a0, a2 = (1 - al) / a0; b0 /= a0; b1 /= a0; b2 /= a0;
  const n = x.length, o = new Float32Array(n); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let p = circ ? 0 : 1; p < 2; p++) for (let i = 0; i < n; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; if (p) o[i] = y; }
  return o;
}
function brown(n, r) { const w = white(n, r), o = new Float32Array(n); let y = 0; for (let p = 0; p < 2; p++) for (let i = 0; i < n; i++) { y = y * .995 + w[i] * .05; if (p) o[i] = y; } return o; }
function pink(n, r) { const w = white(n, r), o = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0;
  for (let p = 0; p < 2; p++) for (let i = 0; i < n; i++) { const v = w[i]; b0 = .99765 * b0 + v * .099046; b1 = .963 * b1 + v * .2965164; b2 = .57 * b2 + v * 1.0526913; if (p) o[i] = b0 + b1 + b2 + v * .1848; } return o; }
export const rms = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); };
const norm = (x, t = 1) => { const k = t / (rms(x) || 1); for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
// picos de impacto domados (fator de crista ≤ ~3,5): evita estalos e saturação quando várias fontes somam
const tame = (x, c = 3.5) => { norm(x); for (let i = 0; i < x.length; i++) x[i] = c * Math.tanh(x[i] / c); return norm(x); };
const mix = (n, parts) => { const o = new Float32Array(n); for (const [x, g] of parts) for (let i = 0; i < n; i++) o[i] += x[i] * g; return o; };
const mod = (x, fn) => { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR); return x; };
// trem de impactos (pedra em chapa/pedra): taxa por segundo (pode variar no tempo), duração e amplitude de cauda pesada; volta ao início (laço)
function impacts(n, r, rate, d0, d1, ex = 2.2, wrap = true) {
  const o = new Float32Array(n); let t = 0;
  while (true) { const rt = typeof rate === 'function' ? rate(t) : rate; t += -Math.log(1 - r() * .999) / Math.max(rt, 1e-3); const i0 = Math.round(t * SR); if (i0 >= n) break;
    const L = Math.max(4, Math.round((d0 + (d1 - d0) * r()) * SR)), a = Math.pow(r(), ex) * (r() < .5 ? -1 : 1), k = 5 / L;
    for (let j = 0; j < L; j++) { let q = i0 + j; if (q >= n) { if (!wrap) break; q -= n; } o[q] += a * (r() * 2 - 1) * Math.exp(-j * k); } }
  return o;
}
const sines = (n, list) => { const o = new Float32Array(n); for (const [f, a, ph = 0] of list) for (let i = 0; i < n; i++) o[i] += a * Math.sin(TAU * f * i / SR + ph); return o; };

// laços de 4 s: todas as frequências de modulação/tom com nº inteiro de ciclos em 4 s (múltiplos de 0,25 Hz)
const N4 = SR * 4;
export const RECIPES = {
  // motor elétrico (60 Hz → zumbido magnético 120 Hz e harmônicos) + ventoinha do motor (1770 rpm)
  hum(r) { const n = N4; const fan = norm(filt(white(n, r), 'bp', 1100, .8)); mod(fan, (t) => 1 + .25 * Math.sin(TAU * 29.5 * t));
    return norm(mix(n, [[sines(n, [[120, .9], [240, .4, 1], [360, .18, 2], [720, .06, .5]]), 1], [fan, .25]])); },
  // HP 400 em vazio: excêntrica girando (≈5,5 Hz), contraeixo, engrenamento coroa/pinhão
  coneIdle(r) { const n = N4; const b = norm(filt(brown(n, r), 'lp', 150)); mod(b, (t) => 1 + .35 * Math.sin(TAU * 5.5 * t) + .15 * Math.sin(TAU * 16.75 * t));
    const mid = norm(filt(white(n, r), 'bp', 420, 1.2)); mod(mid, (t) => 1 + .5 * Math.sin(TAU * 5.5 * t + 1));
    return norm(mix(n, [[b, 1], [mid, .32], [sines(n, [[351.75, .3], [703.5, .12, 1]]), 1]])); },
  // HP 400 britando: moagem grave pulsando com a excêntrica + estalos de pedra sob compressão
  coneLoad(r) { const n = N4; const g = norm(filt(brown(n, r), 'lp', 110)); mod(g, (t) => 1 + .6 * Math.sin(TAU * 5.5 * t));
    const c = impacts(n, r, (t) => 70 * (1 + .8 * Math.sin(TAU * 5.5 * t)), .003, .03); const c1 = norm(filt(c, 'lp', 1800)), c2 = norm(filt(c, 'bp', 250, .9));
    return norm(mix(n, [[g, 1], [c1, .55], [c2, .6]])); },
  // Barmac: rotor a 1450 rpm (24,25 Hz; 3 janelas → 72,75 Hz), ar sendo jogado (rugido) e tom do rotor
  vsiRoar(r) { const n = N4, w = white(n, r); const ro = norm(filt(w, 'bp', 520, .6)); mod(ro, (t) => 1 + .45 * Math.sin(TAU * 72.75 * t));
    const wh = norm(filt(w, 'lp', 260)); mod(wh, (t) => 1 + .3 * Math.sin(TAU * 24.25 * t));
    const tone = norm(filt(sines(n, [1, 2, 3, 4, 5, 6].map((k) => [72.75 * k, 1 / k, k])), 'lp', 600));
    return norm(mix(n, [[ro, 1], [wh, .7], [tone, .3]])); },
  // Barmac com carga: pedra contra pedra na câmara (cascata densa e seca)
  vsiRock(r) { const n = N4; const c = impacts(n, r, 900, .0006, .003, 2.6); mod(c, (t) => 1 + .2 * Math.sin(TAU * 24.25 * t));
    return norm(mix(n, [[norm(filt(c, 'bp', 1900, .7)), 1], [norm(filt(c, 'bp', 600, .8)), .6]])); },
  // peneira banana: vibradores a 945 rpm (15,75 Hz) → batida ritmada; batimento lento entre os dois vibradores (0,5 Hz)
  screenMech(r) { const n = N4, f = 15.75; const pulse = (t) => Math.pow(.5 + .5 * Math.cos(TAU * f * t), 3);
    const thr = norm(filt(brown(n, r), 'lp', 140)); mod(thr, (t) => (.35 + pulse(t)) * (1 + .25 * Math.sin(TAU * .5 * t)));
    const th = norm(filt(white(n, r), 'bp', 220, 1)); mod(th, pulse);
    return norm(mix(n, [[thr, 1], [th, .45], [sines(n, [[31.5, .35], [63, .2, 1]]), 1]])); },
  // pedras saltando nos decks: impactos concentrados na fase de pouso de cada ciclo
  screenRattle(r) { const n = N4, f = 15.75; const c = impacts(n, r, (t) => 500 * (((t * f) % 1) < .35 ? 2.2 : .35), .0005, .004, 2.2);
    mod(c, (t) => 1 + .2 * Math.sin(TAU * .5 * t + 2));
    return norm(mix(n, [[norm(filt(c, 'bp', 1400, .6)), 1], [norm(filt(c, 'bp', 3200, .9)), .4], [norm(filt(c, 'lp', 500)), .3]])); },
  // correia andando: rolos e tambores (zumbido grave), rolamentos, emenda passando sobre os roletes (3 batidas em 4 s)
  belt(r) { const n = N4; const p = pink(n, r); const lo = norm(filt(p, 'lp', 500)), bd = norm(filt(p, 'bp', 170, 2));
    const id = sines(n, [[97, .25], [131.5, .18, 1], [168.25, .14, 2]]); mod(id, (t) => .6 + .4 * Math.sin(TAU * .25 * t));
    const ck = new Float32Array(n); for (const t0 of [0, 4 / 3, 8 / 3]) { const i0 = Math.round(t0 * SR); for (let j = 0; j < SR * .06; j++) ck[(i0 + j) % n] += (r() * 2 - 1) * Math.exp(-j / (SR * .012)); }
    return norm(mix(n, [[lo, 1], [bd, .5], [id, 1], [norm(filt(ck, 'lp', 320)), .35]])); },
  // minério caindo/escorrendo (chutes, carga sobre a correia): granulado + baques graves
  trickle(r) { const n = N4; const c = impacts(n, r, 260, .002, .015, 1.6), th = impacts(n, r, 3, .02, .06, 1.2);
    return norm(mix(n, [[norm(filt(c, 'lp', 3000)), 1], [norm(filt(c, 'bp', 350, .7)), .5], [norm(filt(th, 'lp', 220)), .8]])); },
};
// estéreo (sem posição): ar do galpão e vento
export const STEREO = {
  hall(r) { const n = SR * 6; return [0, 1].map(() => norm(mix(n, [[norm(filt(pink(n, r), 'lp', 900)), 1], [norm(filt(brown(n, r), 'lp', 70)), .5]]))); },
  wind(r) { const n = SR * 8; return [0, 1.3].map((ph) => { const gust = (t) => 1 + .5 * Math.sin(TAU * .125 * t + ph) + .2 * Math.sin(TAU * .375 * t + ph * 2);
    const a = norm(filt(pink(n, r), 'bp', 380, .5)); mod(a, gust); const h = norm(filt(white(n, r), 'hp', 2500)); mod(h, (t) => gust(t) * gust(t) * .5);
    return norm(mix(n, [[a, 1], [h, .12]])); }); },
};
// sons curtos (não fazem laço)
export const ONESHOT = {
  crunch(r) { const n = Math.round(SR * .4); const c = impacts(n, r, 110, .002, .02, 1.4, false); mod(c, (t) => Math.exp(-t / .12));
    return norm(mix(n, [[norm(filt(c, 'lp', 2500, .707, false)), 1], [norm(filt(c, 'bp', 200, .9, false)), .8]]), .5); },
  clank(r) { const n = Math.round(SR * 1.4), o = new Float32Array(n);
    const M = [[310, .9, 1], [742, .6, .7], [1287, .4, .5], [2133, .25, .35], [3011, .15, .2]].map(([f, d, a]) => [f * (.94 + r() * .12), d, a]);
    for (let i = 0; i < n; i++) { const t = i / SR; for (const [f, d, a] of M) o[i] += a * Math.sin(TAU * f * t) * Math.exp(-t / d * 3); if (t < .012) o[i] += (r() * 2 - 1) * (1 - t / .012) * 1.5; }
    return norm(o, .35); },
  step(r, metal) { const n = Math.round(SR * (metal ? .45 : .3)), o = new Float32Array(n), f0 = 80 + r() * 30;
    const grit = filt(impacts(n, r, metal ? 120 : 400, .0005, .003, 1.8, false), 'bp', 2800, .7, false);
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(TAU * f0 * t) * Math.exp(-t / .025) * 1.2 + (r() * 2 - 1) * Math.exp(-t / .012) * .5 + grit[i] * Math.exp(-t / .06) * (metal ? 1.5 : 3);
      if (metal) for (const [f, d] of [[520, .14], [1240, .1], [2380, .07]]) o[i] += .35 * Math.sin(TAU * f * (1 + r() * .002) * t) * Math.exp(-t / d); }
    return norm(filt(o, 'lp', metal ? 6000 : 4000, .707, false), .25); },
  beep() { const n = Math.round(SR * 1.1), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; if (t > .5) break; const e = Math.min(1, t / .006, (.5 - t) / .006);
    for (let k = 1; k <= 7; k += 2) o[i] += Math.sin(TAU * 1050 * k * t) / k * e; } return norm(o, .3); },
  horn() { const n = Math.round(SR * 3.6), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR, ph = t % 1.2; if (ph > .9) continue; const e = Math.min(1, ph / .04, (.9 - ph) / .06), f = 380 * (1 + .004 * Math.sin(TAU * 6 * t));
    for (let k = 1; k <= 8; k++) o[i] += Math.sin(TAU * f * k * t) / k * e; } return norm(filt(o, 'lp', 2200, .707, false), .3); },
  hiss(r) { const n = Math.round(SR * 1.6); const h = filt(white(n, r), 'hp', 2000, .707, false); mod(h, (t) => Math.min(1, t / .05, (1.6 - t) / .45)); return norm(h, .3); },
};
// resposta ao impulso do galpão metálico (RT60 ≈ 2,3 s; cauda escurece com o tempo; primeiras reflexões)
export function hallIR(sr, len = 2.4, r = rng(91)) {
  const n = Math.round(sr * len), ch = [0, 1].map(() => new Float32Array(n)), pre = Math.round(sr * .012), tau = len / 6.9 * 1.0;
  for (const o of ch) { let y = 0; for (let i = pre; i < n; i++) { const t = (i - pre) / sr, a = .85 * Math.exp(-t / .45) + .08; y += a * ((r() * 2 - 1) - y); o[i] = y * Math.exp(-t / tau); }
    for (const [d, g] of [[.019, .5], [.031, -.4], [.047, .33], [.066, -.25], [.083, .2]]) { const i = Math.round((d + r() * .006) * sr); if (i < n) o[i] += g; } }
  const k = 1 / Math.max(rms(ch[0]), rms(ch[1])) * .02; for (const o of ch) for (let i = 0; i < n; i++) o[i] *= k;
  return ch;
}

// ================= LÓGICA DE NÍVEIS (pura: testável em node) =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (cur, tgt, dt, up, dn) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : dn)));
const BELT_TAG = { F: '03TC006', T: '03TC001', R1: '03TC002', R2: '03TC003', P: '03TC005', RET: '03TC004' };
export function beltFlow(key, K) { K = K || {}; const T = K.T || 0;
  return key === 'F' ? K.F || 0 : key === 'T' ? T : key === 'R1' ? T * (K.r1 || 0) : key === 'R2' ? T * (K.r2 || 0) : key === 'P' ? K.prod || 0 : Math.max(0, T - (K.F || 0)); }
// estado suavizado da fonte (spin = rotação 0–1, ld = carga) → ganhos por camada e velocidade de reprodução
export function levels(s, S, dt) {
  const E = (S && S.eq) || {}, K = (S && S.kpi) || {}, BL = (S && S.belts) || {}, out = s.out || (s.out = { g: [], rate: [], bright: 1 });
  if (s.kind === 'cone' || s.kind === 'vsi' || s.kind === 'screen') {
    const e = E[s.tag] || {}, run = !!e.on && !e.mnt;
    const coast = s.kind === 'vsi' && !run && e.coast > 0, tgt = run ? 1 : coast ? Math.min(1, e.coast / 25) : 0;   // rotor girando livre ~25 s até parar
    s.spin = smooth(s.spin || 0, tgt, dt, s.kind === 'vsi' ? 9 : s.kind === 'cone' ? 4 : 1.5, coast ? .6 : s.kind === 'vsi' ? 3 : s.kind === 'cone' ? 6 : 2);
    if (s.spin < .002 && !tgt) s.spin = 0;
    s.ld = smooth(s.ld || 0, run && e.flow > 0 ? clamp(e.load || 0, 0, 1.5) : 0, dt, 1.2, .8);
    const sp = s.spin, L = Math.sqrt(s.ld), over = Math.max(0, (e.load || 0) - 1.05);
    if (s.kind === 'cone') { out.g = [sp * .05, sp * .12, sp * L * .22 * (1 + over * 1.5)]; out.rate = [1, .82 + .18 * sp - over * .05, 1 - over * .06]; out.bright = .45 + .55 * sp; }
    else if (s.kind === 'vsi') { const rp = clamp((S && S.rpm) || 1450, 900, 2100) / 1450; out.g = [sp * .04, Math.pow(sp, 1.3) * .16 * rp, sp * L * .14]; out.rate = [1, rp * (.3 + .7 * sp), .9 + .1 * sp * rp]; out.bright = .35 + .65 * sp; }
    else { const vb = clamp(((e.vib || 2.6) - 2.6) / 8, 0, 1); out.g = [sp * .09 * (1 + vb), sp * L * .1, sp * L * .07]; out.rate = [.9 + .1 * sp, .97 + .03 * sp, .9]; out.bright = .5 + .5 * sp; }
  } else if (s.kind === 'belt') {
    const b = BL[BELT_TAG[s.key]] || { on: true, spd: 100 }, run = b.on || b.spd > 0;
    s.spin = smooth(s.spin || 0, run ? clamp((b.spd ?? 100) / 100, 0, 1) : 0, dt, .4, .6);
    const q = beltFlow(s.key, K); s.ld = smooth(s.ld || 0, s.spin > .05 ? clamp(q / 2500, 0, 1.6) : 0, dt, 1, 1);
    out.g = [s.spin * .045, s.spin * Math.sqrt(s.ld) * .04, s.spin * .012]; out.rate = [.85 + .15 * s.spin, .85, 1]; out.bright = .6 + .4 * s.spin;
  } else if (s.kind === 'chute') {
    const q = beltFlow(s.key, K) * (s.share || 1); s.ld = smooth(s.ld || 0, clamp(q / 2500, 0, 1.6), dt, .8, .5);
    out.g = [Math.sqrt(s.ld) * .11]; out.rate = [s.rate || .8]; out.bright = 1;
  } else if (s.kind === 'far') {
    const act = K.F > 0 ? 1 : .35; s.ld = smooth(s.ld || 0, act, dt, 3, 3); out.g = [s.ld * (s.gain || .2)]; out.rate = [s.rate || .5]; out.bright = 1;
  }
  return out;
}
// oclusão simples pelos pisos do prédio: quantas lajes entre o ouvinte e a fonte (só com os dois dentro do prédio)
export const lvOf = (y) => (y < LV.L1 - .3 ? 0 : y < LV.L2 - .3 ? 1 : 2);
export const insideB = (x, y, z, m = 0) => x > -m && x < B.W + m && z > -m && z < B.D + m && y < B.H;
export function occlusion(L, P) {
  const li = insideB(L.x, L.y, L.z), si = insideB(P.x, P.y, P.z);
  if (li && si) { const n = Math.abs(lvOf(L.y) - lvOf(P.y)); return { g: Math.pow(.62, n), f: Math.pow(.45, n) }; }
  if (li !== si) return { g: .85, f: .7 };            // fechamento lateral e cobertura (aberturas grandes: abafa pouco)
  return { g: 1, f: 1 };
}
// ar absorve agudos com a distância
export const airLP = (d) => clamp(17000 * Math.exp(-d / 55), 900, 17000);
// ponto mais próximo do ouvinte numa polilinha de segmentos [ax,ay,az,bx,by,bz]
export function nearestOnSegs(segs, L, out) {
  let best = Infinity;
  for (const s of segs) { const dx = s[3] - s[0], dy = s[4] - s[1], dz = s[5] - s[2], l2 = dx * dx + dy * dy + dz * dz;
    const u = clamp(((L.x - s[0]) * dx + (L.y - s[1]) * dy + (L.z - s[2]) * dz) / (l2 || 1), 0, 1), x = s[0] + dx * u, y = s[1] + dy * u, z = s[2] + dz * u;
    const d = (x - L.x) ** 2 + (y - L.y) ** 2 + (z - L.z) ** 2; if (d < best) { best = d; out.x = x; out.y = y; out.z = z; } }
  return out;
}

// ================= FONTES DO SETOR 3 (posições do grupo S3, que fica na origem) =================
export function sourceList(hotspots = []) {
  const S = [], hp = Object.fromEntries(hotspots.map((h) => [h.tag, h.pos]));
  SCREENS.tags.forEach((tag, i) => { const x = SCREENS.xs[i]; S.push({ kind: 'screen', tag, pos: { x: hp[tag] ? hp[tag].x : x, y: LV.L1 + 2, z: SCREENS.zFeed + SCREENS.len / 2 }, ref: 4, roll: .8, hrtf: true, layers: ['screenMech', 'screenRattle', 'trickle'] }); });
  CRUSHERS.cones.forEach((c) => S.push({ kind: 'cone', tag: c.tag, pos: { x: c.x, y: 2.4, z: c.z }, ref: 5, roll: .75, hrtf: true, layers: ['hum', 'coneIdle', 'coneLoad'], crunch: true }));
  CRUSHERS.vsi.forEach((c) => S.push({ kind: 'vsi', tag: c.tag, pos: { x: c.x, y: 2.6, z: c.z }, ref: 5, roll: .75, hrtf: true, layers: ['hum', 'vsiRoar', 'vsiRock'], hiss: true }));
  // correias (cópia das geometrias de flows.js e crushers.js; fonte linear = ponto da correia mais próximo do ouvinte)
  const E = B.screenEnd, yT = 17.4, zC = CRUSHERS.cones[0].z, zV = CRUSHERS.vsi[0].z, x1 = E + 1.5, x2 = E + .75;
  const BELTS = {
    F: [[E + 20, 2.5, -30, E - .6, yT + 1.6, 1.9]],
    T: [[E + 2.2, yT, 2.4, -.5, yT, 2.4]],
    R1: [[2.8, 6.4, 12.8, E + 1, 6.4, 12.8], [x1, 5.55, 12.35, x1, 16.9, zC + .2], [x1 + .4, 16, zC, 62, 16, zC]],
    R2: [[2.8, 5.5, 13.9, E + .6, 5.5, 13.9], [x2, 4.7, 14.45, x2, 16, zV - .2], [x2 + .4, 15.2, zV, 63, 15.2, zV]],
    P: [[2, 1.3, 20.5, E + 2, 1.3, 20.5], [E + 2.9, .85, 20.6, B.W + 6, 7.6, 32]],
    RET: [[E + 2.6, 1.4, 13.2, B.W - .9, 1.4, 13.2], [B.W - 1.1, .85, 12.8, B.W - 1.1, .85, 2.2], [B.W - 1.4, .7, 2, E + 2.6, 18.9, 2]],
  };
  for (const [key, segs] of Object.entries(BELTS)) S.push({ kind: 'belt', key, segs, pos: { x: segs[0][0], y: segs[0][1], z: segs[0][2] }, ref: 2.5, roll: .7, layers: ['belt', 'trickle', 'hum'] });
  // quedas de minério (pontos de transferência)
  const CH = [['F', E - .6, 18.6, 2.2, 1, .75], ['RET', E + 2.2, 18.3, 2.2, 1, .8], ['R1', E + 1.2, 6.0, 12.6, 1, .8], ['R1', x1 + .2, 16.4, zC, 1, .85],
    ['R2', E + .8, 5.1, 14.2, 1, .85], ['R2', x2 + .2, 15.6, zV, 1, .9], ['P', E + 2.5, 1.1, 20.55, 1, .9], ['RET', B.W - 1.1, 1.1, 13, 1, .75], ['RET', B.W - 1.2, .8, 2, 1, .8]];
  for (const [key, x, y, z, share, rate] of CH) S.push({ kind: 'chute', key, share, rate, pos: { x, y, z }, ref: 2.2, roll: .8, layers: ['trickle'], clank: true });
  // fundo distante: moagem dos concentradores, empilhadeira na pilha de regularização
  S.push({ kind: 'far', pos: { x: 112, y: 6, z: 14 }, ref: 30, roll: 1, layers: ['coneIdle'], rate: .45, gain: .5 });
  S.push({ kind: 'far', pos: { x: 30, y: 12, z: 62 }, ref: 14, roll: 1, layers: ['trickle'], rate: .55, gain: .35 });
  return S;
}

// ================= MOTOR DE ÁUDIO (navegador) =================
export function buildAmbience({ camera, sim, hotspots = [], getWalk = () => ({ walk: false, level: 0 }) } = {}) {
  const Q = new URLSearchParams(location.search), LOW = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const pref = () => { try { return localStorage.getItem('s3som'); } catch (e) { return null; } };
  let want = Q.get('som') !== '0' && pref() !== '0', ctx = null, ready = false, on = false, vol = (() => { try { const v = parseFloat(localStorage.getItem('s3somVol')); return isFinite(v) ? clamp(v, 0, 1) : .5; } catch (e) { return .5; } })(), building = false;
  const AC = window.AudioContext || window.webkitAudioContext;
  const SRC = sourceList(hotspots), BUF = {}, OS = {}, rnd = rng(7);
  let N = null;   // nós principais
  const L = { x: 0, y: 0, z: 0 }, Lp = { x: 0, y: 0, z: 0 }, tmp = { x: 0, y: 0, z: 0 };
  // narração/explicações do painel tocando → o ambiente abaixa (para não competir com a voz)
  const media = new Set();
  try { const P0 = HTMLMediaElement.prototype.play; if (!P0.__s3) { const P1 = function (...a) { media.add(this); return P0.apply(this, a); }; P1.__s3 = 1; HTMLMediaElement.prototype.play = P1; } } catch (e) { /* */ }
  const voiceOn = () => { let v = false; try { v = !!(window.speechSynthesis && speechSynthesis.speaking); } catch (e) { /* */ }
    for (const a of media) { if (a.paused || a.ended) media.delete(a); else v = true; } return v; };

  const mkBuf = (data, sr = SR) => { const chs = Array.isArray(data) ? data : [data], b = ctx.createBuffer(chs.length, chs[0].length, sr); chs.forEach((d, i) => b.copyToChannel ? b.copyToChannel(d, i) : b.getChannelData(i).set(d)); return b; };
  const setPos = (pn, x, y, z, now) => { if (pn.positionX) { pn.positionX.setTargetAtTime(x, now, .04); pn.positionY.setTargetAtTime(y, now, .04); pn.positionZ.setTargetAtTime(z, now, .04); } else pn.setPosition(x, y, z); };
  const setP = (p, v, now, tc = .12) => { if (p._t === undefined || Math.abs(p._t - v) > .002 * Math.max(1, Math.abs(v))) { p.setTargetAtTime(v, now, tc); p._t = v; } };   // só agenda quando o alvo muda

  async function build() {
    building = true; const yieldT = () => new Promise((r) => setTimeout(r, 0));
    const now0 = ctx.currentTime;
    // cadeia de saída: mistura → (seco + reverberação do galpão) → passa-alta 28 Hz → compressor → volume → saída
    const out = ctx.createGain(); out.gain.value = 0;
    const duck = ctx.createGain(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .01; comp.release.value = .3;
    const mixN = ctx.createGain(), dry = ctx.createGain(); mixN.gain.value = .5;   // ganho geral das fontes
    mixN.connect(dry); dry.connect(hp); hp.connect(comp); comp.connect(duck); duck.connect(out);
    // saturação suave (tanh, sem memória) no fim: segura picos quando muitas fontes somam
    const lim = ctx.createWaveShaper(); { const n = 2048, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; cv[i] = .9 * Math.tanh(x / .9); } lim.curve = cv; }
    out.connect(lim); lim.connect(ctx.destination);
    const an = ctx.createAnalyser(); an.fftSize = 2048; lim.connect(an);
    const wet = ctx.createGain(); wet.gain.value = .3;
    N = { out, duck, mixN, dry, wet, an, comp, ctx, hp, SRC }; if (/^(localhost|127\.)/.test(location.hostname)) window.__s3somN = N;   // depuração local
    // listener
    await yieldT();
    try { const ir = hallIR(ctx.sampleRate, LOW ? 1.4 : 2.4); const cv = ctx.createConvolver(); cv.normalize = false; cv.buffer = mkBuf(ir, ctx.sampleRate); mixN.connect(wet); wet.connect(cv); cv.connect(hp); N.cv = cv; } catch (e) { console.warn('som: reverberação', e); }
    // texturas (uma por tipo; cada fonte toca o laço com início e velocidade levemente diferentes → sem sincronismo artificial)
    let seed = 101;
    for (const k of Object.keys(RECIPES)) { await yieldT(); BUF[k] = mkBuf(tame(RECIPES[k](rng(seed++)))); }
    for (const k of Object.keys(STEREO)) { await yieldT(); BUF[k] = mkBuf(STEREO[k](rng(seed++))); }
    await yieldT();
    OS.crunch = [0, 1, 2].map((i) => mkBuf(norm(tame(ONESHOT.crunch(rng(300 + i)), 3), .5))); OS.clank = [0, 1, 2].map((i) => mkBuf(ONESHOT.clank(rng(310 + i))));
    OS.step = [0, 1, 2, 3].map((i) => mkBuf(ONESHOT.step(rng(320 + i), false))); OS.stepM = [0, 1, 2].map((i) => mkBuf(ONESHOT.step(rng(330 + i), true)));
    OS.beep = mkBuf(ONESHOT.beep()); OS.horn = mkBuf(ONESHOT.horn()); OS.hiss = mkBuf(ONESHOT.hiss(rng(340)));
    // fontes posicionadas
    for (const s of SRC) {
      const pn = ctx.createPanner(); pn.panningModel = s.hrtf && !LOW ? 'HRTF' : 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = s.ref; pn.rolloffFactor = s.roll; pn.maxDistance = 10000;
      setPos(pn, s.pos.x, s.pos.y, s.pos.z, now0);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000; lp.Q.value = .5; const gs = ctx.createGain(); gs.gain.value = 1;
      lp.connect(gs); gs.connect(pn); pn.connect(mixN);
      s.n = { pn, lp, gs, L: s.layers.map((k) => { const src = ctx.createBufferSource(); src.buffer = BUF[k]; src.loop = true; src.playbackRate.value = .97 + rnd() * .06;
        const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(lp); src.start(now0 + .05, rnd() * BUF[k].duration); return { src, g, jit: .97 + rnd() * .06 }; }) };
      s.nextEv = 2 + rnd() * 20;
    }
    // ar do galpão e vento (estéreo, sem posição)
    const bed = (k) => { const src = ctx.createBufferSource(); src.buffer = BUF[k]; src.loop = true; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); src.start(now0 + .05, rnd() * 4); return g; };
    N.hall = bed('hall'); N.hall.connect(mixN); N.wind = bed('wind'); N.wind.connect(dry);
    N.foot = ctx.createGain(); N.foot.gain.value = 1; N.foot.connect(mixN);
    ready = true; building = false;
    if (on) fadeTo(vol, 2.5);
  }
  const fadeTo = (v, t = .6) => { if (!N) return; const now = ctx.currentTime; N.out.gain.cancelScheduledValues(now); N.out.gain.setValueAtTime(N.out.gain.value, now); N.out.gain.linearRampToValueAtTime(v, now + t); };

  // evento curto: no ponto da fonte (passa pelo filtro/painel dela) ou num ponto próprio (panner temporário)
  function shot(buf, { dest, pos, gain = 1, rate = 1, when = 0, ref = 6 } = {}) {
    if (!ready) return; const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = gain; src.connect(g);
    let pn = null; if (pos) { pn = ctx.createPanner(); pn.panningModel = 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = ref; pn.rolloffFactor = 1; setPos(pn, pos.x, pos.y, pos.z, ctx.currentTime); g.connect(pn); pn.connect(N.mixN); } else g.connect(dest || N.mixN);
    src.onended = () => { try { g.disconnect(); pn && pn.disconnect(); } catch (e) { /* */ } }; src.start(ctx.currentTime + when);
  }
  const pick = (a) => a[(rnd() * a.length) | 0];

  function start() {
    if (!AC) return; on = true;
    if (!ctx) { try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); } }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!ready && !building) build().catch((e) => { console.warn('som ambiente', e); building = false; });
    else if (ready) fadeTo(vol, 1.2);
    document.dispatchEvent(new CustomEvent('s3som', { detail: { on: true } }));
  }
  function stop() { on = false; if (ctx && ready) { fadeTo(0, .5); setTimeout(() => { if (!on && ctx) ctx.suspend().catch(() => {}); }, 700); } document.dispatchEvent(new CustomEvent('s3som', { detail: { on: false } })); }
  // primeiro gesto do usuário libera o áudio (se a preferência permitir)
  const gesture = () => { if (want && !on) start(); else if (on && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, gesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (on) ctx.resume().catch(() => {}); });
  window.__s3som = (v) => { if (v == null) v = !on; want = !!v; try { localStorage.setItem('s3som', v ? '1' : '0'); } catch (e) { /* */ } v ? start() : stop(); return !!v; };
  window.__s3somOn = () => on;
  window.__s3somVol = (v) => { if (v == null) return vol; vol = clamp(+v || 0, 0, 1); try { localStorage.setItem('s3somVol', String(vol)); } catch (e) { /* */ } if (on) fadeTo(vol, .3); return vol; };
  window.__s3somDbg = () => { if (!N) return null; const a = new Float32Array(N.an.fftSize); N.an.getFloatTimeDomainData(a); return { state: ctx.state, t: +ctx.currentTime.toFixed(2), red: +N.comp.reduction.toFixed(1), out: +N.out.gain.value.toFixed(3), duck: +N.duck.gain.value.toFixed(2), rms: +rms(a).toFixed(4), fontes: SRC.map((s) => ({ id: s.tag || s.key || s.kind, g: s.out ? s.out.g.map((x) => +x.toFixed(3)) : null })) }; };

  // ---------- quadro a quadro ----------
  let acc = 0, wasSeq = null, prevOn = {}, stepAcc = 0, lastStepSide = 0, nextBeep = 25 + rnd() * 40, inS = 1;
  return {
    get on() { return on; }, set: (v) => window.__s3som(v),
    update(dt) {
      if (!ready || !on || ctx.state !== 'running') return;
      dt = Math.min(Math.max(dt || 0, 0), .1);
      const now = ctx.currentTime, e = camera.matrixWorld.elements, li = ctx.listener;
      Lp.x = L.x; Lp.y = L.y; Lp.z = L.z; L.x = e[12]; L.y = e[13]; L.z = e[14];
      const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
      if (li.positionX) { li.positionX.value = L.x; li.positionY.value = L.y; li.positionZ.value = L.z; li.forwardX.value = fx; li.forwardY.value = fy; li.forwardZ.value = fz; li.upX.value = ux; li.upY.value = uy; li.upZ.value = uz; }
      else { li.setPosition(L.x, L.y, L.z); li.setOrientation(fx, fy, fz, ux, uy, uz); }
      // passos no modo caminhar (a cada ~0,75 m; correndo, passada maior)
      const W = getWalk() || {}; const hv = Math.hypot(L.x - Lp.x, L.z - Lp.z);
      if (W.walk && hv < 1 && Math.abs(L.y - Lp.y) < .05) { stepAcc += hv; const stride = hv / Math.max(dt, 1e-3) > 3 ? 1.05 : .72;
        if (stepAcc > stride) { stepAcc = 0; lastStepSide ^= 1; const metal = W.level === 2;
          shot(pick(metal ? OS.stepM : OS.step), { dest: N.foot, gain: (metal ? .8 : 1) * (.85 + rnd() * .3), rate: .92 + rnd() * .16 }); } } else stepAcc = Math.min(stepAcc, .5);
      acc += dt; if (acc < 1 / 15) return; const T = acc; acc = 0;
      const S = sim || {}, K = S.kpi || {};
      // dentro/fora do prédio → reverberação, ar do galpão e vento
      inS = smooth(inS, insideB(L.x, L.y, L.z, 2) ? 1 : 0, T, .8, .8);
      setP(N.wet.gain, .08 + .27 * inS, now, .3); setP(N.hall.gain, .02 + .03 * inS, now, .4); setP(N.wind.gain, .015 + .05 * (1 - inS) * clamp((L.y - 2) / 30 + .6, .4, 1), now, .5);
      setP(N.duck.gain, voiceOn() ? .35 : 1, now, .25);
      for (const s of SRC) {
        const o = levels(s, S, T); let P = s.pos;
        if (s.segs) { P = nearestOnSegs(s.segs, L, tmp); setPos(s.n.pn, P.x, P.y, P.z, now); }
        const d = Math.hypot(P.x - L.x, P.y - L.y, P.z - L.z), oc = occlusion(L, P);
        setP(s.n.gs.gain, oc.g, now, .2); setP(s.n.lp.frequency, clamp(airLP(d) * oc.f * (.25 + .75 * o.bright), 300, 16000), now, .15);
        s.n.L.forEach((l, i) => { setP(l.g.gain, o.g[i] || 0, now, .15); setP(l.src.playbackRate, Math.max(.05, (o.rate[i] || 1) * l.jit), now, .25); });
        // eventos da fonte
        s.nextEv -= T; if (s.nextEv <= 0) { s.nextEv = 1;
          if (s.crunch && s.spin > .5 && s.ld > .1) { shot(pick(OS.crunch), { dest: s.n.lp, gain: .5 + .9 * Math.min(1.4, s.ld) * rnd(), rate: .8 + rnd() * .4 }); s.nextEv = (.25 + rnd() * 1.2) / Math.max(.3, s.ld); }
          else if (s.clank && s.ld > .15) { if (rnd() < .5) shot(pick(OS.clank), { dest: s.n.lp, gain: .25 + rnd() * .5, rate: .85 + rnd() * .3 }); s.nextEv = 6 + rnd() * 30; }
          else if (s.hiss && s.spin > .5) { if (rnd() < .3) shot(OS.hiss, { dest: s.n.lp, gain: .35 }); s.nextEv = 40 + rnd() * 80; }
          else s.nextEv = 3 + rnd() * 5;
        }
      }
      // buzina de partida: ao iniciar a partida sequencial (antes do 1º equipamento) e quando algo parte fora da sequência
      const sq = S.seq ? S.seq.dir : null;
      if (sq === 'start' && wasSeq !== 'start') for (const p of [{ x: 20, y: 11, z: 12 }, { x: 52, y: 5, z: 12 }]) shot(OS.horn, { pos: p, gain: .9, ref: 8 });
      wasSeq = sq;
      for (const [t, it] of Object.entries({ ...(S.eq || {}), ...(S.belts || {}) })) { const v = !!it.on; if (prevOn[t] === false && v && !S.seq) { const h = hotspots.find((q) => q.tag === t);
        shot(OS.horn, { pos: h ? h.pos : { x: 32, y: 6, z: 12 }, gain: .5, ref: 8, rate: 1.02 }); } prevOn[t] = v; }
      // ré de caminhão/pá carregadeira ao longe (pátio da pilha ou da mina)
      nextBeep -= T; if (nextBeep <= 0) { nextBeep = 50 + rnd() * 90; const p = rnd() < .6 ? { x: 20 + rnd() * 30, y: 2, z: 70 + rnd() * 20 } : { x: -10 + rnd() * 30, y: 2, z: -70 - rnd() * 20 };
        for (let i = 0; i < 5 + (rnd() * 5 | 0); i++) shot(OS.beep, { pos: p, gain: .5, ref: 10, when: i * 1.0 }); }
    },
  };
}
