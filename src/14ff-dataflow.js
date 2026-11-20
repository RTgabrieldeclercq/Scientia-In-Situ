/* ==========================================================================
   14ff · The Data compendium, reworked (V4.87 — Gabe, 20 Nov: "Data tab
   rework for input of instruments related to data and way to visualize
   material to instrument/data. Make sure that the data present in experiment
   note canvases is automatically added and tied to the note component, and
   can be added from the data tree compendium/gallery.")
   - Instruments: a data tree (13zzyc) says which instrument made it — an
     instrument is a material of kind "instrument" (13j). Its bar under the
     tree's head: the instrument's chip (a click opens its page), Change,
     or "+ Instrument" — your instruments, a search, a new one by name; and
     a guess from the files' types (an .nd2 → Nikon (ND2), DATA.INSTR) that
     one click accepts. Kept on the tree: b.dtree.inst = [resource ids];
     an instrument bound to the component (⋯ → Data, materials & code) counts.
   - Data in experiment notes joins by itself: an image panel's images, a
     table (and the file it came from), the datasets bound to a component —
     each listed in the Data compendium under its note, tied to its
     component (Open goes to it), marked "from the canvas". Nothing is
     copied: the entries are read from the components each time.
   - Add to a note… on a note's or component's row: the move panel (13zzzd)
     picks a note, and the data component goes there as a live reference
     (M.pullInto) — the original stays where it is.
   - Material → instrument → data, the Data compendium's third view: three
     columns — the materials listed on the notes (or bound to the
     components) that have data, the instruments, the data — joined by
     curves; resting on one lights its paths; a click opens it.
   Settings → Tabs & overview → Data flow (dataflow, 20a).
   DFLOW: instOf(b) · matsOf(b) · auto(b) · guess(b) · setInst(b, ids) · bar(b) · add(blk) · flow()
   ========================================================================== */
