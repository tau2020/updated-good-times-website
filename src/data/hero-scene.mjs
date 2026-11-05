/**
 * The home hero's café scene, measured once in the film's own 1280×720 frame (src/tools/build-video.sh): where
 * each of the five friends' faces is (forehead to chin, cheek to cheek or ear). The layout keeps every one of them
 * clear of the call to action and the phone at every screen size (styles.css › Home hero); qa/hero.mjs maps these
 * boxes through the poster's crop in a real browser to prove it, and test/hero.test.mjs checks that the film's
 * freeze mask (src/tools/hero-moment-mask.mjs) lets nothing move on a face.
 */
export const FRAME = { width: 1280, height: 720 };

/** [x0, y0, x1, y1] in frame pixels. */
export const FACES = {
  sleeping: [255, 465, 485, 640], // asleep on the table, lower left: the call to action stays below his chin or left of him
  curly: [515, 300, 655, 460],
  brunette: [690, 340, 835, 520], // holding the phone the gallery enlarges
  back: [785, 185, 925, 345],
  blonde: [885, 330, 1045, 505], // the face nearest the phone, bottom right
};
