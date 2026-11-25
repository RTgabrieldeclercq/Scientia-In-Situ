/* ==========================================================================
   13zob · The notebook on this device (V4.113). A phone, a tablet or a laptop
   paired with your computer keeps the notebook, so it opens and works with no
   connection: what you write waits in the outbox (13zc) and goes to the
   computer when it can be reached again (on opening, on `online`, on coming
   back to the app). The computer's worker (serve.py's sw.js, registered here)
   keeps the page and its files; navigator.storage.persist() asks the browser
   to keep the notebook's storage (Safari grants it mostly to an installed
   app; installed and used, an iPad app is not subject to Safari's 7-day
   clearing). Opened from its icon (installed), it keeps itself (Settings →
   Features → The notebook on this device → Keep it when installed).
   On the computer itself (SYNC.local) none of this applies.
   OFFLINE: keep() · stop() · warm() · state() · card()
   ========================================================================== */
const OFFLINE = {
  KEY: 'offlineKeep',
  /** a device of your computer (not the computer itself) */
  device: () => typeof SYNC !== 'undefined' && !SYNC.local && SYNC.on,
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
  /** The computer's worker (serve.py's sw.js) keeps its own files (its shell), so there is nothing to add to its cache from here. */
  async caches() { return null; },
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
  /** Register the worker that keeps the page: the computer's (serve.py's sw.js, as 13zc does). */
  async register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
    try {
      if (typeof SYNC !== 'undefined' && !SYNC.local) navigator.serviceWorker.register('sw.js').catch(() => { });
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
      const st = await OFFLINE.state(), kept = OFFLINE.kept(), K = OFFLINE.kind(), cloud = 'Your computer';
      const sync = typeof SYNC === 'undefined' || !SYNC.on ? 'Not connected' : SYNC.online === false ? 'Offline — ' + plural(SYNC.outbox.size, 'change') + ' waiting here, sent when it is back' : (SYNC.outbox.size ? plural(SYNC.outbox.size, 'change') + ' going · ' : 'In step') + (SYNC.lastOk ? ' · last contact ' + fmtWhen(SYNC.lastOk) : '');
      const row = (ok, k, v) => [h('dt', k), h('dd' + (ok ? '.ok' : ''), h('span.off-m', ok ? '✓' : '–'), ' ', v)];
      el.replaceChildren(
        h('b.h', kept ? 'The notebook is kept on this device' : 'Keep the notebook on this device'),
        h('p.tiny', kept ? 'It opens and works on this ' + K.name + ' without a connection; what you write waits here and goes to ' + cloud.toLowerCase() + ' when there is one.' : 'Then it opens and works without a connection — the same on an iPad, an iPhone, an Android phone or tablet, a Mac, a Windows PC or a Chromebook — and what you write goes to ' + cloud.toLowerCase() + ' when there is one.'),
        h('dl.off-dl',
          row(st.offline, 'Opens offline', st.offline ? 'Yes' : kept ? 'Once this page has loaded with a connection' : 'Not yet'),
          row(st.persisted, 'Kept by the browser', st.persisted ? 'Yes — it will not clear it' : (K.pf === 'ios' || K.safari) && !st.installed ? 'Safari may clear it after 7 days unused — install it' : 'May be cleared if space runs out' + (st.installed ? '' : ' — installing it helps')),
          row(st.installed, 'Installed', st.installed ? 'Opens from its icon' : 'In the browser'),
          row(typeof SYNC !== 'undefined' && SYNC.on && SYNC.online !== false && !SYNC.outbox.size, cloud, sync),
          h('dt', 'Space used'), h('dd', OFFLINE.mb(st.used) + (st.quota ? ' of ' + OFFLINE.mb(st.quota) : ''))),
        h('div.row', { style: { gap: '8px', marginTop: '8px', flexWrap: 'wrap' } },
          !kept ? h('button.btn.sm.pri', { disabled: OFFLINE.busy, on: { click: () => OFFLINE.keep() } }, OFFLINE.busy ? 'Keeping…' : 'Keep it on this device')
            : [h('button.btn.sm', { disabled: OFFLINE.busy, title: 'Fetch any of its files that are not kept yet', on: { click: () => OFFLINE.keep() } }, OFFLINE.busy ? 'Keeping…' : 'Refresh its files'),
              h('button.btn.sm.ghost', { on: { click: () => OFFLINE.stop() } }, 'Stop keeping it')]),
        !st.installed ? h('div.off-how', h('b', 'Install it on this ' + K.name + ', too'), typeof INSTALL !== 'undefined' && INSTALL.prompt ? h('div', h('button.btn.sm', { on: { click: () => INSTALL.install() } }, 'Install')) : null, OFFLINE.how()) : null);
    };
    el._draw(); return el;
  },
  paint() { $$('.off-card').forEach(c => c._draw && c._draw()); },
  /** V4.114 (Gabe: "It should be universal across devices. It should work on an iPad, a computer, an iPhone, etc..."): what this device is, for its install steps. */
  kind() {
    const u = navigator.userAgent, pf = typeof INSTALL !== 'undefined' ? INSTALL.platform() : 'other', ff = /Firefox\/|FxiOS/.test(u), edge = /Edg\//.test(u);
    if (pf === 'ios') return { pf, name: /iPhone|iPod/.test(u) ? 'iPhone' : 'iPad', ff };
    if (pf === 'android') return { pf, name: /Mobile/.test(u) ? 'Android phone' : 'Android tablet', ff, samsung: /SamsungBrowser/.test(u) };
    if (/CrOS/.test(u)) return { pf: 'chromeos', name: 'Chromebook', ff };
    if (pf === 'mac') return { pf, name: 'Mac', ff, edge, safari: typeof INSTALL !== 'undefined' && INSTALL.safari() };
    if (pf === 'windows') return { pf, name: 'Windows PC', ff, edge };
    return { pf: 'other', name: 'computer', ff, edge };
  },
  /** How to install it on this device — every kind: iPad and iPhone, Android, Mac, Windows, Chromebook, Linux; Safari, Chrome, Edge, Samsung Internet, Firefox. */
  how() {
    const K = OFFLINE.kind(), S = (...x) => h('li', ...x), b = t => h('b', t);
    const own = 'pair it there — the installed app keeps its own storage';
    const end = S('From then on it opens from its icon, works offline, and keeps itself on this ' + K.name + '.');
    const ffDesk = S(b('Firefox can’t install a site as an app'), ': kept here, the notebook still opens offline in Firefox. To have it as an app, open this page in Chrome or Edge', K.pf === 'mac' ? ' (or Safari)' : '', ' and install it there.');
    const chromium = (where) => S('In ', b(K.edge ? 'Edge' : 'Chrome'), ', click the ', b('install icon'), ' at the right of the address bar (or the menu ', b(K.edge ? '⋯ → Apps → Install this site as an app' : '⋮ → Cast, save and share → Install page as app'), ').', where ? ' It then opens from ' + where + '.' : '');
    if (K.pf === 'ios') return h('ol.ins-steps', S('Tap ', b('Share'), ' ', h('span.ins-ic', '⬆︎'), K.name === 'iPad' ? ' (top right in Safari)' : ' (at the bottom in Safari)', ' — in Chrome or Edge, Share is in their menu.'),
      S('Choose ', b('Add to Home Screen'), ', then ', b('Add'), '.'), S('Open ', b('Scientia'), ' from the Home Screen, and ' + own + '.'), end);
    if (K.pf === 'android') return h('ol.ins-steps', K.samsung ? S('In Samsung Internet, tap ', b('≡'), ' → ', b('Add page to'), ' → ', b('Home screen'), '.') : K.ff ? S('In Firefox, tap ', b('⋮'), ' → ', b('Install'), ' (or ', b('Add to Home screen'), ').') : S('In Chrome, tap ', b('⋮'), ' → ', b('Install app'), ' (or ', b('Add to Home screen'), ').'),
      S('Open ', b('Scientia'), ' from its icon — it shares this browser’s sign-in.'), end);
    if (K.pf === 'mac') return h('ol.ins-steps', K.ff ? ffDesk : K.safari ? [S('In Safari, choose ', b('File → Add to Dock'), ' (macOS Sonoma or later).'), S('Open ', b('Scientia'), ' from the Dock, and ' + own + '.')] : chromium('the Dock or Launchpad'), K.ff ? null : end);
    return h('ol.ins-steps', K.ff ? ffDesk : chromium(K.pf === 'windows' ? 'the Start menu and the taskbar' : K.pf === 'chromeos' ? 'the launcher' : 'your apps'), K.ff ? null : end);
  },
  /** The install banner → How: this device's own steps (every kind of device). */
  howModal() { const K = OFFLINE.kind(); modal({ title: 'Install Scientia on this ' + K.name, body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'Installed, it opens from its own icon and works offline — the same on an iPad, an iPhone, an Android phone or tablet, a Mac, a Windows PC or a Chromebook. What you write goes to your computer when it can be reached.'), OFFLINE.how()) }); },
};
{ INSTALL.howTo = function () { return OFFLINE.howModal(); }; }
{
  // Settings → Devices on a device: the card first
  // (it says how to install, so the older install card (13zo) steps aside)
  const st = DEVICES.settings; DEVICES.settings = function () { const el = st.call(DEVICES); try { if (FEAT.on('offline') && OFFLINE.device()) { $$(':scope > .ins-card', el).forEach(x => x.remove()); el.prepend(OFFLINE.card());
    setTimeout(() => INSTALL.banner(), 0); } } catch (e) { } return el; };
  // V4.114: while the card is on screen (it says how to install), the install banner steps aside — on a phone it lay over the card
  const bn = INSTALL.banner; INSTALL.banner = function () { if ($('.off-card')) { const b = $('#insbanner'); if (b) b.remove(); return; } return bn.apply(this, arguments); };
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
