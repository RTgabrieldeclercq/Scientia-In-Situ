// Sync dot (13zzj POLISH.mountDot) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs syncdot
// The dot says whether this device can reach its notebook (green), or not (red).
const dot = '#hd .syncdot';
export default {
  by: '',
  use: 'One dot tells you whether your devices are in step.',
  view: [1040, 650],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const a = KIT.fill(KIT.first(A), 'Seeding', 'Seeded at 40k/cm² on the 30 kPa gels.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['The dot left of Search is green: all is well. Click it to read how things stand', async (R, c) => {
      await R.move(dot); await R.sleep(1200);
      await R.click(dot);
      await R.sleep(3000);
    }],
    ['The connection goes: the dot turns red', async (R, c) => {
      await R.key('Escape');
      await R.offline(true);
      await R.until(`document.querySelector(${JSON.stringify(dot)}).dataset.tone === 'red'`, 6000);
      await R.sleep(2400);
    }],
    ['You can go on working meanwhile. Click the dot: it says what is wrong, in a word', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.a}"] .ed`, dx: .97, dy: .5 });
      await R.type(' Medium changed at 10:40.');
      await R.sleep(700);
      await R.click(dot);
      await R.sleep(3200);
    }],
    ['When the connection is back, so is the green', async (R, c) => {
      await R.key('Escape');
      await R.offline(false);
      await R.until(`document.querySelector(${JSON.stringify(dot)}).dataset.tone === 'green'`, 6000);
      await R.move(dot);
      await R.sleep(2400);
    }],
  ],
};
