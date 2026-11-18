// Records a feature's demonstration: the app in headless Chrome, a test note made for it, the feature used with a real
// pointer and keyboard, the screen recorded to a small video that the feature's page in Settings shows (FEAT.demo, V4.12).
//
//   node scientia/demokit/record.mjs <feature id> [--shots] [--lab] [--keep]
//
// Reads   scientia/demokit/<id>.mjs      the script: what it is for (in the words of whoever asked for it), the test note, the steps
// Writes  scientia/demos/<id>.mp4        the recording (H.264, no sound)
//         scientia/demos/<id>.jpg        its still
//         scientia/src/20b-demos.js      the feature's entry: FEAT.demo('<id>', { use, by, video, steps: [[seconds, caption]…] })
// Then:   python scripts/scientia_build.py   (in the standalone repository: python build.py)
//
// Needs Node 22+, Chrome (SIS_CHROME) and ffmpeg (SIS_FFMPEG, or on the PATH). Nothing here touches a real notebook: Chrome
// starts on an empty profile, the app is served as files, and what the script makes lives in that profile until Chrome closes.
//   --shots   also a PNG at the start of each step, in demokit/out/ (git-ignored), to check the script before keeping a take
//   --lab     record the build as the lab's desktop runs it (with the lab layer); the default is the app on its own
//   --keep    keep the frames (demokit/out/<id>-frames/)
//   --no-entry / --entry-only   for all.mjs, which records several at once and writes their entries one at a time
// Before a script's setup the page gets demokit/kit.js (KIT: helpers for making test notes). demokit/assets/ holds made-up
// papers, a report page and micrographs (assets/make.py). At most SIS_DEMO_SLOTS (5) takes run at once on a computer.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KIT = path.dirname(fileURLToPath(import.meta.url)), APP = path.dirname(KIT);
const argv = process.argv.slice(2), id = argv.find(a => !a.startsWith('--')), flag = f => argv.includes('--' + f);
if (!id) { console.log('node scientia/demokit/record.mjs <feature id> [--shots] [--lab] [--keep]'); process.exit(2); }
const scriptFile = path.join(KIT, id + '.mjs');
if (!existsSync(scriptFile)) { console.log('no script: ' + scriptFile + ' (copy demokit/floats.mjs and describe the feature’s use)'); process.exit(2); }
const D = (await import(pathToFileURL(scriptFile).href)).default;
if (!D || !D.use || !Array.isArray(D.steps) || !D.steps.length) { console.log(id + '.mjs must export default { use, by, setup, steps }'); process.exit(2); }
const [VW, VH] = D.view || [960, 600], DPR = D.dpr || 1.5, FPS = D.fps || 15;
const FFMPEG = process.env.SIS_FFMPEG || 'ffmpeg', CHROME = process.env.SIS_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms)), J = JSON.stringify;

/** Put a feature's entry into src/20b-demos.js, in place of the one it had. */
function putEntry(entry) {
  const reg = path.join(APP, 'src', '20b-demos.js');
  let src = existsSync(reg) ? readFileSync(reg, 'utf8') : '';
  const block = new RegExp('/\\* demo:' + id + ' \\*/[\\s\\S]*?/\\* /demo:' + id + ' \\*/');
  src = block.test(src) ? src.replace(block, () => entry) : src.replace(/\s*$/, '\n') + entry + '\n';
  writeFileSync(reg, src.replace(/\r\n/g, '\n'));
}
if (flag('entry-only')) {   // after `--no-entry` takes (all.mjs): the entry a take left in demokit/out/
  const f = path.join(KIT, 'out', id + '.entry.js'); if (!existsSync(f)) { console.log('no entry kept for ' + id); process.exit(1); }
  putEntry(readFileSync(f, 'utf8')); process.exit(0);
}

