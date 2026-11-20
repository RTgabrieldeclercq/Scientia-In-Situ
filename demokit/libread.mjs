// Reading state (17e, V4.1) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs libread
import { seedLibrary } from './library.mjs';
// the page scrolls its own scroller: put an element near the top of the window, clear of the header
const near = (sel, gap = 96) => `const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'start' }); let p = e.parentElement; while (p && !(p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; if (p) p.scrollTop -= ${gap}; return 1`;
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 220 }, o));
export default {
  by: '',
  use: 'Know which papers you have not opened, are reading, or have read.',
  view: [1280, 800], dpr: 1, crf: 32,
  // the same library, mostly not opened (two read, one reading); the paper to open is Varga 2017, with a PDF and no state yet
  setup: 'return await (' + seedLibrary.toString() + ')({ states: "new" })',
  before: async R => {
    await R.go('#/library'); await R.until(`!!document.querySelector('.lm-sp')`, 5000);
    await R.ev(near('.lib-q', 70)); await R.move([900, 330], 0);
    await R.sleep(4000);   // the toast the seeding raised
  },
  steps: [
    ['A paper marked “Not opened”: open its PDF from its sheet, and it becomes “Reading”', async (R, c) => {
      await R.ev(`document.querySelector('.lm-sp[data-id="${c.L.va17}"]').scrollIntoView({ block: 'center' }); return 1`);
      await K(R, { sel: `.lm-sp[data-id="${c.L.va17}"]` });
      await R.until(`!!document.querySelector('.ls-state button.on')`, 3000);
      if (!await R.ev(`return document.querySelector('.ls-state button.on').textContent === 'Not opened'`)) throw new Error('the paper was not “Not opened”');
      await R.sleep(1500);
      await K(R, { sel: '.ls-acts a.btn', text: 'Read' });
      await R.until(`document.querySelectorAll('.rd-page .textLayer span').length > 10`, 12000);
      await R.sleep(1200);
      await K(R, { sel: '.btn', text: '← Library' });
      await R.until(`!!document.querySelector('.lm-sp')`, 5000);
      await R.ev(`document.querySelector('.lm-sp[data-id="${c.L.va17}"]').scrollIntoView({ block: 'center' }); return 1`);
      await K(R, { sel: `.lm-sp[data-id="${c.L.va17}"]` });
      await R.until(`!!document.querySelector('.ls-state button.on')`, 3000);
      await R.sleep(1500);
    }],
    ['When you finish it, set it to Read on its sheet', async (R, c) => {
      await K(R, { sel: '.ls-state button', text: 'Read' });
      await R.until(`document.querySelector('.ls-state button.on') && document.querySelector('.ls-state button.on').textContent === 'Read'`, 3000);
      await R.sleep(1500);
    }],
    ['Its spine changes, and the focus’s bar in the tree shows how much of it is read', async (R, c) => {
      await K(R, { sel: '.ls-x' });
      await R.sleep(500);
      await R.ev(near('.lg-row.lg-g', 140));
      await R.sleep(500);
      await R.move({ js: `[...document.querySelectorAll('.lg-row.lg-g')].find(e => e.textContent.includes('Stiffness sensing')).querySelector('.lg-rb')` });
      await R.sleep(1600);
      await R.move({ sel: `.lm-sp[data-id="${c.L.va17}"]` });
      await R.sleep(1800);
    }],
    ['Search “is:read”: the papers you have read, each card marked Read', async R => {
      await R.ev(near('.lib-q', 70));
      await K(R, '.lib-q-in');
      await R.type('is:read ', 80);
      await R.until(`document.querySelectorAll('.libcard').length > 0`, 3000);
      await R.ev(`document.querySelector('.libcard').scrollIntoView({ block: 'center' }); return 1`);
      await R.move([1000, 330]);
      await R.sleep(2200);
    }],
  ],
};
