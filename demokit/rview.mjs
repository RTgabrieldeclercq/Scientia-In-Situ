// Read beside: Fit, zoom and full screen (13zzzb, V4.31) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rview
export default {
  by: 'Gabe',
  use: 'Read comfortably beside your notes. A paper or page read beside a note has its own zoom: − and + to step it, the percentage to go back to 100% (the page at its own size), Fit to put the page’s width to the pane and keep it there as the pane changes, and ⤢ to go full screen from where it is and back beside the note.',
  view: [1040, 650],
  // the test note: a reading note with one paper
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading · edge traction');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak hold when the ligand is sparse?', 'question');
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf'));
    const lib = LIB.add({ title: 'Edge traction on compliant gels rises with fibronectin density', authors: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], year: 2021, container: 'Journal of Demonstration Mechanobiology' });
    lib.pdf = rec.id; DB.put('library', lib);
    const b = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: rec.id, libId: lib.id, x: a0.x, y: a0.y + 140, w: 560, h: 430, view: 'scroll', cur: 0 }); b.body = { text: b.label, marks: [] }; DB.put('blocks', b);
    KIT.done(); return { A: A.id, a0: a0.id, b: b.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const b = M.block(${JSON.stringify(c.b)}); DocView.paper.centerOn(b.x + 280, b.y + 150, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.b}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.sleep(600);
  },
  steps: [
    ['Open the paper beside the note with the book on its card: it opens fitted to the pane', async (R, c) => {
      await R.click(`.box[data-id="${c.b}"] .rd-open`);
      await R.until(`!!document.querySelector('.rd-wrap .rv-fit')`, 8000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.ev(`const b = M.block(${JSON.stringify(c.b)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2000);
    }],
    ['Zoom by hand: − twice, + once, then click the percentage to go back to 100%, the page at its own size', async (R, c) => {
      await R.click('.rd-wrap button[title^="Smaller"]'); await R.sleep(700);
      await R.click('.rd-wrap button[title^="Smaller"]'); await R.sleep(900);
      await R.click('.rd-wrap button[title^="Larger"]'); await R.sleep(900);
      await R.click('.rd-wrap button[title^="Back to 100%"]');
      await R.sleep(2200);
    }],
    ['Fit puts the page’s width to the pane again, and keeps it fitted when the pane changes', async (R, c) => {
      await R.click('.rd-wrap .rv-fit');
      await R.sleep(2200);
    }],
    ['⤢ goes full screen from where it is, at the same place and zoom; ◧ brings it back beside the note', async (R, c) => {
      await R.click('.rd-wrap button[title^="Full screen"]');
      await R.until(`!!document.querySelector('.embed-max, .rd-dock:not(.rd-docked)')`, 6000);
      await R.sleep(2400);
      await R.click('button[title^="Back beside the note"]');
      await R.sleep(2400);
    }],
  ],
};
