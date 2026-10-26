/* ==========================================================================
   21b · Export a note as its canvas — one self-contained HTML file.
   The file carries the app itself in viewer mode (98-viewer) with only this
   note's records: its components, the connections between them, regions,
   structures, terms, equations, citations, and every file it shows (PDFs,
   embedded HTML, images, slides, recordings) as data inside the file.
   Notes it refers to (pulled-in components, note cards, links, connections
   to components elsewhere) are listed on the References panel; their names
   travel, their content does not (except what this note itself displays).
   ========================================================================== */
const CANVASX = {
  ID: /\b[a-z][a-z0-9]{0,5}_[a-z0-9]{5,}\b/gi,
  /** every id-looking token in a record */
  ids(rec, into) { const s = JSON.stringify(rec); let m; CANVASX.ID.lastIndex = 0; while ((m = CANVASX.ID.exec(s))) into.add(m[0]); return into; },
  /** which store holds an id (blocks, documents and the side stores worth carrying) */
  where(id) { for (const n of ['documents', 'blocks', 'items', 'media', 'library', 'terms', 'equations', 'projects', 'themes', 'aims', 'datasets', 'reminders', 'flags', 'views', 'chores', 'templates']) { if (S[n] && S[n].has(id)) return n; } return null; },
  b64: blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }),
  async fileOf(src) { if (!src) return null; try { if (src instanceof Blob) return await CANVASX.b64(src); const r = await fetch(src); if (!r.ok) return null; return await CANVASX.b64(await r.blob()); } catch { return null; } },

  /** gather the note's records, the referenced notes and the files */
  async gather(d) {
    const own = new Set([d.id, ...d.blockIds]), blocks = M.docBlocks(d.id);
    const out = Object.fromEntries(AUTHORED.map(n => [n, []])); const put = (n, r) => { if (!out[n].some(x => x.id === r.id)) out[n].push(JSON.parse(JSON.stringify(r))); };
    put('documents', d); blocks.forEach(b => put('blocks', b));
    const refs = new Map(); const why = (docId, reason) => { if (!docId || docId === d.id || !M.doc(docId)) return; const r = refs.get(docId) || new Set(); r.add(reason); refs.set(docId, r); };
    // connections: inside the note travel, the rest become named stubs
    const outside = [];
    DB.all('wires').forEach(w => { const a = own.has(w.from), z = own.has(w.to); if (a && z) put('wires', w); else if (a || z) {
      const inId = a ? w.from : w.to, o = M.block(a ? w.to : w.from); if (!o) return; const od = M.doc(o.docId), R = REL[w.rel] || {};
      outside.push({ id: w.id, blockId: inId, dir: a ? 'out' : 'in', rel: a ? (R.label || w.rel) : (R.inv || R.label || w.rel), name: M.blockName(o), note: od ? od.title : '', noteId: od ? od.id : null });
      if (od) why(od.id, 'connection'); } });
    // components shown here that live in other notes (pulled-in components, embedded widgets, a note card's highlight)
    const scan = new Set(); blocks.forEach(b => CANVASX.ids(b, scan)); CANVASX.ids(d, scan);
    for (const b of blocks) { if (b.refBlockId) { const s = M.block(b.refBlockId); if (s && s.docId !== d.id) { put('blocks', s); CANVASX.ids(s, scan); why(s.docId, b.kind === 'ref' ? 'pulled-in component' : 'embedded widget'); } }
      if (b.kind === 'noteref' && b.refDocId) { why(b.refDocId, 'note card'); const f = b.focusId && M.block(b.focusId); if (f) { put('blocks', f); CANVASX.ids(f, scan); } } }
    // everything else the records point to (structures, files, citations, terms, equations, the project and theme)
    const seen = new Set(); const queue = [...scan];
    while (queue.length) { const id = queue.pop(); if (seen.has(id) || own.has(id)) continue; seen.add(id); const n = CANVASX.where(id); if (!n) continue;
      if (n === 'documents') { why(id, 'link'); continue; }
      if (n === 'blocks') { const b = M.block(id); if (b && b.docId !== d.id && !out.blocks.some(x => x.id === id)) why(b.docId, 'link'); continue; }
      const r = S[n].get(id); put(n, r); CANVASX.ids(r, new Set()).forEach(x => queue.push(x)); }
    // structures recorded in this note, the time spent, the project's terms
    DB.where('items', it => it.originDocId === d.id || own.has(it.blockId)).forEach(it => put('items', it));
    DB.where('sessions', s => s.docId === d.id).forEach(s => put('sessions', s));
    DB.where('terms', t => !t.projectId || t.projectId === d.projectId).forEach(t => put('terms', t));
    if (d.projectId && S.projects.get(d.projectId)) put('projects', S.projects.get(d.projectId)); if (d.themeId && S.themes.get(d.themeId)) put('themes', S.themes.get(d.themeId));
    // referenced notes travel as names only (an empty stub so titles and paths render)
    refs.forEach((r, id) => { const o = M.doc(id); put('documents', Object.assign({}, o, { synthesis: { text: '' }, regions: [], _stub: true }));
      [o.projectId && S.projects.get(o.projectId), o.themeId && S.themes.get(o.themeId)].filter(Boolean).forEach(x => put(S.projects.has(x.id) ? 'projects' : 'themes', x)); });
    out.profiles = DB.all('profiles'); out.settings = DB.all('settings').filter(s => s.id === 'main');
    // files: media (PDFs, HTML, images, slides) and recordings
    const files = {}; let bytes = 0, missing = [];
    for (const m of out.media) { const live = MEDIA.get(m.id); const data = await CANVASX.fileOf(MEDIA.url(live) || null); if (data) { files['media:' + m.id] = data; bytes += data.length; } else missing.push(m.name || m.id); delete m.path; m.local = true; }
    for (const b of out.blocks.filter(x => x.kind === 'rec' || x.rec)) { const live = M.block(b.id); let src = null; try { src = REC.src(live); } catch { } const data = await CANVASX.fileOf(src); if (data) { files['rec:' + b.id] = data; bytes += data.length; } }
    const refList = [...refs].map(([id, r]) => { const o = M.doc(id); return { id, title: o.title, type: o.type, path: M.docPath(o), created: o.created, modified: o.modified, why: [...r] }; });
    const cites = []; try { const nums = ED.citeNumbers(d); nums.forEach((n, id) => { const L = M.lib(id); if (L) cites.push({ n, text: LIB.apa(L) }); }); } catch { }
    return { stores: out, files, outside, refs: refList, cites, bytes, missing };
  },

  async export(id) {
    const d = M.doc(id); if (!d) return; toast('Preparing the canvas export…');
    let src; try { const r = await fetch(location.pathname.endsWith('/') ? location.pathname + 'scientia.html' : location.pathname, { cache: 'no-store' }); if (!r.ok) throw 0; src = await r.text(); }
    catch { return toast('Can’t read the app file to build the export (open the app from its own address)'); }
    const g = await CANVASX.gather(d);
    const data = { v: 1, docId: d.id, title: d.title, at: isoLocal(new Date()), build: BUILD, stores: g.stores, files: g.files, outside: g.outside, refs: g.refs, cites: g.cites };
    const js = JSON.stringify(data).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
    // the lab's web build carries its layer (the target flag, the cloud shim, lab mode): the export runs on its own, without them
    const web = [/<script>window\.SIS_TARGET = 'web';<\/script>\s*/g, new RegExp('<script src="(?:cloud' + '-sync|lab-mode)\\.js[^"]*"><\/script>\\s*', 'g')];
    const html = web.reduce((s, rx) => s.replace(rx, ''), src).replace(/<link rel="manifest"[^>]*>\s*/, '').replace(/<title>[^<]*<\/title>/, `<title>${esc(d.title)} · Scientia In Situ</title>`)
      .replace('<head>', `<head>\n<script>window.SIS_EXPORT = ${js};</script>`);
    Exporter.download(Exporter.slug(d.title || 'note') + '.html', html);
    toast(`Canvas exported · ${(html.length / 1048576).toFixed(1)} MB` + (g.missing.length ? ` · ${plural(g.missing.length, 'file')} couldn’t be read: ` + g.missing.slice(0, 3).join(', ') : ''), 4500);
  },
};
// the note's "Export" now gives the canvas
Exporter.doc = id => CANVASX.export(id);
