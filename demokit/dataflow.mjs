// Data: instruments and flow (14ff, V4.87) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs dataflow
export default {
  by: 'Gabe',
  use: 'Say which instrument made your data, and see how materials, instruments and data fit together. The instrument is guessed from the files’ types and accepted with one click; the image panels and tables of an experiment join the Data compendium by themselves; and the flow draws material → instrument → data.',
  view: [1280, 800],
  dpr: 1,   // the Data compendium is a wide page
  // the test notes: Run 3 with a logged folder of .nd2 files (no instrument yet); Run 4 with an image panel and a table (nothing logged); both used the same gel batch
  setup: async () => {
    const day = n => Date.now() - n * 864e5, MB = 1048576;
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const R3 = KIT.note(P, 'Run 3 · 30 kPa', { type: 'experiment', themeId: T.id, daysAgo: 4 }), R4 = KIT.note(P, 'Run 4 · 8 kPa', { type: 'experiment', themeId: T.id, daysAgo: 1 });
    const b3 = KIT.fill(KIT.first(R3), 'Imaging data', 'Beads and cells, 60× objective.'), b4 = KIT.fill(KIT.first(R4), 'Plan', 'Image the beads, then tabulate the traction by field.');
    const file = (n, mb) => ({ id: uid('e'), n, s: Math.round(mb * MB), m: day(4) });
    b3.dtree = { items: [{ id: uid('e'), n: 'raw', dir: 1, k: Array.from({ length: 6 }, (_, i) => file('run3_beads_' + String(i + 1).padStart(3, '0') + '.nd2', 310)) }, file('stage-log.txt', .01)], mig: [] }; DB.put('blocks', b3);
    // Run 4's image panel (two micrographs) and a table of results
    const m1 = await MEDIA.add(await KIT.asset('micrograph-1.jpg')), m2 = await MEDIA.add(await KIT.asset('micrograph-2.jpg'));
    const fig = M.addBlock(R4.id, null, { kind: 'figure', label: 'Beads, 8 kPa', x: b4.x + 460, y: b4.y, w: 520, fig: { rows: 1, cols: 2, letters: true, cells: [{ id: uid('fc'), media: m1.id }, { id: uid('fc'), media: m2.id }] } });
    const rows = [['Field', 'Traction (Pa)'], ['1', '292'], ['2', '318'], ['3', '305']];
    const tb = M.addBlock(R4.id, null, { kind: 'table', label: 'Traction by field', x: b4.x, y: b4.y + 190, w: 400, h: 260, table: { sheets: [{ name: 'Run 4', cells: rows }], cur: 0, header: true } }); TABLE.sum(tb); DB.put('blocks', tb);
    const gel = MATS2.create({ name: 'PAA gel batch 15', kind: 'gel batch', source: 'made here', projectId: P.id, header: { stiffness: '30 kPa' } });
    const mdck = MATS2.create({ name: 'MDCK p12', kind: 'cell line', source: 'bought', projectId: P.id, header: { passage: '12', lot: 'M0912' } });
    R3.materials = [gel.id, mdck.id]; DB.put('documents', R3); R4.materials = [gel.id]; DB.put('documents', R4);
    KIT.done(); return { R3: R3.id, R4: R4.id, b3: b3.id };
  },
  before: async (R, c) => {
    await R.open(c.R3);
    await R.ev(`const b = M.block(${JSON.stringify(c.b3)}); DocView.paper.centerOn(b.x + 196, b.y + 150, 1); return 1`);
    await R.until(`!!document.querySelector('.df-guess')`, 6000);
    await R.until(`!document.querySelector('.toast')`, 8000); await R.move([980, 560], 0);
  },
  steps: [
    ['In Run 3, a logged folder of .nd2 files: the data tree guesses the instrument from their type. Accept it with one click', async (R, c) => {
      await R.sleep(900);
      await R.click({ sel: '.df-guess' }, { ms: 900 });
      if (!await R.until(`!!document.querySelector('.df-ic .df-in')`, 4000)) throw new Error('the instrument was not set');
      await R.until(`!document.querySelector('.toast')`, 8000);
      await R.sleep(1200);
    }],
    ['Compendiums → Data: Run 4 logged nothing, but its image panel and table are listed under it, “from the canvas”', async (R, c) => {
      await R.click('#tabs .tab[data-k="compendiums"]', { ms: 700 });
      await R.until(`!!document.querySelector('a.cp-card[data-k="data"]')`, 6000);
      await R.sleep(500);
      await R.click('a.cp-card[data-k="data"]', { ms: 700 });
      if (!await R.until(`!!document.querySelector('.ad-tree .ad-note')`, 6000)) throw new Error('no master tree');
      await R.sleep(800);
      await R.click({ js: `[...document.querySelectorAll('.ad-tree .ad-note')].find(r => r.textContent.includes('Run 4'))` }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.ad-tree [class*="auto"]') || /from the canvas/.test(document.querySelector('.ad-tree').textContent)`, 4000)) throw new Error('nothing from the canvas');
      await R.sleep(2200);
    }],
    ['Material → instrument → data: the third view draws how they are joined', async (R, c) => {
      await R.click({ sel: '.ad-seg button', text: 'Material' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.df-flow .df-n.inst')`, 5000)) throw new Error('no flow');
      await R.sleep(1800);
    }],
    ['Rest on the instrument: every path through it lights up, from its materials to its data', async (R, c) => {
      await R.move({ sel: '.df-flow .df-n.inst' }, 900);
      await R.sleep(2600);
    }],
  ],
};
