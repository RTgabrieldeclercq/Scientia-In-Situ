// The Reader button (17i, V4.29) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rbtn
export default {
  by: 'Gabe',
  use: 'Get back to what you were reading in one click. The book at the top right of every page opens the Reader: in a note it brings up that project’s reading set at the paper you read last there, and from any other page, such as Today, it takes you to the last paper you were reading, beside the note you opened it from.',
  view: [1040, 650],
  // the test notes: two projects, each with its note and papers; both have been read in, and the reader is closed
  setup: async () => {
    const PA = KIT.project('Traction on soft gels'), PB = KIT.project('Collective migration');
    const A = KIT.note(PA, 'Reading · edge traction'), B = KIT.note(PB, 'Reading · leader cells');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak hold when the ligand is sparse?', 'question');
    const b0 = KIT.fill(KIT.first(B), 'Question', 'Do the leaders alone sense stiffness?', 'question');
    const mk = async (d, x0, dy, file, title, authors, year, journal) => {
      const rec = await MEDIA.add(await KIT.asset(file)), lib = LIB.add({ title, authors, year, container: journal }); lib.pdf = rec.id; DB.put('library', lib);
      const b = M.addBlock(d.id, null, { kind: 'pdf', label: title, media: rec.id, libId: lib.id, x: x0.x, y: x0.y + dy, w: 560, h: 430, view: 'scroll', cur: 0 }); b.body = { text: title, marks: [] }; DB.put('blocks', b); return b; };
    const p1 = await mk(A, a0, 140, 'paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 2021, 'Journal of Demonstration Mechanobiology');
    const p2 = await mk(A, a0, 780, 'paper-haldane-2019.pdf', 'Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019, 'Methods in Demonstration Microscopy');
    const p3 = await mk(B, b0, 140, 'paper-varga-2017.pdf', 'Stiffness sensing at the leading edge of epithelial sheets', [{ family: 'Varga', given: 'Dóra' }, { family: 'Tomlin', given: 'Samuel' }], 2017, 'Demonstration Cell Reports');
    KIT.done(); return { A: A.id, B: B.id, p1: p1.id, p2: p2.id, p3: p3.id };
  },
  // earlier reading: the other project's paper first, then two papers of this project (the second read last); then the reader is closed
  before: async (R, c) => {
    await R.open(c.B);
    await R.ev(`RDOCK.open(M.block(${JSON.stringify(c.p3)})); return 1`);
    await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 8000);
    await R.sleep(500);
    await R.open(c.A);
    await R.ev(`RDOCK.open(M.block(${JSON.stringify(c.p1)})); return 1`);
    await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 8000);
    await R.sleep(500);
    await R.ev(`RDOCK.open(M.block(${JSON.stringify(c.p2)})); return 1`);
    await R.until(`document.querySelectorAll('.rd-wrap .rd-tab').length >= 2`, 8000);
    await R.sleep(800);
    await R.ev(`RDOCK.close(); RSET.paintBtn(); return 1`);
    await R.sleep(800);
    await R.ev(`const b = M.block(${JSON.stringify(c.p1)}); DocView.paper.centerOn(b.x + 280, b.y + 150, .8); return 1`);
    await R.sleep(500);
  },
  steps: [
    ['In a note, the book at the top right opens that project’s reading set, at the paper read last there', async (R, c) => {
      await R.click('#readerbtn');
      await R.until(`document.querySelectorAll('.rd-wrap .rd-tab').length >= 2`, 8000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.ev(`const b = M.block(${JSON.stringify(c.p1)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2400);
    }],
    ['Close it with the book again: the tabs stay. Go to Today', async (R, c) => {
      await R.click('#readerbtn');
      await R.until(`!document.querySelector('.rd-wrap')`, 4000);
      await R.sleep(700);
      await R.click({ sel: '#tabs a, #tabs button', text: 'Today' });
      await R.until(`!document.querySelector('.box')`, 6000);
      await R.sleep(2000);
    }],
    ['On Today the book opens the last paper you were reading, beside the note it came from', async (R, c) => {
      await R.click('#readerbtn');
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab') && !!document.querySelector('.box')`, 10000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.ev(`const b = M.block(${JSON.stringify(c.p1)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
      await R.sleep(2400);
    }],
  ],
};
