// Web capture (13zzs) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs webcap
// Shown with a page saved in the browser ("Webpage, Single File"): a made-up report, assets/report-run3.mhtml, so no outside
// site is visited. Capturing straight from an address needs the app's own server and a site on the internet (the server
// refuses addresses on this computer), so that way in is not recorded.
export default {
  by: '',
  use: 'Keep a web page in a note exactly as it was the day you saved it, even if the site later changes or goes.',
  view: [1100, 720],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Reading · traction reports');
    const a = KIT.fill(KIT.first(A), 'Why', 'The Run 3 report is on the group’s site; keep a copy with the notes.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Right-click the paper → Insert → Website: give an address, or add a page you saved in the browser', async (R, c) => {
      c.at = await R.ev(`const r = document.querySelector('.box[data-id="${c.a}"]').getBoundingClientRect(); return { x: r.left + 20, y: r.bottom + 50 }`);
      await R.rclick([c.at.x, c.at.y]);
      await R.click({ sel: '.pop .op', text: 'Insert' });
      await R.sleep(500);
      await R.type('website');
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1500);
      await R.files(['assets/report-run3.mhtml'], () => R.click({ text: 'saved in the browser', sel: 'button, a' }));
    }],
    ['The page is in the note as it was when saved; the strip under its name says when and from where', async (R, c) => {
      await R.until(`!!document.querySelector('.box iframe')`, 20000);
      await R.sleep(900);
      // slide the paper so the page is in view (looking, not doing: the page is already in the note)
      await R.ev(`const P = App.panes()[0].paper; P.zoomAt(.82); const box = document.querySelector('.box iframe').closest('.box'), r = box.getBoundingClientRect(), dx = 70 - r.left, dy = 150 - r.top; for (let i = 1; i <= 18; i++) { P.view.x += dx / 18; P.view.y += dy / 18; P.apply(); await new Promise(q => setTimeout(q, 28)); } return 1`);
      await R.move({ sel: '.box iframe', dx: .4, dy: -16 });
      await R.sleep(2800);
    }],
    ['It reads like any page in a note: select a sentence to quote it beside the page', async (R, c) => {
      const f = await R.ev(`const r = document.querySelector('.box iframe').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }`);
      // the first line of the first paragraph, inside the page (the page is drawn at the note's zoom)
      const q = await R.ev(`const fr = document.querySelector('.box iframe'), z = fr.getBoundingClientRect().width / fr.offsetWidth, p = fr.contentDocument && fr.contentDocument.querySelector('p'), r = p ? p.getBoundingClientRect() : { left: 12, top: 90 }; return { x: (r.left - 5) * z, y: (r.top + 9) * z }`);
      await R.drag([f.l + q.x, f.t + q.y], [f.l + q.x + Math.min(f.w - 80, 560), f.t + q.y + 2], { ms: 900 });
      await R.sleep(1200);
      await R.click({ text: 'Quote', sel: 'button' });
      await R.sleep(2600);
    }],
  ],
};
