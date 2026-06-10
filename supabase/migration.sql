-- ============================================
-- SOKO YANGU — Migration (run in Supabase SQL Editor)
-- ============================================

-- 1. Add WhatsApp phone to seller_profiles
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Add rider tracking fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_phone text;

-- 3. Search logs table
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sl_insert ON search_logs;
DROP POLICY IF EXISTS sl_read   ON search_logs;
CREATE POLICY sl_insert ON search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY sl_read   ON search_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Add search_logs to realtime (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE search_logs;
