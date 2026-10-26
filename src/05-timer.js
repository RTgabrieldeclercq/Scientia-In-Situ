/* ==========================================================================
   05 · Timers — up to two concurrent sessions; overlap = multitask.
   Persist segment START times, never an elapsed counter: reloads, closed
   tabs and sleeping laptops cannot corrupt a session.
   ========================================================================== */
const TIMER = {
  active() { return DB.where('sessions', s => s.state === 'running' || s.state === 'paused'); },
  runningAll() { return DB.where('sessions', s => s.state === 'running'); },
  runningFor(docId) { return DB.where('sessions', s => s.state === 'running' && s.docId === docId)[0] || null; },
  activeFor(docId) { return DB.where('sessions', s => (s.state === 'running' || s.state === 'paused') && s.docId === docId)[0] || null; },
  elapsed(s, at = Date.now()) {
    if (s.entry === 'duration') return (s.seconds || 0) * 1000;
    return sum((s.segments || []).map(g => Math.max(0, Math.min(g.e ? +new Date(g.e) : at, at) - +new Date(g.s))));
  },

  start(docId, quiet) {
    const ex = TIMER.activeFor(docId);
    if (ex) return TIMER.resume(ex);
    const running = TIMER.runningAll();
    if (running.length >= settings().maxTimers) {
      return pickModal('Two timers are already running', 'Overlapping time is recorded as multitask and counted once. Pause one to start this note’s timer.',
        running.map(s => ({ label: 'Pause “' + (M.doc(s.docId) || {}).title + '”', run: () => { TIMER.pause(s); TIMER.start(docId); } })));
    }
    const d = M.doc(docId), now = new Date();
    const s = { id: uid('s'), docId, themeId: d.themeId, projectId: d.projectId, entry: 'timer', source: 'timer', state: 'running',
      segments: [{ s: isoLocal(now), e: null }], steps: [], created: isoLocal(now), heartbeat: isoLocal(now) };
    DB.put('sessions', s); if (!quiet) changed(); return s;
  },
  pause(s) { const g = s.segments[s.segments.length - 1]; if (g && !g.e) g.e = isoLocal(new Date()); s.state = 'paused'; DB.put('sessions', s); changed(); },
  resume(s) {
    if (TIMER.runningAll().length >= settings().maxTimers) { toast('Two timers already running — pause one first'); return s; }
    s.segments.push({ s: isoLocal(new Date()), e: null }); s.state = 'running'; DB.put('sessions', s); changed(); return s;
  },
  stop(s) {
    const g = s.segments[s.segments.length - 1]; if (g && !g.e) g.e = isoLocal(new Date());
    s.state = 'complete'; s.completedAt = isoLocal(new Date()); s.seconds = Math.round(TIMER.elapsed(s) / 1000);
    DB.put('sessions', s); changed();
    toast(`Timer stopped · ${fmtDur(s.seconds * 1000)} recorded on “${(M.doc(s.docId) || {}).title}”`);
  },

  /** Protocol mode: checking a step records its split and its offset into the session. */
  stepBlocks(docId) { return M.docBlocks(docId).filter(b => b.status === 'live' && b.kind === 'component'); },
  checkStep(blockId) {
    const b = M.block(blockId), s = TIMER.activeFor(b.docId);
    if (b.step && b.step.checkedAt) { // uncheck
      if (s) s.steps = s.steps.filter(x => x.blockId !== blockId), DB.put('sessions', s);
      b.step = null; DB.put('blocks', b); changed(); return;
    }
    const now = Date.now();
    if (!s) { b.step = { checkedAt: isoLocal(now) }; DB.put('blocks', b); changed(); return; }
    const off = TIMER.elapsed(s, now), prev = s.steps.length ? s.steps[s.steps.length - 1].offsetMs : 0;
    const rec = { blockId, at: isoLocal(now), offsetMs: off, durMs: off - prev };
    s.steps.push(rec); DB.put('sessions', s);
    b.step = { checkedAt: rec.at, sessionId: s.id, durMs: rec.durMs, offsetMs: off }; DB.put('blocks', b);
    const all = TIMER.stepBlocks(b.docId);
    if (all.every(x => x.step && x.step.checkedAt)) {
      _suppress++; TIMER.stop(s); _suppress--;
      changed();
      setTimeout(() => protocolSummary(s.id), 50);
    } else changed();
  },

  /** Manual entry: raw duration, or endpoints (either one alone = 'open'). */
  logManual(docId, { mode, seconds, date, startedAt, endedAt, note }) {
    const d = M.doc(docId), base = { id: uid('s'), docId, themeId: d.themeId, projectId: d.projectId, source: 'manual', note: note || '', created: isoLocal(new Date()), steps: [] };
    let s;
    if (mode === 'duration') s = Object.assign(base, { entry: 'duration', localDate: date, seconds, state: 'complete', segments: [] });
    else {
      const st = startedAt ? isoLocal(new Date(startedAt)) : null, en = endedAt ? isoLocal(new Date(endedAt)) : null;
      s = Object.assign(base, { entry: 'endpoints', startedAt: st, endedAt: en, state: st && en ? 'complete' : 'open', segments: st && en ? [{ s: st, e: en }] : [] });
      if (st && en && +new Date(en) < +new Date(st)) { toast('End is before start'); return null; }
    }
    DB.put('sessions', s); changed();
    const ov = TIMER.overlaps(s).filter(o => o.source === 'timer');
    if (ov.length) toast(`Overlaps ${plural(ov.length, 'timed session')} (${ov.map(o => (M.doc(o.docId) || {}).title).join(', ')}). The day total counts the overlap once, as multitask — trim the entry if it double-counts.`, 6000);
    return s;
  },
  completeOpen(s, startedAt, endedAt) {
    s.startedAt = startedAt ? isoLocal(new Date(startedAt)) : s.startedAt; s.endedAt = endedAt ? isoLocal(new Date(endedAt)) : s.endedAt;
    if (s.startedAt && s.endedAt) { s.segments = [{ s: s.startedAt, e: s.endedAt }]; s.state = 'complete'; }
    DB.put('sessions', s); changed();
  },

  /** Failure 1 & 2: forgotten or orphaned timers are offered back, never silently kept or dropped. */
  checkOnLoad() {
    const cap = settings().timerCapHours * 36e5;
    for (const s of TIMER.runningAll()) {
      const g = s.segments[s.segments.length - 1];
      if (g && !g.e && Date.now() - +new Date(g.s) > cap) {
        const hb = s.heartbeat ? new Date(s.heartbeat) : new Date(+new Date(g.s) + cap);
        pickModal('A timer ran past the cap', `“${(M.doc(s.docId) || {}).title}” has been running since ${fmtWhen(g.s)}. Last seen active ${fmtWhen(hb)}.`, [
          { label: `Keep until last activity (${fmtTime(hb)})`, run: () => { g.e = isoLocal(hb); s.state = 'complete'; s.source = 'recovered'; s.seconds = Math.round(TIMER.elapsed(s) / 1000); DB.put('sessions', s); changed(); } },
          { label: `Keep the capped ${settings().timerCapHours} h`, run: () => { g.e = isoLocal(new Date(+new Date(g.s) + cap)); s.state = 'complete'; s.source = 'recovered'; s.seconds = Math.round(TIMER.elapsed(s) / 1000); DB.put('sessions', s); changed(); } },
          { label: 'Discard this segment', run: () => { s.segments.pop(); s.state = s.segments.length ? 'complete' : 'complete'; s.seconds = Math.round(TIMER.elapsed(s) / 1000); DB.put('sessions', s); changed(); } },
        ]);
      }
    }
  },
  heartbeat() { for (const s of TIMER.runningAll()) { s.heartbeat = isoLocal(new Date()); DB.put('sessions', s); } },

  /** Idle detection (§14): no input for N minutes while a timer runs → offer to trim the gap on return. */
  lastInput: Date.now(), idleOffered: false,
  noteInput() {
    const gap = Date.now() - TIMER.lastInput, lim = settings().idleMinutes * 6e4;
    if (gap > lim && TIMER.runningAll().length && !TIMER.idleOffered) {
      TIMER.idleOffered = true; const from = new Date(TIMER.lastInput);
      pickModal('You were away', `No input since ${fmtTime(from)} (${fmtDur(gap)}) while ${plural(TIMER.runningAll().length, 'timer')} kept running.`, [
        { label: `Trim the gap — stop counting at ${fmtTime(from)}, resume now`, run: () => { for (const s of TIMER.runningAll()) { const g = s.segments[s.segments.length - 1]; g.e = isoLocal(from); s.segments.push({ s: isoLocal(new Date()), e: null }); DB.put('sessions', s); } changed(); toast('Idle gap trimmed'); } },
        { label: 'Keep it — I was working away from the keyboard', run: () => { } }]);
    }
    if (gap < lim) TIMER.idleOffered = false;
    TIMER.lastInput = Date.now();
  },
  /** Overlap detection across ALL sessions: two timers are allowed (multitask), but a manual entry over a timed block usually double-counts. */
  overlaps(s) {
    const mine = (s.segments || []).map(g => [+new Date(g.s), g.e ? +new Date(g.e) : Date.now()]); if (!mine.length) return [];
    return DB.all('sessions').filter(o => o.id !== s.id && (o.segments || []).some(g => { const a = +new Date(g.s), b = g.e ? +new Date(g.e) : Date.now(); return mine.some(([x, y]) => a < y && x < b); }));
  },
  /** Flatten every measured interval (timer + complete endpoints). */
  intervals(at = Date.now()) {
    const out = [];
    for (const s of DB.all('sessions')) {
      if (s.entry === 'duration') continue;
      for (const g of s.segments || []) {
        const a = +new Date(g.s), b = g.e ? +new Date(g.e) : at;
        if (b > a) out.push({ s: a, e: b, sessionId: s.id, docId: s.docId, themeId: s.themeId, projectId: s.projectId });
      }
    }
    return out;
  },
  /** Split at LOCAL midnight. setHours(24) respects DST transitions. */
  splitByDay(a, b) {
    const out = []; let cur = new Date(a);
    while (+cur < b) { const nx = new Date(cur); nx.setHours(24, 0, 0, 0); const e = Math.min(+nx, b); out.push({ date: localDate(cur), s: +cur, e }); cur = new Date(e); }
    return out;
  },
  /** Union length of intervals (multitask counted once). */
  union(iv) {
    const a = iv.map(x => [x.s, x.e]).sort((p, q) => p[0] - q[0]); let tot = 0, cs = null, ce = null;
    for (const [s, e] of a) { if (cs === null || s > ce) { if (cs !== null) tot += ce - cs; cs = s; ce = e; } else ce = Math.max(ce, e); }
    if (cs !== null) tot += ce - cs; return tot;
  },
};

