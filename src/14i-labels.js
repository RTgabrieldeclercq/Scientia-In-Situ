/* ==========================================================================
   14i · Labels (V4.10). Gabe: "Add a label button in the quick cast pill, which
   contains the float and reference into it. … Clicking on it makes your cursor
   that label's symbol, and clicking on a component labels it and goes back to
   the regular cursor, unless you are holding Control key."
   The labelling mode lives here, in the app; the lab's Quick cast pill (lab-mode.js
   §11) arms it, and so does /label.
   LABELS:
     kinds()            the labels on offer now (each feature on): [{ id, name, icon }]
                        — 'float' (V4.7, the sky-lavender cloud), 'reference' (V4.5, the golden tag)
     arm(id)            the cursor becomes that label's symbol; the next click on a component labels it
     disarm()           the usual cursor again
     armed              'float' | 'reference' | null
     apply(id, blockId) labels one component — one Undo; false (and a toast) when it already has it
     name(id)           'Float' | 'Reference'
   A click on a component labels it and puts the label down, unless Ctrl (⌘) is held
   (Settings → Labels → Ctrl keeps it); a click on the empty canvas, Esc, or Done puts it
   down. A bridged copy labels its origin. Every change of mode fires document
   'sis-labels' { detail: { armed } } (the pill lights its button).
   ========================================================================== */
