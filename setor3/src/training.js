// TREINAMENTO NO GÊMEO (primeira pessoa): cenários de segurança com os comandos reais do setor 3 (botoeiras, LOTO, cordão, tampa do Barmac,
// sala de controle) e ronda de inspeção com anomalias plantadas no 3D. O resultado vai para o histórico do simulador e para o painel da turma.
import * as THREE from 'three';
import { sim, itemOf, SEQ, finishMnt, syncCtl, cmd } from './sim.js?v=20261022202407';
import { call } from './api.js?v=20261022202407';

const CSS = `
.s3tr{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9;width:min(460px,94vw);max-height:48vh;overflow:auto;background:rgba(12,20,28,.93);border:1px solid rgba(255,178,61,.5);border-radius:12px;padding:10px 12px;color:#fff;font:12.5px system-ui;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.s3tr .h{display:flex;gap:8px;align-items:baseline}.s3tr .h b{color:#ffb23d}.s3tr .h span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s3tr .h em{font-style:normal;color:#cfe3ee;font-variant-numeric:tabular-nums}
.s3tr ol{list-style:none;margin:8px 0;padding:0;display:grid;gap:5px}.s3tr li{display:grid;grid-template-columns:20px 1fr auto;gap:6px;line-height:1.35}.s3tr li .i{text-align:center;font-weight:700;color:#9fb3bf}.s3tr li.ok .i{color:#2fbf71}.s3tr li.late .i{color:#ffb020}
.s3tr li small{display:block;color:#ffe08a}.s3tr button{border:1px solid rgba(255,255,255,.2);background:#1f3a5c;color:#fff;border-radius:6px;padding:5px 9px;font:600 12px system-ui;cursor:pointer}.s3tr button.pri{background:#1f8a5b;border-color:#2fbf71}
.s3tr .row{display:flex;gap:6px;justify-content:space-between;align-items:center;flex-wrap:wrap}.s3tr .pt{border-top:1px solid rgba(255,255,255,.12);margin-top:6px;padding-top:6px}.s3tr .pt p{margin:4px 0}.s3tr .opts{display:grid;gap:4px}.s3tr .opts button{text-align:left}
.s3tr .hint{color:#9fb3bf}.s3mk{position:fixed;z-index:6;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;background:#ffb23d;color:#1d2733;border:2px solid #fff;border-radius:50% 50% 50% 0;width:28px;height:28px;display:grid;place-items:center;font:800 13px system-ui;box-shadow:0 4px 12px rgba(0,0,0,.5)}
.s3mk.done{background:#2fbf71}.s3mk.cur{outline:3px solid #fff;animation:s3mk 1s ease-in-out infinite}@keyframes s3mk{50%{transform:translate(-50%,-110%)}}
.s3trd{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(3,10,20,.6)}.s3trd .bx{width:min(620px,94vw);max-height:86vh;overflow:auto;background:#0f1a26;border:1px solid rgba(120,170,235,.3);border-radius:12px;padding:16px;color:#fff;font:13px system-ui}
.s3trd h3{margin:0 0 8px}.s3trd .c{display:grid;gap:6px;margin:8px 0}.s3trd .c div{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px}.s3trd .c b{color:#ffb23d}.s3trd small{color:#9fb3bf}
.s3trd button{border:1px solid rgba(255,255,255,.2);background:#1f3a5c;color:#fff;border-radius:6px;padding:6px 10px;font:600 12.5px system-ui;cursor:pointer}.s3trd button.pri{background:#1f8a5b;border-color:#2fbf71}.s3trd table{width:100%;border-collapse:collapse;font-size:12px}.s3trd td{border-top:1px solid rgba(255,255,255,.08);padding:3px 4px}
.s3trd .n{font:800 40px system-ui}.s3trd .n.ok{color:#2fbf71}.s3trd .n.w{color:#ffd24a}.s3trd .n.c{color:#ff5a4a}
`;
const E = (t) => sim.eq[t], Bt = (t) => sim.belts[t];
const CAM = { hp: { pos: [45.8, 1.75, 13.6], look: [48.2, 1.2, 10.6], fov: 60 }, vsi: { pos: [45.2, 1.75, 11.2], look: [47.7, 1.2, 14.2], fov: 60 }, cord: { pos: [20.8, 18.9, 7.2], look: [23.85, 17.8, 3.3], fov: 60 } };
const TIPOS = ['Sem anomalia', 'Vazamento de óleo', 'Desalinhamento de correia', 'Acúmulo de material no piso', 'Dispositivo de segurança com defeito', 'Vibração ou desgaste anormal'];
const PTS = [
  { n: 'Britador HP 400 03BR001', c: [47.5, 2.0, 12.5], l: [51, 1.5, 7.5], p: [51, 1.6, 10.4], a: 0 }, { n: 'Britador HP 400 03BR002 (base)', c: [57.5, 2.2, 12.5], l: [61.2, .3, 9.4], p: [60.2, 1.0, 10.2], a: 1 },
  { n: 'Barmac 03BR005', c: [55.5, 2.4, 12.6], l: [55.5, 1.4, 17], p: [55.5, 1.6, 14.6], a: 5, info: () => { const e = E('03BR005'); return `Leitura local: vibração ${(e.vib || 0).toFixed(1).replace('.', ',')} mm/s · desgaste ${Math.round(e.w)} % (limite de troca 85 %)`; } },
  { n: 'Correia de retorno 03TC004', c: [53, 2.4, 16], l: [56.5, 1.4, 13.2], p: [56, 1.7, 14.4], a: 2, info: () => `Chave de desalinhamento: ${(Bt('03TC004').align || 0).toFixed(0)}° (alarme 10°, parada 20°)` },
  { n: 'Passarela da peneira 03PN003', c: [20.5, 9.3, 3.0], l: [16.4, 7.6, 2.0], p: [16.4, 8.4, 3.2], a: 3 }, { n: 'Botoeira da peneira 03PN006', c: [36, 9.1, 1.8], l: [33.1, 8.6, 3.2], p: [33.1, 8.7, 4.4], a: 0 },
  { n: 'Cordão de emergência da 03TC005', c: [22, 1.8, 16.5], l: [22, .9, 19.6], p: [22, 1.7, 18.6], a: 4 }, { n: 'Peneira 03PN001', c: [7, 9.4, 2.2], l: [3.5, 8.5, 6], p: [3.5, 8.5, 3.6], a: 0 }];
