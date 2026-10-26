"""PowerPoint → one picture per slide, plus each slide's text and speaker notes (used by serve.py).

The pictures come from PowerPoint itself (it must be installed on this computer): PowerShell opens the file
read-only and hidden, exports every slide as a PNG 1600 px wide, and closes it. The words are read straight
from the .pptx (it is a zip of XML), in slide order, so they can be searched and marked as terms.
"""
import os, re, shutil, subprocess, sys, tempfile, zipfile, zlib, struct
from xml.etree import ElementTree as ET

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main', 'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
FAKE = os.environ.get('SIS_SLIDES_FAKE')  # tests: draw plain pictures instead of asking PowerPoint
WIDTH = 1600


def _paras(xml):
    root = ET.fromstring(xml); out = []
    for p in root.iter('{%s}p' % NS['a']):
        t = ''.join(x.text or '' for x in p.iter('{%s}t' % NS['a'])).strip()
        if t: out.append(t)
    return out


def text_of(path):
    """[{title, text, notes}] in slide order (best effort; [] when the file can't be read)."""
    try:
        z = zipfile.ZipFile(path)
        rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels')).iter('{%s}Relationship' % NS['rel'])}
        order = [rels[s.get('{%s}id' % NS['r'])] for s in ET.fromstring(z.read('ppt/presentation.xml')).iter('{%s}sldId' % NS['p'])]
        out = []
        for tgt in order:
            name = 'ppt/' + tgt.lstrip('/').replace('ppt/', '', 1) if not tgt.startswith('ppt/') else tgt
            name = os.path.normpath(name).replace('\\', '/')
            paras = _paras(z.read(name)); notes = []
            relp = os.path.dirname(name) + '/_rels/' + os.path.basename(name) + '.rels'
            if relp in z.namelist():
                for r in ET.fromstring(z.read(relp)).iter('{%s}Relationship' % NS['rel']):
                    if r.get('Type', '').endswith('/notesSlide'):
                        nn = os.path.normpath(os.path.join(os.path.dirname(name), r.get('Target'))).replace('\\', '/')
                        if nn in z.namelist(): notes = [t for t in _paras(z.read(nn)) if not re.fullmatch(r'\d+', t)]
            out.append({'title': paras[0] if paras else '', 'text': '\n'.join(paras), 'notes': '\n'.join(notes)})
        return out
    except Exception:
        return []


def _png(path, w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def chunk(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f: f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


PS = r'''
$ErrorActionPreference = 'Stop'
$src = $args[0]; $out = $args[1]; $w = [int]$args[2]
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($src, -1, 0, 0)   # read-only, not untitled, no window
  $h = [int]($w * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
  $pres.Export($out, 'PNG', $w, $h)
  $pres.Close()
} finally { if ($app.Presentations.Count -eq 0) { $app.Quit() } }
'''


def available():
    if FAKE: return {'ok': True, 'with': 'test pictures'}
    if os.name != 'nt': return {'ok': False, 'error': 'Slides are turned into pictures by PowerPoint, which needs Windows.'}
    try:
        import winreg
        winreg.CloseKey(winreg.OpenKey(winreg.HKEY_CLASSES_ROOT, 'PowerPoint.Application'))
        return {'ok': True, 'with': 'PowerPoint'}
    except Exception:
        return {'ok': False, 'error': 'PowerPoint was not found on this computer.'}


def convert(src, images_dir, mid):
    """src: the saved .pptx. Writes images/<mid>_s<N>.png; returns [{path, w, h, title, text, notes}]."""
    words = text_of(src); tmp = tempfile.mkdtemp(prefix='sis-slides-')
    try:
        if FAKE:
            n = max(1, len(words)) if words else 3
            for i in range(n): _png(os.path.join(tmp, 'Slide%d.png' % (i + 1)), 160, 90, [(60 + 40 * i) % 255, 120, 200])
        else:
            st = available()
            if not st['ok']: raise RuntimeError(st['error'])
            ps = os.path.join(tmp, 'export.ps1')
            with open(ps, 'w', encoding='utf-8') as f: f.write(PS)
            out = os.path.join(tmp, 'png')
            r = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps, os.path.abspath(src), out, str(WIDTH)],
                               capture_output=True, text=True, timeout=600, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            if r.returncode != 0: raise RuntimeError('PowerPoint could not export the slides: ' + (r.stderr or r.stdout).strip()[:400])
            tmp = out
        files = [f for f in os.listdir(tmp) if f.lower().endswith('.png')]
        files.sort(key=lambda f: int((re.findall(r'(\d+)', f) or ['0'])[-1]))
        if not files: raise RuntimeError('PowerPoint exported no slides')
        res = []
        for i, f in enumerate(files):
            name = '%s_s%d.png' % (mid, i + 1); dst = os.path.join(images_dir, name)
            shutil.copyfile(os.path.join(tmp, f), dst)
            w, h = _size(dst); wd = words[i] if i < len(words) else {'title': '', 'text': '', 'notes': ''}
            res.append(dict(wd, path='images/' + name, w=w, h=h, file=name))
        return res
    finally:
        shutil.rmtree(os.path.dirname(tmp) if tmp.endswith(os.sep + 'png') else tmp, ignore_errors=True)


def _size(path):
    with open(path, 'rb') as f: head = f.read(24)
    return struct.unpack('>II', head[16:24]) if head[:8] == b'\x89PNG\r\n\x1a\n' else (1600, 900)