const LABELS = {
  armed: null,
  on: () => typeof FEAT === 'undefined' || FEAT.on('labels'),
  opt(k, d) { try { const v = FEAT.tune('labels', k); return v == null ? d : v; } catch (e) { return d; } },
  name: id => id === 'float' ? 'Float' : id === 'reference' ? 'Reference' : '',
  col(v, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d; } catch (e) { return d; } },
  /** The two symbols, as SVG: the float's cloud (its own colour) and the reference's golden ribbon. `px`: a size for a cursor. */
  svg(id, px) {
    const s = px ? ` width="${px}" height="${px}"` : '';
    if (id === 'float') return `<svg viewBox="0 0 24 24"${s} xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.4 18.6h9.4a4.3 4.3 0 0 0 .62-8.55 6.05 6.05 0 0 0-11.55-.9A4.75 4.75 0 0 0 7.4 18.6z" fill="${LABELS.col('--float', '#93B4F4')}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.4 18.6h9.4a4.3 4.3 0 0 0 .62-8.55 6.05 6.05 0 0 0-11.55-.9A4.75 4.75 0 0 0 7.4 18.6z" fill="none" stroke="${LABELS.col('--float-ink', '#2C4C8E')}" stroke-width=".7" stroke-opacity=".55"/></svg>`;
    return `<svg viewBox="0 0 24 24"${s} xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="lblg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e594"/><stop offset=".34" stop-color="#e6bd4f"/><stop offset=".58" stop-color="#b9870f"/><stop offset=".78" stop-color="#e9c457"/><stop offset="1" stop-color="#fbe8a0"/></linearGradient></defs><path d="M7 2.8h10v18.4l-5-3.9-5 3.9z" fill="url(#lblg)" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><path d="M7 2.8h10v18.4l-5-3.9-5 3.9z" fill="none" stroke="#7E600C" stroke-width=".7" stroke-opacity=".6"/></svg>`;
  },
  kinds() {
    if (!LABELS.on()) return [];
    const out = [];
    if (typeof FLOATS !== 'undefined' && FLOATS.on()) out.push({ id: 'float', name: 'Float', icon: LABELS.svg('float') });
    if (typeof REFS !== 'undefined' && REFS.on()) out.push({ id: 'reference', name: 'Reference', icon: LABELS.svg('reference') });
    return out;
  },
  emit() { try { document.dispatchEvent(new CustomEvent('sis-labels', { detail: { armed: LABELS.armed } })); } catch (e) { } },
  arm(id) {
    if (!LABELS.kinds().some(k => k.id === id)) return false;
    LABELS.armed = id; const px = +LABELS.opt('size', 32) || 32, half = Math.round(px / 2);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LABELS.svg(id, px));
    document.documentElement.style.setProperty('--lbl-cur', `url("${url}") ${half} ${half}, crosshair`);
    document.body.classList.add('lbl-armed'); document.body.dataset.lbl = id;
    LABELS.chip(); LABELS.emit(); return true;
  },
  disarm() {
    if (!LABELS.armed) return; LABELS.armed = null;
    document.body.classList.remove('lbl-armed'); delete document.body.dataset.lbl;
    const c = document.getElementById('lbl-chip'); if (c) c.remove(); LABELS.emit();
  },
  /** While a label is in hand: what it is, how to put it down (a touch screen has no cursor to show it). */
  chip() {
    let c = document.getElementById('lbl-chip'); if (c) c.remove(); const id = LABELS.armed; if (!id) return;
    const touch = document.body.classList.contains('mobile') || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const keep = LABELS.opt('keep', true) !== false, ic = h('span.lbl-ic'); ic.innerHTML = LABELS.svg(id);
    c = h('div.lbl-chip', { id: 'lbl-chip', role: 'status' }, ic, h('span', LABELS.name(id) + ' in hand — ' + (touch ? 'tap a component' : 'click a component' + (keep ? ' (hold Ctrl to label several)' : ''))),
      h('button.btn.xs', { type: 'button', on: { click: e => { e.stopPropagation(); LABELS.disarm(); } } }, 'Done'));
    // just inside the top of the canvas on screen (not over the tabs); on a narrow screen, below its corner pills
    try { const host = [...document.querySelectorAll('.canvas-host')].map(x => x.getBoundingClientRect()).find(r => r.width > 0 && r.height > 0); if (host) { c.style.top = Math.round(host.top + (host.width < 700 ? 66 : 12)) + 'px'; c.style.left = Math.round(host.left + host.width / 2) + 'px'; } } catch (e) { }
    document.body.append(c);
  },
  /** The block a click labels: a bridged copy stands for its origin. */
  target(id) { const b = M.block(id); return b && b.kind === 'ref' && b.refBlockId ? M.block(b.refBlockId) : b; },
  apply(id, blockId) {
    const b = LABELS.target(blockId); if (!b || b.status !== 'live') return false; const nm = snippet(M.blockName(b), 40);
    if (id === 'float') {
      if (typeof FLOATS === 'undefined' || !FLOATS.on()) return false;
      if (b.afloat) { toast('“' + nm + '” is already ' + (b.afloat.to ? 'a placed float' : 'a float')); return false; }
      return FLOATS.mark([b.id]) > 0;
    }
    if (id === 'reference') {
      if (typeof REFS === 'undefined' || !REFS.on()) return false;
      if (b.isRef) { toast('“' + nm + '” is already a reference'); return false; }
      DB.beginGroup('reference'); REFS.toggle(b, true); return true;   // its own Undo, whatever came before
    }
    return false;
  },
};
{
  // a click while a label is in hand: on a component it labels it, on the empty canvas it puts the label down
  const chrome = '.lab-pill, .pop, .modal, .lbl-chip, #toasts, .ctx, .menu, .st-page, .fl-dome';
  document.addEventListener('pointerdown', e => {
    if (!LABELS.armed || e.button !== 0) return; const t = e.target; if (!t || !t.closest || t.closest(chrome)) return;
    const box = t.closest('.box[data-id], .m-card[data-id]'), paper = t.closest('.paper');   // .m-card: a component in the phone's list
    if (box && box.dataset.id && box.dataset.id[0] !== '_') {
      e.preventDefault(); e.stopPropagation(); LABELS._swallow = true;
      LABELS.apply(LABELS.armed, box.dataset.id);
      if (!((e.ctrlKey || e.metaKey) && LABELS.opt('keep', true) !== false)) LABELS.disarm();
      return;
    }
    if (paper) { e.preventDefault(); e.stopPropagation(); LABELS._swallow = true; LABELS.disarm(); }
  }, true);
  document.addEventListener('click', e => { if (LABELS._swallow) { LABELS._swallow = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && LABELS.armed) { e.stopPropagation(); LABELS.disarm(); } }, true);
  // leaving the note puts it down
  window.addEventListener('hashchange', () => LABELS.disarm());
  // /label: the same choice the pill offers, for an app without pills
  if (typeof CMD !== 'undefined' && CMD.add) CMD.add({ slash: 'label', label: 'Label components by clicking them — a float or a reference', args: [], alias: ['labels'], group: 'Note',
    sub: 'The cursor becomes the label; click a component (hold Ctrl for several), Esc puts it down',
    run: () => { const K = LABELS.kinds(); if (!K.length) throw new Error('Labels are off in Settings'); if (K.length === 1) { LABELS.arm(K[0].id); return K[0].name; }
      ctxMenu(innerWidth / 2 - 120, innerHeight / 3, [{ head: 'Label in hand' }, ...K.map(k => ({ label: k.name, sub: k.id === 'float' ? 'Waiting for a note of its own (/float brings them)' : 'Found with /reference from any note', run: () => LABELS.arm(k.id) }))]); } });
}
