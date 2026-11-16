/* ==========================================================================
   13zx · An embedded widget is the widget. A component embedded from
   another note that is an image panel (or a well plate, PDF, HTML page,
   slides, calculator…) shows the real thing — live: the same images, the
   same captions, editable here as there — with "from <note>" beneath, not a
   text card. Each image of an embedded image panel has its own link circle,
   so connections drawn here leave from that image.
   V3.977 — a labelled image of a panel (a result, evidence…), or the whole
   panel labelled, pulled in as a structure shows its picture(s) too: the
   image as cropped there, or the panel (read-only: the original is edited
   where it lives), above the structure's words.
   ========================================================================== */
{
  const SKIP = new Set(['protocol', 'run', 'timer', 'ink']);
  const pic = (it, pane) => {
    const fb = M.block(it.originBlockId) || null; if (!fb || fb.kind !== 'figure' || fb.status === 'removed' || !fb.fig) return null; const od = M.doc(fb.docId);
    if (it.figPanel) return h('div.rf-panel', { title: 'The image panel in ' + (od ? M.docPath(od) : 'its note') + ' — edit it there' }, FIG.body(fb, od, pane, true));
    const cells = FIG.cells(fb), i = cells.findIndex(c => c.id === it.figCell), c = cells[i]; if (!c) return null;
    const m = c.media && MEDIA.get(c.media), k = c.crop || { x: 0, y: 0, w: 1, h: 1 }, fr = h('div.rf-pic', { style: { aspectRatio: String(FIG.aspect(c)) }, title: 'Image ' + FIG.letter(i) + (fb.label ? ' of “' + fb.label + '”' : '') + ' in ' + (od ? M.docPath(od) : 'its note') });
    if (m) fr.append(MEDIA.el(m, { style: { position: 'absolute', width: 100 / k.w + '%', height: 100 / k.h + '%', left: -k.x * 100 / k.w + '%', top: -k.y * 100 / k.h + '%', maxWidth: 'none', pointerEvents: 'none' } }));
    else if (c.board) fr.append(BOARD.preview(c.board)); else return null;
    if (fb.fig.letters !== false) fr.append(h('span.fg-letter', FIG.letter(i)));
    fr.addEventListener('mouseenter', () => MEDIA.playIn(fr, true)); fr.addEventListener('mouseleave', () => MEDIA.playIn(fr, false)); return fr;
  };
  const rc = DocView.refCard; DocView.refCard = function (b, d) {
    const it = b.refItemId && M.item(b.refItemId);
    if (it && (it.figCell || it.figPanel)) { const card = rc.call(this, b, d); try { const p = pic(it, this); if (p && card) { const o = card.querySelector(':scope > .origin'); o ? o.after(p) : card.prepend(p); card.classList.add('rf-fig'); } } catch (e) { console.warn('[ref picture]', e); } return card; }
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
