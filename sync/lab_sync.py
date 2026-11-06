#!/usr/bin/env python3
"""Bring the McGhee Lab's scientia/ into this repository, without the lab layer.

    python sync/lab_sync.py start [--lab PATH] [--at REF]   # carry the lab's changes since the last sync onto this branch
    python sync/lab_sync.py finish [--ok]                   # check, build, test, stage; record the sync in sync/state.json
    python sync/lab_sync.py push                            # push this branch, and the cut to the `lab` branch
    python sync/lab_sync.py scan [--all]                    # lab-looking lines this branch adds (--all: in the whole app)
    python sync/lab_sync.py cut --at REF --out DIR          # only the cut, to look at
    python sync/lab_sync.py init --at REF                   # once: say which cut this repository stands on

A cut is the lab's scientia/ at one of its commits, minus the lab's own files (DROP), plus the few changes that are always
the same (cut() below: the build line, .bat line endings, the DOI test's place, the board page vendored). The `lab` branch
here keeps one commit per cut. This repository is the last cut (sync/state.json) plus our edits that take the lab's
behaviour out. A sync carries the change from that cut to the new one onto this branch as a three-way merge (a cherry-pick),
so our edits stay wherever the lab did not touch them, and a conflict marks exactly where it did (diff3: ours, the old cut,
the new cut). Then every line the lab added that looks like the lab's (MARKERS, and the names its dropped files define)
is listed, to take out or keep. The lab's repository defaults to ../McGheeLabWebsite (or SIS_LAB_REPO).
"""
import datetime, importlib.util, io, json, os, re, shutil, socket, subprocess, sys, tarfile, tempfile, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(REPO, 'sync', 'state.json')
LAB_DEFAULT = os.environ.get('SIS_LAB_REPO') or os.path.join(os.path.dirname(REPO), 'McGheeLabWebsite')

# the lab's own files under scientia/: never here
DROP = {
    'CLAUDE.md', 'SETUP.md',                                   # the lab repository's working rules and access (ours: CLAUDE.md)
    'labsync.py', 'service.py', 'open_local.py',               # the lab cloud bridge, the installed service that updates from the lab site, scientia://
    'vendor/scientia_cloud.py',                                # the lab's desktop bridge
    'src/23b-labsync.js', 'src/23c-thiscomputer.js', 'src/23d-desktoplab.js', 'src/21c-labexport.js',
    'src/15c-portfolio-sync.js', 'src/13zzk-presence.js', 'src/23-presence.css',
}
DROP_DIRS = ('install/',)                                      # the installer the lab site hands out
# lab files outside scientia/ that come too, and where they go here
MAP = {'scripts/tests/scientia-doi-lookup.test.mjs': 'tests/doi-lookup.test.mjs'}
# ours alone: never in a cut, so a sync never touches them
OURS = ('.gitattributes', '.gitignore', 'CLAUDE.md', 'sync/')
# the lab's code kept on purpose, as copies (they run offline here)
COPIES = ('vendor/board/lab-board.html', 'vendor/rm/', 'vendor/page-layout.js', 'vendor/page-regions.js', 'vendor/wb-ink.js')
# not scanned: the copies, the other libraries and the fonts (minified, base64)
UNSCANNED = ('vendor/', 'fonts.css')
# lab-looking lines we keep (a notebook synced with the lab still opens here, say): "path<TAB>line"; finish --ok adds to it
KEPT = os.path.join(REPO, 'sync', 'kept.txt')
BOARD_NOTE = ('<!-- The McGhee Lab whiteboard (rm/pages/notebook-board.html with its engine inlined, unchanged), vendored for '
              'Scientia In Situ by sync/lab_sync.py. build.py puts the app\'s board/ files in at the three placeholders and '
              'writes board.html. -->\n')
