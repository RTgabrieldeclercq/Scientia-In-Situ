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
   (Chrome, Edge, Safari); without it they are written when the recording stops — the desktop's Whisper (REC.watch →
   REC.apply, added after what you wrote), or Transcribe on the website (the lab's SIS_LAB.transcribe). When the words
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
   V4.47 — Gabe: "for the freewrite, convert should be reversible. Convert can also be used to see a preview of how the note will
   look."
     plain()                       Undo convert (the Convert button, once converted): no colours, no preview — every choice made by
                                   clicking stays in fw.over / fw.lover, so the next Convert brings it back. Ctrl+Enter only converts.
     ghost(on) / ghostPaint()      beside the note, the note as it will look: the components Apply would make drawn in the note
                                   itself, outlined and marked Preview, where Apply puts them (FREEW.room and the same layout), with
                                   their links; the ones already in the note are themselves. Preview in the note puts the page beside.
     takeBack(id)                  after Apply, Take back (the freewrite's card, its menu, its page): what it made leaves the note
                                   (components it made, their links; components that existed before stay), the freewrite is a draft
                                   again, open, its colours kept; asked first when some of them changed since.
   V4.53 — Gabe: "When you highlight multiple sentences and transform them into a component, their old identity is removed from
   the conversion, so that there are no repeats of the same content. When clicking on a word, or after highlighting some words
   within the same component, it allows you to make it a component title for the component it resides in or make it a
   structure."
     convert                       words you made one component (an association) that reach over other components take their
                                   words: those lose them (one left with no words goes; one cut at the edge keeps the rest), the
                                   links and cues inside go, and a sentence they cover makes no component of its own (p.assoc).
     over[key].title / .marks      a component's title (the label it gets in the note) and structures on words inside it
                                   ([{ t: words, s: structure }]): from a click on a word (the chip's Title / Structure) or a
                                   selection inside one component (the selection's chip); kept when its kind changes; Apply
                                   gives the component its label and the structures their items and marks.
   V4.54 — Gabe: "Dragging a component to another allows you to create a component link between them. The label on each
   freewrite sentence is clickable, bringing a clean popup that gives you quick modification possibilities for both kind and
   structure of the component (similar to highlight in PDFs)."
     tags() / quick(key)           the labels over the words are buttons (.fw-tags, above the text box): a click → a popup of
                                   chips, Kind and Structure (a letter picks a structure, as on a PDF), its title, its links,
                                   More ▾ (the whole menu). A link's label → the link's menu.
     grab() / linkMenu() / addLink a label, or a box in the preview, dragged onto another component (its words, label or box) →
                                   which relation → fw.links [{ a, b, rel }] (by the parts' words, like fw.over); convert adds
                                   them as links of their own (own: true, no words of their own); Apply makes them wires.
   V4.55 — Gabe: "With the option of freewrite makes each sentence its own component, have a little button in between sentences
   that indicates merging the two sentences in a single component. If two components are merged in one, each part retains their
   structure, but kind has to be one, so it raises a flag for the user to correct. Same thing for if each component had a
   component title."
     convert → seams               Sentences no rule reads: Each its own component. Between two sentences that each made one plain
                                   component: a seam (its words' ends), merged when fw.merges has { a, b } (the sentences' keys).
     merged parts (p.mem)          the first sentence's part takes the next ones' words (each a stretch of its own, mem: key); each
                                   sentence's structure becomes a structure on its words in it (p.marks); kinds: one, or a flag
                                   (p.flag.kinds) until you choose one for all its sentences; titles likewise (p.flag.titles).
     tags() seams · merge()        a small ＋ between the two (a link when merged: a click splits them); the label shows the flag;
                                   the popup: Kind for all its sentences, each sentence's structure, Keep one title, Split.
                                   Apply waits until no flag is left (it opens the popup of the first).
   V4.56 — Gabe: "you can add placeholder kinds in the freewrite via a text editor bar just for it, and shortcuts such as /kind
   or /structure, and the accompanying format of it (e.g., /result creates a placeholder empty result bubble, and within that
   bubble, you can type /html, which indicates that in this freewrite location, the user wants the result to be an HTML file.
   Any /kind or /structure creates a new component into the freewrite. Dragging it to another component ... links it to it."
     tokens(text)                  a placeholder is written in the words: ⟦Result · HTML: what it shows⟧ — its pieces (a kind, a
                                   structure, a format: FREEW.FMT), then its words. convert reads the words around it as if it
                                   were not there, and makes it a component of its own (key ph:<n>, p.ph): a kind's, a
                                   structure's, or — a Result — a Result to add (p.format: what its ＋ Add opens).
     slash*() · the bar            / with letters after a space (or inside a placeholder) → a menu: kinds, structures, formats.
                                   Outside one: a new placeholder, the caret in it. Inside: its format, kind or structure.
                                   The bar above the page (tune 'bar') offers the same: Placeholder ▾ · Structure ▾ · Format ▾.
     retoken()                     a kind or structure chosen for a placeholder (popup, Change ▾) is written back into its words.
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
    undo: 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3',
    plus: 'M12 6v12m6-6H6',
    link: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
    flag: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
    eye: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  },
  /** V4.56: what a Result placeholder will be, and what its ＋ Add opens (an Insert entry). */
  FMT: [{ id: 'html', label: 'HTML', ins: 'html', d: 'an HTML file — an exported plot, report or page' }, { id: 'image', label: 'Image', ins: 'figure', d: 'an image panel' }, { id: 'table', label: 'Table', ins: 'table', d: 'a table from Excel or CSV' },
    { id: 'plot', label: 'Plot', ins: 'plot', d: 'a plot of a table' }, { id: 'pdf', label: 'PDF', ins: 'pdf', d: 'a PDF' }, { id: 'slides', label: 'Slides', ins: 'deck', d: 'slides (PowerPoint)' }, { id: 'website', label: 'Website', ins: 'website', d: 'a web page, saved as it is' }, { id: 'equation', label: 'Equation', ins: 'equation', d: 'an equation' }],
  kindsList() { return (typeof CKINDS !== 'undefined' ? CKINDS.all() : []).filter(k => !k.act && k.id !== 'report' && k.id !== 'iteration'); },
  /** V4.56: the placeholders in the words — ⟦piece · piece: words⟧ (a kind, a structure, a format; then its words). */
  tokens(text) { const out = [], re = /⟦([^⟦⟧\n]*)⟧/g, K = FREEW.kindsList(), S = KINDS.filter(k => k.id !== 'reminder'); let m;
    while ((m = re.exec(String(text || '')))) { const inner = m[1], ci = inner.indexOf(':'), head = ci >= 0 ? inner.slice(0, ci) : inner;
      const t = { from: m.index, to: m.index + m[0].length, head, colon: ci >= 0, body: ci >= 0 ? inner.slice(ci + 1).trim() : '', kind: null, struct: null, format: null, extra: [] };
      head.split('·').map(x => x.trim()).filter(Boolean).forEach(w => { const lw = w.toLowerCase(), F = FREEW.FMT.find(f => f.label.toLowerCase() === lw || f.id === lw), Kk = K.find(k => k.label.toLowerCase() === lw || k.id === lw), Ss = S.find(k => k.label.toLowerCase() === lw || k.id === lw);
        if (F && !t.format) t.format = F.id; else if (Kk && !t.kind) t.kind = Kk.id; else if (Ss && !t.struct) t.struct = Ss.id; else t.extra.push(w); });
      out.push(t); }
    return out; },
  tokStr(o, t) { const K = o.kind && typeof CKINDS !== 'undefined' && CKINDS.get(o.kind), S = o.struct && KIND[o.struct], F = o.format && FREEW.FMT.find(f => f.id === o.format);
    const head = [K && K.label, S && S.label, F && F.label, ...((t && t.extra) || [])].filter(Boolean).join(' · ') || 'Component';
    return '⟦' + head + (!t || t.colon || t.body ? ': ' + ((t && t.body) || '') : '') + '⟧'; },
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
    { id: 'verdict', name: 'The verdict is / We conclude', pats: ['The verdict is that [A]', 'The verdict is [A]', 'Verdict: [A]', 'We conclude that [A]', 'I conclude that [A]', 'In conclusion, [A]', 'The answer is that [A]', 'The answer is [A]'], A: { kind: 'verdict' }, ex: 'The verdict is that the 30 kPa gels hold their shape.' },   // V4.37 — Gabe's example: a verdict you go on describing
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
    text = String(text || ''); const orig = text, TK = FREEW.tokens(text); if (TK.length) TK.forEach(t => { text = text.slice(0, t.from) + ' '.repeat(t.to - t.from) + text.slice(t.to); });   // V4.56: the words around a placeholder are read as if it were not there
    const G = FREEW.groups(o.rules || FREEW.rules()), parts = [], byKey = new Map(), links = [], lk = new Map(), cues = [];
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
    // V4.37 — every sentence read, and whether it made one component and no link (what the sentences after it may go on describing)
    const recs = [], joins = [], mode = o.plain || 'run';
    FREEW.sentences(text).forEach(s => { const n0 = parts.length, l0 = links.length, got = read(s.from, s.to, null, 0, null); recs.push({ s, got, single: !!got && links.length === l0 && parts.length - n0 <= 1 }); });
    // V4.34 — your associations: this freewrite's (o.assoc) and your phrase rules (every freewrite). Each place the words are written
    // becomes their part where nothing claimed them; where a rule found exactly those words, they become what you said; out of a
    // whole sentence a word rule (or "every sentence a component") coloured, they are taken as their own; inside a part a two- or
    // one-part rule found, they stay part of it.
    const wordIds = new Set(G.word.map(r => r.id));
    const force = (p, A) => { if (!A) return; if (A.block) { p.block = A.block; p.as = 'component'; } if (A.as) p.as = A.as; if ('kind' in A) p.kind = A.kind || null; if ('struct' in A) p.struct = A.struct || null; if (p.as === 'bridge' && !p.cands) p.cands = FREEW.cands(p.text, o.docId); };
    const PH = [...(o.assoc || []).filter(x => x && x.text).map(x => ({ pat: x.text, A: x, id: 'assoc' })), ...G.phrase.flatMap(r => (r.pats || []).map(pat => ({ pat, A: r.A || {}, id: r.id })))];
    PH.forEach(ph => { const c = FREEW.compile(ph.pat, false); if (!c.re || c.slots.length) return; c.re.lastIndex = 0; let m, guard = 0;
      while ((m = c.re.exec(text)) && guard++ < 500) {
        if (!m[0].length) { c.re.lastIndex++; continue; } const a = m.index, b = a + m[0].length, k = FREEW.key(m[0]); let host = null, hs = null; const reach = [];
        parts.forEach(p => p.spans.forEach(s => { if (a >= s.from && b <= s.to) { host = p; hs = s; } else if (a < s.to && b > s.from) reach.push([p, s]); }));
        if (reach.length) {   // V4.53: the words reach over other components — they take those words, so nothing is said twice
          reach.forEach(([p, s2]) => { if (s2.from >= a && s2.to <= b) p.spans = p.spans.filter(x => x !== s2); else { if (s2.from < a) s2.to = a; else s2.from = b; [s2.from, s2.to] = trim(s2.from, s2.to); if (s2.to <= s2.from) p.spans = p.spans.filter(x => x !== s2); else if (p.spans.length === 1) p.text = text.slice(s2.from, s2.to); }
            if (!p.spans.length && parts.includes(p)) { parts.splice(parts.indexOf(p), 1); byKey.delete(p.key); } });
          for (let i = links.length - 1; i >= 0; i--) { const l = links[i]; if (l.span && l.span[0] >= a && l.span[1] <= b) { lk.delete(l.key); links.splice(i, 1); } }
          for (let i = cues.length - 1; i >= 0; i--) if (cues[i].from >= a && cues[i].to <= b) cues.splice(i, 1);
          const p = part(a, b, {}, ph.id); if (p) { force(p, ph.A); p.assoc = true; } continue; }
        if (links.some(l => l.span && a < l.span[1] && b > l.span[0]) || cues.some(q => a < q.to && b > q.from)) continue;
        if (host && host.key === k) { force(host, ph.A); continue; }
        if (host && host.rule && !wordIds.has(host.rule)) continue;
        if (host) { host.spans = host.spans.filter(s => s !== hs); if (!host.spans.length) { parts.splice(parts.indexOf(host), 1); byKey.delete(host.key); } }
        const p = part(a, b, {}, ph.id); if (p) { force(p, ph.A); p.assoc = true; } } });
    // V4.37 (Gabe: "a string of sentences not recognized are their own text component in between the links. For example, describing a
    // verdict in a sentence and you keep describing in more sentences with no trigger of other components, it remains in that verdict.
    // Manual editing can override that."): in order, a sentence no rule read (and none of your associations claimed) stays in the
    // component the sentence before it made, when that sentence made one and no link; otherwise it starts a text component of its own,
    // which the next unread sentences join. Its own words key a click's change (o.over): its own component, a kind, plain words.
    if (mode === 'run') { let host = null; recs.forEach(r => {
      { const [a0, b0] = trim(r.s.from, r.s.to), cover = parts.find(p => p.assoc && p.spans.some(x => x.from <= a0 && x.to >= b0)); if (cover) { host = cover; return; } }   // V4.53: a sentence your component covers is in it
      if (r.got) { host = r.single && byKey.get(r.got.key) === r.got ? r.got : null; return; }
      const [a, b] = trim(r.s.from, r.s.to); if (b <= a) return;
      const inside = parts.filter(p => p.spans.some(x => x.from >= a && x.to <= b)); if (inside.length) { host = inside.length === 1 ? inside[0] : null; return; }   // your association claimed words in it
      const t = text.slice(a, b), k = FREEW.key(t); if (!k) return; const v = (o.over || {})[k];
      if (v && v.none) return;   // plain words, by a click; the next sentences still go on with the component before
      if (host && !v) { joins.push({ key: k, host: host.key, from: a, to: b, text: t }); return; }
      const p = part(a, b, {}, null); if (!p) return; p.run = true; if (host) p.split = host.key; host = p;
    }); }
    TK.forEach((t, i) => { const key = 'ph:' + i, q = { id: 'p' + parts.length, key, text: t.body, spans: [{ from: t.from, to: t.to }], as: t.kind === 'result' ? 'slot' : 'component', kind: t.kind, struct: t.struct, block: null, rule: null, ph: t, format: t.format || null };   // V4.56: each placeholder a component
      parts.push(q); byKey.set(key, q); });
    // what was changed by clicking: by the part's words, so a correction elsewhere keeps it
    const over = o.over || {}, lover = o.lover || {};
    parts.forEach(p => { const v = over[p.key]; if (!v) return; if (v.none) p.none = true; else { if (v.as) p.as = v.as; if ('kind' in v) p.kind = v.kind || null; if ('struct' in v) p.struct = v.struct || null; if (v.as === 'bridge' && !p.cands) p.cands = FREEW.cands(p.text, o.docId);
      if (v.title) p.title = v.title; if (Array.isArray(v.marks) && v.marks.length) p.marks = v.marks.slice(); }   // V4.53: its title, structures on words in it
      if (v.as || 'kind' in v || 'struct' in v || v.none) p.changed = true; });
    (o.links || []).forEach(u => { if (!u || !u.a || !u.b || u.a === u.b || !u.rel || lk.has(u.a + '>' + u.b) || lk.has(u.b + '>' + u.a)) return;   // V4.54: links you drew
      const l = { id: 'l' + links.length, key: u.a + '>' + u.b, a: u.a, b: u.b, rel: u.rel, back: false, span: null, own: true }; links.push(l); lk.set(l.key, l); });
    links.forEach(l => { const v = lover[l.key]; if (v) { if (v.none) l.none = true; if (v.rel) l.rel = v.rel; if (v.flip) { const t = l.a; l.a = l.b; l.b = t; l.back = !l.back; } l.changed = true; }
      const A = byKey.get(l.a), B = byKey.get(l.b); if (!A || !B || A.none || B.none) l.off = true; });
    // V4.37 — the sentences that stay in the component before them: its words grow; each stretch keeps its own words (a click can take it out)
    joins.forEach(j => { const H = byKey.get(j.host); if (!H || H.none) return; H.text = H.text.replace(/\s+$/, '') + (/[.!?;:]$/.test(H.text.trim()) ? ' ' : '. ') + j.text; H.spans.push({ from: j.from, to: j.to, own: j.key }); H.joined = (H.joined || 0) + 1; });   // each sentence keeps its full stop
    parts.forEach(p => { if (p.marks) { const T = p.text.toLowerCase(); p.marks = p.marks.filter(m => m && m.t && m.s && KIND[m.s] && T.includes(String(m.t).toLowerCase())); if (!p.marks.length) delete p.marks; } });
    // V4.55 — each sentence its own component: the seams between two that made one plain component each; merged ones become one
    const seams = [];
    if (mode === 'component') { const M2 = (o.merges || []).filter(m => m && m.a && m.b), isM = (a, b) => M2.some(m => m.a === a && m.b === b);
      const one = r => { const q = r.got; return r.single && q && byKey.get(q.key) === q && !q.none && q.as === 'component' && !q.block && !q.assoc && q.spans.length === 1 ? q : null; };
      const join = (H, q) => { if (!H.mem) { H.mem = [{ key: H.key, text: H.text, kind: H.kind, struct: H.struct, title: H.title || null }]; H.marks = (H.marks || []).slice(); if (H.struct) H.marks.push({ t: H.text, s: H.struct }); H.struct = null; }
        H.mem.push({ key: q.key, text: q.text, kind: q.kind, struct: q.struct, title: q.title || null }); if (q.struct) H.marks.push({ t: q.text, s: q.struct }); (q.marks || []).forEach(m => H.marks.push(m));
        H.text = H.text.replace(/\s+$/, '') + (/[.!?;:]$/.test(H.text.trim()) ? ' ' : '. ') + q.text; H.spans.push({ from: q.spans[0].from, to: q.spans[0].to, mem: q.key });
        parts.splice(parts.indexOf(q), 1); byKey.delete(q.key); links.forEach(l => { if (l.a === q.key) l.a = H.key; if (l.b === q.key) l.b = H.key; if (l.a === l.b) l.off = true; }); };
      let prev = null, host = null;
      recs.forEach(r => { const q = one(r); if (!q) { prev = host = null; return; }
        if (prev) { const on = isM(prev.key, q.key); seams.push({ a: prev.key, b: q.key, from: prev.spans[0].to, to: q.spans[0].from, on }); if (on) { host = host || prev; join(host, q); } else host = null; }
        prev = q; });
      parts.forEach(H => { if (!H.mem) return; const ks = [...new Set(H.mem.map(m => m.kind).filter(Boolean))], ts = [...new Set(H.mem.map(m => m.title).filter(Boolean))];
        H.kind = ks[0] || null; H.title = ts[0] || null; if (!H.marks.length) delete H.marks; const f = {}; if (ks.length > 1) f.kinds = ks; if (ts.length > 1) f.titles = ts; if (f.kinds || f.titles) H.flag = f; }); }
    return { parts, links, cues, text: orig, joins, seams };
  },
  /** What a part looks like: its colour and, in words, what it became. */
  look(p) {
    const K = p.kind && typeof CKINDS !== 'undefined' ? CKINDS.get(p.kind) : null, S = p.struct ? KIND[p.struct] : null, sc = s => ((settings().kinds || {})[s.id] || s).color;
    if (p.block) { const b = M.block(p.block); return { col: BRIDGE.COLOR, tag: b ? (FREEW.st && b.docId !== FREEW.st.docId ? 'Bridged: ' : 'In the note: ') + snippet(M.blockName(b), 24) : 'A component that is gone', cls: 'have' }; }
    if (p.as === 'bridge') return { col: BRIDGE.COLOR, tag: 'Bridge from a note', cls: 'slot' };
    if (p.as === 'slot') { const F = p.format && FREEW.FMT.find(f => f.id === p.format); return { col: K ? K.color : '#1E5E8C', tag: (K ? K.label : 'Result') + ' to add' + (F ? ' · ' + F.label : ''), cls: 'slot' }; }
    if (p.ph && !p.text) { const o = FREEW.look(Object.assign({}, p, { ph: null })); return Object.assign(o, { tag: o.tag + ' to write', cls: 'slot' }); }
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
    // V4.53: a part's title and its structures on words are drawn inside its stretch (one stretch, one outline, its label with the title)
    conv.parts.forEach(p => { if (p.none) return; const lk = FREEW.look(p), tag = lk.tag + (p.title ? ' · “' + snippet(p.title, 22) + '”' : ''), on = !!sel && sel.t === 'p' && sel.k === p.key;
      p.spans.forEach(s => {
        const kids = [], low = text.slice(s.from, s.to).toLowerCase(), add = (t, cls, extra) => { const i = t ? low.indexOf(String(t).toLowerCase()) : -1; if (i < 0) return; const f = s.from + i, e = f + String(t).length; if (kids.some(x => f < x.to && e > x.from)) return; kids.push(Object.assign({ from: f, to: e, cls }, extra)); };
        if (p.ph) { const t = p.ph, hEnd = t.from + 1 + t.head.length + (t.colon ? 1 : 0); kids.push({ from: t.from, to: Math.min(hEnd, t.to), cls: 'fw-phh' }, { from: t.to - 1, to: t.to, cls: 'fw-phh' }); }   // V4.56
        if (p.title) add(p.title, 'fw-tt', {});
        (p.marks || []).forEach(m => { const K = KIND[m.s]; if (K) add(m.t, 'fw-mk', { mc: ((settings().kinds || {})[m.s] || K).color, m: K.label }); });
        kids.sort((x, y) => x.from - y.from);
        L.push({ from: s.from, to: s.to, cls: 'fw-s' + (lk.cls ? ' ' + lk.cls : '') + (s.mem ? ' fw-mem' : ''), k: p.key, fc: lk.col, t: s.mem ? '' : tag, on, kids, fl: !s.mem && p.flag ? FREEW.flagText(p) : '' }); }); });
    conv.links.forEach(l => { if (l.none || l.off || !l.span || l.span[1] <= l.span[0]) return; const R = REL[l.rel] || { label: l.rel }; L.push({ from: l.span[0], to: l.span[1], cls: 'fw-l', lk: l.key, fc: WIRECOL[l.rel] || '#8a8f98', t: (l.back ? '← ' : '→ ') + (R.label || l.rel), on: !!sel && sel.t === 'l' && sel.k === l.key }); });
    conv.cues.forEach(c => { const p = conv.parts.find(x => x.key === c.part); if (p && !p.none) L.push({ from: c.from, to: c.to, cls: 'fw-c', k: c.part }); });
    L.sort((a, b) => a.from - b.from || b.to - a.to); let at = 0;
    for (const m of L) {
      if (m.from < at) continue; if (m.from > at) frag.append(text.slice(at, m.from));
      const el = document.createElement('span'); el.className = m.cls + (m.on ? ' on' : ''); el.dataset.from = m.from; el.dataset.to = m.to;
      if (m.kids && m.kids.length) { let i = m.from; m.kids.forEach(x => { if (x.from > i) el.append(text.slice(i, x.from)); const c = document.createElement('span'); c.className = x.cls; c.textContent = text.slice(x.from, x.to); if (x.mc) c.style.setProperty('--mc', x.mc); if (x.m) c.dataset.m = x.m; el.append(c); i = x.to; }); if (i < m.to) el.append(text.slice(i, m.to)); }
      else el.textContent = text.slice(m.from, m.to);
      if (m.k) el.dataset.k = m.k; if (m.fl) el.dataset.flag = m.fl; if (m.lk) el.dataset.l = m.lk; if (m.fc) el.style.setProperty('--fc', m.fc); if (m.t) el.dataset.t = m.t;
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
      const ca = { x: A.x + A.w / 2, y: A.y + A.h / 2 }, cb = { x: B.x + B.w / 2, y: B.y + B.h / 2 }, under = Object.keys(L.pos).some(k => { if (k === e.a || k === e.b) return false; const Q = L.pos[k]; for (let t = .1; t < .95; t += .1) { const x = ca.x + (cb.x - ca.x) * t, y = ca.y + (cb.y - ca.y) * t; if (x > Q.x && x < Q.x + Q.w && y > Q.y && y < Q.y + Q.h) return true; } return false; });
      if (under) {   // V4.54: a line that would run under another box goes round it, on the right
        const X = q(Math.max(A.x + A.w, B.x + B.w)) + 24, x1 = q(A.x + A.w), y1 = q(A.y + A.h / 2), x2 = q(B.x + B.w), y2 = q(B.y + B.h / 2), ah = d => (x2 + 7 * Math.cos(d)).toFixed(1) + ',' + (y2 + 7 * Math.sin(d)).toFixed(1);
        svg += `<path d="M${x1},${y1} C${X},${y1} ${X},${y2} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="1.6" class="fw-mround"/>` + ((REL[e.rel] || {}).dir === false ? '' : `<polygon points="${x2},${y2} ${ah(-.45)} ${ah(.45)}" fill="${col}"/>`) +
          `<text x="${X - 2}" y="${((y1 + y2) / 2 + 3).toFixed(1)}" fill="${col}" class="fw-ml">${esc(R.label || e.rel)}</text>`; return; }
      let x1, y1, x2, y2; if (B.y >= A.y + A.h - 1) { x1 = q(A.x + A.w / 2); y1 = q(A.y + A.h); x2 = q(B.x + B.w / 2); y2 = q(B.y); } else if (A.y >= B.y + B.h - 1) { x1 = q(A.x + A.w / 2); y1 = q(A.y); x2 = q(B.x + B.w / 2); y2 = q(B.y + B.h); } else { const lr = B.x > A.x; x1 = q(lr ? A.x + A.w : A.x); y1 = q(A.y + A.h / 2); x2 = q(lr ? B.x : B.x + B.w); y2 = q(B.y + B.h / 2); }
      const an = Math.atan2(y2 - y1, x2 - x1), ah = (d, k) => (x2 - 7 * Math.cos(an + d)).toFixed(1) + ',' + (y2 - 7 * Math.sin(an + d)).toFixed(1);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.6"/>` + ((REL[e.rel] || {}).dir === false ? '' : `<polygon points="${x2},${y2} ${ah(.45)} ${ah(-.45)}" fill="${col}"/>`) +
        `<text x="${((x1 + x2) / 2 + 4).toFixed(1)}" y="${((y1 + y2) / 2 + 3).toFixed(1)}" fill="${col}" class="fw-ml">${esc(R.label || e.rel)}</text>`; });
    host.append(h('div.fw-msvg', { html: `<svg width="${q(L.w) + 2}" height="${q(L.h) + 8}" aria-hidden="true">${svg}</svg>` }));
    P.forEach(p => { const at = L.pos[p.key]; if (!at) return; const lk = FREEW.look(p), ht = q(at.h), lines = Math.max(1, Math.floor((ht - 16 - (p.title ? 18 : 0)) / 11));   // V4.53: a title takes a line and a half
      host.append(h('button.fw-mb' + (lk.cls ? '.' + lk.cls : '') + (p.flag ? '.flag' : '') + (o.sel && o.sel.t === 'p' && o.sel.k === p.key ? '.on' : ''), { type: 'button', 'data-k': p.key, title: lk.tag + ' — ' + snippet(p.text, 120) + (o.click ? ' · click to change' : ''), style: { left: q(at.x) + 'px', top: q(at.y) + 'px', width: q(at.w) + 'px', height: ht + 'px', '--fc': lk.col }, on: o.click ? Object.assign({ click: e => o.click(p, e) }, o.grab ? { pointerdown: e => o.grab(e, p) } : {}) : {} },
        h('span.fw-mbt', p.flag ? [FREEW.ic('flag', 9), ' '] : null, lk.tag + (p.flag ? ' · ' + FREEW.flagText(p) : '')), p.title ? h('b.fw-mbh', p.title) : null, h('span.fw-mbx', { style: { '-webkit-line-clamp': String(lines) } }, p.as === 'slot' ? (p.text ? '“' + p.text + '” — ' : '') + '＋ add the result' + (p.format ? ' (' + ((FREEW.FMT.find(f => f.id === p.format) || {}).d || p.format) + ')' : '') : p.text || '(to write)'))); });
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
    const st = FREEW.st = { docId: d.id, id: b0 ? b0.id : null, pane, at: b0 ? null : FREEW.spot(pane, d, o.near), beside: false, shown: !!fw.shown, sel: null, saved: 0, ghost: true };
    const top = h('div.fw-top',
      h('span.fw-brand', { html: FREEW.ICON }, h('b', 'Freewrite'), h('span.fw-note', '· ' + snippet(d.title || 'Untitled', 48))),
      st.voice = h('div.fw-voice'),
      h('span.spacer'),
      st.cv = h('button.btn.sm.fw-convert', { type: 'button', title: 'Read the words with the freewrite rules: colours, and the note it will make (Ctrl+Enter)', on: { click: () => FREEW.show() } }, FREEW.ic('wand'), 'Convert'),
      st.tb = h('button.btn.sm.fw-tb', { type: 'button', hidden: true, title: 'Take what Apply put in the note out of it again — the freewrite is a draft again (Ctrl+Z undoes this too)', on: { click: () => { if (FREEW.st && FREEW.st.id) FREEW.takeBack(FREEW.st.id); } } }, FREEW.ic('undo'), 'Take back'),   // V4.47
      st.ap = h('button.btn.sm.pri.fw-apply', { type: 'button', title: 'Put the components and links in the note; the freewrite folds there, kept', on: { click: () => FREEW.apply() } }, FREEW.ic('check'), 'Apply to the note'),
      st.bs = h('button.btn.sm.fw-bs', { type: 'button', on: { click: () => FREEW.beside() } }),
      h('button.btn.sm.fw-close', { type: 'button', title: 'Close — everything is saved in the note (Esc)', on: { click: () => FREEW.close() } }, FREEW.ic('x'), 'Close'));
    st.ta = h('textarea.fw-ta', { spellcheck: true, placeholder: 'Write freely, or press Speak and talk. Type / for a placeholder (/result, /barrier…). Then Convert: your sentences become components and links.', 'aria-label': 'Freewrite', value: (b0 && b0.body && b0.body.text) || '' });
    st.back = h('div.fw-back', { 'aria-hidden': 'true' });
    st.page = h('div.fw-page', st.back, st.ta);
    st.bar = FREEW.opt('bar', true) !== false ? FREEW.barEl() : null;   // V4.56: a bar of its own
    st.paper = h('div.fw-paper', st.bar, st.page);
    st.side = h('aside.fw-side');
    st.foot = h('div.fw-foot');
    st.hear = h('div.fw-hear', { role: 'status' });
    st.el = h('div.fw' + (st.shown ? '.shown' : ''), { role: 'dialog', 'aria-label': 'Freewrite for ' + (d.title || 'this note') }, top, h('div.fw-main', st.paper, st.side), st.hear, st.foot);
    document.body.append(st.el); document.body.classList.add('fw-open');
    const save = debounce(() => FREEW.save(), 350);
    st.ta.addEventListener('keydown', e => FREEW.slashKey(e));   // V4.56: first, so the menu has the arrows, Enter and Esc
    st.ta.addEventListener('input', () => { FREEW.chipOff(); FREEW.paint(); save(); FREEW.slashCheck(); });
    st.ta.addEventListener('blur', () => setTimeout(() => { if (FREEW.st === st && document.activeElement !== st.ta) FREEW.slashOff(); }, 120));
    st.ta.addEventListener('click', e => FREEW.clickText(e));
    st.ta.addEventListener('pointerup', () => setTimeout(() => FREEW.selChip(), 0));   // V4.34: words selected with the pointer → asked what they are
    st.ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); FREEW.show(true); } });   // V4.47: Ctrl+Enter only converts (the button goes back and forth)
    st.ta.addEventListener('scroll', () => { st.ta.scrollTop = 0; });
    st.key = e => { if (!FREEW.st || e.key !== 'Escape' || e.defaultPrevented) return; if ($('.pop') || $('.ovl') || $('.slash-menu')) return; if ($('.fw-chip')) { FREEW.chipOff(); return; } e.preventDefault(); FREEW.close(); };
    document.addEventListener('keydown', st.key);
    st.rs = () => { FREEW.place(); FREEW.tags(); }; addEventListener('resize', st.rs);
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => FREEW.tags()); st.ro.observe(st.page); }   // V4.54: the labels follow the words
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
    const fw = FREEW.fw(); return FREEW.convert(st.ta.value, { over: fw.over, lover: fw.lover, links: fw.links, merges: fw.merges, assoc: fw.assoc, plain: FREEW.opt('plain', 'run'), docId: st.docId });
  },
  paint() {
    const st = FREEW.st; if (!st) return; const text = st.ta.value, conv = st.conv = FREEW.conv();
    st.back.replaceChildren(FREEW.spans(text, conv, st.sel), /\n$/.test(text) || !text ? '​' : '');
    st.el.classList.toggle('shown', !!conv);
    const back = !!(st.shown && FREEW.opt('colour', 'convert') !== 'live');   // V4.47: Convert, then Undo convert
    if (st.cv._b !== back) { st.cv._b = back; st.cv.replaceChildren(FREEW.ic(back ? 'undo' : 'wand'), back ? 'Undo convert' : 'Convert'); st.cv.classList.toggle('on', back);
      st.cv.title = back ? 'Undo Convert — back to plain words: the colours and the preview go; what you chose is kept for the next Convert' : 'Read the words with the freewrite rules: colours, and the note it will make (Ctrl+Enter)'; }
    if (st.tb) st.tb.hidden = FREEW.fw().state !== 'applied';
    cancelAnimationFrame(st._gr); st._gr = requestAnimationFrame(() => { if (FREEW.st === st) FREEW.ghostPaint(); });
    requestAnimationFrame(() => { if (FREEW.st !== st) return; st.ta.style.height = Math.max(st.back.offsetHeight + 4, Math.round(innerHeight * .55)) + 'px'; FREEW.tags(); });
    FREEW.paintSide(); FREEW.paintFoot();
  },
  paintSide() {
    const st = FREEW.st; if (!st) return; const conv = st.conv;
    if (!conv) { st.side.replaceChildren(); st.ap.disabled = true; return; }
    const P = conv.parts.filter(p => !p.none), Ls = conv.links.filter(l => !l.none && !l.off), F = P.filter(p => p.flag);
    st.ap.disabled = !P.length;
    const w = Math.max(200, (st.side.clientWidth || 360) - 30);
    const gon = st.beside && st.ghost !== false;   // V4.47: the preview in the note itself
    st.side.replaceChildren(h('div.fw-sh', h('b', 'The note it will make'), h('span', plural(P.length, 'component') + ' · ' + plural(Ls.length, 'link')), h('span.spacer'),
        h('button.btn.xs.fw-gbtn' + (gon ? '.on' : ''), { type: 'button', 'aria-pressed': String(gon), title: gon ? 'Hide the preview in the note' : 'See the note as it will look — its new components drawn in it, outlined, where Apply puts them (the page goes beside the note)', on: { click: () => FREEW.ghost(!gon) } }, FREEW.ic('eye', 14), gon ? 'Hide in the note' : 'Preview in the note')),
      F.length ? h('p.fw-flagline', FREEW.ic('flag', 13), h('span', plural(F.length, 'merged component') + ' to correct before Apply — ' + F.map(p => FREEW.flagText(p)).join(', ') + '. Click its label.')) : null,
      FREEW.mini(conv, { width: w, sel: st.sel, click: (p, e) => { if (!FREEW.dragged()) FREEW.pick({ t: 'p', k: p.key }, e.currentTarget); }, grab: (e, p) => FREEW.grab(e, p.key) }),
      h('p.fw-hint', 'Click coloured words, a label or a box here to change what it becomes — its kind, its structure, or nothing; drag a label or a box onto another to link them. ' + (gon ? 'The outlined boxes in the note show where Apply puts them.' : 'Apply puts it in the note under the freewrite.') + ' Undo convert takes the colours off; what you chose is kept.'));
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
    for (const p of conv.parts) if (!p.none) for (const s of p.spans) if (c >= s.from && c <= s.to) return { t: 'p', k: s.own || p.key, from: s.from };   // V4.37: a sentence that stays in it, by its own words
    for (const q of conv.cues) if (c >= q.from && c <= q.to) return { t: 'p', k: q.part, from: q.from };
    return null; },
  clickText(e) {
    const st = FREEW.st; if (!st) return; const ta = st.ta; if (ta.selectionStart !== ta.selectionEnd) { if (e !== 'again') setTimeout(() => FREEW.clickText('again'), 0); return; } FREEW.selOff(); if (!st.conv) return;   // V4.53: a click inside selected words collapses them only after it
    const hit = FREEW.at(ta.selectionStart); if (!hit) { if (st.sel) { st.sel = null; FREEW.chipOff(); FREEW.paint(); } return; }
    st.sel = { t: hit.t, k: hit.k, word: hit.t === 'p' ? FREEW.wordAt(ta.value, ta.selectionStart) : null }; FREEW.paint();
    requestAnimationFrame(() => { const sp = st.back.querySelector(`[data-from="${hit.from}"]`); if (sp) FREEW.chip(sp); });
  },
  /** A small button at the chosen words: what they became, and Change. */
  chip(sp) {
    const st = FREEW.st; FREEW.chipOff(); if (!st || !st.sel) return; const sel = st.sel, r = sp.getClientRects()[0] || sp.getBoundingClientRect(), pr = st.page.getBoundingClientRect();
    const lab = sel.t === 'l' ? 'Link ' + (sp.dataset.t || '') : (sp.dataset.t || 'Component');
    const c = h('button.fw-chip', { type: 'button', title: 'Change what these words become', style: { left: Math.max(0, Math.round(r.left - pr.left)) + 'px', top: Math.round(r.bottom - pr.top + 4) + 'px', '--fc': sp.style.getPropertyValue('--fc') || 'var(--ink-3)' },
      on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); FREEW.pick(sel, c); } } }, h('span', lab), h('b', 'Change ▾'));
    st.page.append(c);
    // V4.53: the word clicked — the title of its component, or a structure on it
    if (sel.t === 'p' && sel.word) { const w = sel.word, k = sel.k, mini = (cls, label, title, run) => h('button.fw-chip.fw-chip2' + cls, { type: 'button', title, style: { '--fc': c.style.getPropertyValue('--fc') }, on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); run(e); } } }, label);
      const row = h('span.fw-chips', { style: { left: c.style.left, top: (parseFloat(c.style.top) + 30) + 'px' } }, h('span.fw-cw', '“' + snippet(w, 24) + '”'),
        mini('.fw-ti', 'Title', 'Make “' + w + '” the title of this component', () => FREEW.titleOf(k, w)), mini('.fw-st', 'Structure ▾', 'Make “' + w + '” a structure inside this component', e => FREEW.structMenu(k, w, e.currentTarget)));
      st.page.append(row); }
  },
  chipOff() { $$('.fw-chip, .fw-chips').forEach(x => x.remove()); },
  /** V4.53: the word at an offset (letters, digits, µ, - and ’ inside it). */
  wordAt(v, i) { const ok = ch => /[\p{L}\p{N}µ%'’\-]/u.test(ch || ''); let a = i, b = i; while (a > 0 && ok(v[a - 1])) a--; while (b < v.length && ok(v[b])) b++; return v.slice(a, b).replace(/^['’\-]+|['’\-]+$/g, ''); },
  /** V4.53: the part whose stretch holds [a, b), or null. */
  partAt(a, b) { const c = FREEW.st && FREEW.st.conv; if (!c) return null; for (const p of c.parts) if (!p.none && p.spans.some(s => a >= s.from && b <= s.to)) return p; for (const j of c.joins || []) if (a >= j.from && b <= j.to) return c.parts.find(p => p.key === j.host) || null; return null; },
  /** V4.53: these words as the title of their component (again: no title). */
  titleOf(key, words) { const cur = Object.assign({}, (FREEW.fw().over || {})[key] || {}), same = cur.title && FREEW.key(cur.title) === FREEW.key(words); if (same) delete cur.title; else cur.title = String(words).trim();
    FREEW.setOver('over', key, Object.keys(cur).length ? cur : null); toast(same ? 'No title now' : 'The title of this component: “' + snippet(words, 40) + '”', 2600); },
  /** V4.53: a structure on these words inside their component (the same again: off). */
  structOn(key, words, sid) { const cur = Object.assign({}, (FREEW.fw().over || {})[key] || {}), M0 = (cur.marks || []).slice(), i = M0.findIndex(m => FREEW.key(m.t) === FREEW.key(words)), had = i >= 0 && M0[i].s === sid; if (i >= 0) M0.splice(i, 1); if (!had) M0.push({ t: String(words).trim(), s: sid });
    if (M0.length) cur.marks = M0; else delete cur.marks; FREEW.setOver('over', key, Object.keys(cur).length ? cur : null); toast(had ? 'Not a structure now' : KIND[sid].label + ' — on “' + snippet(words, 36) + '”', 2600); },
  structMenu(key, words, anchor) { const r = anchor.getBoundingClientRect(), cur = ((FREEW.fw().over || {})[key] || {}).marks || [], m = cur.find(x => FREEW.key(x.t) === FREEW.key(words));
    ctxMenu(r.left, r.bottom + 4, [{ head: '“' + snippet(words, 40) + '” is a…' }, ...KINDS.filter(k => k.id !== 'reminder').map(k => ({ label: (m && m.s === k.id ? '✓ ' : '') + k.label, run: () => FREEW.structOn(key, words, k.id) }))]); },
  /* ---------------- V4.34 — your own associations, by highlight ---------------- */
  /** Words selected with the pointer: a small button at the end of the selection asks what they are (nothing opens by itself). */
  selChip() {
    const st = FREEW.st; if (!st) return; FREEW.selOff(); const ta = st.ta, v = ta.value; let a = ta.selectionStart, b = ta.selectionEnd;
    while (a < b && /\s/.test(v[a])) a++; while (b > a && /[\s.,;:!?]/.test(v[b - 1])) b--; if (b - a < 2 || !/\w/.test(v.slice(a, b))) return;
    const r = FREEW.rectAt(b), words = v.slice(a, b), host = FREEW.partAt(a, b);
    if (host) {   // V4.53: inside one component — its title, a structure on these words, or a component of their own
      const mini = (cls, label, title, run) => h('button.fw-chip.fw-chip2.fw-assoc' + cls, { type: 'button', title, on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); run(e); } } }, label);
      st.page.append(h('span.fw-chips.fw-assoc', { style: { left: Math.max(0, Math.round(r.x - 24)) + 'px', top: Math.round(r.y + 6) + 'px' } },
        mini('.fw-ti', 'Title', 'These words as the title of their component', () => { FREEW.selOff(); FREEW.titleOf(host.key, words); }),
        mini('.fw-st', 'Structure ▾', 'A structure on these words, inside their component', e => FREEW.structMenu(host.key, words, e.currentTarget)),
        mini('.fw-ac', 'A component…', 'These words as a component of their own (or one that exists)', () => { FREEW.selOff(); FREEW.associate(words, a, b); })));
      return; }
    st.page.append(h('button.fw-chip.fw-assoc', { type: 'button', title: 'Say what these words are: a new component or one that exists, for this freewrite or every one', style: { left: Math.max(0, Math.round(r.x - 24)) + 'px', top: Math.round(r.y + 6) + 'px', '--fc': 'var(--teal)' },
      on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); FREEW.selOff(); FREEW.associate(words, a, b); } } }, FREEW.ic('wand', 14), h('b', 'Make these words a component…')));
  },
  selOff() { $$('.fw-assoc, .fw-chips.fw-assoc').forEach(x => x.remove()); },
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
    if (typeof b === 'number' && st.ta.selectionStart !== st.ta.selectionEnd) st.ta.setSelectionRange(b, b);   // V4.53: the words let go, so the next click lands on a word
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
        l.own ? { label: 'Remove this link', sub: 'You drew it', danger: true, run: () => FREEW.unlink(l) } : { label: l.none ? 'Link them again' : 'No link', run: () => set(Object.assign({}, (FREEW.fw().lover || {})[l.key], { none: !l.none })) },
        l.changed && !l.own ? { label: 'As the rule read it', run: () => set(null) } : null]); }
    let p = st.conv.parts.find(x => x.key === sel.k), J = null;
    if (!p) { J = (st.conv.joins || []).find(x => x.key === sel.k); if (!J) return; p = { key: J.key, text: J.text, as: 'joined', kind: null, struct: null, changed: false }; }   // V4.37
    const host = J ? st.conv.parts.find(x => x.key === J.host) : p.split ? st.conv.parts.find(x => x.key === p.split) : null, hl = host ? FREEW.look(host).tag : '';
    const keepTM = () => { const c = (FREEW.fw().over || {})[p.key] || {}, o = {}; if (c.title) o.title = c.title; if (c.marks) o.marks = c.marks; return o; };   // V4.53: the title and the structures stay
    const set = v => FREEW.setOver('over', p.key, v == null ? null : Object.assign(keepTM(), v)), is = (a, k, s) => p.as === a && (k === undefined || (p.kind || null) === k) && (s === undefined || (p.struct || null) === s);
    const K = (typeof CKINDS !== 'undefined' ? CKINDS.all() : []).filter(k => !k.act && k.id !== 'report' && k.id !== 'iteration');
    ctxMenu(r.left, r.bottom + 6, [{ head: '“' + snippet(p.text, 44) + '” becomes…' },
      J || p.split ? { label: (J ? '✓ ' : '') + 'Stays in the ' + hl + ' before it', sub: '“' + snippet(host ? host.spans.length && st.ta ? st.ta.value.slice(host.spans[0].from, host.spans[0].to) : host.text : '', 34) + '” — no rule found anything new in it', run: () => set(null) } : null,
      { label: (is('component', null, null) ? '✓ ' : '') + (J ? 'Its own component' : 'A component'), sub: 'Plain, no kind', run: () => set({ as: 'component', kind: null, struct: null }) },
      { label: (p.as === 'task' ? '✓ ' : '') + 'A task', sub: 'A tick box in the note', run: () => set({ as: 'task', kind: null, struct: null }) },
      { label: (p.as === 'slot' ? '✓ ' : '') + 'A Result to add', sub: 'Titled with these words; ＋ adds an image, a table, a plot…', run: () => set({ as: 'slot', kind: 'result', struct: null }) },
      { label: (p.as === 'bridge' ? '✓ ' : '') + 'A bridge from a note', sub: 'Notes whose titles share these words are offered', run: () => set({ as: 'bridge', kind: null, struct: null }) },
      'sep', { head: 'A kind of component' },
      ...K.map(k => ({ label: (p.as === 'component' && p.kind === k.id && !p.flag ? '✓ ' : '') + k.label, run: () => p.mem ? FREEW.overAll(p.mem.map(m => m.key), c => Object.assign(c, { as: 'component', kind: k.id })) : set({ as: 'component', kind: k.id, struct: p.struct || null }) })),
      'sep', { head: 'A structure on its words' },
      ...(p.mem ? [{ head: 'Each of its sentences keeps its structure — its label changes them' }] : KINDS).filter(k => k.head || k.id !== 'reminder').map(k => k.head ? k : ({ label: (p.struct === k.id ? '✓ ' : '') + k.label, run: () => set({ as: p.as === 'task' || p.as === 'slot' || p.as === 'bridge' ? 'component' : p.as, kind: p.kind || null, struct: p.struct === k.id ? null : k.id }) })),
      'sep', { label: 'Plain words — not a component', danger: true, run: () => set({ none: true }) },
      p.changed && !p.split ? { label: 'As the rules read it', run: () => set(null) } : null]);
    FREEW.flash(J ? J.host : p.key);
  },
  /** V4.54: the labels over the words, as buttons above the text box (the copy behind the words keeps them hidden). */
  tags() {
    const st = FREEW.st; if (!st) return; const conv = st.conv; if (!st.tg) { st.tg = h('div.fw-tags'); st.page.append(st.tg); }
    st.page.classList.toggle('fw-tg', !!conv); if (!conv) { st.tg.replaceChildren(); return; }
    const pr = st.page.getBoundingClientRect(), own = {}, seen = new Set(), out = [];
    conv.links.forEach(l => { if (l.own && !l.none && !l.off) { own[l.a] = (own[l.a] || 0) + 1; own[l.b] = (own[l.b] || 0) + 1; } });
    st.back.querySelectorAll('.fw-s[data-t], .fw-l[data-t]').forEach(el => { const r = el.getClientRects()[0]; if (!r) return; const lnk = el.classList.contains('fw-l'), k = el.dataset.k, n = !lnk && !seen.has(k) ? own[k] || 0 : 0; if (!lnk) seen.add(k);
      const b = h('button.fw-tag' + (lnk ? '.fw-tagl' : '') + (el.classList.contains('on') ? '.on' : ''), Object.assign({ type: 'button', title: lnk ? 'Change this link' : 'Its kind and its structure — or drag it onto another component to link them', style: { left: Math.round(r.left - pr.left) + 'px', top: Math.round(r.top - pr.top) + 'px', '--fc': el.style.getPropertyValue('--fc') },
        on: { mousedown: e => e.preventDefault(), pointerdown: e => { if (!lnk) FREEW.grab(e, k); }, click: e => { e.stopPropagation(); if (FREEW.dragged()) return; if (lnk) FREEW.pick({ t: 'l', k: el.dataset.l }, e.currentTarget); else FREEW.quick(k, e.currentTarget); } } }, lnk ? { 'data-l': el.dataset.l } : { 'data-k': k }),
        el.dataset.t, el.dataset.flag ? h('i.fw-flag', FREEW.ic('flag', 10), el.dataset.flag) : null, n ? h('i.fw-tln', '· ' + plural(n, 'link')) : null);
      if (el.dataset.flag) b.classList.add('flagged');
      out.push(b); });
    (conv.seams || []).forEach(sm => { const r1 = FREEW.rectAt(sm.from), r2 = FREEW.rectAt(sm.to), same = Math.abs(r1.y - r2.y) < 4, x = same ? (r1.x + r2.x) / 2 : r1.x + 7;   // V4.55: between two sentences
      out.push(h('button.fw-seam' + (sm.on ? '.on' : ''), { type: 'button', 'data-a': sm.a, 'data-b': sm.b, 'aria-label': sm.on ? 'Split these two sentences again' : 'Merge these two sentences into one component', title: sm.on ? 'One component — click to split these two sentences again' : 'Merge these two sentences into one component', style: { left: Math.round(x) + 'px', top: Math.round(r1.y) + 'px' },
        on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); FREEW.merge(sm.a, sm.b); } } }, FREEW.ic(sm.on ? 'link' : 'plus', 11))); });
    st.tg.replaceChildren(...out);
  },
  /** V4.54: a label clicked — a clean popup, as on a PDF's highlight: its kind, its structure (a letter picks one), its title, its links. */
  quick(key, anchor) {
    const st = FREEW.st; if (!st || !st.conv || !st.conv.parts.some(x => x.key === key)) return; const r = anchor.getBoundingClientRect(); let el = null;
    st.sel = { t: 'p', k: key }; FREEW.chipOff(); FREEW.paint();
    const P = () => FREEW.st && FREEW.st.conv && FREEW.st.conv.parts.find(x => x.key === key && !x.none);
    const keep = () => { const c = (FREEW.fw().over || {})[key] || {}, o = {}; if (c.title) o.title = c.title; if (c.marks) o.marks = c.marks; return o; };
    const set = v => { FREEW.setOver('over', key, Object.assign(keep(), v)); draw(); };
    const kindTo = (p, id) => { if (!p.mem) return set({ as: 'component', kind: id, struct: p.struct || null }); FREEW.overAll(p.mem.map(m => m.key), c => Object.assign(c, { as: 'component', kind: id })); draw(); };   // V4.55: one kind for all its sentences
    const K = (typeof CKINDS !== 'undefined' ? CKINDS.all() : []).filter(k => !k.act && k.id !== 'report' && k.id !== 'iteration'), S = KINDS.filter(k => k.id !== 'reminder');
    const kp = (label, col, on, run, kb, id) => h('button.kpick' + (on ? '.on' : ''), { type: 'button', 'data-id': id || '', style: { '--kc': col }, on: { mousedown: e => e.preventDefault(), click: run } }, label, kb ? h('kbd', kb) : null);
    const as = p => p.as === 'task' || p.as === 'slot' || p.as === 'bridge' ? 'component' : p.as || 'component';
    const struct = (p, id) => set({ as: as(p), kind: p.kind || null, struct: p.struct === id ? null : id });
    const draw = () => { const p = P(); if (!p || !el || !el.isConnected) { if (el && el.isConnected) closePop(); return; } const lk = FREEW.look(p), sc = k => ((settings().kinds || {})[k.id] || k).color;
      const Ls = st.conv.links.filter(l => !l.none && !l.off && (l.a === key || l.b === key));
      el.replaceChildren(
        h('h5', h('span.fw-qt', { style: { '--fc': lk.col } }, lk.tag), h('span.serif', '“' + snippet(p.text, 40) + '”')),
        p.flag && p.flag.kinds ? h('div.fw-qflag', FREEW.ic('flag', 12), h('span', 'Its sentences had ' + p.flag.kinds.length + ' kinds (' + p.flag.kinds.map(id => (CKINDS.get(id) || { label: id }).label).join(', ') + ') — choose the one it is')) : null,
        h('div.fw-qh', 'Kind'), h('div.rd-kinds.fw-qkind', kp('None', 'var(--ink-3)', !p.kind && as(p) === p.as && !p.flag, () => kindTo(p, null), null, 'none'),
          ...K.map(k => { const b = kp(k.label, k.color, p.kind === k.id && !(p.flag && p.flag.kinds), () => kindTo(p, p.kind === k.id && !(p.flag && p.flag.kinds) ? null : k.id), null, k.id); if (p.flag && p.flag.kinds && p.flag.kinds.includes(k.id)) b.classList.add('fw-qx'); return b; })),
        ...(p.mem ? [h('div.fw-qh', 'Its sentences — each keeps its structure'), h('div.fw-qparts', p.mem.map((m, i) => { const S0 = m.struct && KIND[m.struct];
            return h('div.fw-qpart', h('span.fw-qn', String(i + 1)), h('span.serif', '“' + snippet(m.text, 34) + '”'), h('span.spacer'), h('button.btn.xs.fw-qps', { type: 'button', 'data-k': m.key, style: S0 ? { color: sc(S0) } : {}, on: { mousedown: e => e.preventDefault(), click: e => { const rr = e.currentTarget.getBoundingClientRect(), ar = anchor.isConnected ? anchor.getBoundingClientRect() : r; off();
              ctxMenu(rr.left, rr.bottom + 4, [{ head: '“' + snippet(m.text, 30) + '” is a…' }, { label: (!m.struct ? '✓ ' : '') + 'No structure', run: () => { FREEW.overAll([m.key], c => Object.assign(c, { as: 'component', struct: null })); FREEW.quick(key, { getBoundingClientRect: () => ar }); } },
                ...S.map(k => ({ label: (m.struct === k.id ? '✓ ' : '') + k.label, run: () => { FREEW.overAll([m.key], c => Object.assign(c, { as: 'component', struct: k.id })); FREEW.quick(key, { getBoundingClientRect: () => ar }); } }))]); } } }, (S0 ? S0.label : 'No structure') + ' ▾')); }))]
          : [h('div.fw-qh', 'Structure'), h('div.rd-kinds.fw-qstruct', kp('None', 'var(--ink-3)', !p.struct, () => set({ as: as(p), kind: p.kind || null, struct: null }), null, 'none'),
          ...S.map(k => kp(k.label, sc(k), p.struct === k.id, () => struct(p, k.id), k.key, k.id)))]),
        p.flag && p.flag.titles ? h('div.fw-qflag.fw-qtt', FREEW.ic('flag', 12), h('span', 'Its sentences had ' + p.flag.titles.length + ' titles — keep one:'), ...p.flag.titles.map(t => h('button.btn.xs', { type: 'button', on: { mousedown: e => e.preventDefault(), click: () => { FREEW.overAll(p.mem.filter(m => m.title && m.title !== t).map(m => m.key), c => { delete c.title; return c; }); draw(); } } }, '“' + snippet(t, 22) + '”'))) :
        p.title ? h('div.fw-qline', h('span.fw-qh', 'Title'), h('b', '“' + snippet(p.title, 36) + '”'), h('span.spacer'), h('button.btn.xs.ghost', { type: 'button', on: { mousedown: e => e.preventDefault(), click: () => { if (p.mem) FREEW.overAll(p.mem.filter(m => m.title).map(m => m.key), c => { delete c.title; return c; }); else FREEW.titleOf(key, p.title); draw(); } } }, 'Take off')) : null,
        Ls.length ? h('div.fw-qh', 'Links') : null,
        Ls.length ? h('div.fw-qlinks', Ls.map(l => { const o = l.a === key ? l.b : l.a, O = st.conv.parts.find(x => x.key === o), R = REL[l.rel] || { label: l.rel };
          return h('button.fw-qlink', { type: 'button', 'data-l': l.key, style: { '--fc': WIRECOL[l.rel] || '#8a8f98' }, on: { mousedown: e => e.preventDefault(), click: e => { const rr = e.currentTarget.getBoundingClientRect(); closePop(); off(); FREEW.pick({ t: 'l', k: l.key }, { getBoundingClientRect: () => rr }); } } },
            h('b', (l.a === key ? '→ ' : '← ') + (R.label || l.rel)), h('span.serif', '“' + snippet(O ? O.text : '', 30) + '”')); })) : null,
        h('div.fw-qfoot', h('span', 'Drag its label onto another component to link them'), h('span.spacer'),
          p.mem ? h('button.btn.xs.fw-qsplit', { type: 'button', title: 'Each sentence its own component again', on: { mousedown: e => e.preventDefault(), click: () => { closePop(); off(); FREEW.split(p); } } }, 'Split') : null,
          h('button.btn.xs.fw-qmore', { type: 'button', on: { mousedown: e => e.preventDefault(), click: e => { const rr = e.currentTarget.getBoundingClientRect(); closePop(); off(); FREEW.pick({ t: 'p', k: key }, { getBoundingClientRect: () => rr }); } } }, 'More ▾'))); };
    const kd = e => { if (!el || !el.isConnected) return off(); if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); off(); return; }
      const k = S.find(z => z.key === (e.key || '').toLowerCase()), p = P(); if (k && p && !p.mem) { e.preventDefault(); e.stopPropagation(); struct(p, k.id); return; }
      if (!/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) { closePop(); off(); } };   // any other key: the popup goes, the key goes to the words
    const off = () => document.removeEventListener('keydown', kd, true);
    el = popover(r.left, r.bottom + 6, [], { cls: 'pop.fw-qk', onClose: off }); draw();
    setTimeout(() => document.addEventListener('keydown', kd, true), 0); FREEW.flash(key);
  },
  /** V4.54: a label or a box dragged onto another component → which relation. A move under 6 px is a click. */
  grab(e, key) {
    const st = FREEW.st; if (!st || e.button !== 0) return; e.preventDefault();
    const src = e.currentTarget.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, sx = src.left + src.width / 2, sy = src.top + src.height / 2; let on = false, tgt = null, wire = null;
    const lit = k => { $$('.fw-tgt').forEach(x => x.classList.remove('fw-tgt')); if (k) { const q = CSS.escape(k); $$(`.fw-back .fw-s[data-k="${q}"], .fw-tag[data-k="${q}"], .fw-mb[data-k="${q}"]`).forEach(x => x.classList.add('fw-tgt')); } };
    const mv = ev => { const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!on) { if (dx * dx + dy * dy < 36) return; on = true; closePop(); FREEW.chipOff(); document.body.classList.add('fw-linking'); wire = h('div.fw-wire', { 'aria-hidden': 'true', html: `<svg width="100%" height="100%"><line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy}"/><circle r="4" cx="${sx}" cy="${sy}"/></svg>` }); document.body.append(wire); }
      const ln = wire.querySelector('line'), c = wire.querySelector('circle'); ln.setAttribute('x2', ev.clientX); ln.setAttribute('y2', ev.clientY); c.setAttribute('cx', ev.clientX); c.setAttribute('cy', ev.clientY);
      const k = FREEW.keyAt(ev.clientX, ev.clientY); tgt = k && k !== key ? k : null; lit(tgt); wire.classList.toggle('ok', !!tgt); };
    const end = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); if (!on) return;
      FREEW._dragAt = Date.now(); if (wire) wire.remove(); document.body.classList.remove('fw-linking'); lit(null); if (tgt && ev.type === 'pointerup') FREEW.linkMenu(key, tgt, ev.clientX, ev.clientY); };
    addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  },
  dragged() { return Date.now() - (FREEW._dragAt || 0) < 400; },
  /** V4.56: replace [a, b) of the words, kept in the text box's own Undo; the caret kept where it was. */
  replaceRange(a, b, str) { const st = FREEW.st; if (!st) return; const ta = st.ta, c0 = ta.selectionStart, c1 = ta.selectionEnd, dl = str.length - (b - a), f = c => c >= b ? c + dl : c > a ? a + str.length : c;
    ta.focus(); ta.setSelectionRange(a, b); let done = false; try { done = document.execCommand('insertText', false, str); } catch (e) { } if (!done || ta.value.slice(a, a + str.length) !== str) { ta.setRangeText(str, a, b, 'end'); FREEW.paint(); FREEW.save(); }
    ta.setSelectionRange(f(c0), f(c1)); },
  /** V4.56: a kind or structure chosen for a placeholder is written in its words (⟦Verdict · Barrier: …⟧). */
  retoken(key, v) { const st = FREEW.st, q = st && st.conv && st.conv.parts.find(x => x.key === key), t = q && q.ph; if (!t || v.as === 'task' || v.as === 'bridge') return false;
    const o = { kind: 'kind' in v ? v.kind : t.kind, struct: 'struct' in v ? v.struct : t.struct, format: t.format }; if (v.as === 'slot') o.kind = v.kind || 'result';
    const str = FREEW.tokStr(o, t); if (st.ta.value.slice(t.from, t.to) !== str) FREEW.replaceRange(t.from, t.to, str); return true; },
  /** V4.56: / and letters after a space, or inside a placeholder → what it can be. */
  slashCheck() { const st = FREEW.st; if (!st) return; const ta = st.ta, v = ta.value, c = ta.selectionStart; if (c !== ta.selectionEnd) return FREEW.slashOff();
    const m = /(^|[\s⟦:·])\/([\p{L}\-]{0,24})$/u.exec(v.slice(Math.max(0, c - 27), c)); if (!m) return FREEW.slashOff();
    const from = c - m[2].length - 1, tok = FREEW.tokens(v).find(t => from > t.from && from < t.to) || null, items = FREEW.slashItems(m[2].toLowerCase(), tok);
    if (!items.length) return FREEW.slashOff(); const S0 = st.slash || {}; st.slash = { from, to: c, tok, items, hi: S0.items && S0.from === from ? Math.min(S0.hi || 0, items.length - 1) : 0 }; FREEW.slashDraw(); },
  slashItems(q, tok) { const K = FREEW.kindsList(), S = KINDS.filter(k => k.id !== 'reminder'), m = x => !q || x.label.toLowerCase().startsWith(q) || x.id.startsWith(q) || (q.length > 2 && x.label.toLowerCase().includes(q)), sc = k => ((settings().kinds || {})[k.id] || k).color, out = [];
    const res = !!tok && (tok.kind === 'result' || (!tok.kind && !tok.struct));   // a format is what a Result will be; a structure needs words of its own
    if (res) FREEW.FMT.filter(m).forEach(f => out.push({ t: 'f', id: f.id, label: f.label, sub: 'It will be ' + f.d, sec: 'This placeholder’s format' }));
    K.filter(m).forEach(k => out.push({ t: 'k', id: k.id, label: k.label, col: k.color, sub: tok ? 'Its kind' : k.id === 'result' ? 'A Result to add — an empty bubble; /html in it says what it will be' : 'A ' + k.label + ' to write', sec: 'A kind of component' }));
    if (!tok || tok.kind !== 'result') S.filter(m).filter(x => tok || !K.some(k => k.label === x.label)).forEach(x => out.push({ t: 's', id: x.id, label: x.label, col: sc(x), sub: tok ? 'A structure on it' : 'A ' + x.label.toLowerCase() + ' to write', sec: 'A structure' }));
    if (!tok) FREEW.FMT.filter(m).forEach(f => out.push({ t: 'f', id: f.id, label: 'Result · ' + f.label, sub: 'A Result to add: ' + f.d, sec: 'A Result, and what it will be' }));
    return out.slice(0, 9); },
  slashDraw() { const st = FREEW.st, S0 = st && st.slash; if (!S0) return; let el = st.slashEl; if (!el || !el.isConnected) { el = st.slashEl = h('div.slash-menu.fw-slash', { role: 'listbox', on: { mousedown: e => e.preventDefault() } }); document.body.append(el); }
    let sec = null; el.replaceChildren(...S0.items.flatMap((it, i) => { const row = h('div.sm-row' + (i === S0.hi ? '.hi' : ''), { role: 'option', 'data-i': i, on: { mousemove: () => { if (S0.hi !== i) { S0.hi = i; FREEW.slashDraw(); } }, click: () => FREEW.slashPick(it) } },
        h('b', { style: it.col ? { color: it.col } : {} }, '/' + it.label.toLowerCase().replace(/^result · /, '')), h('span.s', it.sub)); const out = it.sec !== sec ? [h('div.sm-h', it.sec), row] : [row]; sec = it.sec; return out; }),
      h('div.sm-f', '↑ ↓ to choose · Enter · Esc'));
    const r = FREEW.rectAt(S0.from), pr = st.page.getBoundingClientRect(), mr = el.getBoundingClientRect(); let x = pr.left + r.x, y = pr.top + r.y + 6; if (y + mr.height > innerHeight - 8) y = Math.max(8, pr.top + r.y - 30 - mr.height);
    el.style.left = Math.round(clamp(x, 8, innerWidth - mr.width - 8)) + 'px'; el.style.top = Math.round(y) + 'px'; },
  slashOff() { const st = FREEW.st; if (st) { st.slash = null; if (st.slashEl) { st.slashEl.remove(); st.slashEl = null; } } },
  slashKey(e) { const st = FREEW.st, S0 = st && st.slash; if (!S0 || !st.slashEl) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); S0.hi = (S0.hi + (e.key === 'ArrowDown' ? 1 : -1) + S0.items.length) % S0.items.length; FREEW.slashDraw(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); e.stopPropagation(); FREEW.slashPick(S0.items[S0.hi]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); FREEW.slashOff(); } },
  /** Outside a placeholder: a new one, the caret in it. Inside: its format, its kind or its structure. */
  slashPick(it) { const st = FREEW.st, S0 = st && st.slash; if (!S0 || !it) return; const ta = st.ta, from = S0.from; FREEW.slashOff();
    if (S0.to > from) FREEW.replaceRange(from, S0.to, '');
    const tok = FREEW.tokens(ta.value).find(t => from > t.from && from < t.to);
    if (tok) { const o = { kind: tok.kind, struct: tok.struct, format: tok.format }; if (it.t === 'f') { o.format = it.id; if (!o.kind && !o.struct) o.kind = 'result'; } if (it.t === 'k') o.kind = it.id; if (it.t === 's') o.struct = it.id;
      const str = FREEW.tokStr(o, Object.assign({}, tok, { colon: true })); FREEW.replaceRange(tok.from, tok.to, str); const c = tok.from + str.length - 1; ta.setSelectionRange(c, c); }
    else { const o = it.t === 'f' ? { kind: 'result', format: it.id } : it.t === 'k' ? { kind: it.id } : { struct: it.id }, pre = from > 0 && !/\s/.test(ta.value[from - 1]) ? ' ' : '', str = pre + FREEW.tokStr(o, null);
      FREEW.replaceRange(from, from, str); const c = from + str.length - 1; ta.setSelectionRange(c, c); }
    ta.focus(); FREEW.paint(); FREEW.save(); },
  /** V4.56: the bar above the page — the same, with the pointer. */
  barEl() { const b = (label, title, which) => h('button.btn.xs.ghost.fw-barb', { type: 'button', title, 'data-w': which, on: { mousedown: e => e.preventDefault(), click: e => FREEW.barMenu(which, e.currentTarget) } }, label);
    return h('div.fw-bar', { role: 'toolbar', 'aria-label': 'Placeholders' }, b('Placeholder ▾', 'A kind of component, to write later — a Result to add, a Hypothesis…', 'k'), b('Structure ▾', 'A structure, to write later — a Barrier, a Claim…', 's'), b('Format ▾', 'What a Result will be — an HTML file, an image, a table… (in the placeholder the caret is in, or a new Result)', 'f'),
      h('span.fw-barh', 'or type / — /result, then /html in it')); },
  barMenu(which, btn) { const st = FREEW.st; if (!st) return; const r = btn.getBoundingClientRect(), K = FREEW.kindsList(), S = KINDS.filter(k => k.id !== 'reminder'); let tok = FREEW.tokens(st.ta.value).find(t => st.ta.selectionStart > t.from && st.ta.selectionStart < t.to), place = null;
    if (tok && ((which === 's' && tok.kind === 'result') || (which === 'f' && tok.kind !== 'result' && (tok.kind || tok.struct)))) { place = tok.to; tok = null; }   // a Result has no words for a structure; a format is for a Result: a new placeholder after it
    const items = which === 'k' ? K.map(k => ({ t: 'k', id: k.id, label: k.label })) : which === 's' ? S.map(k => ({ t: 's', id: k.id, label: k.label })) : FREEW.FMT.map(f => ({ t: 'f', id: f.id, label: f.label, sub: f.d }));
    ctxMenu(r.left, r.bottom + 4, [{ head: tok ? (which === 'f' ? 'This placeholder will be…' : which === 'k' ? 'This placeholder’s kind' : 'A structure on this placeholder') : which === 'f' ? 'A Result to add, as…' : which === 'k' ? 'A placeholder: a kind of component' : 'A placeholder: a structure' },
      ...items.map(it => ({ label: it.label, sub: it.sub || null, run: () => { const c = place != null ? place : st.ta.selectionStart; st.slash = { from: c, to: c, items: [it], hi: 0 }; FREEW.slashPick(it); } }))]); },
  /** V4.55: what a merged component has to correct, in words. */
  flagText(p) { const f = p.flag || {}; return [f.kinds ? f.kinds.length + ' kinds' : '', f.titles ? f.titles.length + ' titles' : ''].filter(Boolean).join(' · '); },
  /** V4.55: merge two sentences into one component (again: split them). */
  merge(a, b) { const M0 = (FREEW.fw().merges || []).filter(m => m && m.a && m.b), had = M0.some(m => m.a === a && m.b === b);
    FREEW.setFw({ merges: had ? M0.filter(m => !(m.a === a && m.b === b)) : M0.concat([{ a, b }]) }); closePop(); FREEW.chipOff(); FREEW.paint();
    const H = !had && FREEW.st && FREEW.st.conv && FREEW.st.conv.parts.find(p => p.mem && p.mem.some(m => m.key === b));
    toast(had ? 'Two components again' : H && H.flag ? 'Merged — its sentences had ' + FREEW.flagText(H) + ': choose one (click its label)' : 'Merged into one component — each sentence keeps its structure', 3200); },
  split(p) { const ks = new Set((p.mem || []).map(m => m.key)); FREEW.setFw({ merges: (FREEW.fw().merges || []).filter(m => !(ks.has(m.a) && ks.has(m.b))) }); FREEW.paint(); toast('Each sentence its own component again', 2400); },
  /** V4.55: change what several parts are, at once (fw.over), and draw once. */
  overAll(keys, fn) { const ov = Object.assign({}, FREEW.fw().over || {}); keys.forEach(k => { const c = fn(Object.assign({}, ov[k] || {}), k); if (c && Object.keys(c).length) ov[k] = c; else delete ov[k]; }); FREEW.setFw({ over: ov }); FREEW.chipOff(); FREEW.paint(); },
  /** The component under a point: its label, its box in the preview, or its words. */
  keyAt(x, y) { const st = FREEW.st; if (!st) return null; const el = document.elementFromPoint(x, y), t = el && el.closest && el.closest('.fw-tag[data-k], .fw-mb[data-k]'); if (t) return t.dataset.k;
    for (const s of st.back.querySelectorAll('.fw-s[data-k]')) for (const r of s.getClientRects()) if (x >= r.left && x <= r.right && y >= r.top - 2 && y <= r.bottom + 2) return s.dataset.k;
    return null; },
  linkMenu(a, b, x, y) {
    const st = FREEW.st; if (!st || !st.conv) return; const c = st.conv, A = c.parts.find(p => p.key === a), B = c.parts.find(p => p.key === b); if (!A || !B) return;
    const ex = c.links.find(l => !l.off && ((l.a === a && l.b === b) || (l.a === b && l.b === a)));
    if (ex) { FREEW.pick({ t: 'l', k: ex.key }, { getBoundingClientRect: () => ({ left: x, bottom: y, width: 1 }) }); toast('They are linked already — change the link here', 2600); return; }
    ctxMenu(x, y + 6, [{ head: '“' + snippet(A.text, 26) + '” → “' + snippet(B.text, 26) + '”' },
      ...FREEW.RELS.filter(r => REL[r]).map(r => ({ label: REL[r].label || r, sub: REL[r].verb && REL[r].verb !== REL[r].label ? REL[r].verb : null, run: () => FREEW.addLink(a, b, r) }))]);
  },
  addLink(a, b, rel) {
    const L = (FREEW.fw().links || []).filter(u => !((u.a === a && u.b === b) || (u.a === b && u.b === a))); L.push({ a, b, rel });
    const lo = Object.assign({}, FREEW.fw().lover || {}); delete lo[a + '>' + b]; delete lo[b + '>' + a];
    FREEW.setFw({ links: L, lover: lo }); FREEW.paint(); FREEW.flash(b); toast('Linked: ' + ((REL[rel] || {}).label || rel) + ' — Apply makes it a link in the note', 2800);
  },
  unlink(l) { FREEW.setFw({ links: (FREEW.fw().links || []).filter(u => !((u.a === l.a && u.b === l.b) || (u.a === l.b && u.b === l.a))) }); FREEW.setOver('lover', l.key, null); toast('No link now', 2000); },
  setOver(which, key, v) { if (which === 'over' && /^ph:/.test(key) && v && !v.none && FREEW.retoken(key, v)) { const r = {}; if (v.title) r.title = v.title; if (v.marks) r.marks = v.marks; v = Object.keys(r).length ? r : null; }   // V4.56
    const cur = Object.assign({}, FREEW.fw()[which] || {}); if (v == null) delete cur[key]; else cur[key] = v; FREEW.setFw({ [which]: cur }); FREEW.chipOff(); FREEW.paint(); },
  /** The chosen part's box in the preview, brought into view and lit. */
  flash(key) { const st = FREEW.st; if (!st) return; const b = st.side.querySelector(`.fw-mb[data-k="${CSS.escape(key)}"]`); if (b) { b.scrollIntoView({ block: 'nearest' }); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 1200); } },
  /** Convert: the colours and the note it will make; from then on they follow every correction. */
  show(force) { const st = FREEW.st; if (!st) return;
    if (st.shown && !force && FREEW.opt('colour', 'convert') !== 'live') return FREEW.plain();   // V4.47: Undo convert — plain words
    if (!st.ta.value.trim()) return toast('Write or speak first — then Convert reads your sentences');
    st.shown = true; FREEW.setFw({ shown: true }); FREEW.paint();
    const c = st.conv, n = c ? c.parts.filter(p => !p.none).length : 0; toast(n ? plural(n, 'component') + ' and ' + plural(c.links.filter(l => !l.none && !l.off).length, 'link') + ' found — click coloured words to change them' : 'No component found yet — click words, or write “… supports …”, “One of the barriers is …”', 3600); },
  /** V4.47: back to plain words — no colours, no preview; what you chose by clicking is kept for the next Convert. */
  plain() { const st = FREEW.st; if (!st) return; st.shown = false; st.sel = null; FREEW.chipOff(); FREEW.selOff(); FREEW.ghostOff(); FREEW.setFw({ shown: false }); FREEW.paint(); toast('Convert undone — plain words again; what you chose is kept: Convert brings it back', 3000); },
  /** V4.47: the note as it will look, in the note itself (the page goes beside it). */
  ghost(on) { const st = FREEW.st; if (!st) return; st.ghost = !!on; st.gfit = !!on; if (on && !st.beside) FREEW.beside(true); if (!on) FREEW.ghostOff(); FREEW.paint(); },
  ghostOff() { $$('.fw-ghosts').forEach(x => x.remove()); },
  ghostPaint() {
    const st = FREEW.st; FREEW.ghostOff(); if (!st || !st.beside || st.ghost === false || !st.conv) return;
    const P = st.conv.parts.filter(p => !p.none), d = M.doc(st.docId), pane = App.panes().find(p => p.docId === st.docId), fb = st.id && M.block(st.id); if (!P.length || !d || !pane || !pane.paper || !fb) return;
    const made = (fb.fw && fb.fw.made) || {}, live = id => { const x = id && M.block(id); return x && x.status === 'live' ? x : null; }, snap = v => Math.round(v / 14) * 14;
    const L = FREEW.layout(st.conv), at0 = FREEW.room(pane, d, fb, L, new Set(Object.values(made))), R = {}, host = h('div.fw-ghosts', { 'aria-hidden': 'true' });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    P.forEach(p => {
      const own = live(p.block), real = live(made[p.key]) || (own && own.docId === d.id ? own : null);
      if (real) { const r = pane.rectOf(real.id); if (r) R[p.key] = r; return; }   // already in the note: itself
      const at = L.pos[p.key]; if (!at) return; const r = { x: snap(at0.x + at.x), y: snap(at0.y + at.y), w: at.w, h: at.h }, lk = FREEW.look(p); R[p.key] = r; n++;
      host.append(h('div.fw-gb' + (lk.cls ? '.' + lk.cls : ''), { 'data-k': p.key, style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', minHeight: r.h + 'px', '--fc': lk.col } }, h('span.fw-gbt', lk.tag), h('span.fw-gbx', p.as === 'slot' ? '“' + p.text + '” — ＋ add the result' : p.text)));
      x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
    let svg = ''; st.conv.links.filter(l => !l.none && !l.off && R[l.a] && R[l.b]).forEach(l => { const A = R[l.a], B = R[l.b], col = WIRECOL[l.rel] || '#8a8f98', lab = (REL[l.rel] || { label: l.rel }).label || l.rel;
      let ax, ay, bx, by; if (B.y >= A.y + A.h - 1) { ax = A.x + A.w / 2; ay = A.y + A.h; bx = B.x + B.w / 2; by = B.y; } else if (A.y >= B.y + B.h - 1) { ax = A.x + A.w / 2; ay = A.y; bx = B.x + B.w / 2; by = B.y + B.h; } else { const lr = B.x > A.x; ax = lr ? A.x + A.w : A.x; ay = A.y + A.h / 2; bx = lr ? B.x : B.x + B.w; by = B.y + B.h / 2; }
      const an = Math.atan2(by - ay, bx - ax), ah = dd => (bx - 11 * Math.cos(an + dd)).toFixed(1) + ',' + (by - 11 * Math.sin(an + dd)).toFixed(1);
      svg += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="2" stroke-dasharray="6 5"/>` + ((REL[l.rel] || {}).dir === false ? '' : `<polygon points="${bx},${by} ${ah(.45)} ${ah(-.45)}" fill="${col}"/>`) + `<text x="${((ax + bx) / 2 + 6).toFixed(1)}" y="${((ay + by) / 2 + 4).toFixed(1)}" fill="${col}" class="fw-gl">${esc(lab)}</text>`; });
    host.prepend(h('div.fw-gsvg', { html: `<svg width="1" height="1" overflow="visible">${svg}</svg>` }));
    if (!n && !svg) return; pane.paper.world.append(host);
    if (st.gfit && n) { st.gfit = false; const fr = pane.rectOf(fb.id) || { x: fb.x || 0, y: fb.y || 0, w: fb.w || 448, h: 160 }; try { pane.paper.fit({ x0: Math.min(x0, fr.x), y0: Math.min(y0, fr.y), x1: Math.max(x1, fr.x + fr.w), y1: Math.max(y1, fr.y + fr.h) }); } catch (e) { } }
  },
  /** V4.47: Take back — what Apply made leaves the note; the freewrite is a draft again, open, its colours kept. */
  takeBack(id) {
    const fb = M.block(id); if (!fb || !fb.fw || fb.fw.state !== 'applied') return; const made = fb.fw.made || {}, applied = fb.fw.applied || '';
    const mine = Object.values(made).map(x => M.block(x)).filter(x => x && x.status === 'live' && x.fwFrom === fb.id);
    const go = () => { const cur = M.block(fb.id); if (!cur) return; const keep = {}; Object.entries(made).forEach(([k, v]) => { const x = M.block(v); if (x && x.status === 'live' && x.fwFrom !== fb.id) keep[k] = v; });   // what existed before (an association) stays
      DB.beginGroup('freewrite'); cur.fw = Object.assign({}, cur.fw, { state: 'draft', made: keep, takenBack: isoLocal(new Date()) }); delete cur.fw.applied; cur.collapsed = false; cur.modified = isoLocal(new Date()); DB.put('blocks', cur);
      if (mine.length) { if (EDIT.deleteBlocks(mine.map(x => x.id), { quiet: true }) === false) return; } else changed();
      if (FREEW.st && FREEW.st.id === fb.id) FREEW.paint();
      toast('Taken back: ' + plural(mine.length, 'component') + ' left the note — the freewrite is a draft again, its colours kept (Ctrl+Z brings them back)', 4200); };
    const edited = mine.filter(x => applied && x.modified && x.modified > applied);
    if (edited.length) return pickModal('Take back what the freewrite made?', plural(edited.length, 'component') + ' changed since it was applied — taking back removes those changes too. Ctrl+Z brings everything back.', [{ label: 'Take back', danger: true, run: go }, { label: 'Keep them', run: () => { } }]);
    go();
  },
  /* ---------------- beside the note ---------------- */
  beside(v) {
    const st = FREEW.st; if (!st) return; st.beside = v == null ? !st.beside : !!v; FREEW.chipOff();
    const side = FREEW.opt('side', 'right') === 'left' ? 'left' : 'right', bd = document.body;
    bd.classList.toggle('fw-beside', st.beside); bd.classList.toggle('fw-left', st.beside && side === 'left'); bd.classList.toggle('fw-right', st.beside && side === 'right');
    st.el.classList.toggle('beside', st.beside); FREEW.paintBeside(); FREEW.place(); if (!st.beside) FREEW.ghostOff();
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
    const how = sr ? 'Your words appear as you speak' : window.SIS_LAB && SIS_LAB.transcribe ? 'Your words are written by Transcribe when the recording stops' : desk ? 'Your words are written by the computer when the recording stops' : 'Your words are written when the recording reaches the computer';
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
      if (!fw.dict && r.state !== 'done' && r.file && window.SIS_LAB && SIS_LAB.transcribe) kids.push(B('wand', 'Transcribe', 'Write the recording’s words after yours (your own way: RM Settings → Speech to text)', () => { SIS_LAB.transcribe(st.id); toast('Transcribing — the words come after what you wrote'); }));
    }
    if (!r.state || r.state === 'new' || live) kids.push(h('span.fw-vs.fw-how', how));
    st.voice.replaceChildren(...kids);
  },
  /** A transcript arrived (Whisper, Transcribe) for the freewrite open now: its words on the page. */
  sync(id) { const st = FREEW.st; if (!st || st.id !== id) return; const b = M.block(id); if (!b) return; const v = (b.body && b.body.text) || ''; if (v !== st.ta.value) { const s = st.ta.selectionStart, e = st.ta.selectionEnd; st.ta.value = v; try { st.ta.setSelectionRange(s, e); } catch (x) { } FREEW.paint(); } FREEW.paintVoice(); },

  /* ---------------- closing and applying ---------------- */
  close(quiet) {
    const st = FREEW.st; if (!st) return; FREEW.chipOff(); FREEW.ghostOff(); FREEW.slashOff(); FREEW.listen(false); FREEW.stopPlay(); if (FREEW.mine()) REC.stop();
    FREEW.save(); clearInterval(FREEW._t); FREEW._t = null;
    document.removeEventListener('keydown', st.key); removeEventListener('resize', st.rs); if (st.ro) st.ro.disconnect(); closePop();
    const wasBeside = st.beside; st.el.remove(); FREEW.st = null;
    const bd = document.body; bd.classList.remove('fw-open', 'fw-beside', 'fw-left', 'fw-right');
    if (wasBeside) requestAnimationFrame(() => { try { App.panes().forEach(p => p.paper && p.paper.apply()); } catch (e) { } dispatchEvent(new Event('resize')); });
    const b = st.id && M.block(st.id);
    if (b && !(b.body.text || '').trim() && !(b.rec && b.rec.state && b.rec.state !== 'new') && !(b.fw && b.fw.made)) { EDIT.deleteBlocks([b.id], { quiet: true }); return; }
    if (b) { changed(); if (!quiet) toast('Saved in the note — Open on the freewrite’s card goes on with it', 3200); }
  },
  /** Apply: the parts as components and wires under the freewrite, which folds. One Undo. */
  apply() {
    const st = FREEW.st; if (!st) return; FREEW.save(); FREEW.ghostOff(); if (!st.shown) { st.shown = true; FREEW.setFw({ shown: true }); FREEW.paint(); }
    const conv0 = st.conv, bad = conv0 && conv0.parts.find(p => !p.none && p.flag);   // V4.55: a merged component with two kinds or two titles waits for you
    if (bad) { FREEW.flash(bad.key); toast('“' + snippet(bad.text, 40) + '” has ' + FREEW.flagText(bad) + ' since its sentences were merged — choose one first', 4200); const t = st.tg && st.tg.querySelector(`.fw-tag[data-k="${CSS.escape(bad.key)}"]`); if (t) FREEW.quick(bad.key, t); return; }
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
      else if (p.as === 'slot') { nb = M._newBlock(d, { kind: 'component', label: p.title || snippet(text, 80), ckind: p.kind || 'result', fwslot: 'result', x: pos.x, y: pos.y, w: 392, body: { text: '', marks: [] } }); if (p.format) nb.fwfmt = p.format; }   // V4.56: what its ＋ Add opens
      else if (p.as === 'bridge') nb = M._newBlock(d, { kind: 'component', label: 'Bridge from a note', fwslot: 'bridge', fwcands: (p.cands || []).slice(), x: pos.x, y: pos.y, w: 392, body: { text, marks: [] } });
      else { nb = M._newBlock(d, { kind: 'component', label: p.title || (p.ph && !text && p.struct && KIND[p.struct] ? KIND[p.struct].label : ''), x: pos.x, y: pos.y, w: 392, body: { text, marks: [] } }); if (p.kind) nb.ckind = p.kind;
        if (p.struct && KIND[p.struct] && text) { const it = M.createItem(p.struct, text, nb); nb.body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: text.length, ref: it.id }); nb.fwItem = it.id; }
        (p.marks || []).forEach(m => { const i = text.toLowerCase().indexOf(String(m.t).toLowerCase()); if (i < 0 || !KIND[m.s]) return; const w = text.slice(i, i + String(m.t).length), it = M.createItem(m.s, w, nb); nb.body.marks.push({ id: uid('m'), type: 'struct', from: i, to: i + w.length, ref: it.id }); }); }   // V4.53
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
    toast(fresh.length || nw ? 'In the note: ' + plural(fresh.length, 'component') + ' and ' + plural(nw, 'link') + ' — Take back on the freewrite (or Ctrl+Z) takes them out' : 'Nothing new to add — it is all in the note already', 4200);
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
  addTo(pane, b, btn, any) { const at = { x: b.x || 0, y: (b.y || 0) + (pane.boxH ? pane.boxH(b.id) : 140) + 28 }; FREEW.wait = { slot: b.id, doc: b.docId, until: Date.now() + 120000 };
    const F = !any && b.fwfmt && FREEW.FMT.find(f => f.id === b.fwfmt), row = F && INSERTS.find(x => x.id === F.ins), d = M.doc(b.docId); if (row && d && (!row.when || row.when(d))) { row.run(d, at, pane); return; }   // V4.56: the format said in the freewrite
    INSERT.menu(pane, btn, at); },
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
    const F = b.fwslot === 'result' && b.fwfmt && FREEW.FMT.find(f => f.id === b.fwfmt);   // V4.56
    if (b.fwslot === 'result') return h('div.fw-slotbar.nopan', h('span', (IX.wiresOf(b.id) || []).some(w => w.rel === 'illustrates' && w.to === b.id) ? 'Add more to this result' : F ? 'Add the result here: ' + F.d : 'Add the result here: an image panel, a table, a plot…'),
      h('button.btn.xs.fw-addf', { type: 'button', title: F ? 'Add ' + F.d + ', put under this result and wired to it' : 'Anything + Insert offers, put under this result and wired to it', on: { click: e => { e.stopPropagation(); FREEW.addTo(pane, M.block(b.id) || b, e.currentTarget); } } }, F ? '＋ ' + F.label : '＋ Add'),
      F ? h('button.btn.xs.ghost.fw-addany', { type: 'button', title: 'Anything else + Insert offers', on: { click: e => { e.stopPropagation(); FREEW.addTo(pane, M.block(b.id) || b, e.currentTarget, true); } } }, 'Other…') : null);
    if (b.fwslot === 'bridge') { const C = (b.fwcands || []).map(M.doc).filter(x => x && !x.deleted);
      return h('div.fw-slotbar.nopan', h('span', C.length ? 'Bridge from a note — its title shares these words:' : 'No note’s title shares these words yet —'),
        ...C.map(x => h('button.btn.xs.fw-cand', { type: 'button', title: M.docPath(x) + ' — choose its component(s) to bridge here', on: { click: e => { e.stopPropagation(); FREEW.bridgeFrom(b.id, x.id); } } }, snippet(x.title, 36))),
        h('button.btn.xs.ghost', { type: 'button', on: { click: async e => { e.stopPropagation(); const x = await BRIDGE.pickNote('Bridge from which note?', b.docId); if (x) FREEW.bridgeFrom(b.id, x.id); } } }, 'Another note…')); }
    return null;
  },

  /* ---------------- the freewrite's card in its note ---------------- */
  card(b, d, pane, ro) {
    const fw = b.fw || {}, text = (b.body && b.body.text) || '', n = (text.match(/\S+/g) || []).length, made = Object.values(fw.made || {}).filter(id => { const x = M.block(id); return x && x.status === 'live'; }).length;
    const conv = fw.shown ? FREEW.convert(text, { over: fw.over, lover: fw.lover, links: fw.links, merges: fw.merges, assoc: fw.assoc, plain: FREEW.opt('plain', 'run'), docId: b.docId }) : null;
    const go = () => FREEW.open(M.doc(b.docId), { block: b.id, pane });
    const r = b.rec || {}, has = r.state && r.state !== 'new' && r.state !== 'recording';
    const tx = h('div.fwc-tx' + (text ? '' : '.empty'), { title: ro ? '' : 'Double-click to open it', on: { dblclick: e => { if (ro) return; e.stopPropagation(); go(); } } }, text ? FREEW.spans(text, conv) : 'Nothing written yet.');
    return h('div.fwc',
      h('div.fwc-bar.nopan', h('span.fwc-st' + (fw.state === 'applied' ? '.ok' : ''), fw.state === 'applied' ? 'Applied ' + fmtStamp(fw.applied) + (made ? ' · ' + plural(made, 'component') : '') : 'Draft'), h('span.fwc-n', plural(n, 'word')),
        has ? h('button.btn.xs.fwc-play', { type: 'button', title: 'Play the recording', on: { click: e => { e.stopPropagation(); REC.toggle(M.block(b.id)); } } }, FREEW.ic('play', 13), REC.mmss(r.dur || 0)) : null,
        h('span.spacer'), ro || fw.state !== 'applied' || !made ? null : h('button.btn.xs.fw-tbk', { type: 'button', title: 'Take the ' + plural(made, 'component') + ' it made out of the note — it is a draft again (Ctrl+Z undoes this too)', on: { click: e => { e.stopPropagation(); FREEW.takeBack(b.id); } } }, 'Take back'),   // V4.47
        ro ? null : h('button.btn.xs.fw-open', { type: 'button', title: 'Open the page again and go on with it', on: { click: e => { e.stopPropagation(); go(); } } }, 'Open')),
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
    const pm = FREEW.opt('plain', 'run'), plainC = pm === 'component', live = FREEW.opt('colour', 'convert') === 'live', voice = FREEW.opt('voice', true) !== false, side = FREEW.opt('side', 'right'), fold = FREEW.opt('fold', true) !== false;
    const text = 'Stiffer gels raise traction, which supports the mechanosensing hypothesis. One of the barriers is bead drift at the edge. It grows over the first hour of imaging.';
    const conv = FREEW.convert(text, { plain: pm });
    return [h('div.fw-pv', h('div.fw-pvbar', h('span.fw-pvic', { html: FREEW.ICON }), h('b', 'Freewrite'), h('span', voice ? 'Speak: words appear as you speak' : 'Speak: words written when the recording stops'), h('span.spacer'), h('span.fw-pvside', side === 'left' ? '◧ beside, left' : 'beside, right ◨')),
      FREEW.opt('bar', true) !== false ? h('div.fw-pvtools', ['Placeholder ▾', 'Structure ▾', 'Format ▾'].map(t => h('span.fw-pvtool', t)), h('span', 'or type /')) : null,
      h('div.fw-pvt', FREEW.spans(text, conv)), FREEW.mini(conv, { width: 300 })),
      PV.cap((FREEW.opt('bar', true) !== false ? 'The bar above the page, or /, adds placeholders (/result, then /html in it). ' : 'Type / for placeholders (/result, then /html in it); no bar. ') + (live ? 'Coloured as you write. ' : 'Coloured when you press Convert, then as you correct. ') + 'Two components and a supports link; a barrier' + (pm === 'run' ? ', and the sentence after it stays in the barrier (it goes on describing it)' : plainC ? '; the sentence after it a component of its own' : '; the sentence after it stays words') + '. Apply puts them in the note' + (fold ? ' and the freewrite folds.' : '; the freewrite stays open.') + ' ' + plural(FREEW.rules().filter(r => r.on !== false).length, 'rule') + ' read the words (' + FREEW.store().own.length + ' of yours); Edit one below to see it at work here.')];
  },
};
WIDGETS.freewrite = { label: 'freewrite', w: 448, body: (b, d, pane, ro) => FREEW.card(b, d, pane, ro), menu: b => [b.fw && b.fw.state === 'applied' ? { label: 'Take back what it made', sub: 'Its components leave the note; it is a draft again', run: () => FREEW.takeBack(b.id) } : null, FREEW.on() ? { label: 'Open the freewrite', sub: 'The page again, to go on with it', run: () => FREEW.open(M.doc(b.docId), { block: b.id }) } : null].filter(Boolean) };
{
  // the placeholders' buttons, on their cards
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); try { if (el && b && b.fwslot && !this.travel) { const bar = FREEW.slotBar(b, this); if (bar) { const ch = $(':scope > .chips', el); ch ? ch.before(bar) : el.append(bar); } } } catch (e) { console.warn('[freewrite] slot', e); } return el; };
  // V4.47: a freewrite folded after Apply keeps Take back in its header (its card, where the button is, is folded away)
  const bx2 = DocView.box; DocView.box = function (b, d, p) { const el = bx2.apply(this, arguments); try { if (el && b && b.kind === 'freewrite' && b.collapsed && b.fw && b.fw.state === 'applied' && !this.travel) {
    const n = Object.values(b.fw.made || {}).filter(id => { const x = M.block(id); return x && x.status === 'live' && x.fwFrom === b.id; }).length, bh = $(':scope > .bh', el), sp = bh && $(':scope > .spacer', bh);
    if (n && sp && !$('.fw-tbk', bh)) sp.after(h('button.btn.xs.fw-tbk.nopan', { type: 'button', title: 'Take the ' + plural(n, 'component') + ' this freewrite made out of the note — it is a draft again (Ctrl+Z undoes this too)', on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); FREEW.takeBack(b.id); } } }, 'Take back')); } } catch (e) { console.warn('[freewrite]', e); } return el; };
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
  // V4.47: the preview in the note is drawn again after the note is (a redraw of its boxes)
  const rf = App.refresh; App.refresh = function () { const r = rf.apply(this, arguments); try { const st = FREEW.st; if (st && st.beside && st.conv && st.ghost !== false) requestAnimationFrame(() => { if (FREEW.st === st && !$('.fw-ghosts')) FREEW.ghostPaint(); }); } catch (e) { } return r; };
  // leaving for another note while the page is over the whole app: it goes with you no further — it is saved and closed
  window.addEventListener('hashchange', () => { const st = FREEW.st; if (st && !st.beside && !(location.hash || '').includes(st.docId)) FREEW.close(true); });
}
