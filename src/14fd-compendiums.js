/* ==========================================================================
   14fd · The Compendiums (V4.85 — Gabe, 20 Nov: "Remove all tabs from Atlas
   apart from its original function, and move them to a new tab called
   Compendiums, which acts as the gallery for all of these different
   things. Add registered protocols to Compendiums.")
   - A tab of its own after the Atlas (COMP, made in 14fb like the Atlas):
     All — the gallery: a card per compendium, with what it holds and a few
     of its entries — then Materials (13j), Data (14fc), Protocols (here),
     Topic syntheses (13v, V4.86)… The Atlas keeps the Map alone.
   - Protocols: every registered protocol — its steps, its runs, where it
     lives; Open goes to it in its note (centred, V4.74).
   - Settings → Tabs & overview → Compendiums: off puts the compendiums back
     in the Atlas, Protocols too (old links lead there); "Registered protocols" takes that
     one out; "Cards show a few entries" the peeks.
   CPRO:
     all()            the registered protocols, last run (or made) first
     render()         the Protocols compendium
   ========================================================================== */
const CPRO = {
  ICON: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M9 11h6M9 15h4"/></svg>',
  GALLERY: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  q: '',
  on: () => typeof FEAT === 'undefined' || FEAT.tune('compendiums', 'protocols') !== false,
  last(df) { const R = PROTO.runsOf(df); return R.reduce((m, r) => { const t = String(r.created || ''); return t > m ? t : m; }, ''); },
  all() { return DB.where('blocks', b => b.kind === 'protocol' && b.status !== 'removed' && b.status !== 'superseded' && !!b.registered)
    .sort((a, b) => (CPRO.last(b) || String(b.created || '')).localeCompare(CPRO.last(a) || String(a.created || ''))); },
  card(df) {
    const steps = PROTO.live(df), runs = PROTO.runsOf(df).sort((a, b) => String(b.created || '').localeCompare(String(a.created || ''))), home = M.doc(PROTO.homeDoc(df)), last = runs[0];
    return h('div.cp-pr', { 'data-id': df.id },
      h('div.cp-prh', h('span.cp-ic', { html: CPRO.ICON }), h('b', df.label || 'Protocol'), h('span.cp-prs', [plural(steps.length, 'step'), plural(runs.length, 'run'), last ? 'last run ' + fmtDay(last.created) : 'not run yet'].join(' · '))),
      home ? h('div.cp-prw', M.docPath ? M.docPath(home) : home.title) : null,
      steps.length ? h('ol.cp-prst', steps.slice(0, 3).map(s => h('li', snippet(String(s.text || '').replace(/￼/g, ''), 90)))) : null, steps.length > 3 ? h('p.cp-more', '+ ' + plural(steps.length - 3, 'more step')) : null,
      h('div.cp-prf', h('button.btn.sm', { type: 'button', title: 'Open it in its note, centred', on: { click: () => App.openComponent(df.id) } }, 'Open'),
        runs.slice(0, 3).map(r => { const d = M.doc(r.docId); return d ? h('button.cp-run', { type: 'button', title: 'Open this run in “' + d.title + '”', on: { click: () => App.openComponent(r.id) } }, '⟲ ' + snippet(d.title || 'a note', 28)) : null; })));
  },
  render() {
    const list = h('div.cp-prl'), q = h('input.cp-q', { type: 'search', placeholder: 'Search protocols and their steps', value: CPRO.q, 'aria-label': 'Search protocols' });
    const fill = () => { const s = CPRO.q.trim().toLowerCase(), L = CPRO.all().filter(df => !s || ((df.label || '') + ' ' + PROTO.live(df).map(x => x.text).join(' ')).toLowerCase().includes(s));
      list.replaceChildren(...(L.length ? L.map(CPRO.card) : [h('p.cp-empty', s ? 'No registered protocol matches.' : 'No registered protocol yet. A protocol drafted in a note is registered from its corner light (project / theme): it then gets its own protocol note, and shows here.')])); };
    q.addEventListener('input', () => { CPRO.q = q.value; fill(); }); fill();
    App.setTitle('Protocols', [h('span', plural(CPRO.all().length, 'registered protocol') + ' · a compendium')]);
    return h('div.page.cp-page', h('div.eyebrow', 'Compendiums'), h('h1.title', 'Protocols'),
      h('p.stand', 'Every registered protocol: its steps, how often it was run and where it lives. Open goes to it in its note; a run goes to that run.'), q, list);
  },
};
const CGAL = {
  /** The gallery: a card per compendium. */
  render() {
    const S = COMP.shown().filter(s => s.key !== 'all'), peek = typeof FEAT === 'undefined' || FEAT.tune('compendiums', 'peek') !== false;
    App.setTitle('Compendiums', [h('span', S.map(s => s.label).join(' · '))]);
    return h('div.page.cp-page', h('div.eyebrow', 'Compendiums'), h('h1.title', 'Compendiums'),
      h('p.stand', 'Every collection your notebook keeps, in one gallery: materials, data, protocols, topic syntheses. A card opens its compendium; nothing is copied or moved.'),
      h('div.cp-grid', S.map(s => { const n = s.count ? s.count() : null, P = peek && s.peek ? (s.peek() || []) : [];
        return h('a.cp-card', { href: COMP.href(s.key), 'data-k': s.key },
          h('div.cp-h', s.icon ? h('span.cp-ic', { html: s.icon }) : null, h('b', s.label), n != null ? h('span.cp-n', String(n)) : null),
          s.desc ? h('p.cp-d', s.desc) : null,
          peek ? (P.length ? h('ul.cp-peek', P.slice(0, 4).map(x => h('li', x))) : h('p.cp-none', 'Nothing yet')) : null); })));
  },
  /** Settings' preview: the gallery (or, off, the Atlas holding them), as it is set now. */
  preview() {
    const on = COMP.on(), peek = FEAT.tune('compendiums', 'peek') !== false, pro = CPRO.on();
    if (!on) return [ATHUB.pv('materials'), PV.cap('Off: the compendiums (Materials, Data, Protocols…) are sections of the Atlas again, as before V4.85; there is no Compendiums tab.')];
    const cards = [['Materials', '4', ['PAA gel batch 15', 'MDCK p12']], ['Data', '3', ['41 files in 2 folders']]].concat(pro ? [['Protocols', '2', ['Bead coating', 'ELISA plate']]] : []).concat([['Topic syntheses', '1', ['Traction at the rim']]]);
    return [h('div.pv-cp', cards.map(([l, n, P]) => h('div.pv-cpc', h('b', l, h('span', n)), peek ? P.map(x => h('i', x)) : null))),
      PV.cap('A Compendiums tab after the Atlas: All is this gallery, then each compendium. The Atlas keeps the Map.' + (pro ? ' Registered protocols are one of them.' : ' Registered protocols are not shown.') + (peek ? ' Each card shows a few of its entries.' : ''))];
  },
};
{
  COMP.add({ key: 'all', label: 'All', order: -10, icon: CPRO.GALLERY, title: 'Every compendium, in one gallery', render: () => CGAL.render() });
  COMP.add({ key: 'protocols', label: 'Protocols', order: 30, icon: CPRO.ICON, title: 'Every registered protocol, its steps and its runs', desc: 'Every registered protocol: its steps, its runs, and the note it lives in.', on: CPRO.on,
    count: () => { try { return CPRO.all().length; } catch (e) { return null; } }, peek: () => { try { return CPRO.all().slice(0, 4).map(df => df.label || 'Protocol'); } catch (e) { return []; } }, render: () => CPRO.render() });
}