# what the lab's behaviour looks like in a line
MARKERS = [
    (r'\bSIS_LAB\b', 'the lab layer (lab-mode.js): keep the branch without it'),
    (r'\bSIS_DESKTOP\b', "the lab's desktop build: here SYNC.local (a window on the computer that runs the app)"),
    (r'\bSIS_TARGET\b', "the lab's web/desktop switch: here there is one build"),
    (r'__sisCloud', "the lab's cloud layer (cloud-sync.js)"),
    (r'api/(?:rm|lab|cloud)/|api/rm-pdf|api/rec/(?:parts?|compose)\b', "a route only the lab's server or hub answers"),
    (r'lab-pills?\b', "the lab layer's pills"),
    (r'mcgheelab|scientiaHub|cloudfunctions\.net', "the lab's site or hub"),
    (r'cloud-sync|lab-mode|labsync|scientia[-_]cloud', 'a lab file'),
    (r"'rm-(?:read|report|ack)'", 'a message to the Lab Notebook around the web app'),
    (r'\bRM\b(?!\(| = \(\) =>)|My Week|Lab Notebook|\blab (?:site|cloud|hub|website|members?)\b', "words about the lab's site"),   # RM() is reduced motion
    (r'\brm[A-Z]\w*|\brm(?:paper|action|collection)\b|\binventoryId\b|\bmwsteps\b', 'a record only the lab writes'),
]


class Stop(Exception):
    pass


def run(args, cwd=REPO, ok=(0,), text=True, input=None, env=None):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=text, input=input, env=env, **({'encoding': 'utf-8', 'errors': 'replace'} if text else {}))
    if ok is not None and r.returncode not in ok:
        raise Stop('%s → %s' % (' '.join(args[:4]), ((r.stderr or r.stdout) if text else (r.stderr or b'').decode('utf-8', 'replace')).strip()[:800]))
    return r


def git(*a, cwd=REPO, ok=(0,), env=None, input=None):
    return run(['git', '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', *a], cwd=cwd, ok=ok, env=env, input=input)


def gitdir():
    return os.path.join(REPO, git('rev-parse', '--git-dir').stdout.strip())


PENDING = lambda: os.path.join(gitdir(), 'lab-sync.json')


def load(p, d=None):
    try:
        with open(p, encoding='utf-8') as f: return json.load(f)
    except FileNotFoundError: return d


def save(p, obj):
    with open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(json.dumps(obj, indent=1, ensure_ascii=False) + '\n')


def under(rel, prefixes):
    return any(rel == p or (p.endswith('/') and rel.startswith(p)) for p in prefixes)


def dropped(rel, here=False):
    """One of the lab's own files (here: in this repository, where our CLAUDE.md shares a name with the lab's)."""
    return (rel in DROP or rel.startswith(DROP_DIRS)) and not (here and under(rel, OURS))


# ---------------------------------------------------------------- the cut

def archive(lab, sha, paths, dest):
    """The files at these paths in the lab's commit, into dest (as they are in the repository)."""
    data = run(['git', 'archive', '--format=tar', sha, '--', *paths], cwd=lab, text=False).stdout
    with tarfile.open(fileobj=io.BytesIO(data)) as t:
        for m in t.getmembers():
            if not m.isfile(): continue
            out = os.path.join(dest, *m.name.split('/')); os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, 'wb') as f: f.write(t.extractfile(m).read())


