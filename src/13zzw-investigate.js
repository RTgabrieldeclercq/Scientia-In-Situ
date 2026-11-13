/* ==========================================================================
   13zzw · Needs investigation, a structure (V3.992 — Gabe: "Needs
   investigation needs to be a structure separate from reminder." V3.991 had
   made it a kind of reminder.)
   A structure of its own (02-schema KIND 'investigate': Ctrl+Enter → X,
   /investigate, the editing bar), open until it is investigated (closed):
   • its words are highlighted in its colour (Settings → Structures), and its
     component has a dot in its header — click it to read it or mark it
     Investigated (also in the structure's Alt+click menu);
   • in the Portfolio its note (and project) has a dot that breathes in and
     out (15d PFKIT.dots);
   • on Today, right above Recent notes: the open ones, oldest first, with the
     claim resurfaced today (RESURF);
   • right-click a text component → Needs investigation: its words become one.
   A V3.991 reminder of that kind becomes one, once (INVEST.migrate).
   ========================================================================== */
const INVEST = {
  /** The open ones, oldest first: all, or those in the notes docIds. */
  open(docIds) {
    const ids = docIds ? (docIds instanceof Set ? docIds : new Set(docIds)) : null;
    return DB.where('items', i => i.kind === 'investigate' && !i.correctedBy && (!ids || ids.has(i.originDocId)) && IX.status(i) === 'open').sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
  },
  of: blockId => IX.itemsOf(blockId).filter(i => i.kind === 'investigate' && !i.correctedBy && IX.status(i) === 'open'),
  where(it) { const d = M.doc(it.originDocId), b = M.block(it.originBlockId); return d ? d.title + (b && b.status === 'live' ? ' › ' + M.blockName(b) : '') : ''; },
  age(it) { const n = Math.floor((Date.now() - +new Date(it.created)) / 864e5); return n < 1 ? 'today' : n === 1 ? 'yesterday' : n + ' d'; },
  go(it, e) { const b = it.originBlockId && M.block(it.originBlockId); if (b && b.status === 'live') App.jump(b.id, e); else if (it.originDocId && M.doc(it.originDocId)) App.jump(it.originDocId, e, true); },
  done(it) { const cur = M.item(it.id); if (!cur) return; M.closeItem(cur); toast('Investigated — its dot goes'); },
  /** Its words as a structure, on component b (all of its text, or [from, to]). */
  make(b, from, to) {
    const cur = M.block(b.id), text = String((cur && cur.body && cur.body.text) || ''); if (!cur || !text.trim()) { toast('Write what needs investigating in it first'); return null; }
    if (from == null) { from = text.length - text.trimStart().length; to = text.trimEnd().length; }
    const words = text.slice(from, to).replace(/￼/g, '').trim(); if (!words) return null;
    if (INVEST.of(cur.id).some(i => i.text === words)) { toast('It is marked already'); return null; }
    const it = M.createItem('investigate', words, cur);
    M.saveBlockBody(cur, Object.assign({}, cur.body, { marks: [...(cur.body.marks || []), { id: uid('m'), type: 'struct', from, to, ref: it.id }] }));
    IX.rebuild(); changed(); return it;
  },
  mark(b) { if (INVEST.make(b)) toast('Needs investigation — a dot here, breathing in the Portfolio, on Today'); },
  /** Today, above Recent notes: what needs investigating, then the claim resurfaced today. */
  home() {
    const L = INVEST.open(), rs = typeof RESURF !== 'undefined' ? RESURF.card() : null;
    const row = it => h('div.li.click.inv-li', { on: { click: e => INVEST.go(it, e) } }, h('span.inv-i', h('i')),
      h('span.t', h('span.serif', snippet(it.text, 110)), h('span.s', INVEST.where(it))), h('span.tiny.mono.muted', INVEST.age(it)),
      h('button.btn.xs', { title: 'Investigated — its dot goes', on: { click: e => { e.stopPropagation(); INVEST.done(it); } } }, '✓'));
    return [h('div.sec-h.inv-h', { style: { marginTop: '24px' } }, h('h2', 'Needs investigation'), L.length ? h('span.k', String(L.length)) : null),
      L.length ? capped(L, 8, row) : rs ? null : h('div.tiny.muted', { style: { margin: '0 0 14px' } }, 'Nothing to look into. Select words, Ctrl+Enter → X (Needs investigation).'), rs];
  },
  pop(list, e) {
    popover(e.clientX, e.clientY + 10, [h('h5', 'Needs investigation'), ...list.map(it => h('div.inv-pp', h('div.serif', it.text),
      h('div.row', { style: { gap: '6px', marginTop: '4px' } }, h('span.tiny.muted', 'marked ' + fmtDay(it.created)), h('span.spacer'),
        h('button.btn.xs.pri', { on: { click: () => { closePop(); INVEST.done(it); } } }, 'Investigated ✓'))))]);
  },
  dot(list) {
    return h('button.inv-dot.nopan', { type: 'button', title: 'Needs investigation: ' + list.map(it => snippet(it.text, 60)).join(' · '), 'aria-label': 'Needs investigation — ' + list.length,
      on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); INVEST.pop(list, e); } } }, h('i'), list.length > 1 ? h('span', String(list.length)) : null);
  },
  /** V3.991's reminders of this kind become structures: a component with their words, in their note (or today's day note), marked; the reminder is done. */
  migrate() {
    const R = DB.all('reminders').filter(r => r.kind === 'investigate' && !r.done); if (!R.length) return 0;
    DB.beginGroup('investigate'); let n = 0;
    R.forEach(r => {
      const words = String(r.title || '').trim() + (r.notes ? ' — ' + String(r.notes).trim() : ''), b0 = r.blockId && M.block(r.blockId), d = (r.docId && M.doc(r.docId)) || (typeof DAY !== 'undefined' ? DAY.doc() : null);
      if (words && d && !d.deleted) {
        const at = b0 && b0.status === 'live' ? { x: b0.x || 0, y: (b0.y || 0) + 160 } : (typeof MOVE !== 'undefined' && MOVE.spot ? MOVE.spot(d) : { x: 0, y: 0 });
        const nb = M.addBlock(d.id, b0 && b0.status === 'live' ? b0.id : null, { kind: 'component', x: Math.round(at.x / 14) * 14, y: Math.round(at.y / 14) * 14, w: 392 });
        nb.body = { text: words, marks: [] }; nb.label = 'Needs investigation'; DB.put('blocks', nb); IX.rebuild();
        if (INVEST.make(nb)) n++;
      }
      r.done = isoLocal(new Date()); r.migrated = 'structure'; DB.put('reminders', r);
    });
    IX.rebuild(); changed(); return n;
  },
};
{
  // the dot in the note: on the component its words are in
  const bx = DocView.box; DocView.box = function (b) {
    const el = bx.apply(this, arguments);
    try { if (el && b && b.id && b.id[0] !== '_' && b.status === 'live' && !this.travel) { const L = INVEST.of(b.id);
      if (L.length) { const bh = $(':scope > .bh', el), st = bh && $(':scope > .stampbtn', bh), dot = INVEST.dot(L); st ? st.before(dot) : bh ? bh.append(dot) : el.append(dot); } } } catch (e) { }
    return el;
  };
  // V3.991's reminders of this kind, once the notebook is there
  const tryMigrate = () => { try { const n = INVEST.migrate(); if (n) toast(plural(n, 'Needs investigation reminder') + ' became ' + (n === 1 ? 'a structure' : 'structures') + ' — each a component with its words, marked', 6000); } catch (e) { console.warn('[investigate]', e); } };
  if (window.__ready) setTimeout(tryMigrate, 0); else { const t = setInterval(() => { if (window.__ready) { clearInterval(t); setTimeout(tryMigrate, 1500); } }, 500); }
}