/* ---------- the app, served as files (the lab's desktop build without its lab layer, unless --lab) ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };
if (!existsSync(path.join(APP, 'scientia.html'))) { console.log('no scientia.html in ' + APP + ' — build the app first'); process.exit(2); }
let pyPort = 0, py = null, nbDir = null, offline = false;   // the app's own server, for scripts with `server: true` (below)
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'scientia.html', file = path.resolve(APP, rel);
  if (pyPort && /^(api|images|recordings)\//.test(rel)) {   // what the app asks its computer for goes to the real server; the page itself is still served here
    if (offline) { req.destroy(); res.destroy(); return; }   // R.server.offline(true): the computer out of reach
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const headers = Object.assign({}, req.headers); for (const k of ['host', 'connection', 'content-length']) delete headers[k];
      const r = await fetch('http://127.0.0.1:' + pyPort + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks), redirect: 'manual' });
      const h = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(k)) h[k] = v; });
      if (offline) { res.destroy(); return; }
      res.writeHead(r.status, h).end(Buffer.from(await r.arrayBuffer()));
    } catch { try { res.writeHead(502).end(); } catch { } }
    return;
  }
  if (!file.startsWith(path.resolve(APP))) { res.writeHead(403).end(); return; }
  try {
    let body = await readFile(file);
    if (rel === 'scientia.html' && !flag('lab')) body = Buffer.from(body.toString('utf8').replace(/<!--sis-desktop-->[\s\S]*?<!--\/sis-desktop-->\n?/g, ''), 'utf8');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

/* ---------- the app's own server (serve.py), for the features that need the computer: web capture, recordings, handwriting, sync.
   It runs on a spare port with its own settings file and an EMPTY notebook folder in the temp directory — never the person's
   settings (SIS_CONFIG is always set) or notebook. Both are deleted when the take ends. ---------- */
if (D.server) {
  nbDir = await mkdtemp(path.join(tmpdir(), 'sis-demo-nb-')); mkdirSync(path.join(nbDir, 'notebook'));
  const port = 8900 + Math.floor(Math.random() * 90);
  py = spawn(process.env.SIS_PYTHON || 'python', [path.join(APP, 'serve.py')], { cwd: APP, stdio: 'ignore', env: Object.assign({}, process.env, { SIS_PORT: String(port), SIS_CONFIG: path.join(nbDir, 'config.json'), SIS_NOBROWSER: '1' }) });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch('http://127.0.0.1:' + port + '/api/ping')).ok; } catch { } if (!up) await sleep(250); }
  if (!up) { console.log('record: serve.py did not start on port ' + port); try { py.kill(); } catch { } process.exit(1); }
  const r = await fetch('http://127.0.0.1:' + port + '/api/notebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: J({ path: path.join(nbDir, 'notebook') }) });
  if (!r.ok) { console.log('record: the temporary notebook folder was refused: ' + (await r.text()).slice(0, 200)); try { py.kill(); } catch { } process.exit(1); }
  pyPort = port;
}

/* ---------- one of a few slots, so several takes at once do not starve each other of the processor ---------- */
const SLOTS = +(process.env.SIS_DEMO_SLOTS || 5), slotDir = path.join(tmpdir(), 'sis-demo-slots');
let slot = null;
mkdirSync(slotDir, { recursive: true });
for (let waited = 0; !slot; waited++) {
  for (const f of readdirSync(slotDir)) { try { if (Date.now() - statSync(path.join(slotDir, f)).mtimeMs > 8 * 60000) rmSync(path.join(slotDir, f), { recursive: true, force: true }); } catch { } }   // a take that died
  for (let i = 0; i < SLOTS && !slot; i++) { try { mkdirSync(path.join(slotDir, 'slot-' + i)); slot = path.join(slotDir, 'slot-' + i); } catch { } }
  if (!slot) { if (waited === 0) console.log('  waiting for a free slot (' + SLOTS + ' takes at once)…'); await sleep(1500 + Math.random() * 1000); }
}

/* ---------- Chrome, over its debugging connection ---------- */
const port = String(9300 + Math.floor(Math.random() * 600)), profile = await mkdtemp(path.join(tmpdir(), 'sis-demo-'));
const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required',
  '--disable-features=IsolateSandboxedIframes', '--force-device-scale-factor=' + DPR, '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=' + VW + ',' + VH, ...(D.chrome || []).map(a => a.replace('{kit}', KIT.split(path.sep).join('/'))), 'about:blank'], { stdio: 'ignore' });
