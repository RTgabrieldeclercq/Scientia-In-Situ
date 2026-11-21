// References Map (17h, V4.22) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs refmap
// Shown with assets/paper-castellanos-2020.pdf: a made-up short review with numbered citations [1]–[8] and a numbered reference list.
export default {
  by: 'Gabe',
  use: 'Check a citation without losing your place: rest on [3] in the text and its reference appears; click it to jump to the list, and ‹ Back returns you to the sentence you were reading. The References Map in the Highlights panel lists every reference of the paper, numbered as in the paper, with how often each is cited, so you can see which ones the paper leans on.',
  view: [1040, 650],
  // the test note: a reading note with the paper in it (known to the Library)
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading · edge forces review');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Which studies does this review lean on for the edge peak?', 'question');
    const rec = await MEDIA.add(await KIT.asset('paper-castellanos-2020.pdf'));
    const lib = LIB.add({ title: 'Reading edge forces in epithelial sheets: a short review', authors: [{ family: 'Castellanos', given: 'Mina' }, { family: 'Abara', given: 'Joel' }], year: 2020, container: 'Reviews in Demonstration Mechanobiology' });
    lib.pdf = rec.id; DB.put('library', lib);
    const p = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: rec.id, libId: lib.id, x: a0.x, y: a0.y + 140, w: 560, h: 430, view: 'scroll', cur: 0 });
    p.body = { text: p.label, marks: [] }; DB.put('blocks', p);
    KIT.done(); return { A: A.id, a0: a0.id, p: p.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.p}"] .pdf-slot canvas'); return cv && cv.width > 0; })()`, 15000);
    await R.sleep(600);
  },
  steps: [
    ['Open the paper full screen. Rest on the citation [3] in the text: its reference appears, without scrolling to the list', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.p}"] button[title="Maximise"]` });
      await R.until(`!!document.querySelector('.embed-max .rfm-row')`, 20000);
      await R.sleep(1200);
      await R.move([520, 400]);
      c.cite = await R.ev(CITE(3));
      await R.move([c.cite.x, c.cite.y]);
      await R.until(`!!document.querySelector('.rfm-card')`, 5000);
      await R.sleep(2200);
    }],
    ['Click it: the paper jumps to that entry of the reference list', async (R, c) => {
      await R.click();
      await R.until(`!!document.querySelector('.rfm-back')`, 4000);
      await R.sleep(2600);
    }],
    ['‹ Back to where you were: the sentence you were reading', async (R, c) => {
      await R.click('.rfm-back');
      await R.sleep(2200);
    }],
    ['The References Map lists every reference and how often it is cited: rest on one to light its citations in the paper', async (R, c) => {
      await R.move({ sel: '.embed-max .rfm-row', text: 'Okafor' });
      await R.sleep(1800);
    }],
  ],
};

// the screen place of citation number n on the paper (looking, to aim the pointer: the finding of the citations is the app's own)
const CITE = n => `return (() => {
  const ov = document.querySelector('.embed-max'), el = ov.querySelector('.pdf-slot'), P = REFMAP.page(el), res = REFMAP.done.get(REFMAP.key(P.m));
  for (const [pg, L] of res.cites) { const c = L.find(x => x.ref.n === ${n}); if (!c) continue; const pe = REFMAP.pageEl(P.root, pg), Q = REFMAP.page(pe), r = REFMAP.screenOf(Q, res, c); return { x: r.left + r.width / 2, y: r.top + r.height / 2, page: pg }; }
  return null;
})()`;
