/**
 * The brand aircraft (home page entrance, assets/js/brand-plane.js).
 *
 * The approved compact lockup (Approved Logo Pack v2, src/assets/brand/gt-logo-compact.svg, used as supplied) already
 * holds the aircraft: a green airliner seen from above, nose down, that forms the "i" of "in", at the end of a dotted
 * route that starts at a location pin above Table Mountain. Nothing here redraws or edits the logo files. At build time
 * this module reads the lockup's green path and finds, in the logo's own 2121 × 564 units:
 *   - the aircraft glyph (its outline, unchanged, is the docked state and the flying silhouette),
 *   - the dotted route, pin first, dot by dot, to the glyph (the last leg of the flight follows it),
 * and writes them into the page: an invisible dock anchor over the glyph inside the logo link (data-aircraft-dock),
 * and a decorative flight layer in the header (aria-hidden, never takes a click) holding the flying aircraft.
 *
 * Two flying aircraft (owner approval point, docs/motion/01-plane-validation.md):
 *   - jet (the default, the only one in production builds): the logo's own airliner outline with flight detail
 *     (cockpit, nacelles, panel lines, lights) that fades as it lands, so the docked frame is exactly the logo;
 *   - prop (preview builds, ?aircraft=prop): the motion package's original single-engine propeller aircraft
 *     (src/assets/motion/gtict-real-aircraft.svg), recoloured to the logo's greens, crossfading into the glyph.
 */
import { readFileSync } from 'node:fs';

const LOGO = new URL('../assets/brand/gt-logo-compact.svg', import.meta.url);
const PROP = new URL('../assets/motion/gtict-real-aircraft.svg', import.meta.url);
/** Logo units of clear space around the glyph in the dock box and the mask's hole (nothing else of the lockup is that close). */
export const DOCK_PAD = 2;

const round = (n, d = 4) => Number(n.toFixed(d));

/** Absolute M/L/Z subpaths of a path's d attribute, as point lists (the lockup's green path uses nothing else). */
export function subpaths(d) {
  if (/[^MLZmlz0-9.,\s-]/.test(d)) throw new Error('aircraft.mjs expects M, L and Z commands only in the green path');
  if (/[mlz]/.test(d.replace(/Z/g, ''))) throw new Error('aircraft.mjs expects absolute commands in the green path');
  return d
    .split('M')
    .filter((s) => s.trim())
    .map((s) => {
      const nums = s.replace(/[LZ]/g, ' ').trim().split(/[\s,]+/).map(Number);
      const pts = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      return { d: `M${s.trim()}`, pts };
    });
}

const box = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const b = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  return { ...b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
};

/**
 * The aircraft, the route and the pin, read from the approved lockup.
 * @returns {{ width: number, height: number, fill: string, glyph: { d: string, box: object }, route: number[][], pin: number[] }}
 */
let cached;
export function logoGeometry(svg) {
  if (svg === undefined) return (cached ||= logoGeometry(readFileSync(LOGO, 'utf8')));
  const [width, height] = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg).slice(1).map(Number);
  const green = [...svg.matchAll(/<path\b([^>]*)\/?>/g)].map((m) => m[1]).find((a) => /fill="#(059A35|45E375)"/i.test(a));
  if (!green) throw new Error('aircraft.mjs: the lockup has no green path');
  const fill = /fill="(#[0-9A-F]{6})"/i.exec(green)[1];
  const parts = subpaths(/\sd="([^"]+)"/.exec(green)[1]).map((s) => ({ ...s, box: box(s.pts) }));
  // The two tall shapes on the wordmark's line are the aircraft (the "i") and the "n" to its right
  const tall = parts.filter((p) => p.box.h > height * 0.12).sort((a, b) => a.box.x0 - b.box.x0);
  const glyph = tall[0];
  if (!glyph || tall.length < 2 || glyph.box.x1 > tall[1].box.x0) throw new Error('aircraft.mjs: aircraft glyph not found');
  // The pin is the topmost shape (its ring; the hole is the shape inside it); the rest of the small shapes are the dots
  const pin = parts.reduce((a, b) => (b.box.y0 < a.box.y0 ? b : a));
  const inside = (p, q) => p !== q && p.box.x0 >= q.box.x0 && p.box.x1 <= q.box.x1 && p.box.y0 >= q.box.y0 && p.box.y1 <= q.box.y1;
  const dots = parts.filter((p) => !tall.includes(p) && p !== pin && !inside(p, pin) && p.box.w < 30 && p.box.h < 30);
  // Chain the dots from the pin to the aircraft, nearest first
  const route = [[pin.box.cx, pin.box.cy]];
  const left = dots.map((p) => [p.box.cx, p.box.cy]);
  while (left.length) {
    const [x, y] = route[route.length - 1];
    let k = 0;
    for (let i = 1; i < left.length; i++) if (Math.hypot(left[i][0] - x, left[i][1] - y) < Math.hypot(left[k][0] - x, left[k][1] - y)) k = i;
    route.push(left.splice(k, 1)[0]);
  }
  route.push([glyph.box.cx, glyph.box.cy]);
  return { width, height, fill, glyph: { d: glyph.d, box: glyph.box }, route, pin: [pin.box.cx, pin.box.cy], dots: dots.length };
}

