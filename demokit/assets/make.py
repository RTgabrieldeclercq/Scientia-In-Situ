"""The made-up files the demonstrations use: three short papers (PDF), an exported report page (HTML) and four micrographs (JPEG).
Nothing here is a real article or real data. Run again only to change them:  python scientia/demokit/assets/make.py
Needs Pillow, numpy and Chrome (SIS_CHROME); the PDFs are the HTML below printed by Chrome, so their text can be selected."""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('SIS_CHROME', 'C:/Program Files/Google/Chrome/Application/chrome.exe')

CSS = """@page{size:A4;margin:22mm 20mm}body{font:10.5pt/1.45 Georgia,'Times New Roman',serif;color:#111}h1{font:700 17pt/1.2 Georgia,serif;margin:0 0 6pt}
.au{font-size:10.5pt;margin:0 0 2pt}.jr{font:9pt Arial,sans-serif;color:#555;margin:0 0 12pt}.abs{font-size:9.5pt;margin:0 0 12pt;padding:8pt 10pt;background:#f3f3f3}
h2{font:700 11.5pt Arial,sans-serif;margin:14pt 0 4pt}p{margin:0 0 7pt;text-align:justify}figure{margin:12pt 0;break-inside:avoid}figcaption{font-size:9pt;margin-top:5pt}
.eq{display:flex;justify-content:space-between;align-items:center;margin:10pt 30pt;font:italic 13pt Georgia,serif}.eq span:last-child{font-style:normal;font-size:10.5pt}
.ft{font:8pt Arial,sans-serif;color:#777;margin-top:16pt;border-top:1px solid #ccc;padding-top:5pt}ol{margin:0;padding-left:16pt;font-size:9pt}"""
NOTE = 'A made-up paper for demonstrating Scientia In Situ. It is not a real article and reports no real data.'


def bars(vals, labels, ylab, col):
    w, h, m = 360, 190, 40
    mx = max(vals) * 1.15
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#fff"/>',
           f'<line x1="{m}" y1="12" x2="{m}" y2="{h - 30}" stroke="#222"/><line x1="{m}" y1="{h - 30}" x2="{w - 8}" y2="{h - 30}" stroke="#222"/>',
           f'<text x="12" y="{h / 2}" font-size="10" font-family="Arial" transform="rotate(-90 12 {h / 2})" text-anchor="middle">{ylab}</text>']
    bw = (w - m - 30) / len(vals)
    for i, (v, l) in enumerate(zip(vals, labels)):
        bh = (h - 46) * v / mx
        x = m + 12 + i * bw
        out.append(f'<rect x="{x:.0f}" y="{h - 30 - bh:.0f}" width="{bw - 22:.0f}" height="{bh:.0f}" fill="{col}"/>'
                   f'<line x1="{x + (bw - 22) / 2:.0f}" y1="{h - 30 - bh - 9:.0f}" x2="{x + (bw - 22) / 2:.0f}" y2="{h - 30 - bh + 9:.0f}" stroke="#222"/>'
                   f'<text x="{x + (bw - 22) / 2:.0f}" y="{h - 16}" font-size="9.5" font-family="Arial" text-anchor="middle">{l}</text>')
    return ''.join(out) + '</svg>'


def tmap(seed, hue):
    r = np.random.default_rng(seed)
    cells = ''.join(f'<circle cx="{r.uniform(40, 320):.0f}" cy="{r.uniform(30, 150):.0f}" r="{r.uniform(18, 46):.0f}" fill="hsl({hue + r.uniform(-25, 25):.0f} 80% {r.uniform(45, 65):.0f}%)" opacity=".55"/>' for _ in range(14))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180" viewBox="0 0 360 180"><defs><filter id="b"><feGaussianBlur stdDeviation="9"/></filter></defs><rect width="360" height="180" fill="#150b2e"/><g filter="url(#b)">{cells}</g><rect x="270" y="160" width="60" height="4" fill="#fff"/><text x="300" y="155" font-size="9" font-family="Arial" fill="#fff" text-anchor="middle">20 µm</text></svg>'


