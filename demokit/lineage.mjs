// Earlier versions (lineage, 12-doc ghostbar) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs lineage
export default {
  by: '',
  use: 'Change your mind without losing what you first wrote: the old wording stays under the new.',
  view: [1040, 650],
  pause: 700,
  // the test note: a claim written yesterday, with the claim recorded on its wording
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Fibronectin series', { daysAgo: 1 });
    const a0 = KIT.first(A), text = 'Fibronectin at 5 µg/mL gives the strongest traction at the leading edge.';
    KIT.fill(a0, 'Claim', text); KIT.ago(a0, 1, '16:20');
    const it = M.createItem('claim', text, M.block(a0.id));
    a0.body = { text, marks: [{ id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }] }; DB.put('blocks', a0);
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y }, head: { x: a0.x + 1700, y: a0.y + 400 } }); DB.put('documents', d);   // the note's own boxes out of the way
    KIT.done(); return { A: A.id, a0: a0.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.sleep(600);
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.a0)}); Object.assign(P.view, { z: 1, x: 90 - r.x, y: 120 - r.y }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Open the component’s menu (right-click) and choose Revise wording, then type the new wording', async (R, c) => {
      await REVISE(R, c, 'Fibronectin at 10 µg/mL gives the strongest traction at the leading edge.');
    }],
    ['Under it: “1 earlier version”. Open it to read the old wording, greyed, with its claim', async (R, c) => {
      await R.click('.ghostbar');
      await R.sleep(1800);
    }],
    ['Revise once more: now two earlier versions, the wording of each generation kept', async (R, c) => {
      await REVISE(R, c, 'Fibronectin at 10 µg/mL gives the strongest traction at the edge, not in the middle.');
      await R.click('.ghostbar');
      await R.sleep(1600);
    }],
    ['The claim recorded on the first wording is flagged there: still on the old wording', async R => {
      await R.move({ sel: '.ghost .chips' });
      await R.sleep(2000);
    }],
  ],
};
// right-click the live component, Revise wording, replace the text
async function REVISE(R, c) {
  const text = arguments[2];
  await R.rclick({ js: `[...document.querySelectorAll('.box.cmp')].filter(b => b.querySelector(':scope > .ed')).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0].querySelector(':scope > .ed')`, dx: .78, dy: .5 }, { after: 500 });
  await R.click({ sel: '.pop .op', text: 'Revise wording' });
  await R.until(`document.activeElement && document.activeElement.classList.contains('ed')`, 3000);
  await R.sleep(500);
  await R.key('a', { ctrl: true });
  await R.type(text, 45);
  await R.sleep(1000);
}
