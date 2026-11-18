// Edge pan in full screen (13zzh) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs edgepan
// Headless Chrome has no full screen, so the recorder answers for it (fullscreen: true; see record.mjs). The desktop app also reads
// how far the mouse pushes past the screen's edge; a recording cannot show that, so here the speed rises with the time at the edge.
export default {
  by: '',
  use: 'In full screen, rest the pointer at the screen’s edge to slide the note that way, faster the harder you push.',
  view: [1040, 650], fullscreen: true,
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Fibronectin series');
    const a = KIT.first(A), items = [['Plan', 'Coat at 1, 5 and 10 µg/mL.']];
    for (let n = 1; n <= 18; n++) items.push(['Run ' + n, [1, 5, 10][n % 3] + ' µg/mL on ' + [8, 15, 30][Math.floor((n - 1) / 6)] + ' kPa: ' + ['no edge peak.', 'the peak holds.', 'the peak is highest.'][n % 3]]);
    items.push(['Summary', 'The edge peak holds from 5 µg/mL on every stiffness.']);
    const ids = items.map(([l, t], i) => (i ? KIT.box(A, l, t, { x: a.x + i * 440, y: a.y + (i % 2) * 70 }) : KIT.fill(a, l, t)).id);
    KIT.done(); return { A: A.id, ids };
  },
  before: async (R, c) => {
    await R.open(c.A);
    // a readable zoom with the first components in view (the note opens fitted to all six, far too small to read)
    await R.ev(`const p = App.panes()[0], P = p.paper; P.zoomAt(1); const r = document.querySelector('.box[data-id="${c.ids[0]}"]').getBoundingClientRect(); P.view.x += 120 - r.left; P.view.y += 300 - r.top; P.apply ? P.apply() : P.zoomAt(1); return 1`);
    await R.sleep(600); await R.move([520, 470], 0);
  },
  steps: [
    ['Full screen (Ctrl+. here, or F11): the note’s edges are now the screen’s', async (R, c) => {
      await R.key('.', { ctrl: true });
      await R.sleep(2000);
    }],
    ['Rest the pointer at the right edge: after a moment the note slides that way. Move off, and it stops at once', async (R, c) => {
      await R.move([R.view[0] - 1, 470], 900);
      await R.sleep(1150);
      await R.move([R.view[0] - 240, 480], 280);
      await R.sleep(1700);
    }],
    ['Stay at the edge longer and it goes faster and faster', async (R, c) => {
      await R.move([R.view[0] - 1, 470], 600);
      await R.sleep(1750);
      await R.move([R.view[0] - 240, 480], 280);
      await R.sleep(1500);
    }],
    ['A quick brush against the edge moves nothing', async (R, c) => {
      await R.move([R.view[0] - 1, 440], 240);
      await R.move([R.view[0] - 260, 460], 240);
      await R.sleep(900);
    }],
  ],
};
