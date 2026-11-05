/* ==========================================================================
   08b · The floating bar — one look for every bar that floats over the
   paper: the text editor bar above a component (13zzf), the lasso's
   selection bar (13zf, 13zu…) and the Ctrl+Enter strip (09). Same-size
   buttons (28 px), groups parted by a hairline, wrapping to new rows within
   a width instead of growing past it. It never takes the focus from an
   editor (mousedown is swallowed), so the caret and the selection stay.
   ========================================================================== */
const FBAR = {
  SIZE: 28,
  /** A button. `icon`: text, an element, or {svg} markup; `run(e)` gets the click; `on` lights it; `key` goes in the title. */
  btn(icon, title, run, { on = false, cls = '', key = '' } = {}) {
    const b = h('button.fbar-b' + (cls ? '.' + cls.split(' ').join('.') : '') + (on ? '.on' : ''), { title: key ? title + ' (' + key + ')' : title, type: 'button',
      on: { mousedown: e => e.preventDefault(), click: e => { e.stopPropagation(); run(e); } } });
    if (icon && icon.nodeType) b.append(icon); else if (icon && typeof icon === 'object' && icon.svg) b.innerHTML = icon.svg; else b.append(icon || '');
    return b;
  },
  sep: () => h('span.fbar-sep'),
  /** The bar: `items` are buttons, separators or elements (null skipped). */
  make(items, { cls = '', width } = {}) {
    const bar = h('div.fbar' + (cls ? '.' + cls.split(' ').join('.') : ''), { on: { mousedown: e => e.preventDefault() } }, items.filter(Boolean));
    if (width) bar.style.width = width + 'px';
    return bar;
  },
  /** Put a fixed bar just above a screen rect (below it when there is no room above `top`), no wider than the rect and never narrower than `min`. */
  place(bar, r, { min = 150, max = 760, gap = 6, top = 0 } = {}) {
    const w = clamp(Math.round(r.width), min, max); bar.style.width = w + 'px'; bar.style.left = clamp(Math.round(r.left), 4, innerWidth - w - 4) + 'px';
    const hgt = bar.offsetHeight || FBAR.SIZE + 10, above = r.top - hgt - gap;
    bar.classList.toggle('below', above < top); bar.style.top = Math.round(above >= top ? above : r.bottom + gap) + 'px';
  },
  /** A monochrome glyph drawn as strokes, the weight of the pills' icons. */
  svg: (paths, vb = '0 0 24 24') => ({ svg: `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>` }),
};
