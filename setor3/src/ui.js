// Interface: cartão de título, barra de vistas (câmeras das fotos), caminhar por nível, etiquetas dos equipamentos
// (projetadas sobre a cena) e cartão de informação ao clicar. Joystick na tela para celular.
import * as THREE from 'three';
import { buildPanels } from './panels.js?v=20261003132710';
import { buildEqScreen } from './eqscreen.js?v=20261003132710';
import { buildTour } from './tour.js?v=20261003132710';
import { logEv } from './sim.js?v=20261003132710';

const CSS = `
#ui [hidden]{display:none!important}
.s3card{position:fixed;left:14px;top:14px;z-index:5;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 6px 22px rgba(0,0,0,.18);color:#1d2733;max-width:calc(100vw - 28px)}
.s3card b{display:block;font-size:14px}.s3card small{color:#4a5866;font-size:11.5px}
.s3bar{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:6px;border-radius:12px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 6px 22px rgba(0,0,0,.18);max-width:calc(100vw - 360px)}
.s3bar button,.s3lv button{border:0;border-radius:8px;padding:7px 11px;font:600 12.5px system-ui;background:#eef2f6;color:#1d2733;cursor:pointer}
.s3bar button[aria-pressed=true],.s3lv button[aria-pressed=true]{background:#1f63b3;color:#fff}
.s3lv{position:fixed;left:14px;bottom:16px;z-index:5;display:flex;gap:6px;flex-direction:column;padding:6px;border-radius:12px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px)}
.s3tag{position:fixed;z-index:4;transform:translate(-50%,-100%);padding:3px 8px;border-radius:5px;background:#1f63b3;color:#fff;font:600 11.5px system-ui;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.s3tag:after{content:"";position:absolute;left:50%;top:100%;width:1px;height:14px;background:#1f63b3}
.s3info{position:fixed;left:14px;top:96px;z-index:6;width:min(360px,calc(100vw - 28px));padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);box-shadow:0 8px 26px rgba(0,0,0,.22);color:#1d2733;font-size:13px;line-height:1.45}
.s3info h3{margin:0 0 4px;font-size:15px;color:#1f63b3}.s3info button{float:right;border:0;background:none;font-size:18px;cursor:pointer;color:#555}
.s3help{position:fixed;right:14px;top:14px;z-index:5;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px);font-size:11.5px;color:#3a4652;max-width:240px}
.s3joy{position:fixed;right:22px;bottom:22px;z-index:5;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.7);touch-action:none;display:none}
.s3joy i{position:absolute;left:35px;top:35px;width:40px;height:40px;border-radius:50%;background:rgba(31,99,179,.85)}
.s3op{position:fixed;right:14px;top:96px;z-index:5;width:330px;max-height:calc(100vh - 120px);overflow:auto;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 6px 22px rgba(0,0,0,.2);color:#1d2733;font-size:12.5px}
.s3op h4{margin:8px 0 4px;font-size:12.5px;color:#1f63b3;text-transform:uppercase;letter-spacing:.04em}.s3op .bal{display:grid;grid-template-columns:1fr auto;gap:2px 10px}.s3op .bal b{text-align:right;font-variant-numeric:tabular-nums}
.s3op .in{color:#0a7a3e}.s3op .out{color:#b4561a}.s3op input[type=range]{width:100%}.s3op .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0}
.s3op .eqs{display:flex;flex-wrap:wrap;gap:4px}.s3op .eqs button{border:0;border-radius:6px;padding:4px 7px;font:600 11px system-ui;cursor:pointer;color:#fff}
.s3op .ok{background:#1f8a5b}.s3op .warn{background:#d98a00}.s3op .crit{background:#d0362b}.s3op .off{background:#8a939b}
.s3op .al{border-left:3px solid #d98a00;padding:3px 6px;margin:3px 0;background:#fff6e5;border-radius:0 4px 4px 0}.s3op .al.crit{border-color:#d0362b;background:#fdeceb;color:#1d2733}
.s3op .go{border:0;border-radius:8px;padding:8px 10px;font:700 12.5px system-ui;cursor:pointer;width:100%;color:#fff}
.s3flow{position:fixed;z-index:4;transform:translate(-50%,-50%);padding:4px 9px;border-radius:6px;font:700 11.5px system-ui;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;background:rgba(40,60,85,.92)}
.s3flow.in{background:#0e8a4a}.s3flow.out{background:#c2611c}
.s3info .grid{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:6px 0}.s3info .grid b{text-align:right}.s3info .act{display:flex;gap:6px;margin-top:8px}.s3info .act button{float:none;font:600 12px system-ui;border-radius:8px;padding:6px 10px;background:#eef2f6;color:#1d2733}
@media (max-width:860px){.s3op{top:auto;bottom:70px;right:8px;width:min(330px,calc(100vw - 16px));max-height:45vh}.s3bar{top:auto;bottom:16px;max-width:calc(100vw - 150px);left:auto;right:14px;transform:none}.s3help{display:none}.s3card{max-width:60vw}.s3joy{bottom:150px}}
`;