const SCN = {
  loto: { nome: 'LOTO no britador HP 400 (03BR001)', min: 12, desc: 'Prepare o 03BR001 para a troca do revestimento: pare, isole a lubrificação, bloqueie, teste a energia zero e libere a manutenção. Use a botoeira de campo e o painel do equipamento.',
    go: () => ['03BR001', CAM.hp],
    obj: [{ t: 'Parar o britador 03BR001 (botão O)', pts: 20, ok: () => !E('03BR001').on, d: 'Na botoeira do 03BR001 (caixa cinza no pedestal amarelo), aperte O.' },
      { t: 'Desligar a bomba de lubrificação depois da parada', pts: 15, ok: () => !E('03BR001').on && !E('03BR001').lube, d: 'Painel do equipamento › Unidade de lubrificação › Desligar bomba (só com o britador parado).' },
      { t: 'Aplicar o bloqueio (LOTO) com os 4 passos', pts: 25, ok: () => !!E('03BR001').lock, d: 'Botoeira › Aplicar bloqueio (LOTO): marque os 4 passos e confirme.' },
      { t: 'Testar a partida com o equipamento bloqueado (energia zero)', pts: 20, ok: (r) => (sim.denied || []).some((x) => x.tag === '03BR001' && x.a === 'start' && x.locked && x.rt >= r.rt0), d: 'Com o cadeado aplicado, aperte I: a partida tem de ser recusada.' },
      { t: 'Iniciar a manutenção', pts: 20, ok: () => !!E('03BR001').mnt, d: 'Botão Manutenção no fim do painel do equipamento.' }] },
  cordao: { nome: 'Parada pelo cordão de emergência (03TC001)', min: 12, desc: 'Alguém puxou o cordão de emergência da correia de distribuição 03TC001. O circuito parou por intertravamento. Investigue, rearme no campo e reparta na sequência correta.',
    setup: () => { cmd('03TC001', 'cord', 'L'); }, go: () => ['03TC001', CAM.cord],
    obj: [{ t: 'Identificar a correia parada: abrir o painel da 03TC001', pts: 15, ok: (r) => r.eqs.tag() === '03TC001', d: 'Clique numa caixa amarela do cordão ao longo da 03TC001 (no alto, sobre as peneiras) ou na tag em Sala de controle.' },
      { t: 'Verificar o local e rearmar a chave do cordão no campo', pts: 25, ok: () => !Bt('03TC001').cord, d: 'No painel da 03TC001: Rearmar chave do cordão (no campo).' },
      { t: 'Rearmar o desarme da 03TC001 (botão R)', pts: 20, ok: () => !Bt('03TC001').trip && !Bt('03TC001').cord, d: 'Botão R da botoeira da correia.' },
      { t: 'Rearmar os intertravamentos e repartir na sequência (Sala de controle)', pts: 40, ok: () => SEQ.every((t) => { const o = itemOf(t); return o.on || o.lock || o.mnt; }), d: 'Painel esquerdo › Sala de controle: “Rearmar intertravamentos” e depois “Partida sequencial”.' }] },
  barmac: { nome: 'Inspeção do rotor do Barmac (03BR004)', min: 12, desc: 'Inspecione as pontas do rotor do Barmac 03BR004. A tampa de inspeção é intertravada: só abre com o rotor parado e o bloqueio aplicado.',
    go: () => ['03BR004', CAM.vsi],
    obj: [{ t: 'Parar o Barmac 03BR004', pts: 15, ok: () => !E('03BR004').on, d: 'Botoeira do 03BR004 › O.' },
      { t: 'Aguardar a parada total do rotor', pts: 15, ok: () => !E('03BR004').on && !(E('03BR004').coast > 0), d: 'O rotor leva cerca de 25 s para parar: observe a lâmpada “Rotor parando”.' },
      { t: 'Aplicar o bloqueio (LOTO)', pts: 20, ok: () => !!E('03BR004').lock, d: 'Botoeira › Aplicar bloqueio (LOTO).' },
      { t: 'Abrir a tampa de inspeção', pts: 20, ok: () => E('03BR004').lid === false, d: 'Proteções intertravadas › Abrir tampa de inspeção.' },
      { t: 'Fechar a tampa, retirar o bloqueio e religar o 03BR004', pts: 30, ok: () => E('03BR004').lid && !E('03BR004').lock && E('03BR004').on, d: 'Feche a tampa, retire o bloqueio, passe para LOCAL ou use a sala de controle e ligue.' }] },
  ronda: { nome: 'Ronda de inspeção do setor 3', min: 15, ronda: true, desc: 'Percorra os 8 pontos de inspeção (marcadores numerados), aproxime-se de cada um e registre se há anomalia e de que tipo. Use “Caminhar” para andar pelo setor.',
    obj: PTS.map((p, i) => ({ t: `Ponto ${i + 1}: ${p.n}`, pts: 12.5 })) } };

