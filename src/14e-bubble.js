/* ==========================================================================
   14e · Bubbles (V3.999 — Gabe: "any component containing the term appears as
   a realistic bubble portal look that shows the neighboring links or
   components"; "The bubble has to fit all neighboring components, so bubbles
   are different sizes … fully transparent with a realistic look with
   reflection and warping effect on the edges"; "make the two highlights
   smaller"; "Bubbles is the only way to view it. I want the bubbles to be
   slightly dynamic with a clean animation.")
   A clear glass bubble round a component and its neighbours: a portal into
   its note. The term's page draws its occurrences with it (16-lens); the
   Atlas is meant to draw its dots with it too.
   API
   • BUBBLE.spec(blockId, { terms }) → a card: { id, head, label, body (Node),
     imgs: [{ src, letter }], len, open } — a bridge shows what it bridges;
     the terms in `terms` are outlined in their colours (terms[0] teal when
     there are several, then BUBBLE.TC).
   • BUBBLE.geometry(centre, around, S) → { R, D, cc, ns, S }: each neighbour
     on its own ray just clear of the centre card, then clear of each other;
     the bubble just round the farthest corner (its rim left clear to bend).
     around: [{ spec, rel }].
   • BUBBLE.el(o) → the bubble (.bb); place it with left/top at its centre.
     o = { key, centre, around, S, region: { name, ids }, caption: { title,
     sub, extra }, badge, beads: [{ text, title, label, on }], uses (spec ids
     outlined "uses it too"), arcNear: { ids → kind } (an arc inside one
     bubble), onPort(glass, e), flat (true: a plain tray; false: glass even
     with Term bubbles off; unset: follows Term bubbles), ring: { on, ms }
     (the pointing ring for this bubble, instead of Term bubbles' own) }.
     el._g is its geometry. (V4.0: flat false and ring, for the Atlas.)
   • BUBBLE.warp(D) → the id of the SVG filter that bends a disc of diameter
     D at its rim (one per size, 8 px steps; strength: Settings → Term
     bubbles → Glass).
   • BUBBLE.motion(host) → the float: each bubble its own slow phase (CSS,
     transform only), paused while the page scrolls and for bubbles out of
     view, none under reduced motion or with Float off. Returns { stop }.
   • BUBBLE.port(glass, go) → the portal: a circle of paper opens from the
     bubble over the window, go() runs underneath (App.openBlock …), and it
     fades away on the note.
   • BUBBLE.back.arm({ hash, label, text }) → on the note, a small glass bubble
     that takes you back (text, when given, is its whole label) (Esc too when nothing is selected; Alt+← is the
     history's own); BUBBLE.back.clear().
   • BUBBLE.bead({ d, title, on }) → a small glass bead: a far dot (level of
     detail for many dots).
   • BUBBLE.on() / BUBBLE.opt(key): the feature and its settings.
   ========================================================================== */
