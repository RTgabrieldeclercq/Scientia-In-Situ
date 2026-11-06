/* ==========================================================================
   13zc · Sync between devices. The computer that runs serve.py holds the
   record; this browser (and every paired phone or tablet) sends its changes
   record by record and receives everyone else's — a long poll, so they show
   up within a second or two. Changes made while the computer can't be
   reached wait in an outbox (kept in this browser) and go through later.
   When two devices changed the same thing before seeing each other's change,
   what can merge merges; the rest is a conflict you decide (header dot → ⚠).
   Journal (undo history), browser blobs and data-folder handles stay local.
   ========================================================================== */
const SYNC = {
  on: false, local: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname), sid: null, seq: 0, conn: uid('k'),
  outbox: new Map(), shadow: new Map(), deferred: new Map(), applying: false, loading: false, online: null, conflicts: 0, lastOk: null, error: null, device: null,
  SKIP: new Set(['journal', 'blobs', 'datasets']),
  K: (store, id) => store + '\u0001' + id,
  dev() { let d = _ls.get('syncDev', null); if (!d) { d = uid('dv'); _ls.set('syncDev', d); } return d; },
  name() { return SYNC.device || (SYNC.local ? 'This computer' : 'This device'); },
  meta() { return _ls.get('sync', {}) || {}; },
  setMeta() { _ls.set('sync', { sid: SYNC.sid, seq: SYNC.seq }); },

  /* ---------- the outbox, kept in its own small database so it survives a closed tab ---------- */
  _kv: null,
  async kv() { if (SYNC._kv) return SYNC._kv; SYNC._kv = await new Promise((res) => { try { const r = indexedDB.open('scientia-sync', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); return SYNC._kv; },
  async kvGet(k) { const db = await SYNC.kv(); if (!db) return null; return new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); },
  async kvSet(k, v) { const db = await SYNC.kv(); if (!db) return; return new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); },
  async loadOutbox() { const rows = (await SYNC.kvGet('outbox')) || []; SYNC.outbox = new Map(rows.map(e => [SYNC.K(e.store, e.id), e])); },
  saveOutbox: debounce(() => SYNC.kvSet('outbox', [...SYNC.outbox.values()]), 300),

  /** A change made here: queued (one entry per record; the first `prev` and `base` are kept). */
  record(store, id, rec, del) {
    const k = SYNC.K(store, id); let e = SYNC.outbox.get(k);
    if (!e) { const sh = SYNC.shadow.get(k); e = { store, id, base: SYNC.seq, prev: sh ? JSON.parse(sh) : null, v: 0 }; SYNC.outbox.set(k, e); }
    e.v++; e.del = !!del; e.rec = del ? null : JSON.parse(JSON.stringify(rec));
    SYNC.saveOutbox(); SYNC.kick(); SYNC.paintDot();
  },
  buildShadow() { SYNC.shadow = new Map(); for (const n of AUTHORED) { if (SYNC.SKIP.has(n)) continue; for (const [id, r] of S[n]) SYNC.shadow.set(SYNC.K(n, id), JSON.stringify(r)); } },

  /* ---------- sending ---------- */
  _pushT: null, _pushing: false, _backoff: 2000,
  kick() { clearTimeout(SYNC._pushT); SYNC._pushT = setTimeout(() => SYNC.push(), 400); },
  async push(anySid) {
    if (!SYNC.on || SYNC._pushing || !SYNC.outbox.size) return true; SYNC._pushing = true;
    const batch = [...SYNC.outbox.values()].slice(0, 400), sent = batch.map(e => [e, e.v]);
    try {
      const r = await fetch('api/sync/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: SYNC.sid, anySid: !!anySid, dev: SYNC.dev(), conn: SYNC.conn, name: SYNC.name(), ops: batch.map(e => ({ store: e.store, id: e.id, rec: e.rec, del: e.del, prev: e.prev, base: e.base })) }) });
      if (r.status === 401) { SYNC.unpaired(); return false; }
      const j = await r.json(); if (j.reset) { SYNC._pushing = false; return SYNC.reset(); }
      if (!j.ok) throw new Error(j.error || 'refused');
      for (const [e, v] of sent) { const k = SYNC.K(e.store, e.id); if (SYNC.outbox.get(k) === e && e.v === v) { SYNC.outbox.delete(k); if (e.del) SYNC.shadow.delete(k); else SYNC.shadow.set(k, JSON.stringify(e.rec)); } }
      SYNC.saveOutbox(); SYNC.online = true; SYNC.lastOk = new Date(); SYNC.error = null; SYNC._backoff = 2000;
      if ((j.echo || []).length) SYNC.apply(j.echo);
      SYNC.setConflicts(j.conflicts);
      SYNC._pushing = false; SYNC.paintDot(); if (SYNC.outbox.size) SYNC.kick(); return true;
    } catch (e) {
      SYNC._pushing = false; SYNC.online = false; SYNC.error = String(e.message || e); SYNC.paintDot();
      clearTimeout(SYNC._pushT); SYNC._pushT = setTimeout(() => SYNC.push(), SYNC._backoff); SYNC._backoff = Math.min(30000, SYNC._backoff * 2); return false;
    }
  },

  /* ---------- receiving ---------- */
  _pulling: false,
  async pullLoop() {
    if (SYNC._pulling) return; SYNC._pulling = true; let wait = 2000;
    while (SYNC.on) {
      try {
        const r = await fetch(`api/sync/pull?conn=${SYNC.conn}&since=${SYNC.seq}&sid=${encodeURIComponent(SYNC.sid || '')}&wait=${document.hidden ? 20 : 25}&c=${SYNC.conflicts}`, { cache: 'no-store' });
        if (r.status === 401) { SYNC.unpaired(); break; }
        const j = await r.json();
        if (j.reset) { await SYNC.reset(); break; }
        if ((j.ops || []).length) SYNC.apply(j.ops);
        SYNC.seq = j.seq; SYNC.setMeta(); SYNC.setConflicts(j.conflicts);
        if (!SYNC.online) { SYNC.online = true; SYNC.kick(); }
        SYNC.lastOk = new Date(); SYNC.error = null; wait = 2000; SYNC.paintDot();
      } catch (e) {
        SYNC.online = false; SYNC.error = String(e.message || e); SYNC.paintDot();
        await new Promise(res => setTimeout(res, wait)); wait = Math.min(30000, wait * 2);
      }
    }
    SYNC._pulling = false;
  },
  /** Someone else's changes. A record with a change of ours still waiting is left alone (the computer merges it); a component being typed in waits until you leave it. */
  apply(ops) {
    let n = 0, docs = false, profiles = false;
    const typing = () => { const a = document.activeElement, box = a && a.closest && a.closest('.box[data-id]'); return box && a.isContentEditable ? box.dataset.id : null; };
    const busy = typing();
    SYNC.applying = true; const rp = DB._replaying; DB._replaying = true;
    try {
      for (const o of ops) {
        if (!STORES[o.store] || SYNC.SKIP.has(o.store)) continue; const k = SYNC.K(o.store, o.id);
        if (SYNC.outbox.has(k)) continue;
        if (busy && o.store === 'blocks' && o.id === busy) { SYNC.deferred.set(k, o); continue; }
        if (o.del) { if (DB.get(o.store, o.id)) DB.del(o.store, o.id); SYNC.shadow.delete(k); }
        else { DB.put(o.store, o.rec); SYNC.shadow.set(k, JSON.stringify(o.rec)); }
        n++; if (o.store === 'documents') docs = true; if (o.store === 'profiles') profiles = true;
      }
    } finally { SYNC.applying = false; DB._replaying = rp; }
    if (!n) return;
    if (docs && typeof REGION !== 'undefined') REGION._idx = null;
    if (profiles && typeof loadProfiles === 'function') loadProfiles();
    changed(); if (typeof MOBILE !== 'undefined' && MOBILE.on) MOBILE.refresh();
  },
  flushDeferred() { if (!SYNC.deferred.size) return; const ops = [...SYNC.deferred.values()]; SYNC.deferred.clear(); SYNC.apply(ops); },

  /* ---------- whole-record moves ---------- */
  /** The computer's record replaced what this device had seen (another notebook, a restore): send what's waiting, then load it. */
  async reset() {
    if (SYNC.loading) return; if (SYNC.outbox.size) await SYNC.push(true);
    await SYNC.fullLoad(); return false;
  },
  async fullLoad() {
    SYNC.loading = true; SYNC.on = false;
    try {
      const r = await fetch('api/sync/state' + (SYNC.local ? '' : '?journal=0'), { cache: 'no-store' }); if (!r.ok) throw new Error('could not read the record');
      const data = await r.json();
      if (SYNC.local && !DISK.isEmpty()) await DISK.keep('browser-before-load');
      // what belongs to this device stays: browser-kept files, data-folder handles
      if (DB.mode === 'idb') { const blobs = await DB._getAll('blobs'), ds = await DB._getAll('datasets'), byId = new Map((data.stores.datasets || []).map(x => [x.id, x])); ds.forEach(x => byId.set(x.id, x)); data.stores.blobs = blobs; data.stores.datasets = [...byId.values()]; }
      if (!SYNC.local) delete data.stores.journal;
      DISK.paused = true; await DB.importAll(data);
      SYNC.sid = data.sid; SYNC.seq = data.syncSeq || 0; SYNC.setMeta(); _ls.set('nbSavedAt', data.savedAt || null);
      SYNC.outbox.clear(); await SYNC.kvSet('outbox', []);
      setTimeout(() => location.reload(), 150); return true;
    } catch (e) { SYNC.loading = false; toast('Sync: ' + (e.message || e)); return false; }
  },
  /** This computer's data becomes the record every device follows (an empty notebook, an import, starting empty). */
  async replaceWithMine(reason = 'device') {
    if (!SYNC.local) { toast('Only the computer that runs the app can replace the whole record'); return false; }
    const data = await DISK.exportRecord(reason);
    const r = await fetch('api/snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const j = await r.json();
    if (!j.ok) { toast('Could not save into the notebook: ' + (j.error || '?')); return false; }
    SYNC.sid = j.meta.sid; SYNC.seq = j.meta.syncSeq; SYNC.setMeta(); _ls.set('nbSavedAt', j.meta.savedAt || null);
    SYNC.outbox.clear(); SYNC.saveOutbox(); SYNC.buildShadow(); return true;
  },
  adopt(sid, seq) { SYNC.sid = sid; SYNC.seq = seq || 0; SYNC.setMeta(); },

  /* ---------- launch ---------- */
  async hello() { try { const r = await fetch('api/sync/hello', { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; } },
  /** 'none' (no server or no notebook: as before), 'loading', 'pair', 'unreachable', 'offline' or 'ok'. */
  async boot() {
    const hi = await SYNC.hello();
    if (!hi) {
      // whether this is the computer is remembered from the last contact (a device on a local address stays a device)
      if (_ls.get('syncLocal', SYNC.local)) return 'none'; SYNC.local = false;
      const m = SYNC.meta(); if (!m.sid) return 'unreachable';
      SYNC.sid = m.sid; SYNC.seq = m.seq || 0; SYNC.on = true; SYNC.online = false; await SYNC.loadOutbox(); SYNC.start(); return 'offline';
    }
    if (!hi.auth) return 'pair';
    SYNC.device = hi.device; SYNC.local = !!hi.local; _ls.set('syncLocal', SYNC.local);
    if (!hi.notebook) return SYNC.local ? 'none' : 'nonotebook';
    if (SYNC.local) await DISK.info();
    await SYNC.loadOutbox();
    const m = SYNC.meta(); SYNC.on = true; SYNC.online = true;
    if (m.sid && m.sid === hi.sid) { SYNC.adopt(m.sid, m.seq); SYNC.start(); return 'ok'; }
    if (SYNC.outbox.size) { SYNC.sid = hi.sid; await SYNC.push(true); }
    if (SYNC.local && !DISK.isEmpty()) {
      const mine = _ls.get('nbSavedAt', null);
      const current = (DB.get('settings', 'main') || {}).dataEpoch === DATA_EPOCH;
      if (current && (!hi.records || (mine && hi.savedAt && mine > hi.savedAt))) { await SYNC.replaceWithMine('launch'); SYNC.start(); return 'ok'; }
      if (mine && hi.savedAt && mine === hi.savedAt) { SYNC.adopt(hi.sid, hi.seq); SYNC.start(); return 'ok'; }
    }
    if (!hi.records) { SYNC.adopt(hi.sid, hi.seq); SYNC.start(); return 'ok'; }
    return (await SYNC.fullLoad()) ? 'loading' : 'ok';
  },
  start() {
    SYNC.buildShadow(); SYNC.on = true; SYNC.pullLoop(); if (SYNC.outbox.size) SYNC.kick();
    document.addEventListener('focusout', () => setTimeout(SYNC.flushDeferred, 600), true);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) SYNC.kick(); });
    window.addEventListener('online', () => SYNC.kick());
    SYNC.paintDot();
  },
  unpaired() { SYNC.on = false; SYNC.online = false; SYNC.error = 'This device was removed on the computer'; SYNC.paintDot(); toast('This device is no longer paired — pair it again in Settings → Devices', 6000); },

  /* ---------- conflicts ---------- */
  setConflicts(n) { if (n == null || n === SYNC.conflicts) return; const more = n > SYNC.conflicts; SYNC.conflicts = n; SYNC.paintDot(); if (more) toast('Two devices changed the same thing — click ⚠ in the header to decide', 5000); },
  label(store, rec) {
    if (!rec) return store;
    if (store === 'blocks') return M.blockName(rec) + ' · ' + ((M.doc(rec.docId) || {}).title || '');
    return rec.title || rec.name || rec.label || rec.text && snippet(rec.text, 50) || store + ' ' + (rec.id || '');
  },
  fname: f => ({ body: 'text', label: 'label', title: 'title', x: 'position', y: 'position', w: 'width', synthesis: 'synthesis', header: 'header fields', regions: 'regions', blockIds: 'order of components', marks: 'marks', stamp: 'time stamp' })[f] || f,
  show(v) { if (v === undefined) return h('i.muted', '—'); if (v && typeof v === 'object' && 'text' in v && 'marks' in v) return h('div.serif.sy-txt', v.text || h('i.muted', 'empty'));
    if (typeof v === 'string') return h('div.serif.sy-txt', v || h('i.muted', 'empty')); return h('code.sy-js', snippet(JSON.stringify(v), 400)); },
  async conflictsDialog() {
    let list = []; try { list = (await (await fetch('api/sync/conflicts', { cache: 'no-store' })).json()).conflicts || []; } catch { return toast('Can’t reach your computer'); }
    if (!list.length) { SYNC.setConflicts(0); return toast('Nothing to decide'); }
    const decide = async (c, pick) => { await fetch('api/sync/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: c.cid, pick, dev: SYNC.dev(), name: SYNC.name() }) }); m.close(); SYNC.conflictsDialog(); };
    const card = c => { const rec = c.theirs || c.mine, fields = c.type === 'fields' ? c.fields : [];
      const head = c.type === 'delete' ? `${c.mineName} deleted it; ${c.theirsName} changed it` : c.type === 'deleted' ? `${c.theirsName} deleted it; ${c.mineName} changed it` : `Both changed the ${[...new Set(fields.map(SYNC.fname))].join(', ')}`;
      return h('div.sy-c', h('div.sy-h', h('b', SYNC.label(c.store, rec)), h('span.muted.tiny', ' · ' + head + ' · ' + fmtWhen(c.ts))),
        h('div.sy-cols', h('div.sy-col', h('div.sy-who', c.theirsName), c.type === 'deleted' ? h('i.muted', 'deleted') : fields.length ? fields.map(f => h('div', h('div.sy-f', SYNC.fname(f)), SYNC.show((c.theirs || {})[f]))) : h('i.muted', 'kept as it is'),
          h('button.btn.sm', { on: { click: () => decide(c, 'theirs') } }, 'Keep this')),
          h('div.sy-col', h('div.sy-who', c.mineName), c.type === 'delete' ? h('i.muted', 'deleted') : fields.length ? fields.map(f => h('div', h('div.sy-f', SYNC.fname(f)), SYNC.show((c.mine || {})[f]))) : h('i.muted', 'restore it'),
          h('button.btn.sm.pri', { on: { click: () => decide(c, 'mine') } }, 'Keep this')))); };
    const m = modal({ title: plural(list.length, 'thing') + ' to decide', wide: true, body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'These were changed on two devices before either saw the other’s change. Everything else merged on its own.'), list.map(card)), actions: [{ label: 'Later' }] });
  },

  /* ---------- the header dot ---------- */
  paintDot() {
    let b = $('#syncdot'); if (!b) { const tt = $('#themetoggle'); if (!tt) return; b = h('button.ib#syncdot', { on: { click: e => SYNC.menu(e) } }); tt.before(b); }
    if (!SYNC.on && !SYNC.error) { b.style.display = 'none'; return; } b.style.display = '';
    const n = SYNC.outbox.size, st = SYNC.conflicts ? 'conf' : SYNC.online === false ? 'off' : n ? 'pend' : 'ok';
    b.className = 'ib sy-' + st; b.replaceChildren(st === 'conf' ? '⚠' : h('i.sy-dot'), n && st !== 'conf' ? h('span.sy-n', n) : null);
    b.title = st === 'conf' ? `${plural(SYNC.conflicts, 'thing')} to decide` : st === 'off' ? `Can’t reach your computer — ${plural(n, 'change')} waiting` : n ? `Sending ${plural(n, 'change')}…` : 'In sync with your computer';
  },
  menu(e) {
    const n = SYNC.outbox.size;
    ctxMenu(e.clientX - 200, e.clientY + 12, [{ head: SYNC.conflicts ? 'Sync · decisions waiting' : SYNC.online === false ? 'Sync · offline' : 'Sync · ' + (n ? 'sending' : 'up to date') },
      { label: SYNC.online === false ? `Can’t reach your computer — ${plural(n, 'change')} waiting here` : SYNC.lastOk ? 'Last contact ' + fmtWhen(SYNC.lastOk) : 'Connecting…', disabled: true, run: () => { } },
      SYNC.conflicts ? { label: `Decide ${plural(SYNC.conflicts, 'conflict')}…`, run: () => SYNC.conflictsDialog() } : null,
      { label: 'Try now', run: () => { SYNC._backoff = 2000; SYNC.kick(); } },
      { label: 'Devices…', sub: 'Settings → Devices', run: () => App.go('#/settings') }]);
  },
};

/* ---------- capture every change made here ---------- */
{
  const put = DB.put; DB.put = function (store, rec, op) { const r = put.call(this, store, rec, op); if (SYNC.on && !SYNC.applying && !SYNC.SKIP.has(store)) SYNC.record(store, rec[STORES[store].key], rec, false); return r; };
  const del = DB.del; DB.del = function (store, id) { const had = S[store] && S[store].has(id), r = del.call(this, store, id); if (had && SYNC.on && !SYNC.applying && !SYNC.SKIP.has(store)) SYNC.record(store, id, null, true); return r; };
  // whole-record operations on this computer become the record every device follows
  const refuse = () => { toast('Do this on the computer that runs the app — it holds the record every device follows', 5000); throw new Error('only on the computer'); };
  const imp = DB.importAll.bind(DB); DB.importAll = async function (data) { if (SYNC.on && !SYNC.loading && !SYNC.local) refuse(); const r = await imp(data); if (SYNC.on && !SYNC.loading) await SYNC.replaceWithMine('import'); return r; };
  const wipe = DB.wipe.bind(DB); DB.wipe = async function () { if (SYNC.on && !SYNC.loading && !SYNC.local) refuse(); const r = await wipe(); if (SYNC.on && !SYNC.loading) await SYNC.replaceWithMine('start-empty'); return r; };
  // switching notebooks on this computer: an empty notebook takes this browser's record; loading one goes through sync
  const load = DISK.load; DISK.load = function () { return SYNC.on ? SYNC.fullLoad() : load.call(DISK); };
  // the computer writes the record now; this browser only sends changes (and, on the computer, keeps the Markdown mirror)
  const snap = DISK.snapshot; DISK.snapshot = async function (reason) { if (SYNC.on) { if (reason === 'connect') return SYNC.replaceWithMine('connect'); DISK.last = new Date(); return true; } return snap.call(DISK, reason); };
  const touch = DISK.touch; DISK.touch = function () { if (SYNC.on && !SYNC.local) return; return touch.call(DISK); };
  const sync = VAULT.sync; VAULT.sync = function (...a) { if (!SYNC.local) return Promise.resolve(); return sync.apply(VAULT, a); };
  const boot = DISK.boot; DISK.boot = async function () { const r = await SYNC.boot(); SYNC.registerSW(); if (r !== 'none') { if (r === 'ok' || r === 'offline') DISK.on = SYNC.local && !!DISK.nb; return r; } return boot.call(DISK); };
  // the app opens without a connection on a phone or tablet (secure addresses only)
  // (registered once SYNC.boot knows whether this is the computer — SYNC.local is only known then)
  SYNC.registerSW = () => { if ('serviceWorker' in navigator && window.isSecureContext && SYNC.local === false) navigator.serviceWorker.register('sw.js').catch(() => { }); };
}
