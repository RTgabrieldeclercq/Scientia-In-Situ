/* ==========================================================================
   08 · UI primitives — modal, popovers, chips, structure colours
   ========================================================================== */
function modal({ title, body, actions = [{ label: 'Close' }], wide, onClose }) {
  const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); onClose && onClose(); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const ov = h('div.ovl', { on: { mousedown: e => { if (e.target === ov) close(); } } },
    h('div.modal' + (wide ? '.wide' : ''),
      h('div.mh', h('h3', title), h('span.spacer'), h('button.btn.ghost.sm.icon', { on: { click: close }, title: 'Close' }, '✕')),
      h('div.mb', body),
      actions.length ? h('div.mf', actions.map(a => h('button.btn' + (a.pri ? '.pri' : '') + (a.mag ? '.mag' : '') + (a.danger ? '.danger' : ''), { on: { click: async () => { const r = a.run ? await a.run() : undefined; if (r !== false && !a.keep) close(); } } }, a.label))) : null));
  document.body.append(ov); document.addEventListener('keydown', key, true);
  setTimeout(() => { const f = ov.querySelector('[autofocus],input,textarea,select'); f && f.focus(); }, 20);
  return { close, el: ov };
}
function pickModal(title, desc, options) {
  const m = modal({ title, body: h('div', h('p.serif', { style: { marginTop: 0 } }, desc), h('div.list', options.map(o => h('div.li.click' + (o.danger ? '.danger' : ''), { on: { click: () => { m.close(); o.run(); } } }, h('span.t', o.label), h('span.muted', '→'))))), actions: [{ label: 'Cancel' }] });
  return m;
}
function askText(title, label, initial = '', { multiline, placeholder } = {}) {
  return new Promise(res => {
    const inp = multiline ? h('textarea.inp', { rows: 4, placeholder: placeholder || '' }) : h('input.inp', { placeholder: placeholder || '', style: { width: '100%' } });
    inp.value = initial; let done = false;
    const ok = () => { done = true; res(inp.value.trim()); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) { ok(); m.close(); } });
    const m = modal({ title, body: h('label.f', h('span', label), inp), actions: [{ label: 'Cancel' }, { label: 'OK', pri: true, run: ok }], onClose: () => { if (!done) res(null); } });
  });
}

let _pop = null;
function closePop() { if (_pop) { _pop.remove(); _pop = null; } }
function popover(x, y, content, { cls = 'pop', onClose } = {}) {
  closePop();
  const el = h('div.' + cls, content); el.addEventListener('mousedown', e => e.stopPropagation()); el.style.left = '0px'; el.style.top = '0px'; document.body.append(el);
  const r = el.getBoundingClientRect();
  el.style.left = clamp(x, 8, innerWidth - r.width - 8) + 'px';
  el.style.top = (y + r.height > innerHeight - 8 ? Math.max(8, y - r.height - 28) : y) + 'px';
  _pop = el; el._onClose = onClose;
  setTimeout(() => { const f = el.querySelector('input'); f && f.focus(); }, 10);
  return el;
}
document.addEventListener('mousedown', e => { if (_pop && !_pop.contains(e.target) && !e.target.closest('[data-keep-pop]')) { const f = _pop._onClose; closePop(); f && f(); } });

