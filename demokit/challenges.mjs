// Challenges (13zzyb, V4.14, renamed V4.24) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs challenges
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Note a weakness in the literature, backed by the paper that shows it, and keep it apart from the barriers of your own project: a Challenge must be cited by a paper, and it is never counted as one of your open barriers.',
  view: [1280, 800], dpr: 1, crf: 32, pause: 400,
  // the test notes: a project with one barrier of its own, a lit review on its question, and a Library paper
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const au = (f, g) => ({ family: f, given: g });
    const l = LIB.add({ kind: 'paper', cslType: 'article', title: 'Edge traction on compliant gels rises with fibronectin density', authors: [au('Okafor', 'Ngozi'), au('Lindqvist', 'Elin')], year: 2021, container: 'Journal of Demonstration Mechanobiology', doi: '', url: '', isPreprint: false });
    const rec = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf')); const r = M.lib(l.id); r.pdf = rec.id; DB.put('library', r);
    // your own barrier, in a run note
    const N = KIT.note(P, 'Run 3', { themeId: T.id, daysAgo: 1 }), b0 = KIT.fill(KIT.first(N), 'Late frames', 'The beads drift after 40 frames, so the last stretch of each run is unreliable.');
    { const w = 'the beads drift after 40 frames', i0 = b0.body.text.indexOf(w), it = M.createItem('barrier', w, b0);
      M.saveBlockBody(b0, Object.assign({}, b0.body, { marks: [{ id: uid('m'), type: 'struct', from: i0, to: i0 + w.length, ref: it.id }] })); }
    // the lit review on the project's question: one component, with the literature's barrier marked in it
    const d = M.createDoc({ type: 'literature', projectId: null, themeId: null, title: 'TFM — open problems', templateId: null }), cur = M.doc(d.id);
    cur.review = { topic: 'What limits traction force microscopy today?', projectIds: [P.id] }; M.touchDoc(cur);
    const bx = KIT.box(d, 'Traction maps blur at the cell edge', 'Displacement fields lose resolution within 2 µm of the cell edge, so the peak at the leading edge is underestimated.', { x: KIT.first(d).x + 100, y: KIT.first(d).y + 200 });
    { const w = 'lose resolution within 2 µm of the cell edge', i0 = bx.body.text.indexOf(w), it = M.createItem('barrier', w, bx);
      M.saveBlockBody(bx, Object.assign({}, bx.body, { marks: [{ id: uid('m'), type: 'struct', from: i0, to: i0 + w.length, ref: it.id }] })); }
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, R: d.id, bx: bx.id, lib: l.id };
  },
  before: async (R, c) => {
    await R.open(c.R);
    await R.ev(`const b = M.block(${JSON.stringify(c.bx)}); DocView.paper.centerOn(b.x + 260, b.y + 60, 1); return 1`);
    await R.sleep(600); await R.move([900, 500], 0);
  },
  steps: [
    ['In the lit review, double-click the component’s label and make it a Challenge: the header asks for a paper', async (R, c) => {
      await R.dblclick({ sel: `.box[data-id="${c.bx}"] .bh .num` });
      if (!await R.until(`!!document.querySelector('.pop .op')`, 3000)) throw new Error('the kinds did not open');
      await R.sleep(900);
      await R.ev(`const o = [...document.querySelectorAll('.pop .op')].find(e => /Challenge/.test(e.textContent)); if (!o) return 0; o.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(900);
      await K(R, { sel: '.pop .op', text: 'Challenge' });
      if (!await R.until(`!!document.querySelector('.box[data-id="${c.bx}"] .cg-cite')`, 3000)) throw new Error('no "cite a paper" in the header');
      await R.move([900, 520], 400);
      await R.sleep(1800);
    }],
    ['A Challenge must be cited by the paper that shows it: cite it from the header, and the header clears', async (R, c) => {
      await K(R, `.box[data-id="${c.bx}"] .cg-cite`);
      if (!await R.until(`!!document.querySelector('.pop input')`, 3000)) throw new Error('the citation picker did not open');
      await R.sleep(500);
      await R.type('okafor', 70);
      await R.sleep(900);
      await K(R, { sel: '.pop .row', text: 'Edge traction' });
      if (!await R.until(`!document.querySelector('.box[data-id="${c.bx}"] .cg-cite')`, 3000)) throw new Error('the header did not clear');
      await R.move([900, 560], 500);
      await R.sleep(2000);
    }],
    ['In the Portfolio, the project counts one open barrier, its own: the Challenge’s barrier is the literature’s', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Portfolio' });
      if (!await R.until(`!!document.querySelector('.pf-ob, .pf-n')`, 8000)) throw new Error('the Portfolio did not open');
      await R.sleep(2500);
    }],
  ],
};
