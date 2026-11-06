/* ==========================================================================
   13zn · Recordings. "+ Insert → Recording" puts a recording component on
   the paper and starts the device's microphone. Pause / resume keep one
   file; ◆ drops a bookmark at the current moment (Alt+M too). Stop saves the
   audio as it was recorded (WebM/Opus on Windows and Android, M4A on the
   iPad) into the notebook folder's recordings/ folder, through the computer.
   The computer then transcribes it with Whisper (Settings → Recordings).
   The transcript is ordinary text in the component, one sentence a line —
   correct it, mark terms and structures in it like any text. Each line has
   its time in the margin (click it to play from there; Alt+click a line
   does the same), and a clock time every 30 s of recording.
   Not reachable (no computer)? The audio is kept on this device and moves
   to the folder when the computer is reachable again.
   ========================================================================== */
const REC = {
  active: null,      // the recording in progress: { id, mr, stream, chunks, acc, t0, paused, ctx, an }
  player: null,      // one audio player for the whole app: { id, audio, url }
  MIMES: [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/mp4', 'm4a'], ['audio/ogg;codecs=opus', 'ogg']],
  r: b => b.rec || (b.rec = { state: 'new', marks: [], pauses: [], segs: [] }),
  mmss(sec) { sec = Math.max(0, Math.floor(sec || 0)); const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss); },
  clockAt(rec, t) { if (!rec.started) return null; let ms = +new Date(rec.started) + t * 1000; for (const p of rec.pauses || []) if (p.at <= t && p.len) ms += p.len * 1000; return new Date(ms); },
  clockStr: d => d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '',
  put(b, fn) { const cur = M.block(b.id || b); if (!cur) return null; const n = Object.assign({}, cur, { rec: JSON.parse(JSON.stringify(REC.r(cur))) }); fn(n.rec, n); n.modified = isoLocal(new Date()); DB.put('blocks', n); return n; },
  elapsed() { const a = REC.active; if (!a) return 0; return (a.acc + (a.paused ? 0 : performance.now() - a.t0)) / 1000; },

  /* ---------- making one ---------- */
  create(docId, pos) {
    const b = M.addBlock(docId, null, { kind: 'rec', label: '', x: pos ? Math.round(pos.x / 14) * 14 : null, y: pos ? Math.round(pos.y / 14) * 14 : null, w: 448, rec: { state: 'new', marks: [], pauses: [], segs: [] } });
    b.body = { text: '', marks: [] }; DB.put('blocks', b); changed(); return b;
  },
  async start(b) {
    if (REC.active) { if (REC.active.id === b.id) return; return toast('A recording is already running — stop it first'); }
    if (!navigator.mediaDevices || !window.MediaRecorder) return modal({ title: 'No microphone here', body: h('p.serif', location.protocol === 'http:' && !/^(localhost|127\.)/.test(location.hostname) ? 'Browsers only open the microphone on a secure address. Open the app through its https:// address (Settings → Devices → Tailscale) or on the computer itself.' : 'This browser cannot record audio.') });
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { return modal({ title: 'The microphone is blocked', body: h('p.serif', 'Allow the microphone for this page (the icon at the left of the address bar), then press ● Record again. (' + (e.name || e.message) + ')') }); }
    const [mime, ext] = REC.MIMES.find(([m]) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || ['', 'webm'];
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : {});
    const a = REC.active = { id: b.id, mr, stream, chunks: [], acc: 0, t0: performance.now(), paused: false, ext: (mr.mimeType || mime).includes('mp4') ? 'm4a' : ext, mime: mr.mimeType || mime || 'audio/webm' };
    mr.ondataavailable = e => { if (e.data && e.data.size) a.chunks.push(e.data); };
    mr.onstop = () => REC.saved(a);
    try { const C = window.AudioContext || window.webkitAudioContext; a.ctx = new C(); const src = a.ctx.createMediaStreamSource(stream); a.an = a.ctx.createAnalyser(); a.an.fftSize = 512; src.connect(a.an); } catch { }
    mr.start(1000);
    REC.put(b, r => { r.state = 'recording'; r.started = isoLocal(new Date()); r.mime = a.mime; r.ext = a.ext; r.marks = []; r.pauses = []; r.segs = []; r.device = (typeof SYNC !== 'undefined' && SYNC.local === false) ? 'other' : 'computer'; });
    REC.tick(); changed();
  },
  pause() { const a = REC.active; if (!a || a.paused) return; try { a.mr.pause(); } catch { } a.acc += performance.now() - a.t0; a.paused = true; a.pausedAt = Date.now();
    REC.put(a.id, r => { r.pauses.push({ at: +(a.acc / 1000).toFixed(2), wall: isoLocal(new Date()), len: null }); r.paused = true; }); changed(); },
  resume() { const a = REC.active; if (!a || !a.paused) return; try { a.mr.resume(); } catch { } a.t0 = performance.now(); a.paused = false;
    const len = (Date.now() - a.pausedAt) / 1000; REC.put(a.id, r => { const p = r.pauses[r.pauses.length - 1]; if (p && p.len == null) p.len = +len.toFixed(2); r.paused = false; }); changed(); },
  mark(id) { const a = REC.active, t = a && (!id || a.id === id) ? REC.elapsed() : REC.player && REC.player.id === id ? REC.player.audio.currentTime : null; const bid = id || (a && a.id);
    if (t == null || !bid) return; REC.put(bid, r => { r.marks.push({ id: REC._newMark = uid('k'), t: +t.toFixed(2), label: '' }); r.marks.sort((x, y) => x.t - y.t); }); toast('◆ Bookmark at ' + REC.mmss(t) + ' — type its label'); changed();
    const k = REC._newMark; setTimeout(() => { const inp = document.querySelector(`.rc-ml[data-k="${k}"]`); if (inp) { inp.focus({ preventScroll: true }); inp.select(); } }, 120); },
  stop() { const a = REC.active; if (!a) return; if (a.paused) REC.resume(); a.acc += performance.now() - a.t0; a.paused = true; a.stopping = true;
    REC.put(a.id, r => { r.state = 'saving'; r.dur = +(a.acc / 1000).toFixed(2); r.paused = false; }); try { a.mr.stop(); } catch { REC.saved(a); } changed(); },
  async saved(a) {
    a.stream.getTracks().forEach(t => t.stop()); try { a.ctx && a.ctx.close(); } catch { }
    if (REC.active === a) REC.active = null; REC.tick();
    const blob = new Blob(a.chunks, { type: a.mime }); REC.blobs.set(a.id, blob);
    await REC.upload(a.id, blob); changed();
  },
  blobs: new Map(),   // audio recorded in this session (plays at once, before the file is saved)
  fileBase(b) { const d = M.doc(b.docId), t = new Date(REC.r(b).started || Date.now()); return `${localDate(t)} ${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())} ${(d && d.title || 'recording').replace(/[^A-Za-z0-9 _()-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50)}`; },
  async upload(id, blob) {
    const b = M.block(id); if (!b) return false; const r = REC.r(b);
    try { const res = await fetch(`api/rec?name=${encodeURIComponent(REC.fileBase(b))}&ext=${encodeURIComponent(r.ext || 'webm')}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/octet-stream' } });
      const j = res.ok ? await res.json() : null; if (!j || !j.ok) throw new Error((j && j.error) || 'HTTP ' + res.status);
      REC.put(id, r => { r.state = 'queued'; r.file = j.file; r.path = j.path; r.bytes = j.bytes; r.local = false; });
      DB.del('blobs', 'rec:' + id); toast('Recording saved · recordings/' + j.file, 3500); REC.watch(id); return true; }
    catch (e) { DB.put('blobs', { id: 'rec:' + id, blob }); REC.put(id, r => { r.state = 'local'; r.local = true; r.bytes = blob.size; });
      toast('Recording kept on this device — it moves to the notebook folder when the computer is reachable', 4500); return false; }
  },
  /** Recordings kept on this device move to the folder as soon as the computer is reachable. */
  async flush() { const pend = DB.where('blocks', b => b.kind === 'rec' && b.rec && b.rec.state === 'local'); let n = 0;
    for (const b of pend) { const x = DB.get('blobs', 'rec:' + b.id); if (x && x.blob && await REC.upload(b.id, x.blob)) n++; } return n; },

  /* ---------- transcripts ---------- */
  _watch: new Map(),
  watch(id) { if (REC._watch.has(id)) return; const go = async () => { const b = M.block(id); if (!b || b.status !== 'live' || !b.rec || !b.rec.file || !['queued', 'working'].includes(b.rec.state)) { REC._watch.delete(id); return; }
      let j = null; try { j = await (await fetch('api/rec/status?file=' + encodeURIComponent(b.rec.file), { cache: 'no-store' })).json(); } catch { }
      if (j && j.ok) { if (j.state === 'done') { REC._watch.delete(id); return REC.apply(id, j); }
        if (j.state === 'error') { REC._watch.delete(id); REC.put(id, r => { r.state = 'error'; r.error = j.error || 'failed'; }); return changed(); }
        if (j.state !== b.rec.state) { REC.put(id, r => { r.state = j.state; }); changed(); }
        REC.progress.set(id, j); $$(`.box[data-id="${id}"] .rc-status`).forEach(el => el.replaceWith(REC.statusEl(M.block(id)))); }
      REC._watch.set(id, setTimeout(go, 3000)); };
    REC._watch.set(id, setTimeout(go, 400)); },
  progress: new Map(),
  apply(id, j) {
    const segs = (j.segs || []).map(s => ({ s: s.s, e: s.e, text: String(s.text || '').replace(/\s+/g, ' ').trim() })).filter(s => s.text);
    const cur = M.block(id); if (!cur) return;
    const n = REC.put(id, (r, n) => { r.state = 'done'; r.segs = segs; r.lang = j.lang || null; r.error = null; r.replace = false; });
    const had = cur.rec && cur.rec.replace ? '' : (cur.body.text || '').trim(), text = segs.map(s => s.text).join('\n');
    if (!had) { const nb = Object.assign({}, M.block(id), { body: { text, marks: [] } }); DB.put('blocks', nb); }
    else if (text) { const nb = Object.assign({}, M.block(id), { body: { text: cur.body.text.replace(/\n*$/, '') + '\n' + text, marks: cur.body.marks } }); DB.put('blocks', nb); }
    IX.rebuild(); changed(); typeof TERMSCAN !== 'undefined' && setTimeout(() => TERMSCAN.afterEdit(id), 300); toast('Transcript ready');
  },
  async transcribe(b, again) {
    let j = null; try { j = await (await fetch('api/rec/transcribe?file=' + encodeURIComponent(b.rec.file) + (again ? '&again=1' : ''), { method: 'POST' })).json(); } catch { }
    if (!j || !j.ok) return toast('Can’t reach the computer to transcribe');
    if (j.state === 'done') return REC.apply(b.id, j);
    REC.put(b, r => { r.state = 'queued'; r.error = null; if (again) r.replace = true; }); REC.watch(b.id); changed();
  },
  /** The sentence (segment) for a transcript line; lines past the last segment use the last one. */
  segOf(b, line) { const S = REC.r(b).segs || []; return S.length ? S[Math.min(line, S.length - 1)] : null; },

  /* ---------- playing ---------- */
  src(b) { const r = REC.r(b); if (REC.blobs.has(b.id)) return REC.blobs.get(b.id); const x = DB.get('blobs', 'rec:' + b.id); if (x && x.blob) return x.blob; return r.path ? r.path.split('/').map(encodeURIComponent).join('/') : null; },
  async ensure(b) {
    if (REC.player && REC.player.id === b.id) return REC.player.audio;
    REC.halt(); const s = REC.src(b); if (!s) return null;
    let blob = s; if (typeof s === 'string') { try { const res = await fetch(s); if (!res.ok) throw 0; blob = await res.blob(); REC.blobs.set(b.id, blob); } catch { toast('Can’t load the recording'); return null; } }
    const url = URL.createObjectURL(blob), audio = new Audio(); audio.preload = 'auto'; audio.src = url;
    REC.player = { id: b.id, audio, url };
    audio.addEventListener('timeupdate', () => REC.paintPlay(b.id)); audio.addEventListener('play', () => REC.paintPlay(b.id)); audio.addEventListener('pause', () => REC.paintPlay(b.id)); audio.addEventListener('ended', () => REC.paintPlay(b.id));
    return audio;
  },
  halt() { const p = REC.player; if (!p) return; p.audio.pause(); URL.revokeObjectURL(p.url); const id = p.id; REC.player = null; REC.paintPlay(id); },
  async toggle(b) { const a = await REC.ensure(b); if (!a) return; if (a.paused) a.play().catch(() => toast('Can’t play this file here')); else a.pause(); },
  async seek(b, t, play = true) { const a = await REC.ensure(b); if (!a) return; try { a.currentTime = Math.max(0, t); } catch { } if (play) a.play().catch(() => { }); REC.paintPlay(b.id); },
  paintPlay(id) {
    const p = REC.player && REC.player.id === id ? REC.player.audio : null, b = M.block(id); if (!b) return; const r = REC.r(b), dur = r.dur || (p && isFinite(p.duration) ? p.duration : 0), t = p ? p.currentTime : 0;
    $$(`.box[data-id="${id}"] .rc, .m-card[data-id="${id}"] .rc`).forEach(el => {
      const pb = $('.rc-play', el); if (pb) pb.textContent = p && !p.paused ? '❚❚' : '▶';
      const tm = $('.rc-time', el); if (tm && !(REC.active && REC.active.id === id)) tm.textContent = `${REC.mmss(t)} / ${REC.mmss(dur)}`;
      const fill = $('.rc-fill', el); if (fill) fill.style.width = dur ? Math.min(100, 100 * t / dur) + '%' : '0';
      const ed = $('.rc-ed', el); if (ed) REC.hilite(el, b, p && !p.paused ? t : null);
    });
  },

  /* ---------- the margin: a time per line, a clock time every 30 s, the line playing ---------- */
  lineTops(ed, text) {
    const k = ed.offsetHeight / (ed.getBoundingClientRect().height || 1), top0 = ed.getBoundingClientRect().top, out = []; let off = 0;
    for (const ln of text.split('\n')) {
      let y = null; try { const [n, o] = ED.domPos(ed, off), rg = document.createRange(); rg.setStart(n, o); const [n2, o2] = ED.domPos(ed, Math.min(text.length, off + Math.max(1, Math.min(ln.length, 1)))); rg.setEnd(n2, o2); const R = rg.getClientRects()[0] || rg.getBoundingClientRect(); y = (R.top - top0) * k + ed.offsetTop; } catch { }
      out.push({ y, h: 0, from: off, to: off + ln.length }); off += ln.length + 1;
    }
    for (let i = 0; i < out.length; i++) { const nx = out.slice(i + 1).find(x => x.y != null); out[i].h = nx && out[i].y != null ? nx.y - out[i].y : 22; }
    return out;
  },
  margin(el, b) {
    const ed = $('.rc-ed', el), gut = $('.rc-gut', el); if (!ed || !gut || !ed.isConnected) return;
    const cur = M.block(b.id) || b, r = REC.r(cur), text = cur.body.text || '', S = r.segs || [];
    if (!S.length || !text.trim()) { gut.replaceChildren(); return; }
    const tops = REC.lineTops(ed, text); let lastBlock = -1; const kids = [];
    tops.forEach((L, i) => { if (L.y == null || i >= S.length && i > 0 && !text.split('\n')[i].trim()) return; const s = REC.segOf(cur, i); if (!s) return;
      const blk = Math.floor(s.s / 30);
      if (blk !== lastBlock) { lastBlock = blk; const ck = REC.clockAt(r, blk * 30); if (ck && i > 0) kids.push(h('div.rc-clock', { style: { top: (L.y - 3) + 'px' } }, h('span', REC.clockStr(ck)))); else if (ck) kids.push(h('div.rc-clock.first', { style: { top: (L.y - 3) + 'px' } }, h('span', REC.clockStr(ck)))); }
      kids.push(h('button.rc-lt.mono', { style: { top: L.y + 'px' }, title: 'Play from here' + (REC.clockAt(r, s.s) ? ' · ' + REC.clockStr(REC.clockAt(r, s.s)) : ''), on: { click: e => { e.stopPropagation(); REC.seek(cur, s.s); } } }, REC.mmss(s.s)));
    });
    gut.replaceChildren(...kids); el._tops = tops;
  },
  hilite(el, b, t) {
    let band = $('.rc-band', el); const tx = $('.rc-txw', el); if (!tx) return;
    if (t == null) { if (band) band.style.display = 'none'; return; }
    const S = REC.r(b).segs || []; let i = S.findIndex((s, j) => t >= s.s && (j === S.length - 1 || t < S[j + 1].s)); if (i < 0) i = 0;
    const tops = el._tops; if (!tops || !tops[i] || tops[i].y == null) return;
    if (!band) { band = h('div.rc-band'); tx.prepend(band); }
    band.style.display = 'block'; band.style.top = tops[i].y + 'px'; band.style.height = Math.max(18, tops[i].h) + 'px';
  },

  /* ---------- the component ---------- */
  statusEl(b) {
    const r = REC.r(b), P = REC.progress.get(b.id) || {}, local = typeof SYNC === 'undefined' || SYNC.local;
    const S = (cls, ...k) => h('div.rc-status' + cls, ...k);
    if (r.state === 'recording') return S('.on', h('span.rc-dot'), r.paused ? 'Paused' : 'Recording', ' · ', h('span.tiny.muted', 'Alt+M drops a bookmark'));
    if (r.state === 'saving') return S('', 'Saving the recording…');
    if (r.state === 'local') return S('.warn', 'Kept on this device (', REC.kb(r.bytes), ') — it moves to the notebook folder when the computer is reachable. ', h('button.btn.xs', { on: { click: e => { e.stopPropagation(); REC.flush().then(n => n ? null : toast('Still can’t reach the computer')); } } }, 'Try now'));
    if (r.state === 'queued') return S('', P.waiting === 'missing' ? ['Saved. The transcriber isn’t installed on the computer yet — ', local ? h('button.btn.xs', { on: { click: e => { e.stopPropagation(); STTUI.install(); } } }, 'Install it') : 'install it there: Settings → Recordings', '. This recording is transcribed once it is.'] : ['Saved · waiting for the transcriber', P.position > 1 ? ` (${P.position - 1} ahead)` : '', '…']);
    if (r.state === 'working') return S('', 'Transcribing on the computer… ', P.pct ? h('b.mono', P.pct + '%') : null, h('div.rc-pbar', h('i', { style: { width: (P.pct || 2) + '%' } })));
    if (r.state === 'error') return S('.warn', 'Transcription failed: ' + (r.error || '') + ' ', h('button.btn.xs', { on: { click: e => { e.stopPropagation(); REC.transcribe(M.block(b.id)); } } }, 'Try again'));
    return S('.none');
  },
  kb: n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB',
  body(b, d, pane, ro) {
    const r = REC.r(b), live = REC.active && REC.active.id === b.id, el = h('div.rc' + (live ? '.live' : '') + (r.paused ? '.paused' : ''));
    const btn = (lab, title, fn, cls = '') => h('button.btn.xs.rc-b' + cls, { title, disabled: ro, on: { click: e => { e.stopPropagation(); fn(e); } } }, lab);
    const dur = r.dur || 0, has = r.state !== 'new' && r.state !== 'recording';
    const bar = h('div.rc-bar.nopan',
      r.state === 'new' ? btn('● Record', 'Start recording from this device’s microphone', () => REC.start(M.block(b.id)), '.rc-rec') :
      live ? [h('span.rc-time.mono', { 'data-recclock': b.id }, REC.mmss(REC.elapsed())),
        REC.active.paused ? btn('▶ Resume', 'Go on recording (same file)', () => REC.resume()) : btn('❚❚ Pause', 'Pause — resume later into the same file', () => REC.pause()),
        btn('◆', 'Bookmark this moment (Alt+M)', () => REC.mark(b.id)), btn('■ Stop', 'Stop and save', () => REC.stop(), '.rc-stop')] :
      r.state === 'recording' ? h('span.tiny.muted', 'Recording on another device…') :
      [h('button.rc-play', { title: 'Play / pause', on: { click: e => { e.stopPropagation(); REC.toggle(M.block(b.id)); } } }, REC.player && REC.player.id === b.id && !REC.player.audio.paused ? '❚❚' : '▶'),
        h('span.rc-time.mono', `${REC.mmss(REC.player && REC.player.id === b.id ? REC.player.audio.currentTime : 0)} / ${REC.mmss(dur)}`),
        btn('◆', 'Bookmark the moment playing now', () => { if (!REC.player || REC.player.id !== b.id) return toast('Play it first, then bookmark'); REC.mark(b.id); })]);
    const prog = h('div.rc-prog', { title: has ? 'Click to play from there' : '', on: { pointerdown: e => e.stopPropagation(), click: e => { e.stopPropagation(); if (!has || !dur) return; const R = e.currentTarget.getBoundingClientRect(); REC.seek(M.block(b.id), dur * (e.clientX - R.left) / R.width); } } },
      live ? h('canvas.rc-level', { width: 400, height: 26, 'data-reclevel': b.id }) : h('i.rc-fill'),
      !live && dur ? (r.marks || []).map(m => h('b.rc-tick', { style: { left: (100 * m.t / dur) + '%' }, title: '◆ ' + REC.mmss(m.t) + (m.label ? ' · ' + m.label : '') })) : null,
      !live && dur ? (r.pauses || []).filter(p => p.len).map(p => h('b.rc-ptick', { style: { left: (100 * p.at / dur) + '%' }, title: 'paused ' + fmtDur(p.len * 1000, true) })) : null);
    const marks = (r.marks || []).length ? h('div.rc-marks', r.marks.map(m => h('span.rc-mk',
      h('button.rc-mt.mono', { title: 'Play from this bookmark' + (REC.clockAt(r, m.t) ? ' · ' + REC.clockStr(REC.clockAt(r, m.t)) : ''), on: { click: e => { e.stopPropagation(); if (!live) REC.seek(M.block(b.id), Math.max(0, m.t - 1)); } } }, '◆ ' + REC.mmss(m.t)),
      h('input.rc-ml', { 'data-k': m.id, value: m.label || '', placeholder: 'label…', readOnly: ro, size: Math.max(6, (m.label || '').length + 1), on: { pointerdown: e => e.stopPropagation(), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); }, input: e => { e.target.size = Math.max(6, e.target.value.length + 1); }, change: e => { REC.put(b.id, r => { const x = r.marks.find(k => k.id === m.id); if (x) x.label = e.target.value.trim(); }); changed(); } } }),
      ro ? null : h('button.rc-mx', { title: 'Remove this bookmark', on: { click: e => { e.stopPropagation(); REC.put(b.id, r => { r.marks = r.marks.filter(k => k.id !== m.id); }); changed(); } } }, '×')))) : null;
    const ed = h('div.ed.rc-ed', { 'data-ph': r.state === 'done' ? 'Nothing was heard in this recording — or write notes here.' : 'The transcript appears here when the computer has read the recording. You can write notes meanwhile.' });
    if (ro) { ED.render(ed, b, d); ed.contentEditable = 'false'; } else ED.attach(ed, b);
    ed.addEventListener('click', e => { if (!e.altKey || !(REC.r(M.block(b.id)).segs || []).length) return; const pos = ED.selection(ed); if (!pos) return; const text = M.block(b.id).body.text, line = text.slice(0, pos.from).split('\n').length - 1, s = REC.segOf(M.block(b.id), line); if (s) { e.preventDefault(); REC.seek(M.block(b.id), s.s); } });
    const re = debounce(() => REC.margin(el, M.block(b.id) || b), 120); ed.addEventListener('input', re);
    const txw = h('div.rc-txw', h('div.rc-gut'), ed);
    el.append(bar, prog, marks, REC.statusEl(b), txw,
      r.file ? h('div.rc-foot.tiny.muted', h('span', { title: 'In the notebook folder' }, '♪ recordings/' + r.file), r.lang ? h('span', '· ' + r.lang) : null, r.bytes ? h('span', '· ' + REC.kb(r.bytes)) : null, r.started ? h('span', '· started ' + fmtStamp(r.started)) : null) : null);
    requestAnimationFrame(() => requestAnimationFrame(() => { REC.margin(el, M.block(b.id) || b); REC.paintPlay(b.id); }));
    if (window.ResizeObserver) { const ro2 = new ResizeObserver(re); ro2.observe(ed); }
    if (['queued', 'working'].includes(r.state) && r.file) REC.watch(b.id);
    return el;
  },
  /* the live clock, the level meter and the header pill while recording */
  tick() {
    clearInterval(REC._t); REC._t = null; REC.pill();
    if (!REC.active) return;
    REC._t = setInterval(() => { const a = REC.active; if (!a) return REC.tick();
      $$(`[data-recclock="${a.id}"]`).forEach(x => x.textContent = REC.mmss(REC.elapsed())); const pt = $('#recpill .rp-t'); if (pt) pt.textContent = REC.mmss(REC.elapsed());
      if (a.an) { const buf = new Uint8Array(a.an.fftSize); a.an.getByteTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v - 128)); a.lv = (a.lv || []).concat(a.paused ? 0 : pk / 128).slice(-100);
        $$(`canvas[data-reclevel="${a.id}"]`).forEach(c => { const g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H); g.fillStyle = getComputedStyle(c).color; a.lv.forEach((v, i) => { const hh = Math.max(1.5, v * H * 1.6); g.fillRect(i * 4, (H - hh) / 2, 2.5, Math.min(H, hh)); }); }); }
    }, 100);
  },
  pill() {
    let p = $('#recpill'); const a = REC.active;
    if (!a) { p && p.remove(); return; }
    if (!p) { const anchor = $('#syncdot') || $('#themetoggle'); if (!anchor) return; p = h('button#recpill', { title: 'Recording — click to go to it', on: { click: e => App.jump(REC.active.id, e) } }, h('span.rc-dot'), h('span.rp-t.mono', REC.mmss(REC.elapsed()))); anchor.before(p); }
  },
};

/* ---------- Settings → Recordings: the transcriber ---------- */
const STTUI = {
  async status() { try { return await (await fetch('api/stt/status', { cache: 'no-store' })).json(); } catch { return { state: 'offline' }; } },
  async install() { try { await fetch('api/stt/install', { method: 'POST' }); } catch { } toast('Installing the transcriber on this computer — Settings → Recordings shows progress', 4000); App.refresh(); },
  settings() {
    const box = h('div.hw'), draw = async () => { const s = await STTUI.status(); if (!box.isConnected && STTUI._t) { clearInterval(STTUI._t); STTUI._t = null; return; }
      const local = typeof SYNC === 'undefined' || SYNC.local, lab = { missing: 'Not installed', idle: 'Installed — loads on first use', installing: 'Installing…', loading: 'Loading the model…', ready: 'Ready', error: 'Failed', offline: 'Can’t reach the computer' }[s.state] || s.state;
      box.replaceChildren(h('div.callout', h('b.h', 'Transcriber · ' + lab),
          'Recordings are transcribed on your computer by Whisper (OpenAI’s speech model, “small”, run with faster-whisper). Nothing leaves the computer. The install is one-time: about 100 MB of Python packages, then about 480 MB for the model the first time it is used.'),
        h('div.row', { style: { gap: '8px', margin: '8px 0' } }, local && (s.state === 'missing' || s.state === 'error') ? h('button.btn.sm.pri', { on: { click: () => STTUI.install() } }, s.state === 'error' ? 'Repair the transcriber' : 'Install the transcriber') : null,
          local && (s.state === 'idle' || s.state === 'ready') ? h('button.btn.xs.ghost', { title: 'Reinstall faster-whisper', on: { click: () => STTUI.install() } }, 'Repair') : null,
          !local && s.state === 'missing' ? h('span.tiny.muted', 'Install it from the computer.') : null, s.error ? h('span.tiny', { style: { color: 'var(--bad)' } }, s.error) : null,
          s.queue || s.current ? h('span.tiny.muted', `${s.current ? 'transcribing 1' + (s.pct ? ` (${s.pct}%)` : '') : ''}${s.queue ? ` · ${s.queue} waiting` : ''}`) : null),
        (s.log || []).length ? h('pre.dv-out.tiny', s.log.join('\n')) : null,
        h('p.tiny.muted', '+ Insert → Recording, then ● Record. The audio is saved as recorded (WebM on Windows/Android, M4A on the iPad, about 0.5 MB a minute) in the notebook folder’s recordings/ folder. On the iPad and phone the microphone works on the https:// address only (Settings → Devices).'));
      if ((s.state === 'installing' || s.state === 'loading' || s.current) && !STTUI._t) STTUI._t = setInterval(draw, 2500); if (!(s.state === 'installing' || s.state === 'loading' || s.current) && STTUI._t) { clearInterval(STTUI._t); STTUI._t = null; } };
    draw(); return box;
  },
};

WIDGETS.rec = { label: 'recording', w: 448, body: REC.body, menu: b => [
  b.rec && b.rec.file && b.rec.state !== 'recording' ? { label: b.rec.state === 'done' ? 'Transcribe again…' : 'Transcribe now', run: () => b.rec.state === 'done' ? pickModal('Transcribe it again?', 'The new transcript replaces the text in this component, with your corrections and marked terms.', [{ label: 'Transcribe again', danger: true, run: () => REC.transcribe(M.block(b.id), true) }, { label: 'Cancel' }]) : REC.transcribe(M.block(b.id)) } : null,
  b.rec && b.rec.path ? { label: 'Download the audio', run: () => { const a = h('a', { href: b.rec.path.split('/').map(encodeURIComponent).join('/'), download: b.rec.file }); document.body.append(a); a.click(); a.remove(); } } : null].filter(Boolean) };
INSERTS.push({ id: 'rec', group: 'Writing', icon: '●', label: 'Recording', sub: 'Record from the microphone; saved as audio in the notebook folder and transcribed on the computer', run: (d, p) => { const b = REC.create(d.id, p); setTimeout(() => REC.start(M.block(b.id)), 60); } });
SLIM.BARS.rec = '.rc-bar';
{
  // Alt+M: bookmark while recording, from anywhere in the app
  document.addEventListener('keydown', e => { if (REC.active && e.altKey && !e.ctrlKey && (e.key || '').toLowerCase() === 'm') { e.preventDefault(); REC.mark(); } }, true);
  // don't lose a recording by closing the page
  window.addEventListener('beforeunload', e => { if (REC.active) { e.preventDefault(); e.returnValue = 'A recording is running.'; } });
  // recordings kept on a device move with the other kept files
  const fl = MEDIA.flush.bind(MEDIA); MEDIA.flush = async function () { const n = await fl(); try { await REC.flush(); } catch { } return n; };
  // a recording left "recording" by a closed page (or another device) that never stopped: offer to clear it
  const wb = WIDGETS.rec.menu; WIDGETS.rec.menu = b => { const L = wb(b); if (b.rec && b.rec.state === 'recording' && !(REC.active && REC.active.id === b.id)) L.push({ label: 'This recording was interrupted — reset it', run: () => { REC.put(b, r => { r.state = 'new'; r.paused = false; }); changed(); } }); return L; };
  // on start: pick up transcripts that finished while the app was closed
  setTimeout(() => { try { DB.where('blocks', b => b.kind === 'rec' && b.status === 'live' && b.rec && b.rec.file && ['queued', 'working'].includes(b.rec.state)).forEach(b => REC.watch(b.id)); REC.flush(); } catch { } }, 4000);
}
