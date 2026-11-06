/* ==========================================================================
   13zr · ◫ Split on each note's toolbar: Side by side (two notes) or
   Quadrant (up to four, 2×2). This note stays in the first pane; you pick
   the others from a searchable list, recent first. In a split, the same
   button switches between the layouts or goes back to one pane.
   Also: ⟳ in the header reloads the app (for the installed app, which has
   no browser reload button; Ctrl+R / F5 do the same).
   ========================================================================== */
const SPLITBTN = {
  current() { return App.route.name === 'split' ? SplitView.parse(App.route.args).docs : App.route.name === 'doc' ? [App.route.args[0]] : []; },
  menu(pane, e) {
    const docs = SPLITBTN.current(), me = pane.docId, n = docs.length;
    ctxMenu(e.clientX - 200, e.clientY + 14, [{ head: n > 1 ? `Split · ${n} notes` : 'Open beside this note' },
      { label: (n === 2 ? '✓ ' : '') + 'Side by side', sub: n > 2 ? 'Keep two: this one and the next' : 'Pick the other note', run: () => n > 2 ? App.go(SplitView.route([me, ...docs.filter(x => x !== me)].slice(0, 2))) : n === 2 ? null : SPLITBTN.pick(me, 1) },
      { label: (n > 2 ? '✓ ' : '') + 'Quadrant (2×2)', sub: n > 1 ? 'Pick ' + (4 - n) + ' more' : 'Pick up to three notes', run: () => SPLITBTN.pick(me, 3, docs.filter(x => x !== me)) },
      n > 1 ? 'sep' : null, n > 1 ? { label: 'Back to one pane', sub: 'Only this note', run: () => App.go('#/doc/' + me) } : null].filter(Boolean));
  },
  /** Pick `max` notes (some may already be open); this note goes first. */
  pick(me, max, have = []) {
    const chosen = new Set(have), open = () => { m.close(); const docs = [me, ...[...chosen].slice(0, max)]; App.go(docs.length > 1 ? SplitView.route(docs) : '#/doc/' + me); };
    const q = h('input.inp', { placeholder: 'Search notes…', style: { width: '100%' } }), list = h('div.list.sp-list'), count = h('span.tiny.muted');
    const draw = () => { const s = q.value.trim().toLowerCase();
      const all = DB.where('documents', d => d.id !== me && !d.deleted && !d.archived && (!s || (d.title + ' ' + M.docPath(d)).toLowerCase().includes(s))).sort((a, b) => (b.opened || b.modified || '').localeCompare(a.opened || a.modified || '')).slice(0, 60);
      list.replaceChildren(...all.map(d => h('label.li.click' + (chosen.has(d.id) ? '.on' : ''), h('input', { type: max > 1 ? 'checkbox' : 'radio', name: 'sp', checked: chosen.has(d.id), on: { change: e => { if (max === 1) { chosen.clear(); chosen.add(d.id); return open(); } if (e.target.checked) { if (chosen.size >= max) { e.target.checked = false; return toast('Four panes is the most'); } chosen.add(d.id); } else chosen.delete(d.id); draw(); } } }),
        h('span.t', typechip(d.type), ' ', d.title, h('span.s', M.docPath(d))))));
      count.textContent = max > 1 ? `${chosen.size} of ${max} chosen` : ''; };
    q.addEventListener('input', draw); q.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && max > 1 && chosen.size) open(); });
    const m = modal({ title: max > 1 ? 'Quadrant — pick up to three notes' : 'Side by side — pick the other note', wide: true, body: h('div', q, h('div', { style: { marginTop: '8px' } }, list), count),
      actions: max > 1 ? [{ label: 'Cancel' }, { label: 'Open', pri: true, run: () => { if (!chosen.size) return toast('Pick at least one note'), false; open(); } }] : [{ label: 'Cancel' }] });
    draw(); setTimeout(() => q.focus(), 30);
  },
};
{
  const render = DocView.render; DocView.render = function (docId) { const r = render.call(this, docId);
    if (this.ctools && !$('.ct-split', this.ctools)) this.ctools.prepend(h('button.ct-split', { title: 'Side by side or quadrant', on: { click: e => SPLITBTN.menu(this, e) } }, h('span', { style: { fontSize: '14px' } }, '◫'), 'Split'));
    return r; };
  // ⟳ reload, in the header
  const addReload = () => { if ($('#reloadbtn')) return; const tt = $('#themetoggle'); if (!tt) return; tt.before(h('button.ib#reloadbtn', { title: 'Reload the app (Ctrl+R)', on: { click: () => location.reload() } }, '⟳')); };
  addReload(); setTimeout(addReload, 1500);
}
