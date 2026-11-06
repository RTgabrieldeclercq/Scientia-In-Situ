/* ==========================================================================
   Scientia's whiteboard (V3.937) — the lab's board page, on this computer.
   board.html (built by scripts/scientia_build.py) is the Lab Notebook's board
   page (rm/pages/notebook-board.html) with the lab's own scripts inlined,
   unchanged: whiteboard.js, whiteboard-replay.js, notebook-board.js. They
   speak Firestore; this file, which runs first, is a small Firestore of its
   own for them: documents in memory, the board's documents read from and
   written back to the note that holds the board (the app window around this
   page: window.SIS_BOARDS, 13zzd-board.js), files (images, a recording's
   minutes) kept as the note's media. No lab sign-in and no network, so the
   desktop app has the same board offline.
   ?board=<id>&owner=me&title=<name>[&view=1] — view=1: the board in its
   image cell, seen and never saved.
   V3.941: a journal of what each touch of the board changed (strokes, cards,
   wires) for undo and redo, and window.SIS_STORE for board/pen.js — the
   notebook's pen on this board.
   ========================================================================== */
(function () {
'use strict';
const qs = new URLSearchParams(location.search);
const BOARD = qs.get('board') || '', OWNER = qs.get('owner') || 'me';
const HOST = (() => { try { return (window.parent !== window && window.parent.SIS_BOARDS) || null; } catch (e) { return null; } })();
const VIEW = qs.get('view') === '1' || !HOST;
const ROOT = 'userData/' + OWNER + '/notebookBoards/' + BOARD;

/* V3.941 — the port keeps its own browser settings (the engine's wb_* keys: pens, pill places, views) under sis-board:,
   so the website's boards on the same address (mcgheelab.com) keep theirs */
try {
  const SP = Storage.prototype, g = SP.getItem, s = SP.setItem, r = SP.removeItem, k = n => (typeof n === 'string' && n.startsWith('wb_')) ? 'sis-board:' + n : n;
  SP.getItem = function (n) { return g.call(this, k(n)); }; SP.setItem = function (n, v) { return s.call(this, k(n), v); }; SP.removeItem = function (n) { return r.call(this, k(n)); };
} catch (e) { }

/* ─── values: timestamps, the FieldValue sentinels ─── */
class Stamp {
  constructor(ms) { this._ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = (ms % 1000) * 1e6; }
  toMillis() { return this._ms; } toDate() { return new Date(this._ms); } valueOf() { return this._ms; }
  isEqual(o) { return !!o && o._ms === this._ms; } toJSON() { return { __ts: this._ms }; }
}
Stamp.now = () => new Stamp(Date.now()); Stamp.fromMillis = ms => new Stamp(ms); Stamp.fromDate = d => new Stamp(d.getTime());
const FVK = '__sisFieldValue', DEL = {};
const FieldValue = {
  serverTimestamp: () => ({ [FVK]: 'ts' }), delete: () => ({ [FVK]: 'del' }), increment: n => ({ [FVK]: 'inc', n }),
  arrayUnion: (...v) => ({ [FVK]: 'union', v }), arrayRemove: (...v) => ({ [FVK]: 'remove', v }),
};
const revive = (k, v) => (v && typeof v === 'object' && typeof v.__ts === 'number' && Object.keys(v).length === 1) ? new Stamp(v.__ts) : v;
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x), revive);
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Stamp) && !v[FVK];
/** A value as stored: sentinels applied against what was there, Dates as timestamps, a deep copy. */
function resolve(v, prev) {
  if (v && typeof v === 'object' && v[FVK]) {
    const a = Array.isArray(prev) ? prev.slice() : [], key = x => JSON.stringify(x);
    switch (v[FVK]) {
      case 'ts': return Stamp.now();
      case 'inc': return (typeof prev === 'number' ? prev : 0) + v.n;
      case 'union': v.v.forEach(x => { if (!a.some(y => key(y) === key(x))) a.push(resolve(x)); }); return a;
      case 'remove': return a.filter(y => !v.v.some(x => key(x) === key(y)));
      default: return DEL;
    }
  }
  if (v instanceof Stamp) return v;
  if (v instanceof Date) return new Stamp(v.getTime());
  if (Array.isArray(v)) return v.map(x => resolve(x));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) { const r = resolve(v[k], prev && prev[k]); if (r !== DEL && r !== undefined) o[k] = r; } return o; }
  return v;
}
function mergeDeep(prev, patch) {
  const o = Object.assign({}, prev);
  for (const k of Object.keys(patch)) {
    if (plain(patch[k]) && plain(o[k])) o[k] = mergeDeep(o[k], patch[k]);
    else { const r = resolve(patch[k], o[k]); if (r === DEL || r === undefined) delete o[k]; else o[k] = r; }
  }
  return o;
}
/** update(): a key is a field path ('liveWhiteboard.recId'); its value replaces what was there. */
function applyUpdate(prev, patch) {
  const o = clone(prev) || {};
  for (const f of Object.keys(patch)) {
    const parts = f.split('.'); let t = o;
    for (let i = 0; i < parts.length - 1; i++) { if (!plain(t[parts[i]])) t[parts[i]] = {}; t = t[parts[i]]; }
    const last = parts[parts.length - 1], r = resolve(patch[f], t[last]);
    if (r === DEL || r === undefined) delete t[last]; else t[last] = r;
  }
  return o;
}
const field = (o, f) => f.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const num = v => v instanceof Stamp ? v._ms : v;
function cmp(a, b) { a = num(a); b = num(b); if (a === b) return 0; if (a == null) return -1; if (b == null) return 1; return a < b ? -1 : 1; }
const fail = (code, msg) => Object.assign(new Error(msg), { code });

