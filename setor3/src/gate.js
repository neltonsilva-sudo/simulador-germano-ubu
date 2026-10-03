// Acesso: o gêmeo abre só pelo simulador, que passa a chave da sessão (?t=). A chave é conferida no servidor
// (Apps Script) e retirada do endereço. Sem proteção configurada no servidor, abre direto.
const API = 'https://script.google.com/macros/s/AKfycbzI3n1FQsK7H1_Guhcwz7dK21wDqK-4aeBLHF4ryNnhWE0eHH0Y7x_W97tP9Gee62Q/exec';
const call = (fn, args) => fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args }), redirect: 'follow' }).then((r) => r.json()).then((j) => { if (!j.ok) throw new Error(j.e); return j.r; });

export async function gate() {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return true;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:#0b1622;color:#dce6ee;font:15px/1.5 system-ui,sans-serif';
  const msg = (t) => { ov.innerHTML = `<div style="max-width:420px;width:90vw;background:#13233a;border:1px solid #2c4d75;border-left:4px solid #ffd24a;border-radius:10px;padding:20px">${t}</div>`; };
  msg('<p style="margin:0">Verificando acesso…</p>'); document.body.appendChild(ov);
  const P = new URLSearchParams(location.search), t = P.get('t') || '';
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* sem histórico */ }
  try {
    const c = await call('acessoConfig', []);
    let ok = !c.protegido;
    if (!ok && t) ok = (await call('acessoAdminValido', [t])) || !!((await call('acessoValido', [t])) || {}).ok;
    if (ok) { ov.remove(); return true; }
  } catch (e) { msg(`<p style="color:#ff8a7a">Não foi possível verificar o acesso (${String(e.message || e)}).</p>`); return false; }
  msg('<h2 style="color:#ffd24a;margin:0 0 8px;font-size:19px">Acesso restrito</h2><p>O gêmeo digital do setor 3 abre pelo simulador, na área 3 (Peneiramento e britagem), depois de entrar com a senha ou com autorização pelo QR Code.</p>');
  return false;
}
