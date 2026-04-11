-- 129_error_logs_cleanup.sql
-- Remove redundant index: idx_error_logs_level is covered by idx_error_logs_level_created

DROP INDEX IF EXISTS idx_error_logs_level;
