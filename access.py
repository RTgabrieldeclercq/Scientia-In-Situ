"""The notebook's lock (used by serve.py). This repository's own: the lab's scientia/ has no such thing.

A locked notebook opens only for the people in its access list, each with their own ID and password, and what it holds is
encrypted on disk, so a copy of the folder, or of the app, is of no use on another computer without one of the passwords:
  .scientia/    the record, its daily and kept copies, the changes since (ops.jsonl), conflicts, the sync state
  images/       images, PDFs, videos, slides and pages you add
  recordings/   recordings and their transcripts
are AES-256-GCM under one notebook key. .scientia/access.json keeps that key once for each person, wrapped with a key made
from their password (scrypt), and once more under a recovery key, shown once when the lock is made. serve.py holds the
notebook key in memory from the first sign-in after it starts until it stops or someone presses Lock now; before that
nothing in the folder can be read, not even by serve.py.

The Markdown copy for Obsidian is plain text, so a locked notebook has none. Other files kept in the folder (macros/, your
own) are left as they are. Signed-in browsers are in sessions.json next to the app's config (tokens hashed).
"""
import base64, contextlib, hashlib, io, json, os, re, secrets, shutil, struct, subprocess, sys, tempfile, threading, time, unicodedata

MAGIC = b'SiSLock1'                         # a sealed file: MAGIC, an 8-byte nonce prefix, then chunks
CHUNK = 1 << 20                             # each chunk 1 MiB of the file, AES-GCM with its own tag
TAG = 16
KDF = {'alg': 'scrypt', 'n': 1 << 17, 'r': 8, 'p': 1}   # ≈0.35 s and 128 MB per try
SEALED = ('.scientia', 'images', 'recordings')
SESSION_DAYS = 14
FREE = {'/sw.js', '/manifest.webmanifest', '/icon.svg'}             # nothing of the notebook: served to anyone
LOCAL_FREE = {'/api/pen-button', '/api/edge-push'}                  # the pen's button helper and the edge pan (this computer)
ICONS = re.compile(r'/icons/icon-[a-z0-9-]+\.png')
CODE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'   # the recovery key's letters (no I, L, O, U)


class Locked(Exception):
    """A write into a locked notebook while nobody has opened it: refused, so nothing plain is ever written there."""


def b64e(b): return base64.b64encode(b).decode('ascii')
def b64d(s): return base64.b64decode(s)
def now(): return time.strftime('%Y-%m-%dT%H:%M:%S')
def norm_id(s): return unicodedata.normalize('NFC', str(s or '')).strip().lower()
def norm_pw(s): return unicodedata.normalize('NFC', str(s or ''))
def norm_code(s): return re.sub(r'[^0-9A-Z]', '', str(s or '').upper().replace('O', '0').replace('I', '1').replace('L', '1'))


def has_crypto():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # noqa: F401
        return True
    except Exception: return False


def aes(key):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    return AESGCM(key)


def kek(secret, kdf):
    return hashlib.scrypt(secret.encode('utf-8'), salt=b64d(kdf['salt']), n=kdf['n'], r=kdf['r'], p=kdf['p'], maxmem=1 << 29, dklen=32)


def wrap(secret, key, aad):
    """The notebook key, wrapped with a key made from this password (or the recovery key)."""
    kdf = dict(KDF, salt=b64e(os.urandom(16))); n = os.urandom(12)
    return {'kdf': kdf, 'key': b64e(n + aes(kek(secret, kdf)).encrypt(n, key, aad))}


def unwrap(secret, slot, aad):
    from cryptography.exceptions import InvalidTag
    raw = b64d(slot['key'])
    try: return aes(kek(secret, slot['kdf'])).decrypt(raw[:12], raw[12:], aad)
    except InvalidTag: return None


def sealed_bytes(data): return data[:len(MAGIC)] == MAGIC


class Sealer:
    """Writes the sealed form of what is written to it into f. Each chunk's nonce carries its number and its associated
    data whether it is the last, so a file cut short or with chunks moved does not open."""
    def __init__(self, key, f):
        self.a, self.f, self.pre, self.i, self.buf = aes(key), f, os.urandom(8), 0, bytearray()
        f.write(MAGIC + self.pre)
    def _put(self, chunk, last):
        self.f.write(self.a.encrypt(self.pre + struct.pack('>I', self.i), bytes(chunk), b'\x01' if last else b'\x00')); self.i += 1
    def write(self, b):
        self.buf += b
        while len(self.buf) > CHUNK:   # the last chunk is written by close, even when it is a whole one
            self._put(self.buf[:CHUNK], False); del self.buf[:CHUNK]
        return len(b)
    def close(self): self._put(self.buf, True); self.buf = bytearray()


