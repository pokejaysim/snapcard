/**
 * Build the `card_hashes` index by paginating through every Pokemon card in
 * the pokemontcg.io database, downloading its reference image, computing a
 * dHash, and upserting into Supabase.
 *
 * Idempotent — skips cards already in the DB by pokemon_tcg_id. Safe to re-run
 * if the job is interrupted.
 *
 * Rate-limited to be polite to the pokemontcg.io API and image CDN.
 */

import pLimit from "p-limit";
import { supabase } from "../lib/supabase.js";
import { computeDHashForUrl } from "../services/hashMatching.js";

const API_BASE = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250; // max allowed by the API
const IMAGE_CONCURRENCY = 10; // parallel image downloads

interface PtcgApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: { name: string; series: string };
  images: { small: string; large: string };
}

interface PtcgApiResponse {
  data: PtcgApiCard[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (apiKey) headers["X-Api-Key"] = apiKey;
  return headers;
}

async function fetchPage(page: number): Promise<PtcgApiResponse | null> {
  const url = new URL(`${API_BASE}/cards`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("select", "id,name,number,rarity,set,images");
  url.searchParams.set("orderBy", "id"); // stable pagination

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url.toString(), { headers: apiHeaders() });
    if (response.ok) {
      return (await response.json()) as PtcgApiResponse;
    }
    if (response.status === 429) {
      const wait = 2000 * (attempt + 1);
      console.warn(`[buildHashes] Rate limited on page ${String(page)}, waiting ${String(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    console.error(
      `[buildHashes] Page ${String(page)} failed: ${String(response.status)} ${response.statusText}`,
    );
    return null;
  }
  return null;
}

async function getAlreadyIndexedIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let page = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("card_hashes")
      .select("pokemon_tcg_id")
      .range(page * batchSize, (page + 1) * batchSize - 1);
    if (error || !data) break;
    for (const row of data) {
      ids.add(row.pokemon_tcg_id as string);
    }
    if (data.length < batchSize) break;
    page++;
  }
  return ids;
}

async function hashAndUpsertCard(card: PtcgApiCard): Promise<boolean> {
  try {
    // Use the small image (245x342) — cheaper to download, same dHash result
    // as the large version since we resize to 9x8 anyway.
    const hash = await computeDHashForUrl(card.images.small, false);
    if (!hash) return false;

    const { error } = await supabase.from("card_hashes").upsert(
      {
        pokemon_tcg_id: card.id,
        card_name: card.name,
        set_name: card.set.name,
        set_series: card.set.series,
        card_number: card.number,
        rarity: card.rarity ?? null,
        image_url: card.images.small,
        // Supabase expects bytea as `\x<hex>` or Uint8Array
        phash: `\\x${hash.toString("hex")}`,
      },
      { onConflict: "pokemon_tcg_id" },
    );

    if (error) {
      console.error(`[buildHashes] Upsert failed for ${card.id}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      `[buildHashes] Exception for ${card.id}:`,
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

export async function buildCardHashIndex(): Promise<{
  total: number;
  processed: number;
  skipped: number;
  failed: number;
}> {
  console.log("[buildHashes] Starting card hash index build");

  const existing = await getAlreadyIndexedIds();
  console.log(`[buildHashes] ${String(existing.size)} cards already indexed`);

  // First page also tells us the totalCount
  const first = await fetchPage(1);
  if (!first) {
    throw new Error("Failed to fetch first page from pokemontcg.io");
  }
  const totalCards = first.totalCount;
  const totalPages = Math.ceil(totalCards / PAGE_SIZE);
  console.log(
    `[buildHashes] ${String(totalCards)} total cards across ${String(totalPages)} pages`,
  );

  const limit = pLimit(IMAGE_CONCURRENCY);
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  async function handlePage(pageData: PtcgApiResponse, pageNum: number): Promise<void> {
    const toProcess = pageData.data.filter((c) => !existing.has(c.id));
    skipped += pageData.data.length - toProcess.length;

    const results = await Promise.all(
      toProcess.map((card) =>
        limit(async () => {
          const ok = await hashAndUpsertCard(card);
          return ok;
        }),
      ),
    );
    for (const ok of results) {
      if (ok) processed++;
      else failed++;
    }
    console.log(
      `[buildHashes] Page ${String(pageNum)}/${String(totalPages)} done — ` +
        `processed: ${String(processed)}, skipped: ${String(skipped)}, failed: ${String(failed)}`,
    );
  }

  await handlePage(first, 1);

  for (let page = 2; page <= totalPages; page++) {
    const pageData = await fetchPage(page);
    if (!pageData) {
      console.error(`[buildHashes] Skipping page ${String(page)} due to fetch failure`);
      continue;
    }
    await handlePage(pageData, page);
    // Small breather between pages to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `[buildHashes] Done. total=${String(totalCards)}, processed=${String(processed)}, skipped=${String(skipped)}, failed=${String(failed)}`,
  );
  return { total: totalCards, processed, skipped, failed };
}
