// Database types matching Supabase schema (migrations 001-005)
// These types mirror what `supabase gen types` would produce

export type RulesetVersion = "2014" | "2024";

export type OnboardingSource = "fresh" | "guest_combat" | "guest_browse" | "returning_no_campaign";

// UserOnboarding legacy standalone interface — canonical definition is now in
// Database["public"]["Tables"]["user_onboarding"]["Row"]. Kept as a type alias
// below (see type aliases section) so existing imports keep working.

export interface MonsterPresetEntry {
  monster_id: string;
  name: string;
  quantity: number;
  hp: number;
  ac: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          is_admin: boolean;
          preferred_language: string;
          role: "player" | "dm" | "both";
          default_character_id: string | null;
          last_session_at: string | null;
          avatar_url: string | null;
          upgrade_failed_at: string | null;
          /** Epic 04 D8 — when false, excluded from other users' get_past_companions results. Migration 166. */
          share_past_companions: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          is_admin?: boolean;
          preferred_language?: string;
          role?: "player" | "dm" | "both";
          default_character_id?: string | null;
          last_session_at?: string | null;
          avatar_url?: string | null;
          upgrade_failed_at?: string | null;
          share_past_companions?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          is_admin?: boolean;
          preferred_language?: string;
          role?: "player" | "dm" | "both";
          default_character_id?: string | null;
          last_session_at?: string | null;
          avatar_url?: string | null;
          upgrade_failed_at?: string | null;
          share_past_companions?: boolean;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          cover_image_url: string | null;
          archived_at: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          cover_image_url?: string | null;
          archived_at?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          description?: string | null;
          cover_image_url?: string | null;
          archived_at?: string | null;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
      player_characters: {
        Row: {
          id: string;
          campaign_id: string | null;
          user_id: string | null;
          claimed_by_session_token: string | null;
          name: string;
          max_hp: number;
          current_hp: number;
          ac: number;
          hp_temp: number;
          speed: number | null;
          initiative_bonus: number | null;
          inspiration: boolean;
          conditions: string[];
          spell_save_dc: number | null;
          dm_notes: string;
          race: string | null;
          class: string | null;
          level: number | null;
          subrace: string | null;
          subclass: string | null;
          background: string | null;
          alignment: string | null;
          notes: string | null;
          token_url: string | null;
          spell_slots: Record<string, { max: number; used: number }> | null;
          str: number | null;
          dex: number | null;
          con: number | null;
          int_score: number | null;
          wis: number | null;
          cha_score: number | null;
          traits: { personality?: string; ideal?: string; bond?: string; flaw?: string } | null;
          proficiencies: CharacterProficiencies;
          currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          user_id?: string | null;
          claimed_by_session_token?: string | null;
          name: string;
          max_hp: number;
          current_hp: number;
          ac: number;
          hp_temp?: number;
          speed?: number | null;
          initiative_bonus?: number | null;
          inspiration?: boolean;
          conditions?: string[];
          spell_save_dc?: number | null;
          dm_notes?: string;
          race?: string | null;
          class?: string | null;
          level?: number | null;
          subrace?: string | null;
          subclass?: string | null;
          background?: string | null;
          alignment?: string | null;
          notes?: string | null;
          token_url?: string | null;
          spell_slots?: Record<string, { max: number; used: number }> | null;
          str?: number | null;
          dex?: number | null;
          con?: number | null;
          int_score?: number | null;
          wis?: number | null;
          cha_score?: number | null;
          proficiencies?: CharacterProficiencies;
          traits?: { personality?: string; ideal?: string; bond?: string; flaw?: string } | null;
          currency?: { cp: number; sp: number; ep: number; gp: number; pp: number };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string | null;
          user_id?: string | null;
          claimed_by_session_token?: string | null;
          name?: string;
          max_hp?: number;
          current_hp?: number;
          ac?: number;
          hp_temp?: number;
          speed?: number | null;
          initiative_bonus?: number | null;
          inspiration?: boolean;
          conditions?: string[];
          spell_save_dc?: number | null;
          dm_notes?: string;
          race?: string | null;
          class?: string | null;
          level?: number | null;
          subrace?: string | null;
          subclass?: string | null;
          background?: string | null;
          alignment?: string | null;
          notes?: string | null;
          token_url?: string | null;
          spell_slots?: Record<string, { max: number; used: number }> | null;
          str?: number | null;
          dex?: number | null;
          con?: number | null;
          int_score?: number | null;
          wis?: number | null;
          cha_score?: number | null;
          proficiencies?: CharacterProficiencies;
          traits?: { personality?: string; ideal?: string; bond?: string; flaw?: string } | null;
          currency?: { cp: number; sp: number; ep: number; gp: number; pp: number };
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string;
          owner_id: string;
          name: string;
          ruleset_version: RulesetVersion;
          is_active: boolean;
          is_draft: boolean;
          dm_plan: string;
          description: string | null;
          scheduled_for: string | null;
          session_number: number | null;
          prep_notes: string | null;
          recap: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          owner_id: string;
          name: string;
          ruleset_version?: RulesetVersion;
          is_active?: boolean;
          is_draft?: boolean;
          dm_plan?: string;
          description?: string | null;
          scheduled_for?: string | null;
          session_number?: number | null;
          prep_notes?: string | null;
          recap?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          owner_id?: string;
          name?: string;
          ruleset_version?: RulesetVersion;
          is_active?: boolean;
          is_draft?: boolean;
          dm_plan?: string;
          description?: string | null;
          scheduled_for?: string | null;
          session_number?: number | null;
          prep_notes?: string | null;
          recap?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      encounters: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          round_number: number;
          current_turn_index: number;
          is_active: boolean;
          dm_difficulty_rating: number | null;
          dm_notes: string | null;
          party_snapshot: Json | null;
          creatures_snapshot: Json | null;
          combat_result: string | null;
          started_at: string | null;
          ended_at: string | null;
          preset_origin_id: string | null;
          was_modified_from_preset: boolean;
          has_manual_creatures: boolean;
          has_unknown_cr: boolean;
          has_incomplete_party: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          round_number?: number;
          current_turn_index?: number;
          is_active?: boolean;
          dm_difficulty_rating?: number | null;
          dm_notes?: string | null;
          party_snapshot?: Json | null;
          creatures_snapshot?: Json | null;
          combat_result?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          preset_origin_id?: string | null;
          was_modified_from_preset?: boolean;
          has_manual_creatures?: boolean;
          has_unknown_cr?: boolean;
          has_incomplete_party?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          name?: string;
          round_number?: number;
          current_turn_index?: number;
          is_active?: boolean;
          dm_difficulty_rating?: number | null;
          dm_notes?: string | null;
          party_snapshot?: Json | null;
          creatures_snapshot?: Json | null;
          combat_result?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          preset_origin_id?: string | null;
          was_modified_from_preset?: boolean;
          has_manual_creatures?: boolean;
          has_unknown_cr?: boolean;
          has_incomplete_party?: boolean;
          updated_at?: string;
        };
      };
      combatants: {
        Row: {
          id: string;
          encounter_id: string;
          name: string;
          current_hp: number;
          max_hp: number;
          temp_hp: number;
          ac: number;
          spell_save_dc: number | null;
          initiative: number | null;
          initiative_order: number | null;
          conditions: string[];
          ruleset_version: RulesetVersion | null;
          is_defeated: boolean;
          is_hidden: boolean;
          is_player: boolean;
          monster_id: string | null;
          player_character_id: string | null;
          /** Linked session_token ID — survives name changes for reconnection. */
          session_token_id: string | null;
          dm_notes: string;
          player_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          encounter_id: string;
          name: string;
          current_hp: number;
          max_hp: number;
          temp_hp?: number;
          ac: number;
          spell_save_dc?: number | null;
          initiative?: number | null;
          initiative_order?: number | null;
          conditions?: string[];
          ruleset_version?: RulesetVersion | null;
          is_defeated?: boolean;
          is_hidden?: boolean;
          is_player?: boolean;
          monster_id?: string | null;
          player_character_id?: string | null;
          session_token_id?: string | null;
          dm_notes?: string;
          player_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          encounter_id?: string;
          name?: string;
          current_hp?: number;
          max_hp?: number;
          temp_hp?: number;
          ac?: number;
          spell_save_dc?: number | null;
          initiative?: number | null;
          initiative_order?: number | null;
          conditions?: string[];
          ruleset_version?: RulesetVersion | null;
          is_defeated?: boolean;
          is_hidden?: boolean;
          is_player?: boolean;
          monster_id?: string | null;
          player_character_id?: string | null;
          session_token_id?: string | null;
          dm_notes?: string;
          player_notes?: string;
          updated_at?: string;
        };
      };
      monsters: {
        Row: {
          id: string;
          name: string;
          ruleset_version: RulesetVersion;
          size: string;
          type: string;
          alignment: string | null;
          ac: number;
          hp: number;
          hp_formula: string | null;
          speed: Json;
          str: number;
          dex: number;
          con: number;
          int: number;
          wis: number;
          cha: number;
          saving_throws: Json | null;
          skills: Json | null;
          damage_vulnerabilities: string | null;
          damage_resistances: string | null;
          damage_immunities: string | null;
          condition_immunities: string | null;
          senses: string | null;
          languages: string | null;
          challenge_rating: string;
          xp: number | null;
          special_abilities: Json | null;
          actions: Json | null;
          legendary_actions: Json | null;
          reactions: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          ruleset_version: RulesetVersion;
          size: string;
          type: string;
          alignment?: string | null;
          ac: number;
          hp: number;
          hp_formula?: string | null;
          speed?: Json;
          str?: number;
          dex?: number;
          con?: number;
          int?: number;
          wis?: number;
          cha?: number;
          saving_throws?: Json | null;
          skills?: Json | null;
          damage_vulnerabilities?: string | null;
          damage_resistances?: string | null;
          damage_immunities?: string | null;
          condition_immunities?: string | null;
          senses?: string | null;
          languages?: string | null;
          challenge_rating: string;
          xp?: number | null;
          special_abilities?: Json | null;
          actions?: Json | null;
          legendary_actions?: Json | null;
          reactions?: Json | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          ruleset_version?: RulesetVersion;
          size?: string;
          type?: string;
          alignment?: string | null;
          ac?: number;
          hp?: number;
          hp_formula?: string | null;
          speed?: Json;
          str?: number;
          dex?: number;
          con?: number;
          int?: number;
          wis?: number;
          cha?: number;
          saving_throws?: Json | null;
          skills?: Json | null;
          damage_vulnerabilities?: string | null;
          damage_resistances?: string | null;
          damage_immunities?: string | null;
          condition_immunities?: string | null;
          senses?: string | null;
          languages?: string | null;
          challenge_rating?: string;
          xp?: number | null;
          special_abilities?: Json | null;
          actions?: Json | null;
          legendary_actions?: Json | null;
          reactions?: Json | null;
        };
      };
      spells: {
        Row: {
          id: string;
          name: string;
          ruleset_version: RulesetVersion;
          level: number;
          school: string;
          casting_time: string;
          range: string;
          components: string;
          duration: string;
          description: string;
          higher_levels: string | null;
          classes: string[];
          ritual: boolean;
          concentration: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          ruleset_version: RulesetVersion;
          level: number;
          school: string;
          casting_time: string;
          range: string;
          components: string;
          duration: string;
          description: string;
          higher_levels?: string | null;
          classes?: string[];
          ritual?: boolean;
          concentration?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          ruleset_version?: RulesetVersion;
          level?: number;
          school?: string;
          casting_time?: string;
          range?: string;
          components?: string;
          duration?: string;
          description?: string;
          higher_levels?: string | null;
          classes?: string[];
          ritual?: boolean;
          concentration?: boolean;
        };
      };
      condition_types: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
        };
      };
      monster_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          monsters: MonsterPresetEntry[];
          ruleset_version: RulesetVersion;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          monsters: MonsterPresetEntry[];
          ruleset_version?: RulesetVersion;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          monsters?: MonsterPresetEntry[];
          ruleset_version?: RulesetVersion;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          trial_ends_at: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: string;
          status?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: string;
          status?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      feature_flags: {
        Row: {
          id: string;
          key: string;
          enabled: boolean;
          plan_required: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          enabled?: boolean;
          plan_required?: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          enabled?: boolean;
          plan_required?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      campaign_notes: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          title: string;
          content: string;
          folder_id: string | null;
          is_shared: boolean;
          note_type: string;
          // Wave 4 (migration 149) -- visibility model
          // `campaign_public`      -> all campaign members (legacy is_shared=true)
          // `private`              -> DM only (legacy is_shared=false, no target)
          // `dm_private_to_player` -> only DM + target_character_id owner
          visibility: "private" | "campaign_public" | "dm_private_to_player";
          target_character_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          title?: string;
          content?: string;
          folder_id?: string | null;
          is_shared?: boolean;
          note_type?: string;
          visibility?: "private" | "campaign_public" | "dm_private_to_player";
          target_character_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          folder_id?: string | null;
          is_shared?: boolean;
          note_type?: string;
          visibility?: "private" | "campaign_public" | "dm_private_to_player";
          target_character_id?: string | null;
          updated_at?: string;
        };
      };
      campaign_note_folders: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
        };
      };
      note_npc_links: {
        Row: {
          id: string;
          note_id: string;
          npc_id: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          npc_id: string;
        };
        Update: {
          note_id?: string;
          npc_id?: string;
        };
      };
      character_resource_trackers: {
        Row: {
          id: string;
          player_character_id: string;
          name: string;
          max_uses: number;
          current_uses: number;
          reset_type: "short_rest" | "long_rest" | "dawn" | "manual";
          source: "srd" | "manual";
          srd_ref: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          name: string;
          max_uses: number;
          current_uses?: number;
          reset_type?: "short_rest" | "long_rest" | "dawn" | "manual";
          source?: "srd" | "manual";
          srd_ref?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          max_uses?: number;
          current_uses?: number;
          reset_type?: "short_rest" | "long_rest" | "dawn" | "manual";
          source?: "srd" | "manual";
          srd_ref?: string | null;
          display_order?: number;
        };
      };
      party_inventory_items: {
        Row: {
          id: string;
          campaign_id: string;
          item_name: string;
          quantity: number;
          notes: string | null;
          added_by: string;
          added_at: string;
          status: "active" | "pending_removal" | "removed";
          removed_by: string | null;
          removed_at: string | null;
          removal_approved_by: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          item_name: string;
          quantity?: number;
          notes?: string | null;
          added_by: string;
          status?: "active" | "pending_removal" | "removed";
        };
        Update: {
          item_name?: string;
          quantity?: number;
          notes?: string | null;
          status?: "active" | "pending_removal" | "removed";
          removed_by?: string | null;
          removed_at?: string | null;
          removal_approved_by?: string | null;
        };
      };
      inventory_removal_requests: {
        Row: {
          id: string;
          item_id: string;
          campaign_id: string;
          requested_by: string;
          reason: string | null;
          status: "pending" | "approved" | "denied";
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          campaign_id: string;
          requested_by: string;
          reason?: string | null;
          status?: "pending" | "approved" | "denied";
        };
        Update: {
          status?: "pending" | "approved" | "denied";
          decided_by?: string | null;
          decided_at?: string | null;
        };
      };
      player_notifications: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          type: string;
          title: string;
          message: string;
          meta: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string | null;
          type: string;
          title: string;
          message: string;
          meta?: Record<string, unknown>;
        };
        Update: {
          read_at?: string | null;
        };
      };
      player_journal_entries: {
        Row: {
          id: string;
          player_character_id: string;
          campaign_id: string;
          type: "quick_note" | "journal" | "lore";
          title: string | null;
          content: string;
          // Wave 4 (migration 149) -- visibility toggle
          // `private`        -> author only (default)
          // `shared_with_dm` -> author + DM of the campaign
          visibility: "private" | "shared_with_dm";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          campaign_id: string;
          type?: "quick_note" | "journal" | "lore";
          title?: string | null;
          content: string;
          visibility?: "private" | "shared_with_dm";
        };
        Update: {
          type?: "quick_note" | "journal" | "lore";
          title?: string | null;
          content?: string;
          visibility?: "private" | "shared_with_dm";
        };
      };
      player_npc_notes: {
        Row: {
          id: string;
          player_character_id: string;
          campaign_id: string;
          npc_name: string;
          relationship: "ally" | "enemy" | "neutral" | "unknown";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          campaign_id: string;
          npc_name: string;
          relationship?: "ally" | "enemy" | "neutral" | "unknown";
          notes?: string | null;
        };
        Update: {
          npc_name?: string;
          relationship?: "ally" | "enemy" | "neutral" | "unknown";
          notes?: string | null;
        };
      };
      player_quest_notes: {
        Row: {
          id: string;
          quest_id: string;
          user_id: string;
          campaign_id: string;
          notes: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quest_id: string;
          user_id: string;
          campaign_id: string;
          notes?: string | null;
          is_favorite?: boolean;
        };
        Update: {
          notes?: string | null;
          is_favorite?: boolean;
        };
      };
      character_spells: {
        Row: {
          id: string;
          player_character_id: string;
          spell_name: string;
          spell_level: number;
          school: string | null;
          description_short: string | null;
          compendium_ref: string | null;
          status: "known" | "prepared" | "favorite";
          is_concentration: boolean;
          is_ritual: boolean;
          casting_time: string | null;
          range_text: string | null;
          components: string | null;
          duration: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          spell_name: string;
          spell_level?: number;
          school?: string | null;
          description_short?: string | null;
          compendium_ref?: string | null;
          status?: "known" | "prepared" | "favorite";
          is_concentration?: boolean;
          is_ritual?: boolean;
          casting_time?: string | null;
          range_text?: string | null;
          components?: string | null;
          duration?: string | null;
        };
        Update: {
          spell_name?: string;
          spell_level?: number;
          school?: string | null;
          description_short?: string | null;
          status?: "known" | "prepared" | "favorite";
          is_concentration?: boolean;
          is_ritual?: boolean;
        };
      };
      character_inventory_items: {
        Row: {
          id: string;
          player_character_id: string;
          item_name: string;
          quantity: number;
          equipped: boolean;
          notes: string | null;
          is_attuned: boolean;
          rarity: string | null;
          is_magic: boolean;
          attune_notes: string | null;
          srd_ref: string | null;
          weight: number | null;
          cost_gp: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          item_name: string;
          quantity?: number;
          equipped?: boolean;
          notes?: string | null;
          is_attuned?: boolean;
          rarity?: string | null;
          is_magic?: boolean;
          attune_notes?: string | null;
          srd_ref?: string | null;
          weight?: number | null;
          cost_gp?: number | null;
        };
        Update: {
          item_name?: string;
          quantity?: number;
          equipped?: boolean;
          notes?: string | null;
          is_attuned?: boolean;
          rarity?: string | null;
          is_magic?: boolean;
          attune_notes?: string | null;
          srd_ref?: string | null;
          weight?: number | null;
          cost_gp?: number | null;
          updated_at?: string;
        };
      };
      session_tokens: {
        Row: {
          id: string;
          session_id: string;
          token: string;
          player_name: string | null;
          anon_user_id: string | null;
          user_id: string | null;
          is_active: boolean;
          created_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          token: string;
          player_name?: string | null;
          anon_user_id?: string | null;
          user_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          session_id?: string;
          token?: string;
          player_name?: string | null;
          anon_user_id?: string | null;
          user_id?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
        };
      };
      campaign_settings: {
        Row: {
          id: string;
          campaign_id: string;
          game_system: string;
          party_level: number | null;
          theme: string | null;
          is_oneshot: boolean;
          allow_spectators: boolean;
          max_players: number;
          join_code_expires_at: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          game_system?: string;
          party_level?: number | null;
          theme?: string | null;
          is_oneshot?: boolean;
          allow_spectators?: boolean;
          max_players?: number;
          join_code_expires_at?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          game_system?: string;
          party_level?: number | null;
          theme?: string | null;
          is_oneshot?: boolean;
          allow_spectators?: boolean;
          max_players?: number;
          join_code_expires_at?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      character_abilities: {
        Row: {
          id: string;
          player_character_id: string;
          name: string;
          name_pt: string | null;
          description: string | null;
          description_pt: string | null;
          ability_type: "class_feature" | "racial_trait" | "feat" | "subclass_feature" | "manual";
          source_class: string | null;
          source_race: string | null;
          level_acquired: number | null;
          max_uses: number | null;
          current_uses: number;
          reset_type: "short_rest" | "long_rest" | "dawn" | "manual" | null;
          srd_ref: string | null;
          source: "srd" | "manual";
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          name: string;
          name_pt?: string | null;
          description?: string | null;
          description_pt?: string | null;
          ability_type?: "class_feature" | "racial_trait" | "feat" | "subclass_feature" | "manual";
          source_class?: string | null;
          source_race?: string | null;
          level_acquired?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          reset_type?: "short_rest" | "long_rest" | "dawn" | "manual" | null;
          srd_ref?: string | null;
          source?: "srd" | "manual";
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          name_pt?: string | null;
          description?: string | null;
          description_pt?: string | null;
          ability_type?: "class_feature" | "racial_trait" | "feat" | "subclass_feature" | "manual";
          source_class?: string | null;
          source_race?: string | null;
          level_acquired?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          reset_type?: "short_rest" | "long_rest" | "dawn" | "manual" | null;
          srd_ref?: string | null;
          source?: "srd" | "manual";
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      character_active_effects: {
        Row: {
          id: string;
          player_character_id: string;
          name: string;
          effect_type: "spell" | "consumable" | "potion" | "item" | "other";
          spell_level: number | null;
          is_concentration: boolean;
          duration_minutes: number | null;
          quantity: number;
          notes: string | null;
          source: string | null;
          cast_by: string | null;
          is_active: boolean;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_character_id: string;
          name: string;
          effect_type?: "spell" | "consumable" | "potion" | "item" | "other";
          spell_level?: number | null;
          is_concentration?: boolean;
          duration_minutes?: number | null;
          quantity?: number;
          notes?: string | null;
          source?: string | null;
          cast_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          effect_type?: "spell" | "consumable" | "potion" | "item" | "other";
          spell_level?: number | null;
          is_concentration?: boolean;
          duration_minutes?: number | null;
          quantity?: number;
          notes?: string | null;
          source?: string | null;
          is_active?: boolean;
          dismissed_at?: string | null;
        };
      };
      campaign_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          game_system: string;
          target_party_level: number;
          estimated_sessions: number | null;
          preview_image_url: string | null;
          created_by: string | null;
          is_public: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          game_system?: string;
          target_party_level?: number;
          estimated_sessions?: number | null;
          preview_image_url?: string | null;
          created_by?: string | null;
          is_public?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          game_system?: string;
          target_party_level?: number;
          estimated_sessions?: number | null;
          preview_image_url?: string | null;
          is_public?: boolean;
          sort_order?: number;
        };
      };
      user_onboarding: {
        Row: {
          user_id: string;
          source: OnboardingSource;
          wizard_completed: boolean;
          wizard_step: string | null;
          dashboard_tour_completed: boolean;
          guest_data_migrated: boolean;
          /** Epic 04 Story 04-F — DM-side walkthrough complete. Migration 166. */
          dm_tour_completed: boolean;
          /** Epic 04 Story 04-F — resumable DM tour step. NULL = never started or finished. Migration 166. */
          dm_tour_step: string | null;
          /** Epic 04 Area 1 — stamped once on the first owned campaign insert. Migration 166. */
          first_campaign_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          source?: OnboardingSource;
          wizard_completed?: boolean;
          wizard_step?: string | null;
          dashboard_tour_completed?: boolean;
          guest_data_migrated?: boolean;
          dm_tour_completed?: boolean;
          dm_tour_step?: string | null;
          first_campaign_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source?: OnboardingSource;
          wizard_completed?: boolean;
          wizard_step?: string | null;
          dashboard_tour_completed?: boolean;
          guest_data_migrated?: boolean;
          dm_tour_completed?: boolean;
          dm_tour_step?: string | null;
          first_campaign_created_at?: string | null;
          updated_at?: string;
        };
      };
      srd_monster_slugs: {
        Row: {
          slug: string;
          added_at: string;
        };
        Insert: {
          slug: string;
          added_at?: string;
        };
        Update: {
          added_at?: string;
        };
      };
      campaign_template_encounters: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          /** JSONB array of { slug, quantity, hp?, ac? }. Validated by trg_validate_template_monsters_srd (migration 167). */
          monsters_payload: CampaignTemplateMonsterEntry[] | null;
          narrative_prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          monsters_payload?: CampaignTemplateMonsterEntry[] | null;
          narrative_prompt?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          sort_order?: number;
          monsters_payload?: CampaignTemplateMonsterEntry[] | null;
          narrative_prompt?: string | null;
        };
      };
    };
    Views: {
      /** Epic 04 Story 04-A / migration 165 — per-user wrapper over v_player_sessions_played. */
      my_sessions_played: {
        Row: {
          sessions_played: number;
          last_counted_session_at: string | null;
        };
      };
    };
    Functions: {
      /** Epic 04 Story 04-A / migration 169 — see epic-04 Área 5. */
      get_past_companions: {
        Args: {
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          companion_user_id: string;
          companion_display_name: string | null;
          companion_avatar_url: string | null;
          sessions_together: number;
          last_campaign_name: string | null;
        }[];
      };
    };
    Enums: {
      ruleset_version: RulesetVersion;
    };
  };
}

