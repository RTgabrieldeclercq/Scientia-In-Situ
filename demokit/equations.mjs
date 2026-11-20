// Equations (13n, 13h) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs equations
// zoom the paper so the equation and its solver stand whole, clear of the pills at the foot and the head (the solver grows when it shows the rearrangement, so room is left for it)
const FIT = `const sv = document.querySelector('.box .csolve').closest('.box'), eq = document.querySelector('.eqbox').closest('.box'), a = DocView.rectOf(sv.dataset.id), b = DocView.rectOf(eq.dataset.id), P = DocView.paper, r = P.rect();
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x + a.w, b.x + b.w), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y + a.h, b.y + b.h);
  const z = Math.min(1, (r.width - 100) / (x1 - x0), (r.height - 110) / (y1 - y0)); P.centerOn((x0 + x1) / 2, y0 + (r.height / 2 - 24) / z, z); return z`;
const box = id => `.box[data-id="${id}"]`;
// bring a component to a height in the window by scrolling the paper (the pointer on empty paper left of it)
const lift = async (R, id, y) => { for (let i = 0; i < 4; i++) { const r = await R.ev(`const r = document.querySelector('${box(id)}').getBoundingClientRect(); return { l: r.left, t: r.top }`); if (Math.abs(r.t - y) < 5) return; await R.wheel(r.t - y, [Math.max(20, r.l - 40), 330]); } };
export default {
  by: '',
  use: 'Write an equation properly, name its terms, share it across notes and solve it.',
  view: [1040, 650],
  pause: 450,
  // the test note: an analysis note with one line of context, and a second note that will use the same equation
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), A = KIT.note(P, 'Analysis: Run 3'), B = KIT.note(P, 'Gel batch 14');
    const a = KIT.fill(KIT.first(A), 'Stiffness', 'Gel modulus from the shear measurement; E for the traction calculation.', 'method');
    KIT.fill(KIT.first(B), 'Batch 14', 'Poured 12 Nov, 30 kPa target.');
    KIT.done(); return { A: A.id, B: B.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); await lift(R, c.a, 92); await R.move([700, 330], 0); },
  steps: [
    ['Insert → Equation: type E = 3G(1 + ν), then name each term and its unit in the legend', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.a)}').getBoundingClientRect(); return { x: Math.max(24, r.left - 60), y: r.bottom + 30 }; })()` });
      await R.click({ sel: '.pop .op', text: 'Insert…' });
      await R.type('equation', 30);
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.modal math-field, .modal .meq')`, 6000)) throw new Error('no equation editor');
      await R.sleep(300);
      await R.click('.modal .meq', { ms: 300 });
      await R.type('E=3G(1+nu', 45);
      await R.sleep(500);
      await R.click({ sel: '.modal .btn', text: 'Done' }, { ms: 300 });
      if (!await R.until(`document.querySelectorAll('.eqbox .eqleg tr').length >= 3`, 5000)) throw new Error('no legend');
      await R.sleep(300);
      const names = ['Young’s modulus', 'shear modulus', 'Poisson ratio'], units = ['Pa', 'Pa', '–'];
      for (let i = 0; i < 3; i++) {
        await R.click({ js: `document.querySelectorAll('.eqbox .eqleg tr')[${i}].querySelectorAll('input')[0]` }, { ms: 240, rest: 60, after: 100 });
        await R.type(names[i], 12); await R.key('Enter', { after: 150 });
        if (units[i]) { await R.click({ js: `document.querySelectorAll('.eqbox .eqleg tr')[${i}].querySelectorAll('input')[1]` }, { ms: 240, rest: 60, after: 100 }); await R.type(units[i], 25); await R.key('Enter', { after: 150 }); }
      }
      await R.sleep(800);
    }],
    ['Register… and name it: it joins the registry, where any note can insert it and follow the one copy', async (R, c) => {
      await R.click({ js: `[...document.querySelectorAll('.box button')].find(b => b.textContent.includes('Register'))` });
      if (!await R.until(`!!document.querySelector('.modal input, .modal textarea')`, 4000)) throw new Error('no name box');
      await R.sleep(300);
      await R.type('Gel stiffness', 25);
      await R.key('Enter');
      await R.sleep(1200);
    }],
    ['Solve in calculator: type the shear modulus G and ν, and E is worked out', async (R, c) => {
      await R.click({ js: `[...document.querySelectorAll('.box button')].find(b => b.textContent.includes('Solve'))` });
      if (!await R.until(`!!document.querySelector('.csolve .cs-in')`, 5000)) throw new Error('no solver');
      // the two boxes, whole in the window: the paper zoomed out to hold the equation and its solver together
      await R.ev(FIT);
      await R.sleep(1100);
      const field = k => ({ js: `[...document.querySelectorAll('.csolve .cs-in')].find(i => i.getAttribute('aria-label') === ${JSON.stringify(k)})` });
      const keys = await R.ev(`return [...document.querySelectorAll('.csolve .cs-in')].map(i => i.getAttribute('aria-label'))`);
      const kG = keys.find(k => /^G/.test(k)), kN = keys.find(k => !/^[EG]/.test(k));
      await R.click(field(kG), { ms: 300 }); await R.type('4000', 45);
      await R.click(field(kN), { ms: 220 }); await R.type('0.3', 50);
      await R.sleep(1200);
    }],
    ['Rearrange for G: the equation solved for the shear modulus', async (R, c) => {
      await R.click('.csolve select', { ms: 350 });
      await R.key('ArrowDown'); await R.key('ArrowDown'); await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.cs-ro')`, 4000)) throw new Error('no rearrangement');
      await R.sleep(500);
      await R.ev(FIT);   // the solver is taller now
      await R.sleep(1300);
    }],
  ],
};