def board_page(lab, sha, tmp):
    """vendor/board/lab-board.html: the lab's own build_board (scripts/scientia_build.py at that commit) on the lab's files
    at that commit, with the app's three board/ parts left as placeholders that build.py fills."""
    root = os.path.join(tmp, 'board-root')
    archive(lab, sha, ['scripts/scientia_build.py', 'rm/pages/notebook-board.html'], root)
    spec = importlib.util.spec_from_file_location('lab_scientia_build', os.path.join(root, 'scripts', 'scientia_build.py'))
    sb = importlib.util.module_from_spec(spec); spec.loader.exec_module(sb)
    page = open(sb.BOARD_PAGE, encoding='utf-8').read()
    refs = [m.group(2) for m in re.finditer(r'<(link)\b[^>]*\bhref="([^"]+)"[^>]*>', page) if 'stylesheet' in m.group(0)]
    refs += [m.group(2) for m in re.finditer(r'<(script)\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', page)]
    refs = sorted({r.lstrip('/').split('?')[0] for r in refs if not r.startswith('http') and r not in sb.BOARD_SKIP})
    if refs: archive(lab, sha, refs, root)
    own = os.path.join(tmp, 'board-own'); os.makedirs(own, exist_ok=True)
    for n, ph in (('board.css', '/*SIS-BOARD-CSS*/'), ('store.js', '/*SIS-BOARD-STORE*/'), ('pen.js', '/*SIS-BOARD-PEN*/')):
        with open(os.path.join(own, n), 'w', encoding='utf-8') as f: f.write(ph)
    sb.BOARD_DIR = own
    try: page = sb.build_board()
    except SystemExit: raise Stop("the lab's build_board stopped (its message is above): the board page changed shape")
    page, n = re.subn(r'<!-- Scientia \(V[^)]*\): built by scripts/scientia_build\.py[^\n]*-->\n', lambda m: BOARD_NOTE, page)
    if n != 1: raise Stop("the lab's board page no longer carries build_board's note: update board_page() in sync/lab_sync.py")
    for ph in ('/*SIS-BOARD-CSS*/', '/*SIS-BOARD-STORE*/', '/*SIS-BOARD-PEN*/'):
        if page.count(ph) != 1: raise Stop('board page: %s is not in it once' % ph)
    return page


def cut(lab, sha, out):
    """The cut of the lab's commit into out (empty). Returns (notes, names the dropped src files define)."""
    tmp = tempfile.mkdtemp(prefix='labcut-'); notes = []
    try:
        raw = os.path.join(tmp, 'raw'); archive(lab, sha, ['scientia'], raw); base = os.path.join(raw, 'scientia')
        names = set()
        for d, _, fs in os.walk(base):
            for f in fs:
                src = os.path.join(d, f); rel = os.path.relpath(src, base).replace(os.sep, '/')
                if dropped(rel):
                    if rel.startswith('src/') and rel.endswith('.js'):
                        names |= set(re.findall(r'^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', open(src, encoding='utf-8').read(), re.M))
                    continue
                dst = os.path.join(out, *rel.split('/')); os.makedirs(os.path.dirname(dst), exist_ok=True)
                data = open(src, 'rb').read()
                if rel.lower().endswith(('.bat', '.cmd')): data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')   # Windows wants CRLF
                with open(dst, 'wb') as f: f.write(data)
        for a, b in MAP.items():
            r = run(['git', 'show', '%s:%s' % (sha, a)], cwd=lab, text=False, ok=None)
            if r.returncode: notes.append('MAP: %s is not in the lab commit' % a); continue
            dst = os.path.join(out, *b.split('/')); os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as f: f.write(r.stdout)
        u = os.path.join(out, 'src', '01-util.js')   # the build line says which copy it is
        if os.path.isfile(u):
            s = open(u, encoding='utf-8', newline='').read()
            s2, n = re.subn(r"(const BUILD = '\d{4}-\d{2}-\d{2} · )(?!standalone)", r'\1standalone · ', s)
            if n: open(u, 'w', encoding='utf-8', newline='').write(s2)
            else: notes.append("src/01-util.js: BUILD is not 'YYYY-MM-DD · …' any more: 'standalone · ' was not added")
        page = board_page(lab, sha, tmp)
        bp = os.path.join(out, 'vendor', 'board', 'lab-board.html'); os.makedirs(os.path.dirname(bp), exist_ok=True)
        with open(bp, 'w', encoding='utf-8', newline='\n') as f: f.write(page)
        return notes, sorted(names)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def tree_of(d):
    """The git tree of a folder, written into this repository's objects."""
    idx = os.path.join(tempfile.mkdtemp(prefix='labidx-'), 'index')
    env = dict(os.environ, GIT_INDEX_FILE=idx)
    try:
        git('--work-tree=' + d, 'add', '-A', '-f', '.', env=env)
        return git('write-tree', env=env).stdout.strip()
    finally:
        shutil.rmtree(os.path.dirname(idx), ignore_errors=True)


def commit_tree(tree, parent, msg):
    return git('commit-tree', tree, *(['-p', parent] if parent else []), '-F', '-', input=msg).stdout.strip()


