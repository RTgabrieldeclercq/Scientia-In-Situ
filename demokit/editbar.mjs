// Editing bar (editbar) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs editbar
// a point in a component's text: where `str` starts (side 'start') or ends ('end'), found by its words at run time
const at = (id, str, side = 'start') => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n;
  while (n = w.nextNode()) { const i = n.data.indexOf(${JSON.stringify(str)}); if (i < 0) continue; const r = document.createRange(), e = ${side === 'end'};
    r.setStart(n, e ? i + ${str.length} - 1 : i); r.setEnd(n, e ? i + ${str.length} : i + 1); const b = r.getBoundingClientRect(); return { x: e ? b.right : b.left + 1, y: b.top + b.height / 2 }; } return null; })()` });
const MU = '\u00b5';
export default {
  by: '',
  use: 'The bar over the component you are writing in: styles, lists, symbols and your favourites, one click away.',
  view: [1040, 650],
  // the test note: one component of protocol text
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Seeding protocol');
    const b = KIT.fill(KIT.first(A), 'Seeding', 'Keep the gels wet until the cells are seeded.\nCoat each gel with fibronectin at 5 g/mL\nRinse twice with PBS\nSeed the cells at 40k/cm²');
    KIT.done(); return { A: A.id, b: b.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.move([860, 330], 0); },
  steps: [
    ['Click into the component: the bar appears over it', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.b}"] .ed`, dx: .5, dy: .5 });
      await R.until(`!!document.querySelector('.ebar')`, 3000);
      await R.sleep(1100);
    }],
    ['Select two words and press Bold; select three lines and press the checkbox list', async (R, c) => {
      await R.drag(at(c.b, 'gels wet'), at(c.b, 'gels wet', 'end'), { ms: 700 });
      await R.click('.ebar .eb-b');
      await R.sleep(700);
      await R.drag(at(c.b, 'Coat each'), at(c.b, 'cm²', 'end'), { ms: 1000 });
      await R.click('.ebar .eb-box');
      await R.sleep(1200);
    }],
    ['Open ∑ Symbols and click µ; star it as a favourite, and its bolt makes it a button on the bar', async (R, c) => {
      await R.click(at(c.b, 'g/mL'), { rest: 250 });   // the caret before “g/mL”
      await R.click({ sel: '.ebar button', text: '∑' });
      await R.until(`!!document.querySelector('.symp')`, 3000);
      await R.ev(`const s = [...document.querySelectorAll('.symp .sym .sy')].find(e => e.textContent === ${JSON.stringify(MU)}); s.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      const cell = { js: `[...document.querySelectorAll('.symp .sym')].find(e => e.querySelector('.sy').textContent === ${JSON.stringify(MU)})` };
      await R.click(cell);
      await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.symp .sym')].find(e => e.querySelector('.sy').textContent === ${JSON.stringify(MU)}).querySelector('.st2')` });   // ☆
      await R.until(`!!document.querySelector('.symp .qk')`, 3000);
      await R.sleep(700);
      await R.click('.symp .qk');   // the bolt
      await R.sleep(1100);
      await R.key('Escape');
      await R.sleep(500);
    }],
    ['Open + for the extras (Bridge, Citation, Term, Equation…); tick Citation and its button joins the bar', async (R, c) => {
      await R.click('.ebar button.plus');
      await R.until(`!!document.querySelector('.ebmore')`, 3000);
      await R.sleep(900);
      await R.click({ sel: '.ebmore .eb-opt', text: 'Citation' });
      await R.sleep(1500);
    }],
  ],
};
