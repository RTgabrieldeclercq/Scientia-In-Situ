/* ==========================================================================
   13za · A timer is a temporary component. Starting a note's timer puts a
   timer box on its canvas; it waits to be tagged to the components it timed —
   drag a wire from its ● to each one (no question asked: the wire is "timed").
   Completing it with one tag logs the time to that component; with several,
   you type each one's share, and the shares must add up. Once logged, the box
   goes away and each component shows its time the way manual time shows (the
   teal pill in its header). Iterate asks which components the finished timer
   goes to before the next one starts. An untagged, finished timer stays,
   waiting, until you tag it.
   ========================================================================== */
REL.timed = { id: 'timed', label: 'timed', dir: true, verb: 'was timed on', inv: 'timed by' };
const TCMP = {
  blockOf: s => s && DB.where('blocks', b => b.kind === 'timer' && b.sessionId === s.id && b.status !== 'removed')[0] || null,
  tags: b => DB.where('wires', w => w.rel === 'timed' && w.from === b.id).map(w => M.block(w.to)).filter(x => x && x.status === 'live' && x.kind !== 'timer'),
  totalSec: s => Math.round(TIMER.elapsed(s) / 1000),
  /** Where a new timer box goes: the middle of the view when the note is open, else beside its components. */
  spot(d) {
    const pane = App.panes && App.panes().find(p => p && p.docId === d.id && p.paper);
    if (pane) { const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2 + 60, r.top + Math.min(140, r.height * .2)); return { x: Math.round(c.x / 14) * 14, y: Math.round(c.y / 14) * 14 }; }
    const bs = M.docBlocks(d.id).filter(b => b.status === 'live' && b.x != null); if (!bs.length) return { x: 448, y: 168 };
    return { x: Math.round((Math.max(...bs.map(b => b.x + (b.w || 392))) + 56) / 14) * 14, y: Math.round(Math.min(...bs.map(b => b.y || 0)) / 14) * 14 };
  },
  create(s) {
    const d = M.doc(s.docId); if (!d || TCMP.blockOf(s)) return null; const p = TCMP.spot(d);
    _suppress++; const b = M.addBlock(d.id, null, { kind: 'timer', label: '', sessionId: s.id, x: p.x, y: p.y, w: 336 }); _suppress--;
    b.body = { text: '', marks: [] }; DB.put('blocks', b); s.blockId = b.id; DB.put('sessions', s); changed(); return b;
  },
  /** Start a note's timer from the UI: the timer box comes with it. */
  start(docId) { const s = TIMER.start(docId); if (s && s.id && (s.state === 'running' || s.state === 'paused') && !TCMP.blockOf(s)) TCMP.create(s); return s; },
  remove(b) {
    let d = M.doc(b.docId); if (d) { d = Object.assign({}, d, { blockIds: d.blockIds.filter(x => x !== b.id) }); DB.put('documents', d); }
    DB.where('wires', w => w.from === b.id || w.to === b.id).forEach(w => DB.del('wires', w.id)); DB.del('blocks', b.id);
  },
  /** Everything a timer is tagged to: components (by timed wires) and regions (b.rtags). key: block id, or "rg:" + region id. */
  targets(b) {
    const d = M.doc(b.docId), regs = REGION.list(d);
    return [...TCMP.tags(b).map(c => ({ key: c.id, block: c, name: M.blockName(c), sub: c.body.text })),
      ...(b.rtags || []).map(id => regs.find(r => r.id === id)).filter(r => r && r.members.length).map(r => ({ key: 'rg:' + r.id, region: r, name: r.name, sub: 'region · ' + plural(r.members.length, 'component') }))];
  },
  /** Log the time to what it was tagged to and let the box go. shares: [{ key, sec }] */
  resolve(b, shares) {
    const s = M.session(b.sessionId); if (!s) return; const d = M.doc(b.docId), name = k => { const t = TCMP.targets(b).find(x => x.key === k); return t ? t.name : '—'; }, first = name(shares[0].key);
    const put = o => { o.timed = [...(o.timed || []).filter(t => t.sessionId !== s.id), { sessionId: s.id, sec: shares.find(x => x.key === (o.members ? 'rg:' + o.id : o.id)).sec }]; };
    shares.forEach(x => { if (x.key.startsWith('rg:')) { const r = REGION.list(d).find(r => 'rg:' + r.id === x.key); if (r) { put(r); REGION.save(d); } } else { const c = M.block(x.key); if (c) { put(c); DB.put('blocks', c); } } });
    s.alloc = shares.map(x => x.key.startsWith('rg:') ? { regionId: x.key.slice(3), sec: x.sec } : { blockId: x.key, sec: x.sec }); DB.put('sessions', s); TCMP.remove(b); changed();
    toast(shares.length === 1 ? `${fmtDur(shares[0].sec * 1000, shares[0].sec < 60)} logged on “${snippet(first, 40)}”` : `${fmtDur(TCMP.totalSec(s) * 1000)} split across ${plural(shares.length, 'tag')}`);
  },
  /** A finished timer with exactly one tag logs itself. */
  settle(s) { const b = TCMP.blockOf(s); if (!b || s.state !== 'complete') return; const t = TCMP.targets(b); if (t.length === 1) TCMP.resolve(b, [{ key: t[0].key, sec: TCMP.totalSec(s) }]); },
  /** Tag (and untag) so the timer points at exactly these keys (component ids and "rg:" region ids). */
  setTags(b, keys) {
    const ids = keys.filter(k => !k.startsWith('rg:')), want = new Set(ids);
    DB.where('wires', w => w.rel === 'timed' && w.from === b.id && !want.has(w.to)).forEach(w => DB.del('wires', w.id));
    const have = new Set(DB.where('wires', w => w.rel === 'timed' && w.from === b.id).map(w => w.to));
    ids.filter(id => !have.has(id)).forEach(id => DB.put('wires', { id: uid('w'), from: b.id, to: id, rel: 'timed', directed: true, created: isoLocal(new Date()) }));
    const blk = M.block(b.id); if (blk) { blk.rtags = keys.filter(k => k.startsWith('rg:')).map(k => k.slice(3)); DB.put('blocks', blk); b.rtags = blk.rtags; }
  },
  tagRegion(b, rid) { const keys = TCMP.targets(b).map(t => t.key); if (!keys.includes('rg:' + rid)) TCMP.setTags(b, [...keys, 'rg:' + rid]); changed(); },
  /** Iterate: which components or regions did the finished timer time? */
  assign(s, next) {
    const b = TCMP.blockOf(s); if (!b) return next();
    const opts = [...REGION.list(M.doc(s.docId)).filter(r => r.members.length).map(r => ({ key: 'rg:' + r.id, name: r.name, sub: 'region · ' + plural(r.members.length, 'component'), color: r.color })),
      ...M.docBlocks(s.docId).filter(x => x.status === 'live' && x.kind === 'component').map(c => ({ key: c.id, name: M.blockName(c), sub: c.body.text }))];
    const on = new Set(TCMP.targets(b).map(x => x.key));
    if (!opts.length) return next();
    const q = h('input.inp', { placeholder: 'Filter components and regions…', style: { width: '100%', marginBottom: '8px' } });
    const list = h('div.list.tc-pick'), draw = () => { const k = q.value.trim().toLowerCase();
      list.replaceChildren(...opts.filter(o => !k || (o.name + ' ' + o.sub).toLowerCase().includes(k)).map(o => h('label.li.click', h('input', { type: 'checkbox', checked: on.has(o.key), on: { change: e => { e.target.checked ? on.add(o.key) : on.delete(o.key); } } }),
        o.color ? h('i.tc-sw', { style: { background: o.color } }) : null, h('span.t', h('b', o.name), ' ', h('span.serif.muted', snippet(o.sub, 70)))))); };
    q.addEventListener('input', draw); draw();
    modal({ title: 'What did this timer time?', body: h('div', h('p.serif', { style: { marginTop: 0 } }, `${fmtDur(TIMER.elapsed(s), true)} on “${(M.doc(s.docId) || {}).title}”. Pick one or several components or regions (you’ll split the time between several), then the next timer starts.`), q, list),
      actions: [{ label: 'Leave it awaiting a tag', run: () => { setTimeout(next, 0); } }, { label: 'Assign and start the next', pri: true, run: () => { TCMP.setTags(b, [...on]); setTimeout(next, 0); } }] });
  },
  /** The box itself. */
  body(b, d, pane, ro) {
    const s = M.session(b.sessionId), wrap = h('div.tc');
    if (!s) { wrap.append(h('div.tc-await', 'This timer was cancelled.'), ro ? null : h('button.btn.xs', { on: { click: () => { TCMP.remove(b); changed(); } } }, 'Remove')); return wrap; }
    const act = s.state === 'running' || s.state === 'paused', tags = TCMP.targets(b), total = TCMP.totalSec(s);
    wrap.append(h('div.tc-top', h('i.td-dot.' + s.state), act ? h('span.tc-time', { 'data-sess': s.id }, fmtDur(TIMER.elapsed(s), true)) : h('span.tc-time', fmtDur(total * 1000, true)),
      h('span.pill' + (s.state === 'running' ? '.teal' : ''), s.state === 'complete' ? 'done' : s.state), s.iterN > 1 ? h('span.pill', '#' + s.iterN) : null, h('span.spacer'),
      act && !ro ? [s.state === 'running' ? h('button.td-b', { title: 'Pause', on: { click: () => TIMER.pause(s) } }, '❚❚') : h('button.td-b', { title: 'Resume', on: { click: () => TIMER.resume(s) } }, '▶'),
        h('button.td-b.ok', { title: 'Complete — log this time', on: { click: () => TIMERUI.complete(s) } }, '✓'),
        h('button.td-b', { title: 'Iterate — log this one and start the next', on: { click: () => TIMERUI.iterate(s) } }, '↻'),
        h('button.td-b.bad', { title: 'Cancel — log nothing (asks first)', on: { click: () => TIMERUI.cancel(s) } }, '✕')] : null));
    if (!tags.length) { wrap.append(h('div.tc-await', '◌ Awaiting a tag — drag from this box’s ● to the component(s) it timed, or onto a region’s name tab')); return wrap; }
    const split = s.state === 'complete' && tags.length > 1, inputs = {};
    const sumLine = h('div.tc-sum'), go = h('button.btn.xs.pri', 'Log split');
    const check = () => { const v = tags.map(t => parseDuration(inputs[t.key].value) || 0), got = sum(v), diff = Math.abs(got - total), ok = v.every(x => x > 0) && diff < 60;
      sumLine.textContent = `${fmtDur(got * 1000, true)} of ${fmtDur(total * 1000, true)} assigned` + (ok ? '' : got > total ? ' — too much' : ' — ' + fmtDur((total - got) * 1000, true) + ' left'); sumLine.classList.toggle('ok', ok); go.disabled = !ok; return ok; };
    const open = (t, e) => { if (t.block) return App.jump(t.block.id, e); const id = t.region.members[0]; id && App.jump(id, e); };
    wrap.append(h('div.tc-tags', h('div.tc-k', s.state === 'complete' ? (split ? 'Split the time — type each one’s share' : 'Timed') : 'Timing'),
      tags.map(t => h('div.tc-tag' + (t.region ? '.rg' : ''), t.region ? h('i.tc-sw', { style: { background: t.region.color || REGION.COLORS[0] } }) : null, h('a', { on: { click: e => open(t, e) } }, snippet(t.name, 32)), h('span.serif.muted', snippet(t.sub, 40)), h('span.spacer'),
        split ? (inputs[t.key] = h('input.inp.mono.tc-in', { placeholder: '20 · 1h10', on: { input: check } })) : null,
        ro ? null : h('button.ib', { title: 'Untag', on: { click: () => { TCMP.setTags(b, tags.filter(x => x.key !== t.key).map(x => x.key)); changed(); } } }, '×'))),
      split ? h('div.row', { style: { gap: '8px', marginTop: '6px' } }, sumLine, h('span.spacer'), go) : null,
      s.state === 'complete' && tags.length === 1 && !ro ? h('div.row', { style: { marginTop: '6px' } }, h('span.spacer'), h('button.btn.xs.pri', { on: { click: () => TCMP.settle(s) } }, 'Log ' + fmtDur(total * 1000, true))) : null));
    if (split) { go.addEventListener('click', () => { if (!check()) return; const v = tags.map(t => ({ key: t.key, sec: parseDuration(inputs[t.key].value) || 0 })), d0 = total - sum(v.map(x => x.sec)); v[v.length - 1].sec += d0; TCMP.resolve(b, v); }); check(); }
    return wrap;
  },
  /** A component's (or region's) logged timer time, shown like manual time. */
  pill(b) { const t = (b.timed || []).filter(x => x.sec > 0); if (!t.length) return null; const sec = sum(t.map(x => x.sec));
    return h('span.pill.teal', { title: `timed — logged from ${plural(t.length, 'timer')}` }, fmtDur(sec * 1000, sec < 60)); },
};
WIDGETS.timer = { label: 'timer', w: 336, body: TCMP.body, menu: b => [{ label: 'Untag all', run: () => { TCMP.setTags(b, []); changed(); } }] };
{
  const stop = TIMER.stop; TIMER.stop = function (s) { const r = stop.call(TIMER, s); TCMP.settle(s); return r; };
  const del = DB.del.bind(DB); DB.del = function (store, id) { const r = del(store, id); if (store === 'sessions') DB.where('blocks', b => b.kind === 'timer' && b.sessionId === id).forEach(b => TCMP.remove(b)); return r; };
  const iter = TIMERUI.iterate; TIMERUI.iterate = s => TCMP.assign(s, () => iter(s));
  // wires to or from a timer box are tags — no question asked
  const rp = DocView.relationPopover; DocView.relationPopover = function (from, to, x, y) {
    const A = M.block(from), B = M.block(to), t = A && A.kind === 'timer' ? A : B && B.kind === 'timer' ? B : null;
    if (!t) return rp.call(this, from, to, x, y);
    const other = t === A ? B : A; if (!other || other.kind === 'timer') return toast('Tag a timer to a component');
    TCMP.setTags(t, [...TCMP.tags(t).map(c => c.id), other.id]); changed(); toast('Tagged · ' + snippet(M.blockName(other), 40));
  };
  // a timer's wire dropped on a region (its name tab or its border, not a component inside) tags the region
  const cd = CHAINDROP.open; CHAINDROP.open = function (pane, fromId, ev) { const b = M.block(fromId); if (!b || b.kind !== 'timer') return cd.call(CHAINDROP, pane, fromId, ev);
    const rg = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.region'), r = rg && REGION.list(M.doc(b.docId)).find(x => x.id === rg.dataset.rg);
    if (r) { TCMP.tagRegion(b, r.id); return toast('Tagged · region “' + snippet(r.name, 40) + '”'); }
    toast('Drop it on a component, or on a region’s name tab'); };
  // a dashed line from the timer to each region it is tagged to
  const dw = DocView.drawWires; DocView.drawWires = function (temp) { const r = dw.call(this, temp); if (!this.paper || !this.svg) return r;
    const d = M.doc(this.docId); if (!d || !REGION.list(d).length) return r; let extra = '';
    DB.where('blocks', b => b.kind === 'timer' && b.docId === d.id && (b.rtags || []).length).forEach(b => { const A = this.rectOf(b.id); if (!A) return;
      b.rtags.forEach(id => { const rg = REGION.list(d).find(x => x.id === id), R = rg && REGION.rect(this, rg); if (!R) return; const tab = { x: R.x, y: R.y, w: Math.min(R.w, 180), h: 26 }; extra += `<path class="w rgt" d="${this.geom(A, tab).d}" marker-end="url(#wa)"/>`; }); });
    if (extra) this.svg.insertAdjacentHTML('beforeend', extra); return r; };
}
