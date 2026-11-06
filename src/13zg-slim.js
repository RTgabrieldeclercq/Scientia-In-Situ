/* ==========================================================================
   13zg · Slimmer widgets. A widget's own toolbar sits in its header row,
   beside the time stamp, instead of a row of its own: the image panel's
   layout buttons, the well plate's format and colour tools, the
   calculator's DEG and tabs, the equation's Register / Solve, the live
   view's layout switch, the timer's clock and buttons. A widget that
   redraws itself has its toolbar moved up again.
   ========================================================================== */
const SLIM = {
  BARS: { figure: '.fg-bar', plate: '.wtool', calc: '.cbar', eq: '.eqfoot', view: '.lv-h', timer: '.tc-top', matcard: '.mc-h' },
  dock(el) {
    const kind = (el.className.match(/\bw-([a-z]+)\b/) || [])[1], sel = SLIM.BARS[kind]; if (!sel) return;
    const bh = $(':scope > .bh', el); if (!bh) return;
    const bar = [...el.querySelectorAll(sel)].find(x => !bh.contains(x)); if (!bar) return;
    let slot = $(':scope > .bh-tools', bh); if (!slot) { slot = h('span.bh-tools.nopan'); const st = $(':scope > .stampbtn', bh); st ? st.before(slot) : bh.append(slot); }
    slot.replaceChildren(bar); el.classList.add('slim');
    if (kind === 'figure' && !$(':scope > .rz-corner', el)) el.append(h('div.rz.rz-corner', { title: 'Drag to resize — the images follow' }));
    const lab = $(':scope > .blab', bh), W = WIDGETS[kind]; if (lab && W && lab.placeholder === 'label') lab.placeholder = W.label;
    SLIM.fit(el);
  },
  /** One row when it fits; otherwise name · time · ⋯ on top and the tools on a row of their own just below. */
  fit(el) { const bh = $(':scope > .bh', el), t = bh && $(':scope > .bh-tools', bh), st = bh && $(':scope > .stampbtn', bh); if (!t || !st) return;
    bh.classList.remove('two'); requestAnimationFrame(() => { if (!bh.isConnected) return; const top = bh.firstElementChild.offsetTop; if (t.offsetTop > top + 4 || st.offsetTop > top + 4) bh.classList.add('two'); }); },
  watch(el) { if (!el._slimRO && window.ResizeObserver) { el._slimRO = new ResizeObserver(() => SLIM.fit(el)); el._slimRO.observe(el); } SLIM.dock(el); if (el._slimObs) return; const o = new MutationObserver(() => { clearTimeout(el._slimT); el._slimT = setTimeout(() => SLIM.dock(el), 0); }); o.observe(el, { childList: true, subtree: true }); el._slimObs = o; },
};
{
  const box = DocView.box; DocView.box = function (b, d, p) { const el = box.call(this, b, d, p); if (el && SLIM.BARS[b.kind]) { SLIM.watch(el); } return el; };
}
