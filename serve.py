"""Serve the app on its fixed origin with caching off, so a rebuilt scientia.html is always the one you see.

Your notebook folder (chosen in Settings → Notebook folder) holds everything you make:
  .scientia/record.json   the whole record — reloaded on launch, so a fresh copy of the app picks up where you left off
  .scientia/daily/        one copy per day (the last 90 are kept)
  .scientia/kept/         copies taken before anything destructive (a wipe, a load, a big shrink)
  images/                 images, GIFs, videos, PDFs and HTML pages you add
  <Project>/<Theme>/<Note>/<NN component>.md   one Markdown file per component, for Obsidian (written by the app)
The folder is remembered outside the app (in your user profile), so replacing the app never touches it.
"""
import http.server, json, os, re, shutil, socket, subprocess, sys, threading, time, webbrowser
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs, unquote

PORT = int(os.environ.get('SIS_PORT', 8766))  # storage belongs to the origin http://localhost:8766: never change it
ROOT = os.path.dirname(os.path.abspath(__file__))
APP_IMAGES = os.path.join(ROOT, 'images')
APP_RECORDINGS = os.path.join(ROOT, 'recordings')
REC_EXTS = {'webm', 'm4a', 'mp4', 'ogg', 'wav', 'mp3', 'aac'}
EXTS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg', 'mp4', 'webm', 'mov', 'm4v', 'avif', 'html', 'htm', 'pdf', 'xlsx', 'xlsm', 'xls', 'ods', 'csv', 'tsv', 'txt'}
if os.environ.get('SIS_CONFIG'): CONFIG = os.environ['SIS_CONFIG']
elif os.name == 'nt': CONFIG = os.path.join(os.environ.get('APPDATA') or os.path.expanduser('~'), 'ScientiaInSitu', 'config.json')
else: CONFIG = os.path.join(os.path.expanduser('~'), '.config', 'scientia-in-situ', 'config.json')
os.chdir(ROOT)
os.makedirs(APP_IMAGES, exist_ok=True)
LOCK = threading.Lock()

def stamp(): return time.strftime('%Y-%m-%d_%H%M%S')
def atomic(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    with open(tmp, 'wb') as f: f.write(data)
    os.replace(tmp, path)
def load_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except Exception: return default
def records(obj):
    try: return sum(v for k, v in (obj.get('counts') or {}).items() if k not in ('journal', 'settings', 'profiles'))
    except Exception: return 0

def notebook():
    p = (load_json(CONFIG, {}) or {}).get('notebook')
    return p if p and os.path.isdir(p) else None
def nb(*parts):
    root = notebook()
    return os.path.join(root, *parts) if root else None
def images_dir(): return nb('images') or APP_IMAGES
def rec_dir():
    d = nb('recordings') or APP_RECORDINGS; os.makedirs(d, exist_ok=True); return d
def rec_name(name):
    name = os.path.basename(str(name or ''))
    return name if name and not name.startswith('.') and name.rsplit('.', 1)[-1].lower() in REC_EXTS and os.path.isfile(os.path.join(rec_dir(), name)) else None
def meta():
    if SYNC.ensure() and SYNC.has_record:
        return {'savedAt': SYNC.saved_at, 'records': SYNC.records(), 'syncSeq': SYNC.seq, 'sid': SYNC.sid, 'epoch': SYNC.meta.get('epoch')}
    return None
def set_notebook(path, media=None):
    path = os.path.abspath(os.path.expanduser(path))
    os.makedirs(path, exist_ok=True)
    for sub in ('.scientia', os.path.join('.scientia', 'daily'), os.path.join('.scientia', 'kept'), 'images', 'recordings'): os.makedirs(os.path.join(path, sub), exist_ok=True)
    # bring over the images your notes use that so far lived next to the app (copied, never moved)
    for f in (media or []):
        f = os.path.basename(str(f))
        src, dst = os.path.join(APP_IMAGES, f), os.path.join(path, 'images', f)
        if os.path.isfile(src) and not os.path.exists(dst): shutil.copy2(src, dst)
    cfg = load_json(CONFIG, {}) or {}; cfg['notebook'] = path; cfg.setdefault('recent', []);
    cfg['recent'] = [path] + [x for x in cfg['recent'] if x != path][:7]
    atomic(CONFIG, json.dumps(cfg, indent=1).encode('utf-8'))
    SYNC.ensure()
    return path
def vault_path(rel):
    root = notebook()
    rel = str(rel or '').replace('\\', '/')
    if not root or not rel.endswith('.md') or rel.startswith('/') or ':' in rel or rel.startswith('.') or any(p in ('', '.', '..') for p in rel.split('/')): return None
    p = os.path.normpath(os.path.join(root, rel))
    return p if p.startswith(os.path.normpath(root) + os.sep) else None
def info():
    return {'ok': True, 'path': notebook(), 'record': meta(), 'config': CONFIG, 'recent': (load_json(CONFIG, {}) or {}).get('recent', [])}

sys.path.insert(0, ROOT)
from sisync import Sync
from hwread import Reader
import slides as SLIDES
from sttread import Transcriber
HW = Reader()
from winink import WinInk
INKR = WinInk()
STT = Transcriber(rec_dir)
SYNC = Sync(nb, atomic, lambda p, d=None: load_json(p, d) if p else d, os.path.dirname(CONFIG))

# ---------------- other devices: what this computer can be reached at ----------------
def tailscale_exe():
    w = shutil.which('tailscale')
    if w: return w
    for c in (r'C:\Program Files\Tailscale\tailscale.exe', '/Applications/Tailscale.app/Contents/MacOS/Tailscale', '/usr/bin/tailscale'):
        if os.path.exists(c): return c
    return None
def run(args, timeout=8):
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        return r.returncode, (r.stdout or '') + (r.stderr or '')
    except Exception as e: return -1, str(e)
def lan_ips():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ips.add(s.getsockname()[0]); s.close()
    except Exception: pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]: ips.add(ip)
    except Exception: pass
    return sorted(ip for ip in ips if not ip.startswith('127.') and not ip.startswith('100.'))
