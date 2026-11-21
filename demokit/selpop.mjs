// Selection popup (08-ui popAway, 13zw-quote, V4.99) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs selpop
// Shown with a saved web page (assets/report-run3.html) in a note: select a sentence in it, and the menu comes and goes as a PDF's does.
export default {
  by: 'Gabe',
  use: 'Quote from a saved web page in a note, and have the selection menu get out of the way: it opens when you highlight a sentence, and closes as soon as you click anywhere else, press Esc, or the highlight goes, so it never stays over what you are reading.',
  view: [1040, 650],
  // the test note: a reading note with the saved Run 3 report beside a line saying why it is kept
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading · Run 3 report');
    const a0 = KIT.fill(KIT.first(A), 'Why', 'The Run 3 report is the one to quote from in the methods.', 'question');
    const hrec = await MEDIA.add(await KIT.asset('report-run3.html'));
    const h = M.addBlock(A.id, null, { kind: 'html', label: 'Run 3 traction report', media: hrec.id, x: a0.x, y: a0.y + 140, w: 640, h: 440 });
    h.body = { text: 'Run 3 traction report', marks: [] }; DB.put('blocks', h);
    KIT.done(); return { A: A.id, a0: a0.id, h: h.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.until(`(() => { const fr = document.querySelector('.box[data-id="${c.h}"] iframe'); return fr && fr.offsetWidth > 0 && !fr.getAttribute('src'); })()`, 15000);
    await R.sleep(1500);   // the page draws inside its frame
    await R.ev(`const a = M.block(${JSON.stringify(c.a0)}); DocView.paper.centerOn(a.x + 400, a.y + 250, 1); return 1`);
    await R.sleep(1200);
  },
  steps: [
    ['Highlight a sentence in the saved page: the selection menu appears beside it', async (R, c) => {
      c.pt = await R.ev(SENT(c.h));
      await R.drag([c.pt.x1, c.pt.y1], [c.pt.x2, c.pt.y2], { ms: 1100 });
      await R.until(`!!document.querySelector('.pop')`, 4000);
      await R.sleep(1800);
    }],
    ['Click anywhere else: the menu closes at once, and does not stay over the page', async (R, c) => {
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.h}"]').getBoundingClientRect(); return { x: r.right + 110, y: r.top + 260 }; })()` });
      await R.until(`!document.querySelector('.pop')`, 3000);
      await R.sleep(1500);
    }],
    ['Highlight it again and choose Quote: the sentence becomes a component beside the page', async (R, c) => {
      c.pt = await R.ev(SENT(c.h));
      await R.click([c.pt.x2 + 60, c.pt.y2 + 150]);   // a click in the page's blank part first: the old highlight goes
      await R.sleep(500);
      await R.drag([c.pt.x1, c.pt.y1], [c.pt.x2, c.pt.y2], { ms: 1000 });
      await R.until(`!!document.querySelector('.pop')`, 4000);
      await R.sleep(1000);
      await R.click({ sel: '.pop button', text: 'Quote' });
      await R.sleep(1200);
      // slide the paper left so the new component is whole in view (looking, not doing: the quote is already made)
      await R.ev(`const P = DocView.paper; for (let i = 1; i <= 20; i++) { P.view.x -= 17; P.apply(); await new Promise(q => setTimeout(q, 28)); } return 1`);
      await R.sleep(2200);
    }],
  ],
};

// where the second sentence of the page's first paragraph is on the screen, to aim the drag (the page is a sandboxed copy, so its
// text cannot be measured: the line sits at a fixed place in it, drawn at the note's zoom)
const SENT = id => `return (() => {
  const fr = document.querySelector('.box[data-id="${id}"] iframe'), r = fr.getBoundingClientRect(), z = r.width / fr.offsetWidth;
  return { x1: r.left + 18 * z, y1: r.top + 106 * z, x2: r.left + 524 * z, y2: r.top + 106 * z };
})()`;
