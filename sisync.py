"""Sync between devices for Scientia In Situ (used by serve.py).

The server on your computer holds the notebook's record in memory and is its single writer:
  - every device (this computer's browser too) sends its changes record by record (push) and
    receives everyone else's (pull, a long poll), so all devices converge on one record;
  - .scientia/record.json is written from it a few seconds after each change (plus a daily copy),
    with .scientia/ops.jsonl holding the changes since, so nothing is lost if the server stops;
  - when two devices changed the same record before seeing each other's change, the fields that
    only one side changed merge on their own; fields both changed become a conflict you decide
    (kept in .scientia/conflicts.json) — nothing is overwritten silently.
Paired devices (other than this computer) are in devices.json next to the app's config, with their
tokens hashed; a device is allowed in only after you approve it on this computer.
"""
import copy, hashlib, json, os, secrets, threading, time

KEYS = {'profiles': 'type', 'journal': 'seq'}
NOSYNC = {'journal', 'blobs', 'datasets'}          # local to a device: undo history, browser blobs, folder handles
AUTO_MAX = {'modified', 'heartbeat', 'touched', 'updated', 'lastSeen', 'lastOpened', 'savedAt'}
MISSING = object()
MAX_OPS = 50000


def iso_local():
    return time.strftime('%Y-%m-%dT%H:%M:%S')


def scalar_list(v):
    return isinstance(v, list) and all(isinstance(x, (str, int, float)) for x in v)


def merge3(prev, mine, cur):
    """Three-way merge of one record. Returns (merged, [keys both sides changed differently])."""
    if not isinstance(prev, dict): prev = {}
    out, bad = dict(cur), []
    for k in set(mine) | set(cur) | set(prev):
        m, c, p = mine.get(k, MISSING), cur.get(k, MISSING), prev.get(k, MISSING)
        if m == c or m == p: continue          # same, or only the other side changed it
        if c == p:                              # only this side changed it
            if m is MISSING: out.pop(k, None)
            else: out[k] = m
            continue
        if k in AUTO_MAX and isinstance(m, str) and isinstance(c, str): out[k] = max(m, c); continue
        if scalar_list(m) and scalar_list(c) and (p is MISSING or scalar_list(p)):
            pl = p if p is not MISSING else []
            out[k] = [x for x in c if not (x in pl and x not in m)] + [x for x in m if x not in c and x not in pl]
            continue
        bad.append(k)
    return out, bad


