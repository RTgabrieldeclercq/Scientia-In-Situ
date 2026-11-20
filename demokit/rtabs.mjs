// Reading tabs (17e, V4.2) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rtabs
export default {
  by: '',
  use: 'Keep several papers and pages open beside a note and switch between them.',
  view: [1040, 650],
  // the test note: a reading note that embeds two papers (known to the Library) and a saved report page, one under the other
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading: edge traction');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak in traction hold when the ligand is sparse?', 'question');
    const mk = async (file, title, authors, year, journal) => { const rec = await MEDIA.add(await KIT.asset(file)); const lib = LIB.add({ title, authors, year, container: journal }); lib.pdf = rec.id; DB.put('library', lib); return { rec, lib }; };
    const p1 = await mk('paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 2021, 'Journal of Demonstration Mechanobiology');
    const p2 = await mk('paper-haldane-2019.pdf', 'Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019, 'Methods in Demonstration Microscopy');
    const pdf = (r, lib, y) => { const b = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: r.id, libId: lib.id, x: a0.x, y, w: 560, h: 430, view: 'scroll', cur: 0 }); b.body = { text: b.label, marks: [] }; DB.put('blocks', b); return b; };
    const b1 = pdf(p1.rec, p1.lib, a0.y + 140), b2 = pdf(p2.rec, p2.lib, a0.y + 140 + 640);
    const hrec = await MEDIA.add(await KIT.asset('report-run3.html'));
    const b3 = M.addBlock(A.id, null, { kind: 'html', label: 'Run 3 traction report', media: hrec.id, x: a0.x, y: a0.y + 140 + 1280, w: 560, h: 400 });
    b3.body = { text: 'Run 3 traction report', marks: [] }; DB.put('blocks', b3);
    KIT.done();
    return { A: A.id, a0: a0.id, b1: b1.id, b2: b2.id, b3: b3.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const a = M.block(${JSON.stringify(c.a0)}), p = M.block(${JSON.stringify(c.b1)}); DocView.paper.centerOn(a.x + 280, p.y + 150, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.b1}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.sleep(600);
  },
  steps: [
    ['Open the first paper beside the note with the book on its card', async (R, c) => {
      await R.click(`.box[data-id="${c.b1}"] .rd-open`);
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 6000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.sleep(500);
      await R.ev(`const b = M.block(${JSON.stringify(c.b1)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);   // the note, in its half of the window
      await R.sleep(1500);
    }],
    ['Press + and open a second paper: two tabs', async (R, c) => {
      await R.click('.rd-wrap .rd-tadd');
      await R.until(`!!document.querySelector('.modal input')`, 4000);
      await R.sleep(500);
      await R.type('haldane');
      await R.sleep(600);
      await R.key('Enter');
      await R.until(`document.querySelectorAll('.rd-wrap .rd-tab').length === 2`, 6000);
      await R.sleep(1600);
    }],
    ['Click a tab: the note goes to where that paper is embedded, lit', async (R, c) => {
      // the note has been left down at the second paper
      await R.ev(`const b = M.block(${JSON.stringify(c.b2)}); DocView.paper.centerOn(b.x + 280, b.y + 200, DocView.paper.view.z); return 1`);
      await R.sleep(900);
      await R.click({ js: `[...document.querySelectorAll('.rd-wrap .rd-tab')].find(t => t.dataset.id === ${JSON.stringify(c.b1)})` });
      await R.sleep(2200);
    }],
    ['Add the saved report page as a third tab, then close one', async (R, c) => {
      await R.click('.rd-wrap .rd-tadd');
      await R.until(`!!document.querySelector('.modal input')`, 4000);
      await R.sleep(500);
      await R.type('run 3');
      await R.sleep(600);
      await R.key('Enter');
      await R.until(`document.querySelectorAll('.rd-wrap .rd-tab').length === 3`, 6000);
      await R.sleep(1500);
      await R.click({ js: `[...document.querySelectorAll('.rd-wrap .rd-tab')].find(t => t.dataset.id === ${JSON.stringify(c.b2)}).querySelector('.rd-tx')` });
      await R.sleep(1800);
    }],
  ],
};
