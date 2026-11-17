// Feature demonstrations (20-settings.js featurePage, V4.12) — the demonstration on its own page. Record: node scientia/demokit/record.mjs demos
// It shows another feature's page, so record that feature (floats) first: its recording plays inside this one.
export default {
  by: 'Gabe',
  use: 'Each feature deserves a full page when clicked on, with a demonstration of what it can be used for, described by the user. Claude then creates a test note, screen records the process of using the feature, and embeds that video in the Settings tab for that feature page.',
  view: [1280, 800], dpr: 1,
  before: async R => { await R.go('#/settings'); await R.move([640, 420], 0); },
  steps: [
    ['Settings → Features: every feature has a tile. Click one for its page', async R => {
      await R.ev(`document.querySelector('.ft[data-f="floats"]').scrollIntoView({ behavior: 'smooth', block: 'center' }); return 1`);
      await R.sleep(1300);
      await R.click('.ft[data-f="floats"] .ft-t');
      await R.until(`!!document.querySelector('.fp[data-f="floats"]')`, 4000);
      await R.sleep(1400);
    }],
    ['Its page: what it is, and what it is for in the words of whoever asked for it. Play starts the recording', async R => {
      await R.click('.fd-play');
      await R.until(`(() => { const v = document.querySelector('.fd-v'); return v && !v.paused && v.currentTime > 0.3; })()`, 8000);
      await R.sleep(3600);
    }],
    ['The steps are under it: click one and the recording plays from there', async R => {   // (kept clear of the window's foot: resting there opens the navigation bar)
      await R.ev(`document.querySelector('.fd-steps').scrollIntoView({ behavior: 'smooth', block: 'center' }); return 1`);
      await R.sleep(1000);
      await R.click({ js: `document.querySelectorAll('.fd-step')[4]` });
      await R.sleep(3800);
      await R.ev(`document.querySelector('.fd-v').pause(); return 1`);
    }],
    ['Below: the feature’s settings, with its live preview beside them following each change', async R => {
      await R.ev(`document.querySelector('.fp .ft-tunes').scrollIntoView({ behavior: 'smooth', block: 'center' }); return 1`);
      await R.sleep(1200);
      await R.click({ js: `[...document.querySelectorAll('.fp .st-seg button')].find(b => b.textContent === 'Where they came from')` });
      await R.sleep(1500);
      await R.click({ js: `[...document.querySelectorAll('.fp .st-seg button')].find(b => b.textContent === 'Kind')` });
      await R.sleep(900);
    }],
    ['‹ Features goes back to the board, at the tile you came from', async R => {
      await R.ev(`document.querySelector('.pagewrap').scrollTo({ top: 0, behavior: 'smooth' }); return 1`);
      await R.sleep(1000);
      await R.click('.fp-back');
      await R.sleep(1500);
    }],
  ],
};
