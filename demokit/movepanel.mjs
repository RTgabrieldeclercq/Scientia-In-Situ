// The move panel (13zzzd) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs movepanel
const ed = id => ({ sel: `.box[data-id="${id}"] .ed`, dx: .8, dy: .5 });
const op = text => ({ js: `[...document.querySelectorAll('.pop .op')].find(o => o.innerText.includes(${JSON.stringify(text)}))` });
export default {
  by: 'Gabe',
  use: 'Send something to another note by searching for it, or by clicking it in the Portfolio: the same panel for bridging, moving, flagging for a synthesis and filing a note.',
  view: [1040, 650],
  // the test note: an imaging note with two findings that belong in other notes, and the notes they could go to
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Edge forces', 'Where does traction peak?');
    const A = KIT.note(P, 'Imaging day 3', { themeId: T.id });
    KIT.note(P, 'Rim traction', { themeId: T.id, daysAgo: 2 }); KIT.note(P, 'Gel batch notes', { themeId: T.id, daysAgo: 5 }); KIT.note(P, 'Seeding density', { daysAgo: 8 });
    for (const [n, t] of [['Rim traction', 'Traction peaks at 8 kPa in the outer two cell rows.'], ['Gel batch notes', 'Batches 14 to 16, 30, 12 and 3 kPa.'], ['Seeding density', 'Seed at 40k cells per cm².']]) { const d = DB.where('documents', x => x.title === n)[0]; KIT.fill(KIT.first(d), n, t); }
    const [a, b, c] = KIT.grid(A, [
      ['Rim clumps', 'Beads clumped near the rim of gel 2: the rim looks stiffer than the centre.'],
      ['Gel 14 stiffness', 'Three gels indented: 29.1, 30.4 and 30.8 kPa, so batch 14 is a true 30 kPa.'],
      ['Imaging', '20× objective, 4 positions per gel, beads imaged 2 min after trypsin.'],
    ], { cols: 1, dy: 125 });
    KIT.done(); return { A: A.id, a: a.id, b: b.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.ev(`const P = DocView.paper; P.view.y -= 50; P.apply(); return 1`); await R.sleep(500); },
  steps: [
    ['Right-click a component → Bridge to another note…: the panel opens, and typing “rim” narrows the notes', async (R, c) => {
      await R.rclick(ed(c.a));
      await R.until(`!!document.querySelector('.pop')`, 3000); await R.sleep(500);
      await R.click(op('Bridge to another note'));
      await R.until(`!!document.querySelector('.mp-q')`, 3000); await R.sleep(900);
      await R.type('rim', 120);
      await R.sleep(1000);
    }],
    ['Pick the note, say why in a few words: the component is bridged there', async (R, c) => {
      await R.click({ sel: '.mp-row', text: 'Rim traction' });
      await R.until(`!!document.querySelector('.ovl input, .ovl textarea')`, 3000); await R.sleep(500);
      await R.type('Same rim, imaged on day 3', 50);
      await R.click({ sel: '.ovl button, .modal button', text: 'OK' });
      await R.sleep(1200);
      await R.move([900, 560], 300); await R.sleep(3500);   // the message goes
    }],
    ['Right-click another component → Move to another note…, and switch the panel to the Portfolio', async (R, c) => {
      await R.rclick(ed(c.b));
      await R.until(`!!document.querySelector('.pop')`, 3000); await R.sleep(500);
      await R.click(op('Move to another note'));
      await R.until(`!!document.querySelector('.mp-q')`, 3000); await R.sleep(1000);
      await R.click({ sel: '.mp-sb', text: 'Portfolio' });
      await R.until(`!!document.querySelector('.mp-pick')`, 4000); await R.sleep(1500);
    }],
    ['A click on a note in the Portfolio picks it: the component moves there, and you are back where you were', async (R, c) => {
      await R.wheel(420, [960, 520]); await R.sleep(800);   // down the project's page to its notes
      await R.click({ sel: '#view a, #view .pf-note, #view div, #view span', text: 'Gel batch notes' });
      await R.until(`!document.querySelector('.mp-pick')`, 4000);
      await R.sleep(2500);
    }],
  ],
};
