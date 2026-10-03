// Mapa de riscos (NR-5 / CIPA) do setor 3 no ambiente 3D: por área, círculos nas cores dos grupos de risco,
// tamanho conforme a gravidade (pequeno / médio / grande) e um quadro de vidro com a lista dos riscos, ligado ao local por uma haste.
// Conteúdo didático de exemplo: deve ser validado pela CIPA / SESMT da unidade.
import * as THREE from 'three';

export const GRUPOS = {
  fisico: { nome: 'Físico', cor: '#2e9d3a' },
  quimico: { nome: 'Químico', cor: '#d6261f' },
  biologico: { nome: 'Biológico', cor: '#7a4a21' },
  ergonomico: { nome: 'Ergonômico', cor: '#f2c40f' },
  acidente: { nome: 'Acidentes', cor: '#1f5fd1' },
};
const R_NOME = { P: 'pequeno', M: 'médio', G: 'grande' };
const R_ORD = { P: 1, M: 2, G: 3 };

// at: ponto da área (m, coordenadas do prédio); h: altura do quadro acima do ponto
export const AREAS = [
  { id: 'alim', nome: 'Alimentadores e distribuidor (+14 m)', at: [22, 14, 3], h: 6, riscos: [
    ['acidente', 'G', 'Queda de altura em aberturas e bordas do piso'],
    ['acidente', 'M', 'Prensamento em partes móveis do alimentador e do tripper'],
    ['quimico', 'M', 'Poeira mineral (sílica e minério de ferro)'],
    ['fisico', 'M', 'Ruído e vibração'],
  ] },
  { id: 'pen', nome: 'Peneiras banana (+7,5 m)', at: [14.5, 7.5, 9], h: 5.5, riscos: [
    ['fisico', 'G', 'Ruído acima de 85 dB(A) e vibração das peneiras'],
    ['acidente', 'M', 'Cargas suspensas na troca de telas e painéis'],
    ['quimico', 'M', 'Poeira mineral'],
    ['ergonomico', 'M', 'Postura forçada na troca de painéis de poliuretano'],
  ] },
  { id: 'hp', nome: 'Britagem primária · HP 400', at: [55, 0.5, 7], h: 7, riscos: [
    ['acidente', 'G', 'Partes móveis e energia acumulada: bloqueio (LOTO) obrigatório'],
    ['fisico', 'G', 'Ruído intenso'],
    ['acidente', 'M', 'Içamento de manto e côncavo na troca de revestimento'],
    ['quimico', 'P', 'Óleo hidráulico e lubrificante (contato e incêndio)'],
  ] },
  { id: 'vsi', nome: 'Britagem secundária · Barmac (VSI)', at: [55.5, 0.5, 17.5], h: 5.5, riscos: [
    ['acidente', 'G', 'Projeção de partículas e rotor em alta rotação'],
    ['fisico', 'G', 'Ruído intenso'],
    ['quimico', 'M', 'Poeira mineral'],
    ['ergonomico', 'P', 'Troca de pontas e placas de desgaste'],
  ] },
  { id: 'cor', nome: 'Correias transportadoras', at: [32, 1.5, 20.5], h: 6, riscos: [
    ['acidente', 'G', 'Aprisionamento em tambores e roletes'],
    ['acidente', 'M', 'Queda de material das correias'],
    ['quimico', 'M', 'Poeira nas transferências'],
    ['ergonomico', 'M', 'Limpeza manual de derramamento com pá'],
  ] },
  { id: 'circ', nome: 'Circulação, escadas e passarelas', at: [5, 0, 21], h: 5, riscos: [
    ['acidente', 'M', 'Queda em escadas e piso com minério'],
    ['fisico', 'P', 'Calor e iluminação deficiente'],
    ['biologico', 'P', 'Animais peçonhentos nas áreas externas'],
    ['acidente', 'P', 'Rotas de fuga e extintores: manter desobstruídos'],
  ] },
];

