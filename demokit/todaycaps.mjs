// Captures on Today (14a, V4.x) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs todaycaps
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Captures show up on the Today page, so you can come back to them during the day and move them to a project. Each capture has a Move to… button right under it that brings up the move panel.',
  view: [1040, 650],
  // the test setup: one project with a run note the capture will end up in, and a note in another project that must not
  setup: async () => {
    const P = KIT.project(), Q = KIT.project('Fibroblast migration');
    const A = KIT.note(P, 'Run 3 · 30 kPa', { daysAgo: 1 }), B = KIT.note(P, 'Fibronectin series', { daysAgo: 3 }), C = KIT.note(Q, 'Wound assay', { daysAgo: 5 });
    KIT.ago(KIT.fill(KIT.first(A), 'Imaging', 'Leading edge, 20× every 5 min; beads before and after trypsin.'), 1, '15:10');
    KIT.ago(KIT.fill(KIT.first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.'), 3, '11:30');
    KIT.ago(KIT.fill(KIT.first(C), 'Setup', 'Scratch at 80 % confluence, image every 10 min.'), 5, '09:45');
    KIT.done(); return { A: A.id, P: P.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.until(`!!document.querySelector('.tcap, .tcp-none')`, 6000); },
  steps: [
    ['Anywhere in the app, Ctrl+Shift+Space opens the quick capture: type the thought and add it', async (R, c) => {
      await R.key(' ', { ctrl: true, shift: true });
      if (!await R.until(`!!document.querySelector('.ovl.capture textarea')`, 3000)) throw new Error('the capture box did not open');
      await R.sleep(400);
      await R.type('Beads drift less when imaging starts 2 min after trypsin.', 32);
      await R.sleep(500);
      await K(R, { sel: '.ovl.capture .btn.pri', text: 'Add' });
      await R.sleep(900);
    }],
    ['It waits on the Today page, newest first, with its time and a Move to… button under it', async (R, c) => {
      await R.move([520, 400], 400);
      await R.until(`!!document.querySelector('.tcp-card')`, 5000);
      await R.ev(`document.querySelector('.tcp-card').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1500);
    }],
    ['Press Move to… and find the note by search: the capture goes there', async (R, c) => {
      await K(R, '.tcp-card .tcp-mv');
      if (!await R.until(`!!document.querySelector('.mp-q')`, 4000)) throw new Error('the move panel did not open');
      await R.sleep(400);
      await R.type('run 3', 60);
      await R.sleep(800);
      await K(R, { sel: '.mp-row', text: 'Run 3 · 30 kPa' });
      await R.sleep(1200);
    }],
    ['It leaves the list, and a line says where it went, with Ctrl+Z to put it back', async (R, c) => {
      await R.move([520, 420], 400);
      await R.until(`!!document.querySelector('.tcp-gone')`, 4000);
      await R.ev(`document.querySelector('.tcp-gone').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(2000);
    }],
  ],
};
