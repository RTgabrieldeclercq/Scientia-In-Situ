/* ================================================================
   speech-to-text.js — V3.887 — a recording into words, each person's own way
   ================================================================
   Plan: CodeLog/ClaudesPlan/V3.887_speech_to_text_your_own_way.md. Alex,
   2026-10-23: "also add the option for whisper. either one will require
   that the user add a key for its use. the use should not come from the
   firebase. it should come from the user. we should also add a free
   version. the one that is actually used is changed in the settings page.
   and the user needs to setup the system for themselves"

   Three ways, chosen per person in Settings → Speech to text:
     device   free: Whisper (base.en) running in this browser, in a worker
              (transformers.js; the model is downloaded once, ~80 MB, and
              kept by the browser). Nothing leaves the device.
     openai   OpenAI Whisper (whisper-1) with the person's own key, billed
              to their OpenAI account.
     google   Google Speech-to-Text (V1) with the person's own API key,
              billed to their own Google Cloud project.
   A key lives in THIS browser only, under the person's sign-in (local
   storage `rm:stt:<uid>`), and is sent only to its provider, straight from
   the browser: never to the lab's Firebase, functions or Storage. The lab
   never pays for a transcript. Nothing runs on its own: a recording shows
   Transcribe with the likely cost first (RECORDER_CORE.sttCost).

   STT.settings() · save(patch) · ready() → { ok, provider, why }
   STT.estimate(sec[, provider]) → { text, usd, minutes }
   STT.transcribe(blob, { ext, onProgress(text, frac), signal }) →
       { segs: [{ s, e, text }], lang, provider, model }
   STT.check(provider[, key]) → { ok, text }   STT.mountSettings(el)
   ================================================================ */
