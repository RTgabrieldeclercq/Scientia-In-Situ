"""Serve the app on its fixed origin with caching off, so a rebuilt scientia.html is always the one you see.

Your notebook folder (chosen in Settings → Notebook folder) holds everything you make:
  .scientia/record.json   the whole record — reloaded on launch, so a fresh copy of the app picks up where you left off
  .scientia/daily/        one copy per day (the last 90 are kept)
  .scientia/kept/         copies taken before anything destructive (a wipe, a load, a big shrink)
  images/                 images, GIFs, videos, PDFs and HTML pages you add
  <Project>/<Theme>/<Note>/<NN component>.md   one Markdown file per component, for Obsidian (written by the app)
The folder is remembered outside the app (in your user profile), so replacing the app never touches it.
"""
import http.server, json, os, re, shutil, socket, subprocess, sys, threading, time, urllib.error, urllib.request, webbrowser
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs, unquote, quote

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
# V3.928: this computer and the lab cloud. The lab site may ask whether this app runs here (and hand over a pairing code);
# only these pages may. The key the pairing gives this computer lives in cloud.json next to the config.
HUB = os.environ.get('SIS_CLOUD_HUB', 'https://us-central1-mcgheelab-f56cc.cloudfunctions.net/scientiaHub')
CLOUD_CFG = os.path.join(os.path.dirname(CONFIG), 'cloud.json')
LAB_ORIGINS = {'https://mcgheelab.com', 'https://www.mcgheelab.com'} | {o.strip() for o in os.environ.get('SIS_LAB_ORIGINS', '').split(',') if o.strip()}
APP_SEEN = [0.0]          # when a window of this app last asked this server for news (labsync paces by it)
PEN = [0.0]               # V3.949: when the pen's button was last pressed (pen-button/ScientiaPen.exe → /api/pen-button?press=1)
PEN_CV = threading.Condition()   # V3.957: a press wakes the app's waiting request at once (no polling)
# V3.929: the lab layer (rm/scientia/lab-mode.js, unchanged) runs in this app too. What it loads from the site: three RM
# scripts are bundled (vendor/rm/, copied by scripts/scientia_build.py); every other /rm/ address opens on the site.
SITE = os.environ.get('SIS_SITE', 'https://mcgheelab.com')
RM_BUNDLED = {'/rm/js/recorder-core.js', '/rm/js/speech-to-text.js', '/rm/js/stt-device-worker.js'}
# V3.944: a lab paper's PDF for the reader here comes from the lab's Storage through this server (the bucket answers
# pages on the lab site's address, not this one); only from there, and no bigger than this
RM_PDF_HOST = 'https://firebasestorage.googleapis.com/'
RM_PDF_MAX = 200 * 1024 ** 2
REC_RID = re.compile(r'^[A-Za-z0-9_-]{1,64}$')
# V3.929/935: an installed copy knows its version (VERSION.txt, written by the build); service.py keeps it up to date and
# says what it is doing in update.json next to the app folder (Settings → The lab shows it; "Check now" leaves update-now)
APP_VERSION = (open(os.path.join(ROOT, 'VERSION.txt'), encoding='utf-8').read().strip() if os.path.isfile(os.path.join(ROOT, 'VERSION.txt')) else None)
UPDATE_STATUS = os.path.join(os.path.dirname(ROOT), 'update.json')
def update_info():
    s = load_json(UPDATE_STATUS, None) if APP_VERSION else None
    out = {'version': APP_VERSION, 'auto': bool(s), 'download': SITE + '/rm/scientia/desktop/ScientiaInSitu-Windows.zip'}
    if s: out.update(state=s.get('state'), latest=s.get('latest'), checked=s.get('checked'), updatedAt=s.get('updatedAt'), message=s.get('message') or '')
    out['available'] = bool(s and s.get('latest') and s['latest'] != APP_VERSION)
    return out
def shutdown(code=0):
    """Stop now, after saving what is waiting to be saved (a change is saved 3 s after the last one)."""
    try:
        t = SYNC.timer
        if t and t.is_alive(): t.cancel(); SYNC.save_now()
    except Exception: pass
    os._exit(code)
