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
   ATHUB:
     add({ key, label, order, on?, count?, render })   a section
     shown()                       the sections on now, in order
     render(key)                   the page: the row and the section
     go(key)                       #/atlas or #/atlas/<key>
   ========================================================================== */
const ATHUB = {
  SECS: [], cur: 'map', ink: null,
  add(s) { if (!ATHUB.SECS.some(x => x.key === s.key)) ATHUB.SECS.push(s); ATHUB.SECS.sort((a, b) => (a.order || 0) - (b.order || 0)); },
  shown: () => ATHUB.SECS.filter(s => !s.on || s.on()),
  go: key => App.go(key && key !== 'map' ? '#/atlas/' + key : '#/atlas'),
  row(cur) {
    const S = ATHUB.shown(); if (S.length < 2) return null;
    const ink = h('span.ah-ink', { 'aria-hidden': 'true' });
    const row = h('nav.ah-row', { 'aria-label': 'Atlas sections' }, ink, ...S.map(s => { const n = s.count ? s.count() : null;
      return h('a.ah-tab' + (s.key === cur ? '.on' : ''), { href: s.key === 'map' ? '#/atlas' : '#/atlas/' + s.key, 'data-k': s.key, 'aria-current': s.key === cur ? 'page' : null, title: s.title || '' },
        s.icon ? h('span.ah-ic', { html: s.icon }) : null, h('span.ah-l', s.label), n != null ? h('span.ah-c', String(n)) : null); }));
    // the pill starts where it was (the page is drawn again on every move) and glides to the section shown
    const last = ATHUB.ink; if (last) { ink.style.width = last.w + 'px'; ink.style.transform = 'translateX(' + last.x + 'px)'; ink.style.opacity = 1; }
    requestAnimationFrame(() => requestAnimationFrame(() => ATHUB.pill(row)));
    return row;
  },
  pill(row) {
    const on = row && row.isConnected && row.querySelector('.ah-tab.on'), ink = row && row.querySelector('.ah-ink'); if (!on || !ink) return;
    ink.style.opacity = 1; ink.style.width = on.offsetWidth + 'px'; ink.style.transform = 'translateX(' + on.offsetLeft + 'px)'; ATHUB.ink = { x: on.offsetLeft, w: on.offsetWidth };
  },
  render(key) {
    const S = ATHUB.shown(), s = S.find(x => x.key === key) || S.find(x => x.key === 'map') || S[0]; if (!s) return h('div');
    ATHUB.cur = s.key; const body = s.render() || h('div'), row = ATHUB.row(s.key);
    body.classList.add('ah-in'); body.dataset.ahSec = s.key; if (row) body.prepend(row);   // the row inside the section's own page, so it lines up with it
    return body;
  },
  /** Settings' small picture of the row (a section lit). */
  pv(lit) { return h('div.pv-ah', ATHUB.shown().map(s => h('span' + (s.key === lit ? '.on' : ''), s.label))); },
  ICON: {
    map: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/></svg>',
    materials: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3"/><path d="M7.5 15h9"/></svg>',
  },
};
{
  // the sections the app brings: the map and the materials
  ATHUB.add({ key: 'map', label: 'Map', order: 0, icon: ATHUB.ICON.map, title: 'The notebook in a room on three axes', render: () => ATLAS.render() });
  ATHUB.add({ key: 'materials', label: 'Materials', order: 10, icon: ATHUB.ICON.materials, title: 'Gel batches, cell lines, antibody lots — and the notes that used them', on: () => typeof FEAT === 'undefined' || FEAT.on('materials'),
    count: () => { try { return MATS.all().length; } catch (e) { return null; } }, render: () => VIEWS.materials.render() });   // looked up now: the lab layer replaces VIEWS.materials after this file
  VIEWS.atlas = { title: true, render: key => ATHUB.render(key || 'map') };
  // the Materials tab leaves the row; its page and a material's sheet light the Atlas tab
  { const i = TABS.findIndex(t => t[0] === 'materials'); if (i >= 0) TABS.splice(i, 1); }
  TABOF.materials = 'atlas'; TABOF.mat = 'atlas';
  // #/materials is the Atlas's Materials
  const ps = App.parse; App.parse = function () { const r = ps.apply(this, arguments); if (r && r.name === 'materials') return { name: 'atlas', args: ['materials'].concat(r.args || []) }; return r; };
  addEventListener('resize', debounce(() => { const row = $('.ah-row'); if (row) ATHUB.pill(row); }, 120));
}
