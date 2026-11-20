// Equation capture (17b, V3.993) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs eqcap
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 220 }, o));
// the equation's line on the reader's page (its text layer), as a box with a margin round it, in window pixels
const around = `(() => { const sp = [...document.querySelectorAll('.rd-page .textLayer span')].filter(s => /3G\\s*\\(/.test(s.textContent) || (/^E\\s*=/.test(s.textContent.trim()) && /3G/.test(s.textContent)));
  const s = sp[0]; if (!s) return null; const r = s.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; })()`;
export default {
  by: '',
  use: 'Take an equation off a paper’s page and reuse it in your notes, with its source.',
  view: [1280, 800], dpr: 1, crf: 32,
  // a paper with one display equation (E = 3G(1 + ν)), and a note to use it in
  setup: async () => {
    const P = KIT.project(), au = (f, g) => ({ family: f, given: g });
    const lib = LIB.add({ kind: 'paper', cslType: 'article', title: 'Edge traction on compliant gels rises with fibronectin density', authors: [au('Okafor', 'Ngozi'), au('Lindqvist', 'Elin'), au('Marchetti', 'Rosa')], year: 2021, container: 'Journal of Demonstration Mechanobiology', volume: '12', page: '104-111', doi: '', url: '', isPreprint: false });
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf')), r = M.lib(lib.id); r.pdf = rec.id; DB.put('library', r);
    const A = KIT.note(P, 'Analysis: Run 3');
    const a = KIT.fill(KIT.first(A), 'Gel stiffness', 'Shear modulus G of the 30 kPa gels, from the rheometer. The Young’s modulus follows from G.', 'method');
    KIT.done(); return { lib: lib.id, A: A.id, a: a.id };
  },
  before: async (R, c) => {
    await R.go('#/read/' + c.lib);
    await R.until(`document.querySelectorAll('.rd-page .textLayer span').length > 10`, 15000);
    await R.until(`!!document.querySelector('.rd-capbtn')`, 3000);
    await R.sleep(4000);   // the toast the seeding raised
    await R.move([760, 330], 0);
  },
  steps: [
    ['In the reader press ∑ Capture equation and draw a box round the equation on the page', async (R, c) => {
      const ok = await R.ev(`const sp = [...document.querySelectorAll('.rd-page .textLayer span')].find(s => /3G/.test(s.textContent)); if (!sp) return false; sp.scrollIntoView({ block: 'center' }); return true`);
      if (!ok) throw new Error('the equation is not on the page');
      await R.sleep(500);
      await K(R, '.rd-capbtn');
      await R.sleep(600);
      const q = await R.ev(`return ${around}`);
      if (!q) throw new Error('the equation is not on the page');
      await R.drag([q.l - 40, q.t - 12], [q.r + 40, q.b + 10], { ms: 1000, hold: 300 });
      await R.until(`!!document.querySelector('.meditor')`, 6000);
      await R.sleep(800);
    }],
    ['Check it against the snip: type its LaTeX, then name it “Young’s modulus”', async (R, c) => {
      await K(R, '.meditor .mtex');
      await R.type('E = 3G(1 + \\nu)', 70);
      await R.sleep(1200);
      await K(R, { sel: '.modal button', text: 'Done' });
      await R.until(`!!document.querySelector('.modal input.inp, .modal textarea.inp')`, 4000);
      await R.sleep(500);
      await R.key('a', { ctrl: true });
      await R.type('Young’s modulus', 60);
      await R.sleep(600);
      await R.key('Enter');
      await R.sleep(1200);
    }],
    ['In a note open ✦ and choose the equation tool → Registered equation: the list says which paper and page', async (R, c) => {
      await R.open(c.A);
      await K(R, '.lab-pill-tools .lab-pill-btn');
      await R.sleep(500);
      await K(R, { sel: '.lab-fan-item[aria-label^="An equation"]' });
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(500);
      await K(R, { sel: '.pop .op', text: 'Registered equation' });
      await R.until(`!!document.querySelector('.modal')`, 4000);
      await R.sleep(1800);
    }],
    ['Pick it: the equation is placed in the note, still tied to its paper', async (R, c) => {
      await K(R, { sel: '.modal *', text: 'Young’s modulus' });
      if (!await R.until(`DB.where('blocks', b => b.docId === DocView.docId && b.kind === 'eq').length === 1`, 4000)) throw new Error('the equation was not placed');
      await R.sleep(600);
      await R.ev(`const b = DB.where('blocks', b => b.docId === DocView.docId && b.kind === 'eq')[0]; DocView.paper.centerOn(b.x + 210, b.y + 150, 1); return 1`);
      await R.sleep(1800);
    }],
  ],
};
