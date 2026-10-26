"""Scientia In Situ <-> McGhee Lab cloud: keep the notebook on this computer and the online copy
(mcgheelab.com/rm/pages/scientia.html) as ONE record.  (McGhee Lab RM, V3.857)

Run it on the computer that runs Scientia (launch.bat / serve.py), with the app's window open:

    python3 scientia-cloud.py --key sck_...      once: saves the key made on the lab site (Desktop sync...)
    python3 scientia-cloud.py                    then: keeps syncing until you close this window
    python3 scientia-cloud.py --once             one pass and exit
    python3 scientia-cloud.py --prefer local     first run when BOTH sides already hold notes: this
    python3 scientia-cloud.py --prefer cloud       computer's notebook wins / the online notebook wins

What it does: it is a *device* of both hubs - the app's own serve.py here and the lab's cloud hub.
It pulls each side's changes and pushes them to the other with the same prev/base bookkeeping the
app's browser uses, so fields merge the same way and anything both sides changed waits under the
app's warning triangle, on whichever side you open. Images and recordings are copied both ways.
If one side's record is replaced (a file uploaded online; another notebook folder chosen here), that
side becomes the source and the other side follows - the replaced side keeps a copy first
(.scientia/kept/ here, a kept/ folder in the cloud).

Standard library only (Python 3.8+). Windows: `py scientia-cloud.py`. Stop with Ctrl+C.
"""
import argparse, json, os, secrets, sys, time, urllib.error, urllib.parse, urllib.request

HUB = os.environ.get('SIS_CLOUD_HUB', 'https://us-central1-mcgheelab-f56cc.cloudfunctions.net/scientiaHub')
LOCAL = os.environ.get('SIS_URL', 'http://127.0.0.1:%s' % os.environ.get('SIS_PORT', '8766'))
NOSYNC = {'journal', 'blobs', 'datasets'}
KEYS = {'profiles': 'type', 'journal': 'seq'}
MEDIA_MAX = 30 * 1024 ** 2
IMG_EXTS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg', 'mp4', 'webm', 'mov', 'm4v', 'avif', 'html', 'htm', 'pdf'}
REC_EXTS = {'webm', 'm4a', 'mp4', 'ogg', 'wav', 'mp3', 'aac'}


def cfg_path():
    if os.environ.get('SIS_CLOUD_CONFIG'): return os.environ['SIS_CLOUD_CONFIG']
    if os.name == 'nt': return os.path.join(os.environ.get('APPDATA') or os.path.expanduser('~'), 'ScientiaInSitu', 'cloud.json')
    return os.path.join(os.path.expanduser('~'), '.config', 'scientia-in-situ', 'cloud.json')


def load_cfg():
    try:
        with open(cfg_path(), encoding='utf-8') as f: return json.load(f)
    except Exception: return {}


def save_cfg(cfg):
    p = cfg_path(); os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.part'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(cfg, f, indent=1)
    os.replace(tmp, p)


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def key_of(store, rid): return store + '\x01' + str(rid)


