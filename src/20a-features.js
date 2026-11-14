/* ==========================================================================
   20a · Every feature, registered (V3.995 — see 02b-feat.js for the rules).
   Each FEAT.def says what the feature is, which presets have it, what it
   needs, its settings (new ones stored by FEAT, existing ones bound to their
   old settings() key with get / set) and its live preview, drawn with PV.
   Below the list, the guards: what switching a feature off takes away —
   wrapped around the feature's own code here, or CSS under body.f-off-<id>
   (24-kinds.css), so the modules themselves stay as they were.
   A new feature is not finished until it is here, with a preview that
   follows its settings (Gabe, 14 Nov 2026; FEAT.audit()).
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
  D({ id: 'writing', group: 'canvas', core: true, label: 'Writing in components', desc: 'Components and their text: the notebook itself. Typing replacements turn what you type into the symbols scientists write.',
    tune: [T('replace', 'Typing replacements', 'node', { d: 'Backspace right after a replacement undoes it', render: () => h('div.st-checks', [['arrows', 'Arrows', '--> → · <-- ← · <-> ↔ · => ⇒'], ['science', 'Science symbols', '+- ± · >= ≥ · <= ≤ · != ≠ · ~= ≈ · 37 deg → 37° · 5 uL → 5 µL · 3x4 → 3×4'], ['scripts', 'Super- and subscripts', '^2 → ² · ^-1 → ⁻¹ · CO_2 → CO₂'], ['typo', 'Dashes and quotes', '-- → – · --- → — · ... → … · “curly” ‘quotes’']].map(([k, l, ex]) =>
      h('label.st-check', h('input', { type: 'checkbox', checked: (settings().autoReplace || {})[k] !== false, on: { change: e => { saveSettings({ autoReplace: Object.assign({}, settings().autoReplace, { [k]: e.target.checked }) }); SettingsView.repaint(); } } }), h('span', h('b', l), h('div.st-th', ex))))) })],
    preview: () => { const r = settings().autoReplace || {}, x = (k, a, b) => r[k] !== false ? b : a;
      return [PV.box({ num: 'Block', label: 'Gels', body: ['Batch 14 ', x('arrows', '-->', '→'), ' stiffer: 30 kPa ', x('science', '+-', '±'), ' 2, at 37', x('science', ' deg', '°'), ', 5 ', x('science', 'uL', 'µL'), ' beads, CO', x('scripts', '_2', '₂'), ' 5 % ', x('typo', '--', '–'), ' as planned', x('typo', '...', '…')] }),
        PV.cap('As you type: what each replacement switched on turns the plain characters into symbols.')]; } });

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

  D({ id: 'regions', group: 'canvas', label: 'Regions', desc: 'Frames that group components: drawn with a right-drag loop, snapped to their members, named and coloured, nested, folded into their title, connected and bridged like a component. Off: no new ones are drawn and open frames are hidden; folded ones stay so nothing inside is lost.',
    preview: () => [h('div.pv-region', h('span', 'Gels'), run3({ stamp: null, body: 'The edge collapsed.' }), PV.box({ num: 'Block', label: 'Batch 14', body: 'Stiffer than 13.' }))] });

  D({ id: 'lineage', group: 'canvas', label: 'Earlier versions', desc: '“▸ 2 earlier versions” under a revised component, with the structures still on the old wording; open it to read them.',
    tune: [T('depth', 'Generations shown', 'range', Object.assign({ min: 1, max: 10 }, B('lineageDepth', () => changed())))],
    preview: () => { const n = tune('lineage', 'depth'); return [run3({ stamp: null, extra: [h('div.pv-ghostbar', '▾ 4 earlier versions · 1 structure still on the old wording'),
      h('div.pv-ghosts', [1, 2, 3, 4].filter(i => i <= n).map(i => h('div', h('span', 'generation ' + i), ['The edge broke at 10 ng/mL.', 'The edge broke at high EGF.', 'Edge unstable.', 'Edge?'][i - 1])), n < 4 ? h('div.muted', (4 - n) + ' older consolidated') : null)] })]; } });

  D({ id: 'synthesis', group: 'canvas', label: 'Synthesis box', desc: '“What this note adds up to”: the box at the top of a note for the one or two sentences you would tell your advisor. Off: an empty box is hidden; one you wrote in stays.',
    preview: () => [h('div.pv-synth', h('div.pvb-h', h('span.pvb-n', 'Synthesis'), h('span.sp'), h('span.pvb-st', 'what this note adds up to')), h('div.pvb-tx.muted', 'What this note adds up to — one or two sentences you would tell your advisor…')), run3({ stamp: null })] });

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

  /* =============================== Structures =============================== */
  D({ id: 'structures', group: 'structures', core: true, label: 'Structures', desc: 'Selected words given a meaning: claim, barrier, question and the rest, each in its colour and style, with a status where it has one. Your own kinds of component are here too.',
    tune: [T('key', 'Key', 'seg', Object.assign({ opts: [['ctrl+enter', 'Ctrl+Enter'], ['alt+enter', 'Alt+Enter'], ['ctrl+shift+enter', 'Ctrl+Shift+Enter']] }, B('structKey'))),
      T('classify', 'Classify', 'seg', Object.assign({ opts: [['mark', 'On marking'], ['review', 'In review']], d: 'Mark now as a takeaway and sort it later, in review' }, B('classifyOn'))),
      T('kinds', 'Colour and style per kind', 'node', { d: 'Text colour keeps the page calm; highlight makes a kind impossible to miss', render: () => SettingsView.kindsUI() }),
      T('ckinds', 'Kinds of component', 'node', { render: () => { const n = CKINDS.settingsUI(); $$(':scope > .sec, :scope > .sec-h', n).forEach(x => x.remove()); return n; } })],
    preview: () => [h('div.pv-kinds', KINDS.slice(0, 8).map(k => h('div', h('kbd', k.key.toUpperCase()), PV.st(k.id, k.label.toLowerCase() + ' — ' + ({ claim: 'collapsed at 10 ng/mL', barrier: 'gels tear above 40 kPa', question: 'is batch 14 too stiff?', evidence: '3 of 3 fields', result: 'traction 1.2 kPa' }[k.id] || 'as marked'))))),
      PV.cap('Select words, press ' + keyLabel(settings().structKey) + ', then the letter.')] });

  D({ id: 'terms', group: 'structures', label: 'Terms', tab: 'terms', desc: 'Words you mark as terms of the project, outlined in bold and found by themselves in every note that uses them, with the Terms tab and their nests. Off: no outline, no scanning, no Terms tab; the terms stay.',
    tune: [T('key', 'Mark a term', 'seg', Object.assign({ opts: [['alt+w', 'Alt+W'], ['alt+shift+w', 'Alt+Shift+W']], d: 'Ctrl+W in Focus mode' }, B('termKey')))],
    preview: () => [PV.box({ num: 'Block', label: 'Gels', body: ['Every ', on('terms') ? h('span.term-demo', 'traction force') : 'traction force', ' map on the ', on('terms') ? h('span.term-demo', '30 kPa gel') : '30 kPa gel', ' drifted.'] }), PV.cap('Mark one with ' + keyLabel(settings().termKey) + '; it is found in every other note too.')] });

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

  D({ id: 'review', group: 'time', label: 'Weekly review', tab: 'review', desc: 'The weekly bet: what needs addressing, decide, what moved, rate, friction, signal, and next week. It opens on the weekend after the week ends and writes a review note.',
    tune: [T('start', 'The week runs from', 'seg', Object.assign({ opts: [[6, 'Saturday'], [0, 'Sunday'], [1, 'Monday']] }, { get: () => settings().weekStartDow, set: v => { saveSettings({ weekStartDow: +v }); changed(); } })),
      T('preview', 'Preview the unfinished week', 'switch', { get: () => !!settings().reviewPreview, set: v => { saveSettings({ reviewPreview: v }); changed(); } })],
    preview: () => [h('div.pv-steps', ['What needs addressing', 'Decide', 'What moved', 'Rate', 'Friction', 'Signal', 'Next week’s bet'].map((x, i) => h('div' + (i === 1 ? '.on' : ''), h('span', String(i + 1)), x))),
      PV.cap('Week: ' + ({ 6: 'Saturday → Friday', 0: 'Sunday → Saturday', 1: 'Monday → Sunday' }[settings().weekStartDow] || '') + '.')] });

  D({ id: 'chores', group: 'time', label: 'Recurring chores', presets: { standard: false }, desc: 'Lab chores that repeat — the water bath, the CO₂ tank — due ones shown in the day note.',
    tune: [T('list', 'Chores', 'button', { button: 'Recurring chores…', run: () => CHORES.manage() })],
    preview: () => [h('div.pv-list', [['Water bath', 'every Monday', 'due today'], ['CO₂ tank', 'every 2 weeks', 'in 4 days'], ['Autoclave log', 'every Friday', 'done']].map(([a, b, c]) => h('div', h('input', { type: 'checkbox', tabindex: '-1', checked: c === 'done' }), h('b', a), h('span', b), h('em', c))))] });

  /* =============================== Reading & sources =============================== */
  D({ id: 'library', group: 'reading', label: 'Library', tab: 'library', presets: { simple: true }, desc: 'Papers and their PDFs, the reader with highlights and notes, and citations in your text. Off: the Library tab leaves; citations and papers stay.',
    tune: [T('cite', 'Citations show', 'seg', Object.assign({ opts: [['title', 'Title'], ['author', 'Author–year'], ['number', 'Numbered']] }, B('citeMode')))],
    preview: () => { const m = settings().citeMode, c = m === 'author' ? '(Style et al., 2014)' : m === 'number' ? '[3]' : 'Traction force microscopy in physics and biology';
      return [PV.box({ num: 'Block', label: 'Background', body: ['Cells pull on soft gels as they move ', h('span.pv-cite', c), '.'] })]; } });

  D({ id: 'eqcap', group: 'reading', needs: 'library', label: 'Equation capture', desc: '∑ Capture equation in the Library’s reader: draw a box round an equation on the page, check it, name it — registered with its paper and page.',
    preview: () => [h('div.pv-page', h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-eqbox', 'E = 3G(1 + ν)'), h('div.pv-pl'), h('div.pv-pl.s')), PV.cap('∑ Capture equation, then a box round it.')] });

  D({ id: 'litrev', group: 'reading', label: 'Lit reviews', tab: 'litreviews', desc: 'Literature reviews: a tab of their own, and each project’s Lit reviews column.',
    preview: () => [h('table.pv-tbl', h('tr', h('th', 'Paper'), h('th', 'Method'), h('th', 'Finding')), h('tr', h('td', 'Style 2014'), h('td', 'TFM'), h('td', 'review')), h('tr', h('td', 'Plotnikov 2014'), h('td', 'FRET'), h('td', 'focal adhesions')))] });

  D({ id: 'webcap', group: 'reading', label: 'Web capture', inserts: ['website'], desc: 'A web page kept as it was the moment it was saved, in a note: + Insert → Website…, or a page saved from the browser. Off: it leaves + Insert; pages already captured stay.',
    preview: () => [h('div.pvb', h('div.pvb-h', h('span.pvb-n', 'Website'), h('b', 'Traction force microscopy — Wikipedia'), h('span.sp'), h('span.pvb-st', 'kept 13 Nov')), h('div.pv-page', { style: { margin: '0 10px 10px' } }, h('div.pv-pl'), h('div.pv-pl.s'), h('div.pv-pl'), h('div.pv-pl.s')))] });

  /* =============================== Widgets =============================== */
  const W = (id, label, desc, rows, pv, o = {}) => D(Object.assign({ id, group: 'widgets', label, desc: desc + ' Off: it leaves + Insert and the / commands; those already in your notes stay.', inserts: rows, preview: pv }, o));
  W('equations', 'Equations', '∑ Equation in a note, or in the text, and the registered equations shared by every note.', ['equation', 'equation-reg'],
    () => [h('div.pvb.pv-eq', h('div.pvb-h', h('span.pvb-n', 'Equation'), h('b', 'Young’s modulus')), h('div.pv-eqx', 'E = 3G(1 + ν)'))], { presets: { simple: true } });
  W('data', 'Data & plots', 'Plots, datasets by reference (they stay where they were made) and their bindings, and the Data tab.', ['plot'],
    () => [h('div.pvb', h('div.pvb-h', h('span.pvb-n', 'Plot'), h('b', 'Traction · Pa')), PV.svg(300, 70, '<polyline points="10,62 50,55 90,57 130,40 170,33 210,20 250,13 290,8" fill="none" stroke="var(--teal)" stroke-width="2" vector-effect="non-scaling-stroke"/>'))], { tab: 'data' });
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
  TabF('atlas', 'atlas', 'Atlas', 'The Atlas: the notebook as one map in 3D — notes, components, structures, terms, people and papers.', () => [PV.svg(300, 80, '<g fill="var(--teal)"><circle cx="60" cy="40" r="9"/><circle cx="150" cy="22" r="6"/><circle cx="160" cy="60" r="7" fill="var(--mag)"/><circle cx="240" cy="38" r="9"/></g><g stroke="var(--rule-2)"><line x1="60" y1="40" x2="150" y2="22"/><line x1="60" y1="40" x2="160" y2="60"/><line x1="150" y1="22" x2="240" y2="38"/></g>')],
    { tune: [T('ctrlk', 'Ctrl+K opens the Atlas', 'switch', { d: 'Off: Ctrl+K opens the list, as before', get: () => ATLAS.on(), set: v => saveSettings({ labs: Object.assign({}, settings().labs, { atlas: v }) }) })] });
  TabF('activity', 'activity', 'Activity', 'The Activity tab: the heatmap of your days, themes and weekly numbers.', () => [h('div.pv-heat', Array.from({ length: 42 }, (_, i) => h('i', { style: { background: `var(--hm-${[0, 1, 2, 3, 0, 4, 2][i % 7]})` } })))]);
  TabF('materials', 'materials', 'Materials', 'The Materials tab: gel batches, cell lines, antibody lots and the notes that used them.', () => [h('div.pv-list', [['PAA gel batch 15', '8 kPa · bench 3'], ['MDCK p12', 'LN2 box 2']].map(([a, b]) => h('div', h('b', a), h('span', b))))]);
  TabF('canvas', 'canvas', 'Spatial canvases (lab)', 'Canvases where components, structures, papers and datasets are arranged freely; drawn lines become real connections; export as JSON Canvas. An experiment: presets leave it as it is.', () => [PV.cap('A Canvas tab in the row.')],
    { keep: true, nb: true, get: () => CANVAS.on(), set: v => { if (CANVAS.on() !== !!v) CANVAS.toggleLab(); } });   // a lab experiment: presets leave it as it is
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
