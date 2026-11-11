"""webcap.py — a website kept as it was (V3.971).

Gabe: "add websites as a component … The website should not be visited, but instead saved as a mere copy of what that
webpage is, so that if it ever gets taken down, then it will remain in the note as it was the moment it was captured."

capture(url) fetches the page once, here, on the computer that runs the app, and gives back ONE self-contained HTML file:
  * its stylesheets (with their @imports), images, icons and fonts inlined as data: URLs;
  * its scripts, frames, embeds and media sources taken out — a <noscript> fallback is kept as plain markup and a lazy
    image's real address is used — so the copy shows what the page was and runs nothing of the site's;
  * links made absolute: they open the live page in a new tab, and only when clicked;
  * a Content-Security-Policy that forbids any request to the network when the copy is shown, so opening the note never
    visits the site. Inline scripts stay allowed: the app adds its own to the copy it shows (quoting, ink labels).
A URL that answers with a PDF comes back as that PDF; a picture or plain text comes back wrapped in a page.
Only http and https; only addresses on the internet, unless the request comes from this computer itself (a paired device
may not reach this computer's own services, or its network's, through it); every redirect is checked again.
Pages built by scripts in the browser come as the HTML the site sends. Standard library only.
"""
import base64, concurrent.futures, html, ipaddress, mimetypes, re, socket, threading, time, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser

# V3.977: it says what it is (a site that wants a person at a browser gets the saved-page route instead, never a disguise)
UA = 'Mozilla/5.0 (compatible; ScientiaInSitu/1.0; a lab notebook saving one page for its reader)'
SAVED = 'open the page in your browser, save it as "Webpage, Single File" (Ctrl+S, an .mhtml file), and drop that file on the note: it becomes this component, as you saw it'
MAX_PAGE, MAX_PDF, MAX_RES, MAX_TOTAL, MAX_N = 15 << 20, 80 << 20, 8 << 20, 25 << 20, 400
TIMEOUT, DEADLINE, WORKERS = 15, 120, 8
CSP = ("default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline' data:; "
       "script-src 'unsafe-inline' blob:; frame-src blob: data: about:; connect-src 'none'; form-action 'none'")
DROP_WHOLE = {'script', 'iframe', 'object', 'applet', 'noembed', 'portal'}   # with what is inside them (all have an end tag)
DROP_TAG = {'embed', 'base', 'track', 'frame'}                               # no end tag
LINK_DROP = {'preload', 'prefetch', 'preconnect', 'dns-prefetch', 'modulepreload', 'manifest', 'pingback', 'prerender'}
LAZY = ('data-src', 'data-lazy-src', 'data-original', 'data-url', 'data-hi-res-src', 'data-full-src')
LAZYSET = ('data-srcset', 'data-lazy-srcset')


class Refused(Exception):
    """A capture that cannot or may not be made; the message is for the person."""


def _check(host, allow_private):
    if not host: raise Refused('That is not a web address')
    try: infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError): raise Refused('No website answers at ' + host)
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split('%')[0])
        if ip.version == 6 and ip.ipv4_mapped: ip = ip.ipv4_mapped
        if ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            raise Refused(host + ' is not a website on the internet')
        if not ip.is_global and not allow_private:
            raise Refused(host + ' is on a private network: capture it on the computer that runs the app')


