/* ==========================================================================
   13zzyb · The Problem kind (V4.14). Gabe: "Add a Problem kind: it
   highlights a barrier in literature (must be cited by a paper(s)) with
   opportunity for improvement or solving, but is not counted as a barrier
   towards your project."
   - Problem: a kind of text component, in olive. It fuels a question or a
     hypothesis and leads to a method or a task; a Result, an Insight, a
     Method or a Verdict resolves it; a paper supports it; one Problem
     refines another.
   - It must be cited by a paper: a cite of a Library paper in its text, a
     quote from a PDF (or from a page linked to the Library), or a wire to a
     paper (a PDF card, an RM paper, a component that cites one). Until it
     is, its header says "cite a paper" (a click opens the citation picker
     at the end of its text) and its left edge is dashed; choosing Problem
     for an uncited component says so. Settings can count only a cite
     written in its own text.
   - Never a barrier towards your project: the kind is not counted
     (CKINDS.counted counts Insights, Results and unexplained Anomalies),
     and a barrier marked inside a Problem — the literature's barrier,
     quoted — reads "literature", not open (IX.status), so no open-barrier
     count, theme health, review, Today, Portfolio or Pull in takes it.
   ========================================================================== */
const PROBLEM = {
  COLOR: '#7D7A16',
  ICON: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2z"/><path d="M22 4.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7z"/></svg>',
  on: () => typeof FEAT === 'undefined' || FEAT.on('problems'),
  /** Settings → Problems → "Its citation": anywhere (a cite, a quote from a paper, a wire to one) or only a cite in its own text. */
  ownOnly: () => { try { return FEAT.tune('problems', 'cite') === 'text'; } catch (e) { return false; } },
  is: b => !!b && b.kind === 'component' && b.ckind === 'problem' && b.status !== 'removed',
  libOf(src) { try { return src && typeof RDX !== 'undefined' && RDX.libOf ? RDX.libOf(src) : null; } catch (e) { return null; } },
  /** The papers that cite it: [{ how: 'cite' | 'quote' | 'wire', ref, name }]. */
  cites(b) {
    if (!b) return []; const out = [], seen = new Set(), add = (how, ref, name) => { if (!ref || seen.has(how + ref)) return; seen.add(how + ref); out.push({ how, ref, name }); };
    ((b.body && b.body.marks) || []).forEach(m => { if (m.type !== 'cite' || !m.ref) return; let L = null; try { L = M.lib(m.ref); } catch (e) { } add('cite', m.ref, L ? LIB.shortRef(L) : 'a paper'); });
    if (PROBLEM.ownOnly()) return out;
    const q = b.quote, src = q && M.block(q.src);
    if (q && (q.kind === 'pdf' || (src && src.kind === 'pdf') || PROBLEM.libOf(src))) add('quote', q.src, q.file || (src && src.label) || 'a PDF');
    DB.all('wires').forEach(w => { const o = w.from === b.id ? w.to : w.to === b.id ? w.from : null, ob = o && o !== b.id && M.block(o); if (ob && ob.status !== 'removed' && CKINDS.is(ob, 'paper')) add('wire', ob.id, M.blockName(ob) || 'a paper'); });
    return out;
  },
  cited: b => PROBLEM.cites(b).length > 0,
  /** "cite a paper": the citation picker, at the end of its text. */
  ask(b) {
    const el = $(`.box[data-id="${b.id}"] .ed`); if (!el) return; try { el.focus(); } catch (e) { }
    ED.citePicker(el, M.block(b.id) || b, null);
  },
  /** Barrier structures marked inside a Problem: the literature's, not yours. */
  inProblem: it => !!it && it.kind === 'barrier' && !!it.originBlockId && PROBLEM.is(M.block(it.originBlockId)),
};
{
  // the kind itself, after Result / Report (13zzy) and with its own ways
  CKINDS.CLASSES.problem = 'a Problem';
  if (!CKINDS.BASE.some(k => k.id === 'problem')) CKINDS.BASE.push({ id: 'problem', label: 'Problem', color: PROBLEM.COLOR, links: [
    { rel: 'fuels', with: ['question', 'hypothesis'] },
    { rel: 'leads', with: ['method', 'task', 'decision'] },
    { rel: 'resolves', with: ['result', 'insight', 'method', 'verdict'], in: true },
    { rel: 'supports', with: ['paper'], in: true },
    { rel: 'refines', with: ['problem'] } ] });
  // "what kind is this?" offers Problem only while the feature is on (a Problem keeps its kind either way)
  const pick = CKINDS.pick; CKINDS.pick = function (b) {
    if (PROBLEM.on() || (b && b.ckind === 'problem')) return pick.apply(this, arguments);
    const all = CKINDS.all; CKINDS.all = function () { return all.call(CKINDS).filter(k => k.id !== 'problem'); };
    try { return pick.apply(this, arguments); } finally { CKINDS.all = all; } };
  // choosing Problem for a component no paper cites yet says what it needs
  const set = CKINDS.set; CKINDS.set = function (b, id) { const r = set.apply(this, arguments);
    try { const cur = b && M.block(b.id); if (id === 'problem' && PROBLEM.on() && cur && !PROBLEM.cited(cur)) toast('A Problem — a barrier in the literature, not counted as yours. It needs the paper(s) that show it: “cite a paper” in its header, or /cite', 6500); } catch (e) { }
    return r; };
  // its header: "cite a paper" until a paper cites it (the left edge dashed); the tag says who cites it
  const bx = DocView.box; DocView.box = function (b, d, p) {
    const el = bx.apply(this, arguments); if (!el || !PROBLEM.is(b)) return el;
    const num = $(':scope > .bh > .num', el), C = PROBLEM.cites(b);
    if (num && C.length) num.title = 'Problem — cited by ' + C.map(c => c.name).join(', ') + ' · ' + num.title;
    if (C.length || !PROBLEM.on()) return el;
    el.classList.add('pb-uncited');
    if (num && !this.travel) {
      const go = e => { e.preventDefault(); e.stopPropagation(); PROBLEM.ask(b); };
      const chip = h('span.pb-cite.nopan', { role: 'button', tabindex: '0', title: 'A Problem must be cited by the paper(s) that show it — insert a citation', on: { click: go, pointerdown: e => e.stopPropagation(), keydown: e => { if (e.key === 'Enter' || e.key === ' ') go(e); } } });
      chip.innerHTML = PROBLEM.ICON; chip.append(h('span', 'cite a paper')); num.after(chip);
    }
    return el; };
  // never a barrier towards your project
  const st = IX.status; IX.status = function (it) { const s = st.apply(this, arguments); return s === 'open' && PROBLEM.inProblem(it) ? 'literature' : s; };
  const pull = IX.pullable; IX.pullable = function () { return pull.apply(this, arguments).filter(i => !PROBLEM.inProblem(i)); };
}
