// ── Types ────────────────────────────────────────────

export interface PokemonTcgSearchResult {
  id: string;
  name: string;
  set_name: string;
  set_series: string;
  number: string;
  rarity: string | null;
  image_small: string;
  image_large: string;
}

export interface PokemonTcgCardDetail extends PokemonTcgSearchResult {
  supertype: string;
  subtypes: string[];
  tcgplayer_url: string | null;
  tcgplayer_prices: {
    variant: string;
    low: number | null;
    mid: number | null;
    high: number | null;
    market: number | null;
  } | null;
}

// ── Types for the raw API response ───────────────────

interface PtcgApiCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  number: string;
  rarity?: string;
  set: { name: string; series: string };
  images: { small: string; large: string };
  tcgplayer?: {
    url?: string;
    prices?: Record<string, { low?: number; mid?: number; high?: number; market?: number }>;
  };
}

interface PtcgApiResponse {
  data: PtcgApiCard[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ── In-memory cache (TTL = 10 min) ───────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Helpers ──────────────────────────────────────────

const API_BASE = "https://api.pokemontcg.io/v2";

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }
  return headers;
}

function toSearchResult(card: PtcgApiCard): PokemonTcgSearchResult {
  return {
    id: card.id,
    name: card.name,
    set_name: card.set.name,
    set_series: card.set.series,
    number: card.number,
    rarity: card.rarity ?? null,
    image_small: card.images.small,
    image_large: card.images.large,
  };
}

function pickBestPrice(
  prices: Record<string, { low?: number; mid?: number; high?: number; market?: number }> | undefined,
): PokemonTcgCardDetail["tcgplayer_prices"] {
  if (!prices) return null;

  // Prefer holofoil > reverseHolofoil > normal > first available
  const preferred = ["holofoil", "reverseHolofoil", "normal", "1stEditionHolofoil"];
  let variant = preferred.find((v) => prices[v]) ?? Object.keys(prices)[0];
  if (!variant) return null;

  const p = prices[variant]!;
  return {
    variant,
    low: p.low ?? null,
    mid: p.mid ?? null,
    high: p.high ?? null,
    market: p.market ?? null,
  };
}

function toCardDetail(card: PtcgApiCard): PokemonTcgCardDetail {
  return {
    ...toSearchResult(card),
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    tcgplayer_url: card.tcgplayer?.url ?? null,
    tcgplayer_prices: pickBestPrice(card.tcgplayer?.prices),
  };
}

// ── Public API ───────────────────────────────────────

/**
 * Search Pokemon TCG cards by name.
 * Returns null if the API call fails.
 */
export async function searchCards(
  query: string,
  page = 1,
  pageSize = 10,
): Promise<{ cards: PokemonTcgSearchResult[]; totalCount: number; page: number; pageSize: number } | null> {
  const cacheKey = `search:${query}:${page}:${pageSize}`;
  const cached = getCached<{ cards: PokemonTcgSearchResult[]; totalCount: number; page: number; pageSize: number }>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/cards`);
    url.searchParams.set("q", `name:"${query}"`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("select", "id,name,number,rarity,set,images,tcgplayer");

    const response = await fetch(url.toString(), { headers: apiHeaders() });
    if (!response.ok) {
      console.error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as PtcgApiResponse;
    const result = {
      cards: data.data.map(toSearchResult),
      totalCount: data.totalCount,
      page: data.page,
      pageSize: data.pageSize,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Pokemon TCG search failed:", message);
    return null;
  }
}

/**
 * Get a single card by its Pokemon TCG API ID (e.g. "base1-4").
 * Returns null if not found or API call fails.
 */
export async function getCard(id: string): Promise<PokemonTcgCardDetail | null> {
  const cacheKey = `card:${id}`;
  const cached = getCached<PokemonTcgCardDetail>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE}/cards/${id}`, { headers: apiHeaders() });
    if (!response.ok) {
      console.error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as { data: PtcgApiCard };
    const result = toCardDetail(data.data);

    setCache(cacheKey, result);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Pokemon TCG card fetch failed:", message);
    return null;
  }
}
