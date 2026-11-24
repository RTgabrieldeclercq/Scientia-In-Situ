/* ==========================================================================
   02b · Features (V3.995 — Gabe: "Rewire the settings to be a feature on/off
   to declutter a notebook for people that want a more simplistic look and
   feel"; "Have a live preview for every different feature, and it follows the
   user as you scroll down the settings"; "any new feature added should be
   fully wired in the settings tab with a live preview").
   The register every feature declares itself in (20a-features.js): its
   group, its wording, which presets have it, what it needs, its settings and
   its live preview. Settings → Features is drawn from it (20-settings.js);
   code asks FEAT.on(id) and FEAT.tune(id, key); body.f-off-<id> hides what
   CSS alone can.
   • Off hides a feature's tools and decorations; what was made with it stays
     in the notes, the search and the export.
   • Presets: 'simple', 'standard', 'all'. A notebook made before V3.995 is on
     'all' (nothing it had goes away); a new notebook starts on 'standard'.
   • The switches belong to the notebook: settings().feat = { preset, on },
     `on` holding only what differs from the preset. A device can keep its own
     (_ls 'featOwn' and 'feat'): a phone on Simple, the desktop on Everything.
   • A feature bound to a setting that existed before (f.get / f.set) keeps
     it there — on a device with its own switches it is stored on the device
     like the rest, unless `nb: true` (the notebook's own: the lock, a lab
     experiment). `keep: true` — presets never change it (with get, nb).
   • Settings: settings().tune['<id>.<key>'] holds what differs from the
     default; a setting bound to an existing key has get / set instead.
     FEAT.size(id, key, zoom): a size rule — fixed, or eased between two
     sizes over a range of zoom.
   • FEAT.audit(): the features with no preview, description or group — a
     feature that isn't in the register with a preview isn't finished.
   • V4.12 — a page each (20-settings.js featurePage, #/settings/feature/<id>)
     and a demonstration: FEAT.demo(id, { use, by, video, poster, steps }) in
     20b-demos.js — what the feature is for, in the words of whoever asked for
     it, and a recording of it being used in a test note (demokit/record.mjs
     makes both the file and the entry). FEAT.undemoed(): the features that
     have none yet.
   ========================================================================== */
