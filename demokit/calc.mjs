// Calculators (13f) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs calc
const box = id => `.box[data-id="${id}"]`;
// bring a component to a height in the window by scrolling the paper (the pointer on empty paper left of it)
const lift = async (R, id, y) => { for (let i = 0; i < 4; i++) { const r = await R.ev(`const r = document.querySelector('${box(id)}').getBoundingClientRect(); return { l: r.left, t: r.top }`); if (Math.abs(r.t - y) < 5) return; await R.wheel(r.t - y, [Math.max(20, r.l - 40), 330]); } };

export default {
  by: '',
  use: 'Do the bench arithmetic in the note and keep every line.',
  view: [1040, 650],
  // the test note: a run note with the stock and the wells it has to cover
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), A = KIT.note(P, 'Run 3');
    const a = KIT.fill(KIT.first(A), 'Coating', 'Fibronectin stock is 10 µg/mL, 1 mL left. Coat at 0.5 µg/mL, three gels.', 'method');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    // slide the paper left so that the note starts near the window's edge and the calculator, opened to its right, has room
    await R.ev(`const b = M.block(${JSON.stringify(c.a)}); DocView.paper.centerOn(b.x + 470, b.y + 190, 1); return 1`);
    await R.sleep(500);
    await lift(R, c.a, 132); await R.move([470, 330], 0);
  },
  steps: [
    ['Right-click the paper → Insert… → Calculator. Type dilute(10, 1, 0.5) and press Enter', async (R, c) => {
      // empty paper to the right of the component: the calculator lands where the menu was opened
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.a)}').getBoundingClientRect(); return { x: r.right + 70, y: r.top + 6 }; })()` });
      await R.click({ sel: '.pop .op', text: 'Insert…' });
      await R.type('calculator');
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.box .calc .cin')`, 5000)) throw new Error('no calculator');
      await R.sleep(500);
      await R.click('.box .calc .cin');
      await R.type('dilute(10, 1, 0.5)', 85);
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1100);
    }],
    ['The next line starts from the answer: × 3 for the three gels', async R => {
      await R.type('*3', 160);
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1200);
    }],
    ['Click the first line and change 0.5 to 0.25: the line after it is worked out again', async R => {
      await R.click({ js: `document.querySelector('.box .calc .chl .che')` });
      if (!await R.until(`!!document.querySelector('.box .calc .chin')`, 3000)) throw new Error('the line did not open');
      await R.key('Backspace', { after: 140 }); await R.key('Backspace', { after: 140 });
      await R.type('25)', 150);
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1500);
    }],
    ['Stats tab: sem(1.1, 1.3, 1.2). A click on an earlier result puts that value in the line being typed', async R => {
      await R.click({ js: `[...document.querySelectorAll('.box .ctabs button')].find(b => b.textContent === 'Stats')` });
      await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.box .calc .cpad .ck')].find(b => b.textContent === 'sem')` });
      await R.type('1.1, 1.3, 1.2', 85);
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1100);
      await R.click({ js: `document.querySelectorAll('.box .calc .chl .chv')[1]` });
      await R.sleep(1500);
    }],
  ],
};
