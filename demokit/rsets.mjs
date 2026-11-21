// Reading sets by project (17i, V4.29) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rsets
export default {
  by: 'Gabe',
  use: 'Give each project its own reading tabs. The papers you open from a project’s notes stay together as that project’s reading set; go to a note of another project and its set comes up in the reader instead, while the first one waits, folded, with every tab kept.',
  view: [1040, 650],
  // the test notes: a note in each of two projects with a paper in it; the second project already has a paper open in its set
  setup: async () => {
    const PA = KIT.project('Traction on soft gels'), PB = KIT.project('Collective migration');
    const A = KIT.note(PA, 'Reading · edge traction'), B = KIT.note(PB, 'Reading · leader cells');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak hold when the ligand is sparse?', 'question');
    const b0 = KIT.fill(KIT.first(B), 'Question', 'Do the leaders alone sense stiffness?', 'question');
    const mk = async (d, x0, file, title, authors, year, journal) => {
      const rec = await MEDIA.add(await KIT.asset(file)), lib = LIB.add({ title, authors, year, container: journal }); lib.pdf = rec.id; DB.put('library', lib);
      const b = M.addBlock(d.id, null, { kind: 'pdf', label: title, media: rec.id, libId: lib.id, x: x0.x, y: x0.y + 140, w: 560, h: 430, view: 'scroll', cur: 0 }); b.body = { text: title, marks: [] }; DB.put('blocks', b); return b; };
    const pa = await mk(A, a0, 'paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 2021, 'Journal of Demonstration Mechanobiology');
    const pb = await mk(B, b0, 'paper-varga-2017.pdf', 'Stiffness sensing at the leading edge of epithelial sheets', [{ family: 'Varga', given: 'Dóra' }, { family: 'Tomlin', given: 'Samuel' }], 2017, 'Demonstration Cell Reports');
    KIT.done(); return { A: A.id, B: B.id, a0: a0.id, b0: b0.id, pa: pa.id, pb: pb.id };
  },
  // the second project's paper was opened earlier, from its own note: that is its reading set
  before: async (R, c) => {
    await R.open(c.B);
    await R.ev(`RDOCK.open(M.block(${JSON.stringify(c.pb)})); return 1`);
    await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 8000);
    await R.sleep(800);
    await R.open(c.A);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pa}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.ev(`const b = M.block(${JSON.stringify(c.pa)}); DocView.paper.centerOn(b.x + 280, b.y + 150, .8); return 1`);
    await R.sleep(800);
  },
  steps: [
    ['In the first project’s note, open its paper beside the note: it is a tab of that project’s reading set', async (R, c) => {
      await R.click(`.box[data-id="${c.pa}"] .rd-open`);
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 6000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.ev(`const b = M.block(${JSON.stringify(c.pa)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2200);
    }],
    ['Go to a note of the other project: its own reading set comes up, and the first one folds into a chip with its count', async (R, c) => {
      await R.open(c.B);
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 6000);
      await R.ev(`const b = M.block(${JSON.stringify(c.pb)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2600);
    }],
    ['Back in the first project’s note: its set is back, with every tab it had', async (R, c) => {
      await R.open(c.A);
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 6000);
      await R.ev(`const b = M.block(${JSON.stringify(c.pa)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2600);
    }],
  ],
};
