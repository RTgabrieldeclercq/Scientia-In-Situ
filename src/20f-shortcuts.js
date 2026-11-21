/* ==========================================================================
   20f · Shortcuts — one list of every key and gesture of the app
   (Gabe: "Add shortcuts list in Settings near command bar commands.")
   The keys were scattered over the code (the shell's handler, the editor, the
   calendar's CAL.key, the freewrite, the reader, the monthly review…) and the
   ? dialog listed only some of them. SHORT.items() is now the one list, written
   from those handlers; it is drawn in two places by the same SHORT.view():
   Settings → Keys & commands (just above the commands) and the ? dialog
   (helpModal in 11-shell.js, the /keys command, the palette).
   • grouped by where it works — everywhere, in a note, typing in a component,
     saying what words are, mouse · pen · touch, the command bar and menus,
     widgets, the reader and Library, the calendar, the freewrite, review ·
     terms · atlas — and searchable (the words of the key, what it does, the
     group); a chip row shows one group alone.
   • a key someone can rebind (structKey, termKey) shows the binding it has now,
     says when it is not the default, and "Change" opens the page of the feature
     that sets it. The structure letters are read from KINDS, so a new kind
     shows itself.
   • a shortcut of a feature that is switched off stays listed, dimmed.
   • Settings → Features → Shortcuts: the list on or off (the ? key too), and
     whether the mouse, pen and touch gestures are listed with the keys.
   A key added to the app later belongs in SHORT.items() — that is the whole
   cost, and the Settings page and the ? dialog both follow.
   ========================================================================== */
