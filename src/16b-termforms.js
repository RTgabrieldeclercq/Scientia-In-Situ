/* ==========================================================================
   16b · Other forms of a term. "apoptotic-induced ERK wave" can also be
   written AiEW or AEW: add those forms on the Terms page (+ form) or in the
   term's lens, and every component — paper highlights included — that uses
   any form is marked with the term. Smart case: a form written with
   capitals (AiEW, AEW, ERK) matches only with those capitals (plus a
   plural s); other forms match any case and their plurals, like terms.
   The mark remembers the form it found (shown on hover).
   ========================================================================== */
const TFORMS = {
  caps: f => /[A-Z].*[A-Z]|^[A-Z0-9]+$/.test(f) || /[A-Z]/.test(f.slice(1)),
  _rx: new Map(),
  rx(f) {
    if (TFORMS._rx.has(f)) return TFORMS._rx.get(f);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); let rx;
    if (TFORMS.caps(f)) rx = new RegExp('(?<![\\p{L}\\p{N}_])' + f.trim().split(/\s+/).map(esc).join('\\s+') + '(?:s)?(?![\\p{L}\\p{N}_])', 'gu');
    else rx = TERMSCAN.rx({ id: 'form', label: f }); // same rules as a term's own wording
    TFORMS._rx.set(f, rx); return rx;
  },
  forms: t => (t.forms || []).filter(f => f && f.trim().length >= 2),
  /** Mark the forms in one component (after the term wordings themselves). */
  block(b, only) {
    if (!b || !['component', 'figure'].includes(b.kind) || b.status !== 'live' || !b.body || !(b.body.text || '').trim()) return 0;
    const d = M.doc(b.docId); if (!d) return 0;
    const list = (only || TERMSCAN.terms(d)).filter(t => TFORMS.forms(t).length); if (!list.length) return 0;
    const text = b.body.text, marks = b.body.marks || [], skip = new Set((b.termSkip || []).map(s => s.ref + '|' + s.ctx)), added = [];
    const taken = marks.filter(m => m.type === 'term' || m.type === 'cite' || m.type === 'math').map(m => [m.from, m.to]);
    const free = (a, z) => !taken.some(([x, y]) => a < y && z > x) && !text.slice(a, z).includes(OBJ);
    // longest forms first, so "ERK wave" wins over "ERK"
    const pairs = list.flatMap(t => TFORMS.forms(t).map(f => [t, f])).sort((x, y) => y[1].length - x[1].length);
    for (const [t, f] of pairs) { const rx = TFORMS.rx(f); if (!rx) continue; rx.lastIndex = 0; let m;
      while ((m = rx.exec(text))) { const a = m.index, z = a + m[0].length; if (z === a) { rx.lastIndex++; continue; }
        if (!free(a, z) || skip.has(t.id + '|' + TERMSCAN.ctx(text, a, z))) continue;
        added.push({ id: uid('m'), type: 'term', from: a, to: z, ref: t.id, auto: true, form: f }); taken.push([a, z]); } }
    if (!added.length) return 0;
    b.body = { text, marks: [...marks, ...added] }; DB.put('blocks', b); return added.length;
  },
  add(t, f) {
    f = String(f || '').replace(/\s+/g, ' ').trim(); if (f.length < 2) return;
    const cur = M.term(t.id); if (!cur) return; if ((cur.forms || []).some(x => x === f) || cur.label === f) return toast('Already a form of this term');
    cur.forms = [...(cur.forms || []), f]; DB.put('terms', cur); TFORMS._rx.delete(f);
    const r = TERMSCAN.all([cur]); toast(r.n ? `“${f}” found ${plural(r.n, 'time')} in ${plural(r.blocks, 'component')}` : `“${f}” added — no uses yet`, 3500); App.refresh();
  },
  remove(t, f) {
    const cur = M.term(t.id); if (!cur) return; cur.forms = (cur.forms || []).filter(x => x !== f); DB.put('terms', cur);
    let n = 0; DB.where('blocks', b => (b.body && b.body.marks || []).some(m => m.type === 'term' && m.ref === cur.id && m.form === f && m.auto)).forEach(b => { const ms = b.body.marks.filter(m => !(m.type === 'term' && m.ref === cur.id && m.form === f && m.auto)); n += b.body.marks.length - ms.length; b.body = { text: b.body.text, marks: ms }; DB.put('blocks', b); });
    IX.rebuild(); changed(); toast(`“${f}” removed${n ? ` · ${plural(n, 'mark')} taken off` : ''}`);
  },
  editor(t, compact) {
    const fs = TFORMS.forms(t);
    return h('span.tf-forms' + (compact ? '.compact' : ''), { on: { click: e => e.stopPropagation() } }, fs.map(f => h('span.tf-chip', { title: TFORMS.caps(f) ? 'Matches with these capitals only' : 'Matches any case, plurals too' }, f, h('button.tf-x', { title: 'Remove this form', on: { click: e => { e.stopPropagation(); TFORMS.remove(t, f); } } }, '×'))),
      h('button.tf-add', { title: 'Another way this term is written (an abbreviation, a synonym)', on: { click: async e => { e.stopPropagation(); const v = await askText('Another form of “' + t.label + '”', 'Also written as', '', { placeholder: 'e.g. AiEW' }); if (v) TFORMS.add(t, v); } } }, '+ form'));
  },
};
{
  const blk = TERMSCAN.block.bind(TERMSCAN); TERMSCAN.block = function (b, only) { const n = blk(b, only); const cur = b && M.block(b.id) || b; return n + TFORMS.block(cur, only); };
  // Terms page: each term's forms under it
  const tr = TermsView.render; TermsView.render = function (...a) { const el = tr.apply(this, a);
    $$('.list > .li.click', el).forEach(row => { const lab = $('.term-demo', row); const t = lab && DB.where('terms', x => x.label === lab.textContent)[0]; if (t) lab.parentNode.append(h('div', { style: { marginTop: '3px' } }, TFORMS.editor(t, true))); });
    const p = $('p.stand', el); if (p) p.append(' A term can have other forms (an abbreviation, a synonym): “+ form” under it — they are found everywhere too.'); return el; };
  // the lens: an "Other forms" section
  const lr = LensView.render; LensView.render = function (termId) { const el = lr.call(this, termId); const t = M.term(termId), side = t && $('aside.insp', el);
    if (side) { const s = h('div.ins-s', h('h6', 'Other forms'), TFORMS.editor(t), h('div.tiny.muted', { style: { marginTop: '4px' } }, 'Capitals in a form must match (AEW ≠ aew); other forms match any case and plurals.')); const occ = [...side.querySelectorAll('.ins-s')][0]; occ ? occ.before(s) : side.append(s); }
    return el; };
  // hover: which form was found here
  let lastForm = null;
  document.addEventListener('mouseover', e => { const tm = e.target.closest && e.target.closest('.tm[data-m]'); if (!tm) return; const box = tm.closest('.box'), b = box && M.block(box.dataset.id); const mk = b && (b.body.marks || []).find(m => m.id === tm.dataset.m); lastForm = mk && mk.form || null; }, true);
  const tc = ED.termCard; ED.termCard = function (termId) { const el = tc.call(ED, termId); if (el && lastForm) el.prepend(h('div.tiny.muted.tf-as', 'written here as “' + lastForm + '”')); return el; };
}
