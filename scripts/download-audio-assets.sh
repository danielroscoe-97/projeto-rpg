#!/bin/bash
# ============================================================================
# Pocket DM — Audio Assets Download Script
# ============================================================================
# Downloads royalty-free SFX and ambient sounds from OpenGameArt.org (CC0)
# and processes them into optimized MP3 files for the combat tracker.
#
# Sources:
#   - OpenGameArt.org "RPG Sound Package" (CC0) — combat, spells, environment
#   - OpenGameArt.org "80 CC0 RPG SFX" (CC0) — blades, spells, creatures
#   - OpenGameArt.org "Loopable Dungeon Ambience" (CC0)
#   - OpenGameArt.org "Rain loopable" (CC0)
#
# License: All downloaded assets are CC0 (Public Domain) — no attribution required.
#
# Requirements: curl, unzip, ffmpeg (for format conversion + normalization)
# Usage: bash scripts/download-audio-assets.sh
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SFX_DIR="$PROJECT_ROOT/public/sounds/sfx"
AMBIENT_DIR="$PROJECT_ROOT/public/sounds/ambient"
TMP_DIR="$(mktemp -d)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

# ─── Check dependencies ─────────────────────────────────────────────────────

check_deps() {
  local missing=()
  for cmd in curl unzip ffmpeg; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    err "Missing dependencies: ${missing[*]}"
    echo ""
    echo "Install them:"
    echo "  Windows (winget): winget install Gyan.FFmpeg"
    echo "  Windows (choco):  choco install ffmpeg unzip curl"
    echo "  macOS:            brew install ffmpeg"
    echo "  Ubuntu:           sudo apt install ffmpeg unzip curl"
    exit 1
  fi
  log "All dependencies found (curl, unzip, ffmpeg)"
}

# ─── Download helper ─────────────────────────────────────────────────────────

download() {
  local url="$1"
  local dest="$2"
  local name="$3"
  info "Downloading $name..."
  if curl -sL --fail -o "$dest" "$url"; then
    log "Downloaded $name ($(du -h "$dest" | cut -f1))"
  else
    err "Failed to download $name from $url"
    return 1
  fi
}

# ─── Convert any audio to normalized MP3 ─────────────────────────────────────
# Target: 128kbps, 44.1kHz, mono, normalized to -16 LUFS, max 4 seconds for SFX

convert_sfx() {
  local input="$1"
  local output="$2"
  local max_duration="${3:-4}" # default 4 seconds for SFX
  ffmpeg -y -i "$input" \
    -af "loudnorm=I=-16:TP=-1:LRA=11,atrim=0:$max_duration,afade=t=out:st=$((max_duration - 1)):d=1" \
    -ar 44100 -ac 1 -b:a 128k \
    -id3v2_version 3 -metadata title="Pocket DM SFX" \
    "$output" 2>/dev/null
}

