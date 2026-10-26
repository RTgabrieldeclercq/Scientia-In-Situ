
/* ==========================================================================
   20 · Exports — schema-driven JSON; read-only static HTML of one note,
   one theme, or one provenance chain. Output formats, not features.
   ========================================================================== */
const Exporter = {
  download(name, text, mime = 'text/html') { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
  slug: s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60),
  async json() { const data = await DB.exportAll(); Exporter.download(`scientia-export-${localDate(new Date())}.json`, JSON.stringify(data, null, 1), 'application/json'); toast(`Exported ${Object.keys(data.counts).length} stores · ${sum(Object.values(data.counts))} records`); },
  page(title, sub, body) {
    const css = ($('#vendor-css') && document.querySelector('.mx') ? $('#vendor-css').textContent : '') + ($('#font-css') ? $('#font-css').textContent : '') + $('#app-css').textContent + $('#kind-css').textContent +
      'html,body{height:auto;overflow:auto}body{background:var(--paper) repeat;background-image:linear-gradient(to right,var(--grid-line) 0 1px,transparent 1px),linear-gradient(to bottom,var(--grid-line) 0 1px,transparent 1px);background-size:14px 14px}.ro{max-width:860px;margin:0 auto;padding:40px 28px 80px}.ro .blk{background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:10px 14px;margin:12px 0}.ro .blk.superseded{opacity:.55;margin-left:24px}.ro .bh{display:flex;gap:10px;align-items:baseline;font-size:12px;margin-bottom:4px}.ro .bh .meta{margin-left:auto;font-family:var(--f-m);font-size:10.5px;color:var(--ink-3)}.ro .num{font-family:var(--f-m);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}.ro .ed{font-family:var(--f-b);font-size:15px;line-height:1.6;white-space:pre-wrap}.ro .note{margin-top:34px}.ro .lenscanvas{overflow:auto;border:1px solid var(--rule);border-radius:8px;background:var(--surface);padding:8px}.ro .foot{margin-top:50px;font-family:var(--f-m);font-size:10.5px;color:var(--ink-3);border-top:1px solid var(--rule);padding-top:10px}';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body><div class="ro"><div class="eyebrow">${esc(sub)}</div><h1 class="title">${esc(title)}</h1>${body}<div class="foot">Read-only export from Scientia In Situ · ${esc(fmtDayLong(new Date()))} ${esc(fmtTime(new Date()))} · generated from the local record; nothing here is live.</div></div></body></html>`;
  },
  docHTML(d) {
    const P = prof(d.type), out = h('div.note');
    out.append(h('div.crumbs', typechip(d.type), ' ', M.docPath(d), ' · created ', fmtDayLong(d.created)));
    for (const b of M.docBlocks(d.id).filter(x => x.status !== 'removed')) {
      const ghost = b.status === 'superseded';
      const el = h('div.blk' + (ghost ? '.superseded' : ''), h('div.bh', h('span.num', ghost ? 'superseded ' + fmtDay(b.supersededAt) : P.ordered ? `${P.noun} ${M.blockIndex(b)}` : ''), h('b', { style: { fontSize: '13px' } }, b.label || ''), h('span.meta', fmtTime(M.blockTime(b)), b.manualSec ? ' · ' + fmtDur(b.manualSec * 1000) : '', b.step && b.step.durMs != null ? ' · step ' + fmtDur(b.step.durMs, true) : '')));
      if (b.kind === 'ref') { const it = b.refItemId && M.item(b.refItemId), ob = M.block(b.refBlockId); el.append(h('div.refcard', h('div.o', 'pulled in from ', ob ? M.docPath(M.doc(ob.docId)) : '—'), h('div.x', it ? h('span.st.st-' + it.kind, it.text) : ob ? ob.body.text.replace(/￼/g, '') : ''), it && IX.status(it) ? h('span.pill', IX.status(it)) : null)); }
      else { const ed = h('div.ed'); ED.render(ed, b); $$('[contenteditable]', ed).forEach(x => x.removeAttribute('contenteditable')); el.append(ed); }
      const ws = IX.wiresOf(b.id); if (ws.length) el.append(h('div.chips', ws.map(w => { const o = M.block(w.from === b.id ? w.to : w.from); return h('span.wchip', (w.from === b.id ? '→ ' : '← ') + (REL[w.rel] || {}).label + ' · ' + snippet(M.blockName(o), 40)); })));
      out.append(el);
    }
    if (d.synthesis.text) out.append(h('div.synth', h('h3.lab', 'Synthesis'), h('p.serif', d.synthesis.text)));
    const nums = ED.citeNumbers(d); if (nums.size) out.append(h('div.refs', h('h3.lab', 'References'), h('ol', [...nums.keys()].map(id => h('li', LIB.apa(M.lib(id) || { title: 'missing' }))))));
    return out.outerHTML;
  },
  doc(id) { const d = M.doc(id); Exporter.download(Exporter.slug(d.title) + '.html', Exporter.page(d.title, prof(d.type).label + ' · read-only', Exporter.docHTML(d))); toast('Read-only HTML downloaded'); },
  theme(id) {
    const t = M.theme(id), docs = DB.where('documents', d => d.themeId === id).sort((a, b) => a.created.localeCompare(b.created));
    const aims = DB.where('aims', a => a.themeId === id).map(a => aimEl(a).outerHTML).join('');
    Exporter.download(Exporter.slug(t.name) + '.html', Exporter.page(t.name, 'Theme · ' + (M.project(t.projectId) || {}).name, `<p class="stand">${esc(t.question || '')}</p>${aims}${docs.map(Exporter.docHTML).join('')}`)); toast('Theme exported');
  },
  chain(termId, st) {
    const t = M.term(termId), G = IX.termGraph(termId, st.scope, st.scopeId, st.imported), B = LensView.board(G, st, t), tmp = h('div', { style: { position: 'absolute', left: '-99999px', top: '0' } }, B.el); document.body.append(tmp); B.layout(); const svg = { outerHTML: B.el.outerHTML }; tmp.remove();
    const ins = G.insights.map(i => `<div class="insight ${i.cls}"><b>${esc(i.title)}</b>${esc(i.body)}</div>`).join('');
    const occ = LensView.occTable(IX.termOcc.get(termId) || [], st).outerHTML;
    Exporter.download('chain-' + Exporter.slug(t.label) + '.html', Exporter.page(t.label, 'Provenance chain · ' + st.scope + ' lens', `<div class="lenscanvas">${svg.outerHTML || ''}</div><h3 class="lab">What the wiring says</h3>${ins || '<p class="muted">No insights.</p>'}<h3 class="lab">Occurrences</h3>${occ}`)); toast('Chain exported');
  },
};
