#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DESIGN_PATH = path.join(ROOT, "data", "study_design.json");
const EXAMPLE_PATH = path.join(ROOT, "data", "study_design.example.json");
const OUTPUT_PATH = path.join(ROOT, "data", "session_config.json");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");

function fail(msg) {
  console.error(`\x1b[31merror:\x1b[0m ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(DESIGN_PATH)) {
  console.error(`No design file at ${path.relative(ROOT, DESIGN_PATH)}.`);
  if (fs.existsSync(EXAMPLE_PATH)) {
    console.error(
      `Copy ${path.relative(ROOT, EXAMPLE_PATH)} → ${path.relative(
        ROOT,
        DESIGN_PATH
      )} and edit it, then re-run.`
    );
  }
  process.exit(1);
}

let design;
try {
  design = JSON.parse(fs.readFileSync(DESIGN_PATH, "utf8"));
} catch (err) {
  fail(`Could not parse ${DESIGN_PATH}: ${err.message}`);
}

const systemLabels = design.system_labels ?? {
  A: "System 1",
  B: "System 2"
};
const overrides = design.system_label_overrides ?? {};
const reviewers = design.reviewers;
const assignments = design.assignments;

if (!Array.isArray(reviewers) || reviewers.length === 0) {
  fail("design.reviewers must be a non-empty array of reviewer IDs");
}
if (!assignments || typeof assignments !== "object") {
  fail("design.assignments must be an object keyed by reviewer ID");
}

const errors = [];
const sessions = [];
let seq = 1;

for (const reviewerId of reviewers) {
  const list = assignments[reviewerId];
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`No assignments for reviewer "${reviewerId}"`);
    continue;
  }
  const labels = overrides[reviewerId] ?? systemLabels;
  for (const cell of list) {
    const match = /^\s*([^/\s]+)\s*\/\s*([AB])\s*$/.exec(String(cell));
    if (!match) {
      errors.push(
        `Bad assignment for ${reviewerId}: "${cell}" (expected "ARTIFACT/A" or "ARTIFACT/B")`
      );
      continue;
    }
    const artifactId = match[1];
    const arch = match[2];
    const draftRel = `data/drafts/draft_${artifactId}_${arch}.md`;
    const sourceRel = `data/sources/${artifactId}.md`;
    const draftAbs = path.join(ROOT, draftRel);
    const sourceAbs = path.join(ROOT, sourceRel);
    if (!fs.existsSync(draftAbs)) {
      errors.push(`Missing draft: ${draftRel}`);
    }
    if (!fs.existsSync(sourceAbs)) {
      errors.push(`Missing source: ${sourceRel}`);
    }
    const systemLabel = labels[arch];
    if (!systemLabel) {
      errors.push(
        `No system label mapping for architecture "${arch}" (reviewer ${reviewerId})`
      );
      continue;
    }
    sessions.push({
      session_id: `s${String(seq).padStart(3, "0")}`,
      reviewer_id: reviewerId,
      artifact_id: artifactId,
      system_label: systemLabel,
      architecture_internal: arch,
      draft_path: draftRel,
      source_path: sourceRel
    });
    seq += 1;
  }
}

if (errors.length) {
  console.error("Design validation failed:");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}

// --- Preview tables ---
const col = (s, n) => String(s).padEnd(n);
console.log(`\nGenerated ${sessions.length} sessions:\n`);
console.log(
  `  ${col("session_id", 11)}${col("reviewer", 10)}${col("artifact", 10)}${col(
    "label",
    11
  )}arch`
);
console.log(`  ${"-".repeat(11)}${"-".repeat(10)}${"-".repeat(10)}${"-".repeat(11)}----`);
for (const s of sessions) {
  console.log(
    `  ${col(s.session_id, 11)}${col(s.reviewer_id, 10)}${col(
      s.artifact_id,
      10
    )}${col(s.system_label, 11)}${s.architecture_internal}`
  );
}

// Per-reviewer blinding map (catches accidental A/B swap mistakes)
console.log("\nBlinding map (what the reviewer sees → actual architecture):");
for (const reviewerId of reviewers) {
  const map = {};
  for (const s of sessions.filter((x) => x.reviewer_id === reviewerId)) {
    map[s.system_label] = s.architecture_internal;
  }
  const pairs = Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  console.log(`  ${reviewerId}: ${pairs}`);
}

if (dryRun) {
  console.log("\n(dry-run — no file written)");
  process.exit(0);
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sessions, null, 2) + "\n", "utf8");
console.log(`\nWrote ${path.relative(ROOT, OUTPUT_PATH)}`);
