// References in the Portfolio (15i, V4.70) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pfrefs
export default {
  by: 'Gabe',
  use: 'Every theme in the Portfolio has a References section: the papers cited in its notes, numbered the way a note’s own reference list numbers them. Click one and its PDF opens.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: one theme, two experiments citing three papers from the Library (each with its PDF)
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const paper = async (file, title, authors, year, container) => { const rec = await MEDIA.add(await KIT.asset(file)), l = LIB.add({ title, authors, year, container }); l.pdf = rec.id; DB.put('library', l); return l; };
    const ok = await paper('paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }], 2021, 'Journal of Demonstration Mechanobiology');
    const ha = await paper('paper-haldane-2019.pdf', 'Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019, 'Methods in Demonstration Microscopy');
    const va = await paper('paper-varga-2017.pdf', 'Stiffness sensing at the leading edge of epithelial sheets', [{ family: 'Varga', given: 'Dóra' }, { family: 'Tomlin', given: 'Samuel' }], 2017, 'Demonstration Cell Reports');
    // a sentence with citations: parts is ['text', lib, 'text', lib…]
    const say = (b, label, parts) => { let text = '', marks = []; parts.forEach(p => { if (typeof p === 'string') text += p; else { marks.push({ id: uid('m'), type: 'cite', from: text.length, to: text.length + 1, ref: p.id }); text += OBJ; } }); KIT.fill(b, label, text); b.body = { text, marks }; DB.put('blocks', b); };
    const R3 = KIT.note(P, 'Run 3', { type: 'experiment', themeId: T.id, daysAgo: 3 }), R4 = KIT.note(P, 'Run 4', { type: 'experiment', themeId: T.id, daysAgo: 1 });
    say(KIT.first(R3), 'Reading', ['Edge traction rises with the coating ', ok, ' and the beads drift in long runs ', ha, '.']);
    say(KIT.first(R4), 'Reading', ['Drift is corrected frame by frame ', ha, '; the sheet senses stiffness at its edge ', va, '.']);
    KIT.note(P, 'Gel batch 14', { themeId: T.id, daysAgo: 5 });
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, T: T.id, ok: ok.id, ha: ha.id, va: va.id };
  },
  before: async (R, c) => {
    await R.go('#/portfolio'); await R.until(`!!document.querySelector('.pf-gref .pf-ref')`, 8000);
    await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0);
  },
  steps: [
    ['The theme’s References: every paper cited in its notes, numbered as they are cited, with how many notes cite it', async (R, c) => {
      await R.ev(`document.querySelector('.pf-gref').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1000);
      await R.move({ js: `document.querySelector('.pf-ref[data-lib="${c.ha}"] .pf-tail')` }, 800);
      await R.sleep(1600);
    }],
    ['The switch above the notes has References too: only the papers, theme by theme', async (R, c) => {
      await R.ev(`document.querySelector('.pf-seg button[data-k="refs"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await R.click({ sel: '.pf-seg button[data-k="refs"]' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.pf-flat .pf-ref')`, 5000)) throw new Error('the References view did not open');
      await R.ev(`document.querySelector('.pf-flat .pf-ref').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1600);
    }],
    ['Click a reference: its PDF opens in the reader', async (R, c) => {
      await R.click({ sel: `.pf-ref[data-lib="${c.va}"]` }, { ms: 800 });
      if (!await R.until(`location.hash.startsWith('#/read/')`, 6000)) throw new Error('the reader did not open');
      await R.until(`!!document.querySelector('canvas') && !!document.querySelector('.textLayer span')`, 15000);
      await R.sleep(1800);
    }],
  ],
};