/** A searchable option list inside a popover/modal, keyboard-first. */
/* ---------------- pickers: every list that pulls notes, components or structures can be searched and sorted ---------------- */
const SORTS = [['rel', 'Best match'], ['new', 'Newest'], ['old', 'Oldest'], ['az', 'A–Z'], ['note', 'By note']];
const _pickBase = o => (o && typeof o === 'object' && o.t && o.x) ? o.x : o;
const pickDate = o => { const x = _pickBase(o) || {}; return x.modified || x.created || x.at || x.addedAt || x.completedAt || ''; };
const pickName = o => { const x = _pickBase(o) || {}; if (x.kind && x.docId && x.body) return M.blockName(x) + ' ' + (x.body.text || ''); return String(x.title || x.label || x.text || x.name || x.term || (o && o.title) || ''); };
const pickNote = o => { const x = _pickBase(o) || {}; if (x.docTitle) return x.docTitle; const d = M.doc(x.docId || x.originDocId) || (x.blockIds ? x : null); return d ? d.title : '~'; };
function sortRows(arr, mode) {
  if (mode === 'rel') return arr;
  const pinned = arr.filter(o => o && o.t === 'new'), rest = arr.filter(o => !(o && o.t === 'new'));
  const by = { new: (a, b) => pickDate(b).localeCompare(pickDate(a)), old: (a, b) => (pickDate(a) || '~').localeCompare(pickDate(b) || '~'),
    az: (a, b) => pickName(a).localeCompare(pickName(b), undefined, { sensitivity: 'base' }), note: (a, b) => pickNote(a).localeCompare(pickNote(b)) || pickDate(b).localeCompare(pickDate(a)) }[mode];
  return rest.slice().sort(by).concat(pinned);
}
/** A search box + sort over a list. `section(x)` groups rows under headings (in order of first appearance); `limit` caps what is drawn. */
function optionPicker({ placeholder, items, render, onPick, emptyText = 'Nothing matches', section, sort, limit = 80 }) {
  const key = 'sort:' + (sort || placeholder || ''), inp = h('input.inp.pk-q', { placeholder, type: 'search' });
  let mode = _ls.get(key, 'rel');
  const sel_ = h('select.inp.pk-sort', { title: 'Sort', on: { change: () => { mode = sel_.value; _ls.set(key, mode); draw(); } } }, SORTS.map(([k, l]) => h('option', { value: k, selected: k === mode }, l)));
  const list = h('div.opts'), count = h('span.pk-n'); let sel = 0, cur = [];
  const draw = () => {
    const q = inp.value.toLowerCase().trim(), all = items(q) || [];
    let groups = [];
    if (section) { const m = new Map(); all.forEach(x => { const s = section(x) || ''; if (!m.has(s)) m.set(s, []); m.get(s).push(x); }); groups = [...m].map(([t, xs]) => [t, sortRows(xs, mode)]); }
    else groups = [['', sortRows(all, mode)]];
    let left = limit; cur = []; const out = [];
    for (const [t, xs] of groups) {
      const shown = xs.slice(0, Math.max(0, left)); left -= shown.length;
      if (t) out.push(h('div.opt-h', t, h('span', xs.length)));
      shown.forEach(x => { const i = cur.length; cur.push(x); out.push(h('div.opt' + (i === sel ? '.on' : ''), { on: { mousedown: e => { e.preventDefault(); onPick(x, e); } } }, render(x))); });
      if (xs.length > shown.length) out.push(h('div.opt-more', `+ ${xs.length - shown.length} more — refine the search`));
    }
    sel = clamp(sel, 0, Math.max(0, cur.length - 1));
    count.textContent = all.length ? plural(all.length, 'match', 'matches') : '';
    list.replaceChildren(...(cur.length ? out : [h('div.empty', emptyText)]));
    const on = $('.opt.on', list); on && on.scrollIntoView({ block: 'nearest' });
  };
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel++; draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel--; draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); cur[sel] && onPick(cur[sel], e); } else if (e.key === 'Escape') { closePop(); }
  });
  draw(); setTimeout(() => inp.isConnected && inp.focus(), 30);
  return h('div.picker', h('div.pk-bar', inp, sel_), count, list);
}
/** The same search + sort for lists that are already built (hover lists, backlinks): rows are {el, text, date, note}. */
function filterBar(rows, host, { placeholder = 'Search…', min = 4 } = {}) {
  if (rows.length < min) { host.replaceChildren(...rows.map(r => r.el)); return null; }
  let mode = 'rel'; const q = h('input.inp.pk-q', { placeholder, type: 'search' });
  const s = h('select.inp.pk-sort', SORTS.filter(x => x[0] !== 'rel').map(([k, l]) => h('option', { value: k }, l)));
  s.value = mode = 'new';
  const draw = () => { const k = q.value.toLowerCase().trim(); let r = rows.filter(x => !k || (x.text + ' ' + (x.note || '')).toLowerCase().includes(k));
    const by = { new: (a, b) => (b.date || '').localeCompare(a.date || ''), old: (a, b) => (a.date || '~').localeCompare(b.date || '~'), az: (a, b) => a.text.localeCompare(b.text), note: (a, b) => (a.note || '').localeCompare(b.note || '') }[mode];
    r = r.slice().sort(by); host.replaceChildren(...(r.length ? r.map(x => x.el) : [h('div.empty', 'Nothing matches')])); };
  q.addEventListener('input', draw); q.addEventListener('keydown', e => e.stopPropagation()); s.addEventListener('change', () => { mode = s.value; draw(); });
  draw(); return h('div.pk-bar.mini', q, s);
}

