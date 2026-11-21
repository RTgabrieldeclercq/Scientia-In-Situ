// Data tree (13zzyc, V4.28; the instrument bar: 14ff) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs datatree
// The folder logged is assets/data/Run 3 - 30 kPa (made-up: assets/make-data.py). The browser's own folder window cannot be driven, so the
// page gets the file-input route the app keeps for browsers without one (Safari, Firefox): the same listing, without a rescan.
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Log which folders and files an experiment used, right in its note, as a tree with their sizes, without copying anything.',
  view: [1040, 650],
  // the test note: a run, with the component its images belong to
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3 · 30 kPa');
    const [a, b] = KIT.grid(A, [
      ['Imaging', 'Leading edge, 20× every 5 min on the Nikon; beads before and after trypsin. The files are on the lab drive.'],
      ['Analysis', 'Traction by Fourier-transform cytometry, from the bead stacks.'],
    ], { cols: 1, dy: 190 });
    window.showDirectoryPicker = undefined; window.showOpenFilePicker = undefined;   // the file-input route
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.wheel(120, [700, 380]); },
  steps: [
    ['In the component the images belong to, ⋯ → Log data… and choose the run’s folder: its listing is logged, nothing is copied', async (R, c) => {
      await K(R, `.box[data-id="${c.a}"] .bmore`);
      if (!await R.until(`!![...document.querySelectorAll('.pop .op')].find(o => o.textContent.includes('Log data'))`, 3000)) throw new Error('no Log data… in the menu');
      await R.move([830, 300], 500);
      await R.wheel(240);   // the menu is longer than the window: its lower rows come up
      await R.ev(`const o = [...document.querySelectorAll('.pop .op')].find(e => e.textContent.includes('Log data')); o.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(700);
      await K(R, { sel: '.pop .op', text: 'Log data' });
      if (!await R.until(`!![...document.querySelectorAll('.pop .op')].find(o => o.textContent.includes('Add a folder'))`, 3000)) throw new Error('no Add a folder…');
      await R.sleep(600);
      await R.files(['assets/data/Run 3 - 30 kPa'], () => K(R, { sel: '.pop .op', text: 'Add a folder' }));
      if (!await R.until(`!!document.querySelector('.dt .dt-r')`, 5000)) throw new Error('no tree was logged');
      await R.move([900, 560], 500);
      await R.sleep(2200);
    }],
    ['The tree lists folders and files with their sizes: a click opens a folder, another folds it again', async (R, c) => {
      await R.wheel(150, [900, 300]);   // the component higher, clear of the pill below
      await R.sleep(1000);
      await K(R, { sel: '.dt .dt-r.dir', text: 'raw' });
      await R.sleep(2000);
      await K(R, { sel: '.dt .dt-r.dir', text: 'raw' });
      await R.sleep(1500);
    }],
    ['The files’ type points to the instrument: “Looks like Nikon (ND2) — use it”, and one click sets it', async (R, c) => {
      if (!await R.until(`!!document.querySelector('.df-guess')`, 3000)) throw new Error('no instrument guess');
      await K(R, '.df-guess');
      await R.until(`!!document.querySelector('.df-ic')`, 3000);
      await R.move([900, 560], 500);
      await R.sleep(2200);
    }],
  ],
};
