/* ==========================================================================
   13zzy · Reports (V4.4). Gabe: "HTMLs and PDFs can be labelled as a report
   as a new component kind just for those. Any snipped figure out of it is
   instantly labelled as a result."
   - Report: a kind of component only a PDF or a saved web page can be
     (double-click the label left of its name, as on a component). A kind may
     now say which components it is for (`on`, default text components);
     Result is for image panels too.
   - A figure snipped from a report (the scissors on a PDF, the snip on a web
     page) is a Result the moment it lands (Settings → Reports).
   - An image panel that is a Result counts as one where results are counted
     (the Portfolio, a Synthesis), as a Result component does.
   ========================================================================== */
const REPORT = {
  KINDS_ON: ['pdf', 'html'],
  on: () => typeof FEAT === 'undefined' || FEAT.on('reports'),
  snips: () => typeof FEAT === 'undefined' || FEAT.tune('reports', 'snips') !== 'plain',
  /** What a component can be: the kinds whose `on` holds its kind (text components when a kind says nothing). */
  fits(K, b) { if (!K || !b) return false; if (K.id === 'report' && !REPORT.on()) return false; return (K.on || ['component']).includes(b.kind); },
  /** Is this block a report? */
  is: b => !!b && b.ckind === 'report' && REPORT.KINDS_ON.includes(b.kind),
  /** A figure snipped from a report becomes a Result (unless it already has a kind, or Settings says otherwise). */
  mark(b) {
    if (!b || b.kind !== 'figure' || !b.clip || !REPORT.on() || !REPORT.snips()) return false;
    const cur = M.block(b.id), src = cur && cur.clip && M.block(cur.clip.src); if (!cur || cur.ckind || !REPORT.is(src)) return false;
    cur.ckind = 'result'; cur.modified = isoLocal(new Date()); DB.put('blocks', cur); b.ckind = 'result'; changed(); return true;
  },
};
{
  // the kind itself, and Result for image panels (what a report gives)
  CKINDS.CLASSES.report = 'a Report';
  const R = CKINDS.BASE.find(k => k.id === 'result');
  if (R) { R.on = ['component', 'figure']; const p = R.links.find(l => l.rel === 'produces' && l.in); if (p && !p.with.includes('report')) p.with.push('report'); }
  if (!CKINDS.BASE.some(k => k.id === 'report')) CKINDS.BASE.push({ id: 'report', label: 'Report', color: '#46607A', on: REPORT.KINDS_ON.slice(), links: [
    { rel: 'produces', with: ['result'] },
    { rel: 'supports', with: ['hypothesis', 'claim'] } ] });
  // "what kind is this?" offers only the kinds this component can be
  const pick = CKINDS.pick; CKINDS.pick = function (b) {
    const all = CKINDS.all; CKINDS.all = function () { return all.call(CKINDS).filter(k => REPORT.fits(k, b)); };
    try { return pick.apply(this, arguments); } finally { CKINDS.all = all; } };
  // the label left of the name on a PDF, a web page or an image panel: its kind, in its colour, and double-click to choose it
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments); if (!el || !b || !['pdf', 'html', 'figure'].includes(b.kind)) return el;
    if (b.kind !== 'figure' && !REPORT.on()) return el;
    const num = $(':scope > .bh > .num', el); if (!num) return el; const K = CKINDS.of(b), ok = K && REPORT.fits(K, b);
    if (ok) { num.textContent = K.label; el.classList.add('kinded', 'kinded-w'); el.style.setProperty('--ck', K.color); el.dataset.ck = K.id; }
    num.title = (ok ? K.label + ' — ' + CKINDS.ways(K, 3) + ' · ' : '') + 'Double-click: what kind of ' + (b.kind === 'figure' ? 'image panel' : b.kind === 'pdf' ? 'PDF' : 'page') + ' this is';
    num.style.cursor = 'pointer';
    num.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); if (this.travel) return; CKINDS.pick(M.block(b.id) || b, e.clientX, e.clientY + 8); });
    return el; };
  // a snip from a report lands as a Result (both the PDF scissors and the web-page snip end in CLIP.fresh)
  const fresh = CLIP.fresh; CLIP.fresh = function (b) { try { REPORT.mark(b); } catch (e) { console.warn('[report]', e); } return fresh.apply(this, arguments); };
  // an image panel that is a Result counts as one (the Portfolio's evidence, a Synthesis's results)
  const counted = CKINDS.counted; CKINDS.counted = function (docIds) {
    const out = counted.apply(this, arguments), ids = docIds instanceof Set ? docIds : new Set(docIds);
    ids.forEach(id => M.docBlocks(id).forEach(b => { if (b && b.status === 'live' && b.kind === 'figure' && b.ckind === 'result' && !out.evidence.includes(b)) out.evidence.push(b); }));
    return out; };
}
