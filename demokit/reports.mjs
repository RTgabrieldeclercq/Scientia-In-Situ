// Reports (13zzy, V4.4) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs reports
export default {
  by: '',
  use: 'Mark a PDF or a saved web page as a report, and every figure you cut out of it is a result straight away.',
  view: [1040, 650],
  pause: 600,
  // the test note: an analysis note with a question, and a two-page PDF beside it
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Analysis: Run 3');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak in traction hold at 10 µg/mL fibronectin?', 'question');
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf'));
    const pdf = M.addBlock(A.id, null, { kind: 'pdf', label: 'Edge traction on 30 kPa gels', media: rec.id, x: a0.x + 532, y: a0.y, w: 616, h: 448, view: 'scroll', cur: 0 });
    pdf.body = { text: pdf.label, marks: [] }; DB.put('blocks', pdf); KIT.done();
    return { A: A.id, a0: a0.id, pdf: pdf.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    // the question and the PDF in view, large enough to read the tags
    await R.ev(`const a = M.block(${JSON.stringify(c.a0)}), p = M.block(${JSON.stringify(c.pdf)}); DocView.paper.centerOn((a.x + p.x + p.w) / 2, p.y + 250, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot canvas'); return cv && cv.width > 0 && !!document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot .textLayer'); })()`, 15000);
    await R.sleep(900);
    await R.move({ sel: `.box[data-id="${c.a0}"] .ed`, dx: .5, dy: 60 }, 0);
  },
  steps: [
    ['Double-click the “pdf” tag left of the PDF’s name and choose Report', async (R, c) => {
      await R.dblclick(`.box[data-id="${c.pdf}"] > .bh > .num`);
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(400);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => /^Report/.test(o.textContent.trim()))` });
      await R.until(`document.querySelector('.box[data-id="${c.pdf}"] > .bh > .num').textContent === 'Report'`, 3000);
      await R.sleep(1100);
    }],
    ['Use the scissors on its bar: every figure is outlined. Click Figure 2', async (R, c) => {
      await R.click(`.box[data-id="${c.pdf}"] .clip-btn`);
      await R.sleep(600);
      // down the paper to Figure 2 (the pointer rests on the page while it scrolls)
      await R.move({ sel: `.box[data-id="${c.pdf}"] .pdf-stage`, dx: .5, dy: .5 });
      const found = await R.until(`(() => { const st = document.querySelector('.box[data-id="${c.pdf}"] .pdf-stage'); const b = [...st.querySelectorAll('.clip-badge')].find(x => /Figure 2/.test(x.textContent));
        if (b) { const hs = b.closest('.clip-hs'), z = DocView.paper.view.z, r = hs.getBoundingClientRect(), s = st.getBoundingClientRect(); const d = (r.top + r.height / 2 - (s.top + s.height / 2)) / z; if (Math.abs(d) > 12) { st.scrollBy({ top: d, behavior: 'smooth' }); return 0; } return 1; }
        st.scrollBy({ top: 260, behavior: 'smooth' }); return 0; })()`, 9000);
      if (!found) throw new Error('no Figure 2 badge');
      await R.sleep(900);
      await R.click({ js: `[...document.querySelectorAll('.box[data-id="${c.pdf}"] .clip-badge')].find(x => /Figure 2/.test(x.textContent))` });
      await R.until(`DB.where('blocks', b => b.kind === 'figure' && b.clip && b.status === 'live').length > 0 && !!document.querySelector('.box.clip-float')`, 8000);
      await R.sleep(1000);
    }],
    ['It lands on the paper as an image panel that is already a Result: drag it where it belongs', async (R, c) => {
      await R.key('Escape');   // the scissors are put down
      const fig = await R.ev(`return DB.where('blocks', b => b.kind === 'figure' && b.clip && b.status === 'live')[0].id`);
      await R.sleep(500);
      // by its tag, to the free paper under the question
      const to = { xy: `(() => { const q = document.querySelector('.box[data-id="${c.a0}"]').getBoundingClientRect(), n = document.querySelector('.box[data-id="${fig}"] > .bh > .num').getBoundingClientRect(), f = document.querySelector('.box[data-id="${fig}"]').getBoundingClientRect(); return { x: q.left + (n.left - f.left) + n.width / 2, y: q.bottom + 34 + (n.top - f.top) + n.height / 2 }; })()` };
      await R.drag(`.box[data-id="${fig}"] > .bh > .num`, to, { ms: 1300 });
      await R.move({ xy: `(() => { const f = document.querySelector('.box[data-id="${fig}"]').getBoundingClientRect(); return { x: f.right + 40, y: f.top + 70 }; })()` });
      await R.until(`document.querySelector('.box[data-id="${fig}"] > .bh > .num').textContent === 'Result'`, 3000);
      await R.sleep(1400);
    }],
    ['The same choice is in the card’s menu: ⋯ → What kind is this PDF…', async (R, c) => {
      await R.click(`.box[data-id="${c.pdf}"] > .bh .bmore`);
      await R.until(`[...document.querySelectorAll('.pop .op')].some(o => o.textContent.includes('What kind is this PDF'))`, 3000);
      await R.move({ sel: '.pop .op', text: 'What kind is this PDF' });
      await R.sleep(1100);
      await R.click();
      await R.until(`[...document.querySelectorAll('.pop .op')].some(o => /^✓ Report/.test(o.textContent.trim()))`, 3000);
      await R.move({ js: `[...document.querySelectorAll('.pop .op')].find(o => /^✓ Report/.test(o.textContent.trim()))` });
      await R.sleep(1800);   // it is a Report already: the choice stays on screen, ticked, to the end
    }],
  ],
};
