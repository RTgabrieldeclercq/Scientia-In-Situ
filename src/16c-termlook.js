/* ==========================================================================
   16c · Terms in notes (V4.66 — Gabe, 20 Nov: "the term look inside of notes
   themselves. The outline is distracting, hard to read, and highlighting text
   makes it go invisible. […] hovering on it for 1 second brings a quick card
   of neighboring notes uses of it along with a metric dashboard style." Then,
   on the design canvas: "Include all term options in settings, with Option A
   as default. The dashboard should be universal across all […]", and: "I like
   the ledger as the default view, with an accompanied timeline vertical,
   almost like a left side panel to the popup, where the viewer can interact
   with it just like the Timeline hover option.")
   - How a term reads in a note (Settings → Terms → Terms in your notes): A ·
     Quiet underline (ordinary text, a dotted teal line under it; the default) ·
     B · Soft tag (a faint teal tint, a little heavier) · C · Ghost until you
     look (plain words; a faint line while the pointer is over its component).
     All three are filled text, so selected they stay readable. The same in a
     term's bubbles.
   - Rest on a term about a second: one card for every look — the Ledger (its
     numbers in a row: uses · notes · this month; its 12 weeks as one line; an
     open barrier; the nearest notes with their sentences) with, down its left
     side, a timeline of every note that uses it (sized by how often, this note
     ringed). Point at a dot: its sentence shows at the top of the Ledger; a
     click opens it there.
   TLOOK: look() · apply() · data(termId, docId) · rel(d, here) · kwic(o) · card(termId, block).
   ========================================================================== */
