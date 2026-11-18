// Labels (14i, V4.9) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs labels
export default {
  by: '',
  use: 'Label several components as floats or references quickly, by clicking them with the label in hand.',
  view: [1040, 650],
  pause: 450,
  // the test note: a daily note with six short components
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Daily · {today}');
    const [a, b, c, d, e, f] = KIT.grid(A, [
      ['Idea', 'Try fibronectin at 5 µg/mL: does the edge peak hold?', 'hypothesis'],
      ['Question', 'Does EGF move the force, or lower it?', 'question'],
      ['Tweak', 'Image the beads 2 min after trypsin, not 5.'],
      ['Today', 'Gels for run 4 poured, 30 kPa.'],
      ['Bead calibration', '0.163 µm per pixel at 60×, stage micrometer.', 'result'],
      ['Reminder', 'Order more bis-acrylamide.']], { dy: 150 });
    KIT.done(); return { A: A.id, ids: [a, b, c, d, e, f].map(x => x.id) };
  },
  before: async (R, c) => { await R.open(c.A); await R.until(`!document.querySelector('.toast')`, 6000); await R.move([520, 600], 0); },
  steps: [
    ['Type /label in a component and pick Float: the cursor becomes the float’s cloud', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.ids[5]}"] .ed`, dx: .98, dy: .5 });
      await R.type(' /label', 30);
      await R.sleep(300);
      await R.key('Enter');
      if (!await R.until(`[...document.querySelectorAll('.pop')].some(p => p.textContent.includes('Label in hand'))`, 3000)) throw new Error('no label menu');
      await R.sleep(350);
      await R.click({ sel: '.pop .op', text: 'Waiting for a note' });
      await R.until(`LABELS.armed === 'float'`, 3000);
      await R.sleep(600);
    }],
    ['Click a component: it is a float now, and the cursor is yours again', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.ids[0]}"]`, dx: .55, dy: 14 });
      await R.until(`!LABELS.armed`, 3000);
      await R.sleep(800);
    }],
    ['Pick Float again and hold Ctrl: the label stays in hand for three clicks in a row; Esc puts it down', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.ids[5]}"] .ed`, dx: .98, dy: .5 });
      await R.type(' /label', 30);
      await R.sleep(250);
      await R.key('Enter');
      if (!await R.until(`[...document.querySelectorAll('.pop')].some(p => p.textContent.includes('Label in hand'))`, 3000)) throw new Error('no label menu');
      await R.click({ sel: '.pop .op', text: 'Waiting for a note' });
      await R.until(`LABELS.armed === 'float'`, 3000);
      await R.hold('Control');
      for (const i of [1, 2, 3]) await R.click({ sel: `.box[data-id="${c.ids[i]}"]`, dx: .55, dy: 14 }, { rest: 80, after: 250 });
      await R.release('Control');
      await R.sleep(400);
      await R.key('Escape');
      await R.until(`!LABELS.armed`, 3000);
      await R.sleep(500);
    }],
    ['Pick Reference, the golden tag, and click one; Esc puts the label down', async (R, c) => {
      await R.click({ sel: `.box[data-id="${c.ids[5]}"] .ed`, dx: .98, dy: .5 });
      await R.type(' /label', 30);
      await R.sleep(250);
      await R.key('Enter');
      if (!await R.until(`[...document.querySelectorAll('.pop')].some(p => p.textContent.includes('Label in hand'))`, 3000)) throw new Error('no label menu');
      await R.click({ sel: '.pop .op', text: 'Found with /reference' });
      await R.until(`LABELS.armed === 'reference'`, 3000);
      await R.sleep(600);
      await R.hold('Control');
      await R.click({ sel: `.box[data-id="${c.ids[4]}"]`, dx: .55, dy: 14 });
      await R.release('Control');
      await R.sleep(700);
      await R.key('Escape');
      await R.until(`!LABELS.armed`, 3000);
      await R.move([830, 520]);
      await R.sleep(1300);
    }],
  ],
};
