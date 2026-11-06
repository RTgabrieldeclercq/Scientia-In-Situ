"""Speech → text for recordings, on this computer (used by serve.py).

The model is OpenAI's Whisper ("small", multilingual) run with faster-whisper (CTranslate2) on the CPU: nothing
leaves the computer. faster-whisper reads WebM/Opus and M4A itself (it brings its own FFmpeg libraries through PyAV),
so the recordings are transcribed exactly as they were saved. The install is one button in Settings → Recordings
(≈100 MB of Python packages, then ≈480 MB for the model, downloaded once into the Hugging Face cache).

Each recording gets a sidecar <file>.json beside it holding the job's state and, when done, the segments
(start/end seconds and text). Jobs run one at a time in a background thread; queued jobs survive a restart.
"""
import json, os, subprocess, sys, threading, time

MODEL = os.environ.get('SIS_STT_MODEL', 'small')
FAKE = os.environ.get('SIS_STT_FAKE')  # tests: answer without a model
PKGS = ['faster-whisper', 'av']


def decode(path, rate=16000):
    """The recording as 16 kHz mono float32 samples. Decoded here with PyAV: faster-whisper's own reader passes
    arguments that some PyAV versions no longer accept ("open() got an unexpected keyword argument 'metadata_errors'")."""
    import av, numpy as np
    out = []
    with av.open(path, mode='r') as c:
        st = next(s for s in c.streams if s.type == 'audio')
        rs = av.AudioResampler(format='s16', layout='mono', rate=rate)
        def take(fr):
            r = rs.resample(fr)
            for f in (r if isinstance(r, list) else [r] if r is not None else []): out.append(f.to_ndarray().reshape(-1))
        for fr in c.decode(st): take(fr)
        try: take(None)  # flush
        except Exception: pass
    if not out: return np.zeros(0, dtype=np.float32)
    return np.concatenate(out).astype(np.float32) / 32768.0


def _atomic(path, data):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(data, f)
    os.replace(tmp, path)


