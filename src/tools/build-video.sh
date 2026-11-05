#!/usr/bin/env bash
# Hero film pipeline, "the world has stopped, the memories haven't":
#   media-src/video/hero-moment-src.mp4 → src/assets/video/hero-moment-1280.{mp4,webm} + poster renditions.
#
#   bash src/tools/build-video.sh            (npm run video)
#   bash src/tools/build-video.sh --crf=20   (another H.264 quality for the held picture; default 20)
#
# Source: the film supplied by the owner on 5 Nov 2026 (gemini_generated_video_db7db861.mp4, 1280×720,
# 24 fps, 192 frames, H.264 + AAC, 2,353,822 bytes): five friends round a phone at a café above the
# Atlantic, Table Mountain behind, one of them asleep on the table. It is AI-generated, made from the
# approved still of the same scene (docs/RIGHTS_REGISTER.md, basis G). The camera never moves and the
# people hardly do, but a generated film shimmers faintly on faces and hair, so:
#  1. Freeze: every frame is the film's first frame, except where the mask from
#     src/tools/hero-moment-mask.mjs lets the cloud over Table Mountain and the sea keep moving
#     (feathered, and kept clear of every person). The people are held exactly still.
#  2. Loop: the last second crossfades into the first, so the cloud and the surf have no visible
#     jump; the held picture is identical on both sides of the fade.
#  3. Encode H.264 (High) and VP9 at the source's own size (never upscaled), audio dropped, with one
#     keyframe per loop so the held faces never "pulse" at a keyframe.
#  4. Posters: the loop's first frame, scaled with Lanczos in ffmpeg (the film's own colour matrix),
#     then encoded by the image pipeline's tools as AVIF/WebP at 640, 960 and 1280 px, so the film
#     fades in over its own poster without a visible change.
# Needs ffmpeg with libx264 and libvpx-vp9, cwebp and avifenc (as `npm run images`), and Node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/media-src/video/hero-moment-src.mp4"
VID="$ROOT/src/assets/video"
IMG="$ROOT/src/assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

CRF=20
for a in "$@"; do case "$a" in --crf=*) CRF="${a#--crf=}" ;; esac; done

[ -f "$SRC" ] || { echo "missing $SRC (the supplied film, see the header of this script)"; exit 1; }
mkdir -p "$VID" "$IMG"

FPS=24
FADE=24 # frames: one second
FRAMES=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$SRC")
LOOP=$((FRAMES - FADE))                                                     # frames in the finished loop
OFFSET=$(awk -v n="$LOOP" -v f="$FPS" -v d="$FADE" 'BEGIN { printf "%.6f", (n - d) / f }') # where the crossfade starts
# The source's colour tags, restated on every output so browsers render the same colour
COLOUR=(-colorspace smpte170m -color_primaries bt709 -color_trc iec61966-2-1)

# 1. The freeze mask, feathered
node "$ROOT/src/tools/hero-moment-mask.mjs" "$TMP/mask.pgm"
ffmpeg -v error -y -i "$TMP/mask.pgm" -vf "gblur=sigma=3,format=gray" "$TMP/mask.png"

# 2. Freeze and loop in one graph, into a near-lossless intermediate (audio dropped)
ffmpeg -v error -y -i "$SRC" -loop 1 -framerate "$FPS" -i "$TMP/mask.png" -filter_complex "\
[0:v]setpts=PTS-STARTPTS,split=2[live][first];\
[first]trim=end_frame=1,loop=loop=$((FRAMES - 1)):size=1:start=0,setpts=N/$FPS/TB[held];\
[1:v]format=gray,trim=end_frame=$FRAMES,setpts=N/$FPS/TB[mask];\
[live][mask]alphamerge[weather];\
[held][weather]overlay=format=yuv420:shortest=1,format=yuv420p,split=2[a][b];\
[a]trim=start_frame=$FADE,setpts=PTS-STARTPTS[main];\
[b]trim=end_frame=$FADE,setpts=PTS-STARTPTS[head];\
[main][head]xfade=transition=fade:duration=$(awk -v d="$FADE" -v f="$FPS" 'BEGIN { printf "%.6f", d / f }'):offset=$OFFSET,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -crf 8 -preset medium "${COLOUR[@]}" "$TMP/loop.mp4"

# 3. The film: 16:9 at 1280×720, one keyframe per loop
ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libx264 -profile:v high -preset slow -crf "$CRF" -pix_fmt yuv420p \
  -x264-params "keyint=$LOOP:min-keyint=$LOOP:scenecut=0" -movflags +faststart "${COLOUR[@]}" "$VID/hero-moment-1280.mp4"
ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -deadline good -cpu-used 1 \
  -g "$LOOP" -keyint_min "$LOOP" -pix_fmt yuv420p "${COLOUR[@]}" "$VID/hero-moment-1280.webm"

# 4. Posters = the loop's first frame
poster() { # name width
  ffmpeg -v error -y -i "$TMP/loop.mp4" -frames:v 1 -vf "scale=$2:-2:flags=lanczos+accurate_rnd+full_chroma_int,format=rgb24" "$TMP/$1-$2.png"
  cwebp -quiet -q 82 -m 6 -metadata none "$TMP/$1-$2.png" -o "$IMG/$1-$2.webp"
  avifenc -q 62 -s 4 -j 4 --ignore-exif --ignore-xmp "$TMP/$1-$2.png" "$IMG/$1-$2.avif" >/dev/null
}
for w in 640 960 1280; do poster hero-moment-poster "$w"; done

# 4b. The band under the picture on portrait screens (styles.css): the frame's lower part mirrored, as if the
#     table were glass, shrunk to 96 px, blurred (more across than down, so stretching never streaks) and dimmed.
#     About 1 KB; drawn stretched, under a navy gradient
ffmpeg -v error -y -i "$TMP/loop.mp4" -frames:v 1 -vf "crop=iw:ih*0.44:0:ih*0.56,vflip,scale=96:-2:flags=area,gblur=sigma=3.5:sigmaV=2,eq=brightness=-0.08:saturation=1.15,format=rgb24" "$TMP/reflection.png"
cwebp -quiet -q 70 -m 6 -metadata none "$TMP/reflection.png" -o "$IMG/hero-moment-reflection.webp"

# 5. Record the poster widths for picture()
node --input-type=module -e '
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = process.argv[1];
const m = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
m["hero-moment-poster"] = { widths: [640, 960, 1280], width: 1280, height: 720 };
writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n");
' "$ROOT/src/data/images.generated.json"

echo "loop: $LOOP frames ($(awk -v n="$LOOP" -v f="$FPS" 'BEGIN { printf "%.2f", n / f }') s), H.264 crf $CRF"
ls -la "$VID"/hero-moment-* "$IMG"/hero-moment-poster* "$IMG"/hero-moment-reflection.webp
