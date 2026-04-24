-- Migration 013: Autopilot draft batches and listing preferences

CREATE TABLE IF NOT EXISTS listing_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_listing_type VARCHAR(50) NOT NULL DEFAULT 'fixed_price',
  default_batch_fixed_price BOOLEAN NOT NULL DEFAULT TRUE,
  price_rounding_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_raw_condition VARCHAR(8) NOT NULL DEFAULT 'NM',
  description_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own listing preferences"
  ON listing_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listing preferences"
  ON listing_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listing preferences"
  ON listing_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on listing preferences"
  ON listing_preferences FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS listing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  summary_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_batches_user_id ON listing_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_batches_status ON listing_batches(status);

ALTER TABLE listing_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own listing batches"
  ON listing_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listing batches"
  ON listing_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listing batches"
  ON listing_batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on listing batches"
  ON listing_batches FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS listing_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES listing_batches(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 1,
  front_photo_url TEXT NOT NULL,
  back_photo_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  confidence_score NUMERIC(4,3),
  needs_review_reasons TEXT[] NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_batch_items_batch_id ON listing_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_listing_batch_items_listing_id ON listing_batch_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_batch_items_status ON listing_batch_items(status);

ALTER TABLE listing_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own listing batch items"
  ON listing_batch_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listing_batches
      WHERE listing_batches.id = listing_batch_items.batch_id
      AND listing_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own listing batch items"
  ON listing_batch_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listing_batches
      WHERE listing_batches.id = listing_batch_items.batch_id
      AND listing_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own listing batch items"
  ON listing_batch_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listing_batches
      WHERE listing_batches.id = listing_batch_items.batch_id
      AND listing_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on listing batch items"
  ON listing_batch_items FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS autopilot_metadata JSONB DEFAULT '{}'::jsonb;
