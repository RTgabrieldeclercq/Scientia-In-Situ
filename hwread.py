"""Handwriting → text on this computer (used by serve.py).

The model is Microsoft's TrOCR (handwritten, base), run locally with PyTorch: nothing leaves the computer.
It reads one line of handwriting at a time; the app cuts the ink into lines (it has the strokes) and sends
each line as a picture. Installing it is one button in Settings → Handwriting (≈2 GB: PyTorch, Transformers,
then the model itself, downloaded once into your user profile's Hugging Face cache).
"""
import base64, io, os, subprocess, sys, threading, time

MODEL = os.environ.get('SIS_HW_MODEL', 'microsoft/trocr-base-handwritten')
FAKE = os.environ.get('SIS_HW_FAKE')  # tests: answer without a model


class _Parts:
    """TrOCRProcessor's job done by its two parts (when the processor class itself won't import)."""
    def __init__(self, ip, tok): self.ip, self.tok = ip, tok
    def __call__(self, images=None, return_tensors='pt'): return self.ip(images=images, return_tensors=return_tensors)
    def batch_decode(self, ids, skip_special_tokens=True): return self.tok.batch_decode(ids, skip_special_tokens=skip_special_tokens)


class Reader:
    def __init__(self):
        self.state = 'unknown'; self.log = []; self.error = None; self.lock = threading.Lock(); self.run_lock = threading.Lock()
        self.processor = self.model = None; self.started = None

    def _say(self, s):
        self.log.append(time.strftime('%H:%M:%S ') + str(s).rstrip()); self.log = self.log[-60:]

    def libs(self):
        if FAKE: return True
        try:
            import importlib.util as u
            return all(u.find_spec(m) is not None for m in ('torch', 'transformers', 'PIL'))
        except Exception: return False

    def status(self):
        if self.state == 'unknown': self.state = 'idle' if self.libs() else 'missing'
        return {'ok': True, 'state': self.state, 'model': MODEL, 'error': self.error, 'log': self.log[-12:], 'python': sys.executable}

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

    PKGS = ['torch', 'torchvision', 'transformers', 'pillow', 'sentencepiece', 'protobuf']

    def _install(self):
        try:
            if FAKE: time.sleep(0.5); self._say('fake install'); return self._load()
            # always (re)install the whole set: a missing companion (torchvision, sentencepiece…) is the usual cause of
            # "Could not import module 'TrOCRProcessor'"
            code = self._pip(['install', '--upgrade'] + self.PKGS)
            if code != 0: code = self._pip(['install', '--user', '--upgrade'] + self.PKGS)
            if code != 0: raise RuntimeError('pip could not install PyTorch / Transformers (see the log)')
            import importlib; importlib.invalidate_caches()
            for m in [k for k in list(sys.modules) if k == 'transformers' or k.startswith('transformers.')]: sys.modules.pop(m, None)
            self._load()
        except Exception as e:
            self._fail(e)

    def _load(self):
        self.state = 'loading'; self._say('loading %s (downloads ≈1.3 GB the first time)…' % MODEL)
        if FAKE: self.state = 'ready'; self._say('ready (fake)'); return
        import torch
        torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
        try:
            from transformers import TrOCRProcessor
            self.processor = TrOCRProcessor.from_pretrained(MODEL)
        except Exception as e:
            # transformers hides the real reason behind "Could not import module …": find it, then try the parts directly
            self._say('TrOCRProcessor failed: %s' % str(e).splitlines()[0][:200])
            self._say('cause: ' + self._cause())
            from transformers import AutoImageProcessor, AutoTokenizer
            ip = AutoImageProcessor.from_pretrained(MODEL, use_fast=False); tok = AutoTokenizer.from_pretrained(MODEL)
            self.processor = _Parts(ip, tok); self._say('using the image processor and tokenizer directly')
        from transformers import VisionEncoderDecoderModel
        self.model = VisionEncoderDecoderModel.from_pretrained(MODEL); self.model.eval()
        self.state = 'ready'; self._say('ready')

    def _cause(self):
        import importlib, traceback
        for mod in ('transformers.models.trocr.processing_trocr', 'transformers.models.vit.image_processing_vit', 'transformers.models.roberta.tokenization_roberta', 'torchvision', 'PIL.Image'):
            try: importlib.import_module(mod)
            except Exception as e:
                return '%s → %s: %s' % (mod, type(e).__name__, str(e).splitlines()[0][:220] if str(e) else traceback.format_exc(limit=1)[-220:])
        return 'no import error found (versions: %s)' % self._versions()

    def _versions(self):
        out = []
        for m in ('torch', 'transformers', 'torchvision', 'tokenizers', 'sentencepiece'):
            try:
                import importlib.metadata as md; out.append('%s %s' % (m, md.version(m)))
            except Exception: out.append('%s missing' % m)
        return ', '.join(out)

    def ensure(self):
        """Load in the background if the libraries are there; True when ready."""
        st = self.status()['state']
        if st == 'ready': return True
        if st in ('idle',) :
            with self.lock:
                if self.state == 'idle': self.state = 'loading'; threading.Thread(target=self._load_safe, daemon=True).start()
        return False

    def _load_safe(self):
        try: self._load()
        except Exception as e: self._fail(e)

    def _fail(self, e):
        self.state = 'error'; first = str(e).splitlines()[0] if str(e) else type(e).__name__
        try: cause = self._cause()
        except Exception: cause = ''
        self.error = first + (' — ' + cause if cause else '') + ' · press "Repair the handwriting reader" to reinstall its parts'
        self._say('error: %s' % first); cause and self._say('cause: ' + cause); self._say('versions: ' + self._versions())

    def read(self, lines):
        """lines: data URLs (PNG) of single handwritten lines → list of strings."""
        if FAKE: return [('line %d' % (i + 1)) if FAKE == '1' else FAKE for i, _ in enumerate(lines)]
        from PIL import Image
        import torch
        imgs = []
        for u in lines:
            raw = base64.b64decode(str(u).split(',', 1)[-1])
            imgs.append(Image.open(io.BytesIO(raw)).convert('RGB'))
        with self.run_lock, torch.no_grad():
            px = self.processor(images=imgs, return_tensors='pt').pixel_values
            ids = self.model.generate(px, max_new_tokens=96, num_beams=3)
            return [t.strip() for t in self.processor.batch_decode(ids, skip_special_tokens=True)]
