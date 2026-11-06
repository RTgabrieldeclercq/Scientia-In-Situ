/* ==========================================================================
   13q · Focus sessions. The ◎ button next to the theme toggle asks how long,
   then puts the app in full screen with the keyboard locked to it and a
   white frame around the screen until the time is up. There is no "end"
   button. If full screen is left anyway (the browser always lets you hold
   Esc, and the OS keeps Alt+Tab), the app covers itself until you return,
   and a reload or restart resumes the session.
   ========================================================================== */
const FOCUS = {
  get: () => _ls.get('focus', null),
  active() { const f = FOCUS.get(); return !!(f && f.until > Date.now()); },
  left: () => Math.max(0, ((FOCUS.get() || {}).until || 0) - Date.now()),
  fmt(ms) { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); },
  open() {
    if (FOCUS.active()) { if (!document.fullscreenElement) FOCUS.enter(); return toast('Focus until ' + fmtTime(new Date(FOCUS.get().until)) + ' — ' + FOCUS.fmt(FOCUS.left()) + ' left'); }
    let min = _ls.get('focusMin', 50);
    const custom = h('input.inp.mono', { type: 'number', min: 1, max: 600, value: min, style: { width: '90px' } });
    let chips; const until = h('span.tiny.muted'), upd = () => { min = Math.max(1, Math.min(600, +custom.value || 0)); until.textContent = 'until ' + fmtTime(new Date(Date.now() + min * 6e4)); $$('button', chips).forEach(b => b.classList.toggle('on', +b.dataset.m === min)); };
    chips = h('div.seg.fchips', [15, 25, 45, 50, 60, 90, 120].map(m => h('button', { 'data-m': m, on: { click: () => { custom.value = m; upd(); } } }, m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + m % 60 : ''))));
    custom.addEventListener('input', upd); upd();
    modal({ title: '◎ Focus session', body: h('div',
      h('p.serif', { style: { marginTop: 0 } }, 'The app goes full screen with a white frame and stays there until the time is up. There is no way to end it early from the app.'),
      chips, h('div.row', { style: { marginTop: '12px', gap: '8px' } }, h('label.f', { style: { margin: 0 } }, h('span', 'Minutes'), custom), until),
      h('p.tiny.muted', { style: { marginTop: '12px' } }, 'A browser can’t take over the whole computer: holding Esc or switching windows (Alt+Tab) still leaves full screen. If that happens, the app covers itself until you return, and every exit is counted on the session.')),
      actions: [{ label: 'Cancel' }, { label: 'Start focus', pri: true, run: () => { _ls.set('focusMin', min); FOCUS.start(min); } }] });
  },
  start(min) {
    const now = Date.now(); _ls.set('focus', { start: now, until: now + min * 6e4, min, exits: 0, away: 0 });
    FOCUS.enter(); FOCUS.paint(); toast('Focus until ' + fmtTime(new Date(now + min * 6e4)));
  },
  async enter() {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { toast('Full screen refused: ' + e.message); }
    try { if (navigator.keyboard && navigator.keyboard.lock) await navigator.keyboard.lock(); App.focusMode = true; } catch { }
    FOCUS.paint();
  },
  end() {
    const f = FOCUS.get(); _ls.set('focus', null);
    try { navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } catch { } App.focusMode = false;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    FOCUS.paint();
    if (f) { const done = Math.round((f.until - f.start) / 6e4); toast(`Focus session done — ${done} min${f.exits ? ' · left full screen ' + plural(f.exits, 'time') : ''}`, 6000);
      try { DAY.add(`Focus session — ${done} min${f.exits ? ', left full screen ' + plural(f.exits, 'time') : ''}`, null); } catch { } }
  },
  /** The frame, the countdown, and the cover shown while full screen is left mid-session. */
  paint() {
    const on = FOCUS.active(), fs = !!document.fullscreenElement;
    document.body.classList.toggle('focusing', on);
    let fr = $('#focusframe'); if (on && !fr) { fr = h('div#focusframe', h('div.ff-pill', h('span.ff-dot'), h('span.ff-t'))); document.body.append(fr); } if (!on && fr) fr.remove();
    let cv = $('#focuscover'); const need = on && !fs;
    if (need && !cv) { cv = h('div#focuscover', h('div.fc-box', h('div.fc-k', '◎ Focus session'), h('div.fc-t'), h('p', 'Full screen was left. The app stays covered until the session ends.'),
      h('button.btn.pri', { on: { click: () => FOCUS.enter() } }, 'Return to full screen'))); document.body.append(cv); }
    if (!need && cv) cv.remove();
    const b = $('#focusbtn'); if (b) { b.classList.toggle('on', on); b.title = on ? 'Focus — ' + FOCUS.fmt(FOCUS.left()) + ' left' : 'Focus session — full screen, locked to the app for a set time'; }
    FOCUS.tick();
  },
  tick() {
    if (!FOCUS.get()) return; if (!FOCUS.active()) return FOCUS.end();
    const t = FOCUS.fmt(FOCUS.left()); $$('#focusframe .ff-t, #focuscover .fc-t').forEach(x => x.textContent = t + ' left');
  },
  init() {
    const b = $('#focusbtn'); b && b.addEventListener('click', () => FOCUS.open());
    document.addEventListener('fullscreenchange', () => { const f = FOCUS.get(); if (f && FOCUS.active() && !document.fullscreenElement) { f.exits = (f.exits || 0) + 1; _ls.set('focus', f); } setTimeout(() => FOCUS.paint(), 0); });
    document.addEventListener('visibilitychange', () => { const f = FOCUS.get(); if (f && FOCUS.active() && document.hidden) { f.away = (f.away || 0) + 1; _ls.set('focus', f); } });
    window.addEventListener('beforeunload', e => { if (FOCUS.active()) { e.preventDefault(); e.returnValue = ''; } });
    // Ctrl+. (the quick full screen) can't end a session
    const tf = App.toggleFocus.bind(App); App.toggleFocus = () => { if (FOCUS.active()) { if (!document.fullscreenElement) FOCUS.enter(); return toast('Focus session — ' + FOCUS.fmt(FOCUS.left()) + ' left'); } return tf(); };
    setInterval(() => FOCUS.tick(), 1000);
    if (FOCUS.get() && !FOCUS.active()) FOCUS.end(); else FOCUS.paint();
  },
};
