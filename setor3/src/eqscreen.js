import { call } from './api.js?v=20261007205259';
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
.s3eq .act button.on{background:#c0392b}.s3eq .act button.off{background:#1f8a5b}.s3eq p.n{margin:4px 14px 0;color:#9fb0bd;font-size:11.5px}
@media (max-width:860px){.s3eq{top:70px;max-height:calc(100vh - 240px)}}
`;

const SPEC = {
  pn: { modelo: 'Peneira vibratória tipo banana, 2 decks · 3,0 × 7,3 m (10 × 24 ft)', itens: [['Deck superior (1º)', 'abertura ≈ 32 mm · painéis de poliuretano'], ['Deck inferior (2º)', 'abertura 12,5 mm (corte do produto)'], ['Inclinação dos segmentos', '28° · 18° · 9°'], ['Acionamento', '2 vibradores · 2 × 30 kW · 440 V'], ['Frequência / amplitude', '≈ 16 Hz (960 rpm) · ≈ 9 mm'], ['Capacidade nominal (modelo)', '1.500 t/h']] },
  cone: { modelo: 'Britador cônico HP 400 · britagem primária (compressão)', itens: [['Motor', '315 kW · 4,16 kV'], ['APF (abertura na posição fechada)', '13 a 38 mm (ajuste pela coroa)'], ['Proteção', 'alívio hidráulico (acumuladores)'], ['Lubrificação', 'óleo · alarme acima de 65 °C'], ['Capacidade nominal (modelo)', '1.100 t/h']] },
  vsi: { modelo: 'Britador de impacto vertical Barmac B9100SE (VSI) · britagem secundária', itens: [['Acionamento', '2 × 300 kW · 4,16 kV · correias'], ['Rotor', 'Ø ≈ 990 mm · 1.450 rpm (≈ 75 m/s na ponta)'], ['Mecanismo', 'impacto rocha contra rocha (cascata)'], ['Lubrificação', 'óleo · alarme acima de 65 °C'], ['Capacidade nominal (modelo)', '900 t/h']] },
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
  function render() {
    if (!tag || el.hidden) return; const e = sim.eq[tag]; if (!e) return;
    const S = SPEC[e.k], run = e.on && e.flow > 0, amp = run ? e.kw / (1.732 * KV[e.k] * .88 * .95) : 0;
    const cls = (v, w, c) => (v >= c ? 'crit' : v >= w ? 'warn' : '');
    const extra = e.k === 'pn' ? `<div class="${run && e.eff < 80 ? 'warn' : ''}"><b>${run ? fm(e.eff) + ' %' : '–'}</b><span>Eficiência de peneiramento</span></div><div><b>${run ? '16,0 Hz' : '0'}</b><span>Frequência de vibração</span></div>`
      : e.k === 'cone' ? `<div><b>${fm(sim.css)} mm</b><span>APF (abertura)</span></div><div><b>${run ? fm(55 + 70 * e.load + (20 - sim.css) * 1.5) + ' bar' : '–'}</b><span>Pressão hidráulica</span></div>`
        : `<div><b>${run ? '1.450 rpm' : '0'}</b><span>Rotação do rotor</span></div><div><b>${run ? '≈ 75 m/s' : '–'}</b><span>Velocidade na ponta</span></div>`;
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
      <h4>Funcionamento</h4><div class="g">
        <div><b>${run ? 'Operando' : e.on ? 'Sem carga' : 'Desligado'}</b><span>Estado</span></div><div><b>${fm(e.kw)} kW</b><span>Potência</span></div>
        <div><b>${fm(amp)} A</b><span>Corrente estimada (${String(KV[e.k]).replace('.', ',')} kV)</span></div><div class="${cls(e.vib, 7.1, 11)}"><b>${run ? fm(e.vib, 1) + ' mm/s' : '–'}</b><span>Vibração (ISO 10816-3)</span></div>
        <div class="${cls(e.oil, 65, 75)}"><b>${fm(e.oil)} °C</b><span>${e.k === 'pn' ? 'Mancais dos vibradores' : 'Óleo de lubrificação'}</span></div>${extra}</div>
      <h4>Produção</h4><div class="g">
        <div><b>${fm(e.flow)} t/h</b><span>Vazão atual</span></div><div class="${cls(e.load * 100, 105, 125)}"><b>${fm(e.load * 100)} %</b><span>Carga (capacidade do modelo)</span></div>
        <div><b>${fm(e.tons || 0)} t</b><span>Processado nesta sessão</span></div><div><b>${fm(e.hrs || 0, 1)} h</b><span>Horas operando (tempo simulado)</span></div></div>
      <p class="n">${share}. Partidas na sessão: ${e.starts || 0}.</p>
      ${effBlock}
      <h4>Tendência</h4><canvas id="eqC"></canvas><p class="n">Linha tracejada: alerta de vibração (7,1 mm/s).</p>
      <h4>Manutenção</h4><div class="g"><div><b style="color:${wcol}">${fm(e.w)} %</b><span>Desgaste ${e.k === 'pn' ? 'do deck' : e.k === 'vsi' ? 'das pontas do rotor' : 'dos revestimentos'}</span></div><div><b>${isFinite(e.left) ? (e.left > 48 ? '≈ ' + fm(e.left / 24) + ' dias' : '≈ ' + fm(e.left) + ' h') : '–'}</b><span>Troca prevista</span></div>
        <div class="${hcl}"><b style="color:${hcol}">${e.health == null ? '–' : e.health + ' / 100'}</b><span>Saúde do ativo · ${hTxt}</span></div><div class="${isFinite(e.rsl) && e.rsl < 24 * 7 ? 'warn' : ''}"><b>${rslTxt}</b><span>Vida útil restante (RSL, até 95 % de desgaste)</span></div></div>
      <div class="bar"><i style="width:${Math.min(100, e.w)}%;background:${wcol}"></i></div>
      <p class="n">${hWhy}</p>
      <h4>Especificação técnica (ilustrativa)</h4><table>${S.itens.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <div class="act"><button class="${e.on ? 'on' : 'off'}" data-a="tog">${e.on ? 'Desligar' : 'Ligar'}</button><button data-a="wear">Registrar troca</button><button data-a="os">Gerar OS simulada</button></div><p class="n" id="osMsg"></p>`;
    chart(el.querySelector('#eqC'), e);
    el.querySelector('.x').onclick = close;
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { if (b.dataset.a === 'os') { gerarOS(tag, e, b); return; } if (b.dataset.a === 'tog') { e.on = !e.on; logEv('Comando', `${tag} ${e.on ? 'ligado' : 'desligado'}`); } else { e.w = 0; logEv('Manutenção', `${tag}: troca registrada`); } render(); });
  }
  // ORDEM DE SERVIÇO SIMULADA: gravada na mesma planilha do registro de inspeção (tipo "OS simulada")
  async function gerarOS(t, e, btn) {
    const H = e.health, sev = H == null ? 'Baixa' : H < 50 ? 'Alta' : H < 75 ? 'Média' : 'Baixa', hp = e.hParts || {};
    const maior = Object.entries(hp).sort((a, b) => b[1] - a[1])[0] || ['desgaste', 0];
    const acao = { desgaste: e.k === 'pn' ? 'programar troca dos painéis do deck' : e.k === 'vsi' ? 'programar troca das pontas do rotor' : 'programar troca do manto e do côncavo', vibracao: 'inspecionar mancais, fixações e balanceamento; análise de vibração', temperatura: 'verificar lubrificação, nível e resfriamento do óleo', sobrecarga: 'redistribuir a carga do grupo e conferir a alimentação' }[maior[0]];
    const rsl = !isFinite(e.rsl) ? 'indeterminada (sem carga)' : e.rsl > 48 ? `≈ ${fm(e.rsl / 24)} dias` : `≈ ${fm(e.rsl)} h`;
    const r = { etapa: 3, area: 'crush', tipo: 'OS simulada', severidade: sev, local: t, operador: 'Gêmeo digital (setor 3)', tempo: new Date().toLocaleString('pt-BR'),
      descricao: `Ordem de serviço simulada · ${t}: saúde do ativo ${H == null ? '–' : H}/100 (desgaste ${fm(e.w)} %, vibração ${fm(e.vib, 1)} mm/s, temperatura ${fm(e.oil)} °C, carga ${fm(e.load * 100)} %). Vida útil restante ${rsl}. Ação sugerida: ${acao}.` };
    const msg = el.querySelector('#osMsg'); btn.disabled = true; msg.textContent = 'Registrando a OS…';
    try { const res = await call('inspRegistrar', [r]); logEv('Manutenção', `OS simulada gerada para ${t} (${sev})`); msg.innerHTML = 'OS registrada na planilha de inspeções' + (res && res.url ? ` · <a href="${res.url}" target="_blank" rel="noopener" style="color:#5cc6dc">abrir</a>` : '') + '.'; }
    catch (err) { msg.textContent = 'Não foi possível registrar a OS: ' + err.message; }
    btn.disabled = false;
  }
  function open(t) { feeder = /AL/.test(t); tag = t.replace('AL', 'PN'); if (!sim.eq[tag]) return false; el.hidden = false; render(); return true; }
  function close() { el.hidden = true; tag = null; }
  let k = 0;
  return { open, close, isOpen: () => !el.hidden, update() { if (++k % 20 === 0) render(); } };
}
