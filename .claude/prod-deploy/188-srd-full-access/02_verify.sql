-- F08 prod-deploy verify (READ-ONLY).
-- Run AFTER 01_apply.sql to confirm the column landed.

-- 1) Column exists with the right shape
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'campaign_settings'
  AND column_name = 'srd_full_access';
-- Expect 1 row: data_type = boolean, is_nullable = NO, column_default = false.

-- 2) Comment landed
SELECT pg_catalog.col_description(c.oid, a.attnum) AS column_comment
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'campaign_settings'
  AND a.attname = 'srd_full_access';
-- Expect: text starts with "When true, players who join this campaign's combat sessions…"

-- 3) Existing rows defaulted to false
SELECT COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE srd_full_access = false) AS rows_default_false,
       COUNT(*) FILTER (WHERE srd_full_access = true)  AS rows_already_true
FROM campaign_settings;
-- Expect: rows_default_false = total_rows; rows_already_true = 0.
