// Term bubbles (14e, V3.999) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs bubbles
export default {
  by: '',
  use: 'Open a term and see every place it is used with what surrounds it, each one a way into its note.',
  view: [1280, 940],
  dpr: 1,
  // the test notes: three notes that use "traction force", the term already marked, with wires between the components around it
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Daily · {today}'), B = KIT.note(P, 'Run 3', { daysAgo: 12 }), C = KIT.note(P, 'Fibronectin series', { daysAgo: 26 });
    const a0 = KIT.fill(KIT.first(A), 'Gel 30 kPa', 'Peak traction force on the 30 kPa gel fell after EGF, then came back.', 'result');
    const a1 = KIT.box(A, 'Next', 'Repeat on the 8 kPa gel before the weekend.', { x: a0.x + 460, y: a0.y });
    const a2 = KIT.box(A, 'Question', 'Is the drop real or bead drift?', { x: a0.x, y: a0.y + 170, ck: 'question' });
    const b0 = KIT.fill(KIT.first(B), 'Beads', 'Traction force looks low on the 30 kPa gel because the beads drift after 40 frames.'); KIT.ago(b0, 12, '14:20');
    const b1 = KIT.box(B, 'Batch', 'Gel batch 14 gave the traction force baseline.', { x: b0.x + 460, y: b0.y, daysAgo: 40, hm: '10:05' });
    const b2 = KIT.box(B, 'Fix', 'Re-register the frames to the first bead image.', { x: b0.x, y: b0.y + 170, daysAgo: 11, hm: '09:30' });
    const c0 = KIT.fill(KIT.first(C), 'Question', 'Does fibronectin change traction force on the 30 kPa gel?', 'question'); KIT.ago(c0, 26, '11:30');
    const c1 = KIT.box(C, 'Plan', 'Coat at 1, 5 and 10 µg/mL.', { x: c0.x + 460, y: c0.y, daysAgo: 26, hm: '11:40' });
    KIT.ago(a0, 0, '09:10');
    const t = M.findOrCreateTerm(P.id, 'traction force'); IX.rebuild(); TERMSCAN.all([t]);
    M.wire(a0.id, a1.id); M.wire(a2.id, a0.id, 'asks'); M.wire(b0.id, b2.id); M.wire(b1.id, b0.id); M.wire(c0.id, c1.id); M.wire(c0.id, b0.id);
    KIT.done(); return { A: A.id, a0: a0.id, b0: b0.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.until(`!document.querySelector('.toast')`, 6000); await R.move([640, 600], 0); },
  steps: [
    ['In a note, Ctrl+click a term: its page opens as bubbles, each a component with its neighbours round it', async (R, c) => {
      await R.hold('Control');
      await R.click({ sel: `.box[data-id="${c.a0}"] .tm` });
      await R.release('Control');
      if (!await R.until(`!!document.querySelector('.bb')`, 8000)) throw new Error('no bubbles');
      await R.move({ sel: '.tbb-ord span' }, 140);
      await R.sleep(2000);
    }],
    ['Switch the order from Note to Time: the oldest use first, each bubble dated', async (R, c) => {
      await R.click({ sel: '.tbb-ord .seg button', text: 'Time' });
      await R.sleep(2200);
    }],
    ['Rest the pointer on a bubble: a ring closes, and you are in that note, at that component', async (R, c) => {
      const run3 = { js: `[...document.querySelectorAll('.bb')].find(b => /beads drift/.test(b.textContent))`, dx: .5, dy: .88 };
      await R.move(run3);
      await R.move(Object.assign({}, run3, { dx: .56 }), 250).catch(() => { });
      if (!await R.until(`typeof DocView !== 'undefined' && !!DocView.docId && !!document.querySelector('.bb-back-b')`, 8000)) throw new Error('did not port in');
      await R.sleep(2200);
    }],
    ['The small bubble on the note brings you back to the term’s bubbles', async (R, c) => {
      await R.click('.bb-back-b');
      if (!await R.until(`!!document.querySelector('.bb')`, 6000)) throw new Error('did not come back');
      await R.move({ sel: '.tbb-ord span' }, 140);
      await R.sleep(1800);
    }],
  ],
};
