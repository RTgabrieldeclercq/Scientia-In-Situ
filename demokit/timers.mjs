// Timers (timers) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs timers
export default {
  by: '',
  use: 'Time a note as you work and say which component the time belongs to.',
  view: [1040, 650],
  // the test note: a run note with three steps as components, in a column at the left
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const [coat, seed, img] = KIT.grid(A, [
      ['Coat the gels', 'Fibronectin at 5 µg/mL on 30 kPa gels, one hour at 37 °C.'],
      ['Seed the cells', 'MCF10A sheets, 60 000 cells per gel, left to settle.'],
      ['Image the edge', 'Leading edge, 20× every 5 min; beads before and after trypsin.'],
    ], { cols: 1, dy: 150 });
    KIT.done(); return { A: A.id, coat: coat.id, seed: seed.id, img: img.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.wheel(260, [700, 400]); },
  steps: [
    ['Press Timer in the tools: a dashed timer box appears, waiting to be told what it times', async (R, c) => {
      await R.click('.lab-pill-tools .lab-pill-btn');
      await R.click({ js: `[...document.querySelectorAll('.lab-pill-tools .lab-fan-item')].find(e => /Start this note/.test(e.title))` });
      await R.until(`!!document.querySelector('.tc')`, 4000);
      await R.click('.lab-pill-tools .lab-pill-btn');   // fold the wheel away again
      await R.sleep(1100);
    }],
    ['Drag the timer box’s dot to the component it is timing', async (R, c) => {
      c.tb = await R.ev(`return document.querySelector('.box.w-timer').dataset.id`);
      await R.drag({ sel: `.box[data-id="${c.tb}"] .port` }, { sel: `.box[data-id="${c.seed}"] .ed`, dx: .7, dy: .5 }, { ms: 1300 });
      await R.until(`!!document.querySelector('.tc-tag')`, 3000);
      await R.sleep(1200);
    }],
    ['Go to another tab: the floating card follows, still counting', async (R, c) => {
      await R.click({ sel: '#tabs *', text: 'Portfolio' });
      await R.until(`!!document.querySelector('.td-card')`, 3000);
      await R.move('.td-card');
      await R.sleep(1500);
    }],
    ['Complete it from the card: the time is logged on that component', async (R, c) => {
      await R.click('.td-card .td-b.ok');
      await R.go('#/doc/' + c.A);
      await R.ev(`document.querySelector('.box[data-id="${c.seed}"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(2000);
    }],
    ['Start the next timer with a head start of 20 minutes, for time that already went by', async (R, c) => {
      if (!await R.ev(`return !!document.querySelector('.lab-pill-tools .lab-fan-item')`)) await R.click('.lab-pill-tools .lab-pill-btn');
      await R.until(`!!document.querySelector('.lab-pill-tools .lab-fan-item')`, 3000);
      await R.click({ js: `[...document.querySelectorAll('.lab-pill-tools .lab-fan-item')].find(e => /head start/.test(e.title))` });
      await R.until(`!!document.querySelector('.modal input')`, 3000);
      await R.type('20', 120);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.tc')`, 3000);
      await R.sleep(2200);
    }],
  ],
};
