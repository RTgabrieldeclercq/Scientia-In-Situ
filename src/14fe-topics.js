/* ==========================================================================
   14fe · Region kinds — for now one, the Topic synthesis (V4.86 — Gabe,
   19 Nov: "You may now label a region as a 'region kind', for now only one,
   being topic synthesis. Topic syntheses get logged into their own gallery
   in Atlas."; 20 Nov: the Atlas's galleries became the Compendiums, V4.85)
   - A region's ⋯ → "Mark as a topic synthesis" sets r.kind = 'topic' (on
     the note's regions, synced like the rest); its tab then carries a
     "Topic synthesis" chip and the region a ruled band of its colour.
   - Compendiums → Topic syntheses: every one in the notebook, as cards — its
     name (the topic), the note and project it is in, how many components,
     a few of their words and a small map of how they sit; Open goes to the
     region in its note, centred (V4.74, App.openComponent takes a region).
   - Settings → Canvas & notes → Topic syntheses: off, the menu row, the
     chip and the compendium go; regions keep their kind.
   TOPIC:
     KINDS                     the region kinds ({ topic })
     set(d, r, kind)           give a region a kind (null: none)
     all()                     [{ r, d }] every topic synthesis, newest first
     render()                  the compendium
   ========================================================================== */
const TOPIC = {
  ICON: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 9.5h9M7.5 13h6M7.5 16.5h3.5"/></svg>',
  KINDS: { topic: { label: 'Topic synthesis', plural: 'Topic syntheses' } },
  q: '',
  on: () => typeof FEAT === 'undefined' || FEAT.on('topics'),
  set(d, r, kind) {
    const cur = REGION.list(d).find(x => x.id === r.id); if (!cur) return; DB.beginGroup(kind ? 'Topic synthesis' : 'Region kind');
    if (kind) cur.kind = kind; else delete cur.kind; cur.kindAt = kind ? isoLocal(new Date()) : undefined; REGION.save(d); changed();
    toast(kind ? '“' + cur.name + '” is a topic synthesis — listed in Compendiums → Topic syntheses' : '“' + cur.name + '” is a plain region again', 2600);
  },
  all() { const out = []; DB.all('documents').forEach(d => { if (d.deleted) return; REGION.list(d).forEach(r => { if (r.kind === 'topic') out.push({ r, d }); }); });
    return out.sort((a, b) => String(b.r.kindAt || b.r.created || '').localeCompare(String(a.r.kindAt || a.r.created || ''))); },
  members: (r, d) => REGION.blocksOf(r, d).map(M.block).filter(b => b && b.status === 'live'),
  /** A small map of the region: its components as boxes where they sit. */
  thumb(r, d) {
    const bs = TOPIC.members(r, d).filter(b => b.x != null); if (!bs.length) return null;
    const hOf = b => b.h || (b.kind === 'figure' ? 220 : 110), x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y)), x1 = Math.max(...bs.map(b => b.x + (b.w || 392))), y1 = Math.max(...bs.map(b => b.y + hOf(b)));
    const W = 240, H = 84, s = Math.min(W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0)), ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const rects = bs.map(b => `<rect x="${(ox + (b.x - x0) * s).toFixed(1)}" y="${(oy + (b.y - y0) * s).toFixed(1)}" width="${Math.max(3, (b.w || 392) * s - 2).toFixed(1)}" height="${Math.max(3, hOf(b) * s - 2).toFixed(1)}" rx="2"/>`).join('');
    return h('span.tp-map', { style: { '--rg': r.color || REGION.COLORS[0] }, html: `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-hidden="true">${rects}</svg>` });
  },
  card(x) {
    const { r, d } = x, bs = TOPIC.members(r, d), words = bs.map(b => String((b.body || {}).text || '').replace(/￼/g, '').trim()).filter(Boolean), thumb = FEAT.tune('topics', 'thumb') !== false;
    return h('div.tp-card', { 'data-rg': r.id, style: { '--rg': r.color || REGION.COLORS[0] } },
      thumb ? TOPIC.thumb(r, d) : null,
      h('div.tp-h', h('b', r.name || 'Topic'), h('span.tp-n', plural(bs.length, 'component'))),
      h('div.tp-w', (M.docPath ? M.docPath(d) : d.title)),
      words.length ? h('ul.tp-s', words.slice(0, 3).map(t => h('li', snippet(t, 110)))) : h('p.tp-none', 'Nothing written in it yet'),
      h('div.tp-f', h('button.btn.sm', { type: 'button', title: 'Open the region in its note, centred', on: { click: e => App.openComponent(r.id, e) } }, 'Open'), (r.bridges || []).length ? h('span.tp-br', plural(r.bridges.length, 'bridge')) : null,
        r.kindAt ? h('span.tp-at', 'since ' + fmtDay(r.kindAt)) : null));
  },
  render() {
    const list = h('div.tp-grid'), q = h('input.cp-q', { type: 'search', placeholder: 'Search topics and what they hold', value: TOPIC.q, 'aria-label': 'Search topic syntheses' });
    const fill = () => { const s = TOPIC.q.trim().toLowerCase(), L = TOPIC.all().filter(x => !s || ((x.r.name || '') + ' ' + x.d.title + ' ' + TOPIC.members(x.r, x.d).map(b => (b.body || {}).text || '').join(' ')).toLowerCase().includes(s));
      list.replaceChildren(...(L.length ? L.map(TOPIC.card) : [h('p.cp-empty', s ? 'No topic synthesis matches.' : 'No topic synthesis yet. In a note, a region’s ⋯ → Mark as a topic synthesis puts it here; its name is the topic.')])); };
    q.addEventListener('input', () => { TOPIC.q = q.value; fill(); }); fill();
    App.setTitle('Topic syntheses', [h('span', plural(TOPIC.all().length, 'topic') + ' · a compendium')]);
    return h('div.page.cp-page', h('div.eyebrow', 'Compendiums'), h('h1.title', 'Topic syntheses'),
      h('p.stand', 'Every region you marked as a topic synthesis: the topic, the note it is in, what it holds and how it is laid out. Open goes to it in its note.'), q, list);
  },
  preview() {
    const on = FEAT.tune('topics', 'thumb') !== false;
    return [h('div.pv-tp', h('div.pv-tpr', h('span.pv-tpt', h('b', 'Traction at the rim'), h('i', 'Topic synthesis')), h('span.pv-tpb'), h('span.pv-tpb'), h('span.pv-tpb.w')),
      h('div.pv-tpc', on ? h('span.pv-tpm', h('i'), h('i'), h('i.w')) : null, h('b', 'Traction at the rim'), h('span', 'Cell mechanics › Rim · 3 components'))),
      PV.cap('A region’s ⋯ → Mark as a topic synthesis: its tab says so, and it is listed in Compendiums → Topic syntheses' + (on ? ', each card with a small map of its components.' : '.'))];
  },
};
{
  // the region's menu: its kind
  REGION.kindRows = (pane, d, r) => !TOPIC.on() ? [] : [r.kind === 'topic'
    ? { label: 'No longer a topic synthesis', sub: 'A plain region again; it leaves Compendiums → Topic syntheses', run: () => TOPIC.set(d, r, null) }
    : { label: 'Mark as a topic synthesis', sub: 'A region kind: its name is the topic, listed in Compendiums → Topic syntheses', run: () => TOPIC.set(d, r, 'topic') }];
  // its tab says so
  const rr0 = REGION.render; REGION.render = function (pane) { const x = rr0.apply(this, arguments); try { const d = M.doc(pane.docId); if (!d || !pane.paper || !TOPIC.on()) return x;
    $$(':scope > .region', pane.paper.world).forEach(el => { const r = REGION.list(d).find(z => z.id === el.dataset.rg); if (!r || r.kind !== 'topic') return; el.classList.add('rk-topic'); const name = $('.rg-name', el);
      if (name && !$('.rk-chip', el)) name.before(h('span.rk-chip', { title: 'A topic synthesis — listed in Compendiums → Topic syntheses' }, h('span', { html: TOPIC.ICON }), 'Topic synthesis')); }); } catch (e) { console.warn('[topics]', e); } return x; };
  COMP.add({ key: 'topics', label: 'Topic syntheses', order: 40, icon: TOPIC.ICON, title: 'Every region marked as a topic synthesis', desc: 'Every region you marked as a topic synthesis: the topic, its note, what it holds and how it is laid out.', on: TOPIC.on,
    count: () => { try { return TOPIC.all().length; } catch (e) { return null; } }, peek: () => { try { return TOPIC.all().slice(0, 4).map(x => x.r.name || 'Topic'); } catch (e) { return []; } }, render: () => TOPIC.render() });
}
