/* ==========================================================================
   13zzh · Hands, pen, pan and zoom (V3.949, Gabe's SiS Shaping, Phase D).
   • Pen settings follow the hand: choosing Pen or Highlighter opens the ink
     bar; Move, Zoom or Lasso closes it (if this opened it).
   • Pen zooms in: switching to Pen or Highlighter goes to 200 % when the
     note was under it; leaving them returns to 100 % only if that switch
     changed it.
   • P = Move (pan), outside a text.
   • Edge hover-pan: in Move, a mouse or a hovering pen within 48 px of the
     window's edge pans the note — slow to start, faster the harder it is
     pushed (2 + 22·e² px a frame), eased in over 150 ms. Not fingers.
   • Zoom reaches 1 % in notes; below 10 % the boxes are flat tiles.
   • The pen's button (on the computer that runs the app):
     pen-button/ScientiaPen.exe, assigned in Windows Settings → Pen as the
     shortcut button's app, tells this computer's server; the app waits for
     presses (api/pen-button?wait=1). Not in Pen → Pen; in Pen → the hand
     you had before it (Move when there was none).
   • Esc, one stack: the navigation bar, then a popover; dialogs, the strip,
     the maximised views, the slash menu and the reader keep their own.
   ========================================================================== */
const HANDS = {
  ZONE: 48, last: null, before: null, autoBar: false, zoomBefore: null, guard: false, pan: { raf: 0, t0: 0, dx: 0, dy: 0, P: null },
  hand: () => INK.mouse ? (INK.tool === 'eraser' ? 'eraser' : INK.tool) : 'move',
  userAt: 0, recent: () => Date.now() - HANDS.userAt < 2000,
  pane: () => { const ps = App.panes ? App.panes() : []; return ps.includes(App.pane) ? App.pane : ps[0] || null; },
  /** Called after every ink-bar paint (the hand changed, or not). */
  follow() {
    if (HANDS.guard) return; const h = HANDS.hand(); if (h === HANDS.last) return; const prev = HANDS.last; HANDS.last = h; if (prev && !/^(pen|hl)$/.test(prev)) HANDS.before = prev;
    const pane = HANDS.pane(), P = pane && pane.paper, pen = /^(pen|hl)$/.test(h), wasPen = /^(pen|hl)$/.test(prev || '');
    HANDS.guard = true;
    try {
      if (pen && !INK.shown) { INK.shown = true; HANDS.autoBar = true; _ls.set('inkBar', true); INK.paintBars(); }
      if (!pen && INK.shown && HANDS.autoBar && h !== 'eraser') { INK.shown = false; HANDS.autoBar = false; _ls.set('inkBar', false); INK.paintBars(); }
      if (P && prev != null && HANDS.recent()) {   // the person's own switch (a key, a tap), never a script's
        if (pen && !wasPen && P.view.z < 2) { HANDS.zoomBefore = P.view.z; P.zoomAt(2); }
        else if (!pen && wasPen && HANDS.zoomBefore != null) { HANDS.zoomBefore = null; P.zoomAt(1); }
      }
    } finally { HANDS.guard = false; }
  },
  /* ---------- edge hover-pan ---------- */
  hover(e) {
    const host = e.target && e.target.closest && e.target.closest('.canvas-host'), pane = host && host._dv, P = pane && pane.paper;
    if (!P || !e.isTrusted || e.pointerType === 'touch' || e.buttons || HANDS.hand() !== 'move' || $('.pop') || $('.ovl') || e.target.closest('.ink-bar,.nav,.embed-max,.fbar,.insp,.dock,.ctools,.slash-menu')) return HANDS.stopPan();
    const r = P.rect(), Z = HANDS.ZONE, x = e.clientX - r.left, y = e.clientY - r.top; if (x < 0 || y < 0 || x > r.width || y > r.height) return HANDS.stopPan();
    const ex = x < Z ? (Z - x) / Z : x > r.width - Z ? (x - (r.width - Z)) / Z : 0, ey = y < Z ? (Z - y) / Z : y > r.height - Z ? (y - (r.height - Z)) / Z : 0;
    if (!ex && !ey) return HANDS.stopPan();
    const sp = v => v ? 2 + 22 * v * v : 0, S = HANDS.pan; S.dx = (x < Z ? 1 : -1) * sp(ex); S.dy = (y < Z ? 1 : -1) * sp(ey); S.P = P;
    if (!S.raf) { S.t0 = performance.now(); S.raf = requestAnimationFrame(HANDS.step); }
  },
  step(t) { const S = HANDS.pan; if (!S.P || !S.P.el.isConnected) { S.raf = 0; S.P = null; return; } const k = Math.min(1, (t - S.t0) / 150); S.P.view.x += S.dx * k; S.P.view.y += S.dy * k; S.P.apply(); S.raf = requestAnimationFrame(HANDS.step); },
  stopPan() { if (HANDS.pan.raf) cancelAnimationFrame(HANDS.pan.raf); HANDS.pan.raf = 0; HANDS.pan.P = null; },
  /* ---------- the pen's button (desktop) ---------- */
  seen: 0, presses: 0,
  async watchPen() {
    if (!SYNC.local) return;   // the button reaches the server on the computer that runs the app, so only a window there listens
    for (;;) { try { const j = await (await fetch('api/pen-button?wait=1&since=' + HANDS.seen, { cache: 'no-store' })).json(); if (j && j.pressed > HANDS.seen) { HANDS.seen = j.pressed; HANDS.penButton(); } else if (!j || !j.ok) await new Promise(r => setTimeout(r, 2000)); }
      catch (e) { await new Promise(r => setTimeout(r, 3000)); } }
  },
  penButton() {
    HANDS.presses++; const h = HANDS.hand(); let to = 'pen';
    if (/^(pen|hl)$/.test(h)) { to = HANDS.before; if (!to || /^(pen|hl)$/.test(to)) to = 'move'; }
    CMD.hand(to); toast('Pen button · ' + (to === 'move' ? 'Move' : to === 'hl' ? 'Highlighter' : to[0].toUpperCase() + to.slice(1)), 1200); document.dispatchEvent(new CustomEvent('pen-button', { detail: { to } }));
  },
  /** Settings → Pen (desktop): the steps, and a test that lights up on the next press. */
  settingsUI() {
    const light = h('span.pill', 'Waiting for a press…'); document.addEventListener('pen-button', e => { light.textContent = 'Pressed · ' + e.detail.to; light.classList.add('ok'); });
    return h('div.pen-settings', h('div.sec'), h('div.sec-h', h('h2', 'The pen’s button'), h('span.k', 'this computer')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'The Slim Pen’s tail button is a Windows setting: by default it opens OneNote. Point it at Scientia instead and it switches to the pen; pressed again in Pen, it goes back to the hand you had before.'),
      h('ol', { style: { margin: '6px 0 8px 18px', fontSize: '13.5px' } }, h('li', 'Run ', h('code', 'pen-button\\Build ScientiaPen.cmd'), ' in the app folder once: it builds ', h('code', 'ScientiaPen.exe'), ' next to it with the C# compiler Windows ships.'),
        h('li', 'Windows Settings → Bluetooth & devices → Pen & Windows Ink → Pen shortcut button → Single click (or the one you press).'),
        h('li', 'Choose “Launch a classic app” and browse to ', h('code', 'pen-button\\ScientiaPen.exe'), '.'),
        h('li', 'Press the button: ', light)));
  },
};
{
  const pb = INK.paintBars; INK.paintBars = function () { const r = pb.apply(this, arguments); try { HANDS.follow(); } catch (e) { console.warn('[hands]', e); } return r; };
  ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, e => { if (e.isTrusted) HANDS.userAt = Date.now(); }, true));
  // P = Move, outside a text; Esc: the bar, then a popover (dialogs, the strip, the maximised views keep their own)
  const typing = e => e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],math-field');
  document.addEventListener('keydown', e => {
    if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e) && !$('.ovl') && !$('.pop') && HANDS.pane() && !(typeof NAV !== 'undefined' && NAV.awake)) { e.preventDefault(); e.stopPropagation(); CMD.hand('move'); return; }
    if (e.key === 'Escape' && !$('.ovl') && !$('.strip') && !$('.embed-max:not(.rd-docked)') && !$('.palette') && !(typeof SLASH !== 'undefined' && SLASH.st) && !(typeof HTMLX !== 'undefined' && HTMLX._pick)) {
      if (typeof NAV !== 'undefined' && NAV.awake) { e.preventDefault(); e.stopPropagation(); return NAV.sleep(); }
      if ($('.pop')) { e.preventDefault(); e.stopPropagation(); return closePop(); } }
  }, true);
  // edge hover-pan
  document.addEventListener('pointermove', e => { try { HANDS.hover(e); } catch (x) { HANDS.stopPan(); } }, true);
  ['pointerdown', 'pointerleave', 'pointercancel', 'blur'].forEach(t => addEventListener(t, HANDS.stopPan, true)); document.documentElement.addEventListener('mouseleave', HANDS.stopPan);
  // zoom to 1 % in notes; flat tiles below 10 %
  const mp = makePaper; makePaper = function (host, opts) { const p = mp.apply(this, arguments); if (host && host.classList && host.classList.contains('canvas-host') && !(opts && opts.minZ != null)) p.o.minZ = .01; return p; };
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { const r = ap.apply(this, arguments); try { const host = this.el.closest('.canvas-host'); if (host) host.classList.toggle('far', this.view.z < .1); } catch (e) { } return r; };
  // the pen's button, and its Settings
  if (document.readyState === 'complete') setTimeout(() => HANDS.watchPen(), 1500); else addEventListener('load', () => setTimeout(() => HANDS.watchPen(), 1500));
  setTimeout(() => { if (typeof SettingsView === 'undefined' || !SYNC.local) return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = HANDS.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { console.warn('[hands]', e); }
    return out; }; }, 0);
}
