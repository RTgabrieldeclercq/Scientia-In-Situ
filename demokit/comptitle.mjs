// Component titles (12f, V4.98) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs comptitle
const PHRASE = 'traction peaks at 8 kPa';
// the screen position of the start / end of a phrase in a component's text
const edge = (id, end) => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(${JSON.stringify(PHRASE)}); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i + ${end ? PHRASE.length : 0}); r.setEnd(n, i + ${end ? PHRASE.length : 0} + (${end ? 0 : 1})); if (${end ? 'true' : 'false'}) { r.setStart(n, i + ${PHRASE.length - 1}); r.setEnd(n, i + ${PHRASE.length}); } const b = r.getBoundingClientRect(); return { x: ${end ? 'b.right' : 'b.left'}, y: b.top + b.height / 2 }; } return null; })()` });
const title = id => ({ xy: `(() => { const r = document.querySelector('.box[data-id="${id}"] > .bh .blab').getBoundingClientRect(); return { x: r.left + 24, y: r.top + r.height / 2 }; })()` });
export default {
  by: 'Gabe',
  use: 'Name a component from its own words in one gesture: highlight the words, then click its title. With nothing highlighted, a click on the title lets you type one, at any time.',
  view: [1040, 650],
  // the test note: a result component with a plain title, and its neighbour
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Imaging day 3');
    const [a] = KIT.grid(A, [
      ['Observation', 'On gel 2 the traction peaks at 8 kPa in the outer two cell rows, and the centre of the colony stays below 2 kPa.', 'result'],
      ['Setup', 'Gels at 30 kPa, fibronectin 5 µg/mL. Beads imaged 2 min after trypsin, 20× objective.'],
    ], { cols: 1, dy: 190 });
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.ev(`const P = DocView.paper; P.view.y += 30; P.apply(); return 1`); await R.sleep(500); },
  steps: [
    ['Highlight a few words in a component: here “traction peaks at 8 kPa”', async (R, c) => {
      await R.drag(edge(c.a, false), edge(c.a, true), { ms: 900 });
      await R.sleep(900);
    }],
    ['Click its title: the highlighted words become the title, and the toast has an Undo', async (R, c) => {
      await R.click(title(c.a));
      await R.sleep(2000);
    }],
    ['Click the title with nothing highlighted and type a new one: Enter keeps it', async (R, c) => {
      await R.move([900, 500], 300); await R.sleep(2500);   // the toast fades
      await R.click(title(c.a));
      await R.key('a', { ctrl: true });
      await R.type('Rim traction');
      await R.key('Enter');
      await R.sleep(1200);
    }],
    ['Click the paper to leave the text, then Ctrl+Z: the title before comes back', async (R, c) => {
      await R.click([900, 300]);
      await R.key('z', { ctrl: true });
      await R.sleep(1800);
    }],
  ],
};
