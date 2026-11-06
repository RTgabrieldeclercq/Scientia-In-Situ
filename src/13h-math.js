/* ==========================================================================
   13h · Math. Typing $…$ (inline) or $$…$$ (display) — or \( … \) and
   \[ … \] — in any box turns it into a typeset equation as soon as it is
   closed. An equation is one atom in the text (like a citation); click it to
   edit it in a full equation editor (MathLive) with LaTeX alongside, the
   usual shortcuts (legend under “?”) and an optional symbol keyboard with
   tabs. Rendering and the editor work offline; fonts are inlined.
   ========================================================================== */
const MATH = {
  ok: () => !!(window.MathLive && window.MathfieldElement),
  init() {
    if (!MATH.ok()) return;
    try { MathfieldElement.fontsDirectory = null; MathfieldElement.soundsDirectory = null; } catch { }
  },
  /** Typeset LaTeX to HTML (static). */
  html(tex, display) {
    if (!MATH.ok()) return null;
    try { return MathLive.convertLatexToMarkup(tex, { defaultMode: display ? 'math' : 'inline-math' }); } catch { return null; }
  },
  atom(m) {
    const html = MATH.html(m.tex || '', m.display);
    const el = h('span.mx' + (m.display ? '.disp' : ''), { contenteditable: 'false', 'data-obj': '', 'data-math': '', 'data-m': m.id, title: 'Click to edit the equation' });
    if (html) el.innerHTML = html; else el.append(h('code', m.display ? '$$' + m.tex + '$$' : '$' + m.tex + '$'));
    return el;
  },
  /** The patterns that become equations. Single $ follows the usual rule: no space just inside, no digit right after (so "$5 and $10" stays text). */
  RX: /\$\$([^$]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$\w])\$(?![\s$])([^$\n]+?)(?<![\s\\])\$(?![\d$])/,
  find(text) {
    const m = MATH.RX.exec(text); if (!m) return null;
    const tex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim(); if (!tex) return null;
    return { at: m.index, len: m[0].length, tex, display: m[1] != null || m[2] != null };
  },
  /** Called on every input in a box: converts the first closed equation it finds. Returns true when it re-rendered the box. */
  autoConvert(el, b) {
    if (!/[$\\]/.test(el.textContent)) return false;
    const cur = M.block(b.id); if (!cur) return false;
    const body = ED.read(el, cur.body.marks), f = MATH.find(body.text); if (!f) return false;
    // record the equation first, then swap the typed source for the atom in place — typing carries on without a re-render
    const mark = { id: uid('m'), type: 'math', from: f.at, to: f.at + 1, tex: f.tex, display: f.display }, next = ED.splice(body, f.at, f.len, OBJ); next.marks.push(mark);
    M.saveBlockBody(cur, next);
    try {
      ED.setCaret(el, f.at, f.at + f.len); const sel = getSelection(), r = sel.getRangeAt(0); r.deleteContents();
      const atom = MATH.atom(mark); r.insertNode(atom);
      const after = document.createTextNode('\u200B'); atom.after(after); const c = document.createRange(); c.setStart(after, 1); c.collapse(true); sel.removeAllRanges(); sel.addRange(c);
    } catch { ED.render(el, M.block(b.id)); ED.setCaret(el, f.at + 1); }
    el._save && el._save(); return true;
  },
  editAtom(el, b, markId) {
    const cur = M.block(b.id), mk = cur && (cur.body.marks || []).find(m => m.id === markId); if (!mk) return;
    const ro = el.contentEditable === 'false';
    MATH.editor({ tex: mk.tex, display: mk.display, ro, title: 'Equation',
      onSave: (tex, display) => ED.commit(el, b, bd => { const x = bd.marks.find(m => m.id === markId); if (x) { x.tex = tex; x.display = display; MATH.recordPut(x.eqId, tex); } return bd; }, mk.to),
      onRemove: () => ED.commit(el, b, bd => { const x = bd.marks.find(m => m.id === markId); if (!x) return bd; const n = ED.splice(bd, x.from, 1, x.tex); n.marks = n.marks.filter(m => m.id !== markId); MATH.recordDrop(x.eqId); return n; }, mk.from) });
  },
  /** V3.946 — an equation written from the editor bar (13zzf) is an equation component embedded in the text: the atom's
      mark carries `eqId`, a registry record (13n `equations`) with the equation's terms, so it can be registered, inserted
      elsewhere and wired to a calculator like an Equation box. Edits to the atom follow into the record; taking the
      atom back to plain text drops a record nothing else uses. */
  record(tex) {
    const now = isoLocal(new Date()), rec = { id: uid('eq'), name: snippet(tex, 40), tex, vars: {}, inline: true, uses: 1, created: now, modified: now };
    try { if (typeof EQ !== 'undefined') EQ.terms(tex).forEach(v => { rec.vars[v.k] = { name: '', unit: '' }; }); } catch { }
    DB.put('equations', rec); return rec;
  },
  recordPut(eqId, tex) { const r = eqId && DB.get('equations', eqId); if (!r) return; r.tex = tex; if (r.inline) r.name = snippet(tex, 40); r.modified = isoLocal(new Date()); try { if (typeof EQ !== 'undefined') { const vars = {}; EQ.terms(tex).forEach(v => { vars[v.k] = (r.vars || {})[v.k] || { name: '', unit: '' }; }); r.vars = vars; } } catch { } DB.put('equations', r); },
  recordDrop(eqId) { const r = eqId && DB.get('equations', eqId); if (r && r.inline && !DB.where('blocks', x => x.eqId === eqId).length) DB.del('equations', eqId); },
  /** The equation editor: a MathLive field, its LaTeX, display/inline, the symbol keyboard and the shortcut legend. */
  editor({ tex = '', display = false, ro = false, title = 'Equation', onSave, onRemove }) {
    if (!MATH.ok()) { askText(title + ' (LaTeX)', 'LaTeX', tex, { multiline: true }).then(t => { if (t != null && onSave) onSave(t.trim(), display); }); return; }
    const mf = new MathfieldElement(); mf.value = tex; mf.className = 'meq'; mf.readOnly = ro;
    try { mf.mathVirtualKeyboardPolicy = 'manual'; mf.smartFence = true; mf.smartSuperscript = true; mf.letterShapeStyle = 'tex'; } catch { }
    const src = h('textarea.inp.mtex', { rows: 2, spellcheck: false, readOnly: ro, placeholder: 'LaTeX' }, tex);
    mf.addEventListener('input', () => { if (document.activeElement !== src) src.value = mf.value; });
    src.addEventListener('input', () => { mf.setValue(src.value, { silenceNotifications: true }); });
    src.addEventListener('keydown', e => e.stopPropagation());
    let disp = !!display, kbOn = false;
    const seg = h('div.seg.sm', [[false, 'Inline'], [true, 'Display']].map(([v, l]) => h('button' + (disp === v ? '.on' : ''), { on: { click: e => { disp = v; $$('button', seg).forEach(x => x.classList.toggle('on', x === e.currentTarget)); } } }, l)));
    const kb = h('button.wbtn', { title: 'Symbol keyboard with tabs (numbers, symbols, letters, Greek)', on: { click: () => { kbOn = !kbOn; kb.classList.toggle('on', kbOn); try { kbOn ? (mf.focus(), window.mathVirtualKeyboard.show()) : window.mathVirtualKeyboard.hide(); } catch { } const ov = mf.closest('.ovl'); ov && ov.classList.toggle('kb-up', kbOn); } } }, '⌨ Keyboard');
    const legend = h('div.mlegend', MATH.SHORTCUTS.map(([k, v]) => h('div.mlg', h('kbd', k), h('span', v)))); legend.hidden = true;
    const help = h('button.wbtn.help', { title: 'Shortcuts', on: { click: () => { legend.hidden = !legend.hidden; help.classList.toggle('on', !legend.hidden); } } }, '?');
    const close = () => { try { window.mathVirtualKeyboard.hide(); } catch { } };
    // letters that are one name (MESF, Re, kon) read as a product of single letters; selected and pressed, they become \mathrm{…},
    // which the equation's terms read as one (13n) — nothing can tell the two apart on its own
    const tip = h('div.tiny.muted', 'Type math directly — fractions with /, powers with ^, Greek by name (alpha, pi…). Ctrl+Enter or Done to finish.');
    // only the letters of a name (Greek ones too) — never the = or the whole equation, which the field selects when it opens
    const isName = s => /^[A-Za-z0-9]+$/.test(String(s || '').replace(/\\([A-Za-z]+)\s*/g, (m, c) => typeof TEX !== 'undefined' && TEX.GREEK[c] ? 'a' : '#').replace(/\s+/g, ''));
    const notName = 'Select only the letters of the name (like MESF), not the = or other symbols, then press One name.';
    const one = ro ? null : h('button.wbtn', { title: 'Letters that are one name (MESF, Re, kon): select them, then press this — the equation reads them as one term, not a product of letters', on: { pointerdown: e => e.preventDefault(), click: () => {
      if (document.activeElement === src && src.selectionEnd > src.selectionStart) { const a = src.selectionStart, z = src.selectionEnd, s = src.value.slice(a, z).trim(); if (!isName(s)) { tip.textContent = notName; return; }
        src.value = src.value.slice(0, a) + '\\mathrm{' + s + '}' + src.value.slice(z); mf.setValue(src.value, { silenceNotifications: true }); return; }
      let sel = ''; try { if (!mf.selectionIsCollapsed) sel = mf.getValue(mf.selection, 'latex'); } catch { }
      if (!sel) { tip.textContent = 'Select the letters that make one name first (drag across them in the equation), then press One name.'; try { mf.focus(); } catch { } return; }
      if (!isName(sel)) { tip.textContent = notName; try { mf.focus(); } catch { } return; }
      try { mf.insert('\\mathrm{' + sel.replace(/\s+/g, ' ').trim() + '}', { insertionMode: 'replaceSelection', selectionMode: 'after', format: 'latex' }); } catch { } src.value = mf.value; try { mf.focus(); } catch { } } } }, 'One name');
    const acts = ro ? [{ label: 'Close', run: close }] : [
      onRemove ? { label: 'Back to plain text', run: () => { close(); onRemove(); } } : null,
      { label: 'Cancel', run: close },
      { label: 'Done', pri: true, run: () => { close(); const t = (mf.value || '').trim(); if (onSave) onSave(t, disp); } }].filter(Boolean);
    const m = modal({ title, wide: true, body: h('div.meditor', h('div.mtool', seg, one, h('span.spacer'), kb, help), mf, legend, h('label.f', h('span', 'LaTeX'), src),
      tip), actions: acts, onClose: close });
    // with something selected, the structure keys wrap it: select “eq”, press _ → a subscript of eq
    mf.addEventListener('keydown', e => {
      const t = e.altKey && !e.ctrlKey && !e.metaKey ? MATH.WRAP_ALT[e.code] : !e.ctrlKey && !e.metaKey && !e.altKey ? MATH.WRAP[e.key] : null; if (!t) return;
      let collapsed = true; try { collapsed = mf.selectionIsCollapsed; } catch { } if (collapsed) return;
      e.preventDefault(); e.stopPropagation(); try { mf.insert(t, { selectionMode: 'placeholder', format: 'latex' }); } catch { } src.value = mf.value;
    }, true);
    mf.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('.modal .mf .btn.pri') && $('.modal .mf .btn.pri').click(); } });
    setTimeout(() => { try { mf.focus(); } catch { } }, 60);
    return m;
  },
  WRAP: { _: '_{#@}', '^': '^{#@}', '/': '\\frac{#@}{#?}', '(': '\\left(#@\\right)', '[': '\\left[#@\\right]', '|': '\\left|#@\\right|', '{': '\\left\\lbrace #@\\right\\rbrace' },
  WRAP_ALT: { KeyR: '\\sqrt{#@}', KeyN: '\\sqrt[#?]{#@}', KeyB: '\\overline{#@}', KeyH: '\\hat{#@}', KeyV: '\\vec{#@}', KeyD: '\\dot{#@}', KeyT: '\\text{#@}' },
  SHORTCUTS: [
    ['Select, then _', 'the selection becomes a subscript'], ['Select, then ^', 'the selection becomes a superscript'], ['Select, then /', 'the selection becomes a numerator'],
    ['Select, then ( [ { |', 'wrap the selection in brackets or bars'], ['Select, then Alt+R · Alt+N', 'square root · nth root of the selection'],
    ['Select, then Alt+B · Alt+H · Alt+V · Alt+D', 'bar · hat · vector · dot over it'], ['Select, then Alt+T', 'make it upright text'],
    ['Select, then One name', 'letters that are one name (MESF, Re) become one term'],
    ['/', 'fraction — what you typed becomes the numerator'], ['^', 'superscript / power'], ['_', 'subscript'], ['Tab / Shift+Tab', 'next / previous placeholder'],
    ['→ ← ↑ ↓', 'move through the equation'], ['Space', 'leave a superscript or subscript'], ['\\', 'type a LaTeX command (\\frac, \\sum…) then Enter'],
    ['sqrt', '√'], ['nthroot', 'ⁿ√'], ['sum · prod · int', 'Σ · Π · ∫ with limits'], ['lim', 'limit'], ['alpha … omega', 'Greek letters (Alpha for capitals)'],
    ['pi · infty', 'π · ∞'], ['xx · *', '×  ·  ·'], ['+- · -+', '± · ∓'], ['<= · >= · !=', '≤ · ≥ · ≠'], ['~~ · ~=', '≈ · ≅'], ['->  · =>', '→ · ⇒'],
    ['in · notin · sub', '∈ · ∉ · ⊂'], ['AA · EE', '∀ · ∃'], ['deg', '°'], ['(', 'matching ( ) are added (smart fence)'],
    ['Alt+[ · Alt+]', 'matrix row / column (inside a matrix)'], ['Ctrl+Z · Ctrl+Shift+Z', 'undo · redo'], ['Ctrl+A', 'select all'], ['Esc', 'LaTeX mode toggle inside the field'],
    ['Ctrl+Enter', 'done'],
  ],
};
MATH.init();
INSERTS.push({ id: 'equation', group: 'Writing', icon: '∑', label: 'Equation', sub: 'Or type $…$ / $$…$$ in any box', run: (d, p) => {
  MATH.editor({ tex: '', display: true, title: 'New equation', onSave: (tex, display) => { if (!tex) return; const b = M.addBlock(d.id, null, { x: p.x, y: p.y, label: 'Equation' }); M.saveBlockBody(b, { text: OBJ, marks: [{ id: uid('m'), type: 'math', from: 0, to: 1, tex, display }] }); changed(); } }); } });
