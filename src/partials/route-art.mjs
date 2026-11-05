/**
 * The Garden Route's illustrated route: an original sketch drawn for this site,
 * shown only where a multi-day tour has no photograph (Good Times' Garden Route
 * tour has its own, so the sketch is a fallback). It is never replaced by a
 * photograph of another place, which would mislead.
 * Schematic and not to scale: the places Good Times' Garden Route tour names,
 * Cape Town in the west, east along the coast to Wilderness and Knysna, inland
 * to Oudtshoorn, and on to the Tsitsikamma. Colours come from the theme tokens
 * (styles.css › 24).
 */
import { esc } from './ui.mjs';

// Stops in the sketch's 600 × 400 frame; labels alternate above and below the route so they never collide.
const STOPS = [
  { name: 'Cape Town', x: 70, y: 200, label: 'above' },
  { name: 'Oudtshoorn', x: 286, y: 112, label: 'above' },
  { name: 'Wilderness', x: 330, y: 208, label: 'above' },
  { name: 'Knysna', x: 395, y: 204, label: 'below' },
  { name: 'Tsitsikamma', x: 545, y: 208, label: 'below', dx: -12 },
];

const COAST = [
  [0, 214], [18, 218], [34, 232], [44, 262], [52, 300], [60, 292], [66, 262], [76, 246], [98, 244], [118, 256], [130, 250], [150, 238],
  [190, 240], [230, 246], [246, 258], [262, 250], [290, 242], [330, 236], [370, 234], [392, 238], [398, 246], [404, 238], [430, 240],
  [452, 248], [466, 256], [480, 250], [510, 242], [545, 240], [600, 238],
];
const coastPath = COAST.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
// Land and sea run well past the 600 × 400 frame, so a box of any shape (4:3 cards, the 3:2 hero) is filled
// edge to edge while the whole route stays in view ("meet" scaling, never cropped).
const landPath = `M-300,-300 H900 V238 H600 ${[...COAST].reverse().slice(1).map(([x, y]) => `L${x},${y}`).join(' ')} H-300 Z`;
const ROUTE = 'M70,200 C140,190 230,198 300,206 S318,210 330,208 S370,202 395,204 S480,212 545,208';
// Inland, over the mountains, to Oudtshoorn and back to the coast road.
const SPUR = 'M300,206 C296,176 290,146 286,112';
const RIDGE = 'M180,170 L205,150 L222,162 L246,140 L268,160 L292,146 L318,166 L344,148 L372,164 L400,150 L428,166 L456,152 L486,168 L514,154 L548,170 L580,158 L600,166';

/** The places the sketch names, west to east (for text alternatives and tests). */
export const ROUTE_STOPS = STOPS.map((s) => s.name);

/**
 * @param {{ id: string, decorative?: boolean }} opts  `decorative` for cards, where the text beside it says the same.
 */
export function routeArt({ id, decorative = false }) {
  const a11y = decorative
    ? 'aria-hidden="true" focusable="false"'
    : `role="img" aria-labelledby="${id}-title ${id}-desc"`;
  const text = decorative
    ? ''
    : `<title id="${id}-title">Garden Route Private Tour: route sketch</title>
  <desc id="${id}-desc">An illustrated route, not to scale: from Cape Town east along the coast to Wilderness and Knysna, inland over the mountains to Oudtshoorn, and on to the Tsitsikamma forest, between the mountains and the Indian Ocean.</desc>`;
  return `<svg class="route-art" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" ${a11y}>
  ${text}
  <rect class="route-art__sea" x="-300" y="-300" width="1200" height="1000"/>
  <path class="route-art__land" d="${landPath}"/>
  <path class="route-art__ridge" d="${RIDGE}"/>
  <path class="route-art__coast" d="${coastPath}"/>
  <path class="route-art__route" d="${ROUTE}"/>
  <path class="route-art__route" d="${SPUR}"/>
  ${STOPS.map((s) => `<circle class="route-art__stop" cx="${s.x}" cy="${s.y}" r="7"/>
  <text class="route-art__label" x="${s.x + (s.dx || 0)}" y="${s.label === 'above' ? s.y - 20 : s.y + 36}" text-anchor="middle">${esc(s.name)}</text>`).join('\n  ')}
  <text class="route-art__sea-label" x="24" y="376">ATLANTIC OCEAN</text>
  <text class="route-art__sea-label" x="576" y="376" text-anchor="end">INDIAN OCEAN</text>
</svg>`;
}
