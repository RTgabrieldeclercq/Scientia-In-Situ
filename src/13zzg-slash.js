/* ==========================================================================
   13zzg · "/" and "@" in the text (V3.947, Gabe's SiS Shaping).
   Typing / at the start of a word opens the command menu at the caret: the
   commands that act on the text (11b, scope text or both) and every
   + Insert row, filtered as you type; ↑ ↓ choose, Enter or Tab runs, Esc
   leaves what you typed. The typed /word goes; the command runs on this
   component: /claim /barrier /question… mark the sentence before the caret
   as that structure, /term the word, /bridge this component (V3.981), /cite the picker,
   /sym the symbols, /connect this component to one you pick, /date and
   /time type the day and the hour, /paper /protocol… insert below.
   Typing @ opens the lab's members (hub api/rm/members, cached in
   settings().members for offline; without a lab, the people already named
   in the notebook); the pick becomes a person mark — a chip that reads
   @Name — and ⋯ → People mentioned… (or /people) lists who is named in the
   note and where. No notification: that would be the lab's.
   ========================================================================== */
const SLASH = {
  st: null,
  /** Called on every input in an editor (09): opens, filters or closes the menu. Returns true when it is open. */
  onInput(el, b, e) {
    if (el.contentEditable !== 'true') return false;
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) { SLASH.close(); return false; }
    const node = s.anchorNode; if (!node || node.nodeType !== 3 || !el.contains(node) || (node.parentElement && node.parentElement.closest('.mx,.ct,.mn'))) { SLASH.close(); return false; }
    const before = node.nodeValue.slice(0, s.anchorOffset).replace(/​/g, ''), m = /(^|[\s(\[{—–])([\/@])([^\s\/@]*)$/.exec(before);
    if (!m) { SLASH.close(); return false; }
    const sel = ED.selection(el); if (!sel) { SLASH.close(); return false; }
    const at = sel.from - (m[2].length + m[3].length);
    // /cite typed in full opens the citation picker at once, as it has since V3.9xx: the paper picked takes its place, Esc leaves it
    if (m[2] === '/' && m[3].toLowerCase() === 'cite') { SLASH.close(); ED.citePicker(el, b, sel, '/cite'); return true; }
    if (m[2] === '@') SLASH.open(el, b, at, m[3], sel.rect, true); else SLASH.open(el, b, at, m[3], sel.rect, false);
    return true;
  },
  rows(q, people) {
    q = (q || '').toLowerCase();
    if (people) return SLASH.members().filter(p => !q || p.name.toLowerCase().includes(q)).slice(0, 10).map(p => ({ label: '@' + p.name, sub: p.category || '', person: p }));
    return CMD.all().filter(c => c.scope !== 'canvas').map(c => ({ c, s: SLASH.score(q, c) })).filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || (a.c.group === 'Insert') - (b.c.group === 'Insert') || a.c.slash.localeCompare(b.c.slash)).slice(0, 12).map(x => ({ label: '/' + x.c.slash, sub: x.c.label, c: x.c }));
  },
  /** What is typed matches a slash from its start first; then anywhere in a slash or an alias; then, more weakly, the label. */
  score(q, c) { if (!q) return 1; const names = [c.slash, ...(c.alias || [])]; if (names.some(n => n.startsWith(q))) return 500 - c.slash.length; return Math.max(...names.map(n => PAL.fuzzy(q, n)), PAL.fuzzy(q, c.label) * .5);
  },
  open(el, b, at, q, rect, people) {
    const rows = SLASH.rows(q, people); if (!rows.length && !people) { SLASH.close(); return; }
    let st = SLASH.st; if (!st || st.el !== el) { SLASH.close(); st = SLASH.st = { el, b, at, q, people, hi: 0, menu: h('div.slash-menu', { on: { mousedown: e => e.preventDefault() } }) }; document.body.append(st.menu); document.addEventListener('keydown', SLASH.key, true); }
    Object.assign(st, { at, q, people, rows, hi: Math.min(st.hi, Math.max(0, rows.length - 1)) });
    st.menu.replaceChildren(h('div.sm-h', people ? 'Who?' : 'Commands' + (q ? ' · ' + q : '')), ...rows.map((r, i) => h('div.sm-row' + (i === st.hi ? '.hi' : ''), { on: { click: () => { st.hi = i; SLASH.choose(); } } }, h('b', r.label), r.sub ? h('span.s', r.sub) : null)),
      !rows.length && people ? h('div.sm-row.muted', SLASH.members().length ? 'No one by that name' : 'No lab members known yet — type the name and press Enter') : null, h('div.sm-f', people ? 'Enter picks · Esc leaves the text' : '↑ ↓ · Enter runs · Esc leaves what you typed'));
    const m = st.menu, r = m.getBoundingClientRect(); m.style.left = clamp(rect.left, 8, innerWidth - r.width - 8) + 'px'; m.style.top = (rect.bottom + r.height + 12 < innerHeight ? rect.bottom + 6 : rect.top - r.height - 6) + 'px';
  },
  close() { const st = SLASH.st; if (!st) return; SLASH.st = null; st.menu.remove(); document.removeEventListener('keydown', SLASH.key, true); },
  key(e) {
    const st = SLASH.st; if (!st) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); SLASH.close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const n = st.rows.length; if (!n) return; st.hi = (st.hi + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; [...st.menu.querySelectorAll('.sm-row')].forEach((x, i) => x.classList.toggle('hi', i === st.hi)); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); SLASH.choose(); return; }
    if (e.key === ' ' && !st.rows.length) SLASH.close();
  },
  /** Take the typed /word (or @name) out of the text, then do what was picked. */
  choose() {
    const st = SLASH.st; if (!st) return; const { el, b, at, q, people } = st, r = st.rows[st.hi]; SLASH.close();
    const typed = (people ? '@' : '/') + q;
    if (people) { const name = r ? r.person.name : q.trim(); if (!name) return; const puid = r ? r.person.uid : null; SLASH.remember(name, puid);
      ED.commit(el, b, body => { const n = ED.splice(body, at, typed.length, '@' + name + ' '); n.marks.push({ id: uid('m'), type: 'person', from: at, to: at + 1 + name.length, uid: puid, name }); return n; }, at + name.length + 2); return; }
    if (!r) return;
    try { ED.setCaret(el, at, at + typed.length); document.execCommand('delete'); } catch (e) { }   // no re-render: the editor stays
    const pane = DV(el), ctx = CMD.ctx({ pane, doc: M.doc(b.docId), el, block: M.block(b.id), at });
    if (r.c.slash === 'connect') return CMD.pick({ name: 'to', kind: 'component', ask: 'Connect “' + M.blockName(b) + '” to…' }, '', ctx).then(t => { if (t) pane.relationPopover(b.id, t.id, innerWidth / 2 - 150, 160); });
    CMD.run(r.c.slash, [], ctx);
  },
  /** The text commands (11b, scope text) act here, on the component being written in, at the caret. */
  text(slash, ctx) {
    const { el, block: b, at } = ctx, kind = KINDS.find(k => k.id === slash);
    if (kind) { const body = ED.read(el, M.block(b.id).body.marks), sen = SLASH.sentence(body.text, at); if (!sen) throw new Error('write the phrase first, then /' + slash + ' at its end'); const text = body.text.slice(sen[0], sen[1]); ED.makeStructure(el, b, { from: sen[0], to: sen[1], rect: SLASH.rect(el) }, slash, text); return; }
    if (slash === 'term') return ED.markTerm(el, b, null);
    if (slash === 'cite') return ED.citePicker(el, b, ED.selection(el));
    if (slash === 'sym') { if (typeof EBAR !== 'undefined') { EBAR.show(el); EBAR.symbols(SLASH.rect(el)); } return; }
    if (slash === 'mention') { const body = ED.read(el, []), w = ED.wordAt(body.text, at) || SLASH.sentence(body.text, at); if (!w) throw new Error('write the words first'); return ED.mentionPicker(el, b, { from: w[0], to: w[1], rect: SLASH.rect(el) }); }
    if (slash === 'date') { document.execCommand('insertText', false, fmtDayLong(new Date())); return; }
    if (slash === 'time') { document.execCommand('insertText', false, fmtTime(new Date())); return; }
  },
  rect(el) { const s = getSelection(); if (s.rangeCount) { const r = s.getRangeAt(0).getBoundingClientRect(); if (r.width || r.height) return r; } return el.getBoundingClientRect(); },
  /** The sentence before `at`: from the last . ! ? or line break (or the start) to `at`, trimmed; null when empty. */
  sentence(text, at) { let a = at; while (a > 0 && !/[.!?\n]/.test(text[a - 1])) a--; while (a < at && /\s/.test(text[a])) a++; let z = at; while (z > a && /\s/.test(text[z - 1])) z--; return z > a ? [a, z] : null; },
  /* ---------- people ---------- */
  members() { const s = settings(), L = Array.isArray(s.members) ? s.members : [], seen = new Set(L.map(p => p.name)), named = Array.isArray(s.people) ? s.people.filter(p => !seen.has(p.name)) : []; return [...L, ...named]; },
  remember(name, uid) { const s = settings(), L = Array.isArray(s.people) ? s.people : []; if (L.some(p => p.name === name) || SLASH.members().some(p => p.name === name && p.uid)) return; saveSettings({ people: [...L, { name, uid: uid || null }] }); },
  /** The lab's members, once per session, kept for offline (the hub answers for the computer's key or the site's sign-in). */
  load() { if (SLASH._loaded) return; SLASH._loaded = true; fetch('api/rm/members').then(r => r.ok ? r.json() : null).then(j => { if (j && j.ok && Array.isArray(j.members) && j.members.length) saveSettings({ members: j.members.map(m => ({ uid: m.uid, name: m.name, category: m.category || '' })) }); }).catch(() => { }); },
  /** Who is named in a note, and where. */
  people(d) {
    const rows = []; M.liveBlocks(d.id).forEach(b => (b.body && b.body.marks || []).forEach(m => { if (m.type === 'person') rows.push({ name: m.name, uid: m.uid, b }); }));
    const by = {}; rows.forEach(r => { (by[r.name] = by[r.name] || { name: r.name, uid: r.uid, in: [] }).in.push(r.b); });
    modal({ title: 'People mentioned · ' + d.title, actions: [{ label: 'Close' }], body: h('div.list', Object.values(by).length ? Object.values(by).sort((a, b) => a.name.localeCompare(b.name)).map(p => h('div.li', h('span.mn', '@' + p.name), h('span.t', plural(p.in.length, 'mention'), h('span.s', p.in.map(b => M.blockName(b)).join(' · '))), h('button.btn.xs', { on: { click: () => App.openBlock(p.in[0].id) } }, 'Go'))) : h('div.li.muted', 'No one is named in this note yet — type @ in a component.')) });
  },
};
{
  setTimeout(() => { try { SLASH.load(); } catch (e) { } }, 4000);
  // the menu goes when the editor does
  document.addEventListener('focusout', () => setTimeout(() => { const st = SLASH.st; if (st && document.activeElement !== st.el) SLASH.close(); }, 100));
  // ⋯ on a note: People mentioned…
  const dm = DocView.docMenu; if (dm) DocView.docMenu = function (d, e) { const cm = ctxMenu; let done = false; window.ctxMenu = function (x, y, items) { if (!done) { done = true; const i = items.findIndex(it => it && it.label === 'Tidy layout'); items.splice(i >= 0 ? i + 1 : items.length, 0, { label: 'People mentioned…', sub: 'Who is named with @ in this note', run: () => SLASH.people(d) }); } return cm.apply(this, arguments); }; try { return dm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
}
