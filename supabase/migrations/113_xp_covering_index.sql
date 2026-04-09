-- Migration 113: Add covering index for xp_ledger trigger performance
-- The update_user_xp() trigger runs SUM(xp_amount) WHERE user_id = ? AND role = ?
-- This index includes xp_amount to avoid heap lookups (index-only scan).

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_role_amount
  ON public.xp_ledger (user_id, role)
  INCLUDE (xp_amount);
