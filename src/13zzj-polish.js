/* ==========================================================================
   13zzj · The polish (V3.953, Gabe's SiS Shaping, Phase H — the list of
   mine Gabe accepted):
   • The hint line at the bottom of a note has a ×: once closed it stays
     closed (settings().hintOff); ⋯ → Shortcuts… shows the same.
   • A large note (over 100 components) lets the browser skip the boxes far
     off screen (content-visibility), so it pans smoothly.
   • The reader's side panel gets chips: Mine · Notes, to show or hide the
     note's own highlights and the notes under them.
   • + Insert lists the rows made for this note's type first, then the ones
     you used last (settings().insertRecent), then the rest.
   (Back and forward, the crumb and the ← button came with the navigation
   bar in V3.947. The header's sync dot is the device sync's own, 13zc.)
   ========================================================================== */
const POLISH = {
  /** The hint line: a × that closes it for good. */
  hint(pane) { const el = pane && pane.hint; if (!el) return; if (settings().hintOff) { el.hidden = true; return; }
    const put = () => { if (settings().hintOff || $('.hint-x', el) || !el.childNodes.length) return; el.append(h('button.hint-x', { type: 'button', title: 'Close this line for good (⋯ → Shortcuts… shows it)', on: { click: ev => { ev.stopPropagation(); saveSettings({ hintOff: true }); el.hidden = true; toast('The hint line is gone — ⋯ → Shortcuts… lists the keys'); } } }, '×')); };
    put(); if (!el._hintX) { el._hintX = true; new MutationObserver(put).observe(el, { childList: true }); } },   // the line is repainted on every change: the × comes back each time
  shortcuts() { modal({ title: 'Shortcuts', actions: [{ label: 'Close' }], body: h('div.list', [['Ctrl+Enter', 'what a phrase is: a claim, a barrier, a question…'], ['Ctrl+W (Focus) · Alt+W', 'mark a term'], ['Ctrl+I · /cite', 'cite a paper'], ['/', 'commands in the text; on the canvas, the navigation bar'], ['@', 'name a person'], ['drag ●', 'connect two components; the last relation comes first'], ['Ctrl+click · lasso', 'select several; their bar does more'], ['P', 'pan (Move)'], ['Ctrl+K · Ctrl+Shift+K', 'the Atlas · the quick list'], ['Alt+← · Alt+→', 'the previous · next note'], ['Ctrl+0', 'fit'], ['Ctrl+Z · Ctrl+Shift+Z', 'undo · redo'], ['Esc', 'the bar, a popover, then what is open']].map(([k, w]) => h('div.li', h('kbd', k), h('span.t', w)))) }); },
  /** The reader's panel: chips for Mine · Notes. */
  chips(ov) { const side = $('.mx-side', ov); if (!side || $('.rd-chips', side)) return; const st = ov._chips || (ov._chips = { mine: true, notes: true });
    const apply = () => { side.classList.toggle('no-mine', !st.mine); side.classList.toggle('no-notes', !st.notes); [...chips.children].forEach(c => c.classList.toggle('on', !!st[c.dataset.k])); };
    const chips = h('div.rd-chips', [['mine', 'Mine'], ['notes', 'Notes']].map(([k, l]) => h('button.at-chip.act' + (st[k] ? '.on' : ''), { 'data-k': k, type: 'button', on: { click: () => { st[k] = !st[k]; apply(); } } }, l)));
    side.prepend(chips); apply(); new MutationObserver(() => { if (!side.contains(chips)) side.prepend(chips); apply(); }).observe(side, { childList: true }); },
  recent: () => settings().insertRecent || [],
  remember(id) { const R = POLISH.recent().filter(x => x !== id); R.unshift(id); saveSettings({ insertRecent: R.slice(0, 8) }); },
};
{
  // the hint's ×, and ⋯ → Shortcuts…; big notes
  const rr = DocView.render; DocView.render = function (docId) { const host = rr.apply(this, arguments); try { POLISH.hint(this); const n = M.liveBlocks(docId).length; (this.host || host) && (this.host || host).classList.toggle('big', n > 100); } catch (e) { } return host; };
  const dm = DocView.docMenu; if (dm) DocView.docMenu = function (d, e) { const cm = ctxMenu; let done = false; window.ctxMenu = function (x, y, items) { if (!done) { done = true; const i = items.findIndex(it => it && it.label === 'View as it stood on…'); items.splice(i >= 0 ? i : items.length, 0, { label: 'Shortcuts…', sub: 'The keys, and the hint line’s words', run: () => POLISH.shortcuts() }); } return cm.apply(this, arguments); }; try { return dm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // the reader's chips
  setTimeout(() => { if (typeof MXHL === 'undefined') return; const mo = MXHL.open; MXHL.open = function (ov, srcId) { const r = mo.apply(this, arguments); try { POLISH.chips(ov); } catch (e) { } return r; }; }, 0);
  // + Insert: this note's rows first, then the recent ones, then the rest; what you insert is remembered
  setTimeout(() => { if (typeof INSERT === 'undefined') return; const im = INSERT.menu; INSERT.menu = function (pane, anchor, at) { const d = M.doc(pane.docId), R = POLISH.recent(), rank = x => (x.when ? 0 : 1) * 100 + (R.includes(x.id) ? R.indexOf(x.id) : 50), before = INSERTS.slice();
    INSERTS.forEach(x => { if (!x._rememb) { const run = x.run; x.run = function () { try { POLISH.remember(x.id); } catch (e) { } return run.apply(this, arguments); }; x._rememb = true; } });
    const sorted = before.slice().sort((a, b) => rank(a) - rank(b)); INSERTS.splice(0, INSERTS.length, ...sorted); try { return im.apply(this, arguments); } finally { INSERTS.splice(0, INSERTS.length, ...before); } }; }, 0);
}