/* ─── the documents ─── */
const DOCS = new Map();   // path → { data, v }
let VER = 0;
const LS = new Set();
let firing = false;
function write(ops) {
  const touched = [], changes = [];
  for (const o of ops) {
    const cur = DOCS.get(o.path);
    if (o.op === 'del') { if (cur) { DOCS.delete(o.path); touched.push(o.path); changes.push({ path: o.path, before: cur.data, after: null }); } continue; }
    if (o.op === 'update' && !cur) continue;
    const data = o.op === 'update' ? applyUpdate(cur.data, o.data) : o.merge && cur ? mergeDeep(cur.data, o.data) : resolve(o.data);
    DOCS.set(o.path, { data, v: ++VER }); touched.push(o.path); changes.push({ path: o.path, before: cur ? cur.data : null, after: data });
  }
  if (!touched.length) return;
  if (!firing) { firing = true; Promise.resolve().then(() => { firing = false; LS.forEach(L => { try { fire(L); } catch (e) { console.warn('[board] listener', e); } }); }); }
  if (touched.some(p => p === ROOT || p.startsWith(ROOT + '/'))) Save.soon();
  const replay = J.mute > 0;   // an undo or a redo: hooks leave it as it is
  J.note(changes); HOOKS.forEach(fn => { try { fn(changes, replay); } catch (e) { console.warn('[board] hook', e); } });
}

/* ─── V3.941 — the journal: what each touch of the board changed (strokes, cards, wires), one undo step per touch.
       board/pen.js opens a step on every pointerdown; the engine's writes until the next one belong to it. A stroke
       brought back comes back under a new id (the engine never erases an id it has erased once; cards and wires keep
       theirs — wires name their cards); J.at follows a document to where it lives now. ─── */
const HOOKS = [];
const J = {
  undo: [], redo: [], cur: null, mute: 0, skip: null, moved: {},
  kept: p => p.startsWith(ROOT + '/') && /^(strokes|items|wires)\/[^/]+$/.test(p.slice(ROOT.length + 1)),
  at(p) { let n = 0; while (J.moved[p] && n++ < 64) p = J.moved[p]; return p; },
  step() { J.cur = { ops: new Map(), pushed: false }; },
  note(changes) {
    const g = J.cur; if (J.mute || !g || VIEW) return;
    for (const c of changes) {
      if (!J.kept(c.path) || (J.skip && J.skip(c))) continue;
      const o = g.ops.get(c.path); if (o) o.after = c.after; else g.ops.set(c.path, { before: c.before, after: c.after });
      if (!g.pushed) { g.pushed = true; J.undo.push(g); if (J.undo.length > 200) J.undo.shift(); J.redo.length = 0; }
    }
  },
  /** a fill points at its shape where the shape lives now */
  fix(d) { if (!d || !d.fillOf) return d; const p = J.at(ROOT + '/strokes/' + d.fillOf), id = p.slice(p.lastIndexOf('/') + 1); return id === d.fillOf ? d : Object.assign({}, d, { fillOf: id }); },
  run(ops) { J.mute++; try { write(ops); } finally { J.mute--; } },
  back() {
    const g = J.undo.pop(); if (!g) return false; const ops = [];
    [...g.ops].reverse().forEach(([p, o]) => {
      const at = J.at(p);
      if (!o.before) ops.push({ op: 'del', path: at });
      else if (p.includes('/strokes/') && (!o.after || (o.after.erasedAt && !o.before.erasedAt))) { const np = p.slice(0, p.lastIndexOf('/') + 1) + autoId(); J.moved[at] = np; ops.push({ op: 'set', path: np, data: o.before }); }
      else ops.push({ op: 'set', path: at, data: o.before });
    });
    ops.forEach(x => { if (x.op === 'set') x.data = J.fix(x.data); });
    J.run(ops); J.redo.push(g); return true;
  },
  again() {
    const g = J.redo.pop(); if (!g) return false;
    J.run([...g.ops].map(([p, o]) => o.after ? { op: 'set', path: J.at(p), data: J.fix(o.after) } : { op: 'del', path: J.at(p) }));
    J.undo.push(g); return true;
  },
};
const docSnap = (path, e) => ({ id: path.slice(path.lastIndexOf('/') + 1), ref: new DocRef(path), exists: !!e,
  data: () => e ? clone(e.data) : undefined, get: f => e ? clone(field(e.data, f)) : undefined, metadata: { hasPendingWrites: false, fromCache: false } });

