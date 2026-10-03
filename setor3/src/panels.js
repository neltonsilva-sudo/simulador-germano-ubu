import { call, getToken, SIM_URL } from './api.js?v=20261003135802';
// Painéis do processo em cascata (acordeão): cada painel abre e fecha com um clique; o estado fica salvo.
// Indicadores · Tendências · Controles e ajustes · Fluxos (entradas e saídas) · Equipamentos · Alarmes e eventos.
// Sincronização com o simulador (mesma origem, BroadcastChannel 'setor3-sync'): lavra, APF, TCLD, umidade e partida
// vêm do simulador; APF, TCLD e partir/parar alterados aqui voltam para o simulador.

const CSS = `
.s3acc{--ok:#4ac68f;--warn:#ff9f1a;--crit:#f0544a;--accent:#5cc6dc;--ink:#e8edf1;--muted:#a2afbb;--card:rgba(10,45,95,.30);--cline:rgba(120,170,235,.25);--disp:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  position:fixed;right:14px;top:96px;z-index:5;width:400px;max-height:calc(100vh - 112px);overflow:auto;border-radius:10px;border:1px solid rgba(120,170,235,.38);
  background:radial-gradient(ellipse 60% 80% at 18% 20%,rgba(60,130,200,.28),transparent 60%),radial-gradient(ellipse 50% 70% at 85% 75%,rgba(0,10,30,.55),transparent 65%),linear-gradient(135deg,rgba(13,68,120,.94) 0%,rgba(8,48,94,.94) 50%,rgba(5,32,74,.95) 100%);
  backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.07);color:var(--ink);font:12.5px/1.4 "IBM Plex Sans",system-ui,sans-serif;scrollbar-width:thin}
.s3acc .top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--cline);position:sticky;top:0;z-index:1;background:linear-gradient(135deg,rgba(13,68,120,.98),rgba(8,48,94,.98))}
.s3acc .top .dn{width:32px;height:32px;flex:none;border-radius:50%;background:#0a2846;border:3px solid #5cc6dc;display:flex;align-items:center;justify-content:center;font:700 16px var(--disp);color:#fff}
.s3acc .top b{flex:1;font:600 18px/1.1 var(--disp);color:#fff}.s3acc .top button{border:1px solid var(--cline);border-radius:6px;padding:5px 9px;background:rgba(10,30,60,.6);color:#e8edf1;font:600 11.5px "IBM Plex Sans",system-ui;cursor:pointer}
.s3acc .sync{font:600 10.5px "IBM Plex Sans",system-ui;padding:3px 8px;border-radius:10px;background:rgba(255,255,255,.08);color:var(--muted);white-space:nowrap}.s3acc .sync.on{background:#1f8a5b;color:#fff}
.s3sec{border-bottom:1px solid var(--cline)}
.s3sec>h5{margin:0;padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;font:600 13px var(--disp);letter-spacing:.1em;text-transform:uppercase;color:#ffd24a;user-select:none}
.s3sec>h5:hover{background:rgba(255,255,255,.04)}.s3sec>h5 i{font-style:normal;transition:transform .2s;color:#5cc6dc;font-size:10px}.s3sec.open>h5 i{transform:rotate(90deg)}
.s3sec>h5 em{margin-left:auto;font:500 11px var(--mono);letter-spacing:0;text-transform:none;color:var(--accent)}
.s3sec>div{display:none;padding:0 12px 12px}.s3sec.open>div{display:block}
.s3acc .hs{display:grid;grid-template-columns:10px 1fr auto;gap:8px;align-items:center;padding:7px 9px;margin-bottom:5px;background:var(--card);border:1px solid var(--cline);border-radius:6px;cursor:pointer;backdrop-filter:blur(6px)}
.s3acc .hs:hover{border-color:rgba(92,198,220,.6)}.s3acc .hs i{width:9px;height:9px;border-radius:50%;background:var(--ok)}.s3acc .hs.warn i{background:var(--warn)}.s3acc .hs.crit i{background:var(--crit)}
.s3acc .hs span{font:400 12px var(--mono);color:var(--accent);text-align:right}
.s3acc .card{background:var(--card);border:1px solid var(--cline);border-left:3px solid var(--ok);border-radius:6px;padding:8px 10px;margin-bottom:6px;line-height:1.5}.s3acc .card.warn{border-left-color:var(--warn)}.s3acc .card.crit{border-left-color:var(--crit)}
.s3acc .card small{color:var(--muted);display:block;margin-top:2px}
.s3k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.s3k div{background:var(--card);border:1px solid var(--cline);border-left:3px solid var(--ok);border-radius:6px;padding:6px 8px}
.s3k div.warn{border-left-color:var(--warn)}.s3k div.crit{border-left-color:var(--crit)}.s3k b{display:block;font:500 18px var(--mono);color:#fff}.s3k span{color:var(--muted);font-size:11px}
.s3acc canvas{width:100%;height:110px;display:block;margin:4px 0 8px;background:rgba(4,20,44,.7);border:1px solid var(--cline);border-radius:6px}
.s3acc .ctl{margin:8px 0}.s3acc .ctl .r{display:flex;justify-content:space-between;color:#ffd24a;font-weight:600;font-size:12.5px}.s3acc .ctl .r b{color:#ffd24a;font:600 12px var(--mono)}
.s3acc .ctl small{color:var(--muted);display:block;font-size:11px}.s3acc input[type=range]{width:100%;accent-color:#5cc6dc}
.s3acc .go{border:0;border-radius:8px;padding:9px 10px;font:700 12.5px "IBM Plex Sans",system-ui;cursor:pointer;width:100%;color:#fff;margin-top:4px;box-shadow:0 3px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.25)}
.s3acc table{width:100%;border-collapse:collapse;font-size:11.5px}.s3acc th{color:var(--muted);text-align:left;font-weight:600;padding:4px;border-bottom:1px solid var(--cline)}
.s3acc td{padding:4px;border-bottom:1px solid rgba(255,255,255,.06);font-variant-numeric:tabular-nums}.s3acc td.n{text-align:right;font-family:var(--mono);color:var(--accent)}.s3acc tr.grp td{color:#ffd24a;font:600 12px var(--disp);letter-spacing:.08em;text-transform:uppercase;padding-top:8px}
.s3acc .st{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.s3acc .st.ok{background:var(--ok)}.s3acc .st.warn{background:var(--warn)}.s3acc .st.crit{background:var(--crit)}.s3acc .st.off{background:#6b7680}
.s3acc td button{border:1px solid var(--cline);border-radius:5px;padding:2px 7px;font:600 10.5px system-ui;cursor:pointer;background:rgba(10,30,60,.6);color:#e8edf1}.s3acc td a{color:var(--accent);cursor:pointer;text-decoration:underline}
.s3acc .al{border-left:3px solid var(--warn);padding:5px 8px;margin:4px 0;background:var(--card);border-radius:0 6px 6px 0}.s3acc .al.crit{border-color:var(--crit)}
.s3acc .ev{color:#c3cfd9;font-size:11.5px;padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.s3acc .ev b{color:var(--accent)}
.s3acc select,.s3acc textarea,.s3acc input[type=text]{width:100%;box-sizing:border-box;background:rgba(4,20,44,.75);border:1px solid var(--cline);border-radius:6px;color:#e8edf1;padding:7px 8px;font:12.5px "IBM Plex Sans",system-ui;margin:3px 0}
.s3acc .row2{display:flex;gap:6px}.s3acc .row2>*{flex:1}.s3acc .btn2{border:1px solid var(--cline);border-radius:6px;padding:7px 10px;background:rgba(10,30,60,.7);color:#e8edf1;font:600 12px "IBM Plex Sans",system-ui;cursor:pointer}
.s3acc .btn2.ai{background:#5cc6dc;color:#08202a;border-color:#5cc6dc}.s3acc .btn2.red{border-color:#ff6b5b;color:#ffb3a8}.s3acc .hint{color:var(--muted);font-size:11.5px}
.s3acc .qrrow{display:flex;gap:10px;align-items:flex-start}.s3acc .qrbox{background:#fff;border-radius:6px;padding:6px;flex:none;width:128px;height:128px}.s3acc .qrbox svg,.s3acc .qrbox img{width:100%;height:100%}
.s3acc .card h6{margin:6px 0 2px;font:600 12px var(--disp);letter-spacing:.08em;color:#ffd24a;text-transform:uppercase}
@media (max-width:860px){.s3acc{top:auto;bottom:150px;right:8px;width:min(400px,calc(100vw - 16px));max-height:42vh}}
`;

