/* ==========================================================================
   20a · Every feature, registered (V3.995 — see 02b-feat.js for the rules).
   Each FEAT.def says what the feature is, which presets have it, what it
   needs, its settings (new ones stored by FEAT, existing ones bound to their
   old settings() key with get / set) and its live preview, drawn with PV.
   Below the list, the guards: what switching a feature off takes away —
   wrapped around the feature's own code here, or CSS under body.f-off-<id>
   (24-kinds.css), so the modules themselves stay as they were.
   A new feature is not finished until it is here, with a preview that
   follows its settings (Gabe, 14 Nov 2026; FEAT.audit()) — and, since V4.12,
   until its page has a demonstration: what it is for in Gabe's words and a
   recording of it used in a test note (20b-demos.js, demokit/record.mjs;
   FEAT.undemoed() lists the ones still without).
   ========================================================================== */
/* ---------- PV: the pieces previews are drawn with (24-kinds.css .fpv) ---------- */
const PV = {
  zoom: 100,
  /** A component as it looks on a note: { label, num, kind, body, stamp, chips, cls, head, extra, style }. */
  box(o = {}) {
    return h('div.pvb' + (o.cls ? '.' + o.cls : ''), { style: Object.assign(o.kind ? { '--kc': `var(--k-${o.kind})` } : {}, o.style || {}) },
      h('div.pvb-h', o.num ? h('span.pvb-n', o.num) : null, o.label ? h('b', o.label) : null, ...(o.head || []), h('span.sp'), o.stamp ? h('span.pvb-st', o.stamp) : null),
      o.body != null ? h('div.pvb-tx', o.body) : null, o.chips && o.chips.filter(Boolean).length ? h('div.pvb-ch', o.chips) : null, ...(o.extra || []));
  },
  chip: (t, cls) => h('span.pvc' + (cls ? '.' + cls : ''), t),
  cap: t => h('div.fpv-cap', t),
  st: (k, t) => h('span.st.st-' + k, t),
  /** A row of things side by side; a stage where children sit where they're put. */
  row: (...k) => h('div.pv-row', k),
  abs: (hgt, ...k) => h('div.pv-abs', { style: { height: hgt + 'px' } }, k),
  at(x, y, w, el) { Object.assign(el.style, { position: 'absolute', left: typeof x === 'number' ? x + 'px' : x, top: y + 'px' }); if (w) el.style.width = typeof w === 'number' ? w + 'px' : w; return el; },
  svg: (w, hgt, inner) => h('div.pv-svg', { html: `<svg viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>` }),
  /** The app's tabs as a row (what is off leaves it). */
  tabs(extra) { return h('div.pv-tabs', TABS.filter(([k]) => FEAT.tabOn(k) && (k !== 'canvas' || CANVAS.on())).map(([k, l]) => h('span' + (k === extra ? '.on' : ''), l))); },
  /** A note in the current theme: Look & feel. */
  sample() {
    return h('div', { style: { display: 'grid', gap: '8px' } }, PV.tabs('portfolio'),
      PV.box({ num: 'Step 2', label: 'Run 3', kind: 'claim', stamp: '13 Nov 20:11', body: ['The edge ', PV.st('claim', 'collapsed at 10 ng/mL'), ' in every field of the ', h('span.term-demo', '30 kPa gel'), '.'], chips: [PV.chip('today'), PV.chip('◷ 12:04', 'teal')] }),
      PV.box({ num: 'Block', label: 'Seeding', body: 'Seed at 40k/cm² on the 30 kPa gels; wait 4 h before imaging.' }));
  },
};
{
  const B = (key, after) => ({ get: () => settings()[key], set: v => { saveSettings({ [key]: v }); if (after) after(v); } });
  const T = (key, label, type, o = {}) => Object.assign({ key, label, type }, o);
  const tune = (id, key) => FEAT.tune(id, key);
  const on = id => FEAT.on(id);
  const run3 = (o = {}) => PV.box(Object.assign({ num: 'Step 2', label: 'Run 3', kind: 'claim', stamp: '13 Nov 2026 20:11', body: ['The edge ', PV.st('claim', 'collapsed at 10 ng/mL'), ' in every field.'] }, o));
  const D = FEAT.def;

  /* =============================== Canvas & notes =============================== */
  D({ id: 'writing', group: 'canvas', core: true, label: 'Writing in components', desc: 'Components and their text: the notebook itself. Typing replacements turn what you type into the symbols scientists write; where pasted and inserted things land; and gravity — what a component pushed out of its way comes back when it shrinks.',
    tune: [T('land', 'Pasted and inserted things land', 'seg', { isNew: true, def: 'centre', opts: [['centre', 'At the centre of the view, on top'], ['room', 'Where the pointer was, making room']], d: 'A pasted component, a PDF, an HTML file…: at the centre, over what is there, until you move it' }),
      T('gravity', 'What a component pushed comes back when it shrinks', 'switch', { isNew: true, def: true, d: 'Fold it, close its earlier versions, or empty it: what it pushed down (or a region pushed aside) comes back by as much. What you moved since stays.' }),T('replace', 'Typing replacements', 'node', { d: 'Backspace right after a replacement undoes it', render: () => h('div.st-checks', [['arrows', 'Arrows', '--> → · <-- ← · <-> ↔ · => ⇒'], ['science', 'Science symbols', '+- ± · >= ≥ · <= ≤ · != ≠ · ~= ≈ · 37 deg → 37° · 5 uL → 5 µL · 3x4 → 3×4'], ['scripts', 'Super- and subscripts', '^2 → ² · ^-1 → ⁻¹ · CO_2 → CO₂'], ['typo', 'Dashes and quotes', '-- → – · --- → — · ... → … · “curly” ‘quotes’']].map(([k, l, ex]) =>
      h('label.st-check', h('input', { type: 'checkbox', checked: (settings().autoReplace || {})[k] !== false, on: { change: e => { saveSettings({ autoReplace: Object.assign({}, settings().autoReplace, { [k]: e.target.checked }) }); SettingsView.repaint(); } } }), h('span', h('b', l), h('div.st-th', ex))))) })],
    preview: () => { const r = settings().autoReplace || {}, x = (k, a, b) => r[k] !== false ? b : a;
      const centre = tune('writing', 'land') !== 'room', grav = tune('writing', 'gravity') !== false;
      return [PV.box({ num: 'Block', label: 'Gels', body: ['Batch 14 ', x('arrows', '-->', '→'), ' stiffer: 30 kPa ', x('science', '+-', '±'), ' 2, at 37', x('science', ' deg', '°'), ', 5 ', x('science', 'uL', 'µL'), ' beads, CO', x('scripts', '_2', '₂'), ' 5 % ', x('typo', '--', '–'), ' as planned', x('typo', '...', '…')] }),
        h('div.pv-land' + (centre ? '.centre' : ''), h('div.pv-view', h('span.k', 'the view'), h('i.c')), PV.box({ num: 'Block', label: 'Run 3', body: 'The edge collapsed.', cls: 'pv-under' }), PV.box({ num: 'Pasted', label: 'Seeding', body: 'Seed at 40k/cm².', cls: 'pv-pasted' })),
        h('div.pv-grav' + (grav ? '.on' : ''), h('div.pv-gA', PV.box({ num: 'Block', label: 'Edge', body: grav ? 'Folded — it shrank.' : 'Folded.' })), h('div.pv-gB', PV.box({ num: 'Block', label: 'Gels', body: grav ? 'Back up where it was.' : 'Still where it was pushed.' })), grav ? h('span.pv-up', '↑') : null),
        PV.cap((centre ? 'Pasted and inserted: at the centre of the view, on top of what is there. ' : 'Pasted and inserted: where the pointer was, making room. ') + (grav ? 'Gravity: what a component pushed comes back when it shrinks.' : 'Gravity off: pushed components stay where they went.'))]; } });

  D({ id: 'editbar', group: 'canvas', label: 'Editing bar', presets: { simple: true }, desc: 'The bar over the component you are writing in: bold, lists, Make it…, ∑ symbols, your quick symbols and the extras behind +. It places itself where you are in the note, so its position isn’t a setting; its size is.',
    tune: [T('size', 'Starting size', 'size', { isNew: true, def: { mode: 'fixed', fixed: 100, from: 85, to: 130, z0: 50, z1: 200 }, d: 'Fixed, or eased between two sizes as you zoom: smaller zoomed out, larger zoomed in. The zoom slider under the preview shows it.' }),
      T('more', 'Buttons and favourite symbols', 'node', { render: () => { const n = EBAR.settingsUI(); const hd = $(':scope > h3', n); if (hd) hd.remove(); return n; } })],
    preview: () => {
      const bar = h('div.pv-ebar', ['B', 'I', 'U', '|', '•', '1.', '☐', '|', '◆', '∑', ...(EBAR.cfg().symQuick || []).slice(0, 4), '+'].map(x => x === '|' ? h('i.sep') : h('i', x)));
      const lab = h('span', PV.zoom + '%'), put = () => { bar.style.transform = 'scale(' + FEAT.size('editbar', 'size', PV.zoom / 100) + ')'; lab.textContent = PV.zoom + '% zoom · bar at ' + Math.round(FEAT.size('editbar', 'size', PV.zoom / 100) * 100) + '%'; };
      put();
      return [h('div.pv-ebwrap', bar), run3({ stamp: null }),
        h('label.pv-zoom', 'zoom', h('input', { type: 'range', min: 10, max: 300, step: 5, value: PV.zoom, 'aria-label': 'The note’s zoom, for the bar’s size', on: { input: e => { PV.zoom = +e.target.value; put(); } } }), lab)]; } });

  D({ id: 'slash', group: 'canvas', label: 'Slash commands', presets: { simple: true }, desc: '/ at the start of a word opens the commands that act on the text and every + Insert row; @ names a person. Your own commands (macros) are in Keys & commands.',
    preview: () => [PV.box({ num: 'Block', label: 'Notes', body: ['The edge held at 2 ng/mL ', h('span.pv-caret', '/cl') ] }),
      h('div.pv-menu', [['/claim', 'mark the sentence as a claim'], ['/cite', 'a citation from the Library'], ['/clear-format', 'plain text again']].map(([a, b], i) => h('div' + (i ? '' : '.on'), h('b', a), h('span', b))))] });

  D({ id: 'wires', group: 'canvas', label: 'Connections', desc: 'Lines between components, each relation in its own colour, routed the shortest way round what is in between, with chips for connections to other notes and suggestions from recent notes.',
    tune: [T('infer', 'Suggest connections from the last', 'range', Object.assign({ min: 7, max: 90, unit: ' days' }, B('inferWindowDays', () => changed())))],
    preview: () => [PV.abs(150, PV.at(0, 0, '46%', run3({ stamp: null, body: 'The edge collapsed.' })), PV.at('54%', 70, '46%', PV.box({ num: 'Block', label: 'Gels', body: 'Batch 14 is stiffer.' })),
      PV.at(0, 0, '100%', PV.svg(300, 150, '<path d="M138 40 H150 Q160 40 160 50 V95 Q160 105 170 105 H162" fill="none" stroke="var(--mag)" stroke-width="1.6" vector-effect="non-scaling-stroke"/><text x="166" y="66" font-size="9" fill="var(--mag)" font-family="IBM Plex Mono, monospace">follows</text>'))),
      PV.cap('Suggestions come from notes of the last ' + tune('wires', 'infer') + ' days.')] });

  D({ id: 'regions', group: 'canvas', label: 'Regions', desc: 'Frames that group components: drawn with a right-drag loop, snapped to their members, named and coloured, nested, folded into their title, connected and bridged like a component. Unfolding one moves the regions it would cover to the side, each whole; folding it brings them back by as much. Off: no new ones are drawn and open frames are hidden; folded ones stay so nothing inside is lost.',
    tune: [T('push', 'Unfolding moves the other regions to the side, whole', 'switch', { isNew: true, def: true, d: 'Right of its middle to the right, left of it to the left, and what those push in turn; folding it brings them back by as much (with gravity on). Off: the boxes in its way are pushed one by one, as before.' })],
    preview: () => { const push = tune('regions', 'push') !== false;
      return [h('div.pv-rgrow' + (push ? '.push' : ''), h('div.pv-region', h('span', 'Gels ▾'), run3({ stamp: null, body: 'The edge collapsed.' }), PV.box({ num: 'Block', label: 'Batch 14', body: 'Stiffer than 13.' })),
        h('div.pv-region.pv-other', h('span', 'Imaging'), PV.box({ num: 'Block', label: 'Focus', body: 'Lock at 40×.' }))), PV.cap(push ? 'Unfolded, “Gels” moves “Imaging” to the side, whole; folded, it comes back by as much.' : 'Unfolded, “Gels” pushes the boxes in its way one by one, down or right.')]; } });

  D({ id: 'lineage', group: 'canvas', label: 'Earlier versions', desc: '“▸ 2 earlier versions” under a revised component, with the structures still on the old wording; open it to read them.',
    tune: [T('depth', 'Generations shown', 'range', Object.assign({ min: 1, max: 10 }, B('lineageDepth', () => changed())))],
    preview: () => { const n = tune('lineage', 'depth'); return [run3({ stamp: null, extra: [h('div.pv-ghostbar', '▾ 4 earlier versions · 1 structure still on the old wording'),
      h('div.pv-ghosts', [1, 2, 3, 4].filter(i => i <= n).map(i => h('div', h('span', 'generation ' + i), ['The edge broke at 10 ng/mL.', 'The edge broke at high EGF.', 'Edge unstable.', 'Edge?'][i - 1])), n < 4 ? h('div.muted', (4 - n) + ' older consolidated') : null)] })]; } });

  D({ id: 'synthesis', group: 'canvas', label: 'Synthesis box', desc: '“What this note adds up to”: the box at the top of a note for the one or two sentences you would tell your advisor. Off: an empty box is hidden; one you wrote in stays.',
    preview: () => [h('div.pv-synth', h('div.pvb-h', h('span.pvb-n', 'Synthesis'), h('span.sp'), h('span.pvb-st', 'what this note adds up to')), h('div.pvb-tx.muted', 'What this note adds up to — one or two sentences you would tell your advisor…')), run3({ stamp: null })] });

  D({ id: 'synthflag', group: 'canvas', label: 'Flag for synthesis', desc: 'Bring something into a Synthesis note: right-click a component → Flag for synthesis (the whole component); select words and Ctrl+Enter → F (a live excerpt of them); or select components and type /synthesize. With more than one Synthesis to go to, it asks which. Only the thing itself comes in — no extra component saying what it is.',
    preview: () => [PV.box({ num: 'Block', label: 'Edge', body: ['The edge ', h('span.pv-selw', 'held at 2 ng/mL'), ' but collapsed at 10.'] }),
      h('div.pv-strip', h('span', 'Claim ', h('u', 'C')), h('span', 'Result ', h('u', 'R')), h('span', 'Term ', h('u', 'W')), h('span.on', 'Flag for synthesis ', h('u', 'F'))),
      h('div.pv-synthnote', h('b', 'Synthesis — 30 kPa series'), h('div.pvb.pv-bridge', h('div.refbody', h('div.origin.or-passage', h('div.or-top', h('span.or-k', '⇄ Passage from'), h('a.or-note', 'Run 3'), h('span.or-cmp', 'Edge'))), h('div.serif', { style: { fontSize: '13px', paddingBottom: '6px' } }, 'held at 2 ng/mL')))),
      PV.cap('Words: Ctrl+Enter → F. A whole component: right-click, or select and /synthesize.')] });

  // V4.15 (13c): + Experiment asks the name and can continue a series; one name for every note of an experiment
  D({ id: 'expseries', group: 'canvas', label: 'Experiment series', isNew: true, presets: { simple: true },
    desc: '+ Experiment asks the experiment’s name, and can continue a series of its theme: pick “30 kPa series Run 2” and it is named “30 kPa series Run 3”. Every note of an experiment carries its name alone — the stage is its chip and the strip, not part of the title — and renaming one renames them all. A series’ runs share one Synthesis. Off: no series to continue (the name is still asked); series already made stay.',
    preview: () => { const on = FEAT.on('expseries');
      return [h('div.pv-xs', h('div.pv-xs-h', 'New experiment'),
        on ? h('div.pv-xs-f', h('span', 'Continue a series'), h('div.pv-xs-sel', '30 kPa series Run 2 · 2 runs', h('i', '▾'))) : null,
        h('div.pv-xs-f', h('span', 'Name'), h('div.pv-xs-in', on ? '30 kPa series Run 3' : '30 kPa series'))),
        h('div.pv-xs-notes', ['Planning', 'Run', 'Analysis'].map(s => h('div.pv-xs-n', h('span.pv-xs-st', s), h('b', on ? '30 kPa series Run 3' : '30 kPa series')))),
        PV.cap(on ? 'Picking a series names the next run; its three notes all carry the name, each stage as its chip.' : 'Off: the name is asked, with no series to continue; each note still carries the name alone.')]; } });

  // V4.16 (15e): one Synthesis per series; Syntheses in the Portfolio; a note's synthesis in its first block and under its row
  D({ id: 'synthnotes', group: 'canvas', label: 'Synthesis notes', isNew: true, presets: { simple: true },
    desc: 'A series’ runs share one Synthesis note: Next from Run 3’s Analysis opens the one the series has and adds Run 3 to what it gathers. Synthesis notes have their own place in the Portfolio — Syntheses, above Notes in each theme, and a choice in its switch. A note’s “what this note adds up to” sits in its first block and moves with it, and its words show under the note’s row in the Portfolio. Off: each run makes its own Synthesis, a Synthesis stays in its experiment’s row, and the box floats on its own.',
    tune: [T('legend', 'Under each note in the Portfolio, what it adds up to', 'switch', { isNew: true, def: true, d: 'The Portfolio has the same switch beside its own — Syntheses under notes', changed: () => { try { if (App.route && App.route.name === 'portfolio') App.refresh(); } catch (e) { } } })],
    preview: () => { const on = FEAT.on('synthnotes'), leg = on && FEAT.tune('synthnotes', 'legend') !== false;
      const note = (t, l) => h('div.pv-sn-n', h('div', t), leg && l ? h('div.pv-sn-leg', l) : null);
      return [h('div.pv-sn',
        h('div.pv-sn-head', h('div.pvb-h', h('span.pvb-n', 'Run'), h('span.sp'), h('span.pvb-st', 'Mon 16 Nov')), h('div.pv-sn-f', 'Title · 30 kPa series Run 3'),
          on ? h('div.pv-sn-syn', h('b', 'Synthesis'), ' — the edge held at 2 ng/mL, not at 10') : null),
        on ? null : h('div.pv-sn-float', h('b', 'Synthesis'), ' — on its own, beside the note'),
        h('div.pv-sn-pf',
          h('div.pv-sn-col', h('div.pv-sn-gl', 'Experiments'), h('div.pv-sn-n', '▸ 30 kPa series Run 3' + (on ? '' : ' · Synthesis'))),
          h('div.pv-sn-col', on ? [h('div.pv-sn-gl', 'Syntheses'), note('30 kPa series — Runs 2 and 3', 'Stiffer gels hold the edge longer')] : null,
            h('div.pv-sn-gl', 'Notes'), note('Bench log', 'Fibronectin helped at 2 ng/mL')))),
        PV.cap(!on ? 'Off: each run its own Synthesis, kept in its experiment; the box floats beside the note.' : leg ? 'Runs 2 and 3 share one Synthesis, listed under Syntheses; each note’s synthesis shows under it.' : 'Runs 2 and 3 share one Synthesis; the lines under the notes are off.')]; } });

  D({ id: 'stamps', group: 'canvas', label: 'Times on components', desc: 'When each component happened, in its header, with its place in the timer. Off: shown only when you point at the component.',
    preview: () => [run3({ stamp: on('stamps') ? '13 Nov 2026 20:11 · +12:04' : null }), on('stamps') ? null : PV.cap('Point at a component to see its time.')] });

  D({ id: 'daychips', group: 'canvas', label: 'Day chips', desc: 'The chips that place a component in the day: “today”, “yesterday”, the day note it was filed from.',
    preview: () => [run3({ stamp: null, chips: [PV.chip('today'), PV.chip('filed from Fri 13 Nov')] })] });

  D({ id: 'hover', group: 'canvas', label: 'Hover cards', presets: { simple: true }, desc: 'Pointing at a structure, a term or a link shows what it is, where it was recorded and what to do with it.',
    preview: () => [run3({ stamp: null }), h('div.pv-hcard', h('div', h('span.kchip', { style: { '--kc': 'var(--k-claim)' } }, 'Claim'), ' open'), h('div.serif', 'collapsed at 10 ng/mL'), h('div.pv-hcf', 'Run 3 · today 20:11 · Alt+click for actions'))] });

  D({ id: 'hints', group: 'canvas', label: 'Help lines', desc: 'The one-line tips at the foot of a note and in empty places. Closing one with its × switches this off.',
    get: () => !settings().hintOff, set: v => saveSettings({ hintOff: !v }),
    preview: () => [run3({ stamp: null }), h('div.pv-hint', 'Select words and press ' + keyLabel(settings().structKey) + ' to give them a meaning · Shift+drag moves by grid cells', h('span', '×'))] });

  D({ id: 'split', group: 'canvas', label: 'Split panes', desc: '◫ Split on a note: side by side, or a quadrant of up to four notes. Opening a link beside a note (Alt+click) still works when this is off.',
    preview: () => [h('div.pv-split', h('div', h('b', '30 kPa series'), run3({ stamp: null, body: 'The edge collapsed.' })), h('div', h('b', 'Seeding density notes'), PV.box({ num: 'Block', label: 'Seeding', body: 'Seed at 40k/cm².' })))] });

  D({ id: 'focus', group: 'canvas', label: 'Focus sessions', desc: '◎ asks how long, then puts the app in full screen with the keyboard locked to it and a frame round the screen until the time is up.',
    preview: () => [h('div.pv-focus', h('div.pv-focus-t', '◎ 38:12 left'), run3({ stamp: null }))] });

  /* =============================== Pen & touch =============================== */
  D({ id: 'ink', group: 'pen', label: 'Ink & shapes', desc: 'Writing on the paper with a pen (or the mouse): pen, highlighter, eraser and lasso in the ink bar; strokes written close together gather into one ink component. Off: the ink tools leave; ink already written stays.',
    preview: () => [h('div.pv-ink', PV.svg(300, 90, '<path d="M20 60 q 14 -34 28 0 t 28 0 t 28 0" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M130 30 l 40 40 M170 30 l -40 40" stroke="var(--k-barrier, #c92a2a)" stroke-width="2" stroke-linecap="round"/><rect x="195" y="22" width="90" height="16" rx="3" fill="color-mix(in srgb, #f2c94c 55%, transparent)"/><text x="200" y="34" font-size="11" font-family="Source Serif 4, serif" fill="var(--ink)">highlighted</text>'), h('div.pv-inkbar', ['✎ Pen', 'Highlighter', 'Eraser', 'Lasso'].map((x, i) => h('span' + (i ? '' : '.on'), x))))] });

  D({ id: 'pen', group: 'pen', core: true, label: 'Pen & touch shortcuts', desc: 'What the pen’s buttons, taps and gestures do. Today: the Slim Pen’s button switches to the pen and between its modes; the barrel button lassoes (in pen mode) or loops a region; the pen’s back erases; two fingers tapped undo, three redo; a right-drag loop makes a region; P pans. Choosing a different action for each comes in a later version.',
    tune: window.SIS_DESKTOP ? [T('button', 'The Slim Pen’s button (this computer)', 'node', { render: () => { const n = HANDS.settingsUI(); $$(':scope > .sec, :scope > .sec-h', n).forEach(x => x.remove()); return n; } })] : [],
    preview: () => [h('div.pv-pen', [['Slim Pen’s button', 'Pen ↔ the other mode'], ['Barrel button, drawing', 'Lasso'], ['Barrel button, out of pen mode', 'Make a region'], ['The pen’s back', 'Eraser'], ['Two fingers tapped', 'Undo'], ['Three fingers tapped', 'Redo'], ['Right-drag loop', 'Make a region'], ['P', 'Pan']].map(([a, b]) => h('div', h('span', a), h('b', b))))] });

  D({ id: 'edgepan', group: 'pen', label: 'Edge pan in full screen', desc: 'In Move, in full screen, resting the pointer at the screen’s very edge pans the note that way, faster the further you push.',
    preview: () => [h('div.pv-edge', h('span.l', '‹‹'), run3({ stamp: null, body: 'The edge collapsed.' }), h('span.r', '››'))] });

  /* V4.20 — the lab's pills in every build (lab-mode.js §11; vendor/lab-pills.js + 99z-pills.js where the lab layer isn't) */
  D({ id: 'pills', group: 'pen', label: 'Pills', isNew: true, presets: { simple: true }, desc: 'Four round buttons on every note that you drag anywhere: ✎ the hand (zoom, move, pen, highlighter, lasso, and a cog for the pen’s colours and widths), ＋ the Quick cast (Pull in, Flag and Label, then what you add most — it takes the bottom bar’s place), ✦ tools (timer, head start, calculator, equation, split, full screen) and ⊕ zoom (in, 100 %, out, fit). A wheel left open rolls into a row; drop a pill against an edge and its row turns into a column. The layout is yours, the same in every note and on every computer. Off: no pills — the bottom bar and the row of buttons at the top right come back.',
    changed: v => { try { PILLS.changed(v); } catch (e) { } },
    preview: () => {
      const on = FEAT.on('pills'), pill = (g, cls, extra) => h('span.pv-pill' + (cls ? '.' + cls : ''), g, extra || null);
      const note = h('div.pv-pills' + (on ? '' : '.off'), run3({ stamp: null, body: 'Seed at 40k/cm² on the 30 kPa gels.' }),
        on ? [pill('⊕', 'tl', h('i', '100%')), pill('✦', 'tr'), pill('＋', 'bc'), pill('✎', 'br')]
          : [h('span.pv-ctools', ['◫', '◷', '∑', '∫'].map(g => h('b', g))), h('span.pv-dockbar', ['＋ Insert', '⇣ Pull in', '⚐'].map(g => h('b', g)))]);
      return [note, PV.cap(on ? 'Drag a pill anywhere; a wheel left open rolls into a row, and the ＋ Quick cast stands where the bottom bar was.' : 'Off: the bottom bar and the buttons at the top right, as before.')];
    } });

  /* V4.21 — Rotate: the whole app a quarter turn clockwise at a time (13zzz ROTATE; ⊕'s Rotate in lab-mode §11 and the cut) */
  D({ id: 'rotate', group: 'pen', label: 'Rotate the app', isNew: true, presets: { simple: true }, desc: 'Rotate in the ⊕ zoom pill (and /rotate) turns the whole app 90° clockwise; each tap turns it 90° more, and the fourth puts it upright again — for a tablet or a screen held the other way. Kept on this device. The pen, the canvas, menus and selections all follow the turn. Esc three times, /rotate reset or Upright here puts it back. Off: upright, and no Rotate.',
    changed: () => ROTATE.sync(),
    tune: [T('turn', 'On this device, the app is', 'seg', { isNew: true, def: '0', opts: [['0', 'Upright'], ['90', '90°'], ['180', '180°'], ['270', '270°']], d: 'Clockwise, as Rotate turns it',
      get: () => String(ROTATE.stored()), set: v => ROTATE.set(+v, true) })],
    preview: () => {
      const v = FEAT.on('rotate') ? ROTATE.stored() : 0;
      return [h('div.pv-rot', h('div.pv-rot-scr', h('span.pv-rot-dir', v ? v + '° ↻' : 'upright'), h('div.pv-rot-app', { style: { transform: 'rotate(' + v + 'deg)' } }, h('i'), h('b')))),
        PV.cap(v ? ROTATE.name(v) + ' — the app’s top is at the screen’s ' + ({ 90: 'right', 180: 'bottom', 270: 'left' }[v]) + '. Rotate turns it 90° more; Esc three times puts it upright.' : 'Upright. Rotate in the ⊕ zoom pill (or /rotate) turns the whole app 90° clockwise.')];
    } });

  /* =============================== Structures =============================== */
  D({ id: 'structures', group: 'structures', core: true, label: 'Structures', desc: 'Selected words given a meaning: claim, barrier, question and the rest, each in its colour and style, with a status where it has one. Your own kinds of component are here too.',
    tune: [T('key', 'Key', 'seg', Object.assign({ opts: [['ctrl+enter', 'Ctrl+Enter'], ['alt+enter', 'Alt+Enter'], ['ctrl+shift+enter', 'Ctrl+Shift+Enter']] }, B('structKey'))),
      T('classify', 'Classify', 'seg', Object.assign({ opts: [['mark', 'On marking'], ['review', 'In review']], d: 'Mark now as a takeaway and sort it later, in review' }, B('classifyOn'))),
      T('kinds', 'Colour and style per kind', 'node', { d: 'Text colour keeps the page calm; highlight makes a kind impossible to miss', render: () => SettingsView.kindsUI() }),
      T('ckinds', 'Kinds of component', 'node', { render: () => { const n = CKINDS.settingsUI(); $$(':scope > .sec, :scope > .sec-h', n).forEach(x => x.remove()); return n; } })],
    preview: () => [h('div.pv-kinds', KINDS.slice(0, 8).map(k => h('div', h('kbd', k.key.toUpperCase()), PV.st(k.id, k.label.toLowerCase() + ' — ' + ({ claim: 'collapsed at 10 ng/mL', barrier: 'gels tear above 40 kPa', question: 'is batch 14 too stiff?', evidence: '3 of 3 fields', result: 'traction 1.2 kPa' }[k.id] || 'as marked'))))),
      PV.cap('Select words, press ' + keyLabel(settings().structKey) + ', then the letter.')] });

  // V4.4 (13zzy): a PDF or a saved web page can be a Report; what is snipped out of one lands as a Result
  D({ id: 'reports', group: 'structures', label: 'Reports', isNew: true, desc: 'A PDF or a saved web page can be a Report — a kind only those can be (double-click the tag left of its name, or ⋯ → What kind is this…). A figure snipped out of a report is a Result the moment it lands, and an image panel that is a Result counts as one, like a Result component. Off: no Report is offered and snips stay plain; what you labelled keeps its kind.',
    tune: [T('snips', 'A figure snipped from a report', 'seg', { isNew: true, def: 'result', opts: [['result', 'Becomes a Result'], ['plain', 'Stays plain']], d: 'The scissors on a PDF, the snip on a web page' })],
    preview: () => {
      const res = FEAT.tune('reports', 'snips') !== 'plain', kc = (id, fb) => { const K = typeof CKINDS !== 'undefined' && CKINDS.get(id); return (K && K.color) || fb; };
      const hd = (label, c) => ({ style: { borderTop: '2px solid ' + c }, num: label });
      return [h('div.pv-rep', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' } },
        PV.box(Object.assign(hd('Report', kc('report', '#46607A')), { label: 'Traction maps · Style 2014.pdf', body: h('div', { style: { height: '46px', borderRadius: '4px', background: 'linear-gradient(135deg, color-mix(in srgb, var(--ink) 8%, transparent), transparent)' } }), cls: 'pv-rep-r' })),
        h('span', { style: { alignSelf: 'center', color: 'var(--ink-3)' } }, '✂ →'),
        PV.box(Object.assign(hd(res ? 'Result' : 'Image panel', res ? kc('result', '#1E5E8C') : 'var(--rule-2)'), { label: 'Figure 2', body: h('div', { style: { height: '46px', width: '120px', borderRadius: '4px', background: 'radial-gradient(circle at 35% 40%, #f5a524, #5b2a86 70%)' } }) }))),
        PV.cap(res ? 'Snipped out of a report: a Result, and counted as one.' : 'Snipped out of a report: a plain image panel.')];
    } });

  // V4.14 (13zzyb), renamed in V4.24: the Challenge kind — a barrier in the literature, cited by its paper(s), never counted as a barrier towards your project
  D({ id: 'challenges', group: 'structures', label: 'Challenges', isNew: true, desc: 'A component can be a Challenge: a barrier in the literature, with room for improvement or a solution (double-click the label left of its title). It must be cited by the paper(s) that show it — until then its header says “cite a paper”. A Challenge is never counted as a barrier towards your project, and neither is a barrier you mark inside one. Off: Challenge is not offered and the reminder goes; what you labelled keeps its kind.',
    tune: [T('cite', 'What counts as its citation', 'seg', { isNew: true, def: 'any', opts: [['any', 'A cite, a quote or a wire'], ['text', 'A cite in its text']], d: 'A cite of a Library paper in its text; or also a quote from a PDF and a wire to a paper', changed: () => { try { App.refresh(); } catch (e) { } } })],
    changed: () => { try { App.refresh(); } catch (e) { } },
    preview: () => {
      const on = FEAT.on('challenges'), any = FEAT.tune('challenges', 'cite') !== 'text', c = typeof CHALLENGE !== 'undefined' ? CHALLENGE.COLOR : '#7D7A16';
      const chip = () => { const s = h('span.cg-cite'); s.innerHTML = typeof CHALLENGE !== 'undefined' ? CHALLENGE.ICON : ''; s.append('cite a paper'); return s; };
      return [h('div.pv-cg', { style: { display: 'grid', gap: '8px' } },
        PV.box({ num: on ? 'Challenge' : 'Block', label: 'Traction maps blur at the cell edge', style: on ? { '--kc': c } : {}, head: [], body: ['Displacement fields lose resolution within 2 µm of the edge ', h('span.pv-cite', '(Style 2014)'), '.'] }),
        PV.box({ num: on ? 'Challenge' : 'Block', label: 'No standard for gel stiffness checks', style: on ? { '--kc': c, borderLeftStyle: 'dashed' } : {}, head: on ? [chip()] : [], body: any ? 'Labs measure their gels in different ways (no citation yet).' : 'A quote from a PDF, without a cite in its text.' }),
        h('div.pv-cgn', h('span', 'Open barriers in the project: 0'), h('span', '·'), h('span', on ? 'Challenges are the literature’s, not yours' : 'Challenge is not offered'))),
        PV.cap(!on ? 'Off: Challenge is not offered; a Challenge you made keeps its kind.' : any ? 'Cited by a cite, a quote from a PDF or a wire to a paper. The second one needs its paper.' : 'Only a cite written in its own text counts.')];
    } });

  // V4.5 (14g): any component can also be a reference — /reference finds it from any note; the Atlas lists them (and the Reports)
  D({ id: 'references', group: 'structures', label: 'References', isNew: true, desc: 'Any component can also be a reference, beside whatever kind it is: a bookmark on its card. /reference opens a gallery of them over the note — search, filters, a preview — and Enter puts one in the note, live, pointing back to where it lives. The Atlas gains a References tab (gallery or list) and, with Reports on, a Reports tab. Off: no bookmark, no gallery, no tabs; what you marked stays marked.',
    tune: [T('enter', 'Enter in the gallery', 'seg', { isNew: true, def: 'insert', opts: [['insert', 'Puts it in the note'], ['open', 'Opens where it lives']], d: 'Alt+Enter does the other' }),
      T('scope', 'The gallery shows first', 'seg', { isNew: true, def: 'project', opts: [['project', 'The note’s project'], ['all', 'Everything, newest first']] }),
      T('type', 'The gallery opens on', 'seg', { isNew: true, def: 'all', opts: [['all', 'All'], ['text', 'Text'], ['figure', 'Figures'], ['table', 'Tables'], ['equation', 'Equations']] }),
      T('show', 'The Atlas’s References tab shows', 'seg', { isNew: true, def: 'cards', opts: [['cards', 'A gallery'], ['list', 'A list']] })],
    preview: () => {
      const ins = FEAT.tune('references', 'enter') !== 'open', list = FEAT.tune('references', 'show') === 'list', ty = FEAT.tune('references', 'type') || 'all';
      const rib = h('span', { style: { position: 'absolute', top: '-1px', right: '10px', width: '10px', height: '14px', background: 'var(--ink)', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 76%,0 100%)' } });
      const card = (k, label, body, typ) => h('div', { style: { position: 'relative', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: '8px', padding: '7px 9px', display: 'grid', gap: '4px', opacity: ty === 'all' || ty === typ ? '1' : '.35' } },
        h('span', { style: { font: '600 8.5px var(--f-m)', letterSpacing: '.08em', textTransform: 'uppercase', color: k ? `var(--k-${k}, var(--ink-3))` : 'var(--ink-3)' } }, k ? k : 'reference'), h('b', { style: { fontSize: '11.5px' } }, label), body, rib);
      return [h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', font: '12px var(--f-m)', color: 'var(--ink-3)', marginBottom: '6px' } }, h('kbd', '/reference'), h('span', '⌕ gel'), h('span', { style: { marginLeft: 'auto' } }, list ? 'Atlas: a list' : 'Atlas: a gallery')),
        h('div.pv-refs', card('result', 'Gel stiffness', h('span', { style: { font: '600 15px var(--f-d)' } }, '30.4 kPa'), 'text'),
          card('method', 'Polyacrylamide, 30 kPa', h('span', { style: { font: '10px var(--f-m)', color: 'var(--ink-3)' } }, 'acrylamide 150 µL · bis 100 µL'), 'table'),
          card(null, 'Hertz model', h('i', { style: { font: 'italic 13px var(--f-b)' } }, 'F = 4/3 · E/(1−ν²) · √R δ³ᐟ²'), 'equation')),
        PV.cap(ins ? 'Enter puts the reference in the note, live; Alt+Enter opens where it lives.' : 'Enter opens where it lives; Alt+Enter puts it in the note.')];
    } });

  // V4.7 (14h): floats — a component waiting for a note; /float brings the dome of them
  D({ id: 'floats', group: 'structures', label: 'Floats', isNew: true, desc: 'A component that waits for a note not made yet: right-click → Make it a float (or select several with Ctrl and /float). It keeps its kind and shows a cloud. /float in a note, with nothing selected, raises a clear glass dome along the whole bottom of the canvas — the top of a great sphere — with the floats drifting in it; drag one out onto the note and it lands as a bridge from where it was written, no longer a float. Off: no cloud, no dome, no /float; placed floats stay where they are.',
    tune: [T('spin', 'The dome', 'seg', { isNew: true, def: 'slow', opts: [['slow', 'Turns slowly'], ['still', 'Still']], d: 'It always holds still while the pointer is in it' }),
      T('by', 'Floats coloured by', 'seg', { isNew: true, def: 'kind', opts: [['kind', 'Kind'], ['origin', 'Where they came from'], ['age', 'Age']] }),
      T('old', 'A float has waited too long after', 'seg', { isNew: true, def: '14', opts: [['7', '1 week'], ['14', '2 weeks'], ['30', '1 month']], d: 'It sits lower in the dome, paler, with its age' }),
      T('rest', 'Rest on a float before it opens', 'seg', { isNew: true, def: '1000', opts: [['600', '0.6 s'], ['1000', '1 s'], ['1600', '1.6 s']], d: 'A click opens it at once' }),
      T('place', 'A float you drag out lands', 'seg', { isNew: true, def: 'drop', opts: [['drop', 'Where you drop it'], ['centre', 'At the view’s centre']] })],
    preview: () => {
      const by = FEAT.tune('floats', 'by') || 'kind', still = (FEAT.tune('floats', 'spin') || 'slow') === 'still';
      const cols = by === 'origin' ? ['hsl(20 55% 58%)', 'hsl(200 55% 58%)', 'hsl(120 45% 50%)', 'hsl(280 50% 62%)', 'hsl(40 60% 55%)', 'hsl(330 50% 60%)']
        : by === 'age' ? ['var(--float)', 'var(--float)', 'color-mix(in srgb, var(--ink-4) 30%, var(--float))', 'color-mix(in srgb, var(--ink-4) 55%, var(--float))', 'var(--float)', 'color-mix(in srgb, var(--ink-4) 75%, var(--float))']
        : ['#B5761B', '#1E5E8C', '#6B4FA3', '#9E2A62', 'var(--float)', '#2F6FB0'];
      const B = [[.16, .82, 18, 1], [.3, .56, 22], [.5, .42, 26], [.66, .58, 22], [.84, .8, 18, 1], [.42, .8, 16]];   // inside the wide cap
      return [h('div.pv-fl' + (still ? '.still' : ''), h('span.pv-flcard', FLOATS.cloud(), 'afloat'), h('div.pv-flsk'),
        h('div.pv-fld', B.map(([x, y, d, o], i) => h('i' + (o ? '.old' : ''), { style: { left: (x * 100) + '%', top: (y * 100) + '%', '--d': d + 'px', '--kc': cols[i] } })))),
        PV.cap('Floats in the dome, coloured by ' + (by === 'origin' ? 'where they came from' : by === 'age' ? 'age' : 'kind') + '; the oldest lowest. Drag one onto the note.')];
    } });
  // V4.9 (14i): a label in hand — the Quick cast's Label (lab) or /label: the cursor is the label, a click labels a component
  D({ id: 'labels', group: 'structures', label: 'Labels', isNew: true, desc: 'Float and Reference behind one Label button (the Quick cast pill on the website, /label everywhere): the cursor becomes the label — the sky-lavender cloud or the golden tag — and a click on a component labels it, then the cursor is yours again; hold Ctrl to label several. Esc, Done or a click on the empty canvas puts it down. Off: no Label button and no /label; the floats and references you made stay.',
    tune: [T('keep', 'Ctrl keeps the label in hand', 'switch', { isNew: true, def: true, d: 'Ctrl+click labels a component and keeps the label for the next; off, every click puts it down' }),
      T('size', 'The cursor', 'seg', { isNew: true, def: '32', opts: [['24', 'Small'], ['32', 'Large']], d: 'The label as the cursor over the canvas' })],
    preview: () => {
      const K = typeof LABELS !== 'undefined' ? [{ id: 'float' }, { id: 'reference' }] : [], big = (FEAT.tune('labels', 'size') || '32') === '32', keep = FEAT.tune('labels', 'keep') !== false;
      const ic = id => { const i = h('i'); i.innerHTML = LABELS.svg(id); return i; }, tag = h('i.on'); tag.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><path d="M6 6h.008v.008H6V6Z"/></svg>';
      const cur = h('span.cur', { style: { width: (big ? 26 : 19) + 'px', height: (big ? 26 : 19) + 'px' } }); cur.innerHTML = LABELS.svg('float', big ? 26 : 19);
      return [h('div.pv-lbl', h('div.pv-lbl-row', tag, ...K.map(k => ic(k.id))), h('div.pv-lbl-card', 'Try a stiffer gel next run', cur)),
        PV.cap('Label → Float: the cursor is the cloud; a click makes the component a float' + (keep ? ' (Ctrl keeps the cloud for the next).' : '.'))];
    } });

  D({ id: 'terms', group: 'structures', label: 'Terms', tab: 'terms', desc: 'Words you mark as terms of the project, outlined in bold and found by themselves in every note that uses them, with the Terms tab — every term with its uses, its last twelve weeks, its structures and open barriers, to find, sort and jump through — and each term’s bubbles. Off: no outline, no scanning, no Terms tab; the terms stay.',
    tune: [T('key', 'Mark a term', 'seg', Object.assign({ opts: [['alt+w', 'Alt+W'], ['alt+shift+w', 'Alt+Shift+W']], d: 'Ctrl+W in Focus mode' }, B('termKey'))),
      T('lit', 'Mentions in lit reviews', 'seg', { isNew: true, def: 'out', opts: [['out', 'Left out'], ['counted', 'Counted']], d: 'Left out of the Terms tab and the term’s page; a term used only in lit reviews isn’t listed' }),
      T('sort', 'The Terms tab opens sorted', 'seg', { isNew: true, def: 'used', opts: [['used', 'Most used'], ['rising', 'Rising'], ['recent', 'Recent'], ['az', 'A–Z']], d: 'The switch over the list changes it there; each sort cuts the list into groups the rail jumps to' })],
    preview: () => { const lit = tune('terms', 'lit') === 'counted', so = tune('terms', 'sort') || 'used';
      const L = [{ n: 'traction force', u: lit ? 12 : 9, d: 3, a: 1 }, { n: '30 kPa gel', u: 4, d: 0, a: 5 }, { n: 'bead drift', u: 6, d: 4, a: 0 }].concat(lit ? [{ n: 'traction stress', u: 2, d: 0, a: 20 }] : []);
      L.sort(so === 'rising' ? (x, y) => y.d - x.d : so === 'recent' ? (x, y) => x.a - y.a : so === 'az' ? (x, y) => x.n.localeCompare(y.n) : (x, y) => y.u - x.u);
      return [PV.box({ num: 'Block', label: 'Gels', body: ['Every ', on('terms') ? h('span.term-demo', 'traction force') : 'traction force', ' map on the ', on('terms') ? h('span.term-demo', '30 kPa gel') : '30 kPa gel', ' drifted.'] }),
        h('div.pv-tlist', L.map(x => h('div', h('span.term-demo', x.n), h('span.n', x.u), h('span.n', so === 'rising' ? (x.d ? '▲ ' + x.d : '–') : so === 'recent' ? (x.a ? x.a + ' d' : 'today') : '')))),
        PV.cap('Mark one with ' + keyLabel(settings().termKey) + '; it is found in every other note too. The Terms tab opens ' + ({ used: 'with the most used first', rising: 'with the rising ones first', recent: 'with the most recent first', az: 'from A to Z' })[so] + '. ' + (lit ? 'Lit reviews are counted there.' : 'Lit reviews are left out of it.'))]; } });

  D({ id: 'bubbles', group: 'structures', label: 'Term bubbles', needs: 'terms', presets: { simple: true }, desc: 'A term opens as glass bubbles: each component that uses it, with every neighbour around it, a portal into its note. Pointing closes a ring and ports in (a click does it at once); a small bubble on the note brings you back. They float a little. Off: the same neighbourhoods in plain round trays that stay still; a click opens the note.',
    tune: [T('order', 'Bubbles arranged', 'seg', { isNew: true, def: 'note', opts: [['note', 'By note'], ['time', 'By time'], ['size', 'Busiest first']], d: 'How a term opens; the switch over its bubbles changes it there' }),
      T('float', 'Float', 'switch', { isNew: true, def: true, d: 'Each bubble drifts slowly on its own; they hold still while you scroll, and with reduced motion' }),
      T('amount', 'How far they float', 'range', { isNew: true, def: 4, min: 1, max: 10, step: 1, unit: ' px' }),
      T('ring', 'Pointing ports in', 'switch', { isNew: true, def: true, d: 'A ring closes round the bubble you point at, then you are in its note. Off: only a click' }),
      T('ringMs', 'The ring takes', 'range', { isNew: true, def: 1000, min: 400, max: 2500, step: 100, unit: ' ms' }),
      T('glass', 'The glass bends its edge', 'range', { isNew: true, def: 16, min: 0, max: 30, step: 1, unit: ' %', zero: 'flat glass' })],
    preview: () => {
      const tf = () => h('span.tm', 'traction force'), sp = (id, head, label, kids, len) => ({ id, head, label, body: h('div.bb-t', kids), imgs: [], len, open: false });
      const P = { run: { c: sp('pv1', 'Step 2', 'Run 3', ['The ', tf(), ' rose to 1.2 kPa.'], 34), a: [{ spec: sp('pv2', 'Block', 'Batch 14', ['Stiffer gels.'], 13), rel: 'supported by' }, { spec: sp('pv3', 'Block', 'Drift', ['Under 0.2 µm.'], 13), rel: '' }], note: '30 kPa series', when: '4 Nov', n: 3 },
        seed: { c: sp('pv4', 'Block', 'Seeding', ['Denser cells, more ', tf(), '.'], 34), a: [{ spec: sp('pv5', 'Block', 'Sweep', ['20k–80k/cm².'], 12), rel: 'follows' }], note: 'Seeding notes', when: '28 Oct', n: 2 },
        map: { c: sp('pv6', 'Block', 'Map 12', ['Peak ', tf(), ' at the rim.'], 30), a: [], note: 'Analysis', when: '7 Nov', n: 1 } };
      const ord = tune('bubbles', 'order') || 'note', seq = ord === 'time' ? ['seed', 'run', 'map'] : ord === 'size' ? ['run', 'seed', 'map'] : ['run', 'map', 'seed'];
      const f = h('div.pv-bbf');
      seq.forEach((k, i) => { const x = P[k], el = BUBBLE.el({ key: 'pv' + k, centre: x.c, around: x.a, S: .36, caption: { title: x.note, sub: ord === 'time' ? x.when : x.n + (x.n === 1 ? ' component' : ' components') }, onPort: () => { } });
        el.style.left = (18 + i * 32) + '%'; el.style.top = '54%'; f.append(el); });
      if (ord === 'note') f.append(h('div.tbb-grp', { style: { left: '4%', top: '8px', width: '30%' } }, h('b', '30 kPa series'), h('i')), h('div.tbb-grp', { style: { left: '37%', top: '8px', width: '28%' } }, h('b', 'Analysis'), h('i')), h('div.tbb-grp', { style: { left: '68%', top: '8px', width: '28%' } }, h('b', 'Seeding notes'), h('i')));
      if (ord === 'time') f.append(h('div.tbb-rail', { style: { left: '6%', top: '20px', width: '88%' } }, h('span.tk', { style: { left: '15%' } }, h('span', '28 Oct')), h('span.tk', { style: { left: '50%' } }, h('span', '4 Nov')), h('span.tk', { style: { left: '85%' } }, h('span', '7 Nov'))));
      const ring = on('bubbles') && tune('bubbles', 'ring') !== false; f.append(h('span.pv-bbr', ring ? 'pointing: a ring of ' + (tune('bubbles', 'ringMs') / 1000).toFixed(1) + ' s, then in' : 'a click ports in'));
      BUBBLE.motion(f);
      if (ring) { const first = f.querySelector('.bb'); if (first) { first.style.setProperty('--ring', tune('bubbles', 'ringMs') + 'ms'); requestAnimationFrame(() => requestAnimationFrame(() => first.classList.add('dwell'))); } }
      const still = !on('bubbles') || tune('bubbles', 'float') === false;
      return [f, PV.cap(on('bubbles') ? ({ note: 'By note: a note’s bubbles together, under its name. ', time: 'By time: oldest first, each one dated. ', size: 'Busiest first: the bubbles with the most around them first. ' })[ord] + (still ? 'They hold still. ' : 'They float ' + tune('bubbles', 'amount') + ' px. ') + (+tune('bubbles', 'glass') ? 'The glass bends its edge.' : 'Flat glass.') : 'Off: plain round trays, still; a click opens the note.')]; } });

  D({ id: 'investigate', group: 'structures', label: 'Needs investigation', desc: 'A structure that stays open until investigated: a dot in its component’s header, a breathing dot in the Portfolio, its list on Today above Recent notes.',
    preview: () => [run3({ stamp: null, head: [h('span.inv-dot', { title: 'Needs investigation' })], body: ['Why do the ', PV.st('investigate', 'beads drift'), ' after 40 frames?'] }),
      h('div.pv-row', h('span.pfdot.inv', { style: { '--c': 'var(--k-investigate)' } }, '2'), h('span.fpv-cap', 'in the Portfolio, beside the note'))] });

  D({ id: 'resurface', group: 'structures', label: 'Resurfaced claims', desc: 'An older claim brought back on Today and in the day note, to check that it still holds.',
    preview: () => [h('div.resurf', { style: { '--kc': 'var(--k-claim)', margin: 0 } }, h('div.tiny.mono.muted', 'RESURFACED · 30 DAYS AGO'), h('div.serif', 'Traction scales with stiffness.'), h('div.tiny.muted', 'Quiet note · still holds?'))] });

  D({ id: 'lock', group: 'structures', keep: true, nb: true, label: 'Lock the wording after the day', desc: 'Once the day turns, changing recorded wording asks you to revise or add a correction; the original stays on record. Off: everything stays editable, and notes and components can be deleted. Presets leave this as it is.',
    get: () => !!settings().lockAfterDay, set: v => { saveSettings({ lockAfterDay: v }); changed(); },
    preview: () => [run3({ stamp: '12 Nov 2026 18:02', head: on('lock') ? [h('span.pv-lock', 'locked')] : [] }), on('lock') ? h('div.pv-corr', 'Correction · 13 Nov: it was 12 ng/mL, not 10.') : PV.cap('Editable at any time.')] });

  /* =============================== Bridges =============================== */
  D({ id: 'bridges', group: 'bridges', core: true, label: 'Bridges', desc: 'A component, or some words of one, shown live in another note, with a caption saying why it was bridged and a band saying where it comes from.',
    tune: [T('color', 'Colour', 'color', { opts: [['#1f9d55', 'Green'], ['#0d675e', 'Teal'], ['#7048e8', 'Violet'], ['#c2410c', 'Orange'], ['#1c7ed6', 'Blue']], get: () => settings().bridgeColor || BRIDGE.COLOR, set: v => { saveSettings({ bridgeColor: v }); applyKindCSS(); } })],
    preview: () => [h('div.pvb.pv-bridge', { style: { '--bridge': tune('bridges', 'color') } }, h('div.pvb-h', h('span.pvb-n', 'Bridge'), h('span.sp'), h('span.pvb-st', '13 Nov 2026 20:11')),
      h('div.refbody', h('div.origin.or-bridge', h('div.or-top', h('span.or-k', '⇄ Bridged from'), h('a.or-note', 'Seeding density notes'), h('span.or-cmp', 'Seeding'), h('button.or-go', { type: 'button', tabindex: '-1' }, '↗')), h('div.or-path', 'Traction · 13 Nov')), h('div.serif', { style: { fontSize: '13.5px', paddingBottom: '6px' } }, 'Seed at 40k/cm² on the 30 kPa gels; wait 4 h before imaging.')),
      h('div.br-why', h('span.br-why-k', '⇄ why'), h('div.br-why-t', 'The seeding this run followed.')))] });

  D({ id: 'bridgeMarks', group: 'bridges', needs: 'bridges', label: 'Green in the original note', presets: { simple: true }, desc: 'Where a component is bridged from: its bridged words underlined, a green right edge, and “bridged to …” under it.',
    preview: () => [h('div.pvb.pv-marked', { style: { '--bridge': tune('bridges', 'color') } }, h('div.pvb-h', h('span.pvb-n', 'Block'), h('b', 'Seeding'), h('span.sp'), h('span.pvb-st', '13 Nov 20:08')),
      h('div.pvb-tx.ed', h('span.br', 'Seed at 40k/cm² on the 30 kPa gels'), '; wait 4 h before imaging.'), h('div.pvb-ch', h('span.wchip.br-out', '⇄ bridged to 30 kPa series')))] });

  D({ id: 'bridgeEdges', group: 'bridges', needs: 'bridges', label: 'Circles at a note’s edges', desc: 'In the faded margin of a note, the notes it is bridged with: where things come from on the left, where they go on the right, level with their component. Half-moons in a window, beads in full screen.',
    preview: () => [h('div.pv-edges', { style: { '--bridge': tune('bridges', 'color') } }, h('span.mk.l', '2'), run3({ stamp: null, body: 'The edge collapsed.' }), h('span.mk.r', '1')), PV.cap('Left: Seeding density notes, Gel batch 14 · Right: Analysis')] });

  D({ id: 'bridgeBar', group: 'bridges', needs: 'bridges', label: 'Bridge bar', desc: 'Under the tabs once you cross a bridge: the notes you crossed between, ‹ › along them, and your most-used bridges. Alt+← / Alt+→ walk back and forth; × closes it until tomorrow.',
    get: () => settings().bridgeBar !== false, set: v => { saveSettings({ bridgeBar: v }); try { BWAY.route(); } catch (e) { } },
    tune: [T('top', 'Most-used bridges shown', 'range', { isNew: true, min: 0, max: 5, def: 3, zero: 'only the bridges you are crossing', d: 'At 0 the bar shows only the crossing you are on, and doesn’t open by itself in a note of your most-used bridges', changed: () => { BWAY.sig = null; try { BWAY.route(); } catch (e) { } } }),
      T('weeks', 'Counted over', 'seg', { isNew: true, def: 2, opts: [[1, '1 week'], [2, '2 weeks'], [4, '4 weeks'], [0, 'Never reset']], d: 'Changing it starts the count again' }),
      T('open', 'Closed for today', 'node', { render: () => BWAY.shut() ? h('button.btn.xs', { type: 'button', on: { click: () => { saveSettings({ bridgeBarShut: null }); toast('The bridge bar can open again today'); SettingsView.redraw(); } } }, 'Closed today · open it again') : h('span.st-th', 'Open — × on the bar closes it until tomorrow.') })],
    preview: () => { const n = tune('bridgeBar', 'top'), pairs = [['Gel batch 14', 'Run 3', 9], ['Seeding density notes', '30 kPa series', 6], ['EGF series', 'Analysis', 4], ['Imaging setup', 'Run 3', 3], ['Bead drift', 'Analysis', 2]].slice(0, n);
      return [h('div.pv-bar', { style: { '--bridge': tune('bridges', 'color') } }, h('span.k', '⇄ Bridges'), h('span.trail', h('span', 'Seeding density notes'), h('i', '→'), h('span.cur', '30 kPa series')),
        n ? h('span.tops', h('span.tk', 'Most used'), pairs.map(([a, b, c]) => h('span.p', a, h('i', '⇄'), b, h('em', String(c))))) : null, h('span.x', '×')),
        PV.cap(n ? 'Your ' + plural(n, 'most-used bridge') + ', counted ' + ({ 0: 'since the start', 1: 'this week', 2: 'over two weeks', 4: 'over four weeks' }[tune('bridgeBar', 'weeks')] || '') + '.' : 'Only the bridges you are crossing now.')]; } });

  D({ id: 'excerpts', group: 'bridges', needs: 'bridges', label: 'Passages', desc: 'Words copied inside a component and pasted on another note arrive as just that passage, live: it follows the original. Off: they arrive as a copy (what Ctrl+Shift+V does); passages already made stay live.',
    preview: () => [h('div.pvb.pv-bridge', { style: { '--bridge': tune('bridges', 'color') } }, h('div.pvb-h', h('span.pvb-n', 'Bridge')),
      h('div.refbody', h('div.origin.or-passage', h('div.or-top', h('span.or-k', '⇄ Passage from'), h('a.or-note', 'Seeding density notes'), h('span.or-cmp', 'Edge')), h('div.or-path', 'Traction · 13 Nov')), h('div.serif', { style: { fontSize: '13.5px', paddingBottom: '8px' } }, 'The leading edge holds at 2 ng/mL EGF')))] });

  /* =============================== Time & reminders =============================== */
  D({ id: 'timers', group: 'time', label: 'Timers', presets: { simple: true }, desc: 'A note’s ⏱ Timer, step timing, head starts, the timer cards that follow you from page to page, and the day’s totals. Off: no new timer starts; one already running still shows until it ends.',
    tune: [T('cap', 'Stop a timer after', 'range', Object.assign({ min: 1, max: 12, unit: ' h' }, B('timerCapHours'))), T('idle', 'Ask if idle after', 'range', Object.assign({ min: 5, max: 60, step: 5, unit: ' min' }, B('idleMinutes')))],
    preview: () => [h('div.pv-timer', h('i'), h('b', '30 kPa series'), h('span.mono', '1:12:04'), h('span', '❚❚'), h('span', '■')), run3({ stamp: '13 Nov 20:11 · +12:04' }), PV.cap('Stops by itself after ' + tune('timers', 'cap') + ' h; asks after ' + tune('timers', 'idle') + ' min without a touch.')] });

  D({ id: 'reminders', group: 'time', label: 'Reminders', presets: { simple: true }, inserts: ['reminder'], desc: 'Deadlines, meetings and plain reminders under the bell in the header, on Today and in the day note, with alerts.',
    preview: () => [h('div.pv-rem', h('div.pv-remh', 'Coming up'), [['Today 15:00', 'Lab meeting', 'meeting'], ['Mon', 'Order fibronectin', 'reminder'], ['Fri', 'Abstract due', 'deadline']].map(([a, b, c]) => h('div', h('span.mono', a), h('b', b), h('span', c))))] });

  // V4.8 (18b-monthly.js): the monthly review replaces the weekly bet — a report of the month's deliverables per note, an inbox for what belongs to no note, next month's plan
  D({ id: 'review', group: 'time', label: 'Monthly review', tab: 'review', desc: 'Each month’s report: what it added up to, its numbers against the month before, and per note its takeaways and results (then barriers resolved, questions answered, Reports and References). Unassigned lists every component of your daily notes that belongs to no note of the Portfolio, to file with a key. Ticking what is still open writes next month’s plan into the review note.',
    tune: [T('opens', 'A month’s review opens', 'seg', { isNew: true, def: 'after', opts: [['after', 'The day after it ends'], ['weekend', 'On its last weekend']] }),
      T('deliver', 'The report lists', 'seg', { isNew: true, def: 'all', opts: [['core', 'Takeaways and results'], ['more', '+ barriers resolved, questions answered'], ['all', '+ Reports and References']] }),
      T('inbox', 'Unassigned takes in', 'seg', { isNew: true, def: 'quick', opts: [['daily', 'Daily notes'], ['quick', 'Daily and quick notes']] }),
      T('keys', 'Inbox keys (j k x f m l n d u)', 'switch', { isNew: true, def: true }),
      T('compare', 'Compare with the month before', 'switch', { isNew: true, def: true }),
      T('preview', 'Preview the running month', 'switch', { get: () => !!settings().reviewPreview, set: v => { saveSettings({ reviewPreview: v }); changed(); } })],
    preview: () => typeof MONTHLY !== 'undefined' ? MONTHLY.preview() : [PV.cap('The monthly review.')] });
  /* V4.18 — a theme's aims are milestones, measured by their deliverables (15g, 32-milestones.css) */
  D({ id: 'milestones', group: 'time', label: 'Milestones', isNew: true, presets: { simple: true }, desc: 'A theme’s large, overarching goals (what were its aims), each measured by its deliverables: a Synthesis note, or a set of results, takeaways, verdicts… picked from your notes. Its completeness is the share delivered; + Milestone on the theme’s page, Re-scope… for a new version. Off: the milestones leave the theme and project pages and the Portfolio; nothing written is lost.',
    tune: [T('synth', 'A Synthesis note delivers its deliverable once', 'seg', { isNew: true, def: 'written', opts: [['written', 'Its synthesis is written'], ['linked', 'It is linked']], d: 'Its synthesis: the “what this note adds up to” of the Synthesis note' })],
    preview: () => {
      const linkedOnly = (tune('milestones', 'synth') || 'written') === 'linked', flag = h('span.mi-flag'); flag.innerHTML = MILE.FLAG;
      const row = (met, label, sub, w) => h('div.msrow.mi-row' + (met ? '.met' : ''), h('span.mi-tick' + (met ? '.on' : ''), met ? '✓' : ''), h('div.mi-main', h('div.mi-l', label), h('div.mi-sub', ...sub)), h('span.pill.mi-w', w));
      const rows = [[true, '8 kPa series, synthesised', [h('span.mi-k', 'Synthesis note'), h('span', '↳ 8 kPa series — Synthesis'), h('span.mi-st.ok', 'its synthesis is written')], '34%'],
        [linkedOnly, '30 kPa series, synthesised', [h('span.mi-k', 'Synthesis note'), h('span', '↳ 30 kPa series — Synthesis'), h('span.mi-st', linkedOnly ? 'linked' : 'write its synthesis to deliver it')], '33%'],
        [false, 'Results across the stiffness range', [h('span.mi-k', 'Results · Verdicts'), h('span.mi-cnt', '2 of 3')], '33%']];
      const pct = linkedOnly ? 67 : 34, done = rows.filter(r => r[0]).length;
      return [h('div.pv-mi', h('div.row.mi-h', flag, h('b', { style: { flex: 1 } }, 'Map traction force against stiffness, 8–30 kPa'), h('span.mono.tiny.mi-pct', pct + '%')), h('div.bar', { style: { margin: '6px 0 8px' } }, h('i', { style: { width: pct + '%' } })),
        h('div.mi-dlh', h('span', 'Deliverables'), h('span.mi-dln', done + ' of 3 delivered')), rows.map(r => row(...r))),
        PV.cap(linkedOnly ? 'A Synthesis note counts as soon as it is linked.' : 'A Synthesis note counts once its synthesis is written; a set once as many as it asks for are picked.')];
    } });

  D({ id: 'chores', group: 'time', label: 'Recurring chores', presets: { standard: false }, desc: 'Lab chores that repeat — the water bath, the CO₂ tank — due ones shown in the day note.',
    tune: [T('list', 'Chores', 'button', { button: 'Recurring chores…', run: () => CHORES.manage() })],
    preview: () => [h('div.pv-list', [['Water bath', 'every Monday', 'due today'], ['CO₂ tank', 'every 2 weeks', 'in 4 days'], ['Autoclave log', 'every Friday', 'done']].map(([a, b, c]) => h('div', h('input', { type: 'checkbox', tabindex: '-1', checked: c === 'done' }), h('b', a), h('span', b), h('em', c))))] });

  /* =============================== Reading & sources =============================== */
  D({ id: 'library', group: 'reading', label: 'Library', tab: 'library', presets: { simple: true }, desc: 'Papers and their PDFs, the reader with highlights and notes, and citations in your text. Off: the Library tab leaves; citations and papers stay.',
    // V4.6: every note that has not chosen its own shows its citations this way (/cite); /author-cite makes one citation "Style et al." whatever the note shows
    tune: [T('cite', 'Citations show', 'seg', Object.assign({ isNew: true, opts: [['number', 'Numbered [1]'], ['author', 'Style et al.'], ['title', 'Title']], d: 'In every note that has not chosen its own (its ⋯ menu); numbered from [1] in the order they first appear, with the references listed under the note' }, B('citeStyle'))),
      T('year', 'Citations by author add the year', 'switch', Object.assign({ isNew: true, d: 'Style et al., 2014 — without it: Style et al.' }, B('citeYear')))],
    preview: () => { const m = settings().citeStyle || 'number', yr = !!settings().citeYear, au = 'Style et al.' + (yr ? ', 2014' : ''), au2 = 'Plotnikov et al.' + (yr ? ', 2012' : '');
      const cite = (t, sup) => h('span.pv-cite', sup ? { style: { fontSize: '.72em', verticalAlign: 'super', fontFamily: 'var(--f-m)', color: 'var(--teal)' } } : {}, t);
      const c1 = m === 'author' ? cite(au) : m === 'number' ? cite('[1]', true) : cite('Traction force microscopy in physics and biology'), c2 = m === 'author' ? cite(au) : m === 'number' ? cite('[2]', true) : cite('Force fluctuations within focal adhesions');
      return [PV.box({ num: 'Block', label: 'Background', body: ['Cells pull on soft gels as they move', c1, '; adhesions fluctuate', c2, ', as ', cite(au2), ' showed.'] }),
        PV.cap(m === 'number' ? '/cite numbers from [1]; /author-cite names the author, just for that one.' : m === 'author' ? '/cite names the first author, no brackets.' : '/cite shows the paper’s title.')]; } });

  /* V4.1 — the Library overhaul (17e search, 17d shelves and foci, 17f shelf map and sheet) */
  D({ id: 'libsearch', group: 'reading', needs: 'library', label: 'Library search', isNew: true, presets: { simple: true },
    desc: 'One search box for the Library with fields (author:, year:2010-2016, shelf:, focus:, cited:"run 3", hl:, quote:, text:, is:unread…), "phrases", -left-out words and OR; it says why each paper matched. Off: the plain filter, as before.',
    tune: [T('inside', 'Plain words look inside the papers too', 'switch', { isNew: true, def: true, d: 'Their highlights, the quotes taken from them and the notes on them; off: only the papers’ own details' }),
      T('facets', 'Facets under the search', 'switch', { isNew: true, def: true, d: 'Years, reading, journals and shelves of the results; a click adds one to the search' }),
      T('suggest', 'Suggestions while typing', 'switch', { isNew: true, def: true, d: 'Fields, then their values (shelves, foci, journals, authors, notes); Tab or Enter takes one' }),
      T('pdftext', 'Offer to search inside the PDFs’ text', 'switch', { isNew: true, def: true, d: 'A box under the search: each PDF’s words are read once in a session' }),
      T('sort', 'Results sorted by', 'select', { isNew: true, def: 'rel', opts: LSEARCH.SORTS })],
    preview: () => { const ins = FEAT.tune('libsearch', 'inside') !== false, srt = (LSEARCH.SORTS.find(s => s[0] === FEAT.tune('libsearch', 'sort')) || LSEARCH.SORTS[0])[1];
      return [h('div.pv-lq', h('span', '⌕'), h('code', 'author:engler year:>2005 matrix')),
        FEAT.tune('libsearch', 'suggest') !== false ? h('div.pv-lsug', h('b', 'focus:'), h('span', 'in a focus (shelf › focus)')) : null,
        FEAT.tune('libsearch', 'facets') !== false ? h('div.pv-lfac', [['Reading', 'Read 2'], ['Journal', 'Cell 1'], ['Shelf', 'Mechanobiology 2']].map(([a, b]) => h('span', h('b', a), b))) : null,
        h('div.pv-lres', h('i', 'Matrix elasticity directs stem cell lineage specification'), h('div', 'Engler, A. J., … — Cell, 2006'),
          h('div.pv-lwhy', h('b', ins ? 'highlight · p. 4' : 'author'), h('span', ins ? ['soft ', h('mark', 'matrices'), ' that mimic brain are neurogenic'] : 'Adam J. Engler'))),
        PV.cap('Sorted by ' + srt.toLowerCase() + (FEAT.tune('libsearch', 'pdftext') !== false ? ' · the PDFs’ text when you tick it' : '') + '.')]; } });

  D({ id: 'libmap', group: 'reading', needs: 'library', label: 'Shelf map', isNew: true,
    desc: 'The Library as shelves you can see: each shelf a board in its colour, its foci standing on it as spines, one per paper; a search raises what it finds. Drag a spine onto a focus to add it there. Off: the list only.',
    tune: [T('start', 'The Library opens on', 'seg', { isNew: true, def: 'auto', opts: [['auto', 'The map; the list once you search'], ['map', 'The shelf map'], ['list', 'The list']] }),
      T('marks', 'Dots on the spines', 'switch', { isNew: true, def: true, d: 'Yellow: it has highlights · light: a note cites it' })],
    preview: () => { const st = FEAT.on('libread') && FEAT.tune('libread', 'cards') !== false, mk = FEAT.tune('libmap', 'marks') !== false;
      const sp = (s, hgt, hl, ct) => h('span.lm-sp.lm-' + (st ? s : 'none'), { style: { height: hgt + 'px' } }, mk && hl ? h('span.lm-hl') : null, mk && ct ? h('span.lm-ct') : null);
      return [h('div.lm.pv-lm', h('section.lm-shelf', { style: { '--sh': '205' } }, h('div.lm-h', h('span.lm-sn', 'Traction methods')),
          h('div.lm-board', h('div.lm-focus', h('span.lm-fl', 'FTTC & regularization', h('span.lm-n', '5')), h('div.lm-sps', sp('read', 60, 1, 1), sp('read', 70, 0, 1), sp('reading', 54, 1, 0), sp('unread', 64), sp('unread', 50))),
            h('div.lm-focus', h('span.lm-fl', 'Reviews', h('span.lm-n', '2')), h('div.lm-sps', sp('read', 68, 1, 1), sp('reading', 58)))))),
        PV.cap({ auto: 'Opens on the map; the list as soon as you search.', map: 'Opens on the shelf map.', list: 'Opens on the list.' }[FEAT.tune('libmap', 'start')] || '')]; } });

  D({ id: 'libsmart', group: 'reading', needs: 'library', label: 'Smart foci', isNew: true,
    desc: 'A focus that is a saved search: it holds every paper that matches, now and later. ✶ Save as smart focus under the search, or ⋯ on a shelf. Off: smart foci keep only the papers put in by hand.',
    tune: [T('hand', 'Papers put in by hand stay too', 'switch', { isNew: true, def: true, d: 'Off: a smart focus holds only what its search finds' })],
    preview: () => [h('aside.lg-side.pv-lgs', h('div.lg-theme', { style: { '--sh': '300' } }, h('div.lg-row.lg-t', h('span.lg-fold', '▾'), h('span.lg-sw'), h('span.lg-n', 'Mechanobiology'), h('span.lg-c', '13')),
        h('div.lg-kids', h('div.lg-row.lg-g', h('span.lg-ic', '▤'), h('span.lg-n', 'Rigidity sensing'), h('span.lg-c', '7')), h('div.lg-row.lg-g.lg-smart', h('span.lg-ic.lg-star', '✶'), h('span.lg-n', 'Unread since 2018'), h('span.lg-c', FEAT.tune('libsmart', 'hand') === false ? '5' : '6'))))),
      PV.cap('✶ Unread since 2018 = is:unread year:>2017' + (FEAT.tune('libsmart', 'hand') === false ? '' : ', with the paper you put in it') + '.')] });

  D({ id: 'libread', group: 'reading', needs: 'library', label: 'Reading state', isNew: true,
    desc: 'Each paper not opened, reading or read: on its sheet, its card and its spine, a small bar of how much of each focus is read, and is:unread / is:read in the search. Off: no states shown.',
    tune: [T('auto', 'Opening a paper’s PDF makes it “reading”', 'switch', { isNew: true, def: true, d: '“Read” is always yours to set, on the paper’s sheet' }),
      T('cards', 'Show it on the papers and the spines', 'switch', { isNew: true, def: true })],
    preview: () => { const on = FEAT.tune('libread', 'cards') !== false;
      return [h('div.pv-lst', ['unread', 'reading', 'read'].map(k => h('div', { style: { '--sh': '160' } }, h('span.lm-sp.lm-' + (on ? k : 'none'), { style: { height: '46px' } }), on ? h('span.lib-st.lib-st-' + k, LIBSTATE.LABEL[k]) : h('span.tiny.muted', '—')))),
        PV.cap(FEAT.tune('libread', 'auto') !== false ? 'Opening the PDF turns “not opened” into “reading”.' : 'Set by hand on the paper’s sheet.')]; } });

  D({ id: 'eqcap', group: 'reading', needs: 'library', label: 'Equation capture', desc: '∑ Capture equation in the Library’s reader: draw a box round an equation on the page, check it, name it — registered with its paper and page.',
    preview: () => [h('div.pv-page', h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-eqbox', 'E = 3G(1 + ν)'), h('div.pv-pl'), h('div.pv-pl.s')), PV.cap('∑ Capture equation, then a box round it.')] });

  // V4.27: no tab of their own — each project's Lit reviews section in the Portfolio, with + Lit review there
  D({ id: 'litrev', group: 'reading', label: 'Lit reviews', desc: 'Literature reviews: a canvas for one question in the literature — its papers, the quotes that matter and your notes on them — linked to every project it serves. They live in the Portfolio: each project’s Lit reviews section lists the reviews linked to it, and + Lit review there starts one, linked to that project; a review linked to no project is listed with the notes outside any project. There is no Lit reviews tab (its page still opens from a link or search). Off: + Lit review and the empty sections go; the reviews you made stay where they are.',
    changed: () => { try { App.refresh(); } catch (e) { } },
    preview: () => { const on = FEAT.on('litrev'), box = typeof PFICON !== 'undefined' && PFICON.boxed(), ico = typeof PFICON !== 'undefined' && PFICON.on() ? PFICON.el('lit', 13) : null;
      return [h('div.pv-lrv', h('div.pv-tabs', h('span.on', 'Portfolio'), h('span', 'Review'), h('span', 'Terms'), h('span', 'Library')),
        h('div.pv-lrv-sec', h('div.pv-lrv-sh', h('div' + (box ? '.pf-box' : ''), { 'data-sk': 'lit' }, ico, h('span', 'Lit reviews'), h('span.pvc', on ? '2' : '2')), on ? h('span.pv-lrv-add', '+ Lit review') : null),
          h('div.pv-lrv-n', h('span.pv-lrv-t', 'Does the edge peak hold at low ligand?'), h('span.pvc', '2 papers · 3 quotes')), h('div.pv-lrv-n', h('span.pv-lrv-t', 'Gel stiffness checks across labs'), h('span.pvc', '4 papers · 1 quote')))),
        PV.cap(on ? 'No tab: a project’s lit reviews are in its Portfolio section, and + Lit review starts one linked to it.' : 'Off: no + Lit review; the reviews you made stay listed.')]; } });

  D({ id: 'webcap', group: 'reading', label: 'Web capture', inserts: ['website'], desc: 'A web page kept as it was the moment it was saved, in a note: + Insert → Website…, or a page saved from the browser. Off: it leaves + Insert; pages already captured stay.',
    preview: () => [h('div.pvb', h('div.pvb-h', h('span.pvb-n', 'Website'), h('b', 'Traction force microscopy — Wikipedia'), h('span.sp'), h('span.pvb-st', 'kept 13 Nov')), h('div.pv-page', { style: { margin: '0 10px 10px' } }, h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'), h('div.pv-pl.s')))] });


  /* ---------- V4.2 — the reader beside a note: tabs, split, Cited in, where a quote is from (13zzb, 17e, 25-reader.css) ---------- */
  const rdRedraw = () => { try { if (RDOCK.wrap) { RDOCK.layout(); RDOCK.tabsRow(); } } catch (e) { } };
  const rdRebuild = () => { try { if (RDOCK.wrap) RDOCK.remount(); } catch (e) { } };
  const rdPage = () => h('div.pv-page', h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'), h('div.pv-pl.s'));
  D({ id: 'rtabs', group: 'reading', label: 'Reading tabs', desc: 'Several papers and pages open at once beside the note, as tabs, with + to open another — the PDFs and HTML pages of any note, and the papers of the Library. Clicking a tab takes the note to where that paper is embedded. Kept on this device, from note to note. Off: one paper at a time, belonging to its note.',
    changed: v => { try { if (!RDOCK.wrap) return; const S = RDOCK.S_, id = S.show[S.act] || S.show.find(Boolean); if (!v) { RDOCK.close(true); if (id && M.block(id)) RDOCK.open(M.block(id)); } else rdRedraw(); } catch (e) { } },
    tune: [T('follow', 'Clicking a tab takes the note to where the paper is', 'switch', { isNew: true, def: true, d: 'The note goes to the component that embeds it, lit. Off: the note stays where it is.' }),
      T('names', 'Tabs are named by', 'seg', { isNew: true, def: 'ref', opts: [['ref', 'Short reference'], ['title', 'Title']], d: 'A paper of the Library: “Style et al., 2014” or its title. Others: their label.', changed: rdRedraw }),
      T('width', 'The reader takes', 'seg', { isNew: true, def: 'half', opts: [['narrow', 'Two fifths'], ['half', 'Half'], ['wide', 'Three fifths']], d: 'of the window, the note the rest', changed: rdRedraw }),
      T('max', 'Tabs kept open', 'seg', { isNew: true, def: 12, opts: [[6, '6'], [12, '12'], [24, '24']], d: 'One more closes the oldest that isn’t showing' }),
      T('libtabs', 'The Library’s reader shows the tabs too', 'switch', { isNew: true, def: true, d: 'Click one there: the note it is in, with the paper beside it' })],
    preview: () => { const follow = tune('rtabs', 'follow') !== false, title = tune('rtabs', 'names') === 'title', w = tune('rtabs', 'width') || 'half';
      const tabs = [['PDF', title ? 'Traction force microscopy in physics and biology' : 'Style et al., 2014', true], ['Page', 'Traction force microscopy — Wikipedia', false], ['PDF', title ? 'Mapping the forces of focal adhesions' : 'Plotnikov et al., 2014', false]];
      return [h('div.pv-rd.w-' + w, h('div.pv-rd-dock', h('div.pv-rd-tabs', tabs.map(([k, n, a]) => h('span.pv-rd-tab' + (a ? '.act' : ''), h('i', k), n, h('b', '×'))), h('span.pv-rd-add', '+')), rdPage()),
        h('div.pv-rd-note', h('div.pv-rd-nt', '30 kPa series'), h('div.pv-rd-card' + (follow ? '.lit' : ''), h('i', 'PDF'), ' ', title ? 'Traction force microscopy…' : 'Style et al., 2014', ' — reading beside'), PV.box({ num: 'Step 2', label: 'Run 3', body: 'The edge collapsed.' }))),
        PV.cap((follow ? 'A tab clicked: the note goes to where its paper is, lit. ' : 'A tab clicked: the note stays where it is. ') + 'The reader takes ' + ({ narrow: 'two fifths', half: 'half', wide: 'three fifths' }[w] || 'half') + ' of the window; ' + tune('rtabs', 'max') + ' tabs at most.')]; } });

  D({ id: 'rsplit', group: 'reading', needs: 'rtabs', label: 'Split the reader', desc: '◫ on the reader’s tab row: one paper, two (side by side, or one over the other) or a quadrant (2×2) of your tabs, like ◫ Split on a note. Each pane has its own page, zoom and highlights. Off: one pane.',
    changed: v => { try { if (!v && RDOCK.wrap) RDOCK.setN(1); else rdRedraw(); } catch (e) { } },
    tune: [T('two', 'Two papers sit', 'seg', { isNew: true, def: 'cols', opts: [['cols', 'Side by side'], ['rows', 'One over the other']], d: 'In half the window, one over the other leaves each its width', changed: rdRebuild })],
    preview: () => { const rows = tune('rsplit', 'two') === 'rows', n = (() => { try { return RDOCK.S_.n; } catch (e) { return 1; } })(), sp = (t, on) => h('span' + (on ? '.on' : ''), t);
      return [h('div.pv-rs', h('div' + (n === 1 ? '.cur' : ''), h('div.pv-rs-g', sp('Style 2014', true)), 'One'), h('div' + (n === 2 ? '.cur' : ''), h('div.pv-rs-g.n2' + (rows ? '.rows' : ''), sp('Style 2014', true), sp('Wikipedia')), rows ? 'One over the other' : 'Side by side'),
        h('div' + (n === 4 ? '.cur' : ''), h('div.pv-rs-g.n4', sp('Style', true), sp('Wiki'), sp('Plotnikov'), sp('+')), 'Quadrant (2×2)')), PV.cap('◫ on the tab row. A free pane offers your other tabs and +.')]; } });

  D({ id: 'citedin', group: 'reading', label: 'Cited in', desc: 'While you read a paper — beside a note or in the Library’s reader — the notes that cite it, and the other notes it is in, are offered as places to go: a line of them under the bar, and Cited in · N.',
    changed: rdRebuild,
    tune: [T('strip', 'A line of the notes under the bar', 'switch', { isNew: true, def: true, d: 'Off: just the Cited in button, with the list', changed: rdRebuild }),
      T('embeds', 'Also the notes the paper is embedded in', 'switch', { isNew: true, def: true, d: 'Besides the notes that cite it (/cite)', changed: rdRebuild })],
    preview: () => { const strip = tune('citedin', 'strip') !== false, emb = tune('citedin', 'embeds') !== false, n = emb ? 3 : 2;
      return [h('div.pv-cx', h('div.pv-cx-bar', h('b', 'Style et al., 2014'), h('span', 'Cited in · ' + n), h('span', { style: { color: 'var(--ink-3)', borderColor: 'var(--rule-2)' } }, 'Highlights')),
        strip ? h('div.rcx-strip', h('span.rcx-sk', 'Cited in'), h('span.rcx-chip', '30 kPa series', h('span', '2')), h('span.rcx-chip', 'Seeding density notes'), emb ? h('span.rcx-chip', 'Analysis — traction maps') : null) : null, rdPage()),
        PV.cap((strip ? 'The notes under the bar, ' : 'Cited in · ' + n + ' on the bar, ') + 'click one to go there; the paper stays beside you.' + (emb ? ' Notes it is embedded in count too.' : ''))]; } });

  D({ id: 'citeband', group: 'reading', label: 'Where a quote is from', desc: 'A quote shows its paper in a band, like a bridge’s: the reference, the page, the title and the note it is embedded in. Bridged to another note it carries both bands — the bridge’s and the citation’s. Click the band: the paper opens beside the note, at the quote.',
    changed: () => { try { RDX.color(); App.refresh(); } catch (e) { } },
    tune: [T('color', 'Colour', 'color', { isNew: true, def: '#3b5bdb', opts: [['#3b5bdb', 'Ink blue'], ['#b7791f', 'Amber'], ['#0d675e', 'Teal'], ['#9c36b5', 'Plum'], ['#475569', 'Slate']], changed: () => { try { RDX.color(); } catch (e) { } } }),
      T('detail', 'The band shows', 'seg', { isNew: true, def: 'full', opts: [['full', 'Reference, page and title'], ['short', 'Reference and page']], changed: () => { try { App.refresh(); } catch (e) { } } }),
      T('click', 'Clicking it', 'seg', { isNew: true, def: 'beside', opts: [['beside', 'Opens the paper beside the note'], ['card', 'Shows it in its card']], d: 'Alt+click does the other' })],
    preview: () => { const col = tune('citeband', 'color') || '#3b5bdb', full = tune('citeband', 'detail') !== 'short', beside = tune('citeband', 'click') !== 'card';
      const band = (k, extra) => h('div.origin.or-cite', h('div.or-top', h('span.or-k', k), h('a.or-note', 'Style et al., 2014'), h('span.or-pg', 'p. 4'), h('button.or-go', { type: 'button', tabindex: '-1' }, '◧')), full ? h('div.or-path', ['Traction force microscopy in physics and biology', extra].filter(Boolean).join(' · ')) : null);
      return [h('div.pv-cb', { style: { '--cite': col } },
        h('div.pvb.pv-q', { style: { borderLeft: '4px solid ' + col } }, h('div.pvb-h', h('span.pvb-n', 'Quote'), h('span.sp'), h('span.pvb-st', 'p. 4')), band('❝ Quoted from'), h('div.pvb-tx', '❝ Cells pull hardest at the leading edge, where adhesions mature.')),
        h('div.pvb.pv-bridge', h('div.pvb-h', h('span.pvb-n', 'Bridge'), h('span.sp')), h('div.refbody', h('div.origin.or-bridge', h('div.or-top', h('span.or-k', '⇄ Bridged from'), h('a.or-note', 'Reading: Style 2014'), h('span.or-cmp', 'Quote'))), band('❝ Quoted from', 'in Reading: Style 2014'), h('div.serif', { style: { fontSize: '13px', fontStyle: 'italic' } }, 'Cells pull hardest at the leading edge, where adhesions mature.')))),
        PV.cap('A quote, and the same quote bridged to another note: the bridge’s band, then the citation’s. Click it: ' + (beside ? 'the paper opens beside the note, at the quote.' : 'its card scrolls to the quote.'))]; } });
  /* V4.10 — the reader's side panel folds (17g, 30-sidefold.css) */
  const sfPaint = () => { try { SIDEFOLD.paint(SIDEFOLD.start()); } catch (e) { } };
  D({ id: 'sidefold', group: 'reading', label: 'Fold the side panel', isNew: true, presets: { simple: true }, desc: 'The panel of highlights and notes beside a maximised PDF, HTML page or saved website, and in the Library’s reader, folds to a thin strip at the side with ›, its count written down the strip; click the strip to open it again. Beside a note, › closes it (Highlights opens it). Off: the panel stays open, as before.',
    changed: sfPaint,
    tune: [T('start', 'When a file opens, the panel is', 'seg', { isNew: true, def: 'last', opts: [['last', 'As you left it'], ['open', 'Open'], ['folded', 'Folded']], d: 'As you left it: kept on this device, the same for every reader', changed: sfPaint })],
    preview: () => {
      const wrap = h('div'), start = tune('sidefold', 'start') || 'last';
      const chev = () => { const b = h('button.pv-sf-b', { type: 'button', tabindex: '-1' }); b.innerHTML = SIDEFOLD.CHEV; return b; };
      const draw = () => { const f = document.body.classList.contains('sf-fold'), toggle = e => { e.stopPropagation(); SIDEFOLD.set(!f); draw(); };
        const ann = c => h('div.pv-sf-ann', { style: { '--hc': c } }, h('i'), h('i.s'));
        const side = f ? h('div.pv-sf-side', { title: 'Open the panel', on: { click: toggle } }, chev(), h('span.pv-sf-rail', '3 highlights · 1 note'))
          : h('div.pv-sf-side', h('div.pv-sf-top', h('span', 'Highlights and notes'), h('span.sp'), Object.assign(chev(), { title: 'Fold the panel to the side', onclick: toggle })), ann('#F6D55C'), ann('#90BE6D'), ann('#7FB3E8'));
        wrap.replaceChildren(h('div.pv-sf' + (f ? '.f' : ''), rdPage(), side),
          PV.cap((f ? 'Folded: the page has the room; click the strip to open the panel. ' : 'Open: › folds the panel to a strip at the side. ') + (start === 'open' ? 'A file you open starts with it open.' : start === 'folded' ? 'A file you open starts with it folded.' : 'A file you open finds it as you left it.') + ' Try it here.')); };
      draw(); return [wrap];
    } });
  // V4.22 (17h): the References Map — a PDF's citations, hovered, show their paper; clicked, go to it; listed in the Highlights panel
  const rfmRefresh = () => { try { REFMAP.refresh(); } catch (e) { } };
  D({ id: 'refmap', group: 'reading', label: 'References Map', isNew: true, presets: { simple: true }, changed: rfmRefresh,
    desc: 'In a PDF you read — maximised, beside a note, or in the Library’s reader — a citation in the text shows its paper when you rest the pointer on it, and a click takes you to that reference at the end of the paper (‹ Back returns you). The Highlights panel gains the References Map: every reference, numbered as in the paper, with how often it is cited. It uses the PDF’s own links when it has them; without links (older papers) it finds the citations in the text — numbered superscripts, [12], (12), Smith et al. 2014 — the journal saying which style to expect. Off: no map, no card, a click on a citation does nothing.',
    tune: [T('delay', 'The card shows after resting on a citation for', 'seg', { isNew: true, def: '1000', opts: [['600', '0.6 s'], ['1000', '1 s'], ['1500', '1.5 s']], d: 'Moving away before then shows nothing', changed: rfmRefresh }),
      T('find', 'Citations come from', 'seg', { isNew: true, def: 'both', opts: [['both', 'Its links, then the text'], ['links', 'The PDF’s links only']], d: 'The text: numbered superscripts, [12], (12), author and year — for papers without links', changed: rfmRefresh })],
    preview: () => {
      const wrap = h('div'), on = FEAT.on('refmap'), links = tune('refmap', 'find') === 'links', d = (+tune('refmap', 'delay') || 1000) / 1000;
      let shown = false;
      const draw = () => {
        const cite = (t, sup) => h(sup ? 'sup.cite' : 'span.cite', { class: shown && on ? 'on' : '', on: { click: e => { e.stopPropagation(); if (!on) return; shown = !shown; draw(); } } }, t);
        const pg = h('div.pv-rfm-pg', 'Cells pull hardest at the leading edge', cite('1,2', true), ' and relax behind it, as traction maps show', cite('3', true), '.',
          shown && on ? h('div.pv-rfm-card', h('span.mono.tiny.muted', '1 · Style et al. · 2014'), h('b', 'Traction force microscopy in physics and biology'), h('span.tiny', h('i', 'Soft Matter'), ' · In your Library')) : null);
        const side = h('div.pv-rfm-side', h('h6', 'References Map'), h('div', h('i', '1'), 'Style 2014', h('span', '×2')), h('div', h('i', '2'), 'Plotnikov 2012', h('span', '×1')), h('div', h('i', '3'), 'Legant 2010', h('span', '×1')));
        wrap.replaceChildren(h('div.pv-rfm' + (on ? '' : '.off'), pg, on ? side : null),
          PV.cap(!on ? 'Off: no map, no card; a click on a citation does nothing.' : (shown ? 'The card of reference 1 — it shows after resting ' + d + ' s on a citation; a click in the paper goes to the reference. ' : 'Click a citation here to see its card (in a paper, rest the pointer ' + d + ' s). ') + (links ? 'Citations come from the PDF’s links only.' : 'From the PDF’s links, or found in the text for older papers.')));
      };
      draw(); return [wrap];
    } });
  /* =============================== Widgets =============================== */
  const W = (id, label, desc, rows, pv, o = {}) => D(Object.assign({ id, group: 'widgets', label, desc: desc + ' Off: it leaves + Insert and the / commands; those already in your notes stay.', inserts: rows, preview: pv }, o));
  W('equations', 'Equations', '∑ Equation in a note, or in the text, and the registered equations shared by every note.', ['equation', 'equation-reg'],
    () => [h('div.pvb.pv-eq', h('div.pvb-h', h('span.pvb-n', 'Equation'), h('b', 'Young’s modulus')), h('div.pv-eqx', 'E = 3G(1 + ν)'))], { presets: { simple: true } });
  W('data', 'Data & plots', 'Plots, and binding a component to datasets, materials and a code version (⋯ → Data, materials & code…, the provenance chain). The Data tab is gone (V4.28): the data a step used is logged in its component’s data tree; the datasets registered before still open with /datasets.', ['plot'],
    () => [h('div.pvb', h('div.pvb-h', h('span.pvb-n', 'Plot'), h('b', 'Traction · Pa')), PV.svg(300, 70, '<polyline points="10,62 50,55 90,57 130,40 170,33 210,20 250,13 290,8" fill="none" stroke="var(--teal)" stroke-width="2" vector-effect="non-scaling-stroke"/>'))]);
  // V4.28 (13zzyc): the data tree — the folders and files a step used, logged in its component (it replaces the Data tab)
  const dtRefresh = () => { try { App.refresh(); } catch (e) { } };
  D({ id: 'datatree', group: 'widgets', label: 'Data tree', isNew: true, presets: { simple: true }, changed: dtRefresh,
    desc: 'The data an experiment used, logged in its component as a directory: ⋯ → Log data… (a folder, or files), /data in the text (or a new “Data” component), or drop files and folders from your computer on the component — on its tree, with Alt held, or a folder anywhere on it (a folder dropped on the paper makes a “Data” component there). The tree lists names, places, sizes and dates; nothing is copied and the files stay where they are. A click folds or unfolds a folder; × takes an entry out. Where the browser can keep the folder (Chrome or Edge on a computer), ⟳ Rescan reads it again and marks what is new, changed or gone until you accept it; elsewhere the tree is as it was logged. It replaces the Data tab: the datasets bound to a component there came into its tree, and the old page opens with /datasets. Off: no trees and no ways in; what was logged stays in the record.',
    tune: [T('open', 'A folder you log shows', 'seg', { isNew: true, def: 'top', opts: [['top', 'Its first level'], ['none', 'Only its name']], d: 'The folders inside it always start folded; a click unfolds one', changed: dtRefresh })],
    preview: () => {
      const on = FEAT.on('datatree'), top = tune('datatree', 'open') !== 'none', day = 86400000, t0 = Date.now();
      Object.keys(DTREE.st.open).forEach(k => { if (k.startsWith('_pvdt|')) delete DTREE.st.open[k]; });
      const f = (n, mb, d) => ({ n, s: Math.round(mb * 1048576), m: t0 - d * day });
      const fake = { id: '_pvdt', kind: 'component', dtree: { items: [
        { id: 'pv1', n: 'Run 3 · TFM export', dir: 1, at: isoLocal(new Date(t0 - day)), via: 'folder', k: [
          { n: 'beads', dir: 1, k: [f('field01_beads.nd2', 1880, 1), f('field02_beads.nd2', 1910, 1), f('field03_beads.nd2', 1870, 1)] },
          { n: 'cells', dir: 1, k: [f('field01_cells.nd2', 940, 1), f('field02_cells.nd2', 955, 1)] },
          f('traction-run3.csv', .02, 1)] },
        Object.assign(f('plate-map.xlsx', .03, 2), { id: 'pv2', at: isoLocal(new Date(t0 - day)), via: 'files' })] } };
      return [PV.box({ num: 'Block', label: 'Imaging, 30 kPa', body: 'Three fields per gel; beads 0.2 µm, 40× water.', extra: on ? [DTREE.el(fake, { pv: true })] : [] }),
        PV.cap(on ? 'Click a folder here to fold or unfold it. ' + (top ? 'A folder you log shows its first level; the folders inside it start folded.' : 'A folder you log shows only its name until you click it.') + ' Nothing is copied: the tree lists names, sizes and dates.' : 'Off: no data tree in any component, and no Log data… or /data; what was logged stays in the record and shows again when it is on.')];
    } });
  W('plates', 'Plates & wells', 'Well-plate maps: colours, images in wells, notes on wells, carried from plan to run.', ['plate', 'plate-carry'],
    () => [h('div.pv-plate', Array.from({ length: 24 }, (_, i) => h('i', { style: { background: i % 7 === 0 ? 'var(--teal)' : i % 5 === 0 ? 'var(--mag)' : '' } })))]);
  W('calc', 'Calculators', 'A calculator box with its own history, and the Calculator on a note’s tools.', ['calc'],
    () => [h('div.pv-calc', h('div.mono', '0.2 × 5 / 37 = 0.027'), h('div.pv-keys', ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−'].map(k => h('span', k))))]);
  W('figures', 'Figures & decks', 'Image panels laid out as figures with their letters, and PowerPoint decks shown as slides.', ['figure', 'deck'],
    () => [h('div.pv-fig', ['A', 'B', 'C', 'D'].map(l => h('div', h('span', l))))]);
  W('board', 'Whiteboard', 'The lab’s whiteboard in an image panel’s empty cell; click it to draw on it in the whole window.', [],
    () => [h('div.pv-board', PV.svg(300, 80, '<path d="M20 60 C 60 10, 100 10, 140 50 S 220 70, 270 20" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linecap="round"/><rect x="180" y="40" width="70" height="28" rx="4" fill="var(--surface)" stroke="var(--rule-2)"/>'))]);
  W('rec', 'Recordings', 'The microphone to an audio file and a transcript, one sentence a line, read on this computer.', ['rec'],
    () => [h('div.pvb', h('div.pvb-h', h('span.pvb-n', 'Recording'), h('b', 'Lab meeting'), h('span.sp'), h('span.pvb-st', '12:40')), h('div.pv-wave', Array.from({ length: 40 }, (_, i) => h('i', { style: { height: (6 + Math.abs(Math.sin(i * 1.7)) * 22) + 'px' } }))), h('div.pv-lines', h('div', h('span.mono', '0:12'), 'The beads drift after forty frames.'), h('div', h('span.mono', '0:19'), 'Check the focus lock.')))],
    { presets: { standard: false }, tune: [T('setup', 'Transcription on this computer', 'node', { render: () => STTUI.settings() })] });
  W('hw', 'Handwriting to text', 'Ink read as text on this computer (Convert to text in the lasso); the ink is kept with it.', [],
    () => [h('div.pv-hw', PV.svg(130, 50, '<path d="M8 34 q 8 -20 16 0 t 16 0 M48 20 v 18 M56 26 q 6 -8 12 0 v 12 M78 34 q 8 -20 16 0 t 16 0" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>'), h('span', '→'), h('span.serif', 'mean edge'))],
    { presets: { standard: false }, tune: [T('setup', 'Reading on this computer', 'node', { render: () => HWUI.settings() })] });

  /* =============================== Tabs & overview =============================== */
  const TabF = (id, tab, label, desc, pv, o = {}) => D(Object.assign({ id, group: 'tabs', tab, label, desc: desc + ' Off: the tab leaves the row; its page still opens from links and search.', preview: () => [PV.tabs(tab), ...pv()] }, o));
  TabF('tasks', 'tasks', 'Tasks', 'The Tasks tab: everything to do, from every note.', () => [h('div.pv-list', [['Order fibronectin', 'Seeding notes'], ['Re-image field 3', 'Run 3']].map(([a, b]) => h('div', h('input', { type: 'checkbox', tabindex: '-1' }), h('b', a), h('span', b))))], { presets: { simple: true } });
  /* V4.17 — the Portfolio's section icons and every theme's banner (15f, 31-banners.css) */
  D({ id: 'pficons', group: 'tabs', label: 'Section headers', isNew: true, presets: { simple: true }, desc: 'Each kind of section in the Portfolio has its symbol — a flask for Experiments, a stack for Syntheses, a page of notes for Notes, an open book for Lit reviews — and its header (symbol, word and count) is a rounded box in that kind’s colour, the same in every project, so you see at a glance which is which: blue Experiments, plum Syntheses, ochre Notes, green Lit reviews. The switch above them carries the same symbols and colours. Off: the words alone.',
    tune: [T('box', 'Colour-coded boxes', 'seg', { isNew: true, def: 'on', opts: [['on', 'On'], ['off', 'Off — the symbols alone']], d: 'Each header in a rounded box of its kind’s colour', changed: () => { try { App.refresh(); } catch (e) { } } })],
    changed: () => { try { App.refresh(); } catch (e) { } },
    preview: () => { const on = FEAT.on('pficons'), box = on && FEAT.tune('pficons', 'box') !== 'off', ico = k => on ? PFICON.el(k, 13) : null;
      return [h('div.pv-pfi', h('div.pv-pfi-seg', [['exp', 'Experiments', 3], ['syn', 'Syntheses', 1], ['notes', 'Notes', 5], ['lit', 'Lit reviews', 2]].map(([k, l, n], i) => h('span' + (i ? '' : '.on'), { 'data-sk': k }, ico(k), l, h('i', String(n))))),
        h('div.pv-pfi-g', [['exp', 'Experiments', 3], ['syn', 'Syntheses', 1], ['notes', 'Notes', 5], ['lit', 'Lit reviews', 2]].map(([k, l, n]) => h('div' + (box ? '.pf-box' : ''), { 'data-sk': k }, ico(k), h('span', l), h('span.pvc', String(n)))))),
        PV.cap(!on ? 'Off: the sections by their words alone.' : box ? 'Each kind of section in its own colour, the same in every project: its header a rounded box, its symbol on the switch.' : 'The symbols, without the coloured boxes.')]; } });
  D({ id: 'tbanner', group: 'tabs', label: 'Theme banners', isNew: true, presets: { simple: true }, desc: 'Every theme has a banner, 1600 × 200 px (8 : 1), with the theme’s name inside it at the left: at the top of its section in the Portfolio and of its page, where the name is the page’s title. Click it to choose an image — ask Claude for one at that size; another size is cropped to fit — or to remove it. A theme without an image gets a quiet banner drawn from its name, in the app’s colours. Off: no banners; the images stay with their themes.',
    tune: [T('where', 'Show the banner', 'seg', { isNew: true, def: 'both', opts: [['both', 'Portfolio and page'], ['portfolio', 'In the Portfolio'], ['page', 'On the theme’s page']] })],
    preview: () => { const w = tune('tbanner', 'where') || 'both', ban = (key, name, cls) => { const b = h('div.tb-ban.drawn.pv-tb-ban' + (cls ? '.' + cls : '')); b.innerHTML = BANNER.drawn(key); b.append(h('span.tb-name', name)); return b; };
      const pf = h('div.pv-tb', h('div.pv-tb-k', 'Portfolio'), ban('pv|Traction vs stiffness', 'Traction vs stiffness'), h('div.pv-tb-sh', h('span.pvc', '2 milestones'), h('span.pvc', 'steady')), ban('pv|Detection floor', 'Detection floor'), h('div.pv-tb-sh', h('span.pvc', 'exploratory')));
      const pg = h('div.pv-tb', h('div.pv-tb-k', 'Theme page'), h('div.pv-tb-k', 'Gels · theme'), ban('pv|Traction vs stiffness', 'Traction vs stiffness', 'pg'));
      return [w === 'page' ? pg : w === 'portfolio' ? pf : h('div.pv-tb2', pf, pg), PV.cap('1600 × 200 px, the theme’s name inside at the left. Click a banner to choose an image (ask Claude for one at this size) or remove it; without one, each theme gets a banner drawn from its name.')]; } });
  TabF('atlas', 'atlas', 'Atlas', 'The Atlas: the notebook in a room in 3D with three axes, each sorting by one thing you pick — time (oldest at the origin, newer outward), kind, project, note, note type, term, people, status or connections. Drag turns it, Shift+drag moves it. Each dot is a glass bead that opens into the term page’s bubble only when you rest the pointer on it a moment, tap it or pin it; a click visits it in its note, and a small bubble there brings you back. Bridges and connections are threads with an arrow and a light running from where they start; resting on one shows both its ends. The axes tighten as you go further: days close up, months far off.', () => [ATLAS3.preview()],
    { tune: [T('ctrlk', 'Ctrl+K opens the Atlas', 'switch', { d: 'Off: Ctrl+K opens the list, as before', get: () => ATLAS.on(), set: v => saveSettings({ labs: Object.assign({}, settings().labs, { atlas: v }) }) }),
      T('start', 'It starts on', 'select', { isNew: true, def: 'last', opts: [['last', 'The axes I used last'], ['story', 'Story over time'], ['loops', 'Open loops'], ['who', 'Who did what'], ['terms', 'Terms across notes'], ['busy', 'Most connected'], ['mine', 'These three ↓']], d: 'The first visit is Story over time: time × kind × project' }),
      ...[0, 1, 2].map(a => T('ax' + a, 'XYZ'[a] + ' axis (with “These three”)', 'select', { isNew: true, def: ['time', 'kind', 'project'][a], opts: Object.entries(ATLAS3.DIMS).map(([k, D]) => [k, D.label]) })),
      T('cap', 'Bubbles that open as you come close', 'range', { isNew: true, def: 0, min: 0, max: 8, step: 1, zero: 'never — only the one you rest on, tap or pin', d: 'Off by default: a bubble opens only when you ask for it. Above 0, the nearest dots open by themselves once the room has been still a moment, at most this many (pinned ones count)' }),
      T('near', 'With bubbles opening as you come close: they open when a dot looks', 'range', { isNew: true, def: 5, min: 3, max: 9, step: 1, unit: ' % of the room', d: 'Smaller: they open from further away' }),
      T('hoverMs', 'Resting on a dot opens it after', 'range', { isNew: true, def: 1000, min: 0, max: 2000, step: 100, unit: ' ms', zero: 'at once', d: 'A ring closes in round the dot meanwhile, so moving through the room never pops bubbles open. Coming close waits as long for the room to be still, and so does a thread’s popup' }),
      T('float', 'Float', 'switch', { isNew: true, def: true, d: 'The dots and bubbles drift a little, each on its own; still with reduced motion. With many dots only the open bubbles drift' }),
      T('amount', 'How far they float', 'range', { isNew: true, def: 3, min: 1, max: 8, step: 1, unit: ' px' }),
      T('bridges', 'Bridges as threads', 'switch', { isNew: true, def: true, d: 'Dashed, from the component to where it shows in the other note, with an arrow' }),
      T('wires', 'Connections as threads', 'switch', { isNew: true, def: true, d: 'Wires and links between components, with an arrow' }),
      T('pulses', 'A light runs along each thread', 'switch', { isNew: true, def: true, d: 'From where it starts to where it goes, in the colour of its kind of component or structure. Off, or with reduced motion: a dot of that colour where it starts' }),
      T('pulseSpeed', 'How fast the light runs', 'range', { isNew: true, def: 2, min: 1, max: 5, step: 1 }),
      T('ticks', 'The axes tighten as you go further', 'switch', { isNew: true, def: true, d: 'Days close up, then weeks, months, quarters and years as you scroll away; long names shorten. Off: the ticks stay as the span gives them' }),
      T('room', 'Floor and walls', 'switch', { isNew: true, def: true, d: 'The two far walls with their grid, and the lines across to them from the dot you point at. Off: only the floor' }),
      T('labels', 'Labels beside the dots', 'seg', { isNew: true, def: 'few', opts: [['none', 'None'], ['few', 'A few'], ['many', 'Many']], d: 'Never over another label or an open bubble' })] });
  // V4.19: the Activity tab left the row (Gabe: "Remove Activity tab → Make the Activity interactable in Portfolio for each Project or Theme"); its parts open from the Portfolio (19b)
  D({ id: 'pfactivity', group: 'tabs', label: 'Portfolio activity', isNew: true, desc: 'A project’s or a theme’s activity in the Portfolio — its heat strip, “active 2d ago” or “stalled”, its score — opens its activity in a panel at the right: why it is active or stalled and how that is counted, eight weeks of activity, the time recorded, its notes still in their two weeks, what moved (each line goes to the note) and, for a project, its themes. #/activity (Today’s “Activity →”) opens the whole notebook’s there: the old Activity tab. Off: the strips are plain again and #/activity is the old page.',
    tune: [T('rows', 'The strips in the list open it too', 'switch', { isNew: true, def: true, d: 'A row’s small strip picks the project and opens its activity. Off: only the open project’s header and its themes do' })],
    preview: () => {
      const wrap = h('div'), lv = [0, 1, 0, 2, 3, 1, 0, 0, 2, 4, 3, 1, 2, 0, 1, 3, 4, 2, 1, 0, 0, 2, 3, 1, 4, 2, 0, 1, 3, 2, 1, 0, 2, 4, 3, 2, 1, 0, 0, 1, 2, 3];
      let open = false;
      const draw = () => { const live = on('pfactivity'), hot = el => { if (!live) return el; el.classList.add('pfa-hot'); el.title = 'Click: its activity'; el.addEventListener('click', e => { e.stopPropagation(); open = !open; draw(); }); return el; };
        const strip = hot(h('div.pv-pfa-strip', lv.map(l => h('i', { style: l ? { background: 'var(--hm-' + l + ')' } : null }))));
        wrap.replaceChildren(h('div.pv-pfa', h('div.pv-pfa-h', h('b', 'Traction force'), h('div.pv-pfa-line', hot(h('span', 'activity 34 · 4 wk')), hot(h('span', 'active 2d ago')))), strip,
          live && open ? h('div.pv-pfa-panel', h('div.r', h('b', '34'), h('span', 'activity · 4 wk'), h('span.pfa-st.sm.ok', 'active 2d ago')),
            h('div.r', h('span', 'What moved'), 'Takeaway — the edge collapsed at 10 ng/mL', h('span', '+10')), h('div.r', h('span', 'Notes in their two weeks'), '30 kPa series Run 3')) : null),
          PV.cap(live ? (open ? 'Its activity: why it is active, what moved, its notes and themes — ✕ or Esc closes it.' : 'Click the strip, the score or “active 2d ago” to open its activity.') : 'Off: the strips are plain, as before; #/activity is the old page.'));
      };
      draw(); return [wrap];
    } });
  TabF('materials', 'materials', 'Materials', 'The Materials tab: gel batches, cell lines, antibody lots and the notes that used them.', () => [h('div.pv-list', [['PAA gel batch 15', '8 kPa · bench 3'], ['MDCK p12', 'LN2 box 2']].map(([a, b]) => h('div', h('b', a), h('span', b))))]);
  TabF('canvas', 'canvas', 'Spatial canvases (lab)', 'Canvases where components, structures, papers and datasets are arranged freely; drawn lines become real connections; export as JSON Canvas. An experiment: presets leave it as it is.', () => [PV.cap('A Canvas tab in the row.')],
    { keep: true, nb: true, get: () => CANVAS.on(), set: v => { if (CANVAS.on() !== !!v) CANVAS.toggleLab(); } });   // a lab experiment: presets leave it as it is
  // V4.12 (20-settings.js featurePage, 20b-demos.js): a feature's page shows a recording of it being used in a test note, and what it is for in the words of whoever asked for it
  D({ id: 'demos', group: 'tabs', label: 'Feature demonstrations', isNew: true, presets: { simple: true }, desc: 'Each feature has a page of its own in Settings (click its tile): what it is, what it is for in the words of whoever asked for it, a recording of it being used in a test note with its steps under it, its live preview and its settings. A recording plays only when you press Play; a step plays it from there. Off: the pages keep everything but the recordings.',
    tune: [T('speed', 'Recordings play at', 'seg', { isNew: true, def: '1', opts: [['0.75', '¾ speed'], ['1', 'Normal speed'], ['1.5', '1.5×']] }),
      T('captions', 'The step being shown, under the recording', 'switch', { isNew: true, def: true, d: 'Off: only the list of steps' }),
      T('loop', 'At the end, a recording', 'seg', { isNew: true, def: 'stop', opts: [['stop', 'Stops'], ['loop', 'Starts again']] })],
    preview: () => { const sp = String(tune('demos', 'speed') || '1'), cap = tune('demos', 'captions') !== false, loop = tune('demos', 'loop') === 'loop', d = FEAT.demo('floats'), n = FEAT.list.length - FEAT.undemoed().length;
      const st = [['0:01', 'Right-click → Make it a float'], ['0:13', '/float raises the dome'], ['0:27', 'Drag one out onto the note']];
      return [h('div.pv-demo', h('div.pv-demo-f', d && d.poster && on('demos') ? h('i', { style: { backgroundImage: 'url(' + d.poster + (d.v ? '?v=' + d.v : '') + ')' } }) : null, on('demos') ? h('span.pl', '▶') : null, on('demos') && sp !== '1' ? h('span.sp', (sp === '0.75' ? '¾' : sp) + '×') : null),
          on('demos') && cap ? h('div.pv-demo-cap', st[1][1]) : null, h('ol', st.map(([t, x], i) => h('li' + (i === 1 && on('demos') ? '.on' : ''), h('span', on('demos') ? t : (i + 1) + '.'), x)))),
        PV.cap(on('demos') ? 'Play starts it' + (sp === '1' ? '' : ' at ' + (sp === '0.75' ? '¾ speed' : sp + '×')) + '; a step plays from there. ' + (cap ? 'The step being shown is written under it. ' : '') + (loop ? 'It starts again at the end. ' : '') + plural(n, 'feature') + ' of ' + FEAT.list.length + ' ' + (n === 1 ? 'has' : 'have') + ' a recording so far.' : 'Off: a page keeps what the feature is for and its steps, without the recording.')]; } });
  D({ id: 'pfdots', group: 'tabs', label: 'Portfolio dots', desc: 'The count dots beside notes and projects in the Portfolio — open barriers, reminders, Needs investigation (breathing).',
    preview: () => [h('div.pv-pf', h('b', '30 kPa series'), h('span.pfdots', h('span.pfdot', { style: { '--c': 'var(--k-barrier, #c92a2a)' } }, '1'), h('span.pfdot.inv', { style: { '--c': 'var(--k-investigate)' } }, '2'), h('span.pfdot', { style: { '--c': 'var(--warn)' } }, '3')))] });
  D({ id: 'syncdot', group: 'tabs', label: 'Sync dot', presets: { simple: true }, desc: 'The dot in the header: green in step, amber while it works, grey when offline, red with one plain sentence when it failed. Off: it shows only when something is wrong.',
    preview: () => [h('div.pv-hd', h('b', 'Scientia'), h('span.sp'), h('span.pv-sync', { title: 'In step' }), h('span', '⌕ Search'))] });
}

/* ---------- the guards: what a feature switched off takes away (CSS for the rest: 24-kinds.css, body.f-off-<id>) ---------- */
{
  const wrap = (obj, name, id, off) => { if (!obj || typeof obj[name] !== 'function') return; const o = obj[name]; obj[name] = function () { return FEAT.on(id) ? o.apply(this, arguments) : (typeof off === 'function' ? off.apply(this, arguments) : off); }; };
  // the page's classes before each draw (a notebook synced from elsewhere can change them), and at once
  const rf = App.refresh; App.refresh = function () { FEAT.apply(); return rf.apply(this, arguments); };
  if (document.body) FEAT.apply(); else addEventListener('DOMContentLoaded', () => FEAT.apply());
  // a feature's tab leaves the row (its page still opens from a link or search)
  const rt = App.renderTabs; App.renderTabs = function () { const r = rt.apply(this, arguments); try { $$('#tabs .tab').forEach(a => { const k = a.dataset.k; a.hidden = !(FEAT.tabOn(k) && (k !== 'canvas' || CANVAS.on())); }); } catch (e) { console.warn('[feat] tabs', e); } return r; };
  // + Insert, / and the navigation bar: a feature's rows leave while it is off (they stay in INSERTS for the code that looks them up; a row's own `when` keeps its place in the order)
  FEAT.insertOn = id => { const f = FEAT.list.find(x => (x.inserts || []).includes(id)); return !f || FEAT.on(f.id); };
  FEAT.wireInserts = () => { if (typeof INSERTS === 'undefined') return; INSERTS.forEach(r => { if (!r || r._feat) return; const own = Object.getOwnPropertyDescriptor(r, 'when'), w = own ? r.when : undefined; r._feat = true;
    Object.defineProperty(r, 'when', { configurable: true, enumerable: true, get: () => FEAT.insertOn(r.id) ? w : () => false, set: v => { Object.defineProperty(r, 'when', { value: v, writable: true, configurable: true, enumerable: true }); } }); }); };
  setTimeout(FEAT.wireInserts, 0);
  if (typeof INSERT !== 'undefined') { const im = INSERT.menu; INSERT.menu = function () { FEAT.wireInserts(); return im.apply(this, arguments); }; }
  { const ci = CMD.inserts; CMD.inserts = function () { FEAT.wireInserts(); const out = ci.apply(this, arguments); return Array.isArray(out) ? out.filter(x => { const id = String((x.alias || [])[0] || '').replace(/^insert-/, ''); return !id || FEAT.insertOn(id); }) : out; }; }
  // canvas & notes
  wrap(EBAR, 'show', 'editbar', function () { EBAR.hide(); });
  wrap(SLASH, 'open', 'slash', null);
  wrap(DocView, 'wireDrag', 'wires', null);
  wrap(REGION, 'create', 'regions', () => { toast('Regions are off — Settings → Features → Regions'); return null; });
  wrap(DAY, 'chips', 'daychips', () => []);
  { const hc = hoverCard; hoverCard = function () { return FEAT.on('hover') ? hc.apply(this, arguments) : undefined; }; }
  wrap(HANDS, 'hover', 'edgepan', () => { try { HANDS.quiet(); } catch (e) { } });
  // structures
  wrap(TERMSCAN, 'afterEdit', 'terms', null); wrap(TERMSCAN, 'sweep', 'terms', null);
  wrap(ED, 'termKeyHit', 'terms', false);
  wrap(INVEST, 'home', 'investigate', () => { const rs = RESURF.card(); return rs ? [h('div.sec-h', { style: { marginTop: '24px' } }, h('h2', 'Resurfaced')), rs] : null; });
  wrap(RESURF, 'card', 'resurface', null);
  // bridges
  wrap(BRIDGE, 'marks', 'bridgeMarks', () => []);
  wrap(EXCERPT, 'pull', 'excerpts', (d, at, src, j) => CLIPX.component(d, at, j.text, src, j));
  // time
  wrap(REM, 'home', 'reminders', null); wrap(REM, 'check', 'reminders', null);
  wrap(CHORES, 'dayRow', 'chores', null); wrap(CHORES, 'weekEl', 'chores', null);
  // widgets
  wrap(INK, 'convert', 'hw', () => toast('Handwriting to text is off — Settings → Features → Handwriting to text'));
  wrap(INK, 'convertSel', 'hw', () => toast('Handwriting to text is off — Settings → Features → Handwriting to text'));
}
