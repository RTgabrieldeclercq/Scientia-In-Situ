// Synthesis notes (15e, V4.16) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs synthnotes
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For one place where a series’ runs add up: every run’s Analysis leads to the same Synthesis, where you write what they add up to, and the Portfolio lists it above the notes with that sentence under each note.',
  view: [1040, 650],
  // the test notes: "30 kPa series", Run 1 and 2 through to the Synthesis, and Run 3 at its Analysis
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const A = { projectId: P.id, themeId: T.id };
    const more = (d, n) => { for (let i = 0; i < n; i++) { CHAIN.advance(d); d = CHAIN.nextOf(d); } return d; };
    const r1 = CHAIN.create(Object.assign({ name: '30 kPa series', date: KIT.day(14) }, A));
    KIT.fill(KIT.first(r1), 'Plan', 'Beads at the leading edge of 30 kPa gels, image every 10 min.');
    const syn = more(r1, 3);
    const s = CHAIN.seriesIn(P.id, T.id)[0]; CHAIN.openSeries(s);
    const nx = CHAIN.nextRun(s), r2 = CHAIN.create(Object.assign({ name: nx.name, date: KIT.day(7), series: s.id, run: nx.run }, A));
    KIT.fill(KIT.first(r2), 'Plan', 'Same gels, fibronectin at 5 µg/mL.');
    more(r2, 3);
    const s2 = CHAIN.seriesIn(P.id, T.id)[0], n3 = CHAIN.nextRun(s2), r3 = CHAIN.create(Object.assign({ name: n3.name, date: KIT.day(1), series: s2.id, run: n3.run }, A));
    KIT.fill(KIT.first(r3), 'Plan', 'Same gels, 12 µg/mL.');
    const an = more(r3, 2);
    KIT.fill(KIT.first(an), 'Peak at the edge', 'Traction peaks 20 µm in from the edge, 3.1 kPa, a little higher than Run 2.');
    KIT.done(); return { P: P.id, T: T.id, an: an.id };
  },
  before: async (R, c) => { await R.open(c.an); },
  steps: [
    ['In Run 3’s Analysis, Next opens the series’ Synthesis: the one Runs 1 and 2 already share', async (R, c) => {
      await R.click('.nextbtn', q);
      await R.until(`typeof DocView !== 'undefined' && DocView.docId !== ${JSON.stringify(c.an)} && !!document.querySelector('.hsynth')`, 6000);
      await R.sleep(2200);
    }],
    ['Write what the runs add up to, in the Synthesis’ own box', async (R, c) => {
      await R.click('.hsynth .synth-in', q);
      await R.type('Traction peaks 20 µm in from the edge on 30 kPa gels, in all three runs: 2.9, 3.0 and 3.1 kPa.', 42);
      await R.sleep(1200);
    }],
    ['The Portfolio lists it under Syntheses, above the notes, with its sentence under it', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' }, q);
      await R.sleep(1800);
      await R.wheel(520, [1000, 560]);
      await R.sleep(1800);
    }],
  ],
};
