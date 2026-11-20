// Cited in (17e, V4.2) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs citedin
export default {
  by: '',
  use: 'While you read a paper, see the notes that cite it and go there with the paper still beside you.',
  view: [1040, 650],
  pause: 2000,
  // the test note: a reading note that embeds the paper (known to the Library), and two other notes that cite it
  setup: async () => {
    const P = KIT.project(), C = KIT.note(P, 'Reading: edge traction'), A = KIT.note(P, 'Daily · {today}', { daysAgo: 0 }), B = KIT.note(P, 'Fibronectin series', { daysAgo: 6 });
    const c0 = KIT.fill(KIT.first(C), 'Question', 'Does the edge peak in traction hold when the ligand is sparse?', 'question');
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf'));
    const lib = LIB.add({ title: 'Edge traction on compliant gels rises with fibronectin density', authors: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], year: 2021, container: 'Journal of Demonstration Mechanobiology' });
    lib.pdf = rec.id; DB.put('library', lib);
    const pdf = M.addBlock(C.id, null, { kind: 'pdf', label: lib.title, media: rec.id, libId: lib.id, x: c0.x, y: c0.y + 140, w: 560, h: 430, view: 'scroll', cur: 0 });
    pdf.body = { text: pdf.label, marks: [] }; DB.put('blocks', pdf);
    // a component whose text carries the citation (the /cite mark: one object character)
    const cite = (b, pre, post) => { b.body = { text: pre + '\uFFFC' + post, marks: [{ id: uid('m'), type: 'cite', from: pre.length, to: pre.length + 1, ref: lib.id }] }; DB.put('blocks', b); return b; };
    const a0 = KIT.fill(KIT.first(A), 'Plan', 'Gels for run 4 poured, 30 kPa.');
    const a1 = cite(KIT.box(A, 'Fibronectin dose', '', { x: a0.x + 460, y: a0.y + 170 }), 'Edge traction rises with ligand density ', ', so coat at 5 µg/mL and image the leading edge.');
    const b0 = KIT.fill(KIT.first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    KIT.box(B, 'Seeding', 'Seed at 40,000 cells per cm².', { x: b0.x + 460, y: b0.y });
    const b1 = cite(KIT.box(B, 'Why 10 µg/mL', '', { x: b0.x, y: b0.y + 170 }), 'The edge peak should be clearest at the top dose ', ' on the stiff gel.');
    KIT.done();
    return { lib: lib.id, C: C.id, A: A.id, B: B.id, c0: c0.id, pdf: pdf.id, a1: a1.id, b1: b1.id };
  },
  before: async (R, c) => {
    await R.open(c.C);
    await R.ev(`const b = M.block(${JSON.stringify(c.pdf)}); DocView.paper.centerOn(b.x + 280, b.y + 130, .8); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.until(`!!document.querySelector('.toast')`, 5000); await R.until(`!document.querySelector('.toast')`, 8000);   // the terms toast of the made-up library
    await R.sleep(600);
  },
  steps: [
    ['Open the paper beside its note: a line under its bar says Cited in, with the notes that cite it', async (R, c) => {
      await R.click(`.box[data-id="${c.pdf}"] .rd-open`);
      await R.until(`!!document.querySelector('.rd-wrap .rcx-strip .rcx-chip')`, 8000);
      await R.sleep(2000);
    }],
    ['Click a note on that line: you are in that note, at the citation, and the paper stays beside you', async (R, c) => {
      await R.click({ js: `[...document.querySelectorAll('.rd-wrap .rcx-chip')].find(x => x.textContent.includes('Daily'))` });
      await R.until(`DocView.docId === ${JSON.stringify(c.A)} && !!document.querySelector('.box[data-id="${c.a1}"]')`, 8000);
      await R.sleep(2200);
    }],
    ['The Library’s reader lists them too: the two notes that cite it, the one that embeds it', async (R, c) => {
      await R.go(`#/read/${c.lib}`);
      await R.until(`!!document.querySelector('.rcx-side .rcx-row')`, 10000);
      await R.sleep(2800);
    }],
  ],
};
