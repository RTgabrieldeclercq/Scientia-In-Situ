// Passages (13zzt, V3.972) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs excerpts
// where a word of a component's text is on the screen: its left edge (0), its right edge (1) or in between
const word = (id, w, k) => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'), i = ed.textContent.indexOf(${JSON.stringify(w)}), tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n, at = 0; while ((n = tw.nextNode())) { if (i < at + n.length) { const r = document.createRange(); r.setStart(n, i - at); r.setEnd(n, i - at + ${w.length}); const q = r.getBoundingClientRect(); return { x: q.left + q.width * ${k}, y: q.top + q.height / 2 }; } at += n.length; } return null; })()` });
export default {
  by: '',
  use: 'Copy a few words from one note and paste them in another as a live passage that follows the original.',
  view: [1040, 650], pause: 600,
  // the test notes: an analysis with a long component, and an empty synthesis note
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Analysis: Run 3'), S = KIT.note(P, 'Synthesis: soft gels');
    const f = KIT.fill(KIT.first(A), 'Findings', 'Bead drift stayed under 0.4 µm, so no correction was needed. Peak traction sits in the outer 20 µm, 31 % above the interior. The peak was lower in the two gels coated at 1 µg/mL.', 'result');
    const t = KIT.fill(KIT.first(S), 'Take-away', 'Stiffer gels, higher edge traction.');
    KIT.done(); return { A: A.id, S: S.id, f: f.id, t: t.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Select one sentence inside a component and copy it with Ctrl+C', async (R, c) => {
      await R.drag(word(c.f, 'Peak traction', 0), word(c.f, 'interior.', 1), { ms: 900 });
      await R.sleep(600);
      await R.key('c', { ctrl: true });
      await R.sleep(900);
    }],
    ['In the other note, click the paper and paste: just that passage, with its band “Passage from”', async (R, c) => {
      await R.open(c.S);
      await R.wheel(150, [520, 300]);   // the note a little higher: room for what is pasted, clear of the dock
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.t}"]').getBoundingClientRect(); return { x: r.right + 70, y: r.top + 30 }; })()` });   // a paste lands in the middle of the view
      await R.sleep(500);
      await R.key('v', { ctrl: true });
      await R.until(`!!document.querySelector('.box.bridge .origin')`, 4000);
      await R.sleep(1300);
      await R.move({ sel: '.box.bridge .or-top', dx: .5, dy: .5 });
      await R.sleep(1000);
    }],
    ['Edit the sentence in the original: the passage changes with it', async (R, c) => {
      await R.click('.box.bridge .or-note');
      await R.until(`DocView.docId === ${JSON.stringify(c.A)} && !!document.querySelector('.box[data-id="${c.f}"] .ed')`, 6000);
      await R.sleep(400);
      await R.wheel(170, [760, 300]);   // the component up, clear of the pill at the foot
      await R.sleep(500);
      await R.drag(word(c.f, '31', 0), word(c.f, '31', 1), { ms: 500 });   // the figure in the original is selected …
      await R.sleep(700);
      await R.type('34', 260);   // … and retyped
      await R.until(`M.block(${JSON.stringify(c.f)}).body.text.includes('34 %')`, 4000);
      await R.sleep(1300);
      await R.dblclick(word(c.f, 'outer', .5));
      await R.click({ sel: '.pop .op', text: 'Go to the note' });
      await R.until(`DocView.docId === ${JSON.stringify(c.S)} && (document.querySelector('.box.bridge .refbody') || {}).textContent.includes('34 %')`, 6000);
      await R.move({ sel: '.box.bridge .refbody', dx: .5, dy: .6 });
      await R.sleep(1300);
    }],
    ['Ctrl+Shift+V instead pastes a plain copy: no band, and it does not follow the original', async (R, c) => {
      await R.wheel(230, [520, 300]);   // the passage moves up: a paste lands in the middle of the view, not on it
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.t}"]').getBoundingClientRect(); return { x: r.left + 130, y: r.bottom + 150 }; })()` });
      await R.sleep(500);
      await R.key('v', { ctrl: true, shift: true });
      await R.until(`document.querySelectorAll('.box.cmp').length >= 3`, 4000);
      await R.sleep(700);
      const nb = await R.ev(`const d = M.doc(DocView.docId), bs = d.blockIds.map(id => M.block(id)).filter(b => b && b.kind === 'component' && b.status === 'live'); return bs[bs.length - 1].id`);
      await R.dblclick(`.box[data-id="${nb}"] .blab`);   // the copy is an ordinary component: give it a title
      await R.until(`document.activeElement && document.activeElement.classList.contains('blab')`, 2000);
      await R.type('Edge peak, copy', 60);
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${nb}"]').getBoundingClientRect(); return { x: r.right + 200, y: r.top + 20 }; })()` });
      await R.sleep(1500);
    }],
  ],
};