# For ambient: longer, stereo, loopable
convert_ambient() {
  local input="$1"
  local output="$2"
  local max_duration="${3:-30}" # default 30 seconds for ambient loops
  ffmpeg -y -i "$input" \
    -af "loudnorm=I=-20:TP=-1:LRA=11,atrim=0:$max_duration,afade=t=in:st=0:d=2,afade=t=out:st=$((max_duration - 2)):d=2" \
    -ar 44100 -ac 2 -b:a 128k \
    -id3v2_version 3 -metadata title="Pocket DM Ambient" \
    "$output" 2>/dev/null
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   Pocket DM — Audio Assets Download & Setup         ║"
  echo "║   All sources: CC0 (Public Domain)                  ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""

  check_deps

  mkdir -p "$SFX_DIR" "$AMBIENT_DIR" "$TMP_DIR/packs"

  # ─── Step 1: Download source packs ───────────────────────────────────────

  info "Step 1/4: Downloading source packs from OpenGameArt.org..."
  echo ""

  # Pack 1: RPG Sound Package (53 sounds — combat, spells, environment)
  download \
    "https://opengameart.org/sites/default/files/soundpack.zip" \
    "$TMP_DIR/packs/soundpack.zip" \
    "RPG Sound Package (53 SFX)"

  # Pack 2: 80 CC0 RPG SFX (blades, spells, creatures)
  download \
    "https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip" \
    "$TMP_DIR/packs/80-cc0-rpg-sfx.zip" \
    "80 CC0 RPG SFX"

  # Pack 3: Dungeon Ambience (loopable)
  download \
    "https://opengameart.org/sites/default/files/dungeon_ambient_1.ogg" \
    "$TMP_DIR/packs/dungeon-ambient.ogg" \
    "Dungeon Ambience (loopable)"

  # Pack 4: Rain (loopable)
  download \
    "https://opengameart.org/sites/default/files/rain_0.zip" \
    "$TMP_DIR/packs/rain.zip" \
    "Rain Ambience (loopable)" || warn "Rain pack download failed — will skip"

  echo ""

  # ─── Step 2: Extract packs ──────────────────────────────────────────────

  info "Step 2/4: Extracting..."

  mkdir -p "$TMP_DIR/extracted/soundpack" "$TMP_DIR/extracted/80sfx" "$TMP_DIR/extracted/rain"

  unzip -qo "$TMP_DIR/packs/soundpack.zip" -d "$TMP_DIR/extracted/soundpack" 2>/dev/null || true
  unzip -qo "$TMP_DIR/packs/80-cc0-rpg-sfx.zip" -d "$TMP_DIR/extracted/80sfx" 2>/dev/null || true
  if [ -f "$TMP_DIR/packs/rain.zip" ]; then
    unzip -qo "$TMP_DIR/packs/rain.zip" -d "$TMP_DIR/extracted/rain" 2>/dev/null || true
  fi

  log "Extraction complete"
  echo ""

  # ─── Step 3: Map best sounds to our presets ─────────────────────────────

  info "Step 3/4: Converting & mapping sounds to Pocket DM presets..."
  echo ""

  # Find files recursively (case-insensitive)
  find_sound() {
    find "$TMP_DIR/extracted" -iname "$1" -type f 2>/dev/null | head -1
  }

  # === SFX PRESETS (10 existing) ===

  # 1. sword-hit → soundpack/combat/hit.wav OR 80sfx blade
  local src
  src=$(find_sound "hit.wav")
  if [ -z "$src" ]; then src=$(find_sound "*blade*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/sword-hit.mp3" 2
    log "sword-hit.mp3 ← $src"
  else
    warn "No source found for sword-hit"
  fi

  # 2. fireball → soundpack/spells/flames.wav OR 80sfx spell_fire
  src=$(find_sound "flames.wav")
  if [ -z "$src" ]; then src=$(find_sound "*fire*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/fireball.mp3" 3
    log "fireball.mp3 ← $src"
  else
    warn "No source found for fireball"
  fi

  # 3. healing → soundpack/spells/smite.wav (holy/heal sound)
  src=$(find_sound "smite.wav")
  if [ -z "$src" ]; then src=$(find_sound "levelup.wav"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/healing.mp3" 3
    log "healing.mp3 ← $src"
  else
    warn "No source found for healing"
  fi

  # 4. thunder → soundpack/spells/shock.wav
  src=$(find_sound "shock.wav")
  if [ -z "$src" ]; then src=$(find_sound "*thunder*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/thunder.mp3" 3
    log "thunder.mp3 ← $src"
  else
    warn "No source found for thunder"
  fi

  # 5. death → 80sfx creature die
  src=$(find_sound "*die*")
  if [ -z "$src" ]; then src=$(find_sound "*death*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/death.mp3" 3
    log "death.mp3 ← $src"
  else
    warn "No source found for death"
  fi

  # 6. war-cry → 80sfx creature roar
  src=$(find_sound "*roar*")
  if [ -z "$src" ]; then src=$(find_sound "*growl*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/war-cry.mp3" 3
    log "war-cry.mp3 ← $src"
  else
    warn "No source found for war-cry"
  fi

  # 7. shield → soundpack/combat/swing.wav (block sound)
  src=$(find_sound "swing.wav")
  if [ -z "$src" ]; then src=$(find_sound "*metal*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/shield.mp3" 2
    log "shield.mp3 ← $src"
  else
    warn "No source found for shield"
  fi

  # 8. arrow → soundpack/combat/bow.wav
  src=$(find_sound "bow.wav")
  if [ -z "$src" ]; then src=$(find_sound "*arrow*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/arrow.mp3" 2
    log "arrow.mp3 ← $src"
  else
    warn "No source found for arrow"
  fi

  # 9. critical-hit → combine hit + impact
  src=$(find_sound "hit.wav")
  if [ -n "$src" ]; then
    # Critical hit = louder, slightly longer
    ffmpeg -y -i "$src" \
      -af "loudnorm=I=-12:TP=-1:LRA=11,atrim=0:2,afade=t=out:st=1:d=1,bass=g=3" \
      -ar 44100 -ac 1 -b:a 128k \
      "$SFX_DIR/critical-hit.mp3" 2>/dev/null
    log "critical-hit.mp3 ← $src (boosted)"
  else
    warn "No source found for critical-hit"
  fi

  # 10. teleport → soundpack/spells/teleport.wav
  src=$(find_sound "teleport.wav")
  if [ -z "$src" ]; then src=$(find_sound "*warp*"); fi
  if [ -n "$src" ]; then
    convert_sfx "$src" "$SFX_DIR/teleport.mp3" 3
    log "teleport.mp3 ← $src"
  else
    warn "No source found for teleport"
  fi

  echo ""

  # === AMBIENT SOUNDS (NEW) ===

  info "Converting ambient sounds..."
  echo ""

  # 1. dungeon ambient
  if [ -f "$TMP_DIR/packs/dungeon-ambient.ogg" ]; then
    convert_ambient "$TMP_DIR/packs/dungeon-ambient.ogg" "$AMBIENT_DIR/dungeon.mp3" 30
    log "ambient/dungeon.mp3 ← dungeon_ambient_1.ogg"
  fi

  # 2. rain ambient
  local rain_src
  rain_src=$(find "$TMP_DIR/extracted/rain" -iname "*.mp3" -o -iname "*.ogg" -o -iname "*.wav" 2>/dev/null | head -1)
  if [ -n "$rain_src" ]; then
    convert_ambient "$rain_src" "$AMBIENT_DIR/rain.mp3" 30
    log "ambient/rain.mp3 ← rain loop"
  else
    warn "No rain source found"
  fi

  # 3. tavern/fireplace → soundpack/environment/fireplace.wav
  src=$(find_sound "fireplace.wav")
  if [ -n "$src" ]; then
    convert_ambient "$src" "$AMBIENT_DIR/tavern.mp3" 30
    log "ambient/tavern.mp3 ← fireplace.wav"
  fi

  # 4. forest/birds → soundpack/environment/birds*.wav
  src=$(find_sound "birds1.wav")
  if [ -n "$src" ]; then
    convert_ambient "$src" "$AMBIENT_DIR/forest.mp3" 30
    log "ambient/forest.mp3 ← birds1.wav"
  fi

  # 5. ocean/water → soundpack/environment/water-wave*.wav
  src=$(find_sound "water-wave1.wav")
  if [ -n "$src" ]; then
    convert_ambient "$src" "$AMBIENT_DIR/ocean.mp3" 30
    log "ambient/ocean.mp3 ← water-wave1.wav"
  fi

  # 6. creek/stream → soundpack/environment/stream.wav
  src=$(find_sound "stream.wav")
  if [ -n "$src" ]; then
    convert_ambient "$src" "$AMBIENT_DIR/creek.mp3" 30
    log "ambient/creek.mp3 ← stream.wav"
  fi

  echo ""

  # ─── Step 4: Verify & Report ────────────────────────────────────────────

  info "Step 4/4: Verification..."
  echo ""

  echo "=== SFX Files (public/sounds/sfx/) ==="
  local sfx_count=0
  local sfx_ok=0
  for f in sword-hit fireball healing thunder death war-cry shield arrow critical-hit teleport; do
    sfx_count=$((sfx_count + 1))
    if [ -f "$SFX_DIR/$f.mp3" ]; then
      local size
      size=$(du -h "$SFX_DIR/$f.mp3" | cut -f1)
      local dur
      dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$SFX_DIR/$f.mp3" 2>/dev/null | cut -d. -f1)
      echo -e "  ${GREEN}✓${NC} $f.mp3 — ${size}, ${dur}s"
      sfx_ok=$((sfx_ok + 1))
    else
      echo -e "  ${RED}✗${NC} $f.mp3 — MISSING"
    fi
  done

  echo ""
  echo "=== Ambient Files (public/sounds/ambient/) ==="
  local amb_count=0
  local amb_ok=0
  for f in dungeon rain tavern forest ocean creek; do
    amb_count=$((amb_count + 1))
    if [ -f "$AMBIENT_DIR/$f.mp3" ]; then
      local size
      size=$(du -h "$AMBIENT_DIR/$f.mp3" | cut -f1)
      local dur
      dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$AMBIENT_DIR/$f.mp3" 2>/dev/null | cut -d. -f1)
      echo -e "  ${GREEN}✓${NC} $f.mp3 — ${size}, ${dur}s"
      amb_ok=$((amb_ok + 1))
    else
      echo -e "  ${RED}✗${NC} $f.mp3 — MISSING"
    fi
  done

  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  SFX:     $sfx_ok/$sfx_count converted"
  echo "  Ambient: $amb_ok/$amb_count converted"
  echo "  Source:  OpenGameArt.org (CC0 Public Domain)"
  echo "════════════════════════════════════════════════════════"

  # Cleanup
  rm -rf "$TMP_DIR"
  log "Temp files cleaned up"

  echo ""
  if [ $sfx_ok -eq $sfx_count ] && [ $amb_ok -eq $amb_count ]; then
    log "All audio assets ready! Run 'npm run dev' and test the soundboard."
  else
    warn "Some files missing. Check warnings above and re-run or add manual sources."
  fi
}

main "$@"
