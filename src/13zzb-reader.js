/* ==========================================================================
   13zzb · Read a paper beside the note.
   The book on a PDF card's bar (or "◧ Beside" on the maximised view) puts
   the paper in one half of the window, full height, out of the canvas's pan
   and zoom; the note stays live in the other half. It is the maximised
   reader (13zz: its highlights, the colour menu, the pen highlighter) locked
   to half the screen, with page n / N and ‹ ›, zoom − / + (Ctrl or ⌘ and
   scroll, or pinch), the scissors to clip figures and equations (13zza),
   ⇄ to the other side and ⤢ full screen. Highlights and clips land beside
   the card as always, and the note shows them. ← → page while the pointer
   is over it; Esc never closes it. It belongs to its note: leave the note
   and it closes, come back and it is there again; Close forgets it.
   Meanwhile the card says "Reading beside", so the file is drawn once.
   ========================================================================== */
const RDOCK = {
  st: null, ZOOMS: [.6, .75, .9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5],
  BOOK: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>',
  saved: docId => _ls.get('rdock:' + docId, null),
  phone: () => document.body.classList.contains('mobile'),
  stage: () => RDOCK.st && $('.pdf-stage', RDOCK.st.ov),
  save() { const st = RDOCK.st; if (st) _ls.set('rdock:' + st.docId, { id: st.id, side: st.side, zoom: st.zoom }); },
  open(b, o = {}) {
    if (!b || b.kind !== 'pdf' || b.status !== 'live' || RDOCK.phone() || !MEDIA.get(b.media)) return;
    const was = RDOCK.saved(b.docId) || {}, same = was.id === b.id; RDOCK.close(true);
    const mx = $('.embed-max.dk-max:not(.rd-dock)'); if (mx) MXHL.close(mx);   // Gabe's maximised view gives way
    const st = RDOCK.st = { id: b.id, docId: b.docId, side: o.side || (same && was.side) || 'left', zoom: (same && was.zoom) || 1, full: false, hover: false };
    const btn = (label, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(e); } } }, label);
    st.pg = h('span.rd-pg.mono', '…'); st.zl = h('button.btn.xs.rd-zl.mono', { title: 'Fit the width', on: { click: e => { e.stopPropagation(); RDOCK.zoom(1); } } }, '100%');
    st.hl = btn('Highlights', 'Your highlights in this paper — click one to go there', () => st.ov.classList.toggle('rd-side-on'));
    st.fs = btn('⤢', 'Full screen (Esc comes back)', () => RDOCK.full());
    const bar = h('div.em-bar.rd-bar', h('b.rd-ttl', { title: b.label || '' }, b.label || 'PDF'),
      h('div.rd-grp', btn('‹', 'Previous page (←)', () => RDOCK.step(-1)), st.pg, btn('›', 'Next page (→)', () => RDOCK.step(1))),
      h('div.rd-grp', btn('−', 'Smaller (Ctrl + scroll)', () => RDOCK.zoom(-1, true)), st.zl, btn('+', 'Larger (Ctrl + scroll)', () => RDOCK.zoom(1, true))),
      CLIP.btn(b), st.hl, btn('⇄', 'Put it on the other side', () => RDOCK.swap()), st.fs,
      h('button.btn.sm.rd-x', { title: 'Put the paper back in its card', on: { click: e => { e.stopPropagation(); RDOCK.close(); } } }, 'Close ✕'));
    const ov = st.ov = h('div.embed-max.dk-max.rd-dock.rd-docked', bar, h('div.dk-maxc'));
    $('#app').append(ov); MXHL.open(ov, b.id);
    ov.addEventListener('pointerenter', () => { st.hover = true; }); ov.addEventListener('pointerleave', () => { st.hover = false; });
    ov.addEventListener('wheel', RDOCK.wheel, { passive: false }); ov.addEventListener('scroll', RDOCK.onScroll, true);
    RDOCK.save(); RDOCK.layout();
    DOCS.repaint(b); $$(`.box[data-id="${b.id}"] > .bh > .bh-tools`).forEach(x => x.replaceChildren());   // the card says "Reading beside" (and drops its tools)
    DOCS._max = { id: b.id, draw: RDOCK.draw }; RDOCK.draw();
    setTimeout(() => { QUOTE.paintMarks(b.id); App.panes().forEach(CLIP.mark); }, 700);
  },
  close(keep) {
    const st = RDOCK.st; if (!st) return; RDOCK.st = null;
    if (!keep) _ls.set('rdock:' + st.docId, null);
    st.ov.remove(); if (DOCS._max && DOCS._max.id === st.id) DOCS._max = null;
    if (CLIP.on.has(st.id)) CLIP.toggle(st.id, false);
    RDOCK.layout(); const b = M.block(st.id); if (b) DOCS.repaint(b);
    setTimeout(() => App.panes().forEach(CLIP.mark), 300);
  },
  /** Gabe's maximised drawing (PDFW.full) at this zoom; the place in the paper is kept. */
  draw() {
    const st = RDOCK.st; if (!st) return; const b = M.block(st.id); if (!b || b.status !== 'live') return RDOCK.close();
    const at = RDOCK.where(), body = WIDGETS.pdf.body(b, M.doc(b.docId), { maxView: true, paper: null, zoom: st.zoom }, false);
    body.classList.add('maxed'); $('.dk-maxc', st.ov).replaceChildren(body); st.zl.textContent = Math.round(st.zoom * 100) + '%'; RDOCK.count();
    if (at) { let n = 60; const go = () => { const s = RDOCK.stage(), sl = s && $(`.pdf-slot[data-p="${at.p}"]`, s); if (!sl) return --n > 0 && setTimeout(go, 50);
      requestAnimationFrame(() => requestAnimationFrame(() => { s.scrollTop = RDOCK.top(s, sl) + at.f * sl.offsetHeight; RDOCK.onScroll(); })); }; go(); }
    else setTimeout(RDOCK.onScroll, 400);
  },
  top: (s, sl) => sl.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop,
  /** The page at the top of the reader, and how far down it the top is. */
  where() { const s = RDOCK.stage(); if (!s || !s.scrollTop) return null; const y = s.getBoundingClientRect().top, sl = $$('.pdf-slot', s).find(x => x.getBoundingClientRect().bottom > y + 1); return sl ? { p: +sl.dataset.p, f: (y - sl.getBoundingClientRect().top) / (sl.offsetHeight || 1) } : null; },
  page() { const s = RDOCK.stage(); if (!s) return 1; const y = s.getBoundingClientRect().top + s.clientHeight * .3, sl = $$('.pdf-slot', s).find(x => x.getBoundingClientRect().bottom > y); return sl ? +sl.dataset.p : ((M.block(RDOCK.st.id) || {}).cur || 0) + 1; },
  onScroll() { const st = RDOCK.st; if (!st || st.raf) return; st.raf = requestAnimationFrame(() => { st.raf = 0; const b = M.block(st.id), n = (b && b.pages) || $$('.pdf-slot', st.ov).length || 0;
    st.pg.textContent = (b && b.view === 'page' ? (b.cur || 0) + 1 : RDOCK.page()) + ' / ' + (n || '…'); }); },
  step(d) {
    const st = RDOCK.st, b = st && M.block(st.id); if (!b) return; if (b.view === 'page') return PDFW.go(b, (b.cur || 0) + d);
    const s = RDOCK.stage(), sl = s && $(`.pdf-slot[data-p="${clamp(RDOCK.page() + d, 1, $$('.pdf-slot', s).length)}"]`, s); if (sl) s.scrollTo({ top: RDOCK.top(s, sl) - 12, behavior: 'smooth' });
  },
  zoom(v, step) {
    const st = RDOCK.st; if (!st) return; let z = v;
    if (step) { const Z = RDOCK.ZOOMS, i = Z.findIndex(x => x >= st.zoom - 1e-3); z = Z[clamp((i < 0 ? Z.length - 1 : i) + v, 0, Z.length - 1)]; }
    if (Math.abs(z - st.zoom) < 1e-3) return; st.zoom = z; RDOCK.save(); RDOCK.draw();
  },
  wheel(e) { const st = RDOCK.st; if (!st || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); st.wz = (st.wz || 0) + e.deltaY; clearTimeout(st.wt);
    st.wt = setTimeout(() => { const d = st.wz; st.wz = 0; RDOCK.zoom(d < 0 ? Math.min(3, Math.ceil(-d / 80)) : -Math.min(3, Math.ceil(d / 80)), true); }, 140); },
  swap() { const st = RDOCK.st; if (!st) return; st.side = st.side === 'left' ? 'right' : 'left'; RDOCK.save(); RDOCK.layout(); },
  full() { const st = RDOCK.st; if (!st) return; st.full = !st.full; st.ov.classList.toggle('rd-docked', !st.full); st.fs.textContent = st.full ? '◧' : '⤢'; st.fs.title = st.full ? 'Back beside the note (Esc)' : 'Full screen (Esc comes back)'; RDOCK.layout(); RDOCK.draw(); },
  /** Half the window for the paper: #app becomes two columns, the header across both, the note in the other half. */
  layout() {
    const st = RDOCK.st, on = !!st && !st.full, bd = document.body;
    bd.classList.toggle('rd-on', on); bd.classList.toggle('rd-left', on && st.side === 'left'); bd.classList.toggle('rd-right', on && st.side === 'right');
    requestAnimationFrame(() => { App.panes().forEach(p => p.paper && p.paper.apply()); dispatchEvent(new Event('resize')); });   // what places itself by the window (the tab row, the web's banner) places itself again
  },
  count() { const st = RDOCK.st; if (st) { const n = QUOTE.of(st.id).length; st.hl.textContent = n ? 'Highlights · ' + n : 'Highlights'; } },
};
{
  // the book on the card's bar (beside its maximise)
  const bar = PDFW.bar; PDFW.bar = function (b, m, n, cur, maxed, ro) { const r = bar.apply(this, arguments);
    if (!maxed && !RDOCK.phone()) { const mx = [...r.bar.children].find(x => x.title === 'Maximise'), bk = h('button.btn.xs.rd-open', { title: 'Read beside the note — the paper in half the screen, the note in the other', html: RDOCK.BOOK, on: { click: e => { e.stopPropagation(); RDOCK.open(M.block(b.id)); } } }); mx ? mx.before(bk) : r.bar.append(bk); }
    return r; };
  // "◧ Beside" on Gabe's maximised view
  const dm = DOCS.max; DOCS.max = function (b) { const r = dm.apply(this, arguments);
    if (b && b.kind === 'pdf' && !RDOCK.phone()) { const ov = [...$$('.embed-max.dk-max:not(.rd-dock)')].pop(), x = ov && [...$$('.em-bar button', ov)].find(z => /Close/.test(z.textContent)); if (x) x.before(h('button.btn.sm', { title: 'Read it beside the note — the paper in half the screen', on: { click: e => { e.stopPropagation(); RDOCK.open(M.block(b.id)); } } }, '◧ Beside')); }
    return r; };
  // while it is out, the card says so
  const wb = WIDGETS.pdf.body; WIDGETS.pdf.body = function (b, d, pane, ro) {
    if (RDOCK.st && RDOCK.st.id === b.id && !(pane && pane.maxView)) return h('div.pdfw.rd-away', { style: { height: (b.h || 560) + 40 + 'px' } }, h('div.rd-away-in', h('span.rd-away-ic', { html: RDOCK.BOOK }), h('b', b.label || 'PDF'), h('span', 'Reading beside the note'), ro ? null : h('button.btn.xs', { on: { click: e => { e.stopPropagation(); RDOCK.close(); } } }, 'Put it back here')));
    return wb.apply(this, arguments); };
  // "from …" on a quote, and "on the note" in the highlights list, stay with the paper beside
  const qg = QUOTE.goto; QUOTE.goto = function (q) { const st = RDOCK.st; if (st && q && q.quote && q.quote.src === st.id) return MXHL.goto(st.id, q); return qg.apply(this, arguments); };
  const mc = MXHL.close; MXHL.close = function (ov) { if (ov && ov.classList.contains('rd-dock')) { if (RDOCK.st && RDOCK.st.full) RDOCK.full(); return; } return mc.apply(this, arguments); };
  // a highlight made in it shows up in the note
  const qm = QUOTE.make; QUOTE.make = function (sel) { const b = qm.apply(this, arguments), st = RDOCK.st;
    if (b && st && !st.full && sel && sel.src === st.id) setTimeout(() => { const p = App.panes().find(x => x.docId === b.docId); if (p && p.reveal) p.reveal(b.id); }, 150); return b; };
  // ← → page while the pointer is over it; Esc from full screen comes back beside
  window.addEventListener('keydown', e => {
    const st = RDOCK.st; if (!st || $('.ovl') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    if (e.key === 'Escape' && st.full) { e.preventDefault(); e.stopPropagation(); return RDOCK.full(); }
    const d = !st.hover ? 0 : e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); e.stopPropagation(); RDOCK.step(d);
  }, true);
  // it belongs to its note: back when the note is, gone when it isn't
  const rr = DocView.render; DocView.render = function (docId) { const r = rr.apply(this, arguments), s = RDOCK.saved(docId);
    if (s && (!RDOCK.st || RDOCK.st.docId !== docId) && !RDOCK.phone()) setTimeout(() => { const b = M.block(s.id); if (!RDOCK.st && b && b.docId === docId && App.panes().some(p => p.docId === docId)) RDOCK.open(b); }, 0);
    return r; };
  addEventListener('hashchange', () => setTimeout(() => { const st = RDOCK.st; if (st && !App.panes().some(p => p.docId === st.docId)) RDOCK.close(true); }, 0));
  { const ch = changed; let t = null; changed = function (...a) { const r = ch.apply(this, a); clearTimeout(t); t = setTimeout(RDOCK.count, 250); return r; }; }
}
