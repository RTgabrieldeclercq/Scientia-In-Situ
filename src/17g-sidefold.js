/* ==========================================================================
   17g · The reader's side panel folds (V4.10 — Gabe: "The side tab showing
   notes in PDFs, HTMLs, or websites should be collapseable.").
   The panel of highlights and notes gets a title strip with a ›:
   • beside a maximised PDF, HTML page or saved website (13zz);
   • beside a pane of the reader in full screen (13zzb);
   • in the Library's reader (17b).
   Click › and the panel folds into a thin strip at the side, with its count
   written down it. Click the strip and the panel opens again. Every reader
   shares one state, kept on this device (_ls 'sideFold'), so a file opened
   later finds the panel as you left it; Settings can make it always open or
   always folded instead. Beside a note (the reader in half the window), the
   panel folds too (V4.40 — Gabe: "Remove the highlight button and instead,
   have the right sidebar collapsed in the read beside as well"): folded at
   first, with a state of its own (_ls 'sideFoldB'), open it lies over the
   paper. Folded, in every reader, it is a small capsule at the right edge
   (its count on a badge) rather than a strip.
   The panel's own code is unchanged: it is wrapped in a column (.sf-col)
   whose width glides. A panel redraws its own children, so the strip has to
   sit outside it.
   SIDEFOLD:
     folded()    is the panel folded now (the feature on, and folded)
     set(v)      fold (true) or open (false) every reader's panel; kept on this device
     start()     the state a newly opened file starts in (Settings → Fold the side panel)
     wrap(side)  give a panel its strip (13zz's .mx-side, 17b's .rd-side)
   ========================================================================== */
const SIDEFOLD = {
  CHEV: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  TITLE: 'Highlights and notes',
  PEN: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
  on: () => typeof FEAT === 'undefined' || FEAT.on('sidefold'),
  folded: () => SIDEFOLD.on() && document.body.classList.contains('sf-fold'),
  start() { let s = 'last'; try { s = FEAT.tune('sidefold', 'start') || 'last'; } catch (e) { } return s === 'open' ? false : s === 'folded' ? true : !!_ls.get('sideFold', false); },
  set(v) { v = !!v; _ls.set('sideFold', v); SIDEFOLD.paint(v); },
  paint(v) { document.body.classList.toggle('sf-fold', !!v); $$('.sf-col').forEach(SIDEFOLD.aria); },
  /** Beside a note (not a popup): the panel has its own fold, folded at first (V4.40). */
  dock: col => !!col.closest('.embed-max.rd-docked:not(.rp-ov)'),
  foldedB: () => document.body.classList.contains('sf-fold-b'),
  setB(v) { v = !!v; _ls.set('sideFoldB', v); $$('.embed-max.rd-side-on').forEach(o => o.classList.remove('rd-side-on')); document.body.classList.toggle('sf-fold-b', v); $$('.sf-col').forEach(SIDEFOLD.aria); },
  /** Is this panel folded now (beside: its own fold, unless the app opened it — rd-side-on; elsewhere: every reader's). */
  foldedAt(col) { if (SIDEFOLD.dock(col)) { const ov = col.closest('.embed-max'); return SIDEFOLD.foldedB() && !(ov && ov.classList.contains('rd-side-on')); } return SIDEFOLD.folded(); },
  aria(col) {
    const b = $(':scope > .sf-top .sf-b', col); if (!b) return; const f = SIDEFOLD.foldedAt(col), n = ($(':scope > .sf-top .sf-n', col) || {}).textContent || '';
    b.setAttribute('aria-expanded', String(!f)); b.title = f ? 'Open the panel' : 'Fold the panel to the side';
    if (f) col.title = SIDEFOLD.TITLE + (n ? ' · ' + n : '') + ' — click to open'; else col.removeAttribute('title');
  },
  click(col) {
    if (SIDEFOLD.dock(col)) return SIDEFOLD.setB(!SIDEFOLD.foldedAt(col));
    if (SIDEFOLD.on()) SIDEFOLD.set(!SIDEFOLD.folded());
  },
  wrap(side) {
    const host = side && side.parentNode; if (!host || host.classList.contains('sf-col')) return null;
    const b = h('button.sf-b', { type: 'button' }), n = h('span.sf-n'), k = h('span.sf-k'), ic = h('span.sf-ic', { html: SIDEFOLD.PEN }); ic.append(k); b.innerHTML = SIDEFOLD.CHEV;
    const top = h('div.sf-top', ic, h('span.sf-tt', SIDEFOLD.TITLE), n, h('span.sp'), b), col = h('div.sf-col', top);
    host.classList.add('sf-host'); side.replaceWith(col); col.append(side);
    b.addEventListener('click', e => { e.stopPropagation(); SIDEFOLD.click(col); });
    // folded, the whole strip opens it (caught first, so the › under the pointer doesn't fold it again)
    col.addEventListener('click', e => { if ((SIDEFOLD.dock(col) || SIDEFOLD.on()) && SIDEFOLD.foldedAt(col)) { e.stopPropagation(); e.preventDefault(); SIDEFOLD.click(col); } }, true);
    // the strip's count: the panel's own heading ("3 highlights · 1 note"), read again whenever the panel redraws
    const sum = () => { const t = [...side.querySelectorAll(':scope > .rd-sh b, :scope > div > .rd-sh b')].map(x => x.textContent.trim()).find(x => /highlight|note/i.test(x)) || ''; if (n.textContent !== t) { n.textContent = t; const c = (t.match(/\d+/g) || []).reduce((a, x) => a + +x, 0); k.textContent = c ? String(c) : ''; SIDEFOLD.aria(col); } col.classList.toggle('has-n', !!t); };
    sum(); try { new MutationObserver(sum).observe(side, { childList: true }); } catch (e) { }
    SIDEFOLD.paint(SIDEFOLD.start());
    return col;
  },
};
{
  const mo = MXHL.open; MXHL.open = function (ov) { const r = mo.apply(this, arguments); try { SIDEFOLD.wrap($(':scope > .mx-row > .mx-side', ov)); } catch (e) { console.warn('[side fold]', e); } return r; };
  const rv = ReaderView.render; ReaderView.render = function () { const host = rv.apply(this, arguments); try { if (host && host.querySelector) SIDEFOLD.wrap($('.rd-main > .rd-side', host)); } catch (e) { console.warn('[side fold]', e); } return host; };
  // ⤢ / ◧ on a pane beside the note: › there folds (full screen) or closes the overlay (beside) — its tooltip says which
  const rf = RDOCK.full; RDOCK.full = function () { const r = rf.apply(this, arguments); try { $$('.sf-col').forEach(SIDEFOLD.aria); } catch (e) { } return r; };
  try { SIDEFOLD.paint(SIDEFOLD.start()); document.body.classList.toggle('sf-fold-b', _ls.get('sideFoldB', true) !== false); } catch (e) { }
}
