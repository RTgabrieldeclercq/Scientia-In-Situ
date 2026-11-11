/* ==========================================================================
   11c · The navigation bar (V3.947, Gabe's SiS Shaping): a slim bar along
   the bottom of the window, grey and nearly invisible until it is clicked,
   or "/" is pressed with no text focused and no component selected. Awake,
   it is a command line for the whole notebook: every command of 11b with
   completion (the commands as you type the slash; a note, a component, a
   term… for each argument; Tab completes, Enter runs or takes the picked
   argument and moves to the next), ↑ ↓ through the history
   (settings().navHistory), ? or /help for the list. Asleep it shows the
   crumb (project › theme › note) and what the last command said. ←, at its
   left end, goes back to the previous note (Alt+←); Esc puts it to sleep.
   Not on the phone.
   V3.961, the way games do it (Minecraft's chat): the list sits over the word
   being completed, the rest of the highlighted completion shows in grey after
   what is typed (Tab takes it), and an argument that takes several words
   (/collection html image pdf) keeps its list open after each pick, without
   the ones already on the line; Enter on a space runs it.
   V3.977 — the palm: writing, the hand rests on the bar and woke it, went
   back or picked from its list. With a pen hand (pen, highlighter, eraser,
   lasso), or while the pen is near the glass, a touch on the bar does
   nothing; the pen itself and the mouse still work it (NAV.guard).
   ========================================================================== */
