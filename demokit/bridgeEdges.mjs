// Circles at a note's edges (13zzv, V3.990) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs bridgeEdges
export default {
  by: '',
  use: 'From any note, see which notes it draws from and which it feeds, and step across.',
  view: [1040, 650],
  // the test notes: Run 3 draws from two notes (a recipe, a gel batch) and feeds one (its analysis)
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Seeding density notes'), G = KIT.note(P, 'Gel batch 14'), B = KIT.note(P, 'Run 3'), N = KIT.note(P, 'Analysis: Run 3');
    const rec = KIT.fill(KIT.first(A), 'Recipe', 'Seed at 40k/cm² on the 30 kPa gels; wait 4 h before imaging.', 'method');
    const gel = KIT.fill(KIT.first(G), 'Gel stiffness', 'Batch 14 measured at 29.6 kPa (AFM, three spots).', 'result');
    const plan = KIT.fill(KIT.first(B), 'Plan', 'Image the leading edge every 10 min for 6 h.');
    const res = KIT.box(B, 'Bead drift', 'Drift stayed under 0.4 µm over the 6 h run.', { x: plan.x, y: plan.y + 190, ck: 'result' });
    KIT.fill(KIT.first(N), 'Question', 'Does the traction peak at the edge hold on 30 kPa?');
    BRIDGE.make(rec, B, { why: 'The seeding this run followed', at: { x: plan.x + 460, y: plan.y - 20 } });
    BRIDGE.make(gel, B, { why: 'The gels it ran on', at: { x: plan.x + 460, y: plan.y + 190 } });
    BRIDGE.make(res, N, { why: 'The drift to correct for', at: { x: KIT.first(N).x + 460, y: KIT.first(N).y } });
    KIT.done(); return { A: A.id, G: G.id, B: B.id, N: N.id };
  },
  before: async (R, c) => { await R.open(c.B); },
  steps: [
    ['Run 3 draws on two notes: two circles in its left margin. It feeds one: a circle in the right margin', async (R, c) => {
      await R.until(`document.querySelectorAll('.bw-mk').length >= 3`, 5000);
      await R.sleep(2600);
    }],
    ['Point at a circle: the note’s name, and a thread to the component that comes from it', async (R, c) => {
      await R.move({ sel: `.bw-mk[data-doc="${c.A}"]` }, 1100);
      await R.until(`!!document.querySelector('.bw-mk:hover')`, 2000);
      await R.sleep(2200);
    }],
    ['Click it: you land on the bridged component in that note', async (R, c) => {
      await R.click({ sel: `.bw-mk[data-doc="${c.A}"]` });
      await R.until(`DocView.docId === ${JSON.stringify(c.A)}`, 6000);
      await R.sleep(1800);
    }],
    ['Alt+click the circle there: Run 3 opens beside, and both notes stay in view', async (R, c) => {
      await R.until(`!!document.querySelector('.bw-mk[data-doc="${c.B}"]')`, 4000);
      await R.move({ sel: `.bw-mk[data-doc="${c.B}"]` }, 1000);
      await R.sleep(700);
      await R.hold('Alt');
      await R.click({ sel: `.bw-mk[data-doc="${c.B}"]` });
      await R.release('Alt');
      await R.until(`App.panes().length > 1`, 6000);
      await R.sleep(2200);
    }],
  ],
};
