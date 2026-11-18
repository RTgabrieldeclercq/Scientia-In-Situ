// Split the reader (13zzb, V4.2) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rsplit
export default {
  by: '',
  use: 'Read two to four papers at once beside your note.',
  view: [1280, 800], dpr: 1,
  // the test note: the reading note of the tabs demonstration, its three tabs already open (a fourth paper waits in the Library)
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
    const p3 = await mk('paper-varga-2017.pdf', 'Stiffness sensing at the leading edge of epithelial sheets', [{ family: 'Varga', given: 'Dóra' }, { family: 'Tomlin', given: 'Samuel' }], 2017, 'Demonstration Cell Reports');
    KIT.done();
    return { A: A.id, a0: a0.id, b1: b1.id, b2: b2.id, b3: b3.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`RDOCK.open(M.block(${JSON.stringify(c.b1)})); RDOCK.open(M.block(${JSON.stringify(c.b2)})); RDOCK.open(M.block(${JSON.stringify(c.b3)})); RDOCK.open(M.block(${JSON.stringify(c.b1)})); return 1`);
    await R.until(`document.querySelectorAll('.rd-wrap .rd-tab').length === 3 && (() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.ev(`const b = M.block(${JSON.stringify(c.b1)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
    await R.sleep(1200);
  },
  steps: [
    ['Press the split button on the tab row: two papers side by side', async (R, c) => {
      await R.click('.rd-wrap .rd-tsplit');
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(700);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => /Side by side/.test(o.textContent))` });
      await R.until(`document.querySelectorAll('.rd-panes .rd-dock').length === 2 && [...document.querySelectorAll('.rd-panes .pdf-slot canvas')].filter(x => x.width > 0).length >= 2`, 15000);
      await R.sleep(1500);
    }],
    ['Each pane has its own page and zoom: next page on one, larger on the other', async (R, c) => {
      await R.click({ js: `document.querySelector('.rd-panes [data-pane="0"] button[title^="Next page"]')` });
      await R.sleep(1400);
      await R.click({ js: `document.querySelector('.rd-panes [data-pane="1"] button[title^="Larger"]')` });
      await R.sleep(700);
      await R.click({ js: `document.querySelector('.rd-panes [data-pane="1"] button[title^="Larger"]')` });
      await R.sleep(1500);
    }],
    ['Quadrant: four panes. The free pane takes another paper from the Library', async (R, c) => {
      await R.click('.rd-wrap .rd-tsplit');
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => /Quadrant/.test(o.textContent))` });
      await R.until(`!!document.querySelector('.rd-empty')`, 8000);
      await R.sleep(1500);
      await R.click({ js: `[...document.querySelectorAll('.rd-empty button')].find(x => /Open a paper/.test(x.textContent))` });
      await R.until(`!!document.querySelector('.modal input')`, 4000);
      await R.sleep(500);
      await R.type('varga');
      await R.sleep(600);
      await R.key('Enter');
      await R.until(`document.querySelectorAll('.rd-panes .rd-dock').length === 4`, 12000);
      await R.sleep(2000);
    }],
    ['Back to one: the split button, then One', async (R, c) => {
      await R.click('.rd-wrap .rd-tsplit');
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(600);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => /^(✓ )?One/.test(o.textContent.trim()))` });
      await R.until(`document.querySelectorAll('.rd-panes .rd-dock').length === 1`, 8000);
      await R.sleep(1500);
    }],
  ],
};
