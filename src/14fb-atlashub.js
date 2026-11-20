/* ==========================================================================
   14fb · The Atlas holds the Materials (V4.48 — Gabe: "Merge Materials into
   Atlas, and create data tab in Atlas, which organizes all trees recorded
   there for a master tree.")
   - The Atlas page has sections, in a row of pills at its top (the tab row's
     pill, gliding from one to the next): Map (the room on three axes, 14f),
     Materials (13j's page, as the lab layer dresses it on the website: its
     inventory card stays), and Data (14h, V4.49). A section a feature turns
     off leaves the row; with one section left there is no row.
   - Routes: #/atlas (the map) · #/atlas/materials · #/atlas/data. #/materials
     is read as #/atlas/materials (old links, the material sheet's "All
     materials", the lab harness), so nothing that went there breaks.
   - The Materials tab leaves the tab row; a material's own page (#/mat/…)
     lights the Atlas tab. Settings → Tabs & overview → Materials: its switch
     takes the section out of the Atlas (its page still opens from links).
   V4.85: HUBPAGE(o) makes such a tab; ATHUB (the Atlas: the Map) and COMP
   (the Compendiums: All, the gallery, then Materials, Data, Protocols…) are
   two. With the Compendiums off, COMP's sections are the Atlas's again.
   ATHUB / COMP:
     add({ key, label, order, on?, count?, render, desc?, peek? })   a section
     shown()                       the sections on now, in order
     render(key)                   the page: the row and the section
     go(key)                       #/atlas or #/atlas/<key>
   ========================================================================== */
/** A tab of sections with a pill row (V4.48). V4.85: two of them — the Atlas, and the Compendiums. */
const HUBPAGE = o => { const H = {
  SECS: [], cur: o.home, ink: null, base: o.base, home: o.home, extra: null,
  add(s) { if (!H.SECS.some(x => x.key === s.key)) H.SECS.push(s); H.SECS.sort((a, b) => (a.order || 0) - (b.order || 0)); },
  /** The sections on now, in order (and those another hub lends it: the Compendiums', when they are off). */
  shown: () => H.SECS.concat(H.extra ? H.extra() : []).filter(s => !s.on || s.on()).sort((a, b) => (a.order || 0) - (b.order || 0)),
  href: key => key && key !== H.home ? '#/' + H.base + '/' + key : '#/' + H.base,
  go: key => App.go(H.href(key)),
  row(cur) {
    const S = H.shown(); if (S.length < 2) return null;
    const ink = h('span.ah-ink', { 'aria-hidden': 'true' });
    const row = h('nav.ah-row', { 'aria-label': o.aria }, ink, ...S.map(s => { const n = s.count ? s.count() : null;
      return h('a.ah-tab' + (s.key === cur ? '.on' : ''), { href: H.href(s.key), 'data-k': s.key, 'aria-current': s.key === cur ? 'page' : null, title: s.title || '' },
        s.icon ? h('span.ah-ic', { html: s.icon }) : null, h('span.ah-l', s.label), n != null ? h('span.ah-c', String(n)) : null); }));
    // the pill starts where it was (the page is drawn again on every move) and glides to the section shown
    const last = H.ink; if (last) { ink.style.width = last.w + 'px'; ink.style.transform = 'translateX(' + last.x + 'px)'; ink.style.opacity = 1; }
    requestAnimationFrame(() => requestAnimationFrame(() => H.pill(row)));
    return row;
  },
  pill(row) {
    const on = row && row.isConnected && row.querySelector('.ah-tab.on'), ink = row && row.querySelector('.ah-ink'); if (!on || !ink) return;
    ink.style.opacity = 1; ink.style.width = on.offsetWidth + 'px'; ink.style.transform = 'translateX(' + on.offsetLeft + 'px)'; H.ink = { x: on.offsetLeft, w: on.offsetWidth };
  },
  render(key) {
    const S = H.shown(), s = S.find(x => x.key === key) || S.find(x => x.key === H.home) || S[0]; if (!s) return h('div');
    H.cur = s.key; const body = s.render() || h('div'), row = H.row(s.key);
    body.classList.add('ah-in'); body.dataset.ahSec = s.key; if (row) body.prepend(row);   // the row inside the section's own page, so it lines up with it
    return body;
  },
  /** Settings' small picture of the row (a section lit). */
  pv(lit) { return h('div.pv-ah', H.shown().map(s => h('span' + (s.key === lit ? '.on' : ''), s.label))); },
}; return H; };
const ATHUB = Object.assign(HUBPAGE({ base: 'atlas', home: 'map', aria: 'Atlas sections' }), {
  ICON: {
    map: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/></svg>',
    materials: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3"/><path d="M7.5 15h9"/></svg>',
  },
});
/** V4.85 — the Compendiums (Gabe, 20 Nov: "Remove all tabs from Atlas apart from its original function, and move them to a new tab called
    Compendiums, which acts as the gallery for all of these different things. Add registered protocols to Compendiums."): Materials, Data,
    Protocols, Topic syntheses… and All, the gallery of them (14fd). Off: they are the Atlas's sections again, as before. */
