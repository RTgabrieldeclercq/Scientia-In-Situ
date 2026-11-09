/* ==========================================================================
   20b · The notebook's lock — this repository's own (access.py; the lab's
   scientia/ has none). A locked notebook opens only for the people in its
   access list, each with their own username and password, and serve.py keeps its
   folder encrypted. Whoever locks it is its administrator, the only one who
   lets people in or out; the others only use it. Here: Settings → Access
   (making the lock, people, passwords, the recovery key, Lock now; for the
   others, signing out and their own password); the sign-in that comes back when
   the computer locks the notebook or a session ends (a request answered 423
   waits for it, then goes again); the password a paired device asks before
   it opens offline; and no plain copies of a locked notebook (the Markdown
   mirror, snapshots to a folder).
   ========================================================================== */
const ACCESS = {
  st: null, _ask: null,
  async status(folder) {
    try { const j = await (await fetch('api/access/status' + (folder ? '?folder=' + encodeURIComponent(folder) : ''), { cache: 'no-store' })).json(); if (!folder) ACCESS.st = j; return j; }
    catch { return null; }
  },
  locked: () => !!(ACCESS.st && ACCESS.st.lock),
  async post(path, body) {
    try { return await (await fetch('api/access/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })).json(); }
    catch { return { ok: false, error: 'Can’t reach your computer' }; }
  },

  /* ---------- signing in ---------- */
  b64: u8 => btoa(String.fromCharCode(...u8)),
  async verifier(pw, salt, it) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    return ACCESS.b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, k, 256)));
  },
  /** On a phone or tablet: what lets it check the password while the computer can't be reached (signin.html stores the same). */
  async remember(id, pw) {
    if (SYNC.local || !window.isSecureContext || !window.crypto || !crypto.subtle) return;
    const salt = crypto.getRandomValues(new Uint8Array(16)), it = 310000;
    _ls.set('lock', { id, salt: ACCESS.b64(salt), it, hash: await ACCESS.verifier(pw, salt, it) });
  },
  /** The sign-in card over the app. folder: a locked notebook this computer is about to switch to (it can be cancelled). */
  card({ title, text, folder }) {
    return new Promise(res => {
      const me = (ACCESS.st || {}).me || {};
      const idIn = h('input.inp', { value: me.id || _ls.get('lastId', '') || '', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
      const pwIn = h('input.inp', { type: 'password', autocomplete: 'current-password' }), msg = h('p.dv-msg');
      const done = ok => { ov.remove(); res(ok); };
      const go = async () => {
        msg.textContent = 'Opening…'; const j = await ACCESS.post('signin', { id: idIn.value, password: pwIn.value, folder });
        if (!j.ok) { msg.textContent = j.error || 'Not signed in'; pwIn.select(); return; }
        _ls.set('lastId', j.me.id); try { await ACCESS.remember(j.me.id, pwIn.value); } catch { }
        await ACCESS.status(); done(true);
      };
      [idIn, pwIn].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
      const ov = h('div.ovl.ac-ovl', h('div.dv-card', h('div.dv-logo', 'SiS'), h('h2', title), h('p', text),
        h('label.f', h('span', 'Username'), idIn), h('label.f', h('span', 'Password'), pwIn), h('button.btn.pri', { on: { click: go } }, 'Sign in'),
        folder ? h('button.btn.ghost', { on: { click: () => done(false) } }, 'Cancel') : null, msg));
      document.body.append(ov); setTimeout(() => (idIn.value ? pwIn : idIn).focus(), 30);
    });
  },
  /** The computer locked the notebook, was restarted, or this session ended: every refused request waits for this one sign-in. */
  ask() {
    return ACCESS._ask || (ACCESS._ask = ACCESS.card({ title: 'Sign in to go on', text: 'The notebook was locked or your session ended. What you were doing waits until you sign in again.' })
      .finally(() => { ACCESS._ask = null; }));
  },
  /** A paired device opening without the computer: the password of whoever last signed in here, checked on this device. */
  offline(v) {
    return new Promise(res => {
      const pwIn = h('input.inp', { type: 'password', autocomplete: 'current-password' }), msg = h('p.dv-msg');
      const go = async () => {
        msg.textContent = 'Checking…'; let ok = false;
        try { ok = await ACCESS.verifier(pwIn.value, Uint8Array.from(atob(v.salt), c => c.charCodeAt(0)), v.it) === v.hash; } catch { }
        if (!ok) { msg.textContent = 'That is not the password of ' + v.id; pwIn.select(); return; }
        scr.remove(); res();
      };
      pwIn.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      const scr = h('div.dv-screen.ac-screen', h('div.dv-card', h('div.dv-logo', 'SiS'), h('h2', 'Sign in · offline'),
        h('p', 'Your computer can’t be reached, so this device opens what it holds, with the password of ', h('b', v.id), '.'),
        h('label.f', h('span', 'Password'), pwIn), h('button.btn.pri', { on: { click: go } }, 'Open'), msg));
      document.body.append(scr); setTimeout(() => pwIn.focus(), 30);
    });
  },

  /* ---------- Settings → Access ---------- */
  settings() {
    const body = h('div.ac');
    const draw = () => { body.replaceChildren(...ACCESS.body(draw)); const j = ACCESS.st && ACCESS.st.job;   // how far the encrypting is, every second
      if (j && j.state === 'working') setTimeout(async () => { await ACCESS.status(); if (body.isConnected) draw(); }, 1000); };
    if (ACCESS.st) draw(); else { body.append(h('p.tiny.muted', 'Asking your computer…')); ACCESS.status().then(draw); }
    return h('div.ac-settings', h('div.sec-h', h('h2', 'Access'), h('span.k', 'who can open this notebook')), body, h('div.sec'));
  },
  body(draw) {
    const st = ACCESS.st;
    if (!st) return [h('p.tiny.muted', 'The app is not running from serve.py (launch.bat), so there is no lock to make here.')];
    const job = st.job, working = job && job.state === 'working';
    const jobLine = job ? h('p.tiny' + (job.state === 'error' ? '' : '.muted'), { style: job.state === 'error' ? { color: 'var(--bad)' } : null },
      working ? `${job.kind === 'unlock' ? 'Taking the lock off: opening' : 'Encrypting'} the notebook folder… ${job.done} of ${job.total} files`
        : job.state === 'error' ? 'Stopped: ' + job.error : `${job.kind === 'unlock' ? 'The folder is plain again' : 'The folder is encrypted'} · ${job.total} files${(job.notes || []).length ? ' · ' + job.notes.join(' · ') : ''}`) : null;
    if (!st.lock) {
      if (!SYNC.local) return [h('p.serif.muted', { style: { marginTop: 0 } }, 'Not locked. A lock is made on the computer that runs the app.'), jobLine];
      if (!st.notebook) return [h('p.tiny.muted', 'Choose a notebook folder first (above): the lock belongs to the folder.')];
      return [h('p.serif', { style: { marginTop: 0, fontSize: '14.5px' } }, 'Not locked: anyone who can open this app here, or copy its folders, can read the notebook. Locked, it opens only for the people you add, each with their own username and password, and its folder is encrypted, so a copy of it, or of the app, is of no use without one of those passwords.'),
        h('div.row', h('button.btn.pri', { on: { click: () => ACCESS.setupDialog() } }, st.crypto ? 'Lock this notebook…' : 'Install the encryption library, then lock…')), jobLine];
    }
    const me = st.me || {}, signout = h('button.btn.sm', { on: { click: async () => { await ACCESS.post('signout'); location.reload(); } } }, 'Sign out');
    const mine = h('button.btn.sm', { on: { click: () => ACCESS.passwordDialog() } }, 'Change my password…');
    if (!ACCESS.admin()) return [   // someone let in: they use the notebook, and decide nothing about who gets in
      h('div.callout', h('b.h', 'Locked'), 'Signed in as ', h('b', me.name || me.id || '—'), ` (${me.id || '?'}). You can open and use this notebook. Who has access, paired devices and the notebook folder are up to its administrator.`),
      h('div.row', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } }, signout, mine)];
    const people = h('div.dv-list'); ACCESS.drawPeople(people, me);
    return [
      h('div.callout', h('b.h', 'Locked'), 'Signed in as ', h('b', me.name || me.id || '—'), ` (${me.id || '?'} · administrator). Only the people below open the notebook, and only you let people in or out. The folder’s record, images and recordings are encrypted.`),
      jobLine,
      h('div.row', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
        h('button.btn.sm', { title: 'Everyone signs in again; the notebook stays closed until someone does', on: { click: async () => { await ACCESS.post('lock'); location.reload(); } } }, 'Lock now'), signout, mine),
      h('h4.dv-h', 'People'), people, h('div.row', { style: { gap: '6px', flexWrap: 'wrap' } },
        h('button.btn.sm.pri', { on: { click: () => ACCESS.addDialog(() => ACCESS.drawPeople(people, me)) } }, '+ Add a person…'),
        h('button.btn.sm', { on: { click: () => ACCESS.recoveryDialog() } }, 'New recovery key…'),
        SYNC.local ? h('button.btn.sm.ghost', { on: { click: () => ACCESS.removeDialog(draw) } }, 'Take the lock off…') : null),
      h('details.dv-more', h('summary', 'Good to know'), h('ul.tiny',
        h('li', 'The people you add open and use the notebook, nothing more: they don’t see this list, can’t add or remove anyone, pair or remove devices, switch the notebook folder, or Lock now. They can change their own password.'),
        h('li', 'Encrypted in the notebook folder: the record and its daily and kept copies (.scientia/), images/, recordings/ and their transcripts. Other files you keep there stay as they are. There is no Markdown copy for Obsidian: it would be plain text.'),
        h('li', 'Each time the app starts on this computer, someone signs in to open the notebook. A sign-in lasts 14 days on a browser, unless they sign out, you remove them or give them a new password, or you press Lock now.'),
        h('li', 'Phones and tablets sign in as well, after you pair them here (Devices). Opened offline, they ask the password of whoever signed in there last.'),
        h('li', 'Removing someone stops them signing in. A copy of the folder they took while they had access still opens with their old password.'),
        h('li', 'Without a password or the recovery key, nobody can open the notebook. Keep the recovery key away from this computer: with it, a new password can be set for any username, yours included.'),
        h('li', 'This browser keeps its own working copy (its storage on this computer, not part of the folder), which is not encrypted.')))];
  },
  admin: () => (((ACCESS.st || {}).me) || {}).role === 'admin',
  async drawPeople(box, me) {
    let ps = []; try { ps = (await (await fetch('api/access/people', { cache: 'no-store' })).json()).people || []; } catch { }
    const redraw = () => ACCESS.drawPeople(box, me);
    box.replaceChildren(...ps.map(p => h('div.dv-dev', h('span', h('b', p.name), h('span.muted.tiny', ` · ${p.id} · ${p.role === 'admin' ? 'administrator' : 'can use the notebook'} · added ${fmtDay(p.created)}`)), h('span.spacer'),
      p.role === 'admin' ? h('span.tiny.muted', p.id === me.id ? 'you' : '') : [
        h('button.btn.xs', { on: { click: () => ACCESS.resetDialog(p, redraw) } }, 'New password…'),
        h('button.btn.xs.danger', { on: { click: () => pickModal('Remove ' + p.name + '?', 'They can no longer sign in, here or on a device, and are signed out now. A copy of the folder they took while they had access still opens with their old password.', [{ label: 'Remove ' + p.name, danger: true, run: async () => { const j = await ACCESS.post('people/remove', { id: p.id }); if (!j.ok) toast(j.error); redraw(); } }]) } }, 'Remove')])));
  },
  fields(spec) {
    const f = {}, els = spec.map(([k, label, type, ac]) => { const i = h('input.inp', { type: type || 'text', autocomplete: ac || 'off', autocapitalize: 'none', spellcheck: 'false', on: { input: e => f[k] = e.target.value } }); return h('label.f', h('span', label), i); });
    return { f, els };
  },
  setupDialog() {
    if (!(ACCESS.st || {}).crypto) return ACCESS.install();
    const { f, els } = ACCESS.fields([['id', 'Your username (what you sign in with)', 'text', 'username'], ['name', 'Your name'], ['pw', 'Password (8 characters or more)', 'password', 'new-password'], ['pw2', 'Password again', 'password', 'new-password']]);
    modal({ title: 'Lock this notebook', wide: true, body: h('div',
      h('p.serif', { style: { marginTop: 0 } }, 'You become its administrator: the only one who lets people in or out. The people you add get a username and password to open and use the notebook, nothing more.'),
      h('ul.tiny', h('li', 'The record and its copies, images/, recordings/ and their transcripts are encrypted in place. Each file is checked before it replaces the plain one.'),
        h('li', 'The Markdown copy for Obsidian is removed and no longer written: it is plain text.'),
        h('li', 'Images, recordings and kept copies the app still holds in its own folder move into the notebook, encrypted.'),
        h('li', 'Snapshots to a folder (Storage, below) stop: they would be plain text. The notebook folder keeps encrypted daily copies.'),
        h('li', h('b', 'You get a recovery key once. '), 'Without a password or that key, nobody can open the notebook again.')),
      h('div.grid2', els)),
      actions: [{ label: 'Cancel' }, { label: 'Lock the notebook', pri: true, run: async () => {
        if (f.pw !== f.pw2) { toast('The two passwords differ'); return false; }
        const j = await ACCESS.post('setup', { id: f.id, name: f.name, password: f.pw });
        if (!j.ok) { toast(j.error || 'Not locked', 4000); return false; }
        _ls.set('lastId', j.me.id); await ACCESS.status(); ACCESS.showCode(j.recovery, true); App.refresh(); } }] });
  },
  showCode(code, first) {
    modal({ title: 'Your recovery key', body: h('div',
      h('p.serif', { style: { marginTop: 0 } }, first ? 'The notebook is locked; its folder is being encrypted (Settings → Access shows how far). ' : '',
        'With this key, anyone can choose a new password for any username in this notebook. Without it, a forgotten password cannot be replaced. Write it down and keep it away from this computer: it is shown only now.'),
      h('div.ac-code', code), h('button.btn.sm', { on: { click: () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('Copied'); } } }, 'Copy')),
      actions: [{ label: 'I have kept it', pri: true }] });
  },
  async install() {
    const j = await ACCESS.post('install'); if (!j.ok) return toast(j.error || 'Could not start the install');
    toast('Installing the encryption library…', 4000);
    const poll = async () => { const st = await ACCESS.status(), i = (st && st.install) || {};
      if (i.state === 'installing') return setTimeout(poll, 1500);
      if (i.state === 'done' && st.crypto) { App.refresh(); return ACCESS.setupDialog(); }
      modal({ title: 'The install did not work', body: h('pre.dv-out', (i.log || []).join('\n') || 'No output'), actions: [{ label: 'OK' }] }); };
    poll();
  },
  addDialog(then) {
    const { f, els } = ACCESS.fields([['id', 'Their username (what they sign in with)'], ['name', 'Their name'], ['pw', 'A password for them (8 characters or more)', 'password', 'new-password'], ['pw2', 'Password again', 'password', 'new-password']]);
    modal({ title: 'Add a person', body: h('div', h('div.grid2', els),
      h('p.tiny.muted', 'They open and use the notebook, nothing more. Give them their username and password yourself; they can change the password once signed in.')),
      actions: [{ label: 'Cancel' }, { label: 'Add', pri: true, run: async () => {
        if (f.pw !== f.pw2) { toast('The two passwords differ'); return false; }
        const j = await ACCESS.post('people/add', { id: f.id, name: f.name, password: f.pw });
        if (!j.ok) { toast(j.error || 'Not added', 4000); return false; }
        toast((f.name || f.id) + ' can sign in now'); then(); } }] });
  },
  resetDialog(p, then) {
    const { f, els } = ACCESS.fields([['pw', 'Their new password (8 characters or more)', 'password', 'new-password'], ['pw2', 'Password again', 'password', 'new-password']]);
    modal({ title: 'New password for ' + p.name, body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'Their old password stops working, and they are signed out everywhere. Tell them the new one yourself.'), els),
      actions: [{ label: 'Cancel' }, { label: 'Set it', pri: true, run: async () => {
        if (f.pw !== f.pw2) { toast('The two passwords differ'); return false; }
        const j = await ACCESS.post('people/password', { id: p.id, password: f.pw });
        if (!j.ok) { toast(j.error || 'Not changed', 4000); return false; }
        toast('New password set for ' + p.name); then(); } }] });
  },
  passwordDialog() {
    const { f, els } = ACCESS.fields([['old', 'Current password', 'password', 'current-password'], ['pw', 'New password (8 characters or more)', 'password', 'new-password'], ['pw2', 'New password again', 'password', 'new-password']]);
    modal({ title: 'Change my password', body: h('div', els), actions: [{ label: 'Cancel' }, { label: 'Change it', pri: true, run: async () => {
      if (f.pw !== f.pw2) { toast('The two new passwords differ'); return false; }
      const j = await ACCESS.post('password', { old: f.old, password: f.pw });
      if (!j.ok) { toast(j.error || 'Not changed', 4000); return false; }
      try { await ACCESS.remember((ACCESS.st.me || {}).id, f.pw); } catch { } toast('Password changed'); } }] });
  },
  recoveryDialog() {
    const { f, els } = ACCESS.fields([['pw', 'Your password', 'password', 'current-password']]);
    modal({ title: 'New recovery key', body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'The old recovery key stops working.'), els), actions: [{ label: 'Cancel' }, { label: 'Make a new key', pri: true, run: async () => {
      const j = await ACCESS.post('recovery', { password: f.pw });
      if (!j.ok) { toast(j.error || 'No new key', 4000); return false; }
      ACCESS.showCode(j.recovery); } }] });
  },
  removeDialog(draw) {
    const { f, els } = ACCESS.fields([['pw', 'Your password', 'password', 'current-password']]);
    modal({ title: 'Take the lock off?', body: h('div', h('p.serif', { style: { marginTop: 0 } }, 'Every file in the notebook folder is turned back into plain text, the access list goes (a copy is kept in .scientia/kept/) and everyone is signed out. The app then opens without a sign-in, and writes the Markdown copy again.'), els),
      actions: [{ label: 'Cancel' }, { label: 'Take the lock off', danger: true, run: async () => {
        const j = await ACCESS.post('remove', { password: f.pw });
        if (!j.ok) { toast(j.error || 'Not done', 4000); return false; }
        await ACCESS.status(); draw(); } }] });
  },
};

