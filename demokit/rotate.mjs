// Rotate the app (13zzz, V4.21) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rotate
// While the app is turned, the page reports positions in the turned frame; the recorder's pointer works on the screen, so each point
// below is made in the frame and turned to the screen with the app's own ROTATE.toScreen.
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
const scr = (x, y) => `ROTATE.toScreen(${x}, ${y})`;
const ctr = sel => ({ xy: `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return ${scr('r.left + r.width / 2', 'r.top + r.height / 2')}; })()` });
export default {
  by: 'Gabe',
  use: 'For a tablet held the other way: turn the whole app a quarter, draw with the pen as usual, and turn it back upright when you put the tablet down.',
  view: [1040, 650],
  // the test note: three steps of a run, in a column
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · 30 kPa');
    const [a] = KIT.grid(A, [
      ['Coating', 'Fibronectin at 5 µg/mL on 30 kPa gels, one hour at 37 °C.'],
      ['Seeding', 'MCF10A sheets, 60 000 cells per gel, left to settle.'],
      ['Imaging', 'Leading edge, 20× every 5 min; beads before and after trypsin.'],
    ], { cols: 1, dy: 150 });
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => {
    await R.open(c.A); await R.wheel(110, [700, 380]);
    await R.click('.lab-pill-hand .lab-pill-btn'); await R.sleep(500);   // the pen is the tool in hand
    await R.click({ sel: '.lab-pill-hand .lab-fan-item[title^="Pen"]' }); await R.sleep(900);
    await R.move([760, 330], 400);
  },
  steps: [
    ['Open the ⊕ zoom pill and press Rotate: the whole app turns a quarter, clockwise', async (R, c) => {
      await K(R, '.lab-pill-view .lab-pill-btn');
      if (!await R.until(`!!document.querySelector('.lab-pill-view .lab-fan-item[title^="Rotate"]')`, 3000)) throw new Error('the zoom pill has no Rotate');
      await R.sleep(500);
      await K(R, '.lab-pill-view .lab-fan-item[title^="Rotate"]');
      if (!await R.until(`ROTATE.r === 90`, 3000)) throw new Error('the app did not turn');
      await R.sleep(1200);
      await R.ev(`const b = M.block(${JSON.stringify(c.a)}); DocView.paper.centerOn(b.x + 300, b.y + 140, 1); return 1`);   // slide the paper so the notes are in the turned window (looking, not doing)
      await R.sleep(1200);
    }],
    ['Draw with the pen as usual: the stroke follows the pen on the turned page', async (R, c) => {
      await R.ev(`document.querySelector('.lab-pill-view') && document.querySelector('.lab-pill-view').classList.contains('open') && document.querySelector('.lab-pill-view .lab-pill-btn').click(); return 1`);
      await R.sleep(600);
      // an underline and a loop beside the first component, made in the turned frame
      const pts = await R.ev(`const r = DocView.paper.host ? DocView.paper.host.getBoundingClientRect() : { left: 0, top: 0, width: 600, height: 900 }, b = document.querySelector('.box[data-id="${c.a}"]').getBoundingClientRect();
        const x0 = b.left + 40, y = b.bottom + 14, P = [[x0, y], [x0 + 60, y + 8], [x0 + 130, y - 2], [x0 + 200, y + 8], [x0 + 260, y]];
        const cx = b.right + 60, cy = b.top + 40, L = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.6; L.push([cx + 34 * Math.cos(a), cy + 34 * Math.sin(a)]); }
        return { under: P.map(p => ROTATE.toScreen(p[0], p[1])), loop: L.map(p => ROTATE.toScreen(p[0], p[1])) }`);
      await R.pen(pts.under.map(p => [p.x, p.y]), { ms: 14 });
      await R.sleep(400);
      await R.pen(pts.loop.map(p => [p.x, p.y]), { ms: 14 });
      await R.sleep(1600);
    }],
    ['Put the tablet down: Esc three times, and the app is upright again with the ink where it was drawn', async (R, c) => {
      for (let i = 0; i < 3; i++) { await R.key('Escape', { after: 450 }); }
      if (!await R.until(`ROTATE.r === 0`, 3000)) throw new Error('the app did not come back upright');
      await R.sleep(900);
      await R.wheel(130, [700, 330]);   // the notes a little higher, the ink in full view
      await R.sleep(2000);
    }],
  ],
};
