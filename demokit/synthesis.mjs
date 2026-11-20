// Synthesis box (synthesis) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs synthesis
export default {
  by: '',
  use: 'The one or two sentences you would tell your advisor, kept at the top of every note.',
  view: [1280, 800], dpr: 1,
  // the test notes: a run note with three components and an empty synthesis box, and a daily note to put the run's card in
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Fibronectin series', 'Does the coating change where the sheet pulls?');
    const run = KIT.note(P, 'Run 3', { themeId: T.id }), day = KIT.note(P, 'Daily · {today}', { themeId: T.id });
    KIT.grid(run, [['Gels', 'Gel batch 14, 30 kPa, coated at 5 µg/mL fibronectin.'], ['Seeding', 'MDCK seeded at 40k/cm², sheet closed after 4 h.'], ['Imaging', 'Beads drift under 0.2 µm over the 40 min run; peak traction at the sheet edge.']], { cols: 1, dy: 150 });
    KIT.fill(KIT.first(day), 'Today', 'Gels for run 4 poured, 30 kPa.');
    KIT.done(); return { run: run.id, day: day.id };
  },
  before: async (R, c) => { await R.open(c.run); await R.move([900, 380], 0); },
  steps: [
    ['In the note’s first box, write what the note adds up to: two sentences, saved as you type', async (R, c) => {
      await R.click('.hsynth .synth-in');
      await R.type('Traction peaks at the sheet edge on 5 µg/mL fibronectin. ', 45);
      await R.type('Bead drift stayed under 0.2 µm, so the run can be trusted.', 45);
      await R.sleep(1200);
    }],
    ['Open the Portfolio: under the note’s row, in small text, are the sentences', async (R, c) => {
      await R.click('#tabs .tab[data-k="portfolio"]');
      if (!await R.until(`!!document.querySelector('.pf-leg')`, 5000)) throw new Error('no synthesis line in the Portfolio');
      await R.move({ sel: '.pf-leg' });
      await R.sleep(3000);
    }],
    ['Insert → A note… in another note: its card carries the synthesis there too', async (R, c) => {
      await R.open(c.day);
      await R.rclick([820, 170]);
      await R.click({ sel: '.pop .op', text: 'Insert' });
      await R.until(`!!document.querySelector('.pop input, .pop .search')`, 3000);
      await R.type('A note');
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal input')`, 3000);
      await R.type('Run 3', 60);
      await R.click({ sel: '.modal div', text: 'Traction on soft gels › Fibronectin series › Run 3' });
      await R.until(`[...document.querySelectorAll('.modal div')].some(b => b.textContent.includes('Just the note'))`, 3000);
      await R.sleep(500);
      await R.click({ sel: '.modal div', text: 'Just the note' });
      await R.until(`!!document.querySelector('.box .nr-syn')`, 3000);
      await R.sleep(1800);
    }],
  ],
};
