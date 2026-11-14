/* ==========================================================================
   19 · Settings — V3.995: a sidebar (Features, then Look & feel, Keys &
   commands, Templates & note types, Notebook & devices, Data & storage);
   Features is the board of every feature in the register (02b, 20a), with
   presets, a tile each and the live preview of the feature in view.
   ========================================================================== */
const SettingsView = {
  /* V3.995 — the page as a sidebar and a feature board (Gabe chose layout C): Features first — presets, then a tile per feature (FEAT, 02b), which
     opens across the board with its whole description and its settings — beside a live preview of the feature in view that follows the scroll;
     then the ordinary settings, a section each. Search covers both. */
  section: 'features', open: null, q: '', spy: null,
  SECTIONS: [['features', 'Features', '◉'], ['look', 'Look & feel', '◐'], ['keys', 'Keys & commands', '⌘'], ['templates', 'Templates & note types', '⧉'], ['devices', 'Notebook & devices', '⇆'], ['data', 'Data & storage', '⛁']],
  WORDS: { look: 'theme light dark appearance colour', keys: 'keys shortcut commands macro ctrl+w focus mode', templates: 'templates note types profiles', devices: 'notebook folder devices phone tablet ipad lab computer handwriting recordings whisper obsidian', data: 'storage export import json snapshots backup re-index round-trip start empty' },
  render() {
    const s = settings(), V = SettingsView;
    App.setTitle('Settings', [h('span', DB.mode === 'idb' ? 'IndexedDB · ' + (DB.durable && DB.durable.persisted ? 'persistent' : 'evictable') : 'memory only')]);
    if (DISK.server == null) DISK.info().then(() => App.refresh());
    const q = V.q.trim().toLowerCase();
    const side = h('nav.st-side', { 'aria-label': 'Settings sections' }, V.SECTIONS.map(([id, label, gl], i) => [
      i === 1 ? h('div.st-sgh', 'Preferences') : i === 3 ? h('div.st-sgh', 'Notebook') : null,
      h('button', { type: 'button', 'aria-current': String(V.section === id && !q), on: { click: () => { V.section = id; V.q = ''; V.open = null; V.redraw(true); } } },
        h('span.gl', gl), label, id === 'features' ? h('span.ct', FEAT.count() + '/' + FEAT.list.length) : null)]));
    const search = h('label.st-search', h('span', { 'aria-hidden': 'true' }, '⌕'), h('input#st-q', { type: 'search', value: V.q, placeholder: 'Search settings', 'aria-label': 'Search settings',
      on: { input: debounce(e => { V.q = e.target.value; V.redraw(); requestAnimationFrame(() => { const i = $('#st-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 160) } }));
    let main;
    if (q) main = V.searchView(q);
    else if (V.section === 'features') main = V.featuresView();
    else main = h('div.st-main', h('div.st-mh', h('h2', V.SECTIONS.find(x => x[0] === V.section)[1])), V[V.section + 'View'] ? V[V.section + 'View'](s) : null);
    return h('div.page.st2', h('div.st-top', h('div', h('div.eyebrow', 'System'), h('h1.title', 'Settings')), search), h('div.st-shell', side, main));
  },
  /** Draw it again where it was (the page keeps its scroll). */
  redraw(top) { const pw = $('.pagewrap'); App._scroll = { key: location.hash, top: top || !pw ? 0 : pw.scrollTop }; App.refresh(); },
  /* ---------- features ---------- */
  featuresView(only) {
    const V = SettingsView, n = FEAT.changes(), p = FEAT.preset(), own = FEAT.own();
    const presets = h('div.st-presets', FEAT.PRESETS.map(([k, lab]) => { const c = FEAT.list.filter(f => FEAT.inPreset(f, k)).length;
      return h('button.st-preset', { type: 'button', 'aria-pressed': String(p === k), on: { click: () => { FEAT.usePreset(k); V.redraw(); } } },
        h('div.pn', lab, h('span.pc', c + ' of ' + FEAT.list.length)), h('div.meter', h('i', { style: { width: (c / FEAT.list.length * 100) + '%' } })), h('div.pd', V.PDESC[k])); }));
    const status = h('div.st-custom', n ? [h('b', FEAT.PRESETS.find(x => x[0] === p)[1] + ' + ' + plural(n, 'change')), ' · ', h('button.st-link', { type: 'button', on: { click: () => { FEAT.usePreset(p); V.redraw(); } } }, 'back to ' + FEAT.PRESETS.find(x => x[0] === p)[1])] : FEAT.PRESETS.find(x => x[0] === p)[1] + ' · ' + plural(FEAT.count(), 'feature') + ' on',
      h('span.spacer'), h('label.st-own', { title: 'Off: this device shows what the notebook is set to. On: this device keeps its own switches (a phone on Simple, the desktop on Everything)' },
        h('button.fsw', { type: 'button', role: 'switch', 'aria-checked': String(own), 'aria-label': 'This device keeps its own switches', on: { click: () => { FEAT.setOwn(!own); V.redraw(); } } }), 'This device keeps its own switches'));
    const groups = FEAT.GROUPS.map(g => ({ g, fs: FEAT.list.filter(f => f.group === g.id && (!only || only.includes(f))) })).filter(x => x.fs.length);
    const board = h('div.st-board', groups.map(({ g, fs }) => h('div.st-group', h('div.st-gh', h('h3', g.label), h('span.k', fs.filter(f => FEAT.on(f.id)).length + ' of ' + fs.length + ' on')), h('div.st-tiles', fs.map(f => V.tile(f, g))))));
    const cur = V.previewId(only);
    return h('div.st-main', only ? null : h('div.st-mh', h('h2', 'Features'), h('span.k', 'switch off what you don’t use · select a tile to see all of it and tune it')),
      only ? null : presets, only ? null : status, h('div.st-split', board, h('aside.st-pv', V.pane(cur))));
  },
  PDESC: { simple: 'Write and mark structures; bridges, timers, reminders, the Library and equations.', standard: 'The app as it was, without the parts most people never use.', all: 'Every feature, including recordings, handwriting and chores.' },
  previewId(only) { const V = SettingsView, ok = id => !!FEAT.by[id] && (!only || only.includes(FEAT.by[id])); return ok(V.open) ? V.open : ok(V.spy) ? V.spy : ((only || FEAT.list)[0] || {}).id; },
  /** The preview pane: the feature in view (or the one open), as it is set now. */
  pane(id) {
    const f = FEAT.by[id]; if (!f) return h('div.st-pv-in');
    return h('div.st-pv-in', { 'data-f': id }, h('div.st-pv-h', h('span', 'Live preview'), h('b', f.label), FEAT.on(f.id) ? null : h('span.off', 'off')), SettingsView.previewOf(f));
  },
  previewOf(f) { let n = null; try { n = f.preview(PV, f); } catch (e) { console.warn('[preview]', f.id, e); } return h('div.fpv' + (FEAT.on(f.id) ? '' : '.is-off'), n || h('div.fpv-cap', 'No preview')); },
  /** A slider moved, a colour picked: the preview again, nothing else. */
  repaint() { const V = SettingsView, id = V.previewId(); $$('.st-pv-in, .ft-pv').forEach(el => { const fid = el.classList.contains('ft-pv') ? el.dataset.f : id; const f = FEAT.by[fid]; if (!f) return; const nb = V.previewOf(f); const old = $(':scope > .fpv', el); old ? old.replaceWith(nb) : el.append(nb); }); },
  tile(f, g) {
    const V = SettingsView, open = V.open === f.id, on = FEAT.raw(f.id), dis = !!f.needs && !FEAT.on(f.needs), nT = (f.tune || []).length;
    const toggle = () => { V.open = open ? null : f.id; V.spy = f.id; V.redraw();
      if (!open) requestAnimationFrame(() => { const el = $('.ft.open'), pw = $('.pagewrap'); if (!el || !pw) return; const r = el.getBoundingClientRect(), pr = pw.getBoundingClientRect(); if (r.top < pr.top + 8 || r.top > pr.bottom - 160) pw.scrollTop += r.top - pr.top - 70; }); };   // the tile just opened, in view
    return h('div.ft' + (FEAT.on(f.id) ? '' : '.off') + (dis ? '.dis' : '') + (open ? '.open' : '') + (V.spy === f.id && !V.open ? '.spied' : ''), { 'data-f': f.id, on: { click: () => { if (!open) toggle(); } } },
      h('div.ft-gl', g.gl),
      h('div.ft-t', { role: 'button', tabindex: '0', 'aria-expanded': String(open), on: { click: e => { if (open) { e.stopPropagation(); toggle(); } }, keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } } } }, f.label, open ? h('span.ft-x', '▴ close') : null),
      f.core ? h('span.ft-lock', 'always on') : h('button.fsw', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': f.label, disabled: dis, on: { click: e => { e.stopPropagation(); FEAT.set(f.id, !on); V.spy = f.id; V.redraw(); } } }),
      h('div.ft-d', dis ? 'Needs ' + FEAT.by[f.needs].label + '. ' : '', f.desc),
      nT ? h('div.ft-n', plural(nT, 'setting') + (open ? '' : ' ▾')) : null,
      open ? h('div.ft-body', { on: { click: e => e.stopPropagation() } },
        h('div.ft-pv', { 'data-f': f.id }, V.previewOf(f)),
        nT ? (FEAT.on(f.id) || f.core ? h('div.ft-tunes', f.tune.map(t => V.tuneCtl(f, t))) : h('div.ft-tunes.empty', dis ? 'Switch on ' + FEAT.by[f.needs].label + ' first.' : 'Switch it on to tune it.')) : h('div.ft-tunes.empty', 'Nothing to tune: it is on or off.')) : null);
  },
  /** One setting's control. Types: seg, range, switch, color, select, size, node (its own UI), button. */
  tuneCtl(f, t) {
    const V = SettingsView, v = FEAT.tune(f.id, t.key), set = x => { FEAT.setTune(f.id, t.key, x); V.redraw(); };
    const opts = (t.opts || []).map(o => Array.isArray(o) ? o : [o, String(o)]);
    let c;
    if (t.type === 'seg') c = h('div.st-seg', { role: 'group', 'aria-label': t.label }, opts.map(([val, lab]) => h('button', { type: 'button', 'aria-pressed': String(String(val) === String(v)), on: { click: () => set(val) } }, lab)));
    else if (t.type === 'select') c = h('select.inp', { 'aria-label': t.label, on: { change: e => set(opts.find(o => String(o[0]) === e.target.value)[0]) } }, opts.map(([val, lab]) => h('option', { value: val, selected: String(val) === String(v) }, lab)));
    else if (t.type === 'range') { const out = h('output', V.fmt(v, t), t.zero && +v === 0 ? h('span.z', ' · ' + t.zero) : null);
      c = h('span.st-range', h('input', { type: 'range', min: t.min, max: t.max, step: t.step || 1, value: v, 'aria-label': t.label, on: { input: e => { FEAT.live(f.id, t.key, +e.target.value); out.replaceChildren(V.fmt(+e.target.value, t), t.zero && +e.target.value === 0 ? h('span.z', ' · ' + t.zero) : ''); V.repaint(); }, change: e => set(+e.target.value) } }), out); }
    else if (t.type === 'switch') c = h('button.fsw', { type: 'button', role: 'switch', 'aria-checked': String(!!v), 'aria-label': t.label, on: { click: () => set(!v) } });
    else if (t.type === 'color') c = h('span.st-colors', opts.map(([val, lab]) => h('button.st-sw', { type: 'button', style: { background: val }, title: lab, 'aria-label': lab, 'aria-pressed': String(String(v).toLowerCase() === String(val).toLowerCase()), on: { click: () => set(val) } })),
      h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000', 'aria-label': t.label + ': any colour', title: 'Any colour', on: { input: e => { FEAT.live(f.id, t.key, e.target.value); V.repaint(); }, change: e => set(e.target.value) } }));
    else if (t.type === 'size') { const sz = Object.assign({ mode: 'fixed', fixed: 100, from: 85, to: 130, z0: 50, z1: 200 }, v || {}), up = (k, x) => set(Object.assign({}, sz, { [k]: x }));
      const num = (k, lab, min, max, step) => h('input.inp.st-num', { type: 'number', min, max, step, value: sz[k], 'aria-label': lab, on: { change: e => up(k, clamp(+e.target.value || sz[k], min, max)) } });
      c = h('div.st-size', h('div.st-seg', { role: 'group', 'aria-label': t.label }, [['fixed', 'Fixed'], ['zoom', 'Follows the zoom']].map(([m, l]) => h('button', { type: 'button', 'aria-pressed': String(sz.mode === m), on: { click: () => up('mode', m) } }, l))),
        sz.mode === 'fixed' ? h('div.st-sizeln', num('fixed', 'Size', 50, 200, 5), '% of normal, at every zoom')
          : h('div.st-sizeln', num('from', 'Smallest size', 50, 200, 5), '% at', num('z0', 'Zoom for the smallest size', 10, 400, 10), '% zoom, growing to', num('to', 'Largest size', 50, 250, 5), '% at', num('z1', 'Zoom for the largest size', 10, 400, 10), '% zoom')); }
    else if (t.type === 'node') { try { c = t.render(); } catch (e) { console.warn('[settings]', f.id, t.key, e); c = null; } }
    else if (t.type === 'button') c = h('button.btn.sm', { type: 'button', on: { click: () => t.run() } }, t.button || t.label);
    const reset = !t.get && t.type !== 'node' && t.type !== 'button' && !FEAT.isDefault(f.id, t.key) ? h('button.st-reset', { type: 'button', title: 'Back to the default', on: { click: () => set(JSON.parse(JSON.stringify(t.def))) } }, 'Reset') : null;
    return h('div.st-tune' + (t.full || t.type === 'node' || t.type === 'size' ? '.full' : '') + (t.type === 'node' ? '.node' : ''), t.type === 'node' && !t.label ? null : h('div.st-tl', h('b', t.label), t.isNew ? h('span.st-new', 'new') : null, reset, t.d ? h('div.st-th', t.d) : null), c);
  },
  fmt: (x, t) => (Math.round(x * 100) / 100) + (t.unit || ''),
  searchView(q) {
    const V = SettingsView, txt = f => [f.label, f.desc, (f.tune || []).map(t => (t.label || '') + ' ' + (t.d || '') + ' ' + (t.opts || []).map(o => Array.isArray(o) ? o[1] : o).join(' ')).join(' '), (FEAT.GROUPS.find(g => g.id === f.group) || {}).label].join(' ').toLowerCase();
    const fs = FEAT.list.filter(f => txt(f).includes(q)), secs = V.SECTIONS.slice(1).filter(([id, label]) => (label + ' ' + (V.WORDS[id] || '')).toLowerCase().includes(q));
    return h('div.st-main', h('div.st-mh', h('h2', 'Results for “' + V.q.trim() + '”'), h('span.k', plural(fs.length, 'feature') + (secs.length ? ' · ' + plural(secs.length, 'section') : ''))),
      secs.length ? h('div.st-also', 'Also in ', secs.map(([id, label]) => h('button.st-link', { type: 'button', on: { click: () => { V.section = id; V.q = ''; V.redraw(true); } } }, label))) : null,
      fs.length ? V.featuresView(fs) : (secs.length ? null : h('p.serif.muted', 'Nothing matches. Try a feature’s name, like “bridge” or “timer”.')));
  },
  /** After the page is on screen: the preview follows the tile in view as the page scrolls. */
  after() {
    const V = SettingsView, pw = $('.pagewrap'); if (!pw || pw._stSpy) return; pw._stSpy = true;
    let raf = 0; pw.addEventListener('scroll', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; V.follow(pw); }); }, { passive: true });
    requestAnimationFrame(() => V.follow(pw));
  },
  follow(pw) {
    const V = SettingsView; if (App.route.name !== 'settings' || V.open) return; const tiles = $$('.st-board .ft', pw); if (!tiles.length) return;
    const top = pw.getBoundingClientRect().top + 110, t = tiles.find(x => x.getBoundingClientRect().bottom > top) || tiles[tiles.length - 1], id = t.dataset.f;
    if (id === V.spy && $(`.st-pv-in[data-f="${id}"]`)) return; V.spy = id;
    tiles.forEach(x => x.classList.toggle('spied', x === t));
    const pane = $('.st-pv'); if (pane) { const nb = V.pane(id); nb.classList.add('fade'); pane.replaceChildren(nb); }
  },
  /* ---------- the ordinary settings ---------- */
  lookView(s) {
    const sel = (val, opts, on) => h('select.inp', { on: { change: e => on(e.target.value) } }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l)));
    return h('div.st-split', h('div.st-card', h('div.st-row', h('div', h('b', 'Theme'), h('div.st-th', 'Light, dark, or as the system is')), sel(s.theme, [['auto', 'Follow system'], ['light', 'Light'], ['dark', 'Dark']], v => { saveSettings({ theme: v }); applyTheme(); applyKindCSS(); App.refresh(); })),
        h('p.tiny.muted', { style: { margin: '10px 0 0' } }, 'Structure colours, the bridge colour and every feature’s look are under Features, each with its preview.')),
      h('aside.st-pv', h('div.st-pv-in', h('div.st-pv-h', h('span', 'Live preview'), h('b', 'This theme')), h('div.fpv', PV.sample()))));
  },
  keysView(s) {
    let cmds = null; try { cmds = CMD.settingsUI(); } catch (e) { console.warn('[commands]', e); }
    return h('div.st-col',
      h('div.callout', h('b.h', 'Where the keys are'), 'Give a phrase its meaning: Features → Structures. Mark a term: Features → Terms. Pen buttons and gestures: Features → Pen & touch.'),
      h('div.callout', h('b.h', 'Ctrl+W'), 'Browsers close the tab on Ctrl+W before a page can see it. In ', h('b', 'Focus mode'), ' (Ctrl+. or ⤢ on a note) the app goes fullscreen and asks the browser to lock the W key, and then Ctrl+W marks a term. Outside Focus mode, ', keyLabel(s.termKey), ' does the same. While you are typing, closing the tab asks first.'),
      cmds);
  },
  templatesView(s) {
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
    return h('div.st-col',
      h('div.sec-h', h('h2', 'Templates'), h('span.k', 'per note type')),
      h('p.serif.muted', { style: { marginTop: 0, fontSize: '14.5px' } }, 'For each note type, tick the template(s) to use. One ticked: applied automatically. Several ticked: New note asks which. None: notes start on an empty page. Any note can be saved as a template from its ⋯ menu.'),
      tpls,
      h('div.sec'), h('div.sec-h', h('h2', 'Note types'), h('span.k', 'profiles are data — a new type is a row')),
      h('div.list', userProfiles().map(p => h('div.li', typechip(p.type), h('span.t', p.label + ' · a component is a ' + p.noun.toLowerCase(), h('span.s', `${p.scope}-scoped · ${p.ordered ? 'ordered' : 'unordered'}${p.steps ? ' · steps can be timed' : ''}${p.bindsTo ? ' · binds to ' + p.bindsTo : ''} · header: ${(p.headerFields || []).map(f => f.label).join(', ') || '—'}`)), h('button.btn.xs', { on: { click: () => SettingsView.editProfile(p) } }, 'Edit'))),
        h('div.li', h('button.btn.sm', { on: { click: () => SettingsView.editProfile({ type: '', label: '', noun: 'Block', scope: 'theme', ordered: false, steps: false, bindsTo: null, headerFields: [] }, true) } }, '+ Note type'))));
  },
  devicesView(s) {
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
    const part = fn => { try { return fn(); } catch (e) { console.warn('[settings]', e); return null; } };
    return h('div.st-col',
      h('div.sec-h', h('h2', 'Notebook folder'), h('span.k', 'where your data lives')), notebook, h('div.sec'),
      h('div.sec-h', h('h2', 'Devices'), h('span.k', 'your phone and tablet, in sync')), part(() => DEVICES.settings()), h('div.sec'),
      h('div.sec-h', h('h2', 'The lab'), h('span.k', 'this computer and the lab cloud, always in step')), part(() => THISPC.settings()), h('div.sec'),
      h('div.sec-h', h('h2', 'Handwriting'), h('span.k', 'pen ink → text, read on this computer')), part(() => HWUI.settings()), h('div.sec'),
      h('div.sec-h', h('h2', 'Recordings'), h('span.k', 'microphone → audio file + transcript, on this computer')), part(() => STTUI.settings()));
  },
  dataView(s) {
    const d = DB.durable || {};
    return h('div.st-col', h('dl.kv', { style: { fontSize: '13px', marginBottom: '12px' } },
      h('dt', 'store'), h('dd', DB.mode === 'idb' ? 'IndexedDB · ' + DB_NAME : h('span', { style: { color: 'var(--bad)' } }, 'memory only — nothing is saved (' + (DB.lastError || 'unavailable') + ')')),
      h('dt', 'persistent'), h('dd', d.persisted ? h('span', { style: { color: 'var(--ok)' } }, 'yes — protected from eviction') : h('span', { style: { color: 'var(--warn)' } }, 'no — browser may evict under pressure' + (d.reason ? ` (${d.reason})` : ''))),
      d.usedMB ? [h('dt', 'usage'), h('dd', `${d.usedMB} MB of ~${d.quotaMB} MB`)] : null,
      h('dt', 'origin'), h('dd', location.protocol === 'file:' ? h('span', { style: { color: 'var(--warn)' } }, 'file:// — serve on localhost (launch.bat) for persistence and DOI lookup') : location.origin),
      h('dt', 'authored stores'), h('dd', AUTHORED.map(n => `${n} ${n === 'journal' ? '' : S[n].size}`).join(' · '))),
      h('div.row', h('button.btn.pri', { on: { click: () => Exporter.json() } }, 'Export everything (JSON)'),
        window.SIS_TARGET === 'web' ? null : h('button.btn', { title: 'The notebook as the McGhee Lab website takes it, with what it can’t show yet', on: { click: () => LABX.export() } }, 'Export for the lab website'),
        h('label.btn', 'Import…', h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, on: { change: e => SettingsView.importFile(e.target.files[0]) } })),
        h('button.btn', { on: { click: () => { IX.rebuild(); toast(`Re-indexed in ${IX.ms.toFixed(1)} ms`); App.refresh(); } } }, 'Re-index'),
        h('button.btn', { on: { click: () => SettingsView.roundTrip() } }, 'Test export round-trip')),
      h('div.card.flat', { style: { marginTop: '12px' } }, h('div.lab', { style: { marginTop: 0 } }, 'Snapshots to a folder'),
        BACKUP.supported() ? h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, `Every ${s.backupMinutes} minutes the whole record is written as JSON into a folder you choose — the defence against a browser clearing its storage.`),
          h('div.row', h('button.btn', { on: { click: async () => { await BACKUP.choose(); App.refresh(); } } }, BACKUP.handle ? 'Change folder (' + BACKUP.handle.name + ')' : 'Choose folder…'), BACKUP.handle ? h('button.btn', { on: { click: async () => { const ok = await BACKUP.snapshot(true); toast(ok ? 'Snapshot written' : 'Snapshot failed: ' + BACKUP.error); App.refresh(); } } }, 'Snapshot now') : null,
            h('span.tiny.muted', BACKUP.last ? 'last ' + fmtWhen(BACKUP.last) : BACKUP.error || ''))) : h('p.tiny.muted', 'This browser has no folder access (File System Access API). Use Chrome or Edge on localhost, or export by hand.')),
      h('div.row', { style: { marginTop: '12px' } },
        h('span.spacer'),
        h('button.btn.ghost', { on: { click: () => pickModal('Start empty?', 'Wipes everything and starts with no projects. A copy of what is there now is kept first (in the notebook’s .scientia/kept, or the app’s backup folder).', [{ label: 'Wipe and start empty', run: async () => { await DISK.keep('before-start-empty'); await DB.wipe(); saveSettings({ seeded: true, dataEpoch: DATA_EPOCH, feat: { preset: 'standard', on: {} } }); _ls.set('nbSavedAt', null); await DISK.snapshot('start-empty'); location.reload(); } }]) } }, 'Start empty')));
  },
  /** The structure kinds' colours and styles (Features → Structures). */
  kindsUI() {
    const s = settings();
    return h('div.list', KINDS.map(k => { const ks = s.kinds[k.id] || k;
      const prev = h('span.serif', { style: { fontSize: '15px' } }, 'Seeding at 40k/cm² ', h('span.st.st-' + k.id, 'collapsed the leading edge'), ' within 40 frames.');
      return h('div.kindrow', h('span.row', kchip(k.id), h('kbd', k.key.toUpperCase())),
        h('input', { type: 'color', value: ks.color, title: 'Pick any RGB colour', on: { input: e => { saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: e.target.value, mode: (settings().kinds[k.id] || k).mode } }) }); applyKindCSS(); e.target.nextSibling.value = e.target.value; SettingsView.repaint(); } } }),
        h('input.inp.mono.hex', { value: ks.color, size: 8, on: { change: e => { const v = e.target.value.trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) return toast('Use #RRGGBB'); saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: v, mode: (settings().kinds[k.id] || k).mode } }) }); applyKindCSS(); SettingsView.redraw(); } } }),
        h('div.seg', [['text', 'Text colour'], ['highlight', 'Highlight']].map(([m, l]) => h('button' + (ks.mode === m ? '.on' : ''), { on: { click: () => { saveSettings({ kinds: Object.assign({}, settings().kinds, { [k.id]: { color: (settings().kinds[k.id] || k).color, mode: m } }) }); applyKindCSS(); SettingsView.redraw(); } } }, l))),
        prev); }));
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
