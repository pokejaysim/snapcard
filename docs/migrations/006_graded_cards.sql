-- SnapCard: Graded card support
-- Adds card_type, grading_company, and grade columns to the listings table.
-- Existing listings default to 'raw'.

ALTER TABLE listings ADD COLUMN card_type VARCHAR(20) DEFAULT 'raw';
ALTER TABLE listings ADD COLUMN grading_company VARCHAR(20);
ALTER TABLE listings ADD COLUMN grade VARCHAR(20);
