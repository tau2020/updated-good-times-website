# Perceptual duplicate scans (the media audit, 6 Nov 2026)

Dev-only checks that no photograph appears twice under another file name, size, compression or crop. They read image
files as data and execute nothing in them. Python 3 with `numpy` and `Pillow`; `sift.py` also needs
`opencv-python-headless` (install into a throwaway virtualenv, never into the site). None of this is a site dependency.

1. Collect the largest rendition of every photograph in use into one directory, one file per slot
   (`<slot>.webp`, from `src/assets/img/<slot>-<largest width>.webp`).
2. `python3 -I qa/perceptual/phash.py fp.json <dir>`: dHash, DCT pHash and a 16 × 16 thumbnail per image.
3. `python3 -I qa/perceptual/near.py fp.json`: every pair within 14 bits (pHash) or 12 bits (dHash), or whose
   thumbnails correlate above 0.85. Catches recompressed, resized and re-toned copies. It does **not** catch crops.
4. `python3 -I qa/perceptual/sift.py <dir> [min_inliers]`: SIFT keypoints and a RANSAC homography for every pair.
   A crop or resize of one photograph fits with hundreds of agreeing points. Different photographs of one flat
   subject (a mural, a sign) or one viewpoint fit with tens. Every flagged pair is then looked at by eye.

Before trusting a scan, check it on a deliberate crop of one of the photographs. The 6 Nov 2026 results are in
`audit/image-quality-report.md` § Duplicate scan and `audit/perceptual-scan.txt`.
