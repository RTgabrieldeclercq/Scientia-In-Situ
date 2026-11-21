// Compendiums (14fd, V4.85) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs compendiums
export default {
  by: 'Gabe',
  use: 'One gallery for everything the notebook gathers across your notes — materials, data, registered protocols, topic syntheses, code — each as a card with what it holds, and a page of its own. Protocols lists every registered protocol with its steps and the runs of it, and Open goes to it in its note.',
  view: [1280, 800],
  dpr: 1,   // the gallery is a wide page
  // the test notes: two registered protocols (one run twice), two materials and a logged data folder, so the cards have something to show
  setup: async () => {
    const day = n => Date.now() - n * 864e5, MB = 1048576;
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const proto = (title, steps, daysAgo) => {
      const d = KIT.note(P, title, { type: 'protocol', daysAgo }); KIT.boxes(d).forEach(b => { b.status = 'removed'; DB.put('blocks', b); });   // the empty first component: the protocol is the note
      const def = PROTO.create(d.id, 0, 0); def.label = title;
      def.steps = steps.map(t => ({ id: uid('st'), text: t, created: isoLocal(KIT.at(daysAgo, '09:00')), status: 'live', supersedes: [], supersededBy: [] }));
      def.registered = { docId: d.id, projectId: P.id, themeId: null, at: isoLocal(KIT.at(daysAgo, '09:00')) }; PROTO.syncBody(def); DB.put('blocks', def); return { d, def };
    };
    const coat = proto('Bead coating', ['Coat the gel with 0.1 mg/mL fibronectin for 1 h', 'Rinse three times in PBS', 'Add the beads and let them settle for 20 min', 'Image within 2 h'], 9);
    const cast = proto('Gel casting', ['Mix acrylamide and bis-acrylamide for the stiffness wanted', 'Pour 100 µL under a coverslip', 'Let it polymerise for 30 min'], 12);
    const R3 = KIT.note(P, 'Run 3 · 30 kPa', { type: 'experiment', themeId: T.id, daysAgo: 4 }), R4 = KIT.note(P, 'Run 4 · 8 kPa', { type: 'experiment', themeId: T.id, daysAgo: 1 });
    PROTO.newRun(coat.def, R3.id, 460, 168); PROTO.newRun(coat.def, R4.id, 460, 168); PROTO.newRun(cast.def, R3.id, 460, 400);
    const b3 = KIT.fill(KIT.first(R3), 'Imaging data', 'Beads and cells, 60× objective.');
    b3.dtree = { items: [{ id: uid('e'), n: 'raw', dir: 1, k: Array.from({ length: 5 }, (_, i) => ({ id: uid('e'), n: 'run3_beads_00' + (i + 1) + '.nd2', s: 310 * MB, m: day(4) })) }], mig: [] }; DB.put('blocks', b3);
    MATS2.create({ name: 'PAA gel batch 15', kind: 'gel batch', source: 'made here', projectId: P.id, header: { stiffness: '30 kPa' } });
    MATS2.create({ name: 'MDCK p12', kind: 'cell line', source: 'bought', projectId: P.id, header: { passage: '12', lot: 'M0912' } });
    KIT.done(); return { cp: coat.def.id, R3: R3.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.until(`!!document.querySelector('#tabs .tab[data-k="compendiums"]')`, 6000); await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0); },
  steps: [
    ['The Compendiums tab is the gallery: a card for each, with what it holds', async (R, c) => {
      await R.click('#tabs .tab[data-k="compendiums"]', { ms: 700 });
      if (!await R.until(`!!document.querySelector('a.cp-card[data-k="protocols"]')`, 6000)) throw new Error('no gallery');
      await R.sleep(2200);
    }],
    ['Protocols: every registered protocol with its steps, where it lives, and the runs of it', async (R, c) => {
      await R.click('a.cp-card[data-k="protocols"]', { ms: 700 });
      if (!await R.until(`!!document.querySelector('.cp-pr[data-id="${c.cp}"]')`, 6000)) throw new Error('no protocol card');
      await R.sleep(2200);
    }],
    ['Open goes to the protocol in its note, centred', async (R, c) => {
      await R.click({ js: `document.querySelector('.cp-pr[data-id="${c.cp}"] .cp-prf .btn')` }, { ms: 800 });
      if (!await R.until(`typeof DocView !== 'undefined' && !!document.querySelector('.box[data-id="${c.cp}"]')`, 8000)) throw new Error('the protocol did not open');
      await R.sleep(2400);
    }],
  ],
};
