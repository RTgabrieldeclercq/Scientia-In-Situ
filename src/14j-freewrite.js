/* ==========================================================================
   14j · Freewrite (V4.33). Gabe: "Freewrite is a new button in Quick Cast. It
   brings up a blank white page which covers the whole Scientia In Situ screen.
   You may decide to place it beside a note or to close it, saving all changes
   and appearing in the note it was placed in. Freewrite works with typing and
   recording your voice, which you can play and pause at any time, as well as
   correcting with typing. The goal is that the final freewrite product
   automatically converts into a partial or complete note canvas. Words have
   identities and transform into note components, kinds, links, etc…"
   FREEW:
     open(d, { pane, block, near })  the page over the whole app, for note d: a new freewrite, or `block` (a freewrite of
                                   the note) to go on with it. Quick cast → Freewrite (lab-mode §11), /freewrite, ⋯ → Freewrite.
     close()                       saves everything; the freewrite stays in its note as a component (kind 'freewrite',
                                   WIDGETS.freewrite: its words, coloured once converted; Open goes on with it). A page
                                   closed with nothing on it leaves nothing.
     beside()                      half the window, the note live in the other half (Settings → Freewrite: which side)
     convert(text, o)              the words read by the rules: { parts, links, cues }. Sentence by sentence: two-part rules
                                   first ("[A] supports [B]" — each part read again, so chains and "We found that…" inside
                                   work), then one-part rules ("We found that [A]"), then a word anywhere ("barrier": the
                                   whole sentence). A part is a component (with a kind, a structure marked on its words),
                                   a task, a placeholder Result (fwslot 'result': ＋ adds anything + Insert offers, wired
                                   to it) or a placeholder bridge (fwslot 'bridge': the Portfolio's notes whose titles
                                   share its words, to choose a component from). The same words twice are one component.
                                   What you change by clicking is kept by the part's words (fw.over, fw.lover), so it
                                   survives corrections.
     apply()                       the parts as components and wires in the note, laid out as Tidy lays a note out
                                   (LAYOUT.pack / LAYOUT.square), under the freewrite, which folds; the note's settle
                                   keeps boxes apart; one Undo. Applying again adds only what is new (fw.made).
   The page: a textarea over a copy of its words that carries the colours (each coloured stretch says in words what it
   became), and beside it the note it will make, drawn from the same layout, scaled.
   Voice: REC (13zn) records into the freewrite block itself — pause, go on, stop (closing stops it); play back at any
   time (while paused, what was recorded so far). The words appear as you speak with the browser's speech recognition
   (Chrome, Edge, Safari); without it they are written when the recording stops — the computer's Whisper (REC.watch →
   REC.apply, added after what you wrote). When the words
   were written as you spoke, a transcript that arrives later keeps only its timings.
   V4.34 — Gabe: "The user may also add freewrite components via highlights, and once the highlight is done, will be asked
   to associate it to a new or existing component. That association will be asked if it is temporary (i.e., just for that
   freewrite) or permanent (i.e., for all future freewrites). Additional freewrite association rules can be added,
   modified, or deleted in Settings."
     selChip() / associate(words, a, b) / keepAssoc()  words selected with the pointer → a small button → the question:
                                   a new component (what it is) or one that exists; just this freewrite (fw.assoc) or every
                                   freewrite (a phrase rule of yours). A part standing for an existing component (p.block)
                                   is that component on Apply — bridged in when it lives in another note.
     store() / rules()             settings().fwRules = { own, edit, off }: yours, your changes to the built-in rules, the
                                   built-in ones you deleted — the notebook's settings, so they follow you across devices.
     editor() / form(r, done)      Settings → Freewrite → Rules: every rule with its switch, patterns, what it makes and its
                                   example; add, change (the example read live, there and in the preview: pvRule), delete,
                                   restore the built-in ones.
   ========================================================================== */
