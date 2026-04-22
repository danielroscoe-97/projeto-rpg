/**
 * Backup completo de combate de um DM específico
 * Usage: npx tsx scripts/backup-combat-session.ts <dm_email>
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const dmEmail = process.argv[2];
  if (!dmEmail) {
    console.error("Usage: npx tsx scripts/backup-combat-session.ts <dm_email>");
    process.exit(1);
  }

  console.log(`\n🔍 Buscando DM: ${dmEmail}`);

  // 1. Find DM user
  const { data: dmUser, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("email", dmEmail)
    .single();

  if (userErr || !dmUser) {
    console.error("DM não encontrado:", userErr?.message);
    process.exit(1);
  }
  console.log(`✅ DM encontrado: ${dmUser.display_name || dmUser.email} (${dmUser.id})`);

  const dmId = dmUser.id;

  // 2. Get all sessions owned by this DM
  const { data: sessions, error: sessErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("owner_id", dmId);

  if (sessErr) {
    console.error("Erro ao buscar sessions:", sessErr.message);
    process.exit(1);
  }
  console.log(`📋 Sessions encontradas: ${sessions?.length || 0}`);

  const sessionIds = (sessions || []).map((s) => s.id);

  // 3. Get all encounters for these sessions
  const { data: encounters, error: encErr } = await supabase
    .from("encounters")
    .select("*")
    .in("session_id", sessionIds);

  if (encErr) {
    console.error("Erro ao buscar encounters:", encErr.message);
    process.exit(1);
  }
  console.log(`⚔️  Encounters encontrados: ${encounters?.length || 0}`);

  const encounterIds = (encounters || []).map((e) => e.id);

  // 4. Get all combatants for these encounters
  const { data: combatants, error: combErr } = await supabase
    .from("combatants")
    .select("*")
    .in("encounter_id", encounterIds);

  if (combErr) {
    console.error("Erro ao buscar combatants:", combErr.message);
    process.exit(1);
  }
  console.log(`🎭 Combatants encontrados: ${combatants?.length || 0}`);

  // 5. Get session tokens
  const { data: sessionTokens, error: tokErr } = await supabase
    .from("session_tokens")
    .select("*")
    .in("session_id", sessionIds);

  if (tokErr) {
    console.error("Erro ao buscar session_tokens:", tokErr.message);
    process.exit(1);
  }
  console.log(`🎫 Session tokens encontrados: ${sessionTokens?.length || 0}`);

  // 6. Get encounter votes
  let encounterVotes: any[] = [];
  if (encounterIds.length > 0) {
    const { data: votes, error: voteErr } = await supabase
      .from("encounter_votes")
      .select("*")
      .in("encounter_id", encounterIds);

    if (!voteErr && votes) {
      encounterVotes = votes;
    }
    console.log(`🗳️  Encounter votes encontrados: ${encounterVotes.length}`);
  }

  // 7. Get combat reports
  let combatReports: any[] = [];
  if (encounterIds.length > 0) {
    const { data: reports, error: repErr } = await supabase
      .from("combat_reports")
      .select("*")
      .eq("owner_id", dmId);

    if (!repErr && reports) {
      combatReports = reports;
    }
    console.log(`📊 Combat reports encontrados: ${combatReports.length}`);
  }

  // 8. Get campaigns owned by this DM
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("owner_id", dmId);

  if (campErr) {
    console.error("Erro ao buscar campaigns:", campErr.message);
  }
  console.log(`🏰 Campaigns encontradas: ${campaigns?.length || 0}`);

  const campaignIds = (campaigns || []).map((c) => c.id);

  // 9. Get campaign members
  let campaignMembers: any[] = [];
  if (campaignIds.length > 0) {
    const { data: members, error: memErr } = await supabase
      .from("campaign_members")
      .select("*")
      .in("campaign_id", campaignIds);

    if (!memErr && members) {
      campaignMembers = members;
    }
    console.log(`👥 Campaign members encontrados: ${campaignMembers.length}`);
  }

  // 10. Get player characters from campaigns
  let playerCharacters: any[] = [];
  if (campaignIds.length > 0) {
    const { data: pcs, error: pcErr } = await supabase
      .from("player_characters")
      .select("*")
      .in("campaign_id", campaignIds);

    if (!pcErr && pcs) {
      playerCharacters = pcs;
    }
    console.log(`🧙 Player characters encontrados: ${playerCharacters.length}`);
  }

  // 11. Get encounter presets
  let encounterPresets: any[] = [];
  let presetCreatures: any[] = [];
  if (campaignIds.length > 0) {
    const { data: presets, error: preErr } = await supabase
      .from("encounter_presets")
      .select("*")
      .in("campaign_id", campaignIds);

    if (!preErr && presets) {
      encounterPresets = presets;
      const presetIds = presets.map((p) => p.id);

      if (presetIds.length > 0) {
        const { data: creatures, error: crErr } = await supabase
          .from("encounter_preset_creatures")
          .select("*")
          .in("preset_id", presetIds);

        if (!crErr && creatures) {
          presetCreatures = creatures;
        }
      }
    }
    console.log(`📦 Encounter presets: ${encounterPresets.length}, creatures: ${presetCreatures.length}`);
  }

  // 12. campaign_invites table was dropped in migration 180 (2026-04-21);
  //     historical backups that pre-date that migration still carry this
  //     field, but new backups simply omit it.

  // Build backup object
  const backup = {
    metadata: {
      backup_date: new Date().toISOString(),
      dm_email: dmEmail,
      dm_user_id: dmId,
      dm_display_name: dmUser.display_name,
      description: "Backup completo de combate — Beta Test Session 10/04/2026",
      tables_included: [
        "users (DM)",
        "campaigns",
        "campaign_members",
        "player_characters",
        "sessions",
        "encounters",
        "combatants",
        "session_tokens",
        "encounter_votes",
        "combat_reports",
        "encounter_presets",
        "encounter_preset_creatures",
      ],
    },
    dm_user: dmUser,
    campaigns: campaigns || [],
    campaign_members: campaignMembers,
    player_characters: playerCharacters,
    sessions: sessions || [],
    encounters: encounters || [],
    combatants: combatants || [],
    session_tokens: sessionTokens || [],
    encounter_votes: encounterVotes,
    combat_reports: combatReports,
    encounter_presets: encounterPresets,
    encounter_preset_creatures: presetCreatures,
    summary: {
      total_campaigns: (campaigns || []).length,
      total_sessions: (sessions || []).length,
      total_encounters: (encounters || []).length,
      total_combatants: (combatants || []).length,
      total_session_tokens: (sessionTokens || []).length,
      total_encounter_votes: encounterVotes.length,
      total_combat_reports: combatReports.length,
      total_player_characters: playerCharacters.length,
      total_encounter_presets: encounterPresets.length,
      active_sessions: (sessions || []).filter((s) => s.is_active).length,
      active_encounters: (encounters || []).filter((e) => e.is_active).length,
    },
  };

  // Write to backup directory
  const backupDir = path.join(process.cwd(), "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `combat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");

  console.log(`\n✅ Backup salvo em: ${filepath}`);
  console.log(`📦 Tamanho: ${(fs.statSync(filepath).size / 1024).toFixed(1)} KB`);
  console.log("\n📊 RESUMO:");
  console.log(JSON.stringify(backup.summary, null, 2));
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
