/* ==========================================================================
   01 · Utilities — DOM builder, ids, dates, formatting
   ========================================================================== */
'use strict';
const BUILD = '2026-11-09 · standalone · the Atlas in 3D: nests, with terms and papers orbiting the nest they belong to', DEMO_V = 2;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** h('div.cls#id', {attrs, on:{click}}, ...children) */
function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => { t === '.' ? el.classList.add(n) : (el.id = n); });
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sv == null) continue; if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className += ' ' + v;
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = k => { if (k == null || k === false) return; if (Array.isArray(k)) return k.forEach(add); el.append(k instanceof Node ? k : document.createTextNode(String(k))); };
  kids.forEach(add);
  // a textarea's text is its value, not an attribute
  if (el.tagName === 'TEXTAREA' && attrs.value != null && attrs.value !== false && !kids.length) el.value = String(attrs.value);
  return el;
}

let _uidc = 0;
const uid = (p = 'x') => p + '_' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6) + (_uidc++).toString(36);

/* ---------- dates (always LOCAL days; ISO with offset) ---------- */
const pad = n => String(n).padStart(2, '0');
const localDate = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function isoLocal(d) {
  d = new Date(d); const o = -d.getTimezoneOffset(), s = o >= 0 ? '+' : '-';
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${s}${pad(Math.floor(Math.abs(o) / 60))}:${pad(Math.abs(o) % 60)}`;
}
const toInputDT = d => { d = new Date(d); return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dayStart = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
const parseDay = s => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = d => { d = new Date(d); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtDayLong = d => { d = new Date(d); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = d => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** The full date on every component: 16 Oct 2026 14:32 */
const fmtStamp = d => { d = new Date(d); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtWhen = d => { d = new Date(d); const t = dayStart(new Date()), x = dayStart(d), dd = Math.round((t - x) / 864e5);
  return dd === 0 ? 'today ' + fmtTime(d) : dd === 1 ? 'yesterday ' + fmtTime(d) : dd < 7 ? DOW[d.getDay()] + ' ' + fmtTime(d) : fmtDay(d); };
function fmtDur(ms, sec) {
  let s = Math.max(0, Math.round(ms / 1000)); const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
  if (sec) return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss);
  return hh ? `${hh}h ${pad(mm)}m` : `${mm}m`;
}
/** "150", "2h30", "2:30", "1.5h", "45m" → seconds */
function parseDuration(s) {
  s = String(s || '').trim().toLowerCase(); if (!s) return null;
  let m;
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return (+m[1]) * 3600 + (+m[2]) * 60;
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/))) return Math.round(parseFloat(m[1]) * 3600) + (m[2] ? +m[2] * 60 : 0);
  if ((m = s.match(/^(\d+)\s*m(in)?$/))) return +m[1] * 60;
  if ((m = s.match(/^\d+$/))) return +s * 60;
  return null;
}
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
const sum = a => a.reduce((s, x) => s + x, 0);
const snippet = (t, n = 90) => { t = String(t || '').replace(/￼/g, '‹cite›').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
function hashHue(seed) { let x = 2166136261; for (const ch of String(seed || 'x')) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return Math.abs(x) % 360; }
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

function toast(msg, ms = 2400) {
  const t = h('div.toast', msg); $('#toasts').append(t); setTimeout(() => t.remove(), ms);
}
const SVGNS = 'http://www.w3.org/2000/svg';
const SV = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); kids.forEach(k => k != null && e.append(k)); return e; };
/* replaceChildren/append/prepend take nested arrays and skip null/false, like h() does. */
for (const P of [Element.prototype, DocumentFragment.prototype]) for (const m of ['replaceChildren', 'append', 'prepend']) { const f = P[m]; P[m] = function (...k) { return f.apply(this, k.flat(Infinity).filter(x => x != null && x !== false)); }; }
