// Modelo de processo do circuito fechado de britagem e peneiramento (Usina II, pelo TCC):
// alimentação nova F → 7 peneiras banana 2 decks; retido 1º deck → cônicos HP 400; retido 2º deck → Barmac; produto < 12,5 mm.
// O retido volta às peneiras: alimentação das peneiras = F / (1 − r), com r = fração retida (1º + 2º deck).
import { SCREENS, CRUSHERS } from './layout.js?v=20261022202104';

const LIFE = { pn: 7.5e6, cone: 3.6e6, vsi: 1.5e6 };   // ×3 (desgaste mais lento, pedido do usuário)
export const MNT_W = 25;   // desgaste após a manutenção (%): recondicionamento, não peça nova
// MANUTENÇÃO: duração planejada (h simuladas), peças e atividades por tipo de equipamento (ilustrativo)
export const MNT = {
  pn: { h: 8, pecas: 'Telas de poliuretano do 1º e do 2º deck', at: ['Bloqueio e etiquetagem (LOTO) e teste de energia zero', 'Limpeza e inspeção dos decks e da estrutura', 'Troca das telas de poliuretano do 1º e do 2º deck', 'Reaperto dos parafusos e inspeção das molas', 'Vibrador: rolamentos e lubrificação', 'Teste a vazio e liberação para operação'] },
  cone: { h: 12, pecas: 'Manto e côncavo (revestimento da câmara de britagem)', at: ['Bloqueio e etiquetagem (LOTO) e teste de energia zero', 'Remoção do bojo e inspeção da câmara', 'Troca do manto e do côncavo', 'Sistema hidráulico e óleo de lubrificação', 'Ajuste da APF', 'Teste a vazio e liberação para operação'] },
  vsi: { h: 6, pecas: 'Pontas do rotor e placas de desgaste', at: ['Bloqueio e etiquetagem (LOTO) e teste de energia zero', 'Abertura da tampa e inspeção do rotor', 'Troca das pontas do rotor e das placas de desgaste', 'Balanceamento do rotor', 'Correias e rolamentos', 'Teste a vazio e liberação para operação'] } };
export function startMnt(e) { e.mnt = { h: 0, dur: MNT[e.k].h, w0: e.w, h0: e.health, f0: e.flow || 0 }; e.on = false; }
export function finishMnt(tag, e, early) { const m = e.mnt; if (!m) return null; const M = MNT[e.k];
  e.lastMnt = { tag, k: e.k, h: m.h || 0, dur: m.dur || M.h, w0: m.w0, h0: m.h0, early: !!early, pecas: M.pecas, at: M.at, prox: m.f0 > 0 ? LIFE[e.k] / m.f0 : null, shown: false, logged: false, wf: Math.min(m.w0 != null ? m.w0 : e.w, MNT_W) };
  e.w = e.lastMnt.wf; e.mnt = null; e.lock = null;   /* fim da manutenção: o executante retira o cadeado */ return e.lastMnt; }            // t de material por troca de revestimento/deck (ilustrativo)
const CAP = { pn: 1500, cone: 800, vsi: 690 };   // Barmac 9100: 690 t/h (apostila C3); HP 400: 260–854 t/h com cascata                 // t/h por equipamento [referência]: HP 400 e Barmac B9100SE em britagem de minério (catálogo, faixa típica); Britagem 01: Omnicone 1560 ≤ 350 t/h, Barmac B9000XHD ≤ 500 t/h
// Barmac B9100SE (manual Metso): velocidade de saída 50–85 m/s ∝ rotação; a cascata reduz a redução (material só choca rocha-rocha) e alivia potência
let VSI_RR = 2.1;
export const vsiTip = (rpm) => rpm * Math.PI * .99 / 60;   // rotor Ø ≈ 0,99 m
export const sim = {
  feed: 2500, capNom: 2800, css: 20,   // C3 (apostila): 2.500 t/h de ROM na britagem do setor 3
  rpm: 1450, casc: 10,   // Barmac: rotação do rotor (rpm) e cascata (% desviada do rotor) — manual B9100SE
  wi: 12, f12: .55, p80: null, tcld: 100, moist: 8, fe: 40, si: 42, running: true, t: 0, log: [], hist: [], sync: false,
  eq: {},                                                      // tag → {k, on, w (desgaste %), ...valores}
  kpi: {},
};
const saved = (() => { try { return JSON.parse(localStorage.getItem('setor3.w') || '{}'); } catch (e) { return {}; } })();
const W0 = { '03PN001': 35, '03PN002': 58, '03PN003': 41, '03PN004': 22, '03PN005': 47, '03PN006': 30, '03PN007': 64, '03PN008': 18, '03BR001': 63, '03BR002': 71, '03BR004': 39, '03BR005': 52, '03BR006': 46 };
SCREENS.tags.forEach((t) => { sim.eq[t] = { k: 'pn', on: true, w: saved[t] ?? W0[t] ?? 30 }; });
CRUSHERS.cones.forEach((c) => { sim.eq[c.tag] = { k: 'cone', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 50 }; });
CRUSHERS.vsi.forEach((c) => { sim.eq[c.tag] = { k: 'vsi', on: true, w: saved[c.tag] ?? W0[c.tag] ?? 40 }; });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// ---------- COMANDO E INTERTRAVAMENTOS (prática de britagem: partida de jusante para montante, parada no sentido inverso)
// correias: cordão de emergência (trava até rearme no campo), chave de desalinhamento (alarme 10°, parada 20°) e chave de velocidade;
// HP 400: bomba de lubrificação com pressão estabelecida antes do motor, desarme por pressão baixa; Barmac: tampa de inspeção e proteção das correias em V intertravadas
export const BELTS = { '03TC005': 'Produto < 12,5 mm → pilha', '03TC002': 'Retido 1º deck → silos do HP 400', '03TC003': 'Retido 2º deck → silos do Barmac', '03TC001': 'Distribuição sobre as peneiras',
  '03TC004': 'Retorno dos britadores → distribuição', '03TC006': 'Alimentação nova (chegada da TCLD)' };