/** Shape of each entry inside campaign_template_encounters.monsters_payload (Epic 04 / migration 167). */
export interface CampaignTemplateMonsterEntry {
  /**
   * SRD 5.1 slug (e.g. "goblin", "adult-red-dragon"). Validated on write against the
   * `srd_monster_slugs` whitelist table (migration 167). Clients resolve the slug to
   * monster stats via the static SRD bundles under `public/srd/` — NOT via the
   * `monsters` DB table (which is UUID-keyed and not populated at runtime).
   */
  slug: string;
  /** Number of copies to spawn on clone; validated [1, 100] on write. */
  quantity: number;
  /** Optional HP override for the spawned combatants; non-negative integer on write. */
  hp?: number;
  /** Optional AC override for the spawned combatants; non-negative integer on write. */
  ac?: number;
}

// ── Proficiencies JSONB shape ──────────────────────────────────────
export type SkillProficiency = "proficient" | "expertise";

export interface CharacterProficiencies {
  saving_throws?: string[];
  skills?: Record<string, SkillProficiency>;
  tools?: string[];
  languages?: string[];
  armor?: string[];
  weapons?: string[];
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type PlayerCharacter = Database["public"]["Tables"]["player_characters"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Encounter = Database["public"]["Tables"]["encounters"]["Row"];
export type Combatant = Database["public"]["Tables"]["combatants"]["Row"];
export type Monster = Database["public"]["Tables"]["monsters"]["Row"];
export type Spell = Database["public"]["Tables"]["spells"]["Row"];
export type ConditionType = Database["public"]["Tables"]["condition_types"]["Row"];
export type SessionToken = Database["public"]["Tables"]["session_tokens"]["Row"];
export type MonsterPreset = Database["public"]["Tables"]["monster_presets"]["Row"];
export type CampaignNote = Database["public"]["Tables"]["campaign_notes"]["Row"];
export type CampaignNoteFolder = Database["public"]["Tables"]["campaign_note_folders"]["Row"];
export type ResourceTracker = Database["public"]["Tables"]["character_resource_trackers"]["Row"];
export type PartyInventoryItem = Database["public"]["Tables"]["party_inventory_items"]["Row"];
export type InventoryRemovalRequest = Database["public"]["Tables"]["inventory_removal_requests"]["Row"];
export type PlayerNotification = Database["public"]["Tables"]["player_notifications"]["Row"];
export type JournalEntry = Database["public"]["Tables"]["player_journal_entries"]["Row"];
export type JournalEntryInsert = Database["public"]["Tables"]["player_journal_entries"]["Insert"];
/** Visibility levels for player journal entries (migration 149). */
export type JournalEntryVisibility = JournalEntry["visibility"];
/** Visibility levels for DM-authored campaign notes (migration 149). */
export type CampaignNoteVisibility = CampaignNote["visibility"];
export type NpcNote = Database["public"]["Tables"]["player_npc_notes"]["Row"];
export type NpcNoteInsert = Database["public"]["Tables"]["player_npc_notes"]["Insert"];
export type JournalEntryUpdate = Database["public"]["Tables"]["player_journal_entries"]["Update"];
export type NpcNoteUpdate = Database["public"]["Tables"]["player_npc_notes"]["Update"];
export type NpcRelationship = NpcNote["relationship"];
export type PlayerQuestNote = Database["public"]["Tables"]["player_quest_notes"]["Row"];
export type CharacterSpell = Database["public"]["Tables"]["character_spells"]["Row"];
export type CharacterSpellInsert = Database["public"]["Tables"]["character_spells"]["Insert"];
export type SpellStatus = CharacterSpell["status"];
export type CharacterInventoryItem = Database["public"]["Tables"]["character_inventory_items"]["Row"];
export type CharacterInventoryItemInsert = Database["public"]["Tables"]["character_inventory_items"]["Insert"];
export type CampaignTemplate = Database["public"]["Tables"]["campaign_templates"]["Row"];
export type CampaignTemplateInsert = Database["public"]["Tables"]["campaign_templates"]["Insert"];
export type CampaignTemplateEncounter = Database["public"]["Tables"]["campaign_template_encounters"]["Row"];
export type CampaignTemplateEncounterInsert = Database["public"]["Tables"]["campaign_template_encounters"]["Insert"];
export type UserOnboarding = Database["public"]["Tables"]["user_onboarding"]["Row"];
export type UserOnboardingInsert = Database["public"]["Tables"]["user_onboarding"]["Insert"];
export type UserOnboardingUpdate = Database["public"]["Tables"]["user_onboarding"]["Update"];
export type SrdMonsterSlug = Database["public"]["Tables"]["srd_monster_slugs"]["Row"];

/** Row shape returned by the get_past_companions() RPC (migration 169). Matches the Functions type above. */
export type PastCompanion = Database["public"]["Functions"]["get_past_companions"]["Returns"][number];

/** Row shape returned by the my_sessions_played wrapper view (migration 165). */
export type MySessionsPlayed = Database["public"]["Views"]["my_sessions_played"]["Row"];
export type CampaignSettings = Database["public"]["Tables"]["campaign_settings"]["Row"];
export type CharacterAbility = Database["public"]["Tables"]["character_abilities"]["Row"];
export type CharacterAbilityInsert = Database["public"]["Tables"]["character_abilities"]["Insert"];
export type CharacterAbilityUpdate = Database["public"]["Tables"]["character_abilities"]["Update"];
export type AbilityType = CharacterAbility["ability_type"];
export type Currency = { cp: number; sp: number; ep: number; gp: number; pp: number };
export type ActiveEffect = Database["public"]["Tables"]["character_active_effects"]["Row"];
export type ActiveEffectInsert = Database["public"]["Tables"]["character_active_effects"]["Insert"];
export type ActiveEffectUpdate = Database["public"]["Tables"]["character_active_effects"]["Update"];
export type EffectType = ActiveEffect["effect_type"];
