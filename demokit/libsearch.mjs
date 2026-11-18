// Library search (17e, V4.1) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs libsearch
import { seedLibrary } from './library.mjs';
export default {
  by: '',
  use: 'Find a paper by anything you remember about it: an author, a year, a shelf, a highlight you made.',
  view: [1280, 800], dpr: 1,
  // a library of twelve papers on three shelves, some highlighted, some read
  setup: seedLibrary,
  before: async R => { await R.go('#/library'); await R.until(`!!document.querySelector('.lib-q-in')`, 5000); await R.move([640, 330], 0); },
  steps: [
    ['Type an author, a year and a word: suggestions come as you type, and each result says why it matched', async R => {
      await R.click('.lib-q-in');
      await R.type('author:mar');
      await R.until(`!document.querySelector('.lib-sugg').hidden`, 3000);
      await R.sleep(1100);
      await R.key('Enter');
      await R.sleep(500);
      await R.type('year:>2005 traction');
      await R.until(`document.querySelectorAll('.libcard').length > 0`, 3000);
      await R.sleep(1800);
    }],
    ['Click a facet to narrow it: Shelf → Mechanobiology', async R => {
      await R.click({ sel: '.lib-facets .lf-opts button', text: 'Mechanobiology' });
      await R.sleep(1800);
    }],
    ['Replace the search with is:unread: the papers not opened yet', async R => {
      await R.click('.lib-q-in');
      await R.key('a', { ctrl: true });
      await R.type('is:unread');
      await R.sleep(1800);
    }],
    ['A word only the PDFs hold finds nothing until “Inside the PDFs’ text” is ticked (the reading is cut short here)', async R => {
      await R.key('a', { ctrl: true });
      await R.type('rheometry');
      await R.sleep(1200);
      await R.click({ sel: 'label', text: 'Inside the PDFs’ text' });
      await R.sleep(1200);
      // the PDFs are read once; the wait is cut from the take, and the take must end on the match
      await R.cut(async () => { if (!await R.until(`!!document.querySelector('.libcard .lib-why') && !/reading/.test((document.querySelector('.lib-load') || {}).textContent || '')`, 120000)) throw new Error('the PDFs were not read, or the word was not found'); });
      await R.move({ sel: '.libcard .lib-why' });
      await R.sleep(2200);
    }],
  ],
};
