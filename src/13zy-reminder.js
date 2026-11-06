/* ==========================================================================
   13zy · The Reminder structure. Marking text as a Reminder (Ctrl+Enter → m)
   flags its component for the next weekly review automatically, and shows
   it wherever you work on something connected to that component: a 🔔 badge
   on every component wired to it (in any note) — click it to see the
   reminder, jump to it, or mark it done. Done (or the review closing it)
   clears the badge and the flag.
   ========================================================================== */
const REMIND2 = {
  open: () => DB.where('items', i => i.kind === 'reminder' && i.status !== 'closed' && !i.correctedBy),
  /** Open reminders that concern block id: its own, and those of components wired to it. */
  near(id) { const out = []; const R = REMIND2.open(); if (!R.length) return out;
    const nb = new Set([id, ...IX.wiresOf(id).map(w => w.from === id ? w.to : w.from)]);
    R.forEach(it => { if (it.originBlockId && nb.has(it.originBlockId) && it.originBlockId !== id) out.push(it); }); return out; },
  flag(it) { const b = it.originBlockId && M.block(it.originBlockId); if (!b) return; if (!M.flagFor('block', b.id)) { M.setFlag('block', b.id, 'Reminder: ' + snippet(it.text, 80)); } },
  done(it) { const cur = M.item(it.id); if (!cur) return; M.closeItem(cur); const f = cur.originBlockId && M.flagFor('block', cur.originBlockId); if (f && /^Reminder:/.test(f.reason || '') && !REMIND2.open().some(x => x.originBlockId === cur.originBlockId)) M.clearFlag('block', cur.originBlockId); toast('Reminder done'); },
  pop(list, e) { popover(e.clientX, e.clientY + 10, [h('h5', '🔔 ' + plural(list.length, 'reminder') + ' about this'), ...list.map(it => { const b = M.block(it.originBlockId), d = b && M.doc(b.docId);
    return h('div.rm2-row', h('div.serif', it.text), h('div.row', { style: { gap: '6px', marginTop: '4px' } }, h('span.tiny.muted', (d ? d.title + ' › ' : '') + (b ? M.blockName(b) : '') + ' · ' + fmtDay(it.created)), h('span.spacer'),
      h('button.btn.xs', { on: { click: ev => { closePop(); App.jump(it.originBlockId, ev); } } }, 'Go to it'), h('button.btn.xs.pri', { on: { click: () => { closePop(); REMIND2.done(it); } } }, 'Done ✓'))); })]); },
};
{
  // a new Reminder flags its component for the review
  const ci = M.createItem.bind(M); M.createItem = function (kind, text, block, extra) { const it = ci(kind, text, block, extra); if (it && kind === 'reminder') setTimeout(() => REMIND2.flag(it), 0); return it; };
  const si = M.setItem.bind(M); M.setItem = function (it, patch) { const was = it && it.kind; const r = si(it, patch); if (it && patch && patch.kind === 'reminder' && was !== 'reminder') REMIND2.flag(it); return r; };
  // the 🔔 badge on connected components
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (!el || !b || !b.id || b.id[0] === '_' || this.travel) return el;
    const R = REMIND2.near(b.id); if (R.length) { const bh = $(':scope > .bh', el), st = bh && $(':scope > .stampbtn', bh);
      const badge = h('button.rm2-badge.nopan', { title: R.map(it => '🔔 ' + it.text).join('\n'), on: { click: e => { e.stopPropagation(); REMIND2.pop(REMIND2.near(b.id), e); } } }, '🔔', R.length > 1 ? h('span', R.length) : null);
      st ? st.before(badge) : el.append(badge); }
    return el; };
}
