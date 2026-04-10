# SnapCard

SaaS platform for trading card sellers — snap a photo, auto-generate listings, publish to eBay.

## Overview

SnapCard streamlines the listing process for collectible card sellers:

1. **Upload** card photos (front + back)
2. **Identify** the card (manual form or auto-detect)
3. **Price** with market data (PriceCharting + eBay sold comps)
4. **Publish** to eBay with one click

## Project Structure

```
snapcard/
├── backend/          # Node.js API (Express + Supabase)
├── frontend/         # React + TypeScript + Tailwind
├── docs/             # Documentation + specs
└── README.md
```

## Tech Stack

### Backend
- Node.js + Express
- Supabase (PostgreSQL + Auth)
- eBay Trading API (listing creation)
- PriceCharting API (market data)
- Bull + Redis (job queue)

### Frontend
- React + TypeScript
- Tailwind CSS + Shadcn/ui
- TanStack Query
- Vercel hosting

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account
- eBay Developer account

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your API keys
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## MVP Features

- [ ] User auth (email + password)
- [ ] eBay OAuth account linking
- [ ] Photo upload + storage
- [ ] Manual card details form
- [ ] Title/description auto-generation
- [ ] Price suggestion (PriceCharting + comps)
- [ ] eBay listing creation (scheduled)
- [ ] Listing dashboard

## Roadmap

- **Phase 1 (MVP):** Manual card ID → eBay listing
- **Phase 2:** Vision-based card identification
- **Phase 3:** Multi-platform (TCGPlayer, Shopify)

## License

MIT

---

Built with ☕ by [PJS Collectibles](https://www.ebay.ca/usr/pjs_collectibles)
