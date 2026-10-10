// Modelo de processo do circuito fechado de britagem e peneiramento (Usina II, pelo TCC):
// alimentação nova F → 8 peneiras banana 2 decks; retido 1º deck → cônicos HP 400; retido 2º deck → Barmac; produto < 12,5 mm.
// O retido volta às peneiras: alimentação das peneiras = F / (1 − r), com r = fração retida (1º + 2º deck).
import { SCREENS, CRUSHERS } from './layout.js?v=20261010011650';

const LIFE = { pn: 2.5e6, cone: 1.2e6, vsi: 5e5 };            // t de material por troca de revestimento/deck (ilustrativo)
const CAP = { pn: 1500, cone: 800, vsi: 750 };                 // t/h por equipamento [referência]: HP 400 e Barmac B9100SE em britagem de minério (catálogo, faixa típica); Britagem 01: Omnicone 1560 ≤ 350 t/h, Barmac B9000XHD ≤ 500 t/h
export const sim = {
  feed: 3800, capNom: 4200, css: 20, wi: 12, f12: .55, p80: null, tcld: 100, moist: 8, fe: 40, si: 42, running: true, t: 0, log: [], hist: [], sync: false,
  eq: {},                                                      // tag → {k, on, w (desgaste %), ...valores}
  kpi: {},
};
const saved = (() => { try { return JSON.parse(localStorage.getItem('setor3.w') || '{}'); } catch (e) { return {}; } })();
const W0 = { '03PN001': 35, '03PN002': 58, '03PN003': 41, '03PN004': 22, '03PN005': 47, '03PN006': 30, '03PN007': 64, '03PN008': 18, '03BR001': 63, '03BR002': 71, '03BR004': 39, '03BR005': 52, '03BR006': 46 };
SCREENS.tags.forEach((t) => { sim.eq[t] = { k: 'pn', on: true, w: saved[t] ?? W0[t] ?? 30 }; });
CRUSHERS.cones.forEach((c) => { sim.eq[c.tag] = { k: 'cone', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 50 }; });
CRUSHERS.vsi.forEach((c) => { sim.eq[c.tag] = { k: 'vsi', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 40 }; });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// ---------- circuito fechado com balanço de massa e granulometria coerentes (Rosin–Rammler truncada, % passante acumulado)
// Fontes: [real] dissertação Figueiredo (UFMG, 2019) — Britagem 01 de Germano: ROM < 150 mm, decks de 30 mm e 12,5 mm,
// produto < 12,5 mm; [TCC] Usina II: 8 peneiras banana, HP 400 + Barmac; [adotado] finos do ROM, inclinações das curvas,
// P80 do HP ≈ 1,45·APF, razão do Barmac ≈ 2,1:1, eficiências das peneiras.
export const SRC = { top: 150, d1: 30, d2: 12.5 };
const rrSim = (p80, n) => ({ p80, n, x63: p80 / Math.pow(Math.log(5), 1 / n) });
const pasSim = (c, x) => { const f = (y) => 1 - Math.exp(-Math.pow(Math.max(1e-6, y) / c.x63, c.n)); return c.top ? (x >= c.top ? 1 : f(x) / f(c.top)) : f(x); };
const bisSim = (f, t, lo, hi) => { for (let i = 0; i < 46; i++) { const m = Math.sqrt(lo * hi); if (f(m) < t) lo = m; else hi = m; } return Math.sqrt(lo * hi); };
// ROM truncado em 150 mm com a fração < 12,5 mm = f12 (resolve x63 por bissecção)
function romCurve(f12) { const n = .8, c = { n, top: SRC.top, x63: 30 }; let lo = 1, hi = 2000; for (let i = 0; i < 50; i++) { c.x63 = Math.sqrt(lo * hi); if (pasSim(c, SRC.d2) > f12) lo = c.x63; else hi = c.x63; } c.p80 = bisSim((x) => pasSim(c, x), .8, .5, SRC.top); return c; }
export function circSolve(css, f12, e2, e1) {
  const D1 = SRC.d1, D2 = SRC.d2, rom = romCurve(clamp(f12, .25, .9));
  const hp = rrSim(1.45 * css, 1.3); let vsi = rrSim(10, 1.1), r1 = .2, r2 = .2, prod = .6, F80v = 20;
  let mix = (x) => prod * pasSim(rom, x) + r1 * pasSim(hp, x) + r2 * pasSim(vsi, x);
  for (let it = 0; it < 80; it++) {
    mix = (x) => prod * pasSim(rom, x) + r1 * pasSim(hp, x) + r2 * pasSim(vsi, x);
    const pA = mix(D1), pB = mix(D2), r1n = 1 - e1 * pA, pn = e2 * e1 * pB, r2n = Math.max(0, 1 - r1n - pn);
    r1 += .5 * (r1n - r1); r2 += .5 * (r2n - r2); prod = 1 - r1 - r2;
    // F80 da alimentação do Barmac = retido no 2º deck (faixa −30 +12,5 mm + finos mal classificados)
    const R2 = (x) => (x <= D2 ? e1 * (1 - e2) * mix(x) : x <= D1 ? e1 * ((1 - e2) * pB + mix(x) - pB) : e1 * ((1 - e2) * pB + pA - pB)) / Math.max(1e-6, e1 * ((1 - e2) * pB + pA - pB));
    F80v = bisSim(R2, .8, .5, D1); vsi = rrSim(F80v / 2.1, 1.1);
  }
  const pA = mix(D1), pB = mix(D2);
  const R1 = (x) => (x <= D1 ? (1 - e1) * mix(x) : (1 - e1) * pA + mix(x) - pA) / Math.max(1e-6, 1 - e1 * pA);
  return { rom, hp, vsi, mix, r1, r2, prod, p12: pB, p32: pA, F80hp: bisSim(R1, .8, 1, 2000), F80v, P80hp: hp.p80, P80v: vsi.p80,
    feedP80: bisSim(mix, .8, .1, 2000), prodP80: bisSim((x) => mix(x) / pB, .8, .05, D2) };
}
let REF = null;   // referência (APF 20 mm, ROM padrão, peneiras 92 %) para o F80 da moagem no simulador
export function logEv(tipo, txt) { const d = new Date(); sim.log.unshift({ h: d.toLocaleTimeString('pt-BR'), tipo, txt }); if (sim.log.length > 120) sim.log.pop(); }
let lastSave = 0;
export function stepSim(dt, speed = 60) {                       // speed: segundos simulados por segundo real (desgaste)
  sim.t += dt;
  const E = sim.eq, on = (k) => Object.values(E).filter((e) => e.k === k && e.on).length;
  const nPN = on('pn'), nC = on('cone'), nV = on('vsi');
  // frações retidas e carga circulante saem do balanço granulométrico (circSolve) com a eficiência média atual das peneiras
  const e2 = clamp((sim._effM || 92) / 100, .4, .99), e1 = Math.min(.99, e2 + .04);
  const CS = circSolve(sim.css, sim.f12, e2, e1), r1 = CS.r1, r2 = CS.r2;
  const F = sim.running && nPN > 0 ? Math.min(sim.feed, 6000 * sim.tcld / 100) : 0;
  const wet = Math.max(0, sim.moist - 9);                       // minério úmido: peneiramento menos eficiente (colmatação)
  // sem britagem disponível o retido não fecha o circuito: alimentação limitada
  const cap1 = nC * CAP.cone, cap2 = nV * CAP.vsi;
  let T = F / (1 - r1 - r2);
  const lim = Math.min(cap1 > 0 ? cap1 / r1 : 0, cap2 > 0 ? cap2 / r2 : 0) * 1.15;
  const limited = T > lim; if (limited) T = lim;
  const prod = T * (1 - r1 - r2);
  const hum = Math.sin(sim.t * .17) * .25 + Math.sin(sim.t * .041) * .15;
  let kw = 0, alarms = [];
  for (const [tag, e] of Object.entries(E)) {
    const n = e.k === 'pn' ? nPN : e.k === 'cone' ? nC : nV, total = e.k === 'pn' ? T : e.k === 'cone' ? T * r1 : T * r2;
    e.flow = e.on && n ? total / n : 0; e.load = e.flow / CAP[e.k];
    const run = e.on && e.flow > 0;
    e.kw = !run ? 0 : e.k === 'pn' ? 45 + 20 * e.load : e.k === 'cone' ? 160 + 230 * e.load + (18 - sim.css) * 4 : 180 + 380 * e.load;
    e.vib = !run ? 0 : (e.k === 'pn' ? 2.6 : 2.3) + Math.max(0, e.load - .9) * 7 + e.w / 100 * 3 + hum;
    e.oil = !run ? 26 : 38 + 18 * e.load + e.w * .05;
    e.eff = e.k === 'pn' && run ? clamp(94 - Math.max(0, e.load - .9) * 55 - e.w * .05 - wet * 6, 50, 97) : 0;
    if (run) e.w = Math.min(100, e.w + e.flow * dt * speed / 3600 / LIFE[e.k] * 100);
    e.tons = (e.tons || 0) + (run ? e.flow * dt * speed / 3600 : 0); e.hrs = (e.hrs || 0) + (run ? dt * speed / 3600 : 0);
    e.starts = e.starts || 0; if (run && !e._run) e.starts++; e._run = run;
    if (!e.h) e.h = []; if (!e._ht || sim.t - e._ht >= 1) { e._ht = sim.t; e.h.push({ t: sim.t, flow: e.flow, vib: e.vib, kw: e.kw, oil: e.oil }); if (e.h.length > 300) e.h.shift(); }
    e.left = run ? (100 - e.w) / (e.flow / LIFE[e.k] * 100) : Infinity;
    // SAÚDE DO ATIVO (0–100): desgaste + vibração (ISO 10816) + temperatura + sobrecarga
    const pv = clamp((e.vib - 2.8) / (11 - 2.8), 0, 1), po = clamp((e.oil - 50) / 25, 0, 1), pl = clamp((e.load - .9) / .35, 0, 1);
    e.health = !e.on ? null : Math.round(clamp(100 - e.w * .5 - pv * 25 - po * 10 - pl * 15, 0, 100));
    e.hParts = { desgaste: e.w * .5, vibracao: pv * 25, temperatura: po * 10, sobrecarga: pl * 15 };
    // VIDA ÚTIL RESTANTE (RSL, h de operação): até o limite de troca (95 % de desgaste), encurtada por vibração e sobrecarga
    e.rsl = e.w >= 95 ? 0 : run ? (95 - e.w) / (e.flow / LIFE[e.k] * 100) * (1 - .5 * pv) * (1 - .3 * pl) : Infinity;
    e.st = !e.on ? 'off' : (e.w >= 95 || e.vib >= 11 || e.load > 1.25) ? 'crit' : (e.w >= 85 || e.vib >= 7.1 || e.oil >= 65 || e.load > 1.05 || (e.k === 'pn' && e.eff < 80)) ? 'warn' : 'ok';
    if (e.st === 'warn' || e.st === 'crit') alarms.push({ tag, st: e.st, why: [e.load > 1.05 ? `sobrecarga ${Math.round(e.load * 100)} %` : '', e.vib >= 7.1 ? `vibração ${e.vib.toFixed(1)} mm/s` : '', e.w >= 85 ? `desgaste ${Math.round(e.w)} %` : '', e.k === 'pn' && run && e.eff < 80 ? `eficiência ${Math.round(e.eff)} %` : ''].filter(Boolean).join(', ') });
    kw += e.kw;
  }
  // UMIDADE DO ROM: alerta antecipado de colmatação (amarelo a partir de 8,5 % ou subindo; vermelho a partir de 9,5 %)
  if (!sim._mh) sim._mh = [];
  const mh = sim._mh; if (!mh.length || sim.t - mh[mh.length - 1].t >= 2) { mh.push({ t: sim.t, m: sim.moist }); while (mh.length && sim.t - mh[0].t > 120) mh.shift(); }
  const mRise = mh.length > 1 ? sim.moist - mh[0].m : 0;
  const um = { m: sim.moist, rise: mRise, st: sim.moist >= 9.5 ? 'crit' : (sim.moist >= 8.5 || (sim.moist >= 8 && mRise > .15)) ? 'warn' : 'ok' };
  if (um.st !== 'ok' && F > 0) alarms.unshift({ tag: 'Umidade do ROM', st: um.st, why: um.st === 'crit' ? `${um.m.toFixed(1).replace('.', ',')} %: colmatação nas peneiras, eficiência e capacidade em queda` : `${um.m.toFixed(1).replace('.', ',')} %${mRise > .15 ? ' e subindo' : ''}: risco amarelo de colmatação nas peneiras` });
  // CURVAS GRANULOMÉTRICAS e EFICIÊNCIAS (mesmo circuito do balanço de massa)
  const effs = Object.values(E).filter((e) => e.k === 'pn' && e.on && e.flow > 0).map((e) => e.eff), effM = effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : 92; sim._effM = effM;
  if (!REF) REF = circSolve(20, .55, .92, .96);
  const ST = { rom: CS.rom, hp: CS.hp, vsi: CS.vsi, r1: { p80: CS.F80hp }, r2: { p80: CS.F80v }, prod: { p80: CS.prodP80 } };
  const gran = { st: ST, feedP80: CS.feedP80, effM, pas: pasSim, mix: CS.mix, p12: CS.p12, p80prod: CS.prodP80, f80moagem: CS.prodP80, ratio: CS.prodP80 / REF.prodP80 };
  const grp = (k) => Object.values(E).filter((e) => e.k === k && e.on && e.flow > 0), sum = (a, f) => a.reduce((s2, e) => s2 + f(e), 0);
  const crush = (k, F80, P80) => { const g2 = grp(k), fl = sum(g2, (e) => e.flow), kwg = sum(g2, (e) => e.kw); if (!fl) return null; const W = kwg / fl, den = 10 / Math.sqrt(P80 * 1000) - 10 / Math.sqrt(F80 * 1000), wio = den > 0 ? W / den : Infinity;
    return { n: g2.length, flow: fl, kw: kwg, W, F80, P80, rr: F80 / P80, wio, effE: isFinite(wio) ? clamp(sim.wi / wio, 0, 1.5) : 0, load: sum(g2, (e) => e.load) / g2.length }; };
  const pns = Object.values(E).filter((e) => e.k === 'pn'), nOn = Object.values(E).filter((e) => e.on).length;
  const disp = nOn / Object.keys(E).length, desemp = F > 0 ? clamp(prod / sim.capNom, 0, 1) : 0;   // desempenho: produção ÷ capacidade nominal do setor
  const qual = clamp(1 - .15 * (1 - e2) - .5 * sum(pns, (e) => Math.max(0, e.w - 85)) / 100 / Math.max(1, pns.length), .7, 1);
  const efic = { tag: e1 * e2 * 100, e1: e1 * 100, e2: e2 * 100, cone: crush('cone', CS.F80hp, CS.P80hp), vsi: crush('vsi', CS.F80v, CS.P80v), spec: prod > 0 ? kw / prod : 0, disp, desemp, qual, oee: disp * desemp * qual, wi: sim.wi };
  if (limited && F > 0) alarms.unshift({ tag: 'Circuito', st: 'crit', why: 'britagem insuficiente para o retido: alimentação limitada' });
  sim.kpi = { efic, gran, umid: um, F, T, prod, circ: F > 0 ? (T - prod) / prod * 100 : 0, r1, r2, kw, limited, nPN, nC, nV, alarms, spec: prod > 0 ? kw / prod : 0 };
  // eventos: alarmes que começam/terminam
  const now = new Set(alarms.map((a) => a.tag + '|' + a.why.replace(/[\d.,]+/g, '#')));
  for (const k of now) if (!sim._al || !sim._al.has(k)) logEv('Alarme', k.split('|')[0] + ': ' + alarms.find((a) => a.tag + '|' + a.why.replace(/[\d.,]+/g, '#') === k).why);
  if (sim._al) for (const k of sim._al) if (!now.has(k)) logEv('Normalizado', k.split('|')[0]);
  sim._al = now;
  // histórico para as tendências (1 amostra por segundo real)
  if (!sim._h || sim.t - sim._h >= 1) { sim._h = sim.t; sim.hist.push({ t: sim.t, F, T, prod, circ: sim.kpi.circ, kw }); if (sim.hist.length > 900) sim.hist.shift(); }
  if (sim.t - lastSave > 20) { lastSave = sim.t; try { const o = {}; for (const [k, e] of Object.entries(E)) o[k] = +e.w.toFixed(2); localStorage.setItem('setor3.w', JSON.stringify(o)); } catch (e) { /* sem armazenamento */ } }
  return sim;
}
