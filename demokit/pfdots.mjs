// Portfolio dots (13zzi, 13zzw) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pfdots
export default {
  by: '',
  use: 'See from the Portfolio which notes hold takeaways, open barriers, evidence and things to look into.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: one project, four notes — takeaways, an open barrier, results (evidence) and a Needs-investigation mark between them
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const mk = (title, daysAgo, rows) => { const d = KIT.note(P, title, { themeId: T.id, daysAgo }); KIT.grid(d, rows.map(r => [r[0], r[1], r[2]])); return d; };
    const N1 = mk('Run 3', 0, [['Takeaway', 'Traction peaks within two cell rows of the leading edge, on every gel.', 'insight'], ['Late frames', 'The beads drift after 40 frames, so the last stretch of each run is unreliable.'], ['Traction map', 'Peak traction 310 Pa at 8 kPa, 520 Pa at 30 kPa.', 'result']]);
    const N2 = mk('Fibronectin series', 2, [['Coating', 'Coated at 1, 5 and 10 µg/mL.'], ['Edge traction', 'Edge traction rises with the coating up to 5 µg/mL.', 'result'], ['Plateau', 'Above 5 µg/mL the sheet stops gaining traction.', 'result']]);
    const N3 = mk('Seeding density notes', 4, [['Densities', 'Seeded at 2, 4 and 8 × 10⁴ cells per cm².'], ['Closure', 'The sheets closed after two days at 8 × 10⁴.', 'insight']]);
    const N4 = mk('Gel batch 14', 6, [['Stiffness', 'Measured 8.4 ± 0.6 kPa on the rheometer.'], ['Drift check', 'Unsure whether the 30 kPa gels swell in the medium.']]);
    const box = (d, i) => KIT.boxes(d)[i];
    // an open barrier: words marked as a structure (what Ctrl+Enter then B makes)
    const barrier = (d, i, words) => { const b = box(d, i), text = String(b.body.text), from = text.indexOf(words), it = M.createItem('barrier', words, b);
      M.saveBlockBody(b, Object.assign({}, b.body, { marks: [...(b.body.marks || []), { id: uid('m'), type: 'struct', from, to: from + words.length, ref: it.id }] })); return it; };
    barrier(N1, 1, 'the beads drift after 40 frames');
    barrier(N3, 0, 'Seeded at 2, 4 and 8 × 10⁴ cells per cm²');
    // Needs investigation (the app's own mark)
    INVEST.make(box(N4, 1));
    KIT.done(); return { N1: N1.id, N4: N4.id, P: P.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.move([640, 420], 0); },
  steps: [
    ['The Portfolio: beside each note, a dot for each kind, in its colour, with how many', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' });
      if (!await R.until(`document.querySelectorAll('.pf-n .pfdot').length >= 5`, 8000)) throw new Error('no dots in the Portfolio');
      await R.ev(`document.querySelector('.pf-n').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(900);
      await R.move({ js: `document.querySelector('.pf-n[data-doc="${c.N1}"] .pf-t')` });
      await R.sleep(1500);
    }],
    ['Point at a barrier dot: it opens onto the words that were marked', async (R, c) => {
      const dot = { js: `document.querySelector('.pf-n[data-doc="${c.N1}"] .pfdot[data-k="barrier"]')` };   // from above: a dot's pop-up covers the dots to its right
      const p = await R.point(dot); await R.move([p.x, p.y - 34], 600); await R.sleep(250);
      await R.move(dot, 450);
      if (!await R.until(`!!document.querySelector('.pfdot-pop')`, 3000)) throw new Error('no pop-up');
      await R.sleep(2600);
    }],
    ['The dot that breathes is Needs investigation: point at it to read what is to look into', async (R, c) => {
      await R.move([900, 120], 500);
      await R.until(`!document.querySelector('.pfdot-pop')`, 3000);
      await R.sleep(400);
      await R.move({ js: `document.querySelector('.pf-n[data-doc="${c.N4}"] .pfdot.inv')` });
      if (!await R.until(`!!document.querySelector('.pfdot-pop .pp-i.go')`, 3000)) throw new Error('no pop-up for the investigate dot');
      await R.sleep(2400);
    }],
    ['Click its line: you are at those words in their note', async (R, c) => {
      await R.click({ sel: '.pfdot-pop .pp-i.go' });
      if (!await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${JSON.stringify(c.N4)}`, 6000)) throw new Error('the note did not open');
      await R.sleep(2200);
    }],
  ],
};
