/* ==========================================================================
   17c · Reading papers with the pen, and searching them.
   • Pen in the reader = highlighter. It takes whole words: from the first
     word the pen touched to the last, everything in between. Lifting the
     pen saves the highlight in the last colour used; a small bar offers
     colours, Make it…, Note and Undo (it fades if left alone). The back of
     the pen erases highlights it passes over. Mouse and finger select text
     as before.
   • Search (Ctrl+F, or the box at the top of the side panel): highlights
     first, then your notes and the structures taken from the paper, then
     the paper's text — each with its page and the match in bold. Click to
     go there (the match flashes); Enter / Shift+Enter step through. A term
     finds its other forms too. "All papers" searches every PDF in the
     library, grouped by paper.
   Paper highlights are components, so terms (and their forms) mark them.
   ========================================================================== */
const RD2 = {
  color: () => _ls.get('rdColor', 'yellow'),
  /* ---------- words on a rendered page ---------- */
  words(el) {
    if (el._words && el._words.tl === el._tl) return el._words; const out = []; out.tl = el._tl; if (!el._tl) return out;
    const pr = el.getBoundingClientRect();
    $$('span', el._tl).forEach(sp => { const n = sp.firstChild; if (!n || n.nodeType !== 3) return; const t = n.nodeValue; const re = /\S+/g; let m;
      while ((m = re.exec(t))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const R = r.getBoundingClientRect(); if (!R.width) continue;
        out.push({ node: n, a: m.index, z: m.index + m[0].length, t: m[0], x: R.left - pr.left, y: R.top - pr.top, w: R.width, h: R.height }); } });
    el._words = out; return out;
  },
  hit(el, cx, cy) {
    const W = RD2.words(el), pr = el.getBoundingClientRect(), x = cx - pr.left, y = cy - pr.top; let best = -1, bd = 1e9;
    W.forEach((w, i) => { const dx = Math.max(w.x - x, 0, x - w.x - w.w), dy = Math.max(w.y - y, 0, y - w.y - w.h); if (dy > 6) return; const d = dx + dy * 3; if (d < bd) { bd = d; best = i; } });
    return bd <= 26 ? best : -1;
  },
  /** One rectangle per line for words i..j (fractions of the page, like the stored anchors). */
  rects(el, i, j) {
    const W = RD2.words(el).slice(i, j + 1), pr = el.getBoundingClientRect(), lines = [];
    W.forEach(w => { const L = lines.find(l => Math.abs(l.y + l.h / 2 - (w.y + w.h / 2)) < Math.max(3, Math.min(l.h, w.h) * .45)); if (L) { const x1 = Math.max(L.x + L.w, w.x + w.w); L.x = Math.min(L.x, w.x); L.w = x1 - L.x; const y1 = Math.max(L.y + L.h, w.y + w.h); L.y = Math.min(L.y, w.y); L.h = y1 - L.y; } else lines.push({ x: w.x, y: w.y, w: w.w, h: w.h }); });
    return lines.map(l => [l.x / pr.width, l.y / pr.height, l.w / pr.width, l.h / pr.height]);
  },
  /* ---------- the pen ---------- */
  isEraser: e => e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) === 32),
  down(view, e) {
    const el = e.target.closest && e.target.closest('.rd-page'); if (!el || !el._tl) return;
    e.preventDefault(); // no text selection, no scrolling: the pen draws
    if (RD2.isEraser(e)) return RD2.erase(view, el, e);
    const live = SV('svg', { class: 'rd-live' }); el.append(live); const pr = el.getBoundingClientRect(), pts = [[e.clientX - pr.left, e.clientY - pr.top]];
    let first = RD2.hit(el, e.clientX, e.clientY), last = first, moved = false; const prev = h('div.rd-prev'); el.append(prev);
    const paint = () => { live.innerHTML = `<path d="M${pts.map(p => p.join(',')).join('L')}"/>`; prev.replaceChildren(); if (first < 0 || last < 0) return;
      RD2.rects(el, Math.min(first, last), Math.max(first, last)).forEach(r => prev.append(h('div.rd-hl.pv', { style: { left: r[0] * 100 + '%', top: r[1] * 100 + '%', width: r[2] * 100 + '%', height: r[3] * 100 + '%', '--hc': READER.COLORS[RD2.color()] } }))); };
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault();
      ((ev.getCoalescedEvents && ev.getCoalescedEvents().length) ? ev.getCoalescedEvents() : [ev]).forEach(q => { pts.push([q.clientX - pr.left, q.clientY - pr.top]); const k = RD2.hit(el, q.clientX, q.clientY); if (k >= 0) { if (first < 0) first = k; last = k; } });
      if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 5) moved = true; paint(); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); live.remove();
      if (!moved || ev.type === 'pointercancel' || first < 0 || last < 0) { prev.remove(); if (!moved) { const hl = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList && x.classList.contains('rd-hl') && x.dataset.id); if (hl) { const b = M.block(hl.dataset.id); b && view.markMenu(b, ev); } } return; }
      RD2.save(view, el, Math.min(first, last), Math.max(first, last), ev, prev); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  },
  /** The pen's stroke → the same choices as a mouse selection (colour, or make it a structure); the pen's mark stays until you pick or close. */
  save(view, el, i, j, ev, prev) {
    const W = RD2.words(el), exact = W.slice(i, j + 1).map(w => w.t).join(' ').replace(/\s+/g, ' ').trim(); if (exact.length < 2) { prev && prev.remove(); return; }
    const full = (el._text || '').replace(/\s+/g, ' '), at = full.indexOf(exact);
    view.pending = { page: el._n, exact, prefix: at > 0 ? full.slice(Math.max(0, at - 32), at) : '', suffix: at >= 0 ? full.slice(at + exact.length, at + exact.length + 32) : '', rects: RD2.rects(el, i, j) };
    view.selPop(ev.clientX, ev.clientY + 12); RD2.keepPrev(prev);
  },
  /** keep the pen's preview mark while the choice popover is open */
  keepPrev(prev) { if (!prev) return; const pop = _pop; if (!pop) return prev.remove(); const t = setInterval(() => { if (!document.body.contains(pop)) { clearInterval(t); setTimeout(() => prev.remove(), 120); } }, 150); },
  bar(view, b, x, y) {
    $$('.rd-penbar').forEach(n => n.remove());
    const bar = h('div.rd-penbar', { style: { left: Math.min(innerWidth - 330, x + 10) + 'px', top: Math.min(innerHeight - 60, y + 14) + 'px' } },
      Object.entries(READER.COLORS).map(([k, c]) => h('button.swatch' + (k === (b.anchor.color || 'yellow') ? '.on' : ''), { title: 'Colour: ' + k, style: { '--c': c }, on: { click: () => { const cur = M.block(b.id); cur.anchor = Object.assign({}, cur.anchor, { color: k }); DB.put('blocks', cur); _ls.set('rdColor', k); changed(); bar.remove(); } } })),
      h('button.btn.xs', { on: { click: ev => { bar.remove(); view.markMenu(M.block(b.id), ev); } } }, 'Make it…'),
      h('button.btn.xs', { on: { click: () => { bar.remove(); askText('Note on p. ' + b.anchor.page, '“' + snippet(b.body.text, 70) + '”', '', { multiline: true }).then(t => { if (READER.addNote(M.block(b.id), t)) toast('Note added'); }); } } }, 'Note'),
      h('button.btn.xs.ghost', { title: 'Remove this highlight', on: { click: () => { bar.remove(); const cur = M.block(b.id); cur.status = 'removed'; DB.put('blocks', cur); changed(); toast('Highlight removed'); } } }, 'Undo'));
    document.body.append(bar); let t = setTimeout(() => bar.classList.add('fade'), 5000), t2 = setTimeout(() => bar.remove(), 6500);
    bar.addEventListener('pointerenter', () => { clearTimeout(t); clearTimeout(t2); bar.classList.remove('fade'); }); bar.addEventListener('pointerleave', () => { t = setTimeout(() => bar.classList.add('fade'), 2500); t2 = setTimeout(() => bar.remove(), 4000); });
  },
  erase(view, el, e) {
    const gone = new Set(), mark = h('div.rd-eraser'); document.body.append(mark);
    const at = ev => { mark.style.left = ev.clientX + 'px'; mark.style.top = ev.clientY + 'px'; const r = 10 + 20 * (ev.pressure || .5);
      for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) document.elementsFromPoint(ev.clientX + dx, ev.clientY + dy).forEach(x => { if (x.classList && x.classList.contains('rd-hl') && x.dataset.id && !gone.has(x.dataset.id)) { gone.add(x.dataset.id); $$(`.rd-hl[data-id="${x.dataset.id}"]`).forEach(n => n.classList.add('erasing')); } }); };
    at(e);
    const mv = ev => { if (ev.pointerId === e.pointerId) { ev.preventDefault(); at(ev); } };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); mark.remove();
      if (!gone.size) return; DB.beginGroup(); gone.forEach(id => { const b = M.block(id); if (b) { b.status = 'removed'; DB.put('blocks', b); } }); changed(); toast(plural(gone.size, 'highlight') + ' erased · Ctrl+Z brings back'); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  },

  /* ---------- search ---------- */
  esc: s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  /** The patterns for a query: the words as typed (any case), and if it names a term, the term and its forms. */
  patterns(q) {
    q = q.replace(/\s+/g, ' ').trim(); if (q.length < 2) return [];
    const P = [new RegExp(q.split(' ').map(RD2.esc).join('\\s*'), 'giu')], ql = q.toLowerCase();
    const terms = DB.all('terms').filter(t => (t.label || '').toLowerCase() === ql || (t.forms || []).some(f => f.toLowerCase() === ql) || ((t.label || '').toLowerCase().includes(ql) && ql.length >= 4));
    terms.forEach(t => { const r = TERMSCAN.rx(t); r && P.push(new RegExp(r.source, r.flags)); (t.forms || []).forEach(f => { const x = TFORMS.rx(f); x && P.push(new RegExp(x.source, x.flags)); }); });
    RD2._terms = terms; return P;
  },
  find(text, P) { const out = []; for (const rx of P) { rx.lastIndex = 0; let m; while ((m = rx.exec(text))) { if (!m[0].length) { rx.lastIndex++; continue; } out.push([m.index, m.index + m[0].length]); } }
    out.sort((a, b) => a[0] - b[0] || b[1] - a[1]); const merged = []; out.forEach(r => { const L = merged[merged.length - 1]; if (L && r[0] < L[1]) L[1] = Math.max(L[1], r[1]); else merged.push(r.slice()); }); return merged; },
  snip(text, a, z, pad = 50) { const s = Math.max(0, a - pad), e = Math.min(text.length, z + pad); return h('span.rs-snip', s > 0 ? '…' : '', text.slice(s, a), h('b', text.slice(a, z)), text.slice(z, e), e < text.length ? '…' : ''); },
  snipAll(text, P) { const R = RD2.find(text, P); if (!R.length) return null; return RD2.snip(text, R[0][0], R[0][1], 70); },
  _texts: new Map(),
  async texts(libId, pdf) {
    if (RD2._texts.has(libId)) return RD2._texts.get(libId);
    const lib = M.lib(libId), rec = lib && lib.pdf && MEDIA.get(lib.pdf); if (!pdf) { if (!rec) return []; READER.init(); pdf = await pdfjsLib.getDocument({ url: MEDIA.url(rec), isEvalSupported: false }).promise; }
    const out = []; for (let n = 1; n <= pdf.numPages; n++) { const tc = await (await pdf.getPage(n)).getTextContent(); out.push(tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ')); }
    RD2._texts.set(libId, out); return out;
  },
  /** Results for one paper: [{kind: 'hl'|'note'|'text', page, el, go}] */
  async searchPaper(view, libId, P) {
    const R = [], lib = M.lib(libId); if (!lib) return R;
    READER.annotations(libId).forEach(b => { const s = RD2.snipAll(b.body.text, P); const ns = READER.notesOf(b).map(n => [n, RD2.snipAll(n.body.text, P)]).filter(x => x[1]);
      if (s) R.push({ kind: 'hl', page: b.anchor.page, b, el: s });
      ns.forEach(([n, sn]) => R.push({ kind: 'note', page: b.anchor.page, b, n, el: sn })); });
    DB.where('items', it => it.sourceRef && it.sourceRef.type === 'library' && it.sourceRef.id === libId).forEach(it => { if (R.some(r => r.b && IX.itemsOf(r.b.id)[0] === it)) return; const s = RD2.snipAll(it.text || '', P); if (s) R.push({ kind: 'note', page: it.sourceRef.page || 1, it, el: s }); });
    const T = await RD2.texts(libId, view && view.libId === libId ? view.pdf : null);
    T.forEach((t, i) => RD2.find(t, P).slice(0, 40).forEach(([a, z]) => R.push({ kind: 'text', page: i + 1, el: RD2.snip(t, a, z), q: t.slice(a, z) })));
    return R;
  },
  /** Flash a match on a rendered page. */
  flash(el, P, nth = 0) {
    if (!el || !el._tl) return false; const spans = $$('span', el._tl).filter(s => s.firstChild && s.firstChild.nodeType === 3); let txt = ''; const map = [];
    spans.forEach(s => { if (txt && !/\s$/.test(txt)) txt += ' '; map.push([txt.length, s]); txt += s.firstChild.nodeValue; });
    const R = RD2.find(txt, P); const m = R[Math.min(nth, R.length - 1)]; if (!m) return false; const pr = el.getBoundingClientRect(), out = [];
    map.forEach(([s0, sp], k) => { const t = sp.firstChild.nodeValue, s1 = s0 + t.length; if (s1 <= m[0] || s0 >= m[1]) return; const r = document.createRange(); r.setStart(sp.firstChild, Math.max(0, m[0] - s0)); r.setEnd(sp.firstChild, Math.min(t.length, m[1] - s0)); [...r.getClientRects()].forEach(q => out.push(q)); });
    out.forEach(q => { const f = h('div.rd-flash', { style: { left: (q.left - pr.left) + 'px', top: (q.top - pr.top) + 'px', width: q.width + 'px', height: q.height + 'px' } }); el.append(f); setTimeout(() => f.remove(), 2200); });
    if (out[0]) { const sc = el.closest('.rd-pages'); if (sc) { const top = out[0].top - sc.getBoundingClientRect().top + sc.scrollTop - sc.clientHeight / 3; sc.scrollTo({ top, behavior: 'smooth' }); } }
    return !!out.length;
  },
};

{
  /* the pen, on the pages */
  const rr = ReaderView.render; ReaderView.render = function (libId, page) { const host = rr.call(this, libId, page); const view = this;
    if (this.pagesEl && !this.pagesEl._pen) { this.pagesEl._pen = true;
      this.pagesEl.addEventListener('pointerdown', e => { if (e.pointerType === 'pen') RD2.down(view, e); }, true);
      // Windows: a pen swipe would scroll the page or trigger the browser's swipe-back / pull-to-refresh. While the pen
      // hovers over the paper, the page stops taking touch gestures (the pen draws); when it leaves, fingers scroll again.
      const pg = this.pagesEl, penOn = () => { pg.style.touchAction = 'none'; pg.classList.add('pen-near'); }, penOff = () => { pg.style.touchAction = ''; pg.classList.remove('pen-near'); };
      pg.addEventListener('pointerover', e => { if (e.pointerType === 'pen') penOn(); }, true);
      pg.addEventListener('pointermove', e => { if (e.pointerType === 'pen' && pg.style.touchAction !== 'none') penOn(); }, true);
      pg.addEventListener('pointerleave', e => { if (e.pointerType === 'pen') penOff(); });
      pg.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && pg.style.touchAction === 'none') penOff(); }, true);
      // iPad: the pencil doesn't scroll the paper (fingers still do)
      this.pagesEl.addEventListener('touchstart', e => { if ([...e.touches].some(t => t.touchType === 'stylus')) e.preventDefault(); }, { passive: false });
      this.pagesEl.addEventListener('touchmove', e => { if ([...e.touches].some(t => t.touchType === 'stylus')) e.preventDefault(); }, { passive: false }); }
    return host; };
  // remember the colour picked from the selection popover
  const sv = ReaderView.save; ReaderView.save = function (kind, color = 'yellow') { if (!kind && color) _ls.set('rdColor', color); const r = sv.call(this, kind, color);
    const last = READER.annotations(this.libId).sort((a, b) => b.created.localeCompare(a.created))[0]; if (last) { TERMSCAN.block(M.block(last.id)); IX.rebuild(); } return r; };
  // a page that was asked to show a match flashes it once drawn
  const rp = ReaderView.renderPage; ReaderView.renderPage = async function (el) { const r = await rp.call(this, el); el._words = null;
    const f = this._flashWant; if (f && f.libId === this.libId && f.page === el._n) { this._flashWant = null; setTimeout(() => RD2.flash(el, f.P, f.nth || 0), 60); } return r; };

  /* search in the side panel */
  const ds = ReaderView.drawSide; ReaderView.drawSide = function () { ds.call(this); if (!this.side) return; const view = this;
    const st = this._rs || (this._rs = { q: '', all: false });
    const inp = h('input.inp.rs-q', { placeholder: 'Search this paper… (Ctrl+F)', value: st.q }), all = h('label.switch.tiny', h('input', { type: 'checkbox', checked: st.all, on: { change: e => { st.all = e.target.checked; run(); } } }), 'All papers');
    const out = h('div.rs-out'), info = h('div.tiny.muted.rs-info');
    const list = this.side.querySelector(':scope > div:not(.rd-sh)'), fbar = $('.filterbar, .fbar', this.side);
    let tok = 0;
    const run = async () => { st.q = inp.value; const my = ++tok, P = RD2.patterns(st.q);
      const on = P.length > 0; [...this.side.children].forEach(c => { if (c !== top) c.style.display = on ? 'none' : ''; }); out.style.display = on ? '' : 'none'; if (!on) { out.replaceChildren(); info.textContent = ''; return; }
      info.textContent = 'Searching…'; const libs = st.all ? DB.all('library').filter(l => l.pdf && MEDIA.get(l.pdf)) : [M.lib(view.libId)];
      const groups = []; let k = 0;
      for (const lib of libs) { if (my !== tok) return; if (st.all) info.textContent = `Reading ${++k} of ${libs.length} papers…`;
        let R = []; try { R = await RD2.searchPaper(view, lib.id, P); } catch { } if (R.length) groups.push({ lib, R }); }
      if (my !== tok) return;
      const n = groups.reduce((s, g) => s + g.R.length, 0), terms = (RD2._terms || []).filter(Boolean);
      info.replaceChildren(n ? `${plural(n, 'result')}${st.all ? ' in ' + plural(groups.length, 'paper') : ''}` : 'Nothing found', terms.length ? h('span', ' · term: ', ...terms.map(t => h('b', t.label + ((t.forms || []).length ? ' (' + t.forms.join(', ') + ')' : '')))) : '');
      view._hits = []; out.replaceChildren(...groups.map(g => { const sec = (label, rows) => rows.length ? h('div.rs-sec', h('div.rs-h', label, h('span.muted', ' ' + rows.length)), rows.map(r => { const row = h('div.rs-row.rs-' + r.kind, h('span.rs-p.mono', 'p. ' + r.page), r.el); row.addEventListener('click', () => RD2.go(view, g.lib.id, r, P)); if (r.kind === 'text') view._hits.push({ lib: g.lib.id, r }); return row; })) : null;
        return h('div.rs-group', st.all ? h('div.rs-paper', snippet(g.lib.title || 'Paper', 90)) : null,
          sec('Highlights', g.R.filter(r => r.kind === 'hl')), sec('Your notes & structures', g.R.filter(r => r.kind === 'note')), sec('In the paper', g.R.filter(r => r.kind === 'text'))); }));
      view._hi = -1; };
    inp.addEventListener('input', debounce(run, 220));
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && view._hits && view._hits.length) { e.preventDefault(); view._hi = (view._hi + (e.shiftKey ? -1 : 1) + view._hits.length) % view._hits.length; const x = view._hits[view._hi]; $$('.rs-row.cur', out).forEach(r => r.classList.remove('cur')); const rows = $$('.rs-row.rs-text', out); rows[view._hi] && rows[view._hi].classList.add('cur'); rows[view._hi] && rows[view._hi].scrollIntoView({ block: 'nearest' }); RD2.go(view, x.lib, x.r, RD2.patterns(inp.value)); } if (e.key === 'Escape') { inp.value = ''; run(); } });
    const top = h('div.rs-top', h('div.row', { style: { gap: '8px', alignItems: 'center' } }, inp, all), info);
    this.side.prepend(top); top.after(out); out.style.display = 'none'; this._rsInput = inp;
    if (st.q) run();
  };
  RD2.go = function (view, libId, r, P) {
    if (libId !== view.libId) { ReaderView._flashWant = { libId, page: r.page, P, nth: r.kind === 'text' ? RD2.nthOnPage(r) : 0 }; App.go('#/read/' + libId + '/' + r.page); return; }
    const el = view.pageEls && view.pageEls[r.page - 1]; if (!el) return;
    if (r.kind === 'hl' || (r.kind === 'note' && r.b)) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); const id = r.b.id; setTimeout(() => $$(`.rd-hl[data-id="${id}"]`).forEach(x => { x.classList.add('flash'); setTimeout(() => x.classList.remove('flash'), 2000); }), 450); return; }
    if (r.kind === 'note' && r.it) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const nth = RD2.nthOnPage(r);
    if (el._tl && el._done) { RD2.flash(el, P, nth); return; }
    view._flashWant = { libId, page: r.page, P, nth }; el.scrollIntoView({ block: 'start' });
  };
  RD2.nthOnPage = r => r._nth || 0;
  // number each text hit on its page (so Enter steps match by match)
  const sp = RD2.searchPaper; RD2.searchPaper = async function (...a) { const R = await sp.apply(this, a); const c = {}; R.filter(r => r.kind === 'text').forEach(r => { r._nth = c[r.page] = (c[r.page] == null ? 0 : c[r.page] + 1); }); return R; };
  // Ctrl+F in the reader
  document.addEventListener('keydown', e => { if (App.route.name !== 'read') return; if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'f' || e.key === 'F')) { const i = ReaderView._rsInput; if (i && i.isConnected) { e.preventDefault(); i.focus(); i.select(); } } }, true);
}