class Side:
    """One hub (the local serve.py or the cloud function) as this bridge sees it."""
    def __init__(self, name, base, headers, conn, dev):
        self.name, self.base, self.headers, self.conn, self.dev = name, base.rstrip('/'), headers, conn, dev
        self.sid = None; self.seq = 0; self.shadow = {}; self.hello_ = None

    def _req(self, method, path, body=None, raw=None, q=None, timeout=60):
        url = self.base + '/' + path + ('?' + urllib.parse.urlencode(q) if q else '')
        data = raw if raw is not None else (json.dumps(body).encode('utf-8') if body is not None else None)
        req = urllib.request.Request(url, data=data, method=method)
        for k, v in self.headers.items(): req.add_header(k, v)
        if raw is not None: req.add_header('Content-Type', 'application/octet-stream')
        elif body is not None: req.add_header('Content-Type', 'application/json')
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, json.loads(r.read().decode('utf-8') or '{}')
        except urllib.error.HTTPError as e:
            try: return e.code, json.loads(e.read().decode('utf-8') or '{}')
            except Exception: return e.code, {'ok': False, 'error': 'HTTP %s' % e.code}

    def hello(self):
        st, j = self._req('GET', 'api/sync/hello', timeout=20)
        self.hello_ = j if st == 200 else None
        return self.hello_

    def state(self):
        st, j = self._req('GET', 'api/sync/state', q={'journal': '0'}, timeout=600)
        if st != 200 or 'stores' not in (j or {}): raise RuntimeError('%s: could not read the record (%s)' % (self.name, (j or {}).get('error') or st))
        return j

    def pull(self, wait=0):
        st, j = self._req('GET', 'api/sync/pull', q={'conn': self.conn, 'since': self.seq, 'sid': self.sid or '', 'wait': wait, 'c': -1}, timeout=wait + 30)
        if st == 401: raise PermissionError('%s: %s' % (self.name, (j or {}).get('error') or 'not allowed'))
        if st != 200: raise RuntimeError('%s: pull failed (%s)' % (self.name, (j or {}).get('error') or st))
        return j

    def push(self, ops, name='Sync bridge', any_sid=False):
        st, j = self._req('POST', 'api/sync/push', body={'sid': self.sid, 'anySid': any_sid, 'dev': self.dev, 'conn': self.conn, 'name': name, 'ops': ops}, timeout=120)
        if st == 401: raise PermissionError('%s: %s' % (self.name, (j or {}).get('error') or 'not allowed'))
        if st != 200: raise RuntimeError('%s: push failed (%s)' % (self.name, (j or {}).get('error') or st))
        return j

    def snapshot(self, data):
        st, j = self._req('POST', 'api/snapshot', body=data, timeout=600)
        if st != 200 or not j.get('ok'): raise RuntimeError('%s: replace refused (%s)' % (self.name, (j or {}).get('error') or st))
        return j.get('meta') or {}

    def adopt(self, rec_state):
        """Shadow + sid/seq from a full record."""
        self.shadow = {}
        for store, rows in (rec_state.get('stores') or {}).items():
            if store in NOSYNC: continue
            k = KEYS.get(store, 'id')
            for r in rows:
                if isinstance(r, dict) and r.get(k) is not None: self.shadow[key_of(store, r[k])] = r
        self.sid = rec_state.get('sid'); self.seq = int(rec_state.get('syncSeq') or 0)


def strip(data):
    out = dict(data); out['stores'] = {k: v for k, v in (data.get('stores') or {}).items() if k not in NOSYNC}
    out['counts'] = {k: len(v) for k, v in out['stores'].items()}
    return out


DEL = {'__deleted__': True}   # a row that is gone (internal marker)


class Realign(Exception): pass


