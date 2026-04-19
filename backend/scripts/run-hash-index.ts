/**
 * Standalone script that builds the Pokemon card pHash index.
 *
 * Run:  npm run build-hash-index
 *
 * Prerequisites:
 *   1. Migration 011_card_hashes.sql has been applied in Supabase.
 *   2. backend/.env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set
 *      (pointing at your production Supabase — the hash index is shared
 *      across all environments since Pokemon TCG data doesn't change).
 *   3. (Optional) POKEMON_TCG_API_KEY for higher rate limits.
 *
 * Expect ~20-30 min for a fresh run (~20k cards).
 * Safe to re-run — idempotent via upsert + already-indexed skip list.
 */

import "dotenv/config";
import { buildCardHashIndex } from "../src/jobs/buildCardHashes.js";

async function main(): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await buildCardHashIndex();
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log("");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Done in ${String(elapsed)}s`);
    console.log(`  Total cards in source: ${String(result.total)}`);
    console.log(`  Newly indexed:         ${String(result.processed)}`);
    console.log(`  Already indexed:       ${String(result.skipped)}`);
    console.log(`  Failed:                ${String(result.failed)}`);
    console.log("═══════════════════════════════════════════════════");
  } catch (err) {
    console.error(
      "Hash index build failed:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

void main();
