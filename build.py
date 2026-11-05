#!/usr/bin/env python3
"""Join src/ into one self-contained scientia.html: fonts, CSS and JS inlined. Edit src/, not the built file.
Also writes board.html, the whiteboard page an image panel opens: vendor/board/lab-board.html (the McGhee Lab's board page
with its engine inlined, unchanged) around this app's own board/ files (store.js, the board's documents kept in the note;
pen.js, the notebook's pen on the board; board.css)."""
import glob, os
D = os.path.dirname(os.path.abspath(__file__)); src = os.path.join(D, 'src')
shell = open(os.path.join(src, 'shell.html'), encoding='utf-8').read()
css = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, '*.css'))))
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, '*.js'))))
# third-party libraries (vendor/): their CSS with fonts inlined as data URIs, their JS before the app's
import base64, re
vd = os.path.join(D, 'vendor')
def inline_fonts(t):
    return re.sub(r'url\((["\']?)(fonts/[^)"\']+)\1\)', lambda m: 'url(data:font/woff2;base64,' + base64.b64encode(open(os.path.join(vd, m.group(2)), 'rb').read()).decode() + ')', t)
vcss = '\n'.join(inline_fonts(open(f, encoding='utf-8').read()) for f in sorted(glob.glob(os.path.join(vd, '*.css'))))
vjs = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(vd, '*.js'))))
# web workers ship as text and are started from a blob URL (PDF.js)
wk = ''.join('<script type="text/js-worker" id="wk-%s">%s</script>\n' % (os.path.basename(f).split('.')[0], open(f, encoding='utf-8').read().replace('</script', '<\\/script')) for f in sorted(glob.glob(os.path.join(vd, 'workers', '*.js'))))
fonts = open(os.path.join(D, 'fonts.css'), encoding='utf-8').read() if os.path.exists(os.path.join(D, 'fonts.css')) else ''
# refuse to build an app that would not start: syntax-check the joined JS first (needs Node; skipped if absent)
import shutil, subprocess, tempfile, sys
if shutil.which('node'):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tf: tf.write(js)
    r = subprocess.run(['node', '--check', tf.name], capture_output=True, text=True); os.unlink(tf.name)
    if r.returncode: print('SYNTAX ERROR — scientia.html not written\n' + r.stderr[:1500]); sys.exit(1)
out = shell.replace('<!--WORKERS-->', wk).replace('/*VENDORCSS*/', vcss).replace('/*VENDORJS*/', vjs.replace('</script', '<\\/script')).replace('/*FONTS*/', fonts).replace('/*CSS*/', css).replace('/*JS*/', js.replace('</script', '<\\/script'))
open(os.path.join(D, 'scientia.html'), 'w', encoding='utf-8').write(out)
print('wrote scientia.html', '%.0f KB' % (len(out.encode()) / 1024))
# the whiteboard page
base = os.path.join(vd, 'board', 'lab-board.html')
if os.path.exists(base):
    page = open(base, encoding='utf-8').read()
    own = lambda n: open(os.path.join(D, 'board', n), encoding='utf-8').read()
    for mark, text, tag in (('/*SIS-BOARD-CSS*/', own('board.css'), 'style'), ('/*SIS-BOARD-STORE*/', own('store.js'), 'script'), ('/*SIS-BOARD-PEN*/', own('pen.js'), 'script')):
        if page.count(mark) != 1: print('board.html not written: %s is not in vendor/board/lab-board.html once' % mark); sys.exit(1)
        page = page.replace(mark, text.replace('</' + tag, '<\\/' + tag))   # a literal </script> would end the inline tag
    open(os.path.join(D, 'board.html'), 'w', encoding='utf-8').write(page)
    print('wrote board.html', '%.0f KB' % (len(page.encode()) / 1024))