const FREEW = {
  st: null, au: null, dict: null, wait: null,
  ICON: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>',
  P: {
    mic: 'M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z',
    pause: 'M15.75 5.25v13.5m-7.5-13.5v13.5',
    play: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
    stop: 'M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z',
    x: 'M6 18 18 6M6 6l12 12',
    side: 'M3.75 5.25h16.5v13.5H3.75zM12 5.25v13.5',
    full: 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15',
    wand: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z',
    check: 'm4.5 12.75 6 6 9-13.5',
  },
  ic(k, px = 16) { return h('span.fw-ic', { html: `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${FREEW.P[k]}"/></svg>` }); },
  on: () => typeof FEAT === 'undefined' || FEAT.on('freewrite'),
  opt(k, d) { try { const v = FEAT.tune('freewrite', k); return v == null ? d : v; } catch (e) { return d; } },

  /* ---------------- the rules ---------------- */
  /** Each rule: patterns ([A], [B] are the parts; the rest is matched as written, any case — two parts, one, or none: a
      word anywhere, when `whole`, makes the whole sentence the part), what each part becomes ({ as: 'component' | 'task'
      | 'slot' | 'bridge', kind: a component kind, struct: a structure }), and the link between two parts. */
  BUILTIN: [
    { id: 'supports', name: 'supports', pats: ['[A] supports [B]', '[A] support [B]', '[A] is evidence for [B]', '[A] backs up [B]'], link: { rel: 'supports' }, ex: 'Stiffer gels raise traction, which supports the mechanosensing hypothesis.' },
    { id: 'supported', name: 'is supported by', pats: ['[A] is supported by [B]', '[A] are supported by [B]', '[A] was supported by [B]'], link: { rel: 'supports', from: 'B', to: 'A' }, ex: 'The mechanosensing hypothesis is supported by the traction maps.' },
    { id: 'contradicts', name: 'contradicts', pats: ['[A] contradicts [B]', '[A] contradict [B]', '[A] is at odds with [B]'], link: { rel: 'contradicts' }, ex: 'The soft-gel run contradicts the saturation model.' },
    { id: 'contradicted', name: 'is contradicted by', pats: ['[A] is contradicted by [B]', '[A] are contradicted by [B]'], link: { rel: 'contradicts', from: 'B', to: 'A' }, ex: 'The saturation model is contradicted by the soft-gel run.' },
    { id: 'results', name: 'which results in', pats: ['[A] which results in [B]', '[A] which resulted in [B]', '[A] resulting in [B]', '[A] results in [B]', '[A] resulted in [B]'], B: { as: 'slot', kind: 'result' }, link: { rel: 'produces' }, ex: 'We imaged the beads every minute, which results in a displacement map.' },
    { id: 'evidence', name: 'Evidence from … explains …', pats: ['Evidence from [A] explains [B]', 'Data from [A] explains [B]', 'Evidence from [A] shows [B]', 'Evidence from [A] suggests [B]'], A: { as: 'bridge' }, link: { rel: 'explains' }, ex: 'Evidence from the gel calibration explains the drift at the edge.' },
    { id: 'resolved', name: 'is resolved by', pats: ['[A] is resolved by [B]', '[A] was resolved by [B]', '[A] can be resolved by [B]'], B: { struct: 'resolution' }, link: { rel: 'resolves', from: 'B', to: 'A' }, ex: 'Bead drift is resolved by a reference image after trypsin.' },
    { id: 'resolves', name: 'resolves', pats: ['[A] resolves [B]', '[A] fixes [B]', '[A] solves [B]'], A: { struct: 'resolution' }, link: { rel: 'resolves' }, ex: 'A reference image after trypsin resolves the bead drift.' },
    { id: 'explains', name: 'explains', pats: ['[A] explains [B]', '[A] explain [B]', '[A] accounts for [B]'], link: { rel: 'explains' }, ex: 'Focal adhesion growth explains the edge peak.' },
    { id: 'because', name: 'because / due to', pats: ['[A] because of [B]', '[A] because [B]', '[A] due to [B]', '[A] is caused by [B]', '[A] was caused by [B]'], link: { rel: 'causes', from: 'B', to: 'A' }, ex: 'The edge lifted because the coating dried.' },
    { id: 'causes', name: 'causes', pats: ['[A] causes [B]', '[A] cause [B]', '[A] caused [B]'], link: { rel: 'causes' }, ex: 'Drying the coating caused the edge to lift.' },
    { id: 'leads', name: 'leads to / therefore / so', pats: ['[A] leads to [B]', '[A] lead to [B]', '[A] led to [B]', '[A], therefore [B]', '[A] therefore [B]', '[A], so [B]'], link: { rel: 'leads' }, ex: 'The force saturates at 30 kPa, so we stop at 30 kPa.' },
    { id: 'tests', name: 'tests', pats: ['[A] tests [B]', '[A] will test [B]'], link: { rel: 'tests' }, ex: 'A blebbistatin run tests the myosin hypothesis.' },
    { id: 'needs', name: 'needs', pats: ['[A] needs [B]', '[A] requires [B]', '[A] depends on [B]'], link: { rel: 'needs' }, ex: 'The 30 kPa series needs fresh beads.' },
    { id: 'barrier', name: 'One of the barriers is … / … is a barrier', pats: ['One of the barriers is [A]', 'A barrier is [A]', 'The barrier is [A]', 'The main barrier is [A]', '[A] is a barrier', '[A] is the barrier'], A: { struct: 'barrier' }, ex: 'One of the barriers is bead drift at the edge.' },
    { id: 'hypothesis', name: 'We hypothesize / I think', pats: ['We hypothesize that [A]', 'We hypothesise that [A]', 'We hypothesize [A]', 'I hypothesize that [A]', 'Our hypothesis is that [A]', 'My hypothesis is that [A]', 'I think that [A]', 'I think [A]', 'We think that [A]'], A: { kind: 'hypothesis' }, ex: 'We hypothesize that cells read the gel through their edge.' },
    { id: 'question', name: 'The question is / I wonder', pats: ['The question is whether [A]', 'The question is if [A]', 'The question is [A]', 'I wonder whether [A]', 'I wonder if [A]'], A: { kind: 'question' }, ex: 'The question is whether EGF moves the force or lowers it.' },
    { id: 'method', name: 'Method: / We used', pats: ['Method: [A]', 'We used [A]', 'I used [A]', 'We measured [A]'], A: { kind: 'method' }, ex: 'We used traction force microscopy on 30 kPa gels.' },
    { id: 'result', name: 'Results show / We found', pats: ['Results show that [A]', 'The results show that [A]', 'Results show [A]', 'We found that [A]', 'I found that [A]', 'We found [A]', 'The result is [A]', 'Result: [A]'], A: { kind: 'result' }, ex: 'We found that traction doubles between 8 and 30 kPa.' },
    { id: 'anomaly', name: 'Surprisingly / Unexpectedly', pats: ['Surprisingly, [A]', 'Surprisingly [A]', 'Unexpectedly, [A]', 'Unexpectedly [A]', 'Oddly, [A]'], A: { kind: 'anomaly' }, ex: 'Surprisingly, the softest gel gave the highest peak.' },
    { id: 'insight', name: 'This suggests / This means', pats: ['This suggests that [A]', 'This suggests [A]', 'This means that [A]', 'This means [A]', 'The takeaway is that [A]', 'The takeaway is [A]'], A: { kind: 'insight' }, ex: 'This suggests that the edge senses stiffness first.' },
    { id: 'task', name: 'need to / to do', pats: ['We need to [A]', 'I need to [A]', 'Need to [A]', 'To do: [A]', 'Todo: [A]', 'Remember to [A]'], A: { as: 'task' }, ex: 'We need to order more 0.2 µm beads.' },
    { id: 'challenge', name: 'The problem in the literature / a challenge', pats: ['The problem in the literature is [A]', 'A problem in the literature is [A]', 'A challenge in the field is [A]', 'A challenge is [A]', 'The challenge is [A]', '[A] is a challenge', '[A] remains a challenge'], A: { kind: 'challenge' }, ex: 'The problem in the literature is that traction maps blur at the edge.' },
    { id: 'decision', name: 'We decided', pats: ['We decided to [A]', 'I decided to [A]', 'We decided that [A]', 'Decision: [A]'], A: { struct: 'decision' }, ex: 'We decided to drop the 2 kPa gels.' },
    { id: 'claim', name: 'We claim', pats: ['We claim that [A]', 'I claim that [A]', 'Claim: [A]'], A: { struct: 'claim' }, ex: 'We claim that the edge peak is real.' },
    { id: 'barrierw', name: 'a sentence with “barrier”', pats: ['barrier', 'barriers'], whole: true, A: { struct: 'barrier' }, ex: 'Drift remains our main barrier for edge maps.' },
    { id: 'anomalyw', name: 'a sentence with “unexpected”', pats: ['unexpected', 'unexpectedly', 'surprising', 'surprisingly'], whole: true, A: { kind: 'anomaly' }, ex: 'The 2 kPa gel did something unexpected at the edge.' },
    { id: 'questionw', name: 'a sentence ending in “?”', pats: ['?'], whole: true, A: { kind: 'question' }, ex: 'Does EGF move the force or lower it?' },
  ],
  /** V4.34 — yours, in the notebook's settings (so they follow you across devices): { own: [rule], edit: { builtin id: what you
      changed }, off: [built-in ids you deleted] }. The built-in rules stay in the code, so a later version can improve them. */
  store() { const s = settings().fwRules; return s && typeof s === 'object' ? { own: Array.isArray(s.own) ? s.own.filter(r => r && r.id) : [], edit: Object.assign({}, s.edit || {}), off: Array.isArray(s.off) ? s.off.slice() : [] } : { own: [], edit: {}, off: [] }; },
  saveStore(S) { saveSettings({ fwRules: { own: S.own, edit: S.edit, off: S.off } }); },
  /** The rules in force: the built-in ones as you changed them, less those you deleted, then yours (a rule switched off is kept, not read). */
  rules() { const S = FREEW.store(); return [...FREEW.BUILTIN.filter(r => !S.off.includes(r.id)).map(r => Object.assign({ builtin: true }, r, S.edit[r.id] || {})), ...S.own.filter(r => (r.pats || []).length).map(r => Object.assign({ own: true }, r))]; },
  /** How many parts a rule's patterns have: 2, 1, or 0 (a word or a phrase). */
  nSlots: pat => (String(pat).match(/\[[AB]\]/g) || []).length,
  _re: new Map(),
  /** A pattern as a regular expression with the parts' places (flag d). Patterns with parts describe a whole sentence (or a
      part of one); between two parts ", which supports" reads as "supports". Without parts: found anywhere. */
  compile(pat, whole) {
    const key = pat + '\u0001' + (whole ? 1 : 0); if (FREEW._re.has(key)) return FREEW._re.get(key);
    const toks = String(pat).split(/(\[[AB]\])/).filter(s => s !== ''), slots = toks.filter(t => /^\[[AB]\]$/.test(t)).map(t => t[1]);
    const lit = s => s.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    let src = '', n = 0;
    toks.forEach((t, i) => {
      if (/^\[[AB]\]$/.test(t)) { n++; src += n === slots.length ? '(.+)' : '(.+?)'; return; }
      const s = t.trim(); if (!s) { src += '\\s+'; return; }
      const after = i > 0, before = i < toks.length - 1;
      let core = lit(s); if (/^\w/.test(s)) core = '\\b' + core; if (/\w$/.test(s)) core += '\\b';
      if (after && before && !/^(which|that|and|,)/i.test(s)) core = '(?:,?\\s*(?:which|and\\s+this|this)\\s+)?' + core;
      src += (after ? '\\s*,?\\s*' : '') + core + (before ? '\\s*' : '');
    });
    let re = null; try { re = slots.length ? new RegExp('^\\s*' + src + '[\\s.!?;:,]*$', 'id') : new RegExp(src, 'gi'); } catch (e) { re = null; }
    const out = { re, slots, whole: !!whole }; FREEW._re.set(key, out); return out;
  },
  /** The rules sorted for reading: two parts, one part, a word anywhere (whole sentence), a phrase (just those words). */
  groups(rules) {
    const G = { pair: [], one: [], word: [], phrase: [] };
    rules.filter(r => r && r.on !== false && (r.pats || []).length).forEach(r => {
      const by = {}; r.pats.forEach(p => { const n = FREEW.nSlots(p); (by[n] = by[n] || []).push(FREEW.compile(p, r.whole)); });
      if (by[2]) G.pair.push(Object.assign({}, r, { C: by[2].filter(c => c.re) }));
      if (by[1]) G.one.push(Object.assign({}, r, { C: by[1].filter(c => c.re) }));
      if (by[0]) (r.whole ? G.word : G.phrase).push(Object.assign({}, r, { C: by[0].filter(c => c.re) }));
    });
    return G;
  },

  /* ---------------- reading the words ---------------- */
  /** The sentences: ended by . ! ? before a space (not 2.5 µm) or by a new line. [{ from, to }] */
  sentences(text) {
    const out = [], push = (a, b) => { while (a < b && /\s/.test(text[a])) a++; while (b > a && /\s/.test(text[b - 1])) b--; if (b > a) out.push({ from: a, to: b }); };
    let s = 0;
    for (let i = 0; i <= text.length; i++) {
      const c = text[i];
      if (i === text.length || c === '\n') { push(s, i); s = i + 1; continue; }
      if (c === '.' || c === '!' || c === '?') { let j = i; while (j + 1 < text.length && /[.!?]/.test(text[j + 1])) j++; if (j + 1 >= text.length || /\s/.test(text[j + 1])) { push(s, j + 1); s = j + 1; } i = j; }
    }
    return out;
  },
  /** The words that name a part, the same wherever they are written: no case, no leading article, no closing stop. */
  key: t => String(t || '').toLowerCase().replace(/[“”"’‘]/g, '').replace(/\s+/g, ' ').trim().replace(/^(the|a|an|this|that|these|those|our|my)\s+/, '').replace(/[\s.,;:!?]+$/, ''),
  STOP: new Set('about above after again against also among another because been before being below between both but could does doing down during each from further have having here into itself just more most much must only other over same should some such than that their them then there these they this those through under until very were what when where which while with would your evidence data shows show explains'.split(' ')),
  /** The Portfolio's notes whose titles share a word with these words (the nearest first): Gabe's "from will look into […]
      nearby to see if any notes in the Portfolio contain any words in their title". */
  cands(text, notId) {
    const W = [...new Set(String(text || '').toLowerCase().match(/[a-z0-9µ][a-z0-9µ-]{3,}/g) || [])].filter(w => !FREEW.STOP.has(w)); if (!W.length) return [];
    return DB.where('documents', x => x.id !== notId && !x.deleted && !x.archived && !(prof(x.type).system) && x.title).map(x => { const t = x.title.toLowerCase(), hit = W.filter(w => new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&') + '([^a-z0-9]|$)').test(t)).length; return { x, hit }; })
      .filter(o => o.hit).sort((a, b) => b.hit - a.hit || String(b.x.modified || '').localeCompare(String(a.x.modified || ''))).slice(0, 6).map(o => o.x.id);
  },
  /** The words read by the rules: { parts, links, cues }. o: { rules, over, lover, plain: 'words' | 'component', docId }. */
  convert(text, o = {}) {
    text = String(text || ''); const G = FREEW.groups(o.rules || FREEW.rules()), parts = [], byKey = new Map(), links = [], lk = new Map(), cues = [];
    const trim = (a, b) => { while (a < b && /[\s,;:]/.test(text[a])) a++; while (b > a && /[\s.,;:!?]/.test(text[b - 1])) b--; return [a, b]; };
    const match = (C, a, b) => { for (const c of C) { const m = c.re.exec(text.slice(a, b)); if (m && m.indices) return { c, m, at: a }; } return null; };
    const merge = (outer, inner) => { const s = Object.assign({}, inner || {}); Object.entries(outer || {}).forEach(([k, v]) => { if (v != null && v !== '' && !(k === 'as' && v === 'component')) s[k] = v; }); return s; };
    const part = (a, b, spec, rule) => {
      [a, b] = trim(a, b); if (b <= a) return null; const t = text.slice(a, b), k = FREEW.key(t); if (!k) return null;
      spec = Object.assign({}, spec || {});
      if (!spec.kind && !spec.struct && (!spec.as || spec.as === 'component')) for (const r of G.word) if (r.C.some(c => { c.re.lastIndex = 0; return c.re.test(t); })) { spec = merge(spec, r.A); rule = rule || r.id; break; }
      let p = byKey.get(k);
      if (!p) { p = { id: 'p' + parts.length, key: k, text: t, spans: [], as: spec.as || 'component', kind: spec.kind || null, struct: spec.struct || null, block: spec.block || null, rule: rule || null }; parts.push(p); byKey.set(k, p); }
      else { if (!p.kind && spec.kind) p.kind = spec.kind; if (!p.struct && spec.struct) p.struct = spec.struct; if (p.as === 'component' && spec.as && spec.as !== 'component') p.as = spec.as; }
      p.spans.push({ from: a, to: b }); if (p.as === 'bridge' && !p.cands) p.cands = FREEW.cands(t, o.docId);
      return p;
    };
    const cue = (a, b, p) => { [a, b] = trim(a, b); if (b > a && p) cues.push({ from: a, to: b, part: p.key }); };
    // [a, b): a stretch to read; spec: what an outer rule says it is; returns its first part (what links to it)
    const read = (a, b, spec, depth, ruleId) => {
      const raw = text.slice(a, b);   // a word rule sees the closing "?" that trimming takes off
      [a, b] = trim(a, b); if (b <= a) return null;
      if (depth < 3) { const x = match([].concat(...G.pair.map(r => r.C.map(c => Object.assign({ r }, c)))), a, b);
        if (x) { const r = x.c.r, m = x.m, I = m.indices, sl = x.c.slots, at = x.at, A = I[1], B = I[2], first = sl[0];
          const pa = read(at + A[0], at + A[1], spec ? merge(spec, r[first]) : r[first], depth + 1, r.id), pb = read(at + B[0], at + B[1], r[sl[1]], depth + 1, r.id);
          const L = r.link || {}, from = (L.from || 'A') === first ? pa : pb, to = (L.from || 'A') === first ? pb : pa;
          if (pa && pb && from !== to && L.rel) { const key = from.key + '>' + to.key; if (!lk.has(key)) { const l = { id: 'l' + links.length, key, a: from.key, b: to.key, rel: L.rel, back: from !== pa, span: trim(at + A[1], at + B[0]), rule: r.id }; links.push(l); lk.set(key, l); } }
          return pa || pb; } }
      for (const r of G.one) { const x = match(r.C, a, b); if (!x) continue; const I = x.m.indices[1], at = x.at; const p = part(at + I[0], at + I[1], merge(spec, r.A), r.id); if (!p) continue;
        cue(a, at + I[0], p); cue(at + I[1], b, p); return p; }
      if (spec || depth > 0) return part(a, b, spec, ruleId);
      for (const r of G.word) if (r.C.some(c => { c.re.lastIndex = 0; return c.re.test(raw); })) return part(a, b, r.A, r.id);
      if (o.plain === 'component') return part(a, b, {}, null);
      return null;
    };
    FREEW.sentences(text).forEach(s => read(s.from, s.to, null, 0, null));
    // V4.34 — your associations: this freewrite's (o.assoc) and your phrase rules (every freewrite). Each place the words are written
    // becomes their part where nothing claimed them; where a rule found exactly those words, they become what you said; out of a
    // whole sentence a word rule (or "every sentence a component") coloured, they are taken as their own; inside a part a two- or
    // one-part rule found, they stay part of it.
    const wordIds = new Set(G.word.map(r => r.id));
    const force = (p, A) => { if (!A) return; if (A.block) { p.block = A.block; p.as = 'component'; } if (A.as) p.as = A.as; if ('kind' in A) p.kind = A.kind || null; if ('struct' in A) p.struct = A.struct || null; if (p.as === 'bridge' && !p.cands) p.cands = FREEW.cands(p.text, o.docId); };
    const PH = [...(o.assoc || []).filter(x => x && x.text).map(x => ({ pat: x.text, A: x, id: 'assoc' })), ...G.phrase.flatMap(r => (r.pats || []).map(pat => ({ pat, A: r.A || {}, id: r.id })))];
    PH.forEach(ph => { const c = FREEW.compile(ph.pat, false); if (!c.re || c.slots.length) return; c.re.lastIndex = 0; let m, guard = 0;
      while ((m = c.re.exec(text)) && guard++ < 500) {
        if (!m[0].length) { c.re.lastIndex++; continue; } const a = m.index, b = a + m[0].length, k = FREEW.key(m[0]); let host = null, hs = null, cut = false;
        parts.forEach(p => p.spans.forEach(s => { if (a >= s.from && b <= s.to) { host = p; hs = s; } else if (a < s.to && b > s.from) cut = true; }));
        if (cut || links.some(l => l.span && a < l.span[1] && b > l.span[0]) || cues.some(q => a < q.to && b > q.from)) continue;
        if (host && host.key === k) { force(host, ph.A); continue; }
        if (host && host.rule && !wordIds.has(host.rule)) continue;
        if (host) { host.spans = host.spans.filter(s => s !== hs); if (!host.spans.length) { parts.splice(parts.indexOf(host), 1); byKey.delete(host.key); } }
        const p = part(a, b, {}, ph.id); if (p) force(p, ph.A); } });
    // what was changed by clicking: by the part's words, so a correction elsewhere keeps it
    const over = o.over || {}, lover = o.lover || {};
    parts.forEach(p => { const v = over[p.key]; if (!v) return; if (v.none) p.none = true; else { if (v.as) p.as = v.as; if ('kind' in v) p.kind = v.kind || null; if ('struct' in v) p.struct = v.struct || null; if (v.as === 'bridge' && !p.cands) p.cands = FREEW.cands(p.text, o.docId); } p.changed = true; });
    links.forEach(l => { const v = lover[l.key]; if (v) { if (v.none) l.none = true; if (v.rel) l.rel = v.rel; if (v.flip) { const t = l.a; l.a = l.b; l.b = t; l.back = !l.back; } l.changed = true; }
      const A = byKey.get(l.a), B = byKey.get(l.b); if (!A || !B || A.none || B.none) l.off = true; });
    return { parts, links, cues, text };
  },
  /** What a part looks like: its colour and, in words, what it became. */
  look(p) {
    const K = p.kind && typeof CKINDS !== 'undefined' ? CKINDS.get(p.kind) : null, S = p.struct ? KIND[p.struct] : null, sc = s => ((settings().kinds || {})[s.id] || s).color;
    if (p.block) { const b = M.block(p.block); return { col: BRIDGE.COLOR, tag: b ? (FREEW.st && b.docId !== FREEW.st.docId ? 'Bridged: ' : 'In the note: ') + snippet(M.blockName(b), 24) : 'A component that is gone', cls: 'have' }; }
    if (p.as === 'bridge') return { col: BRIDGE.COLOR, tag: 'Bridge from a note', cls: 'slot' };
    if (p.as === 'slot') return { col: K ? K.color : '#1E5E8C', tag: (K ? K.label : 'Result') + ' to add', cls: 'slot' };
    if (p.as === 'task') return { col: '#8A5A00', tag: 'Task' };
    if (K && S) return { col: K.color, tag: K.label + ' · ' + S.label };
    if (K) return { col: K.color, tag: K.label };
    if (S) return { col: sc(S), tag: S.label };
    return { col: '#5E6B65', tag: 'Component' };
  },
  /** The text with its coloured stretches (the page's copy behind the words, a freewrite's card, Settings' preview). */
  spans(text, conv, sel) {
    const frag = document.createDocumentFragment(); if (!conv) { frag.append(text); return frag; }
    const L = [];
    conv.parts.forEach(p => { if (p.none) return; const lk = FREEW.look(p); p.spans.forEach(s => L.push({ from: s.from, to: s.to, cls: 'fw-s' + (lk.cls ? ' ' + lk.cls : ''), k: p.key, fc: lk.col, t: lk.tag, on: !!sel && sel.t === 'p' && sel.k === p.key })); });
    conv.links.forEach(l => { if (l.none || l.off || !l.span || l.span[1] <= l.span[0]) return; const R = REL[l.rel] || { label: l.rel }; L.push({ from: l.span[0], to: l.span[1], cls: 'fw-l', lk: l.key, fc: WIRECOL[l.rel] || '#8a8f98', t: (l.back ? '← ' : '→ ') + (R.label || l.rel), on: !!sel && sel.t === 'l' && sel.k === l.key }); });
    conv.cues.forEach(c => { const p = conv.parts.find(x => x.key === c.part); if (p && !p.none) L.push({ from: c.from, to: c.to, cls: 'fw-c', k: c.part }); });
    L.sort((a, b) => a.from - b.from || b.to - a.to); let at = 0;
    for (const m of L) {
      if (m.from < at) continue; if (m.from > at) frag.append(text.slice(at, m.from));
      const el = document.createElement('span'); el.className = m.cls + (m.on ? ' on' : ''); el.textContent = text.slice(m.from, m.to); el.dataset.from = m.from; el.dataset.to = m.to;
      if (m.k) el.dataset.k = m.k; if (m.lk) el.dataset.l = m.lk; if (m.fc) el.style.setProperty('--fc', m.fc); if (m.t) el.dataset.t = m.t;
      frag.append(el); at = m.to;
    }
    if (at < text.length) frag.append(text.slice(at)); return frag;
  },

  /* ---------------- the note it will make: laid out as Tidy lays a note out ---------------- */
  size(p) { const n = String(p.text || '').length, lines = Math.max(1, Math.ceil(n / 46)); return { w: 392, h: p.as === 'slot' || p.as === 'bridge' ? 150 : 74 + 23 * lines }; },
  layout(conv) {
    const P = conv.parts.filter(p => !p.none), byKey = new Map(P.map(p => [p.key, p])); if (!P.length) return { pos: {}, w: 0, h: 0 };
    const E = conv.links.filter(l => !l.none && !l.off && byKey.has(l.a) && byKey.has(l.b));
    const N = P.map((p, i) => Object.assign({ id: p.key, b: { created: String(i).padStart(5, '0') } }, FREEW.size(p))), node = new Map(N.map(n => [n.id, n]));
    const comp = new Map(); let k = 0;
    N.forEach(n => { if (comp.has(n.id)) return; const q = [n.id]; comp.set(n.id, k); while (q.length) { const x = q.pop(); E.forEach(e => { const y = e.a === x ? e.b : e.b === x ? e.a : null; if (y && !comp.has(y)) { comp.set(y, k); q.push(y); } }); } k++; });
    const pieces = []; for (let g = 0; g < k; g++) { const G = N.filter(n => comp.get(n.id) === g);
      if (G.length === 1) { G[0].px = 0; G[0].py = 0; pieces.push({ nodes: G, w: G[0].w, h: G[0].h }); continue; }
      const sz = LAYOUT.pack(G, by => E.filter(e => by[e.a] && by[e.b]).map(e => ({ from: e.a, to: e.b, rel: e.rel }))); pieces.push({ nodes: G, w: sz.w, h: sz.h }); }
    const box = LAYOUT.square(pieces, 1.3), pos = {};
    pieces.forEach(pc => pc.nodes.forEach(n => { pos[n.id] = { x: pc.gx + n.px, y: pc.gy + n.py, w: n.w, h: n.h }; }));
    return { pos, w: box.w, h: box.h, E, node };
  },
  /** The preview: boxes and their links, scaled to `width`; a box is a button (what it is, and its words). */
  mini(conv, o = {}) {
    const L = FREEW.layout(conv), P = conv.parts.filter(p => !p.none);
    if (!P.length) return h('div.fw-mini.empty', o.empty || 'No components yet — the rules find them in your sentences (“… supports …”, “One of the barriers is …”, “We found that …”). Click words to choose.');
    const W = Math.max(160, o.width || 320), s = Math.min(.5, W / Math.max(1, L.w)), q = v => Math.round(v * s);
    const host = h('div.fw-mini', { style: { height: q(L.h) + 8 + 'px', width: Math.min(W, q(L.w) + 2) + 'px' } });
    let svg = ''; L.E.forEach(e => { const A = L.pos[e.a], B = L.pos[e.b]; if (!A || !B) return; const col = WIRECOL[e.rel] || '#8a8f98', R = REL[e.rel] || { label: e.rel };
      let x1, y1, x2, y2; if (B.y >= A.y + A.h - 1) { x1 = q(A.x + A.w / 2); y1 = q(A.y + A.h); x2 = q(B.x + B.w / 2); y2 = q(B.y); } else if (A.y >= B.y + B.h - 1) { x1 = q(A.x + A.w / 2); y1 = q(A.y); x2 = q(B.x + B.w / 2); y2 = q(B.y + B.h); } else { const lr = B.x > A.x; x1 = q(lr ? A.x + A.w : A.x); y1 = q(A.y + A.h / 2); x2 = q(lr ? B.x : B.x + B.w); y2 = q(B.y + B.h / 2); }
      const an = Math.atan2(y2 - y1, x2 - x1), ah = (d, k) => (x2 - 7 * Math.cos(an + d)).toFixed(1) + ',' + (y2 - 7 * Math.sin(an + d)).toFixed(1);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.6"/>` + ((REL[e.rel] || {}).dir === false ? '' : `<polygon points="${x2},${y2} ${ah(.45)} ${ah(-.45)}" fill="${col}"/>`) +
        `<text x="${((x1 + x2) / 2 + 4).toFixed(1)}" y="${((y1 + y2) / 2 + 3).toFixed(1)}" fill="${col}" class="fw-ml">${esc(R.label || e.rel)}</text>`; });
    host.append(h('div.fw-msvg', { html: `<svg width="${q(L.w) + 2}" height="${q(L.h) + 8}" aria-hidden="true">${svg}</svg>` }));
    P.forEach(p => { const at = L.pos[p.key]; if (!at) return; const lk = FREEW.look(p), ht = q(at.h), lines = Math.max(1, Math.floor((ht - 16) / 11));
      host.append(h('button.fw-mb' + (lk.cls ? '.' + lk.cls : '') + (o.sel && o.sel.t === 'p' && o.sel.k === p.key ? '.on' : ''), { type: 'button', 'data-k': p.key, title: lk.tag + ' — ' + snippet(p.text, 120) + (o.click ? ' · click to change' : ''), style: { left: q(at.x) + 'px', top: q(at.y) + 'px', width: q(at.w) + 'px', height: ht + 'px', '--fc': lk.col }, on: o.click ? { click: e => o.click(p, e) } : {} },
        h('span.fw-mbt', lk.tag), h('span.fw-mbx', { style: { '-webkit-line-clamp': String(lines) } }, p.as === 'slot' ? '“' + p.text + '” — ＋ add the result' : p.text))); });
    return host;
  },

  /* ---------------- the page ---------------- */
  /** Where a new freewrite goes in its note: under the component it was opened from, or the middle of the view. */
  spot(pane, d, near) {
    try { if (near && near.x != null) return { x: near.x, y: near.y + (pane && pane.boxH ? pane.boxH(near.id) : 120) + 28 }; } catch (e) { }
    try { const r = pane.paper.rect(), c = pane.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round((c.x - 224) / 14) * 14, y: Math.round((c.y - 120) / 14) * 14 }; } catch (e) { return MOVE.spot(d); }
  },
  open(d, o = {}) {
    if (typeof d === 'string') d = M.doc(d); if (!d) { toast('Open a note first'); return null; }
    const b0 = o.block ? M.block(o.block) : null;
    if (!b0 && !FREEW.on()) { toast('Freewrite is off — Settings → Features → Freewrite'); return null; }
    if (FREEW.st) { if (b0 && FREEW.st.id === b0.id) { FREEW.st.ta.focus(); return FREEW.st; } FREEW.close(true); }
    const pane = o.pane && o.pane.docId === d.id ? o.pane : (App.panes ? App.panes() : []).find(p => p.docId === d.id) || null;
    const fw = (b0 && b0.fw) || {};
    const st = FREEW.st = { docId: d.id, id: b0 ? b0.id : null, pane, at: b0 ? null : FREEW.spot(pane, d, o.near), beside: false, shown: !!fw.shown, sel: null, saved: 0 };
    const top = h('div.fw-top',
      h('span.fw-brand', { html: FREEW.ICON }, h('b', 'Freewrite'), h('span.fw-note', '· ' + snippet(d.title || 'Untitled', 48))),
      st.voice = h('div.fw-voice'),
      h('span.spacer'),
      st.cv = h('button.btn.sm.fw-convert', { type: 'button', title: 'Read the words with the freewrite rules: colours, and the note it will make (Ctrl+Enter)', on: { click: () => FREEW.show() } }, FREEW.ic('wand'), 'Convert'),
      st.ap = h('button.btn.sm.pri.fw-apply', { type: 'button', title: 'Put the components and links in the note; the freewrite folds there, kept', on: { click: () => FREEW.apply() } }, FREEW.ic('check'), 'Apply to the note'),
      st.bs = h('button.btn.sm.fw-bs', { type: 'button', on: { click: () => FREEW.beside() } }),
      h('button.btn.sm.fw-close', { type: 'button', title: 'Close — everything is saved in the note (Esc)', on: { click: () => FREEW.close() } }, FREEW.ic('x'), 'Close'));
    st.ta = h('textarea.fw-ta', { spellcheck: true, placeholder: 'Write freely, or press Speak and talk. Then Convert: your sentences become components and links.', 'aria-label': 'Freewrite', value: (b0 && b0.body && b0.body.text) || '' });
    st.back = h('div.fw-back', { 'aria-hidden': 'true' });
    st.page = h('div.fw-page', st.back, st.ta);
    st.paper = h('div.fw-paper', st.page);
    st.side = h('aside.fw-side');
    st.foot = h('div.fw-foot');
    st.hear = h('div.fw-hear', { role: 'status' });
    st.el = h('div.fw' + (st.shown ? '.shown' : ''), { role: 'dialog', 'aria-label': 'Freewrite for ' + (d.title || 'this note') }, top, h('div.fw-main', st.paper, st.side), st.hear, st.foot);
    document.body.append(st.el); document.body.classList.add('fw-open');
    const save = debounce(() => FREEW.save(), 350);
    st.ta.addEventListener('input', () => { FREEW.chipOff(); FREEW.paint(); save(); });
    st.ta.addEventListener('click', e => FREEW.clickText(e));
    st.ta.addEventListener('pointerup', () => setTimeout(() => FREEW.selChip(), 0));   // V4.34: words selected with the pointer → asked what they are
    st.ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); FREEW.show(); } });
    st.ta.addEventListener('scroll', () => { st.ta.scrollTop = 0; });
    st.key = e => { if (!FREEW.st || e.key !== 'Escape' || e.defaultPrevented) return; if ($('.pop') || $('.ovl') || $('.slash-menu')) return; if ($('.fw-chip')) { FREEW.chipOff(); return; } e.preventDefault(); FREEW.close(); };
    document.addEventListener('keydown', st.key);
    st.rs = () => FREEW.place(); addEventListener('resize', st.rs);
    FREEW.paintBeside(); FREEW.paint(); FREEW.paintVoice();
    setTimeout(() => { if (FREEW.st !== st) return; st.ta.focus(); const n = st.ta.value.length; st.ta.setSelectionRange(n, n); }, 30);
    return st;
  },
  /** The freewrite's block, made when there is something to keep (a page opened and closed empty leaves nothing). */
  ensure() {
    const st = FREEW.st; if (!st) return null; let b = st.id && M.block(st.id); if (b && b.status === 'live') return b;
    const d = M.doc(st.docId); if (!d) return null; const at = st.at || MOVE.spot(d);
    _suppress++; try { b = M.addBlock(d.id, null, { kind: 'freewrite', label: '', x: Math.round(at.x / 14) * 14, y: Math.round(at.y / 14) * 14, w: 448, auto: true, fw: { state: 'draft', shown: !!st.shown } }); } finally { _suppress--; }
    b.body = { text: st.ta ? st.ta.value : '', marks: [] }; DB.put('blocks', b); st.id = b.id; changed(); return b;
  },
  fw() { const st = FREEW.st, b = st && st.id && M.block(st.id); return (b && b.fw) || {}; },
  setFw(patch) { const b = FREEW.ensure(); if (!b) return null; const cur = M.block(b.id); cur.fw = Object.assign({}, cur.fw || {}, patch); cur.modified = isoLocal(new Date()); DB.put('blocks', cur); return cur; },
  save() {
    const st = FREEW.st; if (!st) return; const v = st.ta.value; let b = st.id && M.block(st.id);
    if (!b) { if (!v.trim()) return; b = FREEW.ensure(); if (!b) return; }
    const cur = M.block(b.id); if (cur.body && cur.body.text === v) return;
    M.saveBlockBody(cur, { text: v, marks: [] }); st.saved = Date.now(); FREEW.paintFoot();
    if (st.beside) FREEW.soon();
  },
  soon: debounce(() => { if (FREEW.st) changed(); }, 1200),
  /** The words read now (with what you changed by clicking), or null while there are no colours yet. */
  conv() {
    const st = FREEW.st; if (!st) return null; if (!st.shown && FREEW.opt('colour', 'convert') !== 'live') return null;
    const fw = FREEW.fw(); return FREEW.convert(st.ta.value, { over: fw.over, lover: fw.lover, assoc: fw.assoc, plain: FREEW.opt('plain', 'words'), docId: st.docId });
  },
  paint() {
    const st = FREEW.st; if (!st) return; const text = st.ta.value, conv = st.conv = FREEW.conv();
    st.back.replaceChildren(FREEW.spans(text, conv, st.sel), /\n$/.test(text) || !text ? '​' : '');
    st.el.classList.toggle('shown', !!conv);
    requestAnimationFrame(() => { if (FREEW.st !== st) return; st.ta.style.height = Math.max(st.back.offsetHeight + 4, Math.round(innerHeight * .55)) + 'px'; });
    FREEW.paintSide(); FREEW.paintFoot();
  },
  paintSide() {
    const st = FREEW.st; if (!st) return; const conv = st.conv;
    if (!conv) { st.side.replaceChildren(); st.ap.disabled = true; return; }
    const P = conv.parts.filter(p => !p.none), Ls = conv.links.filter(l => !l.none && !l.off);
    st.ap.disabled = !P.length;
    const w = Math.max(200, (st.side.clientWidth || 360) - 30);
    st.side.replaceChildren(h('div.fw-sh', h('b', 'The note it will make'), h('span', plural(P.length, 'component') + ' · ' + plural(Ls.length, 'link'))),
      FREEW.mini(conv, { width: w, sel: st.sel, click: (p, e) => FREEW.pick({ t: 'p', k: p.key }, e.currentTarget) }),
      h('p.fw-hint', 'Click coloured words, or a box here, to change what it becomes — its kind, its link, or nothing. Apply puts it in the note under the freewrite.'));
  },
  paintFoot() {
    const st = FREEW.st; if (!st) return; const t = st.ta.value, n = (t.match(/\S+/g) || []).length, fw = FREEW.fw();
    st.foot.replaceChildren(h('span', plural(n, 'word')), h('span', st.id ? (st.saved ? 'Saved' : 'In the note') : 'Nothing kept yet'),
      fw.state === 'applied' ? h('span', 'Applied ' + fmtStamp(fw.applied) + ' — Apply again adds only what is new') : null,
      h('span.spacer'), h('span.fw-tip', st.conv ? 'Click coloured words to change them' : 'Ctrl+Enter converts'));
  },
  /* ---------------- choosing: a click on coloured words, or a box ---------------- */
  at(c) { const st = FREEW.st, conv = st && st.conv; if (!conv) return null;
    for (const l of conv.links) if (!l.none && !l.off && l.span && c >= l.span[0] && c <= l.span[1] && l.span[1] > l.span[0]) return { t: 'l', k: l.key, from: l.span[0] };
    for (const p of conv.parts) if (!p.none) for (const s of p.spans) if (c >= s.from && c <= s.to) return { t: 'p', k: p.key, from: s.from };
    for (const q of conv.cues) if (c >= q.from && c <= q.to) return { t: 'p', k: q.part, from: q.from };
    return null; },
  clickText() {
    const st = FREEW.st; if (!st) return; const ta = st.ta; if (ta.selectionStart !== ta.selectionEnd) return; FREEW.selOff(); if (!st.conv) return;
    const hit = FREEW.at(ta.selectionStart); if (!hit) { if (st.sel) { st.sel = null; FREEW.chipOff(); FREEW.paint(); } return; }
    st.sel = { t: hit.t, k: hit.k }; FREEW.paint();
    requestAnimationFrame(() => { const sp = st.back.querySelector(`[data-from="${hit.from}"]`); if (sp) FREEW.chip(sp); });
  },
  /** A small button at the chosen words: what they became, and Change. */
  chip(sp) {
    const st = FREEW.st; FREEW.chipOff(); if (!st || !st.sel) return; const sel = st.sel, r = sp.getClientRects()[0] || sp.getBoundingClientRect(), pr = st.page.getBoundingClientRect();
    const lab = sel.t === 'l' ? 'Link ' + (sp.dataset.t || '') : (sp.dataset.t || 'Component');
    const c = h('button.fw-chip', { type: 'button', title: 'Change what these words become', style: { left: Math.max(0, Math.round(r.left - pr.left)) + 'px', top: Math.round(r.bottom - pr.top + 4) + 'px', '--fc': sp.style.getPropertyValue('--fc') || 'var(--ink-3)' },
      on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); FREEW.pick(sel, c); } } }, h('span', lab), h('b', 'Change ▾'));
    st.page.append(c);
  },
  chipOff() { $$('.fw-chip').forEach(x => x.remove()); },
  /* ---------------- V4.34 — your own associations, by highlight ---------------- */
  /** Words selected with the pointer: a small button at the end of the selection asks what they are (nothing opens by itself). */
  selChip() {
    const st = FREEW.st; if (!st) return; FREEW.selOff(); const ta = st.ta, v = ta.value; let a = ta.selectionStart, b = ta.selectionEnd;
    while (a < b && /\s/.test(v[a])) a++; while (b > a && /[\s.,;:!?]/.test(v[b - 1])) b--; if (b - a < 2 || !/\w/.test(v.slice(a, b))) return;
    const r = FREEW.rectAt(b), words = v.slice(a, b);
    st.page.append(h('button.fw-chip.fw-assoc', { type: 'button', title: 'Say what these words are: a new component or one that exists, for this freewrite or every one', style: { left: Math.max(0, Math.round(r.x - 24)) + 'px', top: Math.round(r.y + 6) + 'px', '--fc': 'var(--teal)' },
      on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); FREEW.selOff(); FREEW.associate(words, a, b); } } }, FREEW.ic('wand', 14), h('b', 'Make these words a component…')));
  },
  selOff() { $$('.fw-assoc').forEach(x => x.remove()); },
  /** Where an offset of the words is on the page (a hidden copy laid out like the words). */
  rectAt(off) { const st = FREEW.st, m = h('div.fw-back.fw-meas', st.ta.value.slice(0, off)), mk = h('span', '​'); m.append(mk); st.page.append(m); const r = mk.getBoundingClientRect(), pr = st.page.getBoundingClientRect(); m.remove(); return { x: r.left - pr.left, y: r.bottom - pr.top }; },
  /** What words can become, for the question and the rule editor: [key, label, spec]. */
  shapes() {
    const K = (typeof CKINDS !== 'undefined' ? CKINDS.all() : []).filter(k => !k.act && k.id !== 'report' && k.id !== 'iteration');
    return [['c', 'A component', { as: 'component', kind: null, struct: null }], ['t', 'A task', { as: 'task', kind: null, struct: null }], ['r', 'A Result to add', { as: 'slot', kind: 'result', struct: null }], ['b', 'A bridge from a note', { as: 'bridge', kind: null, struct: null }],
      ...K.map(k => ['k:' + k.id, k.label, { as: 'component', kind: k.id, struct: null }]), ...KINDS.filter(k => k.id !== 'reminder').map(k => ['s:' + k.id, k.label + ' (on its words)', { as: 'component', kind: null, struct: k.id }])];
  },
  /** The question: a new component (what it is) or one that exists; just this freewrite, or every freewrite (a rule). */
  associate(words, a, b) {
    const st = FREEW.st; if (!st) return; const S = FREEW.shapes(), here = st.docId; let mode = 'new', shape = 'c', blk = null, keep = 'temp';
    const opt = (k, l) => h('button.fw-opt' + (shape === k ? '.on' : ''), { type: 'button', 'data-s': k, on: { click: () => { shape = k; draw(); } } }, l);
    const seg = (opts, cur, set) => h('div.seg', opts.map(([k, l]) => h('button' + (k === cur ? '.on' : ''), { type: 'button', 'data-v': k, on: { click: () => { set(k); draw(); } } }, l)));
    const picker = optionPicker({ placeholder: 'Search components…', sort: 'fw-assoc',
      items: q => DB.where('blocks', x => x.status === 'live' && x.kind !== 'freewrite' && x.kind !== 'ink' && (x.kind === 'component' ? !!(((x.body && x.body.text) || '').trim() || x.label) : x.kind === 'ref' || !!WIDGETS[x.kind]) && (!q || (M.blockName(x) + ' ' + ((x.body && x.body.text) || '')).toLowerCase().includes(q)))
        .sort((p, r) => ((r.docId === here) - (p.docId === here)) || String(r.modified || '').localeCompare(String(p.modified || ''))),
      render: x => h('div', h('b', M.blockName(x)), ' ', h('span.serif', snippet((x.body && x.body.text) || '', 70)), h('span.s', x.docId === here ? 'This note' : M.docPath(M.doc(x.docId)))), onPick: x => { blk = x.id; draw(); } });
    const body = h('div.fw-adlg');
    const draw = () => { const b0 = blk && M.block(blk); body.replaceChildren(
      h('p.serif.fw-aw', '“' + snippet(words, 90) + '”'),
      seg([['new', 'A new component'], ['have', 'A component that exists']], mode, v => { mode = v; }),
      mode === 'new' ? h('div.fw-opts', h('div.fw-og', S.slice(0, 4).map(([k, l]) => opt(k, l))), h('div.fw-oh', 'A kind of component'), h('div.fw-og', S.filter(x => x[0].startsWith('k:')).map(([k, l]) => opt(k, l))),
          h('div.fw-oh', 'A structure on its words'), h('div.fw-og', S.filter(x => x[0].startsWith('s:')).map(([k, l]) => opt(k, l.replace(' (on its words)', '')))))
        : h('div', picker, h('div.fw-chosen', b0 ? ['Chosen: ', h('b', M.blockName(b0)), ' — ', b0.docId === here ? 'in this note' : 'in “' + snippet((M.doc(b0.docId) || {}).title || '', 40) + '” (bridged into this note on Apply)'] : 'Choose it in the list')),
      h('div.fw-akeep', h('span', 'For'), seg([['temp', 'Just this freewrite'], ['perm', 'Every freewrite — a rule in Settings']], keep, v => { keep = v; }))); };
    draw();
    modal({ title: 'What are these words?', wide: true, body, actions: [{ label: 'Cancel' }, { label: 'Associate', pri: true, run: () => {
      if (mode === 'have' && !blk) { toast('Choose the component in the list'); return false; }
      FREEW.keepAssoc(words, mode === 'have' ? { as: 'component', block: blk } : Object.assign({}, (S.find(x => x[0] === shape) || S[0])[2]), keep === 'perm', a, b); } }] });
  },
  /** Temporary: on this freewrite (fw.assoc). Permanent: a rule of yours — those words, its example the sentence they were in. */
  keepAssoc(words, A, perm, a, b) {
    const st = FREEW.st; if (!st) return; const key = FREEW.key(words);
    if (perm) { const T = FREEW.store(), v = st.ta.value, s = FREEW.sentences(v).find(x => a >= x.from && b <= x.to);
      T.own = T.own.filter(r => !(r.phrase && (r.pats || []).some(p => FREEW.key(p) === key)));
      T.own.push({ id: uid('fr'), name: '“' + snippet(words, 40) + '”', pats: [words], phrase: true, A, ex: s ? v.slice(s.from, s.to) : words, made: localDate(new Date()) }); FREEW.saveStore(T); }
    else { const L = (FREEW.fw().assoc || []).filter(x => FREEW.key(x.text) !== key); L.push(Object.assign({ text: words }, A)); FREEW.setFw({ assoc: L }); }
    const ov = Object.assign({}, FREEW.fw().over || {}); if (ov[key]) { delete ov[key]; FREEW.setFw({ over: ov }); }   // what a click had changed gives way
    if (!st.shown) { st.shown = true; FREEW.setFw({ shown: true }); }
    FREEW.paint(); toast(perm ? 'A rule now: these words, in every freewrite — Settings → Freewrite → Rules' : 'Kept for this freewrite', 3600);
  },
  /** The choices for a part (what it becomes) or a link (which relation, which way, none). */
  pick(sel, anchor) {
    const st = FREEW.st; if (!st || !st.conv) return;
    const r0 = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null, r = r0 && r0.width ? { left: r0.left, bottom: r0.bottom } : { left: innerWidth / 2 - 120, bottom: innerHeight / 3 };
    st.sel = sel; FREEW.paint();
    if (sel.t === 'l') { const l = st.conv.links.find(x => x.key === sel.k); if (!l) return; const A = st.conv.parts.find(p => p.key === l.a), B = st.conv.parts.find(p => p.key === l.b);
      const set = v => FREEW.setOver('lover', l.key, v);
      const rels = ['supports', 'contradicts', 'leads', 'causes', 'resolves', 'explains', 'produces', 'tests', 'answers', 'needs', 'reveals', 'illustrates', 'related'].filter(x => REL[x]);
      return ctxMenu(r.left, r.bottom + 6, [{ head: '“' + snippet(A ? A.text : '', 26) + '” → “' + snippet(B ? B.text : '', 26) + '”' },
        ...rels.map(x => ({ label: (l.rel === x ? '✓ ' : '') + (REL[x].label || x), sub: REL[x].verb && REL[x].verb !== REL[x].label ? REL[x].verb : null, run: () => set(Object.assign({}, FREEW.fw().lover && FREEW.fw().lover[l.key], { rel: x, none: false })) })),
        'sep', { label: 'Turn it round', sub: 'The arrow the other way', run: () => { const cur = (FREEW.fw().lover || {})[l.key] || {}; set(Object.assign({}, cur, { flip: !cur.flip })); } },
        { label: l.none ? 'Link them again' : 'No link', run: () => set(Object.assign({}, (FREEW.fw().lover || {})[l.key], { none: !l.none })) },
        l.changed ? { label: 'As the rule read it', run: () => set(null) } : null]); }
    const p = st.conv.parts.find(x => x.key === sel.k); if (!p) return;
    const set = v => FREEW.setOver('over', p.key, v), is = (a, k, s) => p.as === a && (k === undefined || (p.kind || null) === k) && (s === undefined || (p.struct || null) === s);
    const K = (typeof CKINDS !== 'undefined' ? CKINDS.all() : []).filter(k => !k.act && k.id !== 'report' && k.id !== 'iteration');
    ctxMenu(r.left, r.bottom + 6, [{ head: '“' + snippet(p.text, 44) + '” becomes…' },
      { label: (is('component', null, null) ? '✓ ' : '') + 'A component', sub: 'Plain, no kind', run: () => set({ as: 'component', kind: null, struct: null }) },
      { label: (p.as === 'task' ? '✓ ' : '') + 'A task', sub: 'A tick box in the note', run: () => set({ as: 'task', kind: null, struct: null }) },
      { label: (p.as === 'slot' ? '✓ ' : '') + 'A Result to add', sub: 'Titled with these words; ＋ adds an image, a table, a plot…', run: () => set({ as: 'slot', kind: 'result', struct: null }) },
      { label: (p.as === 'bridge' ? '✓ ' : '') + 'A bridge from a note', sub: 'Notes whose titles share these words are offered', run: () => set({ as: 'bridge', kind: null, struct: null }) },
      'sep', { head: 'A kind of component' },
      ...K.map(k => ({ label: (p.as === 'component' && p.kind === k.id ? '✓ ' : '') + k.label, run: () => set({ as: 'component', kind: k.id, struct: p.struct || null }) })),
      'sep', { head: 'A structure on its words' },
      ...KINDS.filter(k => k.id !== 'reminder').map(k => ({ label: (p.struct === k.id ? '✓ ' : '') + k.label, run: () => set({ as: p.as === 'task' || p.as === 'slot' || p.as === 'bridge' ? 'component' : p.as, kind: p.kind || null, struct: p.struct === k.id ? null : k.id }) })),
      'sep', { label: 'Plain words — not a component', danger: true, run: () => set({ none: true }) },
      p.changed ? { label: 'As the rules read it', run: () => set(null) } : null]);
    FREEW.flash(p.key);
  },
  setOver(which, key, v) { const cur = Object.assign({}, FREEW.fw()[which] || {}); if (v == null) delete cur[key]; else cur[key] = v; FREEW.setFw({ [which]: cur }); FREEW.chipOff(); FREEW.paint(); },
  /** The chosen part's box in the preview, brought into view and lit. */
  flash(key) { const st = FREEW.st; if (!st) return; const b = st.side.querySelector(`.fw-mb[data-k="${CSS.escape(key)}"]`); if (b) { b.scrollIntoView({ block: 'nearest' }); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 1200); } },
  /** Convert: the colours and the note it will make; from then on they follow every correction. */
  show() { const st = FREEW.st; if (!st) return; if (!st.ta.value.trim()) return toast('Write or speak first — then Convert reads your sentences');
    st.shown = true; FREEW.setFw({ shown: true }); FREEW.paint();
    const c = st.conv, n = c ? c.parts.filter(p => !p.none).length : 0; toast(n ? plural(n, 'component') + ' and ' + plural(c.links.filter(l => !l.none && !l.off).length, 'link') + ' found — click coloured words to change them' : 'No component found yet — click words, or write “… supports …”, “One of the barriers is …”', 3600); },
  /* ---------------- beside the note ---------------- */
  beside(v) {
    const st = FREEW.st; if (!st) return; st.beside = v == null ? !st.beside : !!v; FREEW.chipOff();
    const side = FREEW.opt('side', 'right') === 'left' ? 'left' : 'right', bd = document.body;
    bd.classList.toggle('fw-beside', st.beside); bd.classList.toggle('fw-left', st.beside && side === 'left'); bd.classList.toggle('fw-right', st.beside && side === 'right');
    st.el.classList.toggle('beside', st.beside); FREEW.paintBeside(); FREEW.place();
    if (st.beside && st.docId && !(location.hash || '').includes(st.docId)) App.go('#/doc/' + st.docId);
    requestAnimationFrame(() => { try { App.panes().forEach(p => p.paper && p.paper.apply()); } catch (e) { } dispatchEvent(new Event('resize')); FREEW.paint(); });
    if (st.beside) changed();
  },
  place() { const st = FREEW.st; if (!st) return; if (!st.beside) { st.el.style.top = ''; return; } const hd = $('#hd'); st.el.style.top = Math.round(hd ? hd.getBoundingClientRect().bottom : 0) + 'px'; },
  paintBeside() { const st = FREEW.st; if (!st) return; st.bs.replaceChildren(FREEW.ic(st.beside ? 'full' : 'side'), st.beside ? 'Full page' : 'Beside the note'); st.bs.title = st.beside ? 'The page over the whole app again' : 'Half the window: the note stays live in the other half'; },

  /* ---------------- the voice ---------------- */
  mine() { const st = FREEW.st; return !!(st && st.id && REC.active && REC.active.id === st.id); },
  srOK: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  async record() {
    const st = FREEW.st; if (!st) return; if (REC.active && !FREEW.mine()) return toast('A recording is already running — stop it first');
    if (FREEW.mine()) { if (REC.active.paused) { FREEW.stopPlay(); REC.resume(); FREEW.listen(true); } FREEW.paintVoice(); return; }
    const b = FREEW.ensure(); if (!b) return; const r = M.block(b.id).rec;
    if (r && r.state && r.state !== 'new') return toast('This freewrite has its recording — play it; a new freewrite records again');
    await REC.start(M.block(b.id)); if (FREEW.mine()) { FREEW.setFw({ voice: true }); FREEW.listen(true); }
    FREEW.paintVoice(); FREEW.tick();
  },
  pause() { if (!FREEW.mine()) return; REC.pause(); FREEW.listen(false); try { REC.active.mr.requestData(); } catch (e) { } FREEW.paintVoice(); },
  stop() { if (!FREEW.mine()) return; FREEW.listen(false); FREEW.stopPlay(); REC.stop(); setTimeout(FREEW.paintVoice, 60); FREEW.paintVoice(); },
  stopPlay() { const a = FREEW.au; if (!a) return; try { a.pause(); } catch (e) { } if (a._own) URL.revokeObjectURL(a.src); FREEW.au = null; FREEW.paintVoice(); },
  /** Play back: while recording, what was recorded so far (the recording pauses); after, the saved recording. */
  async play() {
    const st = FREEW.st; if (!st || !st.id) return; const b = M.block(st.id); if (!b) return;
    if (FREEW.au) { if (FREEW.au.paused) FREEW.au.play().catch(() => { }); else FREEW.au.pause(); return FREEW.paintVoice(); }
    let au = null;
    if (FREEW.mine()) { const a = REC.active; if (!a.paused) FREEW.pause(); try { a.mr.requestData(); } catch (e) { } await new Promise(r => setTimeout(r, 200));
      if (!a.chunks.length) return toast('Nothing recorded yet'); au = new Audio(URL.createObjectURL(new Blob(a.chunks, { type: a.mime }))); au._own = true; }
    else { au = await REC.ensure(b); if (!au) return toast('Nothing recorded yet'); }
    FREEW.au = au; ['play', 'pause', 'ended', 'timeupdate'].forEach(ev => au.addEventListener(ev, () => { if (FREEW.au === au) FREEW.paintTime(); if (ev === 'ended' || ev === 'pause') FREEW.paintVoice(); }));
    try { au.currentTime = 0; } catch (e) { } au.play().catch(() => toast('Can’t play this here')); FREEW.paintVoice(); FREEW.tick();
  },
  /** Live words: the browser's speech recognition while recording (where it has one); interim words in the line under the page. */
  listen(on) {
    if (!on) { const D = FREEW.dict; FREEW.dict = null; if (D) { D.stop = true; try { D.sr.stop(); } catch (e) { } } FREEW.heard(''); return; }
    if (FREEW.dict || !FREEW.srOK() || FREEW.opt('voice', true) === false) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let sr; try { sr = new SR(); } catch (e) { return; }
    sr.continuous = true; sr.interimResults = true; sr.lang = navigator.language || 'en-US';
    const D = FREEW.dict = { sr, stop: false };
    sr.onresult = e => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i], t = (r[0] && r[0].transcript) || ''; if (r.isFinal) FREEW.put(t); else interim += t; } FREEW.heard(interim); };
    sr.onerror = e => { if (e && /not-allowed|service-not-allowed/.test(e.error || '')) { D.stop = true; FREEW.dictOff = true; FREEW.paintVoice(); } };
    sr.onend = () => { if (FREEW.dict === D && !D.stop) { try { sr.start(); } catch (e) { } } };
    try { sr.start(); } catch (e) { }
  },
  heard(t) { const st = FREEW.st; if (!st) return; st.hear.textContent = t ? '… ' + t : ''; st.hear.classList.toggle('on', !!t); },
  /** Words heard: at the caret while you write there, else at the end — a space before. Each stretch said between pauses is a
      sentence (a capital, and a full stop when the recogniser gave none), so the rules can read what was said. */
  put(t) {
    const st = FREEW.st; if (!st) return; let w = String(t || '').trim(); if (!w) return; const ta = st.ta, v = ta.value, at = document.activeElement === ta ? ta.selectionEnd : v.length;
    const before = v.slice(0, at), after = v.slice(at); w = w[0].toUpperCase() + w.slice(1); if (!/[.!?…]$/.test(w)) w += '.';
    const ins = (before && !/\s$/.test(before) ? ' ' : '') + w + (after && !/^\s/.test(after) ? ' ' : '');
    ta.setRangeText(ins, at, at, 'end'); if (!FREEW.fw().dict) FREEW.setFw({ dict: true });
    ta.dispatchEvent(new Event('input')); if (at >= v.length) st.paper.scrollTop = st.paper.scrollHeight;
  },
  tick() { clearInterval(FREEW._t); FREEW._t = setInterval(() => { if (!FREEW.st || (!FREEW.mine() && !FREEW.au)) { clearInterval(FREEW._t); FREEW._t = null; } FREEW.paintTime(); }, 250); },
  paintTime() { const st = FREEW.st; if (!st) return; const el = st.voice.querySelector('.fw-time'); if (!el) return; const au = FREEW.au;
    el.textContent = au ? REC.mmss(au.currentTime) + (isFinite(au.duration) ? ' / ' + REC.mmss(au.duration) : '') : FREEW.mine() ? REC.mmss(REC.elapsed()) : el.textContent; },
  paintVoice() {
    const st = FREEW.st; if (!st) return; const b = st.id && M.block(st.id), r = (b && b.rec) || {}, live = FREEW.mine(), paused = live && REC.active.paused, au = FREEW.au, playing = !!au && !au.paused, fw = (b && b.fw) || {};
    const B = (k, lab, title, fn, cls = '') => h('button.btn.sm.fw-v' + cls, { type: 'button', title, on: { click: e => { e.stopPropagation(); fn(); } } }, FREEW.ic(k), lab);
    const sr = FREEW.srOK() && FREEW.opt('voice', true) !== false && !FREEW.dictOff, desk = typeof SYNC === 'undefined' || SYNC.local !== false;
    const how = sr ? 'Your words appear as you speak' : desk ? 'Your words are written by the computer when the recording stops' : 'Your words are written when the recording reaches the computer';
    const kids = [];
    if (!r.state || r.state === 'new') kids.push(B('mic', 'Speak', 'Record your voice — ' + how.toLowerCase() + '; pause and play back at any time', () => FREEW.record(), '.fw-rec'));
    else if (live) {
      kids.push(h('span.fw-live', h('span.rc-dot'), h('span.fw-time.mono', { 'data-recclock': paused ? null : st.id }, REC.mmss(REC.elapsed()))), h('canvas.fw-level', { width: 120, height: 22, 'data-reclevel': st.id }));
      kids.push(paused ? B('mic', 'Go on', 'Go on recording (the same recording)', () => FREEW.record(), '.fw-rec') : B('pause', 'Pause', 'Pause — go on later, or play back what you said', () => FREEW.pause()));
      kids.push(B(playing ? 'pause' : 'play', playing ? 'Pause playback' : 'Play', 'Play back what was recorded so far', () => FREEW.play()));
      kids.push(B('stop', 'Stop', 'Stop and save the recording with this freewrite (Close stops it too)', () => FREEW.stop(), '.fw-stop'));
    } else if (r.state === 'recording') kids.push(h('span.fw-vs', 'Recording on another device…'));
    else {
      kids.push(B(playing ? 'pause' : 'play', playing ? 'Pause' : 'Play', 'Play the recording', () => FREEW.play()), h('span.fw-time.mono', au ? REC.mmss(au.currentTime) : REC.mmss(r.dur || 0)));
      const S = { saving: 'Saving the recording…', local: 'Kept on this device until the computer is reachable', queued: fw.dict ? 'Saved' : 'Saved · waiting for the transcriber…', working: fw.dict ? 'Saved' : 'Transcribing…', done: 'Saved', error: 'Transcription failed: ' + (r.error || '') }[r.state] || '';
      if (S) kids.push(h('span.fw-vs', S));
    }
    if (!r.state || r.state === 'new' || live) kids.push(h('span.fw-vs.fw-how', how));
    st.voice.replaceChildren(...kids);
  },
  /** A transcript arrived (Whisper, Transcribe) for the freewrite open now: its words on the page. */
  sync(id) { const st = FREEW.st; if (!st || st.id !== id) return; const b = M.block(id); if (!b) return; const v = (b.body && b.body.text) || ''; if (v !== st.ta.value) { const s = st.ta.selectionStart, e = st.ta.selectionEnd; st.ta.value = v; try { st.ta.setSelectionRange(s, e); } catch (x) { } FREEW.paint(); } FREEW.paintVoice(); },

  /* ---------------- closing and applying ---------------- */
  close(quiet) {
    const st = FREEW.st; if (!st) return; FREEW.chipOff(); FREEW.listen(false); FREEW.stopPlay(); if (FREEW.mine()) REC.stop();
    FREEW.save(); clearInterval(FREEW._t); FREEW._t = null;
    document.removeEventListener('keydown', st.key); removeEventListener('resize', st.rs);
    const wasBeside = st.beside; st.el.remove(); FREEW.st = null;
    const bd = document.body; bd.classList.remove('fw-open', 'fw-beside', 'fw-left', 'fw-right');
    if (wasBeside) requestAnimationFrame(() => { try { App.panes().forEach(p => p.paper && p.paper.apply()); } catch (e) { } dispatchEvent(new Event('resize')); });
    const b = st.id && M.block(st.id);
    if (b && !(b.body.text || '').trim() && !(b.rec && b.rec.state && b.rec.state !== 'new') && !(b.fw && b.fw.made)) { EDIT.deleteBlocks([b.id], { quiet: true }); return; }
    if (b) { changed(); if (!quiet) toast('Saved in the note — Open on the freewrite’s card goes on with it', 3200); }
  },
  /** Apply: the parts as components and wires under the freewrite, which folds. One Undo. */
  apply() {
    const st = FREEW.st; if (!st) return; FREEW.save(); if (!st.shown) { st.shown = true; FREEW.setFw({ shown: true }); FREEW.paint(); }
    const conv = st.conv, P = conv ? conv.parts.filter(p => !p.none) : []; if (!P.length) return toast('No components yet — click words to choose what they become');
    const fb = FREEW.ensure(), d = M.doc(st.docId); if (!fb || !d) return;
    const fw = Object.assign({}, fb.fw || {}), made = Object.assign({}, fw.made || {}), L = FREEW.layout(conv);
    const live = id => { const x = id && M.block(id); return x && x.status === 'live' ? x : null; };
    const snap = v => Math.round(v / 14) * 14, now = isoLocal(new Date()), ids = {}, fresh = [];
    const { x: x0, y: y0 } = FREEW.room(st.pane, d, fb, L, new Set(Object.values(made)));
    DB.beginGroup('freewrite'); const at0 = DB.undoStack.length;
    P.forEach(p => {
      if (live(made[p.key])) { ids[p.key] = made[p.key]; return; }
      const at = L.pos[p.key] || { x: 0, y: 0 }, pos = { x: snap(x0 + at.x), y: snap(y0 + at.y) }, text = p.text;
      // V4.34 — words associated with a component that exists: that component in this note; from another note, a bridge of it here
      const ex = p.block && live(p.block), src = ex && (ex.kind === 'ref' && ex.refBlockId && !ex.refItemId ? live(ex.refBlockId) || ex : ex);
      if (src) {
        if (src.docId === d.id) { ids[p.key] = src.id; return; }
        const have = DB.where('blocks', x => x.docId === d.id && x.kind === 'ref' && x.status === 'live' && x.refBlockId === src.id && !x.refItemId && !x.refSpan)[0];
        if (have) { ids[p.key] = have.id; made[p.key] = have.id; return; }
        const Wd = WIDGETS[src.kind], br = M._newBlock(d, { kind: 'ref', refItemId: null, refBlockId: src.id, x: pos.x, y: pos.y, w: Wd ? (src.w || Wd.w || 392) : 392, why: 'From the freewrite' });
        br.fwFrom = fb.id; DB.put('blocks', br); ids[p.key] = br.id; made[p.key] = br.id; fresh.push(br.id); return;
      }
      let nb = null;
      if (p.as === 'task') nb = M._newBlock(d, { kind: 'task', label: '', x: pos.x, y: pos.y, w: 392, body: { text, marks: [] }, task: { due: null, allDay: false, prio: 'normal', repeat: 'none', subs: [], done: null, log: [] } });
      else if (p.as === 'slot') nb = M._newBlock(d, { kind: 'component', label: snippet(text, 80), ckind: p.kind || 'result', fwslot: 'result', x: pos.x, y: pos.y, w: 392, body: { text: '', marks: [] } });
      else if (p.as === 'bridge') nb = M._newBlock(d, { kind: 'component', label: 'Bridge from a note', fwslot: 'bridge', fwcands: (p.cands || []).slice(), x: pos.x, y: pos.y, w: 392, body: { text, marks: [] } });
      else { nb = M._newBlock(d, { kind: 'component', label: '', x: pos.x, y: pos.y, w: 392, body: { text, marks: [] } }); if (p.kind) nb.ckind = p.kind;
        if (p.struct && KIND[p.struct]) { const it = M.createItem(p.struct, text, nb); nb.body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }); nb.fwItem = it.id; } }
      nb.fwFrom = fb.id; DB.put('blocks', nb); ids[p.key] = nb.id; made[p.key] = nb.id; fresh.push(nb.id);
    });
    let nw = 0;
    conv.links.filter(l => !l.none && !l.off && ids[l.a] && ids[l.b] && ids[l.a] !== ids[l.b]).forEach(l => {
      const a = ids[l.a], b = ids[l.b]; if (DB.where('wires', w => (w.from === a && w.to === b) || (w.from === b && w.to === a)).length) return;
      DB.put('wires', { id: uid('w'), from: a, to: b, rel: l.rel, directed: (REL[l.rel] || {}).dir !== false, created: now }); nw++;
      if (l.rel === 'resolves') { const A = M.block(a), B = M.block(b), ia = A && A.fwItem && M.item(A.fwItem), ib = B && B.fwItem && M.item(B.fwItem); if (ia && ib && ia.kind === 'resolution' && ib.kind === 'barrier') { ia.resolves = ib.id; DB.put('items', ia); } }
    });
    const cur = M.block(fb.id); cur.fw = Object.assign({}, cur.fw || {}, { state: 'applied', applied: now, made, shown: true }); if (FREEW.opt('fold', true) !== false) cur.collapsed = true; DB.put('blocks', cur);
    M.touchDoc(d); IX.rebuild(); changed(); FREEW.oneStep(at0, fb.id);
    const pane = st.pane; FREEW.close(true);
    toast(fresh.length || nw ? 'In the note: ' + plural(fresh.length, 'component') + ' and ' + plural(nw, 'link') + ' — Ctrl+Z undoes it' : 'Nothing new to add — it is all in the note already', 4200);
    setTimeout(() => { try { const pn = pane && App.panes().includes(pane) ? pane : App.panes().find(p => p.docId === d.id); if (!pn || !fresh.length) return; const bs = [cur, ...fresh.map(M.block)].filter(Boolean); pn.paper.fit(pn.bboxOf(bs)); } catch (e) { } }, 160);
    return fresh;
  },

  /** Where Apply puts the note it made: under the freewrite (folded) when that is free, else beside it, else right of everything —
      so the note's own boxes are not pushed into the middle of it. */
  room(pane, d, fb, L, skip) {
    const R = M.liveBlocks(d.id).filter(b => b.id !== fb.id && b.x != null && b.kind !== 'ink' && !skip.has(b.id)).map(b => { const r = pane && pane.rectOf ? pane.rectOf(b.id) : null; return r && r.w ? r : { x: b.x, y: b.y, w: b.w || 392, h: 140 }; });
    const head = pane && pane.rectOf ? pane.rectOf('_head') : null; if (head && head.w) R.push(head);
    const fr = (pane && pane.rectOf ? pane.rectOf(fb.id) : null) || { x: fb.x || 0, y: fb.y || 0, w: fb.w || 448, h: 160 };
    const free = (x, y) => !R.some(r => x < r.x + r.w + 28 && r.x < x + L.w + 28 && y < r.y + r.h + 28 && r.y < y + L.h + 28);
    const right = R.length ? Math.max(...R.map(r => r.x + r.w), fr.x + fr.w) + 84 : fr.x + fr.w + 84;
    const tries = [{ x: fr.x, y: fr.y + 98 }, { x: fr.x + fr.w + 84, y: fr.y }, { x: right, y: fr.y }];
    return tries.find(t => free(t.x, t.y)) || tries[tries.length - 1];
  },
  /** What the note's settle moves after Apply joins Apply's own undo step (the data tree's merge, 13zzyc, reused). */
  oneStep(at, id) { try { if (typeof DTREE !== 'undefined' && DTREE.oneStep) DTREE.oneStep(at, id); } catch (e) { } },
  /* ---------------- the placeholders in the note ---------------- */
  /** ＋ on a placeholder Result: anything + Insert offers, put under it and wired to it. */
  addTo(pane, b, btn) { const at = { x: b.x || 0, y: (b.y || 0) + (pane.boxH ? pane.boxH(b.id) : 140) + 28 }; FREEW.wait = { slot: b.id, doc: b.docId, until: Date.now() + 120000 }; INSERT.menu(pane, btn, at); },
  took(nb) { const W = FREEW.wait; if (!W || !nb || nb.docId !== W.doc || nb.id === W.slot || nb.kind === 'ink' || Date.now() > W.until) return; FREEW.wait = null;
    setTimeout(() => { if (M.block(W.slot) && M.block(nb.id)) { M.wire(nb.id, W.slot, REL.illustrates ? 'illustrates' : 'related', true); toast('Added to the result'); } }, 0); },
  /** A note offered by a placeholder bridge: choose its components; each is bridged here, takes the placeholder's links, and the placeholder goes. */
  bridgeFrom(slot, docId) {
    const src = M.doc(docId), b = M.block(slot); if (!src || !b) return;
    const comps = M.liveBlocks(src.id).filter(x => (x.kind === 'component' && (((x.body && x.body.text) || '').trim() || x.label)) || (WIDGETS[x.kind] && x.kind !== 'freewrite'));
    if (!comps.length) return toast('“' + snippet(src.title, 40) + '” has no components to bridge');
    const chosen = new Set(), list = h('div.list.fw-bl', comps.map(x => { const row = h('label.li.click', h('input', { type: 'checkbox', on: { change: e => { e.target.checked ? chosen.add(x.id) : chosen.delete(x.id); } } }), h('span.t', h('b', M.blockName(x)), ' ', h('span.serif', snippet((x.body && x.body.text) || '', 90)))); return row; }));
    modal({ title: 'Bridge from “' + snippet(src.title || 'Untitled', 50) + '”', wide: true, body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'Choose the component(s) to bridge here, in place of “' + snippet(b.body.text || '', 60) + '”. Each keeps its links.'), list),
      actions: [{ label: 'Cancel' }, { label: 'Bridge them', pri: true, run: () => { if (!chosen.size) { toast('Choose at least one component'); return false; } FREEW.bridgeIn(slot, [...chosen]); } }] });
  },
  bridgeIn(slot, ids) {
    // made here directly (as M.pullInto makes a bridge), so the whole change is one Undo
    const b = M.block(slot), d = b && M.doc(b.docId); if (!b || !d) return; const W = DB.where('wires', w => w.from === slot || w.to === slot), made = [], now = isoLocal(new Date());
    DB.beginGroup('freewrite-bridge'); const at0 = DB.undoStack.length;
    ids.forEach((id, i) => { const src = M.block(id); if (!src || src.status !== 'live') return; const Wd = WIDGETS[src.kind];
      const nb = M._newBlock(d, { kind: 'ref', refItemId: null, refBlockId: id, x: Math.round(((b.x || 0) + i * 28) / 14) * 14, y: Math.round(((b.y || 0) + i * 28) / 14) * 14, w: Wd ? (src.w || Wd.w || 392) : 392, why: '' }, slot); made.push(nb);
      W.forEach(w => DB.put('wires', Object.assign({}, w, { id: uid('w'), from: w.from === slot ? nb.id : w.from, to: w.to === slot ? nb.id : w.to, created: now }))); });
    if (!made.length) return;
    W.forEach(w => DB.del('wires', w.id)); d.blockIds = d.blockIds.filter(x => x !== slot); M.touchDoc(d); DB.del('blocks', slot);
    $$(`.box[data-id="${slot}"]`).forEach(el => el.remove()); changed(); FREEW.oneStep(at0, made[0].id);
    toast(plural(made.length, 'component') + ' bridged in — Ctrl+Z undoes it');
  },
  slotBar(b, pane) {
    if (b.fwslot === 'result') return h('div.fw-slotbar.nopan', h('span', (IX.wiresOf(b.id) || []).some(w => w.rel === 'illustrates' && w.to === b.id) ? 'Add more to this result' : 'Add the result here: an image panel, a table, a plot…'),
      h('button.btn.xs', { type: 'button', title: 'Anything + Insert offers, put under this result and wired to it', on: { click: e => { e.stopPropagation(); FREEW.addTo(pane, M.block(b.id) || b, e.currentTarget); } } }, '＋ Add'));
    if (b.fwslot === 'bridge') { const C = (b.fwcands || []).map(M.doc).filter(x => x && !x.deleted);
      return h('div.fw-slotbar.nopan', h('span', C.length ? 'Bridge from a note — its title shares these words:' : 'No note’s title shares these words yet —'),
        ...C.map(x => h('button.btn.xs.fw-cand', { type: 'button', title: M.docPath(x) + ' — choose its component(s) to bridge here', on: { click: e => { e.stopPropagation(); FREEW.bridgeFrom(b.id, x.id); } } }, snippet(x.title, 36))),
        h('button.btn.xs.ghost', { type: 'button', on: { click: async e => { e.stopPropagation(); const x = await BRIDGE.pickNote('Bridge from which note?', b.docId); if (x) FREEW.bridgeFrom(b.id, x.id); } } }, 'Another note…')); }
    return null;
  },

  /* ---------------- the freewrite's card in its note ---------------- */
  card(b, d, pane, ro) {
    const fw = b.fw || {}, text = (b.body && b.body.text) || '', n = (text.match(/\S+/g) || []).length, made = Object.values(fw.made || {}).filter(id => { const x = M.block(id); return x && x.status === 'live'; }).length;
    const conv = fw.shown ? FREEW.convert(text, { over: fw.over, lover: fw.lover, assoc: fw.assoc, plain: FREEW.opt('plain', 'words'), docId: b.docId }) : null;
    const go = () => FREEW.open(M.doc(b.docId), { block: b.id, pane });
    const r = b.rec || {}, has = r.state && r.state !== 'new' && r.state !== 'recording';
    const tx = h('div.fwc-tx' + (text ? '' : '.empty'), { title: ro ? '' : 'Double-click to open it', on: { dblclick: e => { if (ro) return; e.stopPropagation(); go(); } } }, text ? FREEW.spans(text, conv) : 'Nothing written yet.');
    return h('div.fwc',
      h('div.fwc-bar.nopan', h('span.fwc-st' + (fw.state === 'applied' ? '.ok' : ''), fw.state === 'applied' ? 'Applied ' + fmtStamp(fw.applied) + (made ? ' · ' + plural(made, 'component') : '') : 'Draft'), h('span.fwc-n', plural(n, 'word')),
        has ? h('button.btn.xs.fwc-play', { type: 'button', title: 'Play the recording', on: { click: e => { e.stopPropagation(); REC.toggle(M.block(b.id)); } } }, FREEW.ic('play', 13), REC.mmss(r.dur || 0)) : null,
        h('span.spacer'), ro ? null : h('button.btn.xs.fw-open', { type: 'button', title: 'Open the page again and go on with it', on: { click: e => { e.stopPropagation(); go(); } } }, 'Open')),
      tx);
  },
  /* ---------------- V4.34 — Settings → Freewrite → Rules: add, change, delete ---------------- */
  RELS: ['supports', 'contradicts', 'leads', 'causes', 'resolves', 'explains', 'produces', 'tests', 'answers', 'needs', 'reveals', 'illustrates', 'refines', 'fuels', 'related'],
  pvRule: null,
  shapeOf(s) { s = s || {}; return s.block ? 'blk' : s.as === 'task' ? 't' : s.as === 'slot' ? 'r' : s.as === 'bridge' ? 'b' : s.kind ? 'k:' + s.kind : s.struct ? 's:' + s.struct : 'c'; },
  says(s) {
    s = s || {}; if (s.block) { const b = M.block(s.block); return b ? 'the component “' + snippet(M.blockName(b), 28) + '”' : 'a component that is gone'; }
    const K = s.kind && typeof CKINDS !== 'undefined' ? CKINDS.get(s.kind) : null, St = s.struct && KIND[s.struct];
    return s.as === 'task' ? 'a task' : s.as === 'slot' ? 'a Result to add' : s.as === 'bridge' ? 'a bridge from a note' : K && St ? 'a ' + K.label + ' with a ' + St.label.toLowerCase() : K ? 'a ' + K.label : St ? 'a ' + St.label.toLowerCase() : 'a component';
  },
  /** What a rule makes, in words: "[A] a component → supports → [B] a component". */
  makes(r) {
    const n = Math.max(0, ...(r.pats || []).map(FREEW.nSlots)); if (!n) return (r.whole ? 'The whole sentence: ' : 'Those words: ') + FREEW.says(r.A);
    if (n === 1) return '[A]: ' + FREEW.says(r.A); const L = r.link && r.link.rel ? (REL[r.link.rel] || { label: r.link.rel }).label : null;
    return '[A] ' + FREEW.says(r.A) + (L ? (r.link.from === 'B' ? ' ← ' + L + ' — ' : ' → ' + L + ' → ') : ' · ') + '[B] ' + FREEW.says(r.B);
  },
  setRule(r, patch) {
    const T = FREEW.store(), clean = o => { Object.keys(o).forEach(k => { if (o[k] === undefined) delete o[k]; }); return o; };
    if (r.builtin) { const e = clean(Object.assign({}, T.edit[r.id] || {}, patch)); if (Object.keys(e).length) T.edit[r.id] = e; else delete T.edit[r.id]; }
    else T.own = T.own.map(x => x.id === r.id ? clean(Object.assign({}, x, patch)) : x);
    FREEW.saveStore(T);
  },
  delRule(r) { const T = FREEW.store(); if (r.builtin) { if (!T.off.includes(r.id)) T.off.push(r.id); delete T.edit[r.id]; } else T.own = T.own.filter(x => x.id !== r.id); FREEW.saveStore(T); toast(r.builtin ? 'Deleted — Restore the built-in rules brings it back' : 'Your rule is deleted'); },
  /** Every rule — built in and yours — with its switch, its patterns, what it makes and its example; Edit opens it in place. */
  editor() {
    const box = h('div.fw-rules'); let open = null;
    const rp = () => { try { SettingsView.repaint(); } catch (e) { } };
    const draw = () => {
      const T = FREEW.store(), list = [...FREEW.BUILTIN.filter(r => !T.off.includes(r.id)).map(r => Object.assign({ builtin: true }, r, T.edit[r.id] || {})), ...T.own.map(r => Object.assign({ own: true }, r))];
      box.replaceChildren(
        h('div.fw-rh', h('span', plural(list.filter(r => r.builtin).length, 'built-in rule') + ' · ' + T.own.length + ' of yours'), h('span.spacer'),
          T.off.length || Object.keys(T.edit).length ? h('button.btn.xs.ghost.fw-rrestore', { type: 'button', title: 'The built-in rules as they came (yours stay)', on: { click: () => { const U = FREEW.store(); U.off = []; U.edit = {}; FREEW.saveStore(U); open = null; FREEW.pvRule = null; draw(); rp(); toast('The built-in rules are back as they came'); } } }, 'Restore the built-in rules') : null,
          h('button.btn.xs.fw-radd', { type: 'button', on: { click: () => { open = open === 'new' ? null : 'new'; draw(); } } }, '+ Add a rule')),
        open === 'new' ? FREEW.form(null, () => { open = null; draw(); }) : null,
        ...list.map(r => {
          const row = h('div.fw-rr' + (r.on === false ? '.off' : '') + (open === r.id ? '.open' : ''), { 'data-r': r.id },
            h('input', { type: 'checkbox', checked: r.on !== false, title: r.on === false ? 'Off — tick to read it again' : 'On — untick to stop reading it', 'aria-label': 'Rule on', on: { change: e => { FREEW.setRule(r, { on: e.target.checked ? undefined : false }); draw(); } } }),
            h('div.fw-rr-t', h('b', r.name || r.pats[0]), h('span.fw-rr-m', FREEW.makes(r)), h('span.fw-rr-p', r.pats.join('  ·  ')), r.ex ? h('i.fw-rr-e', r.ex) : null),
            h('span.fw-rr-k', r.builtin ? (T.edit[r.id] ? 'built in, changed' : 'built in') : 'yours'),
            h('button.btn.xs.fw-redit', { type: 'button', on: { click: () => { open = open === r.id ? null : r.id; if (!open) { FREEW.pvRule = null; rp(); } draw(); } } }, open === r.id ? 'Close' : 'Edit'),
            h('button.btn.xs.ghost.fw-rdel', { type: 'button', title: r.builtin ? 'Delete it (Restore the built-in rules brings it back)' : 'Delete your rule', on: { click: () => { FREEW.delRule(r); if (open === r.id) { open = null; FREEW.pvRule = null; rp(); } draw(); } } }, 'Delete'));
          return open === r.id ? [row, FREEW.form(r, () => { open = null; draw(); })] : row; }));
    };
    draw(); return box;
  },
  /** A rule's form: name, patterns, what [A] and [B] become, the link, the example — read live by the rule below it and in the preview. */
  form(r, done) {
    const d0 = r ? JSON.parse(JSON.stringify(r)) : { pats: ['[A] blocks [B]'], A: { struct: 'barrier' }, B: {}, link: { rel: 'contradicts', from: 'A', to: 'B' }, ex: 'Bead drift blocks the edge maps.' };
    const S = FREEW.shapes(), blkA = d0.A && d0.A.block ? d0.A.block : null, rp = () => { try { SettingsView.repaint(); } catch (e) { } };
    const opts = (L, cur) => L.map(([k, l]) => h('option', { value: k, selected: k === cur }, l));
    const sel = (cur, blk) => h('select.inp.fw-rsel', opts([...(blk ? [['blk', 'The component “' + snippet(M.blockName(M.block(blk) || { label: 'gone' }), 30) + '”']] : []), ...S.map(([k, l]) => [k, l])], cur));
    const name = h('input.inp.fw-rname', { value: d0.name || '', placeholder: 'A name (optional)' });
    const pats = h('textarea.inp.fw-rpats', { rows: 3, value: (d0.pats || []).join('\n'), placeholder: '[A] supports [B]' });
    const aSel = sel(FREEW.shapeOf(d0.A), blkA), bSel = sel(FREEW.shapeOf(d0.B));
    const rel = h('select.inp.fw-rrel', opts([['', 'No link'], ...FREEW.RELS.filter(x => REL[x]).map(x => [x, REL[x].label || x])], (d0.link && d0.link.rel) || ''));
    const dir = h('select.inp.fw-rdir', opts([['A', '[A] → [B]'], ['B', '[B] → [A]']], (d0.link && d0.link.from) || 'A'));
    const whole = h('select.inp.fw-rwhole', opts([['1', 'the whole sentence'], ['0', 'just those words']], d0.whole ? '1' : '0'));
    const ex = h('input.inp.fw-rex', { value: d0.ex || '', placeholder: 'An example sentence' });
    const test = h('div.fw-rtest'), msg = h('div.fw-rmsg', { role: 'status' });
    const rowB = h('label.f.fw-rb', h('span', '[B] becomes'), bSel), rowL = h('div.fw-rl', h('label.f', h('span', 'The link between them'), rel), h('label.f', h('span', 'Which way'), dir)), rowW = h('label.f.fw-rw', h('span', 'Without parts, the words make'), whole);
    const parse = v => v === 'blk' ? { block: blkA } : Object.assign({}, (S.find(s => s[0] === v) || S[0])[2]);
    const read = () => { const o = Object.assign({}, d0, { name: name.value.trim(), pats: pats.value.split('\n').map(x => x.trim()).filter(Boolean), A: parse(aSel.value), B: parse(bSel.value), ex: ex.value.trim() }), n = Math.max(0, ...o.pats.map(FREEW.nSlots));
      o.link = n === 2 && rel.value ? { rel: rel.value, from: dir.value, to: dir.value === 'A' ? 'B' : 'A' } : null; o.whole = n === 0 && whole.value === '1' ? true : undefined; o.phrase = n === 0 && whole.value !== '1' ? true : undefined; if (n < 2) delete o.B; delete o.builtin; delete o.own; return o; };
    const check = o => { if (!o.pats.length) return 'Write at least one pattern';
      for (const p of o.pats) { const sl = p.match(/\[[AB]\]/g) || []; if (sl.length > 2) return '“' + p + '”: two parts at most, [A] and [B]'; if (sl.length === 2 && sl[0] === sl[1]) return '“' + p + '”: the two parts are [A] and [B]'; if (sl.length === 1 && sl[0] === '[B]') return '“' + p + '”: a single part is [A]';
        if (!p.replace(/\[[AB]\]/g, '').trim()) return '“' + p + '”: it needs some words besides the parts'; if (!FREEW.compile(p, o.whole).re) return '“' + p + '” can’t be read'; }
      return new Set(o.pats.map(FREEW.nSlots)).size > 1 ? 'The patterns of one rule have the same number of parts' : ''; };
    const live = () => { const o = read(), n = Math.max(0, ...o.pats.map(FREEW.nSlots)), err = check(o); rowB.hidden = n !== 2; rowL.hidden = n !== 2; rowW.hidden = n !== 0; msg.textContent = err; FREEW.pvRule = err ? null : o;
      if (err) test.replaceChildren(); else { const c = FREEW.convert(o.ex, { rules: [Object.assign({}, o, { on: true })] }), any = c.parts.length;
        test.replaceChildren(o.ex ? h('div.fw-pvt', FREEW.spans(o.ex, c)) : h('span.fw-rnote', 'Write an example to see the rule at work'), o.ex && !any ? h('span.fw-rnote', 'This rule does not read the example yet — a pattern with parts describes the whole sentence') : null, any ? FREEW.mini(c, { width: 300 }) : null); }
      rp(); };
    [name, pats, aSel, bSel, rel, dir, whole, ex].forEach(el => { el.addEventListener('input', live); el.addEventListener('change', live); });
    const save = () => { const o = read(), err = check(o); if (err) { msg.textContent = err; return; } if (!o.name) o.name = o.pats[0]; const T = FREEW.store();
      const keep = x => { const y = {}; ['name', 'pats', 'A', 'B', 'link', 'whole', 'phrase', 'ex', 'on'].forEach(k => { if (x[k] !== undefined) y[k] = x[k]; }); return y; };
      if (r && r.builtin) T.edit[r.id] = keep(o); else if (r && r.own) T.own = T.own.map(x => x.id === r.id ? Object.assign({ id: r.id }, keep(o)) : x); else T.own.push(Object.assign({ id: uid('fr') }, keep(o)));
      FREEW.saveStore(T); FREEW.pvRule = null; toast(r ? 'Rule saved' : 'Rule added — every freewrite reads it now'); done(); rp(); };
    const f = h('div.fw-rf', h('div.fw-rg', h('label.f', h('span', 'Name'), name), h('label.f', h('span', '[A] becomes'), aSel),
        h('label.f.fw-rp', h('span', 'Patterns, one a line — [A] and [B] are the parts, the rest is matched as written; with no part, a word anywhere'), pats), rowB, rowW, rowL, h('label.f.fw-rpx', h('span', 'An example sentence'), ex)),
      msg, h('div.fw-rth', 'The example, read by this rule'), test,
      h('div.fw-rbar', h('button.btn.sm.pri.fw-rsave', { type: 'button', on: { click: save } }, r ? 'Save' : 'Add the rule'), h('button.btn.sm.fw-rcancel', { type: 'button', on: { click: () => { FREEW.pvRule = null; done(); rp(); } } }, 'Cancel')));
    setTimeout(live, 0); return f;
  },
  /* ---------------- Settings' live preview ---------------- */
  pv() {
    const R = FREEW.pvRule;   // V4.34: a rule being edited, at work on its example
    if (R && R.ex) { const c = FREEW.convert(R.ex, { rules: [Object.assign({}, R, { on: true })] });
      return [h('div.fw-pv', h('div.fw-pvbar', h('span.fw-pvic', { html: FREEW.ICON }), h('b', 'Rule'), h('span', R.name || R.pats[0])), h('div.fw-pvt', FREEW.spans(R.ex, c)), FREEW.mini(c, { width: 300, empty: 'This rule does not read its example yet.' })),
        PV.cap('The rule at work on its example — ' + FREEW.makes(R) + '.')]; }
    const plainC = FREEW.opt('plain', 'words') === 'component', live = FREEW.opt('colour', 'convert') === 'live', voice = FREEW.opt('voice', true) !== false, side = FREEW.opt('side', 'right'), fold = FREEW.opt('fold', true) !== false;
    const text = 'Stiffer gels raise traction, which supports the mechanosensing hypothesis. One of the barriers is bead drift at the edge.' + (plainC ? ' We imaged at 37 °C.' : '');
    const conv = FREEW.convert(text, { plain: plainC ? 'component' : 'words' });
    return [h('div.fw-pv', h('div.fw-pvbar', h('span.fw-pvic', { html: FREEW.ICON }), h('b', 'Freewrite'), h('span', voice ? 'Speak: words appear as you speak' : 'Speak: words written when the recording stops'), h('span.spacer'), h('span.fw-pvside', side === 'left' ? '◧ beside, left' : 'beside, right ◨')),
      h('div.fw-pvt', FREEW.spans(text, conv)), FREEW.mini(conv, { width: 300 })),
      PV.cap((live ? 'Coloured as you write. ' : 'Coloured when you press Convert, then as you correct. ') + 'Two components and a supports link; a barrier' + (plainC ? '; the plain sentence a component too' : '') + '. Apply puts them in the note' + (fold ? ' and the freewrite folds.' : '; the freewrite stays open.') + ' ' + plural(FREEW.rules().filter(r => r.on !== false).length, 'rule') + ' read the words (' + FREEW.store().own.length + ' of yours); Edit one below to see it at work here.')];
  },
};
WIDGETS.freewrite = { label: 'freewrite', w: 448, body: (b, d, pane, ro) => FREEW.card(b, d, pane, ro), menu: b => [FREEW.on() ? { label: 'Open the freewrite', sub: 'The page again, to go on with it', run: () => FREEW.open(M.doc(b.docId), { block: b.id }) } : null].filter(Boolean) };
{
  // the placeholders' buttons, on their cards
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); try { if (el && b && b.fwslot && !this.travel) { const bar = FREEW.slotBar(b, this); if (bar) { const ch = $(':scope > .chips', el); ch ? ch.before(bar) : el.append(bar); } } } catch (e) { console.warn('[freewrite] slot', e); } return el; };
  // what ＋ on a placeholder Result inserts is wired to it
  const ab = M.addBlock; M.addBlock = function () { const b = ab.apply(this, arguments); try { FREEW.took(b); } catch (e) { } return b; };
  // a transcript for a freewrite: after what was written — unless the words were written as you spoke (then only its timings)
  const ap = REC.apply; REC.apply = function (id, j) { const b = M.block(id);
    if (b && b.kind === 'freewrite' && b.fw && b.fw.dict) { REC.put(id, r => { r.state = 'done'; r.segs = (j.segs || []).map(s => ({ s: s.s, e: s.e, text: String(s.text || '').replace(/\s+/g, ' ').trim() })).filter(s => s.text); r.lang = j.lang || null; r.error = null; }); changed(); FREEW.sync(id); return; }
    const r = ap.apply(this, arguments); if (b && b.kind === 'freewrite') FREEW.sync(id); return r; };
  // ⋯ on a note: Freewrite
  const dm = DocView.docMenu; if (dm) DocView.docMenu = function (d, e) { const cm = ctxMenu, pane = this; let done = false; window.ctxMenu = function (x, y, items) { if (!done) { done = true; if (FREEW.on() && !pane.travel) { const i = items.findIndex(it => it && it.label === 'Tidy layout'); items.splice(i >= 0 ? i : items.length, 0, { label: 'Freewrite…', sub: 'A blank page for typing and your voice; it becomes components', run: () => FREEW.open(d, { pane }) }); } } return cm.apply(this, arguments); }; try { return dm.apply(this, arguments); } finally { window.ctxMenu = cm; } };
  // /freewrite
  if (typeof CMD !== 'undefined' && CMD.add) CMD.add({ slash: 'freewrite', label: 'Freewrite — a blank page for typing and your voice; it becomes components', args: [], alias: ['free-write'], group: 'Note',
    sub: 'Over the whole app, or beside the note; Convert colours what your words become, Apply puts it in the note',
    run: (A, ctx) => { if (!FREEW.on()) throw new Error('Freewrite is off in Settings'); const d = CMD.need(ctx); FREEW.open(d, { pane: ctx.pane, near: ctx.block }); return 'Freewrite'; } });
  // leaving for another note while the page is over the whole app: it goes with you no further — it is saved and closed
  window.addEventListener('hashchange', () => { const st = FREEW.st; if (st && !st.beside && !(location.hash || '').includes(st.docId)) FREEW.close(true); });
}
