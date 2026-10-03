// Painéis do processo em cascata (acordeão): cada painel abre e fecha com um clique; o estado fica salvo.
// Indicadores · Tendências · Controles e ajustes · Fluxos (entradas e saídas) · Equipamentos · Alarmes e eventos.
// Sincronização com o simulador (mesma origem, BroadcastChannel 'setor3-sync'): lavra, APF, TCLD, umidade e partida
// vêm do simulador; APF, TCLD e partir/parar alterados aqui voltam para o simulador.

const CSS = `
.s3acc{position:fixed;right:14px;top:96px;z-index:5;width:380px;max-height:calc(100vh - 112px);overflow:auto;border-radius:12px;background:rgba(14,24,38,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 8px 26px rgba(0,0,0,.35);color:#dce6ee;font:12.5px/1.4 system-ui}
.s3acc .top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(120,170,235,.25);position:sticky;top:0;background:rgba(14,24,38,.97);z-index:1}
.s3acc .top b{flex:1;font-size:13.5px;color:#fff}.s3acc .top button{border:0;border-radius:6px;padding:4px 8px;background:#1f3a5c;color:#cfe6ff;font:600 11px system-ui;cursor:pointer}
.s3acc .sync{font-size:11px;padding:3px 8px;border-radius:10px;background:#3a4652;color:#cfd6dc}.s3acc .sync.on{background:#0e8a4a;color:#fff}
.s3sec{border-bottom:1px solid rgba(120,170,235,.18)}
.s3sec>h5{margin:0;padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;font:700 12px system-ui;letter-spacing:.06em;text-transform:uppercase;color:#ffd24a;user-select:none}
.s3sec>h5:hover{background:rgba(255,255,255,.04)}.s3sec>h5 i{font-style:normal;transition:transform .2s;color:#9fdcf0}.s3sec.open>h5 i{transform:rotate(90deg)}
.s3sec>h5 em{margin-left:auto;font-style:normal;font-weight:600;letter-spacing:0;text-transform:none;color:#9fb0bd;font-size:11px}
.s3sec>div{display:none;padding:2px 12px 12px}.s3sec.open>div{display:block}
.s3k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.s3k div{background:rgba(255,255,255,.05);border-left:3px solid #1f8a5b;border-radius:4px;padding:6px 8px}
.s3k div.warn{border-color:#ffb020}.s3k div.crit{border-color:#ff5a4a}.s3k b{display:block;font:600 17px ui-monospace,Menlo,monospace;color:#fff}.s3k span{color:#9fb0bd;font-size:11px}
.s3acc canvas{width:100%;height:110px;display:block;margin:4px 0 8px;background:#0b1622;border-radius:6px}
.s3acc .ctl{margin:8px 0}.s3acc .ctl .r{display:flex;justify-content:space-between;color:#ffd24a;font-weight:600}.s3acc .ctl .r b{color:#ffd24a;font-family:ui-monospace,Menlo,monospace}
.s3acc .ctl small{color:#9fb0bd;display:block}.s3acc input[type=range]{width:100%;accent-color:#5cc6dc}
.s3acc .go{border:0;border-radius:8px;padding:8px 10px;font:700 12.5px system-ui;cursor:pointer;width:100%;color:#fff;margin-top:4px}
.s3acc table{width:100%;border-collapse:collapse;font-size:11.5px}.s3acc th{color:#9fb0bd;text-align:left;font-weight:600;padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.12)}
.s3acc td{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-variant-numeric:tabular-nums}.s3acc td.n{text-align:right}.s3acc tr.grp td{color:#9fdcf0;font-weight:700;padding-top:7px}
.s3acc .st{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.s3acc .st.ok{background:#2fbf71}.s3acc .st.warn{background:#ffb020}.s3acc .st.crit{background:#ff5a4a}.s3acc .st.off{background:#6b7680}
.s3acc td button{border:0;border-radius:5px;padding:2px 7px;font:600 10.5px system-ui;cursor:pointer;background:#1f3a5c;color:#cfe6ff}.s3acc td a{color:#9fdcf0;cursor:pointer;text-decoration:underline}
.s3acc .al{border-left:3px solid #ffb020;padding:4px 7px;margin:3px 0;background:rgba(255,176,32,.1);border-radius:0 4px 4px 0}.s3acc .al.crit{border-color:#ff5a4a;background:rgba(255,90,74,.12)}
.s3acc .ev{color:#b9c6d1;font-size:11.5px;padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.s3acc .ev b{color:#9fdcf0}
@media (max-width:860px){.s3acc{top:auto;bottom:150px;right:8px;width:min(380px,calc(100vw - 16px));max-height:42vh}}
`;

