// The mini library (17j, V4.30) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rlib
export default {
  by: 'Gabe',
  use: 'Find another of the project’s papers while you read one full screen. A thin grip on the left edge pulls out a mini library of the project’s shelves with their papers; click one and it opens as a tab beside the one you were reading, without leaving full screen.',
  view: [1040, 650],
  // the test note: a reading note with one paper; the Library has a shelf for the project, with three papers on it
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading · edge traction');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak hold when the ligand is sparse?', 'question');
    const mk = async (file, title, authors, year, journal) => { const rec = await MEDIA.add(await KIT.asset(file)), lib = LIB.add({ title, authors, year, container: journal }); lib.pdf = rec.id; DB.put('library', lib); return { rec, lib }; };
    const p1 = await mk('paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 2021, 'Journal of Demonstration Mechanobiology');
    const p2 = await mk('paper-haldane-2019.pdf', 'Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019, 'Methods in Demonstration Microscopy');
    const p3 = await mk('paper-varga-2017.pdf', 'Stiffness sensing at the leading edge of epithelial sheets', [{ family: 'Varga', given: 'Dóra' }, { family: 'Tomlin', given: 'Samuel' }], 2017, 'Demonstration Cell Reports');
    const b = M.addBlock(A.id, null, { kind: 'pdf', label: p1.lib.title, media: p1.rec.id, libId: p1.lib.id, x: a0.x, y: a0.y + 140, w: 560, h: 430, view: 'scroll', cur: 0 }); b.body = { text: b.label, marks: [] }; DB.put('blocks', b);
    // a shelf of the Library, assigned to the project, with a focus holding the three papers
    const t = LGROUP.save({ id: uid('lt'), kind: 'theme', name: 'Traction methods', hue: 205, order: 0, created: isoLocal(new Date()), projectIds: [P.id] });
    LGROUP.save({ id: uid('lg'), kind: 'group', name: 'Edge traction and drift', themeId: t.id, paperIds: [p1.lib.id, p2.lib.id, p3.lib.id], order: 0, created: isoLocal(new Date()) });
    KIT.done(); return { A: A.id, a0: a0.id, b: b.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const b = M.block(${JSON.stringify(c.b)}); DocView.paper.centerOn(b.x + 280, b.y + 150, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.b}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.sleep(600);
  },
  steps: [
    ['Read a paper full screen: the maximise button on its card', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.b}"] button[title="Maximise"]` });
      await R.until(`!!document.querySelector('.embed-max .rs-grip')`, 12000);
      await R.until(`(() => { const cv = document.querySelector('.embed-max .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.sleep(1800);
    }],
    ['Drag the thin grip on the left edge to the right: the project’s shelves slide out, with their papers', async (R, c) => {
      const g = await R.ev(`const r = document.querySelector('.embed-max .rs-grip').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }`);
      await R.drag([g.x, g.y], [g.x + 300, g.y], { ms: 1100 });
      await R.until(`!!document.querySelector('.rs-lib.open .rs-paper')`, 4000);
      await R.sleep(2200);
    }],
    ['Pick a paper: it opens as a tab, still full screen', async (R, c) => {
      await R.click({ sel: '.rs-lib.open .rs-paper', text: 'Bead drift' });
      await R.until(`document.querySelectorAll('.rd-wrap .rd-tab, .rd-tabs .rd-tab').length >= 2`, 8000);
      await R.sleep(600);
      await R.until(`(() => { const cv = document.querySelector('.embed-max .pdf-slot canvas, .rd-dock .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.sleep(2600);
    }],
  ],
};
