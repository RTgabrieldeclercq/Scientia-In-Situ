/* ==========================================================================
   13zx · An embedded widget is the widget. A component embedded from
   another note that is an image panel (or a well plate, PDF, HTML page,
   slides, calculator…) shows the real thing — live: the same images, the
   same captions, editable here as there — with "from <note>" beneath, not a
   text card. Each image of an embedded image panel has its own link circle,
   so connections drawn here leave from that image.
   ========================================================================== */
{
  const SKIP = new Set(['protocol', 'run', 'timer', 'ink']);
  const rc = DocView.refCard; DocView.refCard = function (b, d) {
    const src = !b.refItemId && M.block(b.refBlockId);
    if (!src || src.status === 'removed' || !WIDGETS[src.kind] || SKIP.has(src.kind)) return rc.call(this, b, d);
    const od = M.doc(src.docId), ro = !!this.travel;
    let body; try { body = WIDGETS[src.kind].body(src, od, this, ro); } catch (e) { return rc.call(this, b, d); }
    return h('div.refwidget', body, h('div.origin.rw-origin', 'embedded from ', h('a', { title: 'Alt+click: open beside', on: { click: e => App.jump(src.id, e) } }, od ? M.docPath(od) : 'missing'), ' · live — changes here change the original'));
  };
  // the box takes the widget's look and width
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); const src = el && b && b.kind === 'ref' && !b.refItemId && M.block(b.refBlockId);
    if (src && WIDGETS[src.kind] && !SKIP.has(src.kind)) { el.classList.add('widget', 'w-' + src.kind, 'refw'); if (!b.w || b.w === 392) el.style.width = (src.w || WIDGETS[src.kind].w || 560) + 'px'; }
    return el; };
  // embedding a widget gives the copy the widget's width
  const pi = M.pullInto; M.pullInto = function (docId, afterId, o) { const nb = pi.call(M, docId, afterId, o); const src = o && o.blockId && !o.itemId && M.block(o.blockId); if (nb && src && WIDGETS[src.kind] && !SKIP.has(src.kind)) { nb.w = src.w || WIDGETS[src.kind].w || 560; DB.put('blocks', nb); } return nb; };
}