const NAV = {
  el: null, inp: null, list: null, crumbEl: null, sayEl: null, back: null, ghost: null, awake: false, items: [], hi: 0, hpos: -1, picked: {},
  mount() {
    if (NAV.el || document.body.classList.contains('mobile') || !$('#app')) return;
    NAV.back = h('button.nav-back', { type: 'button', title: 'Back to the previous note (Alt+←)', on: { click: e => { e.stopPropagation(); if (!HIST.go(-1)) NAV.say('Nothing to go back to'); } } }, '←');
    NAV.crumbEl = h('span.nav-crumb'); NAV.sayEl = h('span.nav-say'); NAV.list = h('div.nav-list');
    NAV.inp = h('input.nav-in', { type: 'text', spellcheck: false, autocomplete: 'off', placeholder: '/command — ? lists them', on: { keydown: e => NAV.key(e), input: () => NAV.render() } });
    NAV.el = h('div#nav.nav.asleep', { on: { click: e => { if (!NAV.awake) { e.stopPropagation(); NAV.wake(); } } } }, NAV.back, NAV.crumbEl, NAV.inp, NAV.sayEl, NAV.list);
    $('#app').append(NAV.el); NAV.crumb(); NAV.guard();
  },
  /** What touched: 'pen', 'mouse' or 'touch' (a click or a mouse event that a finger or a palm made says so too). */
  kind(e) { if (e.pointerType) return e.pointerType; if (e.changedTouches) { const t = e.changedTouches[0]; return t && t.touchType === 'stylus' ? 'pen' : 'touch'; } const sc = e.sourceCapabilities; return sc && sc.firesTouchEvents ? 'touch' : 'mouse'; },
  /** A touch the bar ignores: a pen hand, the pen near the glass, or a contact as big as a palm. */
  palmOff(e) {
    if (NAV.kind(e) !== 'touch') return false; if (NAV._palm > NAV._pen && Date.now() - NAV._palm < 700 && !/^(pointerdown|touchstart)$/.test(e.type)) return true;   // the rest of a touch already ignored
    const hand = typeof HANDS !== 'undefined' ? HANDS.hand() : 'move';
    return (!!hand && hand !== 'move' && hand !== 'zoom') || (typeof PALM !== 'undefined' && (PALM.penNear() || (e.pointerType === 'touch' && PALM.big(e))));
  },
  _palm: 0, _pen: 0,
  guard() {
    const stop = e => { if (!NAV.palmOff(e)) { if (e.type === 'pointerdown') NAV._pen = Date.now(); return; } NAV._palm = Date.now(); if (e.cancelable) e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach(t => NAV.el.addEventListener(t, stop, { capture: true, passive: false }));
    NAV.el.addEventListener('focusin', e => { if (NAV._palm > NAV._pen && Date.now() - NAV._palm < 700 && e.target.blur) { e.stopPropagation(); e.target.blur(); } }, true);
  },
  crumb() { if (!NAV.el) return; const ctx = CMD.ctx(), d = ctx.doc; const r = App.route || {}; const tab = (typeof TABS === 'undefined' ? [] : TABS).find(t => t[0] === (typeof TABOF !== 'undefined' && TABOF[r.name] || r.name));
    NAV.crumbEl.textContent = d ? [M.docPath(d), d.title].filter(Boolean).join(' › ') : (tab ? tab[1] : r.name || ''); NAV.back.disabled = !HIST.can(-1); NAV.back.title = HIST.can(-1) ? 'Back to ' + HIST.title(-1) + ' (Alt+←)' : 'Nothing to go back to'; },
  say(text) { if (NAV.sayEl) NAV.sayEl.textContent = text || ''; },
  wake(seed) { if (!NAV.el) NAV.mount(); if (!NAV.el) return; NAV.el.classList.remove('asleep'); NAV.awake = true; NAV.hpos = -1; NAV.picked = {}; NAV.inp.value = seed != null ? seed : (NAV.inp.value || '/'); NAV.inp.focus(); NAV.inp.setSelectionRange(NAV.inp.value.length, NAV.inp.value.length); NAV.render(); },
  sleep() { if (!NAV.el) return; NAV.el.classList.add('asleep'); NAV.awake = false; NAV.inp.value = ''; NAV.list.replaceChildren(); NAV.list.classList.remove('on'); NAV.items = []; NAV.picked = {}; if (NAV.ghost) NAV.ghost.textContent = ''; if (document.activeElement === NAV.inp) NAV.inp.blur(); },
  hist: () => settings().navHistory || [],
  remember(line) { const H = NAV.hist().filter(x => x !== line); H.unshift(line); saveSettings({ navHistory: H.slice(0, 50) }); },
  /** "/go 'Plan for coverslips'" → {slash, toks, partial (the token being typed), argIndex} */
  parse(v) { v = String(v || ''); if (!v.startsWith('/')) return { slash: '', toks: [], partial: v, cmdOnly: true }; const sp = v.indexOf(' '); if (sp < 0) return { slash: v.slice(1).toLowerCase(), toks: [], partial: v.slice(1), cmdOnly: true };
    const slash = v.slice(1, sp).toLowerCase(), rest = v.slice(sp + 1), toks = CMD.tokens(rest), open = /\s$/.test(rest) || !rest; return { slash, toks, partial: open ? '' : (toks[toks.length - 1] || ''), argIndex: open ? toks.length : Math.max(0, toks.length - 1), cmdOnly: false }; },
  render() {
    const v = NAV.inp.value, p = NAV.parse(v), ctx = CMD.ctx(); let rows = [];
    if (v === '?' ) { NAV.help(); NAV.inp.value = '/'; return NAV.render(); }
    if (p.cmdOnly) { const q = p.partial.toLowerCase(); rows = CMD.all().filter(c => c.scope !== 'text').map(c => ({ c, s: NAV.score(q, c) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.c.slash.localeCompare(b.c.slash)).slice(0, 14)
      .map(x => ({ label: '/' + x.c.slash, sub: x.c.label + (x.c.args.length ? ' · ' + x.c.args.map(a => (a.optional ? '[' : '<') + a.name + (a.optional ? ']' : '>')).join(' ') : ''), k: x.c.group, complete: '/' + x.c.slash + (x.c.args.length ? ' ' : ''), run: !x.c.args.length })); }
    else { const c = CMD.get(p.slash); if (c) { const last = c.args[c.args.length - 1], a = c.args[p.argIndex] || (last && (last.rest || last.many) ? last : null); if (a) { const K = CMD.KINDS[a.kind] || CMD.KINDS.text; rows = (K.list(p.partial, ctx, a, p) || []).slice(0, a.many ? 80 : 12).map(x => ({ label: x.label, sub: x.sub || '', k: a.name, v: x.v, arg: p.argIndex, complete: NAV.withArg(v, p, x.label) })); if (!rows.length && a.kind === 'text') rows = [{ label: p.partial || '…', sub: a.ask || a.name + (a.rest ? ' (the rest of the line)' : ''), k: a.name, hint: true }]; } } }
    NAV.items = rows; NAV.hi = 0; NAV.list.replaceChildren(...rows.map((r, i) => h('div.nav-row' + (i === 0 ? '.hi' : ''), { on: { mousedown: e => e.preventDefault(), click: () => { NAV.hi = i; NAV.take(); } } }, h('b', r.label), r.sub ? h('span.s2', r.sub) : null, h('span.s', r.k || ''))));
    NAV.list.classList.toggle('on', rows.length > 0); NAV.place(p);
  },
  /** The list over the word being completed; the rest of the highlighted completion in grey after the text (Tab takes it). */
  place(p) {
    const inp = NAV.inp, v = inp.value, cs = getComputedStyle(inp), cx = NAV._cx || (NAV._cx = h('canvas').getContext('2d')); cx.font = cs.font;
    const g = NAV.ghost || (NAV.ghost = h('span.nav-ghost', { 'aria-hidden': 'true' })); if (!g.isConnected) inp.after(g);
    const x0 = inp.offsetLeft + (parseFloat(cs.paddingLeft) || 0) - inp.scrollLeft, r = NAV.items[NAV.hi], typed = p.cmdOnly ? v : p.partial, atEnd = inp.selectionStart === v.length && inp.selectionEnd === v.length;
    const L = r && !r.hint ? String(r.label) : '', rest = typed && atEnd && L.length > typed.length && L.toLowerCase().startsWith(typed.toLowerCase()) ? L.slice(typed.length) : '';
    g.textContent = rest; Object.assign(g.style, { left: x0 + cx.measureText(v).width + 'px', top: inp.offsetTop + 'px', height: inp.offsetHeight + 'px', font: cs.font });
    const start = p.cmdOnly ? 0 : v.length - p.partial.length, lw = NAV.list.offsetWidth || 320;
    NAV.list.style.left = clamp(x0 + cx.measureText(v.slice(0, start)).width - 10, 8, Math.max(8, innerWidth - lw - 8)) + 'px';
  },
  score(q, c) { if (!q) return 1; const names = [c.slash, ...(c.alias || [])]; if (names.some(n => n.startsWith(q))) return 500 - c.slash.length; return Math.max(...names.map(n => PAL.fuzzy(q, n)), PAL.fuzzy(q, c.label) * .5); },
  /** The input with the current argument token replaced by `label` (quoted when it has spaces), ready for the next one. */
  withArg(v, p, label) { const q = /\s/.test(label) ? '"' + label.replace(/"/g, '') + '"' : label; const sp = v.indexOf(' '); const head = '/' + p.slash + ' '; const toks = p.toks.slice(0, p.argIndex); return head + [...toks.map(t => /\s/.test(t) ? '"' + t + '"' : t), q].join(' ') + ' '; },
  move(d) { if (!NAV.items.length) return false; NAV.hi = (NAV.hi + d + NAV.items.length) % NAV.items.length; [...NAV.list.children].forEach((x, i) => x.classList.toggle('hi', i === NAV.hi)); NAV.list.children[NAV.hi] && NAV.list.children[NAV.hi].scrollIntoView({ block: 'nearest' }); NAV.place(NAV.parse(NAV.inp.value)); return true; },
  /** Enter on a row: a command with no arguments runs; otherwise the row completes the input (an argument picked is remembered by value). */
  take() { const r = NAV.items[NAV.hi]; if (!r || r.hint) return NAV.go(); if (r.v != null) NAV.picked[r.arg] = r.v; NAV.inp.value = r.complete; if (r.run) return NAV.go(); const p = NAV.parse(NAV.inp.value), c = CMD.get(p.slash), last = c && c.args[c.args.length - 1]; if (c && p.argIndex >= c.args.length && !(last && last.many)) return NAV.go(); NAV.render(); },
  key(e) {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); return NAV.sleep(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (NAV.items.length) return NAV.move(1); return NAV.recall(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (NAV.items.length) return NAV.move(-1); return NAV.recall(-1); }
    if (e.key === 'Tab') { e.preventDefault(); const r = NAV.items[NAV.hi]; if (r && r.complete) { if (r.v != null) NAV.picked[r.arg] = r.v; NAV.inp.value = r.complete; NAV.render(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); const p = NAV.parse(NAV.inp.value); if (p.cmdOnly && NAV.items.length) return NAV.take(); if (!p.cmdOnly && NAV.items.length && NAV.items[NAV.hi].v != null && !p.partial) return NAV.go(); if (!p.cmdOnly && NAV.items.length && NAV.items[NAV.hi].v != null) return NAV.take(); return NAV.go(); }
  },
  recall(d) { const H = NAV.hist(); if (!H.length) return; NAV.hpos = Math.max(-1, Math.min(H.length - 1, NAV.hpos + (d < 0 ? 1 : -1))); NAV.inp.value = NAV.hpos < 0 ? '/' : H[NAV.hpos]; },
  async go() {
    const v = NAV.inp.value.trim(); if (!v || v === '/') return NAV.sleep();
    const p = NAV.parse(v); if (!p.slash) { NAV.say('Commands start with /'); return; }
    const c = CMD.get(p.slash); if (!c) { NAV.say('No command /' + p.slash + ' — ? lists them'); return; }
    const args = p.toks.map((t, i) => NAV.picked[i] != null ? NAV.picked[i] : t); NAV.remember(v); NAV.sleep();
    const ok = await CMD.run(c.slash, args, CMD.ctx()); NAV.crumb(); if (ok && !NAV.sayEl.textContent) NAV.say('/' + c.slash + ' done');
  },
  help() {
    const groups = {}; CMD.all().forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
    modal({ title: 'Commands', wide: true, actions: [{ label: 'Close' }], body: h('div.nav-help', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Type / in a component for the ones that act on the text (and @ for a person); / on the canvas wakes the bar at the bottom, which takes them all. <argument> is needed, [argument] is optional; Tab completes, Enter runs.'),
      ...Object.entries(groups).map(([g, L]) => h('div', h('div.sec-h', h('h2', g)), h('div.nav-helpg', L.sort((a, b) => a.slash.localeCompare(b.slash)).map(c => h('div.nav-helpr', h('code.mono', '/' + c.slash + (c.args.length ? ' ' + c.args.map(a => (a.optional ? '[' : '<') + a.name + (a.optional ? ']' : '>')).join(' ') : '')), h('span', c.label, c.sub ? h('span.s', ' · ' + c.sub) : null, (c.alias || []).length ? h('span.s', ' · also /' + c.alias.join(' /')) : null))))))) });
  },
  macros() { const L = MACRO.all(); modal({ title: 'Your macros', actions: [{ label: 'Close' }, { label: 'Settings → Commands', run: () => CMD.run('settings', ['commands']) }], body: h('div.list', L.length ? L.map(m => h('div.li.click', { on: { click: () => MACRO.run(m, [], null) } }, h('code.mono', '/' + m.slash), h('span.t', m.name, h('span.s', (m.steps || []).map(s => '/' + s.cmd).join(' → '))))) : h('div.li.muted', 'No macros yet — Settings → Commands → Import a macro…')) }); },
};
{
  // the bar is there once the app is; the crumb follows the view; / and Alt+← Alt+→ work from anywhere outside a text
  const mount = () => { try { NAV.mount(); } catch (e) { console.warn('[nav]', e); } };
  if (document.readyState === 'complete') setTimeout(mount, 0); else addEventListener('load', () => setTimeout(mount, 0));
  const st = App.setTitle; App.setTitle = function () { const r = st.apply(this, arguments); NAV.crumb(); return r; };
  addEventListener('hashchange', () => setTimeout(() => NAV.crumb(), 0));
  const typing = e => { const t = e.target; return t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],math-field'); };
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e) && !$('.ovl') && !$('.pop') && !(App.pane && App.pane.sel) && !NAV.awake && NAV.el) { e.preventDefault(); e.stopPropagation(); NAV.wake('/'); return; }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing(e)) { e.preventDefault(); if (!HIST.go(e.key === 'ArrowLeft' ? -1 : 1)) NAV.say(e.key === 'ArrowLeft' ? 'Nothing to go back to' : 'Nothing ahead'); }
  }, true);
  document.addEventListener('mousedown', e => { if (NAV.awake && NAV.el && !NAV.el.contains(e.target)) NAV.sleep(); }, true);
}