sim.belts = {}; for (const [t, n] of Object.entries(BELTS)) sim.belts[t] = { k: 'tc', nome: n, on: true, mode: 'R', cord: false, align: 2 + Math.random() * 3, spd: 100 };
for (const e of Object.values(sim.eq)) { e.mode = 'R'; if (e.k === 'cone') { e.lube = true; e.lubeT = 99; } if (e.k === 'vsi') { e.lid = true; e.guard = true; e.coast = 0; } }
const anyOn = (k) => Object.values(sim.eq).some((e) => e.k === k && e.on);
const bOn = (t) => !!(sim.belts[t] && sim.belts[t].on);
export const SEQ = ['03TC005', '03TC002', '03TC003', ...SCREENS.tags, '03TC001', '03TC004', ...CRUSHERS.cones.map((c) => c.tag), ...CRUSHERS.vsi.map((c) => c.tag), '03TC006'];
export const itemOf = (t) => sim.eq[t] || sim.belts[t] || null;
// intertravamento de processo: o que precisa estar operando a jusante (se parar, o equipamento desarma)
function ilk(t, o) {
  if (o.k === 'pn') return [['03TC005', bOn('03TC005')], ['03TC002', bOn('03TC002')], ['03TC003', bOn('03TC003')]];
  if (o.k === 'cone' || o.k === 'vsi') return [['03TC004', bOn('03TC004')]];
  return { '03TC001': [['peneira', anyOn('pn')]], '03TC004': [['03TC001', bOn('03TC001')]], '03TC006': [['03TC001', bOn('03TC001')]] }[t] || [];
}
// permissivos de partida: [texto, ok]
export function perms(t) {
  const o = itemOf(t); if (!o) return [];
  const P = [['Sem bloqueio de energia (LOTO)', !o.lock && !o.mnt], ['Desarme rearmado', !o.trip], ['Botão de emergência destravado', !o.es]];
  for (const [n, ok] of ilk(t, o)) P.push([n === 'peneira' ? 'Ao menos uma peneira operando (jusante)' : `Correia ${n} operando (jusante)`, ok]);
  if (o.k === 'cone') P.push(['Bomba de lubrificação ligada', !!o.lube], ['Pressão de óleo estabelecida (≥ 5 s de bomba)', !!o.lube && o.lubeT >= 5], ['Câmara desobstruída', !o.choke]);
  if (o.k === 'vsi') P.push(['Tampa de inspeção fechada', !!o.lid], ['Proteção das correias em V fechada', !!o.guard]);
  if (o.k === 'tc') P.push(['Cordão de emergência rearmado', !o.cord], ['Alinhamento da correia < 20°', o.align < 20]);
  return P;
}
const syncEq = (t, c) => { if (sim.eq[t] && sim.cmdEq) sim.cmdEq(t, c); };
// estado de comando completo (desarme, bloqueio, seletor, emergência, óleo, tampas, cordão, alinhamento) espelhado no simulador
export const ctlOf = (t) => { const o = itemOf(t); if (!o) return null; return o.k === 'tc' ? { on: !!o.on, trip: o.trip || null, lock: !!o.lock, mode: o.mode, es: !!o.es, cord: !!o.cord, align: +(+o.align || 0).toFixed(1) }
  : { on: !!o.on, trip: o.trip || null, lock: !!o.lock, mode: o.mode, es: !!o.es, lube: o.lube, choke: !!o.choke, lid: o.lid, guard: o.guard }; };
