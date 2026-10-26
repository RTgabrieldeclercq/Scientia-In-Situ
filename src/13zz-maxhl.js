/* ==========================================================================
   13zz · Highlighting a maximised PDF or HTML page like a paper in the
   Library. Maximise (⤢ / ⛶) and the file gets a side panel: its highlights
   (= the quotes in this note), each with its page, kind and your notes —
   type a note under one (Enter), click one to go there, search them.
   • Select text: colours (a highlight in that colour), ❝ Quote, Connect to…,
     Make it… · Ctrl+Enter: what is it?
   • The pen is a highlighter: whole words from the first touched to the
     last, saved in the last colour, with a small bar (colours, Make it…,
     Note, Undo). The back of the pen erases highlights.
   A highlight is a quote component in this note, as before (13zw).
   ========================================================================== */
{
  const C = () => READER.COLORS, last = () => _ls.get('rdColor', 'yellow');
  // the selection menu: colours first
  // the selection menu: the structures straight away (a letter picks one), then a plain highlight, Quote, Connect
  QUOTE.menu = function (sel, x, y) {
    QUOTE.sel = sel; let done = false;
    const off = () => document.removeEventListener('keydown', key, true);
    const go = (fn) => { if (done) return; done = true; closePop(); off(); fn(); QUOTE.clearSel(sel); };
    const asKind = k => go(() => { const b = QUOTE.make(sel, k); b && toast(KIND[k].label + ' — quoted in this note'); });
    const key = e => { if (!$('.pop.q-menu')) return off(); if (e.ctrlKey || e.altKey || e.metaKey) return; const k = KINDS.find(z => z.key === (e.key || '').toLowerCase()); if (k) { e.preventDefault(); e.stopPropagation(); asKind(k.id); } else if (e.key === 'Escape') { closePop(); off(); } };
    const pop = popover(x, y, [h('h5', (sel.page ? 'p. ' + sel.page + ' · ' : '') + '“' + snippet(sel.exact, 46) + '” is…'),
      h('div.rd-kinds', KINDS.map(k => h('button.kpick', { style: { '--kc': `var(--k-${k.id})` }, title: 'Key: ' + k.key.toUpperCase(), on: { click: () => asKind(k.id) } }, k.label, h('kbd', k.key)))),
      h('div.tiny.muted', { style: { margin: '6px 6px 2px' } }, 'Or just highlight it:'),
      h('div.row.q-cols', { style: { gap: '6px', padding: '0 6px 6px', flexWrap: 'wrap', alignItems: 'center' } }, Object.entries(C()).map(([k, c]) => h('button.swatch', { title: 'Highlight ' + k, style: { '--c': c }, on: { click: () => go(() => { _ls.set('rdColor', k); QUOTE.make(Object.assign({}, sel, { color: k })); }) } })),
        h('span.spacer'), h('button.btn.xs', { title: 'A quote with no colour or kind', on: { click: () => go(() => { QUOTE.make(sel); toast('Quoted in this note'); }) } }, '❝ Quote'),
        h('button.btn.xs', { on: { click: () => { if (done) return; done = true; closePop(); off(); const b = QUOTE.make(sel); QUOTE.clearSel(sel); b && QUOTE.connect(b); } } }, 'Connect to…'))]);
    if (pop && pop.classList) pop.classList.add('q-menu'); else setTimeout(() => { const p = [...$$('.pop')].pop(); p && p.classList.add('q-menu'); }, 0);
    setTimeout(() => document.addEventListener('keydown', key, true), 0);
  };
  // the pen's highlight offers the same choices as a mouse selection (structures first, colours, quote, connect)
  QUOTE.penSave = function (sel, x, y, prev) { QUOTE.menu(sel, x, y); RD2.keepPrev(prev); };
  QUOTE.bar = function (b, x, y) {
    $$('.rd-penbar').forEach(n => n.remove());
    const bar = h('div.rd-penbar', { style: { left: Math.min(innerWidth - 330, x + 10) + 'px', top: Math.min(innerHeight - 60, y + 14) + 'px' } },
      Object.entries(C()).map(([k, c]) => h('button.swatch' + (k === ((M.block(b.id) || b).quote.color || 'yellow') ? '.on' : ''), { title: 'Colour: ' + k, style: { '--c': c }, on: { click: () => { const cur = M.block(b.id); cur.quote = Object.assign({}, cur.quote, { color: k }); DB.put('blocks', cur); _ls.set('rdColor', k); changed(); bar.remove(); } } })),
      h('button.btn.xs', { on: { click: () => { bar.remove(); const r = bar.getBoundingClientRect(); QUOTE.makeIt(M.block(b.id), r.left, r.bottom); } } }, 'Make it…'),
      h('button.btn.xs', { on: { click: () => { bar.remove(); askText('Note on this highlight', '“' + snippet(b.body.text, 70) + '”', '', { multiline: true }).then(t => { if (t && QUOTE.note(M.block(b.id), t)) toast('Note added'); }); } } }, 'Note'),
      h('button.btn.xs.ghost', { on: { click: () => { bar.remove(); QUOTE.erase([b.id]); } } }, 'Undo'));
    document.body.append(bar); let t = setTimeout(() => bar.classList.add('fade'), 5000), t2 = setTimeout(() => bar.remove(), 6500);
    bar.addEventListener('pointerenter', () => { clearTimeout(t); clearTimeout(t2); bar.classList.remove('fade'); });
  };
  QUOTE.makeIt = function (b, x, y) { if (!b) return; ctxMenu(x, y, [{ head: 'Make this highlight a…' }, ...KINDS.map(k => ({ label: k.label, run: () => { const it = M.createItem(k.id, b.body.text, b, { sourceRef: { type: 'embed', id: b.quote.src, page: b.quote.page || null } }); const cur = M.block(b.id); M.saveBlockBody(cur, { text: cur.body.text, marks: [...(cur.body.marks || []).filter(m => m.type !== 'struct'), { id: uid('m'), type: 'struct', from: 0, to: cur.body.text.length, ref: it.id }] }); IX.rebuild(); changed(); toast(k.label + ' — from ' + (b.quote.file || 'the file')); } }))]); };
  QUOTE.note = function (q, text) { text = (text || '').trim(); if (!text || !q) return null; const prev = DB.where('wires', w => w.to === q.id && w.rel === 'comments').length;
    const nb = M.addBlock(q.docId, q.id, { label: 'Note' + (q.quote.page ? ' · p. ' + q.quote.page : ''), x: (q.x || 0) + (q.w || 336) + 56, y: (q.y || 0) + prev * 110, w: 300 }); M.saveBlockBody(nb, { text, marks: [] }); M.wire(nb.id, q.id, 'comments', true); IX.rebuild(); changed(); return nb; };
  QUOTE.notesOf = q => DB.where('wires', w => w.to === q.id && w.rel === 'comments').map(w => M.block(w.from)).filter(x => x && x.status === 'live');
  QUOTE.erase = function (ids) { DB.beginGroup(); let n = 0; ids.forEach(id => { const b = M.block(id); if (b && b.quote) { b.status = 'removed'; b.removedAt = isoLocal(new Date()); DB.put('blocks', b); n++; } }); if (n) { changed(); toast(plural(n, 'highlight') + ' removed · Ctrl+Z brings it back'); } };

  /* ---------- the side panel of a maximised file ---------- */
  const side = (srcId, ov) => {
    const box = h('aside.mx-side'), st = ov._mx || (ov._mx = { q: '' });
    const draw = () => { const Q = QUOTE.of(srcId).sort((a, b) => (a.quote.page || 0) - (b.quote.page || 0) || ((a.quote.rects && a.quote.rects[0] && a.quote.rects[0][1]) || 0) - ((b.quote.rects && b.quote.rects[0] && b.quote.rects[0][1]) || 0) || a.created.localeCompare(b.created));
      const q = st.q.trim().toLowerCase(), shown = Q.filter(x => !q || (x.body.text + ' ' + QUOTE.notesOf(x).map(n => n.body.text).join(' ')).toLowerCase().includes(q));
      const inp = h('input.inp.mx-q', { placeholder: 'Search highlights…', value: st.q, on: { input: debounce(e => { st.q = e.target.value; draw(); setTimeout(() => { const i = $('.mx-q', box); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 200) } });
      box.replaceChildren(h('div.rd-sh', h('b', plural(Q.length, 'highlight')), h('div.tiny.muted', 'Select text (or the pen) to highlight · Ctrl+Enter to make it a claim, evidence, question… — each is a quote in this note')), h('div', { style: { padding: '8px 12px' } }, inp),
        h('div', shown.map(x => { const it = IX.itemsOf(x.id)[0];
          return h('div.rd-ann', { style: { '--hc': QUOTE.col(x) }, on: { click: () => MXHL.goto(srcId, x) } },
            h('div.row', { style: { gap: '6px' } }, it ? kchip(it.kind) : h('span.pill', 'highlight'), h('span.spacer'), x.quote.page ? h('span.mono.tiny.muted', 'p. ' + x.quote.page) : null), h('div.serif', snippet(x.body.text, 220)),
            QUOTE.notesOf(x).map(n => h('div.rd-note', h('span.mono.tiny.muted', fmtDay(n.created) + ' '), n.body.text)),
            h('textarea.inp.rd-ni', { rows: 1, placeholder: 'Add a note… (Enter)', on: { click: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (QUOTE.note(M.block(x.id), e.target.value)) toast('Note added'); } } } }),
            h('div.row', { style: { gap: '8px', marginTop: '2px' } }, h('a.tiny', { on: { click: e => { e.stopPropagation(); MXHL.close(ov); App.jump(x.id, e); } } }, 'on the note ↗'), it ? null : h('a.tiny', { on: { click: e => { e.stopPropagation(); QUOTE.makeIt(M.block(x.id), e.clientX, e.clientY + 8); } } }, 'make it…'), h('a.tiny', { on: { click: e => { e.stopPropagation(); QUOTE.erase([x.id]); } } }, 'remove'))); })),
        Q.length ? null : h('div.empty', { style: { margin: '20px 12px' } }, 'No highlights yet.')); };
    box._draw = draw; draw(); return box; };
  const MXHL = {
    open(ov, srcId) { ov.classList.add('mx-hl'); ov.dataset.src = srcId; const bar = $(':scope > .em-bar', ov), rest = [...ov.children].filter(c => c !== bar); const main = h('div.mx-main', ...rest), row = h('div.mx-row', main, side(srcId, ov)); ov.append(row); const c = $('.dk-maxc', ov); if (c) c.dataset.src = srcId; },
    close(ov) { const btn = [...$$('.em-bar button', ov)].find(b => /Close/.test(b.textContent)); btn ? btn.click() : ov.remove(); },
    goto(srcId, q) { const ov = $(`.embed-max[data-src="${srcId}"]`); if (!ov) return QUOTE.goto(q);
      const src = M.block(srcId);
      if (src.kind === 'pdf') { const sl = $(`.pdf-slot[data-p="${q.quote.page}"]`, ov), st = $('.dk-maxc', ov), stage = $('.pdf-stage', ov) || st; if (src.view === 'page' && (src.cur || 0) + 1 !== q.quote.page) { PDFW.go(M.block(srcId), q.quote.page - 1); setTimeout(() => MXHL.goto(srcId, q), 700); return; }
        if (sl && stage) { const top = sl.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop + (q.quote.rects && q.quote.rects[0] ? q.quote.rects[0][1] * sl.offsetHeight : 0) - 80; stage.scrollTo({ top, behavior: 'smooth' }); }
        setTimeout(() => $$(`.q-hl[data-q="${q.id}"]`, ov).forEach(x => { x.classList.add('flash'); setTimeout(() => x.classList.remove('flash'), 2000); }), 450); }
      else $$('iframe', ov).forEach(fr => fr.contentWindow && fr.contentWindow.postMessage({ sis: 'goto', id: q.id }, '*'));
    },
  };
  window.MXHL = MXHL;
  const dm = DOCS.max; DOCS.max = function (b) { const r = dm.call(DOCS, b); if (b.kind === 'pdf') { const ov = [...$$('.embed-max.dk-max')].pop(); ov && MXHL.open(ov, b.id); setTimeout(() => QUOTE.paintMarks(b.id), 600); } return r; };
  const em = EMBED.max; EMBED.max = function (b) { const r = em.call(EMBED, b); const ov = [...$$('.embed-max')].pop(); ov && MXHL.open(ov, b.id); return r; };
  // keep the side panels current
  { const ch = changed; let t = null; changed = function (...a) { const r = ch.apply(this, a); clearTimeout(t); t = setTimeout(() => $$('.embed-max.mx-hl .mx-side').forEach(s => s._draw && s._draw()), 250); return r; }; }

  /* ---------- the pen on a PDF's pages (maximised, and in the widget) ---------- */
  const px = slot => { const tl = $(':scope > .textLayer', slot); if (!tl) return null; if (!slot._px || slot._px._tl !== tl) slot._px = { _tl: tl, getBoundingClientRect: () => tl.getBoundingClientRect() }; return slot._px; };
  const srcOf = slot => { const b = slot.closest('.box'); if (b) return b.dataset.id; const c = slot.closest('[data-src]'); return c && c.dataset.src; };
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'pen') return; const slot = e.target.closest && e.target.closest('.q-slot'); if (!slot || !slot.closest('.embed-max')) return; const P = px(slot), src = srcOf(slot); if (!P || !src) return;
    e.preventDefault(); e.stopPropagation();
    if (RD2.isEraser(e)) { const gone = new Set(); const at = ev => { const r = 8 + 16 * (ev.pressure || .5); $$('.q-hl', slot.closest('.embed-max') || document).forEach(x => { const q = x.getBoundingClientRect(); if (ev.clientX > q.left - r && ev.clientX < q.right + r && ev.clientY > q.top - r && ev.clientY < q.bottom + r) { gone.add(x.dataset.q); $$(`.q-hl[data-q="${x.dataset.q}"]`).forEach(n => n.classList.add('erasing')); } }); }; at(e);
      const mv = ev => { if (ev.pointerId === e.pointerId) at(ev); }, up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); if (gone.size) QUOTE.erase([...gone]); };
      addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); return; }
    P._words = null; let first = RD2.hit(P, e.clientX, e.clientY), lastW = first, moved = false; const prev = h('div.rd-prev'); slot.append(prev); Object.assign(prev.style, { left: P._tl.style.left, top: P._tl.style.top, width: P._tl.style.width, height: P._tl.style.height, position: 'absolute' });
    const paint = () => { prev.replaceChildren(); if (first < 0 || lastW < 0) return; RD2.rects(P, Math.min(first, lastW), Math.max(first, lastW)).forEach(r => prev.append(h('div.rd-hl.pv', { style: { left: r[0] * 100 + '%', top: r[1] * 100 + '%', width: r[2] * 100 + '%', height: r[3] * 100 + '%', '--hc': C()[last()] } }))); };
    const mv = ev => { if (ev.pointerId !== e.pointerId) return; ev.preventDefault(); ((ev.getCoalescedEvents && ev.getCoalescedEvents().length) ? ev.getCoalescedEvents() : [ev]).forEach(q => { const k = RD2.hit(P, q.clientX, q.clientY); if (k >= 0) { if (first < 0) first = k; lastW = k; } }); if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 5) moved = true; paint(); };
    const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true);
      if (!moved || first < 0 || lastW < 0) return prev.remove(); const i = Math.min(first, lastW), j = Math.max(first, lastW), W = RD2.words(P), exact = W.slice(i, j + 1).map(w => w.t).join(' ').replace(/\s+/g, ' ').trim(); if (exact.length < 2) return prev.remove();
      const full = slot._text || '', at = full.indexOf(exact);
      QUOTE.penSave({ src, page: +slot.dataset.p, exact, prefix: at > 0 ? full.slice(Math.max(0, at - 32), at) : '', suffix: at >= 0 ? full.slice(at + exact.length, at + exact.length + 32) : '', rects: RD2.rects(P, i, j) }, ev.clientX, ev.clientY + 12, prev); };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true);
  }, true);
  // a pen hovering over a maximised file's pages doesn't scroll it (fingers do)
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'pen') return; const st = e.target.closest && e.target.closest('.embed-max .dk-maxc, .embed-max .pdf-stage'); if (st) { st.style.touchAction = 'none'; st._pen = true; } }, true);
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') $$('.embed-max .dk-maxc, .embed-max .pdf-stage').forEach(s => { if (s._pen) { s.style.touchAction = ''; s._pen = false; } }); }, true);
}
