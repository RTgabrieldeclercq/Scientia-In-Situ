// Writing in components (12 · 13u · 13vb · 13zu2) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs writing
export default {
  by: '',
  use: 'Write in boxes on the paper; what you type becomes the symbols scientists write, a paste lands where you are looking, and what a box pushed away comes back when it shrinks.',
  view: [1040, 650],
  // the test note: "Gel batch 14" with two components, one under the other (the lower one is set right under the upper one's real
  // height in `before`, once the note is drawn), and a note to copy a component from
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Gel batch 14'), B = KIT.note(P, 'Run 3');
    const a0 = KIT.first(A);
    const c1 = KIT.fill(a0, 'Recipe', 'Acrylamide 40 %: 1.25 mL\nBis-acrylamide 2 %: 0.75 mL\nPBS: 3 mL\nAPS and TEMED last, then pour within 2 min.\nCoverslip on top for 30 min.');
    const c2 = KIT.box(A, 'Coating', 'Fibronectin at 5 µg/mL, 1 h at 37°.', { x: a0.x, y: a0.y + 600 });
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y } }); DB.put('documents', d);   // the synthesis box out of the way
    const b1 = KIT.fill(KIT.first(B), 'Result', 'The leading edge pulled hardest in the first 40 min.', 'result');
    KIT.done(); return { A: A.id, B: B.id, c1: c1.id, c2: c2.id, b1: b1.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.sleep(600);
    // the two components at the left of the window, at full size, with empty paper to their right
    // the lower component goes right under the upper one's real height (a gap of 28), so nothing pushes it: folding the upper one is
    // what moves it. The note is opened again so that it is drawn where it was put.
    await R.ev(`const r = DocView.rectOf(${JSON.stringify(c.c1)}), b = M.block(${JSON.stringify(c.c2)}); b.x = M.block(${JSON.stringify(c.c1)}).x; b.y = Math.ceil((r.y + r.h + 28) / 14) * 14; delete b.shift; DB.put('blocks', b); return 1`);
    await R.open(c.B); await R.open(c.A);
    await R.sleep(500);
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.c1)}); Object.assign(P.view, { z: 1, x: 40 - r.x, y: 150 - r.y }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Double-click the paper to write there. What is typed turns into the symbols as it goes: ±, °, µ, ₂, →', async (R, c) => {
      const at = { xy: `(() => { const r = document.querySelector('.box[data-id="${c.c1}"]').getBoundingClientRect(); return { x: r.right + 90, y: r.top + 40 }; })()` };
      await R.dblclick(at);
      await R.until(`document.activeElement && document.activeElement.classList.contains('ed')`, 3000);
      c.nb = await R.ev(`return document.activeElement.closest('.box').dataset.id`);
      await R.dblclick(`.box[data-id="${c.nb}"] .blab`);   // a double-click on a component's name edits it: give it a title (the placeholder is "label")
      await R.until(`document.activeElement && document.activeElement.classList.contains('blab')`, 2000);
      await R.type('Beads', 90);
      await R.click({ sel: `.box[data-id="${c.nb}"] .ed`, dx: .5, dy: .5 });
      await R.move({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.nb}"]').getBoundingClientRect(); return { x: r.left + r.width * .6, y: r.bottom + 60 }; })()` });   // the pointer off the words
      await R.type('30 kPa +- 2 at 37 deg, 5 uL beads, CO_2 5 % --> stiffer', 95);
      await R.sleep(1200);
    }],
    ['Backspace right after a replacement puts back what was typed', async R => {
      await R.type(', n >=', 110);
      await R.sleep(1000);
      await R.key('Backspace');
      await R.sleep(1600);
    }],
    ['Fold the upper component: the one under it rises into the space. Unfold it: it is pushed down again', async (R, c) => {
      await R.click(`.box[data-id="${c.c1}"] .cfold`);
      await R.sleep(1700);
      await R.click(`.box[data-id="${c.c1}"] .cfold`);
      await R.sleep(1500);
    }],
    ['Copy a component from another note, paste it here: it lands in the centre of the view, on top, as a bridge', async (R, c) => {
      await R.open(c.B);
      await R.click({ sel: `.box[data-id="${c.b1}"] .bh .num` });
      await R.key('c', { ctrl: true });
      await R.sleep(1000);
      await R.open(c.A);
      await R.move({ xy: `(() => { const r = DocView.paper.rect(); return { x: r.left + r.width * .5, y: r.top + r.height * .82 }; })()` });   // clear of where it will land
      await R.sleep(300);
      await R.key('v', { ctrl: true });
      await R.sleep(2200);
    }],
  ],
};
