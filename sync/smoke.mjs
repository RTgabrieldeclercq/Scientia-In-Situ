// The app starting in a headless browser, for sync/lab_sync.py finish:
//   node sync/smoke.mjs <url> <chrome> <profile dir (absolute)> <debugging port>
// Chrome over its debugging connection (the app keeps long requests open, so --dump-dom never finishes). Prints one JSON
// line { ok, header, exceptions, errors } and exits 1 on an uncaught exception or no header (#hd).
import { spawn } from 'node:child_process';
const [url, chromePath, profile, port] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile, '--window-size=1400,900', 'about:blank'], { stdio: 'ignore' });
const out = { ok: false, header: false, exceptions: [], errors: [] };
const connect = async u => { const ws = new WebSocket(u); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); let id = 0; const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else ws.on && ws.on(d); };
  ws.send2 = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }); return ws; };
try {
  let targets = [];
  for (let i = 0; i < 200 && !targets.length; i++) { try { targets = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).filter(t => t.type === 'page'); } catch { } if (!targets.length) await sleep(200); }
  if (!targets.length) throw new Error('Chrome did not open its debugging port');
  const ws = await connect(targets[0].webSocketDebuggerUrl);
  ws.on = d => {
    if (d.method === 'Runtime.exceptionThrown') out.exceptions.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || '').slice(0, 400));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') out.errors.push(d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  };
  await ws.send2('Runtime.enable'); await ws.send2('Page.enable');
  await ws.send2('Page.navigate', { url });
  await sleep(8000);
  const r = await ws.send2('Runtime.evaluate', { expression: "!!document.querySelector('#hd')", returnByValue: true });
  out.header = !!r.result?.result?.value;
  out.ok = out.header && !out.exceptions.length;
  ws.close();
  const v = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
  const b = await connect(v.webSocketDebuggerUrl); await Promise.race([b.send2('Browser.close'), sleep(3000)]);
} catch (e) { out.exceptions.push('smoke: ' + (e.message || e)); }
await sleep(500); try { chrome.kill(); } catch { }
console.log(JSON.stringify(out));
process.exit(out.ok ? 0 : 1);