class DocRef {
  constructor(path) { this.path = path; this.id = path.slice(path.lastIndexOf('/') + 1); }
  get parent() { return new ColRef(this.path.slice(0, this.path.lastIndexOf('/'))); }
  collection(name) { return new ColRef(this.path + '/' + name); }
  get() { return Promise.resolve(docSnap(this.path, DOCS.get(this.path))); }
  set(data, opt) { write([{ op: 'set', path: this.path, data, merge: !!(opt && opt.merge) }]); return Promise.resolve(); }
  update(a, ...rest) {
    let patch = a;
    if (typeof a === 'string') { const all = [a, ...rest]; patch = {}; for (let i = 0; i + 1 < all.length; i += 2) patch[all[i]] = all[i + 1]; }   // update('f', v, 'g', w)
    if (!DOCS.has(this.path)) return Promise.reject(fail('not-found', 'No document to update: ' + this.path));
    write([{ op: 'update', path: this.path, data: patch }]); return Promise.resolve();
  }
  delete() { write([{ op: 'del', path: this.path }]); return Promise.resolve(); }
  onSnapshot(a, b) { return listen({ doc: this.path }, a, b); }
  isEqual(o) { return !!o && o.path === this.path; }
}
class Query {
  constructor(path, f, o, n) { this.path = path; this._f = f || []; this._o = o || []; this._n = n == null ? null : n; }
  where(f, op, v) { return new Query(this.path, this._f.concat([[f, op, v]]), this._o, this._n); }
  orderBy(f, dir) { return new Query(this.path, this._f, this._o.concat([[f, dir === 'desc' ? -1 : 1]]), this._n); }
  limit(n) { return new Query(this.path, this._f, this._o, n); }
  limitToLast(n) { return this.limit(n); }
  rows() {
    const pre = this.path + '/', out = [];
    for (const [p, e] of DOCS) {
      if (!p.startsWith(pre) || p.indexOf('/', pre.length) >= 0) continue;
      if (this._f.every(([f, op, v]) => { const x = field(e.data, f);
        switch (op) { case '==': return cmp(x, v) === 0; case '!=': return cmp(x, v) !== 0; case '<': return cmp(x, v) < 0; case '<=': return cmp(x, v) <= 0;
          case '>': return cmp(x, v) > 0; case '>=': return cmp(x, v) >= 0; case 'array-contains': return Array.isArray(x) && x.some(y => cmp(y, v) === 0);
          case 'in': return (v || []).some(y => cmp(x, y) === 0); case 'not-in': return !(v || []).some(y => cmp(x, y) === 0);
          case 'array-contains-any': return Array.isArray(x) && x.some(y => (v || []).some(z => cmp(y, z) === 0)); default: return false; } })
        && this._o.every(([f]) => field(e.data, f) !== undefined)) out.push({ path: p, e });
    }
    const id = r => r.path.slice(pre.length);
    out.sort((a, b) => { for (const [f, d] of this._o) { const c = cmp(field(a.e.data, f), field(b.e.data, f)); if (c) return c * d; } return id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0; });
    return this._n == null ? out : out.slice(0, this._n);
  }
  get() { const rows = this.rows(); return Promise.resolve(querySnap(rows, rows.map((r, i) => ({ type: 'added', r, i })))); }
  onSnapshot(a, b) { return listen({ q: this }, a, b); }
}
class ColRef extends Query {
  constructor(path) { super(path); this.id = path.slice(path.lastIndexOf('/') + 1); }
  doc(id) { return new DocRef(this.path + '/' + (id || autoId())); }
  add(data) { const d = this.doc(); return d.set(data).then(() => d); }
}
let autoN = 0;
const autoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + (autoN++).toString(36);
function querySnap(rows, changes) {
  const docs = rows.map(r => docSnap(r.path, r.e));
  return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn), metadata: { hasPendingWrites: false, fromCache: false },
    docChanges: () => changes.map(c => ({ type: c.type, doc: c.type === 'removed' ? docSnap(c.path, c.e) : docs[c.i], oldIndex: -1, newIndex: c.type === 'removed' ? -1 : c.i })) };
}
function listen(target, a, b) {
  const next = typeof a === 'function' ? a : typeof b === 'function' ? b : a && a.next;
  const L = { target, next, seen: null, alive: true };
  LS.add(L); setTimeout(() => { try { fire(L); } catch (e) { console.warn('[board] listener', e); } }, 0);
  return () => { L.alive = false; LS.delete(L); };
}
function fire(L) {
  if (!L.alive || !L.next) return;
  if (L.target.doc) {
    const e = DOCS.get(L.target.doc), v = e ? e.v : 0;
    if (L.seen === v) return; L.seen = v; L.next(docSnap(L.target.doc, e)); return;
  }
  const rows = L.target.q.rows(), prev = L.seen, now = new Map(rows.map(r => [r.path, r.e])), changes = [];
  if (prev) prev.forEach((e, p) => { if (!now.has(p)) changes.push({ type: 'removed', path: p, e }); });
  rows.forEach((r, i) => { const pe = prev && prev.get(r.path); if (!pe) changes.push({ type: 'added', r, i }); else if (pe.v !== r.e.v) changes.push({ type: 'modified', r, i }); });
  if (prev && !changes.length) return;
  L.seen = now; L.next(querySnap(rows, changes));
}
function batch() {
  const ops = [], B = {
    set(ref, d, o) { ops.push({ op: 'set', path: ref.path, data: d, merge: !!(o && o.merge) }); return B; },
    update(ref, d) { ops.push({ op: 'update', path: ref.path, data: d }); return B; },
    delete(ref) { ops.push({ op: 'del', path: ref.path }); return B; },
    commit() { write(ops); return Promise.resolve(); },
  };
  return B;
}
const db = {
  collection: p => new ColRef(p), doc: p => new DocRef(p), batch,
  runTransaction: fn => { const tx = { get: r => r.get(), set(r, d, o) { r.set(d, o); return tx; }, update(r, d) { r.update(d); return tx; }, delete(r) { r.delete(); return tx; } }; return Promise.resolve(fn(tx)); },
  enablePersistence: () => Promise.resolve(),
};

