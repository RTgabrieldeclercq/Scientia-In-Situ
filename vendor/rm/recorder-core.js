/* ================================================================
   recorder-core.js — V3.884 — the one recorder's timeline, shared
   ================================================================
   Plan: CodeLog/ClaudesPlan/V3.884_one_recorder_program.md. One model for
   the three places that record — a class whiteboard (lectures), a Lab
   Notebook canvas board, and a Scientia note's Recording component:

     voice    audio time in seconds; RM boards keep wall-clock ms since
              the start plus `gap` events (a suspended tab, a pause), and
              audioToWall / wallToAudio convert between the two.
     ink      a stroke drawn while recording carries its moment: RM's
              strokes t0/t1 (wall ms), a Scientia stroke rt [recId, t0, t1]
              (audio s). strokesAt(t) = the ink being drawn at t.
     marks    { id, t, kind, label, end? } — a moment (no end) or a section
              (end = null while open, then a time); kinds below. Scientia's
              ◆ bookmarks are marks of kind 'important' with no kind field.
              V3.886 (Alex: "simple up front, then customize later"): one
              Mark button drops a plain mark; what it is — its kind, its
              words, how long it lasts — is changed on the mark once it is
              in (updateMark, spanTo, removeMark).
     words    transcript segments { s, e, text }; lineAt(t) = the one spoken.
     cost     speech-to-text runs only on a button that shows its likely
              cost first (Alex, 2026-10-23): sttCost(seconds, provider).
              V3.887: the person's own way, chosen in Settings — free on
              their device, or their own OpenAI / Google key (never the
              lab's): rm/js/speech-to-text.js.

   DOM-free: loaded by whiteboard.js (on demand), the Scientia lab layer,
   and node (scripts/tests/recorder-core.test.cjs).
   ================================================================ */
