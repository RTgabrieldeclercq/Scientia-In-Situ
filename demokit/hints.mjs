// Help lines (13zzj; Settings → Features → Help lines) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs hints
export default {
  by: '',
  use: 'One-line tips where you are, until you no longer need them.',
  view: [1280, 800], dpr: 1,
  pause: 600,
  // The tip itself cannot be shown in a note: in this build the line under a note's foot is drawn behind the header (21-sync.css `.hint{position:relative}`
  // overrides 20-canvas.css `.hint{position:absolute;bottom:62px}`), so the take shows the feature's page in Settings, whose live preview draws the tip.
  setup: async () => {
    saveSettings({ hintOff: false });   // the recorder starts with the lines off; this demonstration needs them
    const P = KIT.project(), A = KIT.note(P, 'Daily · {today}');
    KIT.done(); return { A: A.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Settings → Features: every feature has a tile with its own switch. Help lines is in Canvas & notes', async (R, c) => {
      await R.click({ sel: 'a, button, [role=tab]', text: 'Settings', ms: 700 });
      await R.until(`document.querySelector('.ft[data-f="hints"]')`, 5000);
      await R.ev(`document.querySelector('.ft[data-f="hints"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1200);
      await R.move({ sel: '.ft[data-f="hints"] .ft-t' });
      await R.sleep(1200);
    }],
    ['Open its page: the live preview shows the one-line tip as it is set now, with the × that closes it', async R => {
      await R.click('.ft[data-f="hints"] .ft-t');
      await R.until(`document.querySelector('.fp-sw .fsw')`, 4000);
      await R.sleep(3000);
    }],
    ['Switch it off: the tips go from every note; the preview shows them gone', async R => {
      await R.click('.fp-sw .fsw');
      await R.sleep(3000);
    }],
    ['Switch it on again to bring the tips back; this is also how to get them back after closing one with ×', async R => {
      await R.click('.fp-sw .fsw');
      await R.sleep(3000);
    }],
  ],
};
