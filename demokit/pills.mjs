// Pills (lab-mode §11 cut into vendor/lab-pills.js; 20c-pillcanvas.js) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pills
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Put the note’s tools where your hand is: drag a pill to the side you hold the tablet by and it docks as a column, and the layout is the same in every note.',
  view: [1040, 650],
  // the test note: a plain note with a few components
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · 30 kPa');
    const [a] = KIT.grid(A, [
      ['Coating', 'Fibronectin at 5 µg/mL on 30 kPa gels, one hour at 37 °C.'],
      ['Seeding', 'MCF10A sheets, 60 000 cells per gel, left to settle.'],
      ['Imaging', 'Leading edge, 20× every 5 min; beads before and after trypsin.'],
      ['Question', 'Does the edge peak hold at low ligand?', 'question'],
    ]);
    KIT.done(); return { A: A.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.wheel(120, [700, 380]); },
  steps: [
    ['The ✦ tools pill sits top right. Drag it to the left edge and open it: against a side its tools stand in a column, and it stays docked', async (R, c) => {
      await R.move({ sel: '.lab-pill-tools .lab-pill-btn' });
      await R.sleep(500);
      await R.drag({ sel: '.lab-pill-tools .lab-pill-btn' }, [24, 330], { ms: 1300, hold: 300 });
      if (!await R.until(`document.querySelector('.lab-pill-tools') && document.querySelector('.lab-pill-tools').dataset.orient === 'v'`, 3000)) throw new Error('the tools pill did not turn to a column');
      await R.move([620, 470], 500);
      await R.sleep(600);
      await K(R, '.lab-pill-tools .lab-pill-btn');   // open it: its tools stand in a column against the edge
      if (!await R.until(`!!document.querySelector('.lab-pill-tools .lab-fan-item')`, 3000)) throw new Error('the tools did not open');
      await R.move([620, 470], 500);
      await R.until(`!!document.querySelector('.lab-pill-tools.docked')`, 6000);   // left open, it settles as a column
      await R.sleep(1500);
    }],
    ['The ＋ Quick cast opens as before; the column stays where you put it', async (R, c) => {
      await K(R, '.lab-pill-insert .lab-pill-btn');
      if (!await R.until(`!!document.querySelector('.lab-fan-item')`, 3000)) throw new Error('the Quick cast did not open');
      await R.sleep(2600);
    }],
    ['The layout is also placed in Settings → Pills: click the ✎ hand pill and its column becomes a row', async (R, c) => {
      await R.go('#/settings/feature/pills');
      if (!await R.until(`!!document.querySelector('.pcv-pill[data-pill="hand"]')`, 6000)) throw new Error('the pill canvas is not on the page');
      await R.ev(`document.querySelector('.pcv').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1500);
      await K(R, '.pcv-pill[data-pill="hand"]');
      await R.move([520, 120], 500);
      await R.sleep(2200);
    }],
  ],
};
