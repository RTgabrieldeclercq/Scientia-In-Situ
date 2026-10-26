/* ==========================================================================
   03 · Storage — IndexedDB is the store of record, mirrored in memory so
   reads are synchronous. Every write is journaled with the previous value,
   which gives undo and "show this note as it stood on 12 Aug" for free.
   Falls back to memory-only (clearly flagged) when IndexedDB is missing.
   ========================================================================== */
const S = Object.fromEntries(AUTHORED.map(n => [n, new Map()]));
const DB = {
  mode: 'memory', idb: null, pending: 0, durable: null, lastError: null, group: 0, undoStack: [], redoStack: [], _replaying: false,

  async open() {
    try {
      if (!('indexedDB' in window)) throw new Error('IndexedDB not available');
      this.idb = await new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => {
          const db = r.result;
          for (const [name, def] of Object.entries(STORES)) {
            if (db.objectStoreNames.contains(name)) continue;
            const os = db.createObjectStore(name, def.auto ? { keyPath: def.key, autoIncrement: true } : { keyPath: def.key });
            (def.idx || []).forEach(i => os.createIndex(i, i));
          }
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('Database blocked by another tab'));
      });
      for (const name of AUTHORED) {
        if (name === 'journal') continue;
        const rows = await this._getAll(name);
        rows.forEach(r => S[name].set(r[STORES[name].key], r));
      }
      this.mode = 'idb';
    } catch (e) {
      this.lastError = String(e && e.message || e); this.mode = 'memory';
      console.warn('[storage] falling back to memory:', e);
    }
    this.durable = await ensureDurable();
  },
  _tx(name, mode = 'readonly') { return this.idb.transaction(name, mode).objectStore(name); },
  _getAll(name) { return new Promise((res, rej) => { const r = this._tx(name).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },

  get(store, id) { return S[store].get(id); },
  all(store) { return Array.from(S[store].values()); },
  where(store, f) { const o = []; for (const v of S[store].values()) if (f(v)) o.push(v); return o; },

  /** Last-written copies of authored records, so undo restores what was saved even when a record object was changed in place. */
  _snap: new Map(), SNAP: new Set(['blocks', 'documents', 'wires', 'inklib', 'libsets', 'reminders', 'projects', 'themes', 'aims', 'items', 'terms', 'library', 'views', 'canvases', 'equations', 'chores', 'flags', 'templates']),
  resnap() { this._snap = new Map(); for (const n of this.SNAP) if (S[n]) for (const [id, r] of S[n]) this._snap.set(n + '\u0001' + id, JSON.stringify(r)); },
  /** Start a new undo group — one user gesture = one group. */
  beginGroup(label) { this.group++; this._label = label || ''; },
  put(store, rec, op = 'put') {
    const key = rec[STORES[store].key], prev = S[store].get(key), sk = store + '\u0001' + key, snap = this._snap.get(sk);
    // the record as last written (a record changed in place before put() would otherwise undo to itself)
    const prevCopy = snap != null ? JSON.parse(snap) : prev ? JSON.parse(JSON.stringify(prev)) : null;
    S[store].set(key, rec); if (this.SNAP.has(store)) this._snap.set(sk, JSON.stringify(rec));
    this._write(store, w => w.put(rec));
    if (store !== 'settings' && store !== 'journal' && !this.quiet) this._journal(store, key, prev ? op : 'create', prevCopy);
    return rec;
  },
  del(store, id) {
    const sk = store + '\u0001' + id, snap = this._snap.get(sk), live = S[store].get(id), prev = snap != null ? JSON.parse(snap) : live; S[store].delete(id); this._snap.delete(sk);
    this._write(store, w => w.delete(id));
    this._journal(store, id, 'delete', prev ? JSON.parse(JSON.stringify(prev)) : null);
  },
  _journal(store, id, op, prev) {
    const e = { ts: isoLocal(new Date()), store, id, op, prev, group: this.group };
    if (!this._replaying) { const top = this.undoStack[this.undoStack.length - 1]; if (top && top.group === this.group) top.entries.push(e); else this.undoStack.push({ group: this.group, label: this._label, entries: [e] }); if (this.undoStack.length > 200) this.undoStack.shift(); this.redoStack = []; }
    if (this.mode === 'idb') this._write('journal', w => w.add(e));
  },
  /** Undo the last gesture in this session by restoring each record's previous value. */
  undo() { const g = this.undoStack.pop(); if (!g) return null; this._replaying = true; const redo = { group: g.group, entries: [] };
    for (const e of g.entries.slice().reverse()) { const cur = S[e.store].get(e.id); redo.entries.push({ store: e.store, id: e.id, val: cur ? JSON.parse(JSON.stringify(cur)) : null }); if (e.prev) this.put(e.store, e.prev, 'undo'); else this.del(e.store, e.id); }
    this._replaying = false; this.redoStack.push(redo); return g; },
  redo() { const g = this.redoStack.pop(); if (!g) return null; this._replaying = true; const back = [];
    for (const e of g.entries.slice().reverse()) { const cur = S[e.store].get(e.id); back.push({ store: e.store, id: e.id, prev: cur ? JSON.parse(JSON.stringify(cur)) : null }); if (e.val) this.put(e.store, e.val, 'redo'); else this.del(e.store, e.id); }
    this._replaying = false; this.undoStack.push({ group: g.group, entries: back }); return g; },
  async journalSince(iso) { if (this.mode !== 'idb') return []; const all = await this._getAll('journal'); return all.filter(e => e.ts >= iso); },
  _write(store, fn) {
    if (store !== 'journal' && typeof DISK !== 'undefined') DISK.touch();
    if (this.mode !== 'idb') return;
    try {
      this.pending++;
      const tx = this.idb.transaction(store, 'readwrite');
      fn(tx.objectStore(store));
      tx.oncomplete = () => { this.pending--; };
      tx.onerror = tx.onabort = () => { this.pending--; this.lastError = String(tx.error); toast('Save failed: ' + tx.error); };
    } catch (e) { this.pending--; this.lastError = String(e); }
  },

  /* ---- schema-driven export: enumerate stores FROM THE DATABASE ITSELF (§16.7) ---- */
  async exportAll() {
    const out = { app: 'Scientia In Situ', format: 2, exportedAt: isoLocal(new Date()), dbName: DB_NAME, dbVersion: this.idb ? this.idb.version : DB_VERSION, stores: {}, counts: {} };
    const names = this.mode === 'idb' ? Array.from(this.idb.objectStoreNames) : AUTHORED;
    for (const n of names) {
      const rows = this.mode === 'idb' ? await this._getAll(n) : Array.from((S[n] || new Map()).values());
      out.stores[n] = rows; out.counts[n] = rows.length;
    }
    return out;
  },
  /** Replace everything, then verify record counts per store — the round-trip test. */
  async importAll(data) {
    if (!data || !data.stores) throw new Error('Not a Scientia export');
    const unknown = Object.keys(data.stores).filter(n => !STORES[n]);
    for (const n of AUTHORED) {
      S[n].clear();
      if (this.mode === 'idb') await new Promise(res => { const tx = this.idb.transaction(n, 'readwrite'); tx.objectStore(n).clear(); tx.oncomplete = res; tx.onerror = res; });
      const rows = data.stores[n] || [];
      if (this.mode === 'idb') await new Promise((res, rej) => { const tx = this.idb.transaction(n, 'readwrite'); const os = tx.objectStore(n); rows.forEach(r => os.put(r)); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      if (n !== 'journal') rows.forEach(r => S[n].set(r[STORES[n].key], r));
    }
    const after = await this.exportAll(), report = [];
    for (const n of Object.keys(data.counts || {})) {
      if (!STORES[n]) continue;
      report.push({ store: n, expected: data.counts[n], got: after.counts[n] || 0, ok: (after.counts[n] || 0) === data.counts[n] });
    }
    this.undoStack = []; this.redoStack = []; this.resnap();
    return { report, unknown, ok: report.every(r => r.ok) };
  },
  async wipe() {
    for (const n of AUTHORED) {
      S[n].clear();
      if (this.mode === 'idb') await new Promise(res => { const tx = this.idb.transaction(n, 'readwrite'); tx.objectStore(n).clear(); tx.oncomplete = res; tx.onerror = res; });
    }
    this._snap = new Map();
  },
};

async function ensureDurable() {
  try {
    const already = await navigator.storage.persisted();
    const ok = already || await navigator.storage.persist();
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { persisted: ok, usedMB: (usage / 1048576).toFixed(1), quotaMB: (quota / 1048576).toFixed(0) };
  } catch (err) {
    return { persisted: false, reason: String(err && err.message || err) };
  }
}

/* ---- snapshots to a folder (File System Access API; Chrome on localhost) ---- */
const BACKUP = {
  handle: null, last: null, error: null,
  supported: () => 'showDirectoryPicker' in window,
  async choose() {
    try { this.handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'sis-backup' }); await this._remember(); await this.snapshot(); toast('Snapshots will be written to “' + this.handle.name + '”'); }
    catch (e) { if (e.name !== 'AbortError') toast('Folder access refused: ' + e.message); }
  },
  async _remember() { if (DB.mode !== 'idb') return; try { const tx = DB.idb.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put({ id: '_backupHandle', handle: this.handle }); } catch { } },
  async restore() { if (DB.mode !== 'idb') return; try { const r = await new Promise(res => { const q = DB._tx('blobs').get('_backupHandle'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); if (r && r.handle) this.handle = r.handle; } catch { } },
  async snapshot(force) {
    if (!this.handle) return false;
    try {
      const perm = await this.handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { if (!force) { this.error = 'permission needed — click “Snapshot now”'; return false; } if (await this.handle.requestPermission({ mode: 'readwrite' }) !== 'granted') return false; }
      const data = await DB.exportAll(); data.stores.blobs = (data.stores.blobs || []).filter(b => b.id !== '_backupHandle');
      const name = `scientia-${localDate(new Date())}-${pad(new Date().getHours())}${pad(new Date().getMinutes())}.json`;
      const fh = await this.handle.getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(JSON.stringify(data)); await w.close();
      this.last = new Date(); this.error = null; return true;
    } catch (e) { this.error = String(e.message || e); return false; }
  },
};

const settings = () => DB.get('settings', 'main') || DEFAULT_SETTINGS;
function saveSettings(patch) { const s = Object.assign({}, settings(), patch); DB.put('settings', s); return s; }
