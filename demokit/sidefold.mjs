// Fold the side panel (17g, V4.10) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs sidefold
export default {
  by: '',
  use: 'Give the page the whole width while you read, and bring your highlights back with one click.',
  view: [1280, 800], dpr: 1,
  pause: 700,
  // the test note: a reading note with the paper (known to the Library); the paper has highlights in the note (made in `before`, where the page is drawn) and the same three in the Library's reader
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading: edge traction');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak in traction hold when the ligand is sparse?', 'question');
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf'));
    const lib = LIB.add({ title: 'Edge traction on compliant gels rises with fibronectin density', authors: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], year: 2021, container: 'Journal of Demonstration Mechanobiology' });
    lib.pdf = rec.id; DB.put('library', lib);
    const pdf = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: rec.id, libId: lib.id, x: a0.x, y: a0.y + 140, w: 616, h: 448, view: 'scroll', cur: 0 });
    pdf.body = { text: pdf.label, marks: [] }; DB.put('blocks', pdf);
    // the same three highlights, in the same colours, and the same note on the second, in the Library's reader (its own record, on the paper's literature note)
    const d = READER.litDoc(lib);
    [['Cells pull hardest at the leading edge, where adhesions mature.', 'yellow'], ['Gels were cast from acrylamide and bis-acrylamide', 'green'], ['Earlier work varied stiffness alone.', 'blue']].forEach(([t, color], i) => { const b = M.addBlock(d.id, null, { label: 'p. 1', x: 0, y: 220 + i * 150, anchor: { type: 'TextQuoteSelector', source: lib.id, page: 1, exact: t, prefix: '', suffix: '', rects: null, color } }); M.saveBlockBody(b, { text: t, marks: [] }); if (i === 1) READER.addNote(M.block(b.id), 'Check the gel batch for this: 14 or 15?'); });
    KIT.done();
    return { lib: lib.id, A: A.id, a0: a0.id, pdf: pdf.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const b = M.block(${JSON.stringify(c.pdf)}); DocView.paper.centerOn(b.x + 308, b.y + 200, .9); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot canvas'); return cv && cv.width > 0 && !!document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot[data-p="1"] .textLayer span'); })()`, 15000);
    await R.sleep(800);
    // three highlights in the paper, made as a selection would (the app's own selection → quote), and a note on the second
    await R.ev(`
      const slot = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot[data-p="1"]'), ids = [];
      for (const [phrase, color] of [['Cells pull hardest at the leading edge, where adhesions mature.', 'yellow'], ['Gels were cast from acrylamide and bis-acrylamide', 'green'], ['Earlier work varied stiffness alone.', 'blue']]) {
        const sp = [...slot.querySelectorAll('.textLayer span')].find(s => s.textContent.includes(phrase)); if (!sp) throw new Error('no line: ' + phrase);
        const n = sp.firstChild, a = n.textContent.indexOf(phrase), r = document.createRange(); r.setStart(n, a); r.setEnd(n, a + phrase.length);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); const sel = QUOTE.pdfSel(); if (!sel) throw new Error('no selection'); ids.push(QUOTE.make(Object.assign({}, sel, { color })).id); s.removeAllRanges(); }
      QUOTE.note(M.block(ids[1]), 'Check the gel batch for this: 14 or 15?'); IX.rebuild(); changed(); QUOTE.paintMarks(${JSON.stringify(c.pdf)}); return 1`);
    await R.until(`!!document.querySelector('.toast')`, 3000); await R.until(`!document.querySelector('.toast')`, 8000);
    await R.sleep(600);
  },
  steps: [
    ['Maximise the paper: the panel of highlights and notes sits beside it', async (R, c) => {
      await R.click({ js: `document.querySelector('.box[data-id="${c.pdf}"] button[title="Maximise"]')` });
      await R.until(`document.querySelectorAll('.embed-max .mx-side .rd-ann').length >= 3 && !!document.querySelector('.embed-max .pdf-slot canvas')`, 15000);
      await R.sleep(2000);
    }],
    ['Fold the panel with ›: a thin strip with its count written down it', async (R, c) => {
      await R.click('.embed-max .sf-top .sf-b');
      await R.until(`document.body.classList.contains('sf-fold')`, 3000);
      await R.sleep(2200);
    }],
    ['Click the strip: the panel opens again', async (R, c) => {
      await R.click('.embed-max .sf-col');
      await R.until(`!document.body.classList.contains('sf-fold')`, 3000);
      await R.sleep(1800);
    }],
    ['Fold it again, close the paper and open it in the Library’s reader: the panel is folded there too', async (R, c) => {
      await R.click('.embed-max .sf-top .sf-b');
      await R.until(`document.body.classList.contains('sf-fold')`, 3000);
      await R.sleep(900);
      await R.click({ js: `[...document.querySelectorAll('.embed-max .em-bar button')].find(x => /Close/.test(x.textContent))` });
      await R.sleep(500);
      await R.go(`#/read/${c.lib}`);
      await R.until(`!!document.querySelector('.rd-main .sf-col') && document.querySelector('.rd-main .sf-col .sf-n') && document.querySelector('.rd-main .sf-col .sf-n').textContent.length > 0`, 12000);
      await R.sleep(2600);
    }],
  ],
};
