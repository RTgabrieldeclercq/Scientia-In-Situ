// Bridges (13zzu, V3.981) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs bridges
// where a word of a component's text is on the screen: its left edge (0), its right edge (1) or in between
const word = (id, w, k) => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), i = ed.textContent.indexOf(${JSON.stringify(w)}), tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n, at = 0; while ((n = tw.nextNode())) { if (i < at + n.length) { const r = document.createRange(); r.setStart(n, i - at); r.setEnd(n, i - at + ${w.length}); const q = r.getBoundingClientRect(); return { x: q.left + q.width * ${k}, y: q.top + q.height / 2 }; } at += n.length; } return null; })()` });
export default {
  by: '',
  use: 'Show a component in another note, live, with a line saying why it is there and where it comes from.',
  view: [1040, 650],
  // the test notes: a seeding note with a recipe, and the run note that followed it
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Seeding density notes'), B = KIT.note(P, 'Run 3');
    const a = KIT.first(A);
    const rec = KIT.fill(a, 'Recipe', 'Seed at 40k/cm² on the 30 kPa gels; wait 4 h before imaging.', 'method');
    KIT.fill(KIT.first(B), 'Plan', 'Image the leading edge every 10 min for 6 h.');
    KIT.done(); return { A: A.id, B: B.id, rec: rec.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Right-click the recipe → Bridge to another note…, pick the run note and say why', async (R, c) => {
      await R.rclick({ sel: `.box[data-id="${c.rec}"] .ed`, dx: .78, dy: .5 });
      await R.click({ sel: '.pop .op', text: 'Bridge to another note' });
      await R.until(`!!document.querySelector('.modal .pk-q')`, 4000);
      await R.sleep(400);
      await R.type('Run 3');
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal label.f input.inp')`, 4000);
      await R.sleep(400);
      await R.type('The seeding this run followed', 45);
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.box[data-id="${c.rec}"] .br-tag')`, 4000);
      await R.sleep(1000);
    }],
    ['Its chip → Go to the note. In the run note: the bridge, its band (where it comes from) and its caption', async (R, c) => {
      await R.click(`.box[data-id="${c.rec}"] .br-tag`);
      await R.click({ sel: '.pop .op', text: 'Go to the note' });
      await R.until(`DocView.docId === ${JSON.stringify(c.B)} && !!document.querySelector('.box.bridge .origin')`, 6000);
      await R.sleep(800);
      await R.move({ sel: '.box.bridge .or-top', dx: .7, dy: .5 });
      await R.sleep(900);
      await R.move({ sel: '.box.bridge .br-why', dx: .6, dy: .5 });
      await R.sleep(1000);
    }],
    ['Click the note’s name in the band: back at the original. Change the recipe there', async (R, c) => {
      await R.click('.box.bridge .or-note');
      await R.until(`DocView.docId === ${JSON.stringify(c.A)} && !!document.querySelector('.box[data-id="${c.rec}"] .ed')`, 6000);
      await R.sleep(900);
      await R.drag(word(c.rec, '40k', 0), word(c.rec, '40k', 1), { ms: 500 });
      await R.sleep(400);
      await R.type('60k', 160);
      await R.until(`M.block(${JSON.stringify(c.rec)}).body.text.includes('60k')`, 4000);
      await R.sleep(900);
    }],
    ['Double-click the underline → Go to the note: the bridge has followed the change', async (R, c) => {
      await R.dblclick(word(c.rec, 'gels', .5));
      await R.click({ sel: '.pop .op', text: 'Go to the note' });
      await R.until(`DocView.docId === ${JSON.stringify(c.B)} && (document.querySelector('.box.bridge .refbody') || {}).textContent.includes('60k')`, 6000);
      await R.move({ sel: '.box.bridge .refbody .serif, .box.bridge .refbody', dx: .3, dy: .75 });
      await R.sleep(1500);
    }],
  ],
};
