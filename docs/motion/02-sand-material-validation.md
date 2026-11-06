# 02 · Sand material and the single footprint: validation

Gate 2. Files: `src/assets/js/motion/sand/foot.js` (the anatomy, the press envelopes, the CPU reference),
`shaders.js` (the material, generated from foot.js's numbers), `renderer.js`, `noise.js`, `random.js`.

## The footprint

One canonical bare adult foot, in centimetres, seen from above. It is about 24.9 cm from the back of the heel to the
tip of the big toe. (Revised after the independent review, 05, B1.) Left and right differ in which way the medial axis points in the world, so the big toe is always
on the inside of the trail; tests check this for every step.

| Part | Model | Depth weight |
|---|---|---|
| Heel pad | ellipse 6.3 × 8 cm | 1.0 (deepest), cupped |
| Midfoot | a broad band along the outer side, 4.5–5.7 cm wide (about half the forefoot), joined to the heel and the ball by wide fillets, so **the outline runs on unbroken from heel to ball** | 0.6 on the outer edge, shallower towards the arch |
| Medial arch | **no contact**: a gentle hollow on the big toe's side (the shallow arch) | 0 |
| Ball | tapered capsule from the 1st metatarsal head (larger, deeper) to the 5th | 0.95 |
| Big toe | the largest pad, furthest in, joined faintly to the ball by its proximal phalanx | 0.86 |
| Toes 2–5 | **oval** pads in a descending arc, **tucked 0.2–0.6 cm from the ball**, getting smaller, with a thin ridge of sand between them and the ball | 0.6 → 0.42 |

**Caving, not stamping:** each part's contact starts as a small patch in its middle and spreads to the full outline as
the weight comes on (the signed distance is offset by `(1 − press)^1.5 × 1.8 cm` for the sole and 0.9 cm for the toes).
The sand gives way from the middle, and no part appears as a full outline at zero depth. The walls slump over about
1 cm and are roughened at three grain scales, the push-off heaps sand in front of the toes, and the floor keeps some
grain texture (compacted, not polished).

Each print varies from the canonical foot by seed: length ±3 %, width −5/+6 %, toe spread −7/+9 %, depth ±10 %,
the heel/ball weight balance ±8 %, the little toe's visibility, and angle ±2.5°. No two prints are stamped copies,
and none mirrors the one before it.

**The press.** Within its own window each step presses heel, then ball, then toes:
`heel = smoothstep(0, .40, t)`, `fore = smoothstep(.28, .78, t)`, `toes = smoothstep(.55, .96, t)` (the package's
envelopes). Every envelope is monotonic, so scrolling back un-presses in exact reverse.

## The material

The sand's height field, in centimetres, is low dunes plus wind ripples plus grain relief, plus each print's depression
and rim:

- **Wind ripples:** asymmetric (long stoss, short lee), about 7 cm apart, warped by noise, about 1 mm high, flattened inside the prints.
- **Grain relief and albedo:** a 1024² tile (one texel about 0.7 mm) baked once on the GPU at start, then sampled twice at incommensurate scales and rotations so it never repeats visibly. It carries grain height, per-grain albedo, 1–2 % dark heavy-mineral grains, rare cream shell fragments, and broad damp/compact mottling.
- **The print:** walls slump over about 1 cm (sand never cuts cleanly) and are roughened at grain scale, so no outline is crisp. The floor is compacted, a little darker and greyer, and smoother. The rim is lumpy displaced sand peaking about 1.35 cm outside the edge, highest behind the heel (the strike) and in front of the toes (the push-off).
- **Light:** one low sun from the upper left, about 28° up. Normals come from finite differences of the height field at one device pixel. **Cast shadows** come from a 7-step march towards the sun through the nearby prints (full tier only), with occlusion deeper in the cavity and on its steep walls, and a cool sky fill. The result is converted to sRGB.
- **Grains in flight:** a fixed pool, each grain's position a pure function of p. They are thrown outwards as each part of the foot presses, and forwards from the toes at the push-off. They are 1–2 px, short-lived, with shadows offset by their height.

Nothing in the shader reads a clock (tested). The picture is a function of the uniforms, and the uniforms of p.

## Evidence

- `qa/footprint-left-press.jpg`, `qa/footprint-right-press.jpg`: one left and one right print at 15, 40, 62, 85 and 100 % of the press (WebKit, 2× pixels, the real shader in the page): a small dent in the middle of the heel that spreads, then the ball, then the toes
- `qa/footprint-right-closeup-2x.jpg`: a finished right print at 2×
- `qa/footprint-depth-model.png`: the CPU reference's depth map (light = rim, dark = deep)
- Tests (`test/motion-sand.test.mjs`): five separate toes, the big toe largest and medial, the descending arc, toes tucked 0.3–1 cm from the ball with a ridge between, heel and ball deepest, the midfoot 38–65 % of the forefoot's width with no break in the outline from heel to ball, no medial arch contact, caving from the middle, a rim behind the heel, the press order, monotonic envelopes, per-step variation, and the shader's constants written from the tested model

## Strongest criticism

The independent reviewer's, of the first build (05, B1): "footprint icons stamped into beige plasticine": the
parts were separate primitives (a narrow midfoot strip, a capsule ball, round toe beads detached from the ball), each
appearing as a full outline and then deepening "like a cookie cutter". The revision above answers each point: one
continuous outline, a broad midfoot, oval toes tucked close, caving from the middle, crumblier walls, and a push-off heap.

What still falls short (mine, after the revision):
- The lesser toes are still more regular than real ones (similar ovals in an even arc). Real toes smear, and the 2nd and 3rd often merge.
- There are no sole creases and no moisture gradient inside the print.
- It is one material (dry to slightly damp fine sand): no wet sheen, and a uniform ripple field.
- At the default scale a foot is about 150 px on desktop and 117 px on phones: legible anatomy, not a macro close-up.

## Artefacts found and fixed during validation

| Artefact | Cause | Fix |
|---|---|---|
| Hatched "fan" in front of the toes | a thresholded noise term for ejecta | removed; the push-off is part of the rim |
| Isolated oval in the middle of the foot | a medial arch region not joined to the sole | arch contact removed |
| Straight streaks near prints on phones | the rim's tail cut off at the evaluation radius | rim fades to 0 by 19 cm; radius 20.5 cm |
| A crack-like seam beside the ball while the toes were still lifted | the rim's strength switched between the sole's and the toes' envelopes on the bisector of their outlines | blended across the boundary (shader and CPU model) |
| A faint V-shaped sliver as the ball first touches | the caving patch starts along the ball capsule's axis | left: visible for about 1 % of the scroll, while that print forms |

## Approval item

**M3 imprint realism:** approve the close-ups above, or ask for the next pass (the messier toes and ball, sole texture,
moisture gradient). That next pass is shader work only; the storyboard, tests and fallbacks stay.