/* ─── files: the note's media. A file made here is shown from memory until the page closes and saved as
       "sis-media:<id>", which the app turns back into the file's address the next time the board opens. ─── */
const TOKEN = new Map();      // an address in this page → 'sis-media:<id>'
const BYPATH = new Map();     // storage path → { id, url }
class StorageRef {
  constructor(path) { this.fullPath = path; this.name = path.split('/').pop(); }
  child(p) { return new StorageRef((this.fullPath ? this.fullPath + '/' : '') + String(p).replace(/^\/+/, '')); }
  async put(blob, meta) {
    if (VIEW) throw fail('storage/unauthorized', 'This board is open to look at, not to change.');
    const type = (meta && meta.contentType) || blob.type || 'application/octet-stream';
    const r = await HOST.media(BOARD, await blob.arrayBuffer(), this.name, type);
    const url = URL.createObjectURL(blob);
    TOKEN.set(url, 'sis-media:' + r.id); if (r.url) TOKEN.set(r.url, 'sis-media:' + r.id);
    BYPATH.set(this.fullPath, { id: r.id, url });
    return { ref: this, metadata: { fullPath: this.fullPath, size: blob.size, contentType: type } };
  }
  getDownloadURL() { const m = BYPATH.get(this.fullPath); return m ? Promise.resolve(m.url) : Promise.reject(fail('storage/object-not-found', this.fullPath)); }
  delete() { BYPATH.delete(this.fullPath); return Promise.resolve(); }
}
const storage = { ref: p => new StorageRef(p ? String(p) : '') };

