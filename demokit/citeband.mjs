// Where a quote is from (17e, V4.2) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs citeband
export default {
  by: '',
  use: 'A quote carries its source: the paper, the page and the title, one click from the passage.',
  view: [1040, 650],
  pause: 500, crf: 31,
  // the test note: a reading note with a paper (known to the Library); another note to bridge a quote to
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading: edge traction'), B = KIT.note(P, 'Fibronectin series', { daysAgo: 6 });
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak in traction hold when the ligand is sparse?', 'question');
    KIT.fill(KIT.first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf'));
    const lib = LIB.add({ title: 'Edge traction on compliant gels rises with fibronectin density', authors: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], year: 2021, container: 'Journal of Demonstration Mechanobiology' });
    lib.pdf = rec.id; DB.put('library', lib);
    const pdf = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: rec.id, libId: lib.id, x: a0.x, y: a0.y + 140, w: 560, h: 448, view: 'scroll', cur: 0 });
    pdf.body = { text: pdf.label, marks: [] }; DB.put('blocks', pdf);
    KIT.done();
    return { A: A.id, B: B.id, a0: a0.id, pdf: pdf.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const b = M.block(${JSON.stringify(c.pdf)}); DocView.paper.centerOn(b.x + 470, b.y + 200, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot canvas'); return cv && cv.width > 0 && !!document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot .textLayer span'); })()`, 15000);
    await R.until(`!!document.querySelector('.toast')`, 5000); await R.until(`!document.querySelector('.toast')`, 8000);
    await R.sleep(600);
  },
  steps: [
    ['Select a sentence in the paper and choose ❝ Quote', async (R, c) => {
      const edge = side => `(() => { const sp = [...document.querySelectorAll('.box[data-id="${c.pdf}"] .pdf-slot[data-p="1"] .textLayer span')].find(s => s.textContent.includes('Cells pull hardest')); const n = sp.firstChild, t = n.textContent, a = t.indexOf('Cells pull hardest'), z = a + 'Cells pull hardest at the leading edge, where adhesions mature.'.length;
        const g = document.createRange(); g.setStart(n, ${side === 'l' ? 'a' : 'z - 1'}); g.setEnd(n, ${side === 'l' ? 'a + 1' : 'z'}); const r = g.getBoundingClientRect(); return { x: ${side === 'l' ? 'r.left + 1' : 'r.right - 0.5'}, y: r.top + r.height / 2 }; })()`;
      await R.drag({ xy: edge('l') }, { xy: edge('r') }, { ms: 900 });
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(600);
      await R.click({ sel: '.pop button', text: 'Quote' });
      await R.until(`!!document.querySelector('.box.q-cited')`, 4000);
      await R.sleep(1000);
    }],
    ['The quote has a band: the reference, the page, the title', async (R, c) => {
      await R.move({ sel: '.box.q-cited .or-cite', dx: .72, dy: .86 }, 500);
      await R.sleep(1300);
    }],
    ['Bridge the quote to another note: it carries both bands, the bridge’s and the citation’s', async (R, c) => {
      await R.rclick({ sel: '.box.q-cited .ed', dx: .78, dy: .5 });
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(600);
      await R.click({ sel: '.pop .op', text: 'Bridge to another note' });
      await R.until(`!!document.querySelector('.modal input')`, 4000);
      await R.sleep(500);
      await R.type('fibro');
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal input')`, 4000);
      await R.sleep(500);
      await R.type('Dose to test here');
      await R.key('Enter');
      await R.sleep(1500);
      await R.sleep(1200);
    }],
    ['In that note the bridge shows both bands: the bridge’s (where it came from) and the citation’s', async (R, c) => {
      await R.until(`!document.querySelector('.toast')`, 6000);
      await R.click({ sel: '.box.q-cited *', text: 'bridged to Fibronectin series' });
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(700);
      await R.click({ sel: '.pop .op', text: 'Go to the note' });
      await R.until(`DocView.docId === ${JSON.stringify(c.B)} && !!document.querySelector('.has-cite .or-cite')`, 8000);
      await R.sleep(500);
      await R.ev(`DocView.paper.fit(DocView.bbox()); return 1`);   // the whole note in the window (the app's own Fit), the bridge and what stands beside it
      await R.sleep(900);
      await R.move({ sel: '.has-cite .or-cite', dx: .72, dy: .9 });
      await R.sleep(1400);
    }],
    ['Click the citation band: the paper opens beside the note, at the quote', async (R, c) => {
      await R.click({ sel: '.has-cite .or-cite', dx: .4, dy: .3 });
      await R.until(`!!document.querySelector('.rd-wrap .rd-tab')`, 6000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.ev(`const b = DB.where('blocks', x => BRIDGE.is(x) && x.docId === ${JSON.stringify(c.B)})[0]; DocView.paper.centerOn(b.x + (b.w || 392) / 2, b.y + 90, .9); return 1`);   // the note, in its half of the window
      await R.sleep(2000);
    }],
  ],
};
