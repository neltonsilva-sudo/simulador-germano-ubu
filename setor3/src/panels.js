import { call, getToken, ready, SIM_URL } from './api.js?v=20261026204743';
import { startMnt, finishMnt, SEQ, itemOf, perms, cmd, seq, seqAbort, syncCtl } from './sim.js?v=20261026204743';
// Painéis do processo em cascata (acordeão): cada painel abre e fecha com um clique; o estado fica salvo.
// Indicadores · Tendências · Controles e ajustes · Fluxos (entradas e saídas) · Equipamentos · Alarmes e eventos.
// Sincronização com o simulador (mesma origem, BroadcastChannel 'setor3-sync'): lavra, APF, TCLD, umidade e partida
// vêm do simulador; APF, TCLD e partir/parar alterados aqui voltam para o simulador.

const CSS = `
.s3exp .exim{margin:6px 0 4px;position:relative;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.15)}.s3exp .exim img,.s3exp .exim svg{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.s3exp .exim figcaption{position:absolute;left:6px;bottom:6px;background:rgba(10,16,24,.8);border-radius:6px;padding:2px 7px;font-size:11px;color:#ffd24a}.s3exp{max-height:calc(100vh - 80px);overflow:auto}
.s3exp{position:fixed;z-index:30;width:360px;max-width:92vw;background:rgba(12,22,34,.97);border:1px solid rgba(92,198,220,.5);border-radius:12px;padding:10px 12px;color:#fff;font:13px system-ui;box-shadow:0 14px 40px rgba(0,0,0,.5)}.s3exp .h{display:flex;justify-content:space-between;align-items:center;gap:8px}.s3exp .h b{color:#9fdcf0}.s3exp p{margin:6px 0;line-height:1.5}.s3exp small{color:#9fb0bd}.s3exp small b{color:#ffd24a}
.s3exp .r{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.s3exp button{border:1px solid rgba(255,255,255,.2);background:#1f3a5c;color:#fff;border-radius:6px;padding:4px 9px;font:600 12px system-ui;cursor:pointer}.s3exp button.pri{background:#2c6fd6}.s3exp button:disabled{opacity:.6}.s3exp label{display:flex;gap:6px;align-items:center;font-size:12px;color:#cfd8de}.s3exp select{flex:1;background:#0b1622;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:3px}
.s3acc .spk{display:inline-grid;place-items:center;width:22px;height:22px;margin:0 6px 0 0;padding:0;border:1px solid rgba(92,198,220,.45);border-radius:50%;background:rgba(92,198,220,.12);font-size:11px;line-height:1;cursor:pointer;vertical-align:middle;flex:0 0 auto}.s3acc .spk:hover{background:rgba(92,198,220,.3)}.s3acc .spk.on{background:#ffb23d;border-color:#ffb23d;animation:s3spk 1s ease-in-out infinite}@keyframes s3spk{50%{box-shadow:0 0 0 5px rgba(255,178,61,.25)}}
.s3acc .ctl .r span{display:inline-flex;align-items:center}
.s3gd{position:fixed;right:12px;top:64px;bottom:12px;width:min(600px,48vw);z-index:40;overflow:auto;background:rgba(9,22,40,.96);border:1px solid rgba(92,198,220,.45);border-radius:12px;color:#e8f1f7;font:12.5px/1.45 system-ui;box-shadow:0 18px 50px rgba(0,0,0,.55);backdrop-filter:blur(8px)}
.s3gd .hd{position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(9,22,40,.98);border-bottom:1px solid rgba(255,255,255,.08);z-index:1}.s3gd .hd h3{margin:0;font-size:15px;flex:1;color:#ffd24a}.s3gd .hd button{border:0;background:#1f3a5c;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;font-weight:700}
.s3gd .bd{padding:10px 14px 16px}.s3gd h4{margin:14px 0 6px;color:#ffd24a;font-size:12px;letter-spacing:.06em;text-transform:uppercase}.s3gd .kp{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.s3gd .kp div{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:7px 9px}.s3gd .kp b{display:block;font:700 15px ui-monospace,monospace;color:#9fe6f5}.s3gd .kp span{font-size:10.5px;color:#c8d6e2}.s3gd .kp div.warn b{color:#ffb020}
.s3gd canvas{width:100%;display:block;background:rgba(0,0,0,.18);border-radius:8px}.s3gd table{width:100%;border-collapse:collapse;font-size:11.5px}.s3gd th,.s3gd td{padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.07);text-align:right}.s3gd th:first-child,.s3gd td:first-child{text-align:left}.s3gd th{color:#9fc3dc;font-weight:600}.s3gd .hint{color:#b9c8d4;font-size:11px}
#gG{cursor:zoom-in}
.s3acc{--ok:#4ac68f;--warn:#ff9f1a;--crit:#f0544a;--accent:#5cc6dc;--ink:#e8edf1;--muted:#a2afbb;--card:rgba(10,45,95,.30);--cline:rgba(120,170,235,.25);--disp:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  position:fixed;left:14px;top:96px;z-index:5;width:400px;max-height:calc(100vh - 112px);overflow:auto;border-radius:10px;border:1px solid rgba(120,170,235,.38);
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
.s3acc .hs:hover{border-color:rgba(92,198,220,.6)}.s3acc .hs.sel{border-color:#ffd24a;background:rgba(255,210,74,.16);box-shadow:0 0 0 1px #ffd24a inset,0 0 14px rgba(255,210,74,.35)}.s3acc .hs.sel div{color:#ffd24a;font-weight:700}.s3acc .hs i{width:9px;height:9px;border-radius:50%;background:var(--ok)}.s3acc .hs.warn i,.s3acc .hs.crit i{background:#ff3b3b;box-shadow:0 0 8px #ff3b3b}.s3acc.s3off .hs.warn i,.s3acc.s3off .hs.crit i{opacity:.15;box-shadow:none}.s3acc .hs.mnt i{background:#2c6fd6;box-shadow:0 0 8px #2c6fd6}.s3acc .hs.mnt span{color:#9cc4ff}
.s3acc .hs span{font:400 12px var(--mono);color:var(--accent);text-align:right}
.s3acc .card{background:var(--card);border:1px solid var(--cline);border-left:3px solid var(--ok);border-radius:6px;padding:8px 10px;margin-bottom:6px;line-height:1.5}.s3acc .card.warn{border-left-color:var(--warn)}.s3acc .card.crit{border-left-color:var(--crit)}
.s3acc .card small{color:var(--muted);display:block;margin-top:2px}
.s3k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.s3k div{background:var(--card);border:1px solid var(--cline);border-left:3px solid var(--ok);border-radius:6px;padding:6px 8px}
.s3k div.warn{border-left-color:var(--warn)}.s3k div.crit{border-left-color:var(--crit)}.s3k b{display:block;font:500 18px var(--mono);color:#fff}.s3k span{color:var(--muted);font-size:11px}
.s3acc .org{display:inline-block;font:600 9.5px var(--mono);padding:0 5px;border-radius:3px;margin-left:4px;vertical-align:1px;border:1px solid currentColor}.s3acc .org.real{color:#2fbf71}.s3acc .org.ref{color:#5cc6dc}.s3acc .org.adot{color:#ffb020}.s3acc .org.calc{color:#9fb0bd}
.s3acc details.src{margin-top:6px}.s3acc details.src summary{cursor:pointer;color:#ffd24a;font-size:12px}.s3acc details.src td{font-size:11px;vertical-align:top}
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
@media (max-width:860px){.s3acc{top:auto;bottom:150px;left:8px;width:min(400px,calc(100vw - 16px));max-height:42vh}}
`;

const SECS = [['ast', 'Assistente de Processo'], ['pi', 'Pontos de inspeção'], ['ctl', 'Controles e ajustes'], ['ind', 'Indicadores em tempo real'], ['gran', 'Curva granulométrica'], ['efic', 'Eficiência do processo'], ['tend', 'Tendências'], ['flu', 'Fluxos · entradas e saídas'], ['eq', 'Sala de controle · comando e sequência'], ['al', 'Alarmes e eventos'], ['qr', 'QR Code da área'], ['prob', 'Problemas detectados'], ['insp', 'Registro de inspeção']];

