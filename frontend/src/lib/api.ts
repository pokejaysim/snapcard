import { DEV_MODE, DEV_LISTINGS, DEV_PHOTOS, DEV_USAGE } from "./devMode";
import { useAuthStore } from "@/store/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

let devListingCounter = 0;

// Mock responses for dev mode so the UI is fully navigable without a backend
function devMockResponse<T>(path: string, options?: RequestInit): T | null {
  if (!DEV_MODE) return null;

  const method = options?.method ?? "GET";

  // GET /listings
  if (path === "/listings" && method === "GET") {
    return DEV_LISTINGS as unknown as T;
  }

  // POST /listings (save draft) — add to session list
  if (path === "/listings" && method === "POST") {
    const body = JSON.parse((options?.body as string) ?? "{}");
    const id = `dev-new-${++devListingCounter}`;
    const isGraded = body.card_type === "graded";
    const parts = [body.card_name];
    if (body.card_number) parts.push(body.card_number);
    if (body.set_name) parts.push(body.set_name);
    if (isGraded && body.grading_company) parts.push(body.grading_company);
    if (isGraded && body.grade) parts.push(body.grade);
    if (body.rarity) parts.push(body.rarity);
    if (!isGraded && body.condition) parts.push(body.condition);

    const newListing = {
      id,
      card_name: body.card_name ?? "Untitled",
      set_name: body.set_name ?? null,
      card_number: body.card_number ?? null,
      rarity: body.rarity ?? null,
      language: body.language ?? "English",
      condition: isGraded ? null : (body.condition ?? "NM"),
      card_game: body.card_game ?? "pokemon",
      card_type: body.card_type ?? "raw",
      grading_company: body.grading_company ?? null,
      grade: body.grade ?? null,
      status: "draft",
      title: parts.join(" ").slice(0, 80),
      description: null,
      price_cad: body.price_cad ?? null,
      listing_type: body.listing_type ?? "auction",
      duration: 7,
      created_at: new Date().toISOString(),
      published_at: null,
      ebay_item_id: null,
      ebay_error: null,
      identified_by: body.identified_by ?? "manual",
    };
    DEV_LISTINGS.unshift(newListing);
    DEV_PHOTOS[id] = [];
    return { id, status: "draft" } as unknown as T;
  }

  // GET /listings/:id
  const listingMatch = path.match(/^\/listings\/([\w-]+)$/);
  if (listingMatch && method === "GET") {
    const listing = DEV_LISTINGS.find((l) => l.id === listingMatch[1]);
    if (!listing) throw new Error("Listing not found");
    return listing as unknown as T;
  }

  // PUT /listings/:id
  const updateMatch = path.match(/^\/listings\/([\w-]+)$/);
  if (updateMatch && method === "PUT") {
    const listing = DEV_LISTINGS.find((l) => l.id === updateMatch[1]);
    if (listing) {
      const body = JSON.parse((options?.body as string) ?? "{}");
      Object.assign(listing, body);
    }
    return (listing ?? { ok: true }) as unknown as T;
  }

  // DELETE /listings/:id
  const deleteMatch = path.match(/^\/listings\/([\w-]+)$/);
  if (deleteMatch && method === "DELETE") {
    const idx = DEV_LISTINGS.findIndex((l) => l.id === deleteMatch[1]);
    if (idx !== -1) DEV_LISTINGS.splice(idx, 1);
    return { ok: true } as unknown as T;
  }

  // POST /listings/:id/publish
  const publishMatch = path.match(/^\/listings\/([\w-]+)\/publish$/);
  if (publishMatch && method === "POST") {
    const listing = DEV_LISTINGS.find((l) => l.id === publishMatch[1]);
    if (listing) {
      listing.status = "scheduled";
      listing.ebay_item_id = null;
    }
    return { mock: true, status: "scheduled" } as unknown as T;
  }

  // GET /listings/:id/photos
  const photosMatch = path.match(/^\/listings\/([\w-]+)\/photos$/);
  if (photosMatch && method === "GET") {
    return (DEV_PHOTOS[photosMatch[1]] ?? []) as unknown as T;
  }

  // GET /account/usage
  if (path === "/account/usage") {
    return DEV_USAGE as unknown as T;
  }

  // GET /account/ebay-status
  if (path === "/account/ebay-status") {
    return { linked: false } as unknown as T;
  }

  // GET /account
  if (path === "/account" && method === "GET") {
    return { id: "dev", email: "demo@snapcard.dev", name: "Demo User", plan: "free" } as unknown as T;
  }

  // GET /cards/search?q=...
  if (path.startsWith("/cards/search") && method === "GET") {
    const url = new URL(path, "http://localhost");
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const mockCards = [
      { id: "base1-4", name: "Charizard", set_name: "Base", set_series: "Base", number: "4/102", rarity: "Holo Rare", image_small: "https://images.pokemontcg.io/base1/4.png", image_large: "https://images.pokemontcg.io/base1/4_hires.png" },
      { id: "swsh4-25", name: "Charizard VMAX", set_name: "Vivid Voltage", set_series: "Sword & Shield", number: "25/185", rarity: "VMAX", image_small: "https://images.pokemontcg.io/swsh4/25.png", image_large: "https://images.pokemontcg.io/swsh4/25_hires.png" },
      { id: "base1-2", name: "Blastoise", set_name: "Base", set_series: "Base", number: "2/102", rarity: "Holo Rare", image_small: "https://images.pokemontcg.io/base1/2.png", image_large: "https://images.pokemontcg.io/base1/2_hires.png" },
      { id: "base1-25", name: "Pikachu", set_name: "Base", set_series: "Base", number: "25/102", rarity: "Common", image_small: "https://images.pokemontcg.io/base1/25.png", image_large: "https://images.pokemontcg.io/base1/25_hires.png" },
      { id: "sv3pt5-151", name: "Mewtwo ex", set_name: "Pokemon 151", set_series: "Scarlet & Violet", number: "151/165", rarity: "Ultra Rare", image_small: "https://images.pokemontcg.io/sv3pt5/151.png", image_large: "https://images.pokemontcg.io/sv3pt5/151_hires.png" },
    ];
    const filtered = q ? mockCards.filter((c) => c.name.toLowerCase().includes(q)) : mockCards;
    return { cards: filtered, totalCount: filtered.length, page: 1, pageSize: 10 } as unknown as T;
  }

  // GET /cards/pokemon-tcg/:id
  const tcgMatch = path.match(/^\/cards\/pokemon-tcg\/([\w-]+)$/);
  if (tcgMatch && method === "GET") {
    const mockDetails: Record<string, unknown> = {
      "base1-4": { id: "base1-4", name: "Charizard", set_name: "Base", set_series: "Base", number: "4/102", rarity: "Holo Rare", image_small: "https://images.pokemontcg.io/base1/4.png", image_large: "https://images.pokemontcg.io/base1/4_hires.png", supertype: "Pokémon", subtypes: ["Stage 2"], tcgplayer_url: null, tcgplayer_prices: { variant: "holofoil", low: 120, mid: 200, high: 450, market: 250 } },
      "base1-2": { id: "base1-2", name: "Blastoise", set_name: "Base", set_series: "Base", number: "2/102", rarity: "Holo Rare", image_small: "https://images.pokemontcg.io/base1/2.png", image_large: "https://images.pokemontcg.io/base1/2_hires.png", supertype: "Pokémon", subtypes: ["Stage 2"], tcgplayer_url: null, tcgplayer_prices: { variant: "holofoil", low: 40, mid: 65, high: 120, market: 70 } },
      "base1-25": { id: "base1-25", name: "Pikachu", set_name: "Base", set_series: "Base", number: "25/102", rarity: "Common", image_small: "https://images.pokemontcg.io/base1/25.png", image_large: "https://images.pokemontcg.io/base1/25_hires.png", supertype: "Pokémon", subtypes: ["Basic"], tcgplayer_url: null, tcgplayer_prices: { variant: "normal", low: 5, mid: 10, high: 25, market: 12 } },
    };
    const detail = mockDetails[tcgMatch[1]];
    if (!detail) throw new Error("Card not found");
    return detail as unknown as T;
  }

  // POST /cards/identify (blocked for free)
  if (path === "/cards/identify") {
    throw new Error("Upgrade to Pro to use AI card identification");
  }

  // POST /pricing/suggest (blocked for free)
  if (path === "/pricing/suggest") {
    throw new Error("Upgrade to Pro to use pricing suggestions");
  }

  return null;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // In dev mode, return mock data instead of hitting the backend
  const mock = devMockResponse<T>(path, options);
  if (mock !== null) {
    return mock;
  }

  const token = localStorage.getItem("access_token");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  if (!res.ok) {
    // Handle 401 — session expired, force logout
    if (res.status === 401) {
      localStorage.removeItem("access_token");
      useAuthStore.getState().signOut();
      window.location.href = "/login";
      throw new Error("Session expired. Please sign in again.");
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Upload a file via multipart/form-data (e.g., photo upload).
 * Does NOT set Content-Type — the browser sets it with the boundary.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  if (DEV_MODE) {
    return { id: "dev-photo", file_url: "https://placeholder.dev/photo.jpg" } as unknown as T;
  }

  const token = localStorage.getItem("access_token");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("access_token");
      useAuthStore.getState().signOut();
      window.location.href = "/login";
      throw new Error("Session expired. Please sign in again.");
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Upload failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
