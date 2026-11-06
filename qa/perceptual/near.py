"""near.py <fp.json> : every pair of photographs whose fingerprints are close (pHash <= 14 or dHash <= 12 bits apart,
or 16x16 thumbnails correlating above 0.85), closest first. Data only."""
import sys, json, itertools, os
import numpy as np
fp = json.load(open(sys.argv[1]))
items = [(os.path.basename(k).rsplit('.', 1)[0], v) for k, v in fp.items() if 'error' not in v]
ham = lambda a, b: sum(x != y for x, y in zip(a, b))
rows = []
for (a, x), (b, y) in itertools.combinations(items, 2):
    ph, dh = ham(x['phash'], y['phash']), ham(x['dhash'], y['dhash'])
    ncc = float(np.dot(np.array(x['thumb']), np.array(y['thumb'])) / len(x['thumb']))
    if ph <= 14 or dh <= 12 or ncc > 0.85:
        rows.append((ph, dh, round(ncc, 3), a, b))
rows.sort()
print(f'{len(items)} photographs, {len(items) * (len(items) - 1) // 2} pairs compared, {len(rows)} flagged')
for r in rows: print('pHash %2d  dHash %2d  ncc %.3f  %s  ~  %s' % r)