const SECS = [['pi', 'Pontos de inspeção'], ['prob', 'Problemas detectados'], ['ind', 'Indicadores em tempo real'], ['tend', 'Tendências'], ['ctl', 'Controles e ajustes'], ['flu', 'Fluxos · entradas e saídas'], ['eq', 'Equipamentos'], ['al', 'Alarmes e eventos'], ['qr', 'QR Code da área'], ['insp', 'Registro de inspeção']];

export function buildPanels(root, sim, { fm, stTxt, openInfo, logEv }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  let open; try { open = JSON.parse(localStorage.getItem('setor3.acc2') || 'null'); } catch (e) { open = null; }
  if (!Array.isArray(open)) open = ['pi', 'prob', 'ctl'];
  const el = document.createElement('div'); el.className = 's3acc'; root.appendChild(el);
  el.innerHTML = `<div class="top"><span class="dn">3</span><b>Peneiramento e britagem</b><span class="sync" id="pSync">sem simulador</span><button id="pAll">Fechar todos</button></div>` +
    SECS.map(([k, t]) => `<section class="s3sec${open.includes(k) ? ' open' : ''}" data-k="${k}"><h5><i>▶</i>${t}<em id="pS_${k}"></em></h5><div id="pB_${k}"></div></section>`).join('');
  const $ = (s) => el.querySelector(s);
  const save = () => { try { localStorage.setItem('setor3.acc2', JSON.stringify(open)); } catch (e) { /* sem armazenamento */ } };
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
    if (isFinite(d.mine)) sim.feed = d.mine; if (isFinite(d.css)) sim.css = d.css; if (isFinite(d.tcld)) sim.tcld = d.tcld; if (isFinite(d.moist)) sim.moist = d.moist; if (typeof d.running === 'boolean') sim.running = d.running; if (isFinite(d.fe)) sim.fe = d.fe; if (isFinite(d.p80)) sim.p80 = d.p80; }; } catch (e) { bc = null; }
  const send = (set) => { if (bc && sim.sync) bc.postMessage({ type: 'set', set }); };

  // ---- controles (montados uma vez)
  const C = $('#pB_ctl');
  C.innerHTML = `<div class="ctl"><div class="r"><span>Alimentação nova (ROM da lavra)</span><b id="cFv"></b></div><input type="range" id="cF" min="0" max="5200" step="50"><small id="cFn">Vazão de ROM que a TCLD entrega ao setor.</small></div>
    <div class="ctl"><div class="r"><span>Abertura dos HP 400 (APF)</span><b id="cCv"></b></div><input type="range" id="cC" min="12" max="30" step="1"><small>Menor abertura = produto mais fino e mais carga circulante; mais potência nos cônicos.</small></div>
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
    const nm = (t, e) => (e.k === 'pn' ? 'Peneira ' : e.k === 'cone' ? 'HP 400 ' : 'Barmac ') + t;
    const val = (e) => !(e.on && e.flow > 0) ? (e.on ? 'sem carga' : 'desligado') : e.k === 'pn' ? `efic. ${fm(e.eff)} % · ${fm(e.load * 100)} % carga · desg. ${fm(e.w)} %` : `${fm(e.kw)} kW · ${fm(e.vib, 1)} mm/s · desg. ${fm(e.w)} %`;
    const dot = (e) => (e.st === 'off' ? 'crit' : e.st === 'ok' ? '' : e.st);
    const probs = [];
    for (const [t, e] of Object.entries(E)) if (e.st !== 'ok') {
      const why = (K.alarms.find((a) => a.tag === t) || {}).why || (e.on ? '' : 'desligado');
      const dica = !e.on ? 'Equipamento desligado: a carga do grupo vai para os demais.' : /eficiência/.test(why) ? (sim.moist > 9 ? `Minério úmido (${fm(sim.moist, 1)} %): reduza a alimentação, aumente a limpeza dos decks e acompanhe a colmatação.` : 'Eficiência baixa: verifique deck desgastado ou entupido e a carga da peneira.')
        : /vibração/.test(why) ? 'Vibração alta: inspecione mancais, molas e fixações; confira a carga e o desgaste.' : /sobrecarga/.test(why) ? 'Sobrecarga: ligue outro equipamento do grupo ou reduza a alimentação.' : /desgaste/.test(why) ? 'Programe a troca do deck/revestimento na próxima parada.' : 'Fora da faixa operacional.';
      probs.push(`<div class="card ${e.st === 'off' ? 'crit' : e.st}"><b>${nm(t, e)}</b> · ${val(e)}<small>${why ? why + ' · ' : ''}${dica}</small></div>`);
    }
    if (K.limited) probs.unshift(`<div class="card crit"><b>Circuito</b> · alimentação limitada<small>Britagem insuficiente para o retido: ligue os britadores parados ou reduza a alimentação.</small></div>`);
    $('#pS_pi').textContent = `${Object.values(E).filter((e) => e.st !== 'ok').length} fora da faixa`; $('#pS_prob').textContent = probs.length ? `${probs.length}` : 'nenhum';
    if (on('pi') || force) {
      $('#pB_pi').innerHTML = Object.entries(E).map(([t, e]) => `<div class="hs ${dot(e)}" data-i="${t}"><i></i><div>${nm(t, e)}</div><span>${val(e)}</span></div>`).join('') +
        `<div class="hs ${K.circ > 70 ? 'warn' : ''}"><i></i><div>Carga circulante</div><span>${fm(K.circ)} %</span></div><div class="hs"><i></i><div>Produto britado (P80 da moagem)</div><span>${sim.p80 ? fm(sim.p80) + ' µm' : 'sem simulador'}</span></div>`;
      el.querySelectorAll('#pB_pi [data-i]').forEach((d) => d.onclick = () => openInfo(d.dataset.i)); }
    if (on('prob') || force) $('#pB_prob').innerHTML = probs.join('') || '<div class="card">Nenhum desvio nos pontos de inspeção desta área.</div>';
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
  // ---- QR Code da área (sessão atual; só a sala de controle gera e imprime)
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const QB = $('#pB_qr'); let QV = null;
  const qrURL = () => SIM_URL + '?area=crush' + (QV ? '&q=' + QV : '');
  const loadQRLib = () => new Promise((res) => { if (window.qrcode) return res(); const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.onload = () => res(); sc.onerror = () => res(); document.head.appendChild(sc); });
  const qrSVG = (txt, px) => { try { const q = window.qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag({ cellSize: Math.max(2, Math.floor(px / (q.getModuleCount() + 8))), margin: 4, scalable: true }); } catch (e) { return ''; } };
  async function drawQR() {
    QB.innerHTML = '<p class="hint">Carregando o QR Code atual…</p>';
    let info = { admin: false, q: null }; try { info = await call('acessoQrInfo', [getToken()]); } catch (e) { info = { admin: false, q: null, err: e.message }; }
    if (!info.admin) { QB.innerHTML = `<p class="hint">Os QR Codes são gerados e impressos só pela sala de controle (entre no simulador com a senha).${info.err ? ' · ' + esc(info.err) : ''}</p>`; return; }
    QV = info.q; await loadQRLib();
    QB.innerHTML = `<div class="qrrow"><div class="qrbox">${qrSVG(qrURL(), 128)}</div><div class="hint"><b style="color:#ffd24a">Válido só nesta sessão:</b> a cada abertura do simulador os QR Codes mudam e os anteriores deixam de funcionar. Ao escanear com o celular e ter o acesso autorizado, o operador abre o simulador <b>nesta área</b>, podendo <b>alterar só os parâmetros dela</b>.<br>
      <a href="${esc(qrURL())}" target="_blank" rel="noopener" style="color:#5cc6dc">Abrir o link</a></div></div>
      <div class="row2" style="margin-top:8px"><button class="btn2" id="qrPr">Imprimir placa</button><button class="btn2 red" id="qrNew">Gerar novos QR Codes</button></div>`;
    $('#qrPr').onclick = () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><head><title>QR Code · área 3</title><style>body{font-family:Arial,sans-serif;margin:0}.pl{width:9.5cm;height:12.5cm;border:2px solid #111;border-radius:10px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:.4cm;text-align:center;padding:.3cm;box-sizing:border-box}.n{font-size:34px;font-weight:800;background:#0d3b4f;color:#fff;border-radius:50%;width:56px;height:56px;line-height:56px}h2{font-size:17px;margin:.25cm 0}p{font-size:11px;color:#333;margin:.2cm 0 0}svg{width:6cm;height:6cm}</style></head><body><div class="pl"><div class="n">3</div><h2>Peneiramento e britagem</h2>${qrSVG(qrURL(), 230)}<p>Escaneie com o celular para acessar e operar esta área</p></div></body></html>`); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (x) { /* impressão */ } }, 500); };
    $('#qrNew').onclick = async () => { if (!confirm('Gerar novos QR Codes? Todas as placas impressas deixam de funcionar e todos os celulares conectados perdem o acesso.')) return; try { const r = await call('acessoQrNovo', [getToken()]); QV = r && r.q; logEv('Acesso', 'Novos QR Codes gerados pelo gêmeo digital'); drawQR(); } catch (e) { alert('Não foi possível gerar: ' + e.message); } };
  }
  let qrDone = false;
  // ---- Registro de inspeção (mesma planilha do simulador) + análise pela IA
  const IB = $('#pB_insp'); let INSP = [];
  const locais = Object.keys(sim.eq).map((t) => (sim.eq[t].k === 'pn' ? 'Peneira ' : sim.eq[t].k === 'cone' ? 'HP 400 ' : 'Barmac ') + t);
  IB.innerHTML = `<div class="row2"><select id="inTipo"><option>Anomalia</option><option>Falha</option><option>Erro operacional</option><option>Condição insegura</option><option>Vazamento</option><option>Ruído/vibração</option><option>Acidente de trabalho</option></select><select id="inSev"><option>Baixa</option><option selected>Média</option><option>Alta</option><option>Crítica</option></select></div>
    <select id="inLocal"><option value="">Local/equipamento…</option>${locais.map((l) => `<option>${l}</option>`).join('')}<option>Correias / transferências</option><option>Outro</option></select>
    <textarea id="inDesc" rows="3" maxlength="1500" placeholder="Descreva o que foi encontrado na inspeção: o quê, onde, desde quando, condições observadas…"></textarea>
    <div class="row2"><input type="text" id="inOper" maxlength="60" placeholder="Operador (nome ou matrícula, opcional)" style="flex:2"><button class="btn2" id="inSave">Registrar</button></div>
    <button class="btn2 ai" id="inSaveAi" style="width:100%;margin-top:4px">Registrar e analisar com IA</button><p class="hint" id="inMsg"></p><div id="inList"></div><div id="inAi"></div>`;
  const sevc = (v) => (/crít|alta/i.test(v) ? 'crit' : /méd/i.test(v) ? 'warn' : '');
  function drawList() { $('#inList').innerHTML = INSP.length ? '<h5 style="margin:8px 0 4px;font:600 12px var(--disp);letter-spacing:.08em;color:#ffd24a;text-transform:uppercase">Registros recentes</h5>' + INSP.slice(0, 8).map((r, i) => `<div class="card ${sevc(r.severidade)}"><b>${esc(r.tipo)} · ${esc(r.severidade)}</b>${r.local ? ' · ' + esc(r.local) : ''}<small>${esc(r.data || r.tempo || '')}${r.operador ? ' · ' + esc(r.operador) : ''}${r.status ? ' · ' + esc(r.status) : ''}</small><div>${esc(r.descricao)}</div>${r.analise ? `<small>IA: ${esc(String(r.analise).slice(0, 220))}…</small>` : ''}<button class="btn2" data-ai="${i}" style="margin-top:5px;padding:3px 8px">Analisar com IA</button></div>`).join('') : '<p class="hint">Nenhum registro de inspeção para esta área.</p>';
    el.querySelectorAll('#inList [data-ai]').forEach((b) => b.onclick = () => analyze(INSP[+b.dataset.ai])); }
  async function loadList() { try { INSP = (await call('inspListar', ['crush'])) || []; } catch (e) { $('#inMsg').textContent = 'Não foi possível carregar os registros: ' + e.message; } drawList(); }
  function ctxIA(reg) {
    const E = sim.eq, K = sim.kpi;
    return { area: 'Área 3 · Peneiramento e britagem (Usina II)', indicadores: { lavra_t_h: Math.round(K.F), alimentacao_peneiras_t_h: Math.round(K.T), produto_t_h: Math.round(K.prod), carga_circulante_pct: Math.round(K.circ), potencia_kW: Math.round(K.kw), umidade_rom_pct: sim.moist, apf_mm: sim.css },
      pontos: Object.entries(E).map(([t, e], i) => ({ id: 'P' + (i + 1), nome: t, estado: e.st, carga_pct: Math.round(e.load * 100), vibracao_mm_s: +e.vib.toFixed(1), desgaste_pct: Math.round(e.w), eficiencia_pct: e.k === 'pn' ? Math.round(e.eff) : undefined })),
      alarmes: K.alarms, registros: [reg].concat(INSP.filter((r) => r !== reg).slice(0, 5)).map((r) => ({ tipo: r.tipo, severidade: r.severidade, local: r.local, descricao: r.descricao, data: r.data || r.tempo })) };
  }
  async function analyze(reg) {
    const out = $('#inAi'); out.innerHTML = '<p class="hint">A IA está analisando o registro de inspeção…</p>';
    try {
      const r = await call('aiAnalyze', [{ modo: 'inspecao', escopo: 'Área 3 · Peneiramento e britagem', pergunta: '', contexto: ctxIA(reg) }]);
      const sv = (x) => (/alta/i.test(x) ? 'crit' : /m[eé]dia/i.test(x) ? 'warn' : '');
      out.innerHTML = `<div class="card"><h6>Análise da IA</h6><b>${esc(r.resumo || '')}</b></div>${(r.achados || []).map((a) => `<div class="card ${sv(a.severidade)}"><b>${esc(a.titulo)}</b><small>${esc(a.evidencia || '')}</small></div>`).join('')}${(r.causas || []).map((c) => `<div class="card"><b>Causa provável:</b> ${esc(c.titulo || c.causa || c)}<small>${esc(c.explicacao || c.evidencia || '')}</small></div>`).join('')}${(r.recomendacoes || []).filter((c) => c && c.titulo).map((c) => `<div class="card"><b><span style="color:#ffd24a">Recomendação:</span> ${esc(c.titulo)}</b><small>${esc(c.efeito_esperado || '')}</small></div>`).join('')}<p class="hint">Gerado por ${esc(r.modelo || 'Gemini')}. A decisão final é do operador.</p>`;
      if (reg.linha) { const txt = [r.resumo].concat((r.recomendacoes || []).map((x) => '• ' + x.titulo)).join('\n'); call('inspSalvarAnalise', [{ linha: reg.linha, texto: txt }]).then(loadList).catch(() => {}); }
      logEv('IA', 'Análise de inspeção: ' + String(r.resumo || '').slice(0, 80));
    } catch (e) { out.innerHTML = `<p class="hint" style="color:#ff8a7a">Não foi possível analisar: ${esc(e.message)}</p>`; }
  }
  async function saveInsp(ai) {
    const r = { etapa: 3, area: 'crush', tipo: $('#inTipo').value, severidade: $('#inSev').value, local: $('#inLocal').value, descricao: $('#inDesc').value.trim(), operador: $('#inOper').value.trim(), tempo: new Date().toLocaleString('pt-BR') };
    if (r.descricao.length < 5) { $('#inMsg').textContent = 'Descreva o que foi encontrado.'; return; }
    $('#inMsg').textContent = 'Registrando…';
    try { const res = await call('inspRegistrar', [r]); r.linha = res && res.linha; r.data = r.tempo; $('#inDesc').value = ''; $('#inMsg').innerHTML = res && res.url ? `Registrado na planilha compartilhada. <a href="${esc(res.url)}" target="_blank" rel="noopener" style="color:#5cc6dc">Abrir</a>` : 'Registrado.';
      logEv('Inspeção', `${r.tipo} (${r.severidade}) · ${r.descricao.slice(0, 70)}`); INSP.unshift(r); drawList(); if (ai) analyze(r);
    } catch (e) { $('#inMsg').textContent = 'Não foi possível registrar: ' + e.message; }
  }
  $('#inSave').onclick = () => saveInsp(false); $('#inSaveAi').onclick = () => saveInsp(true);
  let inspDone = false;
  const lazy = () => { if (open.includes('qr') && !qrDone) { qrDone = true; drawQR(); } if (open.includes('insp') && !inspDone) { inspDone = true; loadList(); } };
  el.querySelectorAll('.s3sec>h5').forEach((h) => h.addEventListener('click', lazy)); lazy();
  render(true);
  return { update(frame) { if (frame % 20 === 0) render(false); } };
}
