// The monthly review (18b-monthly.js, V4.8; Milestones V4.18) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs review
export default {
  by: '',
  use: 'Once a month, see what each note delivered, file what belongs nowhere yet, and write next month’s plan.',
  view: [1280, 800], dpr: 1, crf: 33, pause: 500,
  // the test notebook (as atlas.mjs's, moved so that its notes fall in last month, with two notes in the month before it): two projects, notes with takeaways
  // and results, structures, terms, connections, bridges, timer sessions, and daily notes holding components that belong to no note
  setup: async () => {
    // the story's last day is the 30th of last month, whatever day it is today: last month is the one to review, the month before it the one to compare with
    const F = new Date(); F.setHours(0, 0, 0, 0); const first = new Date(F.getFullYear(), F.getMonth(), 1), O = { anchor: Math.max(0, Math.round((F - first) / 864e5) - 3), sessions: true };
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
    note('pl', P1, TH1, 'experiment', 'Coating pilot', 52, [
      ['pl1', 'Plan', '09:10', 'Coat three gels with [[fibronectin]] at 2 µg/mL to see whether the sheet spreads at all.'],
      ['pl2', 'Outcome', '15:20', '{result:A 2 µg/mL [[fibronectin]] coat gives a patchy sheet on 8 kPa gels}.'],
      ['pl3', 'Takeaway', '15:50', '{takeaway:Below 5 µg/mL of [[fibronectin]] the sheet does not close: test higher}.']]);
    note('bs', P2, TH3, 'note', 'Bead sizes', 50, [
      ['bs1', 'Test', '10:20', '{result:0.2 µm beads track better than 0.5 µm beads at 20×}.'],
      ['bs2', 'Takeaway', '10:50', '{takeaway:Use 0.2 µm [[fiducial beads]] from now on}.']]);
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
  before: async (R, c) => { await R.go('#/home'); await R.sleep(3000); },
  steps: [
    ['The Review tab: last month’s report, note by note, with the takeaways and results each delivered', async (R, c) => {
      await R.click('#tabs .tab[data-k="review"]', { ms: 600 });
      await R.until(`!!document.querySelector('.mr-card')`, 6000);
      await R.sleep(1000);
      for (let i = 0; i < 2; i++) { await R.wheel(300, [640, 420]); await R.sleep(800); }
    }],
    ['Its numbers against the month before: each count with its change', async (R, c) => {
      await R.click({ sel: '.mr-nav a', text: 'Report' }, { ms: 600 });
      await R.sleep(500);
      await R.wheel(-90, [640, 420]);
      await R.sleep(500);
      await R.move({ sel: '.mr-nums .mr-num:nth-child(2) .mr-d' }, 500);
      await R.sleep(1100);
    }],
    ['Unassigned: daily-note components that belong to no note. j moves down, f files one in the note it fits', async (R, c) => {
      await R.click({ sel: '.mr-nav a', text: 'Unassigned' }, { ms: 600 });
      await R.sleep(1000);
      await R.key('j'); await R.sleep(700);
      await R.key('f');
      await R.sleep(1800);
    }],
    ['Next month: tick what is still open, and the plan writes itself under it', async (R, c) => {
      await R.click({ sel: '.mr-nav a', text: 'Next month' }, { ms: 600 });
      await R.sleep(1000);
      for (const i of [0, 1, 2]) { await R.click(`.mr-pick:nth-child(${i + 1}) input`, { ms: 350, after: 250 }); await R.sleep(250); }
      await R.sleep(900);
    }],
    ['Complete the review: the plan becomes the synthesis of the review note', async (R, c) => {
      await R.click({ sel: 'button', text: 'Complete the review' }, { ms: 600 });
      if (!await R.until(`!!DB.get('reviews', MONTHLY.months().find(m => m.status === 'complete').id)`, 4000)) throw new Error('the review was not completed');
      await R.sleep(900);
      await R.wheel(-4000, [640, 420]); await R.sleep(300);
      await R.click({ sel: 'a.mr-mo', text: 'Oct' }, { ms: 600 });   // the review moves on to the next month waiting: back to the one just completed
      if (!await R.until(`!!document.querySelector('a.btn[href^="#/doc/d_rv_"]')`, 4000)) throw new Error('no review note link');
      await R.click({ sel: '.mr-nav a', text: 'Next month' }, { ms: 500 });
      await R.sleep(1100);
      await R.click({ sel: 'a.btn', text: 'Open the review note' }, { ms: 500 });
      if (!await R.until(`typeof DocView !== 'undefined' && String(DocView.docId).startsWith('d_rv_') && !!document.querySelector('.box')`, 6000)) throw new Error('the review note did not open');
      await R.sleep(1800);
    }],
  ],
};