const TLOOK = {
  look() { try { const v = FEAT.tune('terms', 'look'); return v === 'b' || v === 'c' ? v : 'a'; } catch (e) { return 'a'; } },
  apply() { const b = document.body; if (!b) return; const k = TLOOK.look(); ['a', 'b', 'c'].forEach(x => b.classList.toggle('tm-' + x, x === k)); },
  /** The term's numbers, and the notes that use it as seen from the note it is read in. */
  data(termId, hereId) {
    const t = M.term(termId); if (!t) return null;
    const occ = (typeof TERMLIT !== 'undefined' ? TERMLIT.occ(termId) : (IX.termOcc.get(termId) || [])).filter(o => { const b = M.block(o.blockId); return b && b.status !== 'removed'; });
    const w0 = TSTAT.week0(), wk = new Array(12).fill(0), opens = new Set(), byDoc = new Map(); let first = Infinity;
    occ.forEach(o => { const b = M.block(o.blockId), tm = +new Date(M.blockTime(b) || (M.doc(o.docId) || {}).created || 0), wi = Math.floor((tm - w0) / (7 * 864e5)); if (wi >= 0 && wi < 12) wk[wi]++; if (tm && tm < first) first = tm;
      o.itemIds.forEach(i => { const it = M.item(i); if (it && it.kind === 'barrier' && IX.status(it) === 'open') opens.add(i); });
      const d = M.doc(o.docId); if (!d || d.deleted) return; let g = byDoc.get(d.id); if (!g) { g = { d, n: 0, o, t: +new Date(d.created || tm) || tm }; byDoc.set(d.id, g); } g.n++; });
    const here = hereId && M.doc(hereId), sum = (a, z) => wk.slice(a, z).reduce((x, y) => x + y, 0);
    const notes = [...byDoc.values()].sort((a, b) => a.t - b.t).map(g => Object.assign(g, { rel: TLOOK.rel(g.d, here), kw: TLOOK.kwic(g.o), kind: typeof NOTEKIND !== 'undefined' ? NOTEKIND.of(g.d) : 'notes' }));
    return { t, uses: occ.length, notes, nNotes: byDoc.size, wk, delta: sum(8, 12) - sum(4, 8), open: opens.size, since: isFinite(first) ? first : null, here };
  },
  rel(d, here) {
    if (!here) return ''; if (d.id === here.id) return 'this note';
    if (here.chain && d.chain === here.chain) return 'same experiment';
    if (here.series && d.series === here.series) return (d.run || 1) < (here.run || 1) ? 'run before' : 'run after';
    if (typeof TERMLIT !== 'undefined' && TERMLIT.is(d)) return 'lit review';
    if (here.themeId && d.themeId === here.themeId) return 'same theme'; if (here.projectId && d.projectId === here.projectId) return 'same project'; return 'another project';
  },
  /** The sentence it is used in, cut round the term. */
  kwic(o) { const b = M.block(o.blockId), tx = String((b && b.body && b.body.text) || ''); let s = 0, e = tx.length; try { [s, e] = sentenceAround(tx, o.from, o.to); } catch (er) { }
    let pre = tx.slice(s, o.from), post = tx.slice(o.to, e); if (pre.length > 64) pre = '…' + pre.slice(-62); if (post.length > 90) post = post.slice(0, 88) + '…'; return { pre, term: tx.slice(o.from, o.to), post, blockId: o.blockId }; },
  /** The card: a timeline down its left side, the Ledger beside it. */
  card(termId, block) {
    const D = TLOOK.data(termId, block && block.docId); if (!D) return null; const { t, notes, here } = D, t1 = Date.now();
    const others = notes.filter(g => !here || g.d.id !== here.id), hereT = here ? +new Date(here.created || t1) : t1;
    const near = others.slice().sort((a, b) => Math.abs(a.t - hereT) - Math.abs(b.t - hereT)).slice(0, 3);
    let sel = near[0] || notes[0] || null; const t0 = notes.length ? Math.min(notes[0].t, D.since || notes[0].t) : t1, tEnd = Math.max(t1, ...notes.map(g => g.t)), span = Math.max(864e5, tEnd - t0);
    const quote = h('div.tcd-q'), drawQ = () => { if (!sel) return quote.replaceChildren(h('span.tcd-none', 'Used only here so far.'));
      quote.replaceChildren(h('button.tcd-qb', { type: 'button', title: 'Open it there', on: { click: () => { hideHover(); App.openComponent(sel.kw.blockId); } } },
        h('span.tcd-qh', h('i.tcd-k.k-' + sel.kind), h('b', sel.d.title || 'Untitled'), h('span.tcd-sp'), h('span.tcd-m', (sel.rel ? sel.rel + ' · ' : '') + fmtDay(sel.t) + ' · ' + sel.n + '×')),
        h('span.tcd-kw', sel.kw.pre, h('b', sel.kw.term || t.label), sel.kw.post))); $$('.tcd-dot', tl).forEach(x => x.classList.toggle('sel', sel && x.dataset.d === sel.d.id)); };
    // the timeline: every note that uses it, by its date, sized by how often; this note ringed
    const tl = h('div.tcd-tl', { 'aria-label': 'Every note that uses ' + t.label },
      h('span.tcd-tlh', 'Its notes'), h('div.tcd-line'),
      notes.map(g => { const top = 8 + (g.t - t0) / span * 84, me = here && g.d.id === here.id;
        return h('button.tcd-dot.k-' + g.kind + (me ? '.here' : ''), { type: 'button', 'data-d': g.d.id, style: { top: top + '%', width: (7 + Math.min(4, g.n) * 2) + 'px', height: (7 + Math.min(4, g.n) * 2) + 'px' }, 'aria-label': (g.d.title || 'Untitled') + ', ' + fmtDay(g.t) + ', ' + plural(g.n, 'use'),
          on: { pointerenter: () => { sel = g; drawQ(); }, focus: () => { sel = g; drawQ(); }, click: () => { hideHover(); App.openComponent(g.kw.blockId); } } }, h('span.tcd-dl', me ? 'this note' : fmtDay(g.t))); }),
      null);
    // its 12 weeks, one soft line
    const mx = Math.max(1, ...D.wk), P = D.wk.map((w, i) => [Math.round(4 + i * 316 / 11), Math.round(34 - w / mx * 28)]);
    const svg = `<svg width="324" height="38" viewBox="0 0 324 38" role="img" aria-label="Uses over the last 12 weeks: ${D.wk.join(', ')}"><path d="M${P[0][0]},36 L${P.map(p => p.join(',')).join(' L')} L${P[11][0]},36 Z" class="tcd-area"/><path d="M${P.map(p => p.join(',')).join(' L')}" class="tcd-ln"/><circle cx="${P[11][0]}" cy="${P[11][1]}" r="3" class="tcd-end"/></svg>`;
    const lens = () => { hideHover(); App.go('#/lens/' + termId); };
    const main = h('div.tcd-main',
      h('div.tcd-h', h('div.tcd-ht', h('b', t.label), h('span', ((M.project(t.projectId) || {}).name || 'General') + (D.since ? ' · first used ' + fmtDay(D.since) : ''))), h('button.tcd-act', { type: 'button', on: { click: lens } }, 'Open the term')),
      h('div.tcd-nums', [[D.uses, 'uses', ''], [D.nNotes, 'notes', ''], [D.delta > 0 ? '▲ ' + D.delta : D.delta < 0 ? '▼ ' + -D.delta : '–', 'this month', D.delta > 0 ? 'up' : '']].map(([v, k, c]) => h('div', h('b' + (c ? '.' + c : ''), String(v)), h('span', k)))),
      h('div.tcd-spk', { html: svg }), h('div.tcd-ax', h('span', '12 weeks ago'), D.open ? h('span.tcd-open', plural(D.open, 'barrier') + ' open') : null, h('span', 'this week')),
      quote,
      near.length > 1 ? h('div.tcd-nh', 'Nearest notes') : null,
      near.length > 1 ? h('div.tcd-near', near.map(g => h('button.tcd-row', { type: 'button', on: { pointerenter: () => { sel = g; drawQ(); }, click: () => { hideHover(); App.openComponent(g.kw.blockId); } } },
        h('span.tcd-rd', fmtDay(g.t)), h('b', g.d.title || 'Untitled'), h('span.tcd-rr.k-' + g.kind, g.rel)))) : null,
      h('div.tcd-f', h('button.tcd-act', { type: 'button', on: { click: lens } }, 'All ' + plural(D.nNotes, 'note') + ' →'), h('span.tcd-sp'), h('span.tcd-hint', 'Ctrl+click: its lens · Alt+click: options')));
    const root = h('div.tcd', tl, main); drawQ(); return root;
  },
};
{
  // the card for every look, after about a second
  const tc0 = ED.termCard; ED.termCard = function (termId, b) { try { const c = TLOOK.card(termId, b); if (c) return c; } catch (e) { console.warn('[terms] card', e); } return tc0.call(this, termId); };
  // the look, from Settings, as soon as they are read
  const w = setInterval(() => { if (!window.__ready && !(typeof DB !== 'undefined' && DB.mode)) return; clearInterval(w); try { TLOOK.apply(); } catch (e) { } }, 300);
}
