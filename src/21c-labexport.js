/* ==========================================================================
   21c · Export for the McGhee Lab website (the Lab Notebook's Scientia,
   mcgheelab.com → Lab Notebook → Scientia). It writes the whole notebook as
   the JSON the site's "Upload from desktop…" takes — the same format as
   Export everything, minus what never leaves this browser (undo history,
   browser-kept files, data-folder handles) — and reports what the online
   copy can't show yet (it runs the app as of 22 Oct: no tables/plots,
   library groups, saved ink, dashed lines) and which files can't travel
   (over 30 MB, or types the site doesn't take). Nothing here changes.
   ========================================================================== */
const LABX = {
  SITE: 'https://mcgheelab.com/rm/pages/notebook.html?notebook=scientia',
  JSON_MAX: 31 * 1024 * 1024, FILE_MAX: 30 * 1024 * 1024,
  IMG_EXTS: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg', 'mp4', 'webm', 'mov', 'm4v', 'avif', 'html', 'htm', 'pdf']),
  REC_EXTS: new Set(['webm', 'm4a', 'mp4', 'ogg', 'wav', 'mp3', 'aac']),
  mb: n => (n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0) + ' MB',
  async build() {
    const data = await DB.exportAll();
    ['journal', 'blobs', 'datasets'].forEach(s => { delete data.stores[s]; delete data.counts[s]; });
    Object.assign(data, { epoch: DATA_EPOCH, build: BUILD, savedAt: new Date().toISOString(), reason: 'lab-website' });
    return data;
  },
  /** what the online copy can't show yet, and which files stay on this computer */
  report(data) {
    const B = data.stores.blocks || [], live = b => b.status !== 'removed';
    const later = [
      [B.filter(b => live(b) && b.kind === 'table').length, 'table', 'tables show as their name and first rows (the cells stay in the record)'],
      [B.filter(b => live(b) && b.kind === 'plot').length, 'plot', 'plots show as their name'],
      [(data.stores.libsets || []).length, 'library theme or group', 'kept in the record, not shown in the online Library', 'library themes and groups'],
      [(data.stores.inklib || []).length, 'saved ink drawing', 'the ink library isn’t online yet'],
      [B.reduce((n, b) => n + ((b.ink && b.ink.strokes) || []).filter(s => s.dash).length, 0), 'dashed or dotted stroke', 'drawn solid online'],
    ].filter(x => x[0]);
    const media = data.stores.media || [], files = [], stay = [];
    for (const m of media) { const ext = String(m.ext || (m.path || '').split('.').pop() || '').toLowerCase(), size = m.size || 0;
      const why = m.local && !m.path ? 'kept in this browser only — start the app with launch.bat once so it moves into images/' : !LABX.IMG_EXTS.has(ext) ? '.' + ext + ' files aren’t taken by the site (a table’s cells travel anyway)' : size > LABX.FILE_MAX ? 'over 30 MB' : null;
      (why ? stay : files).push({ name: m.name || m.id, size, why }); }
    for (const b of B.filter(x => live(x) && x.kind === 'rec' && x.rec && (x.rec.file || x.rec.path))) { const r = b.rec, ext = String(r.file || r.path).split('.').pop().toLowerCase(), size = r.bytes || 0;
      const why = !LABX.REC_EXTS.has(ext) ? '.' + ext + ' recordings aren’t taken' : size > LABX.FILE_MAX ? 'over 30 MB' : null;
      (why ? stay : files).push({ name: '♪ ' + (r.file || r.path).split('/').pop(), size, why }); }
    // the lab's cloud keeps each record as one entry of at most 1 MB
    const huge = []; for (const [store, rows] of Object.entries(data.stores)) for (const r of rows || []) { const n = JSON.stringify(r).length; if (n > 900 * 1024) huge.push({ store, name: store === 'blocks' ? M.blockName(r) + ' · ' + ((M.doc(r.docId) || {}).title || '') : (r.title || r.name || r.id), size: n }); }
    return { later, files, stay, huge };
  },
  async export() {
    toast('Preparing the export for the lab website…');
    const data = await LABX.build(), text = JSON.stringify(data), R = LABX.report(data), size = new Blob([text]).size, big = size > LABX.JSON_MAX;
    const name = 'scientia-for-mcgheelab-' + localDate(new Date()) + '.json';
    Exporter.download(name, text, 'application/json');
    const n = Object.entries(data.counts).filter(([s]) => s !== 'settings' && s !== 'profiles').reduce((a, [, c]) => a + c, 0);
    const fileBytes = R.files.reduce((a, f) => a + (f.size || 0), 0);
    const cloudOn = typeof CLOUD !== 'undefined' && CLOUD.enabled();
    modal({ title: 'Ready for the lab website', wide: true, body: h('div.lx',
      h('p.serif', { style: { marginTop: 0 } }, h('b', name), ` — ${n.toLocaleString()} records, ${LABX.mb(size)}. Saved to your downloads; nothing in this app changed.`),
      big ? h('p.lx-warn', 'This is over the 31 MB the site takes in one upload — use the desktop sync below instead of Upload.') : null,
      R.huge.length ? h('div.lx-warn', h('b', plural(R.huge.length, 'record') + ' over the cloud’s 1 MB per record — the upload would fail:'), h('ul.lx-list', R.huge.map(x => h('li', snippet(x.name, 70), ' · ', LABX.mb(x.size)))), 'Reload the app once: large ink components are split automatically.') : null,
      cloudOn ? h('p.lx-warn', 'Cloud sync with your own Firebase project is on here. Use one cloud: turn it off (Settings → Cloud sync → Turn off here) before running the lab’s desktop sync, or the two will miss each other’s changes.') : null,
      h('h5', 'Put it on the site'),
      h('ol.lx-steps',
        h('li', 'Open ', h('a', { href: LABX.SITE, target: '_blank', rel: 'noopener' }, 'the Lab Notebook → Scientia'), ' (signed in with your lab account).'),
        h('li', h('b', 'One copy, now: '), '⋯ → ', h('i', 'Upload from desktop…'), ' → pick ', h('code', name), ' → Upload. It replaces the online notebook (the site keeps a copy of what was there). Pictures, PDFs and recordings don’t travel in this file — step 3 brings them.'),
        h('li', h('b', 'Keep both in step (recommended, files too): '), 'in the same panel, ', h('i', 'Desktop sync…'), ' → make a key → download ', h('code', 'scientia-cloud.py'), ' into this app’s folder (next to launch.bat). With the app running, open a terminal there and run once ', h('code', 'py scientia-cloud.py --key <your key>'),
          ', then ', h('code', 'py scientia-cloud.py --prefer local'), ' the first time (this computer’s notebook wins), and ', h('code', 'py scientia-cloud.py'), ' from then on. Your app keeps working exactly as now — the bridge is just another device of it.')),
      h('h5', 'Files'), h('p.tiny', `${R.files.length} file${R.files.length === 1 ? '' : 's'} (${LABX.mb(fileBytes)}) go up with the desktop sync.` + (R.stay.length ? ` ${R.stay.length} stay on this computer:` : '')),
      R.stay.length ? h('ul.lx-list', R.stay.slice(0, 30).map(f => h('li', h('b', snippet(f.name, 50)), f.size ? ' · ' + LABX.mb(f.size) : '', ' — ', f.why)), R.stay.length > 30 ? h('li.muted', `… and ${R.stay.length - 30} more`) : null) : null,
      R.later.length ? [h('h5', 'Not shown online yet'), h('p.tiny', 'The site runs this app as it was on 22 Oct. These are in the export and come back to this computer unchanged; they show online once the newer app is merged into the lab’s repository.'),
        h('ul.lx-list', R.later.map(([c, what, how, many]) => h('li', h('b', c === 1 || !many ? plural(c, what) : c + ' ' + many), ' — ', how)))] : null) });
  },
};
