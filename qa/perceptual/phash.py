"""phash.py <out.json> <dir-or-file>... : perceptual fingerprints (dHash, DCT pHash, 16x16 gray) for every image.
Images are data only; nothing in them is executed."""
import sys, json, os, hashlib
import numpy as np
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = 200_000_000
N = 32
_c = np.array([[np.cos(np.pi * (2 * x + 1) * u / (2 * N)) * (np.sqrt(1 / N) if u == 0 else np.sqrt(2 / N)) for x in range(N)] for u in range(N)])
def fp(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    g = im.convert('L')
    d = np.asarray(g.resize((9, 8), Image.LANCZOS), dtype=np.float64)
    dh = ''.join('1' if b else '0' for b in (d[:, 1:] > d[:, :-1]).flatten())
    a = np.asarray(g.resize((N, N), Image.LANCZOS), dtype=np.float64)
    dct = _c @ a @ _c.T
    low = dct[:8, :8].flatten()
    med = np.median(low[1:])
    ph = ''.join('1' if v > med else '0' for v in low)
    t = np.asarray(g.resize((16, 16), Image.LANCZOS), dtype=np.float64).flatten()
    t = ((t - t.mean()) / (t.std() + 1e-9)).round(3).tolist()
    col = np.asarray(im.resize((8, 8), Image.LANCZOS), dtype=np.float64).reshape(-1, 3).mean(0).round(1).tolist()
    return {'w': w, 'h': h, 'dhash': dh, 'phash': ph, 'thumb': t, 'mean': col}
out = {}
for arg in sys.argv[2:]:
    files = [os.path.join(arg, f) for f in sorted(os.listdir(arg))] if os.path.isdir(arg) else [arg]
    for f in files:
        if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif')):
            continue
        try:
            r = fp(f)
            r['sha256'] = hashlib.sha256(open(f, 'rb').read()).hexdigest()
            r['bytes'] = os.path.getsize(f)
            out[f] = r
        except Exception as e:
            out[f] = {'error': str(e)}
json.dump(out, open(sys.argv[1], 'w'))
print(len(out), 'fingerprinted')