function protocolSummary(sessionId, extra) {
  const s = M.session(sessionId); if (!s) return;
  const body = h('div', h('p.serif', { style: { marginTop: 0 } }, `All steps checked — the timer stopped at `, h('b', fmtDur(TIMER.elapsed(s), true)), '.'),
    h('table.t', h('thead', h('tr', h('th', 'Step'), h('th', 'Step time'), h('th', 'Occupies'), h('th', 'Ends at'))),
      h('tbody', s.steps.map(st => { const b = M.block(st.blockId), df = st.stepId && b && PROTO.defOf(b); return h('tr', h('td', df ? `${PROTO.numIn(b, st.stepId) || '–'}. ${snippet((PROTO.stepOf(b, df, st.stepId) || {}).text, 46)}` : b ? M.blockName(b) : '—'), h('td.mono', fmtDur(st.durMs, true)), h('td', h('div.bar', { style: { width: '120px' } }, h('i', { style: { width: (100 * st.durMs / Math.max(1, TIMER.elapsed(s))).toFixed(1) + '%' } }))), h('td.mono', '+' + fmtDur(st.offsetMs, true))); }),
        h('tr.tot', h('td', 'Total'), h('td.mono', fmtDur(TIMER.elapsed(s), true)), h('td', ''), h('td', '')))));
  modal({ title: 'Protocol complete', body, actions: extra ? [{ label: 'Done' }, { label: extra.label, pri: true, run: extra.run }] : [{ label: 'Done', pri: true }] });
}
