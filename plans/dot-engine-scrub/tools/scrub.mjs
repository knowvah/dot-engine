#!/usr/bin/env node
// SPDX-License-Identifier: EPL-2.0
//
// Deterministic text scrub: legacy name `graphviz-ts` -> `dot-engine`.
// See plans/dot-engine-scrub/decisions.md (D1, D2, D4, D7) for the locked
// rules this script implements. No npm dependencies; Node builtins only.
//
// Usage:
//   node scrub.mjs [--dry-run] <path>...
//
// Rule order per file (D1/D2):
//   (a) sentinel-swap the two protected patterns to unique placeholders
//   (b) specifier rule:  "graphviz-ts/"        -> "@knowvah/dot-engine/"
//   (c) bare-name rule:  "graphviz-ts"/"graphviz-TS" -> "dot-engine"
//   (d) restore the sentinels (protected patterns are never rewritten)

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, resolve } from "node:path";

// --- Protected patterns (D2) -----------------------------------------------
const PROTECTED_GIT = "git/graphviz-ts";
const PROTECTED_PLANS = "plans/graphviz-ts-port";
// T1-discovered addendum to D2 (not in the original two-pattern list; logged
// in the T1 report as a non-trivial judgment call for the orchestrator to
// ratify as a D2 addendum): Claude Code project/scratchpad directory names
// flatten "/" to "-", so the same load-bearing `~/git/graphviz-ts` directory
// (kept per D7) also appears as the literal substring "git-graphviz-ts" in
// paths like `~/.claude/projects/-Users-.../git-graphviz-ts/memory/` and
// `/private/tmp/claude-.../-Users-.../git-graphviz-ts/<session>/scratchpad/`.
// Without protection the specifier rule (below) corrupts these real on-disk
// paths (".../git-graphviz-ts/memory/" -> ".../git-@knowvah/dot-engine/memory/").
const PROTECTED_GIT_DASH = "git-graphviz-ts";
// Sentinels: unlikely ASCII markers, restored before any write; never
// emitted in output.
const SENTINEL_GIT = "SCRUB_SENTINEL_GIT_PATH";
const SENTINEL_PLANS = "SCRUB_SENTINEL_PLANS_PATH";
const SENTINEL_GIT_DASH = "SCRUB_SENTINEL_GIT_DASH_PATH";

// --- Replacement rules (D1) -------------------------------------------------
const SPECIFIER_FROM = "graphviz-ts/";
const SPECIFIER_TO = "@knowvah/dot-engine/";
const BARE_LOWER = "graphviz-ts";
const BARE_UPPER = "graphviz-TS";
const BARE_TO = "dot-engine";

// --- Always-excluded (D4) ---------------------------------------------------
// Hard: never even read/walk into these (irrelevant to the mission, and in
// the case of node_modules/dist potentially huge).
const HARD_EXCLUDE_DIR_NAMES = new Set([".git", "node_modules", "dist"]);
// Soft: walked and counted for report transparency, but never modified.
const SELF_BRIEF_PREFIX = "plans/dot-engine-scrub";

/**
 * Classify a repo-relative, forward-slash-normalized path.
 * @param {string} relPath
 * @returns {"hard" | "soft" | null}
 */
export function classifyPath(relPath) {
  const norm = relPath.split(sep).join("/");
  const segments = norm.split("/");
  if (segments.some((s) => HARD_EXCLUDE_DIR_NAMES.has(s))) return "hard";
  if (segments.includes(".agent-notes")) return "soft";
  if (norm === ".plan-mission-progress.md") return "soft";
  if (norm === SELF_BRIEF_PREFIX || norm.startsWith(`${SELF_BRIEF_PREFIX}/`)) {
    return "soft";
  }
  return null;
}

