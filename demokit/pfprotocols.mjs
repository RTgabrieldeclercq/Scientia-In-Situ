// Protocols in the Portfolio (15h, V4.69) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pfprotocols
export default {
  by: 'Gabe',
  use: 'Every project and theme in the Portfolio has a Protocols section beside its Experiments and Notes: the protocols filed there, and the protocols its experiments run, even when they are filed in another theme. + Protocol starts a new one right there.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: two themes. "Traction against stiffness" has two runs of the protocol "Bead coating", which is filed in "Substrate and coating", and a protocol of its own
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), A = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?'), B = KIT.theme(P, 'Substrate and coating', 'Which gel and coating give an even sheet?');
    // a protocol note filed in a theme (a protocol note is project-scoped: the Portfolio files it under the theme it carries), its steps, and registered as a protocol
    const proto = (title, T, steps, daysAgo) => {
      const d = KIT.note(P, title, { type: 'protocol', themeId: T.id, daysAgo }); d.themeId = T.id; DB.put('documents', d);
      const def = PROTO.create(d.id, 0, 0); def.label = title; def.steps = steps.map(t => ({ id: uid('st'), text: t, created: isoLocal(KIT.at(daysAgo, '09:00')), status: 'live', supersedes: [], supersededBy: [] }));
      def.registered = { docId: d.id, projectId: P.id, themeId: T.id, at: isoLocal(KIT.at(daysAgo, '09:00')) }; PROTO.syncBody(def); DB.put('blocks', def); return def;
    };
    const coat = proto('Bead coating', B, ['Coat the gel with 0.1 mg/mL fibronectin for 1 h', 'Rinse three times in PBS', 'Add the beads and let them settle for 20 min'], 9);
    proto('Gel casting', A, ['Mix acrylamide and bis-acrylamide for 30 kPa', 'Pour 100 µL under a coverslip', 'Let it polymerise for 30 min'], 7);
    for (const [title, n] of [['Run 3', 2], ['Run 4', 0]]) { const d = KIT.note(P, title, { type: 'experiment', themeId: A.id, daysAgo: n }); PROTO.newRun(coat, d.id, 460, 168); }
    KIT.note(P, 'Gel batch 14', { themeId: A.id, daysAgo: 4 });
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, A: A.id, B: B.id };
  },
  before: async (R, c) => {
    await R.go('#/portfolio'); await R.until(`!!document.querySelector('.pf-g[data-g="proto"]')`, 8000);
    await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0);
  },
  steps: [
    ['The theme’s Protocols section: the one filed here, and “Bead coating”, filed in another theme but run twice here (⟲ 2, from …)', async (R, c) => {
      await R.ev(`document.querySelector('.pf-sec[data-sec="${c.A}"]').scrollIntoView({ block: 'start' }); return 1`);
      await R.sleep(1000);
      await R.move({ js: `document.querySelector('.pf-sec[data-sec="${c.A}"] .pf-prun')` }, 800);
      await R.sleep(1800);
    }],
    ['The switch above the notes now has Protocols: only protocols, theme by theme', async (R, c) => {
      await R.ev(`document.querySelector('.pf-seg button[data-k="proto"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await R.click({ sel: '.pf-seg button[data-k="proto"]' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.pf-flat .pf-prun')`, 5000)) throw new Error('the Protocols view did not open');
      await R.ev(`document.querySelector('.pf-sec[data-sec="${c.A}"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1800);
    }],
    ['Back to All: + Protocol in a theme’s header starts a new protocol note there: its type and theme are already chosen', async (R, c) => {
      await R.ev(`document.querySelector('.pf-seg button[data-k="all"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(500);
      await R.click({ sel: '.pf-seg button[data-k="all"]' }, { ms: 600 });
      await R.until(`!!document.querySelector('.pf-sec[data-sec="${c.A}"] .pf-proto-add')`, 5000);
      await R.ev(`document.querySelector('.pf-sec[data-sec="${c.A}"]').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(900);
      await R.click({ js: `document.querySelector('.pf-sec[data-sec="${c.A}"] .pf-proto-add')` }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.modal')`, 4000)) throw new Error('no New note dialog');
      await R.sleep(1200);
      await R.click({ sel: '.modal input[placeholder^="Title"]' });
      await R.type('Bead imaging', 60);
      await R.click({ sel: '.modal button', text: 'Create' }, { ms: 600 });
      if (!await R.until(`typeof DocView !== 'undefined' && DocView.docId && M.doc(DocView.docId) && M.doc(DocView.docId).title === 'Bead imaging'`, 6000)) throw new Error('the protocol note did not open');
      await R.sleep(2000);
    }],
  ],
};
