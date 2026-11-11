/* ==========================================================================
   13zzt · An excerpt, pulled in (V3.972 — Gabe: "text inside a component
   that is selected, can be copied and pasted to pull in just that part of
   the component in whichever note you paste it in").
   • Copy (Ctrl+C) words selected in a component — the clipboard already
     says which component and which range (13zu2) — and paste in another
     note: a pulled-in component that shows just that passage, live: as the
     original's words change, so does the excerpt. It finds its passage
     again by its words (and the words around them) when text is added or
     taken out before it; if the passage itself is gone, the excerpt shows
     it as it read, and says so. "from …" opens the original.
   • The whole text copied pulls in the whole component, as before. In the
     same note the words are pasted as a copy, as before; Ctrl+Shift+V
     pastes a copy anywhere.
   • A pulled-in component (kind 'ref') with refSpan { from, to, exact,
     prefix, suffix }.
   ========================================================================== */
const EXCERPT = {
  AROUND: 40,
  /** Where the passage is in the original's text now: [from, to], or null when its words are gone. */
  locate(s, text) {
    if (text.slice(s.from, s.to) === s.exact) return [s.from, s.to];
    const all = (w, from = 0) => { const L = []; if (!w) return L; for (let i = text.indexOf(w, from); i >= 0 && L.length < 60; i = text.indexOf(w, i + 1)) L.push(i); return L; };
    const near = L => L.sort((x, y) => Math.abs(x - s.from) - Math.abs(y - s.from))[0];
    const hits = all(s.exact);
    if (hits.length) { const fits = a => (s.prefix && text.slice(Math.max(0, a - s.prefix.length), a) === s.prefix ? 2 : 0) + (s.suffix && text.slice(a + s.exact.length, a + s.exact.length + s.suffix.length) === s.suffix ? 2 : 0) - Math.abs(a - s.from) / 1e7;
      const a = hits.sort((x, y) => fits(y) - fits(x))[0]; return [a, a + s.exact.length]; }
    // the words inside it were changed: the passage is what lies between the words that were around it, while those are still there
    const pw = (s.prefix || '').slice(-20), sw = (s.suffix || '').slice(0, 20);
    const p = pw ? (near(all(pw)) ?? -1) + (all(pw).length ? pw.length : 0) : s.from === 0 ? 0 : -1; if (p < 0 || (pw && !all(pw).length)) return null;
    const q = sw ? (all(sw, p)[0] ?? -1) : s.to >= s.from && !s.suffix ? text.length : -1;
    return q >= p && q - p <= Math.max(400, s.exact.length * 4) && text.slice(p, q).trim() ? [p, q] : null;
  },
  /** What an excerpt shows: { ob (the original), text, marks (the original's, over the passage), gone } — or null. */
  view(b) {
    const ob = b && b.refSpan && M.block(b.refBlockId); if (!ob) return null; const s = b.refSpan, text = String((ob.body && ob.body.text) || ''), at = ob.status === 'live' ? EXCERPT.locate(s, text) : null;
    if (!at) return { ob, text: s.exact, marks: [], gone: true };
    const [a, z] = at, whole = m => m.type === 'math' || m.type === 'cite' || m.type === 'obj';
    const marks = ((ob.body && ob.body.marks) || []).filter(m => m.from < z && m.to > a && !(whole(m) && (m.from < a || m.to > z)))
      .map(m => Object.assign({}, m, { from: Math.max(0, m.from - a), to: Math.min(z - a, m.to - a) })).filter(m => m.to > m.from);
    return { ob, text: text.slice(a, z), marks, gone: false };
  },
  text(b) { const v = EXCERPT.view(b); return v ? v.text.replace(/￼/g, '') : ''; },
  /** Paste: the words j (copied from component src) as an excerpt in note d at `at`; the whole text pulls in the whole component. */
  pull(d, at, src, j) {
    const text = String((src.body && src.body.text) || ''); let a = Math.max(0, j.from | 0), z = Math.min(text.length, j.to | 0);
    if (CLIPX.norm(text.slice(a, z)) !== CLIPX.norm(j.text)) { const i = text.indexOf(j.text); if (i >= 0) { a = i; z = i + j.text.length; } }   // changed since the copy
    const od = M.doc(src.docId), from = (od && od.title) || 'its note';
    if (z <= a || (a === 0 && z >= text.length) || !text.slice(a, z).trim()) { M.addBlock(d.id, null, { kind: 'ref', refItemId: null, refBlockId: src.id, x: at.x, y: at.y, w: 392 }); changed(); toast('Bridged from ' + from + ' — say why in the caption under it'); return; }
    const exact = text.slice(a, z);
    M.addBlock(d.id, null, { kind: 'ref', refItemId: null, refBlockId: src.id, refSpan: { from: a, to: z, exact, prefix: text.slice(Math.max(0, a - EXCERPT.AROUND), a), suffix: text.slice(z, z + EXCERPT.AROUND) }, x: at.x, y: at.y, w: 392 });
    IX.rebuild(); changed(); toast('Bridged “' + snippet(exact.replace(/￼/g, ''), 48) + '” from ' + from + ' — live: it follows the original; say why in the caption under it · Ctrl+Shift+V pastes a copy instead', 4500);
  },
};
{
  // the card: just the passage, with the original's styles, structures and terms over it
  const rc = DocView.refCard; DocView.refCard = function (b, d) {
    if (!b || !b.refSpan || b.refItemId) return rc.apply(this, arguments);
    const v = EXCERPT.view(b); if (!v) return h('div.refbody', 'Missing reference'); const ob = v.ob, od = M.doc(ob.docId);
    const origin = h('div.origin', 'bridged from ', h('a', { title: 'Open the original · Alt+click: beside', on: { click: e => App.jump(ob.id, e) } }, od ? M.docPath(od) : 'missing'), ' › ' + M.blockName(ob) + ' · ' + fmtDay(ob.created));
    const pv = h('div.ed'); ED.render(pv, Object.assign({}, ob, { body: { text: v.text, marks: v.marks } })); pv.contentEditable = 'false';
    return h('div.refbody.excerpt', h('div.row', h('span.pill', { title: 'A part of a component in another note, live' }, 'excerpt'), ob.label ? h('b', { style: { fontSize: '12.5px' } }, ob.label) : null), origin, pv,
      v.gone ? h('div.tiny.muted.ex-gone', 'These words are no longer in the original — this is how they read when they were pulled in.') : null);
  };
}
