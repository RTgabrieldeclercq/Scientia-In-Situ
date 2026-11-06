/* ==========================================================================
   99 · Boot — open the store, load profiles, seed on first run, start.
   Everything (projects, notes, terms, reviews, the library) is loaded and
   saved in real time from this one file.
   ========================================================================== */
/* the lab layer's pills (rm/scientia/lab-mode.js, loaded after this script): a Quick cast / tools / zoom fan — and
   since V3.941 the ✎ pan · pen fan — left untouched for 3 s rolls into its bar (the lab's default is 10 s), set through
   its LAB.pills */
const PILL_DOCK_MS = 3000;
const pillDock = () => { const p = window.SIS_LAB && SIS_LAB.pills; if (p) p.dockMs = PILL_DOCK_MS; };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pillDock); else pillDock();
(async function boot() {
  if (VIEWER) return VIEWER.boot();   // an exported note (98-viewer)
  await DB.open();
  const demo = /[?&]seed=demo\b/.test(location.search);
  // 1. the notebook folder is the record of truth: a browser that hasn't seen its latest record loads it (and the page starts again)
  const how = demo ? 'demo' : await DISK.boot();
  if (how === 'loading') return;
  if (how === 'pair' || how === 'unreachable' || how === 'nonotebook') { DEVICES.screen(how); return; }
  // 2. this install's data generation: older data (the demo) is wiped once, after a copy is kept
  const st0 = DB.get('settings', 'main') || {};
  if (!demo && st0.dataEpoch !== DATA_EPOCH) {
    if (!DISK.isEmpty()) { await DISK.keep('before-wipe'); await DB.wipe(); _ls.set('nbSavedAt', null); }
    DB.put('settings', Object.assign({}, DEFAULT_SETTINGS, DB.get('settings', 'main') || {}, { id: 'main', dataEpoch: DATA_EPOCH, seeded: true, demoVersion: DEMO_V }));
  }
  const stored = DB.get('settings', 'main') || {};
  DB.put('settings', Object.assign({}, DEFAULT_SETTINGS, stored, { kinds: Object.assign({}, DEFAULT_SETTINGS.kinds, stored.kinds || {}) }));
  if (!DB.all('profiles').length) DEFAULT_PROFILES.forEach(p => DB.put('profiles', p));
  loadProfiles(); ensureStandardTemplates();
  // records from the previous hub: give components a place on the paper lazily (autoLayout on open)
  if (demo && DB.all('projects').length === 0) { _suppress++; DB.quiet = true; try { seedDemo(); } catch (e) { console.error('[seed]', e); } finally { DB.quiet = false; } _suppress--; }
  applyTheme(); applyKindCSS(); IX.rebuild(); DB.undoStack = []; DB.resnap(); DB.beginGroup();
  bootShell();
  document.addEventListener('keydown', e => {
    const DocView_ = App.pane && App.panes().includes(App.pane) ? App.pane : DocView;
    if (!App.panes().length || $('.ovl') || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === '0') { e.preventDefault(); DocView_.paper.fit(DocView_.bbox()); }
    else if (!mod && (k === 'delete' || k === 'backspace') && DocView_.sel) { const b = M.block(DocView_.sel); if (b && b.kind === 'ref') M.removeRef(b); else if (b && !M.removeEmptyBlock(b)) EDIT.confirmBlock(b); }
    else if (!mod && k === 'enter' && DocView_.sel) { e.preventDefault(); const ed = $(`.box[data-id="${DocView_.sel}"] .ed`); if (ed && ed.contentEditable === 'true') { ed.focus(); ED.setCaret(ed, ED.read(ed, []).text.length); } }
    else if (!mod && k === 'n') { e.preventDefault(); const P = DocView_.paper, r = P.rect(), p = P.toWorld(r.left + r.width / 2, r.top + r.height / 2); DocView_.newAt(p.x - 180, p.y - 40); }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyKindCSS(); App.refresh(); });
  window.addEventListener('hashchange', () => { closePop(); hideHover(); App._mounted = false; App.refresh(); });
  App.refresh();
  setInterval(App.tick, 1000);
  setInterval(() => { TIMER.heartbeat(); IX.buildDays(); }, 60000);
  setTimeout(() => TIMER.checkOnLoad(), 400);
  MEDIA.flush(); DATA.watch();
  FOCUS.init(); REM.init(); DISK.lock(); if (DISK.on && !DISK.paused) setTimeout(async () => { await DISK.snapshot('launch'); await VAULT.sync(); }, 1500);
  await BACKUP.restore(); setInterval(() => BACKUP.snapshot(), Math.max(5, settings().backupMinutes) * 6e4);
  window.__ready = true;
})();
