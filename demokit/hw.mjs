// Handwriting to text (13zf INK.convert, winink.py) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs hw
// Needs the app's own server (Windows reads the ink): the recorder runs it on an empty temporary notebook folder (server: true).
// The handwriting is imitated pen strokes in block capitals, written before the take starts.
const L = {   // strokes per letter, in a box 0…0.7 wide, 0…1 high
  E: [[[.6, 0], [0, 0], [0, 1], [.6, 1]], [[0, .5], [.48, .5]]],
  D: [[[0, 0], [0, 1]], [[0, 0], [.32, .04], [.6, .3], [.6, .7], [.32, .96], [0, 1]]],
  G: [[[.64, .2], [.46, .03], [.22, .02], [.02, .28], [.02, .72], [.22, .98], [.46, .97], [.64, .8], [.64, .55], [.36, .55]]],
  H: [[[0, 0], [0, 1]], [[.6, 0], [.6, 1]], [[0, .5], [.6, .5]]],
  L: [[[0, 0], [0, 1], [.55, 1]]],
};
const word = (text, x, y, h = 46) => { const out = []; let cx = x; for (const ch of text) { if (ch === ' ') { cx += h * 1.15; continue; } for (const s of L[ch]) out.push(s.map(([a, b]) => [cx + a * h, y + b * h])); cx += h * .95; } return out; };
const tool = t => ({ sel: `.ink-bar .ib-t[title^="${t}"]` });
// the hand pill (bottom right) holds Move, Pen, Highlighter, Lasso; choosing Pen brings the pen's bar, with the same tools and the eraser
const hand = async (R, name) => {
  if (!await R.ev(`const p = document.querySelector('.lab-pill-hand'); return !!p && p.classList.contains('open')`)) { await R.click('.lab-pill-hand .lab-pill-btn'); await R.sleep(600); }
  await R.click({ sel: `.lab-pill-hand .lab-fan-item[title^="${name}"]` }); await R.sleep(500);
};
// slide the paper (looking, not doing) so a component's right edge sits at x, its top at y
const place = (R, id, x, y) => R.ev(`const P = App.panes()[0].paper, r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(), dx = ${x} - r.right, dy = ${y} - r.top; for (let i = 1; i <= 14; i++) { P.view.x += dx / 14; P.view.y += dy / 14; P.apply(); await new Promise(q => setTimeout(q, 26)); } return 1`);
export default {
  by: '',
  use: 'Turn what you wrote with the pen into typed text, and keep the ink.',
  view: [1040, 650], server: true,
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · bench');
    const a = KIT.fill(KIT.first(A), 'Imaging', 'Field 2, 10 µg/mL, 30 kPa.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await hand(R, 'Pen'); await R.sleep(1300); await place(R, c.a, 300, 210); await R.sleep(400);
    c.o = await R.ev(`const r = document.querySelector('.box[data-id="${c.a}"]').getBoundingClientRect(); return { x: r.right + 60, y: r.top + 20 }`);
    for (const s of word('EDGE HELD', c.o.x, c.o.y)) await R.pen(s, { ms: 7, after: 120 });
    await R.sleep(800); await R.move([c.o.x + 200, c.o.y + 150], 0);
  },
  steps: [
    ['A line written with the pen. Lasso it and choose Convert to text', async (R, c) => {
      const o = c.o;
      await R.sleep(1200);
      await R.click(tool('Lasso'));
      await R.pen([[o.x - 16, o.y - 18], [o.x + 450, o.y - 22], [o.x + 458, o.y + 70], [o.x - 20, o.y + 74], [o.x - 16, o.y - 18]], { ms: 11 });
      await R.sleep(900);
      await R.click({ text: 'Convert to text', sel: 'button' });
    }],
    ['Windows reads it on this computer: the ink is now a text component in the same place', async (R, c) => {
      await R.until(`[...document.querySelectorAll('.box .ed')].some(e => /edge/i.test(e.textContent))`, 20000);
      await R.sleep(2600);
    }],
    ['The ink is kept: the component’s menu shows the handwriting again', async (R, c) => {
      const box = `[...document.querySelectorAll('.box')].find(b => /edge/i.test((b.querySelector('.ed') || {}).textContent || ''))`;
      await R.move({ js: box, dx: .5, dy: .6 });
      await R.click({ js: `${box}.querySelector('.bmore')` });
      await R.sleep(700);
      await R.click({ sel: '.pop .op', text: 'handwriting' });
      await R.sleep(2800);
    }],
  ],
};
