/* ==========================================================================
   13zzj · The polish (V3.953, Gabe's SiS Shaping, Phase H — the list of
   mine Gabe accepted):
   • A sync dot in the header: green in step with the lab, amber while it
     works or waits, grey when this computer is not connected, red with one
     plain sentence when it failed; click it for the details and Sync now.
   • The hint line at the bottom of a note has a ×: once closed it stays
     closed (settings().hintOff); ⋯ → Shortcuts… shows the same.
   • A large note (over 100 components) lets the browser skip the boxes far
     off screen (content-visibility), so it pans smoothly.
   • The reader's side panel gets chips: Mine · RM · Notes, to show or hide
     the note's own highlights, the lab's, and the notes under them.
   • + Insert lists the rows made for this note's type first, then the ones
     you used last (settings().insertRecent), then the rest.
   (Back and forward, the crumb and the ← button came with the navigation
   bar in V3.947.)
   ========================================================================== */
const POLISH = {
  dot: null, status: null, timer: null,
  /** The header's dot. */
  mountDot() {
    if (POLISH.dot || !$('#hd') || document.body.classList.contains('mobile')) return; const anchor = $('#search');
    POLISH.dot = h('button.ib.syncdot', { type: 'button', title: 'Sync', 'aria-label': 'Sync', on: { click: e => { e.stopPropagation(); POLISH.details(e); } } }, h('i'));
    anchor ? anchor.before(POLISH.dot) : $('#hd').append(POLISH.dot); POLISH.poll(); POLISH.timer = setInterval(() => POLISH.poll(), 30000);
    addEventListener('online', () => POLISH.poll()); addEventListener('offline', () => POLISH.poll());
  },
  async poll() {
    let st = { tone: 'grey', text: 'Not connected to the lab', detail: '' };
    try {
      if (window.SIS_DESKTOP) { const j = await (await fetch('api/lab/status', { cache: 'no-store' })).json();
        if (j && j.ok) { const s = String(j.state || ''), msg = j.message || ''; st = !j.connected || s === 'not-connected' ? { tone: 'grey', text: 'Not connected to the lab (Settings → The lab)', detail: msg } : /error|fail/i.test(s) ? { tone: 'red', text: msg || 'The lab cloud did not answer; it will try again', detail: s } : /sync|push|pull|align|wait|retry/i.test(s) ? { tone: 'amber', text: msg || 'Syncing with the lab…', detail: s } : { tone: 'green', text: 'In step with the lab' + (j.account ? ' · ' + j.account : ''), detail: msg || s }; }
        else st = { tone: 'red', text: 'The app on this computer did not answer', detail: '' }; }
      else if (window.__sisCloud) { const S = window.__sisCloud; st = !navigator.onLine ? { tone: 'red', text: 'Offline — changes wait here until the connection is back', detail: '' } : S.user ? { tone: 'green', text: 'Signed in · synced through the lab site', detail: S.user.email || '' } : { tone: 'amber', text: 'Not signed in yet', detail: '' }; }
      else st = { tone: navigator.onLine ? 'green' : 'red', text: navigator.onLine ? 'This notebook is on this device' : 'Offline', detail: '' };
    } catch (e) { st = { tone: 'red', text: 'The app on this computer did not answer', detail: String(e.message || e) }; }
    POLISH.status = st; if (POLISH.dot) { POLISH.dot.dataset.tone = st.tone; POLISH.dot.title = 'Sync · ' + st.text; }
  },
  details(e) {
    const st = POLISH.status || { tone: 'grey', text: '…' };
    ctxMenu(e.clientX - 200, e.clientY + 10, [{ head: 'Sync · ' + st.text }, st.detail ? { head: st.detail } : null, window.SIS_DESKTOP ? { label: 'Sync now', run: () => CMD.run('sync', ['now']) } : null, { label: 'How it stands', run: () => CMD.run('sync', ['status']) }, window.SIS_DESKTOP ? { label: 'Settings → The lab', run: () => CMD.run('settings', ['The lab']) } : null, { label: 'Check again', run: () => POLISH.poll() }].filter(Boolean));
  },
  /** The hint line: a × that closes it for good. */
  hint(pane) { const el = pane && pane.hint; if (!el) return; if (settings().hintOff) { el.hidden = true; return; }
    const put = () => { if (settings().hintOff || $('.hint-x', el) || !el.childNodes.length) return; el.append(h('button.hint-x', { type: 'button', title: 'Close this line for good (⋯ → Shortcuts… shows it)', on: { click: ev => { ev.stopPropagation(); saveSettings({ hintOff: true }); el.hidden = true; toast('The hint line is gone — ⋯ → Shortcuts… lists the keys'); } } }, '×')); };
    put(); if (!el._hintX) { el._hintX = true; new MutationObserver(put).observe(el, { childList: true }); } },   // the line is repainted on every change: the × comes back each time
  shortcuts() { modal({ title: 'Shortcuts', actions: [{ label: 'Close' }], body: h('div.list', [['Ctrl+Enter', 'what a phrase is: a claim, a barrier, a question…'], ['Ctrl+W (Focus) · Alt+W', 'mark a term'], ['Ctrl+I · /cite', 'cite a paper'], ['/', 'commands in the text; on the canvas, the navigation bar'], ['@', 'name a lab member'], ['drag ●', 'connect two components; the last relation comes first'], ['Ctrl+click · lasso', 'select several; their bar does more'], ['P', 'pan; the ✎ pill for the pen'], ['Ctrl+K · Ctrl+Shift+K', 'the Atlas · the quick list'], ['Alt+← · Alt+→', 'the previous · next note'], ['Ctrl+0', 'fit'], ['Ctrl+Z · Ctrl+Shift+Z', 'undo · redo'], ['Esc', 'the bar, a popover, then what is open']].map(([k, w]) => h('div.li', h('kbd', k), h('span.t', w)))) }); },
  /** The reader's panel: chips for Mine · RM · Notes. */
  chips(ov) { const side = $('.mx-side', ov); if (!side || $('.rd-chips', side)) return; const st = ov._chips || (ov._chips = { mine: true, rm: true, notes: true });
    const apply = () => { side.classList.toggle('no-mine', !st.mine); side.classList.toggle('no-rm', !st.rm); side.classList.toggle('no-notes', !st.notes); [...chips.children].forEach(c => c.classList.toggle('on', !!st[c.dataset.k])); };
    const chips = h('div.rd-chips', [['mine', 'Mine'], ['rm', 'RM'], ['notes', 'Notes']].map(([k, l]) => h('button.at-chip.act' + (st[k] ? '.on' : ''), { 'data-k': k, type: 'button', on: { click: () => { st[k] = !st[k]; apply(); } } }, l)));
    side.prepend(chips); apply(); new MutationObserver(() => { if (!side.contains(chips)) side.prepend(chips); apply(); }).observe(side, { childList: true }); },
  recent: () => settings().insertRecent || [],
  remember(id) { const R = POLISH.recent().filter(x => x !== id); R.unshift(id); saveSettings({ insertRecent: R.slice(0, 8) }); },
};
{
  if (document.readyState === 'complete') setTimeout(() => POLISH.mountDot(), 800); else addEventListener('load', () => setTimeout(() => POLISH.mountDot(), 800));
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
