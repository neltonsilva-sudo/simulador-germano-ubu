// Tour guiado pelo setor 3 seguindo o caminho do minério (entra → peneira → retidos → britagem → retorno → sai),
// com câmera animada, narração com valores ao vivo e abertura da tela do equipamento em cada parada.
const CSS = `
.s3tour{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:8;width:min(620px,calc(100vw - 28px));border-radius:12px;background:rgba(14,24,38,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.45);color:#dce6ee;font:13px/1.5 system-ui;padding:12px 14px}
.s3tour h3{margin:0 0 4px;font-size:15px;color:#ffd24a;display:flex;gap:8px;align-items:center}.s3tour h3 small{margin-left:auto;color:#9fb0bd;font-weight:600}
.s3tour .ctrl{display:flex;gap:6px;margin-top:10px;align-items:center}.s3tour .ctrl button{border:0;border-radius:8px;padding:7px 12px;font:700 12px system-ui;cursor:pointer;background:#1f3a5c;color:#fff}
.s3tour .ctrl .pr{flex:1;height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}.s3tour .ctrl .pr i{display:block;height:100%;background:#5cc6dc}
@media (max-width:860px){.s3tour{bottom:150px}}
`;
const f0 = (v) => Math.round(v || 0).toLocaleString('pt-BR');
export const STOPS = [
  { t: 'Entrada · ROM pela TCLD', cam: { pos: [-15, 21, -7], look: [3, 16.5, 2.4], fov: 58 }, txt: (K) => `O minério da mina (ROM) chega pela correia de longa distância (TCLD) a ${f0(K.F)} t/h e sobe até o topo do prédio. É a ENTRADA do setor 3.` },
  { t: 'Distribuidor e alimentadores 03AL', cam: { pos: [4, 16.3, 8.2], look: [15, 15.2, 2.6], fov: 64 }, eq: '03AL002', txt: (K) => `No piso +14 m, o distribuidor (tripper) reparte o ROM e o retorno dos britadores entre os 8 alimentadores 03AL, que dosam ${f0(K.T / Math.max(1, K.nPN))} t/h para cada peneira. O sinaleiro azul indica alimentador operando.` },
  { t: 'Peneira banana 03PN002', cam: { pos: [12.2, 9.4, 15.8], look: [9, 9.3, 8.6], fov: 66 }, eq: '03PN002', txt: (K) => `Cada peneira banana tem 2 decks. O minério escorre pelos segmentos de 28°, 18° e 9° enquanto vibra a cerca de 16 Hz. O que passa no 2º deck (< 12,5 mm) é produto; o resto volta para britagem. Alimentação total das 8 peneiras: ${f0(K.T)} t/h.` },
  { t: 'Retidos dos decks', cam: { pos: [18, 4.4, 18.5], look: [28, 6, 13.2], fov: 64 }, txt: (K) => `Sob as descargas, duas correias recolhem o retido: o do 1º deck (${f0(K.T * K.r1)} t/h, mais grosso) vai para a britagem primária; o do 2º deck (${f0(K.T * K.r2)} t/h) vai para a britagem secundária.` },
  { t: 'Britagem primária · HP 400', cam: { pos: [47.2, 3.2, 1.4], look: [55, 2.6, 7], fov: 66 }, eq: '03BR001', txt: (K) => `Os 2 britadores cônicos HP 400 recebem o retido do 1º deck pelos silos e quebram por compressão. A abertura (APF) de ${K.css} mm define o tamanho do britado: menor APF = produto mais fino, menos retorno e mais potência.` },
  { t: 'Britagem secundária · Barmac', cam: { pos: [56.6, 2.7, 23.3], look: [61, 2.1, 17.5], fov: 62 }, eq: '03BR006', txt: () => 'Os 3 Barmac (VSI) recebem o retido do 2º deck. O rotor a cerca de 1.450 rpm lança as partículas contra uma cascata de minério: quebra por impacto, rocha contra rocha.' },
  { t: 'Retorno às peneiras · circuito fechado', cam: { pos: [54, 6.5, 21], look: [46, 6, 7], fov: 62 }, txt: (K) => `Todo o britado volta às peneiras pela correia de retorno (${f0(K.T - K.prod)} t/h). A carga circulante é de ${f0(K.circ)} % da alimentação nova: o minério só sai do circuito quando fica abaixo de 12,5 mm.` },
  { t: 'Saída · produto < 12,5 mm', cam: { pos: [38, 3.4, 23.6], look: [56, 2, 21.5], fov: 62 }, txt: (K) => `O passante do 2º deck segue pela correia do produto para a pilha de regularização a ${f0(K.prod)} t/h — a SAÍDA do setor. Em regime, sai o mesmo que entrou.` },
  { t: 'Visão do circuito completo', cam: { pos: [-10, 40, 72], look: [32, 3, 10], fov: 50 }, txt: (K) => `Resumo: entra ${f0(K.F)} t/h de ROM, as peneiras recebem ${f0(K.T)} t/h, ${f0(K.T - K.prod)} t/h circulam pela britagem e sai ${f0(K.prod)} t/h de produto. Potência total ${f0(K.kw)} kW (${(K.spec || 0).toFixed(2).replace('.', ',')} kWh/t).` },
];

export function buildTour(root, sim, { setCamTo, openEq, closeEq, setWalk }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 's3tour'; el.hidden = true; root.appendChild(el);
  let i = 0, playing = true, t = 0; const DUR = 14;
  function show() {
    const s = STOPS[i]; setWalk(false); setCamTo(s.cam); if (s.eq) openEq(s.eq); else closeEq();
    el.innerHTML = `<h3>${i + 1}. ${s.t}<small>${i + 1} de ${STOPS.length}</small></h3><div id="tTxt">${s.txt(Object.assign({ css: sim.css }, sim.kpi))}</div>
      <div class="ctrl"><button data-a="prev">◀</button><button data-a="play">${playing ? '⏸ Pausar' : '▶ Continuar'}</button><button data-a="next">▶</button><div class="pr"><i id="tPr"></i></div><button data-a="end">Sair do tour</button></div>`;
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { const a = b.dataset.a; if (a === 'prev') go(i - 1); else if (a === 'next') go(i + 1); else if (a === 'play') { playing = !playing; show(); } else stop(); });
    t = 0;
  }
  function go(n) { i = (n + STOPS.length) % STOPS.length; show(); }
  function start() { el.hidden = false; i = 0; playing = true; show(); }
  function stop() { el.hidden = true; closeEq(); }
  return {
    start, stop, active: () => !el.hidden,
    update(dt) { if (el.hidden) return; if (playing) { t += dt; if (t > DUR) { if (i < STOPS.length - 1) go(i + 1); else { playing = false; show(); } } }
      const pr = el.querySelector('#tPr'); if (pr) pr.style.width = Math.min(100, t / DUR * 100) + '%';
      const tx = el.querySelector('#tTxt'); if (tx && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) tx.textContent = STOPS[i].txt(Object.assign({ css: sim.css }, sim.kpi)); },
  };
}