export const syncCtl = (t) => { if (sim.cmdCtl && itemOf(t)) sim.cmdCtl(t, ctlOf(t)); };
function halt(t, why) { const o = itemOf(t); if (!o) return; const was = o.on; o.on = false; if (o.k === 'vsi' && was) o.coast = 25;
  if (why) { o.trip = why; logEv('Desarme', `${t}: ${why}`); } if (was) syncEq(t, { on: false }); syncCtl(t); }
// comandos (src: 'R' sala de controle, 'L' botoeira no campo) → { ok, msg }
export function cmd(t, a, src = 'R', v = 0) {
  const o = itemOf(t); if (!o) return { ok: false, msg: 'tag inexistente' };
  const no = (m) => { logEv('Comando negado', `${t}: ${m}`); sim.lastNo = { tag: t, a, msg: m, rt: sim.rt || 0, locked: !!o.lock }; (sim.denied = sim.denied || []).push(sim.lastNo); return { ok: false, msg: m }; },
    yes = (m) => { logEv('Comando', `${t}: ${m}${src === 'L' ? ' (campo)' : ''}`); setTimeout(() => syncCtl(t), 0); return { ok: true, msg: m }; };
  switch (a) {
    case 'start': { if (o.on) return no('já está operando');
      if (o.mode !== src) return no(src === 'R' ? 'seletor em LOCAL: a partida é feita na botoeira do campo (ou passe o seletor para REMOTO)' : 'seletor em REMOTO: passe o seletor para LOCAL para ligar pela botoeira, ou ligue pela sala de controle');
      const bad = perms(t).filter((p) => !p[1]); if (bad.length) return no('permissivo ausente: ' + bad.map((p) => p[0]).join('; '));
      o.on = true; o.st0 = sim.rt || 0; syncEq(t, { on: true }); return yes('partida'); }
    case 'stop': if (!o.on) return no('já está parado'); if (src === 'R' && o.mode !== 'R') return no('seletor em LOCAL: pare pela botoeira'); halt(t); return yes('parada');
    case 'estop': o.es = true; if (o.on) halt(t, 'botão de emergência acionado'); else o.trip = 'botão de emergência acionado'; return yes('EMERGÊNCIA acionada');
    case 'release': o.es = false; return yes('botão de emergência destravado (girar para soltar)');
    case 'reset': if (o.es) return no('destrave o botão de emergência antes de rearmar'); if (o.cord) return no('rearme o cordão de emergência no campo'); if (o.k === 'tc' && o.align >= 20) return no('corrija o alinhamento da correia');
      if (o.choke) return no('faça a limpeza da câmara antes de rearmar'); o.trip = null; return yes('rearmado');
    case 'mode': if (o.on && src !== 'L') return no('o seletor fica na botoeira do campo'); o.mode = o.mode === 'R' ? 'L' : 'R'; return yes(`seletor em ${o.mode === 'R' ? 'REMOTO' : 'LOCAL'}`);
    case 'lock': if (o.on) return no('pare o equipamento antes de bloquear'); if (o.k === 'vsi' && o.coast > 0) return no('rotor ainda girando: aguarde a parada total'); o.lock = { t: Date.now() }; return yes('bloqueio aplicado (seccionadora aberta, cadeado e etiqueta)');
    case 'unlock': if (o.mnt) return no('conclua a manutenção antes de retirar o bloqueio'); o.lock = null; return yes('bloqueio retirado');
    case 'lube': if (o.k !== 'cone') return no('sem unidade de lubrificação'); o.lube = !o.lube; o.lubeT = 0; return yes(o.lube ? 'bomba de lubrificação ligada' : 'bomba de lubrificação desligada');
    case 'clear': if (o.k !== 'cone') return no('sem sistema de limpeza'); if (o.on) return no('a limpeza da câmara é feita com o britador parado'); if (!o.choke) return no('câmara já está desobstruída'); o.clearT = sim.rt; return yes('limpeza hidráulica da câmara iniciada');
    case 'css': if (o.k !== 'cone') return no('sem ajuste de APF'); sim.css = clamp(sim.css + (+v || 0), 13, 30); return yes(`APF ajustada para ${sim.css} mm`);
    case 'lid': case 'guard': if (o.k !== 'vsi') return no('sem proteção intertravada'); if (o.on || o.coast > 0) return no('rotor girando: aguarde a parada total para abrir');
      if (o[a] && !o.lock) return no('aplique o bloqueio (LOTO) antes de abrir'); o[a] = !o[a]; return yes(`${a === 'lid' ? 'tampa de inspeção' : 'proteção das correias em V'} ${o[a] ? 'fechada' : 'aberta'}`);
    case 'cord': if (o.k !== 'tc') return no('sem cordão de emergência'); o.cord = true; if (o.on) halt(t, 'cordão de emergência acionado'); else o.trip = 'cordão de emergência acionado'; return yes('cordão de emergência puxado');
    case 'cordReset': o.cord = false; return yes('chave do cordão rearmada no campo');
    case 'align': if (o.on) return no('pare a correia para ajustar os roletes'); if (!o.lock) return no('aplique o bloqueio (LOTO) antes de intervir na correia'); o.align = 2; return yes('roletes ajustados: correia alinhada');
  }
  return no('comando desconhecido');
}
// sequência automática pela sala de controle (itens em REMOTO; bloqueados ou em manutenção ficam de fora)
export function seq(dir) { if (sim.seq) return { ok: false, msg: 'sequência já em andamento' }; const L = dir === 'start' ? SEQ.slice() : SEQ.slice().reverse();
  sim.seq = { dir, L, i: 0, t: sim.rt || 0, msg: dir === 'start' ? 'Partida sequencial iniciada' : 'Parada sequencial iniciada' }; logEv('Sequência', sim.seq.msg); return { ok: true }; }
