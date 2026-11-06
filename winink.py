"""Handwriting → text with Windows' own recognizer (used by serve.py).

Windows.UI.Input.Inking reads the pen strokes themselves (their order, direction and timing), the same engine as
the Windows pen input panel: good with cursive, fast, offline, and nothing to download. It uses the handwriting
languages installed in Windows (Settings → Time & language → Language & region → a language → Language options →
Handwriting).

The recognizer is reached through Windows PowerShell 5.1 (WinRT is built into it), kept running in the background
so each read is quick: one request line in (the strokes), result lines out.
"""
import os, subprocess, tempfile, threading, time

FAKE = os.environ.get('SIS_HW_FAKE')  # tests: answer without Windows

PS = r'''
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.Encoding]::UTF8; [Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try { Add-Type -AssemblyName System.Numerics.Vectors } catch { }
$null = [Windows.UI.Input.Inking.InkStrokeBuilder, Windows.UI.Input.Inking, ContentType = WindowsRuntime]
$null = [Windows.UI.Input.Inking.InkRecognizerContainer, Windows.UI.Input.Inking, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $null = $task.Wait(-1); $task.Result }
$rec = New-Object Windows.UI.Input.Inking.InkRecognizerContainer
$inv = [Globalization.CultureInfo]::InvariantCulture
$id = [System.Numerics.Matrix3x2]::Identity
function Say($s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }
while ($true) {
  $line = [Console]::In.ReadLine(); if ($line -eq $null) { break }
  try {
    if ($line -eq 'PROBE') {
      foreach ($r in $rec.GetRecognizers()) { Say ("N`t" + $r.Name) }
      Say 'END'; continue
    }
    if ($line.StartsWith('LANG ')) { $want = $line.Substring(5); foreach ($r in $rec.GetRecognizers()) { if ($r.Name -eq $want) { $rec.SetDefaultRecognizer($r) } } ; Say 'END'; continue }
    # STROKES x,y,p;x,y,p|x,y,p;...
    $box = New-Object Windows.UI.Input.Inking.InkStrokeContainer
    $b = New-Object Windows.UI.Input.Inking.InkStrokeBuilder
    foreach ($s in $line.Substring(8).Split('|')) {
      if (-not $s) { continue }
      $pts = New-Object 'System.Collections.Generic.List[Windows.UI.Input.Inking.InkPoint]'
      foreach ($q in $s.Split(';')) { $v = $q.Split(','); if ($v.Count -lt 2) { continue }
        $pr = 0.5; if ($v.Count -gt 2) { $pr = [double]::Parse($v[2], $inv) }
        $pts.Add((New-Object Windows.UI.Input.Inking.InkPoint -ArgumentList (New-Object Windows.Foundation.Point -ArgumentList ([double]::Parse($v[0], $inv)), ([double]::Parse($v[1], $inv))), ([single]$pr))) }
      if ($pts.Count -gt 0) { $box.AddStroke($b.CreateStrokeFromInkPoints($pts, $id)) }
    }
    $res = Await ($rec.RecognizeAsync($box, [Windows.UI.Input.Inking.InkRecognitionTarget]::All)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Input.Inking.InkRecognitionResult]])
    foreach ($r in $res) { $k = $r.BoundingRect; $c = @($r.GetTextCandidates()) -join "`t"
      Say ("R`t" + $k.X.ToString($inv) + "`t" + $k.Y.ToString($inv) + "`t" + $k.Width.ToString($inv) + "`t" + $k.Height.ToString($inv) + "`t" + $c) }
    Say 'END'
  } catch { Say ("E`t" + ($_.Exception.Message -replace "[`r`n`t]", ' ')); Say 'END' }
}
'''