const BUBBLE = {
  TC: ['var(--mag)', '#3A6FE0', '#E07A1F', '#B5179E', '#0FA3B1', '#2E9E5B'],
  WARP: {}, _warpK: null,
  on: () => typeof FEAT === 'undefined' || FEAT.on('bubbles'),
  opt(key) { const v = typeof FEAT !== 'undefined' ? FEAT.tune('bubbles', key) : undefined; return v === undefined ? ({ order: 'note', float: true, amount: 4, ring: true, ringMs: 1000, glass: 16 })[key] : v; },
  still: () => (typeof RM === 'function' && RM()) || !BUBBLE.opt('float') || !BUBBLE.on(),
  tcol(t, ts) { const i = ts.indexOf(t); return i <= 0 ? 'var(--teal)' : BUBBLE.TC[(i - 1) % BUBBLE.TC.length]; },

  /* ---------- a card ---------- */
  spec(id, o = {}) {
    const b0 = M.block(id); if (!b0) return null;
    const isBr = b0.kind === 'ref' && b0.refBlockId && !b0.refItemId, src = isBr ? (M.block(b0.refBlockId) || b0) : b0;
    const d = M.doc(b0.docId), p = d && prof(d.type);
    const head = src.kind === 'figure' ? 'Panel' : b0.kind === 'ref' ? (b0.refItemId ? 'Pulled in' : 'Bridged') : p && p.ordered && b0.status !== 'superseded' ? p.noun + ' ' + M.blockIndex(b0) : (p && p.noun) || 'Block';
    const label = b0.kind === 'ref' && b0.refItemId ? '' : (src.label || '');
    let body = null, len = 0, imgs = [];
    if (b0.kind === 'ref' && b0.refItemId) { const it = M.item(b0.refItemId); if (it) { body = h('div.bb-t', h('span.st.st-' + it.kind, it.text || '')); len = (it.text || '').length; } }
    else if (src.body && src.body.text) { body = h('div.bb-t'); try { ED.render(body, src); } catch (e) { body.textContent = src.body.text; } len = src.body.text.length; }
    if (src.kind === 'figure' && src.fig && typeof FIG !== 'undefined') imgs = FIG.cells(src).map((c, i) => { const m = c.media && MEDIA.get(c.media); const u = m && MEDIA.url(m); return u ? { src: u, letter: FIG.letter(i) } : null; }).filter(Boolean).slice(0, 4);
    const ts = o.terms || [];
    if (body) body.querySelectorAll('.tm[data-term]').forEach(n => { const i = ts.indexOf(n.dataset.term); n.removeAttribute('data-m'); if (i >= 0 && ts.length > 1) { n.classList.add('x'); n.style.setProperty('--tc', BUBBLE.tcol(n.dataset.term, ts)); } else if (i === 0) n.classList.add('me'); });
    const open = (IX.blockItems.get(src.id) || []).concat((IX.origin.get(src.id) || []).map(i => i.id)).map(M.item).some(it => it && it.kind === 'barrier' && it.originBlockId === src.id && IX.status(it) === 'open');
    return { id, head, label, body, imgs, len: Math.min(len, 420), open };
  },
  /** A card's size at scale S: text cards by their length (lines clamped), panels by their images. */
  card(sp, centre, S) {
    if (sp.imgs && sp.imgs.length) { const w = (centre ? 168 : 136) * S, cols = Math.min(sp.imgs.length, sp.imgs.length > 2 ? 2 : sp.imgs.length), iw = (w - 14 * S - (cols - 1) * 3) / cols, rows = Math.ceil(sp.imgs.length / cols);
      const txt = sp.len ? Math.min(2, Math.ceil(sp.len / 30)) * 12 : 0; return { w, h: (20 + txt) * S + rows * (iw * .75 + 3) + 6 * S, cols }; }
    const fw = centre ? 10.5 : 9.5, w = (centre ? 172 : 136) * S, per = Math.max(10, Math.floor(((centre ? 172 : 136) - 16) / (fw * .5))), lines = Math.max(1, Math.min(centre ? 7 : 5, Math.ceil((sp.len || 8) / per)));
    return { w, h: (19 + lines * fw * 1.36 + 6) * S, lines };
  },
  geometry(centre, around, S = 1) {
    const cc = BUBBLE.card(centre, true, S), ns = around.map(a => Object.assign({ a }, BUBBLE.card(a.spec, false, S))), gap = 12 * S, N = ns.length;
    const ang = i => N === 1 ? Math.PI / 2 : N === 2 ? (i ? Math.PI / 2 : -Math.PI / 2) : -Math.PI / 2 + Math.PI / N + i * 2 * Math.PI / N;
    ns.forEach((n, i) => { const a = ang(i), ux = Math.cos(a), uy = Math.sin(a); n.ux = ux; n.uy = uy;
      const t = Math.min(Math.abs(ux) > .01 ? (cc.w / 2 + n.w / 2 + gap) / Math.abs(ux) : 1e9, Math.abs(uy) > .01 ? (cc.h / 2 + n.h / 2 + gap) / Math.abs(uy) : 1e9); n.x = ux * t; n.y = uy * t; });
    const hit = (a, c) => Math.abs(a.x - c.x) < (a.w + c.w) / 2 + gap && Math.abs(a.y - c.y) < (a.h + c.h) / 2 + gap;
    for (let k = 0; k < 160; k++) { let mv = false; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (hit(ns[i], ns[j])) { [ns[i], ns[j]].forEach(n => { n.x += n.ux * 4 * S; n.y += n.uy * 4 * S; }); mv = true; } if (!mv) break; }
    const far = Math.max(Math.hypot(cc.w / 2, cc.h / 2), ...ns.flatMap(n => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => Math.hypot(n.x + sx * n.w / 2, n.y + sy * n.h / 2))));
    const R = Math.ceil((far / .86 + 6 * S) / 4) * 4;   // in 4 px steps, so sizes share their warp
    return { R, D: 2 * R, cc, ns, S };
  },

  /* ---------- the glass ---------- */
  defs() {
    let d = document.getElementById('bb-defs'); if (d) return d;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true'); s.style.position = 'absolute';
    s.innerHTML = '<defs id="bb-defs"><linearGradient id="bb-hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".82"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient></defs>';
    document.body.append(s); return document.getElementById('bb-defs');
  },
  warp(D) {
    const k = +BUBBLE.opt('glass') || 0; if (k !== BUBBLE._warpK) { BUBBLE._warpK = k; BUBBLE.WARP = {}; }
    D = Math.max(16, Math.round(D / 8) * 8); const id = 'bbw' + D + '_' + k; if (BUBBLE.WARP[D]) return BUBBLE.WARP[D];
    const defs = BUBBLE.defs(); if (document.getElementById(id)) return (BUBBLE.WARP[D] = id);
    const cv = document.createElement('canvas'); cv.width = cv.height = D; const x = cv.getContext('2d'), im = x.createImageData(D, D), R = D / 2;
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) { const dx = (i + .5 - R) / R, dy = (j + .5 - R) / R, r = Math.hypot(dx, dy); let s = 0;
      if (r < 1 && r > .001) { const t = Math.min(1, Math.max(0, (r - .58) / .42)); s = t * t * (3 - 2 * t); s *= s; }
      const o = (j * D + i) * 4; im.data[o] = 128 + (r > .001 ? dx / r : 0) * s * 127; im.data[o + 1] = 128 + (r > .001 ? dy / r : 0) * s * 127; im.data[o + 2] = 128; im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0);
    defs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="0" y="0" width="${D}" height="${D}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${cv.toDataURL()}" x="0" y="0" width="${D}" height="${D}" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="${Math.round(D * k / 100)}" xChannelSelector="R" yChannelSelector="G"/></filter>`);
    return (BUBBLE.WARP[D] = id);
  },
  SPEC: '<ellipse cx="22.5" cy="21.5" rx="7.6" ry="4.1" transform="rotate(-38 22.5 21.5)" fill="url(#bb-hl)" opacity=".85"/><ellipse cx="28" cy="26.2" rx="3.2" ry="1.8" transform="rotate(-38 28 26.2)" fill="url(#bb-hl)" opacity=".55"/>',
  svg(tag, attrs, inner) { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (inner) e.innerHTML = inner; return e; },
  /** A card on the glass (centre or neighbour). */
  mc(sp, cls, g, cx, cy, uses) {
    return h('div.bb-c.' + cls + (sp.imgs.length ? '.p' : '') + (uses ? '.uses' : ''), { 'data-id': sp.id, style: { width: g.w + 'px', left: (cx - g.w / 2) + 'px', top: (cy - g.h / 2) + 'px', fontSize: (16 * g.S) + 'px', '--ln': g.lines || 2 } },
      h('div.bb-h', h('span', sp.head), sp.label ? h('b', sp.label) : null, sp.open ? h('span.bb-open', { title: 'A barrier with no resolution yet' }, 'open') : null),
      sp.imgs.length ? h('div.bb-imgs', { style: { '--cols': g.cols } }, sp.imgs.map(m => h('span', h('img', { src: m.src, alt: sp.label + ' ' + m.letter, draggable: false }), sp.imgs.length > 1 ? h('b', m.letter) : null))) : null,
      sp.body ? sp.body : null, uses ? h('div.bb-also', '● uses it too') : null);
  },
  el(o) {
    const S = o.S || 1, g = BUBBLE.geometry(o.centre, o.around || [], S), D = g.D, R = g.R, flat = o.flat != null ? !!o.flat : !BUBBLE.on();
    const ringOn = () => o.ring ? !!o.ring.on : BUBBLE.opt('ring'), ringMs = () => (o.ring && +o.ring.ms) || +BUBBLE.opt('ringMs') || 1000;
    const cont = h('div.bb-cont');
    if (!flat) cont.style.filter = `url(#${BUBBLE.warp(D)})`;
    cont.append(h('div.bb-behind'));
    cont.append(BUBBLE.svg('svg', { class: 'bb-lines', width: D, height: D, viewBox: `0 0 ${D} ${D}` }, g.ns.map(n => { const k = o.arcNear && o.arcNear[n.a.spec.id];
      return `<path d="M${R} ${R} L${R + n.x} ${R + n.y}"${k ? ` style="stroke:var(--k-${k});stroke-width:1.6;opacity:1"` : ''}/>` + (n.a.rel ? `<text x="${R + n.x * .5 + 3}" y="${R + n.y * .5 - 2}">${esc(n.a.rel)}</text>` : ''); }).join('')));
    if (o.region && o.region.name) { const inR = g.ns.filter(n => o.region.ids.includes(n.a.spec.id)); const xs = [0, ...inR.map(n => n.x)], ys = [0, ...inR.map(n => n.y)], pad = 62 * S;
      cont.append(h('div.bb-rg', { style: { left: (R + Math.min(...xs) - g.cc.w / 2 - 10 * S) + 'px', top: (R + Math.min(...ys) - pad) + 'px', width: (Math.max(...xs) - Math.min(...xs) + g.cc.w + 20 * S) + 'px', height: (Math.max(...ys) - Math.min(...ys) + pad * 2) + 'px' } }, h('span', o.region.name))); }
    const uses = new Set(o.uses || []);
    g.ns.forEach(n => cont.append(BUBBLE.mc(n.a.spec, 'n', n, R + n.x, R + n.y, uses.has(n.a.spec.id))));
    cont.append(BUBBLE.mc(o.centre, 'c', Object.assign({ S }, g.cc), R, R, false));
    const glass = h('button.bb-g' + (flat ? '.flat' : ''), { type: 'button', 'aria-label': o.label || 'Open', style: { '--d': D + 'px' } },
      h('div.bb-lens', cont), flat ? null : h('div.bb-glass'), flat ? null : BUBBLE.svg('svg', { class: 'bb-spec', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, BUBBLE.SPEC));
    const ring = flat ? null : BUBBLE.svg('svg', { class: 'bb-ring', viewBox: `0 0 ${D + 20} ${D + 20}`, style: `--c:${Math.PI * (D + 16)}px` }, `<circle cx="${(D + 20) / 2}" cy="${(D + 20) / 2}" r="${(D + 16) / 2}"/>`);
    const pop = h('div.bb-pop'), inn = h('div.bb-in', glass, ring, o.badge ? h('span.bb-badge', o.badge) : null, h('span.bb-tag', 'Port in ↘'));
    (o.beads || []).forEach((s, k) => { const a = (-35 + k * 40) * Math.PI / 180, sx = R + Math.cos(a) * R, sy = R + Math.sin(a) * R;
      inn.append(h('button.bb-bead', { type: 'button', 'data-k': k, title: s.title || '', style: { left: sx + 'px', top: sy + 'px' }, on: { click: e => { e.stopPropagation(); s.on && s.on(e); } } }, s.text || '⇄'), h('span.bb-bead-l', { style: { left: (sx + 22) + 'px', top: (sy - 7) + 'px' } }, s.label || '')); });
    pop.append(inn, h('div.bb-cap', h('b', o.caption && o.caption.title || ''), h('span', o.caption && o.caption.sub || ''), ...((o.caption && o.caption.extra) || [])));
    const el = h('div.bb', { 'data-key': o.key || o.centre.id, style: { '--d': D + 'px' } }, pop);
    el._g = g;
    // the glints follow the pointer a little; pointing (moving, not a page sliding under a resting pointer) closes a ring, then ports in
    let dwell = 0; const stop = () => { clearTimeout(dwell); el.classList.remove('dwell'); };
    glass.addEventListener('mousemove', e => { const r = glass.getBoundingClientRect(); glass.style.setProperty('--sx', (((e.clientX - r.left) / r.width - .5) * 2.2).toFixed(2) + '%'); glass.style.setProperty('--sy', (((e.clientY - r.top) / r.height - .5) * 2.2).toFixed(2) + '%');
      if (flat || !ringOn() || el.classList.contains('dwell') || Date.now() - BUBBLE._scrollAt < 350 || BUBBLE._porting) return;
      el.style.setProperty('--ring', ringMs() + 'ms'); el.classList.add('dwell'); dwell = setTimeout(() => { el.classList.remove('dwell'); o.onPort && o.onPort(glass, null); }, ringMs()); });
    glass.addEventListener('mouseleave', () => { stop(); glass.style.setProperty('--sx', '0%'); glass.style.setProperty('--sy', '0%'); });
    glass.addEventListener('click', e => { stop(); o.onPort && o.onPort(glass, e); });
    el._stopDwell = stop;
    return el;
  },
  /** A small glass bead (a far dot). */
  bead(o = {}) { const d = o.d || 14; return h('button.bb-dot', { type: 'button', title: o.title || '', style: { '--d': d + 'px' }, on: o.on ? { click: o.on } : {} }); },

  /* ---------- motion ---------- */
  _scrollAt: 0, _porting: false, _io: null,
  motion(host) {
    const bs = [...host.querySelectorAll('.bb')]; host.classList.add('bb-host'); host.classList.toggle('bb-still', BUBBLE.still());
    const amt = +BUBBLE.opt('amount') || 4;
    bs.forEach((b, i) => { const k = b.dataset.key || String(i); let x = 7; for (const c of k) x = (x * 31 + c.charCodeAt(0)) % 9973; const f = ((x + i * 1237) % 997) / 997;
      b.style.setProperty('--fa', amt + 'px'); b.style.setProperty('--fd', (7 + f * 4).toFixed(2) + 's'); b.style.setProperty('--fp', (-f * 9).toFixed(2) + 's'); if (!b.style.getPropertyValue('--bi')) b.style.setProperty('--bi', Math.min(i, 14) * 45 + 'ms'); });
    if (!BUBBLE._io && 'IntersectionObserver' in window) BUBBLE._io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('bb-off', !e.isIntersecting)), { rootMargin: '120px' });
    if (BUBBLE._io) bs.forEach(b => BUBBLE._io.observe(b));
    return { stop() { if (BUBBLE._io) bs.forEach(b => BUBBLE._io.unobserve(b)); } };
  },

  /* ---------- port in: visit the note ---------- */
  port(glass, go) {
    if (BUBBLE._porting) return; const r = glass.getBoundingClientRect();
    if (!BUBBLE.on() || (typeof RM === 'function' && RM())) { go(); return; }
    BUBBLE._porting = true;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, P = h('div.bb-portal', { style: { clipPath: `circle(${r.width / 2}px at ${cx}px ${cy}px)` } });
    document.body.append(P); void P.offsetWidth;
    P.style.clipPath = `circle(${Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 20}px at ${cx}px ${cy}px)`;
    setTimeout(() => { try { go(); } catch (e) { console.warn('[bubble]', e); } requestAnimationFrame(() => { P.classList.add('out'); setTimeout(() => { P.remove(); BUBBLE._porting = false; }, 320); }); }, 470);
  },

  /* ---------- back to the bubbles ---------- */
  back: {
    cur: null, el: null,
    arm(o) { BUBBLE.back.cur = Object.assign({ at: Date.now() }, o); },
    clear() { BUBBLE.back.cur = null; BUBBLE.back.show(); },
    go() { const c = BUBBLE.back.cur; if (!c) return; BUBBLE.back.cur = null; BUBBLE.back.show(); App.go(c.hash); },
    show() {
      const c = BUBBLE.back.cur, r = App.route && App.route.name, here = !!c && (r === 'doc' || r === 'split');
      let b = BUBBLE.back.el;
      if (!here) { if (b) b.hidden = true; if (c && r && r !== 'doc' && r !== 'split' && c.hash !== location.hash) BUBBLE.back.cur = null; return; }
      if (!b) { b = BUBBLE.back.el = h('div.bb-back', h('button.bb-back-b', { type: 'button', 'aria-label': 'Back to the bubbles', on: { click: () => BUBBLE.back.go() } }, h('span', '◯')), h('span.bb-back-l')); document.body.append(b); }
      const v = $('#view'), vr = v ? v.getBoundingClientRect() : { left: 0, top: 0 };
      b.style.left = (vr.left + 14) + 'px'; b.style.top = (vr.top + 12) + 'px';
      $('.bb-back-l', b).textContent = c.text || ('Back to the bubbles of “' + (c.label || '') + '” · Esc');
      b.hidden = false;
    },
  },
};
{
  // floating pauses while anything scrolls or zooms (and a ring being drawn stops: a page sliding under a resting pointer never ports in)
  let t = 0; const onS = () => { BUBBLE._scrollAt = Date.now(); const b = document.body; if (!b) return; b.classList.add('bb-pause'); document.querySelectorAll('.bb.dwell').forEach(x => x._stopDwell && x._stopDwell()); clearTimeout(t); t = setTimeout(() => b.classList.remove('bb-pause'), 220); };
  addEventListener('scroll', onS, { passive: true, capture: true }); addEventListener('wheel', onS, { passive: true });
  // the back bubble follows the route (and the last note you were in, for Alt+click beside); Esc goes back when nothing is selected, typed in or open
  const r0 = App.refresh; App.refresh = function (...a) { const out = r0.apply(this, a); try { if (App.route.name === 'doc') BUBBLE.lastDoc = App.route.args[0]; BUBBLE.back.show(); } catch (e) { } return out; };
  addEventListener('resize', () => { if (BUBBLE.back.cur) BUBBLE.back.show(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !BUBBLE.back.cur || !BUBBLE.back.el || BUBBLE.back.el.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]')) return;
    if ($('.ovl') || $('.pop') || $('.ctx') || (window.getSelection && String(window.getSelection()).trim()) || (App.pane && App.pane.sel && (App.pane.sel.size || App.pane.sel.length)) || (typeof INK !== 'undefined' && INK.sel && INK.sel.boxes && INK.sel.boxes.length)) return;
    e.preventDefault(); BUBBLE.back.go();
  });
}