class Transcriber:
    def __init__(self, folder_fn):
        self.folder = folder_fn  # → the recordings folder (it can change when the notebook folder does)
        self.state = 'unknown'; self.error = None; self.log = []; self.lock = threading.Lock()
        self.model = None; self.queue = []; self.cv = threading.Condition(); self.current = None; self.pct = 0
        threading.Thread(target=self._worker, daemon=True).start()
        threading.Timer(2.0, self._requeue).start()

    # ---------- install / status (same shape as the handwriting reader) ----------
    def _say(self, s): self.log.append(time.strftime('%H:%M:%S ') + str(s).rstrip()); self.log = self.log[-60:]

    def libs(self):
        if FAKE: return True
        try:
            import importlib.util as u
            return u.find_spec('faster_whisper') is not None
        except Exception: return False

    def status(self):
        if self.state == 'unknown': self.state = 'idle' if self.libs() else 'missing'
        return {'ok': True, 'state': self.state, 'model': MODEL, 'error': self.error, 'log': self.log[-12:], 'queue': len(self.queue),
                'current': self.current, 'pct': self.pct}

    def install(self):
        with self.lock:
            if self.state in ('installing', 'loading'): return self.status()
            self.state = 'installing'; self.error = None; self.log = []
        threading.Thread(target=self._install, daemon=True).start()
        return self.status()

    def _pip(self, args):
        self._say('pip ' + ' '.join(args))
        p = subprocess.Popen([sys.executable, '-m', 'pip'] + args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                             creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        for line in p.stdout:
            line = line.strip()
            if line and (line.startswith(('Collecting', 'Downloading', 'Installing', 'Successfully', 'ERROR', 'Requirement already')) or 'error' in line.lower()): self._say(line[:160])
        return p.wait()

    def _install(self):
        try:
            if FAKE: time.sleep(0.3); self._say('fake install'); self.state = 'idle'; return self._load()
            code = self._pip(['install', '--upgrade'] + PKGS)
            if code != 0: code = self._pip(['install', '--user', '--upgrade'] + PKGS)
            if code != 0: raise RuntimeError('pip could not install faster-whisper (see the log)')
            import importlib; importlib.invalidate_caches()
            self.state = 'idle'; self._load()
        except Exception as e: self._fail(e)

    def _load(self):
        if self.model is not None or FAKE: self.state = 'ready'; return
        self.state = 'loading'; self._say('loading Whisper %s (downloads ≈480 MB the first time)…' % MODEL)
        from faster_whisper import WhisperModel
        self.model = WhisperModel(MODEL, device='cpu', compute_type='int8', cpu_threads=max(1, (os.cpu_count() or 2) - 1))
        self.state = 'ready'; self._say('ready')

    def _fail(self, e):
        self.state = 'error'; self.error = (str(e).splitlines() or [type(e).__name__])[0] + ' · press "Repair the transcriber" to reinstall it'
        self._say('error: %s' % e)

    # ---------- jobs ----------
    def side(self, name): return os.path.join(self.folder(), name + '.json')

    def job(self, name):
        try:
            with open(self.side(name), encoding='utf-8') as f: return json.load(f)
        except Exception: return None

    def add(self, name, lang=None, again=False):
        if not os.path.isfile(os.path.join(self.folder(), name)): return {'ok': False, 'error': 'no such recording'}
        j = self.job(name)
        if j and j.get('state') == 'done' and not again: return dict(j, ok=True)
        j = {'state': 'queued', 'file': name, 'lang': lang, 'queued': time.strftime('%Y-%m-%dT%H:%M:%S')}
        _atomic(self.side(name), j)
        with self.cv:
            if name not in self.queue and name != self.current: self.queue.append(name)
            self.cv.notify()
        return dict(j, ok=True)

    def get(self, name):
        j = self.job(name)
        if not j: return {'ok': False, 'state': 'none'}
        if name == self.current: j = dict(j, pct=self.pct)
        if j.get('state') == 'queued' and self.status()['state'] == 'missing': j = dict(j, waiting='missing')
        return dict(j, ok=True, position=(self.queue.index(name) + 1) if name in self.queue else 0)

    def _requeue(self):
        try:
            d = self.folder()
            if not d or not os.path.isdir(d): return
            for f in sorted(os.listdir(d)):
                if f.endswith('.json'):
                    j = self.job(f[:-5])
                    if j and j.get('state') in ('queued', 'working'): self.add(f[:-5], j.get('lang'))
        except Exception: pass

    def _worker(self):
        while True:
            with self.cv:
                while not self.queue: self.cv.wait()
                name = self.queue[0]
            if not self.libs():  # wait for the install; the job stays queued
                if self.state == 'unknown': self.status()
                time.sleep(3); continue
            with self.cv: self.queue.pop(0); self.current = name; self.pct = 0
            try:
                self._run(name)
            except Exception as e:
                j = self.job(name) or {}; j.update(state='error', error=str(e)[:400]); _atomic(self.side(name), j); self._say('error on %s: %s' % (name, e))
            finally:
                self.current = None; self.pct = 0

    def _run(self, name):
        path = os.path.join(self.folder(), name); j = self.job(name) or {'file': name}
        j.update(state='working', started=time.strftime('%Y-%m-%dT%H:%M:%S')); _atomic(self.side(name), j)
        if FAKE:
            time.sleep(0.4); n = 3
            segs = [{'s': i * 4.0, 'e': i * 4.0 + 3.5, 'text': ('Spoken sentence %d.' % (i + 1)) if FAKE == '1' else FAKE} for i in range(n)]
            lang = 'en'
        else:
            if self.model is None:
                try:
                    with self.lock: self._load()
                except Exception as e:
                    self._fail(e); raise RuntimeError('the Whisper model could not be loaded (%s) — Settings → Recordings' % (str(e).splitlines() or [type(e).__name__])[0])
            self._say('transcribing ' + name)
            it, info = self.model.transcribe(decode(path), language=j.get('lang') or None, vad_filter=True, beam_size=5)
            segs = []; total = max(1.0, float(info.duration or 1))
            for s in it:
                t = (s.text or '').strip()
                if t: segs.append({'s': round(s.start, 2), 'e': round(s.end, 2), 'text': t})
                self.pct = min(99, int(100 * s.end / total))
            lang = info.language
        j.update(state='done', segs=segs, lang=lang, done=time.strftime('%Y-%m-%dT%H:%M:%S'), model=MODEL); _atomic(self.side(name), j)
        self._say('done %s (%d segments)' % (name, len(segs)))
