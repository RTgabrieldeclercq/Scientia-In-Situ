// References (14g, V4.5) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs references
export default {
  by: '',
  use: 'Keep the things you look up again and again (a calibration, a recipe, an equation) one command away from any note.',
  view: [1040, 650],
  // the test notes: a methods note with a calibration result, a recipe table and an equation (the last two are references already); an empty run note
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Gel methods'), B = KIT.note(P, 'Run 4');
    const a0 = KIT.first(A);
    const cal = KIT.fill(a0, 'Bead calibration', '0.163 µm per pixel at 60×, from the stage micrometer. Checked on 12 Nov; drift under 0.05 px per frame.', 'result');
    DB.beginGroup('table');
    const tb = M.addBlock(A.id, null, { kind: 'table', label: 'Gel recipe, 30 kPa', x: a0.x + 460, y: a0.y, w: 476, h: 230,
      table: { sheets: [{ name: 'Sheet1', cells: [['Component', 'Stock', 'Per 1 mL'], ['Acrylamide', '40 %', '300 µL'], ['Bis-acrylamide', '2 %', '150 µL'], ['PBS', '10×', '100 µL'], ['Water', '', '450 µL']] }], cur: 0, header: true } });
    TABLE.sum(tb); DB.put('blocks', tb);
    const eq = EQ.create(A, { x: a0.x, y: a0.y + 196 }, { tex: 'G = \\frac{E}{2(1+\\nu)}' }); eq.label = 'Shear modulus of the gel'; EQ.syncText(eq); DB.put('blocks', eq);
    REFS.toggle(tb, true); REFS.toggle(eq, true);
    const b0 = KIT.fill(KIT.first(B), 'Gels', '');
    KIT.done(); return { A: A.id, B: B.id, cal: cal.id, tb: tb.id, eq: eq.id, b0: b0.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.until(`!document.querySelector('#toasts .toast, .toast')`, 6000); await R.move([520, 560], 0); },
  steps: [
    ['A calibration that gets looked up again and again: right-click it → Make it a reference', async (R, c) => {
      await R.rclick({ sel: `.box[data-id="${c.cal}"] .ed`, dx: .78, dy: .5 });
      await R.sleep(500);
      await R.click({ sel: '.pop .op', text: 'Make it a reference' });
      await R.until(`!!document.querySelector('.box[data-id="${c.cal}"] .rf-mark')`, 3000);
      await R.move({ sel: `.box[data-id="${c.cal}"]`, dx: .62, dy: 150 });
      await R.sleep(1500);
    }],
    ['It keeps its kind and gains a bookmark. Later, in a run note: type /reference', async (R, c) => {
      await R.open(c.B);
      await R.click({ sel: `.box[data-id="${c.b0}"] .ed`, dx: .5, dy: .5 });
      await R.type('/reference');
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.rf-gal .rf-card')`, 4000);
      await R.sleep(1500);
    }],
    ['The gallery opens over the note. Search “gel”, then filter to Tables', async (R, c) => {
      await R.type('gel', 140);
      await R.sleep(900);
      await R.click({ sel: '.rf-gal .rf-chip', text: 'Table' });
      await R.sleep(1400);
    }],
    ['Enter puts the recipe in the run note: live, and pointing back to where it lives', async (R, c) => {
      await R.click('.rf-gal .rf-qin', { after: 200 });
      await R.key('Enter');
      await R.until(`!!document.querySelector('.box.ref-use')`, 4000);
      await R.sleep(600);
      await R.move({ sel: '.box.ref-use .origin', dx: .5, dy: .5 });
      await R.sleep(1800);
    }],
    ['The Atlas has a References tab that lists them all', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Atlas' });
      await R.until(`!!document.querySelector('.rf-tabs button[data-t="refs"]')`, 6000);
      await R.sleep(500);
      await R.click('.rf-tabs button[data-t="refs"]');
      await R.until(`!!document.querySelector('.rf-page .rf-card')`, 4000);
      await R.move({ sel: '.rf-page .rf-card', dx: .5, dy: .5 });
      await R.sleep(2000);
    }],
  ],
};
