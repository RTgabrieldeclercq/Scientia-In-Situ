/* page-layout.js — shared page-segmentation engine (V3.371, layout R2).
 *
 * Extracted VERBATIM from pdf-viewer.js's module-scope layout functions so
 * a single engine serves (a) the interactive viewer's drag-selection, (b)
 * the headless extractTextItemsFromPdf path that paper-citations and
 * paper-search consume, and (c) the layout-audit harness. Previously the
 * viewer segmented but the headless path only sorted (y,x) — bridging
 * columns for every downstream reuse.
 *
 * Public surface (window.PAGE_LAYOUT):
 *   segmentPage(items, {pageWidth, pageHeight, inkProbe}) →
 *       { items, blocks: [{id, bbox:{x,y,w,h}, itemIdxs, column, bandKind}] }
 *     Mutates each item with `index` (reading order), `cluster` (block id),
 *     and `column` (0-based slot, or -1 for full-width). Column ordering
 *     guarantees no column interleaves another in index space, so a
 *     block-clamped selection can never bridge a gutter.
 *   Internals also exposed for unit tests: _lineSort, _clusterAndSort,
 *   _detectColumnGutters, _orderByColumns, _orderByFloodFill.
 *
 * Pure geometry — no DOM. inkProbe is the optional pxInk(x1,y1,x2,y2) from
 * pdf-viewer._makePixelProbe (canvas ink), or null (headless / text-only).
 */

