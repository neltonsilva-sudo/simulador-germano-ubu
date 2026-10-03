// Chamadas à API do Apps Script (mesma do simulador), com a chave da sessão que abriu o gêmeo, limite de tempo e novas tentativas.
export const API = 'https://script.google.com/macros/s/AKfycbzI3n1FQsK7H1_Guhcwz7dK21wDqK-4aeBLHF4ryNnhWE0eHH0Y7x_W97tP9Gee62Q/exec';
export const SIM_URL = 'https://neltonsilva-sudo.github.io/simulador-germano-ubu/';
let TOKEN = '';
export const setToken = (t) => { TOKEN = t || ''; };
export const getToken = () => TOKEN;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function call(fn, args = [], tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 25000);
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args, auth: TOKEN }), redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(tm));
      const txt = await r.text(); let j;
      try { j = JSON.parse(txt); } catch (e) { throw new Error('o servidor respondeu com uma página em vez de dados'); }
      if (!j.ok) { const er = new Error(j.e); er.server = true; throw er; }
      return j.r;
    } catch (e) { last = e.name === 'AbortError' ? new Error('o servidor demorou a responder') : e; if (last.server) break; await wait(800 * (i + 1)); }
  }
  throw last;
}
