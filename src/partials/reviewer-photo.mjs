/**
 * A reviewer's profile photo: their own Tripadvisor picture, shown on the review cards at the owner's request
 * (5 Nov 2026). Each is a file supplied by the owner in src/assets/img/reviewers/ (square, 168 px or larger),
 * named by the review's `avatar` in src/data/reviews.mjs. A photo is used only once its file is in the
 * repository, never as a broken image; until then the card keeps the reviewer's initials (the reviews page)
 * or an illustrated avatar (the home page). The reviewers' own consent is not recorded:
 * docs/APPROVAL_REGISTER.md › R2.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVIEWER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img', 'reviewers');
/** A file name as reviews.mjs records it: lower case, digits and hyphens, one image extension. */
export const REVIEWER_FILE = /^[a-z0-9-]+\.(jpe?g|png|webp)$/;

/** The site path of a reviewer's photo, or '' while its file is not in the repository. */
export function reviewerPhoto(file, { exists = (f) => existsSync(join(REVIEWER_DIR, f)) } = {}) {
  return file && REVIEWER_FILE.test(file) && exists(file) ? `assets/img/reviewers/${file}` : '';
}