def lab_info(lab, ref):
    if not os.path.isdir(os.path.join(lab, '.git')): raise Stop("the lab's repository is not at %s (--lab PATH, or SIS_LAB_REPO)" % lab)
    sha = run(['git', 'rev-parse', '--verify', ref + '^{commit}'], cwd=lab).stdout.strip()
    subj = run(['git', 'log', '-1', '--format=%s', sha], cwd=lab).stdout.strip()
    return sha, subj


def cut_tree(lab, sha):
    d = tempfile.mkdtemp(prefix='labcut-out-')
    try:
        notes, names = cut(lab, sha, d)
        return tree_of(d), notes, names
    finally:
        shutil.rmtree(d, ignore_errors=True)


def has(obj):
    return git('cat-file', '-e', obj, ok=None).returncode == 0


def fetch_lab():
    git('fetch', '-q', 'origin', '+refs/heads/lab:refs/remotes/origin/lab', ok=None)
    r = git('rev-parse', '--verify', '-q', 'refs/remotes/origin/lab', ok=None)
    return r.stdout.strip() if r.returncode == 0 else None


# ---------------------------------------------------------------- the scan

def added_lines(diff):
    """(path, line number in the new side, text) for every added line of a -U0 diff."""
    path, n, out = None, 0, []
    for l in diff.splitlines():
        if l.startswith('+++ '): path = l[6:] if l.startswith('+++ b/') else None; continue
        m = re.match(r'@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@', l)
        if m: n = int(m.group(1)); continue
        if path and l.startswith('+'): out.append((path, n, l[1:])); n += 1
    return out


def markers(names):
    ms = [(re.compile(p), w) for p, w in MARKERS]
    if names: ms.append((re.compile(r'\b(?:%s)\b' % '|'.join(map(re.escape, names))), 'defined in a file the cut leaves out'))
    return ms


def kept():
    try: return {tuple(l.split('\t', 1)) for l in open(KEPT, encoding='utf-8').read().splitlines() if '\t' in l}
    except FileNotFoundError: return set()


