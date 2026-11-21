/* ==========================================================================
   20g · Keymap — rebind the keys a person really presses
   (Gabe, 20 Nov 2026: "Have the option for users to customize shortcut keys
   while on canvas or in lab notebook. Ones that are taken by the browser or
   another should be brought up and provide alternative of Alt+key the user
   wanted.")
   The handlers used to test their keys in place (mod && k === 'k'). The ones a
   person presses most now ask one lookup, KEYS.is(e, 'search'): the action's id
   in, "is this the key event of its binding" out — the person's binding when
   there is one (settings().keymap = { actionId: 'Alt+K' }, synced like every
   other setting), the default when not. structure and term keep their old
   places (settings().structKey / termKey) so nothing set before moves.
   • KEYS.ACTS is the list: app-wide (search, palette, switcher, capture, new
     note, undo, redo, Focus mode, back, forward, the command bar, ?), on the
     paper (new component, the Move tool, fit, mark a moment while recording)
     and the structure and term keys.
   • A combination is a string, "Ctrl+Shift+Z": Ctrl (Cmd counts as Ctrl),
     Alt, Shift, then the key — letters by what they are (the physical key when
     Alt makes another character), named keys (Enter, Esc, ArrowLeft, F5…).
   • KEYS.check(spec, id) says whether a combination may be taken: taken by
     another action of the app or by a fixed shortcut of the list (SHORT), by
     the browser (a table: tabs, windows, address bar, reload, history, view
     source, developer tools, zoom, F-keys…), by the computer (Alt+Tab, Alt+F4…),
     or a letter that would only be typed. It never accepts a conflict, and when
     a conflict is found it offers Alt+<same key>, then Alt+Shift+, Ctrl+Alt+…:
     the first one that is free, as a one-click choice.
   • KEYS.box(id) is the capture box a row of the shortcuts list opens ("Change"):
     press the new combination; Esc cancels; a free one is taken at once, a
     conflict is explained with the offer. It listens on window in the capture
     phase, so it hears the keys before every handler of the app does — in the
     page on its own and inside a frame alike (each document
     hears its own keys; the box focuses itself so they arrive).
   • Settings → Features → Shortcuts: "Let me change keys" (off: every key is
     its default) and "Suggest Alt+key when a key is taken".
   A handler made rebindable later is one line: KEYS.is(e, id) and a row in
   KEYS.ACTS (+ act: id on its SHORT row).
   ========================================================================== */
