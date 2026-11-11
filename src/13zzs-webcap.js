/* ==========================================================================
   13zzs · Websites kept as they were (V3.971 — Gabe: "add websites as a
   component, and should behave like a PDF/HTML viewer. The website should
   not be visited, but instead saved as a mere copy of what that webpage is,
   so that if it ever gets taken down, then it will remain in the note as it
   was the moment it was captured").
   • + Insert → Website… (or /website): the address; the app's server
     (serve.py → webcap.py, on the computer that runs the app, for it and
     the devices paired with it) fetches the page once and saves one
     self-contained file in the notebook's images/ — styles, images and
     fonts inside it, the site's scripts and frames taken out, a policy that
     forbids any request to the network when it is shown (the answer to the
     app stays small). That file is the component: an HTML page
     component (13g, with quoting, snips and ink labels), or a PDF when the
     address is a PDF. Opening the note never visits the site.
   • The strip under its header says when and from where it was saved;
     ↗ Live page opens the site in the browser, only when clicked;
     ⟳ Capture again saves it anew as the next version, on the deck (13zzq),
     the earlier copy kept beneath.
   • b.web = { url, final, title, at, size, missing, icon }.
   ========================================================================== */
const WEBCAP = {
  NO_SERVER: 'Capturing a website needs the app on your computer (or a device paired with it): the copy is saved in your notebook, and the sync brings it here',
  norm(s) { s = String(s || '').trim(); if (!s) return ''; if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/+/, ''); return s; },
  host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } },
  file: (j, ext) => (String(j.title || WEBCAP.host(j.final || '')).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'page') + '.' + ext,
  async ask(d, p) {
    const v = await askText('A website', 'Its address: the page is saved as it is now, in the note — the live page is never loaded again', '', { placeholder: 'https://…' });
    if (v && v.trim()) return WEBCAP.capture(d, p, WEBCAP.norm(v));
  },
  /** The app's server fetches it and saves it as the media file id: { ok, kind: 'html' | 'pdf', ext, path, size, title, final, at, missing, icon } or { ok: false, error }. */
  async fetch(url, id) {
    let r; try { r = await fetch('api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, id }) }); } catch { return { ok: false, error: WEBCAP.NO_SERVER }; }
    let j = null; try { j = await r.json(); } catch { }
    if (!j || r.status === 404 || (!j.ok && !j.error)) return { ok: false, error: WEBCAP.NO_SERVER };
    return j;
  },
  /** Saves the page at url as a component at p in note d; from: the version it captures again (the new one goes on its deck). */
  async capture(d, p, url, from) {
    if (WEBCAP.busy) return toast('Still capturing the last one…'); WEBCAP.busy = true;
    toast('Capturing ' + WEBCAP.host(url) + '… (the page and everything it shows)', 60000);
    const id = uid('m'); let j; try { j = await WEBCAP.fetch(url, id); } finally { WEBCAP.busy = false; $$('#toasts > .toast').forEach(t => { if (/^Capturing /.test(t.textContent)) t.remove(); }); }
    if (!j.ok) return toast('Not captured: ' + (j.error || 'the page did not come'), 7000);
    // the media record of the file the server saved (as MEDIA.add makes one), then the component (as + Insert makes an HTML page or a PDF)
    const pdf = j.kind === 'pdf', ext = pdf ? 'pdf' : 'html', now = isoLocal(new Date());
    DB.put('media', { id, kind: ext, ext, name: WEBCAP.file(j, ext), mime: pdf ? 'application/pdf' : 'text/html', size: j.size || 0, w: 0, h: 0, dur: null, created: now, path: j.path || `images/${id}.${ext}` });
    const web = { url, final: j.final || url, title: j.title || '', at: j.at || now, size: j.size || 0, missing: j.missing || 0, icon: j.icon || null }, title = web.title || WEBCAP.host(web.final);
    const b = M.addBlock(d.id, null, Object.assign({ kind: ext, label: title.slice(0, 120), media: id, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: pdf ? 616 : 728, h: 560, web }, pdf ? { view: 'scroll', cur: 0 } : {}));
    b.body = { text: title + ' · ' + web.final + ' · saved ' + fmtDayLong(web.at), marks: [] }; DB.put('blocks', b);
    if (from && M.block(from.id)) { ITER.attach(b.id, from.id, { x: from.x || 0, y: from.y || 0 }); const nb = M.block(b.id); if (nb && nb.iter && !nb.iter.why) { nb.iter.why = 'Saved again ' + fmtDayLong(web.at) + ' ' + fmtTime(web.at); DB.put('blocks', nb); changed(); } }
    else changed();
    if (pdf) try { PDFW.words(b); } catch (e) { }
    toast((from ? 'Captured again — the new copy is on top of the deck, ' : 'Saved — ') + title + (web.missing ? ' (' + plural(web.missing, 'part') + ' of the page didn’t come)' : ''), 5000);
    return b;
  },
  again(b) { const cur = M.block(b.id); if (!cur || !cur.web) return; const d = M.doc(cur.docId); if (!d) return; WEBCAP.capture(d, { x: cur.x || 0, y: cur.y || 0 }, cur.web.url, cur); },
  /** The strip under the header: when, from where, the live page, capture again. */
  strip(b, ro) {
    const w = b.web, host = WEBCAP.host(w.final || w.url);
    return h('div.web-strip.nopan', { title: (w.title || host) + '\n' + (w.final || w.url) },
      w.icon ? h('img.ws-ic', { src: w.icon, alt: '' }) : h('span.ws-ic.ws-g', '◍'),
      h('span.ws-t', 'Saved ', fmtDayLong(w.at), ' ', fmtTime(w.at), ' from ', h('b', host)),
      h('span.ws-n', 'a copy: the live page is never loaded' + (w.missing ? ' · ' + plural(w.missing, 'part') + ' didn’t come' : '')),
      h('span.spacer'),
      h('a.btn.xs', { href: w.final || w.url, target: '_blank', rel: 'noopener noreferrer', title: 'Open the live page in your browser — it may have changed, or be gone', on: { click: e => e.stopPropagation() } }, '↗ Live page'),
      ro ? null : h('button.btn.xs', { type: 'button', title: 'Save it again as it is now: the next version, on the deck, this copy kept beneath', on: { click: e => { e.stopPropagation(); WEBCAP.again(b); } } }, '⟳ Capture again'));
  },
};
INSERTS.push({ id: 'website', group: 'Widgets', icon: '◍', label: 'Website…', sub: 'A web page saved in the note as it is now — kept even if the site goes away; the live page is never loaded', run: (d, p) => WEBCAP.ask(d, p) });
{
  // the strip under the header
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments);
    if (el && b && b.web && (b.kind === 'html' || b.kind === 'pdf')) { const bh = $(':scope > .bh', el); if (bh) bh.after(WEBCAP.strip(b, !!this.travel)); el.classList.add('website'); }
    return el; };
  // the notebook folder's Markdown says where and when it came from
  const vc = VAULT.component; VAULT.component = function (b, d, P) { const md = vc.apply(this, arguments); if (!b || !b.web) return md;
    return md + '\n- Website saved ' + b.web.at.replace('T', ' ').slice(0, 16) + ' from <' + (b.web.final || b.web.url) + '>' + (b.web.final && b.web.final !== b.web.url ? ' (asked for <' + b.web.url + '>)' : '') + '\n'; };
}
