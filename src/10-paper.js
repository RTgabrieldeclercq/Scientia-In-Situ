/* ==========================================================================
   10 · Paper — the journal's infinite graph paper, used by every canvas view
   (notes, the term lens, the portfolio map). The brand block's 14 px grid at
   ~3% contrast; it trails the view by at most 8 px while you move, like paper
   under a lens, and settles back into register at rest. Edges fade 5%.
   Drag the paper (or Space+drag anywhere) to pan; flick for momentum; wheel
   pans, Ctrl+wheel or pinch zooms at the cursor.
   ========================================================================== */
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
class Paper {
  constructor(host, opts = {}) {
    this.o = Object.assign({ minZ: .3, maxZ: 2, noPan: '.box,.nopan,input,textarea,select,button,[contenteditable="true"],.port' }, opts);
    this.view = Object.assign({ x: 60, y: 40, z: 1 }, opts.view || {});
    this.el = h('div.paper', { tabindex: -1 }); this.grid = h('div.grid'); this.world = h('div.world'); this.fade = h('div.fade');
    this.el.append(this.grid, this.world, this.fade); host.append(this.el);
    this.lens = { x: null, y: null, raf: 0 }; this.ptrs = new Map(); this.mode = null; this.mom = null; this.tween = null; this.space = false;
    this._bind(); this.apply();
  }
  apply() { const v = this.view; this.world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.z})`; this._lensKick(); this.o.onView && this.o.onView(v); }
  _lensKick() { const v = this.view; if (this.lens.x == null || RM()) { this.lens.x = v.x; this.lens.y = v.y; return this._paint(); } if (!this.lens.raf) this.lens.raf = requestAnimationFrame(() => this._lensStep()); }
  _lensStep() { const v = this.view, L = this.lens, k = .14, M8 = 8; L.x += (v.x - L.x) * k; L.y += (v.y - L.y) * k; L.x = clamp(L.x, v.x - M8, v.x + M8); L.y = clamp(L.y, v.y - M8, v.y + M8);
    const done = Math.abs(v.x - L.x) < .05 && Math.abs(v.y - L.y) < .05; if (done) { L.x = v.x; L.y = v.y; } this._paint(); L.raf = done ? 0 : requestAnimationFrame(() => this._lensStep()); }
  _paint() { let step = 14; while (step * this.view.z < 9) step *= 2; const s = this.el.style; s.setProperty('--gx', this.lens.x + 'px'); s.setProperty('--gy', this.lens.y + 'px'); s.setProperty('--s', (step * this.view.z) + 'px'); }
  rect() { return this.el.getBoundingClientRect(); }
  toWorld(sx, sy) { const r = this.rect(), v = this.view; return { x: (sx - r.left - v.x) / v.z, y: (sy - r.top - v.y) / v.z }; }
  toScreen(wx, wy) { const r = this.rect(), v = this.view; return { x: r.left + v.x + wx * v.z, y: r.top + v.y + wy * v.z }; }
  zoomAt(z, sx, sy) { const r = this.rect(), v = this.view; sx ??= r.left + r.width / 2; sy ??= r.top + r.height / 2; z = clamp(z, this.o.minZ, this.o.maxZ); const px = sx - r.left, py = sy - r.top; v.x = px - (px - v.x) * z / v.z; v.y = py - (py - v.y) * z / v.z; v.z = z; this.apply(); }
  animateView(to, d = 460) { if (this.tween) cancelAnimationFrame(this.tween); const v = this.view; if (RM()) { Object.assign(v, to); return this.apply(); } const from = { ...v }, t0 = performance.now();
    const step = now => { const t = clamp((now - t0) / d, 0, 1), e = 1 - Math.pow(1 - t, 3); v.x = from.x + (to.x - from.x) * e; v.y = from.y + (to.y - from.y) * e; v.z = from.z + (to.z - from.z) * e; this.apply(); this.tween = t < 1 ? requestAnimationFrame(step) : null; }; this.tween = requestAnimationFrame(step); }
  fitTarget(bb, pad = 70, maxZ = 1) { const r = this.rect(); if (!bb) return { x: 60, y: 40, z: 1 }; pad = r.width < 640 ? 18 : pad;
    if (r.width < 640) { const z = clamp((r.width - pad * 2) / Math.max(1, bb.x1 - bb.x0), Math.max(this.o.minZ, .55), maxZ); return { z, x: pad - bb.x0 * z, y: 24 - bb.y0 * z }; }
    const z = clamp(Math.min((r.width - pad * 2) / Math.max(1, bb.x1 - bb.x0), (r.height - pad * 2) / Math.max(1, bb.y1 - bb.y0)), this.o.minZ, maxZ);
    return { z, x: r.width / 2 - (bb.x0 + bb.x1) / 2 * z, y: Math.max(pad, r.height / 2 - (bb.y0 + bb.y1) / 2 * z) }; }
  fit(bb, animate = true) { const t = this.fitTarget(bb); animate ? this.animateView(t) : (Object.assign(this.view, t), this.apply()); }
  centerOn(wx, wy, z) { const r = this.rect(); z = z || this.view.z; this.animateView({ z, x: r.width / 2 - wx * z, y: r.height / 2 - wy * z }); }
  stop() { if (this.mom) cancelAnimationFrame(this.mom); this.mom = null; if (this.tween) { cancelAnimationFrame(this.tween); this.tween = null; } }
  _momentum(vs) { if (RM() || !vs.length) return; const now = performance.now(), rec = vs.filter(s => now - s.t < 90); if (!rec.length) return; const span = Math.max(16, now - rec[0].t);
    let vx = rec.reduce((s, q) => s + q.dx, 0) / span * 16, vy = rec.reduce((s, q) => s + q.dy, 0) / span * 16; if (Math.hypot(vx, vy) < 2) return;
    const step = () => { vx *= .93; vy *= .93; this.view.x += vx; this.view.y += vy; this.apply(); this.mom = Math.hypot(vx, vy) > .25 ? requestAnimationFrame(step) : null; }; this.mom = requestAnimationFrame(step); }
  /** Pan the paper while something is dragged near an edge. */
  edgePan(e, onShift) { this._epE = e; if (this._ep) return; const step = () => { const r = this.rect(), m = 44, x = this._epE.clientX - r.left, y = this._epE.clientY - r.top; let dx = 0, dy = 0;
    if (x < m) dx = (m - x) / 4; else if (x > r.width - m) dx = -(x - r.width + m) / 4; if (y < m) dy = (m - y) / 4; else if (y > r.height - m) dy = -(y - r.height + m) / 4;
    if (!dx && !dy) { this._ep = null; return; } this.view.x += dx; this.view.y += dy; this.apply(); onShift && onShift(dx, dy); this._ep = requestAnimationFrame(step); }; this._ep = requestAnimationFrame(step); }
  stopEdgePan() { if (this._ep) cancelAnimationFrame(this._ep); this._ep = null; }
  _bind() {
    const el = this.el;
    el.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2) { const [p, q] = [...this.ptrs.values()]; this.mode = { k: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y), z0: this.view.z }; return; }
      const onThing = e.target.closest(this.o.noPan);
      if (!(e.button === 1 || this.space || !onThing)) return;
      this.stop(); this.mode = { k: 'pan', x: e.clientX, y: e.clientY, moved: 0, v: [], start: e };
      el.classList.add('panning'); try { el.setPointerCapture(e.pointerId); } catch { }
      if (this.space || e.button === 1) e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const m = this.mode; if (!m) return;
      if (m.k === 'pinch' && this.ptrs.size === 2) { const [p, q] = [...this.ptrs.values()]; this.zoomAt(m.z0 * Math.hypot(p.x - q.x, p.y - q.y) / m.d0, (p.x + q.x) / 2, (p.y + q.y) / 2); return; }
      if (m.k === 'pan') { const dx = e.clientX - m.x, dy = e.clientY - m.y; m.x = e.clientX; m.y = e.clientY; m.moved += Math.abs(dx) + Math.abs(dy); this.view.x += dx; this.view.y += dy; this.apply(); m.v.push({ dx, dy, t: performance.now() }); if (m.v.length > 6) m.v.shift(); }
    });
    const end = e => { this.ptrs.delete(e.pointerId); const m = this.mode; if (!m) return; if (m.k === 'pinch') { if (this.ptrs.size < 2) this.mode = null; return; } this.mode = null; el.classList.remove('panning');
      if (m.k === 'pan') { if (m.moved < 4 && e.type === 'pointerup') this.o.onTap && this.o.onTap(m.start); else this._momentum(m.v); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { if (e.target.closest('.scrolly,.pop')) return; e.preventDefault(); this.stop(); hideHover();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey || e.metaKey) this.zoomAt(this.view.z * Math.exp(-e.deltaY * k * .0022), e.clientX, e.clientY);
      else { this.view.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k; this.view.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k; this.apply(); } }, { passive: false });
    el.addEventListener('dblclick', e => { if (!e.target.closest(this.o.noPan)) this.o.onDouble && this.o.onDouble(e, this.toWorld(e.clientX, e.clientY)); });
    el.addEventListener('contextmenu', e => { if (e.target.closest('input,textarea')) return; if (this.o.onContext) { e.preventDefault(); this.o.onContext(e, this.toWorld(e.clientX, e.clientY)); } });
  }
}
/* Space held = pan over anything (for every live paper). */
const PAPERS = new Set();
document.addEventListener('keydown', e => { if (e.key === ' ' && !e.target.closest('input,textarea,select,[contenteditable="true"]')) { PAPERS.forEach(p => { p.space = true; p.el.classList.add('space'); }); if (PAPERS.size) e.preventDefault(); } });
document.addEventListener('keyup', e => { if (e.key === ' ') PAPERS.forEach(p => { p.space = false; p.el.classList.remove('space'); }); });
function makePaper(host, opts) { PAPERS.forEach(p => { if (!p.el.isConnected) PAPERS.delete(p); }); const p = new Paper(host, opts); PAPERS.add(p); return p; }