export function buildPanels(root, sim, { fm, stTxt, openInfo, logEv }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  let open; try { open = JSON.parse(localStorage.getItem('setor3.acc2') || 'null'); } catch (e) { open = null; }
  if (!Array.isArray(open)) open = ['pi', 'prob', 'ctl'];
  const el = document.createElement('div'); el.className = 's3acc'; root.appendChild(el);
  setInterval(() => el.classList.toggle('s3off'), 500); /* pisca das bolinhas com problema (independe do redesenho do painel) */
  el.innerHTML = `<div class="top"><span class="dn">3</span><b>Peneiramento e britagem</b><span class="sync" id="pSync">sem simulador</span><button id="pAll">Fechar todos</button></div>` +
    SECS.map(([k, t]) => `<section class="s3sec${open.includes(k) ? ' open' : ''}" data-k="${k}"><h5><i>▶</i><button class="spk" data-spk="${k}" title="Ouvir a explicação" aria-label="Ouvir a explicação de ${t}">🔊</button>${t}<em id="pS_${k}"></em></h5><div id="pB_${k}"></div></section>`).join('');
  const $ = (s) => el.querySelector(s);
  const save = () => { try { localStorage.setItem('setor3.acc2', JSON.stringify(open)); } catch (e) { /* sem armazenamento */ } };
  /* EXPLICAÇÃO FALADA: o ícone 🔊 antes de cada título e de cada controle lê a importância do item no processo */
  const EXPL = {
    ast: 'O Assistente de Processo analisa os indicadores, a eficiência, a granulometria e os alarmes do setor e sugere ações. Use-o para entender o que está limitando a produção e o que ajustar primeiro.',
    pi: 'Os pontos de inspeção são os equipamentos que o operador acompanha na ronda: peneiras, britadores e alimentadores. Cada um mostra eficiência, carga, desgaste e saúde. A bolinha vermelha piscando indica o que precisa de atenção imediata.',
    ctl: 'Controles e ajustes são as variáveis que o operador manipula para equilibrar produção, qualidade do produto e consumo de energia: alimentação, abertura dos britadores, velocidade da correia e parâmetros do Barmac.',
    ind: 'Os indicadores em tempo real mostram o que entra e o que sai do setor: alimentação, produção, carga circulante e energia. São a primeira leitura para saber se o circuito está estável.',
    gran: 'A curva granulométrica mostra a distribuição de tamanhos das partículas. O P80 do produto define quanto trabalho sobra para a moagem: produto mais fino aqui economiza energia nos moinhos.',
    efic: 'A eficiência do processo compara o resultado com o ideal: eficiência do peneiramento, eficiência energética dos britadores e o OEE do setor. Ajuda a encontrar perdas escondidas.',
    tend: 'As tendências mostram como as variáveis evoluem no tempo. Uma mudança lenta, como o aumento da carga circulante, aparece aqui antes de virar alarme.',
    flu: 'Os fluxos de entrada e saída fecham o balanço de massa do setor: o minério novo que entra tem de sair como produto. Diferenças indicam erro de medição ou acúmulo de material.',
    eq: 'A sala de controle comanda o circuito: partida e parada em sequência, permissivos e intertravamentos. A sequência certa protege os equipamentos e evita entupimentos e derramamentos.',
    al: 'Alarmes e eventos registram tudo o que saiu da faixa e cada comando dado. Reconhecer e tratar o alarme rapidamente evita que um desvio vire parada ou acidente.',
    qr: 'O QR Code da área permite que o operador de campo acesse o painel desta área pelo celular, com autorização da sala de controle.',
    prob: 'Problemas detectados reúne os desvios encontrados nos pontos de inspeção e no modelo, com a causa provável, para priorizar a ação do operador.',
    insp: 'O registro de inspeção grava o que foi encontrado na ronda, com severidade e local, e vira histórico para a manutenção e para a gestão.',
    cF: 'A alimentação nova é a quantidade de minério que chega da lavra pela correia de longa distância. Ela define a produção do setor, mas acima da capacidade das peneiras e dos britadores aumenta a carga circulante e pode limitar o circuito. No Concentrador Três, a referência é de cerca de dois mil e quinhentas toneladas por hora.',
    cC: 'A APF é a abertura na posição fechada dos britadores cônicos HP 400. Fechar a APF gera produto mais fino, mas aumenta a potência e a carga dos britadores. Abrir demais engrossa o produto e aumenta o retorno de material às peneiras.',
    cT: 'A velocidade da correia de longa distância controla quanto minério ela consegue transportar. Com velocidade baixa, a correia limita a alimentação do setor. A capacidade nominal é de seis mil toneladas por hora a cem por cento.',
    cM: 'A umidade do minério é crítica no peneiramento. Acima de nove por cento, o material úmido gruda nas telas e entope as aberturas: a eficiência das peneiras cai e a carga circulante aumenta.',
    cR: 'Os finos do minério são a parte que já chega menor que doze vírgula cinco milímetros. Quanto mais finos, menos material precisa ser britado, e menores ficam a carga circulante e o consumo de energia.',
    cW: 'O índice de trabalho de Bond mede a dificuldade de quebrar o minério. Minério mais duro exige mais energia para chegar ao mesmo tamanho de produto e reduz a capacidade dos britadores.',
    cP: 'A rotação do rotor do Barmac define a velocidade com que as partículas são lançadas contra a camada de rocha. Mais rotação gera produto mais fino, porém com mais potência e mais desgaste das pontas do rotor.',
    cK: 'A cascata desvia parte da alimentação por fora do rotor do Barmac, provocando choque de rocha com rocha. Ela alivia a potência e permite ajustar a granulometria do produto sem parar o britador.' };
  /* VOZ MAIS HUMANA: escolhe a melhor voz pt-BR instalada (Natural/Online do Edge e Windows › Premium/Aprimorada do Mac › Google › demais),
     fala frase a frase com pausas naturais; o usuário pode escolher a voz (guardada neste navegador) */
  const FEM = /luciana|francisca|thalita|maria|fernanda|vit[oó]ria|leila|helo[ií]sa|raquel|let[ií]cia|yara|manuela|brenda|elza|giovanna|flo\b|sandy|shelley|grandma|google/i;   // só vozes femininas
  const VZ = { list() { try { return speechSynthesis.getVoices().filter((v) => (/^pt(-|_)BR/i.test(v.lang) || /portugu[eê]s.*brasil/i.test(v.name)) && FEM.test(v.name)); } catch (e) { return []; } },
    rank(v) { const n = v.name; return /natural|neural/i.test(n) ? 6 : /online/i.test(n) ? 5 : /premium|enhanced|aprimorad/i.test(n) ? 4 : /google/i.test(n) ? 3 : /luciana|francisca|thalita|antonio|felipe|daniel/i.test(n) ? 2 : 1; },
    pick() { const V = this.list(); let p = null; try { p = localStorage.getItem('s3voice'); } catch (e) { /* */ } return (p && V.find((v) => v.name === p)) || V.slice().sort((a, b) => this.rank(b) - this.rank(a))[0] || null; },
    speak(text, onend) { const S = window.speechSynthesis; if (!S) { onend && onend(); return; } S.cancel(); const v = this.pick(), parts = String(text).replace(/\s+/g, ' ').match(/[^.!?;]+[.!?;]?/g) || [String(text)];
      parts.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t.trim()); u.lang = 'pt-BR'; if (v) u.voice = v; u.rate = .88; u.pitch = .96; u.volume = .85;   /* fala mais suave */ if (i === parts.length - 1) u.onend = u.onerror = () => onend && onend(); S.speak(u); }); },
    stop() { try { speechSynthesis.cancel(); } catch (e) { /* */ } } };
  try { speechSynthesis.onvoiceschanged = () => {}; speechSynthesis.getVoices(); } catch (e) { /* */ }
  /* VOZ NATURAL GRAVADA (neural, Francisca): explicações fixas tocam o áudio gravado; o texto gerado na hora pelo Assistente usa a melhor voz do navegador */
  let AU = null; const recV = () => { try { return localStorage.getItem('s3voice') || '__rec'; } catch (e) { return '__rec'; } }, recOn = () => /^__rec/.test(recV());
  const stopAll = () => { VZ.stop(); if (AU) { AU.pause(); AU = null; } };
  const playRec = (k, onend) => { stopAll(); try { AU = new Audio((recV() === '__recT' ? 'audio/expl_thalita/' : 'audio/expl/') + k + '.mp3?v=2'); AU.volume = .85; AU.onended = () => onend && onend(); AU.onerror = () => { AU = null; VZ.speak(EXPL[k], onend); }; AU.play().catch(() => { AU = null; VZ.speak(EXPL[k], onend); }); } catch (e) { VZ.speak(EXPL[k], onend); } };
  const sayEx = (onend) => { if (exK && exTxt === EXPL[exK] && recOn()) playRec(exK, onend); else { if (AU) { AU.pause(); AU = null; } VZ.speak(exTxt, onend); } };
  /* IMAGEM DO ITEM: vista 3D real do equipamento/área descrita, capturada da própria cena (câmera posicionada por item; em cache) */
  const VIEWS = { cF: [[72, 12, -18], [56, 8, -10], 'Chegada do ROM pela TCLD'], cT: [[72, 12, -18], [56, 8, -10], 'Transportador de longa distância (TCLD)'], cC: [[61.5, 2.3, 10], [59.3, 3.35, 5.5], 'Britador cônico HP 400'],
    cM: [[26, 19.6, 5.2], [22, 17.4, 2.4], 'Minério na correia de distribuição'], cR: [[26, 19.6, 5.2], [22, 17.4, 2.4], 'Minério na correia de distribuição'], cW: [[26, 19.6, 5.2], [22, 17.4, 2.4], 'Minério na correia de distribuição'],
    cP: [[60.5, 1.6, 23.4], [61, 2.2, 17.5], 'Britador Barmac (VSI)'], cK: [[60.5, 1.6, 23.4], [61, 2.2, 17.5], 'Britador Barmac (VSI)'],
    ast: [[-10, 40, 72], [32, 3, 10], 'Setor 3 · visão geral'], pi: [[11.7, 8.85, 17.6], [9, 9.2, 12.5], 'Peneiras banana (pontos de inspeção)'], ctl: [[1.5, 13.2, 19.5], [15, 8.6, 6.5], 'Prédio do peneiramento'],
    ind: [[-10, 40, 72], [32, 3, 10], 'Setor 3 · visão geral'], gran: [[48, 2.6, 24.5], [53, 1.2, 20.6], 'Correia de produto < 12,5 mm'], efic: [[47.5, 1.55, 1.6], [59, 1.6, 8.5], 'Britagem primária (HP 400)'],
    tend: [[1.5, 13.2, 19.5], [15, 8.6, 6.5], 'Prédio do peneiramento'], flu: [[-10, 40, 72], [32, 3, 10], 'Fluxos do setor 3'], eq: [[47.0, 1.55, 12.4], [48.4, 1.25, 10.5], 'Botoeira de campo (comando local)'],
    al: [[61.5, 2.3, 10], [59.3, 3.35, 5.5], 'Equipamento em alarme'], qr: [[1.5, 13.2, 19.5], [15, 8.6, 6.5], 'Área 3 · peneiramento e britagem'], prob: [[11.7, 8.85, 17.6], [9, 9.2, 12.5], 'Peneiras'],
    insp: [[12, 15.4, 16], [12, 10.8, 6], 'Peneiras vistas do piso dos alimentadores'] };
  /* ILUSTRAÇÕES DOS TÍTULOS QUE NÃO SÃO EQUIPAMENTO: desenho do próprio assunto com os valores atuais (fluxograma, curva, tendência, medidores, alarmes, sequência…) */
  const SV = (inner) => `<svg viewBox="0 0 520 292" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial,sans-serif"><rect width="520" height="292" rx="8" fill="#0b1622"/>${inner}</svg>`;
  const tx = (x, y, t, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || '#e6f0f5'}" font-size="${o.s || 13}" font-weight="${o.w || 600}" text-anchor="${o.a || 'start'}">${esc(t)}</text>`;
  const bx = (x, y, w, h, t, v, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#13263a" stroke="${c}" stroke-width="2"/>${tx(x + w / 2, y + 22, t, { a: 'middle', s: 12.5 })}${tx(x + w / 2, y + 44, v, { a: 'middle', s: 15, c, w: 800 })}`;
  const ar = (x1, y1, x2, y2, c = '#5cc6dc') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3" marker-end="url(#ah)"/>`;
  const AH = '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#5cc6dc"/></marker></defs>';
  const K = () => sim.kpi || {}, th = (v) => fm(v || 0) + ' t/h';
  const SVGF = {
    flu: () => { const k = K(); return SV(AH + bx(14, 30, 140, 58, 'ROM (TCLD)', th(k.F), '#ffd24a') + bx(190, 30, 140, 58, '7 peneiras', th(k.T), '#5cc6dc') + bx(366, 30, 140, 58, 'Produto < 12,5', th(k.prod), '#2fbf71')
      + ar(154, 59, 186, 59) + ar(330, 59, 362, 59) + bx(110, 170, 140, 58, 'HP 400 (1º deck)', th((k.T || 0) * (k.r1 || 0)), '#ff9a1a') + bx(280, 170, 140, 58, 'Barmac (2º deck)', th((k.T || 0) * (k.r2 || 0)), '#ff9a1a')
      + ar(240, 88, 190, 166) + ar(280, 88, 340, 166) + `<path d="M180 228 C 180 262, 60 262, 60 150 L 196 96" fill="none" stroke="#ff9a1a" stroke-width="2.5" stroke-dasharray="6 5" marker-end="url(#ah)"/>`
      + tx(66, 258, `retorno britado ${th(k.ret)}`, { s: 11.5, c: '#ffb070' }) + tx(300, 262, `Balanço: entra ${th(k.F)} · sai ${th(k.prod)}`, { s: 12, c: '#9fdcf0' })); },
    ind: () => { const k = K(), t = [['Alimentação nova', th(k.F), '#ffd24a'], ['Produção (produto)', th(k.prod), '#2fbf71'], ['Carga circulante', fm(k.circ || 0) + ' %', '#ff9a1a'], ['Potência total', fm(k.kw || 0) + ' kW', '#5cc6dc']];
      return SV(t.map(([a, v, c], i) => { const x = 16 + (i % 2) * 248, y = 18 + Math.floor(i / 2) * 134; return `<rect x="${x}" y="${y}" width="240" height="122" rx="10" fill="#13263a" stroke="${c}" stroke-width="2"/>${tx(x + 16, y + 30, a, { s: 14, c: '#9fb0bd' })}${tx(x + 16, y + 84, v, { s: 34, c, w: 800 })}`; }).join('')); },
    tend: () => { const H = (sim.hist || []).slice(-240); if (H.length < 2) return SV(tx(260, 150, 'Coletando dados da tendência…', { a: 'middle' }));
      const mx = Math.max(1, ...H.map((h) => Math.max(h.F, h.prod))) * 1.15, t0 = H[0].t, t1 = H[H.length - 1].t, X = (t) => 40 + 460 * (t - t0) / Math.max(1, t1 - t0), Y = (v) => 256 - 216 * v / mx;
      const line = (f, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${H.map((h) => X(h.t).toFixed(1) + ',' + Y(f(h)).toFixed(1)).join(' ')}"/>`;
      return SV(`<line x1="40" y1="256" x2="500" y2="256" stroke="#2c4d75"/><line x1="40" y1="40" x2="40" y2="256" stroke="#2c4d75"/>${tx(44, 30, fm(mx) + ' t/h', { s: 11, c: '#7b8a97' })}` + line((h) => h.F, '#ffd24a') + line((h) => h.prod, '#2fbf71') + tx(300, 30, '— alimentação', { s: 12, c: '#ffd24a' }) + tx(410, 30, '— produção', { s: 12, c: '#2fbf71' }) + tx(270, 280, 'últimos minutos', { a: 'middle', s: 11, c: '#7b8a97' })); },
    gran: () => { const g = (K().gran) || {}; const f = g.prodCum, m = g.mix; if (!f) return SV(tx(260, 150, 'Curva indisponível', { a: 'middle' }));
      const xs = []; for (let i = 0; i <= 60; i++) xs.push(.1 * Math.pow(150 / .1, i / 60)); const X = (x) => 40 + 460 * Math.log(x / .1) / Math.log(1500), Y = (v) => 256 - 216 * v;
      const pl = (fn, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.6" points="${xs.map((x) => X(x).toFixed(1) + ',' + Y(Math.max(0, Math.min(1, fn(x)))).toFixed(1)).join(' ')}"/>`;
      const p80 = g.p80prod || 0;
      return SV(`<line x1="40" y1="256" x2="500" y2="256" stroke="#2c4d75"/><line x1="40" y1="40" x2="40" y2="256" stroke="#2c4d75"/>${[.1, 1, 10, 100].map((x) => `<line x1="${X(x)}" y1="40" x2="${X(x)}" y2="256" stroke="#16304a"/>${tx(X(x), 272, x + ' mm', { a: 'middle', s: 10.5, c: '#7b8a97' })}`).join('')}<line x1="40" y1="${Y(.8)}" x2="500" y2="${Y(.8)}" stroke="#ffd24a" stroke-dasharray="4 4"/>`
        + (m ? pl(m, '#9fb0bd') : '') + pl(f, '#2fbf71') + `<line x1="${X(Math.max(.1, p80))}" y1="${Y(.8)}" x2="${X(Math.max(.1, p80))}" y2="256" stroke="#ffd24a"/>` + tx(48, 32, '% passante acumulado', { s: 11, c: '#7b8a97' })
        + tx(300, 32, '— produto', { s: 12, c: '#2fbf71' }) + tx(390, 32, '— alimentação', { s: 12, c: '#9fb0bd' }) + tx(X(Math.max(.1, p80)) + 6, Y(.8) - 6, `P80 ${fm(p80, 1)} mm`, { s: 12, c: '#ffd24a' })); },
    efic: () => { const e = K().efic || {}, gs = [['Peneiramento', (e.tag || 0) / 100, fm(e.tag || 0, 1) + ' %'], ['OEE do setor', e.oee || 0, fm((e.oee || 0) * 100) + ' %'], ['Disponibilidade', e.disp || 0, fm((e.disp || 0) * 100) + ' %']];
      return SV(gs.map(([n, v, t], i) => { const cx = 92 + i * 168, cy = 170, r = 64, a = Math.PI * (1 - Math.max(0, Math.min(1, v))), x = cx + r * Math.cos(a), y = cy - r * Math.sin(a), c = v >= .85 ? '#2fbf71' : v >= .65 ? '#ffd24a' : '#ff5a4a';
        return `<path d="M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#1d3550" stroke-width="14"/><path d="M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${c}" stroke-width="14"/>${tx(cx, cy - 8, t, { a: 'middle', s: 18, c, w: 800 })}${tx(cx, cy + 30, n, { a: 'middle', s: 12.5, c: '#9fb0bd' })}`; }).join('') + tx(260, 262, `Energia específica ${fm(e.spec || K().spec || 0, 2)} kWh/t`, { a: 'middle', s: 13, c: '#9fdcf0' })); },
    al: () => { const A = (K().alarms || []).slice(0, 6); return SV(tx(18, 30, 'Alarmes ativos do setor 3', { s: 14, c: '#ffd24a' }) + (A.length ? A.map((a, i) => `<rect x="14" y="${44 + i * 40}" width="492" height="34" rx="6" fill="${a.st === 'crit' ? '#3a1414' : '#3a2a10'}"/><circle cx="32" cy="${61 + i * 40}" r="7" fill="${a.st === 'crit' ? '#ff3b2f' : '#ffb020'}"/>${tx(48, 66 + i * 40, (a.tag + ' · ' + a.why).slice(0, 62), { s: 12 })}`).join('') : `<circle cx="260" cy="150" r="34" fill="#1f8a5b"/>${tx(260, 162, '✓', { a: 'middle', s: 34, w: 800 })}${tx(260, 216, 'Nenhum alarme ativo', { a: 'middle', s: 15, c: '#7fe0a8' })}`)); },
    eq: () => { const L = SEQ, n = L.length, w = 492 / n; return SV(tx(18, 30, 'Sequência de partida (jusante → montante)', { s: 14, c: '#ffd24a' }) + L.map((t, i) => { const o = itemOf(t), c = o.trip || o.es || o.cord ? '#ff3b2f' : o.lock || o.mnt ? '#ffd24a' : o.on ? '#2fbf71' : '#4a525a', x = 14 + i * w;
        return `<rect x="${x + 1}" y="70" width="${w - 3}" height="120" rx="4" fill="#13263a" stroke="${c}" stroke-width="2"/><circle cx="${x + w / 2}" cy="92" r="7" fill="${c}"/><text x="${x + w / 2}" y="180" fill="#cfd8de" font-size="10" text-anchor="end" transform="rotate(-90 ${x + w / 2} 180)">${t}</text>`; }).join('')
      + [['#2fbf71', 'operando'], ['#4a525a', 'parado'], ['#ff3b2f', 'desarme'], ['#ffd24a', 'bloqueado']].map(([c, t], i) => `<circle cx="${30 + i * 120}" cy="232" r="7" fill="${c}"/>${tx(42 + i * 120, 237, t, { s: 12, c: '#cfd8de' })}`).join('')); },
    qr: () => { let q = ''; let sd = 7; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) if (rr() < .5 || ((i < 4 || i > 10) && (j < 4 || j > 10) && (i % 10 < 4 && j % 10 < 4))) q += `<rect x="${226 + j * 6}" y="${80 + i * 6}" width="6" height="6" fill="#111"/>`;
      return SV(`<rect x="196" y="30" width="150" height="240" rx="18" fill="#1d2733" stroke="#9fb0bd" stroke-width="3"/><rect x="216" y="70" width="110" height="110" fill="#fff"/>${q}${tx(271, 210, 'Área 3', { a: 'middle', s: 14 })}${tx(271, 232, 'leia para acessar', { a: 'middle', s: 11, c: '#9fb0bd' })}` + tx(380, 120, 'Operador de campo', { s: 13, c: '#ffd24a' }) + tx(380, 142, 'acessa o painel', { s: 12 }) + tx(380, 160, 'pelo celular', { s: 12 })); },
    ast: () => { const k = K(), nA = (k.alarms || []).length; return SV(`<defs><clipPath id="cbc"><rect x="14" y="40" width="164" height="204" rx="12"/></clipPath></defs><image href="img/cerebro.jpg" x="14" y="40" width="164" height="204" preserveAspectRatio="xMidYMid slice" clip-path="url(#cbc)"/><rect x="14" y="40" width="164" height="204" rx="12" fill="none" stroke="#5cc6dc" stroke-width="2"/>` + [['Produção', th(k.prod)], ['Carga circulante', fm(k.circ || 0) + ' %'], ['Eficiência do peneiramento', fm((k.efic || {}).tag || 0, 1) + ' %'], ['Alarmes ativos', String(nA)]].map(([a, v], i) => tx(190, 80 + i * 44, a, { s: 13, c: '#9fb0bd' }) + tx(500, 80 + i * 44, v, { a: 'end', s: 16, c: '#fff', w: 800 })).join('') + tx(190, 262, 'O Assistente analisa estes dados e sugere ajustes', { s: 12, c: '#9fdcf0' })); },
    prob: () => { const P = Object.entries(sim.eq).filter(([t, e]) => e.st && e.st !== 'ok' && e.st !== 'off').slice(0, 6); return SV(tx(18, 30, 'Desvios nos pontos de inspeção', { s: 14, c: '#ffd24a' }) + (P.length ? P.map(([t, e], i) => `<rect x="14" y="${44 + i * 40}" width="492" height="34" rx="6" fill="#13263a"/><circle cx="32" cy="${61 + i * 40}" r="7" fill="${e.st === 'crit' ? '#ff3b2f' : '#ffb020'}"/>${tx(48, 66 + i * 40, `${t} · carga ${fm((e.load || 0) * 100)} % · desgaste ${fm(e.w)} % · saúde ${e.health ?? '–'}`, { s: 12 })}`).join('') : `${tx(260, 150, '✓ Nenhum desvio nos equipamentos', { a: 'middle', s: 15, c: '#7fe0a8' })}`)); },
    insp: () => SV(`<rect x="150" y="26" width="220" height="246" rx="10" fill="#e9e4d4"/><rect x="215" y="16" width="90" height="24" rx="6" fill="#9a8a6a"/>${['Peneiras: telas e molas', 'HP 400: óleo e vazamentos', 'Barmac: vibração e tampa', 'Correias: cordão e alinhamento', 'Passarelas: limpeza'].map((t, i) => `<rect x="168" y="${62 + i * 40}" width="16" height="16" rx="3" fill="#fff" stroke="#555"/>${i < 3 ? `<path d="M171 ${71 + i * 40} l4 4 l8 -9" stroke="#1f8a5b" stroke-width="3" fill="none"/>` : ''}${tx(192, 75 + i * 40, t, { s: 12, c: '#222' })}`).join('')}` + tx(390, 140, 'Registro', { s: 14, c: '#ffd24a' }) + tx(390, 160, 'da ronda', { s: 14, c: '#ffd24a' })),
    ctl: () => { const R = [['Alimentação nova', sim.feed, 0, 5200, ' t/h'], ['APF dos HP 400', sim.css, 12, 30, ' mm'], ['Velocidade da TCLD', sim.tcld, 40, 110, ' %'], ['Umidade do ROM', sim.moist, 5, 14, ' %'], ['Rotação do Barmac', sim.rpm, 1000, 1640, ' rpm']];
      return SV(R.map(([n, v, a, b, u], i) => { const y = 36 + i * 50, p = Math.max(0, Math.min(1, (v - a) / (b - a))); return `${tx(20, y, n, { s: 13 })}${tx(500, y, fm(v, u === ' %' && n.includes('Umidade') ? 1 : 0) + u, { a: 'end', s: 13, c: '#ffd24a' })}<rect x="20" y="${y + 10}" width="480" height="8" rx="4" fill="#1d3550"/><rect x="20" y="${y + 10}" width="${480 * p}" height="8" rx="4" fill="#5cc6dc"/><circle cx="${20 + 480 * p}" cy="${y + 14}" r="9" fill="#fff"/>`; }).join('')); } };
  const IMGC = {};
  const snapView = (k) => { if (IMGC[k]) return IMGC[k]; const T = window.__twin, V = VIEWS[k]; if (!T || !V) return '';
    const c = T.camera, p0 = c.position.clone(), q0 = c.quaternion.clone(), f0 = c.fov;
    try { c.position.set(...V[0]); c.lookAt(new c.position.constructor(...V[1])); c.fov = 58; c.updateProjectionMatrix(); c.updateMatrixWorld();
      if (T.composer) T.composer.render(0); else T.renderer.render(T.scene, c);
      const src = T.renderer.domElement, w = 520, h = Math.round(w * 9 / 16), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const sw = src.width, sh = src.height, ch = Math.min(sh, sw * 9 / 16); cv.getContext('2d').drawImage(src, 0, (sh - ch) / 2, sw, ch, 0, 0, w, h); IMGC[k] = cv.toDataURL('image/jpeg', .82);
    } catch (e) { IMGC[k] = ''; } finally { c.position.copy(p0); c.quaternion.copy(q0); c.fov = f0; c.updateProjectionMatrix(); c.updateMatrixWorld(); }
    return IMGC[k]; };
  /* caixa de explicação: texto do item + ouvir/parar + explicação do Assistente com os valores atuais + escolha da voz */
  const ex = document.createElement('div'); ex.className = 's3exp'; ex.hidden = true; document.body.appendChild(ex); let exK = null, exTxt = '';
  const valOf = (k) => { const v = el.querySelector('#' + k + 'v') || el.querySelector('#pS_' + k); return v ? v.textContent.trim() : ''; };
  const nameOf = (k) => { const b = el.querySelector(`.spk[data-spk="${k}"]`); return b ? b.parentElement.textContent.replace('🔊', '').replace(/\s+/g, ' ').trim().replace(valOf(k), '').trim() : k; };
  const exRender = (busy) => { const V = VZ.list(), cur = VZ.pick(); const im = IMGC[exK], sv = SVGF[exK]; let fig = ''; if (sv) { try { fig = `<figure class="exim">${sv()}</figure>`; } catch (e) { fig = ''; } } else if (im) fig = `<figure class="exim"><img src="${im}" alt="${esc(VIEWS[exK][2])}"><figcaption>${esc(VIEWS[exK][2])}</figcaption></figure>`;
    ex.innerHTML = `<div class="h"><b>🔊 ${esc(nameOf(exK))}</b><button data-x title="Fechar">×</button></div>${fig}${valOf(exK) ? `<small>Valor atual: <b>${esc(valOf(exK))}</b></small>` : ''}
      <p>${esc(exTxt)}</p><div class="r"><button data-play>▶ Ouvir</button><button data-stop>■ Parar</button><button data-ai class="pri"${busy ? ' disabled' : ''}>${busy ? 'Assistente explicando…' : '🧠 Explicar com o Assistente (valores atuais)'}</button></div>
      <label>Voz <select data-voz><option value="__rec"${recV() === '__rec' ? ' selected' : ''}>Francisca · voz natural (gravada)</option><option value="__recT"${recV() === '__recT' ? ' selected' : ''}>Thalita · voz natural expressiva (gravada)</option>${V.sort((a, b) => VZ.rank(b) - VZ.rank(a)).map((v) => `<option${!recOn() && cur && v.name === cur.name ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>${recOn() ? '<small>A explicação do Assistente, criada na hora, usa a melhor voz do navegador.</small>' : ''}`; };
  const openEx = (k, b) => { exK = k; exTxt = EXPL[k] || ''; if (!SVGF[k]) snapView(k); const r = b.getBoundingClientRect(), pr = el.getBoundingClientRect(); ex.style.left = Math.min(innerWidth - 380, pr.right + 10) + 'px'; ex.style.top = Math.max(70, Math.min(innerHeight - 520, r.top - 10)) + 'px';
    exRender(false); ex.hidden = false; el.querySelectorAll('.spk.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); sayEx(() => b.classList.remove('on')); };
  ex.addEventListener('click', async (e) => { const b = el.querySelector(`.spk[data-spk="${exK}"]`);
    if (e.target.closest('[data-x]')) { stopAll(); ex.hidden = true; b && b.classList.remove('on'); return; }
    if (e.target.closest('[data-play]')) { b && b.classList.add('on'); sayEx(() => b && b.classList.remove('on')); return; }
    if (e.target.closest('[data-stop]')) { stopAll(); b && b.classList.remove('on'); return; }
    if (e.target.closest('[data-ai]')) { exRender(true); try {
        const q = `EXPLICAÇÃO DIDÁTICA PARA TREINAMENTO (não é diagnóstico): explique para um operador em formação, em até 6 frases simples e faladas, a importância de "${nameOf(exK)}" no processo do setor 3 (peneiramento e britagem): como afeta produção, granulometria do produto, energia, desgaste e segurança${valOf(exK) ? `, e o que o valor atual (${valOf(exK)}) indica em relação aos demais dados` : ''}. Diga o que acontece se aumentar ou diminuir. Escreva a explicação inteira no campo "resumo", sem listas.`;
        const r = await call('aiAnalyze', [{ modo: 'gemeo3', escopo: 'Área 3 · Peneiramento e britagem', pergunta: q, contexto: ctxAst() }]);
        exTxt = String((r && r.resumo) || '').trim() || exTxt; logEv('Assistente', `Explicação: ${nameOf(exK)}`); } catch (err) { exTxt = (EXPL[exK] || '') + ' (Assistente indisponível agora: ' + String(err.message || err).slice(0, 80) + ')'; }
      exRender(false); b && b.classList.add('on'); if (AU) { AU.pause(); AU = null; } VZ.speak(exTxt, () => b && b.classList.remove('on')); }
  });
  ex.addEventListener('change', (e) => { const s2 = e.target.closest('[data-voz]'); if (s2) { try { localStorage.setItem('s3voice', s2.value); } catch (x) { /* */ } exRender(false); if (/^__rec/.test(s2.value) && exK) playRec(exK); else { stopAll(); VZ.speak('Esta é a voz escolhida para as explicações.'); } } });
  el.addEventListener('click', (e) => { const b = e.target.closest('.spk'); if (!b) return; e.stopPropagation(); e.preventDefault(); if (exK === b.dataset.spk && !ex.hidden) { stopAll(); ex.hidden = true; b.classList.remove('on'); return; } openEx(b.dataset.spk, b); }, true);
  el.querySelectorAll('.s3sec>h5').forEach((h) => h.addEventListener('click', () => {
    const s = h.parentElement, k = s.dataset.k; s.classList.toggle('open');
    open = s.classList.contains('open') ? [...new Set([...open, k])] : open.filter((x) => x !== k); save(); render(true); allBtn();
  }));
  const allBtn = () => { $('#pAll').textContent = open.length ? 'Fechar todos' : 'Abrir todos'; };
  $('#pAll').onclick = () => { const toOpen = !open.length; el.querySelectorAll('.s3sec').forEach((s) => s.classList.toggle('open', toOpen)); open = toOpen ? SECS.map((s) => s[0]) : []; save(); allBtn(); render(true); };
  allBtn();

  // ---- sincronização com o simulador
  let bc = null, lastSync = 0;
  // estado vindo do simulador: canal local (mesmo site) ou servidor (sites diferentes)
  let viaBC = 0, srvBusy = false;
  const applyState = (d) => { lastSync = performance.now(); if (isFinite(d.night) && window.__s3setNight) { window.__nightExt = Date.now(); window.__s3setNight(d.night); } const was = sim.sync; sim.sync = true; if (!was && pend.length) { pend.forEach((x) => { const t = x.eqCmd && x.eqCmd.tag; if (t) (sim._lock = sim._lock || {})[t] = performance.now() + 20000; }); setTimeout(flushPend, 0); }
    if (isFinite(d.mine)) sim.feed = d.mine; if (isFinite(d.css)) sim.css = d.css; if (isFinite(d.vsiRpm)) sim.rpm = d.vsiRpm; if (isFinite(d.vsiCasc)) sim.casc = d.vsiCasc; if (isFinite(d.tcld)) sim.tcld = d.tcld; if (isFinite(d.moist)) sim.moist = d.moist; if (typeof d.running === 'boolean') sim.running = d.running; if (isFinite(d.fe)) sim.fe = d.fe; if (isFinite(d.p80)) sim.p80 = d.p80; const lk = sim._lock || {}, now = performance.now();
    /* desgaste e liga/desliga de cada equipamento vêm do simulador (fonte única), exceto logo depois de um comando dado aqui */
    if (d.eq) for (const t in d.eq) { const e = sim.eq[t], q = d.eq[t]; if (!e || !q || (lk[t] || 0) > now || (q.rev || 0) < (e.rev || 0)) continue; e.rev = q.rev || 0; if (isFinite(q.w)) e.w = q.w; if (typeof q.on === 'boolean') e.on = q.on; if (q.ctl) { const c = q.ctl; e.trip = c.trip || null; if (c.mode) e.mode = c.mode; e.es = !!c.es; for (const k of ['lube', 'lid', 'guard']) if (typeof c[k] === 'boolean') e[k] = c[k]; if (!e.mnt) e.lock = c.lock ? (e.lock || { t: Date.now() }) : null; } if (q.mnt && !e.mnt) startMnt(e); else if (q.mnt === false && e.mnt) { const r = finishMnt(t, e); if (r) r.sent = true; } if (e.mnt && isFinite(q.mh)) e.mnt.h = Math.max(e.mnt.h || 0, q.mh); }
    if (d.belts && sim.belts) for (const t in d.belts) { if ((lk[t] || 0) > now || !sim.belts[t]) continue; Object.assign(sim.belts[t], d.belts[t]); }
    const stale = (t) => (lk[t] || 0) > now || (d.eq && d.eq[t] && (d.eq[t].rev || 0) < (sim.eq[t].rev || 0));
    sim.extAl = (Array.isArray(d.alarms) ? d.alarms : []).filter((a) => !Object.keys(sim.eq).some((t) => stale(t) && String(a.msg || '').indexOf(t) >= 0)); };
  try { bc = new BroadcastChannel('setor3-sync'); bc.onmessage = (m) => { const d = m.data || {}; if (d.type !== 'state') return; viaBC = performance.now(); applyState(d); }; } catch (e) { bc = null; }
  // sem canal local recente: busca o estado no servidor a cada 6 s (estado com até 30 s de idade)
  setInterval(() => { if (performance.now() - viaBC < 6000 || srvBusy || document.hidden) return; srvBusy = true;
    call('syncGet', ['state', getToken()], 1).then((r) => { srvBusy = false; if (r && r.d && Date.now() - r.t < 30000) applyState(r.d); }).catch(() => { srvBusy = false; }); }, 15000);   // a cada 15 s (alivia o servidor; no mesmo navegador usa o canal local)
  const pend = []; /* comandos de equipamento dados sem ligação com o simulador: enviados quando a ligação voltar */
  const send = (set) => { if (!sim.sync) { if (set && (set.eqCmd || set.ctl)) { pend.push(set); if (pend.length > 30) pend.shift(); } return; } if (bc && performance.now() - viaBC < 6000) bc.postMessage({ type: 'set', set }); else call('syncPost', ['cmd', set, getToken()], 2).catch(() => {}); };
  const flushPend = () => { if (!pend.length || !sim.sync) return; const L = pend.splice(0); L.forEach((x) => { const t = x.eqCmd && x.eqCmd.tag; if (t) (sim._lock = sim._lock || {})[t] = performance.now() + 20000; send(x); }); logEv('Integração', `${L.length} comando(s) de equipamento enviados ao simulador após a reconexão`); };
  /* comando de equipamento (troca / liga-desliga) dado no gêmeo: vale aqui na hora e vai para o simulador */
  sim.cmdCtl = (tag, c) => { const e = sim.eq[tag]; if (e) e.rev = (e.rev || 0) + 1; (sim._lock = sim._lock || {})[tag] = performance.now() + 20000; send({ ctl: Object.assign({ tag, rev: e ? e.rev : 0 }, c) }); };
  sim.cmdEq = (tag, c) => { const e = sim.eq[tag]; if (e) e.rev = (e.rev || 0) + 1; (sim._lock = sim._lock || {})[tag] = performance.now() + 20000; send({ eqCmd: Object.assign({ tag, rev: e ? e.rev : 0 }, c) }); };

  // ---- controles (montados uma vez)
  const C = $('#pB_ctl');
  C.innerHTML = `<div class="ctl"><div class="r"><span><button class="spk" data-spk="cF" title="Ouvir a explicação">🔊</button>Alimentação nova (ROM da lavra)</span><b id="cFv"></b></div><input type="range" id="cF" min="0" max="5200" step="50"><small id="cFn">Vazão de ROM que a TCLD entrega ao setor.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cC" title="Ouvir a explicação">🔊</button>Abertura dos HP 400 (APF)</span><b id="cCv"></b></div><input type="range" id="cC" min="12" max="30" step="1"><small>Menor abertura = produto mais fino e mais carga circulante; mais potência nos cônicos.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cT" title="Ouvir a explicação">🔊</button>Velocidade da TCLD</span><b id="cTv"></b></div><input type="range" id="cT" min="40" max="110" step="1"><small>Capacidade nominal 6.000 t/h a 100 %.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cM" title="Ouvir a explicação">🔊</button>Umidade do ROM</span><b id="cMv"></b></div><input type="range" id="cM" min="5" max="14" step=".5"><small>Acima de 9 % o minério cola nos decks (colmatação) e a eficiência das peneiras cai. Alerta amarelo a partir de 8,5 % (ou quando sobe rápido) e vermelho a partir de 9,5 %.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cR" title="Ouvir a explicação">🔊</button>Finos do ROM (&lt; 12,5 mm)</span><b id="cRv"></b></div><input type="range" id="cR" min="30" max="85" step="1"><small>[adotado] Fração do ROM (&lt; 150 mm) que já chega abaixo de 12,5 mm. Itabirito friável: quanto mais fino, menor a carga circulante e a energia de britagem.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cW" title="Ouvir a explicação">🔊</button>Wi do minério (Bond)</span><b id="cWv"></b></div><input type="range" id="cW" min="6" max="20" step=".5"><small>Índice de trabalho de laboratório; referência para a eficiência energética dos britadores (Wi ÷ Wio).</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cP" title="Ouvir a explicação">🔊</button>Barmac · rotação do rotor</span><b id="cPv"></b></div><input type="range" id="cP" min="1000" max="1640" step="10"><small>Manual B9100SE: mais rotação = maior velocidade na ponta (50–85 m/s), produto mais fino e mais potência.</small></div>
    <div class="ctl"><div class="r"><span><button class="spk" data-spk="cK" title="Ouvir a explicação">🔊</button>Barmac · cascata</span><b id="cKv"></b></div><input type="range" id="cK" min="0" max="40" step="1"><small>Parte da alimentação que desvia do rotor (choque rocha-rocha): alivia a potência e engrossa o produto — ajuste fino da curva granulométrica.</small></div>
    <button class="go" id="cRun"></button>`;
  const cF = $('#cF'), cC = $('#cC'), cT = $('#cT'), cM = $('#cM'), cR = $('#cR'), cW = $('#cW');
  cR.oninput = () => { sim.f12 = +cR.value / 100; }; cR.onchange = () => logEv('Ajuste', `Finos do ROM < 12,5 mm = ${fm(sim.f12 * 100)} %`);
  const cP = $('#cP'), cK = $('#cK');
  cP.oninput = () => { sim.rpm = +cP.value; send({ vsiRpm: sim.rpm }); }; cP.onchange = () => logEv('Ajuste', `Rotação dos Barmac = ${fm(sim.rpm)} rpm`);
  cK.oninput = () => { sim.casc = +cK.value; send({ vsiCasc: sim.casc }); }; cK.onchange = () => logEv('Ajuste', `Cascata dos Barmac = ${fm(sim.casc)} %`);
  cW.oninput = () => { sim.wi = +cW.value; }; cW.onchange = () => logEv('Ajuste', `Wi do minério = ${fm(sim.wi, 1)} kWh/t`);
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
  // ---- curva granulométrica: % passante acumulado × tamanho (escala log), por etapa
  $('#pB_gran').innerHTML = '<canvas id="gG" style="height:190px" title="Clique para ver o detalhe da granulometria"></canvas><p class="hint" style="margin:2px 0 6px">🔍 Clique no gráfico para abrir o detalhe</p><div id="gT"></div><p class="hint">Curvas Rosin–Rammler (ROM truncado em 150 mm) fechadas com o balanço de massa do circuito; selos indicam a origem de cada número. A APF muda o britado do HP 400 e a carga circulante; o produto é definido pela tela de 12,5 mm e pelos finos do ROM — o P80 do produto é o F80 de alimentação da moagem. Ajuste os finos do ROM e a APF em <b>Controles e ajustes</b>.</p>';
  $('#gG').addEventListener('click', () => openGran());   // detalhe da granulometria
  const GC = [['rom', 'ROM (TCLD)', '#9aa7b3'], ['mix', 'Alimentação das peneiras', '#5cc6dc'], ['hp', 'Britado HP 400', '#ff9a4a'], ['vsi', 'Britado Barmac', '#c58cff'], ['prod', 'Produto → moagem', '#2fbf71']];
  function granChart(cv) {
    const G = sim.kpi.gran; if (!G) return; const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, pl = 30 * dpr, pr = 8 * dpr, pt = 30 * dpr, pb = 16 * dpr, X0 = Math.log10(.5), X1 = Math.log10(300);
    const sx = (v) => pl + (W - pl - pr) * (Math.log10(v) - X0) / (X1 - X0), sy = (p) => pt + (H - pt - pb) * (1 - p);
    x.clearRect(0, 0, W, H); x.font = `${9.5 * dpr}px system-ui`; x.strokeStyle = 'rgba(255,255,255,.08)'; x.fillStyle = '#7b8a97';
    for (const v of [1, 2, 5, 10, 20, 50, 100, 200]) { x.beginPath(); x.moveTo(sx(v), pt); x.lineTo(sx(v), H - pb); x.stroke(); x.fillText(String(v), sx(v) - 4 * dpr, H - 4 * dpr); }
    for (const p of [0, .5, .8, 1]) { x.beginPath(); x.moveTo(pl, sy(p)); x.lineTo(W - pr, sy(p)); x.stroke(); x.fillText(Math.round(p * 100) + '%', 2 * dpr, sy(p) + 3 * dpr); }
    x.setLineDash([4 * dpr, 3 * dpr]); x.strokeStyle = 'rgba(255,210,74,.7)'; x.beginPath(); x.moveTo(sx(12.5), pt); x.lineTo(sx(12.5), H - pb); x.stroke();
    x.strokeStyle = 'rgba(255,154,74,.6)'; x.beginPath(); x.moveTo(sx(sim.css), pt); x.lineTo(sx(sim.css), H - pb); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#ffd24a'; x.fillText('12,5 mm', sx(12.5) + 3 * dpr, pt + 9 * dpr); x.fillStyle = '#ff9a4a'; x.fillText(`APF ${sim.css} mm`, sx(sim.css) + 3 * dpr, pt + 19 * dpr);
    let lx = pl, ly = 10 * dpr; x.font = `600 ${9.5 * dpr}px system-ui`;
    for (const [k, n, c] of GC) { const tw = x.measureText(n).width + 16 * dpr; if (lx + tw > W) { lx = pl; ly += 11 * dpr; } x.fillStyle = c; x.fillRect(lx, ly - 5 * dpr, 9 * dpr, 3 * dpr); x.fillText(n, lx + 11 * dpr, ly); lx += tw; }
    for (const [k, , c] of GC) { const f = k === 'mix' ? G.mix : k === 'prod' ? (G.prodCum || ((v) => Math.min(1, G.mix(Math.min(v, 12.5)) / G.p12))) : (v) => G.pas(G.st[k], v); x.strokeStyle = c; x.lineWidth = (k === 'prod' ? 2.4 : 1.6) * dpr; x.beginPath();
      for (let i = 0; i <= 80; i++) { const v = Math.pow(10, X0 + (X1 - X0) * i / 80), X = sx(v), Y = sy(f(v)); i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); }
  }
  // selo de origem de cada número: real (fonte publicada), ref. (referência ajustável) ou adotado (hipótese do modelo)
  const tagO = (k) => `<span class="org ${k}">${{ real: 'real', ref: 'ref.', adot: 'adotado', calc: 'calculado' }[k]}</span>`;
  function granTable() {
    const G = sim.kpi.gran; if (!G) return ''; const f1 = (v) => fm(v, 1);
    const row = (a, v, o, b) => `<tr><td>${b ? '<b>' + a + '</b>' : a} ${tagO(o)}</td><td class="n">${b ? '<b>' + v + '</b>' : v}</td></tr>`;
    return `<table><tr><th>Etapa</th><th class="n">P80 (mm)</th></tr>${row('ROM (TCLD), tamanho máx. 150 mm', f1(G.st.rom.p80), 'adot')}${row('Alimentação somada das peneiras (primárias + britagem + Barmac)', f1(G.feedP80), 'calc')}${row('Retido 1º deck (&gt; 25,4 mm) → HP 400', f1(G.st.r1.p80), 'calc')}${row('Retido 2º deck (−25,4 +12,5 mm) → Barmac', f1(G.st.r2.p80), 'calc')}${row(`Britado HP 400 (APF ${sim.css} mm)`, f1(G.st.hp.p80), 'adot')}${row('Britado Barmac', f1(G.st.vsi.p80), 'adot')}${row('Produto &lt; 12,5 mm = F80 da moagem', f1(G.p80prod), 'calc', 1)}</table>
    <p class="hint">Eficiência média das peneiras: ${fm(G.effM)} %. Referência (APF 20 mm, eficiência 92 %): ${f1(G.p80prod / G.ratio)} mm → agora ${G.ratio >= 1 ? '+' : ''}${fm((G.ratio - 1) * 100)} %.</p>
    <details class="src"><summary>Origem dos parâmetros</summary><table>
      <tr><td>ROM &lt; 150 mm; circuito em dois estágios: peneiramento primário (12,5 mm) tira o fino; britagem com telas de 25,4 / 14 mm (corte do produto 12,5 mm); Barmac em circuito fechado com peneiras próprias (16 / 12,5 mm); produto &lt; 12,5 mm</td><td>${tagO('real')}</td><td>Dissertação Figueiredo (UFMG, 2019), Britagem 01 de Germano</td></tr>
      <tr><td>7 peneiras banana 10×28 ft, 2 decks (primário 03PN001–004, secundário 03PN005–007); 2 HP 400 (1ª) e 3 Barmac 9100 (2ª), circuito fechado</td><td>${tagO('real')}</td><td>Apostila Concentrador III (GEA/Samarco); TCC Rodrigues &amp; Silva (2016), Usina II</td></tr>
      <tr><td>Capacidade por britador (HP 400 260–854 t/h com cascata, Barmac 690 t/h)</td><td>${tagO('real')}</td><td>Faixa de catálogo; Britagem 01: Omnicone 1560 ≤ 350 t/h, Barmac B9000XHD ≤ 500 t/h</td></tr>
      <tr><td>Finos do ROM &lt; 12,5 mm (${fm(sim.f12 * 100)} %), inclinações das curvas</td><td>${tagO('adot')}</td><td>Hipótese do modelo — calibrar com análise granulométrica</td></tr>
      <tr><td>P80 do HP 400 ≈ 1,45 × APF; Barmac ≈ 2,1:1</td><td>${tagO('adot')}</td><td>Regras práticas de britagem</td></tr>
      <tr><td>Eficiência das peneiras (92 % / 96 %), Wi ${fm(sim.wi, 1)} kWh/t</td><td>${tagO('adot')}</td><td>Faixas usuais; editáveis em Controles</td></tr>
      <tr><td>Operação atual: Usina de Beneficiamento 2 (esta Usina II) em operação desde dez/2024, ≈ 60 % da capacidade (≈ 15 Mt/ano); Concentrador 1 (Britagem 01 da dissertação) com retorno previsto até 2028</td><td>${tagO('ref')}</td><td>Prévias operacionais Samarco 2024–2025 (imprensa); a estrutura da Britagem 01 é usada como referência de projeto</td></tr>
    </table></details>`;
  }
  // ---- TELA DE DETALHE DA GRANULOMETRIA (abre ao clicar no gráfico) ----
  let gd = null, gdT = 0;
  const dX = (f, p) => { let lo = .01, hi = 300; if (f(lo) >= p) return lo; if (f(hi) < p) return hi; for (let i = 0; i < 50; i++) { const m = Math.sqrt(lo * hi); if (f(m) < p) lo = m; else hi = m; } return Math.sqrt(lo * hi); };
  const curves = () => { const G = sim.kpi.gran; if (!G) return null; const prod = G.prodCum || ((v) => Math.min(1, G.mix(Math.min(v, 12.5)) / G.p12));
    return { rom: (v) => G.pas(G.st.rom, v), mix: G.mix, hp: (v) => G.pas(G.st.hp, v), vsi: (v) => G.pas(G.st.vsi, v), prod }; };
  const SIEVES = [150, 100, 75, 50, 31.5, 19, 12.5, 9.5, 6.3, 4.75, 2, 1, .5, .15, .075];
  function gdHist(cv, C) { const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, pl = 30 * dpr, pb = 30 * dpr, pt = 22 * dpr, n = SIEVES.length, bw = (W - pl - 8 * dpr) / n;
    const ser = [['rom', '#9aa7b3'], ['mix', '#5cc6dc'], ['prod', '#2fbf71']], vals = ser.map(([k]) => SIEVES.map((a, i) => { const up = i ? SIEVES[i - 1] : 1e9; return Math.max(0, (up > 300 ? 1 : C[k](up)) - C[k](a)); }));
    vals.forEach((v, j) => { v.push(C[ser[j][0]](SIEVES[n - 1])); });   // fundo (< 0,075 mm)
    const mx = Math.max(.05, ...vals.flat()); x.clearRect(0, 0, W, H); x.font = `${9 * dpr}px system-ui`; x.fillStyle = '#9fb0bd';
    for (const p of [0, .5, 1]) { const y = pt + (H - pt - pb) * (1 - p); x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(pl, y); x.lineTo(W, y); x.stroke(); x.fillText(Math.round(p * mx * 100) + '%', 2, y + 3 * dpr); }
    const labs = SIEVES.map((a) => '+' + String(a).replace('.', ',')).concat(['fundo']), bwN = (W - pl - 8 * dpr) / labs.length;
    labs.forEach((l, i) => { ser.forEach(([, c], j) => { const h = (H - pt - pb) * vals[j][i] / mx; x.fillStyle = c; x.fillRect(pl + i * bwN + j * bwN / 3.4 + 1, H - pb - h, bwN / 3.6, h); });
      x.save(); x.translate(pl + i * bwN + bwN / 2, H - pb + 6 * dpr); x.rotate(-.7); x.fillStyle = '#9fb0bd'; x.fillText(l, -18 * dpr, 6 * dpr); x.restore(); });
    let lx = pl; ser.forEach(([k, c]) => { const nm = { rom: 'ROM', mix: 'Alimentação', prod: 'Produto' }[k]; x.fillStyle = c; x.fillRect(lx, 8 * dpr, 9 * dpr, 6 * dpr); x.fillStyle = '#dfe9f1'; x.fillText(nm, lx + 12 * dpr, 14 * dpr); lx += x.measureText(nm).width + 26 * dpr; }); }
  function gdRender() { if (!gd) return; const G = sim.kpi.gran, K = sim.kpi, C = curves(); if (!G || !C) return; const f1 = (v) => fm(v, 1), f2 = (v) => fm(v, 2);
    const P = (k, p) => dX(C[k], p), p80 = P('prod', .8), p50 = P('prod', .5), d10 = P('prod', .1), d60 = P('prod', .6), cu = d60 / Math.max(.01, d10), rom80 = P('rom', .8), fines = C.prod(.15) * 100, rr = rom80 / Math.max(.1, p80);
    const st = gd.querySelector('.bd').scrollTop;
    gd.querySelector('.bd').innerHTML = `<div class="kp">
      <div><b>${f1(p80)} mm</b><span>P80 do produto = F80 da moagem</span></div><div><b>${f1(p50)} mm</b><span>P50 do produto (mediana)</span></div><div><b>${f1(rom80)} mm</b><span>P80 do ROM (TCLD)</span></div>
      <div><b>${f1(rr)} : 1</b><span>Razão de redução global (P80 ROM ÷ P80 produto)</span></div><div class="${K.circ > 110 ? 'warn' : ''}"><b>${fm(K.circ)} %</b><span>Carga circulante</span></div><div class="${G.effM < 80 ? 'warn' : ''}"><b>${fm(G.effM)} %</b><span>Eficiência média das peneiras (Taggart)</span></div>
      <div><b>${f1(fines)} %</b><span>Finos &lt; 0,15 mm no produto</span></div><div><b>${f1(cu)}</b><span>Coef. de uniformidade D60/D10 do produto</span></div><div><b>${fm(sim.css)} mm</b><span>APF dos HP 400</span></div></div>
      <h4>Curvas acumuladas (passante × tamanho)</h4><canvas id="gdC" style="height:260px"></canvas>
      <h4>Distribuição retida por faixa (peneiras padrão)</h4><canvas id="gdH" style="height:210px"></canvas>
      <h4>Tamanhos característicos (mm)</h4><table><tr><th>Corrente</th><th>D10</th><th>D50</th><th>D80</th><th>D90</th></tr>
        ${GC.map(([k, n, c]) => `<tr><td><span style="color:${c}">■</span> ${n}</td><td>${f2(P(k, .1))}</td><td>${f1(P(k, .5))}</td><td><b>${f1(P(k, .8))}</b></td><td>${f1(P(k, .9))}</td></tr>`).join('')}</table>
      <h4>Análise por peneira · % passante acumulado</h4><table><tr><th>Peneira (mm)</th>${GC.map(([, n, c]) => `<th style="color:${c}">${n.replace(' das peneiras', '').replace(' → moagem', '')}</th>`).join('')}</tr>
        ${SIEVES.map((a) => `<tr><td>${String(a).replace('.', ',')}</td>${GC.map(([k]) => `<td>${f1(C[k](a) * 100)}</td>`).join('')}</tr>`).join('')}</table>
      <p class="hint">Modelo didático: curvas Rosin–Rammler (ROM truncado em 150 mm) fechadas pelo balanço de massa do circuito em dois estágios. Calibrar com análises granulométricas reais (peneiramento de amostras do ROM, das descargas dos britadores e do produto).</p>`;
    gd.querySelector('.bd').scrollTop = st; granChart(gd.querySelector('#gdC')); gdHist(gd.querySelector('#gdH'), C); }
  function openGran() { if (gd) { gdRender(); return; } gd = document.createElement('div'); gd.className = 's3gd'; gd.innerHTML = '<div class="hd"><h3>📊 Granulometria · detalhe do circuito</h3><button aria-label="Fechar">✕ Fechar</button></div><div class="bd"></div>';
    root.appendChild(gd); gd.querySelector('.hd button').onclick = () => { gd.remove(); gd = null; clearInterval(gdT); }; gdRender(); clearInterval(gdT); gdT = setInterval(gdRender, 1500); }


  // ---- renderização periódica
  function render(force) {
    const K = sim.kpi, E = sim.eq, on = (k) => open.includes(k);
    const local = performance.now() - viaBC < 6000, sync = sim.sync && performance.now() - lastSync < (local ? 6000 : 30000); if (!sync) sim.sync = false;
    $('#pSync').textContent = sync ? (local ? 'sincronizado com o simulador' : 'sincronizado (via servidor)') : 'sem simulador'; $('#pSync').className = 'sync' + (sync ? ' on' : '');
    const pns = Object.values(E).filter((e) => e.k === 'pn' && e.on && e.flow > 0), effM = pns.length ? pns.reduce((a, e) => a + e.eff, 0) / pns.length : 0;
    $('#pS_ind').textContent = `${fm(K.F)} → ${fm(K.prod)} t/h`; { const nA = K.alarms.length + (((sim.sync && sim.extAl) || []).length); $('#pS_al').textContent = nA ? `${nA} alarme(s)` : 'normal'; }
    $('#pS_eq').textContent = `${K.nPN}/8 PN · ${K.nC}/2 HP · ${K.nV}/3 Barmac`; $('#pS_ctl').textContent = sim.running ? 'operando' : 'parado';
    const nm = (t, e) => (e.k === 'pn' ? (['03PN005', '03PN006', '03PN007'].includes(t) ? 'Peneira secundária ' : 'Peneira primária ') : e.k === 'cone' ? 'HP 400 ' : 'Barmac ') + t;
    const why = (e) => { const run = e.on && e.flow > 0; if (!run || (e.st !== 'warn' && e.st !== 'crit')) return ''; const r = [];
      if (e.load > 1.05) r.push(`sobrecarga ${fm(e.load * 100)} %`); if (e.vib >= 7.1) r.push(`vibração ${fm(e.vib, 1)} mm/s`); if (e.w >= 85) r.push(`desgaste ${fm(e.w)} %`); if (e.oil >= 65) r.push(`óleo ${fm(e.oil)} °C`); if (e.k === 'pn' && e.eff < 80) r.push(`eficiência ${fm(e.eff)} %`);
      return r.length ? `<br><b style="color:#ff8a7a">⚠ ${r.join(' · ')}</b>` : ''; };
    const val = (e) => e.mnt ? `🔒 em manutenção · ${fm(e.mnt.h || 0, 1)} h` : (!(e.on && e.flow > 0) ? (e.on ? 'sem carga' : 'desligado') : e.k === 'pn' ? `efic. ${fm(e.eff)} % · ${fm(e.load * 100)} % carga · desg. ${fm(e.w)} %` : `${fm(e.kw)} kW · ${fm(e.vib, 1)} mm/s · desg. ${fm(e.w)} %`) + (e.health != null ? ` · saúde ${e.health}` : '');
    const dot = (e) => (e.st === 'mnt' ? 'mnt' : e.st === 'off' ? 'crit' : e.st === 'ok' ? '' : e.st);
    const probs = [];
    for (const [t, e] of Object.entries(E)) if (e.st !== 'ok') {
      const why = (K.alarms.find((a) => a.tag === t) || {}).why || (e.on ? '' : 'desligado');
      const dica = !e.on ? 'Equipamento desligado: a carga do grupo vai para os demais.' : /eficiência/.test(why) ? (sim.moist > 9 ? `Minério úmido (${fm(sim.moist, 1)} %): reduza a alimentação, aumente a limpeza dos decks e acompanhe a colmatação.` : 'Eficiência baixa: verifique deck desgastado ou entupido e a carga da peneira.')
        : /vibração/.test(why) ? 'Vibração alta: inspecione mancais, molas e fixações; confira a carga e o desgaste.' : /sobrecarga/.test(why) ? 'Sobrecarga: ligue outro equipamento do grupo ou reduza a alimentação.' : /desgaste/.test(why) ? 'Programe a troca do deck/revestimento na próxima parada.' : 'Fora da faixa operacional.';
      probs.push(`<div class="card ${e.st === 'off' ? 'crit' : e.st}"><b>${nm(t, e)}</b> · ${val(e)}<small>${why ? why + ' · ' : ''}${dica}</small></div>`);
    }
    // alarmes de processo do próprio modelo (umidade, circuito) e alarmes da área 3 vindos do simulador
    for (const a of K.alarms) if (!E[a.tag] && a.tag !== 'Circuito') probs.push(`<div class="card ${a.st}"><b>${esc(a.tag)}</b><small>${esc(a.why)}</small></div>`);
    for (const a of ((sim.sync && sim.extAl) || [])) probs.unshift(`<div class="card ${a.sev === 'crit' ? 'crit' : 'warn'}"><b>Alerta do simulador</b><small>${esc(a.msg)}</small></div>`);
    if (K.limited) probs.unshift(`<div class="card crit"><b>Circuito</b> · alimentação limitada<small>Britagem insuficiente para o retido: ligue os britadores parados ou reduza a alimentação.</small></div>`);
    $('#pS_pi').textContent = `${Object.values(E).filter((e) => e.st !== 'ok').length} fora da faixa`; $('#pS_prob').textContent = probs.length ? `${probs.length}` : 'nenhum';
    if (on('pi') || force) {
      $('#pB_pi').innerHTML = Object.entries(E).map(([t, e]) => `<div class="hs ${dot(e)}${document.body.dataset.eqsel === t ? ' sel' : ''}" data-i="${t}"><i></i><div>${nm(t, e)}</div><span>${val(e)}${why(e)}</span></div>`).join('') +
        `<div class="hs ${K.circ > 110 ? 'warn' : ''}" data-i="@circ"><i></i><div>Carga circulante</div><span>${fm(K.circ)} %</span></div><div class="hs" data-i="@prod"><i></i><div>Produto britado (&lt; 12,5 mm → pilha → moagem)</div><span>${K.gran ? 'P80 ' + fm(K.gran.p80prod, 1) + ' mm' : '–'}${sim.p80 ? ' · moagem ' + fm(sim.p80) + ' µm' : ''}</span></div>`;
      el.querySelectorAll('#pB_pi [data-i]').forEach((d) => d.onclick = () => openInfo(d.dataset.i)); }
    if (on('prob') || force) $('#pB_prob').innerHTML = probs.join('') || ('<div class="card">Nenhum desvio nos pontos de inspeção desta área.</div>' + (sim.sync ? '' : '<p class="hint">Sem ligação com o simulador: abra o gêmeo pelo número 3 do simulador (sala de controle, com a senha) e mantenha o simulador aberto. A ligação funciona pelo próprio navegador (site GitHub) ou pelo servidor (Apps Script), com atualização a cada ~6 s.</p>'));
    if (on('ind') || force) $('#pB_ind').innerHTML = `<div class="s3k">
      <div><b>${fm(K.F)}</b><span>Lavra · ROM da TCLD (t/h)</span></div><div><b>${fm(K.T)}</b><span>Alimentação das peneiras (t/h)</span></div>
      <div class="${K.prod < K.F * .95 ? 'warn' : ''}"><b>${fm(K.prod)}</b><span>Produto &lt; 12,5 mm (t/h)</span></div><div class="${K.circ > 110 ? 'warn' : ''}"><b>${fm(K.circ)} %</b><span>Carga circulante</span></div>
      <div><b>${fm(K.kw)}</b><span>Potência total (kW)</span></div><div><b>${fm(K.spec, 2)}</b><span>Energia específica (kWh/t)</span></div>
      <div class="${(K.umid || {}).st === 'crit' ? 'crit' : (K.umid || {}).st === 'warn' ? 'warn' : ''}"><b>${fm(sim.moist, 1)} %${(K.umid || {}).rise > .15 ? ' ↑' : ''}</b><span>Umidade do ROM${(K.umid || {}).st === 'crit' ? ' · colmatação' : (K.umid || {}).st === 'warn' ? ' · risco de colmatação' : ''}</span></div><div class="${effM < 80 ? 'warn' : ''}"><b>${fm(effM)} %</b><span>Eficiência média das peneiras</span></div></div>`;
    const EF = K.efic; if (EF) $('#pS_efic').textContent = `OEE ${fm(EF.oee * 100)} %`;
    if (on('efic') && EF) {
      const pc = (v) => fm(v * 100) + ' %', cls = (v, w, c) => (v < c ? 'crit' : v < w ? 'warn' : '');
      const row = (nm, c) => !c ? `<tr><td>${nm}</td><td colspan="6" class="n">parado</td></tr>` : `<tr><td>${nm} <small>(${c.n} em operação · carga ${pc(c.load)})</small></td><td class="n">${fm(c.F80, 1)}</td><td class="n">${fm(c.P80, 1)}</td><td class="n">${fm(c.rr, 2)}</td><td class="n">${fm(c.W, 2)}</td><td class="n">${isFinite(c.wio) ? fm(c.wio, 1) : '–'}</td><td class="n" style="color:${c.effE < .35 ? '#ff6b5b' : c.effE < .6 ? '#ffb020' : '#2fbf71'}"><b>${pc(Math.min(1, c.effE))}</b></td></tr>`;
      const low = [EF.cone, EF.vsi].filter((c) => c && c.effE < .35);
      const dica = low.length ? `<div class="card warn"><b>Eficiência energética baixa</b><small>${low.map((c) => (c === EF.cone ? 'HP 400' : 'Barmac') + ` com carga de ${pc(c.load)}`).join(' e ')}: boa parte da potência é consumida em vazio. ${EF.cone && EF.cone.effE < .35 && EF.cone.rr < 1.8 ? `Com APF ${sim.css} mm o HP 400 reduz pouco (razão ${fm(EF.cone.rr, 2)}): fechar a APF aumenta a redução. ` : ''}${EF.vsi && EF.vsi.load < .35 && EF.vsi.n > 1 ? 'Concentrar a carga (desligar um Barmac) melhora a eficiência sem perder produção. ' : ''}</small></div>` : '';
      $('#pB_efic').innerHTML = `<div class="s3k">
        <div class="${cls(EF.tag / 100, .85, .75)}"><b>${fm(EF.tag, 1)} %</b><span>Peneiramento (Taggart) · finos &lt; 12,5 mm recuperados</span></div>
        <div><b>${fm(EF.spec, 2)} kWh/t</b><span>Energia específica do setor</span></div>
        <div class="${cls(EF.oee, .85, .65)}"><b>${pc(EF.oee)}</b><span>OEE do setor</span></div>
        <div><b>${pc(EF.disp)} · ${pc(EF.desemp)} · ${pc(EF.qual)}</b><span>Disponibilidade · desempenho · qualidade</span></div></div>
        <table><tr><th>Britagem</th><th class="n">F80 mm</th><th class="n">P80 mm</th><th class="n">Razão</th><th class="n">kWh/t</th><th class="n">Wio</th><th class="n">Efic. energ.</th></tr>${row('HP 400 (primária)', EF.cone)}${row('Barmac (secundária)', EF.vsi)}</table>
        ${dica}
        <p class="hint"><b>Como é calculado.</b> Peneiramento: recuperação dos finos do 1º deck (${fm(EF.e1, 1)} %) × 2º deck (${fm(EF.e2, 1)} %). Britagem: Wio = W ÷ (10/√P80 − 10/√F80), em µm, e eficiência energética = Wi do minério (${fm(EF.wi, 1)} kWh/t) ÷ Wio. OEE = disponibilidade (equipamentos ligados) × desempenho (produção ÷ capacidade nominal de ${fm(sim.capNom)} t/h) × qualidade (produto dentro de 12,5 mm). Valores do modelo didático; calibrar com dados da usina.</p>`;
    }
    if (on('gran')) { granChart($('#gG')); $('#gT').innerHTML = granTable(); }
    if (sim.kpi.gran) $('#pS_gran').textContent = `P80 produto ${fm(sim.kpi.gran.p80prod, 1)} mm`;
    if (on('tend')) { const cv = el.querySelectorAll('#pB_tend canvas');
      chart(cv[0], [{ n: 'ROM', c: '#2fbf71', f: (h) => h.F }, { n: 'peneiras', c: '#5cc6dc', f: (h) => h.T }, { n: 'produto', c: '#ff9a4a', f: (h) => h.prod }], 'Vazões', 't/h');
      chart(cv[1], [{ n: 'carga circulante', c: '#ffd24a', f: (h) => h.circ }], 'Carga circulante', '%');
      chart(cv[2], [{ n: 'potência', c: '#c792ea', f: (h) => h.kw }], 'Potência total', 'kW'); }
    if (on('ctl') || force) {
      if (document.activeElement !== cP) cP.value = sim.rpm; if (document.activeElement !== cK) cK.value = sim.casc;
      if (document.activeElement !== cF) cF.value = sim.feed; if (document.activeElement !== cC) cC.value = sim.css; if (document.activeElement !== cT) cT.value = sim.tcld; if (document.activeElement !== cM) cM.value = sim.moist; if (document.activeElement !== cR) cR.value = Math.round(sim.f12 * 100); if (document.activeElement !== cW) cW.value = sim.wi;
      $('#cFv').textContent = fm(sim.feed) + ' t/h'; $('#cCv').textContent = sim.css + ' mm'; $('#cTv').textContent = fm(sim.tcld) + ' %'; $('#cMv').textContent = fm(sim.moist, 1) + ' %'; $('#cRv').textContent = fm(sim.f12 * 100) + ' %'; $('#cWv').textContent = fm(sim.wi, 1) + ' kWh/t'; $('#cPv').textContent = fm(sim.rpm) + ' rpm · ' + fm(sim.rpm * Math.PI * .99 / 60) + ' m/s'; $('#cKv').textContent = fm(sim.casc) + ' %';
      cF.disabled = cM.disabled = sync; $('#cFn').textContent = sync ? 'Vem da lavra no simulador (sincronizado). APF, TCLD e partir/parar daqui comandam o simulador.' : 'Vazão de ROM que a TCLD entrega ao setor. Limitada pela velocidade da TCLD.';
      $('#cRun').textContent = sim.running ? 'Parar o circuito' : 'Partir o circuito'; $('#cRun').style.background = sim.running ? '#c0392b' : '#1f8a5b'; }
    if (on('flu') || force) { const fe = sim.fe, si = sim.si;
      $('#pB_flu').innerHTML = `<table><tr><th>Fluxo</th><th class="n">t/h</th><th class="n">% Fe</th><th class="n">% SiO₂</th></tr>
        <tr class="grp"><td colspan="4">Entradas</td></tr><tr><td>ROM da TCLD (minério lavrado)</td><td class="n">${fm(K.F)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr class="grp"><td colspan="4">Circuito interno</td></tr><tr><td>Alimentação das 7 peneiras</td><td class="n">${fm(K.T)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr><td>Retido 1º deck → HP 400</td><td class="n">${fm(K.T * K.r1)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr><tr><td>Retido 2º deck → Barmac</td><td class="n">${fm(K.T * K.r2)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr><td>Britado → retorno às peneiras</td><td class="n">${fm((K.ret ?? (K.T - K.prod)))}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr>
        <tr class="grp"><td colspan="4">Saídas</td></tr><tr><td>Produto &lt; 12,5 mm → pilha de regularização</td><td class="n">${fm(K.prod)}</td><td class="n">${fm(fe, 1)}</td><td class="n">${fm(si, 1)}</td></tr></table>
        <p style="color:#9fb0bd;margin:6px 0 0">A britagem só reduz o tamanho: os teores entram e saem iguais. Balanço: entra ${fm(K.F)} t/h = sai ${fm(K.prod)} t/h${K.limited ? ' (alimentação limitada pela britagem)' : ''}.</p>`; }
    if (on('eq') || force) {   /* SALA DE CONTROLE: comando remoto, sequência de partida/parada e permissivos de cada item */
      const NMK = { pn: 'Peneira', cone: 'HP 400', vsi: 'Barmac' }, S = sim.seq;
      $('#pB_eq').innerHTML = `<div class="row" style="gap:6px;margin:4px 0 6px"><button data-sq="start"${S ? ' disabled' : ''}>▶ Partida sequencial</button><button data-sq="stop"${S ? ' disabled' : ''}>■ Parada sequencial</button>${S ? '<button data-sq="abort">Interromper</button>' : ''}<button data-sq="reset" title="Rearma os desarmes por intertravamento (não rearma emergência nem cordão)">↺ Rearmar intertravamentos</button></div>
        <p class="hint" style="margin:0 0 6px">${esc(S ? S.msg : sim.seqMsg || 'Partida de jusante para montante: 03TC005 → 03TC002/003 → peneiras → 03TC001 → 03TC004 → HP 400 e Barmac → 03TC006. Parada no sentido inverso.')}${sim.ctlMsg ? `<br><b style="color:${sim.ctlMsg.ok ? '#7fe0a8' : '#ff8a7a'}">${sim.ctlMsg.ok ? '✓' : '✗'} ${esc(sim.ctlMsg.t)}: ${esc(sim.ctlMsg.msg)}</b>` : ''}</p>
        <table><tr><th>Tag</th><th>Estado</th><th>Modo</th><th class="n">Perm.</th><th class="n">Carga</th><th></th></tr>${SEQ.map((tag) => { const o = itemOf(tag), P = perms(tag), np = P.filter((q) => q[1]).length, stC = o.trip || o.es || o.cord ? 'crit' : o.on ? 'ok' : 'off';
          return `<tr><td><a data-i="${tag}">${tag}</a><br><small style="color:#9fb0bd">${o.k === 'tc' ? esc(o.nome) : NMK[o.k]}</small></td><td><span class="st ${stC}"></span>${o.mnt ? 'manutenção' : o.lock ? '🔒 bloqueado' : o.trip ? 'desarmado' : o.on ? 'operando' : 'parado'}</td><td>${o.mode === 'L' ? '<b style="color:#ffd24a">L</b>' : 'R'}</td><td class="n" title="${esc(P.filter((q) => !q[1]).map((q) => q[0]).join('; ') || 'todos atendidos')}" style="color:${np === P.length ? '#7fe0a8' : '#ff8a7a'}">${np}/${P.length}</td><td class="n">${o.k !== 'tc' && o.on ? fm(o.load * 100) + ' %' : o.k === 'tc' && o.on ? fm(o.spd) + ' %' : '–'}</td><td><button data-t="${tag}">${o.on ? 'Desligar' : 'Ligar'}</button></td></tr>`; }).join('')}</table>`;
      el.querySelectorAll('#pB_eq [data-t]').forEach((b) => b.onclick = () => { const t = b.dataset.t, r = cmd(t, itemOf(t).on ? 'stop' : 'start', 'R'); sim.ctlMsg = Object.assign({ t }, r); render(true); });
      el.querySelectorAll('#pB_eq [data-sq]').forEach((b) => b.onclick = () => { const q = b.dataset.sq; sim.seqMsg = ''; if (q === 'abort') seqAbort('pelo operador'); else if (q === 'reset') { let n = 0; for (const t of SEQ) { const o = itemOf(t); if (o.trip && /^intertravamento/.test(o.trip)) { o.trip = null; n++; syncCtl(t); } } sim.ctlMsg = { t: 'Sala de controle', ok: true, msg: `${n} desarme(s) por intertravamento rearmado(s)` }; logEv('Comando', `Rearme de ${n} intertravamento(s)`); } else seq(q); render(true); });
      el.querySelectorAll('#pB_eq [data-i]').forEach((a) => a.onclick = () => { const t = a.dataset.i; if (sim.eq[t]) openInfo(t); else if (window.__s3openEq) window.__s3openEq(t); }); }
    const XA = (sim.sync && sim.extAl) || [], xaHTML = XA.map((a) => `<div class="al ${a.sev === 'crit' ? 'crit' : 'warn'}"><b>Simulador</b> · ${esc(a.msg)}</div>`).join('');
    if (on('al') || force) $('#pB_al').innerHTML = xaHTML + (K.alarms.length || XA.length ? (K.alarms.length ? K.alarms.map((a) => `<div class="al ${a.st}"><b>${a.tag}</b> · ${a.why}</div>`).join('') : '') : '<div style="color:#2fbf71">Sem alarmes ativos.</div>') +
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
    await ready; let info = { admin: false, q: null }; try { info = await call('acessoQrInfo', [getToken()]); } catch (e) { info = { admin: false, q: null, err: e.message }; }
    if (!info.admin) { if (info.err) qrDone = false; QB.innerHTML = `<p class="hint">Os QR Codes são gerados e impressos só pela sala de controle (entre no simulador com a senha).${info.err ? ' · ' + esc(info.err) : ''}</p>`; return; }
    QV = info.q; await loadQRLib();
    QB.innerHTML = `<div class="qrrow"><div class="qrbox">${qrSVG(qrURL(), 128)}</div><div class="hint"><b style="color:#ffd24a">Válido só nesta sessão:</b> a cada abertura do simulador os QR Codes mudam e os anteriores deixam de funcionar. Ao escanear com o celular e ter o acesso autorizado, o operador abre o simulador <b>nesta área</b>, podendo <b>alterar só os parâmetros dela</b>.<br>
      <a href="${esc(qrURL())}" target="_blank" rel="noopener" style="color:#5cc6dc">Abrir o link</a></div></div>
      <div class="row2" style="margin-top:8px"><button class="btn2" id="qrPr">Imprimir placa</button><button class="btn2 red" id="qrNew">Gerar novos QR Codes</button></div>`;
    $('#qrPr').onclick = () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><head><title>QR Code · área 3</title><style>body{font-family:Arial,sans-serif;margin:0}.pl{width:9.5cm;height:12.5cm;border:2px solid #111;border-radius:10px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:.4cm;text-align:center;padding:.3cm;box-sizing:border-box}.n{font-size:34px;font-weight:800;background:#0d3b4f;color:#fff;border-radius:50%;width:56px;height:56px;line-height:56px}h2{font-size:17px;margin:.25cm 0}p{font-size:11px;color:#333;margin:.2cm 0 0}svg{width:6cm;height:6cm}</style></head><body><div class="pl"><div class="n">3</div><h2>Peneiramento e britagem</h2>${qrSVG(qrURL(), 230)}<p>Escaneie com o celular para acessar e operar esta área</p></div></body></html>`); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (x) { /* impressão */ } }, 500); };
    $('#qrNew').onclick = async () => { if (!confirm('Gerar novos QR Codes? Todas as placas impressas deixam de funcionar e todos os celulares conectados perdem o acesso.')) return; try { await ready; const r = await call('acessoQrNovo', [getToken()]); QV = r && r.q; logEv('Acesso', 'Novos QR Codes gerados pelo gêmeo digital'); drawQR(); } catch (e) { alert('Não foi possível gerar: ' + e.message); } };
  }
  let qrDone = false;
  // ---- Registro de inspeção (mesma planilha do simulador) + análise pela Simulação
  const IB = $('#pB_insp'); let INSP = [];
  const locais = Object.keys(sim.eq).map((t) => (sim.eq[t].k === 'pn' ? 'Peneira ' : sim.eq[t].k === 'cone' ? 'HP 400 ' : 'Barmac ') + t);
  IB.innerHTML = `<div class="row2"><select id="inTipo"><option>Anomalia</option><option>Falha</option><option>Erro operacional</option><option>Condição insegura</option><option>Vazamento</option><option>Ruído/vibração</option><option>Acidente de trabalho</option></select><select id="inSev"><option>Baixa</option><option selected>Média</option><option>Alta</option><option>Crítica</option></select></div>
    <select id="inLocal"><option value="">Local/equipamento…</option>${locais.map((l) => `<option>${l}</option>`).join('')}<option>Correias / transferências</option><option>Outro</option></select>
    <textarea id="inDesc" rows="3" maxlength="1500" placeholder="Descreva o que foi encontrado na inspeção: o quê, onde, desde quando, condições observadas…"></textarea>
    <div class="row2"><input type="text" id="inOper" maxlength="60" placeholder="Operador (nome ou matrícula, opcional)" style="flex:2"><button class="btn2" id="inSave">Registrar</button></div>
    <button class="btn2 ai" id="inSaveAi" style="width:100%;margin-top:4px">Registrar e analisar com Simulação</button><p class="hint" id="inMsg"></p><div id="inList"></div><div id="inAi"></div>`;
  const sevc = (v) => (/crít|alta/i.test(v) ? 'crit' : /méd/i.test(v) ? 'warn' : '');
  function drawList() { $('#inList').innerHTML = INSP.length ? '<h5 style="margin:8px 0 4px;font:600 12px var(--disp);letter-spacing:.08em;color:#ffd24a;text-transform:uppercase">Registros recentes</h5>' + INSP.slice(0, 8).map((r, i) => `<div class="card ${sevc(r.severidade)}"><b>${esc(r.tipo)} · ${esc(r.severidade)}</b>${r.local ? ' · ' + esc(r.local) : ''}<small>${esc(r.data || r.tempo || '')}${r.operador ? ' · ' + esc(r.operador) : ''}${r.status ? ' · ' + esc(r.status) : ''}</small><div>${esc(r.descricao)}</div>${r.analise ? `<small>Simulação: ${esc(String(r.analise).slice(0, 220))}…</small>` : ''}<button class="btn2" data-ai="${i}" style="margin-top:5px;padding:3px 8px">Analisar com Simulação</button></div>`).join('') : '<p class="hint">Nenhum registro de inspeção para esta área.</p>';
    el.querySelectorAll('#inList [data-ai]').forEach((b) => b.onclick = () => analyze(INSP[+b.dataset.ai])); }
  async function loadList() { try { INSP = (await call('inspListar', ['crush'])) || []; } catch (e) { $('#inMsg').textContent = 'Não foi possível carregar os registros: ' + e.message; } drawList(); }
  function ctxIA(reg) {
    const E = sim.eq, K = sim.kpi;
    return { area: 'Área 3 · Peneiramento e britagem (Usina II)', indicadores: { lavra_t_h: Math.round(K.F), alimentacao_peneiras_t_h: Math.round(K.T), produto_t_h: Math.round(K.prod), carga_circulante_pct: Math.round(K.circ), potencia_kW: Math.round(K.kw), umidade_rom_pct: sim.moist, apf_mm: sim.css },
      pontos: Object.entries(E).map(([t, e], i) => ({ id: 'P' + (i + 1), nome: t, estado: e.st, carga_pct: Math.round(e.load * 100), vibracao_mm_s: +e.vib.toFixed(1), desgaste_pct: Math.round(e.w), eficiencia_pct: e.k === 'pn' ? Math.round(e.eff) : undefined })),
      alarmes: K.alarms, registros: [reg].concat(INSP.filter((r) => r !== reg).slice(0, 5)).map((r) => ({ tipo: r.tipo, severidade: r.severidade, local: r.local, descricao: r.descricao, data: r.data || r.tempo })) };
  }
  // ---- ASSISTENTE DE PROCESSO: a Simulação analisa o processo interno do gêmeo, faz o diagnóstico e propõe ajustes na planta
  $('#pB_ast').innerHTML = `<p class="hint">Analisa os indicadores, a eficiência, a granulometria, cada equipamento e os alarmes deste setor. Apresenta o diagnóstico e, se encontrar problemas, propõe ajustes e soluções que você pode aplicar.</p>
    <button class="btn2 ai" id="astGo" style="width:100%">Analisar o processo agora</button><div id="astOut"></div>`;
  function ctxAst() {
    const E = sim.eq, K = sim.kpi, EF = K.efic || {}, G = K.gran || {}, r1 = (v, d = 1) => (isFinite(v) ? +(+v).toFixed(d) : null);
    return { area: 'Área 3 · Peneiramento e britagem (Usina II) · gêmeo digital', sincronizado_com_simulador: !!sim.sync,
      controles: { apf_mm: sim.css, velocidade_tcld_pct: sim.tcld, alimentacao_nova_t_h: sim.feed, finos_rom_pct: r1(sim.f12 * 100, 0), umidade_rom_pct: r1(sim.moist), wi_kwh_t: sim.wi, circuito: sim.running ? 'operando' : 'parado' },
      indicadores: { lavra_t_h: r1(K.F, 0), alimentacao_peneiras_t_h: r1(K.T, 0), fino_direto_t_h: r1(K.fines, 0), retorno_britadores_t_h: r1(K.ret, 0), produto_t_h: r1(K.prod, 0), carga_circulante_pct: r1(K.circ, 0), potencia_kW: r1(K.kw, 0), energia_especifica_kwh_t: r1(K.spec, 2), alimentacao_limitada: !!K.limited, umidade_alerta: K.umid && K.umid.st },
      eficiencia: { peneiramento_taggart_pct: r1(EF.tag), oee_pct: r1((EF.oee || 0) * 100, 0), disponibilidade_pct: r1((EF.disp || 0) * 100, 0), desempenho_pct: r1((EF.desemp || 0) * 100, 0),
        hp400: EF.cone && { carga_pct: r1(EF.cone.load * 100, 0), razao_reducao: r1(EF.cone.rr, 2), wio: r1(EF.cone.wio), efic_energetica_pct: r1(Math.min(1, EF.cone.effE) * 100, 0) },
        barmac: EF.vsi && { carga_pct: r1(EF.vsi.load * 100, 0), razao_reducao: r1(EF.vsi.rr, 2), wio: r1(EF.vsi.wio), efic_energetica_pct: r1(Math.min(1, EF.vsi.effE) * 100, 0) } },
      granulometria_p80_mm: { rom: r1(G.st && G.st.rom.p80), retido_hp400: r1(G.st && G.st.r1.p80), retido_barmac: r1(G.st && G.st.r2.p80), britado_hp400: r1(G.st && G.st.hp.p80), britado_barmac: r1(G.st && G.st.vsi.p80), produto: r1(G.p80prod) },
      limites: { carga_circulante_normal_pct: '60–120', vibracao_alerta_mm_s: 7.1, vibracao_critica_mm_s: 11, desgaste_troca_pct: 85, eficiencia_peneira_min_pct: 80, saude_atencao: 75, saude_critica: 50, umidade_alerta_pct: 8.5 },
      pontos: Object.entries(E).map(([t, e]) => ({ tag: t, tipo: e.k === 'pn' ? 'peneira' : e.k === 'cone' ? 'HP 400' : 'Barmac', estado: e.st, ligado: e.on, vazao_t_h: r1(e.flow, 0), carga_pct: r1(e.load * 100, 0), vibracao_mm_s: r1(e.vib), oleo_C: r1(e.oil, 0), desgaste_pct: r1(e.w, 0), saude: e.health, vida_util_h: isFinite(e.rsl) ? r1(e.rsl, 0) : null, eficiencia_pct: e.k === 'pn' ? r1(e.eff, 0) : undefined })),
      alarmes: (K.alarms || []).concat(((sim.sync && sim.extAl) || []).map((a) => ({ tag: 'simulador', st: a.sev, why: a.msg }))) };
  }
  const ASTK = { css: ['APF dos HP 400', 'mm', 12, 30], tcld: ['Velocidade da TCLD', '%', 40, 110], feed: ['Alimentação nova', 't/h', 1000, 6000] };
  function astApply(c) {
    if (ASTK[c.chave]) { const [nm, u, lo, hi] = ASTK[c.chave], v = Math.max(lo, Math.min(hi, +c.valor_sugerido)); sim[c.chave] = v;
      if (c.chave === 'css') send({ css: v }); if (c.chave === 'tcld') send({ tcldSpd: v }); logEv('Assistente', `${nm} → ${fm(v, c.chave === 'feed' ? 0 : 1)} ${u} (aplicado)`); render(true); return true; }
    if (sim.eq[c.chave]) { sim.eq[c.chave].on = !!+c.valor_sugerido; logEv('Assistente', `${c.chave} ${sim.eq[c.chave].on ? 'ligado' : 'desligado'} (aplicado)`); render(true); return true; }
    return false;
  }
  $('#astGo').onclick = async () => {
    const out = $('#astOut'), btn = $('#astGo'); btn.disabled = true; out.innerHTML = '<p class="hint">A Simulação está analisando o processo do setor…</p>';
    try {
      const r = await call('aiAnalyze', [{ modo: 'gemeo3', escopo: 'Área 3 · Peneiramento e britagem', pergunta: '', contexto: ctxAst() }]);
      const sv = (x) => (/alta/i.test(x) ? 'crit' : /m[eé]dia/i.test(x) ? 'warn' : '');
      const recs = r.recomendacoes || [];
      out.innerHTML = `<div class="card"><h6>Diagnóstico</h6><b>${esc(r.resumo || '')}</b></div>
        ${(r.achados || []).length ? '<h6 style="margin:8px 0 4px;color:#ffd24a">Problemas encontrados</h6>' : ''}${(r.achados || []).map((a) => `<div class="card ${sv(a.severidade)}"><b>${esc(a.titulo)}</b>${a.ponto ? ` · ${esc(a.ponto)}` : ''}<small>${esc(a.evidencia || '')}</small></div>`).join('')}
        ${(r.causas || []).length ? '<h6 style="margin:8px 0 4px;color:#ffd24a">Causa raiz</h6>' : ''}${(r.causas || []).map((c) => `<div class="card"><b>${esc(c.problema)}</b><small>${esc(c.causa_raiz)}${c.confianca ? ' · confiança ' + esc(c.confianca) : ''}</small></div>`).join('')}
        ${recs.length ? '<h6 style="margin:8px 0 4px;color:#ffd24a">Ajustes e soluções propostos</h6>' : ''}${recs.map((c, i) => { const ok = (ASTK[c.chave] || sim.eq[c.chave]) && isFinite(c.valor_sugerido);
          const what = ASTK[c.chave] ? `${ASTK[c.chave][0]}: ${fm(sim[c.chave], 1)} → <b>${fm(+c.valor_sugerido, 1)} ${ASTK[c.chave][1]}</b>` : sim.eq[c.chave] ? `${esc(c.chave)}: <b>${+c.valor_sugerido ? 'ligar' : 'desligar'}</b>` : '';
          return `<div class="card"><b>${esc(c.titulo)}</b>${what ? `<br>${what}` : ''}<small>${esc(c.efeito_esperado || '')}${c.risco ? ' · Risco: ' + esc(c.risco) : ''}</small>${ok ? `<button class="btn2" data-ast="${i}" style="margin-top:5px;padding:3px 10px">Aplicar</button>` : ''}</div>`; }).join('')}
        <p class="hint">Gerado pela Simulação a partir dos dados do gêmeo${sim.sync ? ' sincronizado com o simulador' : ''}. Revise antes de aplicar; a decisão final é do operador.</p>`;
      out.querySelectorAll('[data-ast]').forEach((b) => b.onclick = () => { if (astApply(recs[+b.dataset.ast])) { b.textContent = 'Aplicado ✓'; b.disabled = true; } });
      logEv('Assistente', 'Diagnóstico do processo: ' + String(r.resumo || '').slice(0, 80));
    } catch (e) { out.innerHTML = `<p class="hint" style="color:#ff8a7a">Não foi possível analisar: ${esc(e.message)}</p>`; }
    btn.disabled = false;
  };
  async function analyze(reg) {
    const out = $('#inAi'); out.innerHTML = '<p class="hint">A Simulação está analisando o registro de inspeção…</p>';
    try {
      const r = await call('aiAnalyze', [{ modo: 'inspecao', escopo: 'Área 3 · Peneiramento e britagem', pergunta: '', contexto: ctxIA(reg) }]);
      const sv = (x) => (/alta/i.test(x) ? 'crit' : /m[eé]dia/i.test(x) ? 'warn' : '');
      out.innerHTML = `<div class="card"><h6>Análise da Simulação</h6><b>${esc(r.resumo || '')}</b></div>${(r.achados || []).map((a) => `<div class="card ${sv(a.severidade)}"><b>${esc(a.titulo)}</b><small>${esc(a.evidencia || '')}</small></div>`).join('')}${(r.causas || []).map((c) => `<div class="card"><b>Causa provável:</b> ${esc(c.titulo || c.causa || c)}<small>${esc(c.explicacao || c.evidencia || '')}</small></div>`).join('')}${(r.recomendacoes || []).filter((c) => c && c.titulo).map((c) => `<div class="card"><b><span style="color:#ffd24a">Recomendação:</span> ${esc(c.titulo)}</b><small>${esc(c.efeito_esperado || '')}</small></div>`).join('')}<p class="hint">Gerado pela Simulação. A decisão final é do operador.</p>`;
      if (reg.linha) { const txt = [r.resumo].concat((r.recomendacoes || []).map((x) => '• ' + x.titulo)).join('\n'); call('inspSalvarAnalise', [{ linha: reg.linha, texto: txt }]).then(loadList).catch(() => {}); }
      logEv('Simulação', 'Análise de inspeção: ' + String(r.resumo || '').slice(0, 80));
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
