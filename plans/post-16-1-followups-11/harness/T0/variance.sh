#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Runs regen.sh N times (default 8) into scratch dirs and prints, per ref file, the number of
# distinct outputs across the runs. A count above 1 means native does not repeat on that ref.
# Usage: GVBINDIR=<full plugin dir> bash variance.sh <scratch-dir> [N]
set -u
here=$(cd "$(dirname "$0")" && pwd)
scr=$1; n=${2:-8}
export BIN=$scr/bin
mkdir -p "$BIN"
for i in $(seq 1 "$n"); do bash "$here/regen.sh" "$scr/run$i" > /dev/null; done
cd "$scr/run1" || exit 1
for f in *; do
  k=$(for i in $(seq 1 "$n"); do shasum "$scr/run$i/$f" | cut -c1-40; done | sort -u | wc -l | tr -d ' ')
  echo "$k $f"
done | sort -rn
