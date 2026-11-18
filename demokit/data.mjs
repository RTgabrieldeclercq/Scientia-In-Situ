// Data & plots (13zt, 13i) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs data
// Left out: adding a data folder (a system folder window). The dataset the last step binds is registered in `setup` with the app's
// own DATA.register, from a made-up file; no folder is added.
const box = id => `.box[data-id="${id}"]`;
export default {
  by: '',
  use: 'Plot a table of results inside the note, and keep the plot following the table.',
  view: [1040, 650],
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), A = KIT.note(P, 'Analysis: Run 3');
    const a = KIT.fill(KIT.first(A), 'Traction by stiffness', 'Mean traction on the three gel stiffnesses, three replicates each, from the Run 3 bead tracking.', 'result');
    const rows = [['Stiffness (kPa)', 'Traction (Pa)'], [3, 41], [3, 47], [3, 44], [12, 95], [12, 104], [12, 99], [30, 150], [30, 138], [30, 162]].map(r => r.map(String));
    DB.beginGroup('table');
    const t = M.addBlock(A.id, null, { kind: 'table', label: 'Traction results', x: a.x, y: a.y + 190, w: 400, h: 330, table: { sheets: [{ name: 'Run 3', cells: rows }], cur: 0, header: true } });
    TABLE.sum(t); DB.put('blocks', t);
    const csv = 'stiffness_kPa,traction_Pa\n' + rows.slice(1).map(r => r.join(',')).join('\n') + '\n';
    const [ds] = await DATA.register('demo-pc', [{ file: new File([csv], 'traction-run3.csv', { type: 'text/csv', lastModified: Date.now() - 86400000 }), path: 'run3/traction-run3.csv' }], { projectId: P.id });
    ds.root = 'Microscope PC'; ds.instrument = 'TFM bead tracking'; DB.put('datasets', ds);
    KIT.done(); return { A: A.id, a: a.id, t: t.id };
  },
  pause: 700,
  before: async (R, c) => { await R.open(c.A);
    await R.ev(`const P = DocView.paper, b = M.block(${JSON.stringify(c.a)}), z = .84; P.stop(); Object.assign(P.view, { z, x: 70 - b.x * z, y: 84 - (b.y - 20) * z }); P.apply(); return 1`);
    await R.sleep(400); await R.move([900, 420], 0); },
  steps: [
    ['Right-click the paper → Insert… → Plot of a table, then choose Bar: the mean of each stiffness, with SEM', async (R, c) => {
      await R.rclick({ xy: `(() => { const r = document.querySelector('${box(c.t)}').getBoundingClientRect(); return { x: Math.max(24, r.left - 50), y: r.top + 40 }; })()` });
      await R.click({ sel: '.pop .op', text: 'Insert…' });
      await R.type('plot of', 40);
      await R.key('Enter');
      if (!await R.until(`!!document.querySelector('.box .plw .pl-svg') && !!document.querySelector('.pl-pop')`, 6000)) throw new Error('no plot');
      await R.sleep(800);
      await R.click({ js: `document.querySelector('.pl-pop select')` }, { ms: 300 });
      await R.key('ArrowDown'); await R.key('ArrowDown'); await R.key('Enter');
      if (!await R.until(`document.querySelector('.pl-pop select') && document.querySelector('.pl-pop select').value === 'bar'`, 4000)) throw new Error('not a bar plot');
      await R.sleep(500);
      await R.click({ js: `[...document.querySelectorAll('.pl-pop select')].find(s => [...s.options].some(o => o.value === 'sem'))` }, { ms: 300 });
      await R.key('ArrowDown'); await R.key('Enter');
      if (!await R.until(`(document.querySelector('.plw .pl-bar') || {}).textContent.includes('SEM')`, 4000)) throw new Error('not SEM');
      await R.sleep(600);
      await R.key('Escape'); await R.sleep(700);
    }],
    ['Change a number in the table: the bars and their error bars follow', async (R, c) => {
      await R.click({ js: `document.querySelector('${box(c.t)} td[data-r="2"][data-c="1"]')` });
      await R.dblclick({ js: `document.querySelector('${box(c.t)} td[data-r="2"][data-c="1"]')` });
      if (!await R.until(`!!document.querySelector('.tb-in')`, 3000)) throw new Error('no cell editor');
      await R.type('72', 120);
      await R.key('Enter');
      await R.sleep(1800);
    }],
    ['⚙ Plot → Type: Scatter. The same table, now every replicate as a point', async (R, c) => {
      await R.click('.box .pl-set', { ms: 400 });
      if (!await R.until(`!!document.querySelector('.pl-pop select')`, 3000)) throw new Error('no plot settings');
      await R.sleep(500);
      await R.click({ js: `document.querySelector('.pl-pop select')` }, { ms: 300 });
      await R.key('ArrowUp'); await R.key('ArrowUp'); await R.key('Enter');
      if (!await R.until(`(document.querySelector('.plw .pl-bar') || {}).textContent.startsWith('Scatter')`, 4000)) throw new Error('not a scatter');
      await R.sleep(600);
      await R.key('Escape'); await R.sleep(700);
    }],
    ['Right-click the analysis note’s component → Data, materials & code…: bind it to the dataset the table came from', async (R, c) => {
      await R.rclick({ sel: `${box(c.a)} .ed`, dx: .78, dy: .5 });
      await R.ev(`const o = [...document.querySelectorAll('.pop .op')].find(e => e.textContent.includes('Data, materials')); o && o.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.click({ sel: '.pop .op', text: 'Data, materials & code' });
      if (!await R.until(`!!document.querySelector('.modal')`, 4000)) throw new Error('no dialog');
      await R.sleep(700);
      await R.click({ js: `[...document.querySelectorAll('.modal *')].filter(e => e.getClientRects().length && e.children.length < 6 && e.textContent.includes('traction-run3.csv')).sort((a, b) => a.textContent.length - b.textContent.length)[0]` });
      await R.sleep(900);
      await R.click({ sel: '.modal .btn', text: 'Save' });
      await R.sleep(1800);
    }],
  ],
};
