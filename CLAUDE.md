# SnapCard

SnapCard (snapcard.ca) is a SaaS tool that helps Pokemon trading card sellers list cards on eBay quickly. Users snap a photo, identify the card (via AI or database search), get pricing suggestions, and publish to eBay in one flow.

## Architecture

Monorepo with three top-level directories:

- **`frontend/`** — React 19 + Vite + TypeScript SPA
- **`backend/`** — Node.js + Express + TypeScript API server
- **`shared/`** — Shared TypeScript types (`shared/types.ts`)

### Frontend Stack
- React 19, Vite, TypeScript
- Tailwind CSS v4 (uses `@theme` in CSS, NOT `tailwind.config.ts`)
- Shadcn/ui components (in `frontend/src/components/ui/`)
- TanStack Query for data fetching
- Zustand for auth state (`frontend/src/store/auth.ts`)
- Supabase JS client for auth
- Lucide React for icons
- Google Fonts: DM Sans (headings), Inter (body)

### Backend Stack
- Express + TypeScript, runs on port 3001
- Supabase (PostgreSQL database + auth via service role key)
- Anthropic SDK (Claude) for AI card identification
- eBay API integration (OAuth, listing publish)
- Cloudinary for image storage
- Bull for job queues
- PriceCharting + eBay sold comps for pricing

### Hosting
- **Frontend**: Cloudflare Pages (direct upload via OpenClaw, NOT GitHub auto-deploy)
- **Backend**: Railway (deployed from GitHub `main`, managed by OpenClaw/Peter — ping them to redeploy after pushing backend changes)
- **Database**: Supabase hosted PostgreSQL

## Key Commands

```bash
# Frontend
cd frontend && npm run dev      # Dev server (port 5173)
cd frontend && npm run build    # Production build → dist/
cd frontend && npx tsc --noEmit # Type check only

# Backend
cd backend && npm run dev       # Dev server with hot reload (port 3001)
cd backend && npm run build     # Compile TypeScript
cd backend && npm test          # Run tests (vitest)
```

## Project Structure

```
frontend/src/
  pages/          # Route pages (Landing, Login, Register, Dashboard, CreateListing, ListingDetail, Account, Onboarding, EbayCallback)
  components/     # Shared components (Layout, CardSearch, PhotoUploader, PricingSuggestion, ProtectedRoute, UpgradePrompt)
  components/ui/  # Shadcn/ui primitives (Button, Card, Input, etc.)
  hooks/          # useAuth
  store/          # Zustand stores (auth)
  lib/            # API client (api.ts), Supabase client, dev mode mocks
  index.css       # Tailwind v4 theme with @theme block

backend/src/
  routes/         # Express route handlers (listings, photos, cards, pricing, auth, account, health)
  services/       # External API integrations (eBay, Claude AI, Pokemon TCG, pricing, storage, email)
  middleware/     # Auth middleware, plan gating, error handler
  lib/            # Plans config, Supabase client
  jobs/           # Bull queue job processors
```

## Important Patterns

### Dev Mode
`VITE_DEV_MODE=true` in `frontend/.env` bypasses Supabase auth and returns mock data for all API calls. This is for UI preview only.

**CRITICAL**: `VITE_DEV_MODE` is baked into the JS bundle at build time by Vite. Always ensure it is `false` before building for production. A production build with `true` will make all visitors appear authenticated and skip the landing page.

### Theming
- Forced light mode only (`:root { color-scheme: light; }`)
- Primary color: emerald green `hsl(160 84% 36%)`
- Theme is defined via CSS custom properties in `frontend/src/index.css` using Tailwind v4's `@theme` directive
- No `tailwind.config.ts` — all config is in CSS

### Auth Flow
- Supabase handles authentication (email/password)
- Frontend stores JWT in localStorage as `access_token`
- Backend validates JWT via Supabase service role client in `middleware/auth.ts`
- `ProtectedRoute` component guards app routes, redirects to `/login`
- Landing page (`/`) shows marketing page for unauthenticated users, redirects to `/dashboard` for authenticated users

