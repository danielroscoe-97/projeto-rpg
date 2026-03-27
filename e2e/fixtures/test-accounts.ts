/**
 * Test accounts for E2E tests.
 * Seeded via: npx tsx scripts/seed-test-accounts.ts
 *
 * IMPORTANT: Never use danielroscoe97@gmail.com in destructive tests.
 */

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
  locale: "pt-BR" | "en";
  uuid: string;
}

// ── DM Accounts ──────────────────────────────────────────────

export const DM_PRIMARY: TestAccount = {
  email: "dm.primary@test-taverna.com",
  password: "TestDM_Primary!1",
  displayName: "Mestre Primário",
  locale: "pt-BR",
  uuid: "0c1d188f-9afb-4d21-9115-e655073d886e",
};

export const DM_PRO: TestAccount = {
  email: "dm.pro@test-taverna.com",
  password: "TestDM_Pro!2",
  displayName: "Mestre Pro",
  locale: "pt-BR",
  uuid: "d493fb17-7da2-4565-aa92-1f6382e9499b",
};

export const DM_ENGLISH: TestAccount = {
  email: "dm.english@test-taverna.com",
  password: "TestDM_English!3",
  displayName: "English DM",
  locale: "en",
  uuid: "937aec78-cf9f-4b5e-aa49-5871fc5c166e",
};

// ── Player Accounts ──────────────────────────────────────────

export const PLAYER_WARRIOR: TestAccount = {
  email: "player.warrior@test-taverna.com",
  password: "TestPlayer_War!1",
  displayName: "Thorin Guerreiro",
  locale: "pt-BR",
  uuid: "e85c2e54-0f0d-4381-bd34-80b06f994ab2",
};

export const PLAYER_MAGE: TestAccount = {
  email: "player.mage@test-taverna.com",
  password: "TestPlayer_Mage!2",
  displayName: "Elara Maga",
  locale: "pt-BR",
  uuid: "03243068-e80e-4441-92a0-c125a4ea122b",
};

export const PLAYER_HEALER: TestAccount = {
  email: "player.healer@test-taverna.com",
  password: "TestPlayer_Heal!3",
  displayName: "Lyra Curandeira",
  locale: "pt-BR",
  uuid: "6e8ddb43-eb0e-4c2d-9c46-e52ade7dc9ad",
};

export const PLAYER_ENGLISH: TestAccount = {
  email: "player.english@test-taverna.com",
  password: "TestPlayer_EN!4",
  displayName: "John Ranger",
  locale: "en",
  uuid: "b0ba2643-39a6-4871-9ba7-f1209a337920",
};

export const PLAYER_FRESH: TestAccount = {
  email: "player.fresh@test-taverna.com",
  password: "TestPlayer_Fresh!5",
  displayName: "Novato",
  locale: "pt-BR",
  uuid: "c8f1fcf6-4b43-49af-8ae6-07edb5b06fb4",
};

export const PLAYER_AUDIO: TestAccount = {
  email: "player.maxaudio@test-taverna.com",
  password: "TestPlayer_Audio!6",
  displayName: "DJ Bardo",
  locale: "pt-BR",
  uuid: "68916a27-7048-4043-b88b-d1a0af7d7aa7",
};

export const PLAYER_TRIAL: TestAccount = {
  email: "player.trial@test-taverna.com",
  password: "TestPlayer_Trial!7",
  displayName: "Trial Player",
  locale: "pt-BR",
  uuid: "51bd87b3-0cb9-40b0-ab59-4772be7bcd51",
};

// ── Grouped exports ──────────────────────────────────────────

export const ALL_DMS = [DM_PRIMARY, DM_PRO, DM_ENGLISH] as const;
export const ALL_PLAYERS = [
  PLAYER_WARRIOR,
  PLAYER_MAGE,
  PLAYER_HEALER,
  PLAYER_ENGLISH,
  PLAYER_FRESH,
  PLAYER_AUDIO,
  PLAYER_TRIAL,
] as const;
