/* ================================================================
   stt-device-worker.js — V3.887 — the free way: Whisper in this browser
   ================================================================
   A module worker, so the page keeps going while it runs. rm/js/speech-
   to-text.js sends { type: 'load' } once, then { type: 'run', pcm } with
   up to five minutes of 16 kHz mono samples at a time; the answer is the
   lines with their times inside that piece. transformers.js keeps the
   downloaded model in the browser's cache, so the ~80 MB come once.
   ================================================================ */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';

env.allowLocalModels = false;
let asr = null, loading = null;

function load(model) {
  if (asr) return Promise.resolve(asr);
  if (!loading) loading = pipeline('automatic-speech-recognition', model, {
    dtype: 'q8', device: 'wasm',
    progress_callback: (p) => { if (p && p.status === 'progress' && p.file) self.postMessage({ type: 'download', file: p.file, loaded: p.loaded || 0, total: p.total || 0 }); }
  }).then((x) => { asr = x; return x; }, (e) => { loading = null; throw e; });
  return loading;
}

self.onmessage = async (e) => {
  const m = e.data || {};
  try {
    const run = await load(m.model);
    if (m.type === 'load') { self.postMessage({ type: 'ready', id: m.id }); return; }
    const out = await run(m.pcm, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
    const chunks = (out && out.chunks ? out.chunks : []).map((c) => ({ s: c.timestamp ? c.timestamp[0] : null, e: c.timestamp ? c.timestamp[1] : null, text: c.text }));
    self.postMessage({ type: 'done', id: m.id, chunks, text: out && out.text });
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, error: String((err && err.message) || err) });
  }
};
