// Smart foci (17d, V4.1) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs libsmart
import { seedLibrary } from './library.mjs';
const BIB = `@article{brandt2021collagen,
  author  = {Brandt, Ilse and Nakagawa, Hana},
  title   = {Collagen against fibronectin coating: which sets edge traction on soft gels},
  journal = {Journal of Demonstration Mechanobiology},
  year    = {2021},
  volume  = {12},
  pages   = {201--209}
}`;
const copy = text => `const t = document.createElement('textarea'); t.value = ${JSON.stringify(text)}; t.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.append(t); t.select(); const ok = document.execCommand('copy'); t.remove(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return ok`;
// the page scrolls its own scroller: put an element near the top of the window, clear of the header
const near = (sel, gap = 96) => `const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'start' }); let p = e.parentElement; while (p && !(p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; if (p) p.scrollTop -= ${gap}; return 1`;
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 220 }, o));
export default {
  by: '',
  use: 'A focus that fills itself: every paper that matches a search, now and later.',
  view: [1280, 800], dpr: 1, crf: 32,
  // the same library
  setup: seedLibrary,
  before: async R => {
    await R.ev(`LGROUP.open = new Set(); try { _ls.set('libOpen', []); } catch (e) { } return 1`);   // the shelves folded, so the tree is short and the new focus is in view
    await R.go('#/library'); await R.until(`!!document.querySelector('.lib-q-in')`, 5000);
    await R.click({ sel: '.lib-page .btn', text: '+ Add' }, { ms: 0 }); await R.until(`!!document.querySelector('.lib-page textarea.inp')`, 3000);
    await R.click('.lib-page textarea.inp'); await R.ev(copy(BIB));   // the citation, copied from where it was found
    await R.click({ sel: '.lib-page .btn', text: '− Add' }); await R.sleep(300);
    await R.ev(near('.lib-q')); await R.move([900, 330], 0);
  },
  steps: [
    ['Search “is:unread year:>2017” and press Save as smart focus; name it', async R => {
      await K(R, '.lib-q-in');
      await R.type('is:unread year:>2017', 45);
      await R.until(`document.querySelectorAll('.libcard').length > 0`, 3000);
      await R.sleep(1000);
      await K(R, { sel: 'button', text: 'Save as smart focus' });
      await R.until(`!!document.querySelector('.modal input.inp')`, 3000);
      await R.sleep(500);
      await R.key('a', { ctrl: true });
      await R.type('Unread since 2017', 45);
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`[...document.querySelectorAll('.lib-sidehost *')].some(e => e.textContent === 'Unread since 2017')`, 3000);
      await R.sleep(1000);
    }],
    ['Add a new paper from 2021 by pasting its citation: it is in the focus by itself', async R => {
      await R.ev(near('.lib-page h1', 60));
      await K(R, { sel: '.lib-page .btn', text: '+ Add' });
      await K(R, '.lib-page textarea.inp');
      await R.key('v', { ctrl: true });
      await R.sleep(500);
      await K(R, { sel: '.lib-page .btn', text: 'Parse & add' });
      await R.until(`DB.all('library').length === 13`, 3000);
      await R.sleep(600);
      await K(R, { sel: '.lib-page .btn', text: '− Add' });
      await R.ev(near('.lib-q'));
      await K(R, '.lib-q-in'); await R.key('a', { ctrl: true }); await R.key('Backspace');
      await K(R, { sel: '.lib-sidehost *', text: 'Unread since 2017' });
      if (!await R.until(`document.querySelectorAll('.libcard').length === 4`, 3000)) throw new Error('the focus does not hold four papers');
      await R.sleep(1200);
    }],
    ['Put a paper the search misses in by hand with its ＋: it stays in the focus too', async (R, c) => {
      await K(R, { sel: '.lib-sidehost *', text: 'All papers' });
      await K(R, { sel: '.lib-vseg button', text: 'List' });
      if (!await R.until(`document.querySelectorAll('.libcard').length === 13`, 3000)) throw new Error('all papers not shown');
      await R.ev(`document.querySelector('.libcard[data-id="${c.L.li15}"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await K(R, { sel: `.libcard[data-id="${c.L.li15}"] .lg-plus` });
      await R.until(`!!document.querySelector('.lg-pk')`, 3000);
      await R.sleep(450);
      await K(R, { sel: '.lg-pk', text: 'Unread since 2017' });
      await R.sleep(600);
      await R.key('Escape');
      await R.ev(near('.lib-q'));
      await K(R, { sel: '.lib-sidehost *', text: 'Unread since 2017' });
      if (!await R.until(`document.querySelectorAll('.libcard').length === 5`, 3000)) throw new Error('the focus does not hold five papers');
      await R.ev(`document.querySelector('.libcard[data-id="${c.L.li15}"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1800);
    }],
  ],
};
