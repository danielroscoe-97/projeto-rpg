-- ============================================================
-- 095: Exclude test/seed accounts from methodology stats
-- Ensures QA and test data never pollutes community analytics
-- ============================================================

-- DM test accounts
INSERT INTO excluded_accounts (user_id, reason) VALUES
  ('0c1d188f-9afb-4d21-9115-e655073d886e', 'test-dm-primary'),
  ('d493fb17-7da2-4565-aa92-1f6382e9499b', 'test-dm-pro'),
  ('937aec78-cf9f-4b5e-aa49-5871fc5c166e', 'test-dm-english')
ON CONFLICT (user_id) DO NOTHING;

-- Player test accounts
INSERT INTO excluded_accounts (user_id, reason) VALUES
  ('e85c2e54-0f0d-4381-bd34-80b06f994ab2', 'test-player-warrior'),
  ('03243068-e80e-4441-92a0-c125a4ea122b', 'test-player-mage'),
  ('6e8ddb43-eb0e-4c2d-9c46-e52ade7dc9ad', 'test-player-healer'),
  ('b0ba2643-39a6-4871-9ba7-f1209a337920', 'test-player-english'),
  ('c8f1fcf6-4b43-49af-8ae6-07edb5b06fb4', 'test-player-fresh'),
  ('68916a27-7048-4043-b88b-d1a0af7d7aa7', 'test-player-maxaudio'),
  ('51bd87b3-0cb9-40b0-ab59-4772be7bcd51', 'test-player-trial')
ON CONFLICT (user_id) DO NOTHING;
