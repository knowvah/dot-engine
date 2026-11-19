#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
#
# Build the CARRIED oracle: graphviz tag 16.1.1 plus test/corpus/oracle-patches/
# *.patch (lexical order, `git am --3way`), in a detached worktree of the
# maintainer's fork. The pristine 16.1.1 build stays as the bisect build.
# @see docs/adr/0003-upstream-fix-forward.md, test/corpus/oracle-patches/README.md
#
# Env:  CARRIED_SRC   fork checkout (default ~/git/sseely/graphviz); never has a
#                     branch moved, only `git worktree add --detach`
#       CARRIED_DIR   worktree + build (default ~/git/sseely/graphviz-carried)
#       PRISTINE_BUILD  pristine oracle build whose CMakeCache.txt is mirrored
#       JOBS          parallel build jobs (default 6)
# Output: $CARRIED_DIR/build, GVBINDIRs /tmp/ghl1611-carried and
#         /tmp/ghl1611-carried-all, $CARRIED_DIR/carried-build.json,
#         $CARRIED_DIR/carried-cmake-keys.txt (the cache keys copied).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_DIR="$HERE/oracle-patches"
CARRIED_SRC="${CARRIED_SRC:-$HOME/git/sseely/graphviz}"
CARRIED_DIR="${CARRIED_DIR:-$HOME/git/sseely/graphviz-carried}"
PRISTINE_BUILD="${PRISTINE_BUILD:-$HOME/git/graphviz-16.1.1/build}"
JOBS="${JOBS:-6}"
TAG="16.1.1"
BISON="${BISON_EXECUTABLE:-/opt/homebrew/opt/bison/bin/bison}"
FLEX="${FLEX_EXECUTABLE:-/opt/homebrew/opt/flex/bin/flex}"
GVBINDIR_DOT="/tmp/ghl1611-carried"
GVBINDIR_ALL="/tmp/ghl1611-carried-all"
GIT_IDENT=(-c user.name=dot-engine-carried-oracle -c user.email=carried@invalid)
# Feature options mirrored from the pristine cache (not the -STRINGS metadata).
KEY_RE='^(CMAKE_BUILD_TYPE|ENABLE_[A-Z_]+|WITH_[A-Z_]+|use_[a-z_]+|with_[a-z_]+):(STRING|BOOL)='

die() { echo "error: $1" >&2; exit 1; }

patch_files() {
  local f
  for f in "$PATCH_DIR"/*.patch; do
    [ -e "$f" ] && echo "$f"
  done
  return 0
}

prepare_worktree() {
  git -C "$CARRIED_SRC" rev-parse --git-dir >/dev/null 2>&1 || die "CARRIED_SRC is not a git repo: $CARRIED_SRC"
  git -C "$CARRIED_SRC" rev-parse --verify --quiet "refs/tags/$TAG^{commit}" >/dev/null ||
    die "tag $TAG not found in $CARRIED_SRC"
  if [ -e "$CARRIED_DIR" ]; then
    local common src_common
    common="$(git -C "$CARRIED_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" ||
      die "$CARRIED_DIR exists but is not a git worktree"
    src_common="$(git -C "$CARRIED_SRC" rev-parse --path-format=absolute --git-common-dir)"
    [ "$common" = "$src_common" ] || die "$CARRIED_DIR is a worktree of a different repo"
    git -C "$CARRIED_DIR" am --abort >/dev/null 2>&1 || true
    git -C "$CARRIED_DIR" reset --hard --quiet
    git -C "$CARRIED_DIR" checkout --detach --quiet "$TAG"
    echo "reset worktree $CARRIED_DIR to $TAG"
  else
    git -C "$CARRIED_SRC" worktree add --detach "$CARRIED_DIR" "$TAG"
  fi
}

apply_patches() {
  local f
  while IFS= read -r f; do
    echo "applying $(basename "$f")"
    git "${GIT_IDENT[@]}" -C "$CARRIED_DIR" am --3way "$f" >/dev/null || {
      git -C "$CARRIED_DIR" am --abort >/dev/null 2>&1 || true
      die "patch does not apply: $(basename "$f")"
    }
  done < <(patch_files)
}

copy_cache_keys() {
  local cache="$PRISTINE_BUILD/CMakeCache.txt"
  [ -f "$cache" ] || die "pristine CMakeCache.txt not found: $cache"
  grep -E "$KEY_RE" "$cache" | grep -v -- '-STRINGS' >"$CARRIED_DIR/carried-cmake-keys.txt"
  [ -s "$CARRIED_DIR/carried-cmake-keys.txt" ] || die "no cache keys matched in $cache"
  echo "cmake cache keys copied from $cache:"
  cat "$CARRIED_DIR/carried-cmake-keys.txt"
}

build() {
  local args=() line
  while IFS= read -r line; do
    args+=("-D${line%%:*}=${line#*=}")
  done <"$CARRIED_DIR/carried-cmake-keys.txt"
  cmake -S "$CARRIED_DIR" -B "$CARRIED_DIR/build" "${args[@]}" \
    "-DBISON_EXECUTABLE=$BISON" "-DFLEX_EXECUTABLE=$FLEX"
  cmake --build "$CARRIED_DIR/build" -j "$JOBS"
}

gen_gvbindirs() {
  GRAPHVIZ_BUILD="$CARRIED_DIR/build" sh "$HERE/gen-headless-gvbindir.sh" "$GVBINDIR_DOT"
  GRAPHVIZ_BUILD="$CARRIED_DIR/build" sh "$HERE/gen-headless-gvbindir.sh" all "$GVBINDIR_ALL"
  [ -f "$GVBINDIR_DOT/config8" ] || die "config8 missing in $GVBINDIR_DOT"
  [ -f "$GVBINDIR_ALL/config8" ] || die "config8 missing in $GVBINDIR_ALL"
}

write_record() {
  local f out="" sha
  while IFS= read -r f; do
    sha="$(shasum -a 256 "$f" | cut -d' ' -f1)"
    out+="${out:+,}{\"file\":\"$(basename "$f")\",\"sha256\":\"$sha\"}"
  done < <(patch_files)
  printf '{"tag":"%s","patches":[%s],"builtAt":"%s"}\n' "$TAG" "$out" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    >"$CARRIED_DIR/carried-build.json"
}

main() {
  local start="$SECONDS"
  for t in git cmake shasum; do command -v "$t" >/dev/null 2>&1 || die "'$t' not found on PATH"; done
  [ -x "$BISON" ] || die "bison not executable: $BISON"
  [ -x "$FLEX" ] || die "flex not executable: $FLEX"
  prepare_worktree
  apply_patches
  copy_cache_keys
  build
  gen_gvbindirs
  write_record
  echo "carried oracle OK in $((SECONDS - start))s: $CARRIED_DIR/build/cmd/dot/dot"
}

main "$@"
