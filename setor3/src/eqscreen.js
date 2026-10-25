import { call } from './api.js?v=20261025111256';
import { MNT, startMnt, finishMnt, perms, cmd, itemOf } from './sim.js?v=20261025111256';
// Tela do equipamento: abre ao clicar no equipamento no 3D (ou na etiqueta/tabela). Funcionamento, produção, tendência,
// manutenção e especificação técnica, com valores ao vivo do modelo de processo. Alimentadores 03AL abrem a tela da peneira.

const CSS = `
.s3eq{position:fixed;right:14px;top:96px;z-index:7;width:min(440px,calc(100vw - 28px));max-height:calc(100vh - 112px);overflow:auto;border-radius:12px;background:rgba(14,24,38,.95);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.45);color:#dce6ee;font:12.5px/1.45 system-ui}
.s3eq .hd{position:sticky;top:0;background:rgba(14,24,38,.98);padding:12px 14px 8px;border-bottom:1px solid rgba(120,170,235,.25);z-index:1}
.s3eq .hd h3{margin:0;font-size:17px;color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}.s3eq .hd small{color:#9fb0bd}.s3eq .hd .x{margin-left:auto;border:0;background:none;color:#cfd6dc;font-size:22px;cursor:pointer;line-height:1}
.s3eq .chip{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:700}.s3eq .chip.ok{background:#1f8a5b;color:#fff}.s3eq .chip.warn{background:#d98a00;color:#fff}.s3eq .chip.crit{background:#d0362b;color:#fff}.s3eq .chip.off{background:#59636c;color:#fff}
.s3eq h4{margin:12px 14px 6px;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:#ffd24a}
.s3eq .g{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px}.s3eq .g div{background:rgba(255,255,255,.05);border-radius:5px;padding:6px 8px;border-left:3px solid #2c4d75}
.s3eq .g div.warn{border-color:#ffb020}.s3eq .g div.crit{border-color:#ff5a4a}.s3eq .g b{display:block;font:600 15px ui-monospace,Menlo,monospace;color:#fff}.s3eq .g span{color:#9fb0bd;font-size:11px}
.s3eq canvas{width:calc(100% - 28px);height:120px;margin:0 14px;display:block;background:#0b1622;border-radius:6px}
.s3eq table{width:calc(100% - 28px);margin:0 14px;border-collapse:collapse;font-size:12px}.s3eq td{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.07)}.s3eq td:last-child{text-align:right;color:#fff}
.s3eq .bar{height:8px;border-radius:4px;background:rgba(255,255,255,.1);margin:4px 14px 0;overflow:hidden}.s3eq .bar i{display:block;height:100%}
.s3eq .act{display:flex;gap:8px;padding:12px 14px 14px}.s3eq .act button{flex:1;border:0;border-radius:8px;padding:8px;font:700 12px system-ui;cursor:pointer;color:#fff;background:#1f3a5c}
.s3eq .act button.on{background:#c0392b}.s3eq .act button.off{background:#1f8a5b}.s3eq .act button.mnt{background:#2c6fd6}.s3eq .act button:disabled{opacity:.45;cursor:not-allowed}.s3eq .chip.mnt{background:#2c6fd6;color:#fff;border-color:#2c6fd6}.s3eq .act button.mntp{flex:3;position:relative;overflow:hidden;background:#13294d;padding:6px 8px;text-align:left;cursor:default;opacity:1}.s3eq .mntp .bar{position:absolute;left:0;top:0;bottom:0;width:var(--p);background:linear-gradient(90deg,#2c6fd6,#58a6ff);transition:width .4s}.s3eq .mntp b,.s3eq .mntp small{position:relative;display:block}.s3eq .mntp small{font:500 10.5px/1.25 system-ui;opacity:.95;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.s3mrep{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(3,10,20,.55);backdrop-filter:blur(3px)}.s3mrep .bx{width:min(520px,92vw);max-height:86vh;overflow:auto;background:rgba(10,24,44,.97);border:1px solid #2c6fd6;border-radius:12px;padding:16px 18px;color:#fff;font:13px/1.5 system-ui;box-shadow:0 20px 60px rgba(0,0,0,.6)}.s3mrep h3{margin:0 0 4px;font-size:17px;color:#7fb8ff}.s3mrep table{width:100%;border-collapse:collapse;margin:8px 0}.s3mrep td{padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.08)}.s3mrep td:last-child{text-align:right;font-weight:700}.s3mrep ul{margin:6px 0 10px;padding-left:4px;list-style:none}.s3mrep li::before{content:'✓ ';color:#3ad07a;font-weight:700}.s3mrep .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}.s3mrep button{border:0;border-radius:8px;padding:8px 14px;font:700 12px system-ui;color:#fff;background:#1f3a5c;cursor:pointer}.s3mrep button.on{background:#1f8a5b}.s3eq p.n{margin:4px 14px 0;color:#9fb0bd;font-size:11.5px}
.s3eq .lpx{margin:0 14px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.s3eq .lpx.bt{background:linear-gradient(#3a4148,#2a3036);border-color:#59626b}
.s3eq .lprow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0}.s3eq .lprow b{font:600 12.5px ui-monospace,Menlo,monospace;color:#fff}
.s3eq .lprow button{border:1px solid rgba(255,255,255,.18);background:#1f3a5c;color:#fff;border-radius:6px;padding:5px 8px;font:600 11.5px system-ui;cursor:pointer}.s3eq .lprow button:disabled{opacity:.4;cursor:not-allowed}
.s3eq .lprow button.rd{background:#8c2a20}.s3eq .lprow button.gr2{background:#1f8a5b}
.s3eq .lmp{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#cfd6dc;margin-right:6px}.s3eq .lmp i{width:12px;height:12px;border-radius:50%;background:#2b2f33;border:2px solid #555;box-shadow:inset 0 -2px 3px rgba(0,0,0,.5)}
.s3eq .lmp.on i{background:var(--c);border-color:#ddd;box-shadow:0 0 8px var(--c)}
.s3eq .lprow .pb{width:38px;height:38px;border-radius:50%;font:800 15px system-ui;border:3px solid #1b1b1b;box-shadow:0 3px 0 #111,inset 0 2px 3px rgba(255,255,255,.35)}.s3eq .lprow .pb:active{transform:translateY(2px);box-shadow:0 1px 0 #111}
.s3eq .lprow .pb.gr{background:#1fa060}.s3eq .lprow .pb.rd{background:#c8261b}.s3eq .lprow .pb.bl{background:#2a63c9}
.s3eq .lprow .es{width:60px;height:60px;padding:0;letter-spacing:-.02em;line-height:1;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ff6b5b,#b3140a 70%);border:5px solid #ffd21f;font:800 9px system-ui;box-shadow:0 4px 0 #6b0a03}.s3eq .lprow .es.in{transform:translateY(3px);box-shadow:0 1px 0 #6b0a03;filter:brightness(.8)}
.s3eq .lprow .sel{background:#111;border:2px solid #888;border-radius:6px;font:800 11px ui-monospace,monospace;padding:8px 7px}.s3eq .lprow .sel.l{color:#ffd24a}
.s3eq .lpx p.n{margin:4px 0 0}.s3eq details{margin:6px 0 2px;font-size:11.5px;color:#cfd6dc}.s3eq summary{cursor:pointer;color:#9fdcf0}.s3eq .pm{padding:1px 0}.s3eq .pm.ok{color:#7fe0a8}.s3eq .pm.no{color:#ff8a7a}
.s3eq .n.w{color:#ffb070}.s3eq .n.g{color:#7fe0a8}.s3eq .loto{margin-top:6px;padding:8px;border-radius:6px;background:rgba(255,210,74,.08);border:1px dashed #ffd24a;font-size:12px;color:#fff;display:grid;gap:4px}
@media (max-width:860px){.s3eq{top:70px;max-height:calc(100vh - 240px)}}
`;