const CSS = `.rmWrap{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:4;display:none}
.rmWrap svg{position:absolute;inset:0;width:100%;height:100%}
.lgCard{position:absolute;left:0;top:0;width:330px;transform-origin:50% 100%;padding:12px 14px 12px;border-radius:22px;color:#0d1520;
  font:600 13px/1.35 "Segoe UI",system-ui,sans-serif;letter-spacing:.1px;
  background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.2) 45%,rgba(255,255,255,.32));
  -webkit-backdrop-filter:blur(26px) saturate(210%) brightness(1.12);backdrop-filter:blur(26px) saturate(210%) brightness(1.12);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.85),inset 0 -1px 0 rgba(255,255,255,.25),inset 0 0 22px rgba(255,255,255,.18),0 10px 30px rgba(10,25,50,.28),0 2px 6px rgba(10,25,50,.18)}
.lgCard::before{content:'';position:absolute;inset:1px 1px auto 1px;height:46%;border-radius:21px 21px 60% 60%/21px 21px 22px 22px;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none;z-index:0}
.lgCard::after{content:'';position:absolute;inset:0;border-radius:22px;pointer-events:none;background:radial-gradient(120% 60% at 15% 0%,rgba(255,255,255,.35),transparent 60%),radial-gradient(80% 50% at 100% 100%,rgba(140,190,255,.18),transparent 70%);z-index:0}
.lgCard h4{position:relative;z-index:1;margin:0 0 7px;font:700 15px "Segoe UI",system-ui,sans-serif;text-shadow:0 0 4px #fff,0 0 10px rgba(255,255,255,.85),0 1px 0 rgba(255,255,255,.9)}
.lgCard .r{position:relative;z-index:1;display:flex;gap:8px;align-items:flex-start;margin:4px 0;text-shadow:0 0 4px #fff,0 0 10px rgba(255,255,255,.85),0 1px 0 rgba(255,255,255,.9)}
.lgCard .d{flex:none;border-radius:50%;margin-top:3px;box-shadow:0 0 0 1.5px rgba(255,255,255,.9),0 1px 3px rgba(0,0,0,.3)}
.lgCard .r b{font-weight:700}
.lgCard .cs{position:relative;z-index:1;display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:2px 0 10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.55)}
.lgCard .c{border-radius:50%;box-shadow:0 0 0 2.5px rgba(255,255,255,.95),inset 0 -6px 10px rgba(0,0,0,.18),inset 0 5px 8px rgba(255,255,255,.45),0 3px 8px rgba(0,0,0,.28)}
.rmLeg{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:5;display:none;padding:7px 14px;border-radius:14px;color:#0d1520;font:600 12px/1.4 "Segoe UI",system-ui,sans-serif;
  background:rgba(255,255,255,.8);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 6px 22px rgba(0,0,0,.18);max-width:calc(100vw - 28px)}
.rmLeg .gs{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}.rmLeg i{display:inline-block;border-radius:50%;vertical-align:middle;margin-right:4px}
@media (max-width:860px){.rmLeg{top:64px;font-size:11px}}`;

