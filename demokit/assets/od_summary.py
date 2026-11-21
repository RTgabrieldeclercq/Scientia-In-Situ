# Plate-reader summary: the mean OD600 of each sample and how far it rose over the run.
# Reads the first input (INPUT: a CSV with sample, time_h, od600); `result` comes back as a table.
import csv

rows = list(csv.DictReader(open(INPUT)))
by = {}
for r in rows:
    by.setdefault(r['sample'], []).append((float(r['time_h']), float(r['od600'])))

result = [['sample', 'mean OD600', 'last OD600', 'rise']]
for name, pts in by.items():
    pts.sort()
    ods = [o for _, o in pts]
    result.append([name, round(sum(ods) / len(ods), 3), ods[-1], 'x%.1f' % (ods[-1] / ods[0])])

best = max(by, key=lambda n: max(o for _, o in by[n]))
print('%d readings, %d samples; highest OD600: %s' % (len(rows), len(by), best))
