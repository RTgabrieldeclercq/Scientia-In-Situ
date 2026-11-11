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
   • b.web = { url, final, title, at, size, missing, icon, via? }.
   V3.977 — most journals let only a person at a browser in (a 403, a 429, a check for robots), and the website has no
   computer to fetch from. So a page the person saved in their browser ("Webpage, Single File", an .mhtml) becomes the
   same component: read here (fromMhtml → mhtml), made self-contained as webcap.py makes a capture (its own pictures,
   stylesheets and fonts inlined, its scripts and frames out, links to the live page, the same no-network policy),
   web.via = 'saved'. Dropped or pasted on a note (13zu2), chosen in the Website… dialog, or offered when a capture is
   refused; dropped on a website component it becomes that component's next version.
   ========================================================================== */
const WEBCAP = {
  NO_SERVER: 'Capturing from an address needs the app on your computer (or a device paired with it). Here, open the page in your browser, save it as “Webpage, Single File” (Ctrl+S, an .mhtml file) and add that file',
  CSP: "default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' blob:; frame-src blob: data: about:; connect-src 'none'; form-action 'none'",   // webcap.py's
  norm(s) { s = String(s || '').trim(); if (!s) return ''; if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/+/, ''); return s; },
  host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } },
  file: (j, ext) => (String(j.title || WEBCAP.host(j.final || '')).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'page') + '.' + ext,
  ask(d, p) {
    const inp = h('input.inp', { placeholder: 'https://…', style: { width: '100%' } }), go = () => { const v = inp.value.trim(); if (!v) return false; WEBCAP.capture(d, p, WEBCAP.norm(v)); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && go() !== false) m.close(); });
    const m = modal({ title: 'A website', body: h('div.webcap-ask', h('label.f', h('span', 'Its address: the page is saved as it is now, in the note — the live page is never loaded again'), inp),
      h('p.tiny.muted', { style: { margin: '14px 0 6px' } }, 'A site that lets only a person at a browser in (most journals): open the page in Chrome or Edge, save it as “Webpage, Single File” (Ctrl+S), and add that file — or drop it on the note.'),
      h('button.btn.sm', { type: 'button', on: { click: () => { m.close(); WEBCAP.pickSaved(d, p); } } }, 'Add a page saved in the browser (.mhtml)…')),
      actions: [{ label: 'Cancel' }, { label: 'Capture', pri: true, run: go }] });
  },
  pickSaved(d, p, from) { PLATE.pickFiles(fs => { if (fs[0]) WEBCAP.fromMhtml(d, p, fs[0], from); }, false, '.mhtml,.mht,multipart/related,message/rfc822'); },
  /** Not captured: why, and the saved page instead (as the next version when it was a capture again). */
  refused(d, p, why, from) {
    const m = modal({ title: 'Not captured', body: h('div', h('p', why || 'The page did not come.'),
      h('button.btn.sm', { type: 'button', on: { click: () => { m.close(); WEBCAP.pickSaved(d, p, from); } } }, from ? 'Add the page saved in the browser, as the next version (.mhtml)…' : 'Add a page saved in the browser (.mhtml)…')),
      actions: [{ label: 'Close' }] });
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
    if (!j.ok) return WEBCAP.refused(d, p, j.error, from);
    // the media record of the file the server saved (as MEDIA.add makes one), then the component (as + Insert makes an HTML page or a PDF)
    const pdf = j.kind === 'pdf', ext = pdf ? 'pdf' : 'html', now = isoLocal(new Date());
    DB.put('media', { id, kind: ext, ext, name: WEBCAP.file(j, ext), mime: pdf ? 'application/pdf' : 'text/html', size: j.size || 0, w: 0, h: 0, dur: null, created: now, path: j.path || `images/${id}.${ext}` });
    return WEBCAP.make(d, p, id, ext, { url, final: j.final || url, title: j.title || '', at: j.at || now, size: j.size || 0, missing: j.missing || 0, icon: j.icon || null }, from);
  },
  /** The component of a saved copy (media id, 'html' | 'pdf'); from: the version it saves again. */
  make(d, p, id, ext, web, from) {
    const pdf = ext === 'pdf', title = web.title || WEBCAP.host(web.final);
    const b = M.addBlock(d.id, null, Object.assign({ kind: ext, label: title.slice(0, 120), media: id, x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: pdf ? 616 : 728, h: 560, web }, pdf ? { view: 'scroll', cur: 0 } : {}));
    b.body = { text: title + ' · ' + web.final + ' · saved ' + fmtDayLong(web.at), marks: [] }; DB.put('blocks', b);
    if (from && M.block(from.id)) { ITER.attach(b.id, from.id, { x: from.x || 0, y: from.y || 0 }); const nb = M.block(b.id); if (nb && nb.iter && !nb.iter.why) { nb.iter.why = 'Saved again ' + fmtDayLong(web.at) + ' ' + fmtTime(web.at); DB.put('blocks', nb); changed(); } }
    else changed();
    if (pdf) try { PDFW.words(b); } catch (e) { }
    toast((from ? 'Saved again — the new copy is the next version, ' : 'Saved — ') + title + (web.missing ? ' (' + plural(web.missing, 'part') + ' of the page didn’t come)' : ''), 5000);
    return b;
  },
  /** V3.977 — a page saved in the browser ("Webpage, Single File"), made a component here; from: the version it saves again. */
  async fromMhtml(d, p, file, from) {
    if (file.size > 150 * 1048576) return toast('That saved page is over 150 MB — too large to keep in a note', 6000);
    toast('Reading the saved page ' + (file.name || '') + '…', 60000); let j;
    try { j = WEBCAP.mhtml(await file.arrayBuffer(), file); } catch (e) { j = { ok: false, error: 'it could not be read (' + (e && e.message || e) + ')' }; }
    finally { $$('#toasts > .toast').forEach(t => { if (/^Reading the saved page/.test(t.textContent)) t.remove(); }); }
    if (!j.ok) return toast('Not added: ' + j.error, 7000);
    const rec = await MEDIA.add(new File([j.html], WEBCAP.file({ title: j.title, final: j.url }, 'html'), { type: 'text/html' }));
    const cur = from && M.block(from.id);
    return WEBCAP.make(d, p, rec.id, 'html', { url: j.url, final: j.url, title: j.title, at: j.at, size: rec.size || j.html.length, missing: j.missing, icon: j.icon, via: 'saved' }, cur && cur.status === 'live' ? cur : null);
  },
  /** An MHTML file → { ok, html, title, url, at, missing, icon } | { ok: false, error }. Only what the file holds is used: nothing is fetched. */
  mhtml(buf, file) {
    const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));   // one char a byte
    const cut = t => { const m = /\r?\n\r?\n/.exec(t); return m ? [t.slice(0, m.index), t.slice(m.index + m[0].length)] : [t, '']; };
    const heads = t => { const H = {}; t.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const i = l.indexOf(':'); if (i > 0) H[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }); return H; };
    const param = (v, k) => { const m = new RegExp('(?:^|;)\\s*' + k + '\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))', 'i').exec(v || ''); return m ? (m[1] != null ? m[1] : m[2]) : ''; };
    const part = (hd, body) => { const H = heads(hd), ct = H['content-type'] || 'text/plain'; return { type: ct.split(';')[0].trim().toLowerCase(), charset: param(ct, 'charset'), enc: (H['content-transfer-encoding'] || '').toLowerCase(), loc: H['content-location'] || '', cid: (H['content-id'] || '').replace(/^<|>$/g, ''), raw: body }; };
    const [h0, b0] = cut(s.replace(/^\s+/, '')), H = heads(h0), ct = H['content-type'] || '', bd = param(ct, 'boundary'), parts = [];
    if (/^multipart\//i.test(ct) && bd) {
      const chunks = b0.split('--' + bd); for (let i = 1; i < chunks.length; i++) { const c = chunks[i]; if (c.startsWith('--')) break; const [ph, pb] = cut(c.replace(/^[ \t]*\r?\n/, '')); parts.push(part(ph, pb.replace(/\r?\n$/, ''))); }
    } else if (ct) parts.push(part(h0, b0));
    const main = parts.find(P => P.type === 'text/html' || P.type === 'application/xhtml+xml');
    if (!main) return { ok: false, error: 'there is no page in that file — save the page in Chrome or Edge as “Webpage, Single File”' };
    const byLoc = new Map(), byCid = new Map(); parts.forEach(P => { if (P.loc && !byLoc.has(P.loc)) byLoc.set(P.loc, P); if (P.cid) byCid.set(P.cid, P); });
    const url = H['snapshot-content-location'] || main.loc || '';
    const R = { missing: 0, icon: null, find(u, base) { u = String(u || '').trim(); if (!u) return null; if (/^cid:/i.test(u)) return byCid.get(u.slice(4)) || null; let a; try { a = new URL(u, base || url || undefined).href; } catch { return byLoc.get(u) || null; } return byLoc.get(a) || byLoc.get(a.replace(/#.*$/, '')) || byLoc.get(u) || null; } };
    const dt = new Date(H.date || ''), at = isoLocal(isNaN(dt) ? new Date(file && file.lastModified || Date.now()) : dt);
    const out = WEBCAP.mpage(main, R, url, at), subj = WEBCAP.words(H.subject || '');
    return { ok: true, html: out.html, title: (out.title || subj || (file && file.name || '').replace(/\.mht(ml)?$/i, '')).slice(0, 300), url, at, missing: R.missing, icon: R.icon };
  },
  /** A part's bytes (one char a byte), its text, a data: URL of it. */
  bytes(P) { if (P.enc === 'base64') return atob(P.raw.replace(/[^A-Za-z0-9+/=]/g, '')); if (P.enc === 'quoted-printable') return P.raw.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16))); return P.raw; },
  text(P) { const b = WEBCAP.bytes(P), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i) & 255;
    let cs = P.charset; if (!cs && /html/.test(P.type)) { const m = /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(b.slice(0, 4096)); cs = m && m[1]; }
    try { return new TextDecoder(cs || 'utf-8').decode(u); } catch { return new TextDecoder('utf-8').decode(u); } },
  uri(P) { return P._uri || (P._uri = 'data:' + (P.type || 'application/octet-stream') + ';base64,' + (P.enc === 'base64' ? P.raw.replace(/[^A-Za-z0-9+/=]/g, '') : btoa(WEBCAP.bytes(P)))); },
  /** "=?utf-8?Q?…?=" in a header, as words. */
  words(v) { return String(v).replace(/=\?([^?]+)\?([QqBb])\?([^?]*)\?=\s*/g, (m, cs, e, t) => { try { const b = /b/i.test(e) ? atob(t) : t.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16))); return new TextDecoder(cs).decode(Uint8Array.from(b, c => c.charCodeAt(0) & 255)); } catch { return m; } }).replace(/\s+/g, ' ').trim(); },
  /** A stylesheet with what it asks for from the file (its @imports inside it); a url() the file does not hold asks for nothing. */
  mcss(text, base, R, depth = 0) {
    text = String(text || '').replace(/@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*([^;]*);/gi, (m, q1, u1, q2, u2, media) => {
      const P = depth < 4 && R.find(u1 || u2, base); if (!P) return ''; const inner = WEBCAP.mcss(WEBCAP.text(P), P.loc || base, R, depth + 1); media = (media || '').trim();
      return media && !/^(layer|supports)\b/i.test(media) ? '@media ' + media + '{' + inner + '}' : inner; });
    return text.replace(/url\(\s*(['"]?)([^'")]*?)\1\s*\)/gi, (m, q, u) => { u = u.trim(); if (!u || /^(data:|#|about:)/i.test(u)) return m; const P = R.find(u, base); return P ? 'url("' + WEBCAP.uri(P) + '")' : 'url("data:,")'; });
  },
  /** The page part, self-contained: its scripts, frames and embeds out; pictures, stylesheets, icons and fonts from the file; links to the live page. */
  mpage(P, R, top, at) {
    const doc = new DOMParser().parseFromString(WEBCAP.text(P), 'text/html');
    let base = P.loc || top; const bt = doc.querySelector('base[href]'); if (bt) try { base = new URL(bt.getAttribute('href'), base || undefined).href; } catch { }
    const abs = u => { try { return new URL(u, base || undefined).href; } catch { return u; } };
    const Q = sel => { const out = [], walk = root => { root.querySelectorAll(sel).forEach(e => out.push(e)); root.querySelectorAll('template').forEach(t => walk(t.content)); }; walk(doc); return out; };
    const res = (el, attr) => { const v = (el.getAttribute(attr) || '').trim(); if (!v || /^data:/i.test(v)) return true; const S = R.find(v, base); if (S) { el.setAttribute(attr, WEBCAP.uri(S)); return true; } el.removeAttribute(attr); return false; };
    const set = v => String(v || '').split(/,\s+/).map(x => x.trim().split(/\s+/)[0]).filter(Boolean);
    Q('script,noscript,iframe,frame,frameset,object,embed,applet,portal,base,meta[charset],video source,audio source,track').forEach(e => e.remove());
    Q('meta[http-equiv]').forEach(e => { if (/^(refresh|content-security-policy|content-type|x-ua-compatible)$/i.test(e.getAttribute('http-equiv') || '')) e.remove(); });
    // the pictures before the sources of a <picture> go: the one the browser showed is the one the file holds
    Q('img').forEach(i => { const pic = i.parentElement && i.parentElement.tagName === 'PICTURE' ? [...i.parentElement.children].filter(c => c.tagName === 'SOURCE').flatMap(c => set(c.getAttribute('srcset'))) : [];
      const C = [i.getAttribute('src'), ...set(i.getAttribute('srcset')), ...set(i.getAttribute('data-srcset')), ...pic, ...['data-src', 'data-lazy-src', 'data-original', 'data-url'].map(a => i.getAttribute(a))].filter(u => u && !/^data:/i.test(u));
      const S = C.map(u => R.find(u, base)).find(Boolean), src = i.getAttribute('src') || '';
      if (S) i.setAttribute('src', WEBCAP.uri(S)); else if (!/^data:/i.test(src)) { if (src || C.length) R.missing++; i.removeAttribute('src'); }
      ['srcset', 'sizes', 'loading', 'decoding', 'fetchpriority', 'data-src', 'data-srcset', 'data-lazy-src', 'data-original', 'data-url'].forEach(a => i.removeAttribute(a)); });
    Q('picture source').forEach(e => e.remove());
    Q('*').forEach(e => { for (const a of [...e.attributes]) if (/^on/i.test(a.name) || /^(integrity|nonce|crossorigin|ping)$/i.test(a.name)) e.removeAttribute(a.name); if (e.hasAttribute('style')) e.setAttribute('style', WEBCAP.mcss(e.getAttribute('style'), base, R)); });
    Q('style').forEach(st => { st.textContent = WEBCAP.mcss(st.textContent, base, R).replace(/<\/style/gi, '<\\/style'); });
    Q('link[href]').forEach(l => { const rel = (l.getAttribute('rel') || '').toLowerCase().split(/\s+/), href = l.getAttribute('href');
      if (rel.includes('stylesheet') && !rel.includes('alternate')) { const S = R.find(href, base); if (!S) { R.missing++; return l.remove(); } const st = doc.createElement('style'); if (l.getAttribute('media')) st.setAttribute('media', l.getAttribute('media'));
        st.textContent = WEBCAP.mcss(WEBCAP.text(S), S.loc || abs(href), R).replace(/<\/style/gi, '<\\/style'); return l.replaceWith(st); }
      if (rel.some(r => /^(icon|apple-touch-icon|mask-icon)$/.test(r))) { const S = R.find(href, base); if (!S) return l.remove(); const u = WEBCAP.uri(S); l.setAttribute('href', u); if (!R.icon && u.length < 60000) R.icon = u; return; }
      if (rel.some(r => /^(preload|prefetch|preconnect|dns-prefetch|modulepreload|manifest|pingback|prerender)$/.test(r))) return l.remove();
      l.setAttribute('href', abs(href)); });
    const here = String(top || '').split('#')[0];   // the browser writes a link within the page out in full: it stays within the copy
    Q('a[href],area[href]').forEach(a => { const v = a.getAttribute('href').trim(); if (/^javascript:/i.test(v)) return a.removeAttribute('href'); if (v.startsWith('#')) return; const u = abs(v), i = u.indexOf('#');
      if (here && i > 0 && u.slice(0, i) === here) return a.setAttribute('href', u.slice(i)); a.setAttribute('href', u); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); });
    Q('form[action]').forEach(f => f.setAttribute('action', abs(f.getAttribute('action'))));
    Q('video,audio').forEach(v => { ['src', 'autoplay', 'preload'].forEach(a => v.removeAttribute(a)); res(v, 'poster'); });
    Q('input[src]').forEach(i => res(i, 'src')); Q('[background]').forEach(e => res(e, 'background'));
    Q('image,feImage').forEach(e => { const X = 'http://www.w3.org/1999/xlink', v = e.getAttribute('href') || e.getAttributeNS(X, 'href') || ''; if (!v || v.startsWith('#') || /^data:/i.test(v)) return; const S = R.find(v, base); e.removeAttributeNS(X, 'href'); if (S) e.setAttribute('href', WEBCAP.uri(S)); else e.removeAttribute('href'); });
    const meta = a => { const m = doc.createElement('meta'); Object.keys(a).forEach(k => m.setAttribute(k, a[k])); return m; };
    doc.head.prepend(meta({ charset: 'utf-8' }), meta({ 'http-equiv': 'Content-Security-Policy', content: WEBCAP.CSP }), meta({ name: 'sis-captured', content: (top || '') + ' ' + at + ' saved-in-browser' }));
    const title = (doc.title || '').replace(/\s+/g, ' ').trim(), dt = doc.doctype ? new XMLSerializer().serializeToString(doc.doctype) + '\n' : '';
    return { html: dt + doc.documentElement.outerHTML, title };
  },
  again(b) { const cur = M.block(b.id); if (!cur || !cur.web) return; const d = M.doc(cur.docId); if (!d) return; WEBCAP.capture(d, { x: cur.x || 0, y: cur.y || 0 }, cur.web.url, cur); },
  /** V3.977 — files dropped on a note's paper: each made as a pasted one is (13zu2); a saved page dropped on a website component is its next version. */
  drop(e) {
    const dt = e.dataTransfer, t = e.target; if (!dt || !t || !t.closest || ![...(dt.types || [])].includes('Files')) return null;
    const host = t.closest('.canvas-host'), pane = host && host._dv; if (!pane || !pane.paper || pane.travel || $('.ovl')) return null;
    if (t.closest('input,textarea,[contenteditable="true"],math-field')) return null; return pane;
  },
  /** The strip under the header: when, from where, the live page, capture again. */
  strip(b, ro) {
    const w = b.web, host = WEBCAP.host(w.final || w.url);
    return h('div.web-strip.nopan', { title: (w.title || host) + '\n' + (w.final || w.url) },
      w.icon ? h('img.ws-ic', { src: w.icon, alt: '' }) : h('span.ws-ic.ws-g', '◍'),
      h('span.ws-t', 'Saved ', fmtDayLong(w.at), ' ', fmtTime(w.at), ' from ', h('b', host), w.via === 'saved' ? ' · in the browser' : ''),
      h('span.ws-n', 'a copy: the live page is never loaded' + (w.missing ? ' · ' + plural(w.missing, 'part') + ' didn’t come' : '')),
      h('span.spacer'),
      h('a.btn.xs', { href: w.final || w.url, target: '_blank', rel: 'noopener noreferrer', title: 'Open the live page in your browser — it may have changed, or be gone', on: { click: e => e.stopPropagation() } }, '↗ Live page'),
      ro ? null : h('button.btn.xs', { type: 'button', title: 'Save it again as it is now: the next version, this copy kept as the one before' + (w.via === 'saved' ? ' — or drop a newer page saved in the browser (.mhtml) on this component' : ''), on: { click: e => { e.stopPropagation(); WEBCAP.again(b); } } }, '⟳ Capture again'));
  },
};
INSERTS.push({ id: 'website', group: 'Widgets', icon: '◍', label: 'Website…', sub: 'A web page saved in the note as it is now — kept even if the site goes away; the live page is never loaded', run: (d, p) => WEBCAP.ask(d, p) });
{
  // the strip under the header
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments);
    if (el && b && b.web && (b.kind === 'html' || b.kind === 'pdf')) { const bh = $(':scope > .bh', el); if (bh) bh.after(WEBCAP.strip(b, !!this.travel)); el.classList.add('website'); }
    return el; };
  // V3.977 — files dropped on a note (a figure's cell takes its own and stops them first)
  document.addEventListener('dragover', e => { if (WEBCAP.drop(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  document.addEventListener('drop', e => { const pane = WEBCAP.drop(e); if (!pane) return; const files = [...(e.dataTransfer.files || [])]; if (!files.length) return; e.preventDefault();
    const d = M.doc(pane.docId); if (!d) return; const box = e.target.closest('.box.website[data-id]'), wb = box && M.block(box.dataset.id);
    if (wb && wb.web && files.length === 1 && CLIPX.sort(files[0]) === 'mhtml') return WEBCAP.fromMhtml(d, { x: wb.x || 0, y: wb.y || 0 }, files[0], wb);
    const w = pane.paper.toWorld(e.clientX, e.clientY); CLIPX.addFiles(d, { x: Math.round(w.x / 14) * 14, y: Math.round(w.y / 14) * 14 }, files); });
  // the notebook folder's Markdown says where and when it came from
  const vc = VAULT.component; VAULT.component = function (b, d, P) { const md = vc.apply(this, arguments); if (!b || !b.web) return md;
    return md + '\n- Website saved ' + b.web.at.replace('T', ' ').slice(0, 16) + ' from <' + (b.web.final || b.web.url) + '>' + (b.web.final && b.web.final !== b.web.url ? ' (asked for <' + b.web.url + '>)' : '') + '\n'; };
}
