/* ==========================================================================
   13zzn · What floats over the paper keeps out of its own way (V3.962 —
   Gabe: "some menus start to overlap with each other").
   • A menu (a popover: Alt+click on a structure or a term, a picker…)
     puts the hover card away, and no hover card opens over an open menu
     or the Ctrl+Enter strip but from inside it.
   • The text editor bar (13zzf) gives way: hidden while a menu that is not
     its own, a hover card or the selection's bar covers it, or while its
     component is selected; back when they go. Its own menus (∑, +) open
     clear of it.
   • A Ctrl+click that selects a component (13zu) takes the caret out of
     the text, so the selection's bar is the one bar.
   • The selection's bar is one row (it had wrapped into a column of
     buttons, the layer it sits in having no width, and covered the next
     component) and sits where it covers no other component: under the
     selection, else beside it, else above it — on screen if it can.
   ========================================================================== */
const LAYERS = {
  over: (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom,
  shown: el => el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  /** The text editor bar gives way to a menu or the selection's bar over it, and to its component being selected. */
  ebar() {
    const c = EBAR.cur; if (!c || !c.bar.isConnected) return; const r = c.bar.getBoundingClientRect(), sel = INK.sel;
    const yieldTo = (sel && (sel.boxes || []).includes(c.b.id)) || $$('.pop, .hovercard, .ink-selbar, .wselbar').some(el => !el.matches('.symp, .ebmore') && LAYERS.shown(el) && LAYERS.over(el.getBoundingClientRect(), r));
    c.bar.classList.toggle('yield', !!yieldTo);
  },
  /** A menu of the bar's own (∑, +) under it, else over it — never beneath it. */
  own(pop) {
    const c = EBAR.cur; if (!c || !pop || !pop.matches('.symp, .ebmore')) return; const r = c.bar.getBoundingClientRect(), q = pop.getBoundingClientRect(); if (!LAYERS.over(q, r)) return;
    pop.style.top = Math.round(r.bottom + 6 + q.height <= innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - q.height - 6)) + 'px';
  },
  /** The selection's bar where it covers no other component: under the selection, right, left, above (paper px). */
  selbar() {
    const pane = INK.sel && INK.sel.pane, w = pane && pane.paper && pane.paper.world, bar = w && $(':scope > .ink-selbar', w); if (!bar) return;
    const s = INK.selBox(), bw = bar.offsetWidth, bh = bar.offsetHeight, g = 8, mine = new Set([...(INK.sel.boxes || []), ...INK.sel.items.map(x => x.id)]);
    const others = $$(':scope > .box', w).filter(el => !mine.has(el.dataset.id) && el.offsetWidth).map(el => ({ left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight }));
    const pr = pane.paper.rect(), seen = (x, y) => { const a = pane.paper.toScreen(x, y), z = pane.paper.toScreen(x + bw, y + bh); return a.x >= pr.left && a.y >= pr.top && z.x <= pr.right && z.y <= pr.bottom; };
    const at = [[s.x, s.y + s.h + g], [s.x + s.w + g, s.y], [s.x - bw - g, s.y], [s.x, s.y - bh - g]].map(([x, y]) => ({ x, y, free: !others.some(o => LAYERS.over({ left: x, top: y, right: x + bw, bottom: y + bh }, o)), seen: seen(x, y) }));
    const p = at.find(a => a.free && a.seen) || at.find(a => a.free) || at[0];
    bar.style.left = Math.round(p.x) + 'px'; bar.style.top = Math.round(p.y) + 'px';
  },
};
{
  // a menu puts the hover card away; no hover card over an open menu but from inside it
  const pv = popover; popover = function () { hideHover(); const el = pv.apply(this, arguments); LAYERS.own(el); return el; };
  const hc = hoverCard; hoverCard = function (anchor) { const strip = $('.strip'); if ((_pop && _pop.isConnected && !_pop.contains(anchor)) || (strip && !strip.contains(anchor))) return; return hc.apply(this, arguments); };
  // the text editor bar gives way: when it is placed, when a menu opens or closes, when the selection changes
  const pl = EBAR.place; EBAR.place = function () { const r = pl.apply(this, arguments); LAYERS.ebar(); return r; };
  new MutationObserver(() => { if (EBAR.cur) LAYERS.ebar(); }).observe(document.body, { childList: true });
  const ps = INK.paintSel; INK.paintSel = function () { const r = ps.apply(this, arguments); try { LAYERS.selbar(); } catch (e) { console.warn('[layers]', e); } LAYERS.ebar(); return r; };
  const cs = INK.clearSel; INK.clearSel = function () { const r = cs.apply(this, arguments); LAYERS.ebar(); return r; };
  // a Ctrl+click that selects a component takes the caret out of the text
  const tb = LASSO2.toggleBox; LASSO2.toggleBox = function () { const a = document.activeElement; if (a && a.isContentEditable && a.closest('.paper')) { a.blur(); getSelection().removeAllRanges(); } return tb.apply(this, arguments); };
}
