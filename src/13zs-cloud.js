/* ==========================================================================
   13zs · Cloud sync through your own Firebase project. When it is set up
   (Settings → Cloud sync), every device signs in with the same Google
   account and syncs with Firestore instead of with the computer, so the
   computer can be off. Changes made offline wait in an outbox and go up
   later. Files (PDFs, images, embedded pages, slides, recordings) go to
   Cloud Storage and are fetched by the devices that need them, then kept
   on that device. The computer, when it runs the app, still writes the
   notebook folder and its backups, now from what the cloud brings in.
   Data layout: users/{uid}/rec/{store~id} = {s, i, j (record JSON), z (gzip),
   d (deleted), t (server time), v (device)}; files under users/{uid}/media
   and users/{uid}/rec in Storage. Only that account can read or write them
   (see the rules in Settings → Cloud sync). Last change wins per record.
   ========================================================================== */
const CLOUD = {
  cfg: null, app: null, auth: null, db: null, st: null, user: null, on: false, applying: false, hasServer: false,
  status: 'off', error: null, storage: 'unknown', storageMsg: '', lastOk: null, seen: 0, unsub: null,
  outbox: new Map(), SKIP: new Set(['journal', 'blobs', 'datasets']),
  K: (store, id) => store + '~' + id,
  dev: () => SYNC.dev(),
  load() { try { const v = _ls.get('cloudCfg', null); CLOUD.cfg = v === 'off' ? null : v || window.SIS_CLOUD_CFG || null; } catch { CLOUD.cfg = null; } return CLOUD.cfg; },   // the Firebase Hosting copy carries the config (hosting.py)
  enabled: () => !!(CLOUD.cfg && CLOUD.cfg.apiKey && CLOUD.cfg.projectId && window.FB),
  parseCfg(txt) { // accepts the snippet from the Firebase console ("const firebaseConfig = {...}") or plain JSON
    const m = String(txt || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('No { … } found');
    let o; try { o = JSON.parse(m[0]); } catch { o = JSON.parse(m[0].replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,\s*}/g, '}')); }
    if (!o.apiKey || !o.projectId || !o.authDomain) throw new Error('apiKey, authDomain and projectId are needed'); return o; },

  /* ---------- the outbox (survives a closed tab) ---------- */
  async loadOutbox() { const rows = (await SYNC.kvGet('cloudOutbox')) || []; CLOUD.outbox = new Map(rows.map(e => [CLOUD.K(e.store, e.id), e])); },
  saveOutbox: debounce(() => SYNC.kvSet('cloudOutbox', [...CLOUD.outbox.values()]), 300),
  record(store, id, rec, del) { const k = CLOUD.K(store, id); const e = CLOUD.outbox.get(k) || { store, id, v: 0 }; e.v++; e.del = !!del; e.rec = del ? null : JSON.parse(JSON.stringify(rec)); CLOUD.outbox.set(k, e); CLOUD.saveOutbox(); CLOUD.kick(); CLOUD.paint(); },

  /* ---------- start ---------- */
  init() {
    if (CLOUD.app) return true; if (!CLOUD.enabled()) return false;
    try { CLOUD.app = FB.initializeApp(CLOUD.cfg, 'sis'); CLOUD.auth = FB.getAuth(CLOUD.app); FB.setPersistence(CLOUD.auth, FB.browserLocalPersistence).catch(() => { });
      CLOUD.db = FB.initializeFirestore(CLOUD.app, { localCache: FB.memoryLocalCache(), ignoreUndefinedProperties: true });
      try { CLOUD.st = CLOUD.cfg.storageBucket ? FB.getStorage(CLOUD.app) : null; } catch { CLOUD.st = null; }
      FB.getRedirectResult(CLOUD.auth).catch(e => { CLOUD.error = CLOUD.msg(e); CLOUD.paint(); });
      FB.onAuthStateChanged(CLOUD.auth, u => { CLOUD.user = u; if (u) CLOUD.start(); else { CLOUD.stop(); CLOUD.status = 'signin'; CLOUD.paint(); } });
      CLOUD.status = 'signin'; return true; }
    catch (e) { CLOUD.status = 'error'; CLOUD.error = CLOUD.msg(e); CLOUD.paint(); return false; }
  },
  msg(e) { const c = e && e.code || ''; return ({ 'auth/unauthorized-domain': 'This address isn’t allowed to sign in — add ' + location.hostname + ' in Firebase → Authentication → Settings → Authorized domains',
    'auth/popup-blocked': 'The sign-in window was blocked — trying a full-page sign-in', 'auth/operation-not-allowed': 'Turn on Google in Firebase → Authentication → Sign-in method',
    'permission-denied': 'Firestore refused — paste the security rules from Settings → Cloud sync into Firestore → Rules', 'auth/network-request-failed': 'No connection' })[c] || String(e && e.message || e); },
  async signIn() {
    if (!CLOUD.init()) return toast('Paste your Firebase config first (Settings → Cloud sync)');
    const pr = new FB.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    try { if (standalone) await FB.signInWithRedirect(CLOUD.auth, pr); else await FB.signInWithPopup(CLOUD.auth, pr); }
    catch (e) { if (e.code === 'auth/popup-blocked') { try { await FB.signInWithRedirect(CLOUD.auth, pr); } catch (e2) { CLOUD.error = CLOUD.msg(e2); } } else CLOUD.error = CLOUD.msg(e); CLOUD.paint(); toast(CLOUD.error || 'Sign-in stopped', 6000); }
  },
  async signOut() { CLOUD.stop(); try { await FB.signOut(CLOUD.auth); } catch { } toast('Signed out — this device keeps its data and stops syncing'); App.refresh(); },
  col() { return FB.collection(CLOUD.db, 'users', CLOUD.user.uid, 'rec'); },
  async start() {
    CLOUD.status = 'connecting'; CLOUD.paint(); await CLOUD.loadOutbox();
    const joined = _ls.get('cloudJoined', null);
    try {
      if (joined !== CLOUD.user.uid) { const go = await CLOUD.join(); if (!go) { CLOUD.on = false; CLOUD.status = 'signin'; CLOUD.paint(); return; } }
      CLOUD.on = true;
      CLOUD.seen = _ls.get('cloudSeen:' + CLOUD.user.uid, 0); CLOUD.listen(); CLOUD.kick(); CLOUD.files.kick();
    } catch (e) { CLOUD.status = 'error'; CLOUD.error = CLOUD.msg(e); CLOUD.paint(); }
  },
  stop() { CLOUD.on = false; if (CLOUD.unsub) { CLOUD.unsub(); CLOUD.unsub = null; } CLOUD.status = CLOUD.enabled() ? 'signin' : 'off'; CLOUD.paint(); },

  /** The first time this device meets this account's cloud. */
  async join() {
    const any = await FB.getDocs(FB.query(CLOUD.col(), FB.limit(1))), cloudEmpty = any.empty, localEmpty = CLOUD.fresh();
    const done = () => { _ls.set('cloudJoined', CLOUD.user.uid); };
    if (cloudEmpty) { if (!localEmpty || DB.all('settings').length) { toast('Putting this device’s notebook in the cloud…'); await CLOUD.uploadAll(); } done(); toast('Cloud sync is on — other devices can sign in now', 5000); return true; }
    if (localEmpty) { await CLOUD.pullAll(true); done(); return true; }
    return new Promise(res => pickModal('Your cloud already holds a notebook', 'This device has its own data too. Which should it keep?', [
      { label: 'Use the cloud’s notebook here', sub: DISK.on ? 'A copy of this device’s data is kept in the notebook folder first' : 'This device’s own records are replaced', run: async () => { if (DISK.on) await DISK.keep('before-cloud'); await CLOUD.pullAll(true); done(); res(true); } },
      { label: 'Merge both', sub: 'Everything from both is kept; where both have the same record, the cloud’s copy wins', run: async () => { await CLOUD.pullAll(false); await CLOUD.uploadAll(true); done(); res(true); } },
      { label: 'Not now', sub: 'Stay signed out of sync on this device', run: () => res(false) }]));
  },
  /** nothing of the person's own here yet (a new install has only today's empty day note) */
  fresh: () => !DB.all('projects').length && !DB.all('library').length && DB.all('documents').every(d => d.type === 'day' && M.docBlocks(d.id).every(b => !(b.body && b.body.text || '').trim())),
  /** every local record up (onlyMissing: those the cloud doesn't have) */
  async uploadAll(onlyMissing) {
    const have = onlyMissing ? new Set((await FB.getDocs(CLOUD.col())).docs.map(d => d.id)) : null;
    for (const n of AUTHORED) { if (CLOUD.SKIP.has(n)) continue; for (const [id, r] of S[n]) { const k = CLOUD.K(n, id); if (have && have.has(k)) continue; CLOUD.outbox.set(k, { store: n, id, v: 1, del: false, rec: r }); } }
    CLOUD.saveOutbox(); while (CLOUD.outbox.size) { const ok = await CLOUD.push(true); if (!ok) break; }
  },
  /** everything down (replace: local records the cloud doesn't have are removed) */
  async pullAll(replace) {
    const snap = await FB.getDocs(CLOUD.col()); const ops = [], keys = new Set(); let maxT = 0;
    for (const d of snap.docs) { const x = d.data(); keys.add(d.id); const t = x.t ? x.t.toMillis() : 0; if (t > maxT) maxT = t; ops.push(await CLOUD.op(x)); }
    CLOUD.apply(ops.filter(Boolean), true);
    if (replace) { CLOUD.applying = true; try { for (const n of AUTHORED) { if (CLOUD.SKIP.has(n)) continue; for (const id of [...S[n].keys()]) if (!keys.has(CLOUD.K(n, id))) DB.del(n, id); } } finally { CLOUD.applying = false; } changed(); }
    CLOUD.seen = maxT; _ls.set('cloudSeen:' + CLOUD.user.uid, maxT); loadProfiles && loadProfiles(); IX.rebuild(); App.refresh();
  },

  /* ---------- sending ---------- */
  _t: null, _pushing: false, _back: 3000,
  kick() { clearTimeout(CLOUD._t); CLOUD._t = setTimeout(() => CLOUD.push(), 1500); },
  async enc(rec) { const j = JSON.stringify(rec); if (j.length < 600000) return { j, z: false };
    const gz = await new Response(new Blob([j]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); let s = ''; const a = new Uint8Array(gz); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768));
    const b = btoa(s); if (b.length > 1000000) throw new Error('A record is too large for the cloud (' + Math.round(b.length / 1024) + ' KB)'); return { j: b, z: true }; },
  async dec(x) { if (!x.j) return null; if (!x.z) return JSON.parse(x.j); const bin = atob(x.j), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return JSON.parse(await new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); },
  async push(force) {
    if ((!CLOUD.on && !force) || !CLOUD.user || (CLOUD._pushing && !force) || !CLOUD.outbox.size) return true; CLOUD._pushing = true;
    const batch = [...CLOUD.outbox.values()].slice(0, 300), sent = batch.map(e => [e, e.v]);
    try { const wb = FB.writeBatch(CLOUD.db);
      for (const e of batch) { let body; try { body = e.del ? { j: null, z: false } : await CLOUD.enc(e.rec); } catch (er) { toast(String(er.message || er), 6000); CLOUD.outbox.delete(CLOUD.K(e.store, e.id)); continue; }
        wb.set(FB.doc(CLOUD.col(), CLOUD.K(e.store, e.id)), { s: e.store, i: String(e.id), j: body.j, z: body.z, d: !!e.del, t: FB.serverTimestamp(), v: CLOUD.dev() }); }
      await wb.commit();
      for (const [e, v] of sent) { const k = CLOUD.K(e.store, e.id); if (CLOUD.outbox.get(k) === e && e.v === v) CLOUD.outbox.delete(k); }
      CLOUD.saveOutbox(); CLOUD.status = 'ok'; CLOUD.error = null; CLOUD.lastOk = new Date(); CLOUD._back = 3000; CLOUD._pushing = false; CLOUD.paint(); if (CLOUD.outbox.size && !force) CLOUD.kick(); return true;
    } catch (e) { CLOUD._pushing = false; CLOUD.status = 'offline'; CLOUD.error = CLOUD.msg(e); CLOUD.paint(); clearTimeout(CLOUD._t); CLOUD._t = setTimeout(() => CLOUD.push(), CLOUD._back); CLOUD._back = Math.min(60000, CLOUD._back * 2); return false; }
  },

  /* ---------- receiving ---------- */
  async op(x) { try { return { store: x.s, id: x.i, del: !!x.d, rec: x.d ? null : await CLOUD.dec(x) }; } catch { return null; } },
  listen() {
    if (CLOUD.unsub) CLOUD.unsub();
    const q = FB.query(CLOUD.col(), FB.where('t', '>', FB.Timestamp.fromMillis(CLOUD.seen || 0)), FB.orderBy('t'));
    CLOUD.unsub = FB.onSnapshot(q, { includeMetadataChanges: false }, async snap => {
      const ops = []; let maxT = CLOUD.seen;
      for (const ch of snap.docChanges()) { if (ch.type === 'removed') continue; const d = ch.doc; if (d.metadata.hasPendingWrites) continue; const x = d.data(); const t = x.t ? x.t.toMillis() : 0; if (t > maxT) maxT = t;
        if (x.v === CLOUD.dev()) continue; const o = await CLOUD.op(x); if (o) ops.push(o); }
      if (ops.length) CLOUD.apply(ops);
      if (maxT > CLOUD.seen) { CLOUD.seen = maxT; _ls.set('cloudSeen:' + CLOUD.user.uid, maxT); }
      CLOUD.status = 'ok'; CLOUD.error = null; CLOUD.lastOk = new Date(); CLOUD.paint();
    }, e => { CLOUD.status = 'offline'; CLOUD.error = CLOUD.msg(e); CLOUD.paint(); setTimeout(() => CLOUD.on && CLOUD.listen(), 15000); });
  },
  /** someone else's changes (a record with a change of ours still waiting is left alone; the component being typed in waits) */
  apply(ops, all) {
    const a = document.activeElement, box = a && a.closest && a.closest('.box[data-id]'), busy = box && a.isContentEditable ? box.dataset.id : null;
    let n = 0, profiles = false, docs = false; CLOUD.applying = true; const rp = DB._replaying; DB._replaying = true;
    try { for (const o of ops) { if (!STORES[o.store] || CLOUD.SKIP.has(o.store)) continue; const k = CLOUD.K(o.store, o.id); if (!all && CLOUD.outbox.has(k)) continue;
        if (busy && o.store === 'blocks' && o.id === busy) { CLOUD.deferred.set(k, o); continue; }
        if (o.del) { if (DB.get(o.store, o.id)) DB.del(o.store, o.id); } else if (o.rec) DB.put(o.store, o.rec);
        n++; if (o.store === 'profiles') profiles = true; if (o.store === 'documents') docs = true; } }
    finally { CLOUD.applying = false; DB._replaying = rp; }
    if (!n || all) return; if (docs && typeof REGION !== 'undefined') REGION._idx = null; if (profiles) loadProfiles(); changed(); if (typeof MOBILE !== 'undefined' && MOBILE.on) MOBILE.refresh(); CLOUD.files.kick();
  },
  deferred: new Map(),
  flushDeferred() { if (!CLOUD.deferred.size) return; const ops = [...CLOUD.deferred.values()]; CLOUD.deferred.clear(); CLOUD.apply(ops); },

  /* ---------- files: up from the device that has them, down to the devices that need them ---------- */
  files: {
    busy: false, failed: new Map(), fetching: new Set(),
    kick: debounce(() => CLOUD.files.run(), 2500),
    path: (kind, id, ext) => `users/${CLOUD.user.uid}/${kind}/${id}${ext ? '.' + ext : ''}`,
    async bytesOfMedia(m) { const b = DB.get('blobs', 'media:' + m.id); if (b && b.blob) return b.blob; if (m.path && CLOUD.hasServer) { try { const r = await fetch(m.path); if (r.ok) return await r.blob(); } catch { } } return null; },
    async run() {
      const F = CLOUD.files; if (F.busy || !CLOUD.on || !CLOUD.user) return; if (!CLOUD.st) { CLOUD.storage = 'off'; CLOUD.storageMsg = 'No storage bucket in the config'; CLOUD.paint(); return; }
      if (CLOUD.storage === 'off' && Date.now() - (F.offAt || 0) < 10 * 60000) return; F.busy = true;
      try {
        for (const m0 of DB.where('media', m => !m.cloud)) { if ((F.failed.get(m0.id) || 0) > 3) continue; const blob = await F.bytesOfMedia(m0); if (!blob) continue;
          await FB.uploadBytes(FB.ref(CLOUD.st, F.path('media', m0.id, m0.ext)), blob, { contentType: m0.mime || blob.type || 'application/octet-stream' });
          const m = DB.get('media', m0.id); if (m) { DB.beginGroup(); DB.put('media', Object.assign({}, m, { cloud: true })); } CLOUD.storage = 'ok'; }
        for (const b0 of DB.where('blocks', b => b.kind === 'rec' && b.rec && (b.rec.path || b.rec.file) && !b.rec.cloud)) { let src = null; try { src = REC.src(b0); } catch { } if (!src) continue;
          let blob = src; if (typeof src === 'string') { if (!CLOUD.hasServer) continue; try { const r = await fetch(src); if (!r.ok) continue; blob = await r.blob(); } catch { continue; } }
          const ext = (String(b0.rec.file || b0.rec.path || '').match(/\.([a-z0-9]+)$/i) || [])[1] || 'webm';
          await FB.uploadBytes(FB.ref(CLOUD.st, F.path('rec', b0.id, ext)), blob, { contentType: blob.type || 'audio/' + ext });
          const b = M.block(b0.id); if (b) { DB.beginGroup(); DB.put('blocks', Object.assign({}, b, { rec: Object.assign({}, b.rec, { cloud: ext }) })); } CLOUD.storage = 'ok'; }
      } catch (e) { const c = e && e.code || ''; CLOUD.storage = 'off'; F.offAt = Date.now();
        CLOUD.storageMsg = /unauthorized/.test(c) ? 'Storage refused — paste the Storage rules from Settings → Cloud sync' : /bucket|not-found|unknown|retry-limit|project/.test(c + (e.message || '')) ? 'Cloud Storage isn’t set up yet (it needs the Blaze plan) — files stay on the device that has them' : CLOUD.msg(e); }
      finally { F.busy = false; CLOUD.paint(); }
    },
    /** fetch a file that lives in the cloud; kept on this device afterwards */
    async fetchMedia(m) { const F = CLOUD.files; if (F.fetching.has(m.id) || !CLOUD.on || !CLOUD.st) return; F.fetching.add(m.id);
      try { const blob = await FB.getBlob(FB.ref(CLOUD.st, F.path('media', m.id, m.ext)));
        DB.put('blobs', { id: 'media:' + m.id, blob }); MEDIA._urls.delete(m.id); if (typeof PDFW !== 'undefined' && PDFW.docs) PDFW.docs.delete(m.id);
        if (CLOUD.hasServer && !m.path) { const cur = DB.get('media', m.id); if (cur) DB.put('media', Object.assign({}, cur, { local: true })); MEDIA.flush(); }
        App.refresh(); }
      catch (e) { if (!F._told) { F._told = true; toast('A file couldn’t come from the cloud: ' + (CLOUD.msg(e) || '').slice(0, 120), 5000); } }
      finally { F.fetching.delete(m.id); } },
    async fetchRec(b) { const ext = b.rec.cloud === true ? 'webm' : b.rec.cloud; const blob = await FB.getBlob(FB.ref(CLOUD.st, CLOUD.files.path('rec', b.id, ext))); REC.blobs.set(b.id, blob); return blob; },
  },

  /* ---------- the header dot and the settings section ---------- */
  paint() {
    let b = $('#clouddot'); if (!b) { const tt = $('#themetoggle'); if (!tt) return; b = h('button.ib#clouddot', { on: { click: e => CLOUD.menu(e) } }); tt.before(b); }
    if (!CLOUD.enabled()) { b.style.display = 'none'; return; } b.style.display = '';
    const n = CLOUD.outbox.size, st = CLOUD.status === 'signin' ? 'in' : CLOUD.status === 'offline' || CLOUD.status === 'error' ? 'off' : n ? 'pend' : 'ok';
    b.className = 'ib cl-' + st; b.replaceChildren(h('span.cl-ic', '☁'), n ? h('span.sy-n', n) : null);
    b.title = st === 'in' ? 'Cloud sync — sign in' : st === 'off' ? `Cloud: ${CLOUD.error || 'offline'} — ${plural(n, 'change')} waiting` : n ? `Sending ${plural(n, 'change')} to the cloud…` : 'In sync with the cloud';
    const sec = $('#cloudsec'); if (sec && !sec.contains(document.activeElement)) sec.replaceWith(CLOUD.settings());
  },
  menu(e) { const n = CLOUD.outbox.size;
    ctxMenu(e.clientX - 220, e.clientY + 12, [{ head: CLOUD.user ? 'Cloud · ' + (CLOUD.user.email || 'signed in') : 'Cloud sync' },
      !CLOUD.user ? { label: 'Sign in with Google', run: () => CLOUD.signIn() } : { label: CLOUD.status === 'offline' ? `Offline — ${plural(n, 'change')} waiting` : CLOUD.lastOk ? 'Last contact ' + fmtWhen(CLOUD.lastOk) : 'Connecting…', disabled: true, run: () => { } },
      CLOUD.user && CLOUD.storage === 'off' ? { label: 'Files: ' + CLOUD.storageMsg, disabled: true, run: () => { } } : null,
      CLOUD.user ? { label: 'Send now', run: () => { CLOUD._back = 3000; CLOUD.push(); CLOUD.files.run(); } } : null,
      { label: 'Cloud settings…', sub: 'Settings → Cloud sync', run: () => App.go('#/settings') }]); },
  RULES_FS: `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /users/{uid}/{doc=**} {\n      allow read, write: if request.auth != null && request.auth.uid == uid;\n    }\n  }\n}`,
  RULES_ST: `rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /users/{uid}/{all=**} {\n      allow read, write: if request.auth != null && request.auth.uid == uid;\n    }\n  }\n}`,
  CORS: `[{"origin": ["*"], "method": ["GET"], "maxAgeSeconds": 3600}]`,
  link() { return location.origin + location.pathname + '#cloudcfg=' + btoa(unescape(encodeURIComponent(JSON.stringify(CLOUD.cfg)))); },
  settings() {
    const on = CLOUD.enabled(), u = CLOUD.user;
    const ta = h('textarea.inp.mono', { rows: 6, placeholder: 'const firebaseConfig = {\n  apiKey: "…",\n  authDomain: "your-project.firebaseapp.com",\n  projectId: "your-project",\n  storageBucket: "your-project.firebasestorage.app",\n  …\n};', style: { width: '100%', fontSize: '12px' } });
    const save = () => { try { const c = CLOUD.parseCfg(ta.value); _ls.set('cloudCfg', c); toast('Saved — the app starts again to connect'); setTimeout(() => location.reload(), 600); } catch (e) { toast('That isn’t a Firebase config: ' + e.message, 5000); } };
    const code = (t, label) => h('details.cl-code', h('summary', label), h('pre.mono', t), h('button.btn.xs', { on: { click: () => { navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast('Copied'), () => { }); } } }, 'Copy'));
    const state = !on ? null : h('div.cl-state', h('div', h('b', 'Project: '), CLOUD.cfg.projectId, ' · ', u ? ['signed in as ', h('b', u.email || u.uid)] : 'not signed in'),
      u ? h('div.tiny', CLOUD.status === 'ok' ? 'In sync' + (CLOUD.lastOk ? ' · last contact ' + fmtWhen(CLOUD.lastOk) : '') : CLOUD.status === 'offline' ? 'Offline — ' + plural(CLOUD.outbox.size, 'change') + ' waiting · ' + (CLOUD.error || '') : CLOUD.status) : null,
      u ? h('div.tiny', 'Files: ', CLOUD.storage === 'ok' ? 'in Cloud Storage' : CLOUD.storage === 'off' ? CLOUD.storageMsg : 'checking…') : null,
      CLOUD.error && !u ? h('div.tiny', { style: { color: 'var(--bad)' } }, CLOUD.error) : null,
      h('div.row', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
        u ? h('button.btn.sm', { on: { click: () => CLOUD.signOut() } }, 'Sign out') : h('button.btn.sm.pri', { on: { click: () => CLOUD.signIn() } }, 'Sign in with Google'),
        u ? h('button.btn.sm', { title: 'Send every record again (after restoring a backup, for instance)', on: { click: async () => { await CLOUD.uploadAll(); toast('Everything sent'); } } }, 'Full upload') : null,
        u ? h('button.btn.sm', { title: 'Bring every record down again', on: { click: async () => { await CLOUD.pullAll(false); toast('Everything brought down'); } } }, 'Full download') : null,
        h('button.btn.sm', { title: 'A link that sets up another device (open it there)', on: { click: () => { const L = CLOUD.link(); modal({ title: 'Set up another device', body: h('div', h('p.serif', 'Open this on the iPad or phone (scan it, or send yourself the link). It carries only the project’s public config; each device still signs in with your Google account.'), DEVICES.qr(L, 4), h('pre.mono.cl-link', L)) }); } } }, 'Link for another device'),
        h('button.btn.sm.ghost', { on: { click: () => pickModal('Turn cloud sync off on this device?', 'The data stays here. The config is forgotten; sync with the computer (Tailscale) comes back.', [{ label: 'Turn off', danger: true, run: () => { _ls.set('cloudCfg', 'off'); _ls.set('cloudJoined', null); location.reload(); } }]) } }, 'Turn off here')));
    return h('div#cloudsec.card.flat',
      h('p.serif', { style: { marginTop: 0 } }, 'Sync every device through your own Firebase project. The computer doesn’t need to be on; it keeps writing the notebook folder and its backups whenever the app runs there.'),
      state,
      h('details.cl-setup' + (on ? '' : '[open]'), h('summary', on ? 'Change the config' : 'Set up'),
        h('ol.cl-steps',
          h('li', 'In the ', h('a', { href: 'https://console.firebase.google.com/', target: '_blank', rel: 'noopener' }, 'Firebase console'), ', open your project → ⚙ Project settings → General → Your apps → add a Web app (</>) → copy the ', h('code', 'firebaseConfig'), ' and paste it below.'),
          h('li', 'Authentication → Get started → Sign-in method → Google → Enable. Then Settings → Authorized domains → add every address you open the app at (', h('code', location.hostname || 'localhost'), ', your Tailscale name, or your Firebase Hosting address).'),
          h('li', 'Firestore Database → Create database (production mode, a region near you) → Rules → paste these:', code(CLOUD.RULES_FS, 'Firestore rules')),
          h('li', 'For files (needs the Blaze plan): Storage → Get started (us-central1, us-west1 or us-east1 keep it free up to 5 GB) → Rules → paste:', code(CLOUD.RULES_ST, 'Storage rules'),
            ' and allow the app to read files: in Google Cloud Shell run ', h('code', 'echo \'' + CLOUD.CORS + '\' > cors.json && gsutil cors set cors.json gs://' + ((CLOUD.cfg && CLOUD.cfg.storageBucket) || 'YOUR-BUCKET')), '.'),
          h('li', 'Paste the config, Save, then Sign in with Google here and on every device (or use “Link for another device”).')),
        ta, h('div.row', { style: { marginTop: '8px' } }, h('button.btn.pri', { on: { click: save } }, 'Save config'))));
  },
};
CLOUD.load();
// a set-up link opened on another device (#cloudcfg=…)
{ const m = /#cloudcfg=([^&]+)/.exec(location.hash); if (m) { try { const c = JSON.parse(decodeURIComponent(escape(atob(m[1])))); if (c.apiKey && c.projectId) { _ls.set('cloudCfg', c); CLOUD.cfg = c; } } catch { } history.replaceState(null, '', location.pathname + location.search); } }
{
  // every change made here goes to the outbox (once the cloud is set up)
  const put = DB.put; DB.put = function (store, rec, op) { const r = put.call(this, store, rec, op); if (CLOUD.enabled() && !CLOUD.applying && !CLOUD.SKIP.has(store) && !window.SIS_EXPORT) CLOUD.record(store, rec[STORES[store].key], rec, false); return r; };
  const del = DB.del; DB.del = function (store, id) { const had = S[store] && S[store].has(id), r = del.call(this, store, id); if (had && CLOUD.enabled() && !CLOUD.applying && !CLOUD.SKIP.has(store) && !window.SIS_EXPORT) CLOUD.record(store, id, null, true); return r; };
  // with the cloud on, the computer + Tailscale sync stands aside; the notebook folder (on the computer) still loads and saves
  const sb = SYNC.boot; SYNC.boot = async function () { if (!CLOUD.enabled()) return sb.call(SYNC); CLOUD.hasServer = await MEDIA.ping(); return 'none'; };
  // a file that lives in the cloud: on a device without the computer's server it comes from there (and stays)
  const mu = MEDIA.url.bind(MEDIA); MEDIA.url = function (rec) {
    if (!rec || !CLOUD.enabled() || !rec.cloud) return mu(rec);
    if (CLOUD.hasServer && rec.path) return rec.path;
    if (MEDIA._urls.has(rec.id)) return MEDIA._urls.get(rec.id);
    const b = DB.get('blobs', 'media:' + rec.id); if (b && b.blob) { const u = URL.createObjectURL(b.blob); MEDIA._urls.set(rec.id, u); return u; }
    CLOUD.files.fetchMedia(rec); return ''; };
  const rs = REC.src; REC.src = function (b) { const s = rs.call(REC, b); if (!CLOUD.enabled() || !b.rec || !b.rec.cloud || (s && (typeof s !== 'string' || CLOUD.hasServer))) return s; return null; };
  const re = REC.ensure; REC.ensure = async function (b) { if (CLOUD.enabled() && b.rec && b.rec.cloud && !REC.blobs.has(b.id) && !(CLOUD.hasServer && REC.src(b)) && !(DB.get('blobs', 'rec:' + b.id))) { try { await CLOUD.files.fetchRec(b); } catch (e) { toast('Can’t bring the recording from the cloud: ' + CLOUD.msg(e)); return null; } } return re.call(REC, b); };
  // start once the app is up
  const go = () => { if (!window.__ready) return setTimeout(go, 300); if (window.SIS_EXPORT) return; if (CLOUD.enabled()) { if (!CLOUD.hasServer) MEDIA.ping().then(v => { CLOUD.hasServer = v; }); CLOUD.init(); CLOUD.paint(); document.addEventListener('focusout', () => setTimeout(CLOUD.flushDeferred, 600), true); window.addEventListener('online', () => { CLOUD.kick(); CLOUD.files.kick(); }); setInterval(() => CLOUD.files.kick(), 120000); } };
  setTimeout(go, 300);
}
