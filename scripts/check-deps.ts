#!/usr/bin/env ts-node
/**
 * H-03 — Pangea Dependency Graph Lint
 *
 * Enforces layered architecture: Core must never import from Edge.
 *
 * Layer definitions:
 *   CORE  = pure domain logic (types/core.ts + lib/ pure utilities).
 *           These types define the append-only governance layer.
 *   EDGE  = mutable social layer (types/edge.ts + edge-specific modules).
 *           Edge may reference Core IDs but never import Core internals.
 *
 * Rule: any file in CORE_PATTERNS must not contain imports matching EDGE_PATTERNS.
 *
 * Usage:
 *   npx ts-node scripts/check-deps.ts          # check only
 *   npx ts-node scripts/check-deps.ts --strict  # exit 1 on violation (for CI)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Glob-style prefixes for files that belong to the CORE layer */
const CORE_FILES: string[] = [
  "src/types/core.ts",
  "src/lib/vote-hash.ts",
  "src/lib/crypto.ts",
  "src/lib/uid.ts",
  "src/lib/integrity.ts",
  "src/lib/permissions.ts",
  "src/lib/rate-limit.ts",
  "src/lib/security.ts",
  "src/lib/platform-nodes.ts",
];

/** Patterns in import strings that indicate an EDGE dependency */
const EDGE_IMPORT_PATTERNS: RegExp[] = [
  /from\s+["'].*\/types\/edge["']/,
  /from\s+["'].*edge["']/,
  /from\s+["']@\/types\/edge["']/,
];

// ─── Scanner ──────────────────────────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  content: string;
  matchedPattern: string;
}

async function scanFile(filePath: string): Promise<Violation[]> {
  const violations: Violation[] = [];

  if (!fs.existsSync(filePath)) return violations;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    for (const pattern of EDGE_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNumber,
          content: line.trim(),
          matchedPattern: pattern.toString(),
        });
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  const root = path.resolve(process.cwd());

  console.log("🔍 Pangea H-03: Core → Edge dependency check\n");

  let totalViolations = 0;
  const results: { file: string; violations: Violation[] }[] = [];

  for (const relPath of CORE_FILES) {
    const absPath = path.join(root, relPath);
    const violations = await scanFile(absPath);
    if (violations.length > 0) {
      results.push({ file: relPath, violations });
      totalViolations += violations.length;
    }
  }

  if (totalViolations === 0) {
    console.log("✅ All clear — no Core → Edge dependency violations found.");
    console.log(`   Scanned ${CORE_FILES.length} Core files.\n`);
    process.exit(0);
  }

  // Report violations
  console.error(`❌ Found ${totalViolations} violation(s) in ${results.length} file(s):\n`);
  for (const { file, violations } of results) {
    console.error(`  📄 ${file}`);
    for (const v of violations) {
      console.error(`     Line ${v.line}: ${v.content}`);
    }
  }
  console.error(
    "\n⚠️  Core files must not import from Edge. Move shared logic to a neutral lib/ module.\n"
  );

  if (strict) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
