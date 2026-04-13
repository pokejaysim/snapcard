-- Migration 007: Widen eBay token columns to TEXT
-- eBay OAuth access tokens and refresh tokens can exceed 2048 characters,
-- causing "value too long for type character varying(2048)" errors.
-- TEXT has no length limit and is the appropriate type for OAuth tokens.

ALTER TABLE ebay_accounts ALTER COLUMN ebay_token TYPE TEXT;
ALTER TABLE ebay_accounts ALTER COLUMN refresh_token TYPE TEXT;