class Opener(io.RawIOBase):
    """A sealed file, read as it was."""
    def __init__(self, key, f):
        self.a, self.f = aes(key), f
        head = f.read(len(MAGIC) + 8)
        if not sealed_bytes(head): raise ValueError('not a sealed file')
        self.pre, self.i, self.buf, self.at, self.done = head[len(MAGIC):], 0, b'', 0, False
        self.next = f.read(CHUNK + TAG)
    def readable(self): return True
    def _more(self):
        cur, self.next = self.next, self.f.read(CHUNK + TAG); last = not self.next
        if len(cur) < TAG: raise ValueError('a sealed file cut short')
        self.buf, self.at = self.a.decrypt(self.pre + struct.pack('>I', self.i), cur, b'\x01' if last else b'\x00'), 0
        self.i += 1; self.done = last
    def read(self, n=-1):
        out = bytearray()
        while n < 0 or len(out) < n:
            if self.at >= len(self.buf):
                if self.done: break
                self._more(); continue
            k = len(self.buf) - self.at if n < 0 else min(n - len(out), len(self.buf) - self.at)
            out += self.buf[self.at:self.at + k]; self.at += k
        return bytes(out)
    def close(self):
        try: self.f.close()
        finally: super().close()


def plain_size(n):
    """A sealed file's size as it was (from its size on disk)."""
    body = n - len(MAGIC) - 8; k = max(1, -(-body // (CHUNK + TAG)))
    return body - TAG * k


class Access:
    def __init__(self, config_dir, configured, app_dir):
        self.configured = configured              # → the notebook folder in the config, locked or not
        self.app_dir = app_dir
        self.plain_dirs = [os.path.join(app_dir, d) for d in ('images', 'recordings', 'backup')]   # where the app keeps files without a notebook
        self.sfile = os.path.join(config_dir, 'sessions.json')
        self.mx = threading.RLock()
        self.key = None; self.uid = None          # the notebook key while open, and which lock it opens
        self.opening = False                      # the lock is being taken off: new files are written plain
        self.job = None; self.inst = None; self.fails = {}; self._acc = (None, None, None); self._seen = 0; self._ss = None
        self.sync = None; self.stt = None

    # ---------------- the lock and its folder ----------------
    def root(self):
        """The notebook folder, when it is locked."""
        p = self.configured()
        return p if p and os.path.isfile(os.path.join(p, '.scientia', 'access.json')) else None

    def locked(self): return self.root() is not None

    def read(self, root=None):
        root = root or self.root()
        if not root: return None
        f = os.path.join(root, '.scientia', 'access.json')
        try: m = os.path.getmtime(f)
        except OSError: return None
        if self._acc[:2] != (f, m):
            with open(f, encoding='utf-8') as fh: self._acc = (f, m, json.load(fh))
        return self._acc[2]

    def write(self, acc, root=None):
        f = os.path.join(root or self.root(), '.scientia', 'access.json'); tmp = f + '.part'
        with open(tmp, 'w', encoding='utf-8') as fh: json.dump(acc, fh, indent=1)
        os.replace(tmp, f); self._acc = (None, None, None)

    def opens(self, p):
        """serve.py's notebook(): a locked notebook is no notebook until someone has signed in."""
        if not os.path.isfile(os.path.join(p, '.scientia', 'access.json')): return True
        acc = self.read(p)
        return bool(self.key and acc and acc.get('uid') == self.uid)

    def is_open(self):
        acc = self.read()
        return bool(acc and self.key and acc.get('uid') == self.uid)

    def closed(self):
        """The startup line for a locked notebook nobody has opened yet."""
        r = self.root()
        return r and not self.is_open() and '%s (locked: sign in at the address above to open it)' % r

    def may_switch(self, path):
        """serve.py's set_notebook(). A locked folder opens once someone has signed in to it (the app asks first, so it never
        mistakes it for an empty one); while this notebook is locked, an unlocked folder is refused (this browser holds this
        notebook's record, which that folder would get in plain text)."""
        r = self.root(); path = os.path.abspath(os.path.expanduser(path))
        if os.path.isfile(os.path.join(path, '.scientia', 'access.json')):
            if not self.opens(path): raise ValueError('That notebook is locked: sign in to it first')
        elif r and os.path.normcase(os.path.abspath(r)) != os.path.normcase(path):
            raise ValueError('This notebook is locked and that folder is not: lock it first, or take the lock off here (Settings → Access)')

    def _under(self, path, dirs):
        p = os.path.normcase(os.path.abspath(path))
        return any(p.startswith(os.path.normcase(os.path.abspath(d)) + os.sep) for d in dirs)

    def sealed(self, path):
        """Whether this file is kept sealed: in a locked notebook's .scientia/, images/ or recordings/ (not access.json)."""
        r = self.root()
        if not r or self.opening or os.path.basename(path).startswith('access.json'): return False
        return self._under(path, [os.path.join(r, d) for d in SEALED])

    def _need(self, path):
        """The key for a file to be sealed; refused while closed. Next to the app, nothing is written while locked."""
        if self.sealed(path):
            if not self.is_open(): raise Locked('the notebook is locked')
            return self.key
        if self.root() and self._under(path, self.plain_dirs): raise Locked('the notebook is locked: nothing is kept next to the app')
        return None

    def seal(self, path, data):
        """serve.py's atomic(): what to write at this path."""
        key = self._need(path)
        if not key: return data
        out = io.BytesIO(); s = Sealer(key, out); s.write(data); s.close(); return out.getvalue()

    def unseal(self, raw):
        """serve.py's load_json(): a file's bytes as they were (plain files pass)."""
        if not sealed_bytes(raw): return raw
        if not self.key: raise Locked('the notebook is locked')
        with Opener(self.key, io.BytesIO(raw)) as f: return f.read()

    @contextlib.contextmanager
    def create(self, path):
        """A file written as a stream (media, recordings): sealed when it belongs sealed, into place when whole."""
        key = self._need(path); tmp = path + '.part'
        try:
            with open(tmp, 'wb') as raw:
                out = Sealer(key, raw) if key else raw
                yield out
                if key: out.close()
        except BaseException:
            try: os.remove(tmp)
            except OSError: pass
            raise
        os.replace(tmp, path)

    def open_read(self, path):
        f = open(path, 'rb')
        if not sealed_bytes(f.read(len(MAGIC))): f.seek(0); return f
        f.seek(0)
        if not self.key: f.close(); raise Locked('the notebook is locked')
        return Opener(self.key, f)

    def read_json(self, path):
        try:
            with self.open_read(path) as f: return json.loads(f.read())
        except Exception: return None

    @contextlib.contextmanager
    def plain(self, path):
        """A sealed file as a plain one for a program that reads it by name (Whisper, PowerPoint), in a folder of its own
        that is gone afterwards."""
        with open(path, 'rb') as f: head = f.read(len(MAGIC))
        if not sealed_bytes(head): yield path; return
        d = tempfile.mkdtemp(prefix='sis-open-')
        try:
            p = os.path.join(d, os.path.basename(path))
            with self.open_read(path) as src, open(p, 'wb') as dst: shutil.copyfileobj(src, dst, 1 << 20)
            yield p
        finally: shutil.rmtree(d, ignore_errors=True)

    def copy_in(self, src, dst, root):
        """A file from next to the app into a notebook folder (switching folders): sealed if that folder is the open
        lock's, left behind if it is another lock's, else copied."""
        if os.path.isfile(os.path.join(root, '.scientia', 'access.json')):
            if not self.opens(root): return
            with open(src, 'rb') as s, self.create(dst) as d: shutil.copyfileobj(s, d, 1 << 20)
        else: shutil.copy2(src, dst)

    # ops.jsonl, one sealed line per change (sisync.py's read_lines / append_line)
    def read_lines(self, path):
        with open(path, encoding='utf-8') as f: lines = f.read().splitlines()
        out = []
        for l in lines:
            if l.startswith('E'):
                if not self.key: raise Locked('the notebook is locked')
                raw = b64d(l[1:]); l = aes(self.key).decrypt(raw[:12], raw[12:], b'line').decode('utf-8')
            out.append(l)
        return out

    def append_line(self, path, line):
        key = self._need(path)
        if key: n = os.urandom(12); line = 'E' + b64e(n + aes(key).encrypt(n, line.encode('utf-8'), b'line'))
        with open(path, 'a', encoding='utf-8') as f: f.write(line + '\n')

    # ---------------- the rest of the server, sealed ----------------
    def attach(self, sync, stt, slides):
        """What sisync.py, sttread.py and slides.py write or read by name goes through the lock."""
        import sisync, sttread
        for mod, names in ((sisync, ('read_lines', 'append_line')), (sttread, ('_atomic', 'decode')), (sttread.Transcriber, ('job', 'side', '_requeue')), (slides, ('convert',))):
            for n in names:   # a sync from the lab that renamed one would leave that file plain in a locked notebook: stop instead
                if not hasattr(mod, n): raise RuntimeError('access.py: %s.%s is gone (a sync from the lab?): update Access.attach before running the app' % (getattr(mod, '__name__', mod), n))
        self.sync, self.stt = sync, stt
        sisync.read_lines, sisync.append_line = self.read_lines, self.append_line
        def side(path, data):
            try:
                with self.create(path) as f: f.write(json.dumps(data).encode('utf-8'))
            except Locked: pass   # locked while it was transcribing: queued again when the notebook is opened
        sttread._atomic = side
        sttread.Transcriber.job = lambda tr, name: self.read_json(tr.side(name))
        decode = sttread.decode
        def dec(path, *a, **k):
            with self.plain(path) as p: return decode(p, *a, **k)
        sttread.decode = dec
        convert = slides.convert
        def conv(src, images_dir, mid):
            if not self.sealed(os.path.join(images_dir, 'x')): return convert(src, images_dir, mid)
            out = tempfile.mkdtemp(prefix='sis-slides-out-')
            try:
                with self.plain(src) as p: res = convert(p, out, mid)
                for f in os.listdir(out):
                    with open(os.path.join(out, f), 'rb') as s, self.create(os.path.join(images_dir, f)) as d: shutil.copyfileobj(s, d, 1 << 20)
                return res
            finally: shutil.rmtree(out, ignore_errors=True)
        slides.convert = conv

    def serve(self, h):
        """serve.py's send_head(): a sealed image or recording, sent as it was; False for anything else. A HEAD request
        comes here without do_GET, so without route(): refused here (None) unless signed in."""
        r = self.root()
        if not r: return False
        if h.command == 'HEAD' and not (self.who(h) and self.is_open()):
            h.send_response(401); h.send_header('Content-Length', '0'); h.end_headers(); return None
        path = h.translate_path(h.path)
        if not os.path.isfile(path) or not self._under(path, [os.path.join(r, d) for d in SEALED]): return False
        with open(path, 'rb') as f:
            if not sealed_bytes(f.read(len(MAGIC))): return False
        f = self.open_read(path)
        h.send_response(200); h.send_header('Content-Type', h.guess_type(path)); h.send_header('Content-Length', str(plain_size(os.path.getsize(path))))
        h.send_header('Last-Modified', h.date_time_string(os.path.getmtime(path))); h.end_headers()
        return f

    # ---------------- making the lock, taking it off ----------------
    def _files(self, root):
        for d in SEALED:
            for dp, _, fs in os.walk(os.path.join(root, d)):
                for f in fs:
                    if f.startswith('access.json') or f.endswith(('.part', '.tmp')): continue
                    yield os.path.join(dp, f)

    def _hash(self, path):
        h = hashlib.sha256()
        with self.open_read(path) as f:
            for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
        return h.digest()

    def _turn(self, path, to_sealed):
        """One file sealed (or opened) in place: written beside it, checked against the original, then put in its place."""
        if os.path.basename(path) == 'ops.jsonl':   # sealed line by line, so it can hold both kinds: written again whole
            lines = self.read_lines(path); tmp = path + '.part'
            if to_sealed:
                with open(tmp, 'w', encoding='utf-8') as f:
                    for l in lines: n = os.urandom(12); f.write('E' + b64e(n + aes(self.key).encrypt(n, l.encode('utf-8'), b'line')) + '\n')
            else:
                with open(tmp, 'w', encoding='utf-8') as f: f.write(''.join(l + '\n' for l in lines))
            if self.read_lines(tmp) != lines: raise RuntimeError('a check failed on ' + path)
            os.replace(tmp, path); return True
        with open(path, 'rb') as f: is_sealed = sealed_bytes(f.read(len(MAGIC)))
        if is_sealed == to_sealed: return False
        before, tmp = self._hash(path), path + '.part'
        with self.open_read(path) as src, open(tmp, 'wb') as raw:
            if to_sealed:
                s = Sealer(self.key, raw); shutil.copyfileobj(src, s, 1 << 20); s.close()
            else: shutil.copyfileobj(src, raw, 1 << 20)
        if self._hash(tmp) != before: os.remove(tmp); raise RuntimeError('a check failed on ' + path)
        shutil.copystat(path, tmp); os.replace(tmp, path); return True

    def _sweep(self, root, to_sealed, extra=None):
        files = list(self._files(root)); self.job.update(total=len(files), done=0)
        for p in files:
            hold = self.sync.lock if self._under(p, [os.path.join(root, '.scientia')]) and self.sync else contextlib.nullcontext()
            with hold:
                if os.path.exists(p): self._turn(p, to_sealed)
            self.job['done'] += 1
        if extra: extra(root)

    def _run(self, kind, fn):
        self.job = {'kind': kind, 'state': 'working', 'done': 0, 'total': 0, 'notes': [], 'started': now()}
        def go():
            try: fn(); self.job['state'] = 'done'
            except Exception as e: self.job.update(state='error', error=str(e)[:400])
        threading.Thread(target=go, daemon=True).start()

    def _mirror_off(self, root):
        """The Markdown copy is plain text: the files the app wrote (listed in .scientia/manifest.json) go."""
        mf = os.path.join(root, '.scientia', 'manifest.json')
        try:
            with self.open_read(mf) as f: man = json.loads(f.read())
        except Exception: return 0
        n, top = 0, os.path.normcase(os.path.abspath(root))
        for rel in man:
            rel = str(rel).replace('\\', '/')
            if not rel.endswith('.md') or rel.startswith(('/', '.')) or ':' in rel or any(x in ('', '.', '..') for x in rel.split('/')): continue
            p = os.path.abspath(os.path.join(root, rel))
            if not os.path.normcase(p).startswith(top + os.sep): continue
            try: os.remove(p); n += 1
            except FileNotFoundError: pass
            d = os.path.dirname(p)
            while os.path.normcase(d).startswith(top + os.sep) and os.path.isdir(d) and not os.listdir(d): os.rmdir(d); d = os.path.dirname(d)
        os.remove(mf)
        return n

    def _move_in(self, root):
        """Files the app kept next to itself (images, recordings, kept copies from before the notebook folder): into the
        notebook, sealed, then gone from beside the app."""
        for src_dir, dst_dir in zip(self.plain_dirs, (os.path.join(root, 'images'), os.path.join(root, 'recordings'), os.path.join(root, '.scientia', 'kept'))):
            if not os.path.isdir(src_dir): continue
            for f in os.listdir(src_dir):
                src, dst = os.path.join(src_dir, f), os.path.join(dst_dir, f)
                if not os.path.isfile(src) or f.endswith('.part'): continue
                h = hashlib.sha256()
                with open(src, 'rb') as s:
                    for b in iter(lambda: s.read(1 << 20), b''): h.update(b)
                if os.path.exists(dst) and self._hash(dst) != h.digest():
                    self.job['notes'].append('left next to the app (the notebook has another file of that name): ' + src); continue
                if not os.path.exists(dst):
                    os.makedirs(dst_dir, exist_ok=True)
                    with open(src, 'rb') as s, self.create(dst) as d: shutil.copyfileobj(s, d, 1 << 20)
                    if self._hash(dst) != h.digest(): raise RuntimeError('a check failed on ' + dst)
                os.remove(src)

    def _seal_all(self, root):
        n = self._mirror_off(root)
        if n: self.job['notes'].append('%d Markdown file%s removed (the copy for Obsidian is plain text)' % (n, '' if n == 1 else 's'))
        self._sweep(root, True, self._move_in)

    def setup(self, pid, name, password):
        """The lock made: the notebook key, the first person (the owner), the recovery key; then the folder sealed."""
        root = self.configured()
        if not root or not os.path.isdir(root): raise ValueError('Choose a notebook folder first')
        if self.root(): raise ValueError('This notebook is locked already')
        if not has_crypto(): raise ValueError('The encryption library is not installed')
        pid, password = self._check_new(pid, password)
        key, code = os.urandom(32), ''.join(secrets.choice(CODE) for _ in range(25))
        n = os.urandom(12)
        acc = {'app': 'Scientia In Situ', 'lock': 1, 'uid': secrets.token_hex(8), 'created': now(), 'check': b64e(n + aes(key).encrypt(n, b'Scientia In Situ', b'check')),
               'people': [self._person(pid, name, 'owner', password, key)], 'recovery': wrap(norm_code(code), key, b'recovery')}
        with self.mx:
            hold = self.sync.lock if self.sync else contextlib.nullcontext()
            with hold:
                if self.sync and self.sync.timer: self.sync.timer.cancel()
                self.write(acc, root); self.key, self.uid = key, acc['uid']
                if self.sync and self.sync.has_record: self.sync.save_now()   # the record, sealed now
        self._run('lock', lambda: self._seal_all(root))
        return acc['people'][0], '-'.join(code[i:i + 5] for i in range(0, 25, 5))

    def take_off(self):
        """The lock taken off: every file opened in place, then access.json moved to .scientia/kept/ and everyone signed out."""
        root = self.root()
        def go():
            self.opening = True
            try:
                self._sweep(root, False)
                with self.mx:
                    kept = os.path.join(root, '.scientia', 'kept'); os.makedirs(kept, exist_ok=True)
                    os.replace(os.path.join(root, '.scientia', 'access.json'), os.path.join(kept, 'access-%s.json' % time.strftime('%Y-%m-%d_%H%M%S')))
                    self._acc = (None, None, None); self.key = self.uid = None; self._drop_sessions(lambda s: True)
            finally: self.opening = False
        self._run('unlock', go)

    def sweep(self):
        """After each opening: whatever a sealing that stopped halfway left plain is sealed."""
        root = self.root()
        if root and self.is_open() and not (self.job and self.job['state'] == 'working'): self._run('lock', lambda: self._seal_all(root))

    # ---------------- people ----------------
    def _check_new(self, pid, password):
        pid, password = norm_id(pid), norm_pw(password)
        if not 2 <= len(pid) <= 40 or any(unicodedata.category(c)[0] in 'CZ' and c != ' ' for c in pid): raise ValueError('An ID is 2 to 40 letters, numbers or signs')
        if len(password) < 8: raise ValueError('A password is at least 8 characters')
        return pid, password

    def _person(self, pid, name, role, password, key):
        return dict({'id': pid, 'name': (str(name or '').strip() or pid)[:60], 'role': role, 'created': now()}, **wrap(password, key, b'person:' + pid.encode('utf-8')))

    @staticmethod
    def public(p): return {k: p.get(k) for k in ('id', 'name', 'role', 'created')}

    def _key_of(self, acc, pid, password):
        p = next((x for x in acc.get('people', []) if x['id'] == norm_id(pid)), None)
        key = p and unwrap(norm_pw(password), p, b'person:' + p['id'].encode('utf-8'))
        if not key: return None, None
        raw = b64d(acc['check'])
        try: aes(key).decrypt(raw[:12], raw[12:], b'check')
        except Exception: return None, None
        return p, key

    def add(self, pid, name, role, password):
        with self.mx:
            acc = self.read(); pid, password = self._check_new(pid, password)
            if any(x['id'] == pid for x in acc['people']): raise ValueError('Someone has that ID already')
            acc['people'].append(self._person(pid, name, 'owner' if role == 'owner' else 'member', password, self.key)); self.write(acc)

    def remove(self, pid):
        with self.mx:
            acc = self.read(); pid = norm_id(pid)
            left = [x for x in acc['people'] if x['id'] != pid]
            if not any(x['role'] == 'owner' for x in left): raise ValueError('The notebook needs an owner: add another one first')
            acc['people'] = left; self.write(acc); self._drop_sessions(lambda s: s.get('id') == pid)

    def password(self, pid, old, new):
        with self.mx:
            acc = self.read(); p, key = self._key_of(acc, pid, old)
            if not p: raise ValueError('That is not your current password')
            _, new = self._check_new(pid, new)
            p.update(wrap(new, key, b'person:' + p['id'].encode('utf-8'))); self.write(acc)

    def new_recovery(self, pid, password):
        with self.mx:
            acc = self.read(); p, key = self._key_of(acc, pid, password)
            if not p: raise ValueError('That is not your password')
            code = ''.join(secrets.choice(CODE) for _ in range(25))
            acc['recovery'] = wrap(norm_code(code), key, b'recovery'); self.write(acc)
            return '-'.join(code[i:i + 5] for i in range(0, 25, 5))

    # ---------------- signing in ----------------
    def _wait(self, ip):
        n, last = self.fails.get(ip, (0, 0))
        return 0 if n < 5 else max(0, int(last + min(900, 30 * 2 ** (n - 5)) - time.time()))

    def _failed(self, ip):
        n, _ = self.fails.get(ip, (0, 0)); self.fails[ip] = (n + 1, time.time())

    def _open_with(self, key, acc):
        was = self.key is not None and self.uid == acc['uid']; self.key, self.uid = key, acc['uid']
        if not was and self.is_open():   # (a folder about to be switched to is opened by set_notebook)
            if self.sync: self.sync.ensure()
            if self.stt: threading.Timer(1.0, self.stt._requeue).start()
            self.sweep()

    def signin(self, pid, password, ip, ua, folder=None):
        """folder: a locked notebook this computer is about to switch to (Settings → Notebook folder)."""
        if not has_crypto(): raise ValueError('This computer needs the encryption library first')
        w = self._wait(ip)
        if w: raise ValueError('Too many tries: wait %d s' % w)
        with self.mx:
            acc = self.read(folder)
            if not acc: raise ValueError('This notebook is not locked')
            p, key = self._key_of(acc, pid, password)
            if not p: self._failed(ip); raise ValueError('That ID and password do not open this notebook')
            self.fails.pop(ip, None); self._open_with(key, acc)
            return p, self._new_session(p, acc, ua)

    def recover(self, pid, code, password, ip, ua):
        if not has_crypto(): raise ValueError('This computer needs the encryption library first')
        w = self._wait(ip)
        if w: raise ValueError('Too many tries: wait %d s' % w)
        with self.mx:
            acc = self.read()
            if not acc: raise ValueError('This notebook is not locked')
            key = unwrap(norm_code(code), acc['recovery'], b'recovery')
            p = next((x for x in acc['people'] if x['id'] == norm_id(pid)), None)
            if not key: self._failed(ip); raise ValueError('That recovery key does not open this notebook')
            if not p: raise ValueError('Nobody has that ID')
            _, password = self._check_new(pid, password)
            p.update(wrap(password, key, b'person:' + p['id'].encode('utf-8'))); self.write(acc)
            self.fails.pop(ip, None); self._open_with(key, acc)
            return p, self._new_session(p, acc, ua)

    def lock_now(self):
        """The notebook closed: the record written, the key forgotten, everyone signed out."""
        with self.mx:
            hold = self.sync.lock if self.sync else contextlib.nullcontext()
            with hold:
                if self.sync and self.sync.timer: self.sync.timer.cancel()
                if self.sync and self.sync.root and self.is_open(): self.sync.save_now()
                self.key = self.uid = None
            self._drop_sessions(lambda s: True)

    # ---------------- sessions ----------------
    def _sessions(self):
        if self._ss is None:
            try:
                with open(self.sfile, encoding='utf-8') as f: self._ss = json.load(f).get('sessions', [])
            except Exception: self._ss = []
        return self._ss

    def _save_sessions(self, ss):
        os.makedirs(os.path.dirname(self.sfile), exist_ok=True); tmp = self.sfile + '.part'
        with open(tmp, 'w', encoding='utf-8') as f: json.dump({'sessions': ss}, f, indent=1)
        os.replace(tmp, self.sfile); self._ss = ss

    def _new_session(self, p, acc, ua):
        tok = secrets.token_urlsafe(32); t = time.time()
        with self.mx:
            ss = [s for s in self._sessions() if s.get('exp', 0) > t]
            ss.append({'hash': hashlib.sha256(tok.encode()).hexdigest(), 'uid': acc['uid'], 'id': p['id'], 'created': now(), 'exp': t + SESSION_DAYS * 86400, 'ua': str(ua or '')[:160]})
            self._save_sessions(ss)
        return tok

    def _drop_sessions(self, which):
        with self.mx: self._save_sessions([s for s in self._sessions() if not which(s)])

    @staticmethod
    def token(h):
        from http.cookies import SimpleCookie
        c = SimpleCookie()
        try: c.load(h.headers.get('Cookie') or '')
        except Exception: return None
        return c['sis_ses'].value if 'sis_ses' in c else None

    def who(self, h):
        """The person this browser signed in as (for this lock), or None."""
        tok, acc = self.token(h), self.read()
        if not tok or not acc: return None
        hh, t = hashlib.sha256(tok.encode()).hexdigest(), time.time()
        with self.mx:
            ss = self._sessions(); s = next((x for x in ss if x.get('hash') == hh and x.get('uid') == acc['uid'] and x.get('exp', 0) > t), None)
            if not s: return None
            p = next((x for x in acc['people'] if x['id'] == s['id']), None)
            if p and t - self._seen > 60:   # in use: it lasts SESSION_DAYS from now
                s['exp'] = t + SESSION_DAYS * 86400; self._seen = t; self._save_sessions(ss)
            return p

    # ---------------- the library ----------------
    def install(self):
        if self.inst and self.inst['state'] == 'installing': return
        self.inst = {'state': 'installing', 'log': []}
        def go():
            for args in (['install', 'cryptography'], ['install', '--user', 'cryptography']):
                p = subprocess.run([sys.executable, '-m', 'pip'] + args, capture_output=True, text=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                self.inst['log'] = [l for l in (p.stdout + p.stderr).splitlines() if l.strip()][-8:]
                import importlib; importlib.invalidate_caches()
                if p.returncode == 0 and has_crypto(): self.inst['state'] = 'done'; return
            self.inst['state'] = 'error'
        threading.Thread(target=go, daemon=True).start()

    # ---------------- HTTP ----------------
    def _send(self, h, code, obj, cookie=None):
        body = json.dumps(obj).encode()
        h.send_response(code); h.send_header('Content-Type', 'application/json'); h.send_header('Content-Length', str(len(body)))
        if cookie is not None:
            h.send_header('Set-Cookie', 'sis_ses=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Lax' % (cookie, SESSION_DAYS * 86400 if cookie else 0))
        h.end_headers(); h.connection.sendall(body)

    def _page(self, h):
        with open(os.path.join(self.app_dir, 'signin.html'), 'rb') as f: b = f.read()
        h.send_response(401); h.send_header('Content-Type', 'text/html; charset=utf-8'); h.send_header('Content-Length', str(len(b))); h.end_headers(); h.connection.sendall(b)

    def route(self, h, p, post):
        """serve.py's do_GET / do_POST ask first. True when this answered: an /api/access/ call, the sign-in page, or a
        refusal (a locked notebook needs a signed-in person for everything else)."""
        if p.startswith('/api/access/'): self.api(h, p, post); return True
        if not self.locked(): return False
        if not post and (p in FREE or ICONS.fullmatch(p)): return False
        if h.is_local() and (p in LOCAL_FREE or p.startswith('/rm/js/')): return False
        if self.who(h) and self.is_open():
            if post and p == '/api/vault': self._send(h, 409, {'ok': False, 'error': 'A locked notebook keeps no Markdown copy'}); return True
            return False
        if p.startswith('/api/'): self._send(h, 423, {'ok': False, 'locked': True, 'error': 'Sign in to open the notebook'})
        elif not post and (p == '/' or p.endswith('.html')): self._page(h)
        else: h.send_response(401); h.send_header('Content-Length', '0'); h.end_headers()
        return True

    def _folder(self, h, path):
        """A notebook folder this computer is about to switch to (only this computer names one)."""
        if not path or not h.is_local(): return None
        path = os.path.abspath(os.path.expanduser(str(path)))
        return path if os.path.isfile(os.path.join(path, '.scientia', 'access.json')) else None

    def api(self, h, p, post):
        from urllib.parse import urlparse, parse_qs
        ip, ua = h.client_address[0], h.headers.get('User-Agent')
        _, obj = h._obj(1 << 16) if post else (None, None); obj = obj or {}
        me = self.who(h); is_open = self.is_open(); acc = self.read()
        try:
            if p == '/api/access/status':
                f = (parse_qs(urlparse(h.path).query).get('folder') or [''])[0]
                mine = h.is_local() or me   # how far a job is, the install's log: not for whoever asks
                st = {'ok': True, 'crypto': has_crypto(), 'lock': bool(acc), 'open': is_open, 'local': h.is_local(), 'notebook': bool(self.configured()), 'me': self.public(me) if me else None,
                      'job': dict(self.job, notes=list(self.job['notes'])) if self.job and mine else None, 'install': self.inst if mine else None, 'wait': self._wait(ip)}
                if f and h.is_local(): st['folder'] = {'lock': bool(self._folder(h, f)), 'open': bool(self._folder(h, f)) and self.opens(self._folder(h, f))}
                return self._send(h, 200, st)
            if p == '/api/access/people' and not post:
                if not (me and is_open): return self._send(h, 423, {'ok': False, 'locked': True, 'error': 'Sign in to open the notebook'})
                return self._send(h, 200, {'ok': True, 'people': [self.public(x) for x in acc['people']]})
            if not post: return self._send(h, 404, {'ok': False})
            if p == '/api/access/signin':
                person, tok = self.signin(obj.get('id'), obj.get('password'), ip, ua, self._folder(h, obj.get('folder')))
                return self._send(h, 200, {'ok': True, 'me': self.public(person)}, tok)
            if p == '/api/access/recover':
                person, tok = self.recover(obj.get('id'), obj.get('code'), obj.get('password'), ip, ua)
                return self._send(h, 200, {'ok': True, 'me': self.public(person)}, tok)
            if p == '/api/access/signout':
                tok = self.token(h)
                if tok: self._drop_sessions(lambda s: s.get('hash') == hashlib.sha256(tok.encode()).hexdigest())
                return self._send(h, 200, {'ok': True}, '')
            if p in ('/api/access/install', '/api/access/setup'):
                if not h.is_local(): return self._send(h, 403, {'ok': False, 'error': 'only on the computer that runs the app'})
                if p == '/api/access/install': self.install(); return self._send(h, 200, {'ok': True, 'install': self.inst})
                if acc: return self._send(h, 409, {'ok': False, 'error': 'This notebook is locked already'})
                person, code = self.setup(obj.get('id'), obj.get('name'), obj.get('password'))
                return self._send(h, 200, {'ok': True, 'me': self.public(person), 'recovery': code}, self._new_session(person, self.read(), ua))
            if not (me and is_open): return self._send(h, 423, {'ok': False, 'locked': True, 'error': 'Sign in to open the notebook'})
            if p == '/api/access/lock': self.lock_now(); return self._send(h, 200, {'ok': True}, '')
            if p == '/api/access/password': self.password(me['id'], obj.get('old'), obj.get('password')); return self._send(h, 200, {'ok': True})
            if me['role'] != 'owner': return self._send(h, 403, {'ok': False, 'error': 'Only an owner of the notebook can do that'})
            if p == '/api/access/people/add': self.add(obj.get('id'), obj.get('name'), obj.get('role'), obj.get('password')); return self._send(h, 200, {'ok': True})
            if p == '/api/access/people/remove': self.remove(obj.get('id')); return self._send(h, 200, {'ok': True})
            if p == '/api/access/recovery': return self._send(h, 200, {'ok': True, 'recovery': self.new_recovery(me['id'], obj.get('password'))})
            if p == '/api/access/remove':
                if not h.is_local(): return self._send(h, 403, {'ok': False, 'error': 'only on the computer that runs the app'})
                if not self._key_of(acc, me['id'], obj.get('password'))[0]: return self._send(h, 200, {'ok': False, 'error': 'That is not your password'})
                self.take_off(); return self._send(h, 200, {'ok': True})
            return self._send(h, 404, {'ok': False})
        except (ValueError, Locked) as e:
            return self._send(h, 200, {'ok': False, 'error': str(e), 'wait': self._wait(ip)})