/** The dock box (the glyph with its clear space) as fractions of the lockup, and the CSS for the anchor and the mask's hole. */
export function dockBox(g = logoGeometry()) {
  const x0 = g.glyph.box.x0 - DOCK_PAD;
  const y0 = g.glyph.box.y0 - DOCK_PAD;
  const w = g.glyph.box.w + 2 * DOCK_PAD;
  const h = g.glyph.box.h + 2 * DOCK_PAD;
  const fx = x0 / g.width;
  const fy = y0 / g.height;
  const fw = w / g.width;
  const fh = h / g.height;
  // A mask layer's position percentage places it at p × (box − layer), so the hole's left edge at fx needs fx / (1 − fw)
  return {
    viewBox: `${x0} ${y0} ${w} ${h}`,
    fx: round(fx),
    fy: round(fy),
    fw: round(fw),
    fh: round(fh),
    style: `--dock-x: ${round(fx * 100, 3)}%; --dock-y: ${round(fy * 100, 3)}%; --dock-w: ${round(fw * 100, 3)}%; --dock-h: ${round(fh * 100, 3)}%; --hole-x: ${round((fx / (1 - fw)) * 100, 3)}%; --hole-y: ${round((fy / (1 - fh)) * 100, 3)}%`,
  };
}

/** The route (pin → dots → aircraft centre) as fractions of the lockup, for the flight's last leg. */
export function routeFractions(g = logoGeometry()) {
  return g.route.map(([x, y]) => [round(x / g.width), round(y / g.height)]);
}

/** The anchor inside the logo link: an empty box exactly over the glyph (measured by the flight, never seen). */
export function aircraftDock() {
  const g = logoGeometry();
  const b = dockBox(g);
  return `<span class="brand__dock" data-aircraft-dock aria-hidden="true" style="${b.style}" data-route="${JSON.stringify(routeFractions(g))}"></span>`;
}

/** Flight detail over the logo's airliner outline (logo units; the nose points down, +y). Faded out as it lands. */
function jetDetail() {
  return `<g class="aircraft-flight__detail">
      <path class="aircraft-flight__light" d="M1012 466 L1016 466 L1016.6 534 Q1014 539 1011.4 534 Z"/>
      <path class="aircraft-flight__shade" d="M1007 510 L999 504 L995 500 L975 483 L974 481 L1007 491 Z"/>
      <path class="aircraft-flight__shade aircraft-flight__shade--far" d="M1020 511 L1029 504 L1033 501 L1050 487 L1054 483 L1020 491 Z"/>
      <path class="aircraft-flight__line" d="M1006 494 L981 481 M1021 494 L1047 481 M1009.5 470 L1009.5 528 M1018.5 470 L1018.5 528"/>
      <ellipse class="aircraft-flight__nacelle" cx="997.2" cy="500.4" rx="2.1" ry="4.3" transform="rotate(-34 997.2 500.4)"/>
      <ellipse class="aircraft-flight__nacelle" cx="1031" cy="500.6" rx="2.1" ry="4.3" transform="rotate(34 1031 500.6)"/>
      <path class="aircraft-flight__glass" d="M1010.6 535.5 Q1014 533 1017.4 535.5 L1016.8 539.6 Q1014 541.2 1011.2 539.6 Z"/>
      <path class="aircraft-flight__fin" d="M1014 452.6 L1014 468"/>
      <circle class="aircraft-flight__nav aircraft-flight__nav--starboard" cx="975.4" cy="479.2" r="1.15"/>
      <circle class="aircraft-flight__nav aircraft-flight__nav--port" cx="1052.6" cy="481.6" r="1.15"/>
    </g>`;
}

