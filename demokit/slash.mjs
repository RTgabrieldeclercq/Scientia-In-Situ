// Slash commands (13zzg) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs slash
export default {
  by: '',
  use: 'Type / in the text to act on what you just wrote or to insert anything, without leaving the keyboard.',
  view: [1040, 650],
  // the test note: a run note with one component being written, and the note the last step jumps to
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3'), B = KIT.note(P, 'Fibronectin series');
    const a0 = KIT.fill(KIT.first(A), 'Log', '');
    KIT.fill(KIT.first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y } }); DB.put('documents', d);   // the synthesis box out of the way
    KIT.done(); return { A: A.id, B: B.id, a0: a0.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.sleep(600);
    // the component near the top left at full size, with room under it
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.a0)}); Object.assign(P.view, { z: .75, x: 60 - r.x * .75, y: 70 - r.y * .75 }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Write a sentence, then type /cl: the menu narrows to /claim. Enter makes the sentence a claim', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.a0}"] .ed`, dx: .3, dy: .5 });
      await R.type('Stiffer gels pull harder at the edge ', 60);
      await R.type('/cl', 140);
      await R.until(`document.querySelector('.slash-menu')`, 2500);
      await R.move({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a0}"]').getBoundingClientRect(); return { x: r.right + 300, y: r.top + 260 }; })()` });   // the pointer off the words
      await R.sleep(1300);
      await R.key('Enter');
      await R.sleep(1500);
    }],
    ['Type /date: today is typed in', async R => {
      await R.key('Enter', { shift: true });
      await R.type('Imaged on ', 60);
      await R.type('/date', 140);
      await R.sleep(1100);
      await R.key('Enter');
      await R.sleep(1300);
    }],
    ['Type /plate: a well plate is inserted below the component', async (R, c) => {
      await R.type(' ', 60);
      await R.type('/plate', 140);
      // no longer pause here: the app saves a text 450 ms after the last key, and an Enter after that leaves "/plate" in the text (reported)
      await R.key('Enter');
      await R.sleep(1400);
      // click empty paper: the editing bar goes and the plate is seen whole
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a0}"]').getBoundingClientRect(); return { x: r.right + 260, y: r.top + 20 }; })()` });
      await R.sleep(1500);
    }],
    ['Press / on the empty paper: the bar at the foot wakes. /go Fibronectin jumps to that note', async (R, c) => {
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a0}"]').getBoundingClientRect(); return { x: r.right + 260, y: r.top + 20 }; })()` });
      await R.key('/');
      await R.until(`document.querySelector('#nav') && !document.querySelector('#nav').classList.contains('asleep')`, 3000);
      await R.sleep(600);
      await R.type('go Fibronectin', 90);
      await R.sleep(900);
      await R.key('Enter');
      await R.sleep(900);
      await R.key('Enter');
      await R.until(`DocView.docId === ${JSON.stringify(c.B)}`, 5000);
      await R.sleep(1500);
    }],
  ],
};
