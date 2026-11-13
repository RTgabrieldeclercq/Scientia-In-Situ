/* ==========================================================================
   13zzh · Hands, pen, pan and zoom (V3.949, Gabe's SiS Shaping, Phase D).
   • Pen settings follow the hand: choosing Pen or Highlighter opens the ink
     bar; Move, Zoom or Lasso closes it (if this opened it). With the ✎ pill
     expanded, the bar sits beside the pill.
   • Pen zooms in: switching to Pen or Highlighter goes to 200 % when the
     note was under it; leaving them returns to 100 % only if that switch
     changed it.
   • P = Move (pan), outside a text.
   • Edge hover-pan (V3.960): in Move, with a mouse or a hovering pen (not
     fingers). The edge of the note is where it starts: nothing moves
     before the pointer touches it, and then the note pans that way at
     60 px/s. Every bit of movement on past the edge adds speed (a push of
     360 px reaches 2400 px/s, rising with push²); held still, the speed
     holds; any move back stops it at once. Past the edge the pointer
     goes on over the header, the sleeping navigation bar or the other
     pane (up to 120 px); over a control there it goes on only while the
     pointer moves on outward, and resting on one or sliding along it
     (reaching for it) stops it. Where it can go no further (the screen's edge)
     or leaves the window, the desktop app reads the mouse's own movement
     from Windows (rawmouse.py, api/edge-push) and the push goes on; where
     nothing can be read (the web, a pen), the speed rises while the
     pointer stays at the edge.
   • V3.980 (Gabe: "The edge pan still needs refinement and should only work
     in full screen"): only in full screen (Focus mode, or the browser's own
     F11), where the note's edges are the screen's: it starts at the screen's
     very edge, after the pointer has rested there DWELL ms (a flick to the
     edge, or overshooting a button, moves nothing), eases in over EASE ms,
     and stops the moment the pointer leaves the edge. Not over the pills,
     the ink bar, the dock or other controls. In a window it does nothing.
   • Zoom reaches 1 % in notes; below 10 % the boxes are flat tiles.
   • The pen's button (desktop): pen-button/ScientiaPen.exe, assigned in
     Windows Settings → Pen as the shortcut button's app, tells this
     computer's server; the app waits for presses (api/pen-button?wait=1).
     Not in Pen → Pen; in Pen → the other mode, what a double tap on ✎ does.
   • Esc, one stack: the navigation bar, then a popover; dialogs, the strip,
     the maximised views, the slash menu and the reader keep their own.
   ========================================================================== */