/**
 * The package's propeller aircraft (viewBox 0 0 200 220, nose up), turned nose down and fitted over the glyph's box,
 * its ids renamed so they cannot clash with anything else in the page, its colours tied to the logo's greens.
 */
export function propAircraft(g = logoGeometry()) {
  const src = readFileSync(PROP, 'utf8');
  const body = /<g id="aircraft"[\s\S]*<\/g>/.exec(src)[0]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sid="(\w+)"/g, ' data-part="$1"')
    .replace(/url\(#paint\)/g, 'url(#gt-aircraft-prop-paint)')
    .replace(/url\(#canopy\)/g, 'url(#gt-aircraft-prop-canopy)')
    .replace(/stroke="#0A743E"/g, 'class="aircraft-flight__prop-edge"')
    .replace(/\s+/g, ' ');
  const b = g.glyph.box;
  // The prop's planform (wings 8–192, nose 9 to tail 208) to the glyph's span and length, turned about its centre
  const k = Math.min(b.w / 184, b.h / 199);
  return `<g class="aircraft-flight__prop" transform="translate(${round(b.cx, 2)} ${round(b.cy, 2)}) rotate(180) scale(${round(k, 4)}) translate(-100 -108.5)">${body}</g>`;
}

/**
 * The decorative flight layer (home page header): hidden until the entrance shows it, never focusable or clickable.
 * In preview builds it accepts ?aircraft=prop, the owner's comparison of the two aircraft (never in production).
 */
export function aircraftFlight({ preview = false } = {}) {
  const g = logoGeometry();
  const b = dockBox(g);
  const glyph = g.glyph.d.replace(/\s+/g, ' ');
  return `<div class="aircraft-flight" data-aircraft-flight${preview ? ' data-aircraft-preview' : ''} data-variant="jet" aria-hidden="true" hidden>
  <svg class="aircraft-flight__defs" width="0" height="0" focusable="false"><defs><path id="gt-aircraft-glyph" d="${glyph}"/></defs></svg>
  <svg class="aircraft-flight__trail" data-aircraft-trail focusable="false"><path d=""/></svg>
  <div class="aircraft-flight__shadow" data-aircraft-shadow><svg viewBox="${b.viewBox}" focusable="false"><use href="#gt-aircraft-glyph"/></svg></div>
  <div class="aircraft-flight__plane" data-aircraft-plane>
    <div class="aircraft-flight__bank" data-aircraft-bank>
      <svg viewBox="${b.viewBox}" focusable="false">
        ${
          preview
            ? `<defs>
          <linearGradient id="gt-aircraft-prop-paint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="aircraft-flight__stop-light"/><stop offset="1" class="aircraft-flight__stop-deep"/></linearGradient>
          <linearGradient id="gt-aircraft-prop-canopy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123B4A"/><stop offset="1" stop-color="#0D2433"/></linearGradient>
        </defs>`
            : ''
        }
        <g class="aircraft-flight__jet"><use class="aircraft-flight__glyph" href="#gt-aircraft-glyph"/>${jetDetail()}</g>
        ${preview ? propAircraft(g) : ''}
        <use class="aircraft-flight__glyph aircraft-flight__glyph--final" href="#gt-aircraft-glyph"/>
      </svg>
    </div>
  </div>
</div>`;
}