(function () {
  'use strict';
  var DEVICE_MODEL = 'onnx-community/whisper-base.en';
  var WORKER_URL = '/rm/js/stt-device-worker.js?v=3887';
  var PROVIDERS = {
    device: { id: 'device', name: 'On this device', who: 'free, on this device', key: false },
    openai: { id: 'openai', name: 'OpenAI Whisper', who: 'your OpenAI account', key: true, keyHint: 'sk-…', maxBytes: 24 * 1024 * 1024 },
    google: { id: 'google', name: 'Google Speech-to-Text', who: 'your Google Cloud project', key: true, keyHint: 'AIza…' }
  };
  var ORDER = ['device', 'openai', 'google'];

  function core() { return window.RECORDER_CORE || null; }
  function r2(v) { return Math.round(v * 100) / 100; }
  /** The signed-in person (the RM page or the Scientia frame both run Firebase auth). */
  function uid() {
    try { var u = window.firebase && firebase.auth && firebase.auth().currentUser; if (u) return u.uid; } catch (e) {}
    try { var fb = typeof firebridge !== 'undefined' ? firebridge : null, g = fb && fb.getUser && fb.getUser(); if (g) return g.uid; } catch (e) {}
    return 'anon';
  }
  function lsKey() { return 'rm:stt:' + uid(); }

  /* ---- settings: this person's choice, on this device ---- */
  function settings() {
    var s = {}; try { s = JSON.parse(localStorage.getItem(lsKey()) || '{}') || {}; } catch (e) {}
    return { provider: PROVIDERS[s.provider] ? s.provider : '', keys: Object.assign({}, s.keys || {}), deviceReady: !!s.deviceReady };
  }
  function save(patch) {
    var s = settings(); patch = patch || {};
    if (patch.keys) { patch.keys = Object.assign({}, s.keys, patch.keys); Object.keys(patch.keys).forEach(function (k) { if (!patch.keys[k]) delete patch.keys[k]; }); }
    var n = Object.assign(s, patch);
    try { localStorage.setItem(lsKey(), JSON.stringify(n)); } catch (e) {}
    return n;
  }
  /** Can a recording be transcribed now, and with what? why: 'none' (nothing chosen) · 'key' (no key yet). */
  function ready() {
    var s = settings(), p = PROVIDERS[s.provider];
    if (!p) return { ok: false, why: 'none' };
    if (p.key && !s.keys[p.id]) return { ok: false, provider: p.id, why: 'key' };
    return { ok: true, provider: p.id };
  }
  function estimate(sec, provider) {
    var C = core(), p = provider || settings().provider;
    return C ? C.sttCost(sec, p) : { text: p === 'device' ? 'free' : '…', usd: null, minutes: Math.ceil((sec || 0) / 60) };
  }

  /* ---- audio: any recording → 16 kHz mono samples (the browser decodes and resamples) ---- */
  async function decode16k(blob) {
    var ab = await blob.arrayBuffer();
    var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var ctx = new Ctx(1, 16000, 16000);
    var buf = await new Promise(function (res, rej) { var p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    var n = buf.length, ch = buf.numberOfChannels, out = new Float32Array(n);
    for (var c = 0; c < ch; c++) { var d = buf.getChannelData(c); for (var i = 0; i < n; i++) out[i] += d[i] / ch; }
    return out;
  }
  function slices(pcm, sec) { var step = sec * 16000, out = []; for (var i = 0; i < pcm.length; i += step) out.push({ at: i / 16000, pcm: pcm.subarray(i, Math.min(pcm.length, i + step)) }); return out; }
  function int16(pcm) { var o = new Int16Array(pcm.length); for (var i = 0; i < pcm.length; i++) { var v = Math.max(-1, Math.min(1, pcm[i])); o[i] = v < 0 ? v * 0x8000 : v * 0x7fff; } return o; }
  function wav(pcm) {
    var d = int16(pcm), b = new ArrayBuffer(44 + d.length * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, d.length * 2, true);
    new Int16Array(b, 44).set(d); return new Blob([b], { type: 'audio/wav' });
  }
  function b64(int16s) { var u = new Uint8Array(int16s.buffer, int16s.byteOffset, int16s.byteLength), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function extOf(blob, ext) {
    var t = (blob && blob.type) || '';
    if (/wav/.test(t)) return 'wav'; if (/mp4|m4a|aac/.test(t)) return 'm4a'; if (/ogg/.test(t)) return 'ogg'; if (/mpeg|mp3/.test(t)) return 'mp3'; if (/webm/.test(t)) return 'webm';
    return String(ext || 'webm').replace(/[^a-z0-9]/gi, '') || 'webm';
  }
  /** Lines a person reads: a sentence a line (Gabe's transcript is one sentence per line). */
  function sentences(words, at) {
    var out = [], cur = null;
    words.forEach(function (w) {
      if (!cur) cur = { s: r2(at + w.s), e: r2(at + w.e), text: '' };
      cur.text += (cur.text ? ' ' : '') + w.text; cur.e = r2(at + w.e);
      if (/[.?!]["”']?$/.test(w.text) && cur.text.length > 12) { out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function progress(o, text, frac) { try { if (o && o.onProgress) o.onProgress(text, frac); } catch (e) {} }
  function fail(text, status) { var e = new Error(text); e.status = status; return e; }

  /* ---- OpenAI Whisper (the person's key) ---- */
  function openaiError(status, j) {
    var m = (j && j.error && (j.error.message || j.error.code)) || '';
    if (status === 401) return fail('OpenAI didn’t accept your key. Check it in Settings → Speech to text.', status);
    if (status === 429 && /quota|billing|credit/i.test(m)) return fail('Your OpenAI account has no credit left. Add some at platform.openai.com → Billing.', status);
    if (status === 429) return fail('OpenAI is busy (too many requests). Try again in a minute.', status);
    return fail('OpenAI couldn’t transcribe it' + (m ? ': ' + m : ' (' + status + ')'), status);
  }
  async function openai(blob, key, o) {
    var parts;
    if (blob.size <= PROVIDERS.openai.maxBytes) parts = [{ at: 0, blob: blob, name: 'recording.' + extOf(blob, o.ext) }];
    else { progress(o, 'Preparing the audio…', 0); parts = slices(await decode16k(blob), 600).map(function (x) { return { at: x.at, blob: wav(x.pcm), name: 'recording.wav' }; }); }
    var segs = [], lang = null;
    for (var i = 0; i < parts.length; i++) {
      progress(o, parts.length > 1 ? 'Transcribing with OpenAI… part ' + (i + 1) + ' of ' + parts.length : 'Transcribing with OpenAI…', i / parts.length);
      var fd = new FormData();
      fd.append('file', parts[i].blob, parts[i].name); fd.append('model', 'whisper-1');
      fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'segment');
      var r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd, signal: o.signal });
      var j = await r.json().catch(function () { return null; });
      if (!r.ok || !j) throw openaiError(r.status, j);
      lang = lang || j.language || null;
      var at = parts[i].at;
      if ((j.segments || []).length) j.segments.forEach(function (s) { segs.push({ s: r2(at + s.start), e: r2(at + s.end), text: String(s.text || '').trim() }); });
      else if (j.text) segs.push({ s: r2(at), e: r2(at + (j.duration || 0)), text: String(j.text).trim() });
    }
    return { segs: segs, lang: lang, model: 'whisper-1' };
  }

  /* ---- Google Speech-to-Text V1 (the person's key): 55-second pieces, four at a time ---- */
  function googleError(status, j) {
    var m = (j && j.error && j.error.message) || '';
    if (/API key not valid|API_KEY_INVALID/i.test(m)) return fail('Google didn’t accept your key. Check it in Settings → Speech to text.', status);
    if (/has not been used|is disabled|SERVICE_DISABLED/i.test(m)) return fail('Turn on the Cloud Speech-to-Text API in your Google Cloud project (step 3 in Settings → Speech to text).', status);
    if (/billing/i.test(m)) return fail('Your Google Cloud project needs billing turned on (step 2 in Settings → Speech to text).', status);
    if (/referer|referrer|blocked/i.test(m)) return fail('Your Google key is restricted to other websites. Add https://mcgheelab.com/* to it (step 5).', status);
    return fail('Google couldn’t transcribe it' + (m ? ': ' + m : ' (' + status + ')'), status);
  }
  function secs(v) { return v == null ? null : parseFloat(String(v)) || 0; }
  async function googleOne(pcm, key, signal) {
    var body = { config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US', enableAutomaticPunctuation: true, enableWordTimeOffsets: true, model: 'latest_long' }, audio: { content: b64(int16(pcm)) } };
    var r = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: signal });
    var j = await r.json().catch(function () { return null; });
    if (!r.ok || !j) throw googleError(r.status, j);
    return j;
  }
  async function google(blob, key, o) {
    progress(o, 'Preparing the audio…', 0);
    var parts = slices(await decode16k(blob), 55), segs = [], done = 0, next = 0;
    async function lane() {
      while (next < parts.length) {
        var x = parts[next++], j = await googleOne(x.pcm, key, o.signal);
        (j.results || []).forEach(function (res) {
          var alt = (res.alternatives || [])[0]; if (!alt || !alt.transcript) return;
          var words = (alt.words || []).map(function (w) { return { s: secs(w.startTime), e: secs(w.endTime), text: w.word }; });
          if (words.length) segs = segs.concat(sentences(words, x.at));
          else segs.push({ s: r2(x.at), e: r2(x.at + (secs(res.resultEndTime) || 0)), text: alt.transcript.trim() });
        });
        done++; progress(o, 'Transcribing with Google… ' + done + ' of ' + parts.length, done / parts.length);
      }
    }
    await Promise.all([lane(), lane(), lane(), lane()]);
    segs.sort(function (a, b) { return a.s - b.s; });
    return { segs: segs, lang: 'en', model: 'latest_long' };
  }

  /* ---- Whisper on this device (free): a worker, five minutes of audio at a time ---- */
  var W = { worker: null, seq: 0, wait: {}, onDownload: null };
  function worker() {
    if (W.worker) return W.worker;
    W.worker = new Worker(WORKER_URL, { type: 'module' });
    W.worker.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === 'download') { if (W.onDownload) W.onDownload(m); return; }
      var p = W.wait[m.id]; if (!p) return; delete W.wait[m.id];
      if (m.type === 'error') p.rej(fail('Whisper on this device stopped: ' + m.error)); else p.res(m);
    };
    W.worker.onerror = function (e) { Object.keys(W.wait).forEach(function (k) { W.wait[k].rej(fail('Whisper on this device couldn’t start' + (e && e.message ? ': ' + e.message : ''))); delete W.wait[k]; }); W.worker = null; };
    return W.worker;
  }
  function ask(msg, transfer) { return new Promise(function (res, rej) { var id = ++W.seq; W.wait[id] = { res: res, rej: rej }; worker().postMessage(Object.assign({ id: id, model: DEVICE_MODEL }, msg), transfer || []); }); }
  function downloads(o) {
    var files = {};
    W.onDownload = function (m) {
      files[m.file] = m; var got = 0, all = 0; Object.keys(files).forEach(function (k) { got += files[k].loaded || 0; all += files[k].total || 0; });
      if (all) progress(o, 'Downloading Whisper to this device (once): ' + Math.round(got / 1048576) + ' of ' + Math.round(all / 1048576) + ' MB', got / all * 0.2);
    };
  }
  async function device(blob, o) {
    downloads(o); progress(o, 'Starting Whisper on this device…', 0);
    await ask({ type: 'load' }); save({ deviceReady: true });
    progress(o, 'Preparing the audio…', 0.2);
    var parts = slices(await decode16k(blob), 300), segs = [];
    for (var i = 0; i < parts.length; i++) {
      if (o.signal && o.signal.aborted) throw fail('Stopped.');
      progress(o, 'Transcribing on this device… ' + (i + 1) + ' of ' + parts.length + ' (keep this tab open)', 0.2 + 0.8 * i / parts.length);
      var pcm = parts[i].pcm.slice(), at = parts[i].at, len = pcm.length / 16000;
      var m = await ask({ type: 'run', pcm: pcm }, [pcm.buffer]);
      (m.chunks || []).forEach(function (c) { var t = String(c.text || '').trim(); if (t) segs.push({ s: r2(at + (c.s || 0)), e: r2(at + (c.e == null ? len : c.e)), text: t }); });
    }
    return { segs: segs, lang: 'en', model: DEVICE_MODEL };
  }

  /** Turn a recording into lines with times, the person's own way. */
  async function transcribe(blob, o) {
    o = o || {};
    var st = ready(); if (!st.ok) throw fail(st.why === 'key' ? 'Add your key in Settings → Speech to text first.' : 'Choose how to transcribe in Settings → Speech to text first.');
    if (!blob || !blob.size) throw fail('This recording has no audio to transcribe.');
    var key = settings().keys[st.provider], out;
    if (st.provider === 'openai') out = await openai(blob, key, o);
    else if (st.provider === 'google') out = await google(blob, key, o);
    else out = await device(blob, o);
    out.segs = out.segs.filter(function (s) { return s.text; });
    out.provider = st.provider;
    progress(o, 'Done', 1);
    return out;
  }

  /** Is the key good (and the service on)? Costs nothing: OpenAI lists models; Google hears a quarter second of silence. */
  async function check(provider, key) {
    key = key || settings().keys[provider];
    try {
      if (provider === 'device') { await ask({ type: 'load' }); save({ deviceReady: true }); return { ok: true, text: 'Whisper is ready on this device.' }; }
      if (!key) return { ok: false, text: 'Paste your key first.' };
      if (provider === 'openai') {
        var r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + key } });
        if (r.ok) return { ok: true, text: 'OpenAI accepted your key.' };
        throw openaiError(r.status, await r.json().catch(function () { return null; }));
      }
      if (provider === 'google') { await googleOne(new Float32Array(4000), key); return { ok: true, text: 'Google accepted your key, and Speech-to-Text is on.' }; }
    } catch (e) { return { ok: false, text: (e && e.message) || String(e) }; }
    return { ok: false, text: 'Unknown choice.' };
  }

  /* ---- Settings → Speech to text ---- */
  var GUIDE = {
    openai: [
      'Sign in at <a href="https://platform.openai.com" target="_blank" rel="noopener">platform.openai.com</a> with your own account (the API is billed separately from ChatGPT).',
      'Settings → Billing: add a payment method and a little credit. $5 covers about 14 hours of recordings.',
      'API keys → Create new secret key. Name it “Lab notebook” and copy it (it starts with sk-).',
      'Paste it below and press <b>Check the key</b>.',
      'Optional: Settings → Limits sets a monthly budget so it can never run away.'
    ],
    google: [
      'Open <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a> with your own Google account (not the lab’s) and create a project, for example “my-transcripts”.',
      'Billing: link a billing account to the project. The first 60 minutes each month are free.',
      'APIs &amp; Services → Library → <b>Cloud Speech-to-Text API</b> → Enable.',
      'APIs &amp; Services → Credentials → Create credentials → <b>API key</b>.',
      'Edit the key. API restrictions: <b>Restrict key</b> → Cloud Speech-to-Text API. Website restrictions: add <code>https://mcgheelab.com/*</code> (leave this one off if you also use the phone app).',
      'Paste the key below and press <b>Check the key</b>.'
    ]
  };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function rateLine(p) {
    if (p === 'device') return 'Free. Whisper runs in this browser and nothing leaves your device. It downloads once (about 80 MB) and is slower than the others; best on a laptop or desktop.';
    var C = core(), m = C ? C.sttCost(60, p) : null, hr = C ? C.sttCost(3600, p) : null;
    return 'About ' + (m ? (m.usd * 100).toFixed(1) + '¢ a minute (' + hr.text + ' an hour)' : '…') + ', billed to ' + PROVIDERS[p].who + (p === 'google' ? '; the first 60 minutes each month are free' : '') + '.';
  }
  function mountSettings(el) {
    if (!el) return;
    function paint(note) {
      var s = settings(), st = ready();
      el.innerHTML = '<div class="settings-card stt-card">' +
        '<h3 class="settings-h3">Speech to text</h3>' +
        '<p class="stt-lede">A recording becomes words only when you press <b>Transcribe</b> on it, and that button says what it will likely cost first. Choose how yours are transcribed. The lab doesn’t pay for this and never sees your key.</p>' +
        ORDER.map(function (p) {
          var P = PROVIDERS[p], on = s.provider === p, key = s.keys[p] || '';
          return '<div class="stt-opt' + (on ? ' on' : '') + '" data-stt-opt="' + p + '">' +
            '<label class="stt-pick"><input type="radio" name="stt-provider" value="' + p + '"' + (on ? ' checked' : '') + '> <b>' + esc(P.name) + '</b>' + (p === 'device' ? ' <span class="chip chip-green">free</span>' : ' <span class="stt-who">your own key</span>') + '</label>' +
            '<div class="stt-rate">' + esc(rateLine(p)) + '</div>' +
            (on ? (P.key
              ? '<div class="stt-keyrow"><input type="password" class="stt-key" data-stt-key="' + p + '" autocomplete="off" spellcheck="false" placeholder="' + esc(P.keyHint) + '" value="' + esc(key) + '" aria-label="' + esc(P.name) + ' key">' +
                '<button type="button" class="btn btn-sm" data-stt-show>' + 'Show' + '</button><button type="button" class="btn btn-sm btn-primary" data-stt-check="' + p + '">Check the key</button>' + (key ? '<button type="button" class="btn btn-sm" data-stt-forget="' + p + '">Forget it</button>' : '') + '</div>' +
                '<details class="stt-guide"' + (key ? '' : ' open') + '><summary>How to get your key</summary><ol>' + GUIDE[p].map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ol></details>'
              : '<div class="stt-keyrow"><button type="button" class="btn btn-sm btn-primary" data-stt-check="device">' + (s.deviceReady ? 'Check it works here' : 'Download it to this device now') + '</button></div>') : '') +
          '</div>';
        }).join('') +
        '<div class="stt-opt' + (!s.provider ? ' on' : '') + '"><label class="stt-pick"><input type="radio" name="stt-provider" value=""' + (!s.provider ? ' checked' : '') + '> <b>Off</b> <span class="stt-who">no Transcribe button</span></label></div>' +
        '<div class="stt-note" data-stt-note>' + (note ? note : st.ok ? 'Ready: recordings show <b>Transcribe</b> with ' + esc(PROVIDERS[st.provider].name) + '.' : st.why === 'key' ? 'Add your key to use ' + esc(PROVIDERS[st.provider].name) + '.' : '') + '</div>' +
        '<p class="stt-fine">Your key is kept in this browser on this device, for your sign-in only, and goes only to OpenAI or Google, straight from your browser, when you press Transcribe. On another computer, browser or the phone app, set it up there too. Prices checked October 2026; your provider’s bill is the final word.</p>' +
      '</div>';
    }
    function note(html, ok) { var n = el.querySelector('[data-stt-note]'); if (n) { n.innerHTML = html; n.className = 'stt-note' + (ok === true ? ' ok' : ok === false ? ' bad' : ''); } }
    el.addEventListener('change', function (e) {
      if (e.target.name === 'stt-provider') { save({ provider: e.target.value }); paint(); }
      else if (e.target.matches && e.target.matches('[data-stt-key]')) { var k = {}; k[e.target.dataset.sttKey] = e.target.value.trim(); save({ keys: k }); }
    });
    el.addEventListener('click', async function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-stt-show')) { var f = el.querySelector('[data-stt-key]'); if (f) { f.type = f.type === 'password' ? 'text' : 'password'; b.textContent = f.type === 'password' ? 'Show' : 'Hide'; } return; }
      if (b.dataset.sttForget) { var k = {}; k[b.dataset.sttForget] = ''; save({ keys: k }); paint('Your key is gone from this device.'); return; }
      if (b.dataset.sttCheck) {
        var p = b.dataset.sttCheck, kf = el.querySelector('[data-stt-key="' + p + '"]');
        if (kf) { var kk = {}; kk[p] = kf.value.trim(); save({ keys: kk }); }
        b.disabled = true; note(p === 'device' ? 'Getting Whisper ready on this device…' : 'Checking…');
        if (p === 'device') downloads({ onProgress: function (t) { note(esc(t)); } });
        var r = await check(p);
        b.disabled = false; paint(); note(esc(r.text), r.ok);
      }
    });
    paint();
  }

  window.STT = { PROVIDERS: PROVIDERS, DEVICE_MODEL: DEVICE_MODEL, settings: settings, save: save, ready: ready, estimate: estimate,
    transcribe: transcribe, check: check, mountSettings: mountSettings, decode16k: decode16k, sentences: sentences, uid: uid };
})();