const COMP = Object.assign(HUBPAGE({ base: 'compendiums', home: 'all', aria: 'Compendiums' }), { on: () => typeof FEAT === 'undefined' || FEAT.on('compendiums') });
ATHUB.extra = () => COMP.on() ? [] : COMP.SECS.filter(s => s.key !== 'all');
{
  // the sections the app brings: the map (the Atlas) and the materials (a compendium)
  ATHUB.add({ key: 'map', label: 'Map', order: 0, icon: ATHUB.ICON.map, title: 'The notebook in a room on three axes', render: () => ATLAS.render() });
  COMP.add({ key: 'materials', label: 'Materials', order: 10, desc: 'Gel batches, cell lines, antibody lots — each a page of its own, with the notes that used it.', peek: () => { try { return MATS.all().slice().sort((a, b) => String(b.modified || b.created || '').localeCompare(String(a.modified || a.created || ''))).slice(0, 4).map(d => d.title || 'Untitled'); } catch (e) { return []; } }, icon: ATHUB.ICON.materials, title: 'Gel batches, cell lines, antibody lots — and the notes that used them', on: () => typeof FEAT === 'undefined' || FEAT.on('materials'),
    count: () => { try { return MATS.all().length; } catch (e) { return null; } }, render: () => VIEWS.materials.render() });   // looked up now: the lab layer replaces VIEWS.materials after this file
  VIEWS.atlas = { title: true, render: key => ATHUB.render(key || 'map') };
  VIEWS.compendiums = { title: true, render: key => COMP.on() ? COMP.render(key || 'all') : ATHUB.render(key) };   // each section names the page (Materials and Data do themselves)
  if (!TABS.some(t => t[0] === 'compendiums')) { const i = TABS.findIndex(t => t[0] === 'atlas'); TABS.splice(i >= 0 ? i + 1 : TABS.length, 0, ['compendiums', 'Compendiums']); }
  // the Materials tab leaves the row; its page and a material's sheet light the Atlas tab
  { const i = TABS.findIndex(t => t[0] === 'materials'); if (i >= 0) TABS.splice(i, 1); }
  ['materials', 'mat'].forEach(k => Object.defineProperty(TABOF, k, { get: () => COMP.on() ? 'compendiums' : 'atlas', enumerable: true, configurable: true }));
  // #/materials is the Materials compendium (the Atlas's, when the Compendiums are off); so are #/atlas/materials and #/atlas/data, the old links
  const ps = App.parse; App.parse = function () { let r = ps.apply(this, arguments); if (r && r.name === 'materials') r = { name: 'atlas', args: ['materials'].concat(r.args || []) };
    if (r && r.name === 'atlas' && r.args && r.args[0] && r.args[0] !== 'map' && COMP.on() && COMP.SECS.some(s => s.key === r.args[0])) return { name: 'compendiums', args: r.args };
    if (r && r.name === 'compendiums' && !COMP.on()) return { name: 'atlas', args: r.args && r.args[0] && r.args[0] !== 'all' ? r.args : [] };
    return r; };
  addEventListener('resize', debounce(() => { const row = $('.ah-row'); if (row) ATHUB.pill(row); }, 120));
}
