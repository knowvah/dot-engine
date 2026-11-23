#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
#
# Build the CARRIED oracle: graphviz tag $TAG (16.1.1 live) plus test/corpus/oracle-patches/
# *.patch (lexical order, `git am --3way`), in a detached worktree of the
# maintainer's fork. The pristine 16.1.1 build stays as the bisect build.
# @see docs/adr/0003-upstream-fix-forward.md, test/corpus/oracle-patches/README.md
#
# Env:  CARRIED_SRC   fork checkout (default ~/git/sseely/graphviz); never has a
#                     branch moved, only `git worktree add --detach`
#       ORACLE_TAG    graphviz tag to build (default: the live oracle's tag)
#       CARRIED_DIR   worktree + build (default ~/git/sseely/graphviz-carried)
#       CARRIED_GVBINDIR_DOT, CARRIED_GVBINDIR_ALL  plugin dirs (default
#                     /tmp/ghl1611-carried and /tmp/ghl1611-carried-all)
#       PRISTINE_BUILD  pristine oracle build whose CMakeCache.txt is mirrored
#       JOBS          parallel build jobs (default 6)
# A build of any tag other than the live one (issue #296) must override
# CARRIED_DIR and both plugin dirs, or the script refuses before touching
# anything: a queue or survey may be reading the live oracle.
# Output: $CARRIED_DIR/build, the two GVBINDIRs, $CARRIED_DIR/carried-build.json,
#         $CARRIED_DIR/carried-cmake-keys.txt (the cache keys copied).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_DIR="$HERE/oracle-patches"
CARRIED_SRC="${CARRIED_SRC:-$HOME/git/sseely/graphviz}"
# The live oracle (oracle-paths.mjs; gvbindir-defaults.test.ts checks these).
LIVE_TAG="16.1.1"
LIVE_CARRIED_DIR="$HOME/git/sseely/graphviz-carried"
LIVE_GVBINDIR_DOT="/tmp/ghl1611-carried"
LIVE_GVBINDIR_ALL="/tmp/ghl1611-carried-all"
TAG="${ORACLE_TAG:-$LIVE_TAG}"
CARRIED_DIR="${CARRIED_DIR:-$LIVE_CARRIED_DIR}"
GVBINDIR_DOT="${CARRIED_GVBINDIR_DOT:-$LIVE_GVBINDIR_DOT}"
GVBINDIR_ALL="${CARRIED_GVBINDIR_ALL:-$LIVE_GVBINDIR_ALL}"
PRISTINE_BUILD="${PRISTINE_BUILD:-$HOME/git/graphviz-16.1.1/build}"
JOBS="${JOBS:-6}"
BISON="${BISON_EXECUTABLE:-/opt/homebrew/opt/bison/bin/bison}"
# flex must be 2.6.4, as for the pristine oracle's scanner: flex 2.6.16 sets
# YY_BUF_SIZE to 2*BUFSIZ (2048 on macOS), so cgraph rejects quoted and HTML
# strings that pristine parses. Homebrew moved to 2.6.16 on 2026-11-18; Apple's
# /usr/bin/flex is 2.6.4.
FLEX="${FLEX_EXECUTABLE:-/usr/bin/flex}"
FLEX_VERSION="2.6.4"
GIT_IDENT=(-c user.name=dot-engine-carried-oracle -c user.email=carried@invalid)
# Feature options mirrored from the pristine cache (not the -STRINGS metadata).
KEY_RE='^(CMAKE_BUILD_TYPE|ENABLE_[A-Z_]+|WITH_[A-Z_]+|use_[a-z_]+|with_[a-z_]+):(STRING|BOOL)='

die() { echo "error: $1" >&2; exit 1; }

# Refuse a build of another tag that would reuse a live worktree or plugin dir.
guard_next_tag() {
  [ "$TAG" = "$LIVE_TAG" ] && return 0
  if [ "$CARRIED_DIR" = "$LIVE_CARRIED_DIR" ] || [ "$GVBINDIR_DOT" = "$LIVE_GVBINDIR_DOT" ] ||
    [ "$GVBINDIR_ALL" = "$LIVE_GVBINDIR_ALL" ]; then
    die "ORACLE_TAG=$TAG would overwrite the live $LIVE_TAG oracle; set CARRIED_DIR, CARRIED_GVBINDIR_DOT and CARRIED_GVBINDIR_ALL"
  fi
}

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

# gen_version.py calls a build stable only when a parent of HEAD added the
# CHANGELOG release line; `git am` moves HEAD off the tag, so a patched build
# would report <next>~dev. Add a tree-identical merge whose second parent is
# the release commit (the pristine oracle's local commit does the same), with
# the tag's dates so the commit and the version string stay deterministic.
stamp_stable() {
  [ -n "$(patch_files)" ] || return 0
  local log="$CARRIED_DIR/CHANGELOG.md" heading line release tree date new
  heading="$(grep -n -m1 '^## \[' "$log")" || die "no version heading in $log"
  case "$heading" in
    *'## [Unreleased'*) die "a carried patch adds an Unreleased CHANGELOG heading; drop its CHANGELOG hunk" ;;
  esac
  line="${heading%%:*}"
  release="$(git -C "$CARRIED_DIR" blame -l -L"$line,$line" HEAD -- CHANGELOG.md | cut -d' ' -f1 | tr -d '^')"
  tree="$(git -C "$CARRIED_DIR" rev-parse 'HEAD^{tree}')"
  date="$(git -C "$CARRIED_DIR" log -1 --format=%cI "$TAG")"
  new="$(GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git "${GIT_IDENT[@]}" -C "$CARRIED_DIR" \
    commit-tree "$tree" -p HEAD -p "$release" -m "carried: mark as stable $TAG for gen_version.py")"
  git -C "$CARRIED_DIR" checkout --detach --quiet "$new"
  echo "stamped stable $TAG (second parent $release)"
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
  # Regenerate the scanners every build so a flex change cannot leave a stale one.
  rm -f "$CARRIED_DIR/build/lib/cgraph/scan.c" "$CARRIED_DIR/build/cmd/tools/gmlscan.c"
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
  guard_next_tag
  for t in git cmake shasum; do command -v "$t" >/dev/null 2>&1 || die "'$t' not found on PATH"; done
  [ -x "$BISON" ] || die "bison not executable: $BISON"
  [ -x "$FLEX" ] || die "flex not executable: $FLEX"
  "$FLEX" --version | grep -q " $FLEX_VERSION\$" || die "flex must be $FLEX_VERSION: $FLEX is $("$FLEX" --version)"
  prepare_worktree
  apply_patches
  stamp_stable
  copy_cache_keys
  build
  gen_gvbindirs
  write_record
  echo "carried oracle OK in $((SECONDS - start))s: $CARRIED_DIR/build/cmd/dot/dot"
}

main "$@"
