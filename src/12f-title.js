/* ==========================================================================
   12f · A component's title (V4.98 — Gabe, 20 Nov: "Highlighting a set of
   words and clicking title should make that the title of the component.
   Clicking on title with no highlight lets you type the title. The title is
   editable at any time.")
   A component's title is its label (b.label), the box in its header (placeholder
   "label"). Until now a single click on it only started a drag (the box moves by
   its title) and a double click opened it for typing. Now:
   - Words highlighted (in that component's text — or, as you choose in Settings,
     anywhere in the note, an HTML page inside a box included) + a click on its title
     = those words are the title: trimmed, one line, cut at a sensible length, one
     Undo (the toast has it), the highlight put away.
   - No highlight: the click puts the caret in the title, where you point, to type.
     Enter (on to the text), Esc (puts the old title back) or a click outside ends it.
   - A drag from the title still moves the component (4 px decides, as before).
   - Any time: the title is there on every component, selected or not, in a folded
     one too — except where the note is read-only (time travel) or somebody else
     holds the component (then it stays what it was).
   The highlight vanishes when the title takes focus, so the words are read on
   pointerdown, before anything moves; a touch tap is decided on its click.
   Settings → Canvas & notes → Titles from highlighted words (comptitle, 20a).
   TITLE: on() · opt(k, d) · grab(box) · clean(text) · set(box, text) · caretAt(input, x)
   ========================================================================== */
