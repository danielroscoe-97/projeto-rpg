// Database types matching Supabase schema (migrations 001-005)
// These types mirror what `supabase gen types` would produce

export type RulesetVersion = "2014" | "2024";

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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      player_characters: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          max_hp: number;
          current_hp: number;
          ac: number;
          spell_save_dc: number | null;
          dm_notes: string;
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
          spell_save_dc?: number | null;
          dm_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          name?: string;
          max_hp?: number;
          current_hp?: number;
          ac?: number;
          spell_save_dc?: number | null;
          dm_notes?: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          name?: string;
          round_number?: number;
          current_turn_index?: number;
          is_active?: boolean;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          folder_id?: string | null;
          is_shared?: boolean;
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
    };
    Enums: {
      ruleset_version: RulesetVersion;
    };
  };
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