const FEAT = {
  GROUPS: [
    { id: 'canvas', label: 'Canvas & notes', gl: '▦' },
    { id: 'pen', label: 'Pen & touch', gl: '✎' },
    { id: 'structures', label: 'Structures', gl: '¶' },
    { id: 'bridges', label: 'Bridges', gl: '⇄' },
    { id: 'time', label: 'Time & reminders', gl: '◷' },
    { id: 'reading', label: 'Reading & sources', gl: '❡' },
    { id: 'widgets', label: 'Widgets', gl: '∑' },
    { id: 'tabs', label: 'Tabs & overview', gl: '▤' },
    { id: 'device', label: 'This device & sync', gl: '⇅' },   // V4.113
  ],
  PRESETS: [['simple', 'Simple'], ['standard', 'Standard'], ['all', 'Everything']],
  list: [], by: {}, _live: {}, demos: {},
  /** A feature declares itself: { id, group, label, desc, core?, keep?, presets: { simple, standard }, needs?, tab?, get?, set?, tune: [{ key, label, type, def, … }], preview(P) }. */
  def(f) {
    if (!f || !f.id) return null;
    if (FEAT.by[f.id]) Object.assign(FEAT.by[f.id], f); else { FEAT.list.push(f); FEAT.by[f.id] = f; }
    return FEAT.by[f.id];
  },
  /* ---------- where the switches live: the notebook, or this device ---------- */
  own: () => { try { return !!_ls.get('featOwn', false); } catch (e) { return false; } },
  nb() { const s = (typeof settings === 'function' ? settings() : {}).feat; return s && typeof s === 'object' ? { preset: s.preset || 'all', on: Object.assign({}, s.on || {}) } : { preset: 'all', on: {} }; },
  store() { if (FEAT.own()) { const d = _ls.get('feat', null); if (d && typeof d === 'object') return { preset: d.preset || 'all', on: Object.assign({}, d.on || {}) }; } return FEAT.nb(); },
  save(st) { if (FEAT.own()) _ls.set('feat', st); else saveSettings({ feat: st }); FEAT.apply(); },
  /** This device keeps its own switches (on: starting from what the notebook shows now) or follows the notebook's (off). */
  setOwn(on) {
    if (on) { const st = FEAT.nb(); FEAT.list.forEach(f => { if (f.get && !f.nb && !f.core) { let v = true; try { v = !!f.get(); } catch (e) { } if (v !== FEAT.inPreset(f, st.preset)) st.on[f.id] = v; } }); _ls.set('feat', st); }
    _ls.set('featOwn', !!on); FEAT.apply();
  },
  /** Kept on this device (its own switches), not in a setting of the notebook. */
  dev: f => FEAT.own() && !f.nb,
  preset: () => FEAT.store().preset,
  inPreset(f, p) { if (!f) return true; if (f.core) return true; if (f.keep) { try { return f.get ? !!f.get() : true; } catch (e) { return true; } } if (p === 'all') return true; const ps = f.presets || {}; return p === 'simple' ? !!ps.simple : ps.standard !== false; },
  raw(id) {
    const f = FEAT.by[id]; if (!f || f.core) return true;
    if (f.get && !FEAT.dev(f)) { try { return !!f.get(); } catch (e) { return true; } }
    const st = FEAT.store(); return id in st.on ? !!st.on[id] : FEAT.inPreset(f, st.preset);
  },
  /** Is it on (and what it needs on too)? A feature that isn't registered is on. */
  on(id) { const f = FEAT.by[id]; if (!f) return true; return FEAT.raw(id) && (!f.needs || FEAT.on(f.needs)); },
  set(id, v) {
    const f = FEAT.by[id]; if (!f || f.core) return; v = !!v;
    if (f.set && !FEAT.dev(f)) f.set(v);
    else { const st = FEAT.store(); if (v === FEAT.inPreset(f, st.preset)) delete st.on[id]; else st.on[id] = v; FEAT.save(st); }
    FEAT.apply(); try { f.changed && f.changed(v); } catch (e) { console.warn('[feat]', id, e); }
  },
  usePreset(p) {
    FEAT.save({ preset: p, on: {} });
    FEAT.list.forEach(f => { if (f.set && !f.core && !f.keep && !FEAT.dev(f)) { const want = FEAT.inPreset(f, p); if (FEAT.raw(f.id) !== want) { f.set(want); try { f.changed && f.changed(want); } catch (e) { } } } });
    FEAT.apply();
  },
  /** How many switches differ from the preset. */
  changes() { const p = FEAT.preset(); return FEAT.list.filter(f => !f.core && !f.keep && FEAT.raw(f.id) !== FEAT.inPreset(f, p)).length; },
  count: () => FEAT.list.filter(f => FEAT.on(f.id)).length,
  /* ---------- settings ---------- */
  tdef(id, key) { const f = FEAT.by[id]; return f && (f.tune || []).find(t => t.key === key) || null; },
  tune(id, key) {
    const t = FEAT.tdef(id, key); if (!t) return undefined; const k = id + '.' + key;
    if (k in FEAT._live) return FEAT._live[k];
    if (t.get) { try { return t.get(); } catch (e) { return t.def; } }
    const v = ((typeof settings === 'function' ? settings() : {}).tune || {})[k];
    return v === undefined ? (t.def && typeof t.def === 'object' ? JSON.parse(JSON.stringify(t.def)) : t.def) : v;
  },
  setTune(id, key, v) {
    const t = FEAT.tdef(id, key); if (!t) return; delete FEAT._live[id + '.' + key];
    if (t.set) t.set(v);
    else { const all = Object.assign({}, settings().tune || {}), k = id + '.' + key; if (JSON.stringify(v) === JSON.stringify(t.def)) delete all[k]; else all[k] = v; saveSettings({ tune: all }); }
    try { t.changed && t.changed(v); } catch (e) { console.warn('[feat]', id, key, e); }
  },
  /** While a slider moves: the preview follows without saving. */
  live(id, key, v) { FEAT._live[id + '.' + key] = v; },
  isDefault(id, key) { const t = FEAT.tdef(id, key); return !t || t.get ? true : JSON.stringify(FEAT.tune(id, key)) === JSON.stringify(t.def); },
  /** A size rule's scale at this zoom (1 = normal): { mode: 'fixed', fixed: % } or { mode: 'zoom', from: %, to: %, z0: zoom %, z1: zoom % }. */
  size(id, key, zoom) {
    const s = FEAT.tune(id, key) || {}; if (s.mode !== 'zoom') return clamp((+s.fixed || 100) / 100, .3, 3);
    const z = (zoom || 1) * 100, a = +s.z0 || 50, b = +s.z1 || 200, t = a === b ? 1 : clamp((z - a) / (b - a), 0, 1);
    return clamp(((+s.from || 100) + ((+s.to || 100) - (+s.from || 100)) * t) / 100, .3, 3);
  },
  /** The page's classes: body.f-off-<id> for each feature that is off. */
  apply() { const b = document.body; if (!b) return; FEAT.list.forEach(f => b.classList.toggle('f-off-' + f.id, !FEAT.on(f.id))); },
  /** A tab whose feature is off leaves the tab row (its page still opens from links and search). */
  tabOn(k) { const f = FEAT.list.find(x => x.tab === k); return !f || FEAT.on(f.id); },
  /** A feature's demonstration: FEAT.demo(id, { use, by, at, video, poster, v, w, h, dur, steps: [[seconds, caption]…] }) records it (20b-demos.js); FEAT.demo(id) reads it. */
  demo(id, d) { if (d) FEAT.demos[id] = Object.assign({ id }, d); return FEAT.demos[id] || null; },
  /** The features with no recorded demonstration yet. */
  undemoed() { return FEAT.list.filter(f => !(FEAT.demos[f.id] && FEAT.demos[f.id].video)).map(f => f.id); },
  /** The features that aren't finished: no preview, no description, or no group. */
  audit() { return FEAT.list.filter(f => typeof f.preview !== 'function' || !f.desc || !FEAT.GROUPS.some(g => g.id === f.group)).map(f => f.id); },
};
