// Theme banners (15f, V4.17 / V4.25) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs tbanner
export default {
  by: 'Gabe',
  use: 'Every theme has a wide banner, 1600 × 200 pixels, with its name inside it — at the top of its section in the Portfolio and on its own page. Click it to choose a picture of your own, or ask Claude to make one at that size.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: one theme with two notes (its banner is the quiet one drawn from its name until a picture is chosen: demokit/assets/banner-gels.jpg, made up, 1600 × 200)
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    KIT.grid(KIT.note(P, 'Run 3', { type: 'experiment', themeId: T.id, daysAgo: 1 }), [['Setup', 'Gel batch 15, 30 kPa, coated at 5 µg/mL fibronectin.'], ['Imaging', 'Beads imaged every 30 s for 40 min.']]);
    KIT.box(KIT.note(P, 'Gel batch 14', { themeId: T.id, daysAgo: 4 }), 'Stiffness', 'Measured 8.4 ± 0.6 kPa on the rheometer.');
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, T: T.id };
  },
  before: async (R, c) => {
    await R.go('#/portfolio'); await R.until(`!!document.querySelector('.tb-ban[data-place="portfolio"]')`, 8000);
    await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 600], 0);
  },
  steps: [
    ['In the Portfolio, a theme’s banner is drawn from its name until you give it a picture: click it', async (R, c) => {
      await R.ev(`document.querySelector('.tb-ban[data-place="portfolio"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1200);
      await R.click({ sel: '.tb-ban[data-place="portfolio"]', dx: .78, dy: .5 }, { ms: 900 });
      if (!await R.until(`!!document.querySelector('.pop .op')`, 3000)) throw new Error('the banner menu did not open');
      await R.sleep(1500);
    }],
    ['Choose an image…: a picture made at 1600 × 200 fits exactly, and the theme’s name is written over its left side', async (R, c) => {
      await R.files(['assets/banner-gels.jpg'], () => R.click({ sel: '.pop .op', text: 'Choose an image' }, { ms: 600 }));
      if (!await R.until(`!!document.querySelector('.tb-ban.img[data-place="portfolio"] img, .tb-ban.img[data-place="portfolio"] canvas')`, 6000)) throw new Error('the picture did not show');
      await R.until(`!document.querySelector('.toast')`, 8000);
      await R.move([640, 700], 700);
      await R.sleep(1500);
    }],
    ['Click the theme’s name: its page has the same banner, with its name as the page’s title', async (R, c) => {
      await R.click({ sel: '.tb-ban[data-place="portfolio"] a.tb-name' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.tb-ban.img[data-place="page"]')`, 6000)) throw new Error('no banner on the theme’s page');
      await R.move([640, 700], 600);
      await R.sleep(2200);
    }],
  ],
};
