"""sift.py <dir> [min_inliers] : the same photograph however it is cropped, scaled, recompressed or re-toned. SIFT
keypoints on each image (longest side 800 px), Lowe's ratio test, then a RANSAC homography: a pair is flagged when at
least min_inliers (default 25) matches agree on one geometric transform. A crop or resize of one photograph fits with
hundreds of inliers; two different photographs of the same place fit with few or none, unless the scene is the same
flat object (a sign, a mural) or a burst. Every flagged pair is then looked at by eye. Data only."""
import sys, os, itertools
import numpy as np
import cv2
d = sys.argv[1]
MIN = int(sys.argv[2]) if len(sys.argv) > 2 else 25
sift = cv2.SIFT_create(nfeatures=1500)
F = {}
for f in sorted(os.listdir(d)):
    im = cv2.imread(os.path.join(d, f), cv2.IMREAD_GRAYSCALE)
    if im is None:
        print('unreadable', f); continue
    s = 800 / max(im.shape)
    if s < 1:
        im = cv2.resize(im, (int(im.shape[1] * s), int(im.shape[0] * s)), interpolation=cv2.INTER_AREA)
    kp, des = sift.detectAndCompute(im, None)
    F[f.rsplit('.', 1)[0]] = (np.float32([k.pt for k in kp]), des)
bf = cv2.BFMatcher(cv2.NORM_L2)
rows = []
for a, b in itertools.combinations(F, 2):
    (pa, da), (pb, db) = F[a], F[b]
    if da is None or db is None or len(da) < 8 or len(db) < 8:
        continue
    good = [m for m, n in (p for p in bf.knnMatch(da, db, k=2) if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 10:
        continue
    src = pa[[m.queryIdx for m in good]].reshape(-1, 1, 2)
    dst = pb[[m.trainIdx for m in good]].reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    inl = int(mask.sum()) if mask is not None else 0
    if inl >= MIN:
        rows.append((inl, len(good), a, b))
rows.sort(reverse=True)
print(f'{len(F)} photographs, {len(F) * (len(F) - 1) // 2} pairs, {len(rows)} flagged (>= {MIN} RANSAC inliers)')
for r in rows: print('%4d inliers of %4d matches  %s  ~  %s' % r)