export function seqAbort(why) { if (!sim.seq) return; logEv('Sequência', 'interrompida: ' + why); sim.seq = null; sim.seqMsg = 'Sequência interrompida: ' + why; }
function seqStep() { const S = sim.seq; if (!S || sim.rt - S.t < 1.6) return; S.t = sim.rt;
  while (S.i < S.L.length) { const t = S.L[S.i], o = itemOf(t); S.i++;
    if (S.dir === 'start') { if (o.on || o.lock || o.mnt) continue; if (o.mode !== 'R') { seqAbort(`${t} em LOCAL`); return; }
      if (o.k === 'cone' && !o.lube) { o.lube = true; o.lubeT = 0; logEv('Sequência', `${t}: bomba de lubrificação ligada`); }
      if (o.k === 'cone' && o.lubeT < 5) { S.i--; S.msg = `${t}: aguardando pressão de óleo`; return; }
      const r = cmd(t, 'start', 'R'); if (!r.ok) { seqAbort(`${t} — ${r.msg}`); return; } S.msg = `${t} partiu (${S.i}/${S.L.length})`; return; }
    if (!o.on) continue; if (o.mode !== 'R') { seqAbort(`${t} em LOCAL`); return; } cmd(t, 'stop', 'R'); S.msg = `${t} parou (${S.i}/${S.L.length})`; return; }
  sim.seqMsg = (S.dir === 'start' ? 'Partida' : 'Parada') + ' sequencial concluída'; logEv('Sequência', sim.seqMsg); sim.seq = null; }
