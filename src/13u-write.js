/* ==========================================================================
   13u · Writing like a word processor, inside a component.
   Lists:     * or - then Space → • bullet;  1. then Space → numbered;  [ ] then Space → ☐ checkbox
              Enter continues the list (an empty item ends it); Tab / Shift+Tab nest up to 3 levels (1. → a. → i. · • → ◦ → ▪);
              numbers renumber themselves; click ☐ to tick it ☑.
   Styles:    Ctrl+B bold · Alt+I italic · Ctrl+U underline (marks like any other, so they survive edits)
   As you type: --> → · <-- ← · <-> ↔ · => ⇒ · >= ≥ · <= ≤ · != ≠ · ~= ≈ · +- ± · 37 deg → 37° ·
              5 uL → 5 µL · 3x4 → 3×4 · ^2 → ² · ^-1 → ⁻¹ · CO_2 → CO₂ · -- – · --- — · ... … · “curly quotes”
              Backspace straight after a replacement puts back what you typed. Each group can be switched off in Settings.
   ========================================================================== */
const WRITE = {
  IND: '    ', BUL: ['•', '◦', '▪'],
  LINE: /^((?: {4})*)(•|◦|▪|\d+[.)]|(?<=^ {4,})[a-z]{1,6}[.)]|☐|☑) /,
  /** Numbered lists count 1. 2. 3. → a. b. c. → i. ii. iii. as they nest. */
  NUM: /^((?: {4})*)(\d+|(?<=^ {4,})[a-z]{1,6})([.)]) /,
  alpha(n) { let s = ''; while (n > 0) { n--; s = String.fromCharCode(97 + n % 26) + s; n = Math.floor(n / 26); } return s; },
  roman(n) { let s = ''; for (const [v, r] of [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]) while (n >= v) { s += r; n -= v; } return s; },
  numTok: (lvl, n) => lvl === 1 ? WRITE.alpha(n) : lvl >= 2 ? WRITE.roman(n) : String(n),
  on: g => { const a = settings().autoReplace || {}; return a[g] !== false; },
  SUP: { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' },
  SUB: { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' },
  /** [group, pattern at the caret, replacement] — first match wins. */
  RULES: [
    ['arrows', /<->$/, '↔'], ['arrows', /<--$/, '←'], ['arrows', /(?:–|--)>$/, '→'], ['arrows', /≤>$/, '⇔'], ['arrows', /≤=$/, '⇐'], ['arrows', /=>$/, '⇒'], ['arrows', /<–$/, '←'],
    ['typo', /–-$/, '—'], ['typo', /--$/, '–'], ['typo', /\.\.\.$/, '…'],
    ['science', />=$/, '≥'], ['science', /<=$/, '≤'], ['science', /!=$/, '≠'], ['science', /~=$/, '≈'], ['science', /\+-$/, '±'],
    ['science', /(\d) ?deg([\sC.,;:)])$/, (m, d, e) => d + '°' + e],
    ['science', /(\d ?)u(L|l|M|g|m|mol|s|A|W|V|Pa)([\s.,;:)\/])$/, (m, a, u, e) => a + 'µ' + u + e],
    ['science', /(\d)( ?)x( ?)(\d)$/, (m, a, s1, s2, b) => a + s1 + '×' + s2 + b],
    ['scripts', /\^(-?\d)$/, (m, x) => [...x].map(c => WRITE.SUP[c]).join('')],
    ['scripts', /([A-Za-z)\]])_(\d)$/, (m, a, d) => a + WRITE.SUB[d]],
  ],
  _last: null,
  /** Called on input: replace what was just typed if it matches a rule. Returns true when it changed the text. */
  autoReplace(el, e) {
    if (!e || e.inputType !== 'insertText' || !e.data) return false;
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return false;
    const node = s.anchorNode, off = s.anchorOffset; if (!node || node.nodeType !== 3 || !el.contains(node)) return false;
    if (node.parentElement && node.parentElement.closest('.mx,.ct')) return false;
    const before = node.nodeValue.slice(0, off);
    // quotes
    if ((e.data === '"' || e.data === "'") && WRITE.on('typo')) { const prev = before.slice(-2, -1), open = !prev || /[\s(\[{–—]/.test(prev);
      return WRITE.swap(node, off, 1, e.data === '"' ? (open ? '“' : '”') : (open ? '‘' : '’'), e.data); }
    for (const [g, rx, rep] of WRITE.RULES) { if (!WRITE.on(g)) continue; const m = rx.exec(before.slice(-12)); if (!m) continue;
      const out = typeof rep === 'function' ? rep(...m) : rep; if (out === m[0]) continue; return WRITE.swap(node, off, m[0].length, out, m[0]); }
    WRITE._last = null; return false;
  },
  swap(node, off, len, out, orig) {
    const v = node.nodeValue; node.nodeValue = v.slice(0, off - len) + out + v.slice(off); const pos = off - len + out.length;
    const r = document.createRange(); r.setStart(node, pos); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    WRITE._last = { node, pos, out, orig }; return true;
  },
  /** Backspace straight after a replacement restores what was typed. */
  undoReplace() {
    const L = WRITE._last; WRITE._last = null; if (!L) return false; const s = getSelection();
    if (!s.isCollapsed || s.anchorNode !== L.node || s.anchorOffset !== L.pos || L.node.nodeValue.slice(L.pos - L.out.length, L.pos) !== L.out) return false;
    const v = L.node.nodeValue; L.node.nodeValue = v.slice(0, L.pos - L.out.length) + L.orig + v.slice(L.pos); const p = L.pos - L.out.length + L.orig.length;
    const r = document.createRange(); r.setStart(L.node, p); r.collapse(true); s.removeAllRanges(); s.addRange(r); return true;
  },

  /* ---------------- lists ---------------- */
  lineAt(text, pos) { const a = text.lastIndexOf('\n', pos - 1) + 1, z0 = text.indexOf('\n', pos), z = z0 < 0 ? text.length : z0; return { a, z, line: text.slice(a, z) }; },
  level: ind => Math.min(2, Math.floor(ind.length / 4)),
  markerFor(kind, lvl, n) { return kind === 'num' ? WRITE.numTok(lvl, n || 1) + '. ' : kind === 'box' ? '☐ ' : WRITE.BUL[lvl] + ' '; },
  kindOf: mk => /^(\d+|[a-z]+)[.)]$/.test(mk) ? 'num' : /[☐☑]/.test(mk) ? 'box' : 'bul',
  /** Number every numbered run again (per level), keeping the caret where it was. */
  renumber(body, caret) {
    const lines = body.text.split('\n'), counters = []; let pos = 0, out = body;
    lines.forEach((ln, i) => { const m = WRITE.NUM.exec(ln);
      if (!m) { if (!WRITE.LINE.test(ln)) counters.length = 0; pos += ln.length + 1; return; }
      const lvl = WRITE.level(m[1]); counters.length = lvl + 1; counters[lvl] = (counters[lvl] || 0) + 1;
      const want = WRITE.numTok(lvl, counters[lvl]); if (want !== m[2]) { const at = pos + m[1].length; out = ED.splice(out, at, m[2].length, want); if (caret > at) caret += want.length - m[2].length; ln = ln.replace(m[2], want); }
      pos += ln.length + 1; });
    return { body: out, caret };
  },
  apply(el, b, fn) {
    const cur = M.block(b.id), body = ED.read(el, cur.body.marks), sel = ED.selection(el); if (!sel) return false;
    const res = fn(body, sel); if (!res) return false;
    const rn = WRITE.renumber(res.body, res.caret);
    M.saveBlockBody(cur, rn.body); ED.render(el, cur); ED.setCaret(el, rn.caret); el._save && el._save(); return true;
  },
  /** Space after * - 1. [ ] at the start of a line makes it a list item. */
  space(el, b) {
    return WRITE.apply(el, b, (body, sel) => {
      if (!sel.collapsed) return null; const { a, line } = WRITE.lineAt(body.text, sel.from), head = body.text.slice(a, sel.from);
      if (head !== line.slice(0, sel.from - a)) return null;
      const m = /^((?: {4})*)(\*|-|\d+[.)]|\[ ?\]|\[x\])$/.exec(head); if (!m) return null;
      const lvl = WRITE.level(m[1]), tok = m[2], mk = /^\d/.test(tok) ? tok + ' ' : /^\[/.test(tok) ? (tok === '[x]' ? '☑ ' : '☐ ') : WRITE.BUL[lvl] + ' ';
      const nb = ED.splice(body, a + m[1].length, tok.length, mk); return { body: nb, caret: a + m[1].length + mk.length };
    });
  },
  /** Enter in a list: a new item below; on an empty item, leave the list (or step out one level). */
  enter(el, b) {
    return WRITE.apply(el, b, (body, sel) => {
      const { a, z, line } = WRITE.lineAt(body.text, sel.from), m = WRITE.LINE.exec(line); if (!m) return null;
      const ind = m[1], mk = m[2], rest = line.slice(m[0].length);
      if (!rest.trim() && sel.from >= a + m[0].length) {
        if (ind.length) { const nInd = ind.slice(4), lvl = WRITE.level(nInd), k = WRITE.kindOf(mk), nm = WRITE.markerFor(k, lvl, 1); const nb = ED.splice(body, a, m[0].length, nInd + nm); return { body: nb, caret: a + nInd.length + nm.length }; }
        const nb = ED.splice(body, a, m[0].length, ''); return { body: nb, caret: a };
      }
      const k = WRITE.kindOf(mk), next = ind + WRITE.markerFor(k, WRITE.level(ind), k === 'num' ? 99 : 1); // renumber() sets the real count
      let nb = body; if (!sel.collapsed) nb = ED.splice(nb, sel.from, sel.to - sel.from, '');
      nb = ED.splice(nb, sel.from, 0, '\n' + next); return { body: nb, caret: sel.from + 1 + next.length };
    });
  },
  /** Tab / Shift+Tab on a list item: nest it one level deeper or bring it back. */
  indent(el, b, out) {
    return WRITE.apply(el, b, (body, sel) => {
      const lines = []; let p = 0; body.text.split('\n').forEach(l => { lines.push({ a: p, l }); p += l.length + 1; });
      const hit = lines.filter(x => x.a + x.l.length >= sel.from && x.a <= Math.max(sel.from, sel.to - (sel.to > sel.from ? 1 : 0)) && WRITE.LINE.test(x.l)); if (!hit.length) return null;
      let nb = body, caret = sel.from, shift = 0;
      for (const x of hit) { const m = WRITE.LINE.exec(x.l), ind = m[1], lvl = WRITE.level(ind); if (out ? !ind.length : lvl >= 2) continue;
        const nInd = out ? ind.slice(4) : ind + WRITE.IND, k = WRITE.kindOf(m[2]), nm = k === 'box' ? m[2] + ' ' : WRITE.markerFor(k, WRITE.level(nInd), 1);
        const at = x.a + shift; nb = ED.splice(nb, at, m[0].length, nInd + nm); const d = nInd.length + nm.length - m[0].length; if (caret >= at) caret += d; shift += d; }
      return { body: nb, caret: Math.max(0, caret) };
    });
  },
  /** Click a ☐ to tick it. */
  toggleBox(el, b, e) {
    const pos = document.caretPositionFromPoint ? document.caretPositionFromPoint(e.clientX, e.clientY) : null, rng = !pos && document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    const node = pos ? pos.offsetNode : rng && rng.startContainer, off = pos ? pos.offset : rng && rng.startOffset; if (!node || node.nodeType !== 3) return false;
    const v = node.nodeValue, i = [off - 1, off].find(k => v[k] === '☐' || v[k] === '☑'); if (i == null) return false;
    const at = ED.offsetOf(el, node, i), cur = M.block(b.id), body = ED.read(el, cur.body.marks); const { a } = WRITE.lineAt(body.text, at); if (!/^ *$/.test(body.text.slice(a, at))) return false;
    const nb = ED.splice(body, at, 1, body.text[at] === '☐' ? '☑' : '☐'); M.saveBlockBody(cur, nb); ED.render(el, cur); el._save && el._save(); return true;
  },

  /* ---------------- bold / italic / underline ---------------- */
  STYLE: { b: 'bold', i: 'italic', u: 'underline' },
  toggle(el, b, s) {
    const sel = ED.selection(el); if (!sel) return; if (sel.collapsed) return WRITE.typeStyle(el, b, s);
    const cur = M.block(b.id), body = ED.read(el, cur.body.marks), F = body.marks.filter(m => m.type === 'fmt' && m.s === s);
    // fully covered already → take it off; otherwise put it on (merging with what touches it)
    const covered = pos => F.some(m => m.from <= pos && m.to > pos); let all = true; for (let i = sel.from; i < sel.to; i++) if (body.text[i] !== '\n' && !covered(i)) { all = false; break; }
    let marks = body.marks.filter(m => !(m.type === 'fmt' && m.s === s));
    if (all) { F.forEach(m => { if (m.to <= sel.from || m.from >= sel.to) marks.push(m); else { if (m.from < sel.from) marks.push({ id: uid('m'), type: 'fmt', s, from: m.from, to: sel.from }); if (m.to > sel.to) marks.push({ id: uid('m'), type: 'fmt', s, from: sel.to, to: m.to }); } }); }
    else { let a = sel.from, z = sel.to; F.forEach(m => { if (m.to < a || m.from > z) marks.push(m); else { a = Math.min(a, m.from); z = Math.max(z, m.to); } }); marks.push({ id: uid('m'), type: 'fmt', s, from: a, to: z }); }
    M.saveBlockBody(cur, { text: body.text, marks }); ED.render(el, cur); ED.setCaret(el, sel.from, sel.to); el._save && el._save();
  },
  /** No words selected: the style switches on for what you type next, and off again with the same key or a ":" (typed plain). */
  fmtSpansAtCaret(el) { const s = getSelection(); if (!s.rangeCount) return []; let n = s.anchorNode; n = n && (n.nodeType === 3 ? n.parentElement : n); const out = []; while (n && n !== el) { if (n.matches && n.matches('.fb,.fi,.fu')) out.push(n); n = n.parentElement; } return out; },
  atEndOf(span) { const s = getSelection(), r = document.createRange(); r.setStart(s.anchorNode, s.anchorOffset); r.setEnd(span, span.childNodes.length); return !r.toString().replace(/\u200B/g, ''); },
  /** Put the caret just after the outermost of these spans, on a zero-width space, so typing is plain again. */
  escape(spans) { const outer = spans[spans.length - 1]; const z = document.createTextNode('\u200B'); outer.after(z); const r = document.createRange(), s = getSelection(); r.setStart(z, 1); r.collapse(true); s.removeAllRanges(); s.addRange(r); },
  /** Open styled spans at the caret, registered as (still empty) marks that grow as you type. */
  openStyles(el, b, styles) {
    const sel = ED.selection(el); if (!sel) return; const cur = M.block(b.id), body = ED.read(el, cur.body.marks), s = getSelection(); if (!s.rangeCount) return;
    const marks = styles.map(x => ({ id: uid('m'), type: 'fmt', s: x, from: sel.from, to: sel.from })); cur.body = { text: body.text, marks: [...body.marks, ...marks] }; DB.put('blocks', cur);
    let inner = document.createTextNode('\u200B'), node = inner; marks.forEach(m => { node = h('span.f' + m.s, { 'data-m': m.id }, node); });
    const r = s.getRangeAt(0); r.insertNode(node); const c = document.createRange(); c.setStart(inner, 1); c.collapse(true); s.removeAllRanges(); s.addRange(c);
  },
  typeStyle(el, b, s) {
    const spans = WRITE.fmtSpansAtCaret(el).filter(x => WRITE.atEndOf(x)), on = spans.map(x => x.className.match(/\bf([biu])\b/)).filter(Boolean).map(m => m[1]);
    if (on.includes(s)) { WRITE.escape(spans); const keep = on.filter(x => x !== s); if (keep.length) WRITE.openStyles(el, b, keep); return; }
    if (spans.length) WRITE.escape(spans);
    WRITE.openStyles(el, b, [...new Set([...on, s])]);
  },
  /** Typing ":" at the end of styled text ends the style; the colon itself is plain. */
  colon(el, e) {
    if (e.inputType !== 'insertText' || e.data !== ':') return;
    const spans = WRITE.fmtSpansAtCaret(el).filter(x => WRITE.atEndOf(x)); if (spans.length) WRITE.escape(spans);
  },
  /** Keys inside a component. Returns true when handled. */
  onKey(e, el, b) {
    const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (mod && !e.shiftKey && !e.altKey && k === 'b') { e.preventDefault(); WRITE.toggle(el, b, 'b'); return true; }
    if (mod && !e.shiftKey && !e.altKey && k === 'u') { e.preventDefault(); WRITE.toggle(el, b, 'u'); return true; }
    if (e.altKey && !mod && !e.shiftKey && e.code === 'KeyI') { e.preventDefault(); WRITE.toggle(el, b, 'i'); return true; }
    if (e.key === 'Backspace' && !mod && WRITE._last) { if (WRITE.undoReplace()) { e.preventDefault(); el._save && el._save(); return true; } }
    if (e.key === ' ' && !mod && !e.altKey) { if (WRITE.space(el, b)) { e.preventDefault(); return true; } }
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) { if (WRITE.enter(el, b)) { e.preventDefault(); e.stopPropagation(); return true; } }
    if (e.key === 'Tab' && !mod && !e.altKey) { if (WRITE.indent(el, b, e.shiftKey)) { e.preventDefault(); return true; } }
    if (e.key !== 'Backspace') WRITE._last = WRITE._last && e.key.length === 1 ? null : WRITE._last;
    return false;
  },
};
