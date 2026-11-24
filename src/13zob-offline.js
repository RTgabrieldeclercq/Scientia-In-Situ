/* ==========================================================================
   13zob · The notebook on this device (V4.113 — Gabe, 24 Nov: "Look into the
   most straightforward way to have the lab notebook loaded locally onto a
   device with sync back to the lab cloud. Research ways of doing it, and
   let's add it to the settings.")
   The lab's notebook on the website is already a device of the lab cloud:
   what you write is kept in this browser and sent by the app's own sync
   (13zc; its outbox waits while offline, and goes on opening, on `online`
   and on coming back to the app; the lab layer carries it to the hub). What
   it lacked to live on a device, and what this adds:
   • the page offline — the site's service worker (/sw.js, scope /) keeps
     /rm/ pages network-first with a cached copy, but only a visit to the
     main site registered it (an iPad's Home Screen app has storage of its
     own, so not even that), and each new version empties its caches. Here
     the notebook registers it, keeps its own files in its current cache —
     the page, its scripts and icons, and the sign-in scripts from gstatic,
     without which it would open signed out — and again whenever a new
     version takes over;
   • storage the browser keeps — navigator.storage.persist() (Safari grants
     it mostly to an installed app; installed and used, an iPad app is not
     subject to Safari's 7-day clearing);
   • an install — manifest.webmanifest (written by scripts/scientia_build.py
     for the website; scope / so the lab site's own sign-in stays in the app).
   Opened from its icon (installed), it keeps itself with no button pressed
   (Settings → Features → The notebook on this device → Keep it when
   installed). Pictures and PDFs that came from other devices still need a
   connection to show: the site's worker leaves Firebase Storage to the network.
   On the computer that holds the record (SYNC.local) none of this applies.
   OFFLINE: keep() · stop() · warm() · state() · card()
   ========================================================================== */
