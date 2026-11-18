// Ink & shapes (13zf, 13zh) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs ink
// The pen is imitated (pen pointer events with pressure), so the strokes are steadier than a hand's.
// the hand pill (bottom right) holds Move, Pen, Highlighter, Lasso; choosing Pen brings the pen's bar, with the same tools and the eraser
const hand = async (R, name) => {
  if (!await R.ev(`const p = document.querySelector('.lab-pill-hand'); return !!p && p.classList.contains('open')`)) { await R.click('.lab-pill-hand .lab-pill-btn'); await R.sleep(600); }
  await R.click({ sel: `.lab-pill-hand .lab-fan-item[title^="${name}"]` }); await R.sleep(500);
};
// slide the paper (looking, not doing) so the note's component sits at the left, with free paper beside it
const place = (R, id) => R.ev(`const P = App.panes()[0].paper, r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(), dx = 330 - r.right, dy = 200 - r.top; for (let i = 1; i <= 14; i++) { P.view.x += dx / 14; P.view.y += dy / 14; P.apply(); await new Promise(q => setTimeout(q, 26)); } return 1`);
// an empty patch of paper right of the note's component, found when the step runs: { x, y } of its top-left corner
const patch = id => `(() => { const r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(); return { x: r.right + 46, y: r.top + 4 }; })()`;
const wobble = (cx, cy, rx, ry, n = 40, k = .12) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI * 2, w = 1 + k * Math.sin(a * 3 + 1) + k * .6 * Math.sin(a * 5); return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]; });
export default {
  by: '',
  use: 'Write and sketch on the paper with a pen, next to what you typed.',
  view: [1040, 650],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · edge');
    const a = KIT.fill(KIT.first(A), 'Edge', 'The leading edge held its shape at 5 µg/mL; one cell at the front spread wider than its neighbours.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Choose Pen on the hand pill and sketch beside the text: here, the cell at the front', async (R, c) => {
      await hand(R, 'Pen');
      await R.sleep(1300);   // the note comes closer for writing
      await place(R, c.a);
      await R.sleep(500);
      const o = await R.ev(`return ${patch(c.a)}`);
      c.o = o;
      await R.pen(wobble(o.x + 100, o.y + 72, 80, 50), { ms: 14 });
      await R.pen(wobble(o.x + 88, o.y + 70, 22, 17, 24, .06), { ms: 14 });
      await R.sleep(900);
    }],
    ['Draw a rough rectangle and hold the pen still: it becomes a clean one', async (R, c) => {
      const o = c.o, x = o.x + 240, y = o.y + 12;
      await R.pen([[x, y], [x + 60, y - 4], [x + 150, y + 5], [x + 153, y + 60], [x + 147, y + 118], [x + 70, y + 122], [x - 4, y + 116], [x + 3, y + 55], [x, y]], { ms: 14, hold: 1100 });
      await R.sleep(1100);
    }],
    ['The highlighter marks the edge; the eraser takes a stroke away', async (R, c) => {
      const o = c.o;
      await R.click({ sel: '.ink-bar .ib-t[title^="Highlighter"]' });
      await R.pen([[o.x + 150, o.y + 22], [o.x + 186, o.y + 66], [o.x + 172, o.y + 124]], { ms: 16 });
      await R.sleep(600);
      await R.click({ sel: '.ink-bar .ib-t[title^="Eraser"]' });
      await R.pen([[o.x + 66, o.y + 56], [o.x + 110, o.y + 86]], { ms: 16 });
      await R.sleep(1100);
    }],
    ['Lasso the sketch and drag it: the strokes written together are one ink component', async (R, c) => {
      const o = c.o;
      await R.click({ sel: '.ink-bar .ib-t[title^="Lasso"]' });
      await R.pen([[o.x - 6, o.y - 4], [o.x + 206, o.y - 8], [o.x + 214, o.y + 140], [o.x - 10, o.y + 144], [o.x - 6, o.y - 4]], { ms: 12 });
      await R.sleep(700);
      await R.pen([[o.x + 100, o.y + 118], [o.x + 80, o.y + 150], [o.x + 40, o.y + 170]], { ms: 22 });   // from inside the selection: it moves
      await R.sleep(1400);
    }],
  ],
};