const frames = path.join(KIT, 'out', id + '-frames'); await rm(frames, { recursive: true, force: true }); await mkdir(frames, { recursive: true });
let code = 1, ws = null;
const done = async () => { try { slot && rmSync(slot, { recursive: true, force: true }); } catch { } try { py && py.kill(); } catch { } if (nbDir) { await sleep(600); await rm(nbDir, { recursive: true, force: true }).catch(() => { }); } try { ws && ws.close(); } catch { } try { chrome.kill(); } catch { } server.close(); await sleep(400); await rm(profile, { recursive: true, force: true }).catch(() => { }); if (!flag('keep')) await rm(frames, { recursive: true, force: true }).catch(() => { }); process.exit(code); };
const watchdog = setTimeout(() => { console.log('record: no end after 6 minutes — stopped'); done(); }, 360000);
try {
  let targets = [];
  for (let i = 0; i < 200 && !targets.length; i++) { try { targets = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).filter(t => t.type === 'page'); } catch { } if (!targets.length) await sleep(200); }
  if (!targets.length) throw new Error('Chrome did not open its debugging port (SIS_CHROME=' + CHROME + ')');
  ws = new WebSocket(targets[0].webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r));
  let seq = 0; const pend = new Map(), errs = [], shots = [];   // shots: the screencast, { t, file }
  let casting = false, nFrame = 0, cutMs = 0, capOff = null, resumeAt = 0, chooser = null; const clock = () => Date.now() - cutMs;   // cutMs: waits cut out of the take (R.cut)
  let _c = null;   // chooser: { files, done } while a step waits for the app to ask for files
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || '').slice(0, 400));
    if (d.method === 'Page.fileChooserOpened' && chooser) { const c = chooser; chooser = null; send('DOM.setFileInputFiles', { files: c.files, backendNodeId: d.params.backendNodeId }).then(() => c.done(true)); }
    if (d.method === 'Page.screencastFrame') {
      send('Page.screencastFrameAck', { sessionId: d.params.sessionId });
      if (!casting) return;
      // timed by when Chrome captured the frame, not by when it arrived: on a busy computer frames arrive in bursts, and a burst
      // written with arrival times made the video longer than the take (each zero-length frame got ffmpeg's default length)
      // (Chrome's timestamp is the computer's own clock, in seconds: the same clock the captions' times are taken from)
      const ts = d.params.metadata && d.params.metadata.timestamp, cap = ts > 1e9 ? ts * 1000 : Date.now();
      if (capOff == null) capOff = 0;
      if (cap + capOff < resumeAt) return;   // captured during a cut
      const file = path.join(frames, 'f' + String(++nFrame).padStart(5, '0') + '.jpg'); writeFileSync(file, Buffer.from(d.params.data, 'base64')); shots.push({ t: cap + capOff - cutMs, file });
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++seq; pend.set(i, r); ws.send(J({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true, userGesture: true }); const ex = r.result?.exceptionDetails; if (ex) throw new Error('in the page: ' + (ex.exception?.description || ex.text)); return r.result?.result?.value; };
  const until = async (expr, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await ev('return ' + expr).catch(() => null); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(100); } };
  await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  await send('Browser.grantPermissions', { origin: base.replace(/\/$/, ''), permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(() => { });
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: D.theme === 'dark' ? 'dark' : 'light' }] });
  // Headless Chrome has no full screen. A script that sets `fullscreen: true` gets the browser's full-screen calls answered as if the
  // window were the screen (which, in the recording, it is), so the app's own full-screen behaviour runs: the frame, the edge pan.
  if (D.fullscreen) await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let fs = null; const fire = () => setTimeout(() => document.dispatchEvent(new Event('fullscreenchange')), 0);
    Object.defineProperty(Document.prototype, 'fullscreenElement', { get: () => fs, configurable: true }); Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => true, configurable: true });
    Element.prototype.requestFullscreen = function () { fs = this; document.documentElement.classList.add('rec-fullscreen'); fire(); return Promise.resolve(); };
    Document.prototype.exitFullscreen = function () { fs = null; document.documentElement.classList.remove('rec-fullscreen'); fire(); return Promise.resolve(); }; })()` });
  await send('Page.navigate', { url: base + 'scientia.html' });
  if (!await until('window.__ready === true', 40000)) throw new Error('the app did not start');
  await ev(`saveSettings({ theme: ${J(D.theme === 'dark' ? 'dark' : 'light')}, hintOff: true }); try { applyTheme(); } catch (e) { } return 1`);

  /* ---------- the pointer and the keys, drawn into the page so the recording shows them ---------- */
  await ev(`
    const st = document.createElement('style'); st.textContent = '#__dcur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:22px;height:22px;will-change:transform;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))}' +
      '#__dcur.dn{scale:.86}#__drip{position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid rgba(20,120,110,.85);opacity:0}' +
      '#__drip.go{animation:__drip .45s ease-out}@keyframes __drip{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.25)}}' +
      '#__dkey{position:fixed;left:14px;bottom:14px;z-index:2147483646;pointer-events:none;display:none;gap:4px;align-items:center;font:600 12px/1 system-ui,Segoe UI,sans-serif;color:#fff;background:rgba(24,28,32,.86);padding:7px 10px;border-radius:8px}' +
      '#__dkey.on{display:flex}#__dkey kbd{font:600 12px/1 system-ui,Segoe UI,sans-serif!important;color:#fff!important;border:1px solid rgba(255,255,255,.5)!important;border-radius:5px!important;padding:4px 7px!important;background:rgba(255,255,255,.14)!important}';
    document.head.append(st);
    const cur = document.createElement('div'); cur.id = '__dcur'; cur.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2 L3 17.5 L7.3 13.6 L10 19.8 L12.6 18.7 L9.9 12.6 L15.6 12.3 Z" fill="#111" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const rip = document.createElement('div'); rip.id = '__drip'; const key = document.createElement('div'); key.id = '__dkey';
    document.documentElement.append(rip, key, cur);
    const put = e => { cur.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; };
    addEventListener('mousemove', put, true); addEventListener('pointermove', put, true);
    addEventListener('mousedown', e => { put(e); cur.classList.add('dn'); rip.style.left = e.clientX + 'px'; rip.style.top = e.clientY + 'px'; rip.classList.remove('go'); void rip.offsetWidth; rip.classList.add('go'); rip.style.borderColor = e.button === 2 ? 'rgba(190,60,120,.9)' : ''; }, true);
    addEventListener('mouseup', () => cur.classList.remove('dn'), true);
    let kt = 0; const NAMES = { Control: 'Ctrl', ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' };
    addEventListener('keydown', e => { const mod = e.ctrlKey || e.altKey || e.metaKey, named = e.key.length > 1; if (!mod && !named) return; if (['Shift', 'Backspace'].includes(e.key)) return;
      const parts = []; if (e.ctrlKey && e.key !== 'Control') parts.push('Ctrl'); if (e.altKey && e.key !== 'Alt') parts.push('Alt'); if (e.shiftKey && e.key !== 'Shift' && (mod || named)) parts.push('Shift'); parts.push(NAMES[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key));
      key.innerHTML = parts.map(p => '<kbd>' + p + '</kbd>').join('+'); key.classList.add('on'); clearTimeout(kt); kt = setTimeout(() => key.classList.remove('on'), 1100); }, true);
    addEventListener('keyup', e => { if (['Control', 'Alt'].includes(e.key)) { clearTimeout(kt); kt = setTimeout(() => key.classList.remove('on'), 500); } }, true);
    return 1`);

  /* ---------- what a script drives the app with ---------- */
  const KEYS = { Enter: [13, 'Enter', '\r'], Escape: [27, 'Escape'], Tab: [9, 'Tab'], Backspace: [8, 'Backspace'], Delete: [46, 'Delete'], ArrowUp: [38, 'ArrowUp'], ArrowDown: [40, 'ArrowDown'], ArrowLeft: [37, 'ArrowLeft'], ArrowRight: [39, 'ArrowRight'],
    Control: [17, 'ControlLeft'], Alt: [18, 'AltLeft'], Shift: [16, 'ShiftLeft'], ' ': [32, 'Space', ' '] };
  const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 };
  let mx = VW / 2, my = VH / 2, held = 0, mods = 0, t0 = 0;
  const marks = [];
  const R = {
    ev, until, sleep, wait: sleep, view: [VW, VH], base,
    /** The browser itself offline (no network at all), and back: R.offline(true) / R.offline(false). */
    async offline(on) { await send('Network.enable'); await send('Network.emulateNetworkConditions', { offline: !!on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(300); },
    /** With `server: true`: R.server.offline(true) makes the computer unreachable to the app (its requests are dropped); false brings it back. */
    server: { offline(on) { offline = !!on; }, get port() { return pyPort; }, get folder() { return nbDir && path.join(nbDir, 'notebook'); } },
    /** Where something is: a selector (its middle), { sel, dx, dy } (from its top-left corner; a fraction below 1 is a share of its size), { sel?, text } (the smallest visible element holding that text), { js } (an expression giving the element), { xy } (one giving { x, y }), or [x, y]. */
    async point(target) {
      if (Array.isArray(target)) return { x: target[0], y: target[1] };
      const o = typeof target === 'string' ? { sel: target } : target;
      if (o.xy) { const p = await ev('return (' + o.xy + ')'); if (!p) throw new Error('no point: ' + o.xy); return p; }   // an expression in the page giving { x, y }
      const pick = o.js ? '(' + o.js + ')' : o.text != null ? '[...document.querySelectorAll(' + J(o.sel || 'button, a, [role=button], .op, li, span, div') + ')].filter(e => e.getClientRects().length && e.textContent.includes(' + J(o.text) + ')).sort((a, b) => a.textContent.length - b.textContent.length)[0]' : 'document.querySelector(' + J(o.sel) + ')';
      const r = await ev(`const e = ${pick}; if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }`);
      if (!r) throw new Error('not on the page: ' + (o.text != null ? '“' + o.text + '”' + (o.sel ? ' in ' + o.sel : '') : o.sel || o.js));
      const f = (v, size) => v == null ? size / 2 : Math.abs(v) < 1 ? v * size : v;
      return { x: r.l + f(o.dx, r.w), y: r.t + f(o.dy, r.h) };
    },
    /** The pointer travels there (eased), as a hand would. */
    async move(target, ms) {
      const p = await R.point(target), dist = Math.hypot(p.x - mx, p.y - my); ms = ms == null ? Math.min(900, 260 + dist * 1.1) : ms;
      const n = Math.max(2, Math.round(ms / 16)), x0 = mx, y0 = my;
      for (let i = 1; i <= n; i++) { const k = i / n, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; mx = x0 + (p.x - x0) * e; my = y0 + (p.y - y0) * e;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: held ? 'left' : 'none', buttons: held, modifiers: mods }); await sleep(16); }
      return p;
    },
    async down(button = 'left') { held = button === 'right' ? 2 : 1; await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button, buttons: held, clickCount: 1, modifiers: mods }); },
    async up(button = 'left') { held = 0; await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button, buttons: 0, clickCount: 1, modifiers: mods }); },
    async click(target, o = {}) { if (target) await R.move(target, o.ms); await sleep(o.rest == null ? 180 : o.rest); await R.down(o.button); await sleep(70); await R.up(o.button); await sleep(o.after == null ? 350 : o.after); },
    async dblclick(target) { await R.move(target); await sleep(150); for (const n of [1, 2]) { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', buttons: 1, clickCount: n }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button: 'left', buttons: 0, clickCount: n }); await sleep(60); } await sleep(350); },
    rclick: (target, o = {}) => R.click(target, Object.assign({ button: 'right' }, o)),
    /** Press, travel, let go. */
    async drag(from, to, o = {}) { await R.move(from); await sleep(200); await R.down(o.button); await sleep(160); for (const v of o.via || []) await R.move(v, o.viaMs || 450); await R.move(to, o.ms || 1100); await sleep(o.hold == null ? 250 : o.hold); await R.up(o.button); await sleep(o.after == null ? 500 : o.after); },
    /** A pen stroke through points ([[x, y], …] or targets): pressed at the first, lifted at the last. { hold } keeps it still at the end (ms) before lifting — a shape; { eraser: true } is the pen's back; { barrel: true } its barrel button. */
    async pen(points, o = {}) {
      const P = []; for (const t of points) P.push(await R.point(t));
      if (o.eraser) {   // Chrome's debugging connection has no eraser button (button 5, buttons 32), so the pen's back is sent as pointer events made in the page
        const pe = (type, p, down) => ev(`const el = document.elementFromPoint(${p.x}, ${p.y}) || document.body; const i = { pointerType: 'pen', pointerId: 1, isPrimary: true, bubbles: true, cancelable: true, composed: true, clientX: ${p.x}, clientY: ${p.y}, button: ${type === 'pointermove' ? -1 : 5}, buttons: ${down ? 32 : 0}, pressure: ${down ? .5 : 0} }; el.dispatchEvent(new PointerEvent(${J(type)}, i)); return 1`);
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P[0].x, y: P[0].y, button: 'none', pointerType: 'pen' }); mx = P[0].x; my = P[0].y; await sleep(150);
        await pe('pointerdown', P[0], true);
        for (let i = 1; i < P.length; i++) { const a = P[i - 1], z = P[i], n = Math.max(2, Math.round(Math.hypot(z.x - a.x, z.y - a.y) / (o.step || 9)));
          for (let k = 1; k <= n; k++) { mx = a.x + (z.x - a.x) * k / n; my = a.y + (z.y - a.y) * k / n; await pe('pointermove', { x: mx, y: my }, true); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: 'none', pointerType: 'pen' }); await sleep(o.ms || 12); } }
        await pe('pointerup', P[P.length - 1], false); await sleep(o.after == null ? 350 : o.after); return;
      }
      const ev1 = (type, p, buttons) => send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: o.eraser ? 'forward' : o.barrel ? 'right' : 'left', buttons, clickCount: 1, pointerType: 'pen', force: buttons ? (o.force || .5) : 0, modifiers: mods });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P[0].x, y: P[0].y, button: 'none', pointerType: 'pen' }); mx = P[0].x; my = P[0].y; await sleep(120);
      const b = o.eraser ? 32 : o.barrel ? 2 : 1;
      await ev1('mousePressed', P[0], b);
      for (let i = 1; i < P.length; i++) { const a = P[i - 1], z = P[i], n = Math.max(2, Math.round(Math.hypot(z.x - a.x, z.y - a.y) / (o.step || 7)));
        for (let k = 1; k <= n; k++) { mx = a.x + (z.x - a.x) * k / n; my = a.y + (z.y - a.y) * k / n; await ev1('mouseMoved', { x: mx, y: my }, b); await sleep(o.ms || 12); } }
      if (o.hold) await sleep(o.hold);
      await ev1('mouseReleased', P[P.length - 1], 0); await sleep(o.after == null ? 350 : o.after);
    },
    /** Fingers on the glass: R.touch([[x, y], [x2, y2]]) taps with two fingers; { ms } holds them; { to: [[…], […]] } drags them there (a pan, a pinch). */
    async touch(points, o = {}) {
      const P = []; for (const t of points) P.push(await R.point(t));
      const tp = L => L.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 6, radiusY: 6, force: .5 }));
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(P) }); await sleep(o.ms || 70);
      if (o.to) { const T = []; for (const t of o.to) T.push(await R.point(t)); for (let k = 1; k <= 14; k++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(P.map((p, i) => ({ x: p.x + (T[i].x - p.x) * k / 14, y: p.y + (T[i].y - p.y) * k / 14 }))) }); await sleep(24); } }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(o.after == null ? 400 : o.after);
    },
    /** Answer the app's file window: await R.files(['assets/paper-okafor-2021.pdf'], () => R.click({ text: 'PDF…' })). Paths are relative to demokit/. */
    async files(paths, action) {
      const files = paths.map(f => path.resolve(KIT, f)); for (const f of files) if (!existsSync(f)) throw new Error('no such file: ' + f);
      const got = new Promise(res => { chooser = { files, done: res }; setTimeout(() => { if (chooser) { chooser = null; res(false); } }, 8000); });
      await action(); if (!await got) throw new Error('the app did not ask for a file'); await sleep(600);
    },
    async wheel(dy, target) { if (target) await R.move(target); await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: mx, y: my, deltaX: 0, deltaY: dy, modifiers: mods }); await sleep(300); },
    /** A key by name ('Enter', 'Escape', 'ArrowDown', 'a'…), with { ctrl, alt, shift }. */
    async key(key, o = {}) {
      const m = (o.ctrl ? MOD.ctrl : 0) | (o.alt ? MOD.alt : 0) | (o.shift ? MOD.shift : 0) | mods, k = KEYS[key], one = key.length === 1;
      const p = { key, modifiers: m, windowsVirtualKeyCode: k ? k[0] : one ? key.toUpperCase().charCodeAt(0) : 0, code: k ? k[1] : one && /[a-z]/i.test(key) ? 'Key' + key.toUpperCase() : '' };
      const text = k ? k[2] : one && !(m & (MOD.ctrl | MOD.alt)) ? key : undefined;
      const cmd = (m & MOD.ctrl) && !(m & MOD.alt) && one ? ({ c: 'copy', x: 'cut', v: m & MOD.shift ? 'pasteAndMatchStyle' : 'paste', a: 'selectAll', z: m & MOD.shift ? 'redo' : 'undo', y: 'redo' })[key.toLowerCase()] : null;   // Chrome runs the editing command a real key would
      await send('Input.dispatchKeyEvent', Object.assign({ type: text ? 'keyDown' : 'rawKeyDown' }, p, text ? { text, unmodifiedText: text } : {}, cmd ? { commands: [cmd] } : {})); await sleep(40);
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, p)); await sleep(o.after == null ? 250 : o.after);
    },
    /** Hold Ctrl / Alt / Shift across the next clicks and keys; R.release() lets go. */
    async hold(name) { const k = KEYS[name]; mods |= MOD[name === 'Control' ? 'ctrl' : name.toLowerCase()]; await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code: k[1], windowsVirtualKeyCode: k[0], modifiers: mods }); await sleep(250); },
    async release(name) { const k = KEYS[name]; mods &= ~MOD[name === 'Control' ? 'ctrl' : name.toLowerCase()]; await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: k[1], windowsVirtualKeyCode: k[0], modifiers: mods }); await sleep(200); },
    /** Typed a letter at a time, at a person's pace. */
    async type(text, ms = 70) { for (const ch of text) { if (ch === '\n') { await R.key('Enter', { after: ms }); continue; }
      const vk = /[a-z0-9 ]/i.test(ch) ? ch.toUpperCase().charCodeAt(0) : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, windowsVirtualKeyCode: vk }); await sleep(ms + Math.random() * 40); } await sleep(250); },
    /** A wait the viewer should not sit through (a timer running out, a minute passing): what happens inside is not recorded and its time is cut from the take. Say so in the caption. */
    async cut(fn) { await sleep(300); casting = false; const a = Date.now(); try { await fn(); } finally { cutMs += Date.now() - a; resumeAt = Date.now(); casting = true; } await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx + 1, y: my, button: 'none' }); await sleep(400); },
    /** Open a note and wait for its components. */
    async open(docId) { await ev(`App.go('#/doc/' + ${J(docId)}); return 1`); if (!await until(`typeof DocView !== 'undefined' && DocView.docId === ${J(docId)} && !!document.querySelector('.box')`, 12000)) throw new Error('the note did not open: ' + docId); await sleep(700); },
    async go(hash) { await ev(`App.go(${J(hash)}); return 1`); await sleep(700); },
  };

  if (existsSync(path.join(KIT, 'kit.js'))) await ev(readFileSync(path.join(KIT, 'kit.js'), 'utf8') + '\nreturn 1');

  /* ---------- the test note, then the take ---------- */
  const run = fn => typeof fn === 'string' ? ev(fn) : ev('return await (' + fn.toString() + ')()');
  const ctx = D.setup ? await run(D.setup) : {};
  if (D.before) await D.before(R, ctx);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: 'none' }); await sleep(400);
  await send('Page.startScreencast', { format: 'jpeg', quality: 93, everyNthFrame: Math.max(1, Math.round(60 / FPS / 2)),   /* every other frame Chrome draws: plenty for the video's rate, and half the work on a busy computer */ maxWidth: Math.round(VW * DPR), maxHeight: Math.round(VH * DPR) }); casting = true; t0 = clock();
  // Chrome sends a frame only when the picture changes: nudge the pointer so the take's first frame is its first moment, even when the first step begins with nothing moving
  for (let k = 1; k <= 4; k++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx + (k % 2), y: my, button: 'none' }); await sleep(40); }
  await sleep(900);
  for (let i = 0; i < D.steps.length; i++) {
    const [say, fn] = D.steps[i];
    marks.push([Math.max(0, Math.round((clock() - t0) / 100) / 10), say]);
    if (flag('shots')) { const sh = await send('Page.captureScreenshot', { format: 'png' }); await mkdir(path.join(KIT, 'out'), { recursive: true }); await writeFile(path.join(KIT, 'out', id + '-' + String(i + 1).padStart(2, '0') + '.png'), Buffer.from(sh.result.data, 'base64')); }
    console.log('  ' + String(marks[i][0]).padStart(5) + ' s  ' + say);
    try { await fn(R, ctx); } catch (e) {   // what the page looked like when the step failed: demokit/out/<id>-fail.png
      try { const sh = await send('Page.captureScreenshot', { format: 'png' }); await mkdir(path.join(KIT, 'out'), { recursive: true }); await writeFile(path.join(KIT, 'out', id + '-fail.png'), Buffer.from(sh.result.data, 'base64')); } catch { }
      throw new Error('step ' + (i + 1) + ' (“' + say + '”): ' + (e.message || e) + ' — see demokit/out/' + id + '-fail.png'); }
    await sleep(D.pause == null ? 900 : D.pause);
  }
  await sleep(1200);
  if (flag('shots')) { const sh = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(KIT, 'out', id + '-end.png'), Buffer.from(sh.result.data, 'base64')); }
  casting = false; const tEnd = clock(); await send('Page.stopScreencast');
  if (errs.length) throw new Error('the app threw while it was recorded:\n  ' + errs.slice(0, 5).join('\n  '));
  if (shots.length < 5) throw new Error('only ' + shots.length + ' frames came from Chrome');

  /* ---------- frames → video (each frame stays until the next one came) ---------- */
  shots.sort((a, b) => a.t - b.t);
  // one frame per frame of the video at most: ffmpeg gives a still at least 1/25 s however short its `duration` says, so a busy
  // stretch (60 frames a second from Chrome) came out slower than it happened and ran past the captions' times
  { const gap = 1000 / FPS - 1, keep = []; for (const s of shots) { if (!keep.length || s.t - keep[keep.length - 1].t >= gap) keep.push(s); else keep[keep.length - 1] = Object.assign(s, { t: keep[keep.length - 1].t }); } shots.length = 0; shots.push(...keep); }
  const list = shots.map((s, i) => `file '${s.file.split(path.sep).join('/')}'\nduration ${Math.max(.004, ((shots[i + 1] ? shots[i + 1].t : Math.max(tEnd, s.t + 40)) - s.t) / 1000).toFixed(3)}`).join('\n') + `\nfile '${shots[shots.length - 1].file.split(path.sep).join('/')}'\n`;
  const lead = (shots[0].t - t0) / 1000;   // the first frame came this long after the clock started: the captions keep the video's time
  await writeFile(path.join(frames, 'list.txt'), list);
  const outDir = path.join(APP, 'demos'); await mkdir(outDir, { recursive: true });
  const mp4 = path.join(outDir, id + '.mp4'), jpg = path.join(outDir, id + '.jpg');
  const ff = args => { const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.error) throw new Error('ffmpeg did not run (' + FFMPEG + '): ' + r.error.message); if (r.status) throw new Error('ffmpeg: ' + (r.stderr || '').slice(-600)); };
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(frames, 'list.txt'), '-vf', `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(D.crf || 27), '-tune', 'animation', '-movflags', '+faststart', '-an', '-t', ((tEnd - shots[0].t) / 1000).toFixed(2), mp4]);   // -t: the list's last file is named twice (ffmpeg needs that to honour its length), which would hold the last frame twice as long
  const dur = Math.round((tEnd - shots[0].t) / 100) / 10;
  const posterAt = D.poster == null ? Math.max(0, dur - 1) : D.poster < 0 ? Math.max(0, dur + D.poster) : D.poster;
  ff(['-ss', String(posterAt), '-i', mp4, '-frames:v', '1', '-vf', 'scale=960:-2:flags=lanczos', '-q:v', '5', jpg]);
  const bytes = statSync(mp4).size, v = createHash('sha256').update(readFileSync(mp4)).digest('hex').slice(0, 8);
  const steps = marks.map(([t, say]) => [Math.max(0, Math.round((t - lead) * 10) / 10), say]);

  /* ---------- the feature's entry in src/20b-demos.js ---------- */
  const entry = `/* demo:${id} */\nFEAT.demo(${J(id)}, { by: ${J(D.by || '')}, at: ${J(new Date().toISOString().slice(0, 10))}, use: ${J(D.use)},\n  video: ${J('demos/' + id + '.mp4')}, poster: ${J('demos/' + id + '.jpg')}, v: ${J(v)}, w: ${Math.round(VW * DPR)}, h: ${Math.round(VH * DPR)}, dur: ${dur}, kb: ${Math.round(bytes / 1024)},\n  steps: [${steps.map(s => '\n    ' + J(s)).join(',')}] });\n/* /demo:${id} */`;
  if (flag('no-entry')) { await mkdir(path.join(KIT, 'out'), { recursive: true }); writeFileSync(path.join(KIT, 'out', id + '.entry.js'), entry); }   // all.mjs writes the entries one at a time afterwards
  else putEntry(entry);
  console.log(`recorded ${id}: ${dur} s, ${shots.length} frames, ${Math.round(bytes / 1024)} KB → demos/${id}.mp4 · ${steps.length} steps → src/20b-demos.js`);
  code = 0;
} catch (e) { console.log('record: ' + (e.message || e)); }
clearTimeout(watchdog);
await done();
