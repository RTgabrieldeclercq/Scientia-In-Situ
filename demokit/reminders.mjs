// Reminders (reminders) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs reminders
export default {
  by: '',
  use: 'Deadlines, meetings and reminders in one place, tied to the note they are about.',
  view: [1040, 650],
  // the test note: a run note, nothing due yet. The meeting is typed for the next 15:00 (today before 14:00, else tomorrow), so the bell, which counts a day ahead, has it whenever this is recorded.
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const a = KIT.fill(KIT.first(A), 'Plan', 'Image the leading edge every 5 min; beads before and after trypsin.', 'method');
    KIT.box(A, 'Gels', 'Gel batch 14, 30 kPa, coated with fibronectin at 5 µg/mL.', { x: a.x, y: a.y + 160 });
    // a reminder made a while ago that comes due during the take: its alert is the app's own, at its own time (nothing is moved)
    DB.put('reminders', { id: uid('rm'), created: isoLocal(new Date(Date.now() - 864e5)), kind: 'reminder', title: 'Change the medium on the 30 kPa gels', at: isoLocal(new Date(Date.now() + 42000)), end: null, allDay: false, where: '', repeat: 'none', lead: 0,
      projectId: P.id, themeId: null, docId: A.id, notes: '', modified: isoLocal(new Date()), alerted: null, done: null });
    const t = new Date(); if (t.getHours() >= 14) t.setDate(t.getDate() + 1);   // the next 15:00, so it is within the day the bell counts
    KIT.done(); return { A: A.id, a: a.id, tom: String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0') + t.getFullYear() };
  },
  before: async (R, c) => { await R.open(c.A); await R.move([860, 420], 0); },
  steps: [
    ['Right-click the paper → Insert… → Deadline or meeting: “Lab meeting”, ' + (new Date().getHours() >= 14 ? 'tomorrow' : 'today') + ' at 15:00, alert 15 min before', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a}"]').getBoundingClientRect(); return { x: r.right + 70, y: r.top + 20 }; })()` });
      await R.click({ sel: '.pop .op', text: 'Insert…' });
      await R.type('deadline');
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal .seg')`, 4000);
      await R.click({ sel: '.modal .seg button', text: 'Meeting' });
      await R.click('.modal input[placeholder^="e.g."]');
      await R.type('Lab meeting', 40);
      await R.click({ sel: '.modal input[type=date]', dx: 14 });
      await R.type(c.tom, 45);
      await R.click({ sel: '.modal input[type=time]', dx: 14 });
      await R.type('0300P', 60);
      await R.sleep(700);
      await R.click({ sel: '.modal .btn.pri', text: 'Save' });
      await R.sleep(1400);
    }],
    ['The bell in the header counts it', async (R, c) => {
      await R.move('#remindbtn');
      await R.sleep(1000);
      await R.click('#remindbtn');
      await R.until(`!!document.querySelector('.rmpop .rm-row')`, 3000);
      await R.sleep(1700);
      await R.key('Escape');
      await R.ev(`closePop(); return 1`);
    }],
    ['Today: Coming up lists it, with the note it is about', async (R, c) => {
      await R.click('#brand');
      await R.until(`!!document.querySelector('.rm-list.home .rm-row')`, 4000);
      await R.ev(`document.querySelector('.rm-list.home').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await R.move('.rm-list.home .rm-row');
      await R.sleep(1800);
    }],
    ['When a reminder comes due, its alert shows wherever you are: Snooze 10 min, Done or Dismiss (the wait is cut)', async (R, c) => {
      await R.cut(async () => { if (!await R.until(`!!document.querySelector('.rm-alert')`, 90000)) throw new Error('the alert never came'); });   // the wait for its minute is cut
      await R.move('.rm-alert .btn');
      await R.sleep(2600);
    }],
  ],
};