OFFER = {}                # a pairing code the lab site handed over, waiting for the person to confirm here
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
try:   # V3.960: the mouse's own movement while the edge pan pushes against the screen's edge (Windows; see rawmouse.py)
    from rawmouse import RawMouse
    RAWM = RawMouse()
except Exception as e:
    RAWM = None; RAWM_ERR = 'raw mouse input is unavailable: %s' % e
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
    def copyfile(self, source, outputfile):
        # every byte, even when the browser reads slowly: the unbuffered socket file can write less than it is given,
        # and the stock copy drops the rest — a ~5 MB app page then never finishes loading
        while True:
            buf = source.read(1 << 16)
            if not buf: break
            self.connection.sendall(buf)
    def end_headers(self):
        if getattr(self, '_cors', None):   # V3.928: the lab site's own pages, on the two routes they call
            self.send_header('Access-Control-Allow-Origin', self._cors); self.send_header('Vary', 'Origin')
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
        b = body.encode('utf-8'); self.send_response(200); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.connection.sendall(b)
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
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.connection.sendall(body)   # whole, even when large
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

    # ---- V3.928: the lab site ↔ this computer ----
    def lab_origin(self):
        o = self.headers.get('Origin'); return o if o in LAB_ORIGINS else None
    def same_origin(self):
        o = self.headers.get('Origin'); return o is None or o in ('http://localhost:%d' % PORT, 'http://127.0.0.1:%d' % PORT)
    def do_OPTIONS(self):
        u = urlparse(self.path); o = self.lab_origin()
        if u.path not in ('/api/lab/ping', '/api/lab/offer') or not o or not self.is_local():
            self.send_response(403); self.send_header('Content-Length', '0'); self.end_headers(); return
        self._cors = o; self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true'); self.send_header('Access-Control-Max-Age', '600'); self.send_header('Content-Length', '0'); self.end_headers()
    def lab_get(self, p):
        if p == '/api/lab/ping':
            self._cors = self.lab_origin(); st = LABSYNC.snapshot()
            return self._json(200, {'ok': True, 'app': 'scientia-in-situ', 'version': APP_VERSION, 'port': PORT, 'notebook': bool(notebook()), 'connected': st['connected'], 'state': st['state']})
        if p == '/api/lab/status':
            if not self.is_local(): return self._json(403, {'ok': False})
            off = OFFER if OFFER and time.time() < OFFER.get('until', 0) else None
            return self._json(200, dict(LABSYNC.snapshot(), ok=True, notebook=notebook(), offer={'account': off['account'], 'from': off['origin']} if off else None, update=update_info()))
        return None
    def lab_post(self, p):
        if p == '/api/lab/offer':   # the lab site, signed in, hands over a pairing code; nothing happens until the person confirms here
            o = self.lab_origin()
            if not o or not self.is_local(): return self._json(403, {'ok': False, 'error': 'only from the lab site'})
            self._cors = o; _, obj = self._obj(1 << 16); obj = obj or {}
            if not str(obj.get('code') or '').strip(): return self._json(400, {'ok': False, 'error': 'no code'})
            OFFER.clear(); OFFER.update(code=str(obj['code']), account=obj.get('account') or {}, origin=o, until=time.time() + 600)
            return self._json(200, {'ok': True})
        if not self.is_local() or not self.same_origin(): return self._json(403, {'ok': False, 'error': 'only from this app, on this computer'})
        _, obj = self._obj(1 << 16); obj = obj or {}
        if p == '/api/lab/connect': return self._json(200, lab_connect(str(obj.get('code') or OFFER.get('code') or '')))
        if p == '/api/lab/choose': LABSYNC.choose(obj.get('prefer')); return self._json(200, {'ok': True})
        if p == '/api/lab/sync-now': LABSYNC.kick(); return self._json(200, {'ok': True})
        if p == '/api/lab/disconnect': return self._json(200, lab_disconnect())
        if p == '/api/lab/uninstall':
            r = lab_disconnect() if obj.get('forget', True) else {'ok': True}
            un = os.environ.get('SIS_UNINSTALL') or os.path.join(os.path.dirname(ROOT), 'uninstall.ps1')
            if not os.path.isfile(un): return self._json(200, {'ok': False, 'error': 'this copy of the app was not installed (no uninstaller next to it)'})
            subprocess.Popen(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', un, '-FromApp'], creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0) | getattr(subprocess, 'DETACHED_PROCESS', 0), close_fds=True)
            threading.Timer(1.0, shutdown).start()
            return self._json(200, dict(r, ok=True, uninstalling=True))
        if p == '/api/lab/quit': threading.Timer(0.5, shutdown).start(); return self._json(200, {'ok': True})
        if p == '/api/lab/update-check':   # service.py looks at once
            if not APP_VERSION: return self._json(200, {'ok': False, 'error': 'this copy is not installed — it is not updated on its own'})
            atomic(os.path.join(os.path.dirname(ROOT), 'update-now'), b'1'); return self._json(200, {'ok': True})
        return self._json(404, {'ok': False})

    def rm_asset(self, p, query):
        if p in RM_BUNDLED:
            f = os.path.join(ROOT, 'vendor', 'rm', os.path.basename(p))
            if os.path.isfile(f): return self._text(open(f, encoding='utf-8').read(), 'text/javascript; charset=utf-8')
        self.send_response(302); self.send_header('Location', SITE + p + ('?' + query if query else '')); self.send_header('Content-Length', '0'); self.end_headers()
    def rm_proxy(self, method, u):
        """V3.928/929: the lab layer's RM calls (inventory, tasks, members, protocols, …) go to the lab hub as this computer's key."""
        if not self.is_local(): return self._json(403, {'ok': False, 'error': 'only from the computer that runs the app'})
        key = (load_json(CLOUD_CFG, {}) or {}).get('key')
        if not str(key or '').startswith('sck_'): return self._json(200, {'ok': False, 'offline': True, 'error': 'this computer is not connected to the lab yet (Settings → The lab)'})
        body = self._body(64 * 1024 ** 2) if method == 'POST' else None
        hdr = {'X-Scientia-Key': key}
        if body is not None: hdr['Content-Type'] = self.headers.get('Content-Type') or 'application/json'
        try: code, data, ctype = hub_request(method, u.path + ('?' + u.query if u.query else ''), body, hdr, 120)
        except Exception as e: return self._json(200, {'ok': False, 'offline': True, 'error': 'the lab cloud did not answer (%s)' % (getattr(e, 'reason', None) or e)})
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.connection.sendall(data)
    def rm_pdf(self, q):
        """V3.944: an RM paper's PDF for Scientia's reader (23d): the hub says where it is, as this computer's key; this
        server fetches the file. The answer is the PDF itself, or {ok: false, error} saying why not."""
        if not self.is_local(): return self._json(403, {'ok': False, 'error': 'only from the computer that runs the app'})
        pid = (q.get('id') or [''])[0].strip()
        if not pid or len(pid) > 200: return self._json(400, {'ok': False, 'error': 'which paper?'})
        key = (load_json(CLOUD_CFG, {}) or {}).get('key')
        if not str(key or '').startswith('sck_'): return self._json(200, {'ok': False, 'offline': True, 'error': 'this computer is not connected to the lab yet (Settings → The lab)'})
        code = 0
        try:
            code, data, _ = hub_request('GET', '/api/rm/library/pdf?id=' + quote(pid, safe=''), None, {'X-Scientia-Key': key}, 60)
            r = json.loads(data.decode('utf-8') or '{}')
        except ValueError: return self._json(200, {'ok': False, 'error': 'the lab cloud answered HTTP %s' % code})
        except Exception as e: return self._json(200, {'ok': False, 'offline': True, 'error': 'the lab cloud did not answer (%s)' % (getattr(e, 'reason', None) or e)})
        url = str(r.get('url') or '')
        if not r.get('ok') or not url.startswith(RM_PDF_HOST): return self._json(200, {'ok': False, 'error': r.get('error') or 'no PDF in RM for this paper'})
        try:
            with urllib.request.urlopen(urllib.request.Request(url), timeout=120) as f: body = f.read(RM_PDF_MAX + 1)
        except urllib.error.HTTPError as e: return self._json(200, {'ok': False, 'error': 'the PDF did not download (HTTP %s)' % e.code})
        except Exception as e: return self._json(200, {'ok': False, 'offline': True, 'error': 'the PDF did not download (%s)' % (getattr(e, 'reason', None) or getattr(e, 'code', None) or e)})
        if len(body) > RM_PDF_MAX: return self._json(200, {'ok': False, 'error': 'the PDF is larger than 200 MB'})
        if b'%PDF' not in body[:1024]: return self._json(200, {'ok': False, 'error': 'what RM keeps for this paper is not a PDF'})
        self.send_response(200); self.send_header('Content-Type', 'application/pdf'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.connection.sendall(body)
    def pen_button(self, q):
        """V3.949: the pen's tail button (pen-button/ScientiaPen.exe, assigned in Windows Settings → Pen) says ?press=1; the app
        waits here (?wait=1&since=<last>, up to 25 s) for the next press."""
        g = lambda k: (q.get(k) or [''])[0]
        if g('press'):
            with PEN_CV: PEN[0] = time.time(); PEN_CV.notify_all()
            return self._json(200, {'ok': True, 'pressed': PEN[0]})
        if g('wait'):
            try: since = float(g('since') or 0)
            except ValueError: since = 0
            deadline = time.time() + 25
            with PEN_CV:
                while PEN[0] <= since:
                    left = deadline - time.time()
                    if left <= 0: break
                    PEN_CV.wait(left)   # V3.957: woken by the press itself, not a tenth of a second later
            return self._json(200, {'ok': True, 'pressed': PEN[0] if PEN[0] > since else 0})
        return self._json(200, {'ok': True, 'pressed': PEN[0]})
    def macros(self, q):
        """V3.947: macro files (.sis-macro.json) in the notebook folder's macros/ — the list, or one by name (Settings → Commands imports them)."""
        d = nb('macros'); name = (q.get('name') or [''])[0]
        if not d or not os.path.isdir(d): return self._json(200, {'ok': True, 'files': [], 'folder': d})
        files = sorted(f for f in os.listdir(d) if f.lower().endswith('.json') and not f.startswith('.'))
        if not name: return self._json(200, {'ok': True, 'files': files, 'folder': d})
        if name not in files: return self._json(404, {'ok': False, 'error': 'no such macro file'})
        return self._text(open(os.path.join(d, name), encoding='utf-8').read(), 'application/json; charset=utf-8')
    def rec_part(self, q):
        g = lambda k: (q.get(k) or [''])[0]
        rid, n, ext = g('rid'), g('n'), g('ext').lower()
        if not REC_RID.match(rid) or not n.isdigit() or int(n) >= 10000 or ext not in REC_EXTS: return self._json(400, {'ok': False, 'error': 'bad part'})
        raw = self._body(64 * 1024 ** 2)
        if not raw: return self._json(400, {'ok': False, 'error': 'empty part'})
        d = os.path.join(rec_dir(), '.parts', rid); os.makedirs(d, exist_ok=True)
        atomic(os.path.join(d, '%05d.%s' % (int(n), ext)), raw)
        return self._json(200, {'ok': True, 'rid': rid, 'n': int(n), 'bytes': len(raw)})
    def rec_parts_of(self, rid):
        d = os.path.join(rec_dir(), '.parts', rid)
        return sorted(os.path.join(d, f) for f in os.listdir(d) if not f.endswith('.part')) if REC_RID.match(rid) and os.path.isdir(d) else []
    def rec_compose(self, q):
        """The parts of a recording, in order, joined into recordings/<name>.<ext> (named as the app's own recorder names them)."""
        g = lambda k: (q.get(k) or [''])[0]
        rid, ext = g('rid'), g('ext').lower()
        if not REC_RID.match(rid) or ext not in REC_EXTS: return self._json(400, {'ok': False, 'error': 'bad recording'})
        parts = self.rec_parts_of(rid)
        if not parts: return self._json(200, {'ok': False, 'error': 'nothing left to join'})
        base = re.sub(r'[^A-Za-z0-9 _.()-]+', '', g('name')).strip(' .')[:90] or stamp()
        d = rec_dir(); name = f'{base}.{ext}'; k = 2
        while os.path.exists(os.path.join(d, name)): name = f'{base} ({k}).{ext}'; k += 1
        total = 0
        with open(os.path.join(d, name + '.part'), 'wb') as out:
            for f in parts:
                with open(f, 'rb') as x: b = x.read(); out.write(b); total += len(b)
        os.replace(os.path.join(d, name + '.part'), os.path.join(d, name))
        shutil.rmtree(os.path.join(d, '.parts', rid), ignore_errors=True)
        return self._json(200, {'ok': True, 'file': name, 'path': 'recordings/' + name, 'bytes': total, 'parts': len(parts), 'job': {}, 'folder': d, 'url': 'recordings/' + name})

    def do_GET(self):
        u = urlparse(self.path); p = u.path; q = parse_qs(u.query)
        if p.startswith('/rm/') and self.is_local(): return self.rm_asset(p, u.query)
        if p == '/api/rm-pdf': return self.rm_pdf(q)
        if p == '/api/macros' and self.is_local(): return self.macros(q)
        if p == '/api/pen-button' and self.is_local(): return self.pen_button(q)
        if p == '/api/edge-push' and self.is_local(): return self._json(200, RAWM.read() if RAWM else {'ok': False, 'error': RAWM_ERR})
        if p.startswith('/api/rm/'): return self.rm_proxy('GET', u)
        if p == '/api/rec/parts' and self.is_local():
            parts = self.rec_parts_of((q.get('rid') or [''])[0]); return self._json(200, {'ok': True, 'parts': len(parts), 'bytes': sum(os.path.getsize(f) for f in parts)})
        if p.startswith('/api/lab/') and self.is_local():
            r = self.lab_get(p)
            if r is not None or p in ('/api/lab/ping', '/api/lab/status'): return
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
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.connection.sendall(body); return
        if p == '/api/sync/pull':
            if not SYNC.ensure(): return self._json(409, {'ok': False, 'error': 'no notebook folder'})
            g = lambda k, d='': (q.get(k) or [d])[0]
            if g('conn') and g('conn') != LABSYNC.local_conn(): APP_SEEN[0] = time.time()
            return self._json(200, SYNC.pull(g('conn'), int(g('since', '0') or 0), g('sid'), float(g('wait', '0') or 0), int(g('c', '-1') or -1)))
        if p == '/api/sync/conflicts': SYNC.ensure(); return self._json(200, {'ok': True, 'conflicts': SYNC.conflicts})
        if p == '/api/pair/status':
            st, tok = SYNC.status((q.get('req') or [''])[0])
            body = json.dumps(dict(st, ok=True)).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body)))
            if tok: self.send_header('Set-Cookie', f'sis_tok={tok}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax')
            self.end_headers(); self.connection.sendall(body); return
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
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.connection.sendall(body); return
        if p == '/api/vault':
            return self._json(200, {'ok': True, 'files': list((load_json(nb('.scientia', 'manifest.json') or '', {}) or {}).items())})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path.startswith('/api/lab/'): return self.lab_post(u.path) if self.is_local() else self._json(403, {'ok': False})
        if u.path.startswith('/api/rm/'): return self.rm_proxy('POST', u)
        if u.path == '/api/rec/part' and self.gate(u.path, True): return self.rec_part(q)
        if u.path == '/api/rec/compose' and self.gate(u.path, True): return self.rec_compose(q)
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