def keep(hits):
    """These lines stay: written to sync/kept.txt, so neither a sync nor an audit lists them again (until the lab edits one)."""
    rows = kept() | {(path, text) for path, _, text, _ in hits}
    with open(KEPT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# Lines that look like the lab\'s and stay (sync/lab_sync.py): path<TAB>line. Remove a row to be asked again.\n')
        f.write(''.join('%s\t%s\n' % r for r in sorted(rows)))


def scan_lines(lines, names):
    hits, ok, ms = [], kept(), markers(names)
    for path, n, text in lines:
        if under(path, UNSCANNED) or under(path, OURS) or (path, text.strip()) in ok: continue
        why = [w for rx, w in ms if rx.search(text)]
        if why: hits.append((path, n, text.strip(), why))
    return hits


def show_hits(hits, head):
    if not hits: print(head + ': none'); return
    print('%s: %d line(s)' % (head, len(hits)))
    last = None
    for path, n, text, why in hits:
        if path != last: print('  ' + path); last = path
        print('    %5d  %s\n           ← %s' % (n, text[:170] + ('…' if len(text) > 170 else ''), '; '.join(why)))


def dropped_names(state):
    return (state or {}).get('names') or []


# ---------------------------------------------------------------- the steps

def cmd_init(a):
    lab = a.lab; sha, subj = lab_info(lab, a.at or 'HEAD')
    d = tempfile.mkdtemp(prefix='labcut-init-')
    try:
        notes, names = cut(lab, sha, d); tree = tree_of(d)
        for n in notes: print('note:', n)
        for c in COPIES:   # the copies are the cut's, byte for byte
            src = os.path.join(d, *c.rstrip('/').split('/'))
            dst = os.path.join(REPO, *c.rstrip('/').split('/'))
            if os.path.isdir(src): shutil.rmtree(dst, ignore_errors=True); shutil.copytree(src, dst)
            elif os.path.isfile(src): shutil.copyfile(src, dst)
    finally:
        shutil.rmtree(d, ignore_errors=True)
    save(STATE, {'lab': {'commit': sha, 'subject': subj, 'date': datetime.date.today().isoformat()}, 'cut': tree, 'names': names})
    save(PENDING(), {'stage': 'ready', 'lab_repo': lab, 'commit': sha, 'subject': subj, 'cut': tree, 'names': names})
    print('This repository stands on the cut of the lab\'s %s (%s): tree %s.' % (sha[:7], subj, tree[:10]))
    print('What our edits are (the cut → this tree):')
    git('add', '-A')
    print(git('diff', '--cached', '--stat=160', commit_tree(tree, None, 'the cut')).stdout.rstrip() or '  nothing')
    print('Commit, then: python sync/lab_sync.py push')


def cmd_start(a):
    if git('status', '--porcelain', '--untracked-files=no').stdout.strip(): raise Stop('this working tree has changes: commit or put them away first')
    p = load(PENDING())
    if p and not a.again:
        raise Stop('a sync is under way here: finish it (or git reset --hard, then start --again)' if p.get('stage') == 'started' else
                   "the last sync's cut is not on the lab branch yet: push first (or start --again to leave it off)")
    state = load(STATE)
    if not state: raise Stop('no sync/state.json: run init once')
    lab = a.lab; sha, subj = lab_info(lab, a.at or 'HEAD')
    fetch_lab()   # the cuts recorded so far, the last one among them
    base = state['cut']
    if not has(base):   # a clone without the lab branch: the cut again, from the lab commit it was made of
        print('the last cut (%s) is not here: cutting the lab\'s %s again' % (base[:10], state['lab']['commit'][:7]))
        again, _, _ = cut_tree(lab, state['lab']['commit'])
        if again != base: raise Stop('the cut of %s is %s now, not %s: fetch the lab branch (git fetch origin lab)' % (state['lab']['commit'][:7], again[:10], base[:10]))
    tree, notes, names = cut_tree(lab, sha)
    for n in notes: print('note:', n)
    if tree == base: print('Nothing new from the lab: the cut of %s is the one this branch stands on.' % sha[:7]); return
    b = commit_tree(base, None, 'the last cut')
    t = commit_tree(tree, b, "The lab's scientia/ at %s: %s" % (sha[:7], subj))
    save(PENDING(), {'stage': 'started', 'lab_repo': lab, 'commit': sha, 'subject': subj, 'cut': tree, 'names': names})
    r = git('-c', 'merge.conflictStyle=diff3', 'cherry-pick', '--no-commit', t, ok=None)
    conflicts = git('diff', '--name-only', '--diff-filter=U').stdout.split('\n')
    conflicts = [c for c in conflicts if c]
    for rel in git('ls-files').stdout.splitlines():
        if dropped(rel, True): git('rm', '-q', '-f', '--', rel); print('removed (the lab\'s own):', rel)
    print("\nCarried the lab's %s (%s), from the cut of %s." % (sha[:7], subj, state['lab']['commit'][:7]))
    print(git('diff', '--stat=160', b, t).stdout.rstrip())
    added = [l for l in git('diff', '--name-only', '--diff-filter=A', b, t).stdout.splitlines() if l]
    if added: print('\nNew files from the lab (are they the app, or the lab\'s?):\n  ' + '\n  '.join(added))
    if conflicts: print('\nCONFLICTS (diff3: ours ||||||| the old cut ======= the new cut): resolve each, keeping our side where it took the lab out\n  ' + '\n  '.join(conflicts))
    elif r.returncode: print(r.stdout + r.stderr)
    show_hits(scan_lines(added_lines(git('diff', '-U0', b, t).stdout), names), "\nLines the lab added that look like the lab's (their line in the new cut)")
    print('\nThen: python sync/lab_sync.py finish')


def base_ref():
    for r in ('origin/main', 'main'):
        m = git('merge-base', 'HEAD', r, ok=None)
        if m.returncode == 0: return m.stdout.strip()
    raise Stop('no main to compare with')


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def chrome():
    for c in (os.environ.get('SIS_CHROME'), r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'):
        if c and os.path.isfile(c): return c
    return shutil.which('google-chrome') or shutil.which('chromium')


def smoke():
    """The built app, served by serve.py on a spare port with settings of its own, opened in a headless browser: any
    uncaught error while it starts (a name from a file the cut left out, say) fails the sync."""
    ch = chrome()
    if not ch: print('smoke: no Chrome or Edge found — skipped'); return True
    tmp = tempfile.mkdtemp(prefix='labsmoke-'); port = free_port()
    env = dict(os.environ, SIS_PORT=str(port), SIS_NOBROWSER='1', SIS_CONFIG=os.path.join(tmp, 'config.json'))
    srv = subprocess.Popen([sys.executable, 'serve.py'], cwd=REPO, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for _ in range(60):
            try: urllib.request.urlopen('http://127.0.0.1:%d/' % port, timeout=1).read(1); break
            except Exception: time.sleep(0.25)
        else: print('smoke: serve.py did not answer'); return False
        r = subprocess.run(['node', os.path.join(REPO, 'sync', 'smoke.mjs'), 'http://localhost:%d/scientia.html' % port, ch, os.path.join(tmp, 'profile'), str(free_port())],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        try: j = json.loads(r.stdout.strip().splitlines()[-1])
        except Exception: print('smoke:', (r.stdout + r.stderr)[-600:]); return False
        for e in j['exceptions']: print('smoke: uncaught:', e)
        for e in j['errors']: print('smoke: console error (look, not a failure):', e)
        if not j['header']: print('smoke: the app did not draw its header (#hd)')
        print('smoke: the app started in a headless browser' + ('' if j['ok'] else ' — NOT cleanly'))
        return j['ok']
    finally:
        srv.terminate()
        try: srv.wait(5)
        except Exception: srv.kill()
        shutil.rmtree(tmp, ignore_errors=True)


def cmd_finish(a):
    p = load(PENDING())
    if not p: raise Stop('no sync under way: start one')
    if git('diff', '--name-only', '--diff-filter=U').stdout.strip(): raise Stop('unresolved: ' + git('diff', '--name-only', '--diff-filter=U').stdout.strip())
    git('add', '-A')
    left = []
    for rel in git('diff', '--cached', '--name-only', 'HEAD').stdout.splitlines():
        f = os.path.join(REPO, *rel.split('/'))
        if not os.path.isfile(f): continue
        try: s = open(f, encoding='utf-8').read()
        except UnicodeDecodeError: continue
        if re.search(r'^(<<<<<<<|\|\|\|\|\|\|\||>>>>>>>) |^=======$', s, re.M): left.append(rel)
    if left: raise Stop('conflict markers are still in: ' + ', '.join(left))
    there = [r for r in git('ls-files').stdout.splitlines() if dropped(r, True)]
    if there: raise Stop('the lab\'s own files are here: ' + ', '.join(there))
    hits = scan_lines(added_lines(git('diff', '--cached', '-U0', 'HEAD').stdout), p.get('names'))
    show_hits(hits, "Lines this sync adds that look like the lab's")
    if hits and not a.ok: raise Stop('look at each: take it out, or keep it (a word about the lab that is true here, say) and run finish --ok')
    if hits: keep(hits); git('add', '--', 'sync/kept.txt')
    save(STATE, {'lab': {'commit': p['commit'], 'subject': p['subject'], 'date': datetime.date.today().isoformat()}, 'cut': p['cut'], 'names': p.get('names') or []})
    git('add', '--', 'sync/state.json')
    p['stage'] = 'ready'; save(PENDING(), p)
    b = run([sys.executable, 'build.py'], ok=None)
    print(b.stdout.strip() + (b.stderr.strip() and '\n' + b.stderr.strip()))
    if b.returncode: raise Stop('build.py failed')
    for t in sorted(os.listdir(os.path.join(REPO, 'tests'))) if os.path.isdir(os.path.join(REPO, 'tests')) else []:
        if t.endswith('.test.mjs'):
            r = run(['node', os.path.join('tests', t)], ok=None)
            print('%s: %s' % (t, (r.stdout.strip().splitlines() or ['(no output)'])[-1]))
            if r.returncode: raise Stop('%s failed:\n%s' % (t, (r.stdout + r.stderr)[-1500:]))
    if not a.no_smoke and not smoke(): raise Stop('the app did not start cleanly')
    print('\nStaged. Commit (say which lab version it carries, and what was taken out), then: python sync/lab_sync.py push')


def cmd_push(a):
    p = load(PENDING()); state = load(STATE)
    if not p: raise Stop('no sync under way here')
    if p.get('stage') != 'ready': raise Stop('finish the sync first')
    if git('status', '--porcelain', '--untracked-files=no').stdout.strip(): raise Stop('commit first')
    committed = json.loads(git('show', 'HEAD:sync/state.json').stdout)
    if committed.get('cut') != p['cut']: raise Stop('HEAD\'s sync/state.json is not this sync\'s cut: finish, then commit')
    branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.strip()
    if branch in ('main', 'HEAD'): raise Stop('on %s: a sync goes on a branch of its own, by pull request' % branch)
    git('push', '-q', '-u', 'origin', 'HEAD:refs/heads/' + branch)
    print('pushed', branch)
    tip = fetch_lab()
    if tip and git('rev-parse', tip + '^{tree}').stdout.strip() == p['cut']: print('lab: already holds this cut')
    else:
        rec = commit_tree(p['cut'], tip, "The lab's scientia/ at %s: %s\n\nThe cut (sync/lab_sync.py) of McGheeLab/McGheeLabWebsite %s.\n" % (p['commit'][:7], p['subject'], p['commit']))
        git('push', '-q', 'origin', rec + ':refs/heads/lab')
        print('lab: %s → the cut of %s' % (rec[:10], p['commit'][:7]))
    os.remove(PENDING())


def cmd_scan(a):
    state = load(STATE) or {}
    if a.all:
        lines = []
        for rel in git('ls-files').stdout.splitlines():
            f = os.path.join(REPO, *rel.split('/'))
            try: lines += [(rel, i + 1, l) for i, l in enumerate(open(f, encoding='utf-8').read().splitlines())]
            except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError): pass
        hits = scan_lines(lines, dropped_names(state)); show_hits(hits, "Lines in the app that look like the lab's")
    else:
        hits = scan_lines(added_lines(git('diff', '-U0', base_ref()).stdout), dropped_names(state)); show_hits(hits, "Lines this branch adds that look like the lab's")
    if hits and a.ok: keep(hits); print('kept: sync/kept.txt')


def cmd_cut(a):
    sha, subj = lab_info(a.lab, a.at or 'HEAD')
    os.makedirs(a.out, exist_ok=True)
    if os.listdir(a.out): raise Stop('%s is not empty' % a.out)
    notes, names = cut(a.lab, sha, a.out)
    for n in notes: print('note:', n)
    print('the cut of %s (%s) is in %s; the dropped files define %s' % (sha[:7], subj, a.out, ', '.join(names) or 'nothing'))


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sp = ap.add_subparsers(dest='cmd', required=True)
    for n in ('start', 'cut', 'init'):
        s = sp.add_parser(n); s.add_argument('--lab', default=LAB_DEFAULT); s.add_argument('--at', help='a commit or branch of the lab repository (default HEAD)')
        if n == 'start': s.add_argument('--again', action='store_true', help='start over (after git reset --hard)')
        if n == 'cut': s.add_argument('--out', required=True)
    f = sp.add_parser('finish'); f.add_argument('--ok', action='store_true', help='the lines listed stay'); f.add_argument('--no-smoke', action='store_true')
    sp.add_parser('push')
    s = sp.add_parser('scan'); s.add_argument('--all', action='store_true'); s.add_argument('--ok', action='store_true', help='the lines listed stay (sync/kept.txt)')
    a = ap.parse_args(argv)
    try: {'start': cmd_start, 'finish': cmd_finish, 'push': cmd_push, 'scan': cmd_scan, 'cut': cmd_cut, 'init': cmd_init}[a.cmd](a)
    except Stop as e:
        print('STOP: %s' % e, file=sys.stderr); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