export function buildTraining({ root, scene, camera, setCam, setWalk, eqs, logEv }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const card = document.createElement('div'); card.className = 's3tr'; card.hidden = true; root.appendChild(card);
  let R = null, plant = [], marks = [], snap = null;
  const user = () => { try { return JSON.parse(localStorage.getItem('trUser') || 'null'); } catch (e) { return null; } };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function save() { const o = {}; for (const t of SEQ) { const x = itemOf(t); o[t] = { on: x.on, lock: x.lock || null, mode: x.mode, es: !!x.es, trip: x.trip || null, lube: x.lube, lid: x.lid, guard: x.guard, coast: x.coast, w: x.w, cord: x.cord, align: x.align, mnt: !!x.mnt }; } return o; }
  function restore() { if (!snap) return; for (const [t, q] of Object.entries(snap)) { const x = itemOf(t); if (!x) continue; if (x.mnt && !q.mnt) { const r = finishMnt(t, x, true); if (r) { r.shown = true; r.sent = true; } }
      for (const k of ['on', 'lock', 'mode', 'es', 'trip', 'lube', 'lid', 'guard', 'coast', 'w', 'cord', 'align']) if (q[k] !== undefined) x[k] = q[k];
      syncCtl(t); if (sim.eq[t] && sim.cmdEq) sim.cmdEq(t, { on: x.on, mnt: false }); }
    snap = null; logEv('Treinamento', 'Setor 3 restaurado ao estado anterior ao treinamento'); }
  function clearPlant() { for (const m of plant) { m.parent && m.parent.remove(m); m.geometry && m.geometry.dispose(); } plant = []; for (const m of marks) m.el.remove(); marks = []; }
  function plantRonda() { // anomalias físicas no 3D + condições nos dados (vibração/desgaste e desalinhamento reais no modelo)
    const add = (m) => { scene.add(m); plant.push(m); return m; };
    const oil = add(new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: .06, metalness: .3, transparent: true, opacity: .92 })));
    oil.rotation.x = -Math.PI / 2; oil.scale.set(1.5, .9, 1); oil.position.set(61.3, .02, 9.4);
    const ore = new THREE.MeshStandardMaterial({ color: 0x4e2a18, roughness: .98, flatShading: true }), pg = new THREE.SphereGeometry(.9, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), pa = pg.attributes.position;
    for (let k = 0; k < pa.count; k++) pa.setY(k, pa.getY(k) * (.75 + Math.random() * .5)); pg.computeVertexNormals(); const pile = add(new THREE.Mesh(pg, ore)); pile.scale.set(.95, .24, .6); pile.position.set(16.4, 7.52, 2.0);
    for (let k = 0; k < 26; k++) { const s = .03 + Math.random() * .07, r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), ore)); r.position.set(16.4 + (Math.random() - .5) * 2.2, 7.52 + s * .4, 2.0 + (Math.random() - .5) * 1.2); }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(20.2, 1.9, 19.6), new THREE.Vector3(21.2, .9, 19.65), new THREE.Vector3(22, .55, 19.7), new THREE.Vector3(23.2, 1.0, 19.65)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, .014, 6), new THREE.MeshStandardMaterial({ color: 0xd8401f, roughness: .6 })));
    const e5 = E('03BR005'); e5.w = Math.max(e5.w, 91); const b4 = Bt('03TC004'); b4.align = 15; syncCtl('03TC004');
    PTS.forEach((p, i) => { const el = document.createElement('div'); el.className = 's3mk'; el.textContent = i + 1; el.title = p.n; el.onclick = () => { R.cur = i; render(true); }; document.body.appendChild(el); marks.push({ el, v: new THREE.Vector3(...p.p) }); }); }
  function open() { if (R) { card.hidden = false; return; }
    let d = document.querySelector('.s3trd'); if (d) d.remove(); d = document.createElement('div'); d.className = 's3trd'; const u = user();
    d.innerHTML = `<div class="bx"><h3>🎓 Treinamento no gêmeo · segurança e operação</h3><small>${u ? `Treinando: <b>${u.nome}</b>${u.turma ? ' · ' + u.turma : ''} (identificação do simulador)` : 'Identifique-se no Treinamento do simulador para o resultado ir ao painel da turma.'}</small>
      <div class="c">${Object.entries(SCN).map(([k, s]) => `<div><span><b>${s.nome}</b><br><small>${s.desc}</small><br><small>${s.obj.length} etapas · até ${s.min} min</small></span><button class="pri" data-k="${k}">Iniciar</button></div>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;display:flex"><button data-x>Fechar</button></div></div>`;
    document.body.appendChild(d); d.onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) { d.remove(); start(b.dataset.k); } if (e.target === d || e.target.closest('[data-x]')) d.remove(); }; }
  function start(k) { const s = SCN[k]; if (!s || R) return; snap = save(); sim.denied = [];
    R = { k, s, t0: performance.now(), rt0: sim.rt || 0, eqs, st: s.obj.map(() => ({ done: false, at: null, late: false, pts: 0, ans: null })), cur: 0, log0: sim.log.length ? sim.log[0] : null };
    try { s.setup && s.setup(); } catch (e) { /* ignore */ }
    if (s.ronda) { plantRonda(); try { setWalk(true, 0); } catch (e) { /* ignore */ } } else if (s.go) { const [tag, cam] = s.go(); setCam(cam); setTimeout(() => eqs.open(tag), 900); }
    logEv('Treinamento', `Início (gêmeo): ${s.nome}`); card.hidden = false; render(true); }
  function tick() { if (!R || R.s.ronda) return; const done = R.st.filter((q) => q.done).length;
    R.s.obj.forEach((o, i) => { const q = R.st[i]; if (q.done) return; let v = false; try { v = !!o.ok(R); } catch (e) { /* */ } if (!v) return;
      q.done = true; q.at = (performance.now() - R.t0) / 1000; q.late = R.st.slice(0, i).some((p) => !p.done); q.pts = q.late ? Math.round(o.pts / 2) : o.pts; logEv('Treinamento', `✓ ${o.t}${q.late ? ' (fora de ordem)' : ''}`); });
    if (R.st.every((q) => q.done)) end(); else if (R.st.filter((q) => q.done).length !== done) render(true); }
  function render(force) { if (!R) { card.hidden = true; return; } const el = (performance.now() - R.t0) / 1000, s = R.s;
    const unsafe = (sim.denied || []).filter((x) => /lid|guard|align/.test(x.a)).length, pts = Math.max(0, R.st.reduce((a, q) => a + q.pts, 0) - Math.min(20, unsafe * 5));
    let pt = '';
    if (s.ronda) { const i = R.cur, p = PTS[i], q = R.st[i], dist = camera.position.distanceTo(new THREE.Vector3(...p.p));
      pt = `<div class="pt"><b>Ponto ${i + 1} · ${p.n}</b> <small class="hint">(${dist.toFixed(0)} m)</small>${dist > 7 ? `<p class="hint">Aproxime-se a menos de 7 m para inspecionar (Caminhar: W A S D). <button data-goi="${i}">Ir até o ponto</button></p>` : `${p.info ? `<p>📟 ${p.info()}</p>` : ''}<p>Qual é a condição deste ponto?</p><div class="opts">${TIPOS.map((t, j) => `<button data-ans="${j}"${q.ans != null ? ' disabled' : ''} style="${q.ans === j ? 'border-color:#5cc6dc;background:rgba(92,198,220,.2)' : ''}">${t}</button>`).join('')}</div>`}</div>`; }
    card.innerHTML = `<div class="h"><b>🎓 Treinamento</b><span>${s.nome}</span><em>${mmss(el)} / ${s.min}:00</em></div>
      ${s.ronda ? `<p class="hint" style="margin:6px 0 0">Inspecionados: <b>${R.st.filter((q) => q.done).length}/${PTS.length}</b> · clique num marcador numerado no 3D para escolher o ponto.</p>` : ''}<ol${s.ronda ? ' hidden' : ''}>${s.obj.map((o, i) => { const q = R.st[i]; return `<li class="${q.done ? (q.late ? 'late' : 'ok') : ''}"><span class="i">${q.done ? (s.ronda ? '●' : q.late ? '◐' : '✓') : '○'}</span><span>${o.t}${!q.done && o.d && R.st.slice(0, i).every((p) => p.done) ? `<small>💡 ${o.d}</small>` : ''}</span><b>${s.ronda ? (q.done ? '–' : '') : Math.round(q.pts)}</b></li>`; }).join('')}</ol>${pt}
      <div class="row"><span>Pontos: <b>${s.ronda ? '–' : pts}</b>${unsafe ? ` · ${unsafe} tentativa(s) insegura(s) bloqueada(s)` : ''}</span><span style="display:flex;gap:6px">${s.go ? '<button data-go>Ir até lá</button>' : ''}<button data-end>Encerrar</button></span></div>`;
    card.onclick = (e) => { if (e.target.closest('[data-end]')) end(); if (e.target.closest('[data-go]')) { const [tag, cam] = s.go(); setCam(cam); setTimeout(() => eqs.open(tag), 900); }
      const gi = e.target.closest('[data-goi]'); if (gi) { const p = PTS[+gi.dataset.goi]; setWalk(false); setCam({ pos: p.c, look: p.l, fov: 62 }); setTimeout(() => render(true), 1600); }
      const a = e.target.closest('[data-ans]'); if (a) { const q = R.st[R.cur]; q.ans = +a.dataset.ans; q.done = true; q.at = (performance.now() - R.t0) / 1000; q.pts = q.ans === PTS[R.cur].a ? 12.5 : 0; logEv('Treinamento', `Ronda · ponto ${R.cur + 1}: ${TIPOS[q.ans]}`);
        const nx = R.st.findIndex((x) => !x.done); if (nx < 0) end(); else { R.cur = nx; render(true); } } }; }
  function end() { if (!R) return; const r = R; R = null; const el = (performance.now() - r.t0) / 1000, s = r.s, unsafe = (sim.denied || []).filter((x) => /lid|guard|align/.test(x.a)).length;
    const nota = Math.max(0, Math.round(r.st.reduce((a, q) => a + q.pts, 0) - Math.min(20, unsafe * 5))), cls = nota >= 85 ? 'Excelente' : nota >= 70 ? 'Bom' : nota >= 50 ? 'Regular' : 'Precisa treinar mais', u = user() || {};
    card.hidden = true; for (const m of marks) m.el.remove(); marks = [];
    try { const H = JSON.parse(localStorage.getItem('trHist') || '[]'); H.unshift({ d: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), n: 'Gêmeo · ' + s.nome, p: nota, nome: u.nome, lvl: 'Gêmeo' }); localStorage.setItem('trHist', JSON.stringify(H.slice(0, 30))); } catch (e) { /* */ }
    logEv('Treinamento', `Fim (gêmeo): ${s.nome} · nota ${nota}`);
    const d = document.createElement('div'); d.className = 's3trd';
    d.innerHTML = `<div class="bx"><h3>Resultado · ${s.nome}</h3><small>${u.nome ? '👤 ' + u.nome + ' · ' : ''}tempo ${mmss(el)}${unsafe ? ` · ${unsafe} tentativa(s) insegura(s) bloqueada(s) pelo intertravamento (−${Math.min(20, unsafe * 5)} pts)` : ''}</small>
      <div class="n ${nota >= 70 ? 'ok' : nota >= 50 ? 'w' : 'c'}">${nota} <small style="font-size:14px">de 100 · ${cls}</small></div>
      <table>${s.obj.map((o, i) => { const q = r.st[i]; return `<tr><td>${s.ronda ? (q.ans === PTS[i].a ? '✓' : '✗') : q.done ? (q.late ? '◐' : '✓') : '✗'} ${o.t}${s.ronda ? `<br><small>${q.ans == null ? 'não inspecionado' : 'você: ' + TIPOS[q.ans]} · correto: ${TIPOS[PTS[i].a]}</small>` : !q.done ? `<br><small>${o.d || ''}</small>` : q.late ? '<br><small>feito fora de ordem: metade dos pontos</small>' : ''}</td><td style="text-align:right">${q.done ? mmss(q.at) : '–'}</td><td style="text-align:right"><b>${Math.round(q.pts)}</b>/${o.pts}</td></tr>`; }).join('')}</table>
      <p class="hint" data-st>Enviando para o painel da turma…</p><div class="row" style="display:flex;justify-content:flex-end;gap:8px"><button class="pri" data-rs>↺ Restaurar o setor ao normal</button><button data-x>Fechar</button></div></div>`;
    document.body.appendChild(d); d.onclick = (e) => { if (e.target.closest('[data-rs]')) { restore(); clearPlant(); const b = e.target.closest('[data-rs]'); b.disabled = true; b.textContent = '✓ Setor restaurado'; } if (e.target === d || e.target.closest('[data-x]')) d.remove(); };
    call('inspRegistrar', [{ etapa: 0, area: 'treinamento', tipo: 'Treinamento', severidade: cls, local: 'Gêmeo · ' + s.nome, descricao: `Nota ${nota} | Nível Gêmeo | Pré -/5 → Pós -/5 | Dicas 0 | Turma ${u.turma || '-'} | Matrícula ${u.mat || '-'} | Erros: ${r.st.map((q, i) => q.done && q.pts >= s.obj[i].pts ? null : s.obj[i].t.slice(0, 50)).filter(Boolean).join('; ') || 'nenhum'}`, operador: u.nome || '', tempo: new Date().toLocaleString('pt-BR') }])
      .then(() => { const e = d.querySelector('[data-st]'); if (e) e.textContent = '✓ Resultado enviado para o painel da turma.'; }).catch(() => { const e = d.querySelector('[data-st]'); if (e) e.textContent = 'Sem conexão: resultado salvo no histórico deste navegador.'; }); }
  const v = new THREE.Vector3(); let k = 0;
  try { const q = new URLSearchParams(location.search).get('tr'); if (q && SCN[q]) setTimeout(() => start(q), 2500); } catch (e) { /* */ }
  return { open, start, isOn: () => !!R, update() { if (!R) return; if (++k % 10 === 0) { tick(); if (R && R.s.ronda) render(); else if (R && k % 30 === 0) render(); }
    for (const [i, m] of marks.entries()) { v.copy(m.v).project(camera); const vis = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; m.el.style.display = vis ? 'grid' : 'none';
      if (vis) { m.el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; m.el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; } m.el.classList.toggle('done', !!(R && R.st[i] && R.st[i].done)); m.el.classList.toggle('cur', !!(R && R.cur === i)); } } };
}
