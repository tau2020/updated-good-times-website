#!/usr/bin/env bash
# Hero film pipeline: media-src/video/hero-coast-src.mp4 → src/assets/video + poster renditions.
#
#   bash src/tools/build-video.sh
#
# Source: a coastal film for the homepage hero, once Good Times supplies authorised footage (media-src/video/hero-coast-src.mp4,
# 1280×720, 24 fps, 10 s, H.264 + AAC, 5,905,626 bytes, received 2026-10-17): a
# woman in an ivory summer dress seated with her back to the camera above the
# surf, mountains behind. The camera is static; only her hair and the water move.
# Steps: crossfade the last second into the first so the loop has no visible jump
# (the source's last and first frames differ in hair and surf), drop the audio
# track, encode H.264 + VP9 for landscape screens (16:9) and a 4:5 portrait crop
# framed on the figure for phones and portrait tablets, then export poster frames
# (the loop's first frame) as AVIF/WebP. Needs only ffmpeg built with libx264,
# libvpx-vp9, libwebp and libaom (Homebrew and Ubuntu builds include all four).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/media-src/video/hero-coast-src.mp4"
VID="$ROOT/src/assets/video"
IMG="$ROOT/src/assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }
mkdir -p "$VID" "$IMG"

FADE=1
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$SRC")
OFFSET=$(awk -v d="$DUR" -v f="$FADE" 'BEGIN { printf "%.3f", d - 2*f }')
CROP="crop=576:720:656:0" # 4:5 window: the figure right of centre, surf and beach to her left
# The source's colour tags, restated on every output so browsers render the same colour
COLOUR=(-colorspace smpte170m -color_primaries bt709 -color_trc iec61966-2-1)

# 1. Seamless loop master (lossless-ish intermediate, audio dropped)
ffmpeg -v error -y -i "$SRC" -filter_complex \
  "[0:v]trim=start=${FADE},setpts=PTS-STARTPTS[main];[0:v]trim=end=${FADE},setpts=PTS-STARTPTS[head];[main][head]xfade=transition=fade:duration=${FADE}:offset=${OFFSET},format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -crf 12 -preset medium "${COLOUR[@]}" "$TMP/loop.mp4"

# 2. Landscape 16:9 (1280×720, the source's own size)
ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libx264 -profile:v high -preset slow -crf 25 -pix_fmt yuv420p -g 48 -movflags +faststart "${COLOUR[@]}" "$VID/hero-coast-1280.mp4"
ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -g 48 -pix_fmt yuv420p "${COLOUR[@]}" "$VID/hero-coast-1280.webm"

# 3. Portrait 4:5 for phones and portrait tablets
ffmpeg -v error -y -i "$TMP/loop.mp4" -vf "$CROP" -an -c:v libx264 -profile:v high -preset slow -crf 25 -pix_fmt yuv420p -g 48 -movflags +faststart "${COLOUR[@]}" "$VID/hero-coast-portrait-576.mp4"
ffmpeg -v error -y -i "$TMP/loop.mp4" -vf "$CROP" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -g 48 -pix_fmt yuv420p "${COLOUR[@]}" "$VID/hero-coast-portrait-576.webm"

# 4. Posters = the loop's first frame, scaled in YUV (no RGB round trip), so the
#    film can fade in over its own poster without a visible cut or colour shift
poster() { # name width [filter]
  local vf="${3:+$3,}scale=$2:-2:flags=lanczos"
  ffmpeg -v error -y -i "$TMP/loop.mp4" -frames:v 1 -vf "$vf" -pix_fmt yuv420p -c:v libwebp -quality 80 -compression_level 6 -preset photo "$IMG/$1-$2.webp"
  ffmpeg -v error -y -i "$TMP/loop.mp4" -frames:v 1 -vf "$vf" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 26 -cpu-used 4 "${COLOUR[@]}" -f avif "$IMG/$1-$2.avif"
}
for w in 640 960 1280; do poster hero-coast-poster "$w"; done
for w in 432 576; do poster hero-coast-poster-portrait "$w" "$CROP"; done

# 5. Record poster widths for picture()
node --input-type=module -e '
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = process.argv[1];
const m = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
m["hero-coast-poster"] = { widths: [640, 960, 1280], width: 1280, height: 720 };
m["hero-coast-poster-portrait"] = { widths: [432, 576], width: 576, height: 720 };
writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(m).sort(([a],[b]) => a.localeCompare(b))), null, 2) + "\n");
' "$ROOT/src/data/images.generated.json"

ls -la "$VID" "$IMG"/hero-coast-poster*
