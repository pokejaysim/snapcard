/**
 * Perceptual hash (dHash) computation and nearest-neighbor lookup against the
 * card_hashes table (populated by `npm run build-hash-index`).
 *
 * Algorithm: dHash (difference hash)
 *   1. Optionally center-crop to reduce background noise in user photos
 *   2. Resize to 9x8 grayscale
 *   3. For each row: compare adjacent pixels, emit 1 if left > right else 0
 *   4. 8 rows × 8 comparisons = 64 bits = 8 bytes
 *
 * dHash is robust to minor brightness/contrast changes but sensitive to
 * rotation, cropping, and background clutter. For user photos (card on a
 * stand with visible background) we center-crop before hashing to remove
 * ~30% of the background ring. This is a best-effort approximation —
 * properly normalizing an arbitrary card photo would require bounding-box
 * detection and perspective correction, which is a separate project.
 */

import sharp from "sharp";
import { supabase } from "../lib/supabase.js";

/** Distance threshold for accepting a pHash match as the same card. */
export const PHASH_MATCH_THRESHOLD = 10; // bits out of 64

/** How much of the center of the image to keep when cropping. 1.0 = no crop. */
const CENTER_CROP_RATIO = 0.8;

export interface PhashMatch {
  pokemon_tcg_id: string;
  card_name: string;
  set_name: string | null;
  set_series: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string;
  distance: number;
}

/**
 * Compute a 64-bit dHash from an image buffer. Returns an 8-byte Buffer.
 *
 * @param imageBuffer - raw image bytes (JPEG, PNG, etc.)
 * @param centerCrop - if true, crop to center portion before hashing (for user photos)
 */
export async function computeDHash(
  imageBuffer: Buffer,
  centerCrop = false,
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  if (centerCrop) {
    const metadata = await pipeline.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width > 0 && height > 0) {
      const cropW = Math.round(width * CENTER_CROP_RATIO);
      const cropH = Math.round(height * CENTER_CROP_RATIO);
      const left = Math.round((width - cropW) / 2);
      const top = Math.round((height - cropH) / 2);
      pipeline = sharp(imageBuffer).extract({
        left,
        top,
        width: cropW,
        height: cropH,
      });
    }
  }

  // Resize to 9 wide x 8 tall grayscale, then get raw pixel bytes
  const { data } = await pipeline
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build 64-bit hash: one bit per (row, col<8) comparison
  const hash = Buffer.alloc(8);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // data is row-major grayscale, 1 byte per pixel
      const left = data[y * 9 + x] ?? 0;
      const right = data[y * 9 + x + 1] ?? 0;
      if (left > right) {
        const bitIndex = y * 8 + x;
        const byteIdx = Math.floor(bitIndex / 8);
        const bitInByte = 7 - (bitIndex % 8);
        hash[byteIdx] = (hash[byteIdx] ?? 0) | (1 << bitInByte);
      }
    }
  }
  return hash;
}

/**
 * Hamming distance between two 8-byte hashes.
 * Returns number of bits that differ (0 = identical, 64 = opposite).
 */
export function hammingDistance(a: Buffer, b: Buffer): number {
  if (a.length !== b.length) throw new Error("hash length mismatch");
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    let x = (a[i] ?? 0) ^ (b[i] ?? 0);
    while (x) {
      count += x & 1;
      x >>>= 1;
    }
  }
  return count;
}

/**
 * Find the nearest-matching card in card_hashes via Hamming distance.
 * Returns null if the best match exceeds the threshold, or if the API/DB fails.
 *
 * Uses a Postgres RPC that computes `bit_count(phash # $1)` server-side
 * to avoid shipping the entire table to Node. If the RPC doesn't exist
 * yet, falls back to a client-side scan (slower but works out of the box).
 */
export async function findNearestCard(
  hash: Buffer,
  threshold = PHASH_MATCH_THRESHOLD,
): Promise<PhashMatch | null> {
  try {
    // Preferred path: server-side computation via SQL RPC.
    const { data, error } = await supabase.rpc("find_nearest_card_hash", {
      query_hash: `\\x${hash.toString("hex")}`,
      max_distance: threshold,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        pokemon_tcg_id: string;
        card_name: string;
        set_name: string | null;
        set_series: string | null;
        card_number: string | null;
        rarity: string | null;
        image_url: string;
        distance: number;
      };
      return { ...row, distance: Number(row.distance) };
    }

    if (error && !error.message.includes("find_nearest_card_hash")) {
      // Real error, not a missing-function error — give up and let Opus run
      console.warn("[hashMatching] RPC failed:", error.message);
      return null;
    }

    // Fallback path: client-side scan. Slower but works without the RPC.
    // Only use when the RPC genuinely doesn't exist.
    return await findNearestClientSide(hash, threshold);
  } catch (err) {
    console.warn(
      "[hashMatching] findNearestCard failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Client-side nearest-neighbor fallback. Pulls all hashes from Supabase and
 * computes Hamming distance in Node. Fine for the ~20k row Pokemon TCG
 * index, but we prefer the RPC when available.
 */
async function findNearestClientSide(
  hash: Buffer,
  threshold: number,
): Promise<PhashMatch | null> {
  const { data, error } = await supabase
    .from("card_hashes")
    .select(
      "pokemon_tcg_id, card_name, set_name, set_series, card_number, rarity, image_url, phash",
    );

  if (error || !data) {
    console.warn("[hashMatching] Client-side scan failed:", error?.message);
    return null;
  }

  let best: PhashMatch | null = null;
  for (const row of data) {
    // Supabase returns BYTEA as a hex string like "\\x0123abcd..."
    const rowHashHex = String(row.phash).replace(/^\\x/, "");
    const rowHash = Buffer.from(rowHashHex, "hex");
    if (rowHash.length !== 8) continue;
    const distance = hammingDistance(hash, rowHash);
    if (distance > threshold) continue;
    if (!best || distance < best.distance) {
      best = {
        pokemon_tcg_id: row.pokemon_tcg_id as string,
        card_name: row.card_name as string,
        set_name: row.set_name as string | null,
        set_series: row.set_series as string | null,
        card_number: row.card_number as string | null,
        rarity: row.rarity as string | null,
        image_url: row.image_url as string,
        distance,
      };
    }
  }
  return best;
}

/**
 * Convenience: download an image URL and compute its dHash.
 * Used by the batch identification path.
 */
export async function computeDHashForUrl(
  imageUrl: string,
  centerCrop = true,
): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(
        `[hashMatching] Image fetch failed: ${String(response.status)} for ${imageUrl}`,
      );
      return null;
    }
    const buf = Buffer.from(await response.arrayBuffer());
    return await computeDHash(buf, centerCrop);
  } catch (err) {
    console.warn(
      "[hashMatching] computeDHashForUrl failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
