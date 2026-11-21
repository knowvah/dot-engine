#!/usr/bin/env bash
# Issue #190: the port (probe.ts, live src/) against the carried oracle (relabel-native, built by
# build.sh) over cases.txt, stdout and stderr compared separately, byte for byte.
#   bash plans/issue-190-node-relabel/harness/native-compare.sh > <out>.tsv
# Underscores in a case value stand for spaces. SVG is compared from <g id="graph0"> on. Run harness/preflight.ts first.
set -uo pipefail
H=plans/issue-190-node-relabel/harness
N=${TMPDIR:-/tmp}/i190/relabel-native
[[ -x $N ]] || { echo "build $N first: bash $H/build.sh" >&2; exit 2; }
TMP=$(mktemp -d "${TMPDIR:-/tmp}/i190nc.XXXXXX")
echo -e "probe\tengine\tformat\tchange\tstdout\tstderr\tnativeErrLines\tportErrLines"
same=0; total=0
while read -r probe engines fmt n attr value; do
  renders=1; [[ $attr == renders=* ]] && { renders=${attr#renders=}; attr=; value=; }
  export I190_RENDERS=$renders
  [[ -z $probe || $probe == \#* ]] && continue
  value=${value//_/ }; [[ $value == - ]] && value=
  for e in ${engines//,/ }; do
    gvb=/tmp/ghl1611-carried-all; [[ $e == dot ]] && gvb=/tmp/ghl1611-carried
    if [[ -n $attr ]]; then
      GVBINDIR=$gvb "$N" "$H/probes/$probe.gv" "$e" "$fmt" "$n" a "$attr" "$value" > "$TMP/n.out" 2> "$TMP/n.err"
      I190_ATTR=$attr I190_VALUE=$value I190_N=$n npx tsx "$H/probe.ts" relabel "$e" "$H/probes/$probe.gv" "$fmt" > "$TMP/p.out" 2> "$TMP/p.err"
    else
      GVBINDIR=$gvb "$N" "$H/probes/$probe.gv" "$e" "$fmt" "$n" > "$TMP/n.out" 2> "$TMP/n.err"
      I190_N=$n npx tsx "$H/probe.ts" warn3 "$e" "$H/probes/$probe.gv" "$fmt" > "$TMP/p.out" 2> "$TMP/p.err"
    fi
    if [[ $fmt == svg ]]; then # the SVG prologue differs by design (generator comment, wrapping)
      for f in n p; do awk '/^== render/ { print; keep = 0; next } /^<g id="graph0"/ { keep = 1 } keep' \
        "$TMP/$f.out" > "$TMP/$f.cut"; mv "$TMP/$f.cut" "$TMP/$f.out"; done
    fi
    so=no; cmp -s "$TMP/n.out" "$TMP/p.out" && so=yes
    se=no; cmp -s "$TMP/n.err" "$TMP/p.err" && se=yes
    total=$((total+1)); [[ $so$se == yesyes ]] && same=$((same+1))
    echo -e "$probe\t$e\t$fmt\t${attr:--}=${value}\t$so\t$se\t$(wc -l < "$TMP/n.err" | tr -d ' ')\t$(wc -l < "$TMP/p.err" | tr -d ' ')"
  done
done < "$H/cases.txt"
echo "# identical $same/$total"
rm -rf "$TMP"