const DFLOW = {
  IC: {
    inst: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v4l-1 2h6l-1-2V3"/><path d="M8 9h8l1 5H7z"/><path d="M12 14v4M7 21h10M9 18h6"/></svg>',
    mat: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3"/></svg>',
  },
  on: () => typeof FEAT === 'undefined' || FEAT.on('dataflow'),
  tn(k, d) { try { const v = FEAT.tune('dataflow', k); return v == null ? d : v; } catch (e) { return d; } },
  isInst: r => !!r && r.type === 'resource' && !r.deleted && String((r.header || {}).kind || '').toLowerCase() === 'instrument',
  insts: () => MATS.all().filter(DFLOW.isInst).sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
  instOf(b) { const ids = new Set([...((b.dtree && b.dtree.inst) || []), ...(((b.binds || {}).resources) || []).filter(id => DFLOW.isInst(M.doc(id)))]); return [...ids].map(M.doc).filter(DFLOW.isInst); },
  matsOf(b) { const d = M.doc(b.docId), ids = new Set([...(((b.binds || {}).resources) || []), ...((d && d.materials) || [])]); return [...ids].map(M.doc).filter(r => r && r.type === 'resource' && !r.deleted && !r.archived && !DFLOW.isInst(r)); },
  isExp(b) { const d = ADATA.liveDoc(b.docId); return !!d && NOTEKIND.of(d) === 'exp'; },
  /** What an experiment's component holds without a logged tree: an image panel's images, a table, its bound datasets — entries the data tree draws. */
  auto(b) {
    if (!b || !DFLOW.on() || DFLOW.tn('auto', true) === false || !DFLOW.isExp(b)) return [];
    const out = [], ms = id => { const m = id && typeof MEDIA !== 'undefined' ? MEDIA.get(id) : null; return m || null; }, tm = m => m && (m.created || m.modified) ? +new Date(m.created || m.modified) : undefined;
    if (b.kind === 'figure' && b.fig) { const cells = FIG.cells(b).map((c, i) => ({ c, i, m: ms(c.media) })).filter(x => x.m);
      if (cells.length) out.push({ id: 'fig:' + b.id, n: (b.label || 'Image panel').trim() || 'Image panel', dir: 1, auto: 1, k: cells.map(x => ({ id: 'fc:' + x.c.id, n: (FIG.letter ? FIG.letter(x.i) + ' · ' : '') + (x.m.name || 'image'), s: x.m.size || undefined, m: tm(x.m) })) }); }
    if (b.kind === 'table' && b.table) { const m = ms(b.media), sh = (b.table.sheets || [])[0], cells = sh && sh.cells ? sh.cells : [];
      out.push({ id: 'tbl:' + b.id, n: m && m.name ? m.name : (b.label || 'Table') + ' (a table, ' + cells.length + ' × ' + ((cells[0] || []).length) + ')', s: m && m.size || undefined, m: tm(m), auto: 1 }); }
    (((b.binds || {}).datasets) || []).forEach(id => { const ds = DB.get('datasets', id); if (ds) out.push({ id: 'ds:' + id, n: ds.name || 'Dataset', s: ds.size || undefined, m: ds.mtimeMs || undefined, auto: 1 }); });
    return out;
  },
  autoComps() { if (!DFLOW.on() || DFLOW.tn('auto', true) === false) return [];
    return DB.where('blocks', b => b.status === 'live' && !(b.dtree && (b.dtree.items || []).length) && (b.kind === 'figure' || b.kind === 'table' || (((b.binds || {}).datasets) || []).length > 0) && !!ADATA.liveDoc(b.docId) && DFLOW.auto(b).length > 0); },
  /** The file types that name an instrument (V4.88: not .csv, .tif, .h5… — formats any instrument writes). */
  MAKERS: ['nd2', 'czi', 'lif', 'lsm', 'oib', 'oir', 'vsi', 'ims', 'fcs'],
  /** The instrument the files' types point to (DATA.INSTR: .nd2 → Nikon (ND2)…), or ''. */
  guess(b) {
    if (DFLOW.tn('guess', true) === false || typeof DATA === 'undefined') return ''; const n = {};
    const walk = L => (L || []).forEach(e => { if (e.dir) return walk(e.k); const x = String(e.n || '').split('.').pop().toLowerCase(); if (DATA.INSTR[x] && DFLOW.MAKERS.includes(x)) n[x] = (n[x] || 0) + 1; });
    walk(DTREE.items(b)); const top = Object.entries(n).sort((a, z) => z[1] - a[1])[0]; return top ? DATA.INSTR[top[0]] : '';
  },
  setInst(b, ids) { const cur = M.block(b.id); if (!cur) return; DB.beginGroup('Instrument'); cur.dtree = Object.assign({ items: [] }, cur.dtree, { inst: [...new Set(ids)] }); cur.modified = isoLocal(new Date()); DB.put('blocks', cur); changed(); },
  newInst(name, b) {
    const d = M.doc(b.docId), was = DFLOW.insts().find(r => String(r.title || '').toLowerCase() === name.toLowerCase()); if (was) return was;
    return M.createDoc({ type: 'resource', projectId: d ? d.projectId : null, title: name, templateId: (M.enabledTemplates('resource')[0] || {}).id, header: { kind: 'instrument' } });
  },
  /** The instrument picker: your instruments, a search, a new one by name. */
  pick(b, x, y) {
    const cur = new Set(DFLOW.instOf(b).map(r => r.id)), q = h('input.inp.df-q', { placeholder: 'Find or name an instrument', 'aria-label': 'Instrument' }), list = h('div.df-pl');
    const choose = r => { closePop(); DFLOW.setInst(b, [...(b.dtree && b.dtree.inst || []).filter(id => id !== r.id), r.id]); toast('Instrument: ' + r.title); };
    const fill = () => { const s = q.value.trim(), L = DFLOW.insts().filter(r => !s || String(r.title || '').toLowerCase().includes(s.toLowerCase()));
      list.replaceChildren(...L.map(r => h('button.df-pi' + (cur.has(r.id) ? '.on' : ''), { type: 'button', on: { click: () => choose(r) } }, h('span', { html: DFLOW.IC.inst }), h('b', r.title || 'Instrument'), h('span.df-ps', MATS.sub(r)))),
        s && !L.some(r => String(r.title || '').toLowerCase() === s.toLowerCase()) ? h('button.df-pi.new', { type: 'button', on: { click: () => { DB.beginGroup('New instrument'); choose(DFLOW.newInst(s, b)); } } }, '＋ New instrument “' + s + '”') : null,
        !L.length && !s ? h('p.df-none', 'No instrument yet — type its name to make one (a material of kind “instrument”).') : null); };
    q.addEventListener('input', fill); q.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { const f = $('.df-pi', list); if (f) { e.preventDefault(); f.click(); } } });
    popover(x, y, [h('h5', 'Which instrument made this data?'), q, list]); fill(); setTimeout(() => q.focus(), 20);
  },
  /** The bar under a data tree's head. */
  bar(b) {
    const I = DFLOW.instOf(b), g = !I.length ? DFLOW.guess(b) : '';
    const chip = r => h('span.df-ic', h('button.df-in', { type: 'button', title: 'Open ' + r.title, on: { click: e => { e.stopPropagation(); App.go('#/mat/' + r.id); } } }, h('span', { html: DFLOW.IC.inst }), r.title),
      (b.dtree && (b.dtree.inst || []).includes(r.id)) ? h('button.df-ix', { type: 'button', 'aria-label': 'Take ' + r.title + ' off', title: 'Not this instrument', on: { click: e => { e.stopPropagation(); DFLOW.setInst(b, (b.dtree.inst || []).filter(id => id !== r.id)); } } }, '×') : null);
    return h('div.df-bar', { on: { pointerdown: e => e.stopPropagation() } }, h('span.df-k', 'Instrument'), I.map(chip),
      g ? h('button.df-guess', { type: 'button', title: 'From the files’ types — click to use it', on: { click: e => { e.stopPropagation(); DB.beginGroup('Instrument'); const r = DFLOW.newInst(g, b); DFLOW.setInst(b, [r.id]); toast('Instrument: ' + r.title); } } }, 'Looks like ' + g + ' — use it') : null,
      h('button.df-add', { type: 'button', on: { click: e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); DFLOW.pick(b, r.left, r.bottom + 4); } } }, I.length ? 'Change…' : '＋ Instrument'));
  },
  /** Add to a note…: the data component goes there as a live reference. */
  async add(blk) {
    const b = M.block(blk); if (!b) return; const nm = snippet(M.blockName(b), 40);
    const d = typeof MPANEL !== 'undefined' ? await MPANEL.note({ title: 'Add “' + nm + '” to a note', intro: 'A live reference of the data component: the original stays where it is.', exclude: [b.docId], verb: 'Add here' }) : null; if (!d) return;
    DB.beginGroup('Add data to a note'); const sp = typeof MOVE !== 'undefined' && MOVE.spot ? MOVE.spot(d) : { x: 0, y: 200 }; M.pullInto(d.id, null, { blockId: b.id, x: sp.x, y: sp.y }); changed();
    toast('“' + nm + '” is in “' + d.title + '” — live, it follows the original · Ctrl+Z takes it back', 3200);
  },
  /** Material → instrument → data: three columns joined by curves. */
  graph() {
    const comps = ADATA.comps(), M_ = new Map(), I_ = new Map(), D_ = [], E = [];
    comps.forEach(b => { const d = ADATA.liveDoc(b.docId); if (!d) return; const c = DTREE.count(ADATA.items(b)), I = DFLOW.instOf(b), Ms = DFLOW.matsOf(b), did = 'd:' + b.id;
      D_.push({ id: did, b, d, label: (d.title || 'Untitled') + ((b.label || '').trim() ? ' › ' + b.label.trim() : ''), sub: DTREE.say(c), auto: !(b.dtree && (b.dtree.items || []).length) });
      I.forEach(r => { I_.set('i:' + r.id, r); E.push(['i:' + r.id, did]); });
      Ms.forEach(r => { M_.set('m:' + r.id, r); if (I.length) I.forEach(x => E.push(['m:' + r.id, 'i:' + x.id])); else E.push(['m:' + r.id, did]); }); });
    const uniq = new Map(); E.forEach(([a, z]) => uniq.set(a + '>' + z, [a, z]));
    return { mats: [...M_.entries()], insts: [...I_.entries()], data: D_, edges: [...uniq.values()] };
  },
  flow() {
    const G = DFLOW.graph();
    if (!G.data.length) return h('div.ad-empty', 'No data yet. Log data on a component (⋯ → Log data…), or add an image panel or a table to an experiment: it joins here.');
    const node = (id, cls, icon, label, sub, go) => h('button.df-n.' + cls, { type: 'button', 'data-n': id, title: sub ? label + ' — ' + sub : label, on: { click: go } }, icon ? h('span.df-ni', { html: icon }) : null, h('b', label), sub ? h('span', sub) : null);
    const col = (title, kids, empty) => h('div.df-col', h('div.df-ch', title), kids.length ? kids : h('p.df-none', empty));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('df-svg'); svg.setAttribute('aria-hidden', 'true');
    const wrap = h('div.df-flow', svg,
      col('Materials', G.mats.map(([id, r]) => node(id, 'mat', DFLOW.IC.mat, r.title || 'Material', MATS.sub(r), () => App.go('#/mat/' + r.id))), 'No materials listed on these notes — a note’s Materials (or a component’s ⋯ → Data, materials & code) joins them here.'),
      col('Instruments', G.insts.map(([id, r]) => node(id, 'inst', DFLOW.IC.inst, r.title || 'Instrument', MATS.sub(r), () => App.go('#/mat/' + r.id))), 'No instrument yet — a data tree’s “＋ Instrument” says which made it.'),
      col('Data', G.data.map(x => node(x.id, 'data' + (x.auto ? '.auto' : ''), DTREE.svg('tree', 13), x.label, x.sub + (x.auto ? ' · from the canvas' : ''), e => App.openComponent(x.b.id, e))), ''));
    const draw = () => { if (!wrap.isConnected) return; const R = wrap.getBoundingClientRect(); svg.setAttribute('width', R.width); svg.setAttribute('height', wrap.scrollHeight); svg.replaceChildren();
      G.edges.forEach(([a, z]) => { const A = $(`.df-n[data-n="${a}"]`, wrap), Z = $(`.df-n[data-n="${z}"]`, wrap); if (!A || !Z) return; const ra = A.getBoundingClientRect(), rz = Z.getBoundingClientRect();
        const x1 = ra.right - R.left, y1 = ra.top + ra.height / 2 - R.top, x2 = rz.left - R.left, y2 = rz.top + rz.height / 2 - R.top, mx = (x1 + x2) / 2;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`); p.dataset.a = a; p.dataset.z = z; p.classList.add('df-e'); svg.append(p); }); };
    // resting on a node lights its paths (and the nodes at their other ends), upstream and downstream
    const light = id => { const on = new Set([id]), P = [...svg.querySelectorAll('path')]; let grew = true;
      const down = new Set([id]), up = new Set([id]); while (grew) { grew = false; P.forEach(p => { if (down.has(p.dataset.a) && !down.has(p.dataset.z)) { down.add(p.dataset.z); grew = true; } if (up.has(p.dataset.z) && !up.has(p.dataset.a)) { up.add(p.dataset.a); grew = true; } }); }
      [...down, ...up].forEach(x => on.add(x)); wrap.classList.toggle('lit', !!id);
      $$('.df-n', wrap).forEach(n => n.classList.toggle('on', on.has(n.dataset.n))); P.forEach(p => p.classList.toggle('on', on.has(p.dataset.a) && on.has(p.dataset.z))); };
    wrap.addEventListener('pointerover', e => { const n = e.target.closest('.df-n'); if (n) light(n.dataset.n); });
    wrap.addEventListener('pointerleave', () => { wrap.classList.remove('lit'); $$('.on', wrap).forEach(x => x.classList.remove('on')); });
    requestAnimationFrame(() => requestAnimationFrame(draw)); wrap._draw = draw; return wrap;
  },
  preview() {
    const ins = DFLOW.tn('auto', true) !== false, gs = DFLOW.tn('guess', true) !== false;
    return [h('div.pv-df', h('div.pv-dfc', h('i', 'PAA gel 8 kPa'), h('i', 'MDCK p12')), h('div.pv-dfl', { html: '<svg viewBox="0 0 40 60" width="40" height="60" aria-hidden="true"><path d="M0,12 C20,12 20,30 40,30"/><path d="M0,44 C20,44 20,30 40,30"/></svg>' }),
        h('div.pv-dfc', h('i.inst', 'Nikon Ti2')), h('div.pv-dfl', { html: '<svg viewBox="0 0 40 60" width="40" height="60" aria-hidden="true"><path d="M0,30 C20,30 20,12 40,12"/><path d="M0,30 C20,30 20,48 40,48"/></svg>' }),
        h('div.pv-dfc', h('i.data', 'Run 3 › raw'), ins ? h('i.data.auto', 'Run 3 › Figure 1') : h('i.data', 'Run 4 › fields'))),
      PV.cap('The Data compendium’s third view: materials → instruments → data. A data tree says which instrument made it' + (gs ? ' (guessed from the files’ types, one click to accept)' : '') + '. ' + (ins ? 'An experiment’s image panels, tables and bound datasets join by themselves, tied to their component.' : 'Only logged data trees are listed.') + ' Add to a note… places a data component in another note.')];
  },
};
{
  // the data tree on a component: its instrument bar
  const el0 = DTREE.el; DTREE.el = function (b, o) { const r = el0.apply(this, arguments); try { if (DFLOW.on() && b && b.id !== '_adata' && !(o && (o.ro || o.pv)) && DTREE.items(b).length) { const hd = r.querySelector('.dt-h'); const bar = DFLOW.bar(b); hd ? hd.after(bar) : r.prepend(bar); } } catch (e) { console.warn('[dataflow] bar', e); } return r; };
  // the master tree takes the experiments' data, and its rows the instrument, "from the canvas" and Add to a note…
  const c0 = ADATA.comps; ADATA.comps = function () { const L = c0.apply(this, arguments); try { const have = new Set(L.map(b => b.id)); return L.concat(DFLOW.autoComps().filter(b => !have.has(b.id))); } catch (e) { return L; } };
  ADATA.items = b => { const L = DTREE.items(b); return L.length ? L : DFLOW.auto(b); };
  const d0 = ADATA.dress; ADATA.dress = function (root) { d0.apply(this, arguments); try { if (!DFLOW.on()) return;
    root.querySelectorAll('.dt-r[data-p]').forEach(r => { const m = ADATA.meta.get(r.dataset.p); if (!m || (m.t !== 'note' && m.t !== 'comp')) return; const b = M.block(m.blk); if (!b) return; const at = r.querySelector('.ad-open');
      if (m.t === 'note' && [...ADATA.meta.entries()].some(([k, v]) => v.t === 'comp' && k.startsWith(r.dataset.p + '/'))) return;   // several components: each has its own row
      const kids = []; if (!(b.dtree && (b.dtree.items || []).length)) kids.push(h('span.df-auto', { title: 'Read from the canvas: an image panel, a table or a bound dataset of this experiment' }, 'from the canvas'));
      DFLOW.instOf(b).forEach(x => kids.push(h('span.df-ichip', { title: 'Made with ' + x.title }, h('span', { html: DFLOW.IC.inst }), x.title)));
      kids.push(h('button.ad-add', { type: 'button', title: 'Add this data component to another note (a live reference)', on: { click: e => { e.stopPropagation(); DFLOW.add(b.id); } } }, 'Add to a note…'));
      if (at) at.after(...kids); else r.append(...kids); }); } catch (e) { console.warn('[dataflow] rows', e); } };
  // the third view
  const r0 = ADATA.render; ADATA.render = function () { const page = r0.apply(this, arguments); try { if (!DFLOW.on()) return page; const seg = $('.ad-seg', page); if (!seg) return page;
    const b = h('button' + (ADATA.st.by === 'flow' ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(ADATA.st.by === 'flow'), on: { click: () => { if (ADATA.st.by === 'flow') return; ADATA.st.by = 'flow'; $$('button', seg).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); ADATA.paint(); } } }, 'Material → instrument → data');
    seg.append(b); if (ADATA.st.by === 'flow') { $$('button', seg).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); } } catch (e) { console.warn('[dataflow] seg', e); } return page; };
  const t0 = ADATA.tree; ADATA.tree = function () { if (DFLOW.on() && ADATA.st.by === 'flow') return DFLOW.flow(); if (ADATA.st.by === 'flow') ADATA.st.by = 'project'; return t0.apply(this, arguments); };
  addEventListener('resize', debounce(() => { const f = $('.df-flow'); if (f && f._draw) f._draw(); }, 120));
}