/* ─── saving: the board's documents back into the note, a moment after the last change ─── */
const Save = {
  t: null,
  soon() { if (VIEW) return; clearTimeout(Save.t); Save.t = setTimeout(Save.now, 600); },
  now() {
    clearTimeout(Save.t); Save.t = null; if (VIEW) return;
    const out = {}, pre = ROOT + '/';
    for (const [p, e] of DOCS) if (p === ROOT) out[''] = e.data; else if (p.startsWith(pre)) out[p.slice(pre.length)] = e.data;
    const json = JSON.stringify(out, (k, v) => (typeof v === 'string' && TOKEN.has(v)) ? TOKEN.get(v) : v);
    try { HOST.save(BOARD, json); } catch (e) { console.warn('[board] could not save', e); }
  },
};
addEventListener('pagehide', () => { if (Save.t) Save.now(); });
window.SIS_BOARD_FLUSH = () => { if (Save.t) Save.now(); };

/* ─── load what the note holds ─── */
if (HOST) {
  let got = null;
  try { got = JSON.parse(HOST.load(BOARD) || 'null'); } catch (e) { console.warn('[board] could not read the board', e); }
  if (got && got.docs) {
    const media = got.media || {};
    const swap = v => {
      if (typeof v === 'string' && v.startsWith('sis-media:')) { const u = media[v.slice(10)]; if (u) { TOKEN.set(u, v); return u; } return v; }
      if (Array.isArray(v)) return v.map(swap);
      if (v && typeof v === 'object' && !(v instanceof Stamp)) { for (const k of Object.keys(v)) v[k] = swap(v[k]); }
      return v;
    };
    for (const rel of Object.keys(got.docs)) DOCS.set(rel ? ROOT + '/' + rel : ROOT, { data: swap(clone(got.docs[rel])), v: ++VER });
  }
}

/* ─── who is here: the board's owner, or (view) someone looking ─── */
const user = { uid: VIEW ? 'viewer' : OWNER, email: '', displayName: 'Me', isAnonymous: false };
const ML = window.McgheeLab = window.McgheeLab || {};
ML.db = db;
ML.Auth = { currentUser: user, currentProfile: { role: 'member' }, onChange() {}, offChange() {} };
const auth = { currentUser: user, onAuthStateChanged(fn) { setTimeout(() => fn(user), 0); return () => {}; }, signOut: () => Promise.resolve() };
const firestore = () => db;
firestore.FieldValue = FieldValue; firestore.Timestamp = Stamp;
window.firebase = { firestore, auth: () => auth, storage: () => storage, apps: [{}], app: () => ({}), initializeApp: () => ({}) };

/* V3.941 — what board/pen.js (the notebook's pen on this board) works with */
window.SIS_STORE = {
  view: VIEW, host: HOST, root: ROOT, write, newId: () => autoId(),
  step: () => J.step(), undo: () => J.back(), redo: () => J.again(), skip: fn => { J.skip = fn; }, onWrite: fn => HOOKS.push(fn),
  list: col => { const pre = ROOT + '/' + col + '/', out = []; for (const [p, e] of DOCS) if (p.startsWith(pre) && p.indexOf('/', pre.length) < 0) out.push({ path: p, id: p.slice(pre.length), data: e.data }); return out; },
};

/* V3.942 — the cell crops to the drawing (?crop=x,y,w,h,page, 13zzd): once the board is up, the view frames just that */
const crop = (qs.get('crop') || '').split(',');
if (VIEW && crop.length >= 4 && crop.slice(0, 4).every(v => isFinite(+v) && v !== '')) {
  const [x, y, w, hh] = crop.slice(0, 4).map(Number), pageId = crop[4] || 'p1'; let n = 0;
  const t = setInterval(() => { const nb = window.NOTEBOOK_BOARD, inst = nb && nb._state && nb._state.inst;
    if (inst && inst.zoomToRect) { clearInterval(t); setTimeout(() => { try { inst.zoomToRect({ pageId, x, y, w, h: hh }); } catch (e) { console.warn('[board] crop', e); } }, 80); } else if (++n > 150) clearInterval(t); }, 100);
}

document.documentElement.classList.add('sis-board');
if (VIEW) document.documentElement.classList.add('sis-view');
if (!HOST) addEventListener('DOMContentLoaded', () => setTimeout(() => {
  const bar = document.getElementById('nbb-bar'); if (bar) { bar.hidden = false; bar.textContent = 'Open this whiteboard from its note in Scientia — opened on its own, nothing on it is kept.'; }
}, 300));
})();
