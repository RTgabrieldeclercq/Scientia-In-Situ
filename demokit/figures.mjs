// Figures & decks (13x) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs figures
// Left out: slide decks (PowerPoint needs the desktop server).
const box = id => `.box[data-id="${id}"]`;
const K = (R, t, o = {}) => R.click(t, Object.assign({ ms: 400, rest: 90, after: 230 }, o));
const cell = i => `.box .fgbox .fg-cell[data-i="${i}"]`;
export default {
  by: '',
  use: 'Lay images out as a figure with letters and captions, and keep a slide deck in a note.',
  view: [1040, 650],
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), A = KIT.note(P, 'Analysis: Run 3');
    const a = KIT.fill(KIT.first(A), 'Bead images, Run 3', 'Four fields from the Run 3 bead tracking: one per stiffness, plus the unstrained reference.', 'method');
    KIT.done(); return { A: A.id, a: a.id };
  },
  pause: 700,
  before: async (R, c) => { await R.open(c.A);
    await R.ev(`const P = DocView.paper, b = M.block(${JSON.stringify(c.a)}), z = .68; P.stop(); Object.assign(P.view, { z, x: 40 - b.x * z, y: 92 - (b.y - 20) * z }); P.apply(); return 1`);
    await R.sleep(400); await R.move([880, 560], 0); },
  steps: [
    ['Right-click the paper → Insert… → Image panel, pick 2 × 2, and choose the four images: they fill the cells in order', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.a)}').getBoundingClientRect(); return { x: r.right + 40, y: r.top + 4 }; })()` });
      await K(R, { sel: '.pop .op', text: 'Insert…' });
      await R.type('image panel', 25);
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.modal .fg-preset')`, 5000)) throw new Error('no layout list');
      await R.sleep(500);
      await R.files([1, 2, 3, 4].map(n => `assets/micrograph-${n}.jpg`), () => K(R, { js: `[...document.querySelectorAll('.modal .fg-preset')].find(b => b.title === '2 × 2')` }));
      if (!await R.until(`document.querySelectorAll('.fgbox .fg-cell:not(.empty)').length === 4`, 8000)) throw new Error('the images did not arrive');
      await R.sleep(900);
    }],
    ['Click image B to crop it: drag the rectangle to keep, then Crop. The panel reflows to the new shape', async (R, c) => {
      await K(R, { js: `document.querySelector('${cell(1)}')` });
      if (!await R.until(`!!document.querySelector('.fgc-stage')`, 4000)) throw new Error('no crop window');
      await R.sleep(400);
      const at = (fx, fy) => ({ xy: `(() => { const r = document.querySelector('.fgc-stage').getBoundingClientRect(); return { x: r.left + r.width * ${fx}, y: r.top + r.height * ${fy} }; })()` });
      await R.drag(at(.12, .1), at(.78, .92), { ms: 700 });
      await R.sleep(500);
      await K(R, { sel: '.modal .btn', text: 'Crop' });
      await R.sleep(1000);
    }],
    ['Drag image A onto image D to swap them', async (R, c) => {
      await R.drag({ js: `document.querySelector('${cell(0)}')` }, { js: `document.querySelector('${cell(3)}')` }, { ms: 800 });
      await R.sleep(1100);
    }],
    ['Caption image B, then label it a result with + label', async (R, c) => {
      await K(R, { js: `document.querySelector('.box .fgbox .fg-col:nth-child(2) input.fg-cap')` });
      await R.type('B: 12 kPa field', 45);
      await R.key('Enter');
      await R.sleep(500);
      await R.move({ js: `document.querySelector('${cell(1)}')` });
      await R.sleep(300);
      await K(R, { js: `document.querySelector('${cell(1)} .fg-kind.add')` });
      await K(R, { sel: '.pop .op', text: 'Result' });
      await R.sleep(1200);
    }],
    ['⤢ maximises the figure: every image as large as the window allows', async (R, c) => {
      await K(R, { js: `[...document.querySelectorAll('.box .fg-bar button')].find(b => b.textContent === '⤢')` });
      if (!await R.until(`!!document.querySelector('.fg-max .fgbox')`, 4000)) throw new Error('not maximised');
      await R.sleep(1500);
    }],
  ],
};
