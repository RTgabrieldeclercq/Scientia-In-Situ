// Needs investigation (13zzw, V3.992) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs investigate
export default {
  by: '',
  use: 'Flag something to look into, and keep seeing it until you have.',
  view: [1280, 800],
  dpr: 1,
  // the test note: a run note with "the beads drift after 40 frames"; a second note and a theme so the Portfolio looks lived in
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const B = KIT.note(P, 'Run 3', { themeId: T.id }), C = KIT.note(P, 'Seeding density notes', { themeId: T.id, daysAgo: 3 });
    const b0 = KIT.fill(KIT.first(B), 'Late frames', 'The traction maps look noisy and the beads drift after 40 frames, so the last stretch of each run is unreliable.');
    KIT.fill(KIT.first(C), 'Densities', 'Seeded at 2, 4 and 8 × 10⁴ cells per cm²; the sheets closed after two days.');
    KIT.done(); return { B: B.id, b0: b0.id };
  },
  before: async (R, c) => { await R.open(c.B); await R.until(`!document.querySelector('.toast')`, 6000); await R.move([700, 600], 0); },
  steps: [
    ['Select the words, press Ctrl+Enter then X: they are marked, with a dot in the component’s header', async (R, c) => {
      const at = side => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${c.b0}"] .ed'), w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while (n = w.nextNode()) { const i = n.data.indexOf('beads drift'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i + ${side ? 11 : 0}); r.setEnd(n, i + ${side ? 11 : 1}); const q = r.getBoundingClientRect(); return { x: ${side ? 'q.left' : 'q.left + 1'}, y: q.top + q.height / 2 }; } } return null; })()` });
      await R.drag(at(0), at(1), { ms: 700, hold: 200 });
      await R.sleep(500);
      await R.key('Enter', { ctrl: true });
      await R.sleep(1100);
      await R.key('x');
      if (!await R.until(`!!document.querySelector('.box[data-id="${c.b0}"] .inv-dot')`, 3000)) throw new Error('no dot');
      await R.sleep(1800);
    }],
    ['In the Portfolio the note has a dot that breathes; point at it to read what needs investigating', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' });
      if (!await R.until(`!!document.querySelector('.pfdot.inv')`, 8000)) throw new Error('no portfolio dot');
      await R.sleep(900);
      await R.move('.pfdot.inv');
      await R.until(`!!document.querySelector('.pf-pop, .pfpop')`, 2500);
      await R.sleep(2200);
    }],
    ['On Today it is listed above Recent notes, oldest first', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Today' });
      if (!await R.until(`!!document.querySelector('.inv-li')`, 8000)) throw new Error('not on Today');
      await R.ev(`document.querySelector('.inv-li').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(700);
      await R.move({ sel: '.inv-li' });
      await R.sleep(2200);
    }],
    ['Mark it Investigated with the tick: it leaves Today, and the Portfolio’s dot goes', async (R, c) => {
      await R.click({ sel: '.inv-li .btn' });
      await R.until(`!document.querySelector('.inv-li')`, 3000);
      await R.sleep(1500);
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' });
      await R.until(`!document.querySelector('.pfdot.inv')`, 4000);
      await R.sleep(2000);
    }],
  ],
};