### API Client
- `frontend/src/lib/api.ts` exports `apiFetch<T>()` and `apiUpload<T>()`
- Auto-attaches Bearer token from localStorage
- Handles 401 by clearing session and redirecting to login
- In dev mode, returns mock data without hitting backend

### Card Identification (Two Methods)
1. **Pokemon TCG API search** (free) — `CardSearch` component with debounced search, auto-fills card details
2. **Claude Vision AI** (premium) — Upload photo, AI identifies card name, set, number, rarity, condition. Uses **Claude Opus** (Sonnet/Haiku tested and found insufficient for card accuracy).

**pHash fast-path**: There's an experimental pre-Opus perceptual-hash lookup in `backend/src/services/claude/vision.ts` that was producing false positives (composition-based matching, not content). Gated behind `PHASH_FAST_PATH_ENABLED=true` env var — **leave disabled** until a real content-aware hash index is built.

### Pricing Pipeline
Pricing suggestions combine two sources and average them:
- **PriceCharting** (`backend/src/services/pricing/pricecharting.ts`) — paid API, gives raw/PSA 9/PSA 10 USD prices. Uses progressive query fallback (`name + set + number` → `name + set` → `name`) to match the right variant. Applies condition multipliers (NM=1.0, LP=0.85, MP=0.7, HP=0.5, DMG=0.3) to the raw price.
- **eBay Finding API sold comps** (`backend/src/services/pricing/ebayComps.ts`) — `findCompletedItems` is deprecated and returns intermittent 500s; we tolerate that. Only USD/CAD comps are kept; other currencies are dropped (mixing currencies gave garbage averages).

Both services return a tagged-status discriminated union (`no_key | api_error | not_found | ok`) so the UI can show a targeted reason when a source doesn't contribute. The `PricingSuggestion` component shows the PriceCharting matched product name + a "Verify" link to the source page so users can catch wrong-variant matches.

### Plan Gating
Currently all plans (free/pro/enterprise) have identical limits (all features unlocked). Plan config lives in `backend/src/lib/plans.ts`. The `requirePlan()` middleware and frontend UI conditionals still exist but won't gate anything until limits are re-differentiated.

### Cloudflare Pages Deployment
- `frontend/public/_redirects` contains `/* /index.html 200` for SPA routing
- Build output goes to `frontend/dist/`
- OpenClaw (another AI tool) handles Cloudflare dashboard uploads
- Always verify `.env` has `VITE_DEV_MODE=false` before building for deploy

## Environment Variables

### Frontend (`frontend/.env`)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key (public, safe to commit)
- `VITE_API_URL` — Backend API base URL (default: `http://localhost:3001/api`)
- `VITE_DEV_MODE` — Set to `"true"` for mock data UI preview (MUST be `"false"` for production builds)

### Backend (`backend/.env`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret)
- `ANTHROPIC_API_KEY` — Claude API key for AI identification
- `EBAY_*` — eBay OAuth credentials (listing publish)
- `EBAY_APP_ID` — eBay Finding API app ID (used for sold comps, separate from OAuth creds)
- `CLOUDINARY_*` — Image hosting credentials
- `POKEMON_TCG_API_KEY` — Optional, for higher rate limits on pokemon TCG API
- `PRICECHARTING_API_KEY` — PriceCharting API key for card price lookups (~$30/mo)
- `USD_TO_CAD_RATE` — Optional, overrides the default 1.37 FX rate used for USD→CAD conversion
- `CONDITION_MULTIPLIERS_JSON` — Optional JSON to override raw-card condition multipliers (defaults: NM=1.0, LP=0.85, MP=0.7, HP=0.5, DMG=0.3)
- `PHASH_FAST_PATH_ENABLED` — Leave unset/false. Experimental pre-Opus perceptual-hash match is currently disabled due to false positives.
