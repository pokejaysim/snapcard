-- Migration 014: Seller HTML description templates

ALTER TABLE listing_preferences
  ADD COLUMN IF NOT EXISTS description_template_html TEXT;
