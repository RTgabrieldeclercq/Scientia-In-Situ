/* ==========================================================================
   13m · Spatial canvases (a lab — switch it on in Settings or with Ctrl+P).
   A canvas owns nothing: its nodes are references to components,
   structures, library entries and datasets, with a position. Drawing an
   edge between two components creates a real wire, so a canvas made in a
   cycle review leaves queryable relations behind. Only the cards in view
   are rendered, so a canvas with hundreds of cards stays fluid.
   Export: JSON Canvas (jsoncanvas.org) — text, file, link and group nodes.
   ========================================================================== */
const CANVAS = {
  on: () => !!(settings().labs || {}).canvas,
  toggleLab() { const L = Object.assign({}, settings().labs, { canvas: !CANVAS.on() }); saveSettings({ labs: L }); App.renderTabs(); toast(L.canvas ? 'Spatial canvases on — a “Canvas” tab is in the bar' : 'Spatial canvases off — your canvases are kept'); if (!L.canvas && App.route.name === 'canvas') App.go('#/home'); },
  W: 260,
  /** What a node points at → {title, text, sub, kind, open} */
  resolve(n) {
    const r = n.ref || {};
    if (r.type === 'block') { const b = M.block(r.id); if (!b) return null; const d = M.doc(b.docId), k = IX.kindsOf(b)[0]; return { title: M.blockName(b), text: b.body.text, sub: d ? prof(d.type).label + ' · ' + d.title : '', kind: k, tag: 'component', open: e => App.jump(b.id, e) }; }
    if (r.type === 'item') { const it = M.item(r.id); if (!it) return null; return { title: KIND[it.kind].label + (IX.status(it) ? ' · ' + IX.status(it) : ''), text: it.text, sub: (M.doc(it.originDocId) || {}).title || '', kind: it.kind, tag: it.kind, open: e => App.jump(it.originBlockId, e) }; }
    if (r.type === 'library') { const l = M.lib(r.id); if (!l) return null; return { title: l.title || l.url, text: LIB.apa ? LIB.apa(l) : '', sub: 'library', tag: 'paper', open: () => l.pdf ? App.go('#/read/' + l.id) : App.go('#/library') }; }
    if (r.type === 'dataset') { const x = DB.get('datasets', r.id); if (!x) return null; return { title: x.name, text: `${x.root}/${x.path}`, sub: `${DATA.fmtSize(x.size)} · ${x.instrument || ''} · ${x.status || ''}`, tag: 'dataset', open: () => DATA.detail(x) }; }
    if (r.type === 'group') return { title: n.label || 'Group', group: true };
    return null;
  },
  /** Edges shown: the canvas's own + every real wire between components on it. */
  edges(c) {
    const byRef = new Map(c.nodes.filter(n => n.ref && n.ref.type === 'block').map(n => [n.ref.id, n.id])), out = [], seen = new Set();
    for (const w of DB.all('wires')) { const a = byRef.get(w.from), b = byRef.get(w.to); if (a && b) { out.push({ id: 'w:' + w.id, from: a, to: b, label: (REL[w.rel] || { label: w.rel }).label, wire: w, directed: w.directed }); seen.add(w.id); } }
    (c.edges || []).forEach(e => { if (!e.wireId || !seen.has(e.wireId)) out.push(Object.assign({ local: !e.wireId }, e)); });
    return out;
  },
  save: debounce(c => DB.put('canvases', c), 400),
};

