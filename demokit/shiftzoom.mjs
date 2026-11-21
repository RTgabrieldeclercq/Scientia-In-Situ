// Shift+click zooms (12e, V4.89) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs shiftzoom
// a point inside a component's text that nothing covers: in its left part, at the lowest visible spot
const on = id => ({ xy: `(() => { const r = document.querySelector('.box[data-id="${id}"] .ed').getBoundingClientRect(); return { x: r.left + 70, y: Math.min(r.top + r.height / 2, 590) }; })()` });
export default {
  by: 'Gabe',
  use: 'Shift+click a component to zoom the canvas onto it, to read it closely or show it to someone: with the mouse or with the pen, and only when you are not typing in it.',
  view: [1040, 650],
  // the test note: an imaging-day note whose four components are small on the paper
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Imaging day 3');
    KIT.grid(A, [
      ['Setup', 'Gels at 30 kPa, fibronectin 5 µg/mL. Beads imaged 2 min after trypsin, 20× objective, 4 positions per gel.'],
      ['Edge peak', 'Traction peaks at 8 kPa in the outer two cell rows; the centre of the colony stays below 2 kPa.', 'result'],
      ['Beads', 'Fluorescent beads (0.2 µm) sit in the top 5 µm of the gel. A few clumped near the rim of gel 2.'],
      ['Next', 'Repeat on gel 3 with EGF added, and compare the rim against the first run.', 'hypothesis'],
    ], { cols: 1, dy: 115 });
    KIT.done(); return { A: A.id, ids: KIT.boxes(A).map(b => b.id) };
  },
  before: async (R, c) => { await R.open(c.A); await R.sleep(300); },
  steps: [
    ['Hold Shift and click a component: the canvas zooms onto it and fits it to the screen', async (R, c) => {
      await R.hold('Shift');
      await R.click(on(c.ids[0]));
      await R.release('Shift');
      await R.sleep(1800);
    }],
    ['Shift+click the next one, just in view below: the view moves on to it', async (R, c) => {
      await R.hold('Shift');
      await R.click(on(c.ids[1]));
      await R.release('Shift');
      await R.sleep(1800);
    }],
    ['The pen does it too: hold Shift and tap the next component with the pen', async (R, c) => {
      await R.hold('Shift');
      await R.pen([on(c.ids[2])], { after: 600 });
      await R.release('Shift');
      await R.sleep(1800);
    }],
  ],
};