const OFFLINE = {
  KEY: 'offlineKeep',
  lab: () => !!window.__sisCloud,
  /** a device of the lab cloud or of your computer (not the computer itself) */
  device: () => typeof SYNC !== 'undefined' && !SYNC.local && (SYNC.on || OFFLINE.lab()),
  kept: () => !!_ls.get(OFFLINE.KEY, false),
  page: () => location.href.split('#')[0],
  busy: false, last: null, persisted: null,
  /** The notebook's own files: this page, what it loaded from its folder (not the demonstrations), the whiteboard and the icons, and the sign-in scripts. */
  files() {
    const out = new Set([OFFLINE.page()]), dir = new URL('./', location.href);
    try { performance.getEntriesByType('resource').forEach(e => { let u; try { u = new URL(e.name); } catch (x) { return; }
      if (u.origin === location.origin && u.pathname.startsWith(dir.pathname) && !/\/(demos|api|images|recordings)\//.test(u.pathname)) out.add(u.href);
      else if (/(^|\.)gstatic\.com$/.test(u.hostname) && /\.js$/.test(u.pathname)) out.add(u.href); }); } catch (e) { }
    ['board.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'].forEach(f => out.add(new URL(f, dir).href));
    return [...out];
  },
  /** The service worker's current caches (it names them by its version and empties the old ones when a new one takes over). */
  async caches() { if (!window.caches) return null; const ks = await caches.keys(), v = k => +(k.match(/-v(\d+)$/) || [])[1] || 0;
    const shell = ks.filter(k => /^mcgheelab-shell-v\d+$/.test(k)).sort((a, b) => v(a) - v(b)).pop(); if (!shell) return null;
    return { shell, cdn: shell.replace('shell', 'cdn') }; },
  /** Every file that is not in a cache yet is fetched and kept in the worker's current cache. Returns how many were added. */
  async warm() {
    const C = await OFFLINE.caches(); if (!C) return 0; let n = 0;
    for (const url of OFFLINE.files()) {
      try { if (await caches.match(url)) continue; const same = new URL(url).origin === location.origin;
        const r = await fetch(url, same ? { cache: 'no-cache', credentials: 'same-origin' } : { mode: 'no-cors' });
        if (!(r.ok || r.type === 'opaque')) continue; await (await caches.open(same ? C.shell : C.cdn)).put(url, r); n++; } catch (e) { }
    }
    OFFLINE.last = new Date(); return n;
  },
  /** Register the worker that keeps the page: on the lab site the site's own; on a device of your computer, the computer's (13zc). */
  async register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
    try {
      if (OFFLINE.lab()) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      else if (typeof SYNC !== 'undefined' && !SYNC.local) navigator.serviceWorker.register('sw.js').catch(() => { });
      return await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 8000))]);
    } catch (e) { return null; }
  },
  /** Keep the notebook on this device: the worker, its files, storage the browser keeps. `quiet`: no message (the installed app keeping itself). */
  async keep(quiet) {
    if (OFFLINE.busy) return; OFFLINE.busy = true; _ls.set(OFFLINE.KEY, true); OFFLINE.paint();
    try {
      await OFFLINE.register(); const n = await OFFLINE.warm();
      if (navigator.storage && navigator.storage.persist) { try { OFFLINE.persisted = await navigator.storage.persist(); } catch (e) { } }
      const st = await OFFLINE.state(); if (!quiet) toast(st.offline ? 'Kept on this device — it opens without a connection' + (n ? '' : '') : 'Kept — it will open offline once this page has loaded with a connection again', 4500);
    } finally { OFFLINE.busy = false; OFFLINE.paint(); }
  },
  /** Stop keeping it: the notebook's page and whiteboard leave the worker's cache (the site's worker and your notes stay). */
  async stop() { _ls.set(OFFLINE.KEY, false); try { if (window.caches) { const ks = await caches.keys(); for (const k of ks) { const c = await caches.open(k); await c.delete(OFFLINE.page()); await c.delete(new URL('board.html', location.href).href); } } } catch (e) { } OFFLINE.paint(); toast('No longer kept for offline use — your notes stay, and sync as before'); },
  async state() {
    const s = { installed: typeof INSTALL !== 'undefined' && INSTALL.standalone(), worker: !!(navigator.serviceWorker && navigator.serviceWorker.controller), offline: false, persisted: OFFLINE.persisted, used: null, quota: null };
    try { s.offline = !!(window.caches && await caches.match(OFFLINE.page())); } catch (e) { }
    try { if (navigator.storage && navigator.storage.persisted) s.persisted = await navigator.storage.persisted(); } catch (e) { }
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); s.used = e.usage; s.quota = e.quota; } } catch (e) { }
    return s;
  },
  mb: b => b == null ? '—' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB' : (b / 1073741824).toFixed(1) + ' GB',
  /** Settings → Devices: where this device stands, and the one button. */
  card() {
    const el = h('div.off-card'); el._draw = async () => {
      const st = await OFFLINE.state(), kept = OFFLINE.kept(), ios = typeof INSTALL !== 'undefined' && INSTALL.platform() === 'ios', lab = OFFLINE.lab(), cloud = lab ? 'The lab cloud' : 'Your computer';
      const sync = typeof SYNC === 'undefined' || !SYNC.on ? 'Not connected' : SYNC.online === false ? 'Offline — ' + plural(SYNC.outbox.size, 'change') + ' waiting here, sent when it is back' : (SYNC.outbox.size ? plural(SYNC.outbox.size, 'change') + ' going · ' : 'In step') + (SYNC.lastOk ? ' · last contact ' + fmtWhen(SYNC.lastOk) : '');
      const user = lab && window.__sisCloud.user ? (window.__sisCloud.user.email || 'signed in') : null;
      const row = (ok, k, v) => [h('dt', k), h('dd' + (ok ? '.ok' : ''), h('span.off-m', ok ? '✓' : '–'), ' ', v)];
      el.replaceChildren(
        h('b.h', kept ? 'The notebook is kept on this device' : 'Keep the notebook on this device'),
        h('p.tiny', kept ? 'It opens and works without a connection; what you write waits here and goes to ' + cloud.toLowerCase() + ' when there is one.' : 'Then it opens and works without a connection — on the iPad, a phone, a laptop — and what you write goes to ' + cloud.toLowerCase() + ' when there is one.'),
        h('dl.off-dl',
          row(st.offline, 'Opens offline', st.offline ? 'Yes' : kept ? 'Once this page has loaded with a connection' : 'Not yet'),
          row(st.persisted, 'Kept by the browser', st.persisted ? 'Yes — it will not clear it' : ios && !st.installed ? 'Safari may clear it after 7 days unused — install it' : 'May be cleared if space runs out' + (st.installed ? '' : ' — installing it helps')),
          row(st.installed, 'Installed', st.installed ? 'Opens from its icon' : 'In the browser'),
          lab ? row(!!user, 'Signed in', user || 'Not signed in') : null,
          row(typeof SYNC !== 'undefined' && SYNC.on && SYNC.online !== false && !SYNC.outbox.size, cloud, sync),
          h('dt', 'Space used'), h('dd', OFFLINE.mb(st.used) + (st.quota ? ' of ' + OFFLINE.mb(st.quota) : ''))),
        h('div.row', { style: { gap: '8px', marginTop: '8px', flexWrap: 'wrap' } },
          !kept ? h('button.btn.sm.pri', { disabled: OFFLINE.busy, on: { click: () => OFFLINE.keep() } }, OFFLINE.busy ? 'Keeping…' : 'Keep it on this device')
            : [h('button.btn.sm', { disabled: OFFLINE.busy, title: 'Fetch any of its files that are not kept yet', on: { click: () => OFFLINE.keep() } }, OFFLINE.busy ? 'Keeping…' : 'Refresh its files'),
              h('button.btn.sm.ghost', { on: { click: () => OFFLINE.stop() } }, 'Stop keeping it')]),
        !st.installed ? h('div.off-how', h('b', 'Install it, too'), ios ? h('ol.ins-steps', h('li', 'In Safari tap ', h('b', 'Share'), ' → ', h('b', 'Add to Home Screen'), '.'), h('li', 'Open it from the Home Screen once with a connection, and ' + (lab ? 'sign in there (the installed app keeps its own storage; email and password is the sure way).' : 'pair it there (the installed app keeps its own storage).')), h('li', 'From then on it opens offline, and keeps itself on the iPad.'))
          : (typeof INSTALL !== 'undefined' && INSTALL.prompt ? h('button.btn.sm', { on: { click: () => INSTALL.install() } }, 'Install') : (typeof INSTALL !== 'undefined' ? INSTALL.steps() : null))) : null,
        lab ? h('p.tiny.muted', 'Pictures and PDFs added on other devices need a connection to show; your notes, ink and what you add here do not. On a Windows computer, the desktop app keeps the whole notebook in a folder (Settings → The lab).') : null);
    };
    el._draw(); return el;
  },
  paint() { $$('.off-card').forEach(c => c._draw && c._draw()); },
};
{
  // Settings → Devices on a device: the card first
  // (it says how to install, so the older install card (13zo) steps aside)
  const st = DEVICES.settings; DEVICES.settings = function () { const el = st.call(DEVICES); try { if (FEAT.on('offline') && OFFLINE.device()) { $$(':scope > .ins-card', el).forEach(x => x.remove()); el.prepend(OFFLINE.card()); } } catch (e) { } return el; };
  // kept: a new version of the worker empties its caches — keep the files again; installed (opened from its icon): keep it without asking
  const again = debounce(() => { if (FEAT.on('offline') && OFFLINE.kept() && navigator.onLine !== false) OFFLINE.warm().then(() => OFFLINE.paint()); }, 3000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', again);
  addEventListener('online', again);
  setTimeout(() => { try {
    if (!FEAT.on('offline') || !OFFLINE.device() || !window.isSecureContext) return;
    if (OFFLINE.kept()) { if (navigator.onLine !== false) OFFLINE.keep(true); }
    else if (typeof INSTALL !== 'undefined' && INSTALL.standalone() && FEAT.tune('offline', 'auto') !== false) OFFLINE.keep(true);
  } catch (e) { } }, 6000);
}