{
  // a request refused because the notebook is closed waits for the sign-in, then goes again
  const f0 = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    let r = await f0(input, init);
    if (/api\/access\//.test(String((input && input.url) || input))) return r;
    while (r.status === 423) { await ACCESS.ask(); r = await f0(input, init); }
    return r;
  };
  // on launch: what the computer says about the lock; offline, a paired device asks the password first
  const boot = DISK.boot; DISK.boot = async function () {
    const r = await boot.apply(this, arguments);
    if (r === 'offline') { const v = _ls.get('lock', null); if (v && v.hash) await ACCESS.offline(v); }
    else if (r !== 'unreachable') { await ACCESS.status(); if (ACCESS.st && !ACCESS.st.lock) _ls.set('lock', null); }
    return r;
  };
  // switching to a locked notebook folder: signed in to it first, so the app sees its record (and never takes it for an empty one)
  const connect = DISK.connect; DISK.connect = async function (path) {
    const s = path ? await ACCESS.status(path) : null;
    if (s && s.folder && s.folder.lock && !s.folder.open && !(await ACCESS.card({ title: 'This notebook is locked', text: 'Sign in to it to open it here.', folder: path }))) return;
    return connect.apply(this, arguments);
  };
  // pairing and removing devices on the computer: the administrator's (the server refuses it to anyone else)
  const ds = DEVICES.settings; DEVICES.settings = function () {
    return SYNC.local && ACCESS.locked() && !ACCESS.admin() ? h('p.tiny.muted', 'Phones and tablets are paired here by the administrator.') : ds.apply(this, arguments);
  };
  // a locked notebook makes no plain copies: no Markdown mirror, no snapshots to a folder
  const vs = VAULT.sync; VAULT.sync = function () { return ACCESS.locked() ? Promise.resolve() : vs.apply(VAULT, arguments); };
  const bs = BACKUP.snapshot; BACKUP.snapshot = function () {
    if (!ACCESS.locked()) return bs.apply(BACKUP, arguments);
    BACKUP.error = 'off: the notebook is locked, and its folder keeps encrypted daily copies'; return Promise.resolve(false);
  };
  setTimeout(() => { if (typeof SettingsView === 'undefined') return; const sr = SettingsView.render; SettingsView.render = function () { const out = sr.apply(this, arguments);
    try {
      const h2 = [...out.querySelectorAll('.sec-h h2')].find(x => x.textContent === 'Devices'), sec = h2 && h2.closest('.sec-h'); const ui = ACCESS.settings(); if (sec) sec.before(ui); else out.append(ui);
      if (ACCESS.locked()) {   // the notebook card: no Markdown, all encrypted
        const md = [...out.querySelectorAll('.nbcard dt')].find(x => x.textContent === 'Markdown'); if (md && md.nextSibling) md.nextSibling.textContent = 'none: a locked notebook keeps no plain copy';
        const w = document.createTreeWalker(out.querySelector('.nbcard') || out, NodeFilter.SHOW_TEXT);
        for (let t; (t = w.nextNode());) if (t.data.includes('one Markdown file per component for Obsidian')) { t.data = ', all of it encrypted (the notebook is locked: there is no Markdown copy). Launch any copy of the app, sign in, and it reloads from here.'; break; }
        const ob = [...out.querySelectorAll('.nbcard a.btn')].find(a => a.textContent === 'Open in Obsidian'); if (ob) ob.remove();
      }
      if (ACCESS.locked() && !ACCESS.admin()) {   // which folder the notebook is: the administrator's (the server refuses it too)
        const row = out.querySelector('.nbcard input.inp'); if (row && row.closest('.row')) row.closest('.row').replaceWith(h('p.tiny.muted', 'Only the administrator changes the notebook folder.'));
        const rec = [...out.querySelectorAll('.nbcard div.tiny.muted')].find(x => x.textContent.startsWith('Recent: ')); if (rec) rec.remove();
      }
    } catch (e) { console.warn('[access]', e); }
    return out; }; }, 0);
}
