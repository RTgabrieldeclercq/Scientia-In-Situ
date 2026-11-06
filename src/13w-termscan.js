/* ==========================================================================
   13w · Terms find themselves. Once a term exists, every component in every
   note that uses its wording (whole words, any case, plurals) is marked
   with it, exactly as if you had marked it by hand. New writing is scanned
   when you leave a component and in a quiet sweep every minute; "Rescan
   terms" on the Terms page goes over everything. Unmarking a found term
   (Alt+click → Unmark here) is remembered, so that spot is never re-marked.
   ========================================================================== */
const TERMSCAN = {
  _rx: new Map(),
  rx(t) {
    const key = t.id + '|' + t.label; if (TERMSCAN._rx.has(key)) return TERMSCAN._rx.get(key);
    const words = t.label.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const last = words.pop(), plural = /[a-z]$/i.test(last) ? (/(s|x|z|ch|sh)$/i.test(last) ? '(?:es)?' : /[^aeiou]y$/i.test(last) ? '' : '(?:s|es)?') : '';
    const lastRx = /[^aeiou]y$/i.test(last) ? last.slice(0, -1) + '(?:y|ies)' : last + plural;
    const rx = words.length || lastRx ? new RegExp('(?<![\\p{L}\\p{N}_])' + [...words, lastRx].join('\\s+') + '(?![\\p{L}\\p{N}_])', 'giu') : null;
    TERMSCAN._rx.set(key, rx); return rx;
  },
  /** One term per wording: a note's own project wins, then the oldest. */
  terms(doc) {
    const by = new Map(); DB.all('terms').filter(t => t.label && t.label.trim().length >= 2).sort((a, b) => (a.created || '').localeCompare(b.created || '')).forEach(t => {
      const k = t.label.trim().toLowerCase(), cur = by.get(k); if (!cur || (doc && t.projectId === doc.projectId && cur.projectId !== doc.projectId)) by.set(k, t); });
    return [...by.values()].sort((a, b) => b.label.length - a.label.length);
  },
  ctx: (text, from, to) => text.slice(Math.max(0, from - 16), from) + '␟' + text.slice(from, to),
  /** Add the term marks a component's wording calls for. Returns the number added (and saves). */
  block(b, only) {
    if (!b || !['component', 'figure'].includes(b.kind) || b.status !== 'live' || !b.body || !(b.body.text || '').trim()) return 0;
    const d = M.doc(b.docId); if (!d) return 0;
    const text = b.body.text, marks = b.body.marks || [], skip = new Set((b.termSkip || []).map(s => s.ref + '|' + s.ctx)), added = [];
    const taken = marks.filter(m => m.type === 'term' || m.type === 'cite' || m.type === 'math').map(m => [m.from, m.to]);
    const free = (a, z) => !taken.some(([x, y]) => a < y && z > x) && !text.slice(a, z).includes(OBJ);
    for (const t of (only || TERMSCAN.terms(d))) {
      const rx = TERMSCAN.rx(t); if (!rx) continue; rx.lastIndex = 0; let m;
      while ((m = rx.exec(text))) { const a = m.index, z = a + m[0].length; if (z === a) { rx.lastIndex++; continue; }
        if (!free(a, z) || skip.has(t.id + '|' + TERMSCAN.ctx(text, a, z))) continue;
        added.push({ id: uid('m'), type: 'term', from: a, to: z, ref: t.id, auto: true }); taken.push([a, z]); }
    }
    if (!added.length) return 0;
    b.body = { text, marks: [...marks, ...added] }; DB.put('blocks', b); return added.length;
  },
  /** Every component in every note. */
  all(only) { let n = 0, blocks = 0; DB.where('blocks', b => (b.kind === 'component' || b.kind === 'figure') && b.status === 'live').forEach(b => { const k = TERMSCAN.block(b, only && TERMSCAN.forDoc(only, M.doc(b.docId))); if (k) { n += k; blocks++; } }); if (n) { IX.rebuild(); changed(); } return { n, blocks }; },
  /** When the same wording has terms in several projects, keep the one this note should use. */
  forDoc(only, d) { const all = TERMSCAN.terms(d), labels = new Set(only.map(t => t.label.trim().toLowerCase())); return all.filter(t => labels.has(t.label.trim().toLowerCase())); },
  /** After you leave a component (or in the quiet sweep): scan it and show what was found. */
  afterEdit(id) {
    const b = M.block(id); if (!b) return; const el = $(`.box[data-id="${id}"] .ed`);
    if (el && document.activeElement === el) return; // still writing
    if (TERMSCAN.block(b)) { IX.rebuild(); if (el) ED.render(el, b); changed(); }
    b._scanned = b.modified;
  },
  sweep() { const ae = document.activeElement, busy = ae && ae.classList && ae.classList.contains('ed') && ae.closest('.box') && ae.closest('.box').dataset.id; let n = 0;
    DB.where('blocks', b => b.kind === 'component' && b.status === 'live' && b.id !== busy && b.modified && b._scanned !== b.modified && +new Date(b.modified) > Date.now() - 864e5).forEach(b => { n += TERMSCAN.block(b); b._scanned = b.modified; });
    if (n) { IX.rebuild(); changed(); } },
  /** Unmarking is remembered for that spot. */
  forget(b, mark) { if (!mark || mark.type !== 'term') return; const blk = M.block(b.id || b); if (!blk) return; blk.termSkip = [...(blk.termSkip || []), { ref: mark.ref, ctx: TERMSCAN.ctx(blk.body.text, mark.from, mark.to) }].slice(-200); DB.put('blocks', blk); },
  rescan() { const r = TERMSCAN.all(); toast(r.n ? `Found ${plural(r.n, 'more use')} in ${plural(r.blocks, 'component')}` : 'Every use of every term is already marked'); App.refresh(); },
};

/* ---------------- hooks ---------------- */
{
  // a newly marked term goes looking for itself everywhere
  const mark = ED.markTerm; ED.markTerm = function (el, b, sel) {
    const before = new Set(DB.all('terms').map(t => t.id)), cur = M.block(b.id), had = new Set((cur.body.marks || []).filter(m => m.type === 'term').map(m => m.id));
    const s0 = sel || ED.selection(el), body0 = ED.read(el, cur.body.marks), ex = s0 && body0.marks.find(m => m.type === 'term' && m.from === s0.from && m.to === s0.to);
    if (ex) TERMSCAN.forget(b, ex);
    const r = mark.call(ED, el, b, sel);
    const now = M.block(b.id), nm = (now.body.marks || []).find(m => m.type === 'term' && !had.has(m.id));
    if (nm) setTimeout(() => { const t = M.term(nm.ref); if (!t) return; const res = TERMSCAN.all([t]); if (res.n) toast(`“${t.label}” found ${plural(res.n, 'more time')} across ${plural(res.blocks, 'component')}`, 3500); }, 700);
    return r;
  };
  const pop = ED.termPopover; ED.termPopover = function (termId, x, y, b, markId) {
    pop.call(ED, termId, x, y, b, markId);
    const opEl = [...$$('.pop.menu .op')].find(o => /Unmark here/.test(o.textContent)); if (opEl) opEl.addEventListener('mousedown', () => { const blk = M.block(b.id), mk = blk && (blk.body.marks || []).find(m => m.id === markId); if (mk) TERMSCAN.forget(blk, mk); }, true);
  };
  setInterval(() => TERMSCAN.sweep(), 60000);
}
