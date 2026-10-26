#!/usr/bin/env python3
"""Put the app on Firebase Hosting, so phones and tablets open it at https://<project>.web.app without the computer.
1. Save your web app's config (Firebase console → Project settings → Your apps → firebaseConfig) as firebase-config.json next to this file.
2. Run deploy-hosting.bat (or: python hosting.py, then in the hosting folder: npx firebase-tools login, npx firebase-tools deploy --only hosting).
The hosted copy carries the config, so a device that opens it only has to sign in with Google."""
import ast, json, os, re, shutil, sys
D = os.path.dirname(os.path.abspath(__file__))
cfg_path = os.path.join(D, 'firebase-config.json')
if not os.path.exists(cfg_path): sys.exit('firebase-config.json is missing — paste your firebaseConfig into it (see the top of hosting.py)')
txt = open(cfg_path, encoding='utf-8').read(); m = re.search(r'\{[\s\S]*\}', txt)
try: cfg = json.loads(m.group(0))
except Exception: cfg = json.loads(re.sub(r',\s*}', '}', re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', m.group(0).replace("'", '"'))))
for k in ('apiKey', 'authDomain', 'projectId'):
    if not cfg.get(k): sys.exit('firebase-config.json has no ' + k)
# the service worker, manifest and icon come from serve.py (read without starting the server)
tree = ast.parse(open(os.path.join(D, 'serve.py'), encoding='utf-8').read()); env = {'json': json}
for node in tree.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('SW', 'ICON', 'MANIFEST') for t in node.targets):
        exec(compile(ast.Module([node], []), 'serve.py', 'exec'), env)
H = os.path.join(D, 'hosting'); P = os.path.join(H, 'public')
shutil.rmtree(P, ignore_errors=True); os.makedirs(os.path.join(P, 'icons'))
html = open(os.path.join(D, 'scientia.html'), encoding='utf-8').read()
html = html.replace('<head>', '<head>\n<script>window.SIS_CLOUD_CFG = ' + json.dumps(cfg).replace('<', '\\u003c') + ';</script>', 1)
open(os.path.join(P, 'scientia.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(P, 'sw.js'), 'w', encoding='utf-8').write(env['SW'])
open(os.path.join(P, 'manifest.webmanifest'), 'w', encoding='utf-8').write(env['MANIFEST'])
open(os.path.join(P, 'icon.svg'), 'w', encoding='utf-8').write(env['ICON'])
for f in os.listdir(os.path.join(D, 'icons')): shutil.copy(os.path.join(D, 'icons', f), os.path.join(P, 'icons', f))
json.dump({'hosting': {'public': 'public', 'cleanUrls': False, 'rewrites': [{'source': '/', 'destination': '/scientia.html'}],
                       'headers': [{'source': '/sw.js', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]}, {'source': '/scientia.html', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]}]}},
          open(os.path.join(H, 'firebase.json'), 'w'), indent=2)
json.dump({'projects': {'default': cfg['projectId']}}, open(os.path.join(H, '.firebaserc'), 'w'), indent=2)
print('Ready in hosting/public for project', cfg['projectId'])
print('Next (in the hosting folder): npx firebase-tools login   then   npx firebase-tools deploy --only hosting')
print('Then open https://%s.web.app on each device, sign in with Google, and add it to the home screen.' % cfg['projectId'])