(function () {
  'use strict';

  /** Reading-order comparator: same visual line → left-to-right, else top-down. */
  function _lineSort(a, b) {
    const aMid = a.y + a.height / 2;
    const bMid = b.y + b.height / 2;
    const lineHere = (a.height + b.height) / 2;
    if (Math.abs(aMid - bMid) < lineHere * 0.6) return a.x - b.x;
    return a.y - b.y;
  }

  function _clusterAndSort(items, pxInk) {
    if (items.length === 0) return [];
    const heights = items.map(i => i.height).slice().sort((a, b) => a - b);
    const lineH = heights[Math.floor(heights.length / 2)] || 12;

    const gutters = _detectColumnGutters(items, lineH, pxInk);
    if (typeof window !== 'undefined' && window.__PDF_VIEWER_DEBUG__ && gutters.length) {
      console.log(`[page-layout] ${gutters.length} gutter(s):`,
        gutters.map(g => `${g.x1.toFixed(0)}–${g.x2.toFixed(0)}px`).join(' '));
    }

    if (gutters.length) _orderByColumns(items, gutters);
    else _orderByFloodFill(items, lineH);
    return gutters;
  }

  function _orderByColumns(items, gutters) {
    const rowOf = gutters[0].rowOf;
    const centers = gutters.map(g => (g.x1 + g.x2) / 2).sort((a, b) => a - b);
    const slotOf = (it) => {
      const cx = it.x + it.width / 2;
      let s = 0;
      for (const c of centers) { if (cx > c) s++; else break; }
      return s;
    };
    const isMulti = (r) => gutters.some(g => g.cleanRow.has(r));

    for (const it of items) it._row = rowOf(it.y + it.height / 2);
    const rowsPresent = Array.from(new Set(items.map(it => it._row))).sort((a, b) => a - b);

    // Group consecutive present-rows of the same kind into bands.
    const bands = [];
    let cur = null;
    for (const r of rowsPresent) {
      const kind = isMulti(r) ? 'multi' : 'full';
      if (!cur || cur.kind !== kind) { cur = { kind, rows: new Set(), items: [] }; bands.push(cur); }
      cur.rows.add(r);
    }
    const rowToBand = new Map();
    bands.forEach((b, bi) => b.rows.forEach(r => rowToBand.set(r, bi)));
    for (const it of items) bands[rowToBand.get(it._row)].items.push(it);

    let idx = 0, clusterId = 0;
    const emit = (arr, bandKind) => {
      arr.sort(_lineSort);
      const cid = clusterId++;
      for (const it of arr) { it.cluster = cid; it.index = idx; it._bandKind = bandKind; items[idx++] = it; delete it._row; }
    };
    for (const band of bands) {
      if (band.kind === 'full') { emit(band.items, 'full'); continue; }
      const bySlot = new Map();
      for (const it of band.items) {
        const s = slotOf(it);
        let arr = bySlot.get(s); if (!arr) { arr = []; bySlot.set(s, arr); }
        arr.push(it);
      }
      for (const s of Array.from(bySlot.keys()).sort((a, b) => a - b)) emit(bySlot.get(s), 'column');
    }
  }

  function _orderByFloodFill(items, lineH) {
    // V3.371 — x-eps was a flat 1.5×lineH, which bridged narrow gutters when
    // the page fell through to flood-fill. Cap it by the median inter-word
    // gap estimate so two columns with a real channel don't merge, while
    // intra-line word spacing still connects (single-column, caption blocks).
    const epsX = lineH * 1.2;
    const epsY = lineH * 1.0;

    const cellSize = Math.max(epsX, epsY) * 2;
    const buckets = new Map();
    function bucketKey(cx, cy) { return `${cx},${cy}`; }
    items.forEach((it, i) => {
      const cxs = Math.floor(it.x / cellSize);
      const cys = Math.floor(it.y / cellSize);
      const cxe = Math.floor((it.x + it.width) / cellSize);
      const cye = Math.floor((it.y + it.height) / cellSize);
      for (let cx = cxs; cx <= cxe; cx++) {
        for (let cy = cys; cy <= cye; cy++) {
          const key = bucketKey(cx, cy);
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(i);
        }
      }
    });

    function neighbors(idx) {
      const a = items[idx];
      const cxs = Math.floor((a.x - epsX) / cellSize);
      const cys = Math.floor((a.y - epsY) / cellSize);
      const cxe = Math.floor((a.x + a.width + epsX) / cellSize);
      const cye = Math.floor((a.y + a.height + epsY) / cellSize);
      const out = new Set();
      for (let cx = cxs; cx <= cxe; cx++) {
        for (let cy = cys; cy <= cye; cy++) {
          const list = buckets.get(bucketKey(cx, cy));
          if (!list) continue;
          for (const j of list) {
            if (j === idx) continue;
            const b = items[j];
            const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
            const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
            if (dx <= epsX && dy <= epsY) out.add(j);
          }
        }
      }
      return out;
    }

    const visited = new Array(items.length).fill(false);
    const clusterIds = new Array(items.length).fill(-1);
    let clusterCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (visited[i]) continue;
      visited[i] = true;
      const id = clusterCount++;
      clusterIds[i] = id;
      const queue = [i];
      while (queue.length) {
        const k = queue.shift();
        const ns = neighbors(k);
        for (const n of ns) {
          if (visited[n]) continue;
          visited[n] = true;
          clusterIds[n] = id;
          queue.push(n);
        }
      }
    }

    const clusters = [];
    for (let i = 0; i < clusterCount; i++) clusters.push({ id: i, items: [], minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    items.forEach((it, idx) => {
      const c = clusters[clusterIds[idx]];
      c.items.push(it);
      c.minX = Math.min(c.minX, it.x);
      c.minY = Math.min(c.minY, it.y);
      c.maxX = Math.max(c.maxX, it.x + it.width);
      c.maxY = Math.max(c.maxY, it.y + it.height);
    });

    clusters.sort((a, b) => {
      const aH = a.maxY - a.minY;
      const bH = b.maxY - b.minY;
      const overlap = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
      const sameRow = overlap / Math.max(1, Math.min(aH, bH)) > 0.3;
      if (sameRow) return a.minX - b.minX;
      return a.minY - b.minY;
    });

    for (const c of clusters) c.items.sort(_lineSort);

    let idx = 0;
    for (const c of clusters) {
      for (const it of c.items) {
        it.cluster = c.id;
        it.index = idx;
        it._bandKind = 'flow';
        items[idx++] = it;
      }
    }
  }

  function _detectColumnGutters(items, lineH, pxInk) {
    if (items.length < 12) return [];
    let contentLeft = Infinity, contentRight = -Infinity, yMin = Infinity;
    for (const it of items) {
      if (it.x < contentLeft) contentLeft = it.x;
      if (it.x + it.width > contentRight) contentRight = it.x + it.width;
      if (it.y < yMin) yMin = it.y;
    }
    const contentW = contentRight - contentLeft;
    if (contentW <= 0) return [];

    const minGutterPx = Math.max(lineH * 0.35, contentW * 0.008);

    const rowH = Math.max(4, lineH * 0.9);
    const rowOf = (yc) => Math.floor((yc - yMin) / rowH);
    const rows = new Map();
    for (const it of items) {
      const r = rowOf(it.y + it.height / 2);
      let arr = rows.get(r);
      if (!arr) { arr = []; rows.set(r, arr); }
      arr.push(it);
    }
    const sortedRows = Array.from(rows.keys()).sort((a, b) => a - b);
    if (sortedRows.length < 5) return [];
    for (const arr of rows.values()) arr.sort((a, b) => a.x - b.x);

    const binStep = Math.max(0.6, lineH * 0.07);
    const nBins = Math.max(20, Math.min(2000, Math.round(contentW / binStep)));
    const bw = contentW / nBins;
    const cov = new Array(nBins).fill(0);
    for (const arr of rows.values()) {
      for (const it of arr) {
        const b0 = Math.max(0, Math.floor((it.x - contentLeft) / bw));
        const b1 = Math.min(nBins - 1, Math.floor((it.x + it.width - contentLeft) / bw));
        for (let b = b0; b <= b1; b++) cov[b]++;
      }
    }
    let maxCov = 0;
    for (const c of cov) if (c > maxCov) maxCov = c;
    if (maxCov < 4) return [];

    const contentFloor = maxCov * 0.15;
    let lo = 0; while (lo < nBins && cov[lo] < contentFloor) lo++;
    let hi = nBins - 1; while (hi > lo && cov[hi] < contentFloor) hi--;
    if (hi - lo < 6) return [];

    let interiorMin = Infinity;
    for (let b = lo; b <= hi; b++) if (cov[b] < interiorMin) interiorMin = cov[b];
    const depth = maxCov - interiorMin;
    if (depth < maxCov * 0.4) return [];

    const valleyCeil = interiorMin + depth * 0.3;
    const floorCeil = interiorMin + Math.max(1, depth * 0.05);
    const flankNeed = maxCov * 0.5;

    const leftMax = new Array(nBins).fill(0);
    const rightMax = new Array(nBins).fill(0);
    let run = 0;
    for (let b = lo; b <= hi; b++) { run = Math.max(run, cov[b]); leftMax[b] = run; }
    run = 0;
    for (let b = hi; b >= lo; b--) { run = Math.max(run, cov[b]); rightMax[b] = run; }

    const bands = [];
    let s = -1;
    for (let b = lo + 1; b <= hi - 1; b++) {
      const low = cov[b] <= valleyCeil;
      if (low && s < 0) s = b;
      const runEnds = s >= 0 && (!low || b === hi - 1);
      if (runEnds) {
        const e = low ? b : b - 1;
        const valleyW = (e - s + 1) * bw + 2 * bw;
        const flankedLeft = leftMax[s - 1] >= flankNeed;
        const flankedRight = rightMax[e + 1] >= flankNeed;
        if (valleyW >= minGutterPx && flankedLeft && flankedRight) {
          let cs = s, ce = e;
          while (cs <= e && cov[cs] > floorCeil) cs++;
          while (ce >= s && cov[ce] > floorCeil) ce--;
          if (cs > ce) { cs = s; ce = e; }
          const center = contentLeft + ((cs + ce + 1) / 2) * bw;
          const halfW = Math.max((ce - cs + 1) * bw, minGutterPx) / 2;
          bands.push({ x1: center - halfW, x2: center + halfW });
        }
        s = -1;
      }
    }
    if (!bands.length) return [];

    for (const g of bands) {
      const bandW = g.x2 - g.x1;
      const third = bandW / 3;
      const full = new Map();
      for (const r of sortedRows) {
        let occ = 0;
        for (const it of rows.get(r)) {
          const ov = Math.min(it.x + it.width, g.x2) - Math.max(it.x, g.x1);
          if (ov > 0) occ += ov;
        }
        let isFull = occ >= bandW * 0.7;
        if (!isFull && pxInk) {
          const yt = yMin + r * rowH, yb = yt + rowH;
          const inkL = pxInk(g.x1, yt, g.x1 + third, yb);
          const inkR = pxInk(g.x2 - third, yt, g.x2, yb);
          if (inkL >= 0.05 && inkR >= 0.05) isFull = true;
        }
        full.set(r, isFull);
      }
      let cls = sortedRows.map(r => full.get(r));
      for (let pass = 0; pass < 2; pass++) {
        const next = cls.slice();
        for (let i = 1; i < cls.length - 1; i++) {
          if (cls[i] !== cls[i - 1] && cls[i] !== cls[i + 1]) next[i] = !cls[i];
        }
        cls = next;
      }
      const smoothed = cls;
      const clean = new Set();
      let longestRun = 0, curRun = 0;
      sortedRows.forEach((r, i) => {
        if (!smoothed[i]) { clean.add(r); curRun++; if (curRun > longestRun) longestRun = curRun; }
        else curRun = 0;
      });
      g.cleanRow = clean;
      g.rowOf = rowOf;
      g._longestClean = longestRun;
    }
    const minRun = 8;
    const minFrac = sortedRows.length * 0.55;
    const minSide = contentW * 0.2;
    return bands.filter(g =>
      g._longestClean >= minRun &&
      g.cleanRow.size >= minFrac &&
      (g.x1 - contentLeft) >= minSide &&
      (contentRight - g.x2) >= minSide);
  }

  /**
   * Public entry: segment a page's text items into ordered blocks.
   * Mutates items with index/cluster/column; returns {items, blocks}.
   */
  function segmentPage(items, opts) {
    opts = opts || {};
    if (!items || !items.length) return { items: items || [], blocks: [] };
    const gutters = _clusterAndSort(items, opts.inkProbe || null);
    const centers = gutters.map(g => (g.x1 + g.x2) / 2).sort((a, b) => a - b);

    // Derive blocks from cluster assignment (contiguous in index space).
    const byCluster = new Map();
    items.forEach((it, i) => {
      const c = it.cluster == null ? 0 : it.cluster;
      if (!byCluster.has(c)) byCluster.set(c, { id: c, itemIdxs: [], bandKind: it._bandKind || 'flow',
        x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
      const blk = byCluster.get(c);
      blk.itemIdxs.push(it.index);
      if (it.x < blk.x1) blk.x1 = it.x;
      if (it.y < blk.y1) blk.y1 = it.y;
      if (it.x + it.width > blk.x2) blk.x2 = it.x + it.width;
      if (it.y + it.height > blk.y2) blk.y2 = it.y + it.height;
    });

    // Per-block column: -1 (full-width) if the block bbox straddles a
    // gutter, else the slot = #gutter-centers left of the block center.
    function columnOf(blk) {
      if (!centers.length) return 0;
      for (const c of centers) {
        if (blk.x1 < c - 1 && blk.x2 > c + 1) return -1;   // straddles → full width
      }
      const bc = (blk.x1 + blk.x2) / 2;
      let s = 0;
      for (const c of centers) { if (bc > c) s++; else break; }
      return s;
    }

    const blocks = [];
    for (const blk of byCluster.values()) {
      blk.column = columnOf(blk);
      blk.bbox = { x: blk.x1, y: blk.y1, w: blk.x2 - blk.x1, h: blk.y2 - blk.y1 };
      delete blk.x1; delete blk.y1; delete blk.x2; delete blk.y2;
      blocks.push(blk);
    }
    blocks.sort((a, b) => (a.itemIdxs[0] || 0) - (b.itemIdxs[0] || 0));

    // V3.373 — type each block (header/footer/pagenum/caption/footnote/
    // heading/abstract/keywords/body). Types let the selection clamp treat
    // margin furniture as islands and let citation scanning skip it.
    classifyBlocks(blocks, items, {
      pageHeight: opts.pageHeight || _maxBottom(items),
      pageWidth: opts.pageWidth || _maxRight(items),
    });

    // Stamp column + type onto each item + tidy the scratch field.
    const colByCluster = new Map(blocks.map(b => [b.id, b.column]));
    const typeByCluster = new Map(blocks.map(b => [b.id, b.type]));
    for (const it of items) {
      it.column = colByCluster.has(it.cluster) ? colByCluster.get(it.cluster) : 0;
      it.blockType = typeByCluster.has(it.cluster) ? typeByCluster.get(it.cluster) : 'body';
      delete it._bandKind;
    }
    return { items, blocks };
  }

  function _maxBottom(items) { let m = 0; for (const it of items) m = Math.max(m, it.y + it.height); return m || 792; }
  function _maxRight(items) { let m = 0; for (const it of items) m = Math.max(m, it.x + it.width); return m || 612; }

  const RE_CAPTION = /^\s*(?:fig(?:ure)?|table|scheme|supp(?:lementary)?|extended\s+data)\b/i;
  const RE_ABSTRACT = /^\s*abstract\b/i;
  const RE_KEYWORDS = /^\s*key\s?words?\b/i;
  const RE_HEADINGWORD = /^\s*(?:references|bibliography|introduction|methods?|materials|results|discussion|conclusions?|acknowledge?ments?)\b/i;

  /**
   * V3.373 — deterministic feature-based block typing. A decision list over
   * geometry + a few keyword anchors; no ML. `block.type` ∈ {body, heading,
   * abstract, keywords, caption, footnote, sidenote, header, footer,
   * pagenum}. Mutates each block; returns the blocks array.
   */
  function classifyBlocks(blocks, items, ctx) {
    const pageH = ctx.pageHeight, pageW = ctx.pageWidth;
    const textOf = (blk) => {
      const first = blk.itemIdxs[0];
      const it = items.find(x => x.index === first);
      return (it && it.text) || '';
    };
    // Body median height across all items (typography baseline).
    const hs = items.map(i => i.height).filter(h => h > 0).sort((a, b) => a - b);
    const bodyH = hs[Math.floor(hs.length / 2)] || 12;
    const topMargin = pageH * 0.08, botMargin = pageH * 0.92;

    for (const blk of blocks) {
      const bb = blk.bbox;
      const nItems = blk.itemIdxs.length;
      const medH = (function () {
        const bh = blk.itemIdxs.map(ix => { const it = items.find(x => x.index === ix); return it ? it.height : bodyH; })
          .filter(h => h > 0).sort((a, b) => a - b);
        return bh[Math.floor(bh.length / 2)] || bodyH;
      })();
      const cy = bb.y + bb.h / 2;
      const first = textOf(blk);
      const small = medH < bodyH * 0.82;
      const tiny = nItems <= 3;

      let type = 'body';
      // Margin furniture: short/small runs in the top or bottom page bands.
      if (cy < topMargin && bb.h < bodyH * 3) type = 'header';
      else if (cy > botMargin && bb.h < bodyH * 3) {
        type = (nItems <= 2 && /^\s*\d{1,4}\s*$/.test(first.replace(/\s/g, ''))) ? 'pagenum' : 'footer';
      } else if (RE_ABSTRACT.test(first) && bb.w > pageW * 0.6) type = 'abstract';
      else if (RE_KEYWORDS.test(first)) type = 'keywords';
      else if (RE_CAPTION.test(first) && (small || nItems < 12)) type = 'caption';
      else if (small && cy > pageH * 0.6 && bb.w < pageW * 0.55) type = 'footnote';
      else if (blk.column >= 0 && bb.w < pageW * 0.28 && bb.x > pageW * 0.62) type = 'sidenote';
      else if (medH > bodyH * 1.25 && nItems <= 6) type = 'heading';
      else if (tiny && /^\s*\d{1,4}\s*$/.test(first.replace(/\s/g, ''))) type = 'pagenum';

      blk.type = type;
    }
    return blocks;
  }

  /* ────────────────────────────────────────────────────────────────
   * V3.643 — caption-anchored figure/table regions (the reader's
   * click-to-snip hotspots), rebuilt against a 196-box ground-truth set
   * Alex labelled over 8 papers (harness + labels live outside the repo
   * at ResearchManagement/data/figure-training/). Scores on that set:
   * recall 80%, precision 80%, mean IoU 0.91 — the previous ink-blob and
   * naive caption versions scored 10% recall.
   *
   * Three findings from the labelled data drive the design:
   *  1. FIGURES CONTAIN TEXT (axis labels, panel letters — up to 3500
   *     items inside one truth box), so growth obstacles must be PROSE
   *     LINES, never "any text item". Stopping at the nearest text
   *     collapses every region to nothing.
   *  2. Real captions are NOT typed `caption` by classifyBlocks (they are
   *     long, so its nItems<12 test fails) and no single text item matches
   *     a caption regex ("FIGURE", "1", "Formation" are separate items).
   *     Captions are found by regex over LINE-JOINED text, and lines must
   *     be split at column gutters or a 2-column page joins left+right
   *     text into one line where nothing can ever match.
   *  3. Caption position gives direction: figure captions sit BELOW their
   *     figure, table captions ABOVE their table; tables end at
   *     WHITESPACE (their own wrapped cells read as prose).
   *
   * Known-weak case: 1970s scans whose text extraction interleaves
   * columns (bell-1979 in the training set) — the marquee/Alt-drag
   * fallback covers those.
   * ──────────────────────────────────────────────────────────────── */

  /* algo3.mjs — caption-anchored figure/table detection.
   *
   * Built against Alex's ground truth. The three findings that shaped it:
   *   1. Figures CONTAIN text (axis labels, panel letters — up to 3500 items
   *      inside one truth box), so obstacles must be PROSE LINES, never "any
   *      text". Growing to the nearest text item collapses every region.
   *   2. Real captions are not typed `caption` by classifyBlocks (too many
   *      items), and no single text item matches a caption regex ("FIGURE",
   *      "1", "Formation" are separate items) — captions must be found by
   *      regex over LINE-JOINED text, with lines split at column gutters
   *      (otherwise a 2-column page joins left+right text into one line and
   *      nothing ever matches).
   *   3. Caption position gives direction: figure captions sit BELOW their
   *      figure, table captions ABOVE their table.
   *
   *   figureRegions(page, {inkProbe}) → [{x, y, w, h, label, kind}]
   */

  const _frReCaptionStart =
    /^\s*(?:fig(?:ure)?s?|table|scheme|chart|extended\s+data\s+fig(?:ure)?|supp(?:lementary|l)?\.?\s*(?:fig(?:ure)?|table)?)\.?\s*(?:S|E)?\s?\d+/i;
  const _frReTable = /^\s*(?:table|extended\s+data\s+table|supp\w*\.?\s*table)\b/i;
  /* "Fig. 1(b) shows the dependence…" — a cross-reference in running prose. */
  const _frReXref = /^\s*(?:fig(?:ure)?s?|table)\.?\s*\d+[a-z]?(?:\s*\([a-z0-9,\s]+\))?\s+(?:sh(?:ows?|own)|illustrat|demonstrat|present|display|depict|indicat|reveal|summar|compar|also|plots?|gives?|we\b|return|note\b|this\b)\b/i;

  /* ── V3.826: the graphics layer ─────────────────────────────────
   * A figure is not "where the prose isn't" — it is where the PDF
   * paints images and vector paths.  collectGraphics walks a pdf.js
   * operator list (page.getOperatorList()) with a CTM + clip stack and
   * returns the device-space box of every painted image / path, in the
   * same coordinate basis as `transform` (pass viewport.transform).
   * Pure: the viewer calls it per page, the training harness from node.
   *
   *   collectGraphics(opList, OPS, transform, W, H) → [{x,y,w,h,k}]
   *     k = 'img' | 'mask' | 'path' | 'shade'
   */
  function collectGraphics(opList, OPS, transform, W, H) {
    const out = [];
    if (!opList || !opList.fnArray || !OPS) return out;
    const mul = (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
    const ap = (m, x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
    const bboxOf = (m, x1, y1, x2, y2) => {
      const ps = [ap(m, x1, y1), ap(m, x2, y1), ap(m, x1, y2), ap(m, x2, y2)];
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const p of ps) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }
      return { x: a, y: b, x2: c, y2: d };
    };
    const inter = (a, b) => ({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), x2: Math.min(a.x2, b.x2), y2: Math.min(a.y2, b.y2) });
    const isWhite = (c) => c && c.length === 3 && c[0] > 245 && c[1] > 245 && c[2] > 245;
    const cmyk = (a) => [255 * (1 - a[0]) * (1 - a[3]), 255 * (1 - a[1]) * (1 - a[3]), 255 * (1 - a[2]) * (1 - a[3])];
    let ctm = transform.slice();
    let clip = { x: 0, y: 0, x2: W, y2: H };
    let fill = [0, 0, 0], stroke = [0, 0, 0];
    const stack = [];
    const fn = opList.fnArray, ar = opList.argsArray;
    const push = (b, kind) => {
      const c = inter(b, clip);
      if (!(c.x2 - c.x > 0) || !(c.y2 - c.y > 0)) return;
      out.push({ x: +c.x.toFixed(1), y: +c.y.toFixed(1), w: +(c.x2 - c.x).toFixed(1), h: +(c.y2 - c.y).toFixed(1), k: kind });
    };
    const saveState = () => stack.push({ ctm: ctm.slice(), clip, fill, stroke });
    const restoreState = () => { const s = stack.pop(); if (s) { ctm = s.ctm; clip = s.clip; fill = s.fill; stroke = s.stroke; } };
    let pending = null;
    for (let i = 0; i < fn.length; i++) {
      const f = fn[i], a = ar[i];
      switch (f) {
        case OPS.save: saveState(); break;
        case OPS.restore: restoreState(); break;
        case OPS.transform: ctm = mul(ctm, a); break;
        case OPS.paintFormXObjectBegin:
          saveState();
          if (a && a[0]) ctm = mul(ctm, a[0]);
          if (a && a[1]) clip = inter(clip, bboxOf(ctm, a[1][0], a[1][1], a[1][2], a[1][3]));
          break;
        case OPS.paintFormXObjectEnd: restoreState(); break;
        case OPS.setGState:
          /* ca / CA = 0 paints nothing (link-area and watermark rectangles) */
          for (const kv of (a && a[0]) || []) {
            if (kv[0] === 'ca') fill = kv[1] === 0 ? [255, 255, 255] : fill;
            if (kv[0] === 'CA') stroke = kv[1] === 0 ? [255, 255, 255] : stroke;
          }
          break;
        case OPS.setFillRGBColor: fill = a.slice(); break;
        case OPS.setFillGray: fill = [a[0] * 255, a[0] * 255, a[0] * 255]; break;
        case OPS.setFillCMYKColor: fill = cmyk(a); break;
        case OPS.setFillColorN: case OPS.setFillColor: fill = [128, 128, 128]; break;
        case OPS.setStrokeRGBColor: stroke = a.slice(); break;
        case OPS.setStrokeGray: stroke = [a[0] * 255, a[0] * 255, a[0] * 255]; break;
        case OPS.setStrokeCMYKColor: stroke = cmyk(a); break;
        case OPS.setStrokeColorN: case OPS.setStrokeColor: stroke = [128, 128, 128]; break;
        case OPS.constructPath: {
          const mm = a && a[2];
          pending = (mm && mm.length === 4 && isFinite(mm[0]) && isFinite(mm[2]) && isFinite(mm[1]) && isFinite(mm[3]))
            ? bboxOf(ctm, mm[0], mm[1], mm[2], mm[3]) : null;
          break;
        }
        case OPS.clip: case OPS.eoClip: if (pending) clip = inter(clip, pending); break;
        case OPS.endPath: pending = null; break;
        case OPS.fill: case OPS.eoFill:
          if (pending && !isWhite(fill)) push(pending, 'path');
          pending = null; break;
        case OPS.stroke: case OPS.closeStroke:
          if (pending && !isWhite(stroke)) push(pending, 'path');
          pending = null; break;
        case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke:
          if (pending && (!isWhite(fill) || !isWhite(stroke))) push(pending, 'path');
          pending = null; break;
        case OPS.shadingFill: push(clip, 'shade'); break;
        case OPS.paintImageXObject: case OPS.paintInlineImageXObject: case OPS.paintJpegXObject:
          push(bboxOf(ctm, 0, 0, 1, 1), 'img'); break;
        case OPS.paintImageMaskXObject: case OPS.paintSolidColorImageMask:
          push(bboxOf(ctm, 0, 0, 1, 1), 'mask'); break;
        case OPS.paintImageXObjectRepeat: case OPS.paintImageMaskXObjectRepeat: {
          const sx = a[1], sy = a[2], pos = a[3] || [];
          for (let k = 0; k + 1 < pos.length; k += 2) {
            push(bboxOf(mul(ctm, [sx, 0, 0, sy, pos[k], pos[k + 1]]), 0, 0, 1, 1), f === OPS.paintImageXObjectRepeat ? 'img' : 'mask');
          }
          break;
        }
        case OPS.paintImageMaskXObjectGroup: case OPS.paintInlineImageXObjectGroup: push(clip, 'img'); break;
        default: break;
      }
    }
    return out;
  }

  /* Body type size = the height carrying the most ink WIDTH on the page.
   * The median item height halves on a page full of 5pt tick labels. */
  /* "Fig. 2(b) summarizes…", "Table 2 summarizes…", "Fig. 1(b), we also…":
   * a figure number followed by a LOWERCASE word is a cross-reference in
   * running prose; a caption follows its number with ". ", " | ", a colon
   * or a capitalised word.  (The old stem list carried a trailing \b, so
   * "summarizes" never matched "summar".) */
  function _frIsXref(text) {
    const m = (text || '').match(/^\s*(?:fig(?:ure)?s?|table|tab)\.?\s*(?:S|E)?\d+(?:[a-z](?:[–-][a-z])?)?(?:\s*\([a-z0-9,–\-\s]+\))?/i);
    if (!m) return false;
    const rest = text.slice(m[0].length);
    return /^(?:\s*[,;])?\s+[a-z]/.test(rest) || /^\s*(?:and|or|to)\s/i.test(rest);
  }

  /* Column LEFT EDGES straight from the text items: every body line starts
   * an item flush with its column, so the edges are the x values that
   * dozens of line-sized items share.  Known before any line grouping,
   * which is the point — Science Signaling's 14pt gutter is narrower than
   * the prose gap factor and the two columns were read as one line. */
  function _frColumnEdges(items, bodyH, W) {
    const cand = items.filter(it => it.h >= 0.78 * bodyH && it.h <= 1.45 * bodyH && it.w >= 0.1 * W);
    if (cand.length < 8) return [];
    const hist = new Map();
    for (const it of cand) { const k = Math.round(it.x); hist.set(k, (hist.get(k) || 0) + 1); }
    const peaks = [];
    for (const [x, n] of Array.from(hist.entries()).sort((a, b) => b[1] - a[1])) {
      if (n < Math.max(4, 0.06 * cand.length)) break;
      if (peaks.some(p => Math.abs(p.x1 - x) < 0.12 * W)) continue;
      peaks.push({ x1: x, n });
    }
    return peaks.sort((a, b) => a.x1 - b.x1);
  }

  function _frBodyH(items) {
    const wt = new Map();
    for (const it of items) {
      if (!(it.h > 0) || !(it.w > 0)) continue;
      const k = Math.round(it.h * 2) / 2;
      wt.set(k, (wt.get(k) || 0) + it.w);
    }
    let best = 0, bw = -1;
    for (const [k, v] of wt) if (v > bw) { bw = v; best = k; }
    return best;
  }

  /* Page furniture out, primitives clustered into panels.
   * Returns null when the layer says nothing (absent, or one image that IS
   * the page — a scan — so the text-based path runs instead). */
  function _frGraphicsBlobs(gfx, W, H, bodyH) {
    if (!Array.isArray(gfx)) return null;
    if (!gfx.length) return [];          // a real answer: this page paints nothing
    const pageA = W * H;
    const boxes = [];
    for (const g of gfx) {
      if (!(g.w >= 0) || !(g.h >= 0) || (g.w < 0.05 && g.h < 0.05)) continue;
      const area = g.w * g.h;
      if ((g.k === 'img' || g.k === 'mask') && area >= 0.85 * pageA) return null;   // a scan
      if (g.k !== 'img' && area >= 0.6 * pageA) continue;                            // page background
      /* (an image two-thirds of the page is a figure — agarwal p3 — not a
       *  background; only a path that size is) */
      const edgeStrip = g.w < 0.08 * W && g.h > 0.5 * H && (g.x < 0.1 * W || g.x + g.w > 0.9 * W);
      if (edgeStrip) continue;                                                     // journal brand bar
      if (g.h <= 2.5 && g.w >= 0.4 * W && (g.y < 0.1 * H || g.y > 0.9 * H)) continue; // header/footer rule
      if (g.w >= 0.5 * W && (g.y + g.h <= 0.06 * H || g.y >= 0.94 * H)) continue;   // running-head band
      if (g.w <= 2.5 && g.h >= 0.3 * H) continue;                                  // column rule
      boxes.push({ x1: g.x, y1: g.y, x2: g.x + g.w, y2: g.y + g.h, img: g.k === 'img' || g.k === 'mask' });
    }
    if (!boxes.length) return [];
    const G = Math.max(6, 0.7 * bodyH);
    boxes.sort((a, b) => a.x1 - b.x1);
    const parent = boxes.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (let j = i + 1; j < boxes.length; j++) {
        const b = boxes[j];
        if (b.x1 > a.x2 + G) break;
        if (b.y1 > a.y2 + G || b.y2 < a.y1 - G) continue;
        const ra = find(i), rb = find(j);
        if (ra !== rb) parent[rb] = ra;
      }
    }
    const blobs = new Map();
    boxes.forEach((b, i) => {
      const r = find(i);
      const o = blobs.get(r);
      if (!o) blobs.set(r, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, n: 1, img: b.img });
      else { o.x1 = Math.min(o.x1, b.x1); o.y1 = Math.min(o.y1, b.y1); o.x2 = Math.max(o.x2, b.x2); o.y2 = Math.max(o.y2, b.y2); o.n++; o.img = o.img || b.img; }
    });
    /* decoration: a bullet, an underline, a tick under a heading */
    const real = (b) => {
      const w = b.x2 - b.x1, h = b.y2 - b.y1;
      return (w * h >= 60 && (w >= 6 || h >= 6)) || b.n >= 3;
    };
    /* A speck is only decoration when it is ALONE.  The dots of a scatter
     * plot and the samples on a level-set curve are each a 1pt mark a line
     * pitch apart — one at a time they are nothing, together they are the
     * figure (arxiv-2602 p19).  Chain every speck to whatever sits within a
     * line pitch and a half, then judge what remains. */
    let list = Array.from(blobs.values());
    const G2 = Math.max(14, 1.6 * bodyH);
    const par2 = list.map((_, i) => i);
    const find2 = (i) => { while (par2[i] !== i) { par2[i] = par2[par2[i]]; i = par2[i]; } return i; };
    list.sort((a, b) => a.x1 - b.x1);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.x1 > a.x2 + G2) break;
        if (real(a) && real(b)) continue;
        if (b.y1 > a.y2 + G2 || b.y2 < a.y1 - G2) continue;
        const ra = find2(i), rb = find2(j);
        if (ra !== rb) par2[rb] = ra;
      }
    }
    const merged = new Map();
    list.forEach((b, i) => {
      const r = find2(i);
      const o = merged.get(r);
      if (!o) merged.set(r, Object.assign({}, b));
      else { o.x1 = Math.min(o.x1, b.x1); o.y1 = Math.min(o.y1, b.y1); o.x2 = Math.max(o.x2, b.x2); o.y2 = Math.max(o.y2, b.y2); o.n += b.n; o.img = o.img || b.img; }
    });
    return Array.from(merged.values()).filter(real)
      .map(b => Object.assign(b, { gx1: b.x1, gy1: b.y1, gx2: b.x2, gy2: b.y2 }));
  }

  /* Build figure/table regions from captions + panels.
   *  1. each blob swallows the non-prose text touching it (axis labels,
   *     panel letters) — a figure CONTAINS text, it is never blocked by it;
   *  2. a caption seeds on the blobs directly beside it in its direction
   *     (figure: above, table: below; flips when that side is empty) with
   *     no prose line in between;
   *  3. every caption grows at once, ring by ring, over unclaimed blobs —
   *     never across a prose line, never across another caption, never
   *     into a column that holds prose at that height;
   *  4. unclaimed panels big enough to be a figure are reported as one,
   *     unlabelled — a plate whose caption sits on the next page, or a
   *     caption the regex did not read, still gets a hotspot. */
  function _frFromGraphics(blobs, caps, proseLines, items, columns, bodyH, W, H, pageNum) {
    const prose = proseLines.filter(l => l.prose && !l._cap);
    /* body text never runs over artwork: a lone image or rectangle with
     * prose lines inside it is a watermark, a link area, a tint — not a
     * figure (mendoza p6: an invisible 344×286 image under a paragraph) */
    blobs = blobs.filter(b => b.n > 2 || prose.filter(l =>
      l.x1 >= b.x1 - 2 && l.x2 <= b.x2 + 2 && l.y1 >= b.y1 - 2 && l.y2 <= b.y2 + 2).length < 2);
    const pad = Math.max(4, 1.1 * bodyH);
    /* 1 ─ attach text */
    const colW = columns.length ? _frMedian(columns.map(c => c.x2 - c.x1)) : 0.45 * W;
    /* figure text is SHORT (a tick label, an axis title, a panel letter) or
     * sits inside the artwork; a body-length line never attaches, whatever
     * the tabular pass called it */
    const free = items.filter(it => !it._prose && !it._cap &&
      (it._lineW == null || it._lineW < 0.5 * colW || it._inGfx));
    for (const b of blobs) {
      for (let pass = 0; pass < 3; pass++) {
        let grew = false;
        for (const it of free) {
          if (it._used) continue;
          const dx = Math.max(0, Math.max(b.x1, it.x) - Math.min(b.x2, it.x + it.w));
          const dy = Math.max(0, Math.max(b.y1, it.y) - Math.min(b.y2, it.y + it.h));
          if (dx > pad || dy > pad) continue;
          if (it.w > 0.6 * W && it.h >= 0.9 * bodyH) continue;   // a spanning line of text
          it._used = true; grew = true;
          b.x1 = Math.min(b.x1, it.x); b.y1 = Math.min(b.y1, it.y);
          b.x2 = Math.max(b.x2, it.x + it.w); b.y2 = Math.max(b.y2, it.y + it.h);
        }
        if (!grew) break;
      }
    }
    const xov = (a, b) => Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
    const yov = (a, b) => Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
    const rectHasProse = (r) => prose.some(l => Math.min(l.x2, r.x2) - Math.max(l.x1, r.x1) > 2 && Math.min(l.y2, r.y2) - Math.max(l.y1, r.y1) > 1);
    const colOf = (x) => { let k = -1; columns.forEach((c, i) => { if (x >= c.x1 - 12 && x <= c.x2 + 12) k = i; }); return k; };
    /* prose lines living in column k inside a y-range */
    const colProse = (k, y1, y2) => prose.some(l => colOf((l.x1 + l.x2) / 2) === k && l.y2 > y1 && l.y1 < y2 && (l.x2 - l.x1) < 0.62 * W);

    /* 2 ─ seeds */
    const owner = new Array(blobs.length).fill(-1);
    const regions = caps.map(() => null);
    caps.forEach((cap, ci) => {
      const isTable = _frReTable.test(cap.text);
      const maxGap = Math.max(50, 0.1 * H);
      const seedsIn = (up) => {
        const out = [];
        blobs.forEach((b, bi) => {
          if (owner[bi] >= 0 && owner[bi] !== ci) return;
          if (xov(b, cap) < Math.min(10, 0.3 * Math.min(b.x2 - b.x1, cap.x2 - cap.x1))) return;
          const gap = up ? cap.y1 - b.y2 : b.y1 - cap.y2;
          if (gap > maxGap || gap < -(cap.y2 - cap.y1) * 0.6) return;
          const bridge = up
            ? { x1: Math.max(b.x1, cap.x1), x2: Math.min(b.x2, cap.x2), y1: b.y2, y2: cap.y1 }
            : { x1: Math.max(b.x1, cap.x1), x2: Math.min(b.x2, cap.x2), y1: cap.y2, y2: b.y1 };
          if (gap > 2 && rectHasProse(bridge)) return;
          out.push({ bi, gap });
        });
        return out;
      };
      let up = !isTable, beside = false;
      let seeds = seedsIn(up);
      if (!seeds.length) { seeds = seedsIn(!up); if (seeds.length) up = !up; }
      /* a caption set BESIDE its figure (bennett p3: legend down the left
       * margin, plots to its right) overlaps it in y, not x */
      if (!seeds.length) {
        const capH = cap.y2 - cap.y1;
        blobs.forEach((b, bi) => {
          if (owner[bi] >= 0 && owner[bi] !== ci) return;
          if (yov(b, cap) < 0.5 * Math.min(capH, b.y2 - b.y1)) return;
          const gap = b.x1 >= cap.x2 ? b.x1 - cap.x2 : cap.x1 - b.x2;
          if (gap < -4 || gap > maxGap) return;
          const bridge = b.x1 >= cap.x2
            ? { x1: cap.x2, x2: b.x1, y1: Math.max(b.y1, cap.y1), y2: Math.min(b.y2, cap.y2) }
            : { x1: b.x2, x2: cap.x1, y1: Math.max(b.y1, cap.y1), y2: Math.min(b.y2, cap.y2) };
          if (gap > 2 && rectHasProse(bridge)) return;
          seeds.push({ bi, gap });
        });
        if (seeds.length) beside = true;
      }
      if (!seeds.length) return;
      seeds.sort((a, b) => a.gap - b.gap);
      /* a second blob much farther than the nearest is probably someone else's */
      const near = seeds[0].gap;
      seeds = seeds.filter(s => s.gap <= near + Math.max(30, 3 * bodyH));
      const r = { x1: cap.x1, y1: cap.y1, x2: cap.x2, y2: cap.y2, members: [], cap, up, isTable, beside };
      const take = (bi) => {
        owner[bi] = ci; r.members.push(bi);
        const b = blobs[bi];
        r.x1 = Math.min(r.x1, b.x1); r.y1 = Math.min(r.y1, b.y1); r.x2 = Math.max(r.x2, b.x2); r.y2 = Math.max(r.y2, b.y2);
      };
      seeds.forEach(s => take(s.bi));
      /* A table's rules all share the header rule's x-extent, and body text
       * never has rules: every matching rule on the far side of the caption,
       * up to the next caption, is the same table (agarwal p7: three rules
       * and 370pt of long cells between them). */
      if (isTable) {
        const s0 = blobs[seeds[0].bi];
        const sw = s0.gx2 - s0.gx1;
        blobs.forEach((b, bi) => {
          if (owner[bi] >= 0) return;
          if ((b.gy2 - b.gy1) > 6 || Math.abs(b.gx1 - s0.gx1) > 0.05 * sw || Math.abs(b.gx2 - s0.gx2) > 0.05 * sw) return;
          if (up ? b.gy2 > cap.y1 : b.gy1 < cap.y2) return;
          if ((up ? cap.y1 - b.gy1 : b.gy2 - cap.y2) > 0.9 * H) return;
          const between = caps.some((c, k) => k !== ci && xov(c, b) > 0 &&
            (up ? (c.y2 <= cap.y1 && c.y1 >= b.gy2) : (c.y1 >= cap.y2 && c.y2 <= b.gy1)));
          if (!between) take(bi);
        });
      }
      regions[ci] = r;
    });

    /* 3 ─ grow, all captions at once */
    /* no prose on the page = a figure page: panels may sit a long way apart
     * with nothing between them to swallow */
    const G2 = prose.length ? Math.max(24, 2.6 * bodyH) : Math.max(24, 2.6 * bodyH, 0.08 * H);
    const capBox = (c) => ({ x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 });
    const coversOtherCap = (u, ci) => caps.some((c, k) => k !== ci && c.y2 - c.y1 > 0 &&
      Math.max(0, xov(u, c)) * Math.max(0, yov(u, c)) > 0.5 * (c.x2 - c.x1) * (c.y2 - c.y1));
    const freeText = items.filter(it => !it._prose && !it._cap);
    const textFill = (rc) => {
      const A = Math.max(1, (rc.x2 - rc.x1) * (rc.y2 - rc.y1));
      let s = 0;
      for (const it of freeText) {
        const ox = Math.min(it.x + it.w, rc.x2) - Math.max(it.x, rc.x1), oy = Math.min(it.y + it.h, rc.y2) - Math.max(it.y, rc.y1);
        if (ox > 0 && oy > 0) s += ox * oy;
      }
      return s / A;
    };
    const canReach = (r, b) => {
      const dx = Math.max(0, Math.max(r.x1, b.x1) - Math.min(r.x2, b.x2));
      const dy = Math.max(0, Math.max(r.y1, b.y1) - Math.min(r.y2, b.y2));
      if (dx > 0.3 * H || dy > 0.3 * H) return Infinity;
      const ox = xov(r, b), oy = yov(r, b);
      let bridge;
      if (ox > 0) bridge = { x1: Math.max(r.x1, b.x1), x2: Math.min(r.x2, b.x2), y1: Math.min(r.y2, b.y2), y2: Math.max(r.y1, b.y1) };
      else if (oy > 0) bridge = { x1: Math.min(r.x2, b.x2), x2: Math.max(r.x1, b.x1), y1: Math.max(r.y1, b.y1), y2: Math.min(r.y2, b.y2) };
      else bridge = { x1: Math.min(r.x2, b.x2), x2: Math.max(r.x1, b.x1), y1: Math.min(r.y2, b.y2), y2: Math.max(r.y1, b.y1) };
      if (rectHasProse(bridge)) return Infinity;
      /* beyond the panel gap only when the gap is FULL of non-prose text —
       * the cells between two rules of a table (agarwal p7/p14) */
      if ((dx > G2 || dy > G2) && !(ox > 0 && textFill(bridge) >= 0.08)) return Infinity;
      /* a single-column region does not reach across a gutter into a
       * column that is running text at this height */
      if (columns.length >= 2 && (r.x2 - r.x1) < 0.62 * W) {
        const kr = colOf((r.x1 + r.x2) / 2), kb = colOf((b.x1 + b.x2) / 2);
        if (kr !== kb && kb >= 0 && colProse(kb, Math.min(r.y1, b.y1), Math.max(r.y2, b.y2))) return Infinity;
      }
      return Math.max(dx, dy);
    };
    for (let guard = 0; guard < 40; guard++) {
      let best = null;
      regions.forEach((r, ci) => {
        if (!r) return;
        blobs.forEach((b, bi) => {
          if (owner[bi] >= 0) return;
          const d = canReach(r, b);
          if (!isFinite(d)) return;
          const u = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) };
          if (coversOtherCap(u, ci)) return;
          if (!best || d < best.d) best = { d, ci, bi, u };
        });
      });
      if (!best) break;
      owner[best.bi] = best.ci;
      const r = regions[best.ci];
      r.members.push(best.bi);
      r.x1 = best.u.x1; r.y1 = best.u.y1; r.x2 = best.u.x2; r.y2 = best.u.y2;
    }

    /* 4 ─ caption tails: continuation lines set in the caption's own type
     * size, directly under the region, when that size differs from body */
    const out = [];
    regions.forEach((r, ci) => {
      if (!r) return;
      const cap = r.cap;
      const capH = cap.mh || bodyH;
      if (Math.abs(capH - bodyH) > 0.08 * bodyH) {
        for (let n = 0; n < 10; n++) {
          const next = proseLines.filter(l => !l._cap && Math.abs(l.mh - capH) <= 0.6 &&
            l.y1 >= r.y2 - 2 && l.y1 - r.y2 <= 1.3 * capH && xov(l, r) > 10)
            .sort((a, b) => a.y1 - b.y1)[0];
          if (!next) break;
          next._cap = true;
          r.x1 = Math.min(r.x1, next.x1); r.x2 = Math.max(r.x2, next.x2); r.y2 = Math.max(r.y2, next.y2);
        }
      }
      const extent = r.up ? (cap.y1 - r.y1) : (r.y2 - cap.y2);
      const beside = r.beside || (r.x2 - r.x1) - (cap.x2 - cap.x1) > 40;
      if (extent < 20 && !beside) return;
      out.push({ x: r.x1, y: r.y1, w: r.x2 - r.x1, h: r.y2 - r.y1, label: cap.text.slice(0, 80), kind: r.isTable ? 'table' : 'figure', ci });
    });

    if (typeof window !== 'undefined' && window.PAGE_LAYOUT && window.PAGE_LAYOUT._frTrace) {
      window.PAGE_LAYOUT._frLast = { blobs, regions, owner, items };
    }
    /* 5 ─ orphans */
    const orphanIdx = blobs.map((_, i) => i).filter(i => owner[i] < 0);
    const groups = [];
    const taken = new Set();
    for (const i of orphanIdx) {
      if (taken.has(i)) continue;
      const g = { x1: blobs[i].x1, y1: blobs[i].y1, x2: blobs[i].x2, y2: blobs[i].y2, n: 1 };
      taken.add(i);
      let grew = true;
      while (grew) {
        grew = false;
        for (const j of orphanIdx) {
          if (taken.has(j)) continue;
          if (!isFinite(canReach(g, blobs[j]))) continue;
          taken.add(j); grew = true; g.n++;
          g.x1 = Math.min(g.x1, blobs[j].x1); g.y1 = Math.min(g.y1, blobs[j].y1);
          g.x2 = Math.max(g.x2, blobs[j].x2); g.y2 = Math.max(g.y2, blobs[j].y2);
        }
      }
      groups.push(g);
    }
    for (const g of groups) {
      const w = g.x2 - g.x1, h = g.y2 - g.y1;
      if (w * h < 0.035 * W * H || w < 0.15 * W || h < 0.08 * H) continue;
      if (pageNum === 1 && (g.y1 < 0.3 * H || g.y1 > 0.8 * H)) continue;   // masthead / footer box
      const inside = prose.filter(l => l.x1 >= g.x1 - 2 && l.x2 <= g.x2 + 2 && l.y1 >= g.y1 - 2 && l.y2 <= g.y2 + 2).length;
      if (inside >= 3) continue;                       // a shaded text box, not a figure
      /* one filled rectangle behind dense text is a box-out, not artwork —
       * unless real artwork (not a logo) makes up a good part of it */
      const prims = g.n;
      let imgA = 0;
      for (const i of orphanIdx) if (taken.has(i) && blobs[i].img && blobs[i].x1 >= g.x1 && blobs[i].x2 <= g.x2 && blobs[i].y1 >= g.y1 && blobs[i].y2 <= g.y2) imgA += (blobs[i].gx2 - blobs[i].gx1) * (blobs[i].gy2 - blobs[i].gy1);
      const strongImg = imgA >= 0.15 * w * h;
      let textA = 0;
      for (const it of items) if (it.x >= g.x1 - 1 && it.x + it.w <= g.x2 + 1 && it.y >= g.y1 - 1 && it.y + it.h <= g.y2 + 1) textA += it.w * it.h;
      if (!strongImg && textA > 0.35 * w * h) continue;
      const wideLines = proseLines.filter(l => l.x1 >= g.x1 - 2 && l.x2 <= g.x2 + 2 && l.y1 >= g.y1 - 2 && l.y2 <= g.y2 + 2 && (l.x2 - l.x1) >= 0.6 * w).length;
      if (!strongImg && wideLines >= 2) continue;        // "Cite this paper" boxes, callouts
      if (!strongImg && prims < 2 && blobs.filter(b => b.x1 >= g.x1 && b.x2 <= g.x2 && b.y1 >= g.y1 && b.y2 <= g.y2).every(b => b.n < 4)) continue;
      if (out.some(o => _frOverlapFrac({ x: g.x1, y: g.y1, w, h }, o) > 0.3)) continue;
      out.push({ x: g.x1, y: g.y1, w, h, label: '', kind: 'figure', orphan: true });
    }
    return out;
  }

  function _frCore(page, opts) {
    const W = page.w, H = page.h, M = 4;
    /* A vertical run of text hugging a page edge is furniture — the
     * "Downloaded from https://…" stamp publishers print down the margin.
     * Left in, it is 286pt tall and 1pt from the artwork, and the figure
     * grows to its top (mendoza p6). Rotated axis titles live inside the
     * page, so they stay. */
    const items = (page.items || []).filter(it => (it.text || '').trim() &&
      !(it.h > 6 * it.w && it.h > 40 && (it.x < 0.06 * W || it.x + it.w > 0.94 * W)));
    const probe = opts.inkProbe || null;
    const bodyH = _frBodyH(items) || _frMedian(items.map(i => i.h).filter(h => h > 0)) || 10;
    const blobs = _frGraphicsBlobs(opts.graphics, W, H, bodyH);   // null → no graphics layer
    if (!items.length && !(blobs && blobs.length)) return [];
    /* TWO line groupings, because the two consumers want opposite things:
     *  - captions need words KEPT TOGETHER ("FIGURE | 1 | Formation" is one
     *    caption across 16px gaps) → loose gap factor + caption-start re-split;
     *  - prose obstacles need columns KEPT APART (a merged 2-column line blocks
     *    growth in both columns at once) → tight gap factor. */
    const edges = _frColumnEdges(items, bodyH, W);
    const proseLines = _frGroupLines(items, 1.5, edges);
    /* columns come from the lines that LOOK like body text, before any
     * table-row demotion — on a figure page the demotion used to eat the
     * body lines first and no column was ever found (mendoza p6) */
    _frMarkProseBasic(proseLines, bodyH, W);
    let columns = _frDetectColumns(proseLines.filter(l => l.prose), W);
    _frMarkTabular(proseLines, W, columns);
    if (columns.length) {
      _frMarkProseByColumn(proseLines, columns, bodyH, W);
      columns = _frDetectColumns(proseLines.filter(l => l.prose), W);
    }
    /* V3.826 — the loose grouping still breaks at a column edge, or a
     * left-column caption glues to the right column's prose 15px away and
     * reads as full-width (mendoza p4: Figure 2 vanished). */
    const capLines = _frGroupLines(items, 2.6, columns.length ? columns : edges);
    _frMarkProse(capLines, bodyH, W, columns);     // tabular flags: a caption stops at the first table row
    const caps = _frFindCaptions(capLines, bodyH, W, H, columns, probe);
    for (const c of caps) c.mh = _frMedian(c.lines.map(i => capLines[i].mh));
    /* A caption's own text must never block the growth it anchors — exclude
     * geometrically, since the two line sets don't share indices. */
    const inCap = (l) => caps.some(c => l.x1 >= c.x1 - 2 && l.x2 <= c.x2 + 2 &&
      l.y1 >= c.y1 - 2 && l.y2 <= c.y2 + 2);
    for (const l of proseLines) {
      if (inCap(l)) { l._cap = true; l.items.forEach(i => { i._cap = true; }); }
      else if (l.prose) l.items.forEach(i => { i._prose = true; });
    }
    const prose = proseLines.filter(l => l.prose && !l._cap);
    for (const l of proseLines) l.items.forEach(i => { i._lineW = l.x2 - l.x1; });
    if (blobs) for (const it of items) {
      it._inGfx = blobs.some(b => it.x + it.w > b.gx1 && it.x < b.gx2 && it.y + it.h > b.gy1 && it.y < b.gy2);
    }

    let regions = [];
    const done = new Set();
    if (blobs && blobs.length) {
      regions = _frFromGraphics(blobs, caps, proseLines, items, columns, bodyH, W, H, opts.pageNum || 0);
      regions.forEach(r => { if (r.ci != null) done.add(r.ci); });
    }
    const haveLayer = Array.isArray(opts.graphics) && blobs !== null;
    caps.forEach((cap, ci) => {
      if (done.has(ci)) return;
      const isTable = _frReTable.test(cap.text);
      /* With a graphics layer in hand, a figure caption with no artwork
       * beside it is a legend, a list of supplementary captions, a
       * cross-reference the regex let through — not a figure.  Tables are
       * the exception: a text-only table paints nothing. */
      if (haveLayer && !isTable) {
        /* "(caption on next page)": a lone multi-line figure caption at the
         * head of a page that paints nothing is the legend of the plate
         * before it — Alex labels that block as the figure's region */
        const artwork = (blobs || []).some(b => (b.x2 - b.x1) * (b.y2 - b.y1) >= 0.01 * W * H);
        const figCaps = caps.filter(c => !_frReTable.test(c.text));
        if (!artwork && figCaps.length === 1 && cap.y1 < 0.12 * H && cap.lines.length >= 2) {
          regions.push({ x: cap.x1, y: cap.y1, w: cap.x2 - cap.x1, h: cap.y2 - cap.y1, label: cap.text.slice(0, 80), kind: 'figure' });
        }
        return;
      }
      let up = !isTable;                 // figure above its caption; table below
      if (probe) {
        const inkUp = cap.y1 - M > 25 ? probe(cap.x1, Math.max(M, cap.y1 - 420), cap.x2, cap.y1 - 2) : 0;
        const inkDn = H - M - cap.y2 > 25 ? probe(cap.x1, cap.y2 + 2, cap.x2, Math.min(H - M, cap.y2 + 420)) : 0;
        if (up && inkUp < 0.004 && inkDn > inkUp) up = false;
        else if (!up && inkDn < 0.004 && inkUp > inkDn) up = true;
      }
      const others = caps.filter(c => c !== cap);
      let box = _frGrow(cap, up, prose, others, W, H, M);
      if (isTable && probe) {
        const g = _frGrowByInkGap(cap, up, probe, W, H, M, bodyH, box);
        if (g) box = g;
      }
      if (!box) return;
      if (probe) box = _frTightenToInk(box, cap, probe, up);
      box = _frUnion(box, { x: cap.x1, y: cap.y1, w: cap.x2 - cap.x1, h: cap.y2 - cap.y1 });
      const extent = up ? (cap.y1 - box.y) : (box.y + box.h - cap.y2);
      if (extent < 28) return;         // caption with nothing beside it
      /* a table that paints nothing must at least READ as rows: cells
       * outnumber prose inside it (a legend under "Table S1." does not) */
      if (isTable && haveLayer) {
        const inside = proseLines.filter(l => l.x1 >= box.x - 4 && l.x2 <= box.x + box.w + 4 &&
          l.y1 >= box.y - 2 && l.y2 <= box.y + box.h + 2);
        const rows = inside.filter(l => l.tabular).length;
        const text = inside.filter(l => l.prose || l._cap).length;
        if (rows < 2 || rows < text) return;
      }
      regions.push({ x: box.x, y: box.y, w: box.w, h: box.h, label: cap.text.slice(0, 80), kind: isTable ? 'table' : 'figure' });
    });

    /* Full-page plate ("(caption on next page)"): almost no prose, real ink. */
    if (!regions.length && probe && !haveLayer) {
      const proseArea = prose.reduce((s, l) => s + (l.x2 - l.x1) * (l.y2 - l.y1), 0);
      if (prose.length <= 2 && proseArea < 0.05 * W * H && items.length < 90) {
        const b = _frInkBounds(probe, M, M, W - M, H - M);
        if (b && b.w > 0.35 * W && b.h > 0.25 * H) {
          regions.push({ x: b.x, y: b.y, w: b.w, h: b.h, label: '(full-page figure)', kind: 'figure' });
        }
      }
    }
    const result = _frDedupe(regions.map(r => ({
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1),
      label: r.label, kind: r.kind,
    })));
    /* training-harness tap: everything the decision was made from */
    if (typeof window !== 'undefined' && window.PAGE_LAYOUT && window.PAGE_LAYOUT._frTrace) {
      window.PAGE_LAYOUT._frTrace({ bodyH, columns, caps, blobs, proseLines, regions: result, haveLayer });
    }
    return result;
  }

  /* ── lines (split at column gutters) ────────────────────────── */
  function _frGroupLines(items, gapFactor, columns) {
    const bands = [];
    for (const it of items.slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2))) {
      const mid = it.y + it.h / 2;
      const last = bands[bands.length - 1];
      /* Compare to the band's FIXED centre. Testing against the growing
       * y1/y2 lets a band chain down the page item by item — bell-1979
       * merged body text 20px away with its figure caption, producing
       * "cells. content was 570 FIG. Medium 1. 1 Contraction was" as one
       * "line", which no caption regex can match. */
      if (last && Math.abs(mid - last.mid) <= Math.max(1.5, last.mh * 0.55) &&
          Math.abs(it.h - last.mh) < Math.max(2, last.mh * 0.5)) {
        last.items.push(it);
        last.y1 = Math.min(last.y1, it.y); last.y2 = Math.max(last.y2, it.y + it.h);
      } else {
        bands.push({ items: [it], y1: it.y, y2: it.y + it.h, mh: it.h, mid });
      }
    }
    const cols = columns || [];
    const lines = [];
    for (const b of bands) {
      b.items.sort((a, b2) => a.x - b2.x);
      const mh = _frMedian(b.items.map(i => i.h)) || b.mh;
      const gapMin = Math.max(9, (gapFactor || 2.0) * mh);
      let run = [b.items[0]];
      const flush = () => {
        lines.push({
          items: run.slice(),
          x1: Math.min(...run.map(i => i.x)), x2: Math.max(...run.map(i => i.x + i.w)),
          y1: Math.min(...run.map(i => i.y)), y2: Math.max(...run.map(i => i.y + i.h)),
          mh: _frMedian(run.map(i => i.h)) || mh,
        });
      };
      for (let k = 1; k < b.items.length; k++) {
        const prev = run[run.length - 1], cur = b.items[k];
        const gap = cur.x - (prev.x + prev.w);
        const colBreak = prev.column != null && cur.column != null && prev.column !== cur.column;
        /* a gap that lands on a known column's left edge is a gutter however
         * narrow it is — V3.826 */
        const atColumn = gap > Math.max(5, 1.2 * mh) &&
          cols.some(c => Math.abs(c.x1 - cur.x) < 6 && prev.x + prev.w < c.x1 - 3);
        if (gap > gapMin || colBreak || atColumn) { flush(); run = [cur]; } else run.push(cur);
      }
      flush();
    }
    const split = [];
    for (const l of lines) {
      _frFinishLine(l);
      /* A caption can be glued to the previous column's text when the gutter
       * gap falls just under the split threshold (barton: 19px gap, 20px
       * threshold, whole caption in ONE item). Re-split wherever the text from
       * some item onward reads as a caption opener. */
      let cut = -1;
      for (let k = 1; k < l.items.length; k++) {
        const gap = l.items[k].x - (l.items[k - 1].x + l.items[k - 1].w);
        if (gap < Math.max(5, l.mh * 0.6)) continue;
        const tail = l.items.slice(k).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
        if (_frReCaptionStart.test(tail) && !_frIsXref(tail)) { cut = k; break; }
      }
      if (cut < 0) { split.push(l); continue; }
      split.push(_frMkLine(l.items.slice(0, cut)), _frMkLine(l.items.slice(cut)));
    }
    split.sort((a, b) => (a.y1 + a.y2) / 2 - (b.y1 + b.y2) / 2 || a.x1 - b.x1);
    return split;
  }

  function _frMkLine(items) {
    const l = {
      items,
      x1: Math.min(...items.map(i => i.x)), x2: Math.max(...items.map(i => i.x + i.w)),
      y1: Math.min(...items.map(i => i.y)), y2: Math.max(...items.map(i => i.y + i.h)),
      mh: _frMedian(items.map(i => i.h)) || items[0].h,
    };
    _frFinishLine(l);
    return l;
  }
  function _frFinishLine(l) {
    l.text = l.items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    l.density = l.items.reduce((s, i) => s + i.w, 0) / Math.max(1, l.x2 - l.x1);
  }

  function _frMarkProse(lines, bodyH, W, columns) {
    _frMarkProseBasic(lines, bodyH, W);
    _frMarkTabular(lines, W, columns);
  }
  function _frMarkProseBasic(lines, bodyH, W) {
    for (const l of lines) {
      l.prose = l.mh > bodyH * 0.78 && l.mh < bodyH * 1.45 &&
        (l.x2 - l.x1) > 0.18 * W && l.density > 0.55 &&
        (l.items.length >= 4 || /\s\S+\s\S+/.test(l.text));
      l.tabular = false;
    }
  }
  function _frMarkTabular(lines, W, columns) {
    /* Table rows: a y-band broken into 3+ segments with at least one short cell.
     * (3-column prose keeps all segments wide, so it stays prose.)
     * V3.826 — judged per COLUMN once the columns are known: a plot's tick
     * labels in the left column used to demote the body line beside them in
     * the right column (mendoza p4: 182 "tabular" lines, no columns found,
     * Figure 2's caption glued to the prose and the figure vanished). */
    const cols = columns || [];
    const colOf = (l) => { const cx = (l.x1 + l.x2) / 2; let k = -1; cols.forEach((c, i) => { if (cx >= c.x1 - 12 && cx <= c.x2 + 12) k = i; }); return k; };
    /* no columns found (a figure page with only its caption): a cell is
     * still anything narrower than a third of the page */
    const colW = cols.length ? _frMedian(cols.map(c => c.x2 - c.x1)) : 0.45 * W;
    const bands = [];
    for (const l of lines) {
      const b = bands.find(x => l.y1 < x.y2 && l.y2 > x.y1);
      if (b) { b.lines.push(l); b.y1 = Math.min(b.y1, l.y1); b.y2 = Math.max(b.y2, l.y2); }
      else bands.push({ y1: l.y1, y2: l.y2, lines: [l] });
    }
    const demote = (ls) => {
      /* a cell is a real word or number — the "m" of a µm set in a symbol
       * font is a fragment of the line it sits in, not a column of a table */
      const cells = ls.filter(l => (l.x2 - l.x1) >= 8 && l.text.replace(/\s/g, '').length >= 2);
      if (cells.length < 3) return;
      const minW = Math.min(...cells.map(l => l.x2 - l.x1));
      if (minW >= 0.15 * W) return;
      /* a body-width line is never a cell, whatever shares its band */
      cells.forEach(l => { if ((l.x2 - l.x1) < 0.7 * colW) { l.prose = false; l.tabular = true; } });
    };
    for (const b of bands) {
      if (b.lines.length < 3) continue;
      if (!cols.length) { demote(b.lines); continue; }
      const groups = new Map();
      b.lines.forEach(l => { const k = colOf(l); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(l); });
      groups.forEach(ls => demote(ls));
      /* a row of cells across the whole width, with no body line among them */
      if (!b.lines.some(l => (l.x2 - l.x1) >= 0.7 * colW)) demote(b.lines);
    }
  }

  /* V3.826 — second pass once the columns are known: body text sits in a
   * body column.  A centred panel title the size of body type ("All edge
   * motion and actin flow") is not prose; the short last line of a
   * paragraph, flush with its column under a prose line, is. */
  function _frMarkProseByColumn(lines, columns, bodyH, W) {
    const inCol = (l) => columns.some(c => l.x1 >= c.x1 - 3 && l.x1 <= c.x1 + 2.5 * bodyH);
    for (const l of lines) {
      if (l.prose && !inCol(l) && (l.x2 - l.x1) < 0.62 * W) l.prose = false;
    }
    const flush = (l) => columns.some(c => Math.abs(l.x1 - c.x1) < 3);
    for (const l of lines) {
      if (l.prose || l.tabular) continue;
      if (!(l.mh > bodyH * 0.78 && l.mh < bodyH * 1.3) || !flush(l)) continue;
      const near = lines.some(o => o.prose && o !== l &&
        Math.abs(o.x1 - l.x1) < 3 && (
          (o.y2 <= l.y1 + 1 && l.y1 - o.y2 <= 0.7 * bodyH) ||
          (o.y1 >= l.y2 - 1 && o.y1 - l.y2 <= 0.7 * bodyH)));
      if (near) l.prose = true;
    }
  }

  /* Column x-ranges inferred from prose left edges. A caption narrower than
   * ~62% of the page belongs to ONE column and must stay inside it — without
   * this, two side-by-side figures merge into a single page-wide region. */
  function _frDetectColumns(prose, W) {
    const groups = [];
    for (const l of prose) {
      if ((l.x2 - l.x1) > 0.62 * W) continue;   // V3.826: a spanning line is not a column's width
      const g = groups.find(x => Math.abs(x.x1 - l.x1) < 14);
      if (g) { g.n++; g.x2 = Math.max(g.x2, l.x2); g.x1 = Math.min(g.x1, l.x1); }
      else groups.push({ x1: l.x1, x2: l.x2, n: 1 });
    }
    const cols = groups.filter(g => g.n >= 3 && (g.x2 - g.x1) < 0.75 * W)
      .sort((a, b) => a.x1 - b.x1);
    return cols.length >= 2 ? cols : [];
  }
  function _frColumnFor(columns, x1, x2, W) {
    if (!columns.length) return null;
    if (x2 - x1 > 0.62 * W) return null;          // full-width caption
    let best = null, bestD = Infinity;
    for (const c of columns) {
      const d = Math.abs(c.x1 - x1);
      if (d < bestD) { bestD = d; best = c; }
    }
    return (best && bestD < 40) ? best : null;
  }

  /* ── caption anchors + paragraph reconstruction ─────────────── */
  function _frFindCaptions(lines, bodyH, W, H, columns, probe) {
    const caps = [];
    const claimed = new Set();
    for (let i = 0; i < lines.length; i++) {
      if (claimed.has(i)) continue;
      const l = lines[i];
      if (!_frReCaptionStart.test(l.text) || _frIsXref(l.text)) continue;
      const mh = l.mh;
      const used = [i];
      let x1 = l.x1, x2 = l.x2, y1 = l.y1, y2 = l.y2;
      /* Same-band segments (the column splitter cut a wide caption into
       * pieces — stitch them back or the caption reads 56px wide). */
      /* x of the next caption anchor to the right in this band — absorption
       * must never cross it, or two side-by-side figures merge into one. */
      const rightLimit = Math.min(...lines
        .filter((n, j) => j !== i && n.y1 < l.y2 + mh * 0.5 && n.y2 > l.y1 - mh * 0.5 &&
          n.x1 > l.x1 && _frReCaptionStart.test(n.text) && !_frIsXref(n.text))
        .map(n => n.x1), Infinity);
      const anchorWide = (l.x2 - l.x1) > 0.2 * W;
      const col = anchorWide ? _frColumnFor(columns || [], l.x1, l.x2, W) : null;
      /* A caption never crosses a column gutter. Word gaps are narrow; a
       * gutter is a WIDE empty channel in the caption's own band — checking it
       * locally lets a genuinely full-width caption stay whole while a
       * single-column one can't swallow its neighbour (bell-1979 spanned both
       * columns and produced a page-sized region). */
      const bandA = l.y1, bandB = Math.min(l.y2 + mh * 0.2, l.y1 + mh * 2.2);
      const gutter = (a, b) => probe && (b - a) > Math.max(18, mh * 1.6) &&
        probe(a, bandA, b, bandB) < 0.002;
      const absorbBand = (yA, yB) => {
        for (let j = 0; j < lines.length; j++) {
          if (claimed.has(j) || used.includes(j)) continue;
          const n = lines[j];
          if (n.y1 > yB || n.y2 < yA) continue;
          if (Math.abs(n.mh - mh) > Math.max(1.5, mh * 0.4)) continue;
          if (_frReCaptionStart.test(n.text) && !_frIsXref(n.text)) continue;  // another caption
          if (n.x1 >= rightLimit) continue;
          if (col && (n.x1 < col.x1 - 12 || n.x2 > col.x2 + 12)) continue;
          if (n.x1 > x2 && gutter(x2, n.x1)) continue;
          if (n.x2 < x1 && gutter(n.x2, x1)) continue;
          if (n.x1 > x2 + mh * 1.5 || n.x2 < x1 - mh * 1.5) continue;
          used.push(j);
          x1 = Math.min(x1, n.x1); x2 = Math.max(x2, n.x2);
          y1 = Math.min(y1, n.y1); y2 = Math.max(y2, n.y2);
        }
      };
      absorbBand(l.y1, l.y2);
      /* Following lines of the same caption paragraph: tight leading only, so
       * the body paragraph after the caption is never swallowed. */
      for (let guard = 0; guard < 14; guard++) {
        let next = null, nextIdx = -1;
        for (let j = 0; j < lines.length; j++) {
          if (claimed.has(j) || used.includes(j)) continue;
          const n = lines[j];
          if (n.y1 < y2 - mh * 0.2) continue;
          if (n.y1 - y2 > mh * 0.9) continue;                       // paragraph break
          if (n.tabular) continue;                                  // V3.826: the table's first row
          if (Math.abs(n.mh - mh) > Math.max(1.5, mh * 0.4)) continue;
          if (n.x1 < x1 - mh * 1.5 || n.x1 > x1 + Math.max(30, (x2 - x1) * 0.7)) continue;
          if (_frReCaptionStart.test(n.text)) continue;
          if (!next || n.y1 < next.y1) { next = n; nextIdx = j; }
        }
        if (!next) break;
        used.push(nextIdx);
        x1 = Math.min(x1, next.x1); x2 = Math.max(x2, next.x2); y2 = Math.max(y2, next.y2);
        absorbBand(next.y1, next.y2);
      }
      if (y2 - y1 > H * 0.22) continue;                             // runaway absorb
      used.forEach(j => claimed.add(j));
      caps.push({ x1, x2, y1, y2, text: l.text, lines: used, col: _frColumnFor(columns || [], x1, x2, W) });
    }
    return caps;
  }

  /* ── growth ─────────────────────────────────────────────────── */
  function _frGrow(cap, up, prose, others, W, H, M) {
    const obs = prose.map(l => ({ x1: l.x1, x2: l.x2, y1: l.y1, y2: l.y2 }))
      .concat(others.map(c => ({ x1: c.x1, x2: c.x2, y1: c.y1, y2: c.y2 })));
    let x1 = cap.x1, x2 = cap.x2, bound = up ? M : H - M;
    for (let pass = 0; pass < 2; pass++) {
      bound = up ? M : H - M;
      for (const o of obs) {
        if (o.x2 <= x1 + 1 || o.x1 >= x2 - 1) continue;
        if (up) { if (o.y2 <= cap.y1 - 1 && o.y2 > bound) bound = o.y2 + 3; }
        else    { if (o.y1 >= cap.y2 + 1 && o.y1 < bound) bound = o.y1 - 3; }
      }
      const top = up ? bound : cap.y1, bot = up ? cap.y2 : bound;
      let nx1 = M, nx2 = W - M;
      for (const o of obs) {
        if (o.y2 <= top + 1 || o.y1 >= bot - 1) continue;
        if (o.x2 <= cap.x1 + 1 && o.x2 > nx1) nx1 = o.x2 + 4;
        if (o.x1 >= cap.x2 - 1 && o.x1 - 4 < nx2) nx2 = o.x1 - 4;
      }
      x1 = Math.min(nx1, cap.x1); x2 = Math.max(nx2, cap.x2);
      if (cap.col) { x1 = Math.max(x1, cap.col.x1 - 10); x2 = Math.min(x2, cap.col.x2 + 10); }
    }
    const top = up ? bound : cap.y1, bot = up ? cap.y2 : bound;
    if (bot - top < 20 || x2 - x1 < 30) return null;
    return { x: x1, y: top, w: x2 - x1, h: bot - top };
  }

  /* Walk away from a table caption until a white band taller than the table's
   * own row gaps — the table's real edge. Bounded by the prose-derived box so a
   * runaway can't eat the page. */
  function _frGrowByInkGap(cap, up, probe, W, H, M, bodyH, fallback) {
    const STEP = 2, T = 0.004;
    const whiteNeeded = Math.max(9, bodyH * 1.9);
    let x1 = cap.x1, x2 = cap.x2;
    // widen first: a short "Table 1" title sits over a much wider table
    const yA = up ? Math.max(M, cap.y1 - 200) : cap.y2 + 2;
    const yB = up ? cap.y1 - 2 : Math.min(H - M, cap.y2 + 200);
    if (yB - yA > 10) {
      while (x1 - 4 > M && probe(x1 - 4, yA, x1, yB) > T) x1 -= 4;
      while (x2 + 4 < W - M && probe(x2, yA, x2 + 4, yB) > T) x2 += 4;
    }
    let edge = up ? cap.y1 : cap.y2, white = 0, lastInk = edge;
    for (let y = edge; up ? y > M : y < H - M; y += up ? -STEP : STEP) {
      const a = up ? y - STEP : y, b = up ? y : y + STEP;
      if (probe(x1, a, x2, b) > T) { white = 0; lastInk = up ? a : b; }
      else { white += STEP; if (white >= whiteNeeded) break; }
    }
    const top = up ? lastInk - 2 : cap.y1;
    const bot = up ? cap.y2 : lastInk + 2;
    if (bot - top < 25) return fallback;
    return { x: x1, y: top, w: x2 - x1, h: bot - top };
  }

  /* ── ink helpers ────────────────────────────────────────────── */
  function _frTightenToInk(box, cap, probe, up) {
    const STEP = 3, T = 0.004;
    let top = box.y, bot = box.y + box.h;
    if (up) {
      let first = cap.y1;
      for (let y = box.y; y < cap.y1 - STEP; y += STEP) {
        if (probe(box.x, y, box.x + box.w, y + STEP) > T) { first = y; break; }
      }
      top = Math.max(box.y, first - 2);
    } else {
      let last = cap.y2;
      for (let y = bot - STEP; y > cap.y2 + STEP; y -= STEP) {
        if (probe(box.x, y, box.x + box.w, y + STEP) > T) { last = y + STEP; break; }
      }
      bot = Math.min(bot, last + 2);
    }
    let left = box.x, right = box.x + box.w;
    for (let x = box.x; x < right - STEP; x += STEP) {
      if (probe(x, top, x + STEP, bot) > T) { left = Math.max(box.x, x - 2); break; }
    }
    for (let x = right - STEP; x > left + STEP; x -= STEP) {
      if (probe(x, top, x + STEP, bot) > T) { right = Math.min(box.x + box.w, x + STEP + 2); break; }
    }
    return { x: left, y: top, w: right - left, h: bot - top };
  }

  function _frInkBounds(probe, x1, y1, x2, y2) {
    const STEP = 4, T = 0.004;
    let top = null, bot = null, left = null, right = null;
    for (let y = y1; y < y2; y += STEP) if (probe(x1, y, x2, y + STEP) > T) { top = y; break; }
    for (let y = y2 - STEP; y > y1; y -= STEP) if (probe(x1, y, x2, y + STEP) > T) { bot = y + STEP; break; }
    if (top == null || bot == null || bot <= top) return null;
    for (let x = x1; x < x2; x += STEP) if (probe(x, top, x + STEP, bot) > T) { left = x; break; }
    for (let x = x2 - STEP; x > x1; x -= STEP) if (probe(x, top, x + STEP, bot) > T) { right = x + STEP; break; }
    if (left == null || right == null || right <= left) return null;
    return { x: left, y: top, w: right - left, h: bot - top };
  }

  /* ── misc ───────────────────────────────────────────────────── */
  function _frUnion(a, b) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  }
  function _frDedupe(rs) {
    const out = [];
    for (const r of rs) {
      const hit = out.find(o => _frOverlapFrac(o, r) > 0.6);
      if (hit) { Object.assign(hit, _frUnion(hit, r)); continue; }
      out.push(r);
    }
    return out;
  }
  function _frOverlapFrac(a, b) {
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return (ix * iy) / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
  }
  function _frMedian(a) {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  }

  /* Production entry: same signature as before —
   * figureRegions(items, {pageWidth, pageHeight, inkProbe, graphics}) → [{x,y,w,h,label,kind}]
   * Viewer items carry width/height; the offline harness uses w/h.
   * V3.826 — `graphics` is the page's painted-image/path boxes from
   * collectGraphics (same coordinate basis as the items).  Without it the
   * caption-growth method runs alone, as before. */
  function figureRegions(items, opts) {
    opts = opts || {};
    var norm = [];
    for (var i = 0; i < (items || []).length; i++) {
      var it = items[i];
      norm.push({
        x: it.x, y: it.y,
        w: (it.w != null ? it.w : it.width),
        h: (it.h != null ? it.h : it.height),
        text: it.text, cluster: it.cluster, column: it.column, blockType: it.blockType,
      });
    }
    if (!norm.length) return [];
    var W = opts.pageWidth, H = opts.pageHeight;
    if (!W) { W = 0; norm.forEach(function (n) { W = Math.max(W, n.x + n.w); }); }
    if (!H) { H = 0; norm.forEach(function (n) { H = Math.max(H, n.y + n.h); }); }
    try {
      return _frCore({ w: W, h: H, items: norm }, { inkProbe: opts.inkProbe, graphics: opts.graphics, pageNum: opts.pageNum });
    } catch (e) {
      return [];   // detection is optional — marquee/Alt-drag still work
    }
  }

  window.PAGE_LAYOUT = {
    segmentPage,
    classifyBlocks,
    figureRegions,
    collectGraphics,
    // Non-body block types the selection clamp treats as islands (a body
    // drag skips them; selecting one still works when an endpoint is in it).
    FURNITURE_TYPES: ['header', 'footer', 'pagenum', 'caption', 'footnote', 'sidenote'],
    // internals for tests / advanced callers
    _lineSort, _clusterAndSort, _detectColumnGutters, _orderByColumns, _orderByFloodFill,
  };
})();
