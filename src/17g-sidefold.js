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
   panel is the overlay Highlights opens, and › closes it.
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
  on: () => typeof FEAT === 'undefined' || FEAT.on('sidefold'),
  folded: () => SIDEFOLD.on() && document.body.classList.contains('sf-fold'),
  start() { let s = 'last'; try { s = FEAT.tune('sidefold', 'start') || 'last'; } catch (e) { } return s === 'open' ? false : s === 'folded' ? true : !!_ls.get('sideFold', false); },
  set(v) { v = !!v; _ls.set('sideFold', v); SIDEFOLD.paint(v); },
  paint(v) { document.body.classList.toggle('sf-fold', !!v); $$('.sf-col').forEach(SIDEFOLD.aria); },
  /** Beside a note, the panel is Highlights' overlay: › closes it rather than folding it. */
  dock: col => !!col.closest('.embed-max.rd-docked'),
  aria(col) {
    const b = $(':scope > .sf-top .sf-b', col); if (!b) return; const dock = SIDEFOLD.dock(col), f = !dock && SIDEFOLD.folded();
    b.setAttribute('aria-expanded', String(!f)); b.title = dock ? 'Hide the highlights (Highlights on the bar brings them back)' : f ? 'Open the panel' : 'Fold the panel to the side';
  },
  click(col) {
    if (SIDEFOLD.dock(col)) { const ov = col.closest('.embed-max'); if (ov) ov.classList.remove('rd-side-on'); return; }
    if (SIDEFOLD.on()) SIDEFOLD.set(!SIDEFOLD.folded());
  },
  wrap(side) {
    const host = side && side.parentNode; if (!host || host.classList.contains('sf-col')) return null;
    const b = h('button.sf-b', { type: 'button' }), n = h('span.sf-n'); b.innerHTML = SIDEFOLD.CHEV;
    const top = h('div.sf-top', h('span.sf-tt', SIDEFOLD.TITLE), n, h('span.sp'), b), col = h('div.sf-col', top);
    host.classList.add('sf-host'); side.replaceWith(col); col.append(side);
    b.addEventListener('click', e => { e.stopPropagation(); SIDEFOLD.click(col); });
    // folded, the whole strip opens it (caught first, so the › under the pointer doesn't fold it again)
    col.addEventListener('click', e => { if (SIDEFOLD.folded() && !SIDEFOLD.dock(col)) { e.stopPropagation(); e.preventDefault(); SIDEFOLD.set(false); } }, true);
    // the strip's count: the panel's own heading ("3 highlights · 1 note"), read again whenever the panel redraws
    const sum = () => { const t = [...side.querySelectorAll(':scope > .rd-sh b, :scope > div > .rd-sh b')].map(x => x.textContent.trim()).find(x => /highlight|note/i.test(x)) || ''; if (n.textContent !== t) n.textContent = t; col.classList.toggle('has-n', !!t); };
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
  try { SIDEFOLD.paint(SIDEFOLD.start()); } catch (e) { }
}
