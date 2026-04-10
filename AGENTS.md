# AGENTS.md — SnapCard

Instructions for AI coding agents (Claude Code, Codex, etc.)

## Project Context

SnapCard is a SaaS for trading card sellers to list cards on eBay faster.

**Current Phase:** MVP (manual card ID → eBay listing)

## Key Files

- `docs/SPEC.md` — Full project spec (architecture, DB schema, API endpoints)
- `backend/` — Node.js API (Express + Supabase)
- `frontend/` — React + TypeScript + Tailwind

## Tech Decisions

- **Monorepo:** Backend + frontend in one repo
- **Auth:** Supabase Auth (email) + eBay OAuth for account linking
- **Database:** Supabase PostgreSQL
- **Frontend:** React + Tailwind + Shadcn components
- **Hosting:** Vercel (frontend) + Railway/Render (backend)

## Coding Guidelines

1. **TypeScript everywhere** — strict mode, no `any`
2. **Supabase client** — use `@supabase/supabase-js` for DB and auth
3. **API structure** — RESTful, `/api/` prefix, JSON responses
4. **Error handling** — consistent error format: `{ error: string, code?: string }`
5. **Env vars** — never commit secrets, use `.env.example` as template

## eBay API Notes

- Using **Trading API** (legacy XML), not REST
- Site ID: 2 (Canada)
- Key calls: `UploadSiteHostedPictures`, `AddItem`, `VerifyAddItem`
- OAuth token type: IAF (User Token)
- Existing working code in `C:\Users\Jason\.openclaw\workspace\ebay-api-listing.ps1` (reference only)

## Commands

```bash
# Backend
cd backend && npm run dev     # Start dev server
cd backend && npm run build   # Build for production
cd backend && npm test        # Run tests

# Frontend
cd frontend && npm run dev    # Start dev server
cd frontend && npm run build  # Build for production
```

## Current Status

- [x] Repo created
- [ ] Backend scaffold (Express + Supabase)
- [ ] Frontend scaffold (React + Tailwind)
- [ ] Auth flow (signup, login, eBay OAuth)
- [ ] Listing creation flow
- [ ] Dashboard

## Ask Before

- Changing DB schema significantly
- Adding new dependencies
- Modifying auth flow
- Any billing/payment code