const KEYS = {
  /** id, default, what it is called in messages, plain: may be a letter alone (the handler already stays out of text), set: the settings key that holds it. */
  ACTS: [
    { id: 'search', d: 'Ctrl+K', what: 'Search' },
    { id: 'palette', d: 'Ctrl+P', what: 'the command palette' },
    { id: 'switcher', d: 'Ctrl+O', what: 'the quick switcher' },
    { id: 'capture', d: 'Ctrl+Shift+Space', what: 'Capture to the day note' },
    { id: 'newNote', d: 'Ctrl+Alt+N', what: 'New note' },
    { id: 'undo', d: 'Ctrl+Z', what: 'Undo' },
    { id: 'redo', d: 'Ctrl+Shift+Z', what: 'Redo' },
    { id: 'redo2', d: 'Ctrl+Y', what: 'Redo' },
    { id: 'focus', d: 'Ctrl+.', what: 'Focus mode' },
    { id: 'back', d: 'Alt+ArrowLeft', what: 'Back to the previous note' },
    { id: 'forward', d: 'Alt+ArrowRight', what: 'Forward' },
    { id: 'cmdbar', d: '/', plain: true, what: 'the command bar' },
    { id: 'help', d: '?', plain: true, what: 'the list of keys' },
    { id: 'newComponent', d: 'N', plain: true, what: 'New component' },
    { id: 'hand', d: 'P', plain: true, what: 'the Move tool' },
    { id: 'fit', d: 'Ctrl+0', what: 'Fit the note on the screen' },
    { id: 'mark', d: 'Alt+M', what: 'Mark this moment (recording)' },
    { id: 'structure', set: 'structKey', what: 'the structure key' },
    { id: 'term', set: 'termKey', what: 'the term key' },
  ],
  /** Taken by the browser: what it does with the combination. 'own' ones the app also uses by default, so they are the browser's only when no action of the app holds them. */
  BROWSER: {
    'Ctrl+T': 'opens a new tab', 'Ctrl+Shift+T': 'reopens the tab you closed', 'Ctrl+W': 'closes the tab', 'Ctrl+Shift+W': 'closes the window',
    'Ctrl+N': 'opens a new window', 'Ctrl+Shift+N': 'opens a private window', 'Ctrl+Tab': 'switches to the next tab', 'Ctrl+Shift+Tab': 'switches to the previous tab',
    'Ctrl+PageDown': 'switches to the next tab', 'Ctrl+PageUp': 'switches to the previous tab', 'Ctrl+L': 'selects the address bar', 'Ctrl+E': 'searches from the address bar',
    'Ctrl+D': 'bookmarks the page', 'Ctrl+Shift+D': 'bookmarks every tab', 'Ctrl+H': 'opens the history', 'Ctrl+J': 'opens the downloads', 'Ctrl+R': 'reloads the page',
    'Ctrl+Shift+R': 'reloads the page', 'Ctrl+F5': 'reloads the page', 'F5': 'reloads the page', 'Ctrl+U': 'shows the page source', 'Ctrl+S': 'saves the page',
    'Ctrl+Shift+I': 'opens the developer tools', 'Ctrl+Shift+J': 'opens the developer console', 'Ctrl+Shift+C': 'opens the element picker', 'F12': 'opens the developer tools',
    'Ctrl+Shift+Delete': 'clears the browsing data', 'Ctrl+Shift+B': 'shows the bookmarks bar', 'Ctrl+Shift+O': 'opens the bookmarks', 'Ctrl+Shift+A': 'searches the tabs',
    'Ctrl+G': 'finds the next match', 'Ctrl+A': 'selects everything', 'Ctrl+X': 'cuts', 'Ctrl+V': 'pastes', 'Ctrl+=': 'zooms the page in', 'Ctrl++': 'zooms the page in', 'Ctrl+-': 'zooms the page out',
    'F1': 'opens the browser’s help', 'F3': 'finds in the page', 'F6': 'moves to the address bar', 'F7': 'turns caret browsing on', 'F11': 'goes full screen',
    'Alt+Home': 'goes to the home page', 'Alt+D': 'selects the address bar', 'Alt+F': 'opens the browser’s menu', 'Alt+E': 'opens the browser’s menu',
    'Ctrl+P': 'prints the page', 'Ctrl+O': 'opens a file', 'Ctrl+K': 'searches from the address bar', 'Ctrl+0': 'resets the page zoom',
    'Alt+ArrowLeft': 'goes back a page', 'Alt+ArrowRight': 'goes forward a page',
  },
  /** Taken by the computer. */
  OS: { 'Alt+Tab': 'switches windows', 'Alt+F4': 'closes the window', 'Alt+Esc': 'cycles the windows', 'Alt+Space': 'opens the window menu', 'Ctrl+Esc': 'opens the Start menu',
    'Ctrl+Shift+Esc': 'opens the Task Manager', 'Ctrl+Alt+Delete': 'opens the security screen', 'PrintScreen': 'takes a screenshot', 'Ctrl+Alt+Tab': 'switches windows' },
  byId: {},
  mac: () => /Mac|iPhone|iPad/.test(navigator.platform || ''),

  /* ---- the combination: parse, write, read from an event ---- */
  NAMES: { enter: 'Enter', esc: 'Esc', escape: 'Esc', tab: 'Tab', space: 'Space', ' ': 'Space', spacebar: 'Space', backspace: 'Backspace', delete: 'Delete', del: 'Delete', insert: 'Insert', home: 'Home', end: 'End',
    pageup: 'PageUp', pagedown: 'PageDown', arrowleft: 'ArrowLeft', left: 'ArrowLeft', '←': 'ArrowLeft', arrowright: 'ArrowRight', right: 'ArrowRight', '→': 'ArrowRight',
    arrowup: 'ArrowUp', up: 'ArrowUp', '↑': 'ArrowUp', arrowdown: 'ArrowDown', down: 'ArrowDown', '↓': 'ArrowDown', printscreen: 'PrintScreen' },
  GLYPH: { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' },
  /** "Ctrl+Shift+Z" / "ctrl+enter" → { ctrl, alt, shift, key } or null. Ctrl+Plus is written "Ctrl++". */
  parse(spec) {
    let s = String(spec == null ? '' : spec).trim(); if (!s) return null;
    let key = null;
    if (s === '+' || /\+\+$/.test(s)) { key = '+'; s = s.slice(0, -1).replace(/\+$/, ''); }
    const parts = s ? s.split('+').map(x => x.trim()).filter(Boolean) : [];
    if (key == null) key = parts.pop();
    if (key == null) return null;
    const p = { ctrl: false, alt: false, shift: false, key: '' };
    for (const m of parts) { const l = m.toLowerCase(); if (l === 'ctrl' || l === 'control' || l === 'cmd' || l === 'command' || l === 'meta') p.ctrl = true; else if (l === 'alt' || l === 'option') p.alt = true; else if (l === 'shift') p.shift = true; else return null; }
    const l = key.toLowerCase();
    if (KEYS.NAMES[l]) p.key = KEYS.NAMES[l]; else if (/^f([1-9]|1[0-2])$/.test(l)) p.key = l.toUpperCase(); else if (/^[a-z0-9]$/i.test(key)) p.key = key.toUpperCase(); else if ([...key].length === 1) p.key = key; else return null;
    if (p.key.length === 1 && !/[A-Z0-9]/.test(p.key)) p.shift = false;   // a symbol already says it was shifted
    return p;
  },
  fmt: p => p ? [p.ctrl ? 'Ctrl' : '', p.alt ? 'Alt' : '', p.shift ? 'Shift' : '', p.key].filter(Boolean).join('+') : '',
  /** The canonical text of a combination ('' when it is not one). */
  canon: spec => KEYS.fmt(KEYS.parse(spec)),
  /** How it is shown: arrows as arrows. */
  label(spec) { const p = KEYS.parse(spec); if (!p) return String(spec || ''); return KEYS.fmt(Object.assign({}, p, { key: KEYS.GLYPH[p.key] || p.key })); },
  /** The combination a keydown event is, or null for a bare modifier. */
  fromEvent(e) {
    const k = e.key || '', code = e.code || '';
    if (!k || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'OS', 'Dead', 'Unidentified', 'Process', 'CapsLock'].includes(k)) return null;
    let key;
    if (/^[a-z]$/i.test(k)) key = k.toUpperCase();
    else if (/^Key[A-Z]$/.test(code)) key = code[3];                                   // Alt makes other characters on a Mac; Cyrillic and Greek layouts too
    else if (/^[0-9]$/.test(k) && !e.shiftKey) key = k;
    else if (/^Digit[0-9]$/.test(code)) key = code[5];
    else if (k === ' ' || code === 'Space') key = 'Space';
    else key = KEYS.NAMES[k.toLowerCase()] || k;
    return KEYS.fmt({ ctrl: !!(e.ctrlKey || e.metaKey), alt: !!e.altKey, shift: !!e.shiftKey && (key.length > 1 || /[A-Z0-9]/.test(key)), key });
  },
  /** Is this keydown the combination written as spec (any spelling)? */
  match(e, spec) { const s = KEYS.fromEvent(e); return !!s && s === KEYS.canon(spec); },

  /* ---- the bindings ---- */
  /** Bindings count when the Shortcuts feature is on and "Let me change keys" is. Off: every key is its default (what was set stays stored). */
  live: () => typeof FEAT === 'undefined' || (FEAT.on('shortcuts') && FEAT.tune('shortcuts', 'rebind') !== false),
  suggesting: () => typeof FEAT === 'undefined' || FEAT.tune('shortcuts', 'suggest') !== false,
  defOf(id) { const a = KEYS.byId[id]; return !a ? '' : a.set ? KEYS.canon((DEFAULT_SETTINGS || {})[a.set]) : a.d; },
  /** The combination of an action now: the person's, or the default. */
  get(id) {
    const a = KEYS.byId[id]; if (!a) return '';
    if (a.set) return KEYS.canon(settings()[a.set]) || KEYS.defOf(id);
    if (!KEYS.live()) return a.d;
    return KEYS.canon(((settings().keymap || {})[id])) || a.d;
  },
  /** The one lookup the handlers ask. */
  is(e, id) { const s = KEYS.fromEvent(e); return !!s && s === KEYS.get(id); },
  /** A fixed second key of an action (Ctrl+Shift+K opens Search too) that goes while the action is not on its default. */
  alias(e, id, spec) { return KEYS.get(id) === KEYS.defOf(id) && KEYS.fromEvent(e) === KEYS.canon(spec); },
  changed: id => KEYS.get(id) !== KEYS.defOf(id),
  set(id, spec) {
    const a = KEYS.byId[id], s = KEYS.canon(spec); if (!a || !s) return;
    if (a.set) saveSettings({ [a.set]: s.toLowerCase() });
    else { const km = Object.assign({}, settings().keymap || {}); if (s === a.d) delete km[id]; else km[id] = s; saveSettings({ keymap: km }); }
    KEYS.repaint();
  },
  reset(id) { const a = KEYS.byId[id]; if (!a) return; KEYS.set(id, KEYS.defOf(id)); },
  /** The shortcut lists drawn now redraw (SHORT registers each one). */
  views: new Set(),
  repaint() { KEYS.views.forEach(f => { try { if (f() === false) KEYS.views.delete(f); } catch (x) { KEYS.views.delete(f); } }); },

  /* ---- conflicts ---- */
  /** The shortcuts of the list that are fixed (not rebindable): spec → { what }. Plain keys only where the list means the paper or a text. */
  fixed() {
    const out = {}, put = (spec, what) => { const c = KEYS.canon(spec); if (c && !out[c]) out[c] = what; };
    const short = d => String(d).split(/ — |: | \(|; |, /)[0];
    if (typeof SHORT !== 'undefined') SHORT.items().forEach(it => {
      if (it.act || !['all', 'note', 'text', 'read'].includes(it.g)) return;
      it.keys.forEach(k => { if (k.startsWith('~') || /\s/.test(k)) return; const p = KEYS.parse(k); if (!p) return; if (it.g === 'read' && !p.ctrl && !p.alt) return; put(k, short(it.d)); });
    });
    for (let i = 1; i <= 7; i++) put(String(i), 'going to a tab');
    put('Space', 'panning the paper (hold Space)'); put('Tab', 'moving on'); put('Ctrl+C', 'Copy');
    return out;
  },
  /** Why a combination cannot be taken by action `id`: null when it is free, else { kind, why }. */
  why(p, id) {
    const a = KEYS.byId[id], s = KEYS.fmt(p), lab = KEYS.label(s), isF = /^F\d+$/.test(p.key);
    const other = KEYS.ACTS.find(x => x.id !== id && KEYS.get(x.id) === s);
    if (other) return { kind: 'app', why: 'already used in the app — ' + other.what };
    if (s === KEYS.defOf(id)) return null;
    if (!a.plain && !p.ctrl && !p.alt && !isF) return { kind: 'plain', why: 'only a letter you would type — a shortcut here needs Ctrl or Alt with it' };
    if (a.plain && p.shift && !p.ctrl && !p.alt) return { kind: 'plain', why: 'only a capital letter you would type — add Ctrl or Alt, or leave Shift out' };
    if (KEYS.OS[s]) return { kind: 'os', why: 'taken by your computer: it ' + KEYS.OS[s] };
    const f = KEYS.fixed()[s]; if (f) return { kind: 'app', why: 'already used in the app — ' + f };
    if (KEYS.BROWSER[s]) return { kind: 'browser', why: 'taken by the browser: it ' + KEYS.BROWSER[s] + ', and a page cannot always keep that key for itself' };
    return null;
  },
  /** The Alt+<same key> offer, or the next free one (Alt+Shift+, Ctrl+Alt+, Ctrl+Alt+Shift+). */
  alt(p, id) {
    const s = KEYS.fmt(p);
    for (const m of [{ alt: 1 }, { alt: 1, shift: 1 }, { ctrl: 1, alt: 1 }, { ctrl: 1, alt: 1, shift: 1 }]) {
      const c = { ctrl: !!m.ctrl, alt: !!m.alt, shift: !!m.shift, key: p.key };
      if (c.key.length === 1 && !/[A-Z0-9]/.test(c.key)) c.shift = false;
      const cs = KEYS.fmt(c); if (cs === s) continue;
      if (!KEYS.why(c, id)) return cs;
    }
    return null;
  },
  /** { ok, spec } for a combination that may be taken; else { ok: false, kind, why, spec, alt }. */
  check(spec, id) {
    const p = KEYS.parse(spec); if (!p || !KEYS.byId[id]) return { ok: false, kind: 'bad', why: 'not a key combination', spec: String(spec || ''), alt: null };
    const s = KEYS.fmt(p), w = KEYS.why(p, id);
    if (!w) return { ok: true, spec: s, same: s === KEYS.get(id) };
    return Object.assign({ ok: false, spec: s, alt: KEYS.suggesting() ? KEYS.alt(p, id) : null }, w);
  },

  /* ---- the capture box ---- */
  /** The words of a refused combination, with the offer. o = { use(spec), retry(), cancel() } makes the offer clickable (the preview shows it without buttons). */
  verdictEl(r, o) {
    o = o || {};
    return h('div.kc-v', { role: 'alert' },
      h('div.kc-w', SHORT.keyEl(KEYS.label(r.spec)), ' is ' + r.why + '.'),
      r.alt ? h('div.kc-o', h('span', 'Use '), SHORT.keyEl(KEYS.label(r.alt)), h('span', ' instead — it is free.'), o.use ? h('button.btn.xs.pri', { type: 'button', title: 'Bind ' + KEYS.label(r.alt), on: { click: () => o.use(r.alt) } }, 'Use ' + KEYS.label(r.alt)) : null)
        : (r.kind === 'bad' ? null : h('div.kc-o', KEYS.suggesting() ? 'No free Alt combination for that key — press another.' : 'Press another combination.')),
      o.retry ? h('div.kc-b', h('button.btn.xs', { type: 'button', on: { click: o.retry } }, 'Try another'), h('button.btn.xs', { type: 'button', on: { click: o.cancel } }, 'Cancel')) : null);
  },
  /** The box a row opens: waits for a combination; Esc cancels; a free one is taken at once; a refused one is explained. onClose(changed). */
  box(id, onClose) {
    const a = KEYS.byId[id];
    const live = h('span.kc-live'), msg = h('div.kc-m'), el = h('div.kc', { tabindex: '-1', role: 'group', 'aria-label': 'Press the new keys for ' + a.what },
      h('div.kc-p', h('span.kc-dot', { 'aria-hidden': 'true' }), h('span', 'Press the new keys'), live, h('span.kc-esc', 'Esc cancels')), msg);
    let done = false;
    if (KEYS._open) KEYS._open();                                       // one box at a time
    const end = ch => { if (done) return; if (KEYS._open === end0) KEYS._open = null; done = true; removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); onClose && onClose(ch); };
    const end0 = () => end(false); KEYS._open = end0;
    const wait = () => { msg.replaceChildren(); live.replaceChildren(); setTimeout(() => el.isConnected && el.focus({ preventScroll: true }), 0); };
    const take = s => { KEYS.set(id, s); toast(a.what.replace(/^\w/, c => c.toUpperCase()) + ' is now ' + KEYS.label(s)); end(true); };
    const mods = e => [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : ''].filter(Boolean);
    const kd = e => {
      if (done || !el.isConnected) return end(false);
      if (document.activeElement !== el) return;                       // focus is on a button of the box: keys act as they do anywhere
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (e.repeat || e.isComposing) return;
      if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) return end(false);
      const s = KEYS.fromEvent(e);
      if (!s) { live.replaceChildren(...mods(e).flatMap(m => [h('kbd', m), h('i', '+')])); return; }
      const r = KEYS.check(s, id);
      if (r.ok) return r.same ? end(false) : take(r.spec);
      live.replaceChildren(); msg.replaceChildren(KEYS.verdictEl(r, { use: take, retry: wait, cancel: () => end(false) }));
    };
    const ku = e => { if (!done && el.isConnected && document.activeElement === el && !msg.firstChild) live.replaceChildren(...mods(e).flatMap(m => [h('kbd', m), h('i', '+')])); };
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);   // window, capture: before the handlers on document
    setTimeout(() => { if (el.isConnected) { try { window.focus(); } catch (x) {} el.focus({ preventScroll: true }); } }, 0);
    return el;
  },
};
KEYS.ACTS.forEach(a => { KEYS.byId[a.id] = a; });
