/* ==========================================================================
   19 · Settings — structure colours, templates, keys, review, storage
   ========================================================================== */
const SettingsView = {
  render() {
    const s = settings();
    const kinds = h('div.list', KINDS.map(k => { const ks = s.kinds[k.id] || k;
      const prev = h('span.serif', { style: { fontSize: '15px' } }, 'Seeding at 40k/cm² ', h('span.st.st-' + k.id, 'collapsed the leading edge'), ' within 40 frames.');
      return h('div.kindrow', h('span.row', kchip(k.id), h('kbd', k.key.toUpperCase())),
        h('input', { type: 'color', value: ks.color, title: 'Pick any RGB colour', on: { input: e => { saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: e.target.value, mode: (settings().kinds[k.id] || k).mode } }) }); applyKindCSS(); e.target.nextSibling.value = e.target.value; } } }),
        h('input.inp.mono.hex', { value: ks.color, size: 8, on: { change: e => { const v = e.target.value.trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) return toast('Use #RRGGBB'); saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: v, mode: (settings().kinds[k.id] || k).mode } }) }); applyKindCSS(); App.refresh(); } } }),
        h('div.seg', [['text', 'Text colour'], ['highlight', 'Highlight']].map(([m, l]) => h('button' + (ks.mode === m ? '.on' : ''), { on: { click: () => { saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: (settings().kinds[k.id] || k).color, mode: m } }) }); applyKindCSS(); App.refresh(); } } }, l))),
        prev); }));
    const tpls = h('div', userProfiles().map(p => { const list = M.templatesFor(p.type), en = list.filter(t => t.enabled).length;
      return h('div.card.flat', { style: { marginBottom: '10px', padding: 0 } },
        h('div.row', { style: { padding: '10px 14px', borderBottom: '1px solid var(--rule)' } }, h('b', p.label), h('span.tiny.mono.muted', `${p.noun.toLowerCase()} · ${p.scope}-scoped`), h('span.spacer'),
          h('span.tiny.muted', en === 0 ? 'blank notes' : en === 1 ? 'one template — used automatically' : `${en} enabled — you choose on create`),
          h('button.btn.xs', { on: { click: () => SettingsView.editTemplate({ id: uid('tp'), type: p.type, name: 'New ' + p.label.toLowerCase() + ' template', isStandard: false, enabled: true, blocks: [{ label: '', body: '' }] }, true) } }, '+ template')),
        list.map(t => h('div.tplrow', h('input', { type: 'checkbox', checked: t.enabled, title: 'Use this template', on: { change: e => { t.enabled = e.target.checked; DB.put('templates', t); App.refresh(); } } }),
          h('span', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { fontSize: '13px' } }, t.name), ' ', t.isStandard ? h('span.pill', 'standard') : null, h('div.tiny.muted', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.blocks.map(b => b.label || '·').join(' → '))),
          h('button.btn.xs', { on: { click: () => SettingsView.editTemplate(t) } }, 'Edit'),
          h('button.btn.xs', { on: { click: () => { DB.put('templates', Object.assign(JSON.parse(JSON.stringify(t)), { id: uid('tp'), isStandard: false, name: t.name + ' (copy)' })); App.refresh(); } } }, 'Duplicate'),
          !t.isStandard ? h('button.btn.xs.ghost', { on: { click: () => { DB.del('templates', t.id); App.refresh(); } } }, '×') : null)));
    }));
    const sel = (val, opts, on) => h('select.inp', { on: { change: e => on(e.target.value) } }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l)));
    const num = (val, on, w = 70) => h('input.inp.mono', { type: 'number', value: val, style: { width: w + 'px' }, on: { change: e => on(+e.target.value) } });
    const d = DB.durable || {};
    const nbIn = h('input.inp.mono', { value: DISK.nb || '', placeholder: 'C:\\Users\\you\\Documents\\Lab notebook', style: { flex: '1 1 260px' }, on: { keydown: e => { if (e.key === 'Enter') DISK.connect(e.target.value.trim()); } } });
    const notebook = h('div.card.flat.nbcard',
      DISK.server === false ? h('p.tiny', { style: { color: 'var(--warn)', marginTop: 0 } }, 'The app is not running through launch.bat, so it cannot reach a folder. Start it with launch.bat.') : null,
      h('p.serif', { style: { marginTop: 0, fontSize: '14.5px' } }, DISK.nb ? h('span', 'Everything is saved in ', h('b.mono', DISK.nb), ' as you work — the whole record in ', h('code', '.scientia/'), ', your images in ', h('code', 'images/'), ', and one Markdown file per component for Obsidian. Launch any copy of the app and it reloads from here.')
        : 'Choose a folder for your notebook. Everything you make is saved there as you work — the whole record, your images, and one Markdown file per component (Obsidian-ready). A new copy of the app reloads it all from that folder.'),
      h('div.row', { style: { gap: '6px', flexWrap: 'wrap' } }, nbIn, h('button.btn', { on: { click: async () => { const p = await DISK.browse(); if (p) { nbIn.value = p; DISK.connect(p); } } } }, 'Browse…'), h('button.btn.pri', { on: { click: () => nbIn.value.trim() && DISK.connect(nbIn.value.trim()) } }, DISK.nb ? 'Switch' : 'Connect')),
      DISK.nb ? h('dl.kv', { style: { fontSize: '12.5px', margin: '10px 0 0' } },
        h('dt', 'record'), h('dd', DISK.meta ? `${DISK.meta.records} records · saved ${fmtWhen(DISK.meta.savedAt)}` : 'not saved yet'),
        h('dt', 'Markdown'), h('dd', DISK.lastVault ? `${DISK.vaultFiles || 0} files · updated ${fmtWhen(DISK.lastVault)}` : 'written a few seconds after each change'),
        DISK.error ? [h('dt', 'problem'), h('dd', { style: { color: 'var(--bad)' } }, DISK.error)] : null) : null,
      DISK.nb ? h('div.row', { style: { gap: '6px', marginTop: '8px' } }, h('button.btn.sm', { on: { click: async () => { const ok = await DISK.snapshot('manual'); await VAULT.sync(true); toast(ok ? 'Saved to the notebook' : 'Not saved: ' + DISK.error); App.refresh(); } } }, 'Save now'),
        h('a.btn.sm', { href: 'obsidian://open?path=' + encodeURIComponent(DISK.nb), title: 'Open the folder as a vault in Obsidian (add it once with “Open folder as vault”)' }, 'Open in Obsidian'),
        h('button.btn.sm.ghost', { on: { click: () => pickModal('Reload from the notebook?', 'Replaces what this browser shows with the notebook’s saved record. A copy of the browser’s data is kept first.', [{ label: 'Reload from the notebook', run: () => DISK.load() }]) } }, 'Reload from notebook')) : null,
      (DISK.recent || []).filter(x => x !== DISK.nb).length ? h('div.tiny.muted', { style: { marginTop: '8px' } }, 'Recent: ', DISK.recent.filter(x => x !== DISK.nb).slice(0, 4).map(x => h('a', { style: { marginRight: '10px', cursor: 'pointer' }, on: { click: () => DISK.connect(x) } }, x))) : null);
    if (DISK.server == null) DISK.info().then(() => App.refresh());
    const storage = h('div', h('dl.kv', { style: { fontSize: '13px', marginBottom: '12px' } },
      h('dt', 'store'), h('dd', DB.mode === 'idb' ? 'IndexedDB · ' + DB_NAME : h('span', { style: { color: 'var(--bad)' } }, 'memory only — nothing is saved (' + (DB.lastError || 'unavailable') + ')')),
      h('dt', 'persistent'), h('dd', d.persisted ? h('span', { style: { color: 'var(--ok)' } }, 'yes — protected from eviction') : h('span', { style: { color: 'var(--warn)' } }, 'no — browser may evict under pressure' + (d.reason ? ` (${d.reason})` : ''))),
      d.usedMB ? [h('dt', 'usage'), h('dd', `${d.usedMB} MB of ~${d.quotaMB} MB`)] : null,
      h('dt', 'origin'), h('dd', location.protocol === 'file:' ? h('span', { style: { color: 'var(--warn)' } }, 'file:// — serve on localhost (launch.bat) for persistence and DOI lookup') : location.origin),
      h('dt', 'authored stores'), h('dd', AUTHORED.map(n => `${n} ${n === 'journal' ? '' : S[n].size}`).join(' · '))),
      h('div.row', h('button.btn.pri', { on: { click: () => Exporter.json() } }, 'Export everything (JSON)'),
        h('label.btn', 'Import…', h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, on: { change: e => SettingsView.importFile(e.target.files[0]) } })),
        h('button.btn', { on: { click: () => { IX.rebuild(); toast(`Re-indexed in ${IX.ms.toFixed(1)} ms`); App.refresh(); } } }, 'Re-index'),
        h('button.btn', { on: { click: () => SettingsView.roundTrip() } }, 'Test export round-trip')),
      h('div.card.flat', { style: { marginTop: '12px' } }, h('div.lab', { style: { marginTop: 0 } }, 'Snapshots to a folder'),
        BACKUP.supported() ? h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, `Every ${s.backupMinutes} minutes the whole record is written as JSON into a folder you choose — the defence against a browser clearing its storage.`),
          h('div.row', h('button.btn', { on: { click: async () => { await BACKUP.choose(); App.refresh(); } } }, BACKUP.handle ? 'Change folder (' + BACKUP.handle.name + ')' : 'Choose folder…'), BACKUP.handle ? h('button.btn', { on: { click: async () => { const ok = await BACKUP.snapshot(true); toast(ok ? 'Snapshot written' : 'Snapshot failed: ' + BACKUP.error); App.refresh(); } } }, 'Snapshot now') : null,
            h('span.tiny.muted', BACKUP.last ? 'last ' + fmtWhen(BACKUP.last) : BACKUP.error || ''))) : h('p.tiny.muted', 'This browser has no folder access (File System Access API). Use Chrome or Edge on localhost, or export by hand.')),
      h('div.row', { style: { marginTop: '12px' } },
        h('span.spacer'),
        h('button.btn.ghost', { on: { click: () => pickModal('Start empty?', 'Wipes everything and starts with no projects. A copy of what is there now is kept first (in the notebook’s .scientia/kept, or the app’s backup folder).', [{ label: 'Wipe and start empty', run: async () => { await DISK.keep('before-start-empty'); await DB.wipe(); saveSettings({ seeded: true, dataEpoch: DATA_EPOCH }); _ls.set('nbSavedAt', null); await DISK.snapshot('start-empty'); location.reload(); } }]) } }, 'Start empty')));
    App.setTitle('Settings', [h('span', DB.mode === 'idb' ? 'IndexedDB · ' + (DB.durable && DB.durable.persisted ? 'persistent' : 'evictable') : 'memory only')]);
    return h('div.page.narrow', h('div.eyebrow', 'System'), h('h1.title', 'Settings'),
      h('div.sec-h', h('h2', 'Notebook folder'), h('span.k', 'where your data lives')), notebook, h('div.sec'),
      h('div.sec-h', h('h2', 'Devices'), h('span.k', 'your phone and tablet, in sync')), DEVICES.settings(), h('div.sec'),
      h('div.sec-h', h('h2', 'Handwriting'), h('span.k', 'pen ink → text, read on this computer')), HWUI.settings(), h('div.sec'),
      h('div.sec-h', h('h2', 'Recordings'), h('span.k', 'microphone → audio file + transcript, on this computer')), STTUI.settings(), h('div.sec'),
      h('div.sec-h', h('h2', 'Structures'), h('span.k', 'colour & style per kind')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, `Select text, press ${keyLabel(s.structKey)}, then the letter. Text colour keeps the page calm; highlight makes a kind impossible to miss — mixing both is the recommended default.`),
      kinds,
      h('div.callout', { style: { marginTop: '10px' } }, h('b.h', 'Terms'), 'Terms render as ', h('span.term-demo', 'outlined bold'), ' — a channel colour never uses, so a term inside a highlighted barrier stays readable.'),
      h('div.sec'), h('div.sec-h', h('h2', 'Templates'), h('span.k', 'per note type')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'For each note type, tick the template(s) to use. One ticked: applied automatically. Several ticked: New note asks which. None: notes start on an empty page. Any note can be saved as a template from its ⋯ menu.'),
      tpls,
      h('div.sec'), h('div.sec-h', h('h2', 'Note types'), h('span.k', 'profiles are data — a new type is a row')),
      h('div.list', userProfiles().map(p => h('div.li', typechip(p.type), h('span.t', p.label + ' · a component is a ' + p.noun.toLowerCase(), h('span.s', `${p.scope}-scoped · ${p.ordered ? 'ordered' : 'unordered'}${p.steps ? ' · steps can be timed' : ''}${p.bindsTo ? ' · binds to ' + p.bindsTo : ''} · header: ${(p.headerFields || []).map(f => f.label).join(', ') || '—'}`)), h('button.btn.xs', { on: { click: () => SettingsView.editProfile(p) } }, 'Edit'))),
        h('div.li', h('button.btn.sm', { on: { click: () => SettingsView.editProfile({ type: '', label: '', noun: 'Block', scope: 'theme', ordered: false, steps: false, bindsTo: null, headerFields: [] }, true) } }, '+ Note type'))),
      h('div.sec'), h('div.sec-h', h('h2', 'Writing'), h('span.k', 'inside components')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'Lists: * or - then Space for bullets, 1. then Space for numbers, [ ] then Space for a checkbox; Enter continues, Tab / Shift+Tab nests. Ctrl+B bold, Alt+I italic, Ctrl+U underline. Backspace right after a replacement undoes it.'),
      h('div.grid2', [['arrows', 'Arrows', '--> → · <-- ← · <-> ↔ · => ⇒'], ['science', 'Science symbols', '+- ± · >= ≥ · <= ≤ · != ≠ · ~= ≈ · 37 deg → 37° · 5 uL → 5 µL · 3x4 → 3×4'], ['scripts', 'Super- and subscripts', '^2 → ² · ^-1 → ⁻¹ · CO_2 → CO₂'], ['typo', 'Dashes and quotes', '-- → – · --- → — · ... → … · “curly” ‘quotes’']].map(([k, l, ex]) =>
        h('label.row', { style: { gap: '8px', alignItems: 'flex-start' } }, h('input', { type: 'checkbox', checked: (s.autoReplace || {})[k] !== false, on: { change: e => saveSettings({ autoReplace: Object.assign({}, s.autoReplace, { [k]: e.target.checked }) }) } }), h('span', h('b', l), h('div.tiny.muted', ex))))),
      h('div.sec'), h('div.sec-h', h('h2', 'Keys')),
      h('div.grid2', h('label.f', h('span', 'Give meaning to a phrase'), sel(s.structKey, [['ctrl+enter', 'Ctrl+Enter'], ['alt+enter', 'Alt+Enter'], ['ctrl+shift+enter', 'Ctrl+Shift+Enter']], v => { saveSettings({ structKey: v }); App.refresh(); })),
        h('label.f', h('span', 'Mark a term (outside Focus mode)'), sel(s.termKey, [['alt+w', 'Alt+W'], ['alt+shift+w', 'Alt+Shift+W']], v => { saveSettings({ termKey: v }); App.refresh(); }))),
      h('div.callout', { style: { marginTop: '10px' } }, h('b.h', 'Ctrl+W'), 'Browsers close the tab on Ctrl+W before a page can see it. In ', h('b', 'Focus mode'), ' (Ctrl+. or ⛶ on a note) the app goes fullscreen and asks the browser to lock the W key, and then Ctrl+W marks a term. Outside Focus mode, ', keyLabel(s.termKey), ' does the same. While you are typing, closing the tab asks first.'),
      h('div.grid2', { style: { marginTop: '10px' } }, h('label.f', h('span', 'Classify structures'), sel(s.classifyOn, [['mark', 'On marking — one key at the caret (default)'], ['review', 'In review — mark now as a takeaway, sort it later']], v => saveSettings({ classifyOn: v })))),
      h('div.sec'), h('div.sec-h', h('h2', 'Weekly review')),
      h('div.grid2', h('label.f', h('span', 'Week runs from'), sel(s.weekStartDow, [[6, 'Saturday → Friday (review Sat/Sun)'], [0, 'Sunday → Saturday'], [1, 'Monday → Sunday']], v => { saveSettings({ weekStartDow: +v }); changed(); })),
        h('label.f', h('span', 'Current week'), h('label.switch', h('input', { type: 'checkbox', checked: s.reviewPreview, on: { change: e => { saveSettings({ reviewPreview: e.target.checked }); changed(); } } }), 'allow previewing the unfinished week'))),
      h('div.sec'), h('div.sec-h', h('h2', 'Time')),
      h('div.grid3', h('label.f', h('span', 'Timer cap (hours)'), num(s.timerCapHours, v => saveSettings({ timerCapHours: v || 4 }))),
        h('label.f', h('span', 'Concurrent timers'), h('input.inp.mono', { value: s.maxTimers, disabled: true, style: { width: '70px' } })),
        h('label.f', h('span', 'Idle prompt after (min)'), num(s.idleMinutes, v => saveSettings({ idleMinutes: v || 15 }))),
        h('label.f', h('span', 'Suggest links within (days)'), num(s.inferWindowDays, v => { saveSettings({ inferWindowDays: v || 21 }); changed(); })),
        h('label.f', h('span', 'Lineage shown (generations)'), num(s.lineageDepth, v => { saveSettings({ lineageDepth: v || 3 }); changed(); }))),
      h('p.tiny.muted', 'Stamps move to any date and time (click the time on a box). Overlapping timers count once in day totals and are reported as multitask.'),
      h('label.row', { style: { gap: '8px', marginTop: '10px', alignItems: 'flex-start' } }, h('input', { type: 'checkbox', checked: !!s.lockAfterDay, on: { change: e => { saveSettings({ lockAfterDay: e.target.checked }); changed(); } } }),
        h('span', h('b', 'Lock wording once the day turns'), h('div.tiny.muted', 'Off: every component and structure stays editable, and notes and components can be deleted. On: after the day ends, changing recorded wording asks you to revise or add a correction (the original stays on record).'))),
      h('div.sec'), h('div.sec-h', h('h2', 'Appearance')),
      h('div.grid2', h('label.f', h('span', 'Theme'), sel(s.theme, [['auto', 'Follow system'], ['light', 'Light'], ['dark', 'Dark']], v => { saveSettings({ theme: v }); applyTheme(); applyKindCSS(); App.refresh(); })),
        h('label.f', h('span', 'Default citation display'), sel(s.citeMode, [['title', 'Title'], ['author', 'Author–year'], ['number', 'Numbered']], v => saveSettings({ citeMode: v })))),
      h('div.sec'), h('div.sec-h', h('h2', 'Labs'), h('span.k', 'try, keep or switch off')),
      h('label.switch', h('input', { type: 'checkbox', checked: CANVAS.on(), on: { change: () => CANVAS.toggleLab() } }), 'Spatial canvases — arrange components, structures, papers and datasets; drawn lines become real connections; export as JSON Canvas'),
      h('div', { style: { height: '8px' } }), h('button.btn.sm', { on: { click: () => CHORES.manage() } }, 'Recurring chores…'),
      h('div.sec'), h('div.sec-h', h('h2', 'Storage'), h('span.k', 'export is schema-driven')), storage);
  },
  editProfile(p, isNew) {
    const f = JSON.parse(JSON.stringify(p)), I = (k, ph) => h('input.inp', { value: f[k] || '', placeholder: ph, on: { input: e => f[k] = e.target.value } });
    const hf = h('textarea.inp.mono', { rows: 3, placeholder: 'key | Label | option, option (optional), one per line' }); hf.value = (f.headerFields || []).map(x => x.key + ' | ' + x.label + (x.options ? ' | ' + x.options.join(', ') : '')).join('\n');
    const chk = (k, l) => h('label.switch', h('input', { type: 'checkbox', checked: !!f[k], on: { change: e => f[k] = e.target.checked } }), l);
    modal({ title: isNew ? 'New note type' : 'Edit ' + p.label, body: h('div', h('div.grid2', isNew ? h('label.f', h('span', 'Type id'), I('type', 'seminar-notes')) : null, h('label.f', h('span', 'Name'), I('label', 'Seminar notes')), h('label.f', h('span', 'A component is a…'), I('noun', 'Point')),
      h('label.f', h('span', 'Scope'), h('select.inp', { on: { change: e => f.scope = e.target.value } }, ['theme', 'project', 'global'].map(x => h('option', { value: x, selected: f.scope === x }, x)))),
      h('label.f', h('span', 'Binds to'), h('select.inp', { on: { change: e => f.bindsTo = e.target.value || null } }, h('option', { value: '' }, '—'), userProfiles().map(x => h('option', { value: x.type, selected: f.bindsTo === x.type }, x.label))))),
      h('div.row', { style: { margin: '10px 0' } }, chk('ordered', 'ordered (numbered)'), chk('steps', 'steps can be checked and timed')),
      h('label.f', h('span', 'Header fields'), hf), h('p.tiny.muted', 'Adding a type here needs no code — the note, header panel, template and every view read this row.')),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => {
        f.type = (f.type || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'); if (!f.type || !f.label) { toast('Type id and name are required'); return false; }
        if (isNew && PROFILE[f.type]) { toast('That type already exists'); return false; }
        f.headerFields = hf.value.split('\n').map(l => l.split('|')).filter(x => x[0].trim()).map(x => Object.assign({ key: x[0].trim(), label: (x[1] || x[0]).trim() }, x[2] && x[2].trim() ? { options: x[2].split(',').map(o => o.trim()).filter(Boolean) } : {}));
        M.saveProfile(f); App.refresh(); } }] });
  },
  async roundTrip() {
    const data = await DB.exportAll(), counts = data.counts, json = JSON.stringify(data), back = JSON.parse(json);
    const rows = Object.keys(counts).map(n => ({ n, a: counts[n], b: (back.stores[n] || []).length }));
    modal({ title: 'Export round-trip', body: h('div', h('p.serif', { style: { marginTop: 0 } }, `${rows.length} stores enumerated from the database itself · ${(json.length / 1024).toFixed(0)} KB.`),
      h('table.t', h('thead', h('tr', h('th', 'Store'), h('th', 'In database'), h('th', 'In export'), h('th', ''))), h('tbody', rows.map(r => h('tr', h('td', r.n), h('td', r.a), h('td', r.b), h('td', r.a === r.b ? '✓' : '✗')))))) });
  },
  editTemplate(t, isNew) {
    const name = h('input.inp', { value: t.name, style: { width: '100%' } }), rows = h('div');
    const blocks = JSON.parse(JSON.stringify(t.blocks));
    const draw = () => rows.replaceChildren(...blocks.map((b, i) => h('div.row', { style: { marginBottom: '6px', flexWrap: 'nowrap' } }, h('span.mono.tiny.muted', { style: { width: '22px' } }, i + 1),
      h('input.inp', { value: b.label, placeholder: 'label', style: { width: '170px' }, on: { input: e => b.label = e.target.value } }), h('input.inp', { value: b.body, placeholder: 'default text (optional)', style: { flex: 1 }, on: { input: e => b.body = e.target.value } }),
      h('button.btn.xs.ghost', { on: { click: () => { blocks.splice(i, 1); draw(); } } }, '×'))), h('button.btn.sm', { on: { click: () => { blocks.push({ label: '', body: '' }); draw(); } } }, '+ component'));
    draw();
    modal({ title: (isNew ? 'New ' : 'Edit ') + prof(t.type).label.toLowerCase() + ' template', wide: true, body: h('div', h('label.f', h('span', 'Name'), name), h('h3.lab', 'Components'), rows),
      actions: [{ label: 'Cancel' }, { label: 'Save', pri: true, run: () => { t.name = name.value.trim() || t.name; t.blocks = blocks; DB.put('templates', t); App.refresh(); } }] });
  },
  async importFile(f) {
    if (!f) return;
    try { const data = JSON.parse(await f.text()); const r = await DB.importAll(data); loadProfiles(); ensureStandardTemplates(); const st = DB.get('settings', 'main') || {}; DB.put('settings', Object.assign({}, DEFAULT_SETTINGS, st, { kinds: Object.assign({}, DEFAULT_SETTINGS.kinds, st.kinds || {}), seeded: true, dataEpoch: DATA_EPOCH })); applyKindCSS(); changed();
      modal({ title: r.ok ? 'Import verified' : 'Import mismatch', body: h('div', h('p.serif', { style: { marginTop: 0 } }, r.ok ? 'Every store round-tripped with matching record counts.' : 'Some stores did not match — check before relying on this data.'),
        h('table.t', h('thead', h('tr', h('th', 'Store'), h('th', 'Expected'), h('th', 'Got'), h('th', ''))), h('tbody', r.report.map(x => h('tr', h('td', x.store), h('td', x.expected), h('td', x.got), h('td', x.ok ? '✓' : '✗'))))),
        r.unknown.length ? h('p.tiny.muted', 'Unknown stores ignored: ' + r.unknown.join(', ')) : null) });
    } catch (e) { toast('Import failed: ' + (e.message || e)); }
  },
};
SettingsView.title = true; VIEWS.settings = SettingsView;
