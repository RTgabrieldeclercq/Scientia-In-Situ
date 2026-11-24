// Shortcuts (20f, 20g) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs shortcuts
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For finding any key or gesture the app has, and for moving a key to one you will remember: the app tells you when the browser owns a combination and offers the nearest free one.',
  view: [1040, 650],
  // the test note: a note with two components, where the new key will make a third
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const D = KIT.note(P, 'Rim traction — today’s imaging', { themeId: T.id });
    KIT.grid(D, [['Setup', '30 kPa gels, fibronectin at 5 µg/mL.'], ['Observe', 'Beads move inward at the leading edge.']]);
    KIT.done(); return { D: D.id };
  },
  before: async (R, c) => { await R.go('#/home'); },
  steps: [
    ['Settings → Keys & commands: every key and gesture is in one list. Search “zoom” to find the ones you need', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Settings' }, q);
      await R.click({ sel: 'a, button, .li, div', text: 'Keys & commands' }, q);
      await R.until(`!!document.querySelector('.sk-q')`, 4000);
      await R.ev(`document.querySelector('.sk-q').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.click({ js: `document.querySelector('.sk-q')` }, q);
      await R.type('zoom', 130);
      await R.sleep(1600);
    }],
    ['The same list opens anywhere with ?, outside a text box: search it for “new component”', async (R, c) => {
      await R.click({ xy: `(() => { const r = document.querySelector('.sk-q').getBoundingClientRect(); return { x: r.right + 160, y: r.top + 2 }; })()` }, q);
      await R.ev(`document.activeElement && document.activeElement.blur(); return 1`);
      await R.key('?');
      await R.until(`!!document.querySelector('.modal .sk-q')`, 4000);
      await R.sleep(600);
      await R.click({ js: `document.querySelector('.modal .sk-q')` }, q);
      await R.key('a', { ctrl: true });
      await R.type('new component', 90);
      await R.sleep(1200);
    }],
    ['Change “New component”: press Ctrl+T. The browser owns it (it opens a new tab), so the app refuses and offers Alt+T', async (R, c) => {
      await R.click({ js: `[...document.querySelectorAll('.modal .sk-r')].find(r => /new component in the middle/i.test(r.textContent)).querySelector('.sk-chg')` }, q);
      await R.until(`!!document.querySelector('.kc')`, 3000);
      await R.sleep(900);
      await R.key('t', { ctrl: true });
      await R.until(`!!document.querySelector('.kc-o')`, 3000);
      await R.sleep(2200);
    }],
    ['Take the offer: New component is now Alt+T', async (R, c) => {
      await R.click({ sel: '.kc-o .btn', text: 'Use Alt+T' }, q);
      await R.sleep(1800);
      await R.click({ sel: '.modal .btn', text: 'Close' }, q);
      await R.sleep(500);
    }],
    ['In a note, Alt+T now makes a component', async (R, c) => {
      await R.open(c.D);
      await R.click({ xy: `(() => { const r = document.querySelector('.box').getBoundingClientRect(); return { x: r.right + 380, y: r.bottom + 120 }; })()` }, q);
      await R.sleep(500);
      await R.key('t', { alt: true });
      await R.sleep(2000);
    }],
  ],
};
