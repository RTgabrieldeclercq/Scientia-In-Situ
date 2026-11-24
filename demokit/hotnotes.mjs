// Hot notes (20e, V4.50 / V4.92) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs hotnotes
export default {
  by: 'Gabe',
  use: 'Keep the notes you open most one click away. The Hot notes button, at the right of the tabs, starts by suggesting your most visited notes; star the ones you want and they sit in the tab row beside the button, each lit in its kind’s colour.',
  view: [1280, 800],
  dpr: 1,   // the tab row is wide
  // the test notes: five notes of different kinds that have been opened a different number of times (the app's own visit count, HOT.visit), none starred yet
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const mk = (title, type, n, label, text, visits) => { const d = KIT.note(P, title, { type, themeId: T.id, daysAgo: n }); KIT.fill(KIT.first(d), label, text); for (let i = 0; i < visits; i++) HOT.visit(d.id); return d; };
    const R3 = mk('Run 3 · 30 kPa', 'experiment', 3, 'Setup', 'Gel batch 15, 30 kPa, coated at 5 µg/mL fibronectin.', 14);
    const FS = mk('Fibronectin series', 'experiment', 8, 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.', 9);
    const SY = mk('Synthesis · traction against stiffness', 'reflection', 1, 'What the runs add up to', 'Traction peaks at the sheet edge and grows with stiffness.', 7);
    const GB = mk('Gel batch 14', 'note', 6, 'Stiffness', 'Measured 8.4 ± 0.6 kPa on the rheometer.', 4);
    mk('Seeding density notes', 'note', 5, 'Densities', 'Seeded at 2, 4 and 8 × 10⁴ cells per cm².', 2);
    KIT.done(); return { R3: R3.id, FS: FS.id, SY: SY.id, GB: GB.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.until(`!!document.querySelector('#hotbtn')`, 6000); await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0); },
  steps: [
    ['The Hot notes button at the right of the tabs: it starts with your most visited notes', async (R, c) => {
      await R.click('#hotbtn', { ms: 800 });
      if (!await R.until(`!!document.querySelector('.hn-pop .hn-sug .hn-row')`, 4000)) throw new Error('no suggestions');
      await R.sleep(2000);
    }],
    ['Star two of them: the empty star on a row adds the note', async (R, c) => {
      for (const id of [c.R3, c.SY]) {
        await R.move({ sel: `.hn-pop .hn-row[data-id="${id}"]` }, 700);
        await R.sleep(900);
        await R.click({ sel: `.hn-pop .hn-row[data-id="${id}"] .hn-star` }, { ms: 500 });
        await R.until(`!document.querySelector('.toast')`, 6000);
        await R.sleep(500);
      }
      await R.sleep(800);
    }],
    ['They now sit in the tab row beside the button, each in its kind’s colour', async (R, c) => {
      await R.key('Escape');
      await R.until(`!document.querySelector('.hn-pop')`, 3000);
      await R.move([640, 420], 700);
      if (!await R.until(`document.querySelectorAll('#hotstrip .hn-tab').length === 2`, 3000)) throw new Error('no tabs in the row');
      await R.sleep(1800);
    }],
    ['Click one: its note opens, and its tab is lit while you are in it', async (R, c) => {
      await R.click({ sel: `#hotstrip .hn-tab[data-id="${c.R3}"]` }, { ms: 800 });
      if (!await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${JSON.stringify(c.R3)}`, 6000)) throw new Error('the note did not open');
      await R.sleep(2200);
    }],
  ],
};
