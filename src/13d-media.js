/* ==========================================================================
   13d · Media — images, GIFs and videos. Files are written to the app's own
   images/ folder by serve.py (POST /api/media), so they load every time the
   app opens. If the app is opened without serve.py, a file is kept in the
   browser and moved to images/ the next time the folder is reachable.
   ========================================================================== */
const MEDIA = {
  server: null, _urls: new Map(),
  async ping() { try { const r = await fetch('api/ping', { cache: 'no-store' }); const j = r.ok ? await r.json() : null; this.server = !!(j && j.ok); } catch { this.server = false; } return this.server; },
  get: id => DB.get('media', id),
  kindOf(file) { const t = (file.type || '').toLowerCase(), n = (file.name || '').toLowerCase(); if (t === 'text/html' || /\.html?$/.test(n)) return 'html'; if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'; if (t === 'image/gif' || n.endsWith('.gif')) return 'gif'; if (t.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(n)) return 'video'; if (/\.(xlsx|xlsm|xls|ods|csv|tsv|txt)$/.test(n) || /spreadsheet|ms-excel|text\/csv|text\/plain/.test(t)) return 'sheet'; return 'image'; },
  extOf(file) { const m = (file.name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/); if (m) return m[1]; return ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' })[file.type] || 'bin'; },
  /** Measure the file (width, height, duration) before it is stored. */
  measure(file, kind) {
    return new Promise(res => { const u = URL.createObjectURL(file);
      if (kind === 'video') { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = () => { res({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); URL.revokeObjectURL(u); }; v.onerror = () => res({ w: 1, h: 1 }); v.src = u; }
      else { const i = new Image(); i.onload = () => { res({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(u); }; i.onerror = () => res({ w: 1, h: 1 }); i.src = u; } });
  },
  async add(file) {
    if (this.server == null) await this.ping();
    const kind = this.kindOf(file), ext = this.extOf(file), id = uid('m'), dims = kind === 'html' || kind === 'pdf' || kind === 'sheet' ? { w: 0, h: 0 } : await this.measure(file, kind);
    const rec = { id, kind, ext, name: file.name || id + '.' + ext, mime: file.type, size: file.size, w: dims.w, h: dims.h, dur: dims.dur || null, created: isoLocal(new Date()), fileDate: file.lastModified ? isoLocal(new Date(file.lastModified)) : null, path: null, local: false };
    if (this.server && await this.upload(id, ext, file)) rec.path = `images/${id}.${ext}`;
    else { rec.local = true; DB.put('blobs', { id: 'media:' + id, blob: file }); }
    DB.put('media', rec); return rec;
  },
  async upload(id, ext, blob) {
    try { const r = await fetch(`api/media?id=${encodeURIComponent(id)}&ext=${encodeURIComponent(ext)}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/octet-stream' } }); return r.ok; }
    catch { return false; }
  },
  url(rec) {
    if (!rec) return '';
    if (rec.path) return rec.path;
    if (this._urls.has(rec.id)) return this._urls.get(rec.id);
    const b = DB.get('blobs', 'media:' + rec.id); if (!b || !b.blob) return '';
    const u = URL.createObjectURL(b.blob); this._urls.set(rec.id, u); return u;
  },
  /** Files kept in the browser move to images/ as soon as serve.py is there. */
  async flush() {
    const pend = DB.where('media', m => m.local); if (!pend.length || !(await this.ping())) return 0; let n = 0;
    for (const m of pend) { const b = DB.get('blobs', 'media:' + m.id); if (b && b.blob && await this.upload(m.id, m.ext, b.blob)) { m.path = `images/${m.id}.${m.ext}`; m.local = false; DB.put('media', m); DB.del('blobs', 'media:' + m.id); n++; } }
    if (n) toast(plural(n, 'file') + ' moved into the app’s images folder'); return n;
  },
  /** An element showing the media cropped to a circle: crop = {z, cx, cy}; z = 1 fits the short side to the circle. */
  cropped(rec, crop, { live = false, cls = '' } = {}) {
    const c = crop || { z: 1, cx: .5, cy: .5 }, m = Math.max(1, Math.min(rec.w || 1, rec.h || 1));
    const W = 100 * c.z * (rec.w || 1) / m, H = 100 * c.z * (rec.h || 1) / m;
    const st = { position: 'absolute', width: W + '%', height: H + '%', left: (50 - c.cx * W) + '%', top: (50 - c.cy * H) + '%', maxWidth: 'none', pointerEvents: 'none' };
    return MEDIA.el(rec, { style: st, live, cls });
  },
  /** <img>, a still GIF (first frame until it is played) or a lazy <video>. */
  el(rec, { style = {}, live = false, cls = '', controls = false } = {}) {
    const u = MEDIA.url(rec);
    if (rec.kind === 'video') { const v = h('video' + (cls ? '.' + cls : ''), { muted: true, loop: true, playsInline: true, preload: live || controls ? 'auto' : 'metadata', style, 'data-vid': rec.id }); v.muted = true; if (controls) v.controls = true; v.src = u + (live || controls ? '' : '#t=0.1'); if (live) v.autoplay = true; return v; }
    if (rec.kind === 'gif' && !live) { const c = h('canvas.gifstill' + (cls ? '.' + cls : ''), { style, 'data-gif': rec.id }), i = new Image(); i.onload = () => { c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); }; i.src = u; return c; }
    return h('img' + (cls ? '.' + cls : ''), { src: u, style, draggable: false, alt: rec.name || '' });
  },
  /** Hovering a widget plays what it shows; leaving stops it. */
  playIn(root, on) {
    $$('video[data-vid]', root).forEach(v => { if (on) { if (v.src.includes('#t=')) v.src = v.src.replace(/#t=.*$/, ''); v.play().catch(() => {}); } else v.pause(); });
    $$('[data-gif]', root).forEach(c => { const rec = MEDIA.get(c.dataset.gif); if (!rec) return;
      if (on) { if (!c._live) { const i = h('img', { src: MEDIA.url(rec), style: c.getAttribute('style') || '', draggable: false }); i.className = c.className; c._live = i; } c.replaceWith(c._live); c._live._still = c; }
    });
    if (!on) $$('img', root).forEach(i => { if (i._still) { i.replaceWith(i._still); } });
  },
};
