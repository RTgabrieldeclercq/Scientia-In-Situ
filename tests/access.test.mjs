#!/usr/bin/env node
/* The notebook's lock (access.py) end to end: serve.py, run from a copy of the app in a folder of its own (making the lock
 * moves the files the app keeps next to itself, so never this checkout's), on a notebook made here with a record, a daily
 * copy, an image, a recording and its transcript, a Markdown mirror and a file of the user's own. The lock is made, and
 * then: nothing secret is left readable in the folder, nothing is served without a sign-in, everything is served as it
 * was with one, and what the server writes afterwards (media, changes, recordings, transcripts, slides) is sealed too;
 * Lock now, a restart, people, passwords, the recovery key, too many tries; and the lock taken off again.
 * Run: node tests/access.test.mjs   (needs Python with the `cryptography` package)
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
if (spawnSync(PY, ['-c', 'import cryptography'], { encoding: 'utf8' }).status !== 0) { console.log('\n  skipped: Python has no `cryptography` (pip install cryptography)'); process.exit(0); }

let pass = 0, fail = 0;
const eq = (label, got, want) => { const ok = got === want; ok ? pass++ : fail++; console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) { console.log('        got : ' + JSON.stringify(got)); console.log('        want: ' + JSON.stringify(want)); } };
const yes = (label, ok, info) => eq(label + (ok || info === undefined ? '' : ' (' + info + ')'), !!ok, true);

// ---------------- a copy of the app, a notebook, a config ----------------
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-access-')), APP = path.join(T, 'app'), NB = path.join(T, 'notebook'), CFG = path.join(T, 'config', 'config.json');
fs.mkdirSync(APP); for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.py') || f === 'signin.html')) fs.copyFileSync(path.join(ROOT, f), path.join(APP, f));
fs.writeFileSync(path.join(APP, 'scientia.html'), '<!doctype html><title>the app</title>');
const put = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
const record = { app: 'Scientia In Situ', stores: { projects: [{ id: 'p1', name: 'Secret project' }], documents: [{ id: 'd1', title: 'Secret note' }] }, sid: 'abc123', syncSeq: 0, savedAt: '2026-11-06T00:00:00.000Z' };
put(path.join(NB, '.scientia', 'record.json'), JSON.stringify(record));
put(path.join(NB, '.scientia', 'daily', 'scientia-2026-11-05.json'), JSON.stringify(record));
put(path.join(NB, '.scientia', 'kept', 'before-replace-x.json'), JSON.stringify(record));
const PIC = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.from('Secret image '), Buffer.alloc((1 << 20) * 2 + 12345, 7)]);   // three chunks
put(path.join(NB, 'images', 'pic.png'), PIC);
const TALK = Buffer.from('webm Secret recording '.repeat(500));
put(path.join(NB, 'recordings', 'talk.webm'), TALK);
put(path.join(NB, 'recordings', 'talk.webm.json'), JSON.stringify({ state: 'done', file: 'talk.webm', segs: [{ s: 0, e: 1, text: 'Secret words' }] }));
put(path.join(NB, 'Secret project', 'A note', '01 Secret.md'), '# Secret\n');
put(path.join(NB, '.scientia', 'manifest.json'), JSON.stringify({ 'Secret project/A note/01 Secret.md': 'h1' }));
put(path.join(NB, 'mine.txt'), 'my own Secret file, left as it is');
const OLD = Buffer.from('an image from before the notebook folder, Secret');
put(path.join(APP, 'images', 'old.png'), OLD);
put(CFG, JSON.stringify({ notebook: NB }));

// ---------------- the server ----------------
const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PORT = await freePort(), BASE = `http://127.0.0.1:${PORT}`;
let srv = null, srvErr = '';
async function start() {
  srv = spawn(PY, ['serve.py'], { cwd: APP, env: { ...process.env, SIS_PORT: String(PORT), SIS_NOBROWSER: '1', SIS_CONFIG: CFG, SIS_STT_FAKE: '1', SIS_SLIDES_FAKE: '1' }, stdio: ['ignore', 'ignore', 'pipe'] });
  srv.stderr.on('data', d => { srvErr += d; });
  for (let i = 0; i < 80; i++) { try { await fetch(BASE + '/sw.js'); return; } catch { await sleep(250); } }
  throw new Error('serve.py did not start:\n' + srvErr);
}
async function stop() { if (!srv) return; const done = new Promise(r => srv.once('exit', r)); srv.kill(); await done; srv = null; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(method, p, { json, raw, cookie } = {}) {
  const headers = {}; if (cookie) headers.Cookie = cookie; if (json) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + p, { method, headers, body: json ? JSON.stringify(json) : raw });
  const buf = Buffer.from(await r.arrayBuffer()), sc = r.headers.get('set-cookie') || '';
  let body = null; try { body = JSON.parse(buf.toString('utf8')); } catch { }
  return { status: r.status, buf, body, cookie: /sis_ses=([^;]*)/.test(sc) ? 'sis_ses=' + RegExp.$1 : null };
}
const until = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(200); } return null; };
const jobDone = cookie => until(async () => { const s = (await call('GET', '/api/access/status', { cookie })).body; return s.job && s.job.state !== 'working' && s.job; });

// every file the lock keeps sealed, and whether it is
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const sealedParts = () => ['.scientia', 'images', 'recordings'].flatMap(d => walk(path.join(NB, d))).filter(f => !path.basename(f).startsWith('access.json'));
const isSealed = f => fs.readFileSync(f).subarray(0, 8).toString('latin1') === 'SiSLock1';

try {
  await start();
  let s = (await call('GET', '/api/access/status')).body;
  eq('not locked yet', s.lock, false);
  eq('the encryption library is there', s.crypto, true);
  eq('before the lock, the record is served to this computer', (await call('GET', '/api/sync/state')).body.stores.projects[0].name, 'Secret project');

  // ---------------- making the lock ----------------
  eq('a short password is refused', (await call('POST', '/api/access/setup', { json: { id: 'gabe', name: 'Gabe', password: 'short' } })).body.ok, false);
  const made = await call('POST', '/api/access/setup', { json: { id: 'Gabe', name: 'Gabe', password: 'correct horse 1' } });
  eq('the lock is made', made.body.ok, true);
  yes('a recovery key, in five groups', /^[0-9A-Z]{5}(-[0-9A-Z]{5}){4}$/.test(made.body.recovery), made.body.recovery);
  yes('the owner is signed in', made.cookie);
  eq('the username is kept in lower case', made.body.me.id, 'gabe');
  let gabe = made.cookie;
  const job = await jobDone(gabe);
  eq('the folder is encrypted', job && job.state, 'done');
  const notSealed = sealedParts().filter(f => !isSealed(f));
  eq('every file in .scientia/, images/ and recordings/ is sealed', notSealed.map(f => path.relative(NB, f)).join(', '), '');
  const leaks = walk(NB).filter(f => path.basename(f) !== 'mine.txt' && fs.readFileSync(f).includes('Secret'));
  eq('no secret left readable in the folder', leaks.map(f => path.relative(NB, f)).join(', '), '');
  eq('the Markdown mirror is gone', fs.existsSync(path.join(NB, 'Secret project')), false);
  eq('your own file is left as it is', fs.readFileSync(path.join(NB, 'mine.txt'), 'utf8'), 'my own Secret file, left as it is');
  eq('the image kept next to the app moved into the notebook', fs.existsSync(path.join(APP, 'images', 'old.png')), false);
  yes('… sealed', fs.existsSync(path.join(NB, 'images', 'old.png')) && isSealed(path.join(NB, 'images', 'old.png')));
  const acc = fs.readFileSync(path.join(NB, '.scientia', 'access.json'), 'utf8');
  yes('access.json holds no password', !acc.includes('correct horse') && JSON.parse(acc).people[0].id === 'gabe');

  // ---------------- nothing without a sign-in ----------------
  const page = await call('GET', '/scientia.html');
  eq('the app page: refused', page.status, 401);
  yes('… with the sign-in page instead', page.buf.toString().includes('Forgot your password?'));
  eq('the record: refused', (await call('GET', '/api/sync/state')).status, 423);
  eq('an image: refused', (await call('GET', '/images/pic.png')).status, 401);
  eq('… even asked with HEAD (which skips do_GET)', (await call('HEAD', '/images/pic.png')).status, 401);
  eq('… the app page with HEAD too', (await call('HEAD', '/scientia.html')).status, 401);
  eq('pairing: refused', (await call('POST', '/api/pair/claim', { json: { code: '123456' } })).status, 423);
  eq('the service worker is still served', (await call('GET', '/sw.js')).status, 200);
  eq('a made-up session: refused', (await call('GET', '/api/sync/state', { cookie: 'sis_ses=abc' })).status, 423);

  // ---------------- everything as it was, signed in ----------------
  eq('the app page', (await call('GET', '/scientia.html', { cookie: gabe })).status, 200);
  yes('the image, as it was (three chunks)', (await call('GET', '/images/pic.png', { cookie: gabe })).buf.equals(PIC));
  const head = await fetch(BASE + '/images/pic.png', { method: 'HEAD', headers: { Cookie: gabe } });
  eq('… its size, as it was', head.headers.get('content-length'), String(PIC.length));
  yes('the recording, as it was', (await call('GET', '/recordings/talk.webm', { cookie: gabe })).buf.equals(TALK));
  yes('the moved image, as it was', (await call('GET', '/images/old.png', { cookie: gabe })).buf.equals(OLD));
  eq('the transcript, read through the lock', (await call('GET', '/api/rec/status?file=talk.webm', { cookie: gabe })).body.segs[0].text, 'Secret words');
  eq('the record', (await call('GET', '/api/sync/state', { cookie: gabe })).body.stores.documents[0].title, 'Secret note');

  // ---------------- what is written now is sealed ----------------
  const NEW = Buffer.from('a new Secret picture '.repeat(100));
  eq('an upload', (await call('POST', '/api/media?id=m1&ext=png', { raw: NEW, cookie: gabe })).body.ok, true);
  yes('… sealed on disk', isSealed(path.join(NB, 'images', 'm1.png')));
  yes('… served as it was', (await call('GET', '/images/m1.png', { cookie: gabe })).buf.equals(NEW));
  const pushed = await call('POST', '/api/sync/push', { cookie: gabe, json: { sid: 'abc123', dev: 'dv1', conn: 'k1', name: 'Test', ops: [{ store: 'projects', id: 'p2', rec: { id: 'p2', name: 'Another Secret' }, base: 0, prev: null }] } });
  eq('a change', pushed.body.ok, true);
  const ops = fs.readFileSync(path.join(NB, '.scientia', 'ops.jsonl'), 'utf8').trim().split('\n');
  yes('… sealed in ops.jsonl', ops.length && ops.every(l => l.startsWith('E')) && !ops.join('').includes('Secret'));
  const rec = await call('POST', '/api/rec?ext=webm&name=talk2&transcribe=1', { raw: TALK, cookie: gabe });
  eq('a recording', rec.body.ok, true);
  const tr = await until(async () => { const j = (await call('GET', '/api/rec/status?file=' + rec.body.file, { cookie: gabe })).body; return j.state === 'done' && j; });
  eq('… transcribed (from a plain copy that is gone afterwards)', tr && tr.segs[0].text, 'Spoken sentence 1.');
  yes('… the recording and its transcript sealed', isSealed(path.join(NB, 'recordings', rec.body.file)) && isSealed(path.join(NB, 'recordings', rec.body.file + '.json')));
  const sl = await call('POST', '/api/slides?id=s1&ext=pptx', { raw: Buffer.from('not really a deck'), cookie: gabe });
  eq('slides', sl.body.ok, true);
  yes('… the deck and its pictures sealed', isSealed(path.join(NB, 'images', 's1.pptx')) && sl.body.slides.length && sl.body.slides.every(x => isSealed(path.join(NB, x.path))), JSON.stringify(sl.body));
  yes('… a picture served as a PNG', (await call('GET', '/' + sl.body.slides[0].path, { cookie: gabe })).buf.subarray(1, 4).toString() === 'PNG');
  eq('the Markdown mirror is refused', (await call('POST', '/api/vault', { cookie: gabe, json: { writes: [] } })).status, 409);
  const other = path.join(T, 'other'); fs.mkdirSync(other);
  const sw = await call('POST', '/api/notebook', { cookie: gabe, json: { path: other } });
  yes('switching to an unlocked folder is refused', sw.body.ok === false && /locked/.test(sw.body.error), sw.body.error);
  await sleep(3500);   // the record is written a few seconds after a change
  yes('the record written since is sealed', isSealed(path.join(NB, '.scientia', 'record.json')) && !fs.existsSync(path.join(NB, '.scientia', 'ops.jsonl')));

  // ---------------- Lock now, and a restart ----------------
  await call('POST', '/api/access/lock', { cookie: gabe });
  eq('Lock now: the session ends', (await call('GET', '/api/sync/state', { cookie: gabe })).status, 423);
  eq('… the notebook is closed', (await call('GET', '/api/access/status')).body.open, false);
  const bad = await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'wrong horse 1' } });
  yes('a wrong password does not open it', bad.body.ok === false && !bad.cookie);
  const back = await call('POST', '/api/access/signin', { json: { id: 'GABE', password: 'correct horse 1' } });
  eq('the right one does', back.body.ok, true); gabe = back.cookie;
  eq('… and the record is there', (await call('GET', '/api/sync/state', { cookie: gabe })).body.stores.projects.length, 2);
  await stop(); await start();
  s = (await call('GET', '/api/access/status', { cookie: gabe })).body;
  yes('after a restart: locked, closed, the session remembered', s.lock && !s.open && s.me && s.me.id === 'gabe');
  eq('… the record: refused until someone signs in', (await call('GET', '/api/sync/state', { cookie: gabe })).status, 423);
  gabe = (await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'correct horse 1' } })).cookie;
  const st2 = (await call('GET', '/api/sync/state', { cookie: gabe })).body;
  yes('… then the sealed record loads, with the change made before', st2.stores.projects.map(p => p.name).sort().join() === 'Another Secret,Secret project', JSON.stringify(st2.stores.projects));

  // ---------------- people, passwords, the recovery key ----------------
  eq('an owner adds someone', (await call('POST', '/api/access/people/add', { cookie: gabe, json: { id: 'alex', name: 'Alex', role: 'member', password: 'alex pass 1' } })).body.ok, true);
  eq('the people', (await call('GET', '/api/access/people', { cookie: gabe })).body.people.map(p => p.id + ':' + p.role).join(), 'gabe:owner,alex:member');
  eq('… not without a sign-in', (await call('GET', '/api/access/people')).status, 423);
  eq('… not twice', (await call('POST', '/api/access/people/add', { cookie: gabe, json: { id: 'Alex', name: 'Alex', password: 'alex pass 2' } })).body.ok, false);
  let alex = (await call('POST', '/api/access/signin', { json: { id: 'alex', password: 'alex pass 1' } })).cookie;
  yes('they sign in with their own password', alex);
  eq('a member cannot add people', (await call('POST', '/api/access/people/add', { cookie: alex, json: { id: 'eve', name: 'Eve', password: 'eve pass 12' } })).status, 403);
  eq('they change their password', (await call('POST', '/api/access/password', { cookie: alex, json: { old: 'alex pass 1', password: 'alex pass 9' } })).body.ok, true);
  eq('… the old one stops working', (await call('POST', '/api/access/signin', { json: { id: 'alex', password: 'alex pass 1' } })).body.ok, false);
  alex = (await call('POST', '/api/access/signin', { json: { id: 'alex', password: 'alex pass 9' } })).cookie;
  yes('… the new one works', alex);
  eq('removing them', (await call('POST', '/api/access/people/remove', { cookie: gabe, json: { id: 'alex' } })).body.ok, true);
  eq('… ends their session', (await call('GET', '/api/sync/state', { cookie: alex })).status, 423);
  eq('… and their sign-in', (await call('POST', '/api/access/signin', { json: { id: 'alex', password: 'alex pass 9' } })).body.ok, false);
  eq('the last owner cannot be removed', (await call('POST', '/api/access/people/remove', { cookie: gabe, json: { id: 'gabe' } })).body.ok, false);
  eq('a wrong recovery key does nothing', (await call('POST', '/api/access/recover', { json: { id: 'gabe', code: 'AAAAA-AAAAA-AAAAA-AAAAA-AAAAA', password: 'brand new 1' } })).body.ok, false);
  const rc = await call('POST', '/api/access/recover', { json: { id: 'gabe', code: made.body.recovery.toLowerCase(), password: 'brand new 1' } });
  yes('the recovery key sets a new password (typed in any case)', rc.body.ok && rc.cookie);
  eq('… the old password stops working', (await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'correct horse 1' } })).body.ok, false);
  gabe = (await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'brand new 1' } })).cookie;
  yes('… the new one works', gabe);
  const nr = await call('POST', '/api/access/recovery', { cookie: gabe, json: { password: 'brand new 1' } });
  yes('a new recovery key', nr.body.ok && nr.body.recovery !== made.body.recovery);
  eq('… the old key stops working', (await call('POST', '/api/access/recover', { json: { id: 'gabe', code: made.body.recovery, password: 'brand new 2' } })).body.ok, false);

  // ---------------- too many tries ----------------
  let last; for (let i = 0; i < 6; i++) last = (await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'guess ' + i + ' xx' } })).body;
  yes('after five wrong passwords, a wait', /Too many tries/.test(last.error) && last.wait > 0, last.error);
  eq('… even for the right one', (await call('POST', '/api/access/signin', { json: { id: 'gabe', password: 'brand new 1' } })).body.ok, false);

  // ---------------- taking the lock off ----------------
  eq('a wrong password does not take it off', (await call('POST', '/api/access/remove', { cookie: gabe, json: { password: 'nope nope 1' } })).body.ok, false);
  await call('POST', '/api/sync/push', { cookie: gabe, json: { sid: st2.sid, dev: 'dv1', conn: 'k1', name: 'Test', ops: [{ store: 'projects', id: 'p3', rec: { id: 'p3', name: 'Third' }, base: 0, prev: null }] } });
  yes('a change waiting in ops.jsonl', fs.existsSync(path.join(NB, '.scientia', 'ops.jsonl')));
  eq('taking the lock off', (await call('POST', '/api/access/remove', { cookie: gabe, json: { password: 'brand new 1' } })).body.ok, true);
  const off = await jobDone();
  eq('… done', off && off.state, 'done');
  eq('… every file plain again', sealedParts().filter(isSealed).map(f => path.relative(NB, f)).join(', '), '');
  const opsf = path.join(NB, '.scientia', 'ops.jsonl');
  yes('… ops.jsonl too, line by line', !fs.existsSync(opsf) || fs.readFileSync(opsf, 'utf8').trim().split('\n').every(l => l.startsWith('{')));
  yes('… the image as it was', fs.readFileSync(path.join(NB, 'images', 'pic.png')).equals(PIC));
  yes('… access.json kept aside', !fs.existsSync(path.join(NB, '.scientia', 'access.json')) && fs.readdirSync(path.join(NB, '.scientia', 'kept')).some(f => f.startsWith('access-')));
  eq('… and the app opens without a sign-in', (await call('GET', '/scientia.html')).status, 200);
  await stop(); await start();
  eq('after a restart, the record holds every change', (await call('GET', '/api/sync/state')).body.stores.projects.map(p => p.id).sort().join(), 'p1,p2,p3');
  yes('… and record.json is plain', JSON.parse(fs.readFileSync(path.join(NB, '.scientia', 'record.json'), 'utf8')).stores.projects.length >= 2);
} catch (e) {
  fail++; console.log('  FAIL  ' + (e.stack || e)); if (srvErr) console.log(srvErr.slice(-2000));
} finally {
  await stop();
  fs.rmSync(T, { recursive: true, force: true });
}
console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
