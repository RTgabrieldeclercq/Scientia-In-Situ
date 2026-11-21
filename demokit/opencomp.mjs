// Open a component (11-shell App.openComponent, 12-doc landOn, V4.67) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs opencomp
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For jumping straight to a component from anywhere — a task, a search result, a link — and arriving with it centred and readable, with what is around it, instead of hunting for it on a large canvas.',
  view: [1040, 650],
  // the test note: a wide note with the task "Order fibronectin" far down in a corner of it
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const D = KIT.note(P, 'Run 3 · 30 kPa', { themeId: T.id });
    const a = KIT.first(D);
    KIT.grid(D, [['Plan', 'Image the leading edge of 30 kPa gels every 10 min for 6 h.', 'method'], ['Setup', 'Gels poured Monday, coated with fibronectin at 5 µg/mL.'], ['Beads', 'Beads at 0.2 µm, spun 5 min.'], ['Cells', 'Passage 14, seeded at 2000 cells/cm².'],
      ['Observe', 'Beads move inward at the leading edge.'], ['Question', 'Does the peak move with EGF?', 'question'], ['Control', 'A gel with no cells for the drift.'], ['Result', 'Peak 3.2 kPa, 20 µm in from the edge.', 'result'], ['Barrier', 'Bead drift after trypsin.', 'barrier']], { cols: 3, dy: 190 });
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d) + 'T00:00'; };
    const t = TASK.create(D.id, { x: a.x + 460, y: a.y + 590 }, { text: 'Order fibronectin', task: { due: day(1), allDay: true } });
    KIT.done(); return { D: D.id, t: t.id };
  },
  steps: [
    ['Tasks tab → click “Order fibronectin”: its note opens with the task centred, at 50%, with its neighbours around it', async (R, c) => {
      await R.click('#tabs .tab[data-k="tasks"]', q);
      await R.until(`!!document.querySelector('.tk-lt')`, 4000);
      await R.sleep(900);
      await R.click({ sel: '.tk-lt', text: 'Order fibronectin' }, q);
      await R.until(`DocView.docId === ${JSON.stringify(c.D)} && !!document.querySelector('.tk-ed')`, 6000);
      await R.sleep(2500);
    }],
    ['Settings → Features → Open a component: set “Zoom on arrival” to 100%', async (R, c) => {
      await R.click('#tabs .tab[data-k="settings"]', q);
      await R.until(`!!document.querySelector('a[href="#/settings/feature/opencomp"]')`, 4000);
      await R.ev(`document.querySelector('a[href="#/settings/feature/opencomp"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await R.click('a[href="#/settings/feature/opencomp"]', q);
      await R.until(`!!document.querySelector('.fp[data-f="opencomp"] .ft-tunes')`, 4000);
      await R.ev(`document.querySelector('.fp[data-f="opencomp"] .ft-tunes').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(700);
      await R.click({ sel: '.ft-tunes .st-seg button', text: '100%' }, q);
      await R.sleep(1600);
    }],
    ['Open the task again, this time from search: it arrives at 100%', async (R, c) => {
      await R.key('k', { ctrl: true, shift: true });   // the quick search, the list (Ctrl+K itself goes to the Atlas)
      await R.until(`!!document.querySelector('.ovl.search input')`, 4000);
      await R.sleep(500);
      await R.type('Order fibro', 70);
      await R.sleep(1200);
      await R.key('Enter');
      await R.until(`DocView.docId === ${JSON.stringify(c.D)} && !!document.querySelector('.tk-ed')`, 6000);
      await R.sleep(2500);
    }],
  ],
};
