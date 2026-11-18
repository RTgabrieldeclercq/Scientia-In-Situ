// The Atlas (14f-atlas3.js, V4.0) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs atlas
export default {
  by: '',
  use: 'The whole notebook in one room, sorted along three axes you choose, to see how the work fits together.',
  view: [1280, 800], dpr: 1, crf: 31, pause: 500,
  // the test notebook: two projects, a dozen notes over six weeks with structures, terms, connections and bridges, and daily notes
  setup: async () => {
    const O = { anchor: 0, sessions: false };   // anchor: days between today and the story's last day
    const N = n => n + O.anchor, at = (n, hm) => KIT.at(N(n), hm);
    const P1 = KIT.project('Traction on soft gels'), P2 = KIT.project('Bead tracking code');
    const TH1 = KIT.theme(P1, 'Substrate and coating', 'Which gel and coating give an even sheet?'), TH2 = KIT.theme(P1, 'Traction under EGF', 'Does EGF move the force, or lower it?'), TH3 = KIT.theme(P2, 'Drift and tracking', 'How far can the tracker be trusted?');
    // two made-up papers in the Library (the demokit's own: assets/make.py)
    const LIBK = {};
    [['okafor', 41, { DOI: '10.5555/jdm.2021.0104', type: 'journal-article', title: ['Edge traction on compliant gels rises with fibronectin density'], author: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 'container-title': ['Journal of Demonstration Mechanobiology'], issued: { 'date-parts': [[2021]] }, volume: '12', page: '104-111' }],
      ['haldane', 27, { DOI: '10.5555/mdm.2019.0033', type: 'journal-article', title: ['Bead drift in long traction time-lapses and how to correct it'], author: [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 'container-title': ['Methods in Demonstration Microscopy'], issued: { 'date-parts': [[2019]] }, volume: '5', page: '33-39' }]]
      .forEach(([k, n, csl]) => { const r = Object.assign({ id: uid('l'), kind: 'paper', added: isoLocal(at(n, '18:00')) }, LIB.fromCsl(csl)); DB.put('library', r); LIBK[k] = r.id; });
    // a component's text, written with: {kind:words} a structure ({kind#key:…} names it, {resolution>key:…} resolves that barrier), [[a term]], {@paper}
    const K = {}, B = {}, D = {};
    const write = (b, p, src, n, hm) => {
      const t = at(n, hm), marks = [], st = []; let text = '';
      b.created = b.made = b.modified = isoLocal(t); try { b.stamp = M.stampFor(b.docId, t); } catch (e) { }
      for (let i = 0; i < src.length;) {
        if (src.startsWith('[[', i)) { st.push({ from: text.length }); i += 2; }
        else if (src.startsWith(']]', i)) { const f = st.pop(); marks.push({ id: uid('m'), type: 'term', from: f.from, to: text.length, ref: M.findOrCreateTerm(p.id, text.slice(f.from)).id }); i += 2; }
        else if (src.startsWith('{@', i)) { const j = src.indexOf('}', i); marks.push({ id: uid('m'), type: 'cite', from: text.length, to: text.length + 1, ref: LIBK[src.slice(i + 2, j)] }); text += OBJ; i = j + 1; }
        else if (src[i] === '{') { const j = src.indexOf(':', i); st.push({ head: src.slice(i + 1, j), from: text.length }); i = j + 1; }
        else if (src[i] === '}') { const f = st.pop(), [kind, key] = f.head.split(/[#>]/), res = f.head.includes('>');
          const it = M.createItem(kind, text.slice(f.from), b, { created: isoLocal(t), resolves: res ? K[key].id : null }); if (key && !res) K[key] = it;
          marks.push({ id: uid('m'), type: 'struct', from: f.from, to: text.length, ref: it.id }); i++; }
        else text += src[i++];
      }
      b.body = { text, marks }; DB.put('blocks', b); return b;
    };
    // a note: its components in two columns, each [key, label, 'HH:MM', text, days later]
    const note = (key, p, th, type, title, n, rows) => {
      const d = KIT.note(p, title, { type, themeId: th && th.id, daysAgo: N(n) || undefined }), bs = KIT.grid(d, rows.map(r => [r[1], '']));
      rows.forEach((r, i) => { B[r[0]] = write(bs[i], p, r[3], n - (r[4] || 0), r[2]); });
      if (O.sessions) { const s = at(n, rows[0][2]), e = new Date(+s + (95 + rows.length * 35) * 6e4); DB.put('sessions', { id: uid('s'), docId: d.id, themeId: d.themeId, projectId: d.projectId, entry: 'timer', source: 'timer', state: 'complete', segments: [{ s: isoLocal(s), e: isoLocal(e) }], steps: [], created: isoLocal(s), seconds: Math.round((e - s) / 1000) }); }
      D[key] = d; return d;
    };
    note('g14', P1, TH1, 'experiment', 'Gel batch 14', 41, [
      ['g14a', 'Recipe', '09:20', 'Polyacrylamide at 8 kPa nominal, 0.2 µm beads, cast on activated glass.'],
      ['g14b', 'Stiffness check', '14:10', '{result:Batch 14 measures 8.3 ± 0.5 kPa by indentation}, close to the nominal [[gel stiffness]].'],
      ['g14c', 'Storage', '16:00', '{barrier#soft:Gels kept longer than five days soften by about 15 %}: the [[gel stiffness]] no longer matches the label.', 2]]);
    note('fn', P1, TH1, 'experiment', 'Fibronectin series', 37, [
      ['fn1', 'Plan', '09:30', 'Coat at 1, 5 and 10 µg/mL [[fibronectin]]; image the [[leading edge]] at 24 h.'],
      ['fn2', 'Outcome', '15:40', '{result:Spreading is even at 5 and 10 µg/mL [[fibronectin]], patchy at 1 µg/mL}.', 1],
      ['fn3', 'Reading', '16:10', '{claim:Edge traction rises with [[fibronectin]] density} {@okafor}', 1],
      ['fn4', 'Takeaway', '16:30', '{takeaway:Coat with [[fibronectin]] at 5 µg/mL from now on: even spreading with half the protein}.', 1]]);
    note('sd', P1, TH1, 'note', 'Seeding density notes', 33, [
      ['sd1', 'Counts', '10:00', '{observation:At 20k/cm² the sheet has holes at 24 h; at 40k/cm² it is closed}.'],
      ['sd2', 'Rule', '10:30', '{takeaway:A [[seeding density]] of 40k/cm² gives a closed sheet in 24 h}.']]);
    note('r1', P1, TH2, 'experiment', 'Run 1', 29, [
      ['r1a', 'Setup', '09:10', 'Gel batch 14, [[fibronectin]] at 5 µg/mL, [[seeding density]] 40k/cm².'],
      ['r1b', 'Imaging', '11:00', '{barrier#drift:[[bead drift]] smears the traction maps after frame 40}.'],
      ['r1c', 'Result', '15:30', '{result:Mean [[leading edge]] traction 138 Pa in the first 40 frames (n = 5 fields)}.']]);
    note('dc', P2, TH3, 'analysis', 'Drift correction', 25, [
      ['dc1', 'Idea', '10:00', 'Subtract the motion of [[fiducial beads]] stuck to the glass from every frame {@haldane}.'],
      ['dc2', 'Test', '14:20', '{result:Subtracting the [[fiducial beads]] removes 90 % of the drift in a static gel}.'],
      ['dc3', 'Takeaway', '15:00', '{takeaway:Two fields of [[fiducial beads]] per dish are enough to correct a 2 h time-lapse}.']]);
    note('r2', P1, TH2, 'experiment', 'Run 2', 21, [
      ['r2a', 'Setup', '09:05', 'Same gels and coating as Run 1, with fiducial fields added for the [[bead drift]].'],
      ['r2b', 'Imaging', '11:10', '{resolution>drift:[[bead drift]] corrected with fiducial beads: the maps stay sharp for 200 frames}.'],
      ['r2c', 'Result', '15:45', '{result:Mean [[leading edge]] traction 142 Pa over 200 frames (n = 6 fields)}.']]);
    note('a2', P1, TH2, 'analysis', 'Analysis: Run 2', 18, [
      ['a2a', 'Maps', '10:20', '{observation:The force peak sits 12 µm behind the [[leading edge]] in every field}.'],
      ['a2b', 'Takeaway', '11:30', '{takeaway:Unstimulated, the sheet pulls from a band just behind its [[leading edge]]}.']]);
    note('tb', P2, TH3, 'analysis', 'Tracking benchmark', 14, [
      ['tb1', 'Method', '09:40', 'Synthetic bead images with known shifts from 0.1 to 4 px per frame.'],
      ['tb2', 'Result', '13:15', '{result:The [[tracking error]] stays under 0.05 px up to 2 px per frame}.'],
      ['tb3', 'Limit', '13:50', '{barrier#fast:The tracker loses beads above 2 px per frame}, and the [[tracking error]] jumps.']]);
    note('g15', P1, TH1, 'experiment', 'Gel batch 15', 13, [
      ['g15a', 'Recipe', '09:15', 'Same recipe as batch 14, cast three days before Run 3.'],
      ['g15b', 'Storage rule', '09:40', '{resolution>soft:Cast gels no more than three days before use}, so the [[gel stiffness]] holds.'],
      ['g15c', 'Stiffness check', '14:30', '{result:Batch 15 measures 8.1 ± 0.4 kPa by indentation}.']]);
    note('r3', P1, TH2, 'experiment', 'Run 3', 11, [
      ['r3a', 'Setup', '09:00', 'Gel batch 15, coating and seeding as before; [[EGF]] at 10 ng/mL from frame 0.'],
      ['r3b', 'Imaging', '10:40', '{observation:The edge ruffles within 5 minutes of [[EGF]]}.'],
      ['r3c', 'Result', '15:20', '{result:Mean [[leading edge]] traction 96 Pa under [[EGF]] (n = 6 fields)}.'],
      ['r3d', 'Open', '15:40', '{question#egf:Does [[EGF]] move the force peak, or lower it?}']]);
    note('a3', P1, TH2, 'analysis', 'Analysis: Run 3', 7, [
      ['a3a', 'Maps', '10:10', '{result:Under [[EGF]] the peak moves to 25 µm behind the edge and drops by a third}.'],
      ['a3b', 'Reading', '11:00', '{claim:[[EGF]] spreads the pulling band rather than switching it off}.'],
      ['a3c', 'Takeaway', '11:40', '{takeaway:[[EGF]] both moves and lowers the peak; the total force changes little}.']]);
    note('pv', P2, TH3, 'note', 'PIV window size', 5, [
      ['pv1', 'Trial', '10:30', '{result:A 32 px window halves the [[tracking error]] of a 16 px one}.'],
      ['pv2', 'Next', '11:00', '{question:Does the larger window blur the peak behind the edge?}']]);
    // connections, in and across notes
    [['g14b', 'g14c', 'leads', 39], ['fn1', 'fn2', 'leads', 36], ['fn2', 'fn4', 'leads', 36], ['fn3', 'fn4', 'supports', 36], ['sd1', 'sd2', 'leads', 33], ['fn4', 'r1a', 'leads', 29], ['sd2', 'r1a', 'leads', 29],
      ['r1b', 'dc1', 'leads', 25], ['dc1', 'dc2', 'leads', 25], ['dc2', 'dc3', 'leads', 25], ['dc3', 'r2a', 'supports', 21], ['r2b', 'r1b', 'resolves', 21], ['r2c', 'a2a', 'leads', 18], ['a2a', 'a2b', 'leads', 18],
      ['tb2', 'tb3', 'leads', 14], ['g15b', 'g14c', 'resolves', 13], ['a2b', 'r3a', 'leads', 11], ['r3c', 'a3a', 'leads', 7], ['a3a', 'a3c', 'leads', 7], ['a3b', 'r3d', 'answers', 7], ['tb3', 'pv1', 'leads', 5]]
      .forEach(([a, b, rel, n]) => { const w = M.wire(B[a].id, B[b].id, rel, true); w.created = isoLocal(at(n, '17:00')); DB.put('wires', w); });
    // bridges: a component shown in another note, with why
    [['dc2', 'r2', 'The correction used in this run', 21], ['g14c', 'g15', 'Why the three-day rule', 13], ['sd2', 'r3', 'The seeding used', 11], ['a3c', 'pv', 'The peak this window must still resolve', 5]]
      .forEach(([a, d, why, n]) => { const br = BRIDGE.make(B[a], D[d], { quiet: true, why }); if (br) KIT.ago(br, N(n), '09:30'); });
    // daily notes: components that belong to no note
    [[34, '08:50', 'Order more [[fibronectin]]: the 1 mg vial is nearly empty.'], [34, '17:20', 'Ask Lindqvist how she calibrates her indenter.'], [26, '21:10', 'Idea: follow beads stuck to the glass to measure the [[bead drift]] itself.'],
      [19, '12:30', 'Try the 40k/cm² [[seeding density]] on the plastic controls too.'], [12, '16:45', '{question:Is the [[EGF]] stock still good after three freeze–thaw cycles?}'], [8, '09:10', 'Marchetti suggests imaging the [[leading edge]] at 20× as well.'], [2, '18:05', 'Book the confocal for Run 4.']]
      .forEach(([n, hm, src]) => { const d = DAY.doc(KIT.day(N(n))), b = M.addBlock(d.id, null, { label: hm, x: 0, y: 200 + DAY.entries(d).length * 130 }); B['day' + n + hm] = write(b, P1, src, n, hm); });
    KIT.done();
    const ids = {}; Object.keys(B).forEach(k => { ids[k] = B[k].id; }); const docs = {}; Object.keys(D).forEach(k => { docs[k] = D[k].id; });
    return { B: ids, D: docs };
  },
  before: async (R, c) => {
    await R.go('#/atlas'); await R.until(`ATLAS3.shown().length > 10`, 8000); await R.sleep(3500);
    // Shift + drag moves the room up (not recorded), so that its axis names stand clear of the hint line along the foot of the stage
    await R.hold('Shift');
    await R.drag([860, 420], [860, 360], { ms: 600, hold: 60, after: 200 });
    await R.release('Shift');
    await R.move([240, 600], 0);
  },
  steps: [
    ['The Atlas: every note, component and structure in one room, laid out by time, kind and project. Drag to turn it', async (R, c) => {
      // a long, slow drag turns the room a good way round and tilts it a little flatter
      await R.drag([240, 600], [310, 580], { ms: 1700, hold: 60, after: 300 });
      await R.sleep(900);
    }],
    ['Change the middle axis from Kind to Term: the same notebook, regrouped by the terms it uses', async (R, c) => {
      await R.click('select[data-a="1"]', { ms: 450 });
      await R.type('Te', 60);
      await R.key('Enter');
      await R.until(`ATLAS3.st.axes[1] === 'term'`, 4000);
      await R.sleep(1300);
    }],
    ['Rest the pointer on a bead: after a moment it opens into its bubble, with its neighbours', async (R, c) => {
      // a bead with room round it, so that the pointer is on it and on nothing else
      const pick = await R.ev(FIND_BEAD);
      if (!pick) throw new Error('no free bead');
      c.bead = pick;
      await R.move([pick.x + 120, pick.y + 90], 300);
      await R.move([pick.x, pick.y], 450);
      if (!await R.until(`ATLAS3.by(${J(pick.id)}).k > .9`, 6000)) throw new Error('the bead did not open');
      await R.sleep(1400);
    }],
    ['Click it: you are in its note, at that component. The small bubble at the corner brings you back', async (R, c) => {
      await R.click(null, { after: 400, rest: 100 });
      await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${J(c.bead.doc)}`, 8000);
      await R.sleep(1300);
      await R.click('.bb-back-b', { ms: 400 });
      await R.until(`App.route.name === 'atlas' && ATLAS3.shown().length > 10`, 8000);
      await R.sleep(600);
    }],
    ['A thread: rest the pointer on it and both of its ends open, with the note each one lies in', async (R, c) => {
      await R.sleep(1000);
      const p = await R.ev(FIND_THREAD);
      if (!p) throw new Error('no thread found to rest on');
      await R.move([p.x - 70, p.y + 50], 300);
      await R.move([p.x, p.y], 450);
      if (!await R.until(`ATLAS3.st.tp`, 6000)) throw new Error('the thread did not open');
      await R.sleep(2200);
    }],
  ],
};
const J = JSON.stringify;
const FIND_BEAD = `const r = document.querySelector('.a3-room').getBoundingClientRect(), S = ATLAS3.shown(), W = r.width, H = r.height, out = [];
  for (const d of S) { if (d.type !== 'item' || !d.blockId || d.k > .05) continue; if (d.sx < 120 || d.sx > W - 140 || d.sy < 80 || d.sy > H - 150) continue;
    let near = 1e9; for (const o of S) if (o !== d) near = Math.min(near, Math.hypot(o.sx - d.sx, o.sy - d.sy)); const b = M.block(d.blockId); if (!b) continue; out.push({ id: d.id, x: r.left + d.sx, y: r.top + d.sy, near, doc: b.docId, pri: ['a3c', 'a3b', 'r3c', 'fn4', 'a2b', 'dc3'].length }); }
  out.sort((u, v) => v.near - u.near); return out[0] || null;`;
const BEAD = id => `(() => { const d = ATLAS3.shown().find(d => d.blockId === ${J(id)}), r = document.querySelector('.a3-room').getBoundingClientRect(); return { x: r.left + d.sx, y: r.top + d.sy }; })()`;
const FIND_THREAD = `const st = document.querySelector('.a3-room'), r = st.getBoundingClientRect(), ev = (t, x, y) => st.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerType: 'mouse', pointerId: 1, bubbles: true }));
  const out = []; for (const T of ATLAS3.threads().filter(T => T.on && T.k === 'bridge')) { const ax = T.A.sx + r.left, ay = T.A.sy + r.top, bx = T.B.sx + r.left, by = T.B.sy + r.top, len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (const t of [.5, .4, .6, .3, .7, .2, .8]) for (const o of [0, -5, 5, -10, 10, -16, 16, -24, 24]) { const x = ax + (bx - ax) * t + nx * o, y = ay + (by - ay) * t + ny * o; ev('pointermove', x, y); const ok = !!ATLAS3.st.th && !ATLAS3.st.hover; ev('pointerleave', 0, 0); if (ok) { out.push({ x, y, len, o: Math.abs(o) }); break; } } }
  out.sort((u, v) => u.o - v.o || v.len - u.len); return out[0] || null;`;
