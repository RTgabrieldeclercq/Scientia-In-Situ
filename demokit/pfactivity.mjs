// Portfolio activity (19b, V4.19) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pfactivity
export default {
  by: 'Gabe',
  use: 'See why a project or a theme in the Portfolio is active or stalled. Click its heat strip and a panel opens with how the activity is counted, eight weeks of it, the notes still in their two weeks, and what moved; each line goes straight to its note.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: one theme with three notes written over the past three weeks (components, a result and a takeaway), so its strip has a trail
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    // a note written on day `n` ago with components made on the days given: rows are [label, text, days ago, 'HH:MM', ckind?]
    const note = (title, n, rows, type) => { const d = KIT.note(P, title, { type: type || 'note', themeId: T.id, daysAgo: n }), bs = KIT.grid(d, rows.map(r => [r[0], r[1], r[4]])); bs.forEach((b, i) => KIT.ago(b, rows[i][2], rows[i][3])); return { d, bs }; };
    const mark = (b, words, kind, daysAgo, hm) => { const text = String(b.body.text), from = text.indexOf(words), it = M.createItem(kind, words, b, { created: isoLocal(KIT.at(daysAgo, hm)) });
      M.saveBlockBody(b, Object.assign({}, b.body, { marks: [...(b.body.marks || []), { id: uid('m'), type: 'struct', from, to: from + words.length, ref: it.id }] })); return it; };
    const A = note('Gel batch 14', 12, [['Stiffness', 'Measured 8.4 ± 0.6 kPa on the rheometer.', 12, '10:20'], ['Swelling', 'The 30 kPa gels may swell in the medium; check after 24 h.', 11, '15:05']]);
    const B = note('Fibronectin series', 8, [['Coating', 'Coated at 1, 5 and 10 µg/mL; imaged the leading edge.', 8, '09:40'], ['Edge traction', 'Edge traction rises with the coating up to 5 µg/mL.', 6, '14:10', 'result'], ['Plateau', 'Above 5 µg/mL the sheet stops gaining traction.', 5, '16:30']], 'experiment');
    const C = note('Run 3', 3, [['Setup', 'Gel batch 15, 30 kPa, coated at 5 µg/mL fibronectin.', 3, '09:00'], ['Imaging', 'Beads imaged every 30 s for 40 min; drift under 0.2 µm.', 2, '11:30'], ['Traction map', 'Peak traction 520 Pa at 30 kPa, within two cell rows of the edge.', 1, '15:45', 'result']], 'experiment');
    mark(B.bs[1], 'Edge traction rises with the coating up to 5 µg/mL', 'result', 6, '14:12');
    mark(C.bs[2], 'Peak traction 520 Pa at 30 kPa', 'takeaway', 1, '15:50');
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, T: T.id, C: C.d.id };
  },
  before: async (R, c) => {
    await R.go('#/portfolio'); await R.until(`!!document.querySelector('.pf-sec[data-sec="${c.T}"] > .pf-sh > .hmwrap')`, 8000);
    await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 700], 0);
  },
  steps: [
    ['In the Portfolio a theme’s heat strip shows its last weeks: click it', async (R, c) => {
      await R.ev(`document.querySelector('.pf-sec[data-sec="${c.T}"]').scrollIntoView({ block: 'start' }); return 1`);
      await R.sleep(900);
      await R.move({ sel: `.pf-sec[data-sec="${c.T}"] > .pf-sh > .hmwrap` }, 800);
      await R.sleep(500);
      await R.click(null, { ms: 0 });
      if (!await R.until(`!!document.querySelector('.pfa.in')`, 4000)) throw new Error('the activity panel did not open');
      await R.sleep(1800);
    }],
    ['The panel says why it is active or stalled, how that is counted, and shows its eight weeks and its notes still in their two weeks', async (R, c) => {
      await R.wheel(260, { sel: '.pfa .pfa-b' });
      await R.sleep(1200);
      await R.wheel(260);
      await R.sleep(1500);
    }],
    ['What moved lists each moment by day: click a line and you are at it in its note', async (R, c) => {
      await R.ev(`document.querySelector('.pfa .pfa-days').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1200);
      await R.click({ sel: '.pfa .pfa-mv' }, { ms: 800 });
      if (!await R.until(`typeof DocView !== 'undefined' && !!DocView.docId && !document.querySelector('.pfa')`, 6000)) throw new Error('the note did not open');
      await R.sleep(2200);
    }],
  ],
};
