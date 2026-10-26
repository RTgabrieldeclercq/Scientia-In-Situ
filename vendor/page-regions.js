/* page-regions.js — classify every part of a page, not just its figures
 * (V3.644, Label Mode R1).
 *
 * PAGE_LAYOUT.figureRegions answers "where are the figures and tables".
 * The reader's Label Mode needs the whole page typed: title, authors,
 * affiliation, abstract, keywords, notes, body text, equations, inline
 * citations, running heads.  This module produces that, reusing
 * figureRegions for the two classes it already does well.
 *
 *   PAGE_REGIONS.detect(items, {pageWidth, pageHeight, pageNum, numPages,
 *                               inkProbe}) → [{x,y,w,h,t,label,conf}]
 *
 * Coordinates are NATURAL (zoom 1, same basis as figureRegions), so a
 * stored label survives zoom and re-render.
 *
 * WHY THESE RULES: they are the ones a labelled training set actually
 * supported.  Per-class one-vs-rest average precision, leave-one-paper-out
 * over 9 papers / 546 regions (lab/perclass.py in the training harness):
 *
 *     reference 1.00   table 1.00   equation 1.00   authors 1.00
 *     figure 0.98      affiliation 0.94   title 0.91   text 0.89
 *     abstract 0.81    note 0.77
 *
 * Two findings worth keeping:
 *   - `reference` means the INLINE citation marker — "(1–4)", "[7]" — not
 *     the bibliography.  Separated perfectly by size alone (w_rel/h_rel
 *     AUC 1.000); a detector aimed at the reference LIST proposed 336
 *     boxes for 24 real ones.
 *   - Front matter is a first-page phenomenon: `is_first_page` was the
 *     single most important feature in the whole 103-feature bank.
 *
 * Everything here is correctable in the reader — Label Mode stores human
 * fixes at papers/{id}/pageLabels/{page} and prefers them over this
 * output, so the detector's job is a good first draft, not perfection.
 */
