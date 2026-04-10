# SnapCard SaaS — Project Spec

**Goal:** Turn our eBay card listing automation into a multi-seller SaaS product.

**Start:** April 4, 2026

---

## MVP Scope (Phase 1)

### What It Does
1. Seller uploads card photos (front + back)
2. Seller fills card details form (name, set, number, condition, rarity, language)
3. System auto-generates title + description
4. Seller approves pricing (research-backed suggestion)
5. System creates eBay listing (scheduled 5h buffer)
6. Listing appears in seller's eBay account

### Why This First?
- Minimal new code (reuse existing eBay API integration)
- Fast to validate product-market fit
- No ML/vision needed yet (seller provides card ID)
- Clear ROI: saves sellers 10-15 min per listing

---

## Architecture

### Backend
- **Runtime:** Node.js + Express (or Python Flask if we stick with PS script)
- **Database:** PostgreSQL (Supabase for quick start)
- **Auth:** Supabase Auth (email) + eBay OAuth for account linking
- **Jobs:** Bull queue (Redis) for async listing creation
- **Hosting:** Railway or Render

### Frontend
- **Framework:** React + TypeScript
- **UI:** Tailwind CSS + Shadcn components
- **State:** TanStack Query + Zustand
- **Hosting:** Vercel

### Infrastructure
- **Auth0/Supabase:** User management + eBay OAuth flow
- **Stripe:** Billing (per-listing or monthly)
- **S3/Cloudinary:** Photo storage
- **SendGrid:** Transactional emails

---

## API Endpoints (Backend)

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Email/password login
- `GET /api/auth/ebay-oauth-url` — Get eBay OAuth redirect URL
- `POST /api/auth/ebay-callback` — Handle eBay OAuth callback
- `POST /api/auth/logout` — Sign out

### Listings
- `POST /api/listings` — Create draft listing
- `GET /api/listings` — List all drafts + published
- `GET /api/listings/:id` — Get listing details
- `PUT /api/listings/:id` — Update draft
- `POST /api/listings/:id/publish` — Send to eBay
- `DELETE /api/listings/:id` — Delete draft

### Card Lookup (Future)
- `POST /api/cards/identify` — Vision-based card ID (Phase 2)
- `GET /api/cards/search` — Search card database

### Pricing
- `POST /api/pricing/suggest` — Get price recommendation (PriceCharting + eBay comps)

### Account
- `GET /api/account` — Get user profile
- `PUT /api/account` — Update profile
- `GET /api/account/usage` — Billing usage (listings created this month)
- `GET /api/account/ebay-status` — Check eBay account link status

---

## Database Schema

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  stripe_customer_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free' -- free, pro, enterprise
);
```

### eBay Accounts
```sql
CREATE TABLE ebay_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ebay_token VARCHAR(2048) NOT NULL,
  ebay_user_id VARCHAR(255) NOT NULL,
  site_id INT DEFAULT 2, -- Canada
  created_at TIMESTAMP DEFAULT NOW(),
  refreshed_at TIMESTAMP
);
```

### Listings (Drafts + Published)
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ebay_item_id BIGINT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published, error
  
  -- Card Details
  card_name VARCHAR(255) NOT NULL,
  set_name VARCHAR(255),
  card_number VARCHAR(20),
  rarity VARCHAR(50),
  language VARCHAR(50) DEFAULT 'English',
  condition VARCHAR(50), -- NM, LP, MP, etc.
  
  -- Listing Details
  title VARCHAR(80),
  description TEXT,
  price_cad DECIMAL(10, 2),
  listing_type VARCHAR(50) DEFAULT 'auction', -- auction, fixed_price
  duration INT DEFAULT 7,
  
  -- Photos
  photo_urls TEXT[], -- Array of eBay hosted photo URLs
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  ebay_error TEXT,
  research_notes TEXT
);
```

### Photos
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  file_url VARCHAR(1024), -- S3 or Cloudinary
  ebay_url VARCHAR(1024), -- After UploadSiteHostedPictures
  position INT, -- 1 = front, 2 = back, etc.
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

### Price Research
```sql
CREATE TABLE price_research (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  pricechart_data JSONB, -- Raw API response
  ebay_comps JSONB, -- Sold comparables
  suggested_price_cad DECIMAL(10, 2),
  researched_at TIMESTAMP DEFAULT NOW()
);
```

---

## Frontend Flows

### Onboarding (First Time)
1. Sign up → email verification
2. Link eBay account (OAuth flow)
3. Confirm seller name + site (Canada)
4. Dashboard tutorial
5. Create first listing

### Create Listing Flow
```
Upload Photos 
  ↓
Fill Card Details (form with autocomplete)
  ↓
Auto-Generate Title + Description (preview)
  ↓
Research Pricing (suggestion + reasoning)
  ↓
Approve Price
  ↓
Review Everything
  ↓
Publish to eBay (scheduled 5h)
  ↓
Confirmation (link to Seller Hub)
```

### Dashboard
- **Active Drafts:** Card name, condition, status
- **Scheduled:** When it will publish
- **Published:** eBay link, views, best offer
- **Stats:** Listings this month, next billing cycle

---

## Reusable Code from Existing Setup

### From `ebay-api-listing.ps1`
- `UploadSiteHostedPictures` call (wrap as Node function)
- `AddItem` call with all fields
- `VerifyAddItem` for dry-run
- Error handling + retry logic
- Policy IDs (shipping, returns, payment)

### From PriceCharting Integration
- API key usage
- Search + market data parsing
- Condition mapping (NM → 4000, etc.)

### From eBay Sold Comps Lookup
- `findCompletedItems` (Finding API)
- Filtering by condition + language
- Price averaging logic

### From Description Template
- HTML structure + placeholders
- Card details table
- Shipping cards (CA/US)
- Footer call-to-action

---

## Phase 2 (Vision-Based Card ID)
- Add Claude Vision API to auto-identify from photo
- Return suggested card name + set + number + condition
- Seller confirms or overrides
- Reduces form-filling time to ~30 seconds

---

## Phase 3 (Multi-Platform)
- TCGPlayer integration
- Shopify integration
- Bulk listing management

---

## Success Metrics (MVP)
- ✅ 5 beta users can create + publish listings
- ✅ Average listing creation time < 5 minutes
- ✅ Zero eBay API errors in production
- ✅ Seller retention > 70% week-over-week

---

## Next Steps
1. Set up GitHub repo
2. Create project structure (Node backend + React frontend)
3. Wire up Supabase + eBay OAuth
4. Build listing creation flow
5. Integrate existing eBay API calls
6. Deploy to staging (Vercel + Railway)
7. Invite beta users (start with you + 2-3 other sellers)

---

*Ready to code? Let's go.* 🚀
