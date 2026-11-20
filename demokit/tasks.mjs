// Tasks (13zl) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs tasks
const q = { rest: 50, after: 90, ms: 380 };   // a quicker hand, for the small clicks
export default {
  by: '',
  use: 'Everything you have to do, from every note, in one list with dates.',
  view: [1040, 650],
  crf: 30,
  // the test notes: two notes, each with a task already (one late, one for today)
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Run 3'), B = KIT.note(P, 'Fibronectin series');
    KIT.fill(KIT.first(A), 'Plan', 'Image the leading edge every 10 min for 6 h.');
    KIT.fill(KIT.first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d) + 'T00:00'; };
    const t1 = TASK.create(A.id, { x: KIT.first(A).x, y: KIT.first(A).y + 190 }, { text: 'Photograph the gels before imaging', task: { due: day(0), allDay: true } });
    const t2 = TASK.create(B.id, { x: KIT.first(B).x, y: KIT.first(B).y + 190 }, { text: 'Order glass coverslips', task: { due: day(-2), allDay: true } });
    KIT.done(); return { A: A.id, B: B.id, t1: t1.id, t2: t2.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Right-click the paper → Insert… → Task. Write “Order fibronectin”, set it due tomorrow and high priority', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('.box').getBoundingClientRect(); return { x: r.right + 70, y: r.top + 40 }; })()` }, q);
      await R.click({ sel: '.pop .op', text: 'Insert…' }, q);
      await R.until(`!!document.querySelector('.pop input, .pop .pk-q')`, 3000);
      await R.sleep(300);
      await R.type('task');
      await R.sleep(250);
      await R.key('Enter');
      await R.until(`[...document.querySelectorAll('.tk-ed')].length >= 2`, 4000);
      await R.sleep(500);
      await R.type('Order fibronectin', 25);
      await R.sleep(300);
      const box = `[...document.querySelectorAll('.box')].find(b => (b.querySelector('.tk-ed') || {}).textContent === 'Order fibronectin')`;
      await R.click({ js: `(${box}).querySelector('.tk-chip.none')` }, q);
      await R.until(`!!document.querySelector('.modal')`, 3000);
      await R.click({ sel: '.modal button', text: 'Tomorrow' }, q);
      await R.sleep(250);
      await R.click({ sel: '.modal button', text: 'Save' }, q);
      await R.sleep(350);
      await R.click({ js: `[...(${box}).querySelectorAll('.tk-chip.none')].find(x => x.textContent.includes('priority'))` }, q);
      await R.sleep(600);
    }],
    ['The Tasks tab lists every task from every note: Overdue, Today, Upcoming', async (R, c) => {
      await R.click('#tabs .tab[data-k="tasks"]');
      await R.until(`!!document.querySelector('.tk-list .tk-g')`, 4000);
      await R.sleep(1300);
    }],
    ['Click a task to open its note, and add a subtask', async (R, c) => {
      await R.click({ sel: '.tk-lt', text: 'Order fibronectin' });
      await R.until(`DocView.docId === ${JSON.stringify(c.A)} && !!document.querySelector('.tk-add')`, 6000);
      await R.sleep(300);
      await R.click({ js: `[...document.querySelectorAll('.box')].find(b => (b.querySelector('.tk-ed') || {}).textContent === 'Order fibronectin').querySelector('.tk-add')` });
      await R.type('Check the lot number', 25);
      await R.key('Enter');
      await R.sleep(800);
    }],
    ['Tick a task done in the list: it is logged in the day note, and listed under Done lately', async (R, c) => {
      await R.click('#tabs .tab[data-k="tasks"]');
      await R.until(`!!document.querySelector('.tk-li')`, 4000);
      await R.sleep(300);
      await R.click({ js: `[...document.querySelectorAll('.tk-li')].find(r => r.textContent.includes('Order glass coverslips')).querySelector('.tk-box')` });
      await R.sleep(500);
      await R.click('#tabs .tab[data-k="home"]');
      await R.until(`document.body.textContent.includes('✓ Done: Order glass coverslips')`, 4000);
      await R.sleep(1200);
      await R.click('#tabs .tab[data-k="tasks"]');
      await R.until(`!!document.querySelector('.tk-donegrp summary')`, 4000);
      await R.click('.tk-donegrp summary');
      await R.ev(`document.querySelector('.tk-donegrp').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1500);
    }],
  ],
};
