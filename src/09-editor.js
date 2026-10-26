/* ==========================================================================
   09 · Editor — marks-as-ranges over plain text, one component body at a time.
   Render: split text at every mark boundary and nest spans (struct > term > link).
   Read:   walk the DOM, collect text + the mark ids of each text node's
           ancestors → contiguous ranges. Citations are atomic U+FFFC chars
           rendered as non-editable spans, so the display mode can change freely.
   Styling (bold · italic · underline) and lists live in 13u-write.js; the marks here carry meaning —
     struct  (Ctrl+Enter)  claim · barrier · resolution · … — coloured per Settings
     term    (Ctrl+W)      outlined bold; joins the project's term repository
     cite    (Ctrl+I)      a library record, shown as title / author–year / number
     link    (Ctrl+Enter L) a note or component; a dotted ring means not yet written
   ========================================================================== */
const OBJ = '￼';
const ED = {
  /* ---------------- render ---------------- */
  render(el, b, docOverride) {
    const body = b.body, text = body.text, marks = (body.marks || []).filter(m => m.to > m.from);
    const d = docOverride || M.doc(b.docId), mode = (d && d.citeMode) || 'title', citeNums = ED.citeNumbers(d);
    const cuts = new Set([0, text.length]); marks.forEach(m => { cuts.add(m.from); cuts.add(m.to); });
    // list lines (13u) get a hanging indent: [marker][text that wraps under itself], so cut at line starts and marker ends
    const rows = []; { let p = 0; for (const ln of text.split('\n')) { const m = typeof WRITE !== 'undefined' && WRITE.LINE.exec(ln); if (m) { rows.push({ a: p, mk: p + m[0].length, z: p + ln.length + 1 }); cuts.add(p); cuts.add(p + m[0].length); cuts.add(Math.min(text.length, p + ln.length + 1)); } p += ln.length + 1; } }
    const pts = [...cuts].filter(x => x >= 0 && x <= text.length).sort((x, y) => x - y), frag = document.createDocumentFragment();
    let ri = 0, row = null;
    const put = (a, x) => {
      while (ri < rows.length && a >= rows[ri].z) { ri++; row = null; }
      const R = rows[ri]; if (!R || a < R.a) return frag.append(x);
      if (!row) { row = { mk: h('span.li-mk'), tx: h('span.li-tx') }; frag.append(h('span.li-row', row.mk, row.tx)); }
      (a < R.mk ? row.mk : row.tx).append(x);
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], z = pts[i + 1], seg = text.slice(a, z), cov = marks.filter(m => m.from <= a && m.to >= z);
      const math = cov.find(m => m.type === 'math');
      if (math) { for (const ch of seg) { if (ch !== OBJ) { put(a, ch); continue; } put(a, MATH.atom(math)); } continue; }
      const cite = cov.find(m => m.type === 'cite');
      if (cite) { for (const ch of seg) { if (ch !== OBJ) { put(a, ch); continue; } const r = M.lib(cite.ref);
        put(a, h('span.ct' + (mode === 'number' ? '.num' : mode === 'author' ? '.au' : ''), { contenteditable: 'false', 'data-obj': '', 'data-cite': cite.ref, 'data-m': cite.id }, LIB.citeText(r, mode, citeNums.get(cite.ref)))); } continue; }
      let node = document.createTextNode(seg);
      for (const m of cov.filter(m => m.type === 'fmt')) node = h('span.f' + m.s, { 'data-m': m.id }, node);
      for (const m of cov.filter(m => m.type === 'link')) { const tg = IX.linkTarget(m); node = h('span.ln' + (tg ? '' : '.open') + (m.to === z ? '.end' : ''), { 'data-m': m.id, 'data-link': m.ref || '', 'data-title': m.title || '' }, node); }
      for (const m of cov.filter(m => m.type === 'term')) node = h('span.tm', { 'data-m': m.id, 'data-term': m.ref }, node);
      for (const m of cov.filter(m => m.type === 'struct')) {
        const it = M.item(m.ref), k = it ? it.kind : 'observation', st = IX.status(it);
        node = h('span.st.st-' + k + (st === 'closed' ? '.closed' : '') + (it && it.originBlockId !== b.id ? '.mention' : '') + (it && it.correctedBy ? '.corrected' : ''), { 'data-m': m.id, 'data-item': m.ref }, node);
      }
      put(a, node);
    }
    frag.querySelectorAll('.li-tx').forEach(t => { if (!t.firstChild) t.append('\u200B'); }); // an empty item still takes the caret after its marker
    if (text.endsWith('\n')) frag.append(h('br')); // a trailing line break needs something after it to show (and to take the caret)
    el.replaceChildren(frag);
  },
  citeNumbers(d) {
    const map = new Map(); if (!d) return map;
    for (const b of M.docBlocks(d.id)) for (const m of (b.body.marks || []).filter(x => x.type === 'cite').sort((x, y) => x.from - y.from)) if (!map.has(m.ref)) map.set(m.ref, map.size + 1);
    return map;
  },

  /* ---------------- read back ---------------- */
  read(el, prev) {
    let text = ''; const rng = {};
    const ext = (ids, a, z) => ids.forEach(id => { const r = rng[id]; if (!r) rng[id] = [a, z]; else { r[0] = Math.min(r[0], a); r[1] = Math.max(r[1], z); } });
    const walk = (node, ids) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { const v = c.nodeValue.replace(/​/g, ''); if (v) { ext(ids, text.length, text.length + v.length); text += v; } }
        else if (c.nodeType === 1) {
          if (c.dataset && c.dataset.obj !== undefined) { ext([...ids, c.dataset.m], text.length, text.length + 1); text += OBJ; }
          else if (c.tagName === 'BR') { if (c.nextSibling || c.parentNode !== el) text += '\n'; }
          else { if ((c.tagName === 'DIV' || c.tagName === 'P') && text && !text.endsWith('\n')) text += '\n'; walk(c, c.dataset && c.dataset.m ? [...ids, c.dataset.m] : ids); }
        }
      }
    };
    walk(el, []);
    const marks = (prev || []).filter(m => rng[m.id] && rng[m.id][1] > rng[m.id][0]).map(m => Object.assign({}, m, { from: rng[m.id][0], to: rng[m.id][1] }));
    return { text, marks };
  },
  offsetOf(el, node, off) {
    const r = document.createRange(); r.setStart(el, 0);
    try { r.setEnd(node, off); } catch { return 0; }
    const tmp = h('div'); tmp.append(r.cloneContents()); return ED.read(tmp, []).text.length;
  },
  selection(el) {
    const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0);
    if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return null;
    const a = ED.offsetOf(el, r.startContainer, r.startOffset), z = ED.offsetOf(el, r.endContainer, r.endOffset);
    let rect = r.getBoundingClientRect(); if (!rect.width && !rect.height) rect = el.getBoundingClientRect();
    return { from: Math.min(a, z), to: Math.max(a, z), rect, collapsed: r.collapsed };
  },
  /** The DOM spot for a text offset: [node, offset]. */
  domPos(el, target) {
    const find = target => { let left = target, hit = null;
      const walk = node => { for (const c of node.childNodes) {
        if (c.nodeType === 3) { const v = c.nodeValue, vis = v.replace(/\u200B/g, '').length; if (left < vis || (left === vis && !(c.parentElement && c.parentElement.classList.contains('li-mk')) && !(vis && v.endsWith('\n')))) { let i = 0, n = 0; while (i < v.length && (n < left || v[i] === '\u200B')) { if (v[i] !== '\u200B') n++; i++; } hit = [c, i]; return true; } left -= vis; }
        else if (c.dataset && c.dataset.obj !== undefined) { if (left === 0) { hit = [c.parentNode, [...c.parentNode.childNodes].indexOf(c)]; return true; } left -= 1; if (left === 0) { hit = [c.parentNode, [...c.parentNode.childNodes].indexOf(c) + 1]; return true; } }
        else if (c.tagName === 'BR') { if (left === 0) { hit = [c.parentNode, [...c.parentNode.childNodes].indexOf(c)]; return true; } left -= 1; }
        else if (walk(c)) return true; } return false; };
      walk(el); return hit || [el, el.childNodes.length]; };
    return find(target);
  },
  setCaret(el, pos, end) {
    const find = t => ED.domPos(el, t);
    const s = getSelection(), r = document.createRange(), [n1, o1] = find(pos); r.setStart(n1, o1);
    if (end != null) { const [n2, o2] = find(end); r.setEnd(n2, o2); } else r.collapse(true);
    s.removeAllRanges(); s.addRange(r);
  },
  wordAt(text, pos) { let a = pos, z = pos; while (a > 0 && /[\p{L}\p{N}\-]/u.test(text[a - 1])) a--; while (z < text.length && /[\p{L}\p{N}\-]/u.test(text[z])) z++; return a < z ? [a, z] : null; },
  splice(body, at, del, ins) {
    const n = ins.length - del, text = body.text.slice(0, at) + ins + body.text.slice(at + del);
    const marks = body.marks.map(m => { const x = Object.assign({}, m);
      if (x.from >= at + del) { x.from += n; x.to += n; } else if (x.to > at) { x.to = Math.max(at, x.to + n); }
      return x; }).filter(m => m.to > m.from);
    return { text, marks };
  },

  /* ---------------- wiring a body element ---------------- */
  attach(el, b) {
    ED.render(el, b);
    const locked = M.isLocked(b) && !ED.unlocked.has(b.id);
    el.contentEditable = b.status === 'superseded' || b.kind === 'ref' || locked ? 'false' : 'true';
    el.classList.toggle('locked', locked);
    el.spellcheck = true;
    const save = debounce(() => { const cur = M.block(b.id); if (!cur || !el.isConnected) return; const body = ED.read(el, cur.body.marks); if (body.text === cur.body.text && JSON.stringify(body.marks) === JSON.stringify(cur.body.marks)) return; M.saveBlockBody(cur, body); IX.rebuild(); DB.beginGroup(); DV(el).softRefresh(b.id); }, 450);
    el._save = save;
    el.addEventListener('beforeinput', e => { ED.markerEscape(el, e); WRITE.colon(el, e); ED.edgeEscape(el, e); });
    el.addEventListener('input', e => { if (el.contentEditable === 'true') WRITE.autoReplace(el, e); if (!MATH.autoConvert(el, b, e)) save(); });
    el.addEventListener('blur', () => { save(); setTimeout(() => TERMSCAN.afterEdit(b.id), 700); });
    el.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\r/g, '')); });
    el.addEventListener('keydown', e => ED.onKey(e, el, b, save));
    el.addEventListener('click', e => {
      if (el.contentEditable === 'true' && getSelection().isCollapsed && !e.ctrlKey && !e.altKey && WRITE.toggleBox(el, b, e)) return;
      if (el.classList.contains('locked') && getSelection().isCollapsed && !e.target.closest('.st,.tm,.ln,.ct,.mx')) return ED.lockedPrompt(b, e);
      const mx = e.target.closest('.mx'); if (mx) { MATH.editAtom(el, b, mx.dataset.m); return; }
      const tm = e.target.closest('.tm'), st = e.target.closest('.st'), ln = e.target.closest('.ln');
      if (ln && (e.ctrlKey || e.metaKey || e.altKey || el.contentEditable === 'false')) { e.preventDefault(); ED.followLink(b, ln.dataset.m, e); return; }
      if (tm && (e.ctrlKey || e.metaKey)) { App.go('#/lens/' + tm.dataset.term); return; }
      if (!getSelection().isCollapsed) return;
      if (tm && e.altKey) return ED.termPopover(tm.dataset.term, e.clientX, e.clientY + 14, b, tm.dataset.m);
      if (st && (e.altKey || el.contentEditable === 'false')) return ED.itemPopover(st.dataset.item, e.clientX, e.clientY + 14, b, st.dataset.m);
      if (tm && el.contentEditable === 'false') return ED.termPopover(tm.dataset.term, e.clientX, e.clientY + 14, b, tm.dataset.m);
    });
    el.addEventListener('mouseover', e => {
      const st = e.target.closest('.st'), tm = e.target.closest('.tm'), ct = e.target.closest('.ct'), ln = e.target.closest('.ln');
      if (ct) return hoverCard(ct, () => { const r = M.lib(ct.dataset.cite); return r ? LIB.hovercard(r) : null; });
      if (tm) return hoverCard(tm, () => ED.termCard(tm.dataset.term));
      if (ln) return hoverCard(ln, () => ED.linkCard(b, ln.dataset.m));
      if (st) return hoverCard(st, () => ED.itemCard(st.dataset.item, b, st.dataset.m));
    });
  },
  /** Typing at either edge of a term or link stays outside it: the caret is moved past the span (onto a zero-width space) before the browser inserts. */
  /** Typing at the end of a list marker goes into the item's text, which wraps — never into the marker, which doesn't. */
  markerEscape(el, e) {
    if (!/^insert/.test(e.inputType)) return;
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return;
    const n = s.anchorNode, mk = n && (n.nodeType === 3 ? n.parentElement : n).closest('.li-mk'); if (!mk || !el.contains(mk)) return;
    const tail = document.createRange(); tail.setStart(s.anchorNode, s.anchorOffset); tail.setEnd(mk, mk.childNodes.length); if (tail.toString()) return;
    const tx = mk.nextElementSibling; if (!tx) return;
    let t = tx.firstChild; if (!t || t.nodeType !== 3) { t = document.createTextNode('\u200B'); tx.prepend(t); }
    const r = document.createRange(); r.setStart(t, t.nodeValue.startsWith('\u200B') ? 1 : 0); r.collapse(true); s.removeAllRanges(); s.addRange(r);
  },
  edgeEscape(el, e) {
    if (!/^insert(Text|ReplacementText|FromPaste|CompositionText)$/.test(e.inputType)) return;
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return;
    const n = s.anchorNode, start = n && (n.nodeType === 3 ? n.parentElement : n); if (!start || !el.contains(start)) return;
    let span = start.closest('.tm,.ln'); if (!span || !el.contains(span)) return;
    const tail = document.createRange(); tail.setStart(s.anchorNode, s.anchorOffset); tail.setEnd(span, span.childNodes.length);
    const head = document.createRange(); head.setStart(span, 0); head.setEnd(s.anchorNode, s.anchorOffset);
    const atEnd = !tail.toString().replace(/​/g, ''), atStart = !head.toString().replace(/​/g, '');
    if (!atEnd && !atStart) return;
    // climb out of nested term/link spans that share this edge
    for (let p = span.parentElement; p && p !== el && p.matches('.tm,.ln'); p = p.parentElement) {
      const r = document.createRange(); if (atEnd) { r.setStartAfter(span); r.setEnd(p, p.childNodes.length); } else { r.setStart(p, 0); r.setEndBefore(span); }
      if (r.toString().replace(/​/g, '')) break; span = p; }
    const z = document.createTextNode('​'); if (atEnd) span.after(z); else span.before(z);
    const r = document.createRange(); r.setStart(z, 1); r.collapse(true); s.removeAllRanges(); s.addRange(r);
  },
  unlocked: new Set(),
  lockedPrompt(b, e) {
    ctxMenu(e.clientX, e.clientY + 8, [{ head: 'Recorded ' + fmtDay(b.created) + ' — the wording carries structures' },
      { label: 'Revise wording', sub: 'The recorded wording stays beneath, greyed, with its structures', run: () => { const [n] = M.reviseBlock(b); DV(e.target).focusAfterRender = { id: n, pos: 0 }; } },
      { label: 'Edit in place', sub: 'Structures keep their recorded text; the marks follow your edits', run: () => { ED.unlocked.add(b.id); DV(e.target).focusAfterRender = { id: b.id, pos: b.body.text.length }; App.refresh(); } },
      { label: 'Add a correction…', sub: 'A new structure that points at the old one', run: () => { const its = IX.itemsOriginatingIn(b.id); if (its.length === 1) ED.correctDialog(its[0]); else pickModal('Correct which structure?', 'The original stays on record; the correction points at it.', its.map(it => ({ label: KIND[it.kind].label + ': ' + snippet(it.text, 60), run: () => ED.correctDialog(it) }))); } }]);
  },
  matchKey(e, spec) {
    const p = spec.toLowerCase().split('+'), k = p.pop();
    const key = k === 'enter' ? e.key === 'Enter' : (e.key || '').toLowerCase() === k || e.code === 'Key' + k.toUpperCase();
    return key && !!e.ctrlKey === p.includes('ctrl') && !!e.altKey === p.includes('alt') && !!e.shiftKey === p.includes('shift') && (!e.metaKey || p.includes('ctrl'));
  },
  termKeyHit(e) { const s = settings(); return ED.matchKey(e, s.termKey) || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key || '').toLowerCase() === 'w' && App.focusMode); },
  onKey(e, el, b, save) {
    const s = settings();
    if (el.contentEditable === 'true' && WRITE.onKey(e, el, b)) return;
    if (ED.matchKey(e, s.structKey) || (e.metaKey && e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); const sel = ED.selection(el); if (sel && !sel.collapsed) { if (s.classifyOn === 'review') ED.makeStructure(el, b, sel, 'takeaway', ED.read(el, M.block(b.id).body.marks).text.slice(sel.from, sel.to)); else ED.openStrip(el, b, sel); } else toast('Select the phrase first, then ' + keyLabel(s.structKey)); return; }
    if (ED.termKeyHit(e)) { e.preventDefault(); e.stopPropagation(); ED.markTerm(el, b); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); const sel = ED.selection(el); ED.citePicker(el, b, sel); return; }
    if (e.key === 'Escape') { e.preventDefault(); save(); el.blur(); getSelection().removeAllRanges(); return; }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); // a line break written into the text itself (the browser's own breaks get lost inside list rows)
      const cur = M.block(b.id), body = ED.read(el, cur.body.marks), sel = ED.selection(el); if (!sel) return document.execCommand('insertText', false, '\n');
      M.saveBlockBody(cur, ED.splice(body, sel.from, sel.to - sel.from, '\n')); ED.render(el, cur); ED.setCaret(el, sel.from + 1); save(); return; }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); save(); const cur = M.block(b.id); const body = ED.read(el, cur.body.marks); const sel = ED.selection(el); const at = sel ? sel.from : body.text.length;
      const head = { text: body.text.slice(0, at), marks: body.marks.filter(m => m.from < at).map(m => Object.assign({}, m, { to: Math.min(m.to, at) })) };
      const tail = { text: body.text.slice(at), marks: body.marks.filter(m => m.from >= at).map(m => Object.assign({}, m, { from: m.from - at, to: m.to - at })) };
      M.saveBlockBody(cur, head); const pane = DV(el), bx = pane.boxH(cur.id); const nb = M.addBlock(cur.docId, cur.id, { body: tail, x: cur.x, y: (cur.y || 0) + bx + 28, w: cur.w });
      pane.makeRoomBelow(nb); pane.focusAfterRender = { id: nb.id, pos: 0 }; return;
    }
    if (e.key === 'Backspace' && !el.textContent.length) {
      const d = M.doc(b.docId), i = d.blockIds.indexOf(b.id), prev = d.blockIds.slice(0, i).reverse().map(M.block).find(x => x && x.status === 'live' && x.kind === 'component');
      if (M.removeEmptyBlock(M.block(b.id))) { e.preventDefault(); if (prev) DV(el).focusAfterRender = { id: prev.id, pos: prev.body.text.length }; }
      return;
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
      e.preventDefault(); const eds = DV(el).orderedEditors(), i = eds.indexOf(el), nx = eds[i + (e.key === 'ArrowUp' ? -1 : 1)];
      if (nx) { nx.focus(); ED.setCaret(nx, e.key === 'ArrowUp' ? ED.read(nx, []).text.length : 0); DV(el).reveal(nx.closest('.box').dataset.id); }
    }
  },
  commit(el, b, mutate, caret) {
    const cur = M.block(b.id), body = ED.read(el, cur.body.marks), next = mutate(body) || body;
    M.saveBlockBody(cur, next); DV(el).focusAfterRender = { id: b.id, pos: caret != null ? caret : next.text.length }; changed();
  },

  /* ---------------- the structure pop-up (Ctrl+Enter) ---------------- */
  openStrip(el, b, sel) {
    closePop(); $$('.strip').forEach(x => x.remove()); hideHover();
    const body = ED.read(el, M.block(b.id).body.marks), text = body.text.slice(sel.from, sel.to);
    const done = () => { strip.remove(); document.removeEventListener('keydown', key, true); };
    const choose = kind => { done(); ED.makeStructure(el, b, sel, kind, text); };
    const btn = (lab, k, fn, kc) => h('button', { on: { mousedown: e => { e.preventDefault(); fn(); } } }, kc ? h('i', { style: { '--kc': kc } }) : null, lab, h('u', k.toUpperCase()));
    const strip = h('div.strip', h('div.strip-h', 'What is “' + snippet(text, 38) + '”?'), h('div.strip-b', KINDS.map(k => btn(k.label, k.key, () => choose(k.id), `var(--k-${k.id})`))),
      h('div.strip-b.alt', btn('Existing structure…', '/', () => { done(); ED.mentionPicker(el, b, sel); }), btn('Term', 'w', () => { done(); ED.markTerm(el, b, sel); }), btn('Link to a note…', 'l', () => { done(); ED.linkPicker(el, b, sel); })));
    document.body.append(strip);
    const r = strip.getBoundingClientRect(); strip.style.left = clamp(sel.rect.left, 8, innerWidth - r.width - 8) + 'px';
    strip.style.top = (sel.rect.top > r.height + 16 ? sel.rect.top - r.height - 8 : sel.rect.bottom + 8) + 'px';
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); done(); el.focus(); return; }
      if (e.key === 'Enter') { e.preventDefault(); choose('takeaway'); return; }
      if (e.key === '/') { e.preventDefault(); done(); ED.mentionPicker(el, b, sel); return; }
      if (e.key.toLowerCase() === 'w' && !e.ctrlKey) { e.preventDefault(); done(); ED.markTerm(el, b, sel); return; }
      if (e.key.toLowerCase() === 'l' && !e.ctrlKey) { e.preventDefault(); done(); ED.linkPicker(el, b, sel); return; }
      const k = KINDS.find(x => x.key === e.key.toLowerCase()); if (k && !e.ctrlKey && !e.altKey) { e.preventDefault(); choose(k.id); return; }
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) done();
    };
    document.addEventListener('keydown', key, true);
    setTimeout(() => document.addEventListener('mousedown', function f(ev) { if (!strip.contains(ev.target)) done(); document.removeEventListener('mousedown', f); }), 0);
  },
  makeStructure(el, b, sel, kind, text) {
    const it = M.createItem(kind, text, M.block(b.id));
    ED.commit(el, b, body => { body.marks.push({ id: uid('m'), type: 'struct', from: sel.from, to: sel.to, ref: it.id }); }, sel.to);
    if (kind === 'resolution') setTimeout(() => ED.resolvePicker(it, sel.rect), 30);
    else if (kind === 'evidence') setTimeout(() => ED.sourcePicker(it, sel.rect), 30);
    else toast(`${KIND[kind].label} recorded${kind === 'claim' ? ' — promoted to a project claim' : ''}`);
  },
  resolvePicker(it, rect) {
    const d = M.doc(it.originDocId);
    const inDoc = new Set(M.docBlocks(d.id).flatMap(bb => [...IX.itemsOf(bb.id).map(x => x.id), bb.refItemId].filter(Boolean)));
    const opts = q => IX.pullable(d.projectId).filter(x => x.id !== it.id && IX.status(x) !== 'closed').filter(x => !q || x.text.toLowerCase().includes(q))
      .sort((a, b2) => (inDoc.has(b2.id) - inDoc.has(a.id)) || (b2.created > a.created ? 1 : -1));
    popover(rect.left, rect.bottom + 8, [h('h5', 'Which barrier does this resolve?'),
      optionPicker({ placeholder: 'Search open barriers…', items: opts, emptyText: 'No open barriers in this project',
        render: x => h('div', kchip('barrier', IX.status(x)), ' ', h('span.serif', snippet(x.text, 70)), h('span.s', (inDoc.has(x.id) ? 'in this note · ' : '') + M.docPath(M.doc(x.originDocId)))),
        onPick: x => { closePop(); M.setItem(it, { resolves: x.id }); toast('Resolution linked — the barrier now reads as resolved; close it when it is settled'); } }),
      h('div.row', { style: { marginTop: '8px' } }, h('button.btn.sm', { on: { click: () => closePop() } }, 'Skip'))]);
  },
  /** Evidence should point at something (§9): default is this note; or a run, dataset or figure component. */
  sourcePicker(it, rect) {
    popover(rect.left, rect.bottom + 8, [h('h5', 'Evidence — what is it evidence from?'), h('div.tiny.muted', { style: { margin: '0 6px 8px' } }, 'Defaults to this note. Pick the run, dataset or figure if it is elsewhere.'),
      optionPicker({ placeholder: 'Search components…', items: q => DB.where('blocks', x => x.status === 'live' && x.kind === 'component' && (!q || (x.body.text + ' ' + x.label + ' ' + (M.doc(x.docId) || {}).title).toLowerCase().includes(q))).sort((a, c) => (c.modified || '').localeCompare(a.modified || '')),
        render: x => h('div', h('b', M.blockName(x)), ' ', h('span.serif', snippet(x.body.text, 60)), h('span.s', M.docPath(M.doc(x.docId)))),
        onPick: x => { closePop(); M.setItem(it, { sourceRef: { type: 'block', id: x.id } }); toast('Evidence source recorded'); } }),
      h('div.row', { style: { marginTop: '8px' } }, h('button.btn.sm.pri', { on: { click: () => { closePop(); toast('Evidence recorded — source: this note'); } } }, 'This note'))]);
  },
  mentionPicker(el, b, sel) {
    const d = M.doc(b.docId);
    popover(sel.rect.left, sel.rect.bottom + 8, [h('h5', 'Reference an existing structure'),
      optionPicker({ placeholder: 'Search claims, barriers, results…', items: q => DB.where('items', x => (x.projectId === d.projectId || !d.projectId) && x.status !== 'closed' && !x.correctedBy && (!q || x.text.toLowerCase().includes(q))).sort((x, y) => y.created > x.created ? 1 : -1),
        render: x => h('div', kchip(x.kind), ' ', h('span.serif', snippet(x.text, 70)), h('span.s', M.docPath(M.doc(x.originDocId)))),
        onPick: x => { closePop(); ED.commit(el, b, body => { body.marks.push({ id: uid('m'), type: 'struct', from: sel.from, to: sel.to, ref: x.id }); }, sel.to); toast('Linked to the earlier ' + KIND[x.kind].label.toLowerCase()); } })]);
  },
  /** Links point at a note or a component by id; a link to something not yet written stays legal and shows as open. */
  linkPicker(el, b, sel, apply) {
    const txt = ED.read(el, M.block(b.id).body.marks).text.slice(sel.from, sel.to).replace(OBJ, '').trim();
    const items = q => { const k = q || txt.toLowerCase(); const docs = DB.where('documents', x => x.id !== b.docId && (!k || x.title.toLowerCase().includes(k))).map(x => ({ t: 'doc', x }));
      const comps = q ? DB.where('blocks', x => x.status === 'live' && x.kind === 'component' && x.docId !== b.docId && (x.label + ' ' + x.body.text).toLowerCase().includes(q)).map(x => ({ t: 'block', x })) : [];
      return [...docs, ...comps, { t: 'new', title: q ? inpTitle(q) : txt }]; };
    const inpTitle = q => q.charAt(0).toUpperCase() + q.slice(1);
    popover(sel.rect.left, sel.rect.bottom + 8, [h('h5', 'Link “' + snippet(txt, 30) + '” to…'), optionPicker({ placeholder: 'Search notes and components…', items,
      render: o => o.t === 'doc' ? h('div', typechip(o.x.type), ' ', o.x.title, h('span.s', M.docPath(o.x))) : o.t === 'block' ? h('div', h('b', M.blockName(o.x)), ' ', h('span.serif', snippet(o.x.body.text, 60)), h('span.s', M.docPath(M.doc(o.x.docId)))) : h('div', h('b', '+ Not written yet: '), '“' + o.title + '”', h('span.s', 'Legal — it shows as an open link until a note with that title exists')),
      onPick: o => { closePop(); if (apply) return apply(o.t === 'new' ? { ref: null, title: o.title } : { ref: o.x.id }); ED.commit(el, b, body => { body.marks.push(Object.assign({ id: uid('m'), type: 'link', from: sel.from, to: sel.to }, o.t === 'new' ? { ref: null, title: o.title } : { ref: o.x.id })); }, sel.to); } })]);
  },
  followLink(b, markId, ev) {
    const mk = (M.block(b.id).body.marks || []).find(m => m.id === markId); if (!mk) return;
    const tg = IX.linkTarget(mk);
    if (tg) return tg.type === 'doc' ? App.jump(tg.d.id, ev, true) : App.jump(tg.b.id, ev);
    const ex = DB.all('documents').find(x => x.title.toLowerCase() === (mk.title || '').toLowerCase());
    if (ex) { mk.ref = ex.id; DB.put('blocks', M.block(b.id)); changed(); return App.go('#/doc/' + ex.id); }
    App.newDoc({ title: mk.title, projectId: M.doc(b.docId).projectId, themeId: M.doc(b.docId).themeId, onCreate: d => { const bb = M.block(b.id); const m = bb.body.marks.find(x => x.id === markId); if (m) { m.ref = d.id; DB.put('blocks', bb); } } });
  },
  linkCard(b, markId) {
    const mk = ((M.block(b.id) || {}).body.marks || []).find(m => m.id === markId); if (!mk) return null; const tg = IX.linkTarget(mk);
    if (!tg) return h('div', h('div.hc-k', 'Open link'), h('div.serif', '“' + (mk.title || '') + '” has not been written yet'), h('div.hc-f', 'Click to create it'));
    if (tg.type === 'doc') return h('div', h('div.hc-k', prof(tg.d.type).label), h('div', { style: { fontWeight: 600 } }, tg.d.title), h('div.hc-s', M.docPath(tg.d)), tg.d.synthesis.text ? h('div.serif', { style: { marginTop: '6px', fontSize: '13px' } }, snippet(tg.d.synthesis.text, 160)) : null, h('div.hc-f', 'Alt+click opens it beside this note'));
    return h('div', h('div.hc-k', M.blockName(tg.b)), h('div.serif', snippet(tg.b.body.text, 200)), h('div.hc-s', M.docPath(M.doc(tg.b.docId))), h('div.hc-f', 'Ctrl+click to open · Alt+click: beside'));
  },

  /* ---------------- terms (Ctrl+W in Focus mode, Alt+W otherwise) ---------------- */
  markTerm(el, b, sel) {
    sel = sel || ED.selection(el); if (!sel) return;
    const cur = M.block(b.id), body = ED.read(el, cur.body.marks); let { from, to } = sel;
    if (from === to) { const w = ED.wordAt(body.text, from); if (!w) return toast('Put the caret on a word or select a phrase'); [from, to] = w; }
    while (from < to && /\s/.test(body.text[from])) from++; while (to > from && /\s/.test(body.text[to - 1])) to--;
    const label = body.text.slice(from, to).replace(OBJ, '').trim(); if (!label) return;
    const existing = body.marks.find(m => m.type === 'term' && m.from === from && m.to === to);
    if (existing) { ED.commit(el, b, bd => { bd.marks = bd.marks.filter(m => m.id !== existing.id); }, to); return toast('Term unmarked here'); }
    const d = M.doc(b.docId), pid = d.projectId || (DB.all('projects')[0] || {}).id;
    const t = M.findOrCreateTerm(pid, label);
    ED.commit(el, b, bd => { bd.marks.push({ id: uid('m'), type: 'term', from, to, ref: t.id }); }, to);
    toast(`“${t.label}” joined the term repository`);
  },
  termCard(termId) {
    const t = M.term(termId); if (!t) return null; const occ = IX.termOcc.get(termId) || [], ks = {};
    occ.forEach(o => o.itemIds.forEach(i => { const it = M.item(i); if (it) ks[it.kind] = (ks[it.kind] || 0) + 1; }));
    return h('div', h('div.hc-k', 'Term · ' + (M.project(t.projectId) || {}).name), h('div', { style: { fontSize: '17px' } }, h('span.term-demo', t.label)),
      h('div.hc-s', `${plural(new Set(occ.map(o => o.docId)).size, 'note')} · ${plural(occ.length, 'occurrence')}` + (() => { const sec = new Set(occ.flatMap(o => REGION.peers(o.blockId).map(p => p.id))); occ.forEach(o => sec.delete(o.blockId)); return sec.size ? ` · ${plural(sec.size, 'secondary source')} via regions` : ''; })()), Object.keys(ks).length ? h('div.row', { style: { marginTop: '6px', gap: '4px' } }, Object.entries(ks).map(([k, n]) => kchip(k, KIND[k].label + ' ' + n))) : null,
      h('div.hc-f', 'Ctrl+click opens its lens · Alt+click for options'));
  },
  termPopover(termId, x, y, b, markId) {
    const t = M.term(termId); if (!t) return;
    ctxMenu(x, y, [{ head: 'Term · ' + t.label }, { label: 'Open lens', key: 'Ctrl+click', run: () => App.go('#/lens/' + termId) },
      { label: 'Unmark here', run: () => { const blk = M.block(b.id); blk.body.marks = blk.body.marks.filter(m => m.id !== markId); M.saveBlockBody(blk, blk.body); changed(); } }]);
  },
  itemCard(itemId, b, markId) {
    const it = M.item(itemId); if (!it) return null; const st = IX.status(it), res = (IX.resolutions.get(it.id) || []).map(M.item).filter(Boolean);
    const mk = ((M.block(b.id) || {}).body.marks || []).find(m => m.id === markId), here = mk ? M.block(b.id).body.text.slice(mk.from, mk.to).replace(/￼/g, '').trim() : '';
    const src = it.sourceRef && (it.sourceRef.type === 'block' ? M.blockName(M.block(it.sourceRef.id)) : it.sourceRef.type === 'library' ? (M.lib(it.sourceRef.id) ? LIB.shortRef(M.lib(it.sourceRef.id)) + (it.sourceRef.page ? ', p. ' + it.sourceRef.page : '') : 'a paper') : (M.doc(it.sourceRef.id) || {}).title);
    return h('div', h('div.row', { style: { gap: '6px' } }, kchip(it.kind), st ? h('span.pill' + (st === 'open' ? '.bad' : st === 'resolved' ? '.ok' : ''), st) : null, it.stance ? h('span.pill' + (it.stance === 'contested' ? '.warn' : ''), it.stance) : null, it.correctedBy ? h('span.pill', 'corrected') : null),
      h('div.serif', { style: { fontSize: '14.5px', margin: '6px 0 4px' } }, it.text),
      here && here !== it.text && KIND[it.kind].promote ? h('div.hc-s', 'Canonical wording above · this mention reads “' + snippet(here, 60) + '”') : null,
      src ? h('div.hc-s', 'Evidence from ' + src) : null,
      res.length ? h('div', { style: { marginTop: '6px' } }, res.map(r => h('div.serif', { style: { fontSize: '13px', color: 'var(--ok)' } }, '✓ ', snippet(r.text, 90)))) : null,
      h('div.hc-f', (it.originBlockId !== b.id ? 'from ' + M.docPath(M.doc(it.originDocId)) + ' · ' : '') + fmtWhen(it.created) + ' · Alt+click for actions'));
  },
  itemPopover(itemId, x, y, b, markId) {
    const it = M.item(itemId); if (!it) return; const st = IX.status(it);
    const mk = ((M.block(b.id) || {}).body.marks || []).find(m => m.id === markId), here = mk ? M.block(b.id).body.text.slice(mk.from, mk.to).replace(/￼/g, '').trim() : '';
    const flagged = M.flagFor('item', it.id);
    ctxMenu(x, y, [{ head: KIND[it.kind].label + (st ? ' · ' + st : '') },
      { label: 'Reclassify…', sub: 'Same record, different kind', run: () => pickModal('Reclassify', '“' + snippet(it.text, 80) + '”', KINDS.filter(k => k.id !== it.kind).map(k => ({ label: k.label, run: () => M.setItem(it, { kind: k.id, status: k.lifecycle === 'open' ? (it.status || 'open') : null, stance: k.id === 'claim' ? (it.stance || 'supported') : null }) }))) },
      it.kind === 'claim' ? { label: 'Stance: ' + it.stance, sub: 'supported · contested · abandoned', run: () => pickModal('Stance', 'Research claims change status.', ['supported', 'contested', 'abandoned'].map(s => ({ label: s, run: () => M.setItem(it, { stance: s }) }))) } : null,
      KIND[it.kind].promote && here && here !== it.text ? { label: 'Update the record to match this wording', sub: 'Explicit, never a side effect', run: () => M.setItem(it, { text: here, reworded: isoLocal(new Date()) }) } : null,
      it.kind === 'claim' ? { label: 'Relate to a claim in another project…', run: () => ED.relatePicker(it) } : null,
      it.kind === 'evidence' ? { label: 'Set evidence source…', run: () => ED.sourcePicker(it, { left: x, bottom: y }) } : null,
      it.kind === 'resolution' ? { label: it.resolves ? 'Resolves: ' + snippet((M.item(it.resolves) || {}).text, 40) : 'Which barrier does it resolve?', run: () => ED.resolvePicker(it, { left: x, bottom: y }) } : null,
      it.kind === 'barrier' && st === 'resolved' ? { label: 'Close barrier', sub: 'No longer offered when pulling barriers; still searchable', run: () => { M.closeItem(it); toast('Barrier closed'); } } : null,
      it.kind === 'barrier' && st === 'open' ? { label: 'Close unresolved', run: () => M.closeItem(it) } : null,
      st === 'closed' ? { label: 'Reopen', run: () => M.reopenItem(it) } : null,
      { label: !EDIT.locks() || localDate(it.created) === localDate(new Date()) ? 'Edit wording…' : 'Add a correction…', sub: !EDIT.locks() ? null : localDate(it.created) === localDate(new Date()) ? 'Allowed until the day turns' : 'Recorded on ' + fmtDay(it.created) + ' — the original stays', run: () => ED.correctDialog(it) },
      'sep',
      { label: flagged ? 'Clear flag' : 'Flag for weekly review', run: () => M.toggleFlag('item', it.id) },
      { label: 'Open where it was recorded', sub: 'Alt+click opens it beside this note', run: ev => App.jump(it.originBlockId, ev) },
      { label: 'Unmark here', sub: 'The structure record is kept', run: () => { const blk = M.block(b.id); blk.body.marks = blk.body.marks.filter(m => m.id !== markId); M.saveBlockBody(blk, blk.body); changed(); } }]);
  },
  async correctDialog(it) { const t = await askText(!EDIT.locks() || localDate(it.created) === localDate(new Date()) ? 'Edit wording' : 'Correction', 'Wording', it.text, { multiline: true }); if (t && t !== it.text) { M.correctItem(it, t); toast(!EDIT.locks() || localDate(it.created) === localDate(new Date()) ? 'Wording updated' : 'Correction recorded — the original stays on record'); } },
  relatePicker(it) {
    const m = modal({ title: 'Relate to another claim', actions: [{ label: 'Cancel' }], body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'Claims stay project-scoped; a relation lets two projects point at each other without either becoming canonical.'),
      optionPicker({ placeholder: 'Search claims…', items: q => DB.where('items', x => x.kind === 'claim' && x.id !== it.id && (!q || x.text.toLowerCase().includes(q))),
        render: x => h('div', h('span.serif', snippet(x.text, 80)), h('span.s', (M.project(x.projectId) || {}).name + ' · ' + x.stance)), onPick: x => { m.close(); M.relateClaims(it, x); toast('Claims related'); } })) });
  },

  /* ---------------- citations (Ctrl+I) ---------------- */
  citePicker(el, b, sel) {
    const r = sel ? sel.rect : el.getBoundingClientRect(), at = sel ? sel.to : ED.read(el, []).text.length;
    if (sel && !sel.collapsed) { const txt = ED.read(el, []).text.slice(sel.from, sel.to); return LibraryView.addDialog(txt); }
    popover(r.left, r.bottom + 8, [h('h5', 'Insert citation'), optionPicker({ placeholder: 'Author, year, journal or title…', items: q => LIB.search(q),
      render: x => h('div.row', { style: { flexWrap: 'nowrap', alignItems: 'flex-start' } }, LIB.sigil(x, 30), h('div', h('span.serif', { style: { fontStyle: 'italic' } }, snippet(x.title, 80)), h('span.s', LIB.shortRef(x) + (x.container ? ' · ' + LIB.journal(x.container) : '')))),
      onPick: x => { closePop(); ED.commit(el, b, body => { const n = ED.splice(body, at, 0, OBJ); n.marks.push({ id: uid('m'), type: 'cite', from: at, to: at + 1, ref: x.id }); return n; }, at + 1); },
      emptyText: 'Library is empty — add papers in Library' }), h('div.tiny.muted', { style: { marginTop: '6px' } }, 'Select text first and press Ctrl+I to add it to the library instead.')]);
  },
};
const keyLabel = s => s.split('+').map(p => p === 'ctrl' ? 'Ctrl' : p === 'alt' ? 'Alt' : p === 'shift' ? 'Shift' : p === 'enter' ? 'Enter' : p.toUpperCase()).join('+');
