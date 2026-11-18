/* ==========================================================================
   15f · Section icons and theme banners in the Portfolio (V4.17). Gabe:
   "The Experiment Section should have a flask symbol next to it. The Notes
   Section should have a paper with notes symbol next to it. The Lit Reviews
   should have an open book symbol next to it." — "Each theme has a horizontal
   banner with set pixel resolution, so that you can ask Claude to create a
   custom banner for it."
   - PFICON: monochrome icons (rm/js/icons.js paths, inline) by key — exp a
     flask, notes a page of notes, lit an open book, syn (Syntheses) a stack.
     Put before the label of each group (.pf-g[data-g] > .pf-gl), the Lit
     reviews heading and each button of the type switch ([data-k]), wherever
     PFLIST draws them; a group another module adds with its own key gets its
     icon by that key.
   - BANNER: every theme has a banner at 1600 × 200 px (8:1; V4.17 made it
     1600 × 320) — at the top of its section in the Portfolio and of its
     page. Click it: Choose an image… (MEDIA, theme.banner; other sizes are
     cropped to 8:1) or Remove. A theme without an image gets a quiet one
     drawn from its name, in the app's colours (light and dark follow the
     theme).
   - V4.25 (Gabe: "Banners should be thinner and have the title within it
     (specifically to the left horizontally, and the middle vertically)"):
     the theme's name is inside its banner, at the left and halfway down,
     over a soft wash of the page's colour so it reads on any image. In the
     Portfolio the name is the link to the theme (the header row under the
     banner keeps its pill, score, barriers and weeks, without the name); on
     the theme's page the name in the banner is the page's title.
   - V4.26 (Gabe: "The experiments, syntheses, notes, and lit reviews should
     all have their section header (meaning symbol and title) be in a rounded
     rectangle box that is color-coded universally across projects for users
     to see fast"): each header — its symbol, its word and its count — is a
     rounded box in its kind's colour (.pf-box; --sec-exp blue, --sec-syn
     plum, --sec-notes ochre, --sec-lit green, light and dark in
     31-banners.css), the same in every project; the symbols on the type
     switch take the same colours. Settings → Section headers → "Colour-coded
     boxes" turns the boxes off (the symbols stay).
   Settings: Section headers (pficons) and Theme banners (tbanner), 20a.
   ========================================================================== */
const PFICON = {
  PATHS: {"flask-conical": "<path d=\"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2\" /><path d=\"M6.453 15h11.094\" /><path d=\"M8.5 2h7\" />", "document-text": "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z\"/>", "book-open": "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25\"/>", "rectangle-stack": "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122\"/>"},
  BY: { exp: 'flask-conical', notes: 'document-text', lit: 'book-open', syn: 'rectangle-stack' },
  on: () => typeof FEAT === 'undefined' || FEAT.on('pficons'),
  /** V4.26: the headers in colour-coded boxes (Settings → Section headers → Colour-coded boxes). */
  boxed: () => { try { return PFICON.on() && FEAT.tune('pficons', 'box') !== 'off'; } catch (e) { return true; } },
  svg(key, size = 14) { const p = PFICON.PATHS[PFICON.BY[key] || key]; return p ? '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>' : ''; },
  el(key, size) { const s = h('span.pf-ico', { 'data-ico': key }); s.innerHTML = PFICON.svg(key, size); return s; },
  /** Put the icons into what PFLIST drew (groups, the Lit reviews heading), each header in its box (V4.26); idempotent. */
  dress(root) {
    if (!root || !root.querySelectorAll) return root;
    const box = PFICON.boxed();
    const one = (host, key) => { if (!host || !PFICON.PATHS[PFICON.BY[key] || '']) return; if (box) { host.classList.add('pf-box'); host.dataset.sk = key; } if (!host.querySelector(':scope > .pf-ico')) host.prepend(PFICON.el(key)); };
    const scan = el => {
      if (el.matches && el.matches('.pf-g[data-g]')) one(el.querySelector(':scope > .pf-gl'), el.dataset.g);
      el.querySelectorAll('.pf-g[data-g]').forEach(g => one(g.querySelector(':scope > .pf-gl'), g.dataset.g));
      const lits = el.matches && el.matches('.pf-lit') ? [el] : [...el.querySelectorAll('.pf-lit')];
      lits.forEach(l => one(l.querySelector(':scope > .pf-sh > .pf-gl') || l.querySelector(':scope > .pf-sh'), 'lit'));
    };
    scan(root); return root;
  },
};

