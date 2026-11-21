// Popup windows (13zzzc, V4.32) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rpop
export default {
  by: 'Gabe',
  use: 'Keep a paper floating over the note while you write. A paper read beside a note becomes a popup window inside the app: rest on its border and four anchors and four corners show, to move it and resize it freely, and the note stays usable all around it.',
  view: [1040, 650],
  // the test note: a note with a question to answer, and the paper it is about
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
    ['Read the paper beside the note, then press ⧉ on its bar: it becomes a popup window over the note', async (R, c) => {
      await R.click(`.box[data-id="${c.b}"] .rd-open`);
      await R.until(`!!document.querySelector('.rd-wrap .rp-btn')`, 8000);
      await R.until(`(() => { const cv = document.querySelector('.rd-wrap .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.sleep(1200);
      await R.click('.rd-wrap .rp-btn');
      await R.until(`!!document.querySelector('.rp-pop')`, 6000);
      await R.until(`(() => { const cv = document.querySelector('.rp-pop .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
      await R.sleep(1800);
    }],
    ['Rest on its border: the anchors and corners show. Drag the anchor on its top edge to move the window', async (R, c) => {
      await R.move({ sel: '.rp-pop .rp-mv[data-e="n"]' });
      await R.sleep(1500);
      await R.drag({ sel: '.rp-pop .rp-mv[data-e="n"]' }, { xy: `(() => { const r = document.querySelector('.rp-pop .rp-mv[data-e="n"]').getBoundingClientRect(); return { x: r.left + r.width / 2 - 60, y: r.top + r.height / 2 + 40 }; })()` }, { ms: 1100 });
      await R.sleep(1200);
    }],
    ['Drag a corner to resize it: it gets smaller, out of the way of the note', async (R, c) => {
      await R.move({ sel: '.rp-pop .rp-rz[data-c="sw"]' });
      await R.sleep(1500);
      await R.drag({ sel: '.rp-pop .rp-rz[data-c="sw"]' }, { xy: `(() => { const r = document.querySelector('.rp-pop .rp-rz[data-c="sw"]').getBoundingClientRect(); return { x: r.left + r.width / 2 + 120, y: r.top + r.height / 2 - 100 }; })()` }, { ms: 1100 });
      await R.sleep(1200);
    }],
    ['The note is still yours around it: click in the note and write', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.a0}"] .ed`, dx: .98, dy: .5 });
      await R.type(' Checked in the paper: yes, at 5 µg/mL and above.', 55);
      await R.sleep(2200);
    }],
  ],
};
