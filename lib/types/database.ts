// Database types matching Supabase schema (migrations 001-005)
// These types mirror what `supabase gen types` would produce

export type RulesetVersion = "2014" | "2024";

export type OnboardingSource = "fresh" | "guest_combat" | "guest_browse" | "returning_no_campaign";

export interface UserOnboarding {
  user_id: string;
  source: OnboardingSource;
  wizard_completed: boolean;
  wizard_step: string | null;
  dashboard_tour_completed: boolean;
  guest_data_migrated: boolean;
  created_at: string;
  updated_at: string;
}

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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          is_admin?: boolean;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          is_admin?: boolean;
          preferred_language?: string;
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
          campaign_id: string;
          user_id: string | null;
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
          campaign_id: string;
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
          campaign_id?: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          folder_id?: string | null;
          is_shared?: boolean;
          note_type?: string;
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
        };
        Update: {
          type?: "quick_note" | "journal" | "lore";
          title?: string | null;
          content?: string;
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
          is_active?: boolean;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          session_id?: string;
          token?: string;
          player_name?: string | null;
          anon_user_id?: string | null;
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
    };
    Enums: {
      ruleset_version: RulesetVersion;
    };
  };
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
export type CampaignSettings = Database["public"]["Tables"]["campaign_settings"]["Row"];
export type CharacterAbility = Database["public"]["Tables"]["character_abilities"]["Row"];
export type CharacterAbilityInsert = Database["public"]["Tables"]["character_abilities"]["Insert"];
export type CharacterAbilityUpdate = Database["public"]["Tables"]["character_abilities"]["Update"];
export type AbilityType = CharacterAbility["ability_type"];
export type Currency = { cp: number; sp: number; ep: number; gp: number; pp: number };