class Bridge:
    """A device of BOTH hubs. The bridge keeps the record both sides agreed on last (the common
    ancestor, saved next to the config as shadow.json). Each pass: pull what changed on each
    side since the last pass, push every change to the other side with prev = the ancestor and
    base = that side's seq before the pass, so the receiving hub runs the same three-way merge
    it would run for a phone - and the merged value it echoes goes back where the change came
    from. Rows both sides changed converge the same way; fields both changed wait under the
    app's warning triangle on the side that noticed."""
    def __init__(self, cfg, prefer=None, interval=2.0):
        self.cfg, self.prefer, self.interval = cfg, prefer, interval
        sides = cfg.setdefault('sides', {})
        for n in ('local', 'cloud'):
            s = sides.setdefault(n, {}); s.setdefault('conn', 'bridge_' + secrets.token_hex(4))
        cfg.setdefault('dev', 'bridge_' + secrets.token_hex(5))
        self.L = Side('this computer', LOCAL, {}, sides['local']['conn'], cfg['dev'])
        self.C = Side('the cloud', HUB, {'X-Scientia-Key': cfg['key']}, sides['cloud']['conn'], cfg['dev'])
        self.shadow = {}; self.n = 0; self.dirty = False

    # ---------------- the common ancestor on disk ----------------
    def shadow_path(self): return os.path.join(os.path.dirname(cfg_path()), 'shadow.json')
    def load_shadow(self):
        try:
            with open(self.shadow_path(), encoding='utf-8') as f: return json.load(f)
        except Exception: return None
    def save_shadow(self):
        p = self.shadow_path(); tmp = p + '.part'
        with open(tmp, 'w', encoding='utf-8') as f: json.dump(self.shadow, f)
        os.replace(tmp, p); self.dirty = False
    def set_shadow_from(self, rec_state):
        self.shadow = {}
        for store, rows in (rec_state.get('stores') or {}).items():
            if store in NOSYNC: continue
            k = KEYS.get(store, 'id')
            for r in rows:
                if isinstance(r, dict) and r.get(k) is not None: self.shadow[key_of(store, r[k])] = r
        self.save_shadow()

    # ---------------- alignment: which record is the one ----------------
    def align(self):
        hl, hc = self.L.hello(), self.C.hello()
        if not hl: raise ConnectionError("Scientia is not running here - start it (launch.bat / serve.py) and keep its window open")
        if not hl.get('local'): raise ConnectionError('this script must run on the computer that runs Scientia')
        if not hl.get('notebook'): raise ConnectionError('choose a notebook folder in Scientia first (Settings -> Notebook folder)')
        if not hc: raise ConnectionError('the cloud hub did not answer - check your internet connection')
        if not hc.get('auth'): raise PermissionError('the cloud key is not valid any more - make a new one on the lab site (Desktop sync...) and run with --key')
        known = self.cfg['sides']
        kl, kc = known['local'].get('sid'), known['cloud'].get('sid')
        l_changed, c_changed = hl['sid'] != kl, hc['sid'] != kc
        if not l_changed and not c_changed:
            sh = self.load_shadow()
            if sh is None: raise SystemExit('The sync memory (shadow.json) is missing. Run once with --prefer local or --prefer cloud to start again from one side.')
            self.shadow = sh
            self.L.sid, self.C.sid = hl['sid'], hc['sid']
            self.L.seq, self.C.seq = int(known['local'].get('seq') or 0), int(known['cloud'].get('seq') or 0)
            for s in (self.L, self.C):
                if s.pull(0).get('reset'): raise SystemExit('%s no longer has the changes since the last sync (its history was trimmed). Run once with --prefer local or --prefer cloud.' % s.name)
            return
        lr, cr = int(hl.get('records') or 0), int(hc.get('records') or 0)
        if not kl and not kc:
            if cr == 0 and lr > 0: src, dst = self.L, self.C
            elif lr == 0 and cr > 0: src, dst = self.C, self.L
            elif lr == 0 and cr == 0: src = dst = None
            else: src, dst = self.pick(lr, cr)
        elif l_changed and not c_changed: src, dst = self.L, self.C
        elif c_changed and not l_changed: src, dst = self.C, self.L
        else: src, dst = self.pick(lr, cr)
        if src is None:
            self.L.sid, self.C.sid = hl['sid'], hc['sid']; self.L.seq, self.C.seq = int(hl.get('seq') or 0), int(hc.get('seq') or 0)
            self.set_shadow_from({'stores': {}})
        else:
            log('replacing the record on %s with the one on %s (%s records)' % (dst.name, src.name, src.hello_.get('records')))
            data = strip(src.state())
            meta = dst.snapshot(data)
            src.sid, src.seq = data.get('sid'), int(data.get('syncSeq') or 0)
            dst.sid, dst.seq = meta.get('sid'), int(meta.get('syncSeq') or 0)
            self.set_shadow_from(data)
        self.remember(); log('in step: this computer %s (seq %s) / the cloud %s (seq %s)' % (self.L.sid, self.L.seq, self.C.sid, self.C.seq))

    def pick(self, lr, cr):
        if self.prefer == 'local': return self.L, self.C
        if self.prefer == 'cloud': return self.C, self.L
        raise SystemExit('Both this computer (%d records) and the cloud (%d records) hold notes, and they are different records.\n'
                         'Decide once which one wins and run again:\n    --prefer local   this computer\'s notebook replaces the online one\n'
                         '    --prefer cloud   the online notebook replaces this computer\'s\n(The replaced side keeps a copy first.)' % (lr, cr))

    def remember(self):
        self.cfg['sides']['local'].update({'sid': self.L.sid, 'seq': self.L.seq})
        self.cfg['sides']['cloud'].update({'sid': self.C.sid, 'seq': self.C.seq})
        save_cfg(self.cfg)

    # ---------------- one pass ----------------
    def drain(self, side):
        """Everything that changed on `side` since the last pass: key -> rec (or DEL), last op wins."""
        out = {}
        while True:
            r = side.pull(0)
            if r.get('reset'): raise Realign(side.name)
            for o in r.get('ops') or []:
                if o['store'] in NOSYNC: continue
                out[key_of(o['store'], o['id'])] = DEL if o.get('del') else o['rec']
            side.seq = int(r.get('seq') or side.seq)
            if not r.get('more'): return out

    def push_batch(self, to, items, base, prev, name):
        """items: key -> value (rec or DEL); prev(key) -> what we believe `to` holds now.
        Returns key -> what `to` holds after the push (its echo, or what we sent)."""
        final = {}; keys = list(items)
        for i in range(0, len(keys), 400):
            part = keys[i:i + 400]; ops = []
            for k in part:
                store, rid = k.split('\x01', 1); v = items[k]; pv = prev(k)
                ops.append({'store': store, 'id': rid, 'rec': None if v is DEL else v, 'del': v is DEL, 'prev': None if pv is DEL else pv, 'base': base})
                final[k] = v
            r = to.push(ops, name)
            if r.get('reset'): raise Realign(to.name)
            if not r.get('ok'): raise RuntimeError('%s refused a push: %s' % (to.name, r.get('error')))
            for e in r.get('echo') or []: final[key_of(e['store'], e['id'])] = e['rec']
            if r.get('conflicts'): log('%s: %s to decide (open the app there and click the warning triangle)' % (to.name, r['conflicts']))
        return final

    def step(self):
        baseL, baseC = self.L.seq, self.C.seq
        newL, newC = self.drain(self.L), self.drain(self.C)
        if not newL and not newC: return
        anc = self.shadow.get
        # 1. the cloud's changes -> this computer, three-way against the record both sides agreed on last:
        #    a row both sides changed is merged HERE, and a field both changed waits under this computer's warning triangle
        resL = self.push_batch(self.L, newC, baseL, prev=anc, name='Online copy')
        # 2. this computer's changes, and what it made of the cloud's, -> the cloud, on top of what the cloud holds
        toC = {k: v for k, v in newL.items() if k not in newC}
        toC.update({k: resL[k] for k in newC if k in newL or resL[k] != newC[k]})
        resC = self.push_batch(self.C, toC, baseC, prev=lambda k: newC[k] if k in newC else anc(k), name='This computer')
        # 3. anything the cloud merged differently (it changed again meanwhile) -> back, once more each way at most
        toL2 = {k: resC[k] for k in toC if resC[k] != toC[k]}
        resL2 = self.push_batch(self.L, toL2, baseL, prev=lambda k: resL[k] if k in resL else newL.get(k, anc(k)), name='Online copy') if toL2 else {}
        toC2 = {k: resL2[k] for k in toL2 if resL2[k] != toL2[k]}
        resC2 = self.push_batch(self.C, toC2, baseC, prev=lambda k: resC.get(k), name='This computer') if toC2 else {}
        # the record both sides hold now
        final = {}
        for d in (newC, resL, newL, toC, resC, toL2, resL2, toC2, resC2): final.update(d)
        for k, v in final.items():
            if v is DEL: self.shadow.pop(k, None)
            else: self.shadow[k] = v
        self.save_shadow(); self.remember()
        if newC: log('%d change%s the cloud -> this computer' % (len(newC), '' if len(newC) == 1 else 's'))
        if toC: log('%d change%s this computer -> the cloud' % (len(toC), '' if len(toC) == 1 else 's'))

    # ---------------- media ----------------
    def folder(self):
        st, j = self.L._req('GET', 'api/notebook', timeout=20)
        return (j or {}).get('path') if st == 200 else None

    def sync_media(self):
        root = self.folder()
        if not root: return
        st, j = self.C._req('GET', 'api/media/list', timeout=60)
        if st != 200: return
        cloud = (j or {}).get('files') or {}
        up = down = 0
        for sub, exts in (('images', IMG_EXTS), ('recordings', REC_EXTS)):
            d = os.path.join(root, sub)
            local = set(os.listdir(d)) if os.path.isdir(d) else set()
            for name in sorted(local):
                rel = sub + '/' + name; ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
                if rel in cloud or ext not in exts or name.startswith('.') or name.endswith('.part'): continue
                p = os.path.join(d, name); size = os.path.getsize(p)
                if size > MEDIA_MAX: log('skipping %s (%.0f MB is over the 30 MB cloud limit)' % (rel, size / 1048576)); continue
                with open(p, 'rb') as f: raw = f.read()
                stem = name[:-(len(ext) + 1)]
                if sub == 'images': q, path = {'id': stem, 'ext': ext}, 'api/media'
                else: q, path = {'name': stem, 'ext': ext, 'transcribe': '0'}, 'api/rec'
                st2, r = self.C._req('POST', path, raw=raw, q=q, timeout=300)
                if st2 == 200 and r.get('ok'): up += 1; cloud[rel] = r.get('url')
                else: log('could not upload %s: %s' % (rel, (r or {}).get('error') or st2))
            os.makedirs(d, exist_ok=True)
            for rel, url in cloud.items():
                if not rel.startswith(sub + '/'): continue
                name = os.path.basename(rel)
                if name in local or not url: continue
                try:
                    with urllib.request.urlopen(url, timeout=300) as r: data = r.read()
                    tmp = os.path.join(d, name + '.part')
                    with open(tmp, 'wb') as f: f.write(data)
                    os.replace(tmp, os.path.join(d, name)); down += 1
                except Exception as e: log('could not download %s: %s' % (rel, e))
        if up or down: log('media: %d uploaded, %d downloaded' % (up, down))

    def run(self, once=False):
        self.align(); self.sync_media()
        while True:
            try:
                self.step(); self.n += 1
                if self.n % 30 == 0: self.sync_media()
            except Realign as e:
                log('%s was replaced - realigning' % e); self.align(); self.sync_media(); continue
            except (ConnectionError, urllib.error.URLError, TimeoutError, OSError) as e:
                log('waiting: %s' % e); time.sleep(10); continue
            if once: return
            time.sleep(self.interval)


