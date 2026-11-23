/* ==========================================================================
   13g · Embedded HTML pages (a plot exported from Python, a report, an
   interactive figure). The file is stored in images/ like any media and
   shown in a sandboxed frame: its scripts run, but it cannot reach the
   app's data. Resize from the corner; hover for maximise.
   ========================================================================== */
const EMBED = {
  SANDBOX: 'allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-popups-to-escape-sandbox',
  async insert(d, p) {
    PLATE.pickFiles(async files => {
      const f = files[0]; if (!f) return; toast('Adding ' + f.name + '…');
      const rec = await MEDIA.add(f); if (rec.kind !== 'html') { toast('That is not an HTML file'); return; }
      const b = M.addBlock(d.id, null, { kind: 'html', label: f.name.replace(/\.html?$/i, ''), media: rec.id, x: p.x, y: p.y, w: 616, h: 400 });
      b.body = { text: (b.label || 'HTML') + ' · ' + rec.name, marks: [] }; DB.put('blocks', b); changed();
      toast(rec.local ? 'Kept in this browser until the app is started with launch.bat' : 'Saved in the app’s images folder');
    }, false, '.html,.htm,text/html');
  },
  frame(rec, cls) { return h('iframe' + (cls ? '.' + cls : ''), { src: MEDIA.url(rec), sandbox: EMBED.SANDBOX, loading: 'lazy', referrerpolicy: 'no-referrer', title: rec.name }); },
  body(b, d, pane, ro) {
    const rec = MEDIA.get(b.media);
    if (!rec) return h('div.embed-missing', 'The HTML file is missing.');
    const fr = EMBED.frame(rec), wrap = h('div.embed.nopan', { style: { height: (b.h || 400) + 'px' } }, fr,
      h('div.embed-tools', h('button', { title: 'Maximise', on: { click: () => EMBED.max(b) } }, '⛶'), h('button', { title: 'Reload', on: { click: () => { fr.src = MEDIA.url(rec); } } }, '⟳'),
        h('a', { href: MEDIA.url(rec), target: '_blank', rel: 'noopener', title: 'Open in a new tab' }, '↗'),
        ro ? null : h('button', { title: 'Replace the file', on: { click: () => PLATE.pickFiles(async fs => { const r = await MEDIA.add(fs[0]); if (r.kind !== 'html') return toast('That is not an HTML file'); b.media = r.id; b.body = { text: (b.label || 'HTML') + ' · ' + r.name, marks: [] }; DB.put('blocks', b); changed(); }, false, '.html,.htm,text/html') } }, '⇄')),
      ro ? null : h('div.embed-rz', { title: 'Drag to resize' }));
    if (!ro) $('.embed-rz', wrap).addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); const box = wrap.closest('.box'), z = pane.paper.view.z, x0 = e.clientX, y0 = e.clientY, w0 = box.offsetWidth, h0 = wrap.offsetHeight;
      document.body.classList.add('resizing');
      const mv = ev => { const w = w0 + (ev.clientX - x0) / z, hh = h0 + (ev.clientY - y0) / z; b.w = ev.shiftKey ? PTUNE.cells(w, 280) : Math.max(280, Math.round(w)); b.h = ev.shiftKey ? PTUNE.cells(hh, 120) : Math.max(120, Math.round(hh)); box.style.width = b.w + 'px'; wrap.style.height = b.h + 'px'; pane.drawWires(); };   // V3.942 — no largest size; V4.106 — Shift: a grid cell at a time
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.body.classList.remove('resizing'); const G = PTUNE.snap(); b.w = Math.round(b.w / G) * G; b.h = Math.round(b.h / G) * G; box.style.width = b.w + 'px'; wrap.style.height = b.h + 'px'; DB.put('blocks', b); DB.beginGroup(); pane.settle && pane.settle(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    return wrap;
  },
  max(b) {
    const rec = MEDIA.get(b.media); if (!rec) return;
    const ov = h('div.embed-max'), close = () => { ov.remove(); document.removeEventListener('keydown', key, true); }, key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    ov.append(h('div.em-bar', h('b', b.label || rec.name), h('span.tiny.muted', rec.name), h('span.spacer'), h('a.btn.sm', { href: MEDIA.url(rec), target: '_blank', rel: 'noopener' }, 'Open in a new tab ↗'), h('button.btn.sm', { on: { click: close } }, 'Close ✕')), EMBED.frame(rec, 'em-frame'));
    document.body.append(ov); document.addEventListener('keydown', key, true);
  },
};
WIDGETS.html = { label: 'html page', w: 616, body: EMBED.body, menu: b => [{ label: 'Maximise', run: () => EMBED.max(b) }] };
INSERTS.push({ id: 'html', group: 'Widgets', icon: '⧉', label: 'HTML file…', sub: 'An exported plot, report or page — resizable, maximise on hover', run: (d, p) => EMBED.insert(d, p) });