const SHORT = {
  GROUPS: [
    ['all', 'Everywhere', 'in every view'],
    ['note', 'In a note', 'on the paper, with nothing being typed'],
    ['text', 'Typing in a component', ''],
    ['mark', 'Saying what words are', 'select the words, press the structure key, then a letter'],
    ['mouse', 'Mouse, pen and touch', 'gestures'],
    ['bar', 'Command bar and menus', 'the / bar, the / menu in a component, pickers'],
    ['widgets', 'Widgets in a note', 'tables, the calculator, plates, protocols, connections'],
    ['read', 'Reader and Library', ''],
    ['cal', 'Calendar', ''],
    ['free', 'Freewrite', ''],
    ['more', 'Review, Terms and Atlas', ''],
  ],
  st: { q: '', g: '' },
  on: () => typeof FEAT === 'undefined' || FEAT.on('shortcuts'),
  tune: k => typeof FEAT === 'undefined' || FEAT.tune('shortcuts', k) !== false,
  /** Every shortcut as it stands now: { g, keys: [alternatives], d, bind?, feat?, tags? }. A key starting with ~ is a gesture, written in words. */
  items() {
    const s = settings(), out = [], K = (g, keys, d, o) => out.push(Object.assign({ g, keys: [].concat(keys), d }, o || {}));
    const tabs = (typeof TABS === 'undefined' ? [] : TABS).slice(0, 7).map((t, i) => (i + 1) + ' ' + t[1]).join(' · ');

    /* ---- everywhere (11-shell.js, 11c-navbar.js, 14b-atlas.js, 13zzz-rotate.js) ---- */
    // a row with act: is rebindable (20g-keymap.js): its key is the person's binding, with Change · Reset
    const A = id => KEYS.label(KEYS.get(id));
    K('all', A('search'), 'Search — relevance, recent or keyword; earlier versions open beside', { act: 'search', tags: 'find' });
    if (!KEYS.changed('search')) K('all', 'Ctrl+Shift+K', 'Quick search', { tags: 'find' });
    K('all', A('palette'), 'Command palette — everything the app can do', { act: 'palette', tags: 'commands' });
    K('all', A('switcher'), 'Quick switcher — open a note by name', { act: 'switcher', tags: 'go to open' });
    K('all', A('capture'), 'Capture to today’s day note, from anywhere (Ctrl+Enter in its box saves)', { act: 'capture', tags: 'day note quick' });
    K('all', A('newNote'), 'New note', { act: 'newNote' });
    K('all', A('undo'), 'Undo — outside a text box', { act: 'undo' });
    K('all', A('redo'), 'Redo — outside a text box', { act: 'redo' });
    K('all', A('redo2'), 'Redo — the second key, outside a text box', { act: 'redo2' });
    K('all', A('focus'), 'Focus mode: full screen, with the W key locked so Ctrl+W can mark a term; Esc (hold) leaves', { act: 'focus', tags: 'fullscreen' });
    K('all', A('back'), 'Back to the note you had open before', { act: 'back', tags: 'history' });
    K('all', A('forward'), 'Forward again', { act: 'forward', tags: 'history' });
    K('all', A('cmdbar'), 'The command bar at the bottom of the window — when nothing is selected, outside a text', { act: 'cmdbar', tags: 'commands navigation' });
    K('all', ['1 … 7'], 'Go to a tab, outside a note — ' + tabs, { tags: 'sections tabs numbers' });
    K('all', 'Esc', 'Close what is on top: a dialog, a popover, a maximised view, the command bar');
    K('all', A('help'), 'This list of keys and gestures — outside a text box (also /keys, and ' + A('palette') + ' → Keys and gestures)', { act: 'help', feat: 'shortcuts', tags: 'help shortcuts' });
    K('all', '~Esc three times', 'Puts the app upright again after Rotate', { feat: 'rotate', tags: 'rotate turn' });

    /* ---- in a note (99-boot.js, 13zzh-hands.js, 10-paper.js, 13zu2-bulk.js, 13zn-rec.js…) ---- */
    K('note', A('hand'), 'The Move tool (the hand) — pan the note with the pointer, outside a text', { act: 'hand', tags: 'pan hand' });
    K('note', A('newComponent'), 'A new component in the middle of what you see', { act: 'newComponent' });
    K('note', 'Enter', 'Edit the selected component, the caret at the end of its text');
    K('note', ['Delete', 'Backspace'], 'Remove the selected component (it asks first when it holds something) or the selected ink and components');
    K('note', A('fit'), 'Fit the whole note on the screen', { act: 'fit', tags: 'zoom' });
    K('note', '~Hold Space, drag', 'Pan the paper, even over components', { tags: 'pan' });
    K('note', ['←', '→'], 'Page through the selected Documents component, or flip the versions of the selected deck', { tags: 'pages deck' });
    K('note', 'Ctrl+C', 'Copy the selected components or ink (several selections: one piece per line); paste them in another note');
    K('note', A('mark'), 'While a Recording component records: mark this moment', { act: 'mark', tags: 'recorder mark important' });
    K('note', 'Esc', 'Let go of the selection (ink, lasso, held selections)');

    /* ---- typing in a component (09-editor.js, 13u-write.js, 13z-multisel.js, 13zzg-slash.js) ---- */
    K('text', 'Enter', 'A new component below, splitting the text at the caret');
    K('text', 'Shift+Enter', 'A line break inside the component');
    K('text', 'Backspace', 'In an empty component: remove it and go to the one above', { tags: 'delete' });
    K('text', 'Alt+↑', 'Go to the component above');
    K('text', 'Alt+↓', 'Go to the component below');
    K('text', 'Ctrl+B', 'Bold', { tags: 'format' });
    K('text', 'Alt+I', 'Italic', { tags: 'format' });
    K('text', 'Ctrl+U', 'Underline', { tags: 'format' });
    K('text', ['Tab', 'Shift+Tab'], 'In a list: indent · outdent the line');
    K('text', 'Backspace', 'Right after an automatic replacement (an arrow, a symbol, a superscript): puts back what you typed', { feat: 'writing', tags: 'undo replace' });
    K('text', 'Ctrl+I', 'Cite from the library — with text selected: add that text to the library', { tags: 'citation reference' });
    K('text', [A('structure')], 'Say what the selected words are: opens the structure letters (next group)', { act: 'structure', feat: 'structures', tags: 'structure claim barrier mark meaning' });
    K('text', [A('term'), 'Ctrl+W in Focus mode'], 'Mark the selected words as a term (the browser keeps Ctrl+W for closing the tab outside Focus mode)', { act: 'term', feat: 'terms', tags: 'term glossary' });
    K('text', '/', 'At the start of a word: the commands that act on the text, and every + Insert row', { feat: 'slash', tags: 'slash commands' });
    K('text', '@', 'Name a person', { feat: 'slash' });
    K('text', 'Esc', 'Save and leave the component');

    /* ---- saying what words are (the strip, 09-editor.js openStrip; letters read from KINDS) ---- */
    (typeof KINDS === 'undefined' ? [] : KINDS).forEach(k => K('mark', k.key.toUpperCase(), k.label + (k.lifecycle === 'open' ? ' — stays open until it is dealt with' : ''), { feat: 'structures', tags: 'structure ' + k.id }));
    K('mark', 'Enter', 'A takeaway, without choosing a letter', { feat: 'structures' });
    K('mark', '/', 'An existing structure instead — pick it from the notebook', { feat: 'structures' });
    K('mark', 'W', 'A term', { feat: 'terms' });
    K('mark', ['N', 'L'], 'A link (bridge) to a note', { feat: 'bridges', tags: 'bridge' });
    ((typeof ED !== 'undefined' && ED.stripExtra) || []).forEach(x => { if (x && x.key && x.label) K('mark', x.key.toUpperCase(), x.label); });
    K('mark', 'Esc', 'Leave without choosing');

    /* ---- mouse, pen and touch ---- */
    if (SHORT.tune('gestures')) {
      K('mouse', '~Double-click the paper', 'A new component there');
      K('mouse', '~Shift + drag a component', 'Move it a grid cell at a time', { tags: 'grid snap' });
      K('mouse', '~Shift + click a component', 'Zoom onto it (not while typing in it)', { feat: 'shiftzoom', tags: 'zoom fit focus' });
      K('mouse', '~Highlight words, then click a component’s title', 'Those words become the title; click it with nothing highlighted to type one (Esc puts the old one back)', { feat: 'comptitle', tags: 'label name rename' });
      K('mouse', '~Right-click', 'Pull in barriers or structures; bridge a component to another note; the component’s actions', { tags: 'context menu' });
      K('mouse', '~Drag ● on a component', 'Connect two components and say how — the direction matters', { feat: 'wires', tags: 'wire connect' });
      K('mouse', '~Drag the paper · wheel', 'Pan; Shift+wheel pans sideways', { tags: 'move scroll' });
      K('mouse', '~Ctrl + wheel · pinch', 'Zoom', { tags: 'scale' });
      K('mouse', '~Ctrl + click a link', 'Open that note (in a split view: in the pane you clicked)', { tags: 'wikilink' });
      K('mouse', '~Alt + click a link', 'Open it beside — up to four notes, two by two', { tags: 'split' });
      K('mouse', '~Ctrl + click a term', 'Open the term’s page', { feat: 'terms' });
      K('mouse', '~Ctrl + click a component', 'Add it to the selection (Ctrl+C copies the lot)', { tags: 'select several' });
      K('mouse', '~Hold Ctrl and select text', 'Keep what you selected before, in this component and in others; then Ctrl+B, Alt+I, Ctrl+U, Ctrl+C, Backspace or Ctrl+Enter act on all of it', { tags: 'multiple selections' });
      K('mouse', '~Double-click a bridged word', 'Go to the note it is bridged to', { feat: 'bridges' });
      K('mouse', '~Slim Pen: hold its button and loop', 'Lasso ink and components, whatever tool is on', { feat: 'pen', tags: 'pen lasso' });
      K('mouse', '~Slim Pen: the eraser end', 'Erase ink', { feat: 'pen', tags: 'pen eraser' });
      K('mouse', '~Two-finger tap', 'Undo', { tags: 'touch pen' });
      K('mouse', '~Three-finger tap', 'Redo', { tags: 'touch pen' });
      K('mouse', '~Finger drag · two fingers', 'Pan · zoom the note', { tags: 'touch' });
      K('mouse', '~Pointer at the screen’s edge, in Focus mode', 'Pans the note that way after a short rest (Move tool)', { feat: 'edgepan', tags: 'edge pan' });
    }

    /* ---- the command bar and menus (11c-navbar.js, 13zzg-slash.js, pickers) ---- */
    K('bar', ['↑', '↓'], 'Choose a command or a match; with nothing to choose, ↑ ↓ bring back the commands you ran before', { tags: 'history' });
    K('bar', 'Tab', 'Complete the highlighted name');
    K('bar', 'Enter', 'Run the command, or take the highlighted match');
    K('bar', 'Esc', 'Put the command bar back to sleep');
    K('bar', ['↑', '↓'], 'In the / menu inside a component, and in every picker: move through the rows', { tags: 'slash menu picker' });
    K('bar', ['Enter', 'Tab'], 'In the / menu: take the highlighted command');

    /* ---- widgets (13zt-table.js, 13f-calc.js, 13e-plate.js, 13b-protocol.js, 13t-chaindrop.js) ---- */
    K('widgets', ['←', '↑', '↓', '→'], 'Table: move from cell to cell', { tags: 'spreadsheet' });
    K('widgets', ['Enter', 'F2'], 'Table: edit the cell; typing a character replaces its content', {});
    K('widgets', ['Tab', 'Shift+Tab'], 'Table: the next · previous cell', {});
    K('widgets', ['Delete', 'Backspace'], 'Table: empty the cell', {});
    K('widgets', 'Ctrl+C', 'Table: copy the cell’s value', {});
    K('widgets', ['Enter', '='], 'Calculator: work the line out', { tags: 'calc' });
    K('widgets', ['↑', '↓'], 'Calculator: earlier lines', { tags: 'calc history' });
    K('widgets', 'Esc', 'Calculator: clear the line, then leave it', {});
    K('widgets', ['←', '↑', '↓', '→'], 'Plate viewer: move the cursor over the wells', { tags: 'well plate' });
    K('widgets', ['[', ']'], 'Plate viewer: the previous · next frame (, and . do the same)', { tags: 'plate frame' });
    K('widgets', 'Enter', 'Protocol: a new step below the one you are typing in', { tags: 'steps' });
    K('widgets', ['Tab', 'Shift+Tab'], 'Protocol: the next · previous step', {});
    K('widgets', 'Backspace', 'Protocol: on an empty step, remove it', {});
    K('widgets', ['↑', '↓', 'Enter'], 'Connection menu (after dropping a wire): choose how the components relate', { feat: 'wires', tags: 'wire' });
    K('widgets', 'Tab', 'Connection menu: turn the direction round', { feat: 'wires', tags: 'wire' });
    K('widgets', 'Esc', 'Close a maximised view: a figure, a board, a document, a term, a reader');

    /* ---- reader and Library (17-library.js, 17b-reader.js, 17c-reader2.js, 13zzb-reader.js) ---- */
    K('read', 'Ctrl+F', 'In the Library: search the library · in the reader: search the paper', { tags: 'find' });
    K('read', ['↑', '↓'], 'Library: through the results; Enter opens the paper’s sheet, Esc clears the search (or closes the sheet)', { feat: 'libsearch' });
    K('read', ['Tab', 'Enter'], 'Library search: take the highlighted suggestion', { feat: 'libsearch' });
    K('read', 'Enter', 'The DOI box: look the DOI up', { tags: 'doi add paper' });
    K('read', ['Enter', 'Shift+Enter'], 'Reader search: the next · previous hit', { tags: 'find' });
    K('read', ['Ctrl+B', A('structure')], 'Reader, with text selected: say what it is, then the letter (as in a note)', { act: 'structure', feat: 'structures', tags: 'highlight' });
    K('read', ['→', 'PageDown'], 'Turn to the next page of the PDF under the pointer', { tags: 'pdf page' });
    K('read', ['←', 'PageUp'], 'Turn to the previous page', { tags: 'pdf page' });
    K('read', 'Esc', 'Leave a full-screen reader, or stop drawing a capture box');

    /* ---- calendar (23e-calendar.js CAL.key) ---- */
    K('cal', ['←', '→'], 'Step back · forward by a day, a week or a month', { feat: 'calendar' });
    K('cal', 'T', 'Back to today', { feat: 'calendar' });
    K('cal', ['D', 'W', 'M', 'A'], 'Day · Week · Month · Agenda', { feat: 'calendar', tags: 'view' });
    K('cal', 'N', 'A new event, half an hour from now', { feat: 'calendar' });
    K('cal', 'G', 'Show · hide the agents’ runs over the calendar', { feat: 'calendar', tags: 'agents' });
    K('cal', 'F', 'Start a focus session: full screen, your activity counted double', { feat: 'calendar', tags: 'focus' });
    K('cal', 'P', 'Plan focus: a click places an hour of focus', { feat: 'calendar', tags: 'focus' });
    K('cal', 'Enter', 'In the create window: make the event', { feat: 'calendar' });
    K('cal', 'Esc', 'Close the create window or a card; stop linking or moving; leave a month day', { feat: 'calendar' });

    /* ---- freewrite (14j-freewrite.js) ---- */
    K('free', 'Ctrl+Enter', 'Convert: read the words with the freewrite rules (colours, and the note it will make)', { feat: 'freewrite' });
    K('free', '/', 'A placeholder: /result, /barrier… (↑ ↓ choose, Enter or Tab takes it, Esc closes the menu)', { feat: 'freewrite' });
    K('free', 'Esc', 'Close a chip or the menu first; then the freewrite (everything is saved in the note)', { feat: 'freewrite' });

    /* ---- review, terms, atlas ---- */
    K('more', 'J', 'Monthly review, the inbox: the next component (Shift+↓ too)', { feat: 'review', tags: 'review' });
    K('more', 'K', 'The previous component', { feat: 'review', tags: 'review' });
    K('more', 'X', 'Select · unselect the component', { feat: 'review', tags: 'review' });
    K('more', ['F', 'Enter'], 'File it where it belongs, as a bridge', { feat: 'review', tags: 'review' });
    K('more', 'M', 'Move it to a note of your choice', { feat: 'review', tags: 'review' });
    K('more', 'L', 'Float it', { feat: 'review', tags: 'review' });
    K('more', 'N', 'Make a new note of it', { feat: 'review', tags: 'review' });
    K('more', 'D', 'Dismiss it', { feat: 'review', tags: 'review' });
    K('more', 'U', 'Undo the last filing', { feat: 'review', tags: 'review' });
    K('more', '/', 'Terms tab: go to the search box', { feat: 'terms' });
    K('more', ['←', '→', '↑', '↓'], 'Atlas, the 3D room: turn and tilt the view (Shift+arrows pan)', { tags: 'map' });
    K('more', ['←', '→', '↑', '↓', 'Enter'], 'References picker: move over the cards; Enter takes the card (Alt+Enter does the other thing)', { tags: 'refs' });
    K('more', 'Esc', 'Atlas, a term’s page, floats, References: let go of the selection or close');
    return out;
  },
  /** The text a search looks at for one item. */
  hay(it) {
    const g = SHORT.GROUPS.find(x => x[0] === it.g), ks = it.keys.join(' ').replace(/^~/, '').replace(/\+/g, ' ') + (it.act ? ' ' + KEYS.defOf(it.act).replace(/\+/g, ' ') + (KEYS.changed(it.act) ? ' changed rebound' : '') : '');
    return (ks + ' ' + it.d + ' ' + (g ? g[1] : '') + ' ' + (it.tags || '') + ' ' + (/ctrl/i.test(ks) ? 'cmd command control ⌘' : '') + ' ' + (/alt/i.test(ks) ? 'option' : '')).toLowerCase();
  },
  /** The items that fit what is typed (every word of it) and the group chosen. */
  find(q, g) {
    const w = String(q || '').toLowerCase().split(/[\s+]+/).filter(Boolean);
    return SHORT.items().filter(it => (!g || it.g === g) && w.every(x => SHORT.hay(it).includes(x)));
  },
  /** One key or gesture as it is drawn: Ctrl+K → [Ctrl] + [K]; a gesture is words. */
  keyEl(k) {
    if (k.startsWith('~')) return h('span.sk-gs', k.slice(1));
    if (/^\d \S+ \d$/.test(k) || k.length < 3 || !k.includes('+')) return h('kbd', k);
    return h('span.sk-combo', k.split('+').flatMap((p, i) => [i ? h('i', '+') : null, h('kbd', p)]));
  },
  /** Where it is set: the page of the feature that holds the choice (the ? dialog closes first). */
  change(feat) { const ov = $('.ovl'); if (ov) { const x = $('.mh .btn', ov); x ? x.click() : ov.remove(); } App.go('#/settings/feature/' + feat); },
  /** One row. A rebindable one (it.act) shows the binding it has now, the default, a "changed" mark, and Change (opens the capture box in the row) · Reset (20g-keymap.js). it.over draws it as if bound to that (the Settings preview). */
  row(it) {
    const off = it.feat && FEAT.by[it.feat] && !FEAT.on(it.feat), r = h('div.sk-r' + (off ? '.off' : ''));
    const paint = cap => {
      let bound = null, keys = it.keys;
      if (it.act) {
        const def = KEYS.defOf(it.act), now = it.over || KEYS.get(it.act), chd = now !== def, live = KEYS.live() && !it.over, A = KEYS.byId[it.act];
        if (it.over) keys = [KEYS.label(it.over)].concat(it.keys.slice(1));
        r.classList.toggle('chd', chd);
        bound = h('span.sk-bind' + (chd ? '.chd' : ''), chd ? h('b.sk-mark', 'changed') : null, 'default ' + KEYS.label(def),
          live ? h('button.sk-chg', { type: 'button', title: 'Press the keys you want instead', on: { click: () => paint(true) } }, 'Change') : (!it.over && A.set && it.feat ? h('button.sk-chg', { type: 'button', title: 'Change it in Features', on: { click: () => SHORT.change(it.feat) } }, 'Change') : null),
          live && chd ? h('button.sk-chg', { type: 'button', title: 'Back to ' + KEYS.label(def), on: { click: () => KEYS.reset(it.act) } }, 'Reset') : null);
      }
      r.replaceChildren(h('div.sk-k', keys.flatMap((k, i) => [i ? h('span.sk-or', keys.length > 3 ? '' : 'or') : null, SHORT.keyEl(k)])),
        h('div.sk-d', it.d, bound, off ? h('span.sk-off', 'feature off') : null, cap ? KEYS.box(it.act, () => paint(false)) : null));
    };
    paint(false);
    return r;
  },
  /** The list: a search box, a chip per group, the groups. Redraws itself in place (typing keeps its place). */
  view() {
    const S = SHORT.st, list = h('div.sk-list'), count = h('span.sk-n'), chips = h('div.sk-chips', { role: 'group', 'aria-label': 'Where it works' });
    const draw = () => {
      const all = SHORT.items(), rows = SHORT.find(S.q, S.g);
      if (S.g && !all.some(x => x.g === S.g)) S.g = '';
      chips.replaceChildren(h('button' + (!S.g ? '.on' : ''), { type: 'button', 'aria-pressed': String(!S.g), on: { click: () => { S.g = ''; draw(); } } }, 'All'),
        ...SHORT.GROUPS.filter(g => all.some(x => x.g === g[0])).map(g => h('button' + (S.g === g[0] ? '.on' : ''), { type: 'button', 'aria-pressed': String(S.g === g[0]), on: { click: () => { S.g = S.g === g[0] ? '' : g[0]; draw(); } } }, g[1])));
      count.textContent = rows.length === all.length ? plural(all.length, 'shortcut') : rows.length + ' of ' + all.length;
      list.replaceChildren(...(rows.length ? SHORT.GROUPS.map(g => { const R = rows.filter(x => x.g === g[0]); return R.length ? h('section.sk-g', h('h4', g[1], h('em', String(R.length)), g[2] ? h('span', g[2]) : null), h('div.sk-rows', R.map(SHORT.row))) : null; })
        : [h('p.sk-none', 'Nothing matches “' + S.q.trim() + '”. Try a key (ctrl+k), a word (undo, calendar, term) or clear the chips.')]));
    };
    const q = h('input.sk-q', { type: 'search', value: S.q, placeholder: 'Search keys, gestures, what they do…', 'aria-label': 'Search the shortcuts', autocomplete: 'off', spellcheck: 'false',
      on: { input: e => { S.q = e.target.value; draw(); }, keydown: e => { e.stopPropagation(); if (e.key === 'Escape' && q.value) { e.preventDefault(); q.value = ''; S.q = ''; draw(); } } } });
    draw(); KEYS.views.add(() => list.isConnected ? (draw(), true) : false);   // a key changed in a row: every list drawn redraws
    return h('div.sk', h('div.sk-top', h('label.sk-ql', h('span', { 'aria-hidden': 'true' }, '⌕'), q), count), chips, list);
  },
  /** The ? dialog (helpModal): the same view. */
  open() {
    if (!SHORT.on()) return toast('Shortcuts are switched off — Settings → Features → Shortcuts');
    modal({ title: 'Keys and gestures', wide: true, body: SHORT.view(), actions: [{ label: 'Close', pri: true }] });
  },
  /** Settings → Keys & commands: the section. */
  settingsUI() {
    if (!SHORT.on()) return h('div.sk-offnote', h('div.sec-h', h('h2', 'Shortcuts'), h('span.k', 'switched off')), h('p.tiny.muted', 'The list of keys and gestures is off — Features → Shortcuts turns it on.'));
    return h('div.sk-set', h('div.sec-h', h('h2', 'Shortcuts'), h('span.k', 'every key and gesture, grouped by where it works' + (SHORT.tune('help') ? ' · ? opens this list anywhere' : ''))), SHORT.view());
  },
};