const SECS = [['ind', 'Indicadores em tempo real'], ['tend', 'Tendências'], ['ctl', 'Controles e ajustes'], ['flu', 'Fluxos · entradas e saídas'], ['eq', 'Equipamentos'], ['al', 'Alarmes e eventos']];

export function buildPanels(root, sim, { fm, stTxt, openInfo, logEv }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  let open; try { open = JSON.parse(localStorage.getItem('setor3.acc') || 'null'); } catch (e) { open = null; }
  if (!Array.isArray(open)) open = ['ind', 'ctl'];
  const el = document.createElement('div'); el.className = 's3acc'; root.appendChild(el);
  el.innerHTML = `<div class="top"><b>Painéis do processo · Setor 3</b><span class="sync" id="pSync">sem simulador</span><button id="pAll">Fechar todos</button></div>` +
    SECS.map(([k, t]) => `<section class="s3sec${open.includes(k) ? ' open' : ''}" data-k="${k}"><h5><i>▶</i>${t}<em id="pS_${k}"></em></h5><div id="pB_${k}"></div></section>`).join('');
  const $ = (s) => el.querySelector(s);
  const save = () => { try { localStorage.setItem('setor3.acc', JSON.stringify(open)); } catch (e) { /* sem armazenamento */ } };
  el.querySelectorAll('.s3sec>h5').forEach((h) => h.addEventListener('click', () => {
    const s = h.parentElement, k = s.dataset.k; s.classList.toggle('open');
    open = s.classList.contains('open') ? [...new Set([...open, k])] : open.filter((x) => x !== k); save(); render(true); allBtn();
  }));
  const allBtn = () => { $('#pAll').textContent = open.length ? 'Fechar todos' : 'Abrir todos'; };
  $('#pAll').onclick = () => { const toOpen = !open.length; el.querySelectorAll('.s3sec').forEach((s) => s.classList.toggle('open', toOpen)); open = toOpen ? SECS.map((s) => s[0]) : []; save(); allBtn(); render(true); };
  allBtn();

  // ---- sincronização com o simulador
  let bc = null, lastSync = 0;
  try { bc = new BroadcastChannel('setor3-sync'); bc.onmessage = (m) => { const d = m.data || {}; if (d.type !== 'state') return; lastSync = performance.now(); sim.sync = true;
    if (isFinite(d.mine)) sim.feed = d.mine; if (isFinite(d.css)) sim.css = d.css; if (isFinite(d.tcld)) sim.tcld = d.tcld; if (isFinite(d.moist)) sim.moist = d.moist; if (typeof d.running === 'boolean') sim.running = d.running; if (isFinite(d.fe)) sim.fe = d.fe; }; } catch (e) { bc = null; }
  const send = (set) => { if (bc && sim.sync) bc.postMessage({ type: 'set', set }); };

  // ---- controles (montados uma vez)
  const C = $('#pB_ctl');
  C.innerHTML = `<div class="ctl"><div class="r"><span>Alimentação nova (ROM da lavra)</span><b id="cFv"></b></div><input type="range" id="cF" min="0" max="5200" step="50"><small id="cFn">Vazão de ROM que a TCLD entrega ao setor.</small></div>
    <div class="ctl"><div class="r"><span>Abertura dos HP 400 (APF)</span><b id="cCv"></b></div><input type="range" id="cC" min="12" max="30" step="1"><small>Menor abertura = britado mais fino e menos retorno; mais potência nos cônicos.</small></div>
    <div class="ctl"><div class="r"><span>Velocidade da TCLD</span><b id="cTv"></b></div><input type="range" id="cT" min="40" max="110" step="1"><small>Capacidade nominal 6.000 t/h a 100 %.</small></div>
    <div class="ctl"><div class="r"><span>Umidade do ROM</span><b id="cMv"></b></div><input type="range" id="cM" min="5" max="14" step=".5"><small>Acima de 9 % o minério cola nos decks (colmatação) e a eficiência das peneiras cai.</small></div>
    <button class="go" id="cRun"></button>`;
  const cF = $('#cF'), cC = $('#cC'), cT = $('#cT'), cM = $('#cM');
  cF.oninput = () => { sim.feed = +cF.value; }; cF.onchange = () => logEv('Ajuste', `Alimentação nova ${fm(sim.feed)} t/h`);
  cC.oninput = () => { sim.css = +cC.value; send({ css: sim.css }); }; cC.onchange = () => logEv('Ajuste', `APF dos HP 400 = ${sim.css} mm`);
  cT.oninput = () => { sim.tcld = +cT.value; send({ tcldSpd: sim.tcld }); }; cT.onchange = () => logEv('Ajuste', `Velocidade da TCLD = ${sim.tcld} %`);
  cM.oninput = () => { sim.moist = +cM.value; }; cM.onchange = () => logEv('Ajuste', `Umidade do ROM = ${fm(sim.moist, 1)} %`);
  $('#cRun').onclick = () => { sim.running = !sim.running; send({ running: sim.running }); logEv('Comando', sim.running ? 'Circuito partido' : 'Circuito parado'); };

  // ---- gráficos de tendência
  function chart(cv, series, title, unit) {
    const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, pl = 36 * dpr, pr = 8 * dpr, pt = 16 * dpr, pb = 14 * dpr; x.clearRect(0, 0, W, H);
    const H0 = sim.hist; if (H0.length < 2) { x.fillStyle = '#7b8a97'; x.font = `${11 * dpr}px system-ui`; x.fillText('Coletando dados…', pl, H / 2); return; }
    let mx = 1; for (const s of series) for (const h of H0) mx = Math.max(mx, s.f(h)); mx *= 1.15;
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.fillStyle = '#7b8a97'; x.font = `${10 * dpr}px system-ui`;
    for (let i = 0; i <= 2; i++) { const y = pt + (H - pt - pb) * i / 2; x.beginPath(); x.moveTo(pl, y); x.lineTo(W - pr, y); x.stroke(); x.fillText(fm(mx * (1 - i / 2)), 2 * dpr, y + 3 * dpr); }
    x.fillStyle = '#cfd6dc'; x.font = `600 ${10.5 * dpr}px system-ui`; x.fillText(title + (unit ? ` (${unit})` : ''), pl, 11 * dpr);
    const t0 = H0[0].t, t1 = H0[H0.length - 1].t, sx = (t) => pl + (W - pl - pr) * (t - t0) / Math.max(1, t1 - t0), sy = (v) => pt + (H - pt - pb) * (1 - v / mx);
    let lx = W - pr; for (const s of series.slice().reverse()) { x.fillStyle = s.c; const tw = x.measureText(s.n).width; lx -= tw + 14 * dpr; x.fillRect(lx, 5 * dpr, 8 * dpr, 3 * dpr); x.fillText(s.n, lx + 10 * dpr, 11 * dpr); }
    for (const s of series) { x.strokeStyle = s.c; x.lineWidth = 1.6 * dpr; x.beginPath(); H0.forEach((h, i) => { const X = sx(h.t), Y = sy(s.f(h)); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); }
    x.fillStyle = '#7b8a97'; x.font = `${9.5 * dpr}px system-ui`; x.fillText(`últimos ${fm((t1 - t0) / 60, 0)} min`, pl, H - 3 * dpr);
  }
  $('#pB_tend').innerHTML = '<canvas id="g1"></canvas><canvas id="g2"></canvas><canvas id="g3"></canvas>';

  // ---- renderização periódica
  function render(force) {
    const K = sim.kpi, E = sim.eq, on = (k) => open.includes(k);
    const sync = sim.sync && performance.now() - lastSync < 6000; if (!sync) sim.sync = false;
    $('#pSync').textContent = sync ? 'sincronizado com o simulador' : 'sem simulador'; $('#pSync').className = 'sync' + (sync ? ' on' : '');
    const pns = Object.values(E).filter((e) => e.k === 'pn' && e.on && e.flow > 0), effM = pns.length ? pns.reduce((a, e) => a + e.eff, 0) / pns.length : 0;
    $('#pS_ind').textContent = `${fm(K.F)} → ${fm(K.prod)} t/h`; $('#pS_al').textContent = K.alarms.length ? `${K.alarms.length} alarme(s)` : 'normal';
    $('#pS_eq').textContent = `${K.nPN}/8 PN · ${K.nC}/2 HP · ${K.nV}/3 Barmac`; $('#pS_ctl').textContent = sim.running ? 'operando' : 'parado';
    if (on('ind') || force) $('#pB_ind').innerHTML = `<div class="s3k">
      <div><b>${fm(K.F)}</b><span>Lavra · ROM da TCLD (t/h)</span></div><div><b>${fm(K.T)}</b><span>Alimentação das peneiras (t/h)</span></div>
      <div class="${K.prod < K.F * .95 ? 'warn' : ''}"><b>${fm(K.prod)}</b><span>Produto &lt; 12,5 mm (t/h)</span></div><div class="${K.circ > 70 ? 'warn' : ''}"><b>${fm(K.circ)} %</b><span>Carga circulante</span></div>
      <div><b>${fm(K.kw)}</b><span>Potência total (kW)</span></div><div><b>${fm(K.spec, 2)}</b><span>Energia específica (kWh/t)</span></div>
      <div class="${sim.moist > 10 ? 'crit' : sim.moist > 9 ? 'warn' : ''}"><b>${fm(sim.moist, 1)} %</b><span>Umidade do ROM</span></div><div class="${effM < 80 ? 'warn' : ''}"><b>${fm(effM)} %</b><span>Eficiência média das peneiras</span></div></div>`;
    if (on('tend')) { const cv = el.querySelectorAll('#pB_tend canvas');
      chart(cv[0], [{ n: 'ROM', c: '#2fbf71', f: (h) => h.F }, { n: 'peneiras', c: '#5cc6dc', f: (h) => h.T }, { n: 'produto', c: '#ff9a4a', f: (h) => h.prod }], 'Vazões', 't/h');
      chart(cv[1], [{ n: 'carga circulante', c: '#ffd24a', f: (h) => h.circ }], 'Carga circulante', '%');
      chart(cv[2], [{ n: 'potência', c: '#c792ea', f: (h) => h.kw }], 'Potência total', 'kW'); }
    if (on('ctl') || force) {
      if (document.activeElement !== cF) cF.value = sim.feed; if (document.activeElement !== cC) cC.value = sim.css; if (document.activeElement !== cT) cT.value = sim.tcld; if (document.activeElement !== cM) cM.value = sim.moist;
      $('#cFv').textContent = fm(sim.feed) + ' t/h'; $('#cCv').textContent = sim.css + ' mm'; $('#cTv').textContent = fm(sim.tcld) + ' %'; $('#cMv').textContent = fm(sim.moist, 1) + ' %';
      cF.disabled = cM.disabled = sync; $('#cFn').textContent = sync ? 'Vem da lavra no simulador (sincronizado). APF, TCLD e partir/parar daqui comandam o simulador.' : 'Vazão de ROM que a TCLD entrega ao setor. Limitada pela velocidade da TCLD.';
      $('#cRun').textContent = sim.running ? 'Parar o circuito' : 'Partir o circuito'; $('#cRun').style.background = sim.running ? '#c0392b' : '#1f8a5b'; }
    if (on('flu') || force) { const fe = sim.fe, si = sim.si;
      $('#pB_flu').innerHTML = `<table><tr><th>Fluxo</th><th class="n">t/h</th><th class="n">% Fe</th><th class="n">% SiO₂</th></tr>
        <tr class="grp"><td colspan="4">Entradas</td></tr><tr><td>ROM da TCLD (minério lavrado)</td><td class="n">${fm(K.F)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr class="grp"><td colspan="4">Circuito interno</td></tr><tr><td>Alimentação das 8 peneiras</td><td class="n">${fm(K.T)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr><td>Retido 1º deck → HP 400</td><td class="n">${fm(K.T * K.r1)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr><tr><td>Retido 2º deck → Barmac</td><td class="n">${fm(K.T * K.r2)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr><td>Britado → retorno às peneiras</td><td class="n">${fm(K.T - K.prod)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr class="grp"><td colspan="4">Saídas</td></tr><tr><td>Produto &lt; 12,5 mm → pilha de regularização</td><td class="n">${fm(K.prod)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr></table>
        <p style="color:#9fb0bd;margin:6px 0 0">A britagem só reduz o tamanho: os teores entram e saem iguais. Balanço: entra ${fm(K.F)} t/h = sai ${fm(K.prod)} t/h${K.limited ? ' (alimentação limitada pela britagem)' : ''}.</p>`; }
    if (on('eq') || force) {
      $('#pB_eq').innerHTML = `<table><tr><th>Tag</th><th>Estado</th><th class="n">Carga</th><th class="n">Vibr.</th><th class="n">Desg.</th><th></th></tr>${Object.entries(E).map(([tag, e]) => `<tr><td><a data-i="${tag}">${tag}</a></td><td><span class="st ${e.st}"></span>${stTxt[e.st]}</td><td class="n">${e.on ? fm(e.load * 100) + ' %' : '–'}</td><td class="n">${e.on && e.flow > 0 ? fm(e.vib, 1) : '–'}</td><td class="n">${fm(e.w)} %</td><td><button data-t="${tag}">${e.on ? 'Desligar' : 'Ligar'}</button></td></tr>`).join('')}</table>`;
      el.querySelectorAll('#pB_eq [data-t]').forEach((b) => b.onclick = () => { const e = E[b.dataset.t]; e.on = !e.on; logEv('Comando', `${b.dataset.t} ${e.on ? 'ligado' : 'desligado'}`); render(true); });
      el.querySelectorAll('#pB_eq [data-i]').forEach((a) => a.onclick = () => openInfo(a.dataset.i)); }
    if (on('al') || force) $('#pB_al').innerHTML = (K.alarms.length ? K.alarms.map((a) => `<div class="al ${a.st}"><b>${a.tag}</b> · ${a.why}</div>`).join('') : '<div style="color:#2fbf71">Sem alarmes ativos.</div>') +
      `<div style="margin-top:8px;color:#9fb0bd;font-weight:600">Eventos</div>${sim.log.slice(0, 30).map((v) => `<div class="ev">${v.h} · <b>${v.tipo}</b> · ${v.txt}</div>`).join('') || '<div class="ev">Nenhum evento ainda.</div>'}`;
  }
  render(true);
  return { update(frame) { if (frame % 20 === 0) render(false); } };
}
