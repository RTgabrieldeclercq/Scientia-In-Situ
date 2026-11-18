// Terms (V3.x term lens, 13w termscan, 16 Terms tab, 16b other forms) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs terms
export default {
  by: '',
  use: 'Mark the words your project turns on once, and find every place they are used.',
  view: [1280, 800],
  dpr: 1,
  // the test notes: three notes that each mention "traction force" and "30 kPa gel", nothing marked yet (one has a barrier still open)
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Daily · {today}'), B = KIT.note(P, 'Run 3', { daysAgo: 12 }), C = KIT.note(P, 'Fibronectin series', { daysAgo: 26 });
    const a0 = KIT.fill(KIT.first(A), 'Gel 30 kPa', 'Peak traction force on the 30 kPa gel fell after EGF, then came back.');
    const a1 = KIT.box(A, 'Next', '', { x: a0.x, y: a0.y + 170 });
    const b0 = KIT.fill(KIT.first(B), 'Beads', 'Traction force looks low on the 30 kPa gel because the beads drift after 40 frames.'); KIT.ago(b0, 12, '14:20');
    const b1 = KIT.box(B, 'Batch', 'Gel batch 14 (30 kPa gel) gave the traction force baseline.', { x: b0.x, y: b0.y + 170, daysAgo: 40, hm: '10:05' });
    const c0 = KIT.fill(KIT.first(C), 'Question', 'Does fibronectin change traction force on the 30 kPa gel?'); KIT.ago(c0, 26, '11:30');
    KIT.box(C, 'Shorthand', 'TF at 5 µg/mL matched the 30 kPa gel result.', { x: c0.x, y: c0.y + 170, daysAgo: 20, hm: '16:40' });
    // a barrier in Run 3: the drifting beads, not yet resolved
    const ph = 'the beads drift after 40 frames', i0 = b0.body.text.indexOf(ph), it = M.createItem('barrier', ph, b0, { created: isoLocal(KIT.at(12, '14:20')) });
    b0.body = { text: b0.body.text, marks: [{ id: uid('m'), type: 'struct', from: i0, to: i0 + ph.length, ref: it.id }] }; DB.put('blocks', b0);
    KIT.done(); return { A: A.id, a0: a0.id, a1: a1.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.until(`!document.querySelector('.toast')`, 6000); await R.move([640, 560], 0); },
  steps: [
    ['Select “traction force” in a note and press Alt+W: it joins the project’s terms and is outlined', async (R, c) => {
      const at = side => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${c.a0}"] .ed'), w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while (n = w.nextNode()) { const i = n.data.toLowerCase().indexOf('traction force'); if (i >= 0) { const r = document.createRange(); r.setStart(n, ${side ? 'i + 14' : 'i'}); r.setEnd(n, ${side ? 'i + 14' : 'i'} + (${side ? 0 : 1})); const q = r.getBoundingClientRect(); return { x: ${side ? 'q.left' : 'q.left + 1'}, y: q.top + q.height / 2 }; } } return null; })()` });
      await R.drag(at(0), at(1), { ms: 700, hold: 200 });
      await R.sleep(500);
      await R.key('w', { alt: true });
      await R.until(`!!document.querySelector('.box[data-id="${c.a0}"] .tm')`, 3000);
      await R.sleep(1800);
    }],
    ['Write it in another component and click away: the term is found there by itself', async (R, c) => {
      // the term's hover card (the pointer rested on it) lies over the next component: leave it first, out in the margin
      await R.move({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a0}"]').getBoundingClientRect(); return { x: r.right + 150, y: r.top + 20 }; })()` }, 500);
      await R.until(`!document.querySelector('.hovercard')`, 3000);
      await R.sleep(400);
      await R.click({ sel: `.box[data-id="${c.a1}"] .ed`, dx: .3, dy: .5 });
      if (!await R.until(`document.activeElement === document.querySelector('.box[data-id="${c.a1}"] .ed')`, 3000)) throw new Error('the component did not take the caret');
      await R.sleep(500);
      await R.type('Traction force rose at the leading edge.');
      await R.sleep(500);
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.a1}"]').getBoundingClientRect(); return { x: r.right + 160, y: r.top + 30 }; })()` });
      await R.until(`document.querySelectorAll('.box[data-id="${c.a1}"] .tm').length > 0`, 4000);
      await R.sleep(2000);
    }],
    ['The Terms tab lists it: its uses, its last twelve weeks, its open barriers', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Terms' });
      await R.until(`!!document.querySelector('.tl-row')`, 6000);
      await R.sleep(600);
      await R.move({ sel: '.tl-row .tl-spk' });
      await R.sleep(1600);
      await R.move({ sel: '.tl-row .tl-ob', });
      await R.sleep(1600);
    }],
    ['Open the term and add another form, “TF”: it is found wherever it is written', async (R, c) => {
      await R.click({ sel: '.tl-row .tl-t' });
      await R.until(`!!document.querySelector('.tf-add')`, 6000);
      await R.sleep(800);
      await R.click('.tf-add');
      if (!await R.until(`!!document.querySelector('.modal input')`, 3000)) throw new Error('no form window');
      await R.type('TF');
      await R.sleep(500);
      await R.key('Enter');
      if (!await R.until(`/found/.test(document.body.textContent) || !!document.querySelector('.tf-chip')`, 3000)) throw new Error('no result');
      await R.sleep(2200);
    }],
  ],
};
