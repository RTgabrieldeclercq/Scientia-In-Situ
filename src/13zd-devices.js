/* ==========================================================================
   13zd · Devices: pairing a phone or tablet with this computer, and the
   instructions to get there (Settings → Devices). A new device opens the
   app's address, enters the 6-digit code shown here (or scans the QR code,
   which carries it), and waits until you approve it on this computer.
   ========================================================================== */
const DEVICES = {
  _net: null, _code: null, _poll: null,
  qr(text, px = 4) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), m = 4, size = (n + m * 2) * px; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + m) * px},${(r + m) * px}h${px}v${px}h-${px}z`;
      const el = h('div.dv-qr'); el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; return el; } catch { return null; } },
  addresses() { const n = DEVICES._net || {}, ts = n.tailscale || {}, out = [];
    if (ts.dns && ts.serving) out.push({ kind: 'tailscale', url: `https://${ts.dns}/scientia.html`, note: 'Anywhere, through Tailscale · works offline once added to the Home Screen' });
    else if (ts.dns) out.push({ kind: 'tailscale-off', url: `https://${ts.dns}/scientia.html`, note: 'Turn on Tailscale access first (step 2)' });
    (n.lan || []).forEach(ip => out.push({ kind: 'lan', url: `http://${ip}:${n.port}/scientia.html`, note: 'Same Wi-Fi only · needs a connection to open' }));
    return out; },
  async refreshNet(box) { try { DEVICES._net = await (await fetch('api/net', { cache: 'no-store' })).json(); } catch { DEVICES._net = null; } box && box.replaceWith(DEVICES.settings()); },
  async newCode() { const j = await (await fetch('api/pair/new', { method: 'POST' })).json(); DEVICES._code = { code: j.code, until: Date.now() + j.expires * 1000 }; App.refresh(); },
  async pending() { try { return (await (await fetch('api/pair/pending', { cache: 'no-store' })).json()).pending || []; } catch { return []; } },
  async devices() { try { return (await (await fetch('api/devices', { cache: 'no-store' })).json()).devices || []; } catch { return []; } },
  /** The Settings section. */
  settings() {
    const wrap = h('div.dv');
    if (!SYNC.local) {
      wrap.append(h('div.callout', h('b.h', SYNC.name()), SYNC.on ? (SYNC.online === false ? `Paired · can’t reach your computer right now — ${plural(SYNC.outbox.size, 'change')} waiting here, sent when it’s back.` : 'Paired with your computer · changes go both ways within a second or two.') : 'Not syncing.'),
        h('div.row', { style: { marginTop: '8px', gap: '8px' } }, SYNC.conflicts ? h('button.btn.sm.pri', { on: { click: () => SYNC.conflictsDialog() } }, `Decide ${plural(SYNC.conflicts, 'conflict')}…`) : null,
          h('button.btn.sm', { on: { click: () => MOBILE.toggle() } }, MOBILE.on ? 'Use the full app layout' : 'Use the phone layout')));
      return wrap;
    }
    if (!DISK.on) { wrap.append(h('p.tiny.muted', 'Choose a notebook folder first (above): other devices sync with the notebook this computer holds.')); return wrap; }
    if (!DEVICES._net) { wrap.append(h('p.tiny.muted', 'Looking at how this computer can be reached…')); setTimeout(() => DEVICES.refreshNet(wrap), 0); return wrap; }
    const ts = DEVICES._net.tailscale || {}, addrs = DEVICES.addresses(), best = addrs.find(a => a.kind === 'tailscale') || addrs.find(a => a.kind === 'lan');
    const code = DEVICES._code && DEVICES._code.until > Date.now() ? DEVICES._code.code : null;
    const step = (n, title, ...body) => h('li.dv-step', h('span.dv-n', n), h('div', h('b', title), ...body));
    const pend = h('div.dv-pend'), list = h('div.dv-list');
    const drawPend = async () => { const p = await DEVICES.pending(); if (!pend.isConnected && DEVICES._poll) { clearInterval(DEVICES._poll); DEVICES._poll = null; return; }
      pend.replaceChildren(...p.map(r => h('div.dv-req', h('span', '📱 ', h('b', r.name), h('span.muted.tiny', ' wants to join · ' + fmtWhen(r.ts))), h('span.spacer'),
        h('button.btn.sm.pri', { on: { click: async () => { await fetch('api/pair/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ req: r.req, ok: true }) }); toast(r.name + ' approved'); drawPend(); setTimeout(drawList, 2500); } } }, 'Approve'),
        h('button.btn.sm', { on: { click: async () => { await fetch('api/pair/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ req: r.req, ok: false }) }); drawPend(); } } }, 'Deny')))); };
    const drawList = async () => { const ds = await DEVICES.devices();
      list.replaceChildren(...(ds.length ? ds.map(d => h('div.dv-dev', h('span', h('b', d.name), h('span.muted.tiny', ' · paired ' + fmtDay(d.created) + ' · last seen ' + fmtWhen(d.lastSeen))), h('span.spacer'),
        h('button.btn.xs', { on: { click: async () => { const v = await askText('Rename device', 'Name', d.name); if (v) { await fetch('api/devices/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, name: v }) }); drawList(); } } } }, 'Rename'),
        h('button.btn.xs.danger', { on: { click: () => pickModal('Remove ' + d.name + '?', 'It stops syncing at once. What it holds stays on it; pair it again to resume.', [{ label: 'Remove this device', danger: true, run: async () => { await fetch('api/devices/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id }) }); drawList(); } }]) } }, 'Remove'))) : [h('p.tiny.muted', 'No other devices yet.')])); };
    drawPend(); drawList(); if (!DEVICES._poll) DEVICES._poll = setInterval(drawPend, 2500);
    const pairUrl = best ? best.url + '#pair=' + (code || '') : null;
    wrap.append(
      h('div.callout', h('b.h', 'Sync'), SYNC.on ? `On · this computer holds the record; ${SYNC.conflicts ? plural(SYNC.conflicts, 'conflict') + ' to decide · ' : ''}paired phones and tablets change it from anywhere and see each other’s changes within seconds. Keep the app’s window (launch.bat) open on this computer.` : 'Starts when the app runs from serve.py with a notebook folder.'),
      h('h4.dv-h', 'Add a phone or tablet'),
      h('ol.dv-steps',
        step(1, 'Install Tailscale on this computer and on the device', h('p', 'Free, from ', h('a', { href: 'https://tailscale.com/download', target: '_blank', rel: 'noopener' }, 'tailscale.com/download'), ' (App Store / Play Store on the device). Sign in on both with the same account. It links your own devices privately — nothing opens to the internet.'),
          h('p.tiny.muted', ts.installed ? (ts.running ? `✓ Tailscale is running here as ${ts.dns || '—'}` : '✓ Installed here, but not signed in / not running') : '✗ Not found on this computer yet'), h('button.btn.xs', { on: { click: () => { DEVICES._net = null; App.refresh(); } } }, 'Check again')),
        step(2, 'Let your devices reach the app through Tailscale', h('p', 'This runs ', h('code', `tailscale serve --bg ${DEVICES._net.port}`), ' on this computer, which gives the app a private https address on your Tailscale network. The first time, Tailscale may show a link to switch on HTTPS for your network — open it, approve, and press the button again.'),
          h('div.row', { style: { gap: '8px' } }, ts.serving ? h('span.pill.ok', '✓ On') : h('button.btn.sm.pri', { disabled: !ts.running, on: { click: async e => { e.target.disabled = true; e.target.textContent = 'Working…'; const j = await (await fetch('api/tailscale/serve', { method: 'POST' })).json(); modal({ title: j.ok ? 'Tailscale access is on' : 'Tailscale says', body: h('pre.dv-out', j.out || (j.ok ? 'Done' : 'No output')), actions: [{ label: 'OK', run: () => { DEVICES._net = null; App.refresh(); } }] }); } } }, 'Turn on Tailscale access')),
          ts.serveStatus && ts.serving ? h('pre.dv-out.tiny', ts.serveStatus) : null),
        step(3, 'Open the app on the device', h('p', 'Scan the code below with the device’s camera, or type the address into its browser:'),
          h('div.dv-addrs', addrs.length ? addrs.map(a => h('div.dv-addr' + (a === best ? '.best' : ''), h('code', a.url), h('span.tiny.muted', a.note))) : h('p.tiny.muted', 'No address found — is this computer on a network?')),
          h('p.tiny', h('b', 'iPhone / iPad: '), 'in Safari tap Share → ', h('b', 'Add to Home Screen'), ', then open it from the Home Screen and pair there (the Home Screen app keeps its own storage). ', h('b', 'Android: '), 'in Chrome tap ⋮ → ', h('b', 'Install app'), ' (or Add to Home screen).')),
        step(4, 'Pair it', h('p', 'The device asks for a code. Make one here — it is valid for 15 minutes — then approve the device when it appears below.'),
          h('div.dv-pair', code ? [pairUrl ? DEVICES.qr(pairUrl) : null, h('div', h('div.dv-code', code.slice(0, 3) + ' ' + code.slice(3)), h('p.tiny.muted', 'Valid until ' + fmtTime(new Date(DEVICES._code.until))), h('button.btn.xs', { on: { click: () => DEVICES.newCode() } }, 'New code'))]
            : h('button.btn.sm.pri', { on: { click: () => DEVICES.newCode() } }, 'Make a pairing code')), pend)),
      h('h4.dv-h', 'Paired devices'), list,
      h('details.dv-more', h('summary', 'Good to know'),
        h('ul.tiny',
          h('li', 'The computer is the hub: it must be on, with the app’s window open, for devices to sync. A device that can’t reach it keeps working (when opened from its Home Screen over the Tailscale address) and sends its changes when it can.'),
          h('li', 'Same Wi-Fi instead of Tailscale: the http://192.168… address works at home, but the device then needs the connection to open the app, and Windows may ask to let Python through the firewall (allow Private networks).'),
          h('li', 'When two devices change the same thing before seeing each other’s change, what can merge merges; the rest waits for you under the ⚠ in the header.'),
          h('li', 'Markdown files in the notebook are written by this computer, so changes from a phone appear there while the app is open here.'),
          h('li', 'Removing a device stops it syncing at once; the record stays on this computer.'))));
    return wrap;
  },

  /* ---------- on a device that isn't paired yet ---------- */
  screen(kind) {
    document.body.classList.add('pairing'); const app = $('#app');
    const m = /#pair=(\d{6})/.exec(location.hash), codeIn = h('input.inp.dv-ci', { inputmode: 'numeric', maxlength: 7, placeholder: '123 456', value: m ? m[1] : '' }), nameIn = h('input.inp', { value: DEVICES.guessName(), maxlength: 40 });
    const msg = h('p.dv-msg'), card = h('div.dv-card');
    if (kind === 'unreachable') card.append(h('h2', 'Can’t reach your computer'), h('p', 'This device has nothing saved yet, so it needs your computer once: make sure it is on with the app’s window open, and that Tailscale is connected on both.'), h('button.btn.pri', { on: { click: () => location.reload() } }, 'Try again'));
    else if (kind === 'nonotebook') card.append(h('h2', 'No notebook yet'), h('p', 'On your computer, choose a notebook folder in Settings → Notebook folder, then try again.'), h('button.btn.pri', { on: { click: () => location.reload() } }, 'Try again'));
    else {
      const go = async () => { msg.textContent = 'Asking…'; let j; try { j = await (await fetch('api/pair/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codeIn.value.replace(/\D/g, ''), name: nameIn.value.trim() || 'Device' }) })).json(); } catch { msg.textContent = 'Can’t reach your computer.'; return; }
        if (!j.ok) { msg.textContent = j.error; return; }
        msg.replaceChildren('Now approve “', h('b', nameIn.value.trim() || 'Device'), '” on your computer (Settings → Devices). Waiting…');
        const poll = async () => { try { const s = await (await fetch('api/pair/status?req=' + j.req, { cache: 'no-store' })).json();
            if (s.state === 'approved') { msg.textContent = 'Paired — loading your notebook…'; history.replaceState(null, '', location.pathname); setTimeout(() => location.reload(), 400); return; }
            if (s.state === 'denied') { msg.textContent = 'The computer said no. Make a new code there to try again.'; return; } } catch { }
          setTimeout(poll, 2000); };
        poll(); };
      card.append(h('div.dv-logo', 'SiS'), h('h2', 'Pair with your computer'), h('p', 'On the computer: Settings → Devices → ', h('b', 'Make a pairing code'), '. Enter it here, then approve this device there.'),
        h('label.f', h('span', 'Code'), codeIn), h('label.f', h('span', 'Name this device'), nameIn), h('button.btn.pri', { on: { click: go } }, 'Ask to join'), msg);
      codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
    app.replaceChildren(h('div.dv-screen', card));
  },
  guessName() { const u = navigator.userAgent; return /iPad/.test(u) ? 'iPad' : /iPhone/.test(u) ? 'iPhone' : /Android/.test(u) ? (/Mobile/.test(u) ? 'Android phone' : 'Android tablet') : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows PC' : 'Device'; },
};
