// Focus sessions (13q) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs focus
// The shortest session is one minute; the wait for it to end is cut from the recording (R.cut), and the caption says so.
export default {
  by: '',
  use: 'Shut everything else out for a set time and have the session logged in the day note.',
  view: [1040, 650], fullscreen: true,   // headless Chrome has no full screen: the recorder answers for it (see record.mjs)
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const a = KIT.fill(KIT.first(A), 'Seeding', 'Seeded at 40k/cm² on the 30 kPa gels, 10:05.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Press the focus button and say how long (one minute here; 15 minutes to 2 hours are one click)', async (R, c) => {
      await R.click('#focusbtn');
      await R.until(`!!document.querySelector('.fchips')`, 3000);
      await R.sleep(900);
      await R.click({ sel: 'input.inp.mono[type=number]' });
      await R.key('a', { ctrl: true });
      await R.type('1');
      await R.sleep(600);
      await R.click({ text: 'Start focus', sel: 'button' });
      await R.sleep(1800);
    }],
    ['The app takes the whole screen, with a frame round it and the time left', async (R, c) => {
      await R.until(`!!document.querySelector('#focusframe')`, 4000);
      await R.sleep(2200);
    }],
    ['Work as usual while it runs', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.a}"] .ed`, dx: .97, dy: .5 });
      await R.type(' Medium changed at 10:40.');
      await R.sleep(1200);
    }],
    ['When the time is up (the wait is cut here) the session is logged in today’s day note', async (R, c) => {
      await R.cut(async () => { await R.until(`!document.querySelector('#focusframe')`, 75000); });
      await R.sleep(1800);
      await R.go('#/home');
      await R.sleep(2200);
    }],
  ],
};
