/* ==========================================================================
   15h · Protocols in the Portfolio (V4.69). Gabe, 20 Nov: "Make sure that
   Protocols are added in Portfolio view as a new section under the projects or
   themes they are a part of."
   Every project and every theme in the open project gets a Protocols section,
   beside its Experiments and Notes (the same look: a header box in a colour of
   its own, then one row per protocol). What is in it:
   - the protocol notes filed there: a theme's own (type "protocol", themeId),
     and a project's with no theme, in its Project-wide section (a protocol note
     is a Notes entry no longer);
   - and, Settings → Protocols in the Portfolio → "Protocols run here too", the
     protocols the notes of that theme (or the project-wide notes) RUN — a run
     of a registered protocol — even when the protocol is filed in another theme
     or project: shown once, marked "⟲ 3" (its runs here) and "from <where it is
     filed>". A protocol filed here shows its run count too.
   The Notes / Experiments switch gains Protocols (only them, theme by theme)
   with its count; "+ Protocol" in a section's header starts a protocol note
   there (a theme's, or the project-wide one). The look of the Portfolio is
   untouched: it is drawn with the same classes, one more group and one more
   header colour (--sec-proto, 42-pfprotocols.css).
   PFPROTO: on · used · is · runs · entries · row · group.
   Settings → Tabs & overview → Protocols in the Portfolio (pfprotocols, 20a).
   ========================================================================== */