export function buildRiskMap(camera) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const wrap = document.createElement('div'); wrap.className = 'rmWrap';
  wrap.innerHTML = '<svg></svg>'; const svg = wrap.firstChild;
  const leg = document.createElement('div'); leg.className = 'rmLeg';
  leg.innerHTML = `<div class="gs"><b>Mapa de riscos · Setor 3</b><span style="opacity:.7">(NR-5 · exemplo didático — validar com a CIPA)</span>${Object.values(GRUPOS).map((g) => `<span><i style="width:11px;height:11px;background:${g.cor}"></i>${g.nome}</span>`).join('')}
    <span>Gravidade: ${['P', 'M', 'G'].map((s) => { const d = { P: 7, M: 11, G: 15 }[s]; return `<i style="width:${d}px;height:${d}px;background:#8a96a8;margin-left:6px"></i>${R_NOME[s]}`; }).join(' ')}</span></div>`;
  document.body.appendChild(wrap); document.body.appendChild(leg);
  const items = AREAS.map((a) => {
    const c = document.createElement('div'); c.className = 'lgCard';
    const circ = [...a.riscos].sort((p, q) => R_ORD[q[1]] - R_ORD[p[1]]).map(([g, s]) => { const d = { P: 24, M: 34, G: 46 }[s]; return `<i class="c" title="${GRUPOS[g].nome} (${R_NOME[s]})" style="width:${d}px;height:${d}px;background:${GRUPOS[g].cor}"></i>`; }).join('');
    c.innerHTML = `<div class="cs">${circ}</div><h4>${a.nome}</h4>${a.riscos.map(([g, s, t]) => { const px = { P: 9, M: 12, G: 15 }[s]; return `<div class="r"><i class="d" style="width:${px}px;height:${px}px;background:${GRUPOS[g].cor}"></i><span><b>${GRUPOS[g].nome}</b> (${R_NOME[s]}): ${t}</span></div>`; }).join('')}`;
    wrap.appendChild(c);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('stroke', 'rgba(20,32,48,.55)'); ln.setAttribute('stroke-width', '1.5');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '5'); dot.setAttribute('fill', 'rgba(255,255,255,.9)'); dot.setAttribute('stroke', 'rgba(20,32,48,.7)'); dot.setAttribute('stroke-width', '2');
    svg.appendChild(ln); svg.appendChild(dot);
    return { a, c, ln, dot, p0: new THREE.Vector3(...a.at), p1: new THREE.Vector3(a.at[0], a.at[1] + a.h, a.at[2]) };
  });
  let on = false; const v0 = new THREE.Vector3(), v1 = new THREE.Vector3();
  const TOP = innerWidth > 860 ? 136 : 110;
  const vis = (v) => v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.25 && v.y > -1.3 && v.y < 1.4;
  function update() {
    if (!on) return;
    const W = innerWidth, H = innerHeight, fovR = THREE.MathUtils.degToRad(camera.fov);
    for (const it of items) {
      const dist = camera.position.distanceTo(it.p1);
      v0.copy(it.p0).project(camera); v1.copy(it.p1).project(camera);
      const show = dist > 3.5 && vis(v1);
      it.c.style.display = it.ln.style.display = it.dot.style.display = show ? '' : 'none';
      if (!show) continue;
      const x1 = (v1.x + 1) / 2 * W, x0 = (v0.x + 1) / 2 * W, y0 = (1 - v0.y) / 2 * H;
      let y1 = (1 - v1.y) / 2 * H;
      // o quadro tem ~12 m de largura no mundo, com escala limitada para continuar legível
      const pxPerM = H / (2 * Math.tan(fovR / 2) * dist), sc = Math.min(1.05, Math.max(0.62, 12 * pxPerM / 330));
      // nunca por baixo da régua e da legenda do topo
      y1 = Math.max(y1, TOP + it.c.offsetHeight * sc);
      const op = Math.min(1, (dist - 3.5) / 3);
      it.c.style.opacity = op; it.c.style.zIndex = String(1000 - Math.round(dist));
      it.c.style.transform = `translate(${x1 - 165}px, ${y1 - it.c.offsetHeight}px) scale(${sc.toFixed(3)})`;
      it.ln.setAttribute('x1', x1); it.ln.setAttribute('y1', y1); it.ln.setAttribute('x2', x0); it.ln.setAttribute('y2', y0); it.ln.style.opacity = op;
      it.dot.setAttribute('cx', x0); it.dot.setAttribute('cy', y0); it.dot.style.display = vis(v0) ? '' : 'none';
    }
  }
  function setVisible(v) { on = v; wrap.style.display = leg.style.display = v ? 'block' : 'none'; if (v) update(); }
  return { update, setVisible, get visible() { return on; } };
}
