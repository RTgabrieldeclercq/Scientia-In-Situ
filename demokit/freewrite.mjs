// Freewrite (14j) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs freewrite
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For getting your thoughts down fast, as plain sentences, and then turning them into components of the note: the rules read the words, you correct what they got wrong, and Apply puts the cards and their links in the note.',
  view: [1040, 650],
  // the test note: today's imaging, with what was planned already in it
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const D = KIT.note(P, 'Rim traction — today’s imaging', { themeId: T.id });
    KIT.fill(KIT.first(D), 'Plan', 'Image the leading edge of 30 kPa gels, every 10 min for 6 h.');
    KIT.done(); return { D: D.id };
  },
  before: async (R, c) => { await R.open(c.D); },
  steps: [
    ['In the note, Quick cast → Freewrite: a blank page opens over the app', async (R, c) => {
      await R.click('.lab-pill-insert .lab-pill-btn', q);
      await R.until(`!!document.querySelector('.lab-fan-item.lab-fw')`, 3000);
      await R.sleep(500);
      await R.click('.lab-fan-item.lab-fw', q);
      await R.until(`!!document.querySelector('.fw-ta')`, 4000);
      await R.sleep(900);
    }],
    ['Type three sentences, as they come', async (R, c) => {
      await R.click('.fw-ta', q);
      await R.type('Beads clumped at the rim because the coating dried. Traction peaks at 8 kPa on soft gels. One of the barriers is bead drift after trypsin.', 38);
      await R.sleep(900);
    }],
    ['Convert: the rules read the words — each sentence is coloured, and the note it will make appears beside', async (R, c) => {
      await R.click('.fw-convert', q);
      await R.until(`document.querySelectorAll('.fw-mb').length >= 2`, 4000);
      await R.sleep(2200);
    }],
    ['Click a sentence’s label and make it a Result: the rules’ guess is yours to change', async (R, c) => {
      await R.click('.fw-tag:not(.fw-tagl)', q);
      await R.until(`!!document.querySelector('.kpick[data-id="result"]')`, 3000);
      await R.sleep(900);
      await R.click('.kpick[data-id="result"]', q);
      await R.sleep(1400);
    }],
    ['Apply to the note: the sentences become components, linked as they were read', async (R, c) => {
      await R.key('Escape');
      await R.click('.fw-apply', q);
      await R.sleep(1500);
      await R.wheel(200, [900, 500]);   // the note a little higher: all four new components in view
      await R.sleep(1600);
    }],
  ],
};