const BANNER = {
  W: 1600, H: 200,   // V4.25: 8 : 1 (V4.17: 1600 × 320)
  on: () => typeof FEAT === 'undefined' || FEAT.on('tbanner'),
  where: () => { let w = 'both'; try { w = FEAT.tune('tbanner', 'where') || 'both'; } catch (e) { } return w; },
  shows: place => BANNER.on() && (BANNER.where() === 'both' || BANNER.where() === place),
  /** A small seeded random: the same theme always draws the same banner. */
  seed(str) { let x = 2166136261; for (const c of String(str || 'theme')) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; },
  /** The banner drawn from the theme's name: soft hills in one hue, mixed into the page's own colours (so dark follows the theme), and a few contour lines. */
  drawn(key) {
    const r = BANNER.seed(key), H0 = Math.floor(r() * 360), W = BANNER.W, Hh = BANNER.H;
    const hue = (dh, s, l) => 'hsl(' + ((H0 + dh + 360) % 360) + ' ' + s + '% ' + l + '%)';
    const mix = (base, pct, c) => 'color-mix(in srgb, var(' + base + ') ' + (100 - pct) + '%, ' + c + ')';
    // a smooth line through n points (quadratic curves through the midpoints)
    const curve = pts => { let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1); for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1); } const z = pts[pts.length - 1]; return d + ' L' + z[0].toFixed(1) + ' ' + z[1].toFixed(1); };
    const line = (y0, amp, ph, k, n) => Array.from({ length: n + 1 }, (_, i) => [W * i / n, y0 + Math.sin(ph + i * k) * amp]);
    const hill = (y0, amp, ph, k) => curve(line(y0, amp, ph, k, 8)) + ' L' + W + ' ' + Hh + ' L0 ' + Hh + ' Z';
    let g ='<rect width="' + W + '" height="' + Hh + '" style="fill:' + mix('--surface-2', 16, hue(0, 40, 50)) + '"/>';
    for (let i = 0; i < 4; i++) {
      const y0 = Hh * (0.34 + i * 0.16 + r() * 0.06), amp = 14 + r() * 26, ph = r() * 6.28, k = 0.5 + r() * 0.7;
      g += '<path d="' + hill(y0, amp, ph, k) + '" style="fill:' + mix('--surface', 18 + i * 9, hue(i * 14 - 10, 38, 46)) + ';opacity:.92"/>';
    }
    for (let i = 0; i < 6; i++) { const y0 = Hh * (0.12 + i * 0.13), amp = 6 + r() * 18, ph = r() * 6.28, k = 0.2 + r() * 0.4;
      g += '<path d="' + curve(line(y0, amp, ph, k, 16)) + '" fill="none" stroke-width="1.2" style="stroke:color-mix(in srgb, var(--ink) 9%, transparent)"/>'; }
    const cx = W * (0.62 + r() * 0.3), cy = Hh * (0.18 + r() * 0.2), rr = 34 + r() * 30;
    g += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '" style="fill:' + mix('--surface', 30, hue(28, 50, 58)) + ';opacity:.55"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" focusable="false">' + g + '</svg>';
  },
  /** The banner of a theme: its image (cropped to 8:1) or the drawn one, with the theme's name inside (V4.25). Click (or Enter): choose an image, or remove it. */
  el(t, place) {
    const rec = t.banner && MEDIA.get(t.banner), mine = !t.rm, el = h('div.tb-ban' + (rec ? '.img' : '.drawn'), { 'data-t': t.id, 'data-place': place, role: mine ? 'button' : 'img', tabindex: mine ? '0' : '-1',
      'aria-label': 'Banner of ' + t.name + (mine ? ' — choose an image (' + BANNER.W + ' × ' + BANNER.H + ' px)' : ''), title: mine ? 'Banner · ' + BANNER.W + ' × ' + BANNER.H + ' px — click to choose an image' : 'Banner',
      on: mine ? { click: e => { e.preventDefault(); e.stopPropagation(); BANNER.menu(t.id, e.clientX, e.clientY + 6); }, keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = el.getBoundingClientRect(); BANNER.menu(t.id, r.left + 16, r.bottom + 4); } } } : {} });
    if (rec) { const im = MEDIA.el(rec, { cls: 'tb-im' }); el.append(im); } else el.innerHTML = BANNER.drawn(t.id + '|' + t.name);
    el.append(BANNER.name(t, place));
    return el;
  },
  /** V4.25: the theme's name inside its banner — the link to the theme in the Portfolio, the page's title on its page. */
  name(t, place) {
    if (place === 'page') return h('h1.tb-name', { title: t.name }, t.name);
    const stop = e => e.stopPropagation();
    return h('a.tb-name', { href: '#/theme/' + t.id, title: 'Open the theme', on: { click: stop, pointerdown: stop, keydown: stop } }, t.name);
  },
  menu(id, x, y) {
    const t = M.theme(id); if (!t) return;
    ctxMenu(x, y, [{ head: 'Banner · ' + BANNER.W + ' × ' + BANNER.H + ' px' },
      { label: 'Choose an image…', sub: BANNER.W + ' × ' + BANNER.H + ' px (8 : 1) — ask Claude for one at this size; other sizes are cropped to fit. The theme’s name is written over its left side', run: () => BANNER.choose(id) },
      t.banner ? { label: 'Remove the image', sub: 'Back to the banner drawn from its name', run: () => BANNER.set(id, null) } : null]);
  },
  choose(id) {
    const inp = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    inp.addEventListener('change', async () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) await BANNER.useFile(id, f); });
    document.body.append(inp); inp.click();
  },
  async useFile(id, file) {
    if (!/^image\//.test(file.type || '') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name || '')) { toast('A banner is an image'); return null; }
    const rec = await MEDIA.add(file); BANNER.set(id, rec.id);
    if (rec.w && rec.h && (rec.w !== BANNER.W || rec.h !== BANNER.H)) toast('Banner set — ' + rec.w + ' × ' + rec.h + ' px, shown cropped to 8 : 1 (' + BANNER.W + ' × ' + BANNER.H + ' px fits exactly)', 4200);
    else toast('Banner set');
    return rec;
  },
  set(id, mediaId) { const t = M.theme(id); if (!t) return; if (mediaId) t.banner = mediaId; else delete t.banner; t.modified = isoLocal(new Date()); DB.put('themes', t); changed(); },
};
{
  // the icons, wherever PFLIST draws a group, the Lit reviews heading or the type switch
  const items = PFLIST.items; PFLIST.items = function () { const out = items.apply(this, arguments); try { if (PFICON.on()) (out || []).forEach(el => PFICON.dress(el)); } catch (e) { console.warn('[pficons]', e); } return out; };
  const seg = PFLIST.seg; PFLIST.seg = function () { const w = seg.apply(this, arguments); try { if (PFICON.on()) $$('button[data-k]', w).forEach(b => { if (PFICON.BY[b.dataset.k] && !$(':scope > .pf-ico', b)) b.prepend(PFICON.el(b.dataset.k, 13)); }); } catch (e) { console.warn('[pficons]', e); } return w; };
  // a theme's banner at the top of its section in the Portfolio
  const sec = PFLIST.section; PFLIST.section = function (row, c) { const el = sec.apply(this, arguments); try { if (c && c.t && el && BANNER.shows('portfolio')) { el.prepend(BANNER.el(c.t, 'portfolio')); el.classList.add('tb-has'); } } catch (e) { console.warn('[banner]', e); } return el; };   // V4.25: .tb-has — the name is in the banner, not in the row under it
  // …and of its page: under the project's name, and its name is the page's title (V4.25)
  const tv = ThemeView.render; ThemeView.render = function (id) { const page = tv.apply(this, arguments); try { const t = M.theme(id); if (t && page && page.prepend && BANNER.shows('page')) {
    const ban = BANNER.el(t, 'page'), h1 = $(':scope > h1.title', page); if (h1) { h1.replaceWith(ban); } else page.prepend(ban); page.classList.add('tb-has'); } } catch (e) { console.warn('[banner]', e); } return page; };
}
