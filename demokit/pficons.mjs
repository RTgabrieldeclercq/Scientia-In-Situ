// Section headers (15f, V4.17 / V4.26) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs pficons
export default {
  by: 'Gabe',
  use: 'Each kind of section in the Portfolio has its own symbol and its own colour, the same in every project, so you can tell Experiments, Syntheses, Notes, Protocols, Lit reviews and References apart at a glance. Switch it off and the sections go back to their words alone.',
  view: [1280, 800],
  dpr: 1,   // the Portfolio is a wide page
  // the test notes: one project and one theme holding every kind of section — two experiments, a synthesis, a note, a protocol, a lit review, and papers cited
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const paper = async (file, title, authors, year) => { const rec = await MEDIA.add(await KIT.asset(file)), l = LIB.add({ title, authors, year, container: 'Journal of Demonstration Mechanobiology' }); l.pdf = rec.id; DB.put('library', l); return l; };
    const ok = await paper('paper-okafor-2021.pdf', 'Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }], 2021);
    const ha = await paper('paper-haldane-2019.pdf', 'Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019);
    const cited = (b, label, before, lib) => { const text = before + OBJ; KIT.fill(b, label, text); b.body = { text, marks: [{ id: uid('m'), type: 'cite', from: before.length, to: before.length + 1, ref: lib.id }] }; DB.put('blocks', b); };
    const R3 = KIT.note(P, 'Run 3', { type: 'experiment', themeId: T.id, daysAgo: 1 }), R4 = KIT.note(P, 'Run 4', { type: 'experiment', themeId: T.id, daysAgo: 0 });
    cited(KIT.first(R3), 'Reading', 'Edge traction rises with the coating, as reported ', ok);
    cited(KIT.first(R4), 'Drift', 'Bead drift is corrected frame by frame ', ha);
    const S = KIT.note(P, 'Synthesis · traction against stiffness', { type: 'reflection', themeId: T.id, daysAgo: 0 });
    KIT.fill(KIT.first(S), 'What the runs add up to', 'Traction peaks at the sheet edge and grows with stiffness.');
    const N = KIT.note(P, 'Gel batch 14', { themeId: T.id, daysAgo: 3 }); KIT.fill(KIT.first(N), 'Stiffness', 'Measured 8.4 ± 0.6 kPa on the rheometer.');
    const PD = KIT.note(P, 'Bead coating', { type: 'protocol', themeId: T.id, daysAgo: 5 }); PD.themeId = T.id; DB.put('documents', PD);   // a protocol note is project-scoped; the Portfolio files it under the theme it carries
    const def = PROTO.create(PD.id, 0, 0); def.label = 'Bead coating'; def.steps[0].text = 'Coat the gel with 0.1 mg/mL fibronectin for 1 h';
    def.registered = { docId: PD.id, projectId: P.id, themeId: T.id, at: isoLocal(new Date()) }; PROTO.syncBody(def); DB.put('blocks', def);
    const L = M.createDoc({ type: 'literature', projectId: null, themeId: null, title: 'TFM — open problems', date: KIT.day(2) }), Lc = M.doc(L.id); Lc.review = { topic: 'What limits traction force microscopy on soft gels?', projectIds: [P.id] }; M.touchDoc(Lc);
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id };
  },
  before: async (R, c) => { await R.go('#/portfolio'); await R.until(`!!document.querySelector('.pf-g[data-g="exp"]')`, 8000); await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0); },
  steps: [
    ['The Portfolio: each kind of section has its symbol and its colour — Experiments, Syntheses, Notes, Protocols, Lit reviews, References', async (R, c) => {
      await R.ev(`document.querySelector('.pf-sec').scrollIntoView({ block: 'start' }); return 1`);
      await R.sleep(1200);
      await R.move({ js: `document.querySelector('.pf-g[data-g="syn"] .pf-gl') || document.querySelector('.pf-g[data-g="exp"] .pf-gl')` }, 700);
      await R.sleep(1600);
    }],
    ['Settings → Section headers: switch it off, and the headers lose their symbols and boxes', async (R, c) => {
      await R.go('#/settings/feature/pficons');
      await R.until(`!!document.querySelector('.fp-sw .fsw')`, 6000);
      await R.sleep(1200);
      await R.click('.fp-sw .fsw', { ms: 700 });
      await R.sleep(1600);
    }],
    ['Back in the Portfolio the sections are only words again', async (R, c) => {
      await R.click('#tabs .tab[data-k="portfolio"]', { ms: 700 });
      await R.until(`!!document.querySelector('.pf-g[data-g="exp"]')`, 6000);
      await R.ev(`document.querySelector('.pf-sec').scrollIntoView({ block: 'start' }); return 1`);
      await R.sleep(1800);
    }],
    ['Switch it on again: the symbols and colours are back', async (R, c) => {
      await R.go('#/settings/feature/pficons');
      await R.until(`!!document.querySelector('.fp-sw .fsw')`, 6000);
      await R.click('.fp-sw .fsw', { ms: 700 });
      await R.sleep(1200);
      await R.click('#tabs .tab[data-k="portfolio"]', { ms: 700 });
      await R.until(`!!document.querySelector('.pf-box')`, 6000);
      await R.ev(`document.querySelector('.pf-sec').scrollIntoView({ block: 'start' }); return 1`);
      await R.sleep(1800);
    }],
  ],
};
