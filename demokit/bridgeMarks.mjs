// Green in the original note (13zzu, V3.994) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs bridgeMarks
// where a word of a component's text is on the screen: its left edge (0), its right edge (1) or in between
const word = (id, w, k) => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), i = ed.textContent.indexOf(${JSON.stringify(w)}), tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n, at = 0; while ((n = tw.nextNode())) { if (i < at + n.length) { const r = document.createRange(); r.setStart(n, i - at); r.setEnd(n, i - at + ${w.length}); const q = r.getBoundingClientRect(); return { x: q.left + q.width * ${k}, y: q.top + q.height / 2 }; } at += n.length; } return null; })()` });
export default {
  by: '',
  use: 'See at once, in the note where something was written, that it is used elsewhere.',
  view: [1040, 650],
  // the test notes: the seeding note, with a sentence to bridge, and the run note it will go to
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Seeding density notes'), B = KIT.note(P, 'Run 3');
    const s = KIT.fill(KIT.first(A), 'Coating', 'Coat the gels with fibronectin at 5 µg/mL overnight at 4 °C, then rinse twice before seeding.', 'method');
    KIT.fill(KIT.first(B), 'Plan', 'Image the leading edge every 10 min for 6 h.');
    KIT.done(); return { A: A.id, B: B.id, s: s.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Select a few words, press Ctrl+Enter, then N, and pick the run note', async (R, c) => {
      await R.drag(word(c.s, 'fibronectin', 0), word(c.s, 'overnight', 1), { ms: 800 });
      await R.sleep(500);
      await R.key('Enter', { ctrl: true });
      await R.until(`!!document.querySelector('.strip')`, 3000);
      await R.sleep(1200);
      await R.key('n');
      await R.until(`!!document.querySelector('.modal .pk-q')`, 4000);
      await R.sleep(400);
      await R.type('Run 3');
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal label.f input.inp')`, 4000);
      await R.sleep(300);
      await R.type('Coating this run used', 45);
      await R.sleep(400);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.box[data-id="${c.s}"] .br-tag')`, 4000);
      await R.sleep(800);
    }],
    ['The words are underlined in green; the component has a green right edge and a chip “bridged to Run 3”', async (R, c) => {
      await R.ev(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 1`);
      await R.move({ sel: `.box[data-id="${c.s}"] .br-tag` }, 900);
      await R.sleep(2200);
    }],
    ['Click the chip: Go to the note, or Open it beside this note', async (R, c) => {
      await R.click(`.box[data-id="${c.s}"] .br-tag`);
      await R.until(`document.querySelectorAll('.pop .op').length > 1`, 3000);
      await R.sleep(900);
      await R.move({ sel: '.pop .op', text: 'Go to the note' });
      await R.sleep(800);
      await R.click({ sel: '.pop .op', text: 'Open it beside this note' });
      await R.sleep(2200);
    }],
  ],
};
