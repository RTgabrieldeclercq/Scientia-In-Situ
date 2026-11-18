// Pen & touch shortcuts (13zm, 13zz2, 13zzh) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pen
// The pen and the fingers are imitated. The Slim Pen's tail button is hardware the recorder cannot press: it is not shown.
const rect = id => `(() => { const r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; })()`;
// the hand pill (bottom right) holds Move, Pen, Highlighter, Lasso; choosing Pen brings the pen's bar, with the same tools and the eraser
const hand = async (R, name) => {
  if (!await R.ev(`const p = document.querySelector('.lab-pill-hand'); return !!p && p.classList.contains('open')`)) { await R.click('.lab-pill-hand .lab-pill-btn'); await R.sleep(600); }
  await R.click({ sel: `.lab-pill-hand .lab-fan-item[title^="${name}"]` }); await R.sleep(500);
};
// slide the paper (looking, not doing) so a component's right edge sits at x, its top at y
const place = (R, id, x, y) => R.ev(`const P = App.panes()[0].paper, r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(), dx = ${x} - r.right, dy = ${y} - r.top; for (let i = 1; i <= 14; i++) { P.view.x += dx / 14; P.view.y += dy / 14; P.apply(); await new Promise(q => setTimeout(q, 26)); } return 1`);
const squiggle = (x, y, n = 5, w = 26, h = 16) => Array.from({ length: n * 2 + 1 }, (_, i) => [x + i * w / 2, y + (i % 2 ? -h : h) * (i ? 1 : 0)]);
export default {
  by: '',
  use: 'What each pen button and finger tap does, so the pen never has to leave the page.',
  view: [1100, 760],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Gel batch 14');
    const a = KIT.fill(KIT.first(A), 'Recipe', 'Acrylamide 150 µL, bis 100 µL: 30 kPa.'); a.w = 280; DB.put('blocks', a);
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await hand(R, 'Pen'); await R.sleep(1300); await place(R, c.a, 620, 230); await R.sleep(400);   // the pen brings the note closer (200 %)
    const a = await R.ev(`return ${rect(c.a)}`); c.o = { x: a.r + 70, y: a.t + 60 };
    await R.pen(squiggle(c.o.x, c.o.y), { ms: 8 }); await R.pen(squiggle(c.o.x + 170, c.o.y, 4), { ms: 8 }); await R.sleep(500);
    await R.move([c.o.x + 150, c.o.y + 170], 0);
  },
  steps: [
    ['Hold the pen’s barrel button and loop round ink: it is a lasso, whatever tool is on', async (R, c) => {
      const o = c.o;
      await R.pen([[o.x - 20, o.y - 40], [o.x + 150, o.y - 44], [o.x + 156, o.y + 40], [o.x - 24, o.y + 42], [o.x - 20, o.y - 40]], { ms: 13, barrel: true });
      await R.sleep(1700);
    }],
    ['Turn the pen over: its back erases what it passes', async (R, c) => {
      const o = c.o;
      await R.key('Escape');   // lets the lasso's selection go
      await R.pen([[o.x + 160, o.y - 30], [o.x + 220, o.y + 4], [o.x + 290, o.y + 26]], { ms: 16, eraser: true });
      await R.sleep(1300);
    }],
    ['Two fingers tapped on the paper undo; three redo', async (R, c) => {
      const o = c.o, x = o.x + 60, y = o.y + 150;
      await R.move([x + 120, y + 60]);
      await R.touch([[x, y], [x + 95, y + 10]]);
      await R.sleep(1300);
      await R.touch([[x, y], [x + 95, y + 10], [x + 190, y - 6]]);
      await R.sleep(1300);
    }],
    ['With the mouse, a right-drag loop makes a region. P goes back to the Move hand', async (R, c) => {
      const a = await R.ev(`return ${rect(c.a)}`);
      await R.drag([a.l - 22, a.t - 22], [a.l - 22, a.t - 10], { button: 'right', via: [[a.r + 22, a.t - 24], [a.r + 24, a.b + 22], [a.l - 24, a.b + 24]], viaMs: 520, ms: 420 });
      await R.sleep(700);
      await R.click({ text: 'Make a region', sel: 'button' });   // with the pen out, the loop asks what it is for
      await R.sleep(1300);
      await R.key('p');
      await R.sleep(1800);
    }],
  ],
};
