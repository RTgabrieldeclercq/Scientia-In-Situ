// Flag for synthesis (synthflag) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs synthflag
// a point in a component's text: where `str` starts (side 'start') or ends ('end'), found by its words at run time
const at = (id, str, side = 'start') => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n;
  while (n = w.nextNode()) { const i = n.data.indexOf(${JSON.stringify(str)}); if (i < 0) continue; const r = document.createRange(), e = ${side === 'end'};
    r.setStart(n, e ? i + ${str.length} - 1 : i); r.setEnd(n, e ? i + ${str.length} : i + 1); const b = r.getBoundingClientRect(); return { x: e ? b.right : b.left + 1, y: b.top + b.height / 2 }; } return null; })()` });
export default {
  by: '',
  use: 'Send a component, or just a few words, to a Synthesis note while you are still working in the note they came from.',
  view: [1280, 800], dpr: 1,
  // the test notes: one experiment, “Run 3”, with its run, its analysis and an empty Synthesis
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Fibronectin series', 'Does the coating change where the sheet pulls?');
    const plan = CHAIN.create({ projectId: P.id, themeId: T.id, name: 'Run 3' });
    CHAIN.advance(plan); const run = CHAIN.nextOf(plan);
    CHAIN.advance(run); const an = CHAIN.nextOf(run);
    CHAIN.advance(an); const syn = CHAIN.nextOf(an);
    const g = KIT.fill(KIT.first(run), 'Gels', 'Gel batch 14, 30 kPa, coated at 5 µg/mL fibronectin.');
    const im = KIT.box(run, 'Imaging', 'Peak traction sits at the sheet edge. Bead drift stayed under 0.2 µm over the 40 min run.', { x: g.x, y: g.y + 150 });
    KIT.fill(KIT.first(an), 'Traction map', 'Peak traction sits in the outer two rows of the sheet.');
    KIT.done(); return { run: run.id, syn: syn.id, g: g.id, im: im.id };
  },
  before: async (R, c) => { await R.open(c.run); await R.move([1000, 330], 0); },
  steps: [
    ['Right-click a component and choose Flag for synthesis: the whole component goes to the Synthesis note', async (R, c) => {
      await R.rclick({ sel: `.box[data-id="${c.g}"] .ed`, dx: .78, dy: .5 });
      await R.ev(`const o = [...document.querySelectorAll('.pop .op')].find(o => o.textContent.includes('Flag for synthesis')); o.scrollIntoView({ block: 'nearest' }); return 1`);   // the menu is taller than the window
      await R.sleep(600);
      await R.click({ sel: '.pop .op', text: 'Flag for synthesis' });
      await R.sleep(1300);
    }],
    ['Select a few words in another component, press Ctrl+Enter, then F: just those words go over', async (R, c) => {
      await R.drag(at(c.im, 'Bead drift'), at(c.im, 'under 0.2 µm', 'end'), { ms: 900 });
      await R.key('Enter', { ctrl: true });
      await R.sleep(900);
      await R.key('f');
      await R.sleep(1300);
    }],
    ['Open the Synthesis note from the stage strip: the component and the passage are both there', async (R, c) => {
      await R.click({ sel: '.chainstrip a.cs', text: 'Synthesis' });
      await R.until(`DocView.docId === ${JSON.stringify(c.syn)}`, 4000);
      await R.sleep(900);
      await R.click('.lab-pill-view .lab-pill-btn');   // ⊕ → Fit everything
      await R.until(`!!document.querySelector('.lab-fan-item[aria-label^="Fit everything"]')`, 3000);
      await R.sleep(300);
      await R.click('.lab-fan-item[aria-label^="Fit everything"]');
      await R.sleep(2200);
    }],
    ['Change the original words in the run note: back in the Synthesis note, the passage has followed', async (R, c) => {
      await R.click({ sel: '.chainstrip a.cs', text: 'Run' });
      await R.until(`DocView.docId === ${JSON.stringify(c.run)}`, 4000);
      await R.sleep(900);
      await R.drag(at(c.im, '0.2'), at(c.im, '0.2', 'end'), { ms: 500 });
      await R.type('0.35', 120);
      await R.sleep(1200);
      await R.click({ sel: '.chainstrip a.cs', text: 'Synthesis' });
      await R.until(`DocView.docId === ${JSON.stringify(c.syn)}`, 4000);
      if (!await R.until(`document.body.textContent.includes('under 0.35')`, 4000)) throw new Error('the passage did not follow');
      await R.sleep(2200);
    }],
  ],
};
