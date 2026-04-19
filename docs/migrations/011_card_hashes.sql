-- Phase 3: Perceptual hash index for known Pokemon cards.
--
-- Stores a 64-bit difference hash (dHash) of each card's reference image
-- from pokemontcg.io. At identification time, we compute a dHash of the
-- user's uploaded photo (center-cropped) and find the nearest match via
-- Hamming distance. A match under the distance threshold (~10 bits)
-- lets us skip the Opus vision call entirely.
--
-- BYTEA storage lets us use Postgres' built-in XOR (`#`) and bit_count()
-- for sub-second Hamming-distance queries over ~20k rows.

CREATE TABLE IF NOT EXISTS card_hashes (
  pokemon_tcg_id VARCHAR(50) PRIMARY KEY,
  card_name VARCHAR(255) NOT NULL,
  set_name VARCHAR(255),
  set_series VARCHAR(255),
  card_number VARCHAR(50),
  rarity VARCHAR(50),
  image_url TEXT NOT NULL,
  phash BYTEA NOT NULL,  -- 8 bytes = 64-bit dHash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on set_name enables fast "show me all cards in set X" queries.
CREATE INDEX IF NOT EXISTS idx_card_hashes_set_name ON card_hashes(set_name);
CREATE INDEX IF NOT EXISTS idx_card_hashes_card_name ON card_hashes(card_name);

-- No index on phash itself — Hamming distance queries are a full scan,
-- but bit_count() on BYTEA is fast enough for ~20k rows (<500ms).
-- If growth demands, we can add LSH-style prefix indexing later.

-- ─────────────────────────────────────────────────────────────────────
-- RPC: find_nearest_card_hash
--
-- Returns up to 1 row: the card whose phash has minimum Hamming distance
-- from the query hash, if that distance is <= max_distance.
--
-- Called from backend via supabase.rpc('find_nearest_card_hash', ...).
-- Computes bit_count() server-side so we don't ship 20k rows to Node.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_nearest_card_hash(
  query_hash BYTEA,
  max_distance INT DEFAULT 10
)
RETURNS TABLE (
  pokemon_tcg_id VARCHAR(50),
  card_name VARCHAR(255),
  set_name VARCHAR(255),
  set_series VARCHAR(255),
  card_number VARCHAR(50),
  rarity VARCHAR(50),
  image_url TEXT,
  distance INT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    ch.pokemon_tcg_id,
    ch.card_name,
    ch.set_name,
    ch.set_series,
    ch.card_number,
    ch.rarity,
    ch.image_url,
    bit_count(ch.phash # query_hash)::INT AS distance
  FROM card_hashes ch
  WHERE bit_count(ch.phash # query_hash) <= max_distance
  ORDER BY bit_count(ch.phash # query_hash) ASC
  LIMIT 1;
$$;

-- Grant execute to authenticated users and the service role
GRANT EXECUTE ON FUNCTION find_nearest_card_hash(BYTEA, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearest_card_hash(BYTEA, INT) TO service_role;