class _Guard(urllib.request.HTTPRedirectHandler):
    def __init__(self, allow):
        super().__init__(); self.allow = allow
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlsplit(newurl)
        if u.scheme not in ('http', 'https'): raise Refused('The page sends you elsewhere than a website')
        _check(u.hostname, self.allow)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class _Net:
    def __init__(self, allow):
        self.allow, self.opener, self.hosts, self.t0 = allow, urllib.request.build_opener(_Guard(allow)), {}, time.time()
    def get(self, url, limit, accept='*/*', referer=None):
        u = urllib.parse.urlsplit(url)
        if u.scheme not in ('http', 'https'): raise Refused('not a web address')
        if time.time() - self.t0 > DEADLINE: raise Refused('the page took too long')
        if u.hostname not in self.hosts:
            try: _check(u.hostname, self.allow); self.hosts[u.hostname] = None
            except Refused as e: self.hosts[u.hostname] = e
        if self.hosts[u.hostname]: raise self.hosts[u.hostname]
        hd = {'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'en-US,en;q=0.9'}
        if referer: hd['Referer'] = referer
        with self.opener.open(urllib.request.Request(url, headers=hd), timeout=TIMEOUT) as r:
            data = r.read(limit + 1)
            if len(data) > limit: raise Refused('too big')
            return r.geturl(), (r.headers.get_content_type() or '').lower(), r.headers.get_content_charset(), data


def _decode(data, cs=None):
    if data.startswith(b'\xef\xbb\xbf'): cs = 'utf-8-sig'
    if not cs:
        m = re.search(rb'<meta[^>]+charset\s*=\s*["\']?\s*([\w.:-]+)', data[:8192], re.I)
        cs = m.group(1).decode('ascii', 'ignore') if m else None
    try: return data.decode(cs or 'utf-8', errors='replace')
    except LookupError: return data.decode('utf-8', errors='replace')


class _Tok(HTMLParser):
    """The page as a list of events; written out again with the changes (entities and text as they were)."""
    def __init__(self):
        super().__init__(convert_charrefs=False); self.t = []
    def handle_starttag(self, tag, attrs): self.t.append(['s', tag, list(attrs), False])
    def handle_startendtag(self, tag, attrs): self.t.append(['s', tag, list(attrs), True])
    def handle_endtag(self, tag): self.t.append(['e', tag])
    def handle_data(self, d): self.t.append(['d', d])
    def handle_entityref(self, n): self.t.append(['r', '&' + n + ';'])
    def handle_charref(self, n): self.t.append(['r', '&#' + n + ';'])
    def handle_decl(self, d): self.t.append(['r', '<!' + d + '>'])
    def unknown_decl(self, d): self.t.append(['r', '<![' + d + ']>'])
    def handle_comment(self, d): pass
    def handle_pi(self, d): pass


def _get(attrs, k):
    for a, v in attrs:
        if a == k: return v
    return None


def _set(attrs, k, v):
    attrs[:] = [(a, x) for a, x in attrs if a != k]
    if v is not None: attrs.append((k, v))


def _pick(srcset):
    """The candidate of a srcset to keep: the widest up to 1600 px (2x for density lists)."""
    best, bs = None, None
    for part in re.split(r',\s+(?=\S)', (srcset or '').strip()):
        bits = part.strip().split()
        if not bits or bits[0].startswith('data:'): continue
        d = bits[1] if len(bits) > 1 else '1x'
        try: w = float(d[:-1]) * (1 if d.endswith('w') else 800)
        except ValueError: w = 0
        s = w if w <= 1600 else 1600 - (w - 1600)
        if bs is None or s > bs: best, bs = bits[0], s
    return best


_URL = re.compile(r'url\(\s*(?:"([^"]*)"|\'([^\']*)\'|([^)\s]*))\s*\)', re.I)
_IMP = re.compile(r'@import\s+(?:url\(\s*)?(?:"([^"]*)"|\'([^\']*)\'|([^\s;)]+))\s*\)?\s*([^;]*);', re.I)


class _Capture:
    def __init__(self, url, allow):
        self.url, self.net, self.want, self.order, self.missing, self.total, self.lock = url, _Net(allow), {}, [], 0, 0, threading.Lock()

    def ref(self, u):
        """A placeholder for a resource fetched later (its data: URL once it came)."""
        if not u or u.startswith(('data:', 'blob:', 'about:', 'javascript:', '#')): return u
        u = u.split('#')[0]
        if u not in self.want:
            if len(self.order) >= MAX_N: return u
            self.want[u] = len(self.order); self.order.append(u)
        return '\x00%d\x00' % self.want[u]

    def css(self, text, at, depth=0):
        def imp(m):
            u = m.group(1) or m.group(2) or m.group(3) or ''; media = (m.group(4) or '').strip()
            if depth >= 3 or not u or u.startswith('data:'): return ''
            try: final, _, cs, data = self.net.get(urllib.parse.urljoin(at, u), MAX_RES, 'text/css,*/*;q=0.1', at)
            except Exception: self.missing += 1; return ''
            inner = self.css(_decode(data, cs), final, depth + 1)
            return '@media ' + media + '{' + inner + '}' if media else inner
        text = _IMP.sub(imp, text)
        def url(m):
            u = (m.group(1) if m.group(1) is not None else m.group(2) if m.group(2) is not None else m.group(3) or '').strip()
            if not u or u.startswith(('data:', '#', 'about:', 'blob:')): return m.group(0)
            return 'url("' + self.ref(urllib.parse.urljoin(at, u)) + '")'
        return _URL.sub(url, text)

    def fetch_all(self):
        def one(u):
            try: final, ctype, _, data = self.net.get(u, MAX_RES, '*/*', self.url)
            except Exception: return None
            with self.lock:
                if self.total + len(data) > MAX_TOTAL: return None
                self.total += len(data)
            if not ctype or ctype in ('application/octet-stream', 'binary/octet-stream', 'text/plain'):
                ctype = mimetypes.guess_type(urllib.parse.urlsplit(final).path)[0] or ctype or 'application/octet-stream'
            return 'data:' + ctype + ';base64,' + base64.b64encode(data).decode('ascii')
        with concurrent.futures.ThreadPoolExecutor(WORKERS) as ex: got = list(ex.map(one, self.order))
        self.missing += sum(1 for g in got if g is None)
        return got

    def page(self, text, final):
        tok = _Tok(); tok.feed(text.replace('\x00', '�')); tok.close(); T = tok.t
        base = final
        for t in T:
            if t[0] == 's' and t[1] == 'base' and _get(t[2], 'href'): base = urllib.parse.urljoin(final, _get(t[2], 'href')); break
        J = lambda u: urllib.parse.urljoin(base, (u or '').strip())
        out, sheets, skip, title, in_title, in_style, in_media, in_picture, icon, in_svg = [], [], [], [], False, False, 0, 0, None, 0
        for t in T:
            k = t[0]
            if skip:   # inside something left out whole (a script, a frame): until its end, nested ones counted
                if k == 's' and t[1] == skip[-1] and not t[3]: skip.append(t[1])
                elif k == 'e' and t[1] == skip[-1]: skip.pop()
                continue
            if k == 's':
                tag, attrs, sc = t[1], t[2], t[3]
                if tag in DROP_WHOLE:
                    if not sc: skip.append(tag)
                    continue
                if tag in DROP_TAG or tag == 'noscript': continue
                if tag == 'source' and (in_picture or in_media): continue
                attrs[:] = [(a, v) for a, v in attrs if not a.startswith('on') and a not in ('integrity', 'nonce', 'crossorigin', 'ping')]
                if tag == 'meta':
                    he = (_get(attrs, 'http-equiv') or '').lower()
                    if _get(attrs, 'charset') is not None or he in ('refresh', 'content-security-policy', 'content-type', 'x-ua-compatible'): continue
                if tag == 'link':
                    rel = set((_get(attrs, 'rel') or '').lower().split()); href = _get(attrs, 'href')
                    if rel & LINK_DROP: continue
                    if 'stylesheet' in rel and href and 'alternate' not in rel:
                        sheets.append(J(href)); out.append(['css', len(sheets) - 1, _get(attrs, 'media')]); continue
                    if rel & {'icon', 'apple-touch-icon', 'mask-icon'} and href:
                        v = self.ref(J(href)); _set(attrs, 'href', v); icon = icon or v
                    elif href: _set(attrs, 'href', J(href))
                if tag in ('a', 'area'):
                    href = _get(attrs, 'href')
                    if href is not None:
                        if href.strip().lower().startswith('javascript:'): _set(attrs, 'href', None)
                        elif not href.startswith('#'): _set(attrs, 'href', J(href)); _set(attrs, 'target', '_blank'); _set(attrs, 'rel', 'noopener noreferrer')
                if tag == 'form' and _get(attrs, 'action'): _set(attrs, 'action', J(_get(attrs, 'action')))
                if tag == 'img':
                    src = _get(attrs, 'src') or ''; lazy = next((_get(attrs, a) for a in LAZY if _get(attrs, a)), None)
                    lset = next((_get(attrs, a) for a in LAZYSET if _get(attrs, a)), None); sset = _get(attrs, 'srcset') or lset
                    weak = not src or (src.startswith('data:') and len(src) < 400) or re.search(r'placeholder|blank\.|spacer|lazy|transparent', src, re.I)
                    pick = _pick(sset) if sset else None
                    real = lazy if weak and lazy else pick or src
                    if real and not real.startswith('data:'): _set(attrs, 'src', self.ref(J(real)))
                    elif real and real != src: _set(attrs, 'src', real)
                    for a in ('srcset', 'sizes', 'loading', 'decoding', 'fetchpriority') + LAZY + LAZYSET: _set(attrs, a, None)
                if tag in ('video', 'audio'):
                    for a in ('src', 'autoplay', 'preload'): _set(attrs, a, None)
                    if _get(attrs, 'poster'): _set(attrs, 'poster', self.ref(J(_get(attrs, 'poster'))))
                    if not sc: in_media += 1
                if tag == 'picture' and not sc: in_picture += 1
                if tag == 'input' and (_get(attrs, 'type') or '').lower() == 'image' and _get(attrs, 'src'): _set(attrs, 'src', self.ref(J(_get(attrs, 'src'))))
                if tag in ('image', 'feimage'):
                    for a in ('href', 'xlink:href'):
                        v = _get(attrs, a)
                        if v and not v.startswith('#'): _set(attrs, a, self.ref(J(v)))
                if _get(attrs, 'style'): _set(attrs, 'style', self.css(_get(attrs, 'style'), base))
                if _get(attrs, 'background') and tag in ('body', 'table', 'td', 'th', 'tr'): _set(attrs, 'background', self.ref(J(_get(attrs, 'background'))))
                if tag == 'title' and not title and not in_svg: in_title = not sc   # the page's own title (an SVG's <title> is a tooltip)
                if tag == 'svg' and not sc: in_svg += 1
                if tag == 'style': in_style = not sc
                out.append(t); continue
            if k == 'e':
                tag = t[1]
                if tag in DROP_TAG or tag == 'noscript' or tag in DROP_WHOLE: continue
                if tag == 'source' and (in_picture or in_media): continue
                if tag in ('video', 'audio') and in_media: in_media -= 1
                if tag == 'picture' and in_picture: in_picture -= 1
                if tag == 'title': in_title = False
                if tag == 'svg' and in_svg: in_svg -= 1
                if tag == 'style': in_style = False
                out.append(t); continue
            if k == 'd':
                if in_title: title.append(t[1])
                if in_style: t = ['d', self.css(t[1], base)]
            elif k == 'r' and in_title: title.append(html.unescape(t[1]))
            out.append(t)
        # the stylesheets: together, then what they ask for with everything else
        def sheet(u):
            try: f, _, cs, data = self.net.get(u, MAX_RES, 'text/css,*/*;q=0.1', final); return f, _decode(data, cs)
            except Exception: return None
        with concurrent.futures.ThreadPoolExecutor(WORKERS) as ex: got = list(ex.map(sheet, sheets))
        css = []
        for g in got:
            if g is None: self.missing += 1; css.append('')
            else: css.append(self.css(g[1], g[0]))
        data = self.fetch_all()
        def ser(t):
            k = t[0]
            if k == 's':
                return '<' + t[1] + ''.join(' ' + a if v is None else ' ' + a + '="' + html.escape(v, quote=True) + '"' for a, v in t[2]) + (' />' if t[3] else '>')
            if k == 'e': return '</' + t[1] + '>'
            if k == 'css': return '<style' + (' media="' + html.escape(t[2], quote=True) + '"' if t[2] else '') + '>' + css[t[1]].replace('</style', '<\\/style') + '</style>'
            return t[1]
        head = ('<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + CSP + '">'
                '<meta name="sis-captured" content="' + html.escape(final, quote=True) + ' ' + time.strftime('%Y-%m-%dT%H:%M:%S') + '">')
        at = next((i for i, t in enumerate(out) if t[0] == 's' and t[1] == 'head'), None)
        if at is None: at = next((i for i, t in enumerate(out) if t[0] == 's' and t[1] == 'html'), None)
        body = [ser(t) for t in out]
        if at is None: body.insert(1 if out and out[0][0] == 'r' and out[0][1].lower().startswith('<!doctype') else 0, '<head>' + head + '</head>')
        else: body.insert(at + 1, head if out[at][1] == 'head' else '<head>' + head + '</head>')
        doc = ''.join(body)
        doc = re.sub('\x00(\\d+)\x00', lambda m: data[int(m.group(1))] or self.order[int(m.group(1))], doc)
        name = re.sub(r'\s+', ' ', ''.join(title)).strip()
        ic = None
        if icon:
            m = re.fullmatch('\x00(\\d+)\x00', icon)
            ic = data[int(m.group(1))] if m else None
            if ic and len(ic) > 60000: ic = None
        return doc, name, ic


def capture(url, allow_private=False):
    """{kind: 'html' | 'pdf', data (the file's bytes), title, final, at, size; for a page also resources, missing, icon}."""
    url = (url or '').strip()
    if not re.match(r'^https?://', url, re.I): raise Refused('Give the address of a web page (it starts with http:// or https://)')
    C = _Capture(url, allow_private); at = time.strftime('%Y-%m-%dT%H:%M:%S')
    try: final, ctype, cs, data = C.net.get(url, MAX_PDF, 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8')
    except Refused as e:
        raise Refused('That page is bigger than this app keeps (80 MB)') if str(e) == 'too big' else e
    except urllib.error.HTTPError as e:
        raise Refused('The site answered %d (%s)' % (e.code, e.reason) + (': it lets only a person at a browser in — ' + SAVED if e.code in (401, 403, 429, 503) else ''))
    except Exception as e: raise Refused('The site did not answer: ' + str(getattr(e, 'reason', e))[:160])
    C.url = final
    path = urllib.parse.urlsplit(final).path
    if ctype == 'application/pdf' or data[:5] == b'%PDF-':
        name = urllib.parse.unquote(path.rsplit('/', 1)[-1]) or urllib.parse.urlsplit(final).hostname
        return {'kind': 'pdf', 'data': data, 'title': re.sub(r'\.pdf$', '', name, flags=re.I), 'final': final, 'at': at, 'size': len(data)}
    if ctype.startswith('image/'):
        uri = 'data:' + ctype + ';base64,' + base64.b64encode(data).decode('ascii'); name = urllib.parse.unquote(path.rsplit('/', 1)[-1]) or final
        text = '<!DOCTYPE html><html><head><title>' + html.escape(name) + '</title></head><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#111"><img src="' + uri + '" style="max-width:100%"></body></html>'
    elif ctype in ('text/html', 'application/xhtml+xml', '') or re.match(rb'\s*(<!doctype html|<html)', data[:512], re.I):
        if len(data) > MAX_PAGE: raise Refused('That page is bigger than this app keeps (15 MB of HTML)')
        text = _decode(data, cs)
    elif ctype.startswith('text/') or ctype in ('application/json', 'application/xml'):
        text = '<!DOCTYPE html><html><head><title>' + html.escape(final) + '</title></head><body><pre style="white-space:pre-wrap;font:13px/1.5 ui-monospace,monospace">' + html.escape(_decode(data, cs)) + '</pre></body></html>'
    else:
        raise Refused('That address is a file (%s), not a page: download it and drop it in the note' % (ctype or 'unknown type'))
    doc, title, icon = C.page(text, final)
    # a robot check in place of the page (a "just a moment", a "verifying", a bare page named after its host): the saved-page route
    words = len(re.findall(r'[A-Za-z]{4,}', re.sub(r'<(script|style)\b.*?</\1>|<[^>]+>', ' ', text, flags=re.S | re.I)))
    host = (urllib.parse.urlsplit(final).hostname or '').lower()
    if words < 160 and (re.search(r'just a moment|verif|attention required|access denied|captcha|are you a robot|security check|bot detection|unusual traffic', title or '', re.I) or (title or '').strip().lower() in (host, host.replace('www.', ''), '')):
        raise Refused('The site showed a check for robots instead of the page — ' + SAVED)
    data = doc.encode('utf-8')
    return {'kind': 'html', 'data': data, 'title': title or urllib.parse.urlsplit(final).hostname or final, 'final': final, 'at': at,
            'size': len(data), 'resources': len(C.order) - C.missing, 'missing': C.missing, 'icon': icon}
