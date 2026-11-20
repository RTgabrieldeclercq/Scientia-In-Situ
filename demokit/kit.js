// Page-side helpers for the demonstrations' test notes. record.mjs runs this file in the app, on its empty profile, before a
// script's `setup`; a setup then builds its made-up notes with KIT.* and the app's own model (M, DB). Nothing here ships
// in the app: it only ever runs in the recorder's Chrome.
window.KIT = {
  /** The date n days ago, as the app writes dates (YYYY-MM-DD). */
  day(n) { const d = new Date(); d.setDate(d.getDate() - (n || 0)); return localDate(d); },
  /** A moment n days ago at 'HH:MM'. */
  at(n, hm) { const d = new Date(); d.setDate(d.getDate() - (n || 0)); const [h, m] = String(hm || '10:00').split(':').map(Number); d.setHours(h, m, 0, 0); return d; },
  project: name => M.createProject(name || 'Traction on soft gels'),
  theme: (p, name, question) => M.createTheme(p.id, name, question || ''),
  /** A note: KIT.note(project, 'Run 3', { type: 'note', themeId, daysAgo: 3 }). It comes with one empty component (KIT.first). */
  note(p, title, o = {}) { return M.createDoc({ type: o.type || 'note', projectId: p ? p.id : null, themeId: o.themeId || null, title, date: o.daysAgo ? KIT.day(o.daysAgo) : undefined }); },
  /** The components of a note, in order. */
  boxes: d => (M.doc(d.id).blockIds || []).map(id => M.block(id)).filter(b => b && b.kind === 'component' && b.status === 'live'),
  first: d => KIT.boxes(d)[0],
  /** Write into a component: its label, its text, and (optionally) its kind — 'hypothesis', 'question', 'result', 'method'… */
  fill(b, label, text, ck) { b.label = label; b.body = { text: text || '', marks: [] }; if (ck) b.ckind = ck; DB.put('blocks', b); return b; },
  /** A new component at x, y on the paper (the note's first component sits at KIT.first(d).x / .y; a column is 460 wide, a row about 170 high). */
  box(d, label, text, o = {}) { const b = M.addBlock(d.id, null, { kind: 'component', x: o.x, y: o.y, w: o.w || 392, label }); KIT.fill(b, label, text, o.ck); if (o.daysAgo) KIT.ago(b, o.daysAgo, o.hm); return b; },
  /** Components laid out in two columns from the note's first one (which becomes the first item): KIT.grid(d, [['Idea', 'text', 'hypothesis'], ['Question', 'text'], …]). */
  grid(d, items, o = {}) { const a = KIT.first(d), cols = o.cols || 2, dx = o.dx || 460, dy = o.dy || 170;
    return items.map(([label, text, ck], i) => i === 0 ? KIT.fill(a, label, text, ck) : KIT.box(d, label, text, { x: a.x + (i % cols) * dx, y: a.y + Math.floor(i / cols) * dy, ck })); },
  /** Make a component look written n days ago at 'HH:MM' (its stamp, its dates). */
  ago(b, n, hm) { const t = KIT.at(n, hm); b.created = isoLocal(t); b.made = isoLocal(t); b.modified = isoLocal(t); try { b.stamp = M.stampFor(b.docId, t); } catch (e) { } DB.put('blocks', b); return b; },
  /** One of the made-up files in demokit/assets as a File: await KIT.asset('paper-okafor-2021.pdf'). */
  async asset(name) { const r = await fetch('demokit/assets/' + name); if (!r.ok) throw new Error('no asset ' + name); const blob = await r.blob();
    const type = /\.pdf$/.test(name) ? 'application/pdf' : /\.html$/.test(name) ? 'text/html' : /\.png$/.test(name) ? 'image/png' : /\.jpe?g$/.test(name) ? 'image/jpeg' : blob.type; return new File([blob], name, { type }); },
  /** Today as a note's title has it: 'Wed 18 Nov'. A title may say {today}: any note made while a script sets up gets it filled in. */
  today() { return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''); },
  /** After the notes are made. */
  done() { try { IX.rebuild(); } catch (e) { } changed(); },
};
{ const make = M.createDoc; M.createDoc = function (o) { return make.call(M, o && o.title ? Object.assign({}, o, { title: String(o.title).replace('{today}', KIT.today()) }) : o); }; }
