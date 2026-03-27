/**
 * Seed Test Accounts for Playwright E2E Testing
 *
 * Run: npx tsx scripts/seed-test-accounts.ts
 *
 * Creates test users in Supabase Auth + public.users + subscriptions
 * Idempotent — safe to run multiple times (skips existing users)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestAccount {
  email: string;
  password: string;
  display_name: string;
  role: "dm" | "player";
  language: "pt-BR" | "en";
  plan?: "free" | "pro";
  trial?: boolean;
  description: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  // ── DM Accounts ──
  {
    email: "dm.primary@test-pocketdm.com",
    password: "TestDM_Primary!1",
    display_name: "Mestre Primário",
    role: "dm",
    language: "pt-BR",
    plan: "free",
    description: "DM principal — cria sessões, gerencia combate, testa soundboard do lado DM",
  },
  {
    email: "dm.pro@test-pocketdm.com",
    password: "TestDM_Pro!2",
    display_name: "Mestre Pro",
    role: "dm",
    language: "pt-BR",
    plan: "pro",
    description: "DM com plano Pro — testa features premium, Mesa model (jogadores herdam Pro)",
  },
  {
    email: "dm.english@test-pocketdm.com",
    password: "TestDM_English!3",
    display_name: "English DM",
    role: "dm",
    language: "en",
    plan: "free",
    description: "DM com idioma EN — testa i18n completo no fluxo do mestre",
  },

  // ── Player Accounts (Authenticated) ──
  {
    email: "player.warrior@test-pocketdm.com",
    password: "TestPlayer_War!1",
    display_name: "Thorin Guerreiro",
    role: "player",
    language: "pt-BR",
    description: "Jogador autenticado #1 — testa join, soundboard, upload de áudios custom, notas",
  },
  {
    email: "player.mage@test-pocketdm.com",
    password: "TestPlayer_Mage!2",
    display_name: "Elara Maga",
    role: "player",
    language: "pt-BR",
    description: "Jogador autenticado #2 — testa multi-player na mesma sessão, late-join",
  },
  {
    email: "player.healer@test-pocketdm.com",
    password: "TestPlayer_Heal!3",
    display_name: "Lyra Curandeira",
    role: "player",
    language: "pt-BR",
    description: "Jogador autenticado #3 — testa 3+ jogadores simultâneos, condições, HP",
  },
  {
    email: "player.english@test-pocketdm.com",
    password: "TestPlayer_EN!4",
    display_name: "John Ranger",
    role: "player",
    language: "en",
    description: "Jogador com idioma EN — testa i18n no player view, soundboard labels",
  },
  {
    email: "player.fresh@test-pocketdm.com",
    password: "TestPlayer_Fresh!5",
    display_name: "Novato",
    role: "player",
    language: "pt-BR",
    description: "Conta limpa sem histórico — testa onboarding, primeiro join, HP legend overlay",
  },
  {
    email: "player.maxaudio@test-pocketdm.com",
    password: "TestPlayer_Audio!6",
    display_name: "DJ Bardo",
    role: "player",
    language: "pt-BR",
    description: "Jogador para teste de áudio — upload de 6 MP3s (limite), delete, re-upload",
  },

  // ── Edge Case Accounts ──
  {
    email: "player.trial@test-pocketdm.com",
    password: "TestPlayer_Trial!7",
    display_name: "Trial Player",
    role: "player",
    language: "pt-BR",
    plan: "pro",
    trial: true,
    description: "Jogador com trial Pro ativo — testa trial expiry, feature gates",
  },
];

async function seedAccount(account: TestAccount) {
  const tag = `[${account.email}]`;

  // 1. Create auth user (idempotent — returns existing if email taken)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true, // Auto-confirm for testing
    user_metadata: { display_name: account.display_name },
  });

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      console.log(`${tag} Already exists — skipping auth creation`);
      // Fetch existing user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users?.find((u) => u.email === account.email);
      if (!existing) {
        console.error(`${tag} Cannot find existing user — skipping`);
        return;
      }
      return ensureProfile(existing.id, account);
    }
    console.error(`${tag} Auth error:`, authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`${tag} Created auth user: ${userId}`);

  await ensureProfile(userId, account);
}

async function ensureProfile(userId: string, account: TestAccount) {
  const tag = `[${account.email}]`;

  // 2. Ensure public.users profile
  const { error: profileError } = await supabase
    .from("users")
    .upsert({
      id: userId,
      email: account.email,
      display_name: account.display_name,
      preferred_language: account.language,
    }, { onConflict: "id" });

  if (profileError) {
    console.error(`${tag} Profile error:`, profileError.message);
  } else {
    console.log(`${tag} Profile OK — ${account.display_name} (${account.language})`);
  }

  // 3. Subscription (if specified)
  if (account.plan && account.plan !== "free") {
    const trialEnds = account.trial
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      : null;

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        plan: account.plan,
        status: account.trial ? "trialing" : "active",
        trial_ends_at: trialEnds,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id" });

    if (subError) {
      console.error(`${tag} Subscription error:`, subError.message);
    } else {
      console.log(`${tag} Subscription: ${account.plan} (${account.trial ? "trial" : "active"})`);
    }
  }
}

async function main() {
  console.log("=== Seeding Test Accounts ===\n");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Accounts to seed: ${TEST_ACCOUNTS.length}\n`);

  for (const account of TEST_ACCOUNTS) {
    await seedAccount(account);
    console.log("");
  }

  console.log("=== Done ===");
  console.log("\nSee docs/test-accounts.md for full documentation.");
}

main().catch(console.error);
