// Interface: cartão de título, barra de vistas (câmeras das fotos), caminhar por nível, etiquetas dos equipamentos
// (projetadas sobre a cena) e cartão de informação ao clicar. Joystick na tela para celular.
import * as THREE from 'three';

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
.s3info{position:fixed;right:14px;bottom:16px;z-index:6;width:min(360px,calc(100vw - 28px));padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);box-shadow:0 8px 26px rgba(0,0,0,.22);color:#1d2733;font-size:13px;line-height:1.45}
.s3info h3{margin:0 0 4px;font-size:15px;color:#1f63b3}.s3info button{float:right;border:0;background:none;font-size:18px;cursor:pointer;color:#555}
.s3help{position:fixed;right:14px;top:14px;z-index:5;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.82);backdrop-filter:blur(14px);font-size:11.5px;color:#3a4652;max-width:240px}
.s3joy{position:fixed;right:22px;bottom:22px;z-index:5;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.7);touch-action:none;display:none}
.s3joy i{position:absolute;left:35px;top:35px;width:40px;height:40px;border-radius:50%;background:rgba(31,99,179,.85)}
@media (max-width:860px){.s3bar{top:auto;bottom:16px;max-width:calc(100vw - 150px);left:auto;right:14px;transform:none}.s3help{display:none}.s3card{max-width:60vw}.s3joy{bottom:150px}}
`;

export function buildUI({ camera, controls, canvas, hotspots, setCam, setWalk, getWalk, CAMS }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.getElementById('ui');
  root.innerHTML = `<div class="s3card"><b>Gêmeo Digital · Setor 3 — Britagem e Peneiramento</b><small>Usina II · Germano · réplica 3D em escala real (modelo didático)</small></div>
   <div class="s3bar" id="s3bar">${Object.entries(CAMS).map(([k, c]) => `<button data-cam="${k}">${c.label}</button>`).join('')}<button id="s3walk" aria-pressed="false">Caminhar</button><button id="s3tags" aria-pressed="true">Etiquetas</button></div>
   <div class="s3lv" id="s3lv" hidden><button data-lv="2">Piso dos alimentadores (+14 m)</button><button data-lv="1">Piso das peneiras (+7,5 m)</button><button data-lv="0">Térreo</button></div>
   <div class="s3help">Arraste para girar · role para aproximar · <b>Caminhar</b>: W A S D ou setas, Shift corre, arraste para olhar. Clique numa etiqueta para ver o equipamento.</div>
   <div class="s3joy" id="s3joy"><i></i></div><div class="s3info" id="s3info" hidden></div>`;
  const $ = (s) => root.querySelector(s);
  root.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
  const lvBox = $('#s3lv');
  const refreshWalk = () => { const w = getWalk(); $('#s3walk').setAttribute('aria-pressed', w.walk); lvBox.hidden = !w.walk; lvBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.lv === w.level)); $('#s3joy').style.display = w.walk && matchMedia('(pointer:coarse)').matches ? 'block' : 'none'; };
  $('#s3walk').addEventListener('click', () => { setWalk(!getWalk().walk); refreshWalk(); });
  lvBox.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setWalk(true, +b.dataset.lv); refreshWalk(); }));
  let showTags = true; $('#s3tags').addEventListener('click', () => { showTags = !showTags; $('#s3tags').setAttribute('aria-pressed', showTags); });
  // etiquetas projetadas
  const tags = hotspots.map((h) => { const d = document.createElement('div'); d.className = 's3tag'; d.textContent = h.tag; d.addEventListener('click', () => info(h)); root.appendChild(d); return { h, d }; });
  const info = (h) => { const el = $('#s3info'); el.hidden = false; el.innerHTML = `<button aria-label="Fechar">×</button><h3>${h.tag}</h3><div style="color:#4a5866;margin-bottom:6px">${h.tipo}</div><div>${h.info}</div>`; el.querySelector('button').onclick = () => { el.hidden = true; }; };
  // joystick (celular)
  const joy = { f: 0, s: 0 }; const jz = $('#s3joy'), knob = jz.querySelector('i');
  const jmove = (e) => { const r = jz.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy), m = 40; if (L > m) { dx *= m / L; dy *= m / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.s = dx / m; joy.f = -dy / m; e.preventDefault(); };
  const jend = () => { knob.style.transform = ''; joy.f = joy.s = 0; };
  jz.addEventListener('touchstart', jmove, { passive: false }); jz.addEventListener('touchmove', jmove, { passive: false }); jz.addEventListener('touchend', jend);
  const v = new THREE.Vector3();
  return {
    joy,
    update() {
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
