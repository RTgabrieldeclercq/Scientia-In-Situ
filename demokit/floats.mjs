// Floats (14h, V4.7) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs floats
export default {
  by: 'Gabe',
  // what it is for, in the words of whoever asked for it
  use: 'Floats are items that need to belong to a new note in the future, but is not organized or created yet. Bring up /float to bring up a dome of floating float components that you can drag into the current note you are in. Once a float is placed into a note, it is an assigned float and is no longer part of the floats. Floats show up as bridges from where they were from.',
  view: [1040, 650],
  // the test note: a daily note with thoughts that belong elsewhere, and the note they will belong to
  setup: async () => {
    const P = M.createProject('Traction on soft gels'), A = M.createDoc({ type: 'note', projectId: P.id, title: 'Daily · {today}' }), B = M.createDoc({ type: 'note', projectId: P.id, title: 'Fibronectin series' });
    const first = d => DB.where('blocks', x => x.docId === d.id && x.kind === 'component')[0];
    const fill = (b, label, text, ck) => { b.label = label; b.body = { text, marks: [] }; if (ck) b.ckind = ck; DB.put('blocks', b); return b; };
    const mk = (d, x, y, label, text, ck) => fill(M.addBlock(d.id, null, { kind: 'component', x, y, w: 392, label }), label, text, ck);
    const a0 = first(A), c1 = fill(a0, 'Idea', 'Try fibronectin at 5 µg/mL: does the edge peak hold?', 'hypothesis');
    const c2 = mk(A, a0.x + 460, a0.y, 'Question', 'Does EGF move the force, or lower it?');
    const c3 = mk(A, a0.x, a0.y + 170, 'Tweak', 'Image the beads 2 min after trypsin, not 5.');
    const c4 = mk(A, a0.x + 460, a0.y + 170, 'Today', 'Gels for run 4 poured, 30 kPa.');
    const b1 = fill(first(B), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    changed(); return { A: A.id, B: B.id, c1: c1.id, c2: c2.id, c3: c3.id, c4: c4.id, b1: b1.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['In the daily note, an idea that belongs to a note not made yet: right-click it → Make it a float', async (R, c) => {
      await R.rclick({ sel: `.box[data-id="${c.c1}"] .ed`, dx: .78, dy: .5 });
      await R.click({ js: `[...document.querySelectorAll('.pop .op')].find(o => o.textContent.includes('Make it a float'))` });
      await R.sleep(800);
    }],
    ['It keeps its kind and shows a cloud. Two more at once: Ctrl+click them, then Make floats', async (R, c) => {
      await R.wheel(190, [900, 560]);   // the notes a little higher, so the selection bar below them is clear of the bottom
      await R.hold('Control');
      await R.click({ sel: `.box[data-id="${c.c2}"] .ed`, dx: .78, dy: .5 });
      await R.click({ sel: `.box[data-id="${c.c3}"] .ed`, dx: .78, dy: .5 });
      await R.release('Control');
      await R.click('.ink-selbar .fl-bulk');
      await R.sleep(800);
    }],
    ['Later, in the note they belong to: /float raises the dome, with the floats drifting in it', async (R, c) => {
      await R.open(c.B);
      await R.wheel(380, [520, 300]);   // the plan high up: room below it for what is dropped, clear of the dome
      await R.click({ sel: `.box[data-id="${c.b1}"] .ed`, dx: .98, dy: .5 });
      await R.type(' /float');
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(1600);
    }],
    ['Rest on a float a moment to see what it is and where it was written', async (R, c) => {
      await R.move({ xy: `(() => { const r = FLOATS.D.dome.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .55 }; })()` });
      await R.move({ sel: `.fl-b[data-id="${c.c2}"]` });
      await R.until(`!!document.querySelector('.fl-prev')`, 3000);
      await R.sleep(1500);
    }],
    ['Drag one out onto the note: it lands as a bridge from where it was written, and is no longer a float', async (R, c) => {
      await R.ev(`FLOATS.unprev(); return 1`);
      const to = { xy: `(() => { const r = document.querySelector('.box[data-id="${c.b1}"]').getBoundingClientRect(); return { x: r.left + 40, y: r.bottom + 36 }; })()` };   // under the plan, above the dome
      // a float nothing lies over (the dock sits on the dome's foot)
      const from = { xy: `(() => { for (const el of document.querySelectorAll('.fl-b')) { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y); if (hit && (hit === el || el.contains(hit))) return { x, y }; } return null; })()` };
      await R.drag(from, to, { ms: 1300 });
      await R.sleep(1600);
    }],
  ],
};