import labsync
HUB_CONN = labsync.HubConn(HUB) if HUB.startswith('https://') else None   # V3.929: kept open (a fresh one often hung here)

def hub_request(method, path, data=None, headers=None, timeout=60):
    """(status, bytes, content type) from the lab hub."""
    if HUB_CONN: return HUB_CONN.request(method, path, data, headers or {}, timeout)
    req = urllib.request.Request(HUB + path, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return r.status, r.read(), r.headers.get('Content-Type') or 'application/json'
    except urllib.error.HTTPError as e: return e.code, e.read(), e.headers.get('Content-Type') or 'application/json'

def lab_call(path, body, key=None, timeout=30):
    hdr = {'Content-Type': 'application/json'}
    if key: hdr['X-Scientia-Key'] = key
    try:
        code, data, _ = hub_request('POST', path, json.dumps(body).encode('utf-8'), hdr, timeout)
        return json.loads(data.decode('utf-8') or '{}')
    except ValueError: return {'ok': False, 'error': 'HTTP %s' % code}
    except Exception as e: return {'ok': False, 'error': 'the lab cloud did not answer (%s)' % (getattr(e, 'reason', None) or e)}

def lab_connect(code):
    """Redeem a pairing code for this computer's own key. Same account as before: the sync memory stays. Another account:
    it starts afresh (and asks which notes win if both sides hold some)."""
    if not code: return {'ok': False, 'error': 'no pairing code — open Scientia from the lab site, or type the code shown there'}
    name = ('%s (%s)' % (socket.gethostname(), 'Windows' if os.name == 'nt' else sys.platform))[:40]
    r = lab_call('/api/cloud/pair/claim', {'code': code, 'name': name})
    if not r.get('ok') or not str(r.get('key') or '').startswith('sck_'): return {'ok': False, 'error': r.get('error') or 'the lab cloud refused the code'}
    cfg = load_json(CLOUD_CFG, {}) or {}
    uid = lambda k: (str(k or '').split('_') + ['', ''])[1]
    if uid(cfg.get('key')) != uid(r['key']):
        cfg = {}
        try: os.remove(os.path.join(os.path.dirname(CLOUD_CFG), 'shadow.json'))
        except FileNotFoundError: pass
    cfg.update(key=r['key'], account=r.get('account') or {}, computer=name, keyId=r.get('keyId'))
    atomic(CLOUD_CFG, json.dumps(cfg, indent=1).encode('utf-8'))
    OFFER.clear(); LABSYNC.kick()
    return {'ok': True, 'account': cfg['account'], 'computer': name}

def lab_disconnect():
    """This computer leaves the lab cloud: its key is removed there (best effort) and here. Notes stay in the folder."""
    cfg = load_json(CLOUD_CFG, {}) or {}
    key = cfg.get('key'); res = lab_call('/api/cloud/key/self/remove', {}, key=key) if key else {'ok': True}
    for k in ('key', 'keyId', 'sides', 'dev'): cfg.pop(k, None)
    atomic(CLOUD_CFG, json.dumps(cfg, indent=1).encode('utf-8'))
    try: os.remove(os.path.join(os.path.dirname(CLOUD_CFG), 'shadow.json'))
    except FileNotFoundError: pass
    LABSYNC.kick()
    return {'ok': True, 'revoked': bool(res.get('ok'))}

def _local_state():
    with SYNC.lock: return SYNC.export('state')
LABSYNC = labsync.LabSync(PORT, CLOUD_CFG, lambda: time.time() - APP_SEEN[0] < 45, _local_state, HUB_CONN)

class Server(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)): return
        super().handle_error(request, client_address)

srv = Server(('', PORT), H)
if not os.environ.get('SIS_NOBROWSER'): threading.Timer(0.6, lambda: webbrowser.open(f'http://localhost:{PORT}/scientia.html')).start()
print(f'Scientia In Situ on http://localhost:{PORT}/scientia.html  (close this window to stop)')
print(f'Notebook folder: {notebook() or "not chosen yet — Settings → Notebook folder"}')
print('Other devices: Settings → Devices (phones and tablets pair with this computer)')
SYNC.ensure()
LABSYNC.start()   # V3.928: in step with the lab cloud for as long as this server runs
srv.serve_forever()