// a cada passo: tempos de bomba, limpeza, parada do rotor, desalinhamento e intertravamentos
function ctlStep() {   /* tempos em segundos reais (independem da taxa de quadros) */
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000, dt = sim._rt0 ? Math.min(.5, now - sim._rt0) : 0; sim._rt0 = now; sim.rt = (sim.rt || 0) + dt;
  seqStep();
  for (const [t, e] of Object.entries(sim.eq)) {
    if (e.k === 'cone') { e.lubeT = e.lube ? (e.lubeT || 0) + dt : 0;
      if (e.on && !e.lube) { e._lp = (e._lp || 0) + dt; if (e._lp > 3) halt(t, 'pressão do óleo de lubrificação baixa'); } else e._lp = 0;
      if (e.on && e.load > 1.2) { e._ch = (e._ch || 0) + dt; if (e._ch > 20) { e.choke = true; halt(t, 'câmara afogada (sobrecarga contínua)'); } } else e._ch = 0;
      if (e.clearT && sim.rt - e.clearT > 5) { e.clearT = 0; e.choke = false; logEv('Comando', `${t}: câmara desobstruída`); } }
    if (e.k === 'vsi' && e.coast > 0) e.coast = Math.max(0, e.coast - dt);
  }
  for (const [t, b] of Object.entries(sim.belts)) {
    if (b.on) { b.align = clamp(b.align + (Math.random() - .5) * dt * .6 + (sim.moist > 9 ? dt * .04 : 0) - (b.align > 6 ? dt * .03 : 0), 0, 25); b.spd = Math.min(100, (sim.rt - (b.st0 ?? -99)) / 3 * 100); }
    else b.spd = Math.max(0, b.spd - dt * 40);
    if (b.on && b.align >= 20) halt(t, 'chave de desalinhamento: 20° (parada)');
  }
  for (const t of SEQ) { const o = itemOf(t); if (!o.on) continue; const f = ilk(t, o).find((q) => !q[1]); if (f) halt(t, `intertravamento: ${f[0] === 'peneira' ? 'peneiras paradas' : f[0] + ' parada'}`); }
}
// ---------- circuito fechado com balanço de massa e granulometria coerentes (Rosin–Rammler truncada, % passante acumulado)
// Fontes: [real] dissertação Figueiredo (UFMG, 2019) — Britagem 01 de Germano: ROM < 150 mm, decks de 30 mm e 12,5 mm,
// produto < 12,5 mm; [TCC] Usina II: 8 peneiras banana, HP 400 + Barmac; [adotado] finos do ROM, inclinações das curvas,
// P80 do HP ≈ 1,45·APF, razão do Barmac ≈ 2,1:1, eficiências das peneiras.
export const SRC = { top: 150, d1: 25.4, d2: 12.5 };   // 1º deck 25,4 mm; 2º deck 14 mm (corte efetivo do produto 12,5 mm) — apostila C3
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
    // F80 da alimentação do Barmac = retido no 2º deck (faixa −25,4 +12,5 mm + finos mal classificados)
    const R2 = (x) => (x <= D2 ? e1 * (1 - e2) * mix(x) : x <= D1 ? e1 * ((1 - e2) * pB + mix(x) - pB) : e1 * ((1 - e2) * pB + pA - pB)) / Math.max(1e-6, e1 * ((1 - e2) * pB + pA - pB));
    F80v = bisSim(R2, .8, .5, D1); vsi = rrSim(F80v / VSI_RR, 1.1);
  }
  const pA = mix(D1), pB = mix(D2);
  const R1 = (x) => (x <= D1 ? (1 - e1) * mix(x) : (1 - e1) * pA + mix(x) - pA) / Math.max(1e-6, 1 - e1 * pA);
  return { rom, hp, vsi, mix, r1, r2, prod, p12: pB, p32: pA, F80hp: bisSim(R1, .8, 1, 2000), F80v, P80hp: hp.p80, P80v: vsi.p80,
    feedP80: bisSim(mix, .8, .1, 2000), prodP80: bisSim((x) => mix(x) / pB, .8, .05, D2) };
}
// ---------- CIRCUITO EM DOIS ESTÁGIOS (fluxograma da Britagem 01, dissertação 2019) — balanço por classes de tamanho
// 1) peneiramento primário do ROM (12,5 mm): fino → pilha/concentrador; retido → pilha de regularização
// 2) peneiras da britagem primária (25,4 / 14 mm): > 25,4 → cônicos (circuito fechado); −25,4 +12,5 → Barmac; < 12,5 → produto
// 3) Barmac em circuito fechado com peneiras próprias (16 / 12,5 mm): > 12,5 volta ao Barmac; < 12,5 → produto
const NB = 90, XG = Array.from({ length: NB }, (_, k) => .05 * Math.pow(150 / .05, k / (NB - 1)));   // limites superiores das classes (mm)
const toBins = (cum) => { const m = new Float64Array(NB); let prev = 0; for (let k = 0; k < NB; k++) { const c = cum(XG[k]); m[k] = Math.max(0, c - prev); prev = c; } return m; };
const sumB = (m) => m.reduce((a, b) => a + b, 0);
const cumB = (m) => { const t = sumB(m) || 1; return (x) => { if (x >= XG[NB - 1]) return 1; let c = 0; for (let k = 0; k < NB; k++) { const lo = k ? XG[k - 1] : 0; if (x >= XG[k]) c += m[k]; else { if (x > lo) c += m[k] * Math.log(x / Math.max(lo, 1e-3)) / Math.log(XG[k] / Math.max(lo, 1e-3)); break; } } return c / t; }; };
const p80B = (m) => bisSim(cumB(m), .8, .05, 150);
// peneira: classes abaixo da abertura passam com eficiência e; o resto fica retido
const screenB = (m, a, e) => { const u = new Float64Array(NB), o = new Float64Array(NB); for (let k = 0; k < NB; k++) { const f = XG[k] <= a ? e : 0; u[k] = m[k] * f; o[k] = m[k] * (1 - f); } return [u, o]; };
const addB = (...ms) => { const r = new Float64Array(NB); for (const m of ms) for (let k = 0; k < NB; k++) r[k] += m[k]; return r; };
const crushB = (mass, c) => { const b = toBins((x) => pasSim(c, x)), t = sumB(b) || 1; return b.map((v) => v * mass / t); };
export function circSolve2(css, f12, e2, e1) {
  const rom = romCurve(clamp(f12, .25, .9)), R = toBins((x) => pasSim(rom, x));
  const hp = rrSim(1.45 * css, 1.3);
  const [u0, O] = screenB(R, SRC.d2, e2);                                   // peneiramento primário
  let coneP = new Float64Array(NB), vsiOver = new Float64Array(NB), vsi = rrSim(10, 1.1), F80v = 20;
  let S1 = O, toCone = O, mid = O, vsiFeed = O, uS1 = O, uB = O, Bscr = O;
  for (let it = 0; it < 120; it++) {
    S1 = addB(O, coneP);                                                      // peneiras da britagem primária
    const [p1, o1] = screenB(S1, SRC.d1, e1); toCone = o1;
    const [p2, o2] = screenB(p1, SRC.d2, e2); uS1 = p2; mid = o2;
    coneP = crushB(sumB(toCone), hp);
    vsiFeed = addB(mid, vsiOver); F80v = p80B(vsiFeed); vsi = rrSim(F80v / VSI_RR, 1.1);
    Bscr = crushB(sumB(vsiFeed), vsi);                                        // peneiras do Barmac
    const [pb, ob] = screenB(Bscr, SRC.d2, e2); uB = pb; vsiOver = ob;
  }
  const prodB = addB(u0, uS1, uB), feedAll = addB(R, S1, Bscr);
  const tF = sumB(R) + sumB(S1) + sumB(Bscr), coneF = sumB(toCone), vsiF = sumB(vsiFeed);
  return { two: true, rom, hp, vsi, tF, coneF, vsiF, u0: sumB(u0), oversize: sumB(O),
    circRet: (sumB(coneP) + sumB(vsiOver)) / Math.max(1e-6, sumB(O)),            // retorno aos britadores ÷ alimentação da britagem
    mix: cumB(feedAll), prodCum: cumB(prodB), p12: 1, F80hp: p80B(toCone), F80v, P80hp: hp.p80, P80v: vsi.p80,
    feedP80: p80B(feedAll), prodP80: p80B(prodB), r1: coneF / tF, r2: vsiF / tF };
}
let REF = null;   // referência (APF 20 mm, ROM padrão, peneiras 92 %) para o F80 da moagem no simulador
export function logEv(tipo, txt) { const d = new Date(); sim.log.unshift({ h: d.toLocaleTimeString('pt-BR'), tipo, txt }); if (sim.log.length > 120) sim.log.pop(); }
let lastSave = 0;
export function stepSim(dt, speed = 60) {                       // speed: segundos simulados por segundo real (desgaste)
  sim.t += dt; ctlStep();
  const E = sim.eq, on = (k) => Object.values(E).filter((e) => e.k === k && e.on).length;
  const nPN = on('pn'), nC = on('cone'), nV = on('vsi');
  // frações retidas e carga circulante saem do balanço granulométrico (circSolve) com a eficiência média atual das peneiras
  const e2 = clamp((sim._effM || 92) / 100, .4, .99), e1 = Math.min(.99, e2 + .04);
  VSI_RR = 2.1 * Math.pow(clamp(sim.rpm, 900, 2100) / 1450, 1.6) * (1 - .55 * clamp(sim.casc, 0, 50) / 100) / (1 - .55 * .10);
  const CS = circSolve2(sim.css, sim.f12, e2, e1), r1 = CS.r1, r2 = CS.r2;
  const F = sim.running && nPN > 0 && bOn('03TC006') && bOn('03TC001') ? Math.min(sim.feed, 6000 * sim.tcld / 100) : 0;
  const wet = Math.max(0, sim.moist - 9);                       // minério úmido: peneiramento menos eficiente (colmatação)
  // sem britagem disponível o retido não fecha o circuito: alimentação limitada
  const cap1 = bOn('03TC002') ? nC * CAP.cone : 0, cap2 = bOn('03TC003') ? nV * CAP.vsi : 0;
  let T = F * CS.tF;                                            // alimentação somada das peneiras (primárias + britagem + Barmac)
  const lim = Math.min(cap1 > 0 ? cap1 / r1 : 0, cap2 > 0 ? cap2 / r2 : 0) * 1.15;
  const limited = T > lim; if (limited) T = lim;
  const prod = T / CS.tF;
  const hum = Math.sin(sim.t * .17) * .25 + Math.sin(sim.t * .041) * .15;
  let kw = 0, alarms = [];
  for (const [tag, e] of Object.entries(E)) {
    const n = e.k === 'pn' ? nPN : e.k === 'cone' ? nC : nV, total = e.k === 'pn' ? T : e.k === 'cone' ? T * r1 : T * r2;
    if (e.mnt) { e.on = false; e.mnt.h = (e.mnt.h || 0) + dt * Math.max(speed, 180) / 3600; if (e.mnt.h >= (e.mnt.dur || MNT[e.k].h)) finishMnt(tag, e); }   // em manutenção: bloqueado, conta as horas e conclui no fim do plano
    e.flow = e.on && n ? total / n : 0; e.load = e.flow / CAP[e.k];
    const run = e.on && e.flow > 0;
    e.kw = !run ? 0 : e.k === 'pn' ? 45 + 20 * e.load : e.k === 'cone' ? 160 + 230 * e.load + (18 - sim.css) * 4 : 180 + 380 * e.load;
    e.vib = !run ? 0 : (e.k === 'pn' ? 2.6 : 2.3) + Math.max(0, e.load - .9) * 7 + e.w / 100 * 3 + hum;
    e.oil = !run ? 26 : 38 + 18 * e.load + e.w * .05;
    if (e.k === 'vsi') { const v = vsiTip(sim.rpm); e.tip = run ? v : 0; e.kw = !run ? 0 : (140 + 330 * e.load * (1 - .4 * sim.casc / 100)) * Math.pow(v / 75, 2);
      e.tA = !run ? 30 : 52 + 30 * e.load * Math.pow(v / 75, 2) + hum * 2; e.tB = e.tA + 1.5 + Math.sin(sim.t / 40) * .8; e.tBr = !run ? 28 : 46 + 22 * e.load + e.w * .08 + Math.max(0, e.vib - 4) * 3; }
    if (e.k === 'cone') { if (e.n2 == null) e.n2 = 83 - Math.random() * 3; e.n2 = Math.max(55, e.n2 - dt * speed / 86400 * .12); e.oilP = !e.lube ? 0 : !run ? 1.7 : 1.9 + .6 * e.load - e.w * .004 - Math.max(0, e.oil - 55) * .02;
      e.ring = (e.ring || 0) + (run && e.load > 1.05 ? dt * speed / 3600 * (e.load - 1.05) * 20 : 0); }
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
    e.st = e.mnt ? 'mnt' : !e.on ? 'off' : (e.w >= 95 || e.vib >= 11 || e.load > 1.25) ? 'crit' : (e.w >= 85 || e.vib >= 7.1 || e.oil >= 65 || e.load > 1.05 || (e.k === 'pn' && e.eff < 80)) ? 'warn' : 'ok';
    if (e.k === 'cone' && e.n2 < 75) alarms.push({ tag, st: e.n2 < 65 ? 'crit' : 'warn', why: `pré-carga N₂ dos acumuladores ${e.n2.toFixed(0)} bar (nominal 83 bar) — recarregar` });
    if (e.k === 'cone' && run && e.oilP < 1.4) alarms.push({ tag, st: 'warn', why: `pressão do óleo baixa ${e.oilP.toFixed(1)} bar — verificar filtro e bomba` });
    if (e.k === 'cone' && e.ring > 1) alarms.push({ tag, st: e.ring > 3 ? 'crit' : 'warn', why: `movimento do anel de ajuste (${e.ring.toFixed(1)} ocorrências) — sobrecarga: abrir a APF ou reduzir a alimentação` });
    if (e.k === 'vsi' && run && Math.max(e.tA, e.tB) > 95) alarms.push({ tag, st: 'warn', why: `VOCS: temperatura de motor ${Math.max(e.tA, e.tB).toFixed(0)} °C` });
    if (e.k === 'vsi' && run && e.tBr > 80) alarms.push({ tag, st: e.tBr > 90 ? 'crit' : 'warn', why: `VOCS: temperatura dos mancais ${e.tBr.toFixed(0)} °C — engraxar/verificar cartucho` });
    if (e.st === 'warn' || e.st === 'crit') alarms.push({ tag, st: e.st, why: [e.load > 1.05 ? `sobrecarga ${Math.round(e.load * 100)} %` : '', e.vib >= 7.1 ? `vibração ${e.vib.toFixed(1)} mm/s` : '', e.w >= 85 ? `desgaste ${Math.round(e.w)} %` : '', e.k === 'pn' && run && e.eff < 80 ? `eficiência ${Math.round(e.eff)} %` : ''].filter(Boolean).join(', ') });
    kw += e.kw;
  }
  // correias e desarmes pendentes
  for (const [t, b] of Object.entries(sim.belts)) { if (b.align >= 10 && b.align < 20) alarms.push({ tag: t, st: 'warn', why: `desalinhamento ${b.align.toFixed(0)}° (alarme 10°, parada 20°) — ajustar roletes` });
    if (b.cord) alarms.push({ tag: t, st: 'crit', why: 'cordão de emergência acionado — rearmar no campo' }); }
  for (const t of SEQ) { const o = itemOf(t); if (o.trip && !o.on) alarms.push({ tag: t, st: 'crit', why: `desarmado: ${o.trip} — rearmar` }); else if (o.es) alarms.push({ tag: t, st: 'crit', why: 'botão de emergência travado' }); }
  // UMIDADE DO ROM: alerta antecipado de colmatação (amarelo a partir de 8,5 % ou subindo; vermelho a partir de 9,5 %)
  if (!sim._mh) sim._mh = [];
  const mh = sim._mh; if (!mh.length || sim.t - mh[mh.length - 1].t >= 2) { mh.push({ t: sim.t, m: sim.moist }); while (mh.length && sim.t - mh[0].t > 120) mh.shift(); }
  const mRise = mh.length > 1 ? sim.moist - mh[0].m : 0;
  const um = { m: sim.moist, rise: mRise, st: sim.moist >= 9.5 ? 'crit' : (sim.moist >= 8.5 || (sim.moist >= 8 && mRise > .15)) ? 'warn' : 'ok' };
  if (um.st !== 'ok' && F > 0) alarms.unshift({ tag: 'Umidade do ROM', st: um.st, why: um.st === 'crit' ? `${um.m.toFixed(1).replace('.', ',')} %: colmatação nas peneiras, eficiência e capacidade em queda` : `${um.m.toFixed(1).replace('.', ',')} %${mRise > .15 ? ' e subindo' : ''}: risco amarelo de colmatação nas peneiras` });
  // CURVAS GRANULOMÉTRICAS e EFICIÊNCIAS (mesmo circuito do balanço de massa)
  const effs = Object.values(E).filter((e) => e.k === 'pn' && e.on && e.flow > 0).map((e) => e.eff), effM = effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : 92; sim._effM = effM;
  if (!REF) REF = circSolve2(20, .55, .92, .96);
  const ST = { rom: CS.rom, hp: CS.hp, vsi: CS.vsi, r1: { p80: CS.F80hp }, r2: { p80: CS.F80v }, prod: { p80: CS.prodP80 } };
  const gran = { st: ST, feedP80: CS.feedP80, effM, pas: pasSim, mix: CS.mix, prodCum: CS.prodCum, p12: CS.p12, p80prod: CS.prodP80, f80moagem: CS.prodP80, ratio: CS.prodP80 / REF.prodP80 };
  const grp = (k) => Object.values(E).filter((e) => e.k === k && e.on && e.flow > 0), sum = (a, f) => a.reduce((s2, e) => s2 + f(e), 0);
  const crush = (k, F80, P80) => { const g2 = grp(k), fl = sum(g2, (e) => e.flow), kwg = sum(g2, (e) => e.kw); if (!fl) return null; const W = kwg / fl, den = 10 / Math.sqrt(P80 * 1000) - 10 / Math.sqrt(F80 * 1000), wio = den > 0 ? W / den : Infinity;
    return { n: g2.length, flow: fl, kw: kwg, W, F80, P80, rr: F80 / P80, wio, effE: isFinite(wio) ? clamp(sim.wi / wio, 0, 1.5) : 0, load: sum(g2, (e) => e.load) / g2.length }; };
  const pns = Object.values(E).filter((e) => e.k === 'pn'), nOn = Object.values(E).filter((e) => e.on).length;
  const disp = nOn / Object.keys(E).length, desemp = F > 0 ? clamp(prod / sim.capNom, 0, 1) : 0;   // desempenho: produção ÷ capacidade nominal do setor
  const qual = clamp(1 - .15 * (1 - e2) - .5 * sum(pns, (e) => Math.max(0, e.w - 85)) / 100 / Math.max(1, pns.length), .7, 1);
  const efic = { tag: e1 * e2 * 100, e1: e1 * 100, e2: e2 * 100, cone: crush('cone', CS.F80hp, CS.P80hp), vsi: crush('vsi', CS.F80v, CS.P80v), spec: prod > 0 ? kw / prod : 0, disp, desemp, qual, oee: disp * desemp * qual, wi: sim.wi };
  if (limited && F > 0) alarms.unshift({ tag: 'Circuito', st: 'crit', why: 'britagem insuficiente para o retido: alimentação limitada' });
  sim.kpi = { efic, gran, umid: um, F, T, prod, circ: F > 0 ? CS.circRet * 100 : 0, u0: CS.u0, ovr: CS.oversize, ret: prod * CS.oversize * CS.circRet, fines: prod * CS.u0, r1, r2, kw, limited, nPN, nC, nV, alarms, spec: prod > 0 ? kw / prod : 0 };
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
