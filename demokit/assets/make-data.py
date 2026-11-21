"""The made-up data folder for the data tree demonstration: a run's microscope files (empty .nd2 files of the right sizes, zeros that
compress to almost nothing in git), a table and a note. Nothing here is real data.
Run again only to change it:  python scientia/demokit/assets/make-data.py"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'data', 'Run 3 - 30 kPa')
FILES = {
    'raw/field01.nd2': 880, 'raw/field02.nd2': 860, 'raw/field03.nd2': 910, 'raw/field04.nd2': 840,
    'beads/beads-before.nd2': 420, 'beads/beads-after.nd2': 430,
    'analysis/traction.csv': 6, 'analysis/edge-peak.csv': 3,
    'imaging-notes.txt': 1,
}
for rel, kb in FILES.items():
    p = os.path.join(ROOT, *rel.split('/'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(b'\0' * (kb * 1024))