class Sync:
    def __init__(self, nb, atomic, load_json, config_dir):
        self.nb, self.atomic, self.load_json = nb, atomic, load_json
        self.devfile = os.path.join(config_dir, 'devices.json')
        self.lock = threading.RLock(); self.cv = threading.Condition(self.lock)
        self.root = None; self.stores = {}; self.meta = {}; self.sid = None; self.seq = 0; self.min_seq = 0
        self.ops = []; self.ver = {}; self.conflicts = []; self.jseq = 0; self.timer = None; self.last_daily = 0
        self.has_record = False; self.saved_at = None
        self.dev = self.load_json(self.devfile, None) or {'devices': [], 'codes': [], 'requests': []}
        self._seen_save = 0

    # ---------------- the record ----------------
    def ensure(self):
        root = self.nb()
        with self.lock:
            if root != self.root: self.load(root)
        return root is not None

    def load(self, root):
        self.root = root; self.stores = {}; self.meta = {}; self.ops = []; self.ver = {}; self.conflicts = []
        self.seq = self.min_seq = self.jseq = 0; self.has_record = False; self.saved_at = None
        if not root: self.sid = None; return
        sj = self.load_json(self.nb('.scientia', 'sync.json'), None) or {}
        self.sid = sj.get('sid') or secrets.token_hex(6)
        rec = self.load_json(self.nb('.scientia', 'record.json'), None)
        if isinstance(rec, dict) and isinstance(rec.get('stores'), dict):
            self._set_record(rec)
            if rec.get('sid') and rec.get('sid') != self.sid: self.sid = rec['sid']
        # changes made after the last write of record.json
        opsf = self.nb('.scientia', 'ops.jsonl')
        if opsf and os.path.exists(opsf):
            with open(opsf, encoding='utf-8') as f:
                for line in f:
                    try: op = json.loads(line)
                    except Exception: continue
                    if op.get('sid') != self.sid or op.get('seq', 0) <= self.seq: continue
                    self._apply_raw(op['store'], op['id'], op.get('rec'), op.get('del'))
                    self.seq = op['seq']; self.ops.append(op); self.ver[(op['store'], op['id'])] = (op['seq'], op.get('dev'))
        self.conflicts = self.load_json(self.nb('.scientia', 'conflicts.json'), None) or []
        self.atomic(self.nb('.scientia', 'sync.json'), json.dumps({'sid': self.sid}).encode())

    def _set_record(self, rec):
        self.stores = {}
        for n, rows in (rec.get('stores') or {}).items():
            k = KEYS.get(n, 'id'); self.stores[n] = {r.get(k): r for r in rows if isinstance(r, dict) and r.get(k) is not None}
        self.meta = {k: v for k, v in rec.items() if k not in ('stores', 'counts')}
        self.seq = self.min_seq = int(rec.get('syncSeq') or 0)
        self.jseq = max([int(x) for x in self.stores.get('journal', {}).keys() if isinstance(x, (int, float))] or [0])
        self.has_record = True; self.saved_at = rec.get('savedAt')

    def _apply_raw(self, store, rid, rec, delete):
        s = self.stores.setdefault(store, {})
        if delete: s.pop(rid, None)
        else: s[rid] = rec

    def records(self):
        return sum(len(v) for k, v in self.stores.items() if k not in ('journal', 'settings', 'profiles'))

    def export(self, reason='sync'):
        out = dict(self.meta)
        out.update({'app': 'Scientia In Situ', 'stores': {n: list(v.values()) for n, v in self.stores.items()}, 'reason': reason,
                    'savedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()), 'syncSeq': self.seq, 'sid': self.sid})
        out['counts'] = {n: len(v) for n, v in out['stores'].items()}
        return out

    def replace(self, obj):
        """A whole record from a device (connecting a notebook, keeping a browser's data): every device starts again from it."""
        with self.lock:
            self._set_record(obj)
            self.sid = secrets.token_hex(6); self.seq = self.min_seq = self.seq + 1
            self.ops = []; self.ver = {}; self.conflicts = []
            self.atomic(self.nb('.scientia', 'sync.json'), json.dumps({'sid': self.sid}).encode())
            self.save_now(); self.cv.notify_all()
            return {'sid': self.sid, 'seq': self.seq}

    def schedule(self):
        if self.timer: self.timer.cancel()
        self.timer = threading.Timer(3.0, self.save_now); self.timer.daemon = True; self.timer.start()

    def save_now(self):
        with self.lock:
            if not self.root: return None
            data = self.export(); raw = json.dumps(data).encode('utf-8')
            self.atomic(self.nb('.scientia', 'record.json'), raw)
            m = {'savedAt': data['savedAt'], 'epoch': data.get('epoch'), 'records': self.records(), 'counts': data['counts'], 'build': data.get('build'), 'syncSeq': self.seq, 'sid': self.sid}
            self.atomic(self.nb('.scientia', 'meta.json'), json.dumps(m).encode('utf-8'))
            self.saved_at = data['savedAt']; self.has_record = True
            if time.time() - self.last_daily > 900:
                daily = self.nb('.scientia', 'daily'); os.makedirs(daily, exist_ok=True)
                self.atomic(os.path.join(daily, f'scientia-{time.strftime("%Y-%m-%d")}.json'), raw); self.last_daily = time.time()
                days = sorted(x for x in os.listdir(daily) if x.endswith('.json'))
                for x in days[:-90]: os.remove(os.path.join(daily, x))
            opsf = self.nb('.scientia', 'ops.jsonl')
            if opsf and os.path.exists(opsf): os.remove(opsf)
            self.atomic(self.nb('.scientia', 'conflicts.json'), json.dumps(self.conflicts).encode('utf-8'))
            return m

    # ---------------- changes ----------------
    def _commit(self, store, rid, rec, delete, dev, conn, name):
        cur = self.stores.get(store, {}).get(rid)
        self._apply_raw(store, rid, rec, delete)
        self.seq += 1
        op = {'seq': self.seq, 'sid': self.sid, 'store': store, 'id': rid, 'rec': None if delete else rec, 'del': bool(delete), 'dev': dev, 'conn': conn, 'name': name, 'ts': iso_local()}
        self.ops.append(op); self.ver[(store, rid)] = (self.seq, dev)
        if len(self.ops) > MAX_OPS: self.ops = self.ops[-MAX_OPS:]; self.min_seq = self.ops[0]['seq'] - 1
        self.jseq += 1
        self.stores.setdefault('journal', {})[self.jseq] = {'seq': self.jseq, 'ts': op['ts'], 'store': store, 'id': rid, 'op': 'delete' if delete else ('put' if cur is not None else 'create'), 'prev': cur, 'group': 0, 'device': name}
        opsf = self.nb('.scientia', 'ops.jsonl')
        if opsf:
            with open(opsf, 'a', encoding='utf-8') as f: f.write(json.dumps(op) + '\n')
        return op

    def _conflict(self, kind, store, rid, fields, theirs, mine, dev, name):
        v = self.ver.get((store, rid)); other = next((o for o in reversed(self.ops) if o['store'] == store and o['id'] == rid), None)
        self.conflicts = [c for c in self.conflicts if not (c['store'] == store and c['id'] == rid)]
        self.conflicts.append({'cid': secrets.token_hex(5), 'type': kind, 'store': store, 'id': rid, 'fields': fields, 'theirs': theirs, 'mine': mine,
                               'theirsName': (other or {}).get('name') or 'another device', 'mineName': name, 'ts': iso_local()})
        self.atomic(self.nb('.scientia', 'conflicts.json'), json.dumps(self.conflicts).encode('utf-8'))
        self.cv.notify_all()

    def push(self, dev, conn, name, ops):
        echo, n = [], 0
        with self.lock:
            for o in ops or []:
                store, rid = o.get('store'), o.get('id')
                if store in NOSYNC or store is None or rid is None: continue
                cur = self.stores.get(store, {}).get(rid); base = int(o.get('base') or 0)
                v = self.ver.get((store, rid)); others = bool(v and v[0] > base and v[1] != dev) or (base < self.min_seq and o.get('prev') is not None and cur != o.get('prev'))
                if o.get('del'):
                    if cur is None: continue
                    if others and cur != o.get('prev'): self._conflict('delete', store, rid, [], cur, None, dev, name); continue
                    self._commit(store, rid, None, True, dev, conn, name); n += 1; continue
                rec = o.get('rec')
                if not isinstance(rec, dict) or rec == cur: continue
                if not others: self._commit(store, rid, rec, False, dev, conn, name); n += 1; continue
                if cur is None:   # someone deleted it meanwhile
                    self._conflict('deleted', store, rid, [], None, rec, dev, name); continue
                merged, bad = merge3(o.get('prev'), rec, cur)
                if bad: self._conflict('fields', store, rid, sorted(bad), cur, rec, dev, name)
                if merged != cur: self._commit(store, rid, merged, False, dev, conn, name); n += 1
                if merged != rec: echo.append({'store': store, 'id': rid, 'rec': merged, 'del': False})
            if n: self.schedule(); self.cv.notify_all()
            if echo or n == 0: pass
            return {'ok': True, 'sid': self.sid, 'seq': self.seq, 'echo': echo, 'conflicts': len(self.conflicts)}

    def pull(self, conn, since, sid, wait, known=-1):
        end = time.time() + max(0, min(wait, 25))
        with self.cv:
            if sid != self.sid or since < self.min_seq: return {'ok': True, 'reset': True, 'sid': self.sid, 'seq': self.seq}
            while True:
                news = [o for o in self.ops if o['seq'] > since and o.get('conn') != conn]
                left = end - time.time()
                if news or left <= 0 or (known >= 0 and len(self.conflicts) != known): break
                self.cv.wait(left)
                if sid != self.sid: return {'ok': True, 'reset': True, 'sid': self.sid, 'seq': self.seq}
            news = news[:3000]; head = news[-1]['seq'] if len(news) == 3000 else self.seq
            return {'ok': True, 'sid': self.sid, 'seq': head, 'more': len(news) == 3000, 'conflicts': len(self.conflicts),
                    'ops': [{'store': o['store'], 'id': o['id'], 'rec': o['rec'], 'del': o['del'], 'name': o.get('name')} for o in news]}

    def resolve(self, cid, pick, dev, name):
        with self.lock:
            c = next((x for x in self.conflicts if x['cid'] == cid), None)
            if not c: return {'ok': False, 'error': 'already decided'}
            self.conflicts = [x for x in self.conflicts if x['cid'] != cid]
            store, rid = c['store'], c['id']; cur = self.stores.get(store, {}).get(rid)
            if pick == 'mine':
                if c['type'] == 'delete': self._commit(store, rid, None, True, dev, None, name) if cur is not None else None
                elif c['type'] == 'deleted': self._commit(store, rid, c['mine'], False, dev, None, name)
                elif cur is not None:
                    rec = dict(cur)
                    for k in c['fields']:
                        if k in c['mine']: rec[k] = c['mine'][k]
                        else: rec.pop(k, None)
                    self._commit(store, rid, rec, False, dev, None, name)
            self.atomic(self.nb('.scientia', 'conflicts.json'), json.dumps(self.conflicts).encode('utf-8'))
            self.schedule(); self.cv.notify_all()
            return {'ok': True, 'conflicts': len(self.conflicts)}

    # ---------------- devices ----------------
    def _save_dev(self): self.atomic(self.devfile, json.dumps(self.dev, indent=1).encode('utf-8'))

    @staticmethod
    def _h(tok): return hashlib.sha256(tok.encode()).hexdigest()

    def device_for(self, tok):
        if not tok: return None
        h = self._h(tok)
        with self.lock:
            d = next((x for x in self.dev['devices'] if x['hash'] == h), None)
            if d and time.time() - self._seen_save > 60:
                d['lastSeen'] = iso_local(); self._seen_save = time.time(); self._save_dev()
            return d

    def new_code(self):
        with self.lock:
            now = time.time(); self.dev['codes'] = [c for c in self.dev.get('codes', []) if c['exp'] > now]
            code = ''.join(secrets.choice('0123456789') for _ in range(6))
            self.dev['codes'].append({'code': code, 'exp': now + 900}); self._save_dev()
            return {'code': code, 'expires': 900}

    def claim(self, code, name, ua):
        with self.lock:
            now = time.time(); code = ''.join(ch for ch in str(code or '') if ch.isdigit())
            if not any(c['code'] == code and c['exp'] > now for c in self.dev.get('codes', [])): return None
            req = {'req': secrets.token_hex(8), 'name': (str(name or '') or 'Device')[:40], 'ua': str(ua or '')[:160], 'ts': iso_local(), 'state': 'waiting', 'exp': now + 900}
            self.dev['requests'] = [r for r in self.dev.get('requests', []) if r['exp'] > now] + [req]; self._save_dev()
            return req['req']

    def pending(self):
        now = time.time()
        return [{'req': r['req'], 'name': r['name'], 'ua': r['ua'], 'ts': r['ts']} for r in self.dev.get('requests', []) if r['state'] == 'waiting' and r['exp'] > now]

    def decide(self, req, ok):
        with self.lock:
            r = next((x for x in self.dev.get('requests', []) if x['req'] == req), None)
            if not r: return False
            r['state'] = 'approved' if ok else 'denied'; self._save_dev(); return True

    def status(self, req):
        """The waiting device asks; once approved it gets its token (once)."""
        with self.lock:
            r = next((x for x in self.dev.get('requests', []) if x['req'] == req), None)
            if not r: return {'state': 'unknown'}, None
            if r['state'] != 'approved': return {'state': r['state']}, None
            tok = secrets.token_urlsafe(32); did = secrets.token_hex(5)
            self.dev['devices'].append({'id': did, 'name': r['name'], 'ua': r['ua'], 'hash': self._h(tok), 'created': iso_local(), 'lastSeen': iso_local()})
            self.dev['requests'] = [x for x in self.dev['requests'] if x['req'] != req]; self._save_dev()
            return {'state': 'approved', 'id': did, 'name': r['name']}, tok

    def devices(self):
        return [{k: d.get(k) for k in ('id', 'name', 'ua', 'created', 'lastSeen')} for d in self.dev['devices']]

    def remove(self, did):
        with self.lock:
            n = len(self.dev['devices']); self.dev['devices'] = [d for d in self.dev['devices'] if d['id'] != did]; self._save_dev()
            return len(self.dev['devices']) < n

    def rename(self, did, name):
        with self.lock:
            for d in self.dev['devices']:
                if d['id'] == did: d['name'] = str(name)[:40]
            self._save_dev()