const PFPROTO = {
  on: () => typeof FEAT === 'undefined' || FEAT.on('pfprotocols'),
  used: () => typeof FEAT === 'undefined' || FEAT.tune('pfprotocols', 'used') !== false,
  empty: () => typeof FEAT === 'undefined' || FEAT.tune('pfprotocols', 'empty') !== false,
  is: d => !!d && d.type === 'protocol' && !d.deleted,
  _runs: null, _n: null,
  /** The live runs of registered protocols, by the note they are in — one pass a drawing. */
  runs() {
    if (PFPROTO._runs) return PFPROTO._runs; const m = new Map();
    DB.all('blocks').forEach(b => { if (b.kind !== 'run' || b.status === 'removed') return; (m.get(b.docId) || m.set(b.docId, []).get(b.docId)).push(b); });
    return (PFPROTO._runs = m);
  },
  /** The protocols of a section's notes: [{ doc (the protocol note), here (filed in this section), runs [the run blocks here] }] — filed ones first, in the project's order. */
  entries(docs, order) {
    const out = new Map(), filed = docs.filter(PFPROTO.is);
    PFKIT.entries(filed, order).forEach(e => (e.doc ? [e.doc] : e.docs).forEach(d => out.set(d.id, { doc: d, here: true, runs: [] })));
    docs.forEach(d => { if (PFPROTO.is(d)) return; (PFPROTO.runs().get(d.id) || []).forEach(r => {
      const def = M.block(r.protocolId), home = def && def.status !== 'removed' && def.registered && M.doc(def.registered.docId); if (!home || home.deleted) return;
      let e = out.get(home.id); if (!e) { if (!PFPROTO.used()) return; e = { doc: home, here: false, runs: [] }; out.set(home.id, e); } e.runs.push(r); }); });
    const all = [...out.values()], here = all.filter(e => e.here), far = all.filter(e => !e.here).sort((a, b) => b.runs.length - a.runs.length || String(a.doc.title).localeCompare(String(b.doc.title)));
    return [...here, ...far];
  },
  /** Where a protocol is filed, for "from …": the theme or "project-wide" in this project; the project's name too from another. */
  where(d, row) { const p = M.project(d.projectId), t = d.themeId && M.theme(d.themeId), same = row && row.p && p && p.id === row.p.id;
    return same ? (t ? t.name : 'project-wide') : (p ? p.name : 'no project') + (t ? ' › ' + t.name : d.projectId ? ' · project-wide' : ''); },
  /** One protocol: the note's row, with its runs here and where it is filed when that is elsewhere. */
  row(e, row) {
    const el = PFLIST.note(e.doc, row), at = el.querySelector(':scope > .spacer'), docs = [...new Set(e.runs.map(r => (M.doc(r.docId) || {}).title).filter(Boolean))];
    const bits = [e.runs.length ? h('span.pf-prun', { title: plural(e.runs.length, 'run') + ' here' + (docs.length ? ' — ' + docs.slice(0, 6).join(', ') + (docs.length > 6 ? '…' : '') : '') }, '⟲ ' + e.runs.length) : null,
      e.here ? null : h('span.pf-tail', { title: 'This protocol is filed in ' + PFPROTO.where(e.doc), }, 'from ' + PFPROTO.where(e.doc, row))];
    bits.forEach(b => { if (b) el.insertBefore(b, at); });
    return el;
  },
  group(E, row, c) {
    const add = !row.general && !row.readOnly && row.p ? h('button.btn.xs.pf-proto-add', { type: 'button', title: 'A new protocol note in ' + (c && c.t ? 'this theme' : 'this project, not tied to a theme'),
      on: { click: e => { e.stopPropagation(); App.newDoc({ type: 'protocol', projectId: row.p.id, themeId: c && c.t ? c.t.id : null }); } } }, '+ Protocol') : null;
    return h('div.pf-g.pf-gproto', { 'data-g': 'proto' }, h('div.pf-gl', h('span', 'Protocols'), h('span.pf-c', E.length)), add,   // the button beside the header's box, not inside it
      E.length ? E.map(e => PFPROTO.row(e, row)) : h('div.pf-none', 'No protocol yet — + Protocol'));
  },
};
{
  const bg = PFLIST.begin; PFLIST.begin = function () { PFPROTO._runs = null; return bg.apply(this, arguments); };
  // a protocol note is a Protocols entry, not a Notes one
  const sp = PFLIST.split; PFLIST.split = function (docs, order) { return PFPROTO.on() ? sp.call(this, docs.filter(d => !PFPROTO.is(d)), order) : sp.apply(this, arguments); };
  const cn = PFLIST.counts; PFLIST.counts = function (I, th) {
    const n = cn.apply(this, arguments); if (!PFPROTO.on()) return n; let p = 0, order = 'date';
    I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { p += PFPROTO.entries(c.docs, order).length; });
    n.proto = p; n.all += p; PFPROTO._n = n; return n;
  };
  // each section's Protocols, under its Experiments and Notes
  const sec = PFLIST.section; PFLIST.section = function (row, c, body) {
    try { if (PFPROTO.on() && c && body && body.classList && body.classList.contains('pf-groups')) { const E = PFPROTO.entries(c.docs, row.p ? PFKIT.sortOf(row.p.id) : 'date');
      if (E.length || (PFPROTO.empty() && !c.bare && row.p && !row.readOnly)) body.append(PFPROTO.group(E, row, c)); } } catch (e) { console.warn('[pfprotocols]', e); }
    return sec.apply(this, arguments);
  };
  // the switch: Protocols only, theme by theme
  const it = PFLIST.items; PFLIST.items = function (row, I, type, th) {
    if (type === 'proto' && !PFPROTO.on()) return it.call(this, row, I, 'all', th);
    if (type !== 'proto') return it.apply(this, arguments);
    const order = row.p ? PFKIT.sortOf(row.p.id) : 'date', out = [], add = el => { el.style.setProperty('--i', out.length); out.push(el); };
    I.parts.secs.filter(c => th === 'all' || (c.t && c.t.id === th)).forEach(c => { const E = PFPROTO.entries(c.docs, order); if (E.length) add(PFLIST.section(row, c, h('div.pf-flat', E.map(e => PFPROTO.row(e, row))))); });
    if (!out.length) add(h('div.pf-none', th !== 'all' ? 'No protocol in this theme yet' : 'No protocol here yet — + Protocol in a section, or register one from a note'));
    try { if (typeof PFICON !== 'undefined' && PFICON.on()) out.forEach(el => PFICON.dress(el)); } catch (e) { }
    return out;
  };
  const sg = PFLIST.seg; PFLIST.seg = function (opts, cur, onPick, label) {
    if (PFPROTO.on() && Array.isArray(opts) && opts.some(o => o[0] === 'notes') && !opts.some(o => o[0] === 'proto')) {
      const i = opts.findIndex(o => o[0] === 'lit'); opts = opts.slice(); opts.splice(i < 0 ? opts.length : i, 0, ['proto', 'Protocols', PFPROTO._n ? PFPROTO._n.proto : null]);
    }
    return sg.call(this, opts, cur, onPick, label);
  };
  // its icon: the clipboard (rm/js/icons.js, clipboard-document-list), in the colour of its own
  if (typeof PFICON !== 'undefined') {
    PFICON.PATHS['clipboard-document-list'] = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"/>';
    PFICON.BY.proto = 'clipboard-document-list';
  }
}
