/* ==========================================================================
   21 · Demo seed — Traction Force–ELISA, dated relative to today.
   Inline seed markup (seed only, never shown to the user):
     {b#key:text}  structure (letter = KIND key), optional #key
     {r>key:text}  resolution of barrier `key`
     {=key:text}   mention of an existing structure
     [[label]]     term          {@lib}  citation
   ========================================================================== */
function seedDemo() {
  const T = (d, hm = '10:00') => { const [H, Mi] = hm.split(':').map(Number); const x = addDays(dayStart(new Date()), d); x.setHours(H, Mi, 0, 0); return x; };
  const K = {}, LIBK = {}, TERMS = {};
  const P1 = { id: 'p_tfe', name: 'Traction Force–ELISA', status: 'active', created: isoLocal(T(-60)) };
  const P2 = { id: 'p_nd2', name: 'ND2 analysis tooling', status: 'active', created: isoLocal(T(-50)) };
  [P1, P2].forEach(p => DB.put('projects', p));
  const th = (id, projectId, name, question, d) => DB.put('themes', { id, projectId, name, question, status: 'active', supersedes: [], supersededBy: [], created: isoLocal(T(d)) });
  th('t_err', P1.id, 'ELISA confocal error quantification & modelling', 'How low can in-situ ELISA detect, and how much of the error is optics?', -58);
  th('t_tfm', P1.id, 'TFM on monolayers, varying stiffnesses', 'How does monolayer traction scale with substrate stiffness under EGF?', -58);
  th('t_cel', P1.id, 'Cellular ELISA output', 'Can the cellular ELISA read out EGF dose response in situ?', -45);
  th('t_seg', P2.id, 'Segmentation pipeline', 'Robust bead and nucleus segmentation for AX-R ND2 exports.', -48);
  const aim = (id, themeId, statement, ms, d) => DB.put('aims', { id, themeId, statement, status: 'active', supersedes: [], supersededBy: [], created: isoLocal(T(d)), milestones: ms.map(([label, weight, met], i) => ({ id: id + '_m' + i, label, weight, metAt: met != null ? isoLocal(T(met, '16:00')) : null, evidenceRef: null })) });
  aim('a_floor', 't_err', 'Quantify the in-situ ELISA detection floor below 2 ng/mL', [['Bead-array calibration curve at 3 pinholes', .25, -30], ['Z-step sensitivity sweep', .25, -12], ['Noise model fitted to the scout stage', .30], ['Floor stated with a confidence interval', .20]], -50);
  aim('a_stiff', 't_tfm', 'Map traction force against substrate stiffness, 8–30 kPa', [['8 kPa series', .30, -16], ['30 kPa series', .30, -9], ['15 kPa series', .25], ['Scaling model fitted', .15]], -40);

  // library — the four real records from the DOI harness
  const L = [
    ['pnas', { DOI: '10.1073/pnas.1013763107', type: 'journal-article', title: ['Kinetics of G-protein–coupled receptor endosomal trafficking pathways revealed by single quantum dots'], author: [{ family: 'Fichter', given: 'Katye M.' }, { family: 'Flajolet', given: 'Marc' }, { family: 'Greengard', given: 'Paul' }], 'container-title': ['proceedings of the national academy of sciences'], issued: { 'date-parts': [[2010, 10, 12]] }, volume: '107', issue: '43', page: '18658-18663', ISSN: ['0027-8424'] }],
    ['kortum', { DOI: '10.1371/journal.pone.0132737', type: 'journal-article', title: ['αPIX Is a Trafficking Regulator that Balances Recycling and Degradation of the Epidermal Growth Factor Receptor'], author: [{ family: 'Kortüm', given: 'Fanny' }, { family: 'Harms', given: 'Frederike L.' }, { family: 'Hennighausen', given: 'Natascha' }], 'container-title': ['plos one'], issued: { 'date-parts': [[2015, 7, 15]] }, volume: '10', issue: '7', page: 'e0132737', ISSN: ['1932-6203'] }],
    ['acs', { DOI: '10.1021/bi900865u', type: 'journal-article', title: ['Critical Role of ESCRT Machinery in EGFR Recycling'], author: [{ family: 'Baldys', given: 'Aleksander' }, { family: 'Raymond', given: 'John R.' }], 'container-title': ['biochemistry'], issued: { 'date-parts': [[2009, 9, 16]] }, volume: '48', issue: '40', page: '9321-9323', ISSN: ['0006-2960'] }],
    ['st6', { DOI: '10.1101/2023.06.03.543566', type: 'posted-content', title: ['Sialylation of EGFR by ST6GAL1 induces receptor activation and modulates trafficking dynamics'], author: [{ family: 'Ankenbauer', given: 'Katherine E.' }, { family: 'Rao', given: 'Tejeshwar C.' }, { family: 'Mattheyses', given: 'Alexa L.' }], publisher: 'openRxiv', issued: { 'date-parts': [[2023, 6, 4]] } }],
  ];
  L.forEach(([k, csl], i) => { const r = Object.assign({ id: 'l_' + k, kind: 'paper', added: isoLocal(T(-55 + i * 6)) }, LIB.fromCsl(csl)); DB.put('library', r); LIBK[k] = r.id; });

  const term = (projectId, label) => { const key = projectId + ':' + label.toLowerCase(); if (!TERMS[key]) { TERMS[key] = { id: 'w_' + Object.keys(TERMS).length, projectId, label, importedFrom: null, created: isoLocal(T(-50)) }; DB.put('terms', TERMS[key]); } return TERMS[key]; };
  const KEYS = Object.fromEntries(KINDS.map(k => [k.key, k.id])); KEYS.m = KEYS.m || 'reminder'; // the demo still has an old reminder structure

  function parse(src, block, doc, at) {
    let text = ''; const marks = [], stack = []; let i = 0;
    while (i < src.length) {
      if (src.startsWith('[[', i)) { stack.push({ t: 'term', from: text.length }); i += 2; continue; }
      if (src.startsWith(']]', i)) { const f = stack.pop(); const lab = text.slice(f.from); marks.push({ id: uid('m'), type: 'term', from: f.from, to: text.length, ref: term(doc.projectId, lab).id }); i += 2; continue; }
      if (src[i] === '{' && src[i + 1] === '@') { const j = src.indexOf('}', i); const k = src.slice(i + 2, j); marks.push({ id: uid('m'), type: 'cite', from: text.length, to: text.length + 1, ref: LIBK[k] }); text += OBJ; i = j + 1; continue; }
      if (src[i] === '{') { const j = src.indexOf(':', i); stack.push({ t: 'st', head: src.slice(i + 1, j), from: text.length }); i = j + 1; continue; }
      if (src[i] === '}') {
        const f = stack.pop(), seg = text.slice(f.from), hd = f.head;
        let ref;
        if (hd[0] === '>') { const tg = hd.slice(1); marks.push(Object.assign({ id: uid('m'), type: 'link', from: f.from, to: text.length }, tg === '?' ? { ref: null, title: seg } : { ref: tg })); i++; continue; }
        if (hd[0] === '=') ref = K[hd.slice(1)].id;
        else {
          const letter = hd[0], kind = KEYS[letter]; let key = null, resolves = null;
          if (hd.includes('#')) key = hd.split('#')[1]; if (hd.includes('>')) resolves = K[hd.split('>')[1]].id;
          const it = { id: uid('i'), kind, text: seg.replace(/￼/g, '').trim(), projectId: doc.projectId, originDocId: doc.id, originBlockId: block.id, status: KIND[kind].lifecycle === 'open' ? 'open' : null, stance: kind === 'claim' ? 'supported' : null, resolves, created: isoLocal(at) };
          DB.put('items', it); if (key) K[key] = it; ref = it.id;
        }
        marks.push({ id: uid('m'), type: 'struct', from: f.from, to: text.length, ref }); i++; continue;
      }
      text += src[i]; i++;
    }
    return { text, marks };
  }
  const BLK = {};
  function doc(id, type, projectId, themeId, title, d0, rows, extra = {}) {
    const D = Object.assign({ id, type, scope: prof(type).scope, projectId, themeId, title, templateId: null, header: Object.assign({ tags: [] }, extra.header || {}), layout: { head: { x: 0, y: 0 } }, blockIds: [], synthesis: { text: extra.synth || '', marks: [] }, citeMode: extra.citeMode || 'title', created: isoLocal(T(d0, rows[0][2] || '09:00')), modified: isoLocal(T(d0, '17:00')) }, {});
    DB.put('documents', D);
    rows.forEach(([key, label, hm, src, opt = {}]) => {
      const at = T(opt.day != null ? opt.day : d0, hm || '10:00');
      const b = { id: 'c_' + key, docId: id, kind: opt.ref ? 'ref' : 'component', label, body: { text: '', marks: [] }, status: opt.superseded ? 'superseded' : 'live', supersedes: opt.supersedes || [], supersededBy: opt.supersededBy || [], supersededAt: opt.superseded ? isoLocal(T(opt.superseded, '09:12')) : null,
        created: isoLocal(at), modified: isoLocal(at), manualSec: opt.manual || null, step: null, refItemId: null, refBlockId: null, x: null, y: null, w: 392, fields: opt.fields || [], boundTo: opt.bind ? { protocolId: 'd_proto', protocolVersion: null, componentId: 'c_' + opt.bind } : null,
        stamp: { at: isoLocal(at), from: isoLocal(new Date(+at - 432e5)), to: isoLocal(new Date(+at + 432e5)) } };
      if (opt.ref) { b.refItemId = K[opt.ref].id; b.refBlockId = K[opt.ref].originBlockId; } else b.body = parse(src, b, D, at);
      DB.put('blocks', b); D.blockIds.push(b.id); BLK[key] = b;
    });
    D.modified = isoLocal(new Date(Math.max(...rows.map(r => +T(r[4] && r[4].day != null ? r[4].day : d0, r[2] || '10:00'))))); DB.put('documents', D);
    return D;
  }
  const wire = (a, b, rel, d) => DB.put('wires', { id: uid('w'), from: 'c_' + a, to: 'c_' + b, rel, directed: rel !== 'related', created: isoLocal(T(d)) });


  doc('d_cal', 'experiment', P1.id, 't_err', 'Bead-array calibration curve', -31, [
    ['k1', 'Setup', '10:00', 'Bead arrays with 0–20 ng/mL standards, imaged at three [[pinhole]] settings.'],
    ['k2', 'Run', '11:30', '{o:Signal saturates above 12 ng/mL at 1.4 AU}.'],
    ['k3', 'Outcome', '15:20', '{e:Calibration is linear from 0.5 to 10 ng/mL at every [[pinhole]] setting (R² > 0.99)}.'],
  ]);
  doc('d_gel', 'experiment', P1.id, 't_tfm', 'Gel stiffness validation (AFM)', -34, [
    ['g1', 'Setup', '09:30', 'AFM indentation on 8, 15 and 30 kPa [[PAA gel]] batches.'],
    ['g2', 'Result', '13:00', '{s:Measured 8.4 ± 0.6, 14.1 ± 1.2 and 29 ± 2 kPa}.'],
    ['g3', 'Note', '13:20', '{b#gelage:Gels older than 5 days soften by ~15%}.'],
    ['g4', 'Fix', '16:00', '{r>gelage:Cast gels no more than 3 days before use}.', { day: -32 }],
  ]);
  doc('d_lit', 'literature', P1.id, null, 'Reading: αPIX and EGFR recycling', -22, [
    ['li1', 'Citation', '20:10', '{@kortum}'],
    ['li2', 'Main claim', '20:20', '{c#pix:αPIX balances recycling and degradation of the [[EGF]] receptor}.'],
    ['li3', 'Doubts', '20:30', '{q:Their dose range tops out at 5 ng/mL — does saturation hold above it?}'],
  ], { synth: 'Useful mechanism, but the dose range is narrower than what we use.' });
  doc('d_dose', 'experiment', P1.id, 't_cel', 'EGF dose series', -19, [
    ['do1', 'Rationale', '09:30', '{c#sat:[[EGF]] at 10 ng/mL saturates the migratory response} {@kortum} — so 10 ng/mL is the working dose.'],
    ['do2', 'Doses', '09:50', '0.5, 2 and 10 ng/mL; three wells each, read at 30 min.'],
    ['do3', 'Readout', '15:10', '{q#bead:Does bead size bias the ELISA floor estimate?}'],
  ]);
  doc('d_plan8k', 'planning', P1.id, 't_tfm', '8 kPa series — Planning', -18, [
    ['pl1', 'Context', '14:00', 'The 30 kPa runs look stiff-dominated; we need the soft end of the curve on [[PAA gel]].'],
    ['pl2', 'Option A', '14:10', 'Run the standard monolayer TFM protocol at 8 kPa, three gels.'],
    ['pl3', 'Option B', '14:20', 'Go straight to 4 kPa and skip 8 kPa — faster, but the gels tear more easily.'],
    ['pl4', 'Decision', '14:35', 'Option A: 8 kPa first, strained seeding, image at 10 s intervals.'],
  ]);
  doc('d_8k', 'experiment', P1.id, 't_tfm', '8 kPa series — run ' + fmtDay(T(-16)), -16, [
    ['e1', 'Setup', '09:12', 'Gel batch 14, 8 kPa [[PAA gel]]. Seeded per protocol (strained, 40k/cm²).'],
    ['e2', 'EGF stimulation', '09:40', 'Added [[EGF]] at 10 ng/mL at frame 0. {o:Cells began ruffling within 5 minutes}.'],
    ['e3', 'Image', '10:22', '{b#edge:Excess [[EGF]] collapsed the monolayer’s leading edge within 40 frames} — [[edge collapse]] in every field. {v:Imaged at 15 s intervals instead of 10 s}.'],
    ['e4', 'Traction maps', '11:05', '{c#peak:[[traction force]] peaks at the leading edge before collapse}, consistent with {@kortum}.', { fields: [{ key: 'stiffness', value: '8 kPa' }, { key: 'mean traction', value: '142 Pa' }] }],
    ['e5', 'Outcome', '11:40', '{s:Mean [[traction force]] at the edge: 142 Pa (n = 6 fields)}.'],
  ], { synth: 'Edge collapse dominates at 10 ng/mL; traction is measurable before it.' });
  doc('d_ph', 'analysis', P1.id, 't_err', 'Pinhole sweep', -12, [
    ['a1', 'Input', '13:00', 'Bead-array ELISA stacks at three [[pinhole]] settings (0.6, 1.0, 1.4 AU).'],
    ['a2', 'Pass 1', '14:10', '{c#ph:A 1 AU [[pinhole]] loses 18% of signal at the detection floor}.'],
    ['a3', 'Pass 2', '15:30', '{b#zd:Z-drift during the sweep smears the bottom bead layer} — needs a [[pinhole]] re-run with focus lock.'],
    ['a4', 'Result', '16:40', '{s:Floor estimate 1.6 ng/mL at 1.4 AU [[pinhole]]} — provisional until the drift is fixed.'],
  ]);
  doc('d_30k', 'experiment', P1.id, 't_tfm', '30 kPa series — run ' + fmtDay(T(-9)), -9, [
    ['f1', 'Setup', '09:05', '30 kPa gels, same seeding.'],
    ['f1b', 'Image', '09:40', 'Beads and monolayer at 10×. {v:Imaged at 15 s intervals again}.'],
    ['f2', '', '09:20', '', { ref: 'edge' }],
    ['f3', 'EGF titration', '10:10', '{r>edge:Dropped [[EGF]] to 2 ng/mL; the edge held for 120 frames}.'],
    ['f4', 'Traction maps', '11:30', '{=peak:The leading-edge peak} reappears at 30 kPa and is larger: {s:mean [[traction force]] 231 Pa}.', { fields: [{ key: 'stiffness', value: '30 kPa' }, { key: 'mean traction', value: '231 Pa' }] }],
    ['f5', 'Takeaway', '12:10', '{t:[[traction force]] scales sub-linearly with substrate stiffness between 8 and 30 kPa}.'],
  ], { citeMode: 'author' });
  doc('d_meet', 'meeting', P1.id, 't_tfm', 'Stiffness pivot with Alexander', -6, [
    ['m1', 'Attendees', '14:00', 'Alexander, Gabriel.'],
    ['m2', '2 kPa condition', '14:05', '{d:Drop the 2 kPa condition — gels tear on handling}.'],
    ['m3', 'Edge collapse', '14:20', 'Discussed [[edge collapse]] at high [[EGF]] in {>d_8k:the 8 kPa run}. {m:Re-run the 2 ng/mL point before group meeting}. Gabriel to draft {>?:Stiffness scaling model}.'],
    ['m4', 'Actions', '14:40', '{q#doseq:Is the collapse a dose effect or a stiffness effect?}'],
  ]);
  doc('d_sim', 'analysis', P1.id, 't_err', 'Forward simulator — PSF blur', -4, [
    ['s1', 'Method', '10:00', 'Convolve the bead model with a measured PSF at each [[pinhole]] setting.'],
    ['s2', 'Pass 1', '11:30', '{o:Simulated blur matches measured within 8% at 1 AU}.'],
    ['s3', 'Next', '15:00', '{t:The forward model is good enough to correct the [[pinhole]] floor estimate}.', { day: -2 }],
  ]);
  doc('d_plate', 'note', P1.id, 't_cel', 'ELISA plate prep', 0, [
    ['n1', 'Prep', '09:20', 'Coated plate with capture antibody at 2 µg/mL; blocking now.'],
    ['n2', 'Plate map', '09:48', 'Columns 1–3 standards, 4–9 [[EGF]] doses, 10–12 blanks.'],
  ]);
  doc('d_qc', 'analysis', P2.id, 't_seg', 'Bead displacement QC', -5, [
    ['q1', 'Drift', '10:00', '{o:Drift correction removes ~30% of spurious [[traction force]] in static controls}.'],
    ['q2', 'Metadata', '11:00', '{b:ND2 metadata lacks per-frame z for the AX-R exports}.'],
  ]);
  // fix resolution of the clumping barrier (barrier was created after its resolution in seed order)

  // imported term: P2 reuses P1's "traction force"
  const tfP1 = TERMS[P1.id + ':traction force'], tfP2 = TERMS[P2.id + ':traction force']; if (tfP1 && tfP2) { tfP2.importedFrom = tfP1.id; DB.put('terms', tfP2); }

  wire('f1', 'f1b', 'follows', -9); wire('e1', 'e2', 'follows', -16); wire('e2', 'e3', 'leads', -16); wire('e4', 'e3', 'related', -16); wire('e3', 'e5', 'leads', -16);
  wire('do1', 'e3', 'causes', -15); wire('li2', 'do1', 'supports', -19);
  wire('k2', 'k3', 'leads', -31); wire('k3', 'a1', 'leads', -12); wire('g3', 'g4', 'leads', -32); 
  wire('a2', 'a3', 'leads', -12); wire('a3', 'a4', 'leads', -12); wire('a4', 's1', 'leads', -4);
  wire('f3', 'f2', 'resolves', -9); wire('f3', 'f4', 'leads', -9); wire('f4', 'f5', 'leads', -9);
  wire('m3', 'm4', 'leads', -6); wire('n1', 'n2', 'follows', 0);

  // sessions — a deterministic month, with overlaps (multitask) and a stepped run
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const byTheme = { t_err: ['d_sim', 'd_ph', 'd_cal'], t_tfm: ['d_30k', 'd_8k', 'd_gel'], t_cel: ['d_dose', 'd_plate'], t_seg: ['d_qc'] };
  const sess = (docId, s, e, extra = {}) => { const d = M.doc(docId); DB.put('sessions', Object.assign({ id: uid('s'), docId, themeId: d.themeId, projectId: d.projectId, entry: 'timer', source: 'timer', state: 'complete', segments: [{ s: isoLocal(s), e: isoLocal(e) }], steps: [], created: isoLocal(s), seconds: Math.round((e - s) / 1000) }, extra)); };
  for (let d = -36; d <= -1; d++) {
    const day = addDays(dayStart(new Date()), d), dow = day.getDay();
    if ((dow === 0 && rnd() < .8) || (dow === 6 && rnd() < .6) || rnd() < .1) continue;
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const tid = ['t_err', 't_tfm', 't_tfm', 't_cel', 't_seg'][Math.floor(rnd() * 5)];
      const docId = byTheme[tid].find(x => +new Date(M.doc(x).created) <= +day + 864e5 && x !== 'd_plate') || null; if (!docId) continue;
      const start = new Date(day); start.setHours(9 + k * 3 + Math.floor(rnd() * 2), Math.floor(rnd() * 4) * 15, 0, 0);
      const mins = 35 + Math.floor(rnd() * 115); sess(docId, start, new Date(+start + mins * 6e4));
    }
  }
  // overlapping timers → multitask
  sess('d_ph', T(-11, '13:00'), T(-11, '15:10')); sess('d_dose', T(-11, '14:20'), T(-11, '15:40'));
  sess('d_sim', T(-3, '10:00'), T(-3, '12:00')); sess('d_30k', T(-3, '11:15'), T(-3, '12:30'));
  // the stepped 8 kPa run: steps checked inside the timer
  (() => { const s0 = T(-16, '09:05'); const offs = [7, 35, 77, 120, 155]; const steps = offs.map((o, i) => ({ blockId: 'c_e' + (i + 1), at: isoLocal(new Date(+s0 + o * 6e4)), offsetMs: o * 6e4, durMs: (o - (offs[i - 1] || 0)) * 6e4 }));
    sess('d_8k', s0, new Date(+s0 + 155 * 6e4), { steps }); const S0 = DB.all('sessions').find(x => x.docId === 'd_8k' && x.steps.length);
    steps.forEach(st => { const b = M.block(st.blockId); b.step = { checkedAt: st.at, sessionId: S0.id, durMs: st.durMs, offsetMs: st.offsetMs }; b.stamp.sessionId = S0.id; b.stamp.offsetMs = Math.max(0, +new Date(b.created) - +s0); DB.put('blocks', b); }); })();
  // manual + open entries
  DB.put('sessions', { id: uid('s'), docId: 'd_meet', themeId: 't_tfm', projectId: P1.id, entry: 'duration', localDate: localDate(T(-6)), seconds: 3600, source: 'manual', state: 'complete', segments: [], steps: [], created: isoLocal(T(-6, '15:30')), note: 'meeting' });
  DB.put('sessions', { id: uid('s'), docId: 'd_qc', themeId: 't_seg', projectId: P2.id, entry: 'endpoints', startedAt: isoLocal(T(-5, '13:15')), endedAt: null, source: 'manual', state: 'open', segments: [], steps: [], created: isoLocal(T(-5, '13:15')) });
  M.block('c_a3').manualSec = 2700; DB.put('blocks', M.block('c_a3'));
  // a timer running right now on today's plate prep; components written during it are stamped against it
  (() => { const s0 = new Date(Date.now() - 52 * 6e4); const s = { id: 's_now', docId: 'd_plate', themeId: 't_cel', projectId: P1.id, entry: 'timer', source: 'timer', state: 'running', segments: [{ s: isoLocal(s0), e: null }], steps: [], created: isoLocal(s0), heartbeat: isoLocal(new Date()) };
    DB.put('sessions', s); ['c_n1', 'c_n2'].forEach((id, i) => { const b = M.block(id), at = new Date(+s0 + (8 + i * 26) * 6e4); b.created = b.modified = isoLocal(at); b.stamp = { at: isoLocal(at), from: isoLocal(new Date(+at - 432e5)), to: isoLocal(new Date(+at + 432e5)), sessionId: s.id, offsetMs: (8 + i * 26) * 6e4 }; DB.put('blocks', b); });
    const D = M.doc('d_plate'); D.created = isoLocal(s0); D.modified = isoLocal(new Date()); DB.put('documents', D); })();

  // flags
  seedProtocols(T, K, wire);
  const flag = (targetType, targetId, reason, carry, d) => DB.put('flags', { id: uid('f'), targetType, targetId, reason, carry, status: 'open', created: isoLocal(T(d)), history: [] });
  flag('item', K.zd.id, 'Decide whether to re-run the sweep with focus lock', 1, -11);
  flag('block', 'c_m3', 'Group meeting is next Thursday', 0, -6);
  flag('library', LIBK.kortum, 'Check their dose range against ours', 0, -8);
  flag('item', K.doseq.id, '', 0, 0);

  // reviews — one gap (unrated week) on purpose
  const cur = IX.weekStartFor(new Date());
  [[5, 5], [4, 7], [3, null], [2, 6]].forEach(([wk, imp]) => { if (imp == null) return; const ws = addDays(cur, -7 * wk); DB.put('reviews', { id: localDate(ws), status: 'complete', impact: imp, ratedAt: isoLocal(addDays(ws, 7)), completedAt: isoLocal(addDays(ws, 7)), flagDecisions: {}, alloc: { t_tfm: { blocks: 5, lane: 'cont' }, t_err: { blocks: 3, lane: 'unblock' }, t_cel: { blocks: 2, lane: 'explore' }, _slack: { blocks: 2, lane: 'slack' } }, plan: 'Attend to TFM and the pinhole floor.', wip: ['t_tfm', 't_err'], boostAtRating: 0 }); });
  DB.all('documents').forEach(d => { M.autoLayout(d); if (d.type === 'protocol') { d.header = Object.assign({ tags: ['TFM'], version: '3', owner: 'Gabriel' }, d.header); } DB.put('documents', d); });
  DB.all('blocks').forEach(b => { if (b.boundTo) { b.boundTo.protocolVersion = M.doc('d_proto').modified; DB.put('blocks', b); } });
  // one experiment strung as stages: Planning → Run (Analysis and Reflection are made with “Next”)
  const pl = M.doc('d_plan8k'), r8 = M.doc('d_8k'); Object.assign(pl, { chain: pl.id, chainName: '8 kPa series' }); Object.assign(r8, { chain: pl.id, prev: pl.id, chainName: '8 kPa series' }); DB.put('documents', pl); DB.put('documents', r8);
  // materials: two gel batches and two antibody lots, listed on the notes that used them
  const res = (id, title, header, day) => { const r = { id, type: 'resource', scope: 'project', projectId: P1.id, themeId: null, title, templateId: null, header: Object.assign({ tags: [] }, header), layout: { head: { x: 0, y: 0 } }, blockIds: [], synthesis: { text: '', marks: [] }, citeMode: 'title', created: isoLocal(T(day, '09:00')), modified: isoLocal(T(day, '09:00')) }; DB.put('documents', r); return r; };
  const g14 = res('r_gel14', 'PAA gel batch 14', { kind: 'gel batch', lot: '14', conc: '8 kPa · 0.2 µm beads', location: 'Bench 3, 4 °C' }, -36), g15 = res('r_gel15', 'PAA gel batch 15', { kind: 'gel batch', lot: '15', conc: '8 kPa · 0.2 µm beads', location: 'Bench 3, 4 °C' }, -12);
  g14.supersededBy = ['r_gel15']; g15.supersedes = ['r_gel14']; DB.put('documents', g14); DB.put('documents', g15);
  res('r_mdck', 'MDCK p12', { kind: 'cell line', passage: '12', supplier: 'ATCC CCL-34', location: 'LN2 box 2' }, -40);
  [['d_gel', ['r_gel14', 'r_mdck']], ['d_8k', ['r_gel14', 'r_mdck']], ['d_30k', ['r_gel15', 'r_mdck']]].forEach(([id, ms]) => { const x = M.doc(id); if (x) { x.materials = ms; DB.put('documents', x); } });
  saveSettings({ seeded: true, demoVersion: DEMO_V, cycleAt: isoLocal(T(-20)) });
}