PAPERS = [
 ('paper-okafor-2021', 'Edge traction on compliant gels rises with fibronectin density', 'Ngozi Okafor, Elin Lindqvist and Rosa Marchetti',
  'Journal of Demonstration Mechanobiology 12, 104–111 (2021) · doi:10.5555/jdm.2021.0104',
  'Epithelial sheets pull on the gel beneath them, and they pull hardest at the leading edge. We seeded monolayers on polyacrylamide gels of 8, 15 and 30 kPa coated with fibronectin at 1, 5 and 10 µg/mL and measured traction by bead displacement. Edge traction rose with fibronectin density on every stiffness, and the rise was steepest on the stiffest gel.',
  [('Introduction', ['Cells pull hardest at the leading edge, where adhesions mature. How much they pull depends on what they hold on to: the stiffness of the substrate and the density of the ligand on it.',
                     'Earlier work varied stiffness alone. Here we vary fibronectin density on three stiffnesses and ask whether the edge peak in traction holds when the ligand is sparse.']),
   ('Methods', ['Gels were cast from acrylamide and bis-acrylamide and their shear modulus G measured by rheometry. Young\'s modulus follows from', 'EQ',
                'with Poisson\'s ratio ν taken as 0.48. Monolayers were seeded at 40,000 cells per cm² and imaged four hours later, 200 nm beads serving as fiducials.']),
   ('Results', ['FIG1', 'Edge traction rose from 0.4 kPa at 1 µg/mL to 1.2 kPa at 10 µg/mL on 30 kPa gels (Figure 1). The traction map of a single field shows the peak following the free edge (Figure 2).', 'FIG2',
                'On 8 kPa gels the rise was shallower, and at 1 µg/mL the edge peak could not be told from the interior.']),
   ('Discussion', ['The edge peak holds at 5 µg/mL and above. Below that, the sheet behaves as if it had no edge. Bead drift limited time-lapses beyond forty frames.'])],
  ('E = 3G(1 + ν)', '(1)'), ([0.4, 0.8, 1.2], ['1', '5', '10'], 'Edge traction (kPa)', '#2f6fb0'), (7, 20),
  'Mean edge traction on 30 kPa gels at three fibronectin densities (µg/mL). Bars: s.e.m., n = 3 fields.', 'Traction map of one field on a 30 kPa gel at 10 µg/mL. The peak follows the free edge.'),
 ('paper-haldane-2019', 'Bead drift in long traction time-lapses and how to correct it', 'Priya Haldane and Kwame Osei',
  'Methods in Demonstration Microscopy 5, 33–39 (2019) · doi:10.5555/mdm.2019.0033',
  'Traction force microscopy reads forces from the displacement of beads in a gel. Over long time-lapses the stage and the focus drift, and the drift is read as force. We measured drift over two hundred frames and show that a reference bead layer removes most of it.',
  [('Introduction', ['Fiducial beads move for two reasons: the cell pulls on the gel, and the microscope moves. Only the first is of interest.']),
   ('Methods', ['Drift was taken as the mean displacement of beads far from any cell. The correction subtracts it frame by frame; the residual error falls as', 'EQ', 'where N is the number of reference beads and σ the localisation error of one bead.']),
   ('Results', ['FIG1', 'Uncorrected, drift passed 0.2 µm after forty frames (Figure 1). Corrected with a reference layer it stayed under 0.05 µm for two hundred frames.', 'FIG2',
                'A focus lock alone halved the drift but did not remove its slow component.']),
   ('Discussion', ['A reference layer costs one extra coating step and removes the largest error in long time-lapses.'])],
  ('ε = σ / √N', '(1)'), ([0.05, 0.12, 0.21, 0.34], ['10', '20', '40', '80'], 'Drift (µm)', '#9e2a62'), (11, 300),
  'Bead drift against frame number, uncorrected.', 'Displacement field of the reference layer after eighty frames.'),
 ('paper-varga-2017', 'Stiffness sensing at the leading edge of epithelial sheets', 'Dóra Varga and Samuel Tomlin',
  'Demonstration Cell Reports 3, 201–208 (2017) · doi:10.5555/dcr.2017.0201',
  'Sheets of epithelial cells migrate faster on stiffer gels. We ask where the stiffness is sensed. Laser ablation of leader cells abolished the response; ablation three rows back did not.',
  [('Introduction', ['A migrating sheet has an edge and an interior. Whether stiffness is sensed by all cells or by the leaders alone decides how the sheet should be modelled.']),
   ('Methods', ['Sheets were released from a stencil on gels of 8 to 30 kPa. Migration speed v was fitted to', 'EQ', 'with v₀ the speed on glass and E₀ the stiffness of half-maximal speed.']),
   ('Results', ['FIG1', 'Speed rose with stiffness and saturated near 30 kPa (Figure 1). After ablation of the leader row the sheet moved at the 8 kPa speed whatever the gel (Figure 2).', 'FIG2']),
   ('Discussion', ['Stiffness is read at the edge. Models that give every cell the same sensing overestimate the response of the interior.'])],
  ('v = v₀ · E / (E + E₀)', '(1)'), ([8, 15, 21, 24], ['8', '15', '22', '30'], 'Speed (µm/h)', '#2e7d5b'), (3, 140),
  'Migration speed against gel stiffness (kPa).', 'Speed map after ablation of the leader row.'),
]


