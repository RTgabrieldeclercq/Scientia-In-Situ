// Connections (V3.982, 12-doc, 13t-chaindrop) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs wires
export default {
  by: '',
  use: 'Say how two components relate with a wire, so the note reads as a chain of reasoning.',
  view: [1040, 650],
  pause: 500,
  // the test note: "Gel batch 14", "Imaging" and "Run 3" in a row, Imaging between the other two
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Analysis: Run 3');
    const a0 = KIT.first(A); a0.w = 266; KIT.fill(a0, 'Gel batch 14', '30 kPa, fibronectin 5 µg/mL.');
    const img = KIT.box(A, 'Imaging', 'Beads at 20x, every 2 min.', { x: a0.x + 330, y: a0.y + 14, w: 266 });
    const run = KIT.box(A, 'Run 3', 'Edge traction peaked at 40 min.', { x: a0.x + 660, y: a0.y, w: 266 });
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y }, head: { x: a0.x + 1700, y: a0.y + 400 } }); DB.put('documents', d);   // the note's own boxes out of the way
    KIT.done(); return { A: A.id, gel: a0.id, img: img.id, run: run.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.sleep(600);
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.gel)}); Object.assign(P.view, { z: 1, x: 40 - r.x, y: 130 - r.y }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Drag the dot of “Gel batch 14” onto “Run 3” and choose “caused”: a coloured wire, routed round Imaging', async (R, c) => {
      const box = id => `document.querySelector('.box[data-id="${id}"]').getBoundingClientRect()`;
      await R.move({ sel: `.box[data-id="${c.gel}"] .port` });
      await R.sleep(300);
      await R.drag({ sel: `.box[data-id="${c.gel}"] .port` }, { sel: `.box[data-id="${c.run}"] .ed`, dx: .5, dy: .5 }, { via: [{ xy: `(() => { const r = ${box(c.img)}; return { x: r.left + r.width / 2, y: r.top - 60 }; })()` }], ms: 900 });
      await R.sleep(500);
      await R.click({ sel: '.pop .opt', text: 'caused' });
      await R.sleep(1500);
    }],
    ['Drop the dot of “Run 3” on empty paper: pick “leads to” and a new component is made there, already wired', async (R, c) => {
      await R.move({ sel: `.box[data-id="${c.run}"] .port` });
      await R.sleep(400);
      await R.drag({ sel: `.box[data-id="${c.run}"] .port` }, { xy: `(() => { const r = document.querySelector('.box[data-id="${c.run}"]').getBoundingClientRect(); return { x: r.left - 320, y: r.bottom + 170 }; })()` }, { ms: 1000 });
      await R.until(`document.querySelector('.cd-rel')`, 3000);
      await R.sleep(900);
      await R.click({ sel: '.cd-rel', text: 'leads to' });
      await R.sleep(500);
      await R.click({ sel: '.cd-it', text: 'Text component' });
      await R.sleep(500);
      await R.type('Gels for run 4 at 30 kPa', 55);
      await R.sleep(900);
    }],
    ['Move a component: the wires find their way again', async (R, c) => {
      // the note scrolled to the new component: back to where all four are in view
      await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.gel)}); Object.assign(P.view, { z: 1, x: 40 - r.x, y: 110 - r.y }); P.apply(); return 1`);
      await R.sleep(700);
      await R.drag({ sel: `.box[data-id="${c.img}"] .bh .num` }, { xy: `(() => { const r = document.querySelector('.box[data-id="${c.img}"]').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 100 }; })()` }, { ms: 1000 });
      await R.sleep(1500);
    }],
    ['Click a wire: reverse it, or change the relation', async (R, c) => {
      await R.click('.wl');
      await R.click({ sel: '.pop .op', text: 'Reverse direction' });
      await R.sleep(1500);
      await R.click('.wl');
      await R.click({ sel: '.pop .op', text: 'Make it: supports' });
      await R.sleep(1700);
    }],
  ],
};