const HANDS = {
  EDGE: 2, NEAR: 40, ROOM: 120, RANGE: 360, BACK: 2, BAND: 36, VMIN: 60, VMAX: 2400, POW: 2, HOLD: 240, REST: 150, DWELL: 140, EASE: 260, last: null, autoBar: false, zoomBefore: null, guard: false,
  pan: { raf: 0, at: 0, vx: 0, vy: 0, P: null, ax: null, ay: null, lx: null, ly: null, in: null, out: false, ptype: '', feed: null, raw: null, busy: false, asked: 0, stuck: false, ctlAt: 0 },
  hand: () => window.SIS_LAB && SIS_LAB.handNow ? SIS_LAB.handNow() : (INK.mouse ? (INK.tool === 'eraser' ? 'eraser' : INK.tool) : 'move'),
  userAt: 0, recent: () => Date.now() - HANDS.userAt < 2000,
  pane: () => { const ps = App.panes ? App.panes() : []; return ps.includes(App.pane) ? App.pane : ps[0] || null; },
  /** Called after every ink-bar paint (the hand changed, or not). */
  follow() {
    if (HANDS.guard) return; const h = HANDS.hand(); HANDS.placeBar(); if (h === HANDS.last) return; const prev = HANDS.last; HANDS.last = h; if (h !== 'move') HANDS.quiet();
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
    HANDS.placeBar();
  },
  /** The ink bar beside the expanded ✎ pill; back to its corner when the pill closes. */
  placeBar() {
    App.panes().forEach(p => { const host = p.host; if (!host) return; const bar = $(':scope > .ink-bar', host), pill = $(':scope > .lab-pills > .lab-pill-hand.open', host);
      if (!bar) return; if (!pill) { if (bar.dataset.beside) { delete bar.dataset.beside; bar.style.left = bar.style.top = bar.style.right = ''; } return; }
      const H = host.getBoundingClientRect(), R = pill.getBoundingClientRect(), bw = bar.offsetWidth || 320, bh = bar.offsetHeight || 44, onRight = R.left + R.width / 2 > H.left + H.width / 2;
      const left = onRight ? Math.max(8, R.left - H.left - bw - 160) : Math.min(H.width - bw - 8, R.right - H.left + 160), top = Math.max(8, Math.min(H.height - bh - 8, R.top - H.top + R.height / 2 - bh / 2));
      bar.dataset.beside = '1'; bar.style.left = Math.round(left) + 'px'; bar.style.top = Math.round(top) + 'px'; bar.style.right = 'auto'; });
  },
  /* ---------- edge hover-pan (V3.960) ---------- */
  /** How fast for a push of p px past the edge: touching it → VMIN, RANGE px → VMAX, rising ever faster between (px a second). */
  speed: p => HANDS.VMIN + (HANDS.VMAX - HANDS.VMIN) * Math.pow(Math.min(1, Math.max(0, p) / HANDS.RANGE), HANDS.POW),
  /** This computer's server reads the mouse (api/edge-push): the desktop app. */
  desk: () => !!window.SIS_DESKTOP,
  /** V3.980: full screen — Focus mode (the Fullscreen API), or the browser's own (F11: the window is the screen). */
  full: () => !!document.fullscreenElement || (innerWidth > 0 && screen.width - innerWidth <= 2 && screen.height - innerHeight <= 2),
  /** The note at the screen's edge where the pointer is: the one under it, else the nearest (the header above a note, a split's side). */
  paneAt(x, y) { let best = null, bd = 1e9; (App.panes ? App.panes() : []).forEach(p => { const P = p.paper; if (!P || !P.el.isConnected) return; const r = P.rect(), dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0, dd = dx + dy; if (dd < bd) { bd = dd; best = P; } }); return best; },
  hover(e) {
    const S = HANDS.pan, t = e.target, x = e.clientX, y = e.clientY;
    S.lx = x; S.ly = y; S.out = false;
    if (!HANDS.full() || !e.isTrusted || e.pointerType === 'touch' || e.buttons || HANDS.hand() !== 'move' || $('.pop') || $('.ovl') || (t.closest && t.closest('.bw-mk,.lab-pills,.ink-bar,.nav:not(.asleep),.embed-max,.fbar,.insp,.dock,.ctools,.slash-menu,.webcap-wait,.iter-slides'))) return HANDS.quiet();
    S.ptype = e.pointerType;
    // in full screen the note's edges are the screen's: the push is at the screen's very edge (−1 left/top, 1 right/bottom)
    const E = HANDS.EDGE, sx = x <= E ? -1 : x >= innerWidth - 1 - E ? 1 : 0, sy = y <= E ? -1 : y >= innerHeight - 1 - E ? 1 : 0;
    const P = S.P && S.P.el.isConnected ? S.P : HANDS.paneAt(x, y);
    if (!P) return HANDS.quiet();
    if (!sx && !sy) { HANDS.stopPan(); return HANDS.border(P, x, y); }   // off the edge: it stops at once
    const keep = (A, s) => s ? (A && A.s === s ? A : { s, hi: 0, ex: 0, top: 0, pin: true }) : null;
    S.ax = keep(S.ax, sx); S.ay = keep(S.ay, sy); S.P = P;
    // a rest at the edge first (a flick to it, or overshooting a button there, moves nothing); the pointer resting still sends no
    // more moves, so a timer starts it
    if (!S.edgeAt) { S.edgeAt = performance.now(); clearTimeout(S.dwellT); S.dwellT = setTimeout(() => { if (S.edgeAt && (S.ax || S.ay) && S.P) HANDS.go(); }, HANDS.DWELL); }
    else if (performance.now() - S.edgeAt >= HANDS.DWELL) HANDS.go();
    HANDS.border(P, x, y);
  },
  go() {
    const S = HANDS.pan, v = A => A ? -A.s * HANDS.speed(A.hi + A.ex) : 0; S.vx = v(S.ax); S.vy = v(S.ay);
    if (!S.raf) { S.at = S.t0 = performance.now(); S.raf = requestAnimationFrame(HANDS.step); }
    if (S.feed == null && S.ptype === 'mouse' && HANDS.desk()) HANDS.ask(S.at);   // learn early whether this computer reads the mouse
  },
  step(t) {
    const S = HANDS.pan; S.raf = 0; if (!S.P || !S.P.el.isConnected || (!S.ax && !S.ay) || (S.ctlAt && t - S.ctlAt > HANDS.REST)) return HANDS.quiet();
    const dt = Math.min(50, Math.max(0, t - S.at)) / 1000; S.at = t;   // by the clock, so a 120 Hz screen pans no faster than a 60 Hz one
    // where the pointer can go no further (the screen's edge) or has left the window, the push goes on with the mouse's own
    // movement (the desktop app), else (the web, a pen) with the time it stays there
    const stuck = [S.ax, S.ay].filter(A => A && (A.pin || S.out));
    if (stuck.length && !S.stuck) S.raw = null;   // counting starts afresh: the way here was already counted by the pointer
    S.stuck = stuck.length > 0;
    if (S.stuck) {
      if (S.ptype === 'mouse' && S.feed !== false && HANDS.desk()) HANDS.ask(t);
      else if (S.out) return HANDS.quiet();
      else stuck.forEach(A => { A.ex += HANDS.HOLD * dt; A.top = A.ex; });
    }
    const ease = Math.min(1, Math.max(0, t - (S.t0 || t)) / HANDS.EASE), v = A => A ? -A.s * HANDS.speed(A.hi + A.ex) * ease : 0; S.vx = v(S.ax); S.vy = v(S.ay);   // V3.980: eases in
    S.P.view.x += S.vx * dt; S.P.view.y += S.vy * dt; S.P.apply();
    if (S.stuck) HANDS.border(S.P, S.lx, S.ly);
    S.raf = requestAnimationFrame(HANDS.step);
  },
  ask(t) {
    const S = HANDS.pan; if (S.busy || t - S.asked < 30) return; S.busy = true; S.asked = t;
    fetch('api/edge-push', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => { S.busy = false; HANDS.feed(j); });
  },
  /** This computer's answer: the mouse's movement since the last one counts on each axis stuck at the window's limit (or out of
      the window): toward the edge as more push, back from it as a stop. */
  feed(j) {
    const S = HANDS.pan; if (!j || !j.ok) { S.feed = false; return; } S.feed = true;
    const last = S.raw; S.raw = { x: +j.x || 0, y: +j.y || 0 }; if (!last || !S.P) return;   // the first answer is where counting starts
    const k = 1 / (window.devicePixelRatio || 1);
    for (const n of ['x', 'y']) {
      const A = n === 'x' ? S.ax : S.ay; if (!A || !(A.pin || S.out)) continue;
      A.ex = Math.max(0, A.ex + A.s * (S.raw[n] - last[n]) * k); A.top = Math.max(A.top, A.ex);
      if (A.ex < A.top - HANDS.BACK) { if (n === 'x') S.ax = null; else S.ay = null; }
    }
    if (!S.ax && !S.ay) HANDS.quiet();
  },
  /** The pointer left the window. Through an edge being pushed, with this computer reading the mouse, the push goes on (onto the
      taskbar, another screen); anywhere else everything stops. */
  leave(e) {
    const S = HANDS.pan, E = HANDS.EDGE, thru = (A, v, size) => A && (A.s < 0 ? v <= E : v >= size - E) ? A : null;
    const ax = thru(S.ax, e.clientX, innerWidth), ay = thru(S.ay, e.clientY, innerHeight);
    if (S.raf && (ax || ay) && S.ptype === 'mouse' && S.feed !== false && HANDS.desk()) { S.ax = ax; S.ay = ay; S.out = true; return; }
    HANDS.quiet();
  },
  stopPan() { const S = HANDS.pan; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; S.vx = S.vy = 0; S.P = null; S.ax = S.ay = null; S.raw = null; S.out = false; S.stuck = false; S.ctlAt = 0; S.edgeAt = 0; clearTimeout(S.dwellT); },
  /** The edge: its line on the near side(s) fades in over the last NEAR px before the screen's edge; while pushed, a band along it tints
      with the push. border(null) hides it. */
  border(P, x, y) {
    const was = HANDS._bP; if (was && (!P || was !== P) && was._eb) was._eb.hidden = true; HANDS._bP = P || null; if (!P) return;
    const S4 = ['l', 'r', 't', 'b']; let el = P._eb;
    if (!el || !el.isConnected) { el = P._eb = h('div.edge-border'); el._p = {}; S4.forEach(s => { const line = h('i.eb-line.eb-' + s), band = h('b.eb-band.eb-' + s); el._p[s] = [line, band]; el.append(line, band); }); el.style.setProperty('--eb', HANDS.BAND + 'px'); P.el.append(el); }
    el.style.inset = '0px';   // the note's own edges (in full screen, the screen's but for the header above)
    const S = HANDS.pan, E = HANDS.EDGE, d = { l: x, r: innerWidth - 1 - x, t: y, b: innerHeight - 1 - y };
    const push = (A, s) => A && A.s === s && S.raf ? Math.max(.2, Math.min(1, (A.hi + A.ex) / HANDS.RANGE)) : 0;
    const deep = { l: push(S.ax, -1), r: push(S.ax, 1), t: push(S.ay, -1), b: push(S.ay, 1) }, nearer = { l: d.l < d.r, r: d.r <= d.l, t: d.t < d.b, b: d.b <= d.t };
    let any = false;
    for (const s of S4) { const n = deep[s] ? 1 : nearer[s] ? clamp(1 - (d[s] - E) / HANDS.NEAR, 0, 1) : 0; any = any || n > 0;
      el._p[s][0].style.opacity = n.toFixed(2); el._p[s][1].style.opacity = deep[s].toFixed(2); }
    el.hidden = !any;
  },
  /** The pointer has gone (a press, the window lost focus, the hand changed): no pan, no edge. */
  quiet() { HANDS.stopPan(); HANDS.border(null); },
  /* ---------- the pen's button (desktop) ---------- */
  seen: 0, presses: 0,
  async watchPen() {
    if (!window.SIS_DESKTOP) return;
    for (;;) { try { const j = await (await fetch('api/pen-button?wait=1&since=' + HANDS.seen, { cache: 'no-store' })).json(); if (j && j.pressed > HANDS.seen) { HANDS.seen = j.pressed; HANDS.penButton(); } else if (!j || !j.ok) await new Promise(r => setTimeout(r, 2000)); }
      catch (e) { await new Promise(r => setTimeout(r, 3000)); } }
  },
  penButton() {
    HANDS.presses++; const h = HANDS.hand(); let to = 'pen';
    if (/^(pen|hl)$/.test(h)) { const LP = window.SIS_LAB && SIS_LAB.pills; to = LP && LP.last; if (!to || to === h || /^(pen|hl)$/.test(to)) to = 'move'; }
    CMD.hand(to); toast('Pen button · ' + (to === 'move' ? 'Move' : to === 'hl' ? 'Highlighter' : to[0].toUpperCase() + to.slice(1)), 1200); document.dispatchEvent(new CustomEvent('pen-button', { detail: { to } }));
  },
  /** Settings → Pen (desktop): the steps, and a test that lights up on the next press. */
  settingsUI() {
    const light = h('span.pill', 'Waiting for a press…'); document.addEventListener('pen-button', e => { light.textContent = 'Pressed · ' + e.detail.to; light.classList.add('ok'); });
    return h('div.pen-settings', h('div.sec'), h('div.sec-h', h('h2', 'The pen’s button'), h('span.k', 'this computer')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'The Slim Pen’s tail button is a Windows setting: by default it opens OneNote. Point it at Scientia instead and it switches to the pen; pressed again in Pen, it goes to the other mode (what a double tap on ✎ does).'),
      h('ol', { style: { margin: '6px 0 8px 18px', fontSize: '13.5px' } }, h('li', 'Windows Settings → Bluetooth & devices → Pen & Windows Ink → Pen shortcut button → Single click (or the one you press).'),
        h('li', 'Choose “Launch a classic app” and browse to the app folder’s ', h('code', 'pen-button\\ScientiaPen.exe'), ' (the installer builds it; if it is missing, run ', h('code', 'pen-button\\Build ScientiaPen.cmd'), ' once).'),
        h('li', 'Press the button: ', light)));
  },
};
{
  const pb = INK.paintBars; INK.paintBars = function () { const r = pb.apply(this, arguments); try { HANDS.follow(); } catch (e) { console.warn('[hands]', e); } return r; };
  ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, e => { if (e.isTrusted) HANDS.userAt = Date.now(); }, true));
  document.addEventListener('click', () => setTimeout(() => HANDS.placeBar(), 60), true);
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
  ['pointerdown', 'pointercancel'].forEach(t => addEventListener(t, HANDS.quiet, true)); addEventListener('blur', e => { if (e.target === window) HANDS.quiet(); });
  document.documentElement.addEventListener('mouseleave', e => { try { HANDS.leave(e); } catch (x) { HANDS.quiet(); } });   // the window itself, not each element left
  // zoom to 1 % in notes; flat tiles below 10 %
  const mp = makePaper; makePaper = function (host, opts) { const p = mp.apply(this, arguments); if (host && host.classList && host.classList.contains('canvas-host') && !(opts && opts.minZ != null)) p.o.minZ = .01; return p; };
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { const r = ap.apply(this, arguments); try { const host = this.el.closest('.canvas-host'); if (host) { const f = host.classList.contains('far'); host.classList.toggle('far', f ? this.view.z < .11 : this.view.z < .09); } } catch (e) { } return r; };   // V3.980: not at a line a zoom rests on
  // the pen's button, and its Settings
  if (document.readyState === 'complete') setTimeout(() => HANDS.watchPen(), 1500); else addEventListener('load', () => setTimeout(() => HANDS.watchPen(), 1500));
  setTimeout(() => { if (typeof SettingsView === 'undefined' || !window.SIS_DESKTOP) return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Keys'), sec = h2 && h2.closest('.sec-h'); const ui = HANDS.settingsUI(); if (sec) sec.before(ui); else out.append(ui); } catch (e) { console.warn('[hands]', e); }
    return out; }; }, 0);
}