def main():
    ap = argparse.ArgumentParser(description='Keep the Scientia notebook on this computer and the online copy as one record.')
    ap.add_argument('--key', help='the desktop sync key from the lab site (saved; needed once)')
    ap.add_argument('--once', action='store_true', help='one pass, then exit')
    ap.add_argument('--prefer', choices=['local', 'cloud'], help='when both sides hold different notebooks: which one wins')
    ap.add_argument('--interval', type=float, default=2.0, help='seconds between passes (default 2)')
    ap.add_argument('--forget', action='store_true', help='forget what was synced so far (next run aligns from scratch)')
    a = ap.parse_args()
    cfg = load_cfg()
    if a.forget:
        cfg.pop('sides', None); save_cfg(cfg)
        try: os.remove(os.path.join(os.path.dirname(cfg_path()), 'shadow.json'))
        except OSError: pass
        log('forgot the sync state')
    if a.key:
        if not a.key.startswith('sck_'): raise SystemExit('that does not look like a key (it starts with sck_)')
        cfg['key'] = a.key.strip(); save_cfg(cfg); log('key saved in ' + cfg_path())
    if not cfg.get('key'): raise SystemExit('No key yet. On the lab site open Lab Notebook -> Scientia -> Desktop sync..., make a key, then run:\n    python3 scientia-cloud.py --key sck_...')
    try: Bridge(cfg, prefer=a.prefer, interval=a.interval).run(once=a.once)
    except KeyboardInterrupt: log('stopped')
    except (ConnectionError, PermissionError) as e: raise SystemExit(str(e))


if __name__ == '__main__': main()
