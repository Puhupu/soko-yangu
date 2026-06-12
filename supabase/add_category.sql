-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Adds the category column to the products table

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';

-- Optional: backfill existing products
UPDATE products SET category = 'Other' WHERE category IS NULL;
