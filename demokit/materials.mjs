// Materials (13j, 13r) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs materials
export default {
  by: '',
  use: 'Know what every gel batch, cell line and antibody lot is, and which notes used it.',
  view: [1280, 800],
  dpr: 1,   // the Materials tab and the sheet are wide pages
  // the test notes: a run note with no materials of its own yet; two older materials, used in earlier notes, so the Materials tab has more than one line
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Run 3'), E = KIT.note(P, 'Fibronectin series'), F = KIT.note(P, 'Run 2');
    KIT.fill(KIT.first(A), 'Plan', 'Image the leading edge every 10 min for 6 h on the new gels.');
    KIT.fill(KIT.first(E), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    KIT.fill(KIT.first(F), 'Plan', 'Repeat run 1 with EGF added at 20 min.');
    const mdck = MATS2.create({ name: 'MDCK p12', kind: 'cell line', source: 'bought', projectId: P.id, header: { passage: '12', supplier: 'Lab stock', lot: 'M0912' } });
    const ab = MATS2.create({ name: 'anti-pFAK Y397', kind: 'antibody', source: 'bought', projectId: P.id, header: { supplier: 'Meridian', lot: '7731', conc: '1:500' } });
    E.materials = [mdck.id]; DB.put('documents', E); F.materials = [mdck.id, ab.id]; DB.put('documents', F);
    KIT.done(); return { A: A.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Materials tab → + New material: “PAA gel batch 15”, a gel batch made here. Fill in its stiffness', async (R, c) => {
      await R.click('#tabs .tab[data-k="materials"]');
      await R.until(`!!document.querySelector('.page .btn.pri')`, 4000);
      await R.sleep(250);
      await R.click({ sel: '.page .btn.pri', text: 'New material' });
      await R.until(`!!document.querySelector('.modal input.inp')`, 4000);
      await R.sleep(400);
      await R.type('PAA gel batch 15', 22);
      await R.sleep(250);
      await R.click({ sel: '.modal .matkinds button', text: 'gel batch' }, { rest: 100, after: 200 });
      await R.click({ sel: '.modal button', text: 'Create' });
      await R.until(`!!document.querySelector('.matsheet')`, 5000);
      await R.sleep(400);
      await R.click({ js: `[...document.querySelectorAll('.matsheet label.msf')].find(l => l.textContent.startsWith('Target stiffness')).querySelector('input')` });
      await R.type('8 kPa', 40);
      await R.key('Enter');
      await R.sleep(900);
    }],
    ['Log what happens to it: type “poured”', async (R, c) => {
      await R.click({ js: `document.querySelector('.matsheet .ms-log input.inp')` });
      await R.type('poured', 45);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.matsheet .ms-le')`, 3000);
      await R.sleep(1500);
    }],
    ['In the run note: right-click → Insert… → Material; type “used 2 coverslips” on its card to log it', async (R, c) => {
      await R.open(c.A);
      await R.rclick({ xy: `(() => { const r = document.querySelector('.box').getBoundingClientRect(); return { x: r.right + 70, y: r.top + 40 }; })()` }, { rest: 100, after: 200 });
      await R.click({ sel: '.pop .op', text: 'Insert…' }, { rest: 100, after: 200 });
      await R.until(`!!document.querySelector('.pop input, .pop .pk-q')`, 3000);
      await R.sleep(200);
      await R.type('material', 40);
      await R.sleep(250);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.modal .pk-q')`, 4000);
      await R.sleep(200);
      await R.type('PAA', 70);
      await R.sleep(250);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.mc-log')`, 4000);
      await R.sleep(250);
      await R.click('.mc-log');
      await R.type('used 2 coverslips', 55);
      await R.sleep(600);
      await R.key('Enter');
      await R.sleep(1100);
    }],
    ['The Materials tab: every material by kind, with the notes that used it', async (R, c) => {
      await R.click('#tabs .tab[data-k="materials"]');
      await R.until(`!!document.querySelector('.matt')`, 4000);
      await R.ev(`[...document.querySelectorAll('.matt tr')].find(r => r.textContent.includes('PAA gel batch 15')).scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.move({ js: `[...document.querySelectorAll('.matt tr')].find(r => r.textContent.includes('PAA gel batch 15'))`, }, 800);
      await R.sleep(1600);
    }],
  ],
};