const SPEC = {
  pn: { modelo: 'Peneira vibratória tipo banana Metso, 2 decks · 10 × 28 ft (3,0 × 8,5 m)', itens: [['Deck superior (1º)', 'abertura 25,4 mm · painéis de poliuretano'], ['Deck inferior (2º)', 'abertura 14 mm (produto < 12,5 mm)'], ['Função', 'primário 03PN001–004 (ROM) · secundário 03PN005–007 (produto do Barmac)'], ['Inclinação dos segmentos', '28° · 18° · 9°'], ['Acionamento', '2 vibradores · 2 × 30 kW · 440 V'], ['Frequência / amplitude', '≈ 16 Hz (960 rpm) · ≈ 9 mm'], ['Capacidade nominal (modelo)', '1.500 t/h']] },
  cone: { modelo: 'Britador cônico Metso Nordberg HP 400 · britagem primária · 260–854 t/h (com cascata)', itens: [['Motor', '315 kW · 4,16 kV'], ['APF (abertura na posição fechada)', '13 a 38 mm (ajuste pela coroa)'], ['Proteção', 'alívio hidráulico (acumuladores)'], ['Lubrificação', 'óleo · alarme acima de 65 °C'], ['Capacidade nominal (modelo)', '1.100 t/h']] },
  vsi: { modelo: 'Britador de impacto vertical Barmac 9100 (VSI) · britagem secundária · 690 t/h', itens: [['Acionamento', '2 × 300 kW · 4,16 kV · correias'], ['Rotor', 'Ø ≈ 990 mm · 1.450 rpm (≈ 75 m/s na ponta)'], ['Mecanismo', 'impacto rocha contra rocha (cascata)'], ['Lubrificação', 'óleo · alarme acima de 65 °C'], ['Capacidade nominal (modelo)', '900 t/h']] },
};
const KV = { pn: .44, cone: 4.16, vsi: 4.16 };   // tensão (kV) para estimar a corrente

