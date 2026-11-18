// Records several demonstrations, a few at a time, and says which takes failed. For when the app's look changes and
// everything has to be recorded again:
//
//   node scientia/demokit/all.mjs                 every script in demokit/
//   node scientia/demokit/all.mjs floats labels   just these
//   node scientia/demokit/all.mjs --sheets        also a contact sheet of each take in demokit/out/<id>-sheet.png (to look through)
//   node scientia/demokit/all.mjs --only-missing  only the features with no recording in demos/ yet
//
// Each take is one run of record.mjs (which holds the limit on takes at once, SIS_DEMO_SLOTS). A take that fails is run
// once more, since a busy computer can make a step miss; a second failure is reported with its last lines.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.dirname(fileURLToPath(import.meta.url)), APP = path.dirname(KIT);
const argv = process.argv.slice(2), flag = f => argv.includes('--' + f);
const SKIP = new Set(['record', 'all']);
let ids = argv.filter(a => !a.startsWith('--'));
if (!ids.length) ids = readdirSync(KIT).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).filter(f => !SKIP.has(f)).sort();
if (flag('only-missing')) ids = ids.filter(id => !existsSync(path.join(APP, 'demos', id + '.mp4')));
const N = +(process.env.SIS_DEMO_SLOTS || 5);
// record.mjs rewrites src/20b-demos.js at the end of each take: one writer at a time, or two takes ending together lose an entry
let writing = Promise.resolve();
const take = id => new Promise(res => {
  const p = spawn(process.execPath, [path.join(KIT, 'record.mjs'), id, '--no-entry'], { cwd: path.dirname(APP), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => res({ id, code, out }));
});
const results = [];
const queue = ids.slice();
const worker = async () => { for (;;) { const id = queue.shift(); if (!id) return;
  let r = await take(id); if (r.code) { console.log('  ' + id + ': failed, once more…'); r = await take(id); }
  const last = r.out.trim().split('\n').slice(-1)[0] || ''; console.log((r.code ? 'FAILED  ' : 'ok      ') + id + '  ' + last.replace(/^recorded \S+: /, '').slice(0, 150));
  results.push(r); } };
console.log('recording ' + ids.length + ' demonstrations, ' + N + ' at a time');
await Promise.all(Array.from({ length: Math.min(N, ids.length) }, worker));
// the entries, one take at a time (record.mjs --entry-only writes the entry from the take's own record)
for (const r of results.filter(r => !r.code).sort((a, b) => a.id.localeCompare(b.id))) {
  const e = spawnSync(process.execPath, [path.join(KIT, 'record.mjs'), r.id, '--entry-only'], { cwd: path.dirname(APP), encoding: 'utf8' });
  if (e.status) { r.code = 1; r.out += '\n' + (e.stdout || '') + (e.stderr || ''); console.log('FAILED  ' + r.id + '  its entry could not be written'); }
}
if (flag('sheets')) {
  mkdirSync(path.join(KIT, 'out'), { recursive: true });
  for (const r of results.filter(r => !r.code)) {
    const mp4 = path.join(APP, 'demos', r.id + '.mp4');
    const n = +(spawnSync(process.env.SIS_FFPROBE || 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout || '').trim() || 300;
    const pick = Array.from({ length: 8 }, (_, i) => 'eq(n\\,' + Math.round(n * (i + .6) / 8) + ')').join('+');
    spawnSync(process.env.SIS_FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-vf', `select='${pick}',scale=520:-2,tile=4x2`, '-frames:v', '1', path.join(KIT, 'out', r.id + '-sheet.png')]);
  }
}
const bad = results.filter(r => r.code);
console.log('\n' + (results.length - bad.length) + ' recorded, ' + bad.length + ' failed' + (bad.length ? ': ' + bad.map(r => r.id).join(', ') : ''));
for (const r of bad) console.log('\n--- ' + r.id + '\n' + r.out.trim().split('\n').slice(-4).join('\n'));
process.exit(bad.length ? 1 : 0);
