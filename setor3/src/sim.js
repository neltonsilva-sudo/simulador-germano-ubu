// Modelo de processo do circuito fechado de britagem e peneiramento (Usina II, pelo TCC):
// alimentação nova F → 8 peneiras banana 2 decks; retido 1º deck → cônicos HP 400; retido 2º deck → Barmac; produto < 12,5 mm.
// O retido volta às peneiras: alimentação das peneiras = F / (1 − r), com r = fração retida (1º + 2º deck).
import { SCREENS, CRUSHERS } from './layout.js?v=20261003135802';

const LIFE = { pn: 2.5e6, cone: 1.2e6, vsi: 5e5 };            // t de material por troca de revestimento/deck (ilustrativo)
const CAP = { pn: 1500, cone: 1100, vsi: 900 };                // t/h nominal por equipamento (ilustrativo)
export const sim = {
  feed: 3800, css: 20, p80: null, tcld: 100, moist: 8, fe: 40, si: 42, running: true, t: 0, log: [], hist: [], sync: false,
  eq: {},                                                      // tag → {k, on, w (desgaste %), ...valores}
  kpi: {},
};
const saved = (() => { try { return JSON.parse(localStorage.getItem('setor3.w') || '{}'); } catch (e) { return {}; } })();
const W0 = { '03PN001': 35, '03PN002': 58, '03PN003': 41, '03PN004': 22, '03PN005': 47, '03PN006': 30, '03PN007': 64, '03PN008': 18, '03BR001': 63, '03BR002': 71, '03BR004': 39, '03BR005': 52, '03BR006': 46 };
SCREENS.tags.forEach((t) => { sim.eq[t] = { k: 'pn', on: true, w: saved[t] ?? W0[t] ?? 30 }; });
CRUSHERS.cones.forEach((c) => { sim.eq[c.tag] = { k: 'cone', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 50 }; });
CRUSHERS.vsi.forEach((c) => { sim.eq[c.tag] = { k: 'vsi', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 40 }; });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function logEv(tipo, txt) { const d = new Date(); sim.log.unshift({ h: d.toLocaleTimeString('pt-BR'), tipo, txt }); if (sim.log.length > 120) sim.log.pop(); }
let lastSave = 0;
export function stepSim(dt, speed = 60) {                       // speed: segundos simulados por segundo real (desgaste)
  sim.t += dt;
  const E = sim.eq, on = (k) => Object.values(E).filter((e) => e.k === k && e.on).length;
  const nPN = on('pn'), nC = on('cone'), nV = on('vsi');
  // frações retidas: 1º deck cresce com APF mais aberta (britado mais grosso volta); 2º deck quase fixo
  // carga circulante pela mesma relação do simulador (APF): c = 25 + (20 − APF)·2 %, limitada a 5–70 %;
  // fração retida r = c/(100 + c), dividida entre o 1º deck (45 %) e o 2º deck (55 %)
  const cc = clamp(25 + (20 - sim.css) * 2, 5, 70), rr = cc / (100 + cc), r1 = rr * .45, r2 = rr * .55;
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
    e.st = !e.on ? 'off' : (e.w >= 95 || e.vib >= 11 || e.load > 1.25) ? 'crit' : (e.w >= 85 || e.vib >= 7.1 || e.oil >= 65 || e.load > 1.05 || (e.k === 'pn' && e.eff < 80)) ? 'warn' : 'ok';
    if (e.st === 'warn' || e.st === 'crit') alarms.push({ tag, st: e.st, why: [e.load > 1.05 ? `sobrecarga ${Math.round(e.load * 100)} %` : '', e.vib >= 7.1 ? `vibração ${e.vib.toFixed(1)} mm/s` : '', e.w >= 85 ? `desgaste ${Math.round(e.w)} %` : '', e.k === 'pn' && run && e.eff < 80 ? `eficiência ${Math.round(e.eff)} %` : ''].filter(Boolean).join(', ') });
    kw += e.kw;
  }
  if (limited && F > 0) alarms.unshift({ tag: 'Circuito', st: 'crit', why: 'britagem insuficiente para o retido: alimentação limitada' });
  sim.kpi = { F, T, prod, circ: F > 0 ? (T - prod) / prod * 100 : 0, r1, r2, kw, limited, nPN, nC, nV, alarms, spec: prod > 0 ? kw / prod : 0 };
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