const NOME = { pn: 'Peneira vibratória', cone: 'Britador cônico HP 400', vsi: 'Britador Barmac' };
export function buildEqScreen(root, sim, { fm, stTxt, logEv }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 's3eq'; el.hidden = true; root.appendChild(el);
  let tag = null, feeder = false;
  function chart(cv, e) {
    const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, pl = 34 * dpr, pt = 16 * dpr, pb = 12 * dpr, h = e.h || [];
    x.clearRect(0, 0, W, H); x.font = `600 ${10 * dpr}px system-ui`; x.fillStyle = '#cfd6dc'; x.fillText('Vazão (t/h) e vibração (mm/s)', pl, 11 * dpr);
    if (h.length < 2) { x.fillStyle = '#7b8a97'; x.fillText('Coletando dados…', pl, H / 2); return; }
    const t0 = h[0].t, t1 = h[h.length - 1].t, mf = Math.max(1, ...h.map((q) => q.flow)) * 1.15, mv = Math.max(8, ...h.map((q) => q.vib)) * 1.1;
    const sx = (t) => pl + (W - pl - 8 * dpr) * (t - t0) / Math.max(1, t1 - t0);
    x.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i <= 2; i++) { const y = pt + (H - pt - pb) * i / 2; x.beginPath(); x.moveTo(pl, y); x.lineTo(W, y); x.stroke(); x.fillStyle = '#7b8a97'; x.fillText(fm(mf * (1 - i / 2)), 2 * dpr, y + 3 * dpr); }
    const y71 = pt + (H - pt - pb) * (1 - 7.1 / mv); x.strokeStyle = 'rgba(255,176,32,.6)'; x.setLineDash([4 * dpr, 3 * dpr]); x.beginPath(); x.moveTo(pl, y71); x.lineTo(W, y71); x.stroke(); x.setLineDash([]);
    for (const [k, c, m] of [['flow', '#5cc6dc', mf], ['vib', '#ffb070', mv]]) { x.strokeStyle = c; x.lineWidth = 1.7 * dpr; x.beginPath(); h.forEach((q, i) => { const X = sx(q.t), Y = pt + (H - pt - pb) * (1 - q[k] / m); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); }
  }
  // BOTOEIRA DE CAMPO e painéis locais (funcionais): seletor local/remoto, liga, desliga, emergência, rearme, permissivos, LOTO e painéis próprios do equipamento
  const MSG = {}, LOTO = {};
  const LOTO_STEPS = ['Avisar a sala de controle e parar o equipamento', 'Abrir a chave seccionadora no CCM', 'Colocar o cadeado e a etiqueta pessoal', 'Tentar a partida na botoeira (teste de energia zero)'];
  function lp(t, o) {
    const P = perms(t), okP = P.every((p) => p[1]), m = MSG[t], L = LOTO[t], lk = !!o.lock;
    const lamp = (on, c, txt) => `<span class="lmp${on ? ' on' : ''}" style="--c:${c}"><i></i>${txt}</span>`;
    let spec = '';
    if (o.k === 'cone') spec = `<h4>Unidade de lubrificação e painel hidráulico</h4><div class="lpx">
        <div class="lprow">${lamp(o.lube, '#2fbf71', 'Bomba de óleo')}${lamp(o.lube && o.lubeT >= 5, '#2fbf71', 'Pressão OK')}<b>${fm(o.oilP || 0, 1)} bar · ${fm(o.oil)} °C</b></div>
        <div class="lprow"><button data-c="lube">${o.lube ? 'Desligar bomba' : 'Ligar bomba'}</button><button data-c="clear"${o.choke ? '' : ' disabled'}>Limpeza da câmara</button><button data-c="css" data-v="-1">APF −</button><b>${fm(sim.css)} mm</b><button data-c="css" data-v="1">APF +</button></div>
        <p class="n">${o.choke ? '⚠ Câmara afogada: faça a limpeza hidráulica com o britador parado e depois rearme.' : 'A bomba precisa estar ligada ≥ 5 s (pressão estabelecida) antes da partida do motor; sem pressão o britador desarma em 3 s.'}${o.clearT ? ' Limpeza em andamento…' : ''}</p></div>`;
    if (o.k === 'vsi') spec = `<h4>Proteções intertravadas</h4><div class="lpx"><div class="lprow">${lamp(o.lid, '#2fbf71', 'Tampa fechada')}${lamp(o.guard, '#2fbf71', 'Proteção das correias')}${lamp(o.coast > 0 || o.on, '#ffb020', o.coast > 0 ? `Rotor parando (${Math.ceil(o.coast)} s)` : 'Rotor girando')}</div>
        <div class="lprow"><button data-c="lid">${o.lid ? 'Abrir tampa de inspeção' : 'Fechar tampa'}</button><button data-c="guard">${o.guard ? 'Abrir proteção das correias' : 'Fechar proteção'}</button></div>
        <p class="n">Só abre com o rotor parado e o bloqueio aplicado; aberta, impede a partida.</p></div>`;
    if (o.k === 'tc') spec = `<h4>Dispositivos de campo da correia</h4><div class="lpx"><div class="lprow">${lamp(!o.cord, '#2fbf71', o.cord ? 'Cordão ACIONADO' : 'Cordão rearmado')}${lamp(o.align < 10, o.align >= 10 ? '#ffb020' : '#2fbf71', `Desalinhamento ${fm(o.align, 1)}°`)}${lamp(o.spd > 80, '#2fbf71', `Velocidade ${fm(o.spd)} %`)}</div>
        <div class="bar"><i style="width:${Math.min(100, o.align / 20 * 100)}%;background:${o.align >= 20 ? '#ff5a4a' : o.align >= 10 ? '#ffb020' : '#2fbf71'}"></i></div>
        <div class="lprow"><button data-c="cord" class="rd">Puxar cordão de emergência</button><button data-c="cordReset"${o.cord ? '' : ' disabled'}>Rearmar chave do cordão</button><button data-c="align">Ajustar roletes (alinhar)</button></div>
        <p class="n">Chave de desalinhamento: alarme a 10° e parada a 20°. O cordão trava até ser rearmado no campo. Ajuste dos roletes só com a correia parada e bloqueada.</p></div>`;
    return `<h4>Botoeira de campo (comando local)</h4><div class="lpx bt">
      <div class="lprow">${lamp(o.on, '#ff4b3a', 'Ligado')}${lamp(!o.on && okP, '#2fbf71', 'Pronto p/ partir')}${lamp(!!o.trip || !!o.es, '#ffb020', 'Falha / desarme')}${lk ? lamp(true, '#ffd24a', '🔒 Bloqueado') : ''}</div>
      <div class="lprow"><button class="sel${o.mode === 'L' ? ' l' : ''}" data-c="mode" title="Seletor local/remoto">${o.mode === 'L' ? 'LOCAL' : 'REMOTO'}</button>
        <button class="pb gr" data-c="start" title="Liga (botão verde)">I</button><button class="pb rd" data-c="stop" title="Desliga (botão vermelho)">O</button>
        <button class="es${o.es ? ' in' : ''}" data-c="${o.es ? 'release' : 'estop'}" title="${o.es ? 'Girar para destravar' : 'Parada de emergência'}">${o.es ? 'GIRAR' : 'EMERG.'}</button><button class="pb bl" data-c="reset" title="Rearme">R</button></div>
      <p class="n">${o.mode === 'R' ? '🔁 Seletor em <b>REMOTO</b>: o botão I não liga daqui — a partida é pela sala de controle (botão “Ligar” no fim desta tela). Para ligar pela botoeira, clique no seletor e passe para <b>LOCAL</b>.' : '🔧 Seletor em <b>LOCAL</b>: liga e desliga por esta botoeira; a sala de controle não consegue partir o equipamento.'} O botão O e a emergência param em qualquer posição.${o.trip ? ' Depois de um desarme, aperte <b>R</b> (rearme) antes de ligar.' : ''}</p>
      ${o.trip ? `<p class="n w">Desarme: ${o.trip}</p>` : ''}${m ? `<p class="n ${m.ok ? 'g' : 'w'}">${m.ok ? '✓' : '✗'} ${m.msg}</p>` : ''}
      <details${okP ? '' : ' open'}><summary>Permissivos de partida (${P.filter((p) => p[1]).length}/${P.length})</summary>${P.map((p) => `<div class="pm ${p[1] ? 'ok' : 'no'}">${p[1] ? '✓' : '✗'} ${p[0]}</div>`).join('')}</details>
      <div class="lprow">${lk ? `<button data-c="unlock">Retirar bloqueio</button>` : L ? '' : `<button data-c="lotoAsk">Aplicar bloqueio (LOTO)</button>`}</div>
      ${L && !lk ? `<div class="loto"><b>Bloqueio de energia (LOTO)</b>${LOTO_STEPS.map((s, j) => `<label><input type="checkbox" data-lk="${j}"${L[j] ? ' checked' : ''}> ${j + 1}. ${s}</label>`).join('')}<div class="lprow"><button data-c="lotoX">Cancelar</button><button class="gr2" data-c="lock"${L.every(Boolean) ? '' : ' disabled'}>Confirmar bloqueio</button></div></div>` : ''}
    </div>${spec}`;
  }
  function bindLp(t) {
    el.querySelectorAll('[data-c]').forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); const c = b.dataset.c;
      if (c === 'lotoAsk') { LOTO[t] = LOTO_STEPS.map(() => false); render(); return; } if (c === 'lotoX') { delete LOTO[t]; render(); return; }
      if (c === 'lock' && itemOf(t).on) { MSG[t] = { ok: false, msg: 'passo 1: pare o equipamento antes de bloquear' }; render(); return; }
      const r = cmd(t, c, 'L', +b.dataset.v || 0); MSG[t] = r; if (c === 'lock' && r.ok) delete LOTO[t]; render(); });
    el.querySelectorAll('[data-lk]').forEach((c) => c.onchange = () => { if (LOTO[t]) LOTO[t][+c.dataset.lk] = c.checked; render(); });
  }
  function renderBelt() {
    const o = sim.belts[tag]; if (!o) return; const st = o.trip || o.es || o.cord ? 'crit' : o.align >= 10 ? 'warn' : o.on ? 'ok' : 'off';
    el.innerHTML = `<div class="hd"><h3>Transportador de correia ${tag}<span class="chip ${st}">${o.on ? 'operando' : o.trip ? 'desarmado' : 'parado'}</span><button class="x" aria-label="Fechar">×</button></h3><small>${o.nome}</small></div>
      ${lp(tag, o)}<div class="act"><button class="${o.on ? 'on' : 'off'}" data-a="rtog">Sala de controle: ${o.on ? 'Desligar' : 'Ligar'}</button></div>`;
    el.querySelector('.x').onclick = close; bindLp(tag);
    el.querySelector('[data-a="rtog"]').onclick = () => { MSG[tag] = cmd(tag, o.on ? 'stop' : 'start', 'R'); render(); };
  }
  function render() {
    if (!tag || el.hidden) return; if (sim.belts && sim.belts[tag]) return renderBelt(); const e = sim.eq[tag]; if (!e) return;
    const S = SPEC[e.k], run = e.on && e.flow > 0, ts = e.st0 != null ? (sim.rt || 0) - e.st0 : 99, amp = (run ? e.kw / (1.732 * KV[e.k] * .88 * .95) : 0) * (e.on && ts < 4 ? 6 - 5 * ts / 4 : 1);   /* pico de partida ≈ 6× In por ~4 s */
    const cls = (v, w, c) => (v >= c ? 'crit' : v >= w ? 'warn' : '');
    const extra = e.k === 'pn' ? `<div class="${run && e.eff < 80 ? 'warn' : ''}"><b>${run ? fm(e.eff) + ' %' : '–'}</b><span>Eficiência de peneiramento</span></div><div><b>${run ? '16,0 Hz' : '0'}</b><span>Frequência de vibração</span></div>`
      : e.k === 'cone' ? `<div><b>${fm(sim.css)} mm</b><span>APF (abertura)</span></div><div><b>${run ? fm(55 + 70 * e.load + (20 - sim.css) * 1.5) + ' bar' : '–'}</b><span>Pressão hidráulica</span></div>
          <div class="${run && e.oilP < 1.4 ? 'warn' : ''}"><b>${run ? fm(e.oilP, 1) + ' bar' : '–'}</b><span>Pressão do óleo de lubrificação</span></div><div class="${e.n2 < 65 ? 'crit' : e.n2 < 75 ? 'warn' : ''}"><b>${fm(e.n2 || 83)} bar</b><span>Pré-carga N₂ dos acumuladores (nominal 83 · 6 acumuladores)</span></div>
          <div class="${e.ring > 3 ? 'crit' : e.ring > 1 ? 'warn' : ''}"><b>${fm(e.ring || 0, 1)}</b><span>Movimentos do anel de ajuste (sobrecarga)</span></div>`
        : `<div><b>${run ? fm(sim.rpm) + ' rpm' : '0'}</b><span>Rotação do rotor</span></div><div><b>${run ? fm(e.tip || 0) + ' m/s' : '–'}</b><span>Velocidade na ponta (faixa 50–85)</span></div><div><b>${fm(sim.casc)} %</b><span>Cascata (desvio do rotor)</span></div>
          <div class="${run && Math.max(e.tA, e.tB) > 95 ? 'warn' : ''}"><b>${run ? fm(e.tA) + ' / ' + fm(e.tB) + ' °C' : '–'}</b><span>VOCS · motores A / B</span></div><div class="${run && e.tBr > 90 ? 'crit' : run && e.tBr > 80 ? 'warn' : ''}"><b>${run ? fm(e.tBr) + ' °C' : '–'}</b><span>VOCS · mancais (cartucho)</span></div>`;
    const K = sim.kpi, share = e.k === 'pn' ? `${fm(e.flow)} de ${fm(K.T)} t/h da alimentação das peneiras` : e.k === 'cone' ? `${fm(e.flow)} de ${fm(K.T * K.r1)} t/h do retido no 1º deck` : `${fm(e.flow)} de ${fm(K.T * K.r2)} t/h do retido no 2º deck`;
    const wcol = e.w >= 95 ? '#ff5a4a' : e.w >= 85 ? '#ffb020' : '#2fbf71';
    // EFICIÊNCIA do equipamento (mesmo cálculo da seção "Eficiência do processo")
    const EF = sim.kpi.efic || {}, gC = e.k === 'cone' ? EF.cone : e.k === 'vsi' ? EF.vsi : null;
    let effBlock = '';
    if (e.k === 'pn') effBlock = `<h4>Eficiência</h4><div class="g"><div class="${run && e.eff < 80 ? 'warn' : ''}"><b>${run ? fm(e.eff, 1) + ' %' : '–'}</b><span>Recuperação de finos &lt; 12,5 mm (Taggart)</span></div><div><b>${fm(EF.tag || 0, 1)} %</b><span>Média do peneiramento (2 decks)</span></div></div>`;
    else if (gC && run) { const W = e.kw / Math.max(1, e.flow), den = 10 / Math.sqrt(gC.P80 * 1000) - 10 / Math.sqrt(gC.F80 * 1000), wio = den > 0 ? W / den : Infinity, ee = isFinite(wio) ? Math.min(1, sim.wi / wio) : 0;
      effBlock = `<h4>Eficiência</h4><div class="g"><div><b>${fm(gC.F80, 1)} → ${fm(gC.P80, 1)} mm</b><span>F80 → P80 · razão de redução ${fm(gC.rr, 2)}</span></div><div><b>${fm(W, 2)} kWh/t</b><span>Energia específica</span></div>
        <div><b>${isFinite(wio) ? fm(wio, 1) : '–'} kWh/t</b><span>Wio (Bond operacional)</span></div><div class="${ee < .35 ? 'crit' : ee < .6 ? 'warn' : ''}"><b>${fm(ee * 100)} %</b><span>Eficiência energética (Wi ${fm(sim.wi, 1)} ÷ Wio)</span></div></div>`; }
    const H = e.health, hcol = H == null ? '#9fb0bd' : H < 50 ? '#ff5a4a' : H < 75 ? '#ffb020' : '#2fbf71', hcl = H == null ? '' : H < 50 ? 'crit' : H < 75 ? 'warn' : '';
    const hTxt = H == null ? 'desligado' : H < 50 ? 'crítico' : H < 75 ? 'atenção' : 'bom';
    const rslTxt = !isFinite(e.rsl) ? '–' : e.rsl <= 0 ? 'trocar já' : e.rsl > 48 ? '≈ ' + fm(e.rsl / 24) + ' dias' : '≈ ' + fm(e.rsl) + ' h';
    const hp = e.hParts || {}, hWhy = H == null ? '' : `Saúde = 100 − desgaste ${fm(hp.desgaste)} − vibração ${fm(hp.vibracao)} − temperatura ${fm(hp.temperatura)} − sobrecarga ${fm(hp.sobrecarga)} pontos.`;
    el.innerHTML = `<div class="hd"><h3>${feeder ? 'Alimentador ' + tag.replace('PN', 'AL') + ' → ' : ''}${NOME[e.k]} ${tag}<span class="chip ${e.st}">${stTxt[e.st]}</span><button class="x" aria-label="Fechar">×</button></h3><small>${S.modelo}</small>${feeder ? `<div style="color:#9fdcf0;font-size:11.5px;margin-top:4px">Alimentador ${tag.replace('PN', 'AL')} (correia dosadora no piso +14 m) alimentando a peneira ${tag}.</div>` : ''}</div>
      ${lp(tag, e)}<h4>Funcionamento</h4><div class="g">
        <div><b>${run ? 'Operando' : e.on ? 'Sem carga' : 'Desligado'}</b><span>Estado</span></div>${(() => { const pN = e.k === 'pn' ? 65 : e.k === 'cone' ? 390 + (18 - sim.css) * 4 : 560, r = e.kw / pN; return `<div class="${run ? cls(r * 100, 105, 125) : ''}"><b>${fm(e.kw)} kW</b><span>Potência · nominal ${fm(pN)} kW (carga 100 %)${run && r > 1.05 ? ` · <b>${fm(r * 100)} %</b>` : ''}</span></div>`; })()}
        <div><b>${fm(amp)} A</b><span>Corrente estimada (${String(KV[e.k]).replace('.', ',')} kV)</span></div><div class="${cls(e.vib, 7.1, 11)}"><b>${run ? fm(e.vib, 1) + ' mm/s' : '–'}</b><span>Vibração (ISO 10816-3)</span></div>
        <div class="${cls(e.oil, 65, 75)}"><b>${fm(e.oil)} °C</b><span>${e.k === 'pn' ? 'Mancais dos vibradores' : 'Óleo de lubrificação'}</span></div>${extra}</div>
      <h4>Produção</h4><div class="g">
        <div><b>${fm(e.flow)} t/h</b><span>Vazão atual</span></div><div class="${cls(e.load * 100, 105, 125)}"><b>${fm(e.load * 100)} %</b><span>Carga (capacidade do modelo)</span></div>
        <div><b>${fm(e.tons || 0)} t</b><span>Processado nesta sessão</span></div><div><b>${fm(e.hrs || 0, 1)} h</b><span>Horas operando (tempo simulado)</span></div></div>
      <p class="n">${share}. Partidas na sessão: ${e.starts || 0}.</p>
      ${effBlock}
      <h4>Tendência</h4><canvas id="eqC"></canvas><p class="n">Linha tracejada: alerta de vibração (7,1 mm/s).</p>
      ${(() => { const CK = { pn: [['Diária', 'Inspeção visual dos decks, telas e molas'], ['Semanal', 'Vibradores: temperatura e lubrificação'], ['30 dias', 'Aperto dos parafusos e inspeção estrutural']],
          cone: [['Diária', 'Pressão do óleo e área de descarga (material depositado)'], ['Semanal', 'Lubrificar a rosca do anel de ajuste e do bojo'], ['30 dias', 'Pré-carga de N₂ dos acumuladores (83 bar)'], ['Troca de revestimento', 'Inspecionar revestimento da carcaça e proteções do braço']],
          vsi: [['Diária', 'Pontas do rotor (fixação e desgaste) e camada de rocha'], ['Semanal', 'Engraxar o cartucho do mancal; anteparos da cascata'], ['30 dias', 'Placas de desgaste, anel/tubo de alimentação e placas-guia']] }[e.k] || [];
        e.ck = e.ck || {}; return `<h4>Checklist de manutenção (manuais Metso)</h4><div class="ckl">${CK.map(([f, t], j) => `<label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0;font-size:12px"><input type="checkbox" data-ck="${j}" ${e.ck[j] ? 'checked' : ''}><span><b>${f}</b> · ${t}${e.ck[j] ? ` <i style="color:#7fe08a">feito ${e.ck[j]}</i>` : ''}</span></label>`).join('')}</div>`; })()}
      <h4>Manutenção</h4><div class="g"><div><b style="color:${wcol}">${fm(e.w)} %</b><span>Desgaste ${e.k === 'pn' ? 'do deck' : e.k === 'vsi' ? 'das pontas do rotor' : 'dos revestimentos'}</span></div><div><b>${isFinite(e.left) ? (e.left > 48 ? '≈ ' + fm(e.left / 24) + ' dias' : '≈ ' + fm(e.left) + ' h') : '–'}</b><span>Troca prevista</span></div>
        <div class="${hcl}"><b style="color:${hcol}">${e.health == null ? '–' : e.health + ' / 100'}</b><span>Saúde do ativo · ${hTxt}</span></div><div class="${isFinite(e.rsl) && e.rsl < 24 * 7 ? 'warn' : ''}"><b>${rslTxt}</b><span>Vida útil restante (RSL, até 95 % de desgaste)</span></div></div>
      <div class="bar"><i style="width:${Math.min(100, e.w)}%;background:${wcol}"></i></div>
      <p class="n">${hWhy}</p>
      <h4>Especificação técnica (ilustrativa)</h4><table>${S.itens.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      ${e.mnt ? (() => { const M = MNT[e.k], p = Math.min(1, (e.mnt.h || 0) / (e.mnt.dur || M.h)), i = Math.min(M.at.length - 1, Math.floor(p * M.at.length));
        return `<div class="act"><button class="off" disabled title="Partida bloqueada durante a manutenção" style="flex:0 0 56px;padding:8px 4px">🔒<br>Ligar</button><button class="mntp" style="--p:${(p * 100).toFixed(1)}%" title="${M.at.map((x, j) => (j < i ? '✓ ' : j === i ? '▶ ' : '· ') + x).join('\n')}"><span class="bar"></span><b>🔧 Manutenção ${fm(p * 100)} %</b><small>Etapa ${i + 1}/${M.at.length} · ${M.at[i]} · ${fm(e.mnt.h || 0, 1)} de ${fm(e.mnt.dur || M.h)} h</small></button><button class="mnt" data-a="mfin" title="Encerra a manutenção agora e mostra o relatório" style="flex:0 0 72px;padding:8px 4px">Concluir</button><button data-a="os"${OSST[tag] && OSST[tag].busy ? ' disabled' : ''}>${OSST[tag] && OSST[tag].busy ? 'Registrando…' : 'Gerar OS simulada'}</button></div>`; })()
      : `<div class="act"><button class="${e.on ? 'on' : 'off'}" data-a="tog" title="Comando remoto (sala de controle)">${e.on ? 'Desligar' : 'Ligar'}</button><button class="mnt" data-a="mnt" title="Desliga, bloqueia a partida, coloca os alarmes fora de serviço e executa o plano de manutenção">Manutenção</button><button data-a="wear">Registrar troca</button><button data-a="os"${OSST[tag] && OSST[tag].busy ? ' disabled' : ''}>${OSST[tag] && OSST[tag].busy ? 'Registrando…' : 'Gerar OS simulada'}</button></div>`}<p class="n" id="osMsg">${(OSST[tag] && OSST[tag].msg) || ''}</p>`;
    chart(el.querySelector('#eqC'), e);
    el.querySelector('.x').onclick = close; bindLp(tag);
    el.querySelectorAll('[data-ck]').forEach((c) => c.onchange = () => { const e2 = sim.eq[tag]; e2.ck = e2.ck || {}; const j = c.dataset.ck; if (c.checked) { e2.ck[j] = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); if (e2.k === 'cone' && /N₂/.test(c.parentElement.textContent)) e2.n2 = 83; if (e2.k === 'cone' && /descarga/.test(c.parentElement.textContent)) e2.ring = 0; logEv('Manutenção', `${tag}: ${c.parentElement.textContent.split('·')[1].trim()} — registrado`); } else delete e2.ck[j]; render(); });
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { if (b.dataset.a === 'os') { gerarOS(tag, e, b); return; } if (b.dataset.a === 'mnt') { if (!e.lock) { MSG[tag] = { ok: false, msg: 'aplique o bloqueio (LOTO) na botoeira antes de iniciar a manutenção' }; render(); return; } startMnt(e); logEv('Manutenção', `${tag} em manutenção: desligado e bloqueado (plano de ${MNT[e.k].h} h)`); sim.cmdEq && sim.cmdEq(tag, { mnt: true }); render(); return; }
      if (b.dataset.a === 'mfin') { const r = finishMnt(tag, e, true); if (r) r.sent = true; sim.cmdEq && sim.cmdEq(tag, { mnt: false }); render(); checkRep(); return; }
      if (b.dataset.a === 'tog') { MSG[tag] = cmd(tag, e.on ? 'stop' : 'start', 'R'); } else { e.w = 0; logEv('Manutenção', `${tag}: troca registrada`); sim.cmdEq && sim.cmdEq(tag, { troca: true }); } render(); });
  }
  // ORDEM DE SERVIÇO SIMULADA: gravada na mesma planilha do registro de inspeção (tipo "OS simulada")
  const OSST = {};   // situação da OS por equipamento (a tela é redesenhada a cada ~0,3 s)
  async function gerarOS(t, e, btn) {
    if (OSST[t] && OSST[t].busy) return;
    const H = e.health, sev = H == null ? 'Baixa' : H < 50 ? 'Alta' : H < 75 ? 'Média' : 'Baixa', hp = e.hParts || {};
    const maior = Object.entries(hp).sort((a, b) => b[1] - a[1])[0] || ['desgaste', 0];
    const acao = { desgaste: e.k === 'pn' ? 'programar troca dos painéis do deck' : e.k === 'vsi' ? 'programar troca das pontas do rotor' : 'programar troca do manto e do côncavo', vibracao: 'inspecionar mancais, fixações e balanceamento; análise de vibração', temperatura: 'verificar lubrificação, nível e resfriamento do óleo', sobrecarga: 'redistribuir a carga do grupo e conferir a alimentação' }[maior[0]];
    const rsl = !isFinite(e.rsl) ? 'indeterminada (sem carga)' : e.rsl > 48 ? `≈ ${fm(e.rsl / 24)} dias` : `≈ ${fm(e.rsl)} h`;
    const r = { etapa: 3, area: 'crush', tipo: 'OS simulada', severidade: sev, local: t, operador: 'Gêmeo digital (setor 3)', tempo: new Date().toLocaleString('pt-BR'),
      descricao: `Ordem de serviço simulada · ${t}: saúde do ativo ${H == null ? '–' : H}/100 (desgaste ${fm(e.w)} %, vibração ${fm(e.vib, 1)} mm/s, temperatura ${fm(e.oil)} °C, carga ${fm(e.load * 100)} %). Vida útil restante ${rsl}. Ação sugerida: ${acao}.` };
    OSST[t] = { busy: true, msg: 'Registrando a OS na planilha…' }; render();
    try { const res = await call('inspRegistrar', [r]); logEv('Manutenção', `OS simulada gerada para ${t} (${sev})`);
      OSST[t] = { busy: false, msg: `✓ OS registrada (${sev}) na planilha de inspeções` + (res && res.url ? ` · <a href="${res.url}" target="_blank" rel="noopener" style="color:#5cc6dc">abrir</a>` : '') + '.' }; }
    catch (err) { OSST[t] = { busy: false, msg: 'Não foi possível registrar a OS: ' + String(err.message || err).replace(/</g, '&lt;') }; }
    render();
  }
  /* marca na lista "Pontos de inspeção" o equipamento cuja tela está aberta */
  function markSel(t) { if (t) document.body.dataset.eqsel = t; else delete document.body.dataset.eqsel;
    document.querySelectorAll('#pB_pi [data-i]').forEach((d) => { const on = d.dataset.i === t; d.classList.toggle('sel', on); if (on) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); }
  function showRep(r) { const e = sim.eq[r.tag], d = document.createElement('div'); d.className = 's3mrep';
    const nm = { pn: 'Peneira', cone: 'Britador cônico HP 400', vsi: 'Britador Barmac' }[r.k] || 'Equipamento';
    d.innerHTML = `<div class="bx" role="dialog" aria-label="Relatório de manutenção"><h3>✅ Manutenção concluída · ${nm} ${r.tag}</h3><small style="color:#9fb0bd">${r.early ? 'Encerrada antes do fim do plano pelo operador' : 'Plano de manutenção executado'} · modelo didático</small>
      <table><tr><td>Duração</td><td>${fm(r.h, 1)} h (plano ${fm(r.dur)} h)</td></tr><tr><td>Desgaste</td><td>${fm(r.w0)} % → ${fm(r.wf != null ? r.wf : 25)} %</td></tr><tr><td>Saúde do ativo</td><td>${r.h0 != null ? r.h0 + ' → ≈ 100 após a partida' : 'recuperada após a partida'}</td></tr>
      <tr><td>Peças trocadas</td><td>${r.pecas}</td></tr>${r.prox ? `<tr><td>Próxima troca prevista</td><td>≈ ${r.prox > 48 ? fm(r.prox / 24) + ' dias' : fm(r.prox) + ' h'} de operação</td></tr>` : ''}</table>
      <b>Atividades realizadas</b><ul>${r.at.map((x) => `<li>${x}</li>`).join('')}</ul>
      <small style="color:#9fb0bd">Bloqueio retirado: o equipamento está liberado, porém desligado. Os alarmes voltam ao serviço na partida.</small>
      <div class="row"><button data-r="x">Fechar</button><button class="on" data-r="on">Ligar o equipamento</button></div></div>`;
    root.appendChild(d); const cl = () => d.remove();
    d.querySelector('[data-r="x"]').onclick = cl; d.addEventListener('click', (ev) => { if (ev.target === d) cl(); });
    d.querySelector('[data-r="on"]').onclick = () => { if (e && !e.mnt) MSG[r.tag] = cmd(r.tag, 'start', 'R'); cl(); render(); };
    logEv('Manutenção', `${r.tag}: manutenção concluída em ${fm(r.h, 1)} h · ${r.pecas} trocadas · desgaste ${fm(r.w0)} % → ${fm(r.wf != null ? r.wf : 25)} %`); }
  function checkRep() { for (const t in sim.eq) { const r = sim.eq[t].lastMnt; if (r && !r.sent) { r.sent = true; if (!r.early) sim.cmdEq && sim.cmdEq(t, { mnt: false }); } if (r && !r.shown) { r.shown = true; showRep(r); } } }
  function open(t) { feeder = /AL/.test(t); tag = /^03TC/.test(t) ? t : t.replace('AL', 'PN'); if (!sim.eq[tag] && !(sim.belts && sim.belts[tag])) return false; el.hidden = false; render(); markSel(tag); return true; }
  function close() { el.hidden = true; tag = null; markSel(null); }
  let k = 0;
  return { open, close, tag: () => (el.hidden ? null : tag), isOpen: () => !el.hidden, update() { if (++k % 20 === 0) { render(); checkRep(); } } };
}
