/* ==========================================================================
   13zzf · The text editor bar (V3.946 — Gabe's "Text Editor Bar").
   While a text component is being edited, a bar sits just above its top
   border: bold · italic · underline (· strikethrough), the three lists,
   Make it… (the Ctrl+Enter strip), ∑ Symbols, your quick-cast symbols, and
   a dotted + that adds more: Link to a note, Citation, Term, Equation
   (embedded in the text as an equation component, 13h), Existing structure,
   Strikethrough. It is never wider than the component (it wraps), every
   button is the same size, and a button lights up when the caret or the
   selection is already in that style or list. ∑: the symbols by category
   (Greek, mathematics, science, arrows, typography); ☆ makes one a
   favourite, shown first next time; the bolt on a favourite makes it a
   button of its own in the bar. Favourites, quick-cast symbols and the
   extra buttons are the notebook's settings (editorBar), so they are the
   same on every computer. Built on the floating bar (08b).
   ========================================================================== */
const SYMBOLS = {
  CATS: [
    ['greek', 'Greek', 'α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω'],
    ['math', 'Mathematics', '± × ÷ · ≈ ≠ ≡ ≤ ≥ ≪ ≫ ∝ ∞ ∑ ∏ ∫ ∬ ∂ ∇ √ ∛ ∈ ∉ ⊂ ⊃ ∪ ∩ ∅ ∀ ∃ ¬ ∧ ∨ ⊕ ⊗ ⟨ ⟩ ⌈ ⌉ ⌊ ⌋ ′ ″'],
    ['science', 'Science', '° °C °F µ Å ℓ ħ Ω ‰ ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ½ ⅓ ¼ ¾ ∆ ⟂ ∥ ∠ ⌀'],
    ['arrows', 'Arrows', '→ ← ↑ ↓ ↔ ↕ ⇒ ⇐ ⇔ ⇌ ⇋ ↦ ↗ ↘ ↖ ↙ ⟶ ⟵ ↻ ↺'],
    ['typo', 'Typography', '— – … “ ” ‘ ’ « » § ¶ † ‡ • ◦ ▪ ✓ ✗ ★ ◆ ◇ ■ □ ● ○ №'],
  ],
  BOLT: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"/></svg>',
};
const EBAR = {
  cur: null, over: false, popOpen: false,
  /** The optional buttons behind +, in the order they appear. */
  EXTRA: [
    ['link', 'Bridge to a note', 'Bridge the selected words to another note: they show there, live, and are underlined here'],
    ['cite', 'Citation', 'Insert a citation from the library (Ctrl+I, or type /cite)'],
    ['term', 'Term', 'Mark the word or phrase as a term of the project'],
    ['eq', 'Equation', 'An equation here in the text, as an equation component (its terms can be wired and solved)'],
    ['mention', 'Existing structure', 'Make the selected words refer to a claim, barrier, result… recorded elsewhere'],
    ['strike', 'Strikethrough', 'Strike the selected words through'],
  ],
  cfg() { const s = settings().editorBar || {}; return { extra: Array.isArray(s.extra) ? s.extra : [], symFav: Array.isArray(s.symFav) ? s.symFav : [], symQuick: Array.isArray(s.symQuick) ? s.symQuick : [] }; },
  save(patch) { saveSettings({ editorBar: Object.assign({}, EBAR.cfg(), patch) }); if (EBAR.cur) EBAR.rebuild(); },
  ICON: {
    bul: FBAR.svg('<circle cx="5" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.3" fill="currentColor" stroke="none"/><path d="M9.5 7h10M9.5 12h10M9.5 17h10"/>'),
    num: FBAR.svg('<path d="M10 7h9.5M10 12h9.5M10 17h9.5"/><text x="3" y="9.6" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="monospace">1.</text><text x="3" y="19.4" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="monospace">2.</text>'),
    box: FBAR.svg('<rect x="3.5" y="4" width="6.5" height="6.5" rx="1.3"/><rect x="3.5" y="13.5" width="6.5" height="6.5" rx="1.3"/><path d="M13.5 7.25h7M13.5 16.75h7M5.2 16.8l1.5 1.5 2.6-3"/>'),
    make: FBAR.svg('<path d="M3.5 12.5V5.5a2 2 0 0 1 2-2h7l8.5 8.5-9 9z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>'),
    link: FBAR.svg('<path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>'),
  },
  /* ---------- showing and placing ---------- */
  editorOf(node) { const el = node && node.closest && node.closest('.ed'); return el && el.contentEditable === 'true' && el.closest('.box.cmp') && !el.closest('.ghosts') ? el : null; },
  show(el) {
    if (!el || !el.isConnected || document.body.classList.contains('mobile')) return; const box = el.closest('.box.cmp'), b = box && M.block(box.dataset.id); if (!b || b.kind !== 'component') return;
    if (EBAR.cur && EBAR.cur.el === el) return EBAR.place();
    EBAR.hide(); const bar = FBAR.make([], { cls: 'ebar' }); document.body.append(bar);
    bar.addEventListener('pointerenter', () => { EBAR.over = true; }); bar.addEventListener('pointerleave', () => { EBAR.over = false; });
    EBAR.cur = { el, b, bar, sel: ED.selection(el) }; EBAR.rebuild();
  },
  hide() { const c = EBAR.cur; if (!c) return; EBAR.cur = null; EBAR.over = false; c.bar.remove(); if (EBAR.popOpen) { closePop(); EBAR.popOpen = false; } },
  rebuild() { const c = EBAR.cur; if (!c) return; c.bar.replaceChildren(...EBAR.items()); EBAR.sync(); EBAR.place(); },
  place() {
    const c = EBAR.cur; if (!c) return; if (!c.el.isConnected) return EBAR.hide();
    const box = c.el.closest('.box'), hd = $('#hd'), top = hd ? hd.getBoundingClientRect().bottom + 2 : 0;
    FBAR.place(c.bar, box.getBoundingClientRect(), { top, min: 150, max: 760 });
  },
  /* ---------- the buttons ---------- */
  items() {
    const s = EBAR.cfg(), B = FBAR.btn, I = EBAR.ICON, x = id => s.extra.includes(id), key = keyLabel(settings().structKey);
    return [
      B(h('span.bB', 'B'), 'Bold', () => EBAR.style('b'), { key: 'Ctrl+B', cls: 'eb-b' }),
      B(h('span.bI', 'I'), 'Italic', () => EBAR.style('i'), { key: 'Alt+I', cls: 'eb-i' }),
      B(h('span.bU', 'U'), 'Underline', () => EBAR.style('u'), { key: 'Ctrl+U', cls: 'eb-u' }),
      x('strike') ? B(h('span.bS', 'S'), 'Strikethrough', () => EBAR.style('s'), { cls: 'eb-s' }) : null,
      FBAR.sep(),
      B(I.bul, 'Bulleted list — the line, or every line selected', () => EBAR.list('bul'), { cls: 'eb-bul' }),
      B(I.num, 'Numbered list', () => EBAR.list('num'), { cls: 'eb-num' }),
      B(I.box, 'Checkbox list — click a box to tick it', () => EBAR.list('box'), { cls: 'eb-box' }),
      FBAR.sep(),
      B(I.make, 'Make it… — what the selected phrase is: a claim, a barrier, a question…', () => EBAR.makeIt(), { key }),
      x('link') ? B(I.link, 'Bridge to a note…', () => EBAR.pick('link')) : null,
      x('cite') ? B('❝', 'Citation…', () => EBAR.pick('cite'), { key: 'Ctrl+I' }) : null,
      x('term') ? B(h('span.bT', 'T'), 'Term — the word or phrase joins the project’s terms', () => EBAR.pick('term'), { key: keyLabel(settings().termKey) }) : null,
      x('eq') ? B(h('span.bFx', 'ƒx'), 'Equation — here in the text, as an equation component', () => EBAR.equation()) : null,
      x('mention') ? B('◇', 'Existing structure… — refer to a claim, barrier, result… recorded elsewhere', () => EBAR.pick('mention')) : null,
      FBAR.sep(),
      B('∑', 'Symbols — Greek letters, mathematics, science, arrows; ☆ makes a favourite, the bolt puts one here as a button', e => EBAR.symbols(e.currentTarget.getBoundingClientRect())),
      ...s.symQuick.map(sym => B(sym, 'Type ' + sym, () => EBAR.insert(sym), { cls: 'eb-sym' })),
      B('+', 'Add more to this bar: link, citation, term, equation, structure, strikethrough', e => EBAR.more(e.currentTarget.getBoundingClientRect()), { cls: 'plus' }),
    ];
  },
  /** The buttons that are "on" where the caret or the selection is. */
  sync() {
    const c = EBAR.cur; if (!c || !c.el.isConnected) return; const el = c.el, b = M.block(c.b.id); if (!b) return;
    const sel = ED.selection(el); if (sel) c.sel = sel;
    ['b', 'i', 'u', 's'].forEach(s => { const x = $('.eb-' + s, c.bar); x && x.classList.toggle('on', !!sel && WRITE.hasStyle(el, b, s, sel)); });
    const k = sel ? WRITE.listKindAt(el, b, sel) : null;
    ['bul', 'num', 'box'].forEach(s => { const x = $('.eb-' + s, c.bar); x && x.classList.toggle('on', k === s); });
  },
  /* ---------- actions (each keeps the caret where it was) ---------- */
  focus() { const c = EBAR.cur; if (!c) return null; const sel = ED.selection(c.el) || c.sel; c.el.focus({ preventScroll: true }); if (sel) try { ED.setCaret(c.el, sel.from, sel.to); } catch { } return sel; },
  style(s) { const c = EBAR.cur; if (!c) return; EBAR.focus(); WRITE.toggle(c.el, c.b, s); setTimeout(EBAR.sync, 0); },
  list(kind) { const c = EBAR.cur; if (!c) return; EBAR.focus(); WRITE.setList(c.el, c.b, kind); setTimeout(EBAR.sync, 0); },
  makeIt() { const c = EBAR.cur; if (!c) return; const sel = EBAR.focus(); if (!sel || sel.collapsed) return toast('Select the phrase first, then Make it…'); ED.openStrip(c.el, c.b, ED.selection(c.el) || sel); },
  pick(what) {
    const c = EBAR.cur; if (!c) return; const sel = EBAR.focus() || ED.selection(c.el); if (!sel) return;
    if (what === 'term') return ED.markTerm(c.el, c.b, sel);
    if (what === 'cite') return ED.citePicker(c.el, c.b, ED.selection(c.el));
    if (sel.collapsed) return toast('Select the words first');
    if (what === 'link') return BRIDGE.fromText(c.el, c.b, sel);   // V3.981: a bridge (13zzu)
    if (what === 'mention') return ED.mentionPicker(c.el, c.b, sel);
  },
  insert(sym) { const c = EBAR.cur; if (!c) return; EBAR.focus(); document.execCommand('insertText', false, sym); },
  /** An equation written here is an equation component embedded in the text (13h MATH.record; the atom carries eqId). */
  equation() {
    const c = EBAR.cur; if (!c) return; const sel = EBAR.focus(), el = c.el, b = c.b, at = sel ? sel.to : ED.read(el, []).text.length;
    MATH.editor({ tex: '', display: false, title: 'Equation in the text', onSave: (tex, display) => { if (!tex) return; const rec = MATH.record(tex);
      ED.commit(el, b, body => { const n = ED.splice(body, at, 0, OBJ); n.marks.push({ id: uid('m'), type: 'math', from: at, to: at + 1, tex, display, eqId: rec.id }); return n; }, at + 1); } });
  },
  /* ---------- ∑ symbols ---------- */
  symbols(at) {
    const c = EBAR.cur; if (!c) return; c.sel = ED.selection(c.el) || c.sel; const s = EBAR.cfg(), fav = s.symFav;
    const cell = (sym, inFav) => { const f = fav.includes(sym), q = s.symQuick.includes(sym);
      return h('button.sym' + (f ? '.fav' : ''), { type: 'button', title: 'Type ' + sym, on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); EBAR.insert(sym); } } }, h('span.sy', sym),
        h('span.st2', { title: f ? 'Take it out of the favourites' : 'Make it a favourite — shown first next time', on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); EBAR.fav(sym, at); } } }, f ? '★' : '☆'),
        inFav ? h('span.qk' + (q ? '.on' : ''), { title: q ? 'Take its button out of the bar' : 'A button of its own in the bar', html: SYMBOLS.BOLT, on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); EBAR.quick(sym, at); } } }) : null); };
    const body = [h('div.symp-h', h('b', 'Symbols'), h('span.tiny.muted', 'click to type · ☆ a favourite · the bolt: a button in the bar'))];
    if (fav.length) body.push(h('div.sym-cat', 'Favourites'), h('div.sym-grid', fav.map(x => cell(x, true))));
    SYMBOLS.CATS.forEach(([id, label, list]) => body.push(h('div.sym-cat', label), h('div.sym-grid', list.split(' ').map(x => cell(x, false)))));
    EBAR.popOpen = true; const pop = popover(at.left, at.bottom + 6, body, { cls: 'pop.symp', onClose: () => { EBAR.popOpen = false; } });
    pop.addEventListener('pointerenter', () => { EBAR.over = true; }); pop.addEventListener('pointerleave', () => { EBAR.over = false; });
  },
  fav(sym, at) { const s = EBAR.cfg(), on = s.symFav.includes(sym); EBAR.save({ symFav: on ? s.symFav.filter(x => x !== sym) : [...s.symFav, sym], symQuick: on ? s.symQuick.filter(x => x !== sym) : s.symQuick }); if (at) EBAR.symbols(at); },
  quick(sym, at) { const s = EBAR.cfg(), on = s.symQuick.includes(sym); EBAR.save({ symQuick: on ? s.symQuick.filter(x => x !== sym) : [...s.symQuick, sym] }); if (at) EBAR.symbols(at); },
  /* ---------- + more ---------- */
  more(at) {
    const s = EBAR.cfg();
    EBAR.popOpen = true; popover(at.left, at.bottom + 6, [h('h5', 'More buttons for the bar'),
      h('div.eb-more', EBAR.EXTRA.map(([id, label, sub]) => h('button.eb-opt' + (s.extra.includes(id) ? '.on' : ''), { type: 'button', on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); const on = s.extra.includes(id); EBAR.save({ extra: on ? s.extra.filter(x => x !== id) : [...s.extra, id] }); EBAR.more(at); } } },
        h('span.ck', s.extra.includes(id) ? '✓' : ''), h('span', h('b', label), h('div.tiny.muted', sub))))),
      h('div.tiny.muted', { style: { margin: '6px 6px 2px' } }, 'The symbols you favourite (∑ → ☆ → the bolt) become buttons here too.')], { cls: 'pop.ebmore', onClose: () => { EBAR.popOpen = false; } });
  },
  /** Settings → Writing: the same choices, and the favourites in order. */
  settingsUI() {
    const s = EBAR.cfg(), row = (lab, sub, on, fn) => h('label.row', { style: { gap: '8px', alignItems: 'flex-start' } }, h('input', { type: 'checkbox', checked: on, on: { change: fn } }), h('span', h('b', lab), h('div.tiny.muted', sub)));
    const favs = h('div.row', { style: { gap: '6px', flexWrap: 'wrap', marginTop: '6px' } }, s.symFav.length ? s.symFav.map(sym => h('span.pill.eb-fav', { title: s.symQuick.includes(sym) ? 'A button in the bar — click the bolt to take it out' : 'Click the bolt to make it a button in the bar' }, h('span.sy', sym),
      h('button.qk' + (s.symQuick.includes(sym) ? '.on' : ''), { type: 'button', html: SYMBOLS.BOLT, on: { click: () => { EBAR.quick(sym); App.refresh(); } } }),
      h('button.x', { type: 'button', title: 'Not a favourite any more', on: { click: () => { EBAR.fav(sym); App.refresh(); } } }, '×'))) : h('span.tiny.muted', 'No favourites yet — in a component, ∑ then ☆ on a symbol.'));
    return h('div.eb-settings', h('h3', { style: { fontSize: '13px', margin: '14px 0 6px' } }, 'Editor bar'),
      h('p.tiny.muted', { style: { marginTop: 0 } }, 'The bar above a component while you write. These buttons can be added to it (the + at its end does the same):'),
      h('div.grid2', EBAR.EXTRA.map(([id, label, sub]) => row(label, sub, s.extra.includes(id), e => { const cur = EBAR.cfg(); EBAR.save({ extra: e.target.checked ? [...cur.extra.filter(x => x !== id), id] : cur.extra.filter(x => x !== id) }); }))),
      h('div.tiny.muted', { style: { marginTop: '10px' } }, h('b', 'Favourite symbols'), ' — the bolt makes one a button in the bar'), favs);
  },
};
{
  // the bar comes with the caret and goes with it (a popover of its own, the pointer on it, or a dialog keep it)
  document.addEventListener('focusin', e => { const el = EBAR.editorOf(e.target); if (el && !$('.strip')) EBAR.show(el); });
  document.addEventListener('focusout', () => { setTimeout(() => { const c = EBAR.cur; if (!c) return; const a = document.activeElement; if (c.el === a || c.el.contains(a) || EBAR.popOpen || EBAR.over) return; EBAR.hide(); }, 150); });
  let t = null; document.addEventListener('selectionchange', () => { clearTimeout(t); t = setTimeout(() => { if (EBAR.cur) return EBAR.sync(); const el = EBAR.editorOf(document.activeElement); if (el && !$('.strip')) EBAR.show(el); }, 60); });
  // it moves with the paper, and gives way to the Ctrl+Enter strip (back when the strip is gone)
  const ap = Paper.prototype.apply; Paper.prototype.apply = function () { const r = ap.apply(this, arguments); if (EBAR.cur) EBAR.place(); return r; };
  addEventListener('resize', () => EBAR.cur && EBAR.place());
  const os = ED.openStrip; ED.openStrip = function () { EBAR.hide(); return os.apply(this, arguments); };
  new MutationObserver(() => { if (!EBAR.cur && !$('.strip')) { const el = EBAR.editorOf(document.activeElement); if (el) EBAR.show(el); } }).observe(document.body, { childList: true });
  // Settings → Writing gets the same choices (SettingsView is defined later in the build, so this waits for the load to finish)
  setTimeout(() => { if (typeof SettingsView === 'undefined') return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try { const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Writing'), sec = h2 && h2.closest('.sec-h'); let after = sec && sec.nextElementSibling; while (after && !after.classList.contains('grid2')) after = after.nextElementSibling; if (after) after.after(EBAR.settingsUI()); } catch (e) { console.warn('[editor bar]', e); }
    return out; }; }, 0);
}
