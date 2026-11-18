// Plates & wells (13e) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs plates
// The planning note and the run note of one experiment are made in `setup` with the app's own CHAIN.create / CHAIN.advance.
const box = id => `.box[data-id="${id}"]`;
const K = (R, t, o = {}) => R.click(t, Object.assign({ ms: 380, rest: 80, after: 220 }, o));
const well = id => `.box .wplate .well[data-well="${id}"]`;
export default {
  by: '',
  use: 'Plan a well plate in colours and carry it into the run, where each well takes its images and notes.',
  view: [1040, 650],
  server: true,   // images are written to the app's own (temporary) notebook folder, so no “kept in this browser” notice
  pause: 450,
  crf: 31,
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = CHAIN.create({ projectId: P.id, name: 'EGF dose series' });
    KIT.fill(KIT.first(A), 'Plan', 'Which wells get which EGF dose, before the run on the 24-well plate.', 'method');
    CHAIN.advance(A);
    const B = CHAIN.members(A).find(d => d.id !== A.id);
    KIT.fill(KIT.first(B), 'Run', 'Seeded at 09:30, EGF added at 11:00. Imaging every 15 minutes.', 'method');
    KIT.done(); return { A: A.id, B: B.id, a: KIT.first(A).id, b: KIT.first(B).id };
  },
  before: async (R, c) => { await R.open(c.A);
    await R.ev(`const P = DocView.paper, b = M.block(${JSON.stringify(c.a)}), z = .7; P.stop(); Object.assign(P.view, { z, x: 40 - b.x * z, y: 84 - (b.y - 20) * z }); P.apply(); return 1`);
    await R.sleep(400); await R.move([880, 580], 0); },
  steps: [
    ['Planning note: Insert… → Well plate, set it to 24 wells, drag down a column, pick a colour and name it in the legend', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.a)}').getBoundingClientRect(); return { x: r.right + 40, y: r.top + 4 }; })()` });
      await K(R,{ sel: '.pop .op', text: 'Insert…' });
      await R.type('well plate', 30);
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.box .wplate')`, 5000)) throw new Error('no plate');
      await R.sleep(300);
      await K(R,{ js: `document.querySelector('.box .wfmt')` }, { ms: 350, after: 250 });
      await R.key('ArrowUp'); await R.key('ArrowUp'); await R.key('Enter');
      if (!await R.until(`document.querySelectorAll('.box .wplate .well').length === 24`, 4000)) throw new Error('not 24 wells');
      await R.sleep(300);
      await R.drag({ js: `document.querySelector('${well('A1')}')` }, { js: `document.querySelector('${well('D1')}')` }, { ms: 600, after: 300 });
      if (!await R.until(`!!document.querySelector('.wselbar .swatch')`, 3000)) throw new Error('no colours');
      await K(R,{ js: `document.querySelector('.wselbar .swatch[title="#4361EE"]')` });
      if (!await R.until(`!!document.querySelector('.wlegend input')`, 3000)) throw new Error('no legend');
      await K(R,{ js: `document.querySelector('.wlegend input')` });
      await R.type('10 ng/mL EGF', 35);
      await R.key('Enter');
      await R.sleep(600);
    }],
    ['Click a well and write its note: what goes in it', async (R, c) => {
      await K(R,{ js: `document.querySelector('${well('A1')}')` });
      if (!await R.until(`!!document.querySelector('.wellpop textarea')`, 4000)) throw new Error('well did not open');
      await R.sleep(500);
      await K(R,{ js: `document.querySelector('.wellpop textarea')` });
      await R.type('MCF10A sheet, 8 kPa gel, EGF added', 35);
      await R.key('Escape');
      await R.sleep(500);
      await R.key('Escape');
      await R.sleep(900);
    }],
    ['Run note: Insert… → Well plate from the plan…, and choose the plate: colours, legend and notes come with it', async (R, c) => {
      await R.ev(`App.go('#/doc/' + ${JSON.stringify(c.B)}); return 1`);
      if (!await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${JSON.stringify(c.B)} && !!document.querySelector('.box')`, 8000)) throw new Error('run note did not open');
      await R.sleep(600);
      await R.ev(`const P = DocView.paper, b = M.block(${JSON.stringify(c.b)}), z = .7; P.stop(); Object.assign(P.view, { z, x: 40 - b.x * z, y: 84 - (b.y - 20) * z }); P.apply(); return 1`);
      await R.sleep(500);
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.b)}').getBoundingClientRect(); return { x: r.right + 40, y: r.top + 4 }; })()` });
      await K(R,{ sel: '.pop .op', text: 'Insert…' });
      await R.type('well plate from', 30);
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.modal .opt, .modal [class*=opt]')`, 4000)) throw new Error('no plate list');
      await R.sleep(600);
      await K(R,{ js: `[...document.querySelectorAll('.modal *')].filter(e => e.getClientRects().length && e.textContent.includes('24-well') && e.children.length < 8).sort((a, b) => a.textContent.length - b.textContent.length)[0]` });
      if (!await R.until(`!!document.querySelector('.box .wplate .well')`, 4000)) throw new Error('plate not carried');
      await R.sleep(1500);
    }],
    ['Shift+click a well → Image / video… to put an image in it; click the well to open it with its note and the plan’s', async (R, c) => {
      await R.hold('Shift');
      await K(R,{ js: `document.querySelector('${well('A1')}')` });
      await R.release('Shift');
      if (!await R.until(`!!document.querySelector('.wselbar')`, 3000)) throw new Error('well not selected');
      await R.sleep(300);
      await R.files(['assets/micrograph-1.jpg'], () => K(R,{ js: `[...document.querySelectorAll('.wselbar .wbtn')].find(b => b.textContent.startsWith('Image'))` }));
      if (!await R.until(`!!document.querySelector('.cropper')`, 5000)) throw new Error('no placing window');
      await R.sleep(700);
      await K(R,{ sel: '.modal .btn', text: 'Place' });
      await R.sleep(500);
      await K(R,{ js: `[...document.querySelectorAll('.box .wtool .seg button')].find(b => b.textContent === 'Image')` });
      await R.sleep(900);
      await K(R,{ js: `document.querySelector('${well('A1')}')` });
      if (!await R.until(`!!document.querySelector('.wellpop .wfull, .wellpop img')`, 4000)) throw new Error('well did not open');
      await R.sleep(2200);
    }],
  ],
};