class WinInk:
    def __init__(self):
        self.p = None; self.lock = threading.Lock(); self.names = None; self.error = None; self.lang = None

    def _start(self):
        if self.p and self.p.poll() is None: return
        exe = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        if not os.path.exists(exe): exe = 'powershell'
        ps = os.path.join(tempfile.gettempdir(), 'scientia-ink.ps1')
        with open(ps, 'w', encoding='utf-8-sig') as f: f.write(PS)
        self.p = subprocess.Popen([exe, '-NoProfile', '-NoLogo', '-STA', '-ExecutionPolicy', 'Bypass', '-File', ps], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                  creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

    def _ask(self, line, timeout=40):
        self._start(); self.p.stdin.write((line + '\n').encode('utf-8')); self.p.stdin.flush()
        out, t0 = [], time.time()
        while True:
            raw = self.p.stdout.readline()
            if not raw:
                self.p = None; raise RuntimeError('the Windows handwriting helper stopped' + (': ' + '; '.join(out)[:300] if out else ''))
            s = raw.decode('utf-8', 'replace').lstrip('\ufeff').rstrip('\r\n')
            if s == 'END': return out
            if s.startswith(('R\t', 'N\t', 'E\t')): out.append(s)
            if time.time() - t0 > timeout: raise RuntimeError('the Windows handwriting recognizer did not answer')

    def status(self):
        if FAKE: return {'ok': True, 'state': 'ready', 'engine': 'windows', 'recognizers': ['Test recognizer']}
        if os.name != 'nt': return {'ok': True, 'state': 'unsupported', 'engine': 'windows', 'error': 'Windows’ handwriting recognizer needs Windows: convert from the Windows computer that runs the app.'}
        with self.lock:
            try:
                if self.names is None:
                    r = self._ask('PROBE', 60); err = [x[2:] for x in r if x.startswith('E\t')]
                    if err: raise RuntimeError(err[0])
                    self.names = [x[2:] for x in r if x.startswith('N\t')]; self.error = None
                if not self.names: return {'ok': True, 'state': 'error', 'engine': 'windows', 'recognizers': [], 'error': 'Windows has no handwriting recognizer installed. Add one: Settings → Time & language → Language & region → your language → ⋯ Language options → Handwriting.'}
                return {'ok': True, 'state': 'ready', 'engine': 'windows', 'recognizers': self.names, 'lang': self.lang}
            except Exception as e:
                self.names = None; self.error = str(e); self.p = None
                return {'ok': True, 'state': 'error', 'engine': 'windows', 'error': 'Windows’ handwriting recognizer could not start: ' + str(e)[:300]}

    def set_lang(self, name):
        with self.lock:
            self._ask('LANG ' + name); self.lang = name
        return self.status()

    def read(self, strokes):
        """strokes: [[[x, y, pressure], …], …] → {'text', 'lines', 'words': [{text, alts, x, y, w, h}]}"""
        S = [s for s in strokes if s and len(s) >= 1]
        if FAKE:
            return {'text': 'handwriting read' if FAKE == '1' else FAKE, 'lines': ['handwriting read' if FAKE == '1' else FAKE], 'words': []}
        enc = '|'.join(';'.join('%.1f,%.1f,%.2f' % (float(p[0]), float(p[1]), float(p[2]) if len(p) > 2 and p[2] is not None else .5) for p in s) for s in S)
        with self.lock: r = self._ask('STROKES ' + enc)
        err = [x[2:] for x in r if x.startswith('E\t')]
        if err: raise RuntimeError(err[0])
        words = []
        for x in r:
            if not x.startswith('R\t'): continue
            f = x.split('\t'); cands = [c for c in f[5:] if c]
            if cands: words.append({'x': float(f[1]), 'y': float(f[2]), 'w': float(f[3]), 'h': float(f[4]), 'text': cands[0], 'alts': cands[1:6]})
        # words → lines: by vertical overlap, then left to right
        lines = []
        for wd in sorted(words, key=lambda w: w['y'] + w['h'] / 2):
            for L in lines:
                ov = min(L['y1'], wd['y'] + wd['h']) - max(L['y0'], wd['y'])
                if ov > .4 * min(wd['h'], L['y1'] - L['y0']):
                    L['w'].append(wd); L['y0'] = min(L['y0'], wd['y']); L['y1'] = max(L['y1'], wd['y'] + wd['h']); break
            else: lines.append({'w': [wd], 'y0': wd['y'], 'y1': wd['y'] + wd['h']})
        lines.sort(key=lambda L: L['y0'])
        txt = [' '.join(w['text'] for w in sorted(L['w'], key=lambda w: w['x'])) for L in lines]
        return {'text': '\n'.join(txt), 'lines': txt, 'words': words}
