// Templates (20c, V4.68) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs templates
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For laying out a note type once, including image panels that wait to be filled, so that every new note of that type starts arranged.',
  view: [1040, 650],
  server: true,   // the pictures added to the panel are kept by the app's own server, as on a computer
  // the test note: the Experiment template of "Traction on soft gels" (Setup and Observe, one under the other), and a plan to start a run from
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const tp = DB.get('templates', 'tp_std_experiment');
    tp.blocks = [{ label: 'Setup', body: 'Gel stiffness, coating, cells, beads.', x: 0, y: 140 }, { label: 'Observe', body: 'What the cells and beads do.', x: 0, y: 322 }];
    DB.put('templates', tp);
    const D = M.createDoc({ type: 'planning', projectId: P.id, themeId: T.id, title: 'Bead coating' });
    KIT.fill(KIT.first(D), 'Plan', 'Coat the gels with beads, then image the leading edge.');
    KIT.done(); return { D: D.id };
  },
  before: async (R, c) => { await R.go('#/home'); },
  steps: [
    ['Settings → Templates → Edit on the Experiment template: it opens as a small canvas, its components where a new note will put them', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Settings' }, q);
      await R.until(`!![...document.querySelectorAll('.sec-h h2, .st-nav *, nav *')].find(e => /Templates/.test(e.textContent))`, 4000);
      await R.click({ sel: 'a, button, .li, div', text: 'Templates & note types' }, q);
      await R.until(`!!document.querySelector('.tplrow')`, 4000);
      await R.sleep(300);
      await R.ev(`const r = [...document.querySelectorAll('.tplrow')].find(x => /Standard experiment/.test(x.textContent)); r.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.tplrow')].find(x => /Standard experiment/.test(x.textContent)).querySelector('.btn.xs')` }, q);
      await R.until(`!!document.querySelector('.tc-stage .tc-card')`, 4000);
      await R.sleep(1200);
    }],
    ['Drag “Observe” by its title bar to sit beside “Setup”', async (R, c) => {
      const grip = `(() => { const c = [...document.querySelectorAll('.tc-card')].find(x => { const i = x.querySelector('.tc-lab'); return i && i.value === 'Observe'; }); return c.querySelector('.tc-n'); })()`;
      await R.drag({ js: grip }, { xy: `(() => { const r = ${grip}.getBoundingClientRect(); return { x: r.left + 7 + 294, y: r.top + 7 - 127 }; })()` }, { ms: 1100 });
      await R.sleep(900);
    }],
    ['Add an image placeholder and give it a shape: type 2x3. Save', async (R, c) => {
      await R.click({ sel: '.tc-bar .btn', text: '+ Image placeholder' }, q);
      await R.sleep(700);
      await R.click({ js: `document.querySelector('.tc-mn')` }, q);
      await R.key('a', { ctrl: true });
      await R.type('2x3', 160);
      await R.sleep(1100);
      await R.click({ sel: '.modal .btn.pri', text: 'Save' }, q);
      await R.sleep(900);
    }],
    ['On an experiment’s plan, Next makes the Run note from the template: arranged the same way, with the waiting panel in place', async (R, c) => {
      await R.open(c.D);
      await R.click('.nextbtn', q);
      await R.until(`!!document.querySelector('.fg-ph')`, 5000);
      await R.sleep(1500);
    }],
    ['Click the waiting panel and add two pictures: it becomes a real 2 × 3 image panel', async (R, c) => {
      await R.files(['assets/micrograph-1.jpg', 'assets/micrograph-2.jpg'], () => R.click('.fg-ph', q));
      await R.sleep(2200);
    }],
  ],
};