def net():
    ts = {'installed': False}
    exe = tailscale_exe()
    if exe:
        ts['installed'] = True
        code, out = run([exe, 'status', '--json'])
        try:
            st = json.loads(out); me = st.get('Self') or {}
            ts.update({'running': st.get('BackendState') == 'Running', 'dns': (me.get('DNSName') or '').rstrip('.'), 'ips': me.get('TailscaleIPs') or []})
        except Exception: ts['error'] = out.strip()[:300]
        code, out = run([exe, 'serve', 'status'])
        ts['serving'] = code == 0 and (':%d' % PORT in out or 'localhost:%d' % PORT in out or '127.0.0.1:%d' % PORT in out)
        ts['serveStatus'] = out.strip()[:600]
    return {'ok': True, 'port': PORT, 'lan': lan_ips(), 'tailscale': ts}
def tailscale_serve():
    exe = tailscale_exe()
    if not exe: return {'ok': False, 'out': 'Tailscale is not installed on this computer.'}
    code, out = run([exe, 'serve', '--bg', str(PORT)], timeout=25)
    return {'ok': code == 0, 'out': out.strip()[:1500]}

SW = '''// Scientia In Situ — keeps the app (and the images and recordings you have opened) on this device, so it opens without the computer.
const C = 'sis-app-v2', I = 'sis-img-v1', SHELL = ['/scientia.html', '/manifest.webmanifest', '/icon.svg', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sis-app-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (u.pathname.startsWith('/images/') || u.pathname.startsWith('/recordings/')) { e.respondWith(caches.open(I).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  if (u.pathname === '/' || u.pathname.endsWith('.html') || SHELL.includes(u.pathname)) {
    const key = u.pathname === '/' ? '/scientia.html' : u.pathname;
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(key, cp)); } return r; })
      .catch(() => caches.match(key, { ignoreSearch: true }))); }
});
'''
ICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#1d1d1b"/><text x="256" y="318" font-family="Helvetica,Arial,sans-serif" font-weight="800" font-size="190" text-anchor="middle" fill="#f4f1ea" letter-spacing="-8">SiS</text></svg>'''
MANIFEST = json.dumps({'name': 'Scientia In Situ', 'short_name': 'Scientia', 'start_url': '/scientia.html', 'scope': '/', 'display': 'standalone',
                       'background_color': '#f4f1ea', 'theme_color': '#1d1d1b', 'id': '/scientia.html', 'orientation': 'any', 'description': 'Electronic lab notebook on a paper canvas',
                       'icons': [{'src': '/icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'}, {'src': '/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
                                 {'src': '/icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}, {'src': '/icon.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any'}]})
PUBLIC = {'/', '/scientia.html', '/sw.js', '/manifest.webmanifest', '/icon.svg', '/api/sync/hello', '/api/pair/claim', '/api/pair/status'}
LOCAL_ONLY_POST = {'/api/hw/install', '/api/ink/lang', '/api/stt/install', '/api/notebook', '/api/notebook/browse', '/api/vault', '/api/pair/new', '/api/pair/decide', '/api/devices/remove', '/api/devices/rename', '/api/tailscale/serve'}
LOCAL_ONLY_GET = {'/api/pair/pending', '/api/devices', '/api/net'}

def browse():
    """A native folder dialog on this computer (the server runs here)."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        r = tk.Tk(); r.withdraw()
        try: r.attributes('-topmost', True)
        except Exception: pass
        p = filedialog.askdirectory(title='Choose your notebook folder', mustexist=False, initialdir=notebook() or os.path.expanduser('~'))
        r.destroy()
        return p or None
    except Exception as e:
        return {'error': str(e)}

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a): pass
    def is_local(self):
        a = self.client_address[0]
        if a not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'): return False
        # a request relayed by `tailscale serve` (or any proxy) arrives from 127.0.0.1 too: it is not this computer
        return not any(self.headers.get(x) for x in ('X-Forwarded-For', 'X-Forwarded-Host', 'Forwarded', 'Tailscale-User-Login', 'Tailscale-User-Name'))
    def token(self):
        c = SimpleCookie()
        try: c.load(self.headers.get('Cookie') or '')
        except Exception: return None
        return c['sis_tok'].value if 'sis_tok' in c else None
    def who(self):
        if self.is_local(): return {'id': 'local', 'name': 'This computer', 'local': True}
        d = SYNC.device_for(self.token())
        return dict(d, local=False) if d else None
    def gate(self, p, post):
        """True when the request may go on; otherwise the refusal has been sent."""
        if p in PUBLIC or (not post and re.fullmatch(r'/icons/icon-[a-z0-9-]+\.png', p)): return True
        if self.is_local(): return True
        if (post and p in LOCAL_ONLY_POST) or (not post and p in LOCAL_ONLY_GET) or (post and p == '/api/snapshot' and 'keep=' not in (self.path or '')):
            self._json(403, {'ok': False, 'error': 'only from the computer that runs the app'}); return False
        if self.who(): return True
        if p.startswith('/api/'): self._json(401, {'ok': False, 'error': 'this device is not paired'})
        else: self.send_response(401); self.send_header('Content-Length', '0'); self.end_headers()
        return False
    def _text(self, body, ctype):
        b = body.encode('utf-8'); self.send_response(200); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def translate_path(self, path):
        u = unquote(urlparse(path).path)
        if u.startswith('/recordings/'):
            return os.path.join(rec_dir(), os.path.basename(u))
        if u.startswith('/images/'):
            name = os.path.basename(u)
            for d in (images_dir(), APP_IMAGES):
                f = os.path.join(d, name)
                if os.path.isfile(f): return f
            return os.path.join(images_dir(), name)
        return super().translate_path(path)
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def _body(self, limit=2 * 1024 ** 3):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > limit: return None
        buf = bytearray(); left = n
        while left > 0:
            chunk = self.rfile.read(min(left, 1 << 20))
            if not chunk: break
            buf += chunk; left -= len(chunk)
        return bytes(buf)
    def _obj(self, limit=1024 ** 3):
        raw = self._body(limit)
        if raw is None: return None, None
        try: return raw, json.loads(raw)
        except Exception: return raw, None

    def do_GET(self):
        u = urlparse(self.path); p = u.path; q = parse_qs(u.query)
        if not self.gate(p, False): return
        if p == '/': self.path = '/scientia.html'; return super().do_GET()
        if p == '/sw.js': return self._text(SW, 'text/javascript')
        if p == '/manifest.webmanifest': return self._text(MANIFEST, 'application/manifest+json')
        if p == '/icon.svg': return self._text(ICON, 'image/svg+xml')
        if p == '/api/sync/hello':
            w = self.who(); on = SYNC.ensure()
            return self._json(200, {'ok': True, 'auth': bool(w), 'local': bool(w and w.get('local')), 'device': (w or {}).get('name'), 'deviceId': (w or {}).get('id'),
                                    'notebook': on, 'sid': SYNC.sid, 'seq': SYNC.seq, 'records': SYNC.records() if on else 0, 'savedAt': SYNC.saved_at, 'conflicts': len(SYNC.conflicts)})
        if p == '/api/sync/state':
            if not SYNC.ensure(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
            with SYNC.lock:
                data = SYNC.export('state')
                if (q.get('journal') or [''])[0] == '0': data['stores'].pop('journal', None); data['counts'].pop('journal', None)
                body = json.dumps(data).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        if p == '/api/sync/pull':
            if not SYNC.ensure(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
            g = lambda k, d='': (q.get(k) or [d])[0]
            return self._json(200, SYNC.pull(g('conn'), int(g('since', '0') or 0), g('sid'), float(g('wait', '0') or 0), int(g('c', '-1') or -1)))
        if p == '/api/sync/conflicts': SYNC.ensure(); return self._json(200, {'ok': True, 'conflicts': SYNC.conflicts})
        if p == '/api/pair/status':
            st, tok = SYNC.status((q.get('req') or [''])[0])
            body = json.dumps(dict(st, ok=True)).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body)))
            if tok: self.send_header('Set-Cookie', f'sis_tok={tok}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax')
            self.end_headers(); self.wfile.write(body); return
        if p == '/api/pair/pending': return self._json(200, {'ok': True, 'pending': SYNC.pending()})
        if p == '/api/devices': return self._json(200, {'ok': True, 'devices': SYNC.devices()})
        if p == '/api/net': return self._json(200, net())
        if p == '/api/hw/status': return self._json(200, INKR.status())
        if p == '/api/stt/status': return self._json(200, STT.status())
        if p == '/api/rec/status':
            n = rec_name((q.get('file') or [''])[0])
            return self._json(200, STT.get(n) if n else {'ok': False, 'state': 'none', 'error': 'no such recording'})
        if p == '/api/slides/status': return self._json(200, SLIDES.available())
        if p == '/api/ping': return self._json(200, {'ok': True, 'images': 'images', 'data': True, 'notebook': notebook()})
        if p == '/api/notebook': return self._json(200, info())
        if p == '/api/snapshot':
            if not SYNC.ensure() or not SYNC.has_record: return self._json(404, {'ok': False})
            with SYNC.lock: body = json.dumps(SYNC.export('state')).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        if p == '/api/vault':
            return self._json(200, {'ok': True, 'files': list((load_json(nb('.scientia', 'manifest.json') or '', {}) or {}).items())})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if not self.gate(u.path, True): return
        if u.path == '/api/sync/push':
            if not SYNC.ensure(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
            _, obj = self._obj(512 * 1024 ** 2); obj = obj or {}; w = self.who() or {}
            if obj.get('sid') and obj['sid'] != SYNC.sid and not obj.get('anySid'): return self._json(200, {'ok': False, 'reset': True, 'sid': SYNC.sid})
            return self._json(200, SYNC.push(str(obj.get('dev') or w.get('id')), obj.get('conn'), obj.get('name') or w.get('name') or 'a device', obj.get('ops')))
        if u.path == '/api/sync/resolve':
            _, obj = self._obj(1 << 20); obj = obj or {}; w = self.who() or {}
            return self._json(200, SYNC.resolve(obj.get('cid'), obj.get('pick'), str(obj.get('dev') or w.get('id')), obj.get('name') or w.get('name') or 'a device'))
        if u.path == '/api/pair/new': return self._json(200, dict(SYNC.new_code(), ok=True))
        if u.path == '/api/pair/claim':
            _, obj = self._obj(1 << 16); obj = obj or {}
            req = SYNC.claim(obj.get('code'), obj.get('name'), self.headers.get('User-Agent'))
            return self._json(200, {'ok': bool(req), 'req': req, 'error': None if req else 'That code is not valid (or has expired) — make a new one on the computer'})
        if u.path == '/api/pair/decide':
            _, obj = self._obj(1 << 16); obj = obj or {}
            return self._json(200, {'ok': SYNC.decide(obj.get('req'), bool(obj.get('ok')))})
        if u.path == '/api/devices/remove':
            _, obj = self._obj(1 << 16); return self._json(200, {'ok': SYNC.remove((obj or {}).get('id'))})
        if u.path == '/api/devices/rename':
            _, obj = self._obj(1 << 16); obj = obj or {}; SYNC.rename(obj.get('id'), obj.get('name') or 'Device'); return self._json(200, {'ok': True})
        if u.path == '/api/tailscale/serve': return self._json(200, tailscale_serve())
        if u.path == '/api/hw/install': return self._json(200, HW.install())
        if u.path == '/api/stt/install': return self._json(200, STT.install())
        if u.path == '/api/rec': return self.recording(q)
        if u.path == '/api/rec/transcribe':
            n = rec_name((q.get('file') or [''])[0]); lang = (q.get('lang') or [''])[0] or None
            return self._json(200, STT.add(n, lang, (q.get('again') or [''])[0] == '1') if n else {'ok': False, 'error': 'no such recording'})
        if u.path == '/api/slides':
            mid = (q.get('id') or [''])[0]; ext = (q.get('ext') or ['pptx'])[0].lower()
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', mid) or ext not in ('pptx', 'ppt', 'pptm', 'ppsx', 'odp'): return self._json(400, {'ok': False, 'error': 'not a slide deck'})
            raw = self._body(2 * 1024 ** 3)
            if not raw: return self._json(400, {'ok': False, 'error': 'empty file'})
            d = images_dir(); os.makedirs(d, exist_ok=True); src = os.path.join(d, f'{mid}.{ext}'); atomic(src, raw)
            try: return self._json(200, {'ok': True, 'file': f'images/{mid}.{ext}', 'slides': SLIDES.convert(src, d, mid)})
            except Exception as e: return self._json(200, {'ok': False, 'file': f'images/{mid}.{ext}', 'error': str(e)})
        if u.path == '/api/ink/read':
            _, obj = self._obj(64 * 1024 ** 2); strokes = (obj or {}).get('strokes') or []
            try: return self._json(200, dict(INKR.read(strokes[:4000]), ok=True))
            except Exception as e: return self._json(200, {'ok': False, 'error': str(e)[:400]})
        if u.path == '/api/ink/lang':
            _, obj = self._obj(1 << 16)
            try: return self._json(200, INKR.set_lang(str((obj or {}).get('name') or '')))
            except Exception as e: return self._json(200, {'ok': False, 'error': str(e)[:300]})
        if u.path == '/api/hw/read':
            _, obj = self._obj(64 * 1024 ** 2); lines = (obj or {}).get('lines') or []
            if not HW.ensure(): return self._json(200, dict(HW.status(), ok=False, waiting=True))
            try: return self._json(200, {'ok': True, 'lines': HW.read(lines[:80])})
            except Exception as e: return self._json(500, {'ok': False, 'error': str(e)})
        if u.path == '/api/media': return self.media(q)
        if u.path == '/api/notebook/browse':
            r = browse()
            if isinstance(r, dict): return self._json(200, {'ok': False, 'error': 'No folder dialog here (' + r['error'] + ') — type the path instead'})
            return self._json(200, {'ok': True, 'path': r})
        if u.path == '/api/notebook':
            _, obj = self._obj(1 << 20)
            path = (obj or {}).get('path')
            if not path: return self._json(400, {'ok': False, 'error': 'no path'})
            try:
                with LOCK: set_notebook(path, (obj or {}).get('media'))
            except Exception as e: return self._json(400, {'ok': False, 'error': str(e)})
            return self._json(200, info())
        if u.path == '/api/snapshot': return self.snapshot(q)
        if u.path == '/api/vault': return self.vault()
        return self._json(404, {'ok': False})

    def media(self, q):
        mid = (q.get('id') or [''])[0]; ext = (q.get('ext') or [''])[0].lower()
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', mid) or ext not in EXTS: return self._json(400, {'ok': False, 'error': 'bad name'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 2 * 1024 ** 3: return self._json(400, {'ok': False, 'error': 'bad size'})
        d = images_dir(); os.makedirs(d, exist_ok=True)
        path = os.path.join(d, f'{mid}.{ext}')
        with open(path + '.part', 'wb') as f:
            left = n
            while left > 0:
                chunk = self.rfile.read(min(left, 1 << 20))
                if not chunk: break
                f.write(chunk); left -= len(chunk)
        os.replace(path + '.part', path)
        return self._json(200, {'ok': True, 'path': f'images/{mid}.{ext}'})

    def recording(self, q):
        """A recording from the app → recordings/<name>.<ext> in the notebook folder, then queued for the transcriber."""
        ext = (q.get('ext') or [''])[0].lower(); base = re.sub(r'[^A-Za-z0-9 _.()-]+', '', (q.get('name') or [''])[0]).strip(' .')[:90] or stamp()
        if ext not in REC_EXTS: return self._json(400, {'ok': False, 'error': 'not an audio file'})
        raw = self._body(4 * 1024 ** 3)
        if not raw: return self._json(400, {'ok': False, 'error': 'empty recording'})
        d = rec_dir(); name = f'{base}.{ext}'; k = 2
        while os.path.exists(os.path.join(d, name)): name = f'{base} ({k}).{ext}'; k += 1
        with open(os.path.join(d, name + '.part'), 'wb') as f: f.write(raw)
        os.replace(os.path.join(d, name + '.part'), os.path.join(d, name))
        job = STT.add(name, (q.get('lang') or [''])[0] or None) if (q.get('transcribe') or ['1'])[0] == '1' else {}
        return self._json(200, {'ok': True, 'file': name, 'path': 'recordings/' + name, 'bytes': len(raw), 'job': job, 'folder': d})

    def snapshot(self, q):
        raw, obj = self._obj()
        keep = (q.get('keep') or [''])[0]
        if raw is None or not isinstance(obj, dict) or 'stores' not in obj: return self._json(400, {'ok': False, 'error': 'not a Scientia export'})
        with LOCK:
            kept_dir = nb('.scientia', 'kept') or os.path.join(ROOT, 'backup')
            if keep:
                name = re.sub(r'[^A-Za-z0-9_-]+', '-', keep)[:40] or 'kept'
                atomic(os.path.join(kept_dir, f'{name}-{stamp()}.json'), raw); return self._json(200, {'ok': True, 'kept': kept_dir})
            if not notebook(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
            SYNC.ensure(); rec = nb('.scientia', 'record.json'); old = meta()
            if old and old.get('records', 0) > 20 and records(obj) < old['records'] * 0.5 and os.path.exists(rec):
                shutil.copy2(rec, os.path.join(kept_dir, f'before-shrink-{stamp()}.json'))
            if os.path.exists(rec): shutil.copy2(rec, os.path.join(kept_dir, f'before-replace-{stamp()}.json'))
            st = SYNC.replace(obj)
            m = {'savedAt': SYNC.saved_at, 'epoch': obj.get('epoch'), 'records': SYNC.records(), 'counts': obj.get('counts'), 'build': obj.get('build'), 'sid': st['sid'], 'syncSeq': st['seq']}
        return self._json(200, {'ok': True, 'meta': m})

    def vault(self):
        raw, obj = self._obj(512 * 1024 ** 2)
        if not isinstance(obj, dict): return self._json(400, {'ok': False, 'error': 'not JSON'})
        if not notebook(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
        with LOCK:
            mf = nb('.scientia', 'manifest.json'); man = load_json(mf, {}) or {}; wrote = removed = 0; root = os.path.normpath(notebook())
            for w in obj.get('writes') or []:
                p = vault_path(w.get('path'))
                if not p: continue
                atomic(p, str(w.get('content') or '').encode('utf-8')); man[w['path']] = w.get('hash') or ''; wrote += 1
            for rel in obj.get('deletes') or []:
                p = vault_path(rel)
                if not p or rel not in man: continue  # only files this app wrote
                try: os.remove(p)
                except FileNotFoundError: pass
                man.pop(rel, None); removed += 1
                d = os.path.dirname(p)
                while d.startswith(root + os.sep) and os.path.isdir(d) and not os.listdir(d):
                    os.rmdir(d); d = os.path.dirname(d)
            atomic(mf, json.dumps(man).encode('utf-8'))
        return self._json(200, {'ok': True, 'wrote': wrote, 'removed': removed})

srv = http.server.ThreadingHTTPServer(('', PORT), H)
if not os.environ.get('SIS_NOBROWSER'): threading.Timer(0.6, lambda: webbrowser.open(f'http://localhost:{PORT}/scientia.html')).start()
print(f'Scientia In Situ on http://localhost:{PORT}/scientia.html  (close this window to stop)')
print(f'Notebook folder: {notebook() or "not chosen yet — Settings → Notebook folder"}')
print('Other devices: Settings → Devices (phones and tablets pair with this computer)')
SYNC.ensure()
srv.serve_forever()
