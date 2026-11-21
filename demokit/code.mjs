// Code (14fg, V4.88) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs code
// Python (Pyodide) loads from the network on the first run: that wait is cut out of the take (R.cut).
const box = (id, sel) => `.box[data-id="${id}"] ${sel}`;
export default {
  by: 'Gabe',
  use: 'Run your own analysis script on your notes’ data, with the result right in the note: a component of the Code kind takes a script from the Code compendium and its input from your data trees, and shows the table, the figures and what the script printed.',
  view: [1040, 650],
  pause: 700,
  // the test note: a run note whose data tree logs the plate reader’s files, and an empty component waiting to become the analysis
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · 30 kPa');
    const a0 = KIT.first(A), t0 = Date.now() - 6 * 3600e3;
    KIT.fill(a0, 'Plate reader files', 'The OD600 readings of the three wells.'); a0.w = 440;
    const f = (n, s) => ({ id: uid('dt'), n, s, m: t0 });
    a0.dtree = { items: [{ id: uid('dt'), n: 'plate-reader-run3', dir: 1, via: 'folder', at: isoLocal(new Date(t0)), k: [f('OD readings.csv', 1180), f('plate layout.xlsx', 18400), f('notes.txt', 640)] }] }; DB.put('blocks', a0);
    const b = KIT.box(A, 'OD summary', 'Mean OD600 of each sample over the run.', { x: a0.x + 480, y: a0.y, w: 520 });
    KIT.done(); return { A: A.id, a: a0.id, b: b.id };
  },
  before: async (R, c) => { await R.go('#/compendiums'); await R.sleep(500); },
  steps: [
    ['Compendiums → Code: upload your script with a title and what it does', async (R, c) => {
      await R.click({ sel: 'a, button', text: 'Code' });
      await R.until(`!!document.querySelector('.code-bar')`, 4000);
      await R.sleep(800);
      await R.files(['assets/od_summary.py'], () => R.click({ sel: 'button', text: 'Upload a .py' }));
      await R.until(`!!document.querySelector('.code-dlg')`, 4000);
      await R.sleep(500);
      await R.click('.code-dlg input.inp');
      await R.key('a', { ctrl: true });
      await R.type('Plate reader OD summary', 40);
      await R.click('.code-dlg textarea');
      await R.type('Plate-reader CSV in: mean OD600 per sample out.', 35);
      await R.sleep(800);
      await R.click({ sel: '.modal button, .ovl button', text: 'Keep it' });
      await R.sleep(1500);
    }],
    ['In a note, double-click a component’s label and choose Code', async (R, c) => {
      await R.open(c.A);
      await R.ev(`const P = DocView.paper; P.view.y -= 40; P.apply(); return 1`); await R.sleep(500);
      await R.dblclick({ sel: box(c.b, '.bh .num') });
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(600);
      await R.wheel(900, { sel: '.pop' });   // the list of kinds runs on: Code is at its end
      await R.sleep(700);
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => /^Code/.test(o.innerText.trim()))` });
      await R.move([900, 560], 400);
      await R.sleep(2600);   // the message goes
    }],
    ['Choose the script, then ＋ From the data tree and pick “OD readings.csv”', async (R, c) => {
      await R.click({ sel: box(c.b, 'select.code-sel') });
      await R.sleep(400);
      await R.key('ArrowDown'); await R.key('Enter');
      await R.sleep(1000);
      await R.click({ sel: box(c.b, '.df-add') });
      await R.until(`!!document.querySelector('.df-pi')`, 3000);
      await R.sleep(700);
      await R.click({ sel: '.df-pi', text: 'OD readings.csv' });
      await R.sleep(1200);
    }],
    ['Run: the table the script makes, and the line it printed, come back into the component', async (R, c) => {
      await R.click({ sel: box(c.b, '.code-go') });
      await R.until(`!![...document.querySelectorAll('.ovl button, .modal button')].find(b => /Choose the file/.test(b.textContent))`, 4000);
      await R.sleep(600);
      await R.files(['assets/od-readings.csv'], () => R.click({ sel: '.ovl button, .modal button', text: 'Choose the file' }));
      await R.cut(async () => { await R.until(`!!document.querySelector('${box(c.b, '.code-out')}')`, 180000); });
      await R.sleep(2500);
    }],
  ],
};
