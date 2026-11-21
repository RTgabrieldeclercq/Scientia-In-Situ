// Experiment series (13c, V4.15) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs expseries
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For repeating an experiment with its runs kept together and numbered: the next run carries the series’ name, is counted as Run 3, and the Portfolio lists the runs side by side.',
  view: [1040, 650],
  // the test notes: "30 kPa series", Run 1 and Run 2, done some days ago
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const A = { projectId: P.id, themeId: T.id };
    const r1 = CHAIN.create(Object.assign({ name: '30 kPa series', date: KIT.day(14) }, A));
    KIT.fill(KIT.first(r1), 'Plan', 'Beads at the leading edge of 30 kPa gels, image every 10 min.');
    const s = CHAIN.seriesIn(P.id, T.id)[0]; CHAIN.openSeries(s);
    const nx = CHAIN.nextRun(s), r2 = CHAIN.create(Object.assign({ name: nx.name, date: KIT.day(7), series: s.id, run: nx.run }, A));
    KIT.fill(KIT.first(r2), 'Plan', 'Same gels, fibronectin at 5 µg/mL.');
    KIT.done(); return { P: P.id, T: T.id, r1: r1.id };
  },
  before: async (R, c) => { await R.go('#/theme/' + c.T); },
  steps: [
    ['+ Experiment → Continue a series: pick “30 kPa series”. The name stays, and “Run 3 of…” says where it goes', async (R, c) => {
      await R.click('#newexp', q);
      await R.until(`!!document.querySelector('.cs-ser')`, 4000);
      await R.sleep(900);
      await R.click('.cs-ser', q);
      await R.key('Escape');
      await R.key('ArrowDown');
      await R.until(`!!document.querySelector('.cs-hint') && /Run 3 of/.test(document.querySelector('.cs-hint').textContent)`, 3000);
      await R.sleep(1800);
    }],
    ['Create: the new note is Run 3, shown beside its title', async (R, c) => {
      await R.click({ sel: '.modal .btn.pri', text: 'Create' }, q);
      await R.until(`typeof DocView !== 'undefined' && !!document.querySelector('.box')`, 6000);
      await R.sleep(2200);
    }],
    ['The Portfolio shows the series: Run 1, 2 and 3 together', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' }, q);
      await R.sleep(2500);
    }],
  ],
};
