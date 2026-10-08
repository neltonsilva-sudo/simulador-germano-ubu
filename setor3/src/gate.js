import { call, setToken } from './api.js?v=20261008155125';
// Acesso: o gêmeo abre só pelo simulador, que passa a chave da sessão (?t=). A chave é conferida no servidor
// (Apps Script) e retirada do endereço. Sem proteção configurada no servidor, abre direto.
let TOKEN_RETRY = '';
export async function gate() {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) { setToken(''); return true; }
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:#0b1622;color:#dce6ee;font:15px/1.5 system-ui,sans-serif';
  const msg = (t) => { ov.innerHTML = `<div style="max-width:420px;width:90vw;background:#13233a;border:1px solid #2c4d75;border-left:4px solid #ffd24a;border-radius:10px;padding:20px">${t}</div>`; };
  msg('<p style="margin:0">Verificando acesso…</p>'); document.body.appendChild(ov);
  const P = new URLSearchParams(location.search), t = P.get('t') || TOKEN_RETRY || '';
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* sem histórico */ }
  try {
    const c = await call('acessoChecar', [t]);
    if (c.ok) { setToken(t); ov.remove(); return true; }
  } catch (e) {
    msg(`<p style="color:#ff8a7a;margin-top:0">Não foi possível verificar o acesso (${String(e.message || e)}).</p><p style="font-size:13px;color:#9fb0bd">Pode ser uma falha momentânea do servidor do Google. Se continuar, abra de novo pelo número 3 do simulador.</p><button id="gRetry" style="width:100%;padding:10px;border:0;border-radius:8px;background:#5cc6dc;color:#08202a;font-weight:700;cursor:pointer">Tentar de novo</button>`);
    ov.querySelector('#gRetry').onclick = () => { ov.remove(); TOKEN_RETRY = t; gate(); };
    return false;
  }
  msg('<h2 style="color:#ffd24a;margin:0 0 8px;font-size:19px">Acesso restrito</h2><p>O gêmeo digital do setor 3 abre pelo simulador, na área 3 (Peneiramento e britagem), depois de entrar com a senha ou com autorização pelo QR Code.</p>');
  return false;
}
