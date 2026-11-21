// Calendar (23e, V4.57–V4.70) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs calendar
// The week is the one that holds today; the days used are its Tuesday, Wednesday and Thursday (so the take works any day of the year).
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Plan the week around your experiments: put them on the calendar at their time, link each to its note, move them as the week changes, and say what each should deliver.',
  view: [1280, 800], dpr: 1, crf: 32, pause: 500,
  // the test week: a few events, and the note the new experiment will be linked to
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const r3 = KIT.note(P, 'Run 3 · 30 kPa', { themeId: T.id, daysAgo: 5 }), r4 = KIT.note(P, 'Run 4 · 30 kPa', { themeId: T.id, daysAgo: 1 });
    KIT.fill(KIT.first(r3), 'Imaging', 'Leading edge, 20× every 5 min; beads before and after trypsin.');
    KIT.fill(KIT.first(r4), 'Plan', 'Same 30 kPa gels as run 3; image the beads first.');
    const wk = CAL.weekOf(CAL.today()), D = n => CAL.addD(wk, n);   // Mon = 0
    const ev = (o) => { const e = CAL.make(Object.assign({ projectId: P.id }, o)); DB.put('events', e); return e; };
    ev({ title: 'Lab meeting', day: D(2), start: 540, end: 600, kind: 'meeting' });
    ev({ title: 'Seminar', day: D(2), start: 900, end: 960, kind: 'other' });
    ev({ title: 'Run 3 · image the edge', day: D(1), start: 780, end: 900, kind: 'experiment', docId: r3.id });
    ev({ title: 'Journal club', day: D(3), start: 600, end: 660, kind: 'other' });
    KIT.done(); return { wed: D(2), thu: D(3), r4: r4.id };
  },
  before: async (R, c) => {
    await R.go('#/calendar');
    if (!await R.until(`!!document.querySelector('.cal-scroll .cal-col')`, 8000)) throw new Error('the calendar did not open');
    await R.ev(`const sc = document.querySelector('.cal-scroll'); sc.scrollTop = CAL.hpx * 7.4; return 1`);   // from about 7:30: the working day in view
    await R.sleep(500); await R.move([900, 700], 0);
  },
  steps: [
    ['Click a free spot on Wednesday: the window opens at that time. Name the experiment, give it its type and link its note', async (R, c) => {
      await K(R, { sel: `.cal-col[data-day="${c.wed}"] .cal-slot[data-s="600"]`, dx: .5, dy: .22 });
      if (!await R.until(`!!document.querySelector('.cal-cw .cw-title')`, 3000)) throw new Error('the create window did not open');
      await R.sleep(500);
      await R.type('Run 4 · image beads', 45);
      await K(R, { sel: '.cal-cw .cw-c', text: 'Experiment' });
      await K(R, { sel: '.cal-cw button', text: 'Link a note' });
      if (!await R.until(`!!document.querySelector('.cal-cw .cw-np')`, 3000)) throw new Error('the notes did not list');
      await R.sleep(500);
      await K(R, { sel: '.cal-cw .cw-np', text: 'Run 4' });
      await R.sleep(900);
      await K(R, { sel: '.cal-cw button', text: 'Create' });
      if (!await R.until(`!!DB.where('events', e => e.title === 'Run 4 · image beads').length`, 3000)) throw new Error('the event was not made');
      c.ev = await R.ev(`return DB.where('events', e => e.title === 'Run 4 · image beads')[0].id`);
      await R.move([900, 700], 500);
      await R.sleep(1500);
    }],
    ['Plans change: drag it to Thursday afternoon', async (R, c) => {
      const card = `.cal-ec[data-k^="${c.ev}@"]`;
      const to = { xy: `(() => { const col = document.querySelector('.cal-col[data-day="${c.thu}"]').getBoundingClientRect(); return { x: col.left + col.width / 2, y: col.top + CAL.hpx * 14.2 }; })()` };
      await R.drag({ sel: card, dx: .5, dy: .35 }, to, { ms: 1300, hold: 400 });
      if (!await R.until(`DB.get('events', ${JSON.stringify(c.ev)}).day === ${JSON.stringify(c.thu)}`, 3000)) throw new Error('the event did not move');
      await R.move([900, 700], 500);
      await R.sleep(1500);
    }],
    ['Rest on it a moment: it opens in place. Say what it should deliver — a Result — and add it', async (R, c) => {
      await R.move({ sel: `.cal-ec[data-k^="${c.ev}@"]`, dx: .5, dy: .35 });
      if (!await R.until(`!!document.querySelector('.cal-bub .cal-dvadd')`, 4000)) throw new Error('the card did not open in place');
      await R.sleep(900);
      await R.ev(`document.querySelector('.cal-bub .cal-dvadd').scrollIntoView({ block: 'nearest' }); return 1`);
      await K(R, { sel: '.cal-bub .cal-dvk .cw-c', text: 'Result' });
      await K(R, { js: `document.querySelector('.cal-bub .cal-dvadd input')` });
      await R.type('Traction map of the beads', 45);
      await K(R, { sel: '.cal-bub .cal-dvadd button', text: 'Add' });
      if (!await R.until(`!!document.querySelector('.cal-bub .cal-tk')`, 3000)) throw new Error('the deliverable was not added');
      await R.sleep(2200);
    }],
    ['Month view: the whole month at a glance, with the experiment on its new day', async (R, c) => {
      await R.move([900, 700], 400);
      await R.key('Escape');
      await K(R, { sel: '.cal-seg button', text: 'Month' });
      if (!await R.until(`!!document.querySelector('.cal-mo')`, 3000)) throw new Error('the month did not open');
      await R.move([900, 760], 500);
      await R.sleep(2600);
    }],
  ],
};
