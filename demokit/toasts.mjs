// Messages (01-util.js toast()) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs toasts
const seg = (label, text) => ({ sel: `.st-seg[aria-label="${label}"] button`, text });
export default {
  by: 'Gabe',
  use: 'Say how long the little messages stay at the bottom of the window, so there is time to read them and to press the Undo in one.',
  view: [1040, 650],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Imaging day 3');
    KIT.note(P, 'Rim traction', { daysAgo: 2 });
    const [a, b] = KIT.grid(A, [
      ['Observation', 'On gel 2 the traction peaks at 8 kPa in the outer two cell rows.'],
      ['Setup', 'Gels at 30 kPa, fibronectin 5 µg/mL; beads imaged 2 min after trypsin.'],
    ], { cols: 1, dy: 125 });
    KIT.done(); return { A: A.id, a: a.id, b: b.id };
  },
  before: async (R, c) => { await R.go('#/settings/feature/toasts'); await R.sleep(600); },
  steps: [
    ['Set “A message stays” to Much longer: the preview message now stays about ten seconds', async (R, c) => {
      await R.ev(`const p = document.querySelector('.st-seg[aria-label="A message stays"]'); p.scrollIntoView({ block: 'center' }); return 1`); await R.sleep(600);
      await R.click(seg('A message stays', 'Much longer'));
      await R.click({ sel: 'button', text: 'Show a message' });   // the page's own preview, at the new length
      await R.sleep(2500);
    }],
    ['Move a component to another note (right-click → Move to another note…): its message stays, long enough to read', async (R, c) => {
      await R.open(c.A);
      await R.ev(`const P = DocView.paper; P.view.y -= 50; P.apply(); return 1`); await R.sleep(500);
      await R.rclick({ sel: `.box[data-id="${c.b}"] .ed`, dx: .8, dy: .5 });
      await R.until(`!!document.querySelector('.pop')`, 3000); await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => o.innerText.includes('Move to another note'))` });
      await R.until(`!!document.querySelector('.mp-q')`, 3000); await R.sleep(800);
      await R.type('rim', 110);
      await R.click({ sel: '.mp-row', text: 'Rim traction' });
      await R.until(`!!document.querySelector('#toasts .toast')`, 3000);
      await R.move([900, 300], 400);
      await R.sleep(6500);   // longer than a message usually stays (3.5 s), and it is still there
    }],
    ['Highlight words and click the component’s title: that message has an Undo in it, with time to press it — pressing it puts the old title back', async (R, c) => {
      const w = k => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${c.a}"] .ed'), n = ed.firstChild, i = n.data.indexOf('traction peaks at 8 kPa'), r = document.createRange(); r.setStart(n, ${k ? 'i + 23' : 'i'}); r.setEnd(n, ${k ? 'i + 23' : 'i + 1'}); const b = r.getBoundingClientRect(); return { x: ${k ? 'b.right' : 'b.left'}, y: b.top + b.height / 2 }; })()` });
      await R.drag(w(0), w(1), { ms: 800 });
      await R.sleep(500);
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a}"] > .bh .blab').getBoundingClientRect(); return { x: r.left + 24, y: r.top + r.height / 2 }; })()` });
      await R.until(`!!document.querySelector('.t-undo')`, 3000);
      await R.move([900, 300], 400);
      await R.sleep(3500);
      await R.click('.t-undo');
      await R.sleep(2000);
    }],
  ],
};
