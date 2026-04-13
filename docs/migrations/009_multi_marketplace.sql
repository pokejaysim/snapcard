-- Migration 009: Multi-marketplace support (eBay Canada + eBay US)

-- Add marketplace_id and currency_code to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS marketplace_id VARCHAR(32) DEFAULT 'EBAY_CA';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'CAD';

-- Change ebay_seller_settings PK from (user_id) to (user_id, marketplace_id)
-- First drop the existing PK constraint
ALTER TABLE ebay_seller_settings DROP CONSTRAINT ebay_seller_settings_pkey;
-- Add the new composite PK
ALTER TABLE ebay_seller_settings ADD PRIMARY KEY (user_id, marketplace_id);

-- Drop old RLS policies that assumed user_id-only uniqueness
DROP POLICY IF EXISTS "Users can read own eBay seller settings" ON ebay_seller_settings;
DROP POLICY IF EXISTS "Users can update own eBay seller settings" ON ebay_seller_settings;
DROP POLICY IF EXISTS "Users can insert own eBay seller settings" ON ebay_seller_settings;
DROP POLICY IF EXISTS "Service role full access on eBay seller settings" ON ebay_seller_settings;

-- Re-create RLS policies (same as before, just ensuring they exist)
CREATE POLICY "Users can read own eBay seller settings"
  ON ebay_seller_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own eBay seller settings"
  ON ebay_seller_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eBay seller settings"
  ON ebay_seller_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on eBay seller settings"
  ON ebay_seller_settings FOR ALL
  USING (true)
  WITH CHECK (true);