(function (root) {
  'use strict';

  /* USD per audio minute, the one place the estimate comes from (checked 2026-10-23): OpenAI whisper-1 $0.006;
     Google Speech-to-Text V1 standard $0.024 (its first 60 min a month are free); Whisper on the device costs nothing */
  var STT_RATES = { device: 0, openai: 0.006, google: 0.024 };
  var PART_MS = 60000;
  var MARK_KINDS = [
    { id: 'important', label: 'Important', glyph: '◆' },
    { id: 'question', label: 'Question', glyph: '?' },
    { id: 'decision', label: 'Decision', glyph: '◇' },
    { id: 'todo', label: 'To do', glyph: '☐' }
  ];
  var KIND = {};
  MARK_KINDS.forEach(function (k) { KIND[k.id] = k; });

  function num(v) { var n = +v; return isFinite(n) ? n : null; }
  function r2(v) { return Math.round(v * 100) / 100; }
  var seq = 0;
  function newId() { seq = (seq + 1) % 1e6; return 'mk' + Date.now().toString(36) + seq.toString(36); }
  function kindOf(k) { return KIND[k] ? k : 'important'; }

  /** A clean mark: t ≥ 0 (seconds, 2 dp); end absent = a moment, null = an open section, a number ≥ t = a section. */
  function normMark(m) {
    m = m || {};
    var t = Math.max(0, num(m.t) || 0), out = { id: String(m.id || newId()), t: r2(t), kind: kindOf(m.kind), label: String(m.label == null ? '' : m.label).slice(0, 200) };
    if (m.end === null) out.end = null;
    else if (m.end !== undefined && num(m.end) != null) out.end = r2(Math.max(t, num(m.end)));
    return out;
  }
  function sortMarks(list) { return list.slice().sort(function (a, b) { return a.t - b.t || String(a.id).localeCompare(String(b.id)); }); }
  function normMarks(list) { return sortMarks((Array.isArray(list) ? list : []).map(normMark)); }
  /** A moment mark at t. */
  function addMark(marks, m) { return normMarks((marks || []).concat([normMark(Object.assign({}, m, { end: undefined }))])); }
  /** The section still open, if any (one at a time). */
  function openOf(marks) { var o = null; (marks || []).forEach(function (m) { if (m && m.end === null) o = m; }); return o; }
  /** Start a section at t (closing one still open there first). */
  function openSection(marks, m) {
    var list = closeSection(marks, num(m && m.t) || 0);
    return normMarks(list.concat([normMark(Object.assign({}, m, { end: null }))]));
  }
  /** End the open section at t. */
  function closeSection(marks, t) {
    return normMarks((marks || []).map(function (m) { return m && m.end === null ? Object.assign({}, m, { end: Math.max(m.t, num(t) || 0) }) : m; }));
  }
  /** Start or end a section: the one recorder's single "section" button. */
  function toggleSection(marks, t, kind) { return openOf(marks) ? closeSection(marks, t) : openSection(marks, { t: t, kind: kind || 'important' }); }
  /** The marks that cover t: sections around it, moments within `near` seconds. */
  function marksAt(marks, t, near) {
    near = near == null ? 1.5 : near;
    return (marks || []).filter(function (m) { var moment = m.end === undefined; return moment ? Math.abs(m.t - t) <= near : t >= m.t && (m.end === null || t <= m.end); });
  }
  /** Change a mark once it is in (its kind, its words). */
  function updateMark(marks, id, patch) {
    return normMarks((marks || []).map(function (m) { return m && m.id === id ? Object.assign({}, m, patch || {}, { id: m.id, t: m.t }) : m; }));
  }
  /** A mark that lasts: from its moment until t; t null (or not after it) = back to a moment. */
  function spanTo(marks, id, t) {
    return normMarks((marks || []).map(function (m) {
      if (!m || m.id !== id) return m;
      var o = Object.assign({}, m); delete o.end;
      if (t != null && num(t) != null && num(t) > m.t) o.end = num(t);
      return o;
    }));
  }
  function removeMark(marks, id) { return normMarks((marks || []).filter(function (m) { return m && m.id !== id; })); }
  function markLabel(m) { var k = KIND[kindOf(m && m.kind)]; return k.glyph + ' ' + (m && m.label ? m.label : k.label); }

  /* ---- voice: wall time (RM boards, ms) ↔ audio time, around recorded gaps { t, durationMs } (t = when it ended) ---- */
  function audioToWall(a, gaps) {
    var w = a;
    (gaps || []).slice().sort(function (x, y) { return x.t - y.t; }).forEach(function (g) { if (g && g.durationMs > 0 && w >= g.t - g.durationMs) w += g.durationMs; });
    return w;
  }
  function wallToAudio(w, gaps) {
    var a = w;
    (gaps || []).forEach(function (g) { if (g && g.durationMs > 0 && g.t <= w) a -= g.durationMs; });
    return Math.max(0, a);
  }

  /* ---- words ---- */
  /** The segment being spoken at t: the one containing it, else the last that started before it; -1 before the first. */
  function lineAt(segs, t) {
    var best = -1;
    (segs || []).forEach(function (s, i) { if (s && num(s.s) != null && s.s <= t) best = i; });
    return best;
  }

  /* ---- ink ---- */
  /** A Scientia stroke's moment: rt = [recId, t0, t1] (audio seconds). */
  function momentOf(stroke, recId) {
    var rt = stroke && stroke.rt;
    if (!Array.isArray(rt) || rt.length < 3 || (recId && rt[0] !== recId)) return null;
    return { t0: num(rt[1]), t1: num(rt[2]) };
  }
  /** The strokes being drawn around t (pad seconds either side). */
  function strokesAt(strokes, t, recId, pad) {
    pad = pad == null ? 0.75 : pad;
    return (strokes || []).filter(function (s) { var m = momentOf(s, recId); return m && m.t0 != null && t >= m.t0 - pad && t <= (m.t1 == null ? m.t0 : m.t1) + pad; });
  }
  /** Stamp a stroke with its moment (a copy; the original is untouched). */
  function stamp(stroke, recId, t0, t1) {
    var o = Object.assign({}, stroke);
    o.rt = [String(recId), r2(Math.max(0, num(t0) || 0)), r2(Math.max(num(t0) || 0, num(t1) == null ? num(t0) || 0 : num(t1)))];
    return o;
  }

  /* ---- cost ---- */
  /** The likely price of speech-to-text for `sec` seconds of audio with a provider (or a rate in USD per minute),
   *  counted per started minute, to be safe. */
  function sttCost(sec, provider) {
    var rate = typeof provider === 'number' ? provider : STT_RATES[provider] != null ? STT_RATES[provider] : STT_RATES.google;
    var minutes = Math.max(1, Math.ceil((num(sec) || 0) / 60)), usd = minutes * rate;
    var text = !rate ? 'free' : usd < 0.01 ? 'under 1¢' : usd < 1 ? Math.max(1, Math.round(usd * 100)) + '¢' : '$' + usd.toFixed(2);
    return { minutes: minutes, usd: Math.round(usd * 10000) / 10000, text: text, rate: rate };
  }

  /* ---- parts (a recording saved while it runs) ---- */
  function partName(n, ext) { return 'part-' + String(n).padStart(4, '0') + '.' + String(ext || 'webm').replace(/[^a-z0-9]/gi, ''); }
  function mmss(sec) { sec = Math.max(0, Math.floor(num(sec) || 0)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); }

  var API = {
    STT_RATES: STT_RATES, PART_MS: PART_MS, MARK_KINDS: MARK_KINDS, KIND: KIND,
    kindOf: kindOf, normMark: normMark, normMarks: normMarks, addMark: addMark, openOf: openOf, openSection: openSection, closeSection: closeSection,
    toggleSection: toggleSection, updateMark: updateMark, spanTo: spanTo, removeMark: removeMark, marksAt: marksAt, markLabel: markLabel, audioToWall: audioToWall, wallToAudio: wallToAudio, lineAt: lineAt,
    momentOf: momentOf, strokesAt: strokesAt, stamp: stamp, sttCost: sttCost, partName: partName, mmss: mmss
  };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.RECORDER_CORE = API;
})(typeof window !== 'undefined' ? window : this);
