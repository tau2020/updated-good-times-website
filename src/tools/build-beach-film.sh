#!/usr/bin/env bash
# The sand journey's destination film: media-src/video/section-2-video.mp4 → src/assets/video/beach-film-1280.mp4
# + its poster renditions (the loop's first frame).
#
#   bash src/tools/build-beach-film.sh            (npm run video:beach)
#   bash src/tools/build-beach-film.sh --crf=24   (another H.264 quality; default 24)
#
# Source: the owner's section-2-video.mp4 (Drive, 6 Nov 2026: 1280×720, 24 fps, 192 frames, H.264 High + AAC stereo,
# 7,942,174 bytes, SHA-256 b58de746…). It is the destination image of the sand journey brought to life: the same woman at
# the water's edge, the same four footprints (its first frame registers on the still at zero offset), with the surf
# washing in and the wind in her dress. The camera, the woman's place and the prints never move. It is used as
# supplied: nothing in it is frozen, masked, regraded or regenerated. Only:
#  1. Loop: the clip's last frame is far from its first (5.2× an ordinary frame step: the surf would jump back), so
#     its last second crossfades into its first, as the hero film's does (src/tools/build-video.sh). The finished loop
#     is 168 frames (7.0 s); its seam measures about 1.3× an ordinary step.
#  2. Encode H.264 (High) at the source's own size (never upscaled), audio dropped, fast start, one keyframe per loop,
#     the source's colour tags restated so browsers decode it as the source. No VP9 copy: on this footage it needed
#     more bytes than H.264 for a lower SSIM (docs: audit/image-quality-report.md).
#  3. Poster = the loop's first frame, scaled with Lanczos in ffmpeg (the film's own colour matrix), encoded by the
#     image pipeline's tools as AVIF/WebP at 640, 960 and 1280 px: the film fades in over its own first frame.
# Needs ffmpeg with libx264, cwebp and avifenc (as `npm run images`), and Node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/media-src/video/section-2-video.mp4"
VID="$ROOT/src/assets/video"
IMG="$ROOT/src/assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

CRF=24
for a in "$@"; do case "$a" in --crf=*) CRF="${a#--crf=}" ;; esac; done

[ -f "$SRC" ] || { echo "missing $SRC (the supplied film, see the header of this script)"; exit 1; }
mkdir -p "$VID" "$IMG"

FPS=24
FADE=24 # frames: one second
FRAMES=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$SRC")
LOOP=$((FRAMES - FADE))                                                                    # frames in the finished loop
OFFSET=$(awk -v n="$LOOP" -v f="$FPS" -v d="$FADE" 'BEGIN { printf "%.6f", (n - d) / f }') # where the crossfade starts
COLOUR=(-colorspace smpte170m -color_primaries bt709 -color_trc iec61966-2-1)

# 1. The loop, into a near-lossless intermediate (audio dropped)
ffmpeg -v error -y -i "$SRC" -filter_complex "\
[0:v]setpts=PTS-STARTPTS,format=yuv420p,split=2[a][b];\
[a]trim=start_frame=$FADE,setpts=PTS-STARTPTS[main];\
[b]trim=end_frame=$FADE,setpts=PTS-STARTPTS[head];\
[main][head]xfade=transition=fade:duration=$(awk -v d="$FADE" -v f="$FPS" 'BEGIN { printf "%.6f", d / f }'):offset=$OFFSET,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -crf 4 -preset medium "${COLOUR[@]}" "$TMP/loop.mp4"

# 2. The film: 16:9 at 1280×720, one keyframe per loop, fast start
ffmpeg -v error -y -i "$TMP/loop.mp4" -an -c:v libx264 -profile:v high -preset slow -crf "$CRF" -pix_fmt yuv420p \
  -x264-params "keyint=$LOOP:min-keyint=$LOOP:scenecut=0" -movflags +faststart "${COLOUR[@]}" "$VID/beach-film-1280.mp4"

# 3. Posters = the loop's first frame
poster() { # name width
  ffmpeg -v error -y -i "$TMP/loop.mp4" -frames:v 1 -vf "scale=$2:-2:flags=lanczos+accurate_rnd+full_chroma_int,format=rgb24" "$TMP/$1-$2.png"
  cwebp -quiet -q 82 -m 6 -metadata none "$TMP/$1-$2.png" -o "$IMG/$1-$2.webp"
  avifenc -q 62 -s 4 -j 4 --ignore-exif --ignore-xmp "$TMP/$1-$2.png" "$IMG/$1-$2.avif" >/dev/null
}
for w in 640 960 1280; do poster beach-film-poster "$w"; done

# 4. Record the poster widths for picture()
node --input-type=module -e '
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = process.argv[1];
const m = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
m["beach-film-poster"] = { widths: [640, 960, 1280], width: 1280, height: 720 };
writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n");
' "$ROOT/src/data/images.generated.json"

echo "loop: $LOOP frames ($(awk -v n="$LOOP" -v f="$FPS" 'BEGIN { printf "%.2f", n / f }') s), H.264 crf $CRF"
ls -la "$VID"/beach-film-* "$IMG"/beach-film-poster*