/** A searchable, sortable pop-up list of notes / components (rows: {label, sub, date, note, run(ev), lead?}). */
function metaPop(x, y, title, rows) {
  const objs = rows.map(r => ({ x: { title: r.label + ' ' + (r.sub || ''), created: r.date || '', docTitle: r.note }, r }));
  popover(x, y, [h('h5', title), optionPicker({ placeholder: 'Search…', sort: 'meta:' + title, items: q => objs.filter(o => !q || o.x.title.toLowerCase().includes(q)),
    render: o => h('div', o.r.lead || null, o.r.lead ? ' ' : null, h('b', o.r.label), h('span.s', o.r.sub || '')), onPick: (o, e) => { closePop(); o.r.run(e); } }),
    h('div.tiny.muted', { style: { margin: '6px 6px 0' } }, 'Alt+click opens beside this note')]);
}
const kchip = (kind, txt) => { const k = KIND[kind]; return h('span.kchip', { style: { '--kc': `var(--k-${kind})` } }, txt || (k ? k.label : kind)); };
const typechip = t => h('span.typechip', prof(t).label);

function applyKindCSS() {
  const s = settings(), lines = [':root{'], dark = [];
  for (const k of [...KINDS, ...RETIRED_KINDS]) { const c = (s.kinds[k.id] || k).color; lines.push(`--k-${k.id}:${c};`); dark.push(`--k-${k.id}:color-mix(in srgb,${c} 58%,#fff);`); }
  lines.push('}');
  const dk = dark.join('');
  lines.push(`@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dk}}}`, `:root[data-theme="dark"]{${dk}}`);
  for (const k of [...KINDS, ...RETIRED_KINDS]) {
    const mode = (s.kinds[k.id] || k).mode, v = `var(--k-${k.id})`;
    lines.push(mode === 'highlight'
      ? `.st-${k.id}{background:color-mix(in srgb,${v} 20%,transparent);border-radius:2px;box-shadow:0 0 0 1px color-mix(in srgb,${v} 12%,transparent)}`
      : `.st-${k.id}{color:${v}}`);
    lines.push(`.st-${k.id} .tm{-webkit-text-stroke-color:${mode === 'highlight' ? 'var(--ink)' : v}}`);
  }
  lines.push('.st.closed{opacity:.7;text-decoration:line-through;text-decoration-color:var(--ink-3)}');
  $('#kind-css').textContent = lines.join('\n');
}
function applyTheme() { const t = settings().theme; if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }

/** Context menu: rows are {label, sub, key, run, danger} | 'sep' | {head}. */
function ctxMenu(x, y, rows) {
  const el = popover(x, y, rows.filter(Boolean).map(r => r === 'sep' ? h('div.sep') : r.head ? h('h5', r.head)
    : h('div.op' + (r.danger ? '.danger' : '') + (r.disabled ? '.dis' : ''), { on: { click: ev => { if (r.disabled) return; closePop(); r.run(ev); } } }, h('div.opl', h('span', r.label, r.sub ? h('span.s', r.sub) : null), r.key ? h('kbd', r.key) : null))), { cls: 'pop.menu' });
  return el;
}
/** A one-line hover card that follows an element (structures, terms, links, citations). */
let _hc = null, _hcT = null;
function hoverCard(anchor, build) {
  clearTimeout(_hcT); _hcT = setTimeout(() => { hideHover(); const c = build(); if (!c) return; _hc = h('div.hovercard', c); document.body.append(_hc);
    const b = anchor.getBoundingClientRect(), r = _hc.getBoundingClientRect(); _hc.style.left = clamp(b.left, 8, innerWidth - r.width - 8) + 'px'; _hc.style.top = (b.bottom + r.height + 10 > innerHeight ? b.top - r.height - 8 : b.bottom + 8) + 'px';
    anchor.addEventListener('mouseleave', () => { clearTimeout(_hcT); setTimeout(() => { if (_hc && !_hc.matches(':hover')) hideHover(); }, 120); }, { once: true });
    _hc.addEventListener('mouseleave', hideHover); }, 260);
}
function hideHover() { clearTimeout(_hcT); if (_hc) { _hc.remove(); _hc = null; } $$('.hovercard').forEach(x => x.remove()); }
