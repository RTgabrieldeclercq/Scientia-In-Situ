// Recurring chores (chores) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs chores
// A weekly chore is due on the days it is set for, so "Water bath" is set for the weekday the take is recorded on: it is due on the
// day note the take ends on. "CO₂ tank, every 14 days" counts from the day it is added and is not due yet.
const WD = new Date().getDay(), NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][WD];
export default {
  by: '',
  use: 'The lab chores that come round (the water bath, the CO₂ tank) turn up on the day they are due.',
  view: [1280, 800], dpr: 1,
  // the test note: today's day note, with a couple of entries
  setup: async () => {
    const P = KIT.project();
    DAY.add('Gel batch 14 came out even: 30 kPa across the plate.', 'observation');
    DAY.add('Order more fibronectin before run 4.', 'reminder');
    KIT.done(); return { day: DAY.doc().id, on: FEAT.on('chores') };
  },
  before: async (R, c) => { await R.go('#/doc/' + c.day); },
  steps: [
    ['Settings → Recurring chores → Recurring chores…: add “Water bath”, on weekdays, ' + NAME, async (R, c) => {
      await R.click({ sel: '#tabs *', text: 'Settings' });
      await R.until(`!!document.querySelector('.ft[data-f="chores"]')`, 5000);
      await R.ev(`document.querySelector('.ft[data-f="chores"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(300);
      await R.click('.ft[data-f="chores"] .ft-t');
      await R.until(`!![...document.querySelectorAll('button.btn.sm')].find(b => /Recurring chores/.test(b.textContent))`, 5000);
      await R.sleep(300);
      // the feature's page shows its own demonstration first, so its Settings sit further down: bring the button into view
      await R.ev(`const b = [...document.querySelectorAll('button.btn.sm')].find(x => x.textContent.includes('Recurring chores')); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 1`);
      await R.sleep(800);
      await R.click({ sel: 'button.btn.sm', text: 'Recurring chores…' });
      await R.until(`!!document.querySelector('.modal input[placeholder^="e.g. Passage"]')`, 4000);
      await R.click('.modal input[placeholder^="e.g. Passage"]');
      await R.type('Water bath', 35);
      await R.click('.modal select.inp');
      await R.key('ArrowDown'); await R.key('Enter');
      await R.click({ js: `document.querySelectorAll('.modal .row input[type=checkbox]')[${WD}]` });
      await R.sleep(500);
      await R.click({ sel: '.modal .btn.pri', text: 'Add chore' });
      await R.sleep(900);
    }],
    ['Add “CO₂ tank”, every 14 days after it was last done', async (R, c) => {
      // the feature's page shows its own demonstration first, so its Settings sit further down: bring the button into view
      await R.ev(`const b = [...document.querySelectorAll('button.btn.sm')].find(x => x.textContent.includes('Recurring chores')); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 1`);
      await R.sleep(800);
      await R.click({ sel: 'button.btn.sm', text: 'Recurring chores…' });
      await R.until(`!!document.querySelector('.modal input[placeholder^="e.g. Passage"]')`, 4000);
      await R.click('.modal input[placeholder^="e.g. Passage"]');
      await R.type('CO₂ tank', 35);
      await R.click('.modal input[type=number]');
      await R.key('a', { ctrl: true });
      await R.type('14', 70);
      await R.sleep(500);
      await R.click({ sel: '.modal .btn.pri', text: 'Add chore' });
      await R.sleep(900);
    }],
    ['Today and the day note list what is due: the water bath today (the CO₂ tank is not due for 14 days)', async (R, c) => {
      await R.click('#brand');
      await R.until(`!!document.querySelector('.chore')`, 4000);
      await R.move('.chore');
      await R.sleep(1300);
      await R.go('#/doc/' + c.day);
      await R.until(`!!document.querySelector('.chore')`, 4000);
      await R.move('.chore');
      await R.sleep(1600);
    }],
    ['Tick it done when it is done: it is ticked for the day', async (R, c) => {
      await R.click('.chore.due');
      await R.sleep(1800);
    }],
  ],
};
