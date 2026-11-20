// Whiteboard (13zzd, board/) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs board
// The pen is imitated; the board is the app's own page (board.html) inside the note.
const frame = `(() => { const f = document.querySelector('iframe.wb-full'); if (!f) return null; const r = f.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; })()`;
export default {
  by: '',
  use: 'Sketch on a whiteboard that lives in the note beside your images.',
  view: [1100, 720],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Plan · fibronectin series');
    const a = KIT.fill(KIT.first(A), 'Layout', 'One 24-well plate: fibronectin at 1, 5 and 10 µg/mL down the rows, three gels a row.');
    const f = FIG.create(A, { x: a.x + 460, y: a.y - 20 }, 1, 1); f.label = 'Dish layout'; DB.put('blocks', f);
    KIT.done(); return { A: A.id, a: a.id, f: f.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['An image panel’s empty cell can be a whiteboard instead: click Whiteboard', async (R, c) => {
      await R.move({ sel: `.box[data-id="${c.f}"] .fg-empty` });
      await R.sleep(500);
      await R.click({ sel: `.box[data-id="${c.f}"] .fg-wb` });
      await R.until(frame, 8000);
      await R.sleep(2500);   // the board's page loads
    }],
    ['It fills the window. Sketch the dish layout with the pen', async (R, c) => {
      const f = await R.ev(`return ${frame}`), x = f.l + f.w * .3, y = f.t + f.h * .28, w = f.w * .36, h = f.h * .42;
      await R.pen([[x, y], [x + w, y - 3], [x + w + 3, y + h], [x - 2, y + h + 3], [x, y]], { ms: 10 });
      for (const k of [1, 2]) await R.pen([[x + 4, y + h * k / 3], [x + w - 2, y + h * k / 3 + 3]], { ms: 9 });
      for (const k of [1, 2, 3]) await R.pen([[x + w * k / 4, y + 4], [x + w * k / 4 + 2, y + h - 3]], { ms: 9 });
      await R.sleep(1000);
    }],
    ['Done puts it back in the note: the cell shows just what was drawn', async (R, c) => {
      await R.click({ text: 'Done', sel: '.wb-max .em-bar button' });
      await R.until(`!document.querySelector('.wb-max') && !!document.querySelector('.box[data-id="${c.f}"] iframe.wb-frame, .box[data-id="${c.f}"] .wb-card')`, 8000);
      await R.sleep(2600);
    }],
    ['Click it to go on drawing: the board opens on the sketch', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.f}"] .fg-frame, .box[data-id="${c.f}"] iframe.wb-frame` });
      await R.until(frame, 8000);
      await R.sleep(2000);   // the board opens on what was drawn
      const f = await R.ev(`return ${frame}`);
      await R.pen([[f.l + f.w * .34, f.t + f.h * .52], [f.l + f.w * .42, f.t + f.h * .6], [f.l + f.w * .5, f.t + f.h * .5]], { ms: 14 });
      await R.sleep(1600);
    }],
  ],
};