(function () {
  'use strict';

  /* Types the reader knows how to draw. Order = palette order. */
  var TYPES = [
    { t: 'figure', label: 'Figure', color: '#22a06b' },
    { t: 'table', label: 'Table', color: '#e08a00' },
    { t: 'equation', label: 'Equation', color: '#0aa3c2' },
    { t: 'reference', label: 'Citation', color: '#b04ec4' },
    { t: 'text', label: 'Body text', color: '#7a8699' },
    { t: 'title', label: 'Title', color: '#d5352f' },
    { t: 'authors', label: 'Authors', color: '#c2557a' },
    { t: 'affiliation', label: 'Affiliation', color: '#8a6f3f' },
    { t: 'abstract', label: 'Abstract', color: '#3f6fd8' },
    { t: 'keywords', label: 'Keywords', color: '#5f8f2f' },
    { t: 'note', label: 'Note', color: '#8b8b8b' },
    { t: 'header', label: 'Header/footer', color: '#b8bcc4' },
    { t: 'other', label: 'Other', color: '#444' },
  ];
  var COLOR = {};
  TYPES.forEach(function (d) { COLOR[d.t] = d.color; });

  /* ── regexes (ported from the training lab's retag.py, which scored
   *    33/36 against Alex's hand labels) ───────────────────────────── */
  var RE = {
    abstract: /^\s*(a\s*b\s*s\s*t\s*r\s*a\s*c\s*t|s\s*u\s*m\s*m\s*a\s*r\s*y)\b/i,
    keywords: /^\s*(key\s*words?|a\s*r\s*t\s*i\s*c\s*l\s*e\s+i\s*n\s*f\s*o)\b/i,
    abbrev: /^\s*abbreviation/i,
    affil: /\b(department|universi|institut|laborator|school of|college|academy|centre|center for|hospital|facultad|dipartimento|academia)\b/i,
    editorial: /\b(edited by|communicated by|approved \w+ \d|received for review)\b/i,
    note: /(©|copyright|all rights reserved|creative commons|licensee|author contributions|abbreviations|conflict of interest|competing interest|supplementary material|received|accepted|revised|edited by|communicated by|corresponding author|correspondence|doi\.org|publication costs|reprints|freely available|funding|e-?mail:)/i,
    /* keyword lists join with a typographic separator — NOT a semicolon,
     * which also appears in "Abbreviations: PDL, …; Ara-C, …" footnotes */
    kwsep: /[∣|·•]\s*\w/,
    head: /^\s*(?:\d+\.?\d*\.?\s+)?(introduction|results|discussion|conclusion|methods?|materials|references|bibliography|acknowledg|background|experimental|supplementary)\b/i,
    /* an inline citation marker, alone in its own text item */
    cite: /^\s*[\[(]\s*\d+\s*(?:[-–—,]\s*\d*\s*)*[\])]\s*[.,;:]?\s*$/,
    citeSup: /^\s*\d+(?:\s*[-–,]\s*\d+)*\s*$/,
    eqNum: /^\s*[\[(]\s*\d{1,3}[a-z]?\s*[\])]\s*$/,
  };

  var MATH = '∑∫∂∇±×÷≈≠≤≥∈∉⊂⊃∪∩∞√πΣΩΓΔΘΛΞΠΦΨαβγδεζηθικλμνξρστυφχψω' +
    '⟨⟩‖∥⊗⊕→←↔⇒⇔∀∃¬∧∨≡≅∼∝⋅′″';

  function _mathRatio(s) {
    if (!s) return 0;
    var n = 0;
    for (var i = 0; i < s.length; i++) if (MATH.indexOf(s[i]) >= 0) n++;
    return n / s.length;
  }

  function _median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }

  /* ── line + block grouping ───────────────────────────────────────── */

  function _lines(items, medH) {
    var sorted = items.slice().sort(function (a, b) {
      return (a.y - b.y) || (a.x - b.x);
    });
    var out = [], cur = null;
    sorted.forEach(function (it) {
      var c = it.y + it.h / 2;
      if (cur && Math.abs(c - cur.cy) <= medH * 0.6) {
        cur.items.push(it);
        cur.cy = (cur.cy * (cur.items.length - 1) + c) / cur.items.length;
      } else {
        if (cur) out.push(cur);
        cur = { cy: c, items: [it] };
      }
    });
    if (cur) out.push(cur);
    /* split each visual row at horizontal gaps wider than a column gutter,
     * so a 2-column page doesn't fuse left+right into one line */
    var split = [];
    out.forEach(function (L) {
      L.items.sort(function (a, b) { return a.x - b.x; });
      var run = [L.items[0]];
      for (var i = 1; i < L.items.length; i++) {
        var prev = run[run.length - 1];
        var gap = L.items[i].x - (prev.x + prev.w);
        if (gap > medH * 1.6) { split.push(_mkLine(run)); run = []; }
        run.push(L.items[i]);
      }
      if (run.length) split.push(_mkLine(run));
    });
    return split.filter(Boolean);
  }

  function _mkLine(items) {
    if (!items.length) return null;
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    items.forEach(function (i) {
      x1 = Math.min(x1, i.x); y1 = Math.min(y1, i.y);
      x2 = Math.max(x2, i.x + i.w); y2 = Math.max(y2, i.y + i.h);
    });
    return {
      items: items, x1: x1, y1: y1, x2: x2, y2: y2,
      h: _median(items.map(function (i) { return i.h; })),
      text: items.map(function (i) { return i.text || ''; }).join(' ')
        .replace(/\s+/g, ' ').trim(),
    };
  }

  /** Vertical gutters, from a coverage histogram of the line x-ranges.
   *  WITHOUT this, lines sorted by y alternate left/right column on a
   *  2-column page, every merge test fails on the x-overlap check, and
   *  every paragraph comes out as a stack of one-line blocks. */
  function _gutters(lines, W, medH) {
    if (lines.length < 8) return [];
    var NB = 160, bw = W / NB, cov = new Array(NB).fill(0);
    var left = Infinity, right = -Infinity;
    lines.forEach(function (L) {
      left = Math.min(left, L.x1); right = Math.max(right, L.x2);
    });
    if (!(right > left)) return [];
    /* Full-width lines — a title, a spanning caption, an author list —
     * bridge the gutter and would hide it from a zero-coverage scan.  The
     * gutter is a property of the COLUMNS, so only column-width lines vote.
     * (Without this, angelini's page 1 came back as a single 2-column-wide
     * "text" run 579px tall.) */
    var span = right - left;
    lines.forEach(function (L) {
      if ((L.x2 - L.x1) > span * 0.62) return;
      var a = Math.max(0, Math.floor(L.x1 / bw));
      var b = Math.min(NB - 1, Math.ceil(L.x2 / bw) - 1);
      for (var i = a; i <= b; i++) cov[i]++;
    });
    var minRun = Math.max(2, Math.round((medH * 1.1) / bw));
    var out = [], run = 0;
    var lo = Math.floor(left / bw), hi = Math.ceil(right / bw);
    for (var i = lo; i <= hi; i++) {
      if (i < hi && cov[i] === 0) { run++; continue; }
      if (run >= minRun) {
        var c = (i - run / 2) * bw;
        /* only interior gutters — page margins are not column splits */
        if (c > left + (right - left) * 0.12 && c < right - (right - left) * 0.12) {
          out.push(c);
        }
      }
      run = 0;
    }
    return out;
  }

  /** Which column a line sits in; -1 when it straddles a gutter (a
   *  full-width title or a spanning caption). */
  function _colOf(L, gutters) {
    if (!gutters.length) return 0;
    for (var i = 0; i < gutters.length; i++) {
      if (L.x1 < gutters[i] - 1 && L.x2 > gutters[i] + 1) return -1;
    }
    var c = 0;
    while (c < gutters.length && L.x1 >= gutters[c]) c++;
    return c;
  }

  /** Consecutive lines merge into a block while they stay in the same
   *  column, keep the same type size, and the vertical gap stays close to
   *  the running line pitch. */
  function _blocks(lines, medH) {
    var out = [], cur = null;
    lines.forEach(function (L) {
      if (cur) {
        var prev = cur.lines[cur.lines.length - 1];
        var gap = L.y1 - prev.y2;
        var overlap = Math.min(L.x2, cur.x2) - Math.max(L.x1, cur.x1);
        var sizeOk = Math.abs(L.h - prev.h) <= Math.max(1.2, prev.h * 0.30);
        if (gap <= medH * 1.10 && gap >= -medH * 0.5 &&
            overlap > Math.min(L.x2 - L.x1, cur.x2 - cur.x1) * 0.35 && sizeOk) {
          cur.lines.push(L);
          cur.x1 = Math.min(cur.x1, L.x1); cur.x2 = Math.max(cur.x2, L.x2);
          cur.y2 = Math.max(cur.y2, L.y2);
          return;
        }
      }
      if (cur) out.push(cur);
      cur = { lines: [L], x1: L.x1, y1: L.y1, x2: L.x2, y2: L.y2 };
    });
    if (cur) out.push(cur);
    out.forEach(function (b) {
      b.text = b.lines.map(function (l) { return l.text; }).join(' ')
        .replace(/\s+/g, ' ').trim();
      b.h = _median(b.lines.map(function (l) { return l.h; }));
      b.items = b.lines.reduce(function (a, l) { return a.concat(l.items); }, []);
    });
    return out;
  }

  /* ── front matter (first page only) ──────────────────────────────── */

  function _frontMatter(b, medH, W, H, st) {
    st = st || {};
    var txt = b.text, head = txt.slice(0, 80);
    var words = txt.split(/\s+/).filter(Boolean);
    var rel = b.h / (medH || 1);
    var maxRel = Math.max.apply(null,
      b.items.map(function (i) { return i.h; })) / (medH || 1);
    var supers = b.items.filter(function (i) {
      return /^\d+$/.test((i.text || '').trim()) && i.h < b.h * 0.85;
    }).length;
    var commas = (txt.match(/,/g) || []).length;
    var nAffil = (txt.match(RE.affil) ? (txt.match(new RegExp(RE.affil.source, 'gi')) || []).length : 0);

    if (RE.abbrev.test(head)) return 'note';
    if (RE.abstract.test(head)) return 'abstract';
    if (RE.keywords.test(head)) return 'keywords';
    /* Title: the biggest type on the page, near the top, short, and free of
     * metadata words. 1.30 not 1.45 — REVTeX sets a 14pt title over 10pt. */
    if (maxRel >= 1.30 && b.y1 < H * 0.35 && words.length <= 30 &&
        !RE.note.test(txt) && !RE.affil.test(txt)) return 'title';
    /* An author line carries at most a trailing institution; a real
     * affiliation block names several. "Edited by" is editorial however
     * many commas it holds. */
    if (b.y1 < H * 0.30 && (b.y2 - b.y1) < 80 && words.length <= 130 &&
        (supers >= 2 || commas >= 3) && nAffil <= 1 &&
        !RE.editorial.test(txt) && !RE.abstract.test(head)) return 'authors';
    if (RE.note.test(txt)) {
      if (nAffil >= 2) return 'affiliation';
      return 'note';
    }
    if (RE.affil.test(txt)) return 'affiliation';
    if (words.length <= 22 && (b.y2 - b.y1) < 30 && RE.kwsep.test(txt) &&
        !RE.affil.test(txt)) return 'keywords';
    if ((b.y2 - b.y1) < 80 && (supers >= 2 || commas >= 2) &&
        words.length <= 130) return 'authors';
    /* An abstract with no "ABSTRACT" heading is just a long block near the
     * top — and so is the first column of body text.  Allow the guess ONCE
     * per page, and only in the upper half; otherwise every page-1 column
     * comes back as an abstract. */
    if (!st.abstract && words.length > 40 && (b.y2 - b.y1) > 60 &&
        b.y1 < H * 0.55) return 'abstract';
    return null;
  }

  /* ── equations ───────────────────────────────────────────────────── */

  /* Display equations separate on: heavy math glyphs OR a very sparse,
   * many-item line (`r_space` had AUC 0.993 — pdf.js emits one item per
   * glyph run for math), plus horizontal isolation. */
  function _isEquation(b, medH, W) {
    var txt = b.text;
    if (!txt) return false;
    var mr = _mathRatio(txt);
    var itemsPerChar = b.items.length / Math.max(1, txt.length);
    var width = b.x2 - b.x1;
    var lines = b.lines.length;
    /* alpha over NON-SPACE characters — pdf.js pads math with spaces, so
     * measuring against total length makes prose look like math. */
    var nonSpace = txt.replace(/\s/g, '').length || 1;
    var alpha = (txt.match(/[A-Za-z]/g) || []).length / nonSpace;
    var narrow = width < W * 0.46;
    var dense = itemsPerChar > 0.22;      // one text item per ~4 chars
    var mathy = mr > 0.035;
    var numbered = RE.eqNum.test(b.lines[b.lines.length - 1].text) ||
      /[\[(]\s*\d{1,3}[a-z]?\s*[\])]\s*$/.test(txt);
    if (lines > 6) return false;
    if (alpha > 0.72 && !mathy) return false;   // ordinary prose
    return (mathy && (dense || narrow)) ||
      (dense && narrow && alpha < 0.6) ||
      (numbered && (mathy || dense) && narrow);
  }

  /** Union boxes that sit within (gx, gy) of each other, repeating until
   *  nothing more merges.  Labels concatenate in reading order. */
  function _mergeNear(list, gx, gy) {
    var boxes = list.slice();
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < boxes.length && !changed; i++) {
        for (var j = i + 1; j < boxes.length; j++) {
          var a = boxes[i], b = boxes[j];
          var dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
          var dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
          if (dx > gx || dy > gy) continue;
          var x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y);
          var x2 = Math.max(a.x + a.w, b.x + b.w);
          var y2 = Math.max(a.y + a.h, b.y + b.h);
          var first = (a.y < b.y || (a.y === b.y && a.x <= b.x)) ? a : b;
          var second = first === a ? b : a;
          boxes[i] = {
            x: x1, y: y1, w: x2 - x1, h: y2 - y1, t: a.t, col: a.col,
            conf: Math.max(a.conf || 0, b.conf || 0),
            label: ((first.label || '') + ' ' + (second.label || '')).trim().slice(0, 120),
          };
          boxes.splice(j, 1);
          changed = true;
          break;
        }
      }
    }
    return boxes;
  }

  /* ── entry point ─────────────────────────────────────────────────── */

  function detect(items, opts) {
    opts = opts || {};
    var W = opts.pageWidth || 612, H = opts.pageHeight || 792;
    var pageNum = opts.pageNum || 1;
    var out = [];
    try {
      var its = (items || [])
        .map(function (it) {
          return {
            x: it.x, y: it.y,
            w: (it.w != null ? it.w : it.width) || 0,
            h: (it.h != null ? it.h : it.height) || 0,
            text: it.text || '',
          };
        })
        .filter(function (it) { return (it.text || '').trim() && it.h > 0; });
      if (!its.length) return [];
      var medH = _median(its.map(function (i) { return i.h; })) || 10;

      /* 1 ─ figures + tables from the trained detector */
      var figs = [];
      if (window.PAGE_LAYOUT && window.PAGE_LAYOUT.figureRegions) {
        figs = window.PAGE_LAYOUT.figureRegions(items, opts) || [];
      }
      figs.forEach(function (f) {
        out.push({
          x: f.x, y: f.y, w: f.w, h: f.h,
          t: f.kind === 'table' ? 'table' : 'figure',
          label: f.label || '', conf: 0.8,
        });
      });
      var inFig = function (it) {
        return figs.some(function (f) {
          return it.x + it.w > f.x + 2 && it.x < f.x + f.w - 2 &&
            it.y + it.h > f.y + 2 && it.y < f.y + f.h - 2;
        });
      };

      /* 3 ─ block the remaining text, one column at a time */
      var rest = its.filter(function (it) { return !inFig(it); });
      var allLines = _lines(rest, medH);
      var gutters = _gutters(allLines, W, medH);
      var byCol = {};
      allLines.forEach(function (L) {
        var c = _colOf(L, gutters);
        (byCol[c] = byCol[c] || []).push(L);
      });
      /* _lines splits a visual row wherever the horizontal gap exceeds a
       * gutter width, which is right for columns but wrong for a spread-out
       * author line ("Zaman Ataie¹    Sulin Zhang²…").  Inside one column
       * those fragments belong to the same row, so stitch them back.
       * PAGE 1 ONLY — elsewhere the same stitch glues the scattered pieces
       * of a display equation into one row and destroys them. */
      if (pageNum === 1) Object.keys(byCol).forEach(function (c) {
        var rows = [];
        byCol[c].sort(function (a, b) { return a.y1 - b.y1 || a.x1 - b.x1; })
          .forEach(function (L) {
            var prev = rows[rows.length - 1];
            if (prev && Math.abs((L.y1 + L.y2) / 2 - (prev.y1 + prev.y2) / 2) <= medH * 0.55) {
              rows[rows.length - 1] = _mkLine(prev.items.concat(L.items));
            } else {
              rows.push(L);
            }
          });
        byCol[c] = rows;
      });
      var blocks = [];
      Object.keys(byCol).forEach(function (c) {
        _blocks(byCol[c], medH).forEach(function (b) {
          b.col = c;
          blocks.push(b);
        });
      });

      /* 2 ─ inline citation markers — "(1–4)", "[7]".  pdf.js splits these
       *     across several text items ("(1", "–", "4)"), so scan the LINE
       *     and map the match back onto the items it covers.  Size alone
       *     separates them from every other class (AUC 1.000); the regex is
       *     only there for precision.  Emitted even inside a text block —
       *     they are marks ON the prose, not blocks of it. */
      allLines.forEach(function (L) {
        for (var i = 0; i < L.items.length; i++) {
          var s = (L.items[i].text || '');
          if (!/[[(]/.test(s)) continue;
          var acc = '', run = [];
          for (var j = i; j < L.items.length && j < i + 8; j++) {
            acc += (run.length ? ' ' : '') + (L.items[j].text || '');
            run.push(L.items[j]);
            if (!/[\])]/.test(L.items[j].text || '')) continue;
            var m = acc.match(/[[(]\s*\d+\s*(?:[-–—,]\s*\d+\s*)*[\])]/);
            if (m && m[0].length >= acc.trim().length - 2) {
              var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
              run.forEach(function (it) {
                x1 = Math.min(x1, it.x); y1 = Math.min(y1, it.y);
                x2 = Math.max(x2, it.x + it.w); y2 = Math.max(y2, it.y + it.h);
              });
              if ((x2 - x1) <= W * 0.14 && (y2 - y1) <= medH * 2.2) {
                out.push({
                  x: x1 - 1, y: y1 - 1, w: (x2 - x1) + 2, h: (y2 - y1) + 2,
                  t: 'reference', label: m[0], conf: 0.9,
                });
                i = j;
              }
            }
            break;
          }
        }
      });

      /* Front matter only runs above the point where the body starts —
       * otherwise every short comma-heavy line on page 1 reads as an
       * author list.  The body starts at the first full-height prose block
       * that is clearly not front matter. */
      var fmLimit = pageNum === 1 ? H : 0;
      if (pageNum === 1) {
        var firstBody = blocks.filter(function (b) {
          return b.lines.length >= 4 && b.text.length > 260 &&
            !RE.abstract.test(b.text.slice(0, 80));
        }).sort(function (a, b) { return a.y1 - b.y1; })[0];
        if (firstBody) fmLimit = firstBody.y2 + 2;
      }

      var typed = [];
      var fmState = {};
      blocks.sort(function (a, b) { return a.y1 - b.y1 || a.x1 - b.x1; });
      blocks.forEach(function (b) {
        if (!b.text) return;
        if ((b.x2 - b.x1) < 4 || (b.y2 - b.y1) < 3) return;
        var t = null, conf = 0.6;

        /* running heads and folios: a lone short line hugging an edge */
        var edge = b.y1 < H * 0.055 || b.y2 > H * 0.945;
        if (edge && b.lines.length === 1 && b.text.length < 120) {
          t = 'header'; conf = 0.75;
        }
        if (!t && _isEquation(b, medH, W)) { t = 'equation'; conf = 0.7; }
        if (!t && pageNum === 1 && b.y1 < fmLimit) {
          var fm = _frontMatter(b, medH, W, H, fmState);
          if (fm) { t = fm; conf = 0.7; if (fm === 'abstract') fmState.abstract = true; }
        }
        if (!t) { t = 'text'; conf = 0.6; }
        typed.push({
          x: b.x1, y: b.y1, w: b.x2 - b.x1, h: b.y2 - b.y1,
          t: t, conf: conf, col: b.col, label: b.text.slice(0, 90),
        });
      });

      /* Body text is labelled as a COLUMN RUN, not a paragraph: adjacent
       * text blocks in one column merge until something else interrupts
       * them.  Paragraph-level boxes were 15× too many to review. */
      var runs = [];
      typed.sort(function (a, b) {
        return String(a.col).localeCompare(String(b.col)) || (a.y - b.y);
      }).forEach(function (r) {
        var last = runs[runs.length - 1];
        if (r.t === 'text' && last && last.t === 'text' && last.col === r.col &&
            (r.y - (last.y + last.h)) <= medH * 2.6) {
          last.w = Math.max(last.x + last.w, r.x + r.w) - Math.min(last.x, r.x);
          last.x = Math.min(last.x, r.x);
          last.h = (r.y + r.h) - last.y;
          return;
        }
        runs.push(r);
      });
      /* A display equation arrives as CONFETTI: pdf.js emits superscripts,
       * denominators and fraction bars at their own y, so line grouping
       * shreds one equation into a dozen fragments.  Glue neighbouring
       * equation pieces back together, then drop the strays that never
       * found a partner (a lone superscript is not an equation). */
      var eqs = runs.filter(function (r) { return r.t === 'equation'; });
      var others = runs.filter(function (r) { return r.t !== 'equation'; });
      eqs = _mergeNear(eqs, medH * 1.6, medH * 1.4);
      eqs = eqs.filter(function (e) {
        return e.w >= medH * 2 && (e.label || '').replace(/\s/g, '').length >= 6;
      });
      others.concat(eqs).forEach(function (r) { delete r.col; out.push(r); });
    } catch (e) {
      console.warn('[page-regions] detect failed:', e);
    }
    return out;
  }

  window.PAGE_REGIONS = {
    detect: detect,
    TYPES: TYPES,
    COLOR: COLOR,
    /* internals, for the training harness */
    _lines: _lines, _blocks: _blocks, _frontMatter: _frontMatter,
    _gutters: _gutters, _colOf: _colOf,
    _isEquation: _isEquation,
  };
})();