const CanvasView = {
  canvas: true, title: true,
  render(id) {
    if (!CANVAS.on()) return h('div.canvas-host', h('div.empty-c', h('div', h('p', 'Spatial canvases are a lab feature.'), h('button.btn.pri', { on: { click: () => { CANVAS.toggleLab(); App.refresh(); } } }, 'Turn them on'))));
    let c = id && DB.get('canvases', id);
    if (!c) { const list = DB.all('canvases');
      App.setTitle('Canvases', [h('span', 'lab · references only — the cards live in your notes')]);
      return h('div.canvas-host', h('div.page', { style: { position: 'absolute', inset: 0, overflow: 'auto' } }, h('div.eyebrow', 'Lab'), h('h1.title', 'Canvases'),
        h('p.stand', 'Arrange components, structures, papers and datasets spatially. A canvas holds references, not copies; drawing a line between two components makes a real connection, visible in their notes and in the lens.'),
        h('div.row', h('button.btn.pri', { on: { click: async () => { const n = await askText('New canvas', 'Name', 'Cycle review ' + fmtDay(new Date())); if (!n) return; const x = { id: uid('cv'), name: n, nodes: [], edges: [], created: isoLocal(new Date()), modified: isoLocal(new Date()) }; DB.put('canvases', x); App.go('#/canvas/' + x.id); } } }, '+ New canvas'), h('button.btn.ghost', { on: { click: () => CANVAS.toggleLab() } }, 'Turn the lab off')),
        h('div.list', { style: { marginTop: '14px' } }, list.length ? list.map(x => h('div.li.click', { on: { click: () => App.go('#/canvas/' + x.id) } }, h('span.t', x.name, h('span.s', plural(x.nodes.length, 'card') + ' · ' + plural((x.edges || []).length, 'drawn line') + ' · ' + fmtWhen(x.modified))))) : h('div.empty', 'No canvases yet.'))));
    }
    App.setTitle(c.name, [h('span', 'canvas · lab'), h('span', plural(c.nodes.length, 'card'))], { editable: true, onEdit: v => { c.name = v; DB.put('canvases', c); } });
    const host = h('div.canvas-host'), P = makePaper(host, { view: c.view, minZ: .15, onView: v => { c.view = { ...v }; CANVAS.save(c); this.schedule(); } });
    this.c = c; this.P = P; this.els = new Map(); this.sel = null;
    this.svg = SV('svg', { class: 'cv-wires' }); P.world.append(this.svg);
    host.append(h('div.dock.nopan', h('button.dk.ins', { on: { click: e => this.addMenu(e) } }, '+ Add'), h('button.dk', { on: { click: () => this.addGroup() } }, '▭ Group'), h('span.dk-sep'),
      h('button.dk', { title: 'Fit', on: { click: () => this.fit() } }, '⤢'), h('button.dk', { on: { click: () => this.exportJC() } }, 'Export JSON Canvas'), h('span.dk-l.tiny', { style: { color: 'var(--ink-3)' } }, 'lab')),
      h('div.cv-stat.nopan'));
    host.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel && !e.target.closest('input,textarea')) { this.removeNode(this.sel); } }); host.tabIndex = -1;
    requestAnimationFrame(() => { if (!c.view) this.fit(false); this.draw(); });
    return host;
  },
  update() { this.draw(true); },
  schedule() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = null; this.draw(); }); },
  /** Virtualised: only nodes intersecting the view (+ a margin) exist in the DOM. */
  draw(force) {
    const c = this.c, P = this.P; if (!c || !P || !P.world.isConnected) return;
    const r = P.rect(), a = P.toWorld(r.left, r.top), z = P.toWorld(r.right, r.bottom), m = 400 / P.view.z;
    const vis = new Set(c.nodes.filter(n => n.x + (n.w || CANVAS.W) > a.x - m && n.x < z.x + m && n.y + (n.h || 140) > a.y - m && n.y < z.y + m).map(n => n.id));
    for (const [id, el] of this.els) if (!vis.has(id) || force) { el.remove(); this.els.delete(id); }
    for (const n of c.nodes) if (vis.has(n.id) && !this.els.has(n.id)) { const el = this.nodeEl(n); if (el) { P.world.append(el); this.els.set(n.id, el); if (!n.h && n.ref.type !== 'group') { n.h = el.offsetHeight; } } }
    $('.cv-stat', P.el.parentElement) && ($('.cv-stat', P.el.parentElement).textContent = `${this.els.size} of ${c.nodes.length} cards drawn`);
    this.drawEdges();
  },
  nodeEl(n) {
    const R = CANVAS.resolve(n);
    if (!R) return h('div.cv-node.missing', { 'data-id': n.id, style: { left: n.x + 'px', top: n.y + 'px', width: (n.w || CANVAS.W) + 'px' } }, 'Missing reference');
    if (R.group) { const el = h('div.cv-group', { 'data-id': n.id, style: { left: n.x + 'px', top: n.y + 'px', width: (n.w || 520) + 'px', height: (n.h || 320) + 'px' } }, h('input.cv-gl', { value: n.label || 'Group', on: { change: e => { n.label = e.target.value; CANVAS.save(this.c); }, keydown: e => e.stopPropagation() } }), h('div.cv-rz')); this.drag(el, n, true); return el; }
    const el = h('div.cv-node' + (this.sel === n.id ? '.sel' : ''), { 'data-id': n.id, style: { left: n.x + 'px', top: n.y + 'px', width: (n.w || CANVAS.W) + 'px', '--kc': R.kind ? `var(--k-${R.kind})` : 'var(--rule-2)' } },
      h('div.cv-h', h('span.cv-tag', R.tag), h('b', snippet(R.title, 50)), h('span.spacer'), h('button.cv-open', { title: 'Open · Alt+click: beside', on: { click: e => { e.stopPropagation(); R.open(e); } } }, '↗')),
      R.text ? h('div.cv-t.serif', snippet(R.text, 220)) : null, R.sub ? h('div.cv-s', snippet(R.sub, 60)) : null, h('div.cv-port', { title: 'Drag to another card to connect' }));
    this.drag(el, n); return el;
  },
  drag(el, n, isGroup) {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('input,button')) return; e.stopPropagation(); this.select(n.id);
      const P = this.P, z = P.view.z, sx = e.clientX, sy = e.clientY, port = e.target.closest('.cv-port'), rz = e.target.closest('.cv-rz');
      if (port) return this.edgeDrag(n, e);
      const inGroup = isGroup ? this.c.nodes.filter(m => m !== n && m.ref.type !== 'group' && m.x >= n.x && m.y >= n.y && m.x < n.x + (n.w || 520) && m.y < n.y + (n.h || 320)).map(m => [m, m.x, m.y]) : [];
      const ox = n.x, oy = n.y, ow = n.w || 520, oh = n.h || 320;
      const mv = ev => { const dx = (ev.clientX - sx) / z, dy = (ev.clientY - sy) / z;
        if (rz) { n.w = Math.max(200, Math.round((ow + dx) / 14) * 14); n.h = Math.max(120, Math.round((oh + dy) / 14) * 14); el.style.width = n.w + 'px'; el.style.height = n.h + 'px'; return; }
        n.x = Math.round((ox + dx) / 14) * 14; n.y = Math.round((oy + dy) / 14) * 14; el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
        inGroup.forEach(([m, x0, y0]) => { m.x = x0 + n.x - ox; m.y = y0 + n.y - oy; const me = this.els.get(m.id); if (me) { me.style.left = m.x + 'px'; me.style.top = m.y + 'px'; } }); this.drawEdges(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); this.c.modified = isoLocal(new Date()); CANVAS.save(this.c); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    el.addEventListener('dblclick', e => { const R = CANVAS.resolve(n); R && R.open && R.open(e); });
  },
  select(id) { this.sel = id; this.els.forEach((el, k) => el.classList.toggle('sel', k === id)); this.P.el.parentElement.focus({ preventScroll: true }); },
  center(n) { return { x: n.x + (n.w || CANVAS.W) / 2, y: n.y + (n.h || 140) / 2 }; },
  drawEdges(temp) {
    const c = this.c, byId = new Map(c.nodes.map(n => [n.id, n])); let html = '<defs><marker id="cva" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--mag)"/></marker></defs>';
    for (const e of CANVAS.edges(c)) { const a = byId.get(e.from), b = byId.get(e.to); if (!a || !b) continue; const A = this.center(a), B = this.center(b), mx = (A.x + B.x) / 2;
      html += `<path class="cv-e${e.local ? ' local' : ''}" d="M${A.x},${A.y} C${mx},${A.y} ${mx},${B.y} ${B.x},${B.y}" ${e.directed ? 'marker-end="url(#cva)"' : ''}/><text class="cv-el" x="${mx}" y="${(A.y + B.y) / 2 - 4}">${esc(e.label || '')}</text>`; }
    if (temp) html += `<path class="cv-e tmp" d="${temp}"/>`;
    this.svg.innerHTML = html;
  },
  /** Drag from a card's port to another card: two components → a real wire (pick the relation); anything else → a line on this canvas only. */
  edgeDrag(n, e) {
    e.preventDefault(); const P = this.P, A = this.center(n);
    const mv = ev => { const p = P.toWorld(ev.clientX, ev.clientY); this.drawEdges(`M${A.x},${A.y} L${p.x},${p.y}`); };
    const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); this.drawEdges();
      const t = document.elementFromPoint(ev.clientX, ev.clientY), tel = t && t.closest('.cv-node'); if (!tel || tel.dataset.id === n.id) return;
      const m = this.c.nodes.find(x => x.id === tel.dataset.id); if (!m) return;
      if (n.ref.type === 'block' && m.ref.type === 'block') {
        popover(ev.clientX, ev.clientY + 8, [h('h5', 'Connect — a real connection'), h('div.opts', RELATIONS.map(r => h('div.opt', { on: { click: () => { closePop(); const w = M.wire(n.ref.id, m.ref.id, r.id, r.dir); this.c.edges = [...(this.c.edges || []), { id: uid('e'), from: n.id, to: m.id, wireId: w && w.id, label: r.label }]; CANVAS.save(this.c); this.drawEdges(); toast('Connected — it shows in both notes'); } } }, h('b', r.label), h('span.s', r.verb))))]);
      } else { this.c.edges = [...(this.c.edges || []), { id: uid('e'), from: n.id, to: m.id, label: 'related' }]; CANVAS.save(this.c); this.drawEdges(); toast('Line drawn on this canvas (only components get real connections)'); }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  },
  place(refs) {
    const P = this.P, r = P.rect(), c0 = P.toWorld(r.left + r.width / 2, r.top + r.height / 2), cols = Math.ceil(Math.sqrt(refs.length));
    refs.forEach((ref, i) => { if (this.c.nodes.some(n => n.ref.type === ref.type && n.ref.id === ref.id)) return; this.c.nodes.push({ id: uid('n'), ref, x: Math.round((c0.x - cols * 150 + (i % cols) * 290) / 14) * 14, y: Math.round((c0.y - 80 + Math.floor(i / cols) * 180) / 14) * 14, w: CANVAS.W }); });
    this.c.modified = isoLocal(new Date()); DB.put('canvases', this.c); this.draw(true);
  },
  addMenu(e) {
    const r = e.currentTarget.getBoundingClientRect(), pool = () => [
      ...DB.where('blocks', b => b.status === 'live' && b.kind === 'component' && b.body.text.trim()).map(b => ({ ref: { type: 'block', id: b.id }, g: 'Components', label: M.blockName(b), sub: snippet(b.body.text, 60) + ' · ' + ((M.doc(b.docId) || {}).title || ''), t: b.modified || b.created })),
      ...DB.where('items', i => !i.correctedBy).map(i => ({ ref: { type: 'item', id: i.id }, g: 'Structures', label: KIND[i.kind].label + ': ' + snippet(i.text, 50), sub: (M.doc(i.originDocId) || {}).title || '', t: i.created })),
      ...DB.all('library').map(l => ({ ref: { type: 'library', id: l.id }, g: 'Library', label: l.title || l.url, sub: LIB.shortRef ? LIB.shortRef(l) : '', t: l.added || '' })),
      ...DB.all('datasets').map(x => ({ ref: { type: 'dataset', id: x.id }, g: 'Datasets', label: x.name, sub: x.root + '/' + x.path, t: x.acquired })),
      ...DB.where('documents', d => !d.archived).map(d => ({ ref: { type: 'doc', id: d.id }, g: 'All components of a note', label: d.title, sub: plural(M.liveBlocks(d.id).filter(b => b.kind === 'component').length, 'component'), t: d.modified }))];
    popover(r.left, r.top - 8, [h('h5', 'Add to the canvas'), optionPicker({ placeholder: 'Search components, structures, papers, datasets, notes…', sort: 'cv-add', items: q => pool().filter(x => !this.c.nodes.some(n => n.ref.type === x.ref.type && n.ref.id === x.ref.id) && (!q || (x.label + ' ' + x.sub).toLowerCase().includes(q))).map(x => Object.assign(x, { created: x.t })),
      section: x => x.g, render: x => h('div', h('b', snippet(x.label, 70)), h('span.s', x.sub)), onPick: x => { closePop(); if (x.ref.type === 'doc') this.place(M.liveBlocks(x.ref.id).filter(b => b.kind === 'component' && b.status === 'live').map(b => ({ type: 'block', id: b.id }))); else this.place([x.ref]); } })]);
    const pop = $('.pop'); if (pop) { const pr = pop.getBoundingClientRect(); pop.style.top = Math.max(8, r.top - pr.height - 10) + 'px'; }
  },
  addGroup() { const P = this.P, r = P.rect(), c0 = P.toWorld(r.left + r.width / 2, r.top + r.height / 2); this.c.nodes.unshift({ id: uid('n'), ref: { type: 'group' }, label: 'Group', x: Math.round((c0.x - 260) / 14) * 14, y: Math.round((c0.y - 160) / 14) * 14, w: 520, h: 320 }); DB.put('canvases', this.c); this.draw(true); },
  removeNode(id) { this.c.nodes = this.c.nodes.filter(n => n.id !== id); this.c.edges = (this.c.edges || []).filter(e => e.from !== id && e.to !== id); this.sel = null; DB.put('canvases', this.c); this.draw(true); toast('Removed from the canvas — the card itself is untouched, and drawn connections stay'); },
  fit(anim = true) { const ns = this.c.nodes; if (!ns.length) return; this.P.fit({ x0: Math.min(...ns.map(n => n.x)), y0: Math.min(...ns.map(n => n.y)), x1: Math.max(...ns.map(n => n.x + (n.w || CANVAS.W))), y1: Math.max(...ns.map(n => n.y + (n.h || 140))) }, anim); },
  /** JSON Canvas 1.0: nodes {id,type,x,y,width,height,text|file|url|label}, edges {id,fromNode,toNode,label}. */
  exportJC() {
    const c = this.c, nodes = c.nodes.map(n => { const R = CANVAS.resolve(n) || { title: 'missing' }, base = { id: n.id, x: Math.round(n.x), y: Math.round(n.y), width: Math.round(n.w || CANVAS.W), height: Math.round(n.h || 140) };
      if (n.ref.type === 'group') return Object.assign(base, { type: 'group', label: n.label || 'Group' });
      if (n.ref.type === 'library') { const l = M.lib(n.ref.id) || {}; return Object.assign(base, { type: 'link', url: l.url || (l.doi ? 'https://doi.org/' + l.doi : '') }); }
      if (n.ref.type === 'dataset') { const x = DB.get('datasets', n.ref.id) || {}; return Object.assign(base, { type: 'file', file: (x.root ? x.root + '/' : '') + (x.path || '') }); }
      return Object.assign(base, { type: 'text', text: `**${R.title}**\n\n${R.text || ''}${R.sub ? '\n\n— ' + R.sub : ''}`, color: R.kind ? (settings().kinds[R.kind] || KIND[R.kind]).color : undefined }); });
    const edges = CANVAS.edges(c).map(e => ({ id: e.id.replace(':', '-'), fromNode: e.from, toNode: e.to, toEnd: e.directed ? 'arrow' : 'none', label: e.label || undefined }));
    Exporter.download(Exporter.slug(c.name) + '.canvas', JSON.stringify({ nodes, edges }, null, 1), 'application/json'); toast('Exported as JSON Canvas');
  },
};
VIEWS.canvas = CanvasView;
INSERTS.push({ id: 'canvas-add', group: 'Lab', icon: '◰', label: 'Send this note’s components to a canvas…', sub: 'Spatial canvas (lab)', when: () => CANVAS.on(), run: d => { const list = DB.all('canvases'); pickModal('Send to which canvas?', 'References are added; nothing moves.', [...list.map(c => ({ label: c.name, run: () => { const ids = M.liveBlocks(d.id).filter(b => b.kind === 'component' && b.status === 'live').map(b => ({ type: 'block', id: b.id })); const n = c.nodes.length; ids.forEach((ref, i) => { if (!c.nodes.some(x => x.ref.id === ref.id)) c.nodes.push({ id: uid('n'), ref, x: (n + i) % 6 * 290, y: Math.floor((n + i) / 6) * 180, w: CANVAS.W }); }); DB.put('canvases', c); App.go('#/canvas/' + c.id); } })), { label: '+ New canvas', run: () => { const c = { id: uid('cv'), name: d.title + ' canvas', nodes: [], edges: [], created: isoLocal(new Date()), modified: isoLocal(new Date()) }; M.liveBlocks(d.id).filter(b => b.kind === 'component' && b.status === 'live').forEach((b, i) => c.nodes.push({ id: uid('n'), ref: { type: 'block', id: b.id }, x: i % 6 * 290, y: Math.floor(i / 6) * 180, w: CANVAS.W })); DB.put('canvases', c); App.go('#/canvas/' + c.id); } }]); } });
