/* ==========================================================================
   13zi · A note inside another note. "+ Insert → A note…" puts a card on
   the paper: the note's title (type, where it lives, its synthesis), and,
   if you pick one, one of its components highlighted beneath the title.
   Click the title to open the note (Alt+click beside it; Ctrl+click in the
   pane); click the highlighted component to go to it. The card follows the
   note: rename it or edit that component and the card shows the change.
   It wires, joins regions and takes labels like any component.
   ========================================================================== */
const NOTEREF = {
  comps: d => M.docBlocks(d.id).filter(x => x.status === 'live' && x.kind === 'component'),
  body(b, d, pane, ro) {
    const n = M.doc(b.refDocId), el = h('div.nr');
    if (!n) { el.append(h('div.tiny.muted', 'This note was deleted.')); return el; }
    const fb = b.focusId && M.block(b.focusId), comps = NOTEREF.comps(n), items = comps.flatMap(c => IX.itemsOf(c.id));
    el.append(h('div.nr-head', { on: { click: e => { if (e.target.closest('button')) return; e.stopPropagation(); App.jump(n.id, e, true); } }, title: 'Open the note · Alt+click: beside' },
        typechip(n.type), h('b.nr-title', n.title), h('span.nr-path', M.docPath(n))),
      n.synthesis && n.synthesis.text ? h('div.nr-syn.serif', snippet(n.synthesis.text, 220)) : null,
      fb && fb.status !== 'removed' ? (() => { const k = IX.kindsOf(fb)[0], ed = h('div.ed.nr-ed'); ED.render(ed, fb, n); ed.contentEditable = 'false';
        return h('div.nr-focus', { style: { '--kc': k ? `var(--k-${k})` : 'var(--ink-3)' }, title: 'Go to this component', on: { click: e => { if (e.target.closest('.st,.tm,.ln,.ct,button')) return; e.stopPropagation(); App.jump(fb.id, e); } } },
          h('div.nr-fh', h('span.nr-fn', M.blockName(fb)), k ? kchip(k) : null, h('span.spacer'), h('span.mono.tiny.muted', fmtStamp(M.blockTime(fb)))), ed); })() : null,
      h('div.nr-foot', h('span.tiny.muted', `${plural(comps.length, 'component')}${items.length ? ' · ' + plural(items.length, 'structure') : ''} · ${fmtDay(n.created)}`), h('span.spacer'),
        ro ? null : h('button.btn.xs', { on: { click: e => { e.stopPropagation(); NOTEREF.pickFocus(M.block(b.id)); } } }, fb ? 'Change highlight' : 'Highlight a component…'),
        fb && !ro ? h('button.btn.xs.ghost', { title: 'No highlighted component', on: { click: e => { e.stopPropagation(); const cur = M.block(b.id); cur.focusId = null; DB.put('blocks', cur); changed(); } } }, '×') : null));
    return el;
  },
  pickFocus(b) {
    const n = M.doc(b.refDocId); if (!n) return;
    const m = modal({ title: 'Highlight a component of “' + snippet(n.title, 40) + '”', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search its components…', sort: 'nrfocus',
      items: q => NOTEREF.comps(n).filter(c => !q || (M.blockName(c) + ' ' + c.body.text).toLowerCase().includes(q)),
      render: c => h('div', h('b', M.blockName(c)), ' ', h('span.serif', snippet(c.body.text, 90)), IX.kindsOf(c).slice(0, 2).map(k => [' ', kchip(k)])),
      onPick: c => { m.close(); const cur = M.block(b.id); cur.focusId = c.id; DB.put('blocks', cur); changed(); } }) });
  },
  insert(d, p) {
    const m = modal({ title: 'Put a note in this one', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search notes…', sort: 'nrnote',
      items: q => DB.where('documents', x => x.id !== d.id && !x.deleted && (!q || (x.title + ' ' + M.docPath(x)).toLowerCase().includes(q))),
      render: x => h('div', typechip(x.type), ' ', x.title, h('span.s', M.docPath(x))),
      onPick: x => { m.close(); const b = M.addBlock(d.id, null, { kind: 'noteref', label: '', refDocId: x.id, focusId: null, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 392 }); b.body = { text: x.title, marks: [] }; DB.put('blocks', b); changed();
        if (NOTEREF.comps(x).length) setTimeout(() => pickModal('Highlight one of its components?', 'It shows under the title. You can change it later.', [{ label: 'Choose a component…', run: () => NOTEREF.pickFocus(M.block(b.id)) }, { label: 'Just the note', run: () => { } }]), 120); } }) });
  },
};
WIDGETS.noteref = { label: 'note', w: 392, body: NOTEREF.body, menu: b => [{ label: 'Open the note', run: () => App.go('#/doc/' + b.refDocId) }, { label: b.focusId ? 'Change the highlighted component…' : 'Highlight a component…', run: () => NOTEREF.pickFocus(b) }] };
INSERTS.push({ id: 'noteref', group: 'Writing', icon: '▤', label: 'A note…', sub: 'Its title as a card here, with one of its components highlighted if you like', run: (d, p) => NOTEREF.insert(d, p) });
// the card counts as a link to that note (backlinks, the vault)
{ const rebuild = IX.rebuild.bind(IX); IX.rebuild = (...a) => { const r = rebuild(...a);
  DB.where('blocks', b => b.kind === 'noteref' && b.status === 'live' && b.refDocId).forEach(b => { const L = IX.links.get(b.refDocId) || []; if (!L.some(x => x.blockId === b.id)) { L.push({ blockId: b.id, mark: { type: 'link', ref: b.refDocId, card: true } }); IX.links.set(b.refDocId, L); } });
  return r; }; }
