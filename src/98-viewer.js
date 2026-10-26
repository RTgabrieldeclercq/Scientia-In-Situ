/* ==========================================================================
   98 · Viewer mode — what an exported note (21b) runs as. The page carries
   window.SIS_EXPORT: the note's records and files. Nothing is stored and
   nothing can be changed: the canvas opens read-only (the same path as time
   travel), and pan, zoom, maximise, PDFs, embedded pages, slides, figures,
   recordings and widgets keep working. Connections to components outside
   the note are drawn as faded stubs that lead nowhere; the notes they and
   other references point to are named on the References panel.
   ========================================================================== */
const VIEWER = window.SIS_EXPORT ? {
  X: window.SIS_EXPORT,
  stub(id) { const d = M.doc(id); return !!(d && d._stub); },
  dataBlob(u) { const [h0, b] = u.split(','), mime = (h0.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream', bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); },
  async boot() {
    const X = VIEWER.X; DB.mode = 'memory';
    for (const [n, rows] of Object.entries(X.stores)) if (S[n]) rows.forEach(r => S[n].set(r[STORES[n].key], r));
    // files → blob URLs the widgets read as usual
    for (const [k, u] of Object.entries(X.files || {})) { const blob = VIEWER.dataBlob(u); if (k.startsWith('media:')) MEDIA._urls.set(k.slice(6), URL.createObjectURL(blob)); else if (k.startsWith('rec:')) REC.blobs.set(k.slice(4), blob); }
    // nothing is written: records stay as exported (the light/dark choice still applies)
    const put = DB.put.bind(DB); DB.put = (store, rec, op) => store === 'settings' ? put(store, rec, op) : rec; DB.del = () => { };
    MEDIA.flush = async () => 0;
    // reading only: selecting text or highlighting doesn't make quotes; anything that would add a component just says so
    QUOTE.menu = () => { }; QUOTE.make = () => null; QUOTE.penSave = sel => { try { QUOTE.clearSel(sel); } catch { } };
    const ab = M.addBlock; let told = 0; M.addBlock = function () { if (Date.now() - told > 4000) { told = Date.now(); toast('This is a read-only export'); } return ab.apply(this, arguments); };
    loadProfiles(); applyTheme(); applyKindCSS(); IX.rebuild(); DB.undoStack = []; DB.beginGroup();
    document.body.classList.add('viewer'); document.title = X.title + ' · Scientia In Situ';
    bootShell(); VIEWER.chrome();
    window.addEventListener('hashchange', () => { closePop(); hideHover(); App._mounted = false; App.refresh(); });
    // only the exported note opens; other notes are named on the References panel
    const go = App.go.bind(App); App.go = h0 => { const m = /^#\/doc\/([^/?]+)/.exec(h0 || ''); if (m && m[1] === X.docId) return go(h0); VIEWER.refs(m && m[1]); };
    if (location.hash !== '#/doc/' + X.docId) history.replaceState(null, '', '#/doc/' + X.docId);
    App.refresh(); window.__ready = true;
  },
  /** the header: title, read-only note, References, light/dark */
  chrome() {
    const X = VIEWER.X, n = X.refs.length + X.outside.length + X.cites.length;
    const bar = h('div.vw-bar', h('span.pill', 'Exported · read-only'), h('span.tiny.muted', 'exported ' + fmtDayLong(X.at) + ' ' + fmtTime(X.at)),
      h('button.btn.sm.vw-refb', { title: 'Notes this one refers to, connections outside it, citations', on: { click: () => VIEWER.refs() } }, 'References' + (n ? ' (' + n + ')' : '')));
    const hr = $('#hd .hrow'), tt = $('#themetoggle'); tt ? tt.before(bar) : hr.append(bar);
    document.addEventListener('keydown', e => { const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (e.target.closest && e.target.closest('input,textarea,select')) return;
      if (mod && !['c', 'f', '0', '=', '-', '+', 'a', 'p'].includes(k)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (!mod && /^(delete|backspace|n|i|enter|\?|[1-7])$/.test(k)) { e.stopImmediatePropagation(); if (k !== 'enter') e.preventDefault(); } }, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.paper')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  },
  /** the References panel (a note id highlights that note) */
  refs(hl) {
    const X = VIEWER.X, WHY = { 'pulled-in component': 'a component pulled in here', 'embedded widget': 'a widget embedded here', 'note card': 'a note card here', connection: 'connected to a component here', link: 'linked from the text' };
    const notes = X.refs.length ? h('ul.vw-list', X.refs.map(r => h('li' + (r.id === hl ? '.hl' : ''), h('div', typechip(r.type), ' ', h('b', r.title || 'Untitled')), h('div.tiny.muted', r.path, r.created ? ' · created ' + fmtDayLong(r.created) : ''), h('div.tiny', r.why.map(w => WHY[w] || w).join(' · '))))) : h('p.muted.tiny', 'This note doesn’t refer to other notes.');
    const outs = X.outside.length ? h('ul.vw-list', X.outside.map(o => { const b = M.block(o.blockId); return h('li', h('div', h('b', snippet(b ? M.blockName(b) : '—', 50)), ' ', h('span.muted', (o.dir === 'out' ? '→ ' : '← ') + o.rel + ' '), h('b', snippet(o.name, 60))), h('div.tiny.muted', 'in ', o.note || 'another note')); })) : null;
    const cites = X.cites.length ? h('ol.vw-cites', X.cites.sort((a, b) => a.n - b.n).map(c => h('li', c.text))) : null;
    modal({ title: 'References · ' + X.title, wide: true, body: h('div.vw-refs', h('h5', 'Notes referred to'), notes,
      outs ? h('h5', 'Connections to components outside this note') : null, outs, cites ? h('h5', 'Citations') : null, cites,
      h('p.tiny.muted', { style: { marginTop: '14px' } }, 'Exported from Scientia In Situ. The notes listed here are not part of this file.')) });
    if (hl) setTimeout(() => { const li = $('.vw-list li.hl'); li && li.scrollIntoView({ block: 'center' }); }, 60);
  },
  /** faded stubs for connections that leave the note */
  stubs(pane) { const w = pane.paper && pane.paper.world; if (!w) return; $$(':scope > .vw-stubs', w).forEach(x => x.remove());
    const by = new Map(); VIEWER.X.outside.forEach(o => { const L = by.get(o.blockId) || []; L.push(o); by.set(o.blockId, L); });
    const layer = h('div.vw-stubs');
    by.forEach((L, id) => { const el = $(`:scope > .box[data-id="${id}"]`, w); if (!el || el.style.display === 'none') return; const x = el.offsetLeft + el.offsetWidth, y = el.offsetTop + 18;
      L.forEach((o, i) => layer.append(h('div.vw-stub', { style: { left: x + 'px', top: (y + i * 26) + 'px' } }, h('i'), h('span', (o.dir === 'out' ? '→ ' : '← ') + o.rel + ' · ' + snippet(o.name, 34) + (o.note ? ' (' + snippet(o.note, 28) + ')' : ''))))); });
    w.append(layer); },
} : null;
if (VIEWER) {
  const dw = DocView.drawWires; DocView.drawWires = function () { const r = dw.apply(this, arguments); try { VIEWER.stubs(this); } catch { } return r; };
  // the dock: fit and the References button, nothing that adds or changes
  const rd = DocView.renderDock; DocView.renderDock = function (d) { if (!this.travel) return rd.call(this, d);
    this.dock.replaceChildren(h('span.dk-l', 'Read-only export'), h('button.dk', { title: 'Fit (Ctrl+0)', on: { click: () => this.paper.fit(this.bbox()) } }, '⤢'), h('button.dk', { on: { click: () => VIEWER.refs() } }, 'References')); };
  DocView.menu = () => { };
}
