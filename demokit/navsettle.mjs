// Back and forward (20d-look.js, V4.68) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs navsettle
export default {
  by: 'Gabe',
  use: 'Move between notes with Alt+Left and Alt+Right, and see at a glance what each one holds as it arrives: every component lights up together, then settles.',
  view: [1040, 650],
  // the test note: an analysis note that mentions the gel batch note, a link away
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Analysis: Run 3'), B = KIT.note(P, 'Gel batch 14');
    KIT.grid(B, [
      ['Gel batch 14', 'Polyacrylamide, 30 kPa, fibronectin 5 µg/mL; poured Monday, used Tuesday.'],
      ['Stiffness', 'Three gels indented: 29.1, 30.4 and 30.8 kPa.', 'result'],
      ['Beads', 'Fluorescent beads (0.2 µm) mixed into the top layer.'],
      ['Storage', 'Kept in PBS at 4 °C; used within three days.'],
    ]);
    const text = 'Traction rose with stiffness on gel batch 14, as the indentation shows.', at = text.indexOf('gel batch 14');
    const [a0] = KIT.grid(A, [
      ['Result', text, 'result'],
      ['Edge peak', 'The outer two cell rows carry the highest forces; the centre stays quiet.'],
      ['Next', 'Repeat on gel 3 with EGF added and compare the rim against this run.', 'hypothesis'],
      ['Imaging', '20× objective, 4 positions per gel, beads imaged 2 min after trypsin.'],
    ]);
    a0.body = { text, marks: [{ id: uid('m'), type: 'link', from: at, to: at + 12, ref: B.id, title: B.title }] }; DB.put('blocks', a0);
    KIT.done(); return { A: A.id, B: B.id, a: a0.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.ev(`const P = DocView.paper; P.view.y -= 60; P.apply(); return 1`); await R.sleep(500); await R.move([760, 140], 0); },
  steps: [
    ['In the analysis note, Ctrl+click the bridged words to follow the link to the gel batch note', async (R, c) => {
      await R.hold('Control');
      await R.click({ xy: `(() => { const m = document.querySelector('.box[data-id="${c.a}"] .ed .ln[data-link]'); const r = m.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()` });
      await R.release('Control');
      await R.until(`DocView.docId === ${JSON.stringify(c.B)}`, 6000);
      await R.sleep(2200);
    }],
    ['Alt+Left goes back: the analysis note arrives with every component lit, then they settle', async (R, c) => {
      await R.move([760, 140], 300);
      await R.key('ArrowLeft', { alt: true, after: 100 });
      await R.sleep(2600);
    }],
    ['Alt+Right goes forward again: the gel batch note arrives the same way', async (R, c) => {
      await R.key('ArrowRight', { alt: true, after: 100 });
      await R.sleep(2600);
    }],
  ],
};