/** Count non-overlapping occurrences of a literal substring. */
function countOccurrences(haystack, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

/**
 * Apply the four-step scrub pipeline to a text blob (pure, no I/O).
 * @param {string} text
 */
export function scrubText(text) {
  // (a) protect load-bearing paths first, so (b)/(c) never see them.
  const protectedGitCount = countOccurrences(text, PROTECTED_GIT);
  let t = text.split(PROTECTED_GIT).join(SENTINEL_GIT);
  const protectedPlansCount = countOccurrences(t, PROTECTED_PLANS);
  t = t.split(PROTECTED_PLANS).join(SENTINEL_PLANS);
  const protectedGitDashCount = countOccurrences(t, PROTECTED_GIT_DASH);
  t = t.split(PROTECTED_GIT_DASH).join(SENTINEL_GIT_DASH);

  // (b) specifier rule runs before the bare-name rule (D1).
  const specifierCount = countOccurrences(t, SPECIFIER_FROM);
  t = t.split(SPECIFIER_FROM).join(SPECIFIER_TO);

  // (c) bare-name rule: exact case variants only, no blanket case-fold.
  const bareLowerCount = countOccurrences(t, BARE_LOWER);
  t = t.split(BARE_LOWER).join(BARE_TO);
  const bareUpperCount = countOccurrences(t, BARE_UPPER);
  t = t.split(BARE_UPPER).join(BARE_TO);

  // (d) restore the sentinels verbatim.
  t = t.split(SENTINEL_GIT).join(PROTECTED_GIT);
  t = t.split(SENTINEL_PLANS).join(PROTECTED_PLANS);
  t = t.split(SENTINEL_GIT_DASH).join(PROTECTED_GIT_DASH);

  return {
    text: t,
    changed: t !== text,
    protectedGitCount,
    protectedPlansCount,
    protectedGitDashCount,
    specifierCount,
    bareLowerCount,
    bareUpperCount,
    totalFound:
      protectedGitCount +
      protectedPlansCount +
      protectedGitDashCount +
      specifierCount +
      bareLowerCount +
      bareUpperCount,
    totalReplaced: specifierCount + bareLowerCount + bareUpperCount,
  };
}

/** NUL-byte heuristic: treat any buffer containing a NUL byte as binary. */
function isBinary(buffer) {
  return buffer.includes(0);
}

/** Deterministic recursive walk: sorted directory entries, depth-first. */
function* walk(root, cwd) {
  const abs = resolve(root);
  const stat = statSync(abs);
  if (stat.isFile()) {
    yield abs;
    return;
  }
  if (!stat.isDirectory()) return;
  const relDir = relative(cwd, abs).split(sep).join("/");
  if (classifyPath(relDir) === "hard") return;
  const entries = readdirSync(abs).sort();
  for (const entry of entries) {
    const entryAbs = join(abs, entry);
    const entryStat = statSync(entryAbs);
    const entryRel = relative(cwd, entryAbs).split(sep).join("/");
    if (classifyPath(entryRel) === "hard") continue;
    if (entryStat.isDirectory()) {
      yield* walk(entryAbs, cwd);
    } else if (entryStat.isFile()) {
      yield entryAbs;
    }
  }
}

/** Cap a report preview line so one giant source line can't blow up the report. */
function truncateForDisplay(line, max = 200) {
  return line.length > max ? `${line.slice(0, max)}...` : line;
}

function makeEmptyTreeStats() {
  return {
    filesScanned: 0,
    filesChanged: 0,
    totalFound: 0,
    specifierReplaced: 0,
    bareLowerReplaced: 0,
    bareUpperReplaced: 0,
    protectedGit: 0,
    protectedPlans: 0,
    protectedGitDash: 0,
    excluded: 0,
  };
}

function addInto(agg, delta) {
  for (const key of Object.keys(agg)) agg[key] += delta[key] ?? 0;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const roots = args.filter((a) => a !== "--dry-run");
  if (roots.length === 0) {
    process.stderr.write("usage: node scrub.mjs [--dry-run] <path>...\n");
    process.exit(1);
  }

  const cwd = process.cwd();
  const perTree = new Map();
  const overall = makeEmptyTreeStats();
  const sampleDiffLines = [];
  let filesConsidered = 0;

  for (const root of roots) {
    const treeStats = makeEmptyTreeStats();
    perTree.set(root, treeStats);

    for (const absPath of walk(root, cwd)) {
      const relPath = relative(cwd, absPath).split(sep).join("/");
      const classification = classifyPath(relPath);
      const raw = readFileSync(absPath);
      if (isBinary(raw)) continue;

      const text = raw.toString("utf8");
      const result = scrubText(text);
      if (result.totalFound === 0) continue;

      filesConsidered++;

      if (classification === "soft") {
        // Counted for transparency, never modified.
        treeStats.excluded += result.totalFound;
        overall.excluded += result.totalFound;
        continue;
      }

      treeStats.filesScanned++;
      overall.filesScanned++;
      treeStats.totalFound += result.totalFound;
      overall.totalFound += result.totalFound;
      treeStats.specifierReplaced += result.specifierCount;
      overall.specifierReplaced += result.specifierCount;
      treeStats.bareLowerReplaced += result.bareLowerCount;
      overall.bareLowerReplaced += result.bareLowerCount;
      treeStats.bareUpperReplaced += result.bareUpperCount;
      overall.bareUpperReplaced += result.bareUpperCount;
      treeStats.protectedGit += result.protectedGitCount;
      overall.protectedGit += result.protectedGitCount;
      treeStats.protectedPlans += result.protectedPlansCount;
      overall.protectedPlans += result.protectedPlansCount;
      treeStats.protectedGitDash += result.protectedGitDashCount;
      overall.protectedGitDash += result.protectedGitDashCount;

      if (result.changed) {
        treeStats.filesChanged++;
        overall.filesChanged++;

        if (sampleDiffLines.length < 10) {
          const beforeLines = text.split("\n");
          const afterLines = result.text.split("\n");
          for (
            let i = 0;
            i < beforeLines.length && sampleDiffLines.length < 10;
            i++
          ) {
            if (beforeLines[i] !== afterLines[i]) {
              sampleDiffLines.push(
                `${relPath}:${i + 1}\n  - ${truncateForDisplay(beforeLines[i].trim())}\n  + ${truncateForDisplay(afterLines[i].trim())}`,
              );
            }
          }
        }

        if (!dryRun) {
          writeFileSync(absPath, result.text, "utf8");
        }
      }
    }
  }

  printReport({ dryRun, roots, perTree, overall, sampleDiffLines, filesConsidered });
}

function printReport({ dryRun, roots, perTree, overall, sampleDiffLines, filesConsidered }) {
  const lines = [];
  lines.push(`# scrub.mjs report (${dryRun ? "dry-run" : "applied"})`);
  lines.push("");
  lines.push(`Paths: ${roots.join(" ")}`);
  lines.push(`Files with occurrences (scanned + excluded): ${filesConsidered}`);
  lines.push("");
  lines.push("## Per-tree counts");
  lines.push("");
  lines.push(
    "| tree | files scanned | files changed | total found | rule-b (specifier) | rule-c lower | rule-c TS | protected git/ | protected plans/ | protected git-dash | excluded (soft) |",
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const root of roots) {
    const s = perTree.get(root);
    lines.push(
      `| ${root} | ${s.filesScanned} | ${s.filesChanged} | ${s.totalFound} | ${s.specifierReplaced} | ${s.bareLowerReplaced} | ${s.bareUpperReplaced} | ${s.protectedGit} | ${s.protectedPlans} | ${s.protectedGitDash} | ${s.excluded} |`,
    );
  }
  lines.push(
    `| **TOTAL** | ${overall.filesScanned} | ${overall.filesChanged} | ${overall.totalFound} | ${overall.specifierReplaced} | ${overall.bareLowerReplaced} | ${overall.bareUpperReplaced} | ${overall.protectedGit} | ${overall.protectedPlans} | ${overall.protectedGitDash} | ${overall.excluded} |`,
  );
  lines.push("");
  const totalReplaced =
    overall.specifierReplaced + overall.bareLowerReplaced + overall.bareUpperReplaced;
  const totalProtected =
    overall.protectedGit + overall.protectedPlans + overall.protectedGitDash;
  lines.push(
    `Total occurrences found: ${overall.totalFound} (scanned trees) + ${overall.excluded} (excluded/soft trees).`,
  );
  lines.push(
    `Total to replace: ${totalReplaced} (rule-b ${overall.specifierReplaced} + rule-c-lower ${overall.bareLowerReplaced} + rule-c-TS ${overall.bareUpperReplaced}).`,
  );
  lines.push(
    `Total left untouched in scanned trees (protected): ${totalProtected} ` +
      `(git/ ${overall.protectedGit} + plans/ ${overall.protectedPlans} + git-dash ${overall.protectedGitDash}).`,
  );
  lines.push("");
  lines.push("## Sample diff (up to 10 lines)");
  lines.push("");
  if (sampleDiffLines.length === 0) {
    lines.push("(no changed lines)");
  } else {
    for (const l of sampleDiffLines) lines.push(l);
  }
  lines.push("");
  process.stdout.write(lines.join("\n") + "\n");
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main();
}
