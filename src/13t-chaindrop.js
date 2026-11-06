/* ==========================================================================
   13t · Quick chaining. Drag a box's ● onto empty paper and two panels open
   at once: on the left, how it connects (1–9, or click); on the right, what
   to create there (type to filter, ↑↓, Enter). Picking what to create makes
   it at the drop point, wired with the chosen connection, ready to type.
   ========================================================================== */
const CHAINDROP = {
  open(pane, fromId, ev) {
    CHAINDROP.close(); closePop();
    const d = M.doc(pane.docId), at = pane.paper.toWorld(ev.clientX, ev.clientY), from = M.block(fromId);
    // V3.955 — from a kinded component the connections are the kind's own ways (13zzi), each with its direction and what the new one becomes
    const K = typeof CKINDS !== 'undefined' && from ? CKINDS.of(from) : null, KL = K ? CKINDS.chainLinks(K, from) : null, RELS = KL || RELATIONS;
    let rel = KL ? KL[0].id : _ls.get('chainRel', 'leads'), rev = KL ? KL[0].rev : false, sel = 0;
    const pickRel = r => { rel = r.id; if (KL) rev = r.rev; else _ls.set('chainRel', rel); };
    const items = () => [{ id: '_text', icon: '¶', label: 'Text component', sub: 'Write it straight away' },
      ...INSERTS.filter(x => !x.when || x.when(d)).filter(x => !['canvas-add'].includes(x.id)).map(x => ({ id: x.id, icon: x.icon, label: typeof x.label === 'function' ? x.label(d) : x.label, sub: x.sub, ins: x })),
      { id: '_other', icon: '⇲', label: 'A component in another note…', sub: 'Connect instead of creating' }];
    const relList = h('div.cd-rels'), q = h('input.inp.cd-q', { placeholder: 'What are you adding? (type to filter)' }), list = h('div.cd-items');
    const own = h('input.inp.cd-own', { placeholder: 'Your own connection…', maxlength: 40, value: rel.startsWith('c:') ? REL[rel].label : '', on: { mousedown: e => e.stopPropagation(), input: () => { const v = customRel(own.value); rel = v || _ls.get('chainRel', 'leads'); drawRels(true); }, keydown: e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); q.focus(); } if (e.key === 'Escape') CHAINDROP.close(); } } });
    const ownW = h('div.cd-ownw', own);
    const drawRels = keep => (ownW.classList.toggle('on', !KL && rel.startsWith('c:')), relList.replaceChildren(...RELS.map((r, i) => h('button.cd-rel' + (r.id === rel && (!KL || r.rev === rev) ? '.on' : ''), { on: { mousedown: e => e.preventDefault(), click: () => { pickRel(r); own.value = ''; drawRels(); q.focus(); } } },
      h('kbd', i + 1), h('span', h('b', (KL ? (r.rev ? '← ' : '→ ') : '') + ((KL ? r.rev : rev) ? r.inv : r.label)), h('span.s', KL ? (r.rev ? `${r.what} ${r.verb} “${snippet(M.blockName(from), 22)}”` : `“${snippet(M.blockName(from), 22)}” ${r.verb} ${r.what}`) : `“${snippet(from ? M.blockName(from) : M.endName(fromId), 22)}” ${rev ? 'is ' + r.inv + ' the new one' : r.verb + ' the new one'}`)))),
      KL ? h('div.tiny.muted', { style: { padding: '4px 6px 0' } }, K.label + ' links only these ways') : h('button.cd-rev', { on: { mousedown: e => e.preventDefault(), click: () => { rev = !rev; drawRels(); q.focus(); } } }, '⇄ ' + (rev ? 'New one → this' : 'This → new one'))));
    let shown = [];
    const drawItems = () => { const s = q.value.trim().toLowerCase(); shown = items().filter(x => !s || (x.label + ' ' + (x.sub || '') + ' ' + (x.ins ? x.ins.group : '')).toLowerCase().includes(s)); sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.replaceChildren(...shown.map((x, i) => h('div.cd-it' + (i === sel ? '.on' : ''), { on: { mousedown: e => e.preventDefault(), click: () => pick(x), mousemove: () => { if (sel !== i) { sel = i; drawItems(); } } } }, h('span.cd-ic', x.icon || '·'), h('span', h('b', x.label), x.sub ? h('span.s', x.sub) : null)))); };
    const wire = nb => { const R = REL[rel] || REL.leads; rev ? M.wire(nb.id, fromId, R.id, R.dir) : M.wire(fromId, nb.id, R.id, R.dir); };
    const said = () => { const R = REL[rel] || REL.leads; return R.arrow ? R.name : rev ? R.inv : R.label; };
    const pick = x => {
      CHAINDROP.close();
      if (x.id === '_other') return pane.crossWire(fromId);
      if (x.id === '_text') { const nb = pane.newAt(at.x, at.y - 20, true); const cur = KL && KL.find(r => r.id === rel && r.rev === rev); if (cur && cur.ckind) { nb.ckind = cur.ckind; DB.put('blocks', nb); } wire(nb); pane.pendingFocus = { focus: nb.id, pos: 0 }; changed(); toast('Connected · ' + said()); return; }
      // anything from + Insert: wire the first new box that appears in this note
      const before = new Set(DB.where('blocks', b => b.docId === d.id).map(b => b.id)), t0 = Date.now();
      x.ins.run(d, { x: Math.round(at.x / 14) * 14, y: Math.round((at.y - 20) / 14) * 14 }, pane);
      const poll = setInterval(() => { const nb = DB.where('blocks', b => b.docId === d.id && !before.has(b.id) && b.status !== 'removed')[0];
        if (nb) { clearInterval(poll); wire(nb); changed(); toast('Connected · ' + said()); } else if (Date.now() - t0 > 180000) clearInterval(poll); }, 250);
    };
    q.addEventListener('input', () => { sel = 0; drawItems(); });
    q.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); CHAINDROP.close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); drawItems(); list.children[sel] && list.children[sel].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); drawItems(); list.children[sel] && list.children[sel].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); shown[sel] && pick(shown[sel]); }
      else if (/^[1-9]$/.test(e.key) && !q.value && RELS[+e.key - 1]) { e.preventDefault(); pickRel(RELS[+e.key - 1]); drawRels(); }
      else if (e.key === 'Tab' && !KL) { e.preventDefault(); rev = !rev; drawRels(); }
    });
    const L = h('div.cd-panel.cd-left', h('div.cd-h', 'Connection', h('span.tiny.muted', '1–' + Math.min(9, RELS.length) + (KL ? '' : ' · Tab flips'))), relList, KL ? null : ownW);
    const Rp = h('div.cd-panel.cd-right', h('div.cd-h', 'New here', h('span.tiny.muted', '↑↓ Enter')), q, list);
    const host = h('div.chaindrop', L, Rp); document.body.append(host); drawRels(); drawItems();
    // place the two panels either side of the drop point, kept on screen
    const lw = L.offsetWidth, rw = Rp.offsetWidth, hh = Math.max(L.offsetHeight, Rp.offsetHeight), x = clamp(ev.clientX, lw + 16, innerWidth - rw - 16), y = clamp(ev.clientY - 40, 8, innerHeight - hh - 8);
    L.style.left = (x - lw - 8) + 'px'; L.style.top = y + 'px'; Rp.style.left = (x + 8) + 'px'; Rp.style.top = y + 'px';
    host.append(h('div.cd-dot', { style: { left: ev.clientX - 5 + 'px', top: ev.clientY - 5 + 'px' } }));
    setTimeout(() => q.focus(), 0);
    CHAINDROP._off = e => { if (!host.contains(e.target)) CHAINDROP.close(); }; setTimeout(() => document.addEventListener('mousedown', CHAINDROP._off, true), 0);
  },
  close() { $$('.chaindrop').forEach(x => x.remove()); if (CHAINDROP._off) document.removeEventListener('mousedown', CHAINDROP._off, true); CHAINDROP._off = null; },
};