const TITLE = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('comptitle'),
  opt(k, d) { try { const v = FEAT.tune('comptitle', k); return v == null ? d : v; } catch (e) { return d; } },
  max() { return +TITLE.opt('max', 80) || 80; },
  /** The words as a title: whitespace folded to one line, citation marks and quotes at the ends dropped, cut at a word. */
  clean(t, max) {
    max = max || TITLE.max();
    t = String(t || '').replace(/￼/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[“"‘'(\[]+|[”"’'\])]+$/g, '').replace(/[.,;:]+$/, '').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max - 1), sp = cut.lastIndexOf(' ');
    return (sp > max * .5 ? cut.slice(0, sp) : cut).replace(/[.,;:\s]+$/, '') + '…';
  },
  /** The highlighted words that count for this box: its own first; then (when allowed) anywhere in the same note. Iframes of HTML pages too. */
  grab(box) {
    const host = box && box.closest('.canvas-host'), note = TITLE.opt('from', 'own') === 'note';
    const fromSel = (sel, within) => { try { if (!sel || sel.isCollapsed || !sel.rangeCount) return ''; const n = sel.getRangeAt(0).commonAncestorContainer, el = n && (n.nodeType === 1 ? n : n.parentElement);
      if (!el || (within && !within.contains(el)) || (el.closest && el.closest('.bh, .modal, .pop'))) return ''; return sel.toString(); } catch (e) { return ''; } };
    // an HTML page runs sandboxed (its box's copy of the page reports its highlight, 13zw QUOTE.SCRIPT): the last words it reported
    const inFrames = root => { for (const f of root.querySelectorAll('iframe')) if (f._ttl && f._ttl.trim()) return f._ttl; return ''; };
    let t = fromSel(getSelection(), box); if (!t.trim()) t = inFrames(box);
    if (!t.trim() && note && host) { t = fromSel(getSelection(), host); if (!t.trim()) t = inFrames(host); }
    return t.trim() ? TITLE.clean(t) : '';
  },
  /** The highlight is used up: the pages that reported one put theirs away too. */
  spent(box) { const host = box.closest('.canvas-host') || box; for (const f of host.querySelectorAll('iframe')) if (f._ttl) { f._ttl = ''; try { f.contentWindow.postMessage({ sis: 'clear' }, '*'); } catch (e) { /* */ } } },
  /** Where in the text a click at screen x lands (the box may be zoomed): the nearest boundary between two letters. */
  caretAt(input, x) {
    const cs = getComputedStyle(input), r = input.getBoundingClientRect(), k = input.offsetWidth ? r.width / input.offsetWidth : 1, v = input.value;
    const ctx = document.createElement('canvas').getContext('2d'); ctx.font = cs.font;
    const rel = (x - r.left) / k - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.borderLeftWidth) || 0) + input.scrollLeft;
    let best = 0, bd = Infinity;
    for (let i = 0; i <= v.length; i++) { const d = Math.abs(ctx.measureText(v.slice(0, i)).width - rel); if (d < bd) { bd = d; best = i; } else break; }
    return best;
  },
  /** Make `text` the title of the box's component: one Undo group, a toast with Undo. */
  set(box, text) {
    const b = M.block(box.dataset.id); if (!b || !text) return false; const old = b.label || '';
    if (old === text) { toast('Title: ' + snippet(text, 50)); return true; }
    DB.beginGroup('Title'); const g = DB.group;
    if (PROTO.is(b) && b.kind === 'protocol') PROTO.setName(b, text); else { b.label = text; DB.put('blocks', b); changed(); }
    const undo = h('button.btn.xs.ghost.t-undo', { type: 'button', on: { click: e => { e.stopPropagation(); const top = DB.undoStack[DB.undoStack.length - 1]; if (top && top.group === g) App.undo(); else toast('Use Ctrl+Z — something else changed since'); t.remove(); } } }, 'Undo');
    const t = h('span.t-toast', h('span', 'Title: ' + snippet(text, 50)), undo); toast(t, 4500);
    return true;
  },
  /** Put the caret in the title (where the click was), selecting nothing. */
  edit(input, x) {
    const box = input.closest('.box'), host = box && box.closest('.canvas-host'), pane = host && host._dv;
    if (pane && pane.select && box.dataset.id[0] !== '_') pane.select(box.dataset.id, true);
    const t = (box && $('.bh .blab', box)) || input;   // selecting may have drawn the box again
    t.focus({ preventScroll: true }); try { const n = x != null ? TITLE.caretAt(t, x) : t.value.length; t.setSelectionRange(n, n); } catch (e) { /* */ }
  },
};
{
  let pend = null;
  const target = e => { const t = e.target && e.target.closest && e.target.closest('.box > .bh .blab'); return t && !t.readOnly && t.closest('.box') ? t : null; };
  /** Decide a click on the title: the words that were highlighted, or the caret. */
  const decide = (t, words, x) => { const box = t.closest('.box'); if (words && M.block(box.dataset.id)) { TITLE.set(box, words); TITLE.spent(box); try { getSelection().removeAllRanges(); } catch (e) { /* */ } try { t.blur(); } catch (e) { /* */ } return; } TITLE.edit(t, x); };
  document.addEventListener('pointerdown', e => {
    pend = null; if (!TITLE.on() || e.button !== 0) return;
    const t = target(e); if (!t || document.activeElement === t) return;
    if (typeof LASSO2 !== 'undefined' && e.pointerType !== 'touch' && LASSO2.barrel(e)) return;
    const box = t.closest('.box'), host = box.closest('.canvas-host'), pane = host && host._dv; if (!pane || pane.travel) return;
    pend = { t, id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, words: TITLE.grab(box) };   // read now: focus would put the highlight away
  }, true);
  /* mouse and pen: the pointer-down handler of 13zz2 holds the title (a drag moves the box), so a release within 4 px is the click */
  addEventListener('pointerup', e => {
    const p = pend; if (!p || e.pointerId !== p.id || p.type === 'touch') return; pend = null;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) >= 4 || !p.t.isConnected) return;
    setTimeout(() => decide(p.t, p.words, p.x), 0);
  }, true);
  /* a touch tap focuses the title by itself; the click then swaps in the highlighted words, if there were */
  document.addEventListener('click', e => {
    const p = pend; if (!p || p.type !== 'touch' || !p.t.contains(e.target)) return; pend = null;
    if (p.words) { e.preventDefault(); decide(p.t, p.words, p.x); }
  }, true);
  /* what an HTML page says is highlighted in it (its box's script posts it on every mouse-up; empty when the highlight went) */
  addEventListener('message', e => { const d = e.data; if (!d || d.sis !== 'sel') return; const f = [...document.querySelectorAll('iframe')].find(x => x.contentWindow === e.source); if (f) f._ttl = d.text || ''; });
  /* Enter on a folded component has no text to go on into: it ends the edit (the change is saved by the blur) */
  document.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== 'Tab') || e.shiftKey || !TITLE.on()) return; const t = e.target; if (!t || !t.matches || !t.matches('.box > .bh input.blab:not(.pname)')) return;
    const ed = $('.ed', t.closest('.box')); if (ed && ed.getClientRects().length) return; e.stopPropagation(); e.preventDefault(); t.blur();
  }, true);
  /* Esc puts the old title back and ends the edit */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !TITLE.on()) return; const t = e.target; if (!t || !t.matches || !t.matches('.box > .bh input.blab')) return;
    const b = M.block(t.closest('.box').dataset.id); if (!b) return; e.stopPropagation(); e.preventDefault(); t.value = b.label || ''; t.blur();
  }, true);
  /* a typed title is one Undo, too */
  document.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('.box > .bh input.blab')) DB.beginGroup('Title'); }, true);
}