def paper_html(p):
    name, title, au, jr, ab, secs, eq, fig1, fig2, c1, c2 = p
    body = [f'<h1>{title}</h1><p class="au">{au}</p><p class="jr">{jr}</p><div class="abs"><b>Abstract.</b> {ab}</div>']
    for h, items in secs:
        body.append(f'<h2>{h}</h2>')
        for it in items:
            if it == 'EQ': body.append(f'<div class="eq"><span></span><span>{eq[0]}</span><span>{eq[1]}</span></div>')
            elif it == 'FIG1': body.append(f'<figure>{bars(*fig1)}<figcaption><b>Figure 1.</b> {c1}</figcaption></figure>')
            elif it == 'FIG2': body.append(f'<figure>{tmap(*fig2)}<figcaption><b>Figure 2.</b> {c2}</figcaption></figure>')
            else: body.append(f'<p>{it}</p>')
    body.append('<h2>References</h2><ol><li>Lindqvist E. A reference that does not exist. J. Demonstr. 1, 1–2 (2015).</li><li>Osei K. Another reference that does not exist. J. Demonstr. 2, 3–4 (2016).</li></ol>')
    body.append(f'<div class="ft">{NOTE}</div>')
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body>{"".join(body)}</body></html>'


def micrograph(seed, hue, name):
    r = np.random.default_rng(seed)
    w, h = 640, 480
    img = np.zeros((h, w, 3), np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(60):
        cx, cy, rad = r.uniform(0, w), r.uniform(0, h), r.uniform(14, 34)
        blob = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * rad ** 2)))
        col = np.array(hue) * r.uniform(.5, 1)
        img += blob[..., None] * col
    img += r.normal(0, .03, img.shape)
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    im.convert('RGB').save(os.path.join(HERE, name), quality=82)


def banner(name):
    """A made-up theme banner, 1600 x 200 px (8 : 1): a field of soft cell-like shapes across a gel-green wash."""
    r = np.random.default_rng(77)
    w, h = 1600, 200
    yy, xx = np.mgrid[0:h, 0:w]
    base = np.array([0.10, 0.34, 0.40]) + (xx / w)[..., None] * np.array([0.10, 0.22, 0.05]) + (yy / h)[..., None] * np.array([0.0, -0.06, -0.05])
    img = base.astype(np.float32)
    for _ in range(70):
        cx, cy, rad = r.uniform(0, w), r.uniform(0, h), r.uniform(16, 52)
        blob = np.exp(-(((xx - cx) ** 2 + ((yy - cy) * 1.4) ** 2) / (2 * rad ** 2)))
        img += blob[..., None] * np.array([0.55, 0.80, 0.55]) * r.uniform(.12, .38)
    img += r.normal(0, .015, img.shape)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.4)).convert('RGB').save(os.path.join(HERE, name), quality=80)


def main():
    for p in PAPERS:
        src = os.path.join(HERE, p[0] + '.src.html')
        open(src, 'w', encoding='utf-8').write(paper_html(p))
        out = os.path.join(HERE, p[0] + '.pdf')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=' + out, 'file:///' + src.replace('\\', '/')], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.remove(src)
        print(os.path.basename(out), os.path.getsize(out) // 1024, 'KB')
    # an exported report page, as an analysis script would write it
    page = ('<!doctype html><html><head><meta charset="utf-8"><title>Run 3 — traction report</title><style>body{font:15px/1.5 Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1b1b1b}'
            'h1{font-size:22px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 10px;text-align:right}figure{margin:18px 0}figcaption{font-size:13px;color:#444}.n{color:#777;font-size:12px}</style></head><body>'
            '<h1>Run 3 — traction report</h1><p>Exported by the analysis script on the made-up data of the demonstration notebook. Edge traction was read from bead displacement on three fields per condition.</p>'
            f'<figure>{bars([0.4, 0.8, 1.2], ["1", "5", "10"], "Edge traction (kPa)", "#2f6fb0")}<figcaption>Figure 1 · Edge traction against fibronectin density (µg/mL), 30 kPa gels.</figcaption></figure>'
            '<p>The edge peak holds at 5 µg/mL and above. At 1 µg/mL the edge cannot be told from the interior.</p>'
            '<table><tr><th>Fibronectin (µg/mL)</th><th>Field 1</th><th>Field 2</th><th>Field 3</th></tr><tr><td>1</td><td>0.38</td><td>0.41</td><td>0.42</td></tr><tr><td>5</td><td>0.77</td><td>0.83</td><td>0.80</td></tr><tr><td>10</td><td>1.18</td><td>1.24</td><td>1.19</td></tr></table>'
            f'<figure>{tmap(7, 20)}<figcaption>Figure 2 · Traction map, field 2 at 10 µg/mL.</figcaption></figure><p class="n">{NOTE.replace("paper", "report")}</p></body></html>')
    open(os.path.join(HERE, 'report-run3.html'), 'w', encoding='utf-8').write(page)
    for i, hue in enumerate([(0.1, 0.9, 0.35), (0.95, 0.25, 0.55), (0.2, 0.55, 1.0), (1.0, 0.75, 0.15)]):
        micrograph(20 + i, hue, f'micrograph-{i + 1}.jpg')
    banner('banner-gels.jpg')
    print('report-run3.html, micrograph-1..4.jpg, banner-gels.jpg')


if __name__ == '__main__':
    main()
