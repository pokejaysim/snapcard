// ── Dev Mode ──────────────────────────────────────────
// Enable via VITE_DEV_MODE=true in .env to bypass auth and use mock data.
// When unset or "false", the app connects to real Supabase + backend.

export const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

export const DEV_USER = {
  id: "dev-user-00000000-0000-0000-0000-000000000000",
  email: "demo@snapcard.dev",
  name: "Demo User",
};

export const DEV_USAGE = {
  plan: "free" as const,
  listings_this_month: 3,
  listings_limit: 10,
  total_listings: 7,
  published_listings: 2,
  ai_identify: false,
  pricing_suggestions: false,
};

// Full listing shape used by both Dashboard and ListingDetail
interface DevListing {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  language: string;
  condition: string | null;
  card_game: string;
  status: string;
  title: string | null;
  description: string | null;
  price_cad: number | null;
  listing_type: string;
  duration: number;
  created_at: string;
  published_at: string | null;
  ebay_item_id: number | null;
  ebay_error: string | null;
  identified_by: string;
}

// Mutable array so new listings persist within the session
export const DEV_LISTINGS: DevListing[] = [
  {
    id: "dev-listing-1",
    card_name: "Charizard",
    set_name: "Base Set",
    card_number: "4/102",
    rarity: "Holo Rare",
    language: "English",
    condition: "NM",
    card_game: "pokemon",
    status: "published",
    title: "Charizard 4/102 Base Set Holo Rare NM",
    description: "Charizard — Base Set 4/102 — Condition: NM",
    price_cad: 450.0,
    listing_type: "auction",
    duration: 7,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    ebay_item_id: 1234567890,
    ebay_error: null,
    identified_by: "manual",
  },
  {
    id: "dev-listing-2",
    card_name: "Blastoise",
    set_name: "Base Set",
    card_number: "2/102",
    rarity: "Holo Rare",
    language: "English",
    condition: "LP",
    card_game: "pokemon",
    status: "scheduled",
    title: "Blastoise 2/102 Base Set Holo Rare LP",
    description: "Blastoise — Base Set 2/102 — Condition: LP",
    price_cad: 85.0,
    listing_type: "fixed_price",
    duration: 30,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    published_at: null,
    ebay_item_id: null,
    ebay_error: null,
    identified_by: "manual",
  },
  {
    id: "dev-listing-3",
    card_name: "Pikachu VMAX",
    set_name: "Vivid Voltage",
    card_number: "044/185",
    rarity: "VMAX",
    language: "English",
    condition: "NM",
    card_game: "pokemon",
    status: "draft",
    title: "Pikachu VMAX 044/185 Vivid Voltage NM",
    description: null,
    price_cad: null,
    listing_type: "auction",
    duration: 7,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    published_at: null,
    ebay_item_id: null,
    ebay_error: null,
    identified_by: "manual",
  },
  {
    id: "dev-listing-4",
    card_name: "Mewtwo EX",
    set_name: "Pokemon 151",
    card_number: "150/165",
    rarity: "Ultra Rare",
    language: "English",
    condition: "NM",
    card_game: "pokemon",
    status: "error",
    title: "Mewtwo EX 150/165 Pokemon 151 Ultra Rare NM",
    description: "Mewtwo EX — Pokemon 151 150/165 — Condition: NM",
    price_cad: 25.0,
    listing_type: "fixed_price",
    duration: 30,
    created_at: new Date().toISOString(),
    published_at: null,
    ebay_item_id: null,
    ebay_error: "eBay API: Invalid shipping configuration. Please check your shipping settings.",
    identified_by: "manual",
  },
];

// Mock photos keyed by listing ID
export const DEV_PHOTOS: Record<string, { id: string; file_url: string; ebay_url: string | null; position: number }[]> = {
  "dev-listing-1": [
    { id: "photo-1a", file_url: "https://placehold.co/400x560/1a1a2e/ffffff?text=Charizard+Front", ebay_url: null, position: 0 },
    { id: "photo-1b", file_url: "https://placehold.co/400x560/1a1a2e/ffffff?text=Charizard+Back", ebay_url: null, position: 1 },
  ],
  "dev-listing-2": [
    { id: "photo-2a", file_url: "https://placehold.co/400x560/1a1a2e/ffffff?text=Blastoise+Front", ebay_url: null, position: 0 },
  ],
  "dev-listing-3": [],
  "dev-listing-4": [
    { id: "photo-4a", file_url: "https://placehold.co/400x560/1a1a2e/ffffff?text=Mewtwo+Front", ebay_url: null, position: 0 },
  ],
};
