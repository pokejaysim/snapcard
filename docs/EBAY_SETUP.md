# eBay API Setup Guide

This guide walks you through connecting SnapCard to the eBay API — from developer registration to your first live listing.

---

## Overview

SnapCard uses the eBay Trading API to publish Pokemon card listings on your behalf. The integration involves two sides:

- **You (developer)** — register for API credentials and configure SnapCard
- **Your users (card sellers)** — connect their eBay seller account via a one-click OAuth flow

SnapCard supports two publish modes:

- **eBay Business Policies** — preferred when the seller already has fulfillment, payment, and return policies on the chosen marketplace
- **SnapCard fallback defaults** — beta fallback that stores shipping and return defaults inside SnapCard and sends them inline to the Trading API when business policies are unavailable

---

## Step 1: Register as an eBay Developer

1. Go to [developer.ebay.com](https://developer.ebay.com/join)
2. Click **Join** and create a **Business** account
3. Fill in your organization details
4. Verify your email address
5. Wait for approval — **sandbox keys are available immediately**, production keys may take 1-2 business days

---

## Step 2: Create Your Application Keyset

1. Log in to [developer.ebay.com](https://developer.ebay.com)
2. Go to **My Account** → **Application Keys**
3. Click **Create a keyset** under the **Sandbox** tab first
4. eBay will generate three values — save them:

| eBay Portal Label | SnapCard Env Var | Description |
|---|---|---|
| Client ID | `EBAY_APP_ID` | Your application identifier |
| Client Secret | `EBAY_CERT_ID` | Your application secret |
| Dev ID | `EBAY_DEV_ID` | Your developer account ID (shared across apps) |

---

## Step 3: Configure OAuth Redirect URI (RuName)

eBay calls the redirect URI a **RuName** (Redirect URL Name). This is where eBay sends users back after they authorize your app.

1. On the Application Keys page, click **User Tokens** under your keyset
2. Select **Auth Accepted URL** and add:
   - **Sandbox**: `http://localhost:5173/auth/ebay-callback`
   - **Production**: `https://snapcard.ca/auth/ebay-callback`
3. eBay generates a **RuName string** (looks like `Your_Brand_Name-YourApp-SBX-abc123`)
4. Copy this RuName string — this is your `EBAY_REDIRECT_URI`

> **Important:** `EBAY_REDIRECT_URI` is the RuName string, NOT the URL itself. eBay's OAuth endpoint uses the RuName to look up your registered callback URL.

---

## Step 4: Set Environment Variables

### Local Development (`backend/.env`)

Add these to your `backend/.env` file:

```env
# eBay API credentials
EBAY_APP_ID=your-client-id
EBAY_CERT_ID=your-client-secret
EBAY_DEV_ID=your-dev-id
EBAY_REDIRECT_URI=Your_RuName_String

# eBay environment config
EBAY_ENVIRONMENT=sandbox        # "sandbox" or "production"
EBAY_SITE_ID=2                  # 2 = Canada (eBay.ca)
EBAY_LOCATION=Vancouver, BC     # Seller city/province
EBAY_POSTAL_CODE=V5V1A1         # Seller postal code
EBAY_MOCK_MODE=false            # Set to "true" to skip real eBay API calls
```

### Production (Railway Dashboard)

Add the same variables in your Railway project's **Variables** tab. Make sure `EBAY_ENVIRONMENT=production` when you're ready to go live.

---

## Step 5: Test with Sandbox

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Create a test account or log in
4. Go through Onboarding → click **Connect eBay Account**
5. You'll be redirected to eBay's **sandbox** sign-in page
6. Sign in with a sandbox test account (create one at [sandbox.ebay.com](https://sandbox.ebay.com))
7. Approve the permissions → you'll return to SnapCard
8. Create a test listing and publish it
9. Verify in Supabase: check the `ebay_accounts` table for the token row

### Sandbox Notes
- Sandbox uses separate URLs (`api.sandbox.ebay.com`) — handled automatically by `EBAY_ENVIRONMENT`
- Test accounts have $500,000 in fake funds (refreshed weekly)
- Sandbox listings aren't real — they won't appear on eBay.com/eBay.ca
- Rate limit: 5,000 calls/day

---

## Step 6: Switch to Production

### 6A: Get Production Keyset

1. Go to **Application Keys** → **Production** tab
2. Click **Create a keyset**
3. eBay may require you to complete the **Marketplace Account Deletion Notification** requirement first (see below)
4. Add your production redirect URI: `https://snapcard.ca/auth/ebay-callback`
5. Copy the production RuName

### 6B: Marketplace Account Deletion Notification

eBay requires apps that store user data to handle account deletion requests. SnapCard stores eBay tokens in the `ebay_accounts` table, so you need to set this up:

1. In the eBay developer portal, go to your application's **Account Deletion** settings
2. Generate a long random verification token and save it as `EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN`
3. Set `EBAY_MARKETPLACE_DELETION_ENDPOINT` to the exact public endpoint URL you will enter in eBay, for example: `https://your-railway-app.up.railway.app/api/marketplace-account-deletion`
4. Enter that same endpoint URL and verification token in the eBay developer portal
5. SnapCard responds to eBay's challenge request and verifies signed deletion notifications before deleting stored eBay account data

### 6C: Update Environment Variables

Update these in both `backend/.env` and Railway:

```env
EBAY_APP_ID=your-production-client-id
EBAY_CERT_ID=your-production-client-secret
EBAY_DEV_ID=your-production-dev-id
EBAY_REDIRECT_URI=Your_Production_RuName
EBAY_ENVIRONMENT=production
EBAY_MOCK_MODE=false
OAUTH_STATE_SECRET=long-random-secret
EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN=long-random-token
EBAY_MARKETPLACE_DELETION_ENDPOINT=https://your-railway-app.up.railway.app/api/marketplace-account-deletion
EBAY_ALLOW_LIVE_PUBLISH_EMAILS=your-beta-email@example.com
FRONTEND_URL=https://snapcard.ca
CORS_ALLOWED_ORIGINS=https://snapcard.ca
```

### 6D: Application Growth Check (if needed)

If eBay flags your app for review or you want to use restricted APIs:

1. Go to [Application Growth Check](https://developer.ebay.com/grow/application-growth-check)
2. Submit your app for review (3-5 business days)
3. eBay checks: latest API versions, error handling, efficient data usage

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `EBAY_APP_ID` | Yes | — | eBay Client ID |
| `EBAY_CERT_ID` | Yes | — | eBay Client Secret |
| `EBAY_DEV_ID` | Yes | — | eBay Developer ID |
| `EBAY_REDIRECT_URI` | Yes | — | OAuth RuName string |
| `EBAY_ENVIRONMENT` | Yes | `sandbox` | `sandbox` or `production` |
| `EBAY_SITE_ID` | No | `2` | eBay site (2 = Canada) |
| `EBAY_LOCATION` | Conditionally | — | Seller city/state or city/province for Trading API listings |
| `EBAY_POSTAL_CODE` | Conditionally | — | Seller postal/ZIP code for Trading API listings |
| `EBAY_MOCK_MODE` | No | `false` | Skip real API calls when `true` |
| `OAUTH_STATE_SECRET` | Production | — | Signs short-lived eBay OAuth state tokens |
| `EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN` | Production | — | eBay deletion webhook challenge token |
| `EBAY_MARKETPLACE_DELETION_ENDPOINT` | Production | — | Exact public deletion webhook URL configured in eBay |
| `EBAY_ALLOW_LIVE_PUBLISH_EMAILS` | Production beta | — | Comma-separated emails allowed to publish live |
| `EBAY_ALLOW_LIVE_PUBLISH_USER_IDS` | Production beta | — | Comma-separated Supabase user IDs allowed to publish live |
| `CORS_ALLOWED_ORIGINS` | No | — | Extra comma-separated frontend origins beyond `FRONTEND_URL` |

*At least one of `EBAY_LOCATION` or `EBAY_POSTAL_CODE` must be set to publish listings. eBay requires either `Item.Location` or `Item.PostalCode` in every listing.

**Mock mode** activates automatically when `EBAY_MOCK_MODE=true` OR `EBAY_APP_ID` is not set. Production startup fails if `EBAY_ENVIRONMENT=production` and mock mode is enabled.

---

## Troubleshooting

### "Invalid redirect URI" during OAuth
- Verify the RuName string in `EBAY_REDIRECT_URI` matches exactly what's in the eBay developer portal
- Check that the Auth Accepted URL matches your frontend URL
- Sandbox and production RuNames are different — make sure you're using the right one

### "Token exchange failed" after OAuth callback
- Check that `EBAY_CERT_ID` is correct (this is the Client Secret, used for the Basic Auth header)
- Authorization codes expire quickly — the user may need to try the flow again

### OAuth works but publish fails
- Check the listing has all required fields: title, price, condition, at least one photo
- Verify `EBAY_SITE_ID` matches the eBay marketplace you want to list on
- Set at least one seller location field: `EBAY_LOCATION` or `EBAY_POSTAL_CODE`
- Check the backend logs for the specific eBay error code and message

### Business policies are unavailable for a seller account
- The seller can still publish by opening **SnapCard → Account → eBay Publish Setup**
- Save the SnapCard fallback defaults:
  - shipping service
  - shipping cost
  - handling time
  - returns accepted
  - return window
  - who pays return shipping
- If the seller later enables eBay Business Policies, SnapCard can switch back to the policy-based flow by selecting all three policy dropdowns

### "No eBay account linked" error
- The user needs to complete the OAuth flow before publishing
- Check Supabase `ebay_accounts` table — does a row exist for this user?

---

## How It Works (Technical Reference)

### OAuth Flow
1. Frontend calls `GET /api/auth/ebay-oauth-url`
2. Backend constructs eBay OAuth URL with scopes: `sell.inventory`, `sell.account`, `sell.fulfillment`
3. Backend includes a short-lived signed `state` tied to the logged-in SnapCard user
4. User approves on eBay → redirected to `/auth/ebay-callback?code=AUTH_CODE&state=SIGNED_STATE`
5. Frontend sends code and state to `POST /api/auth/ebay-callback`
6. Backend verifies the state before token exchange
7. Backend exchanges code for access + refresh tokens
8. Tokens stored in `ebay_accounts` table

### Token Management
- Access tokens auto-refresh when they expire within 5 minutes
- Refresh logic in `backend/src/services/ebay/tokenManager.ts`
- No user action needed — tokens stay valid indefinitely

### Publish Pipeline
1. User clicks Publish → `POST /api/listings/:id/publish`
2. Backend runs `VerifyAddItem` (dry run, checks for errors)
3. Listing status set to `scheduled` with 5-hour delay
4. Background job: uploads photos to eBay, calls `AddItem`, updates status to `published`
5. User gets email notification on success or failure

### Key Files
```
backend/src/services/ebay/
  config.ts          # URL switching, mock mode detection
  tokenManager.ts    # Token refresh logic
  trading.ts         # Trading API calls (AddItem, VerifyAddItem, etc.)
  publish.ts         # Publish scheduling and job logic
```

---

## Future: Video Tutorial

_Placeholder: A walkthrough video covering the OAuth flow from the user's perspective will be linked here once created._
