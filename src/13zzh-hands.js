/* ==========================================================================
   13zzh · Hands, pen, pan and zoom (V3.949, Gabe's SiS Shaping, Phase D).
   • Pen settings follow the hand: choosing Pen or Highlighter opens the ink
     bar; Move, Zoom or Lasso closes it (if this opened it).
   • Pen zooms in: switching to Pen or Highlighter goes to 200 % when the
     note was under it; leaving them returns to 100 % only if that switch
     changed it.
   • P = Move (pan), outside a text.
   • Edge hover-pan (V3.959): in Move, with a mouse or a hovering pen (not
     fingers). The border is a line 48 px in from each edge of the note,
     drawn as the pointer comes near it. Nothing moves before the pointer
     reaches it. Past it the note pans that way: barely past, slowly; the
     further the pointer goes toward the edge, the faster (30 → 2400 px/s,
     rising with depth^2.6); held still, the speed holds; back inside the
     line, it stops at once. Off the note's edge (a little, not onto a
     control) it keeps the most speed.
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
  BORDER: 48, NEAR: 40, VMIN: 30, VMAX: 2400, POW: 2.6, last: null, before: null, autoBar: false, zoomBefore: null, guard: false, pan: { raf: 0, at: 0, vx: 0, vy: 0, P: null },
  hand: () => INK.mouse ? (INK.tool === 'eraser' ? 'eraser' : INK.tool) : 'move',
  userAt: 0, recent: () => Date.now() - HANDS.userAt < 2000,
  pane: () => { const ps = App.panes ? App.panes() : []; return ps.includes(App.pane) ? App.pane : ps[0] || null; },
  /** Called after every ink-bar paint (the hand changed, or not). */
  follow() {
    if (HANDS.guard) return; const h = HANDS.hand(); if (h === HANDS.last) return; const prev = HANDS.last; HANDS.last = h; if (prev && !/^(pen|hl)$/.test(prev)) HANDS.before = prev; if (h !== 'move') HANDS.quiet();
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
  /* ---------- edge hover-pan (V3.959) ---------- */
  /** How fast past the border: depth 0 → VMIN, the full border → VMAX, rising ever faster between (px a second). */
  speed: d => d <= 0 ? 0 : HANDS.VMIN + (HANDS.VMAX - HANDS.VMIN) * Math.pow(Math.min(1, d / HANDS.BORDER), HANDS.POW),
  hover(e) {
    const S = HANDS.pan, B = HANDS.BORDER, t = e.target;
    // the note being pushed stays the one pushed while the pointer is a little past its edge (over the header, the other pane…)
    let P = null; if (S.P && S.P.el.isConnected) { const q = S.P.rect(); if (e.clientX > q.left - B && e.clientX < q.right + B && e.clientY > q.top - B && e.clientY < q.bottom + B) P = S.P; }
    if (!P) { const host = t && t.closest && t.closest('.canvas-host'), pane = host && host._dv; P = pane && pane.paper; }
    if (!P || !e.isTrusted || e.pointerType === 'touch' || e.buttons || HANDS.hand() !== 'move' || $('.pop') || $('.ovl') || (t.closest && t.closest('.ink-bar,.nav,.embed-max,.fbar,.insp,.dock,.ctools,.slash-menu'))) { HANDS.border(null); return HANDS.stopPan(); }
    const r = P.rect(), x = e.clientX - r.left, y = e.clientY - r.top, w = r.width, hh = r.height, off = x < 0 || y < 0 || x > w || y > hh;
    if (off && (P !== S.P || (t.closest && t.closest('button,a,input,select,textarea,label,[contenteditable="true"],[role="tab"]')))) { HANDS.border(null); return HANDS.stopPan(); }   // off the note: only a pan already going carries on, and never over a control
    // how far past the border line on each axis (the nearer edge of each); beyond the edge it is the most
    const lx = x < w / 2, ty = y < hh / 2, px = lx ? B - x : x - (w - B), py = ty ? B - y : y - (hh - B);
    HANDS.border(P, { x, y, w, h: hh, lx, ty, px, py });
    if (px <= 0 && py <= 0) return HANDS.stopPan();   // inside the line: nothing moves, and backing out stops at once
    S.vx = (lx ? 1 : -1) * HANDS.speed(px); S.vy = (ty ? 1 : -1) * HANDS.speed(py); S.P = P;
    if (!S.raf) { S.at = performance.now(); S.raf = requestAnimationFrame(HANDS.step); }
  },
  step(t) { const S = HANDS.pan; if (!S.P || !S.P.el.isConnected) { S.raf = 0; S.P = null; return; }
    const dt = Math.min(50, Math.max(0, t - S.at)) / 1000; S.at = t;   // by the clock, so a 120 Hz screen pans no faster than a 60 Hz one
    S.P.view.x += S.vx * dt; S.P.view.y += S.vy * dt; S.P.apply(); S.raf = requestAnimationFrame(HANDS.step); },
  stopPan() { const S = HANDS.pan; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; S.vx = S.vy = 0; S.P = null; },
  /** The border: its line on the near side(s) fades in over the last NEAR px before it; past it, the band to the edge tints
      as much as the speed. border(null) hides it. */
  border(P, g) {
    const was = HANDS._bP; if (was && (!P || was !== P) && was._eb) was._eb.hidden = true; HANDS._bP = P || null; if (!P) return;
    const B = HANDS.BORDER, N = HANDS.NEAR, S4 = ['l', 'r', 't', 'b']; let el = P._eb;
    if (!el || !el.isConnected) { el = P._eb = h('div.edge-border'); el._p = {}; S4.forEach(s => { const line = h('i.eb-line.eb-' + s), band = h('b.eb-band.eb-' + s); el._p[s] = [line, band]; el.append(line, band); }); el.style.setProperty('--eb', B + 'px'); P.el.append(el); }
    const near = d => d > 0 ? 1 : clamp(1 + d / N, 0, 1), deep = d => d > 0 ? Math.min(1, d / B) : 0, side = { l: g.lx ? g.px : -1e9, r: g.lx ? -1e9 : g.px, t: g.ty ? g.py : -1e9, b: g.ty ? -1e9 : g.py };
    let any = false; for (const s of S4) { const n = near(side[s]); any = any || n > 0; el._p[s][0].style.opacity = n.toFixed(2); el._p[s][1].style.opacity = deep(side[s]).toFixed(2); }
    el.hidden = !any;
  },
  /** The pointer has gone (out of the window, a press, the hand changed): no pan, no border. */
  quiet() { HANDS.stopPan(); HANDS.border(null); },
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
  document.addEventListener('pointermove', e => { try { HANDS.hover(e); } catch (x) { HANDS.quiet(); } }, true);
  ['pointerdown', 'pointerleave', 'pointercancel', 'blur'].forEach(t => addEventListener(t, HANDS.quiet, true)); document.documentElement.addEventListener('mouseleave', HANDS.quiet);
  // zoom to 1 % in notes; flat tiles below 10 %
  const mp = makePaper; makePaper = function (host, opts) { const p = mp.apply(this, arguments); if (host && host.classList && host.classList.contains('canvas-host') && !(opts && opts.minZ != null)) p.o.minZ = .01; return p; };
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { const r = ap.apply(this, arguments); try { const host = this.el.closest('.canvas-host'); if (host) host.classList.toggle('far', this.view.z < .1); } catch (e) { } return r; };
  // the pen's button, and its Settings
  if (document.readyState === 'complete') setTimeout(() => HANDS.watchPen(), 1500); else addEventListener('load', () => setTimeout(() => HANDS.watchPen(), 1500));
  setTimeout(() => { if (typeof SettingsView === 'undefined' || !SYNC.local) return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = HANDS.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { console.warn('[hands]', e); }
    return out; }; }, 0);
}
