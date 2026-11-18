// Shelf map (17f, V4.1) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs libmap
import { seedLibrary } from './library.mjs';
// the pointer off the spines, on bare board; a paper's card that was about to open (it opens 0.26 s after the pointer meets a spine, even if the pointer has gone) is closed
const calm = async R => { await R.move([1060, 560], 250); await R.ev(`hideHover(); return 1`); await R.sleep(300); await R.ev(`hideHover(); return 1`); };
export default {
  by: '',
  use: 'See the Library as shelves: each focus a row of spines, one per paper.',
  view: [1280, 960], dpr: 1,   // tall, so that the search box and all three shelves are in the window together
  // the same twelve papers (setup is the one libsearch uses)
  setup: seedLibrary,
  before: async R => {
    await R.go('#/library'); await R.until(`!!document.querySelector('.lm')`, 5000);
    await R.click({ sel: '.lib-vseg button', text: 'Shelves' }, { ms: 0 });   // the map stays when a search is typed
    await R.until(`!!document.querySelector('.toast')`, 4000); await R.until(`!document.querySelector('.toast')`, 8000);
    // the page scrolled until the search box is under the header: the box and the shelves are both in view
    await R.ev(`const p = document.querySelector('.pagewrap.scrolly'), q = document.querySelector('.lib-q-in').getBoundingClientRect(); p.scrollTop += q.top - 96; return 1`);
    await R.sleep(500);
    await R.move([1000, 560], 0);
  },
  steps: [
    ['The Library opens on the map: each shelf a board in its colour, its foci standing on it, one spine per paper', async R => {
      await R.move({ sel: '.lm-shelf .lm-sp' });
      await R.until(`!!document.querySelector('.hovercard')`, 1500);   // a paper's card, if it opens
      await R.sleep(1500);
      await calm(R);   // off the spines: the card closes
      await R.sleep(900);
    }],
    ['Search “traction”: the spines it finds rise, the rest fade', async R => {
      await R.click('.lib-q-in');
      await R.type('traction');
      await R.until(`!!document.querySelector('.lm-hit')`, 3000);
      await calm(R);
      await R.sleep(1600);
    }],
    ['Drag a spine onto another focus: the paper stands in both', async (R, c) => {
      const row = name => `[...document.querySelectorAll('.lm-focus')].find(f => f.querySelector('.lm-fl').textContent.includes(${JSON.stringify(name)})).querySelector('.lm-sp')`;
      const to = { js: row('Polyacrylamide recipes') };
      await R.move({ sel: `.lm-sp[data-id="${c.L.so14}"]` }); await R.sleep(200); await R.down(); await R.sleep(160);
      await R.move(to, 1300); await R.move({ xy: `(() => { const r = ${row('Polyacrylamide recipes')}.getBoundingClientRect(); return { x: r.left + r.width / 2 + 2, y: r.top + r.height / 2 + 6 }; })()` }, 300); await R.sleep(400);
      await R.up(); await R.sleep(500);
      await R.until(`document.querySelectorAll('.lm-sp[data-id="${c.L.so14}"]').length === 2`, 3000);
      await calm(R);   // off the spines: both stand in their foci, raised by the search, with no card over them
      await R.sleep(1800);
    }],
    ['Click a spine: the paper’s sheet lists the foci it stands in', async (R, c) => {
      await R.click({ js: `document.querySelectorAll('.lm-sp[data-id="${c.L.so14}"]')[1]` });
      await R.until(`!!document.querySelector('.ls-ti')`, 3000);
      await R.move({ sel: '.ls-sec .lg-chip' }, 600);   // the foci it stands in
      await R.sleep(1800);
    }],
  ],
};
