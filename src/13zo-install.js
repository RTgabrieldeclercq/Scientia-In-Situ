/* ==========================================================================
   13zo · Installing the app on a phone, tablet or another computer, and a
   one-time full sync. Installed (Home Screen / Install app), the app opens
   from its own icon, full screen, and works with the computer off: the page
   and everything it holds stay on the device, changes wait and go to the
   computer when it can be reached again.
   • iPad / iPhone: Safari → Share → Add to Home Screen. The Home Screen app
     keeps its own storage, so it is paired from inside the installed app.
   • Android (Chrome), Windows / Mac (Edge, Chrome): an Install button.
   Full sync (on a device): sends what is waiting, then reloads everything
   from the computer — for when a device seems out of step.
   ========================================================================== */
const INSTALL = {
  prompt: null,
  standalone: () => !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone),
  platform() { const u = navigator.userAgent; if (/iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'ios'; if (/Android/.test(u)) return 'android'; if (/Windows/.test(u)) return 'windows'; if (/Mac/.test(u)) return 'mac'; return 'other'; },
  safari: () => /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(navigator.userAgent),
  async install() { const p = INSTALL.prompt; if (!p) return INSTALL.howTo(); p.prompt(); try { const r = await p.userChoice; if (r && r.outcome === 'accepted') toast('Installed — open it from its icon from now on', 4000); } catch { } INSTALL.prompt = null; INSTALL.paint(); },
  steps() {
    const pf = INSTALL.platform(), S = (...x) => h('li', ...x);
    if (pf === 'ios') return h('ol.ins-steps', INSTALL.safari() ? null : S(h('b', 'Open this page in Safari'), ' (other browsers on the iPad and iPhone can’t install it).'),
      S('Tap ', h('b', 'Share'), ' ', h('span.ins-ic', '⬆︎'), ' (top right on the iPad, bottom on the iPhone).'), S('Choose ', h('b', 'Add to Home Screen'), ', then ', h('b', 'Add'), '.'),
      S('Open ', h('b', 'Scientia'), ' from the Home Screen — and pair it there: the Home Screen app keeps its own storage, separate from Safari.'));
    if (pf === 'android') return h('ol.ins-steps', S('In Chrome tap ', h('b', '⋮'), ' → ', h('b', 'Install app'), ' (or ', h('b', 'Add to Home screen'), ').'), S('Open ', h('b', 'Scientia'), ' from its icon.'));
    return h('ol.ins-steps', S('In Edge or Chrome, click the ', h('b', 'install icon'), ' at the right of the address bar (or ⋯ → ', h('b', 'Apps → Install this site as an app'), ').'), S('Open ', h('b', 'Scientia'), ' from the Start menu, the taskbar or the desktop.'));
  },
  howTo() { modal({ title: 'Install Scientia on this device', body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'Installed, it opens from its own icon, full screen, and works with your computer off — changes wait here and sync when the computer is back.'), INSTALL.steps()) }); },
  /** The card in Settings → Devices (and More on the phone). */
  card() {
    const el = h('div.ins-card'), draw = () => { const done = INSTALL.standalone();
      el.replaceChildren(h('b.h', done ? '✓ Installed — you are in the app' : 'Install it on this device'),
        h('p.tiny', done ? 'It opens from its icon and works with the computer off; changes wait here and go to the computer when it can be reached.' : 'Opens from its own icon, full screen, and works with the computer off.'),
        done ? null : INSTALL.prompt ? h('button.btn.sm.pri', { on: { click: () => INSTALL.install() } }, 'Install') : INSTALL.steps()); };
    draw(); el._draw = draw; return el;
  },
  paint() { $$('.ins-card').forEach(c => c._draw && c._draw()); INSTALL.banner(); },
  /** A slim banner on a paired device opened in the browser rather than the installed app. */
  banner() {
    const old = $('#insbanner'); const until = +(_ls.get('insLater', 0) || 0);
    const want = typeof SYNC !== 'undefined' && SYNC.on && !SYNC.local && !INSTALL.standalone() && Date.now() > until && window.isSecureContext;
    if (!want) { old && old.remove(); return; } if (old) return;
    const ios = INSTALL.platform() === 'ios';
    const b = h('div#insbanner', h('span', { style: { flex: '1 1 auto' } }, h('b', 'Install Scientia'), ios ? ' — Share → Add to Home Screen. It opens from its icon and works with the computer off (pair it again inside the installed app).' : ' — opens from its icon and works with the computer off.'),
      INSTALL.prompt ? h('button.btn.xs.pri', { on: { click: () => INSTALL.install() } }, 'Install') : h('button.btn.xs', { on: { click: () => INSTALL.howTo() } }, 'How'),
      h('button.btn.xs.ghost', { title: 'Not now (asks again in two weeks)', on: { click: () => { _ls.set('insLater', Date.now() + 14 * 864e5); b.remove(); } } }, '×'));
    document.body.append(b);
  },
  /** One-time full sync on a device: send what's waiting, then load everything from the computer. */
  full() {
    pickModal('Full sync with the computer?', 'Sends the changes waiting on this device, then loads the whole notebook again from the computer (it replaces what this device shows; files kept only here stay). The app reloads when it is done. The computer must be reachable.', [
      { label: 'Full sync now', run: async () => { const hi = await SYNC.hello(); if (!hi) return toast('Can’t reach your computer right now — try again when it’s on'); toast('Full sync — sending, then loading everything…', 4000); SYNC.online = true; await SYNC.reset(); } }]);
  },
};
{
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL.prompt = e; INSTALL.paint(); });
  window.addEventListener('appinstalled', () => { INSTALL.prompt = null; INSTALL.paint(); });
  setTimeout(() => { try { INSTALL.banner(); } catch { } }, 3000);
  // Settings → Devices on a device: the install card and Full sync
  const st = DEVICES.settings; DEVICES.settings = function () { const el = st.call(DEVICES); if (typeof SYNC === 'undefined' || SYNC.local || !SYNC.on) return el;
    el.append(INSTALL.card(), h('div.row', { style: { gap: '8px', marginTop: '8px', alignItems: 'center' } }, h('button.btn.sm', { title: 'Send what is waiting, then load everything from the computer', on: { click: () => INSTALL.full() } }, '⟳ Full sync'), h('span.tiny.muted', 'Once, when this device seems out of step.')));
    return el; };
  // on the computer: the same card explains installing on the other devices (step 3 already has the QR code)
  // the pairing screen: on an iPad/iPhone in Safari, install first — the Home Screen app has its own storage
  const sc = DEVICES.screen; DEVICES.screen = function (kind) { sc.call(DEVICES, kind); if (kind === 'unreachable' || kind === 'nonotebook') return;
    if (INSTALL.platform() === 'ios' && !INSTALL.standalone()) { const card = $('.dv-card'); if (card) card.prepend(h('div.ins-card.first', h('b.h', 'First, install it'), h('p.tiny', 'On the iPad and iPhone the Home Screen app keeps its own storage: install it, open it from the Home Screen, and pair there.'), INSTALL.steps())); }
    else if (!INSTALL.standalone()) { const card = $('.dv-card'); if (card) card.append(INSTALL.card()); } };
}