export function buildUI({ camera, controls, canvas, hotspots, setCam, setWalk, getWalk, CAMS, sim, flowLabels = [], pick = [], pickRoot = null }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.getElementById('ui');
  root.innerHTML = `<div class="s3card"><b>Gêmeo Digital · Setor 3 — Britagem e Peneiramento</b><small>Usina II · Germano · réplica 3D em escala real (modelo didático)</small></div>
   <div class="s3bar" id="s3bar">${Object.entries(CAMS).map(([k, c]) => `<button data-cam="${k}">${c.label}</button>`).join('')}<button id="s3tour" style="background:#ffd24a;color:#1d2733">▶ Tour</button><button id="s3walk" aria-pressed="false">Caminhar</button><button id="s3tags" aria-pressed="true">Etiquetas</button></div>
   <div class="s3lv" id="s3lv" hidden><button data-lv="2">Piso dos alimentadores (+14 m)</button><button data-lv="1">Piso das peneiras (+7,5 m)</button><button data-lv="0">Térreo</button></div>
   <div class="s3help">Arraste para girar · role para aproximar · <b>Caminhar</b>: W A S D ou setas, Shift corre, arraste para olhar. Clique numa etiqueta para ver o equipamento.</div>
   <div class="s3joy" id="s3joy"><i></i></div><div class="s3info" id="s3info" hidden></div>
   `;
  const $ = (s) => root.querySelector(s);
  root.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
  const lvBox = $('#s3lv');
  const refreshWalk = () => { const w = getWalk(); $('#s3walk').setAttribute('aria-pressed', w.walk); lvBox.hidden = !w.walk; lvBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.lv === w.level)); $('#s3joy').style.display = w.walk && matchMedia('(pointer:coarse)').matches ? 'block' : 'none'; };
  $('#s3walk').addEventListener('click', () => { setWalk(!getWalk().walk); refreshWalk(); });
  lvBox.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setWalk(true, +b.dataset.lv); refreshWalk(); }));
  let showTags = true; $('#s3tags').addEventListener('click', () => { showTags = !showTags; $('#s3tags').setAttribute('aria-pressed', showTags); });
  // etiquetas projetadas
  const tags = hotspots.map((h) => { const d = document.createElement('div'); d.className = 's3tag'; d.textContent = h.tag; d.addEventListener('click', () => info(h)); root.appendChild(d); return { h, d }; });
  let infoTag = null;
  const fm = (v, d = 0) => (v == null || !isFinite(v) ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const stTxt = { ok: 'operando', warn: 'alerta', crit: 'crítico', off: 'desligado' };
  const info = (h) => { if (eqs && eqs.open(h.tag)) { $('#s3info').hidden = true; infoTag = null; return; } infoTag = h; renderInfo(); };
  let eqs = null;
  function renderInfo() {
    const el = $('#s3info'), h = infoTag; if (!h) return; el.hidden = false; const e = sim.eq[h.tag];
    const live = e ? `<div class="grid"><span>Estado</span><b>${stTxt[e.st]}</b><span>Vazão</span><b>${fm(e.flow)} t/h</b><span>Carga</span><b>${fm(e.load * 100)} %</b><span>Potência</span><b>${fm(e.kw)} kW</b>${e.k === 'pn' ? `<span>Eficiência de peneiramento</span><b>${fm(e.eff)} %</b>` : ''}<span>Vibração</span><b>${fm(e.vib, 1)} mm/s</b><span>Óleo / mancal</span><b>${fm(e.oil)} °C</b><span>Desgaste ${e.k === 'pn' ? 'do deck' : 'dos revestimentos'}</span><b>${fm(e.w)} %</b><span>Troca prevista</span><b>${isFinite(e.left) ? (e.left > 48 ? '≈ ' + fm(e.left / 24) + ' dias' : '≈ ' + fm(e.left) + ' h') : '–'}</b></div>
      <div class="act"><button data-a="tog">${e.on ? 'Desligar' : 'Ligar'}</button><button data-a="wear">Registrar troca</button></div>` : '';
    el.innerHTML = `<button aria-label="Fechar" data-a="x">×</button><h3>${h.tag}</h3><div style="color:#4a5866;margin-bottom:6px">${h.tipo}</div><div>${h.info}</div>${live}`;
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { const a = b.dataset.a; if (a === 'x') { el.hidden = true; infoTag = null; return; } if (a === 'tog') { e.on = !e.on; logEv('Comando', `${h.tag} ${e.on ? 'ligado' : 'desligado'}`); } if (a === 'wear') { e.w = 0; logEv('Manutenção', `${h.tag}: troca registrada`); } renderInfo(); });
  }
  // painéis do processo em cascata
  const flowEls = flowLabels.map((L) => { const d = document.createElement('div'); d.className = 's3flow ' + L.kind; root.appendChild(d); return { L, d }; });
  let tPanel = 0;
  eqs = buildEqScreen(root, sim, { fm, stTxt, logEv });
  const panels = buildPanels(root, sim, { fm, stTxt, logEv, openInfo: (tag) => eqs.open(tag) });
  const tour = buildTour(root, sim, { setCamTo: (c) => setCam(c), openEq: (t) => eqs.open(t), closeEq: () => eqs.close(), setWalk: (v) => { if (getWalk().walk !== v) { setWalk(v); refreshWalk(); } } });
  $('#s3tour').addEventListener('click', () => tour.active() ? tour.stop() : tour.start());
  // clique direto no equipamento 3D → tela do equipamento (sem arrastar)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  const pickAt = (ev) => { const r = canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = pickRoot ? ray.intersectObject(pickRoot, true) : []; for (const h of hits.slice(0, 6)) { const p = h.point; let best = null, bv = Infinity;
      for (const q of pick) { const b = q.box; if (p.x > b.min.x - .3 && p.x < b.max.x + .3 && p.y > b.min.y - .3 && p.y < b.max.y + .3 && p.z > b.min.z - .3 && p.z < b.max.z + .3) { const v = (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z); if (v < bv) { bv = v; best = q; } } }
      if (best) return best.tag; } return null; };
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const t = pickAt(e); if (t) eqs.open(t); });
  let hoverT = 0; canvas.addEventListener('pointermove', (e) => { if (e.buttons || performance.now() - hoverT < 120) return; hoverT = performance.now(); canvas.style.cursor = pickAt(e) ? 'pointer' : ''; });
  function panel() { if (infoTag && !$('#s3info').hidden) renderInfo(); }
  // joystick (celular)
  const joy = { f: 0, s: 0 }; const jz = $('#s3joy'), knob = jz.querySelector('i');
  const jmove = (e) => { const r = jz.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy), m = 40; if (L > m) { dx *= m / L; dy *= m / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.s = dx / m; joy.f = -dy / m; e.preventDefault(); };
  const jend = () => { knob.style.transform = ''; joy.f = joy.s = 0; };
  jz.addEventListener('touchstart', jmove, { passive: false }); jz.addEventListener('touchmove', jmove, { passive: false }); jz.addEventListener('touchend', jend);
  const v = new THREE.Vector3();
  return {
    joy,
    update() {
      tPanel += 1; if (tPanel % 15 === 0) panel(); panels.update(tPanel); eqs.update(); const nowT = performance.now(); tour.update(Math.min(.1, (nowT - (this._lt || nowT)) / 1000)); this._lt = nowT;
      for (const { L, d } of flowEls) { v.copy(L.pos).project(camera); const vis = showTags && v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; d.style.display = vis ? 'block' : 'none'; if (vis) { d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; if (tPanel % 15 === 0) d.textContent = L.text(sim.kpi); } }
      for (const { h, d } of tags) {
        v.copy(h.pos).project(camera);
        const dist = camera.position.distanceTo(h.pos);
        const vis = showTags && v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && dist < 70;
        d.style.display = vis ? 'block' : 'none';
        if (vis) { d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (-v.y * .5 + .5) * innerHeight - 14 + 'px'; d.style.opacity = Math.max(.35, 1 - dist / 80); }
      }
    },
  };
}
