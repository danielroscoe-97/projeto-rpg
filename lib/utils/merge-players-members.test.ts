import { mergePlayersAndMembers } from "./merge-players-members";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

// ── Factories ─────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    id: "char-1",
    campaign_id: "camp-1",
    user_id: null,
    name: "Aragorn",
    max_hp: 50,
    current_hp: 50,
    ac: 16,
    spell_save_dc: null,
    dm_notes: "",
    race: null,
    class: null,
    level: null,
    notes: null,
    token_url: null,
    spell_slots: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMember(overrides: Partial<CampaignMemberWithUser> = {}): CampaignMemberWithUser {
  return {
    id: "mem-1",
    campaign_id: "camp-1",
    user_id: "user-1",
    role: "player",
    joined_at: "2026-01-01T00:00:00Z",
    status: "active",
    display_name: "Alice",
    email: "alice@example.com",
    character_name: null,
    ...overrides,
  };
}

// ── Case A: character manual (user_id = null) ─────────────────────────────

describe("Case A — character_only (manual, no account)", () => {
  it("returns a single character_only entry", () => {
    const characters = [makeCharacter({ id: "c1", user_id: null })];
    const members: CampaignMemberWithUser[] = [];

    const result = mergePlayersAndMembers(characters, members);

    expect(result).toHaveLength(1);
    expect(result[0].entryType).toBe("character_only");
    expect(result[0].character?.id).toBe("c1");
    expect(result[0].member).toBeNull();
    expect(result[0].key).toBe("c1");
  });
});

// ── Case B: character with account linked ────────────────────────────────

describe("Case B — linked (character + member share user_id)", () => {
  it("returns a linked entry with both character and member", () => {
    const characters = [makeCharacter({ id: "c1", user_id: "user-1" })];
    const members = [makeMember({ user_id: "user-1" })];

    const result = mergePlayersAndMembers(characters, members);

    expect(result).toHaveLength(1);
    expect(result[0].entryType).toBe("linked");
    expect(result[0].character?.id).toBe("c1");
    expect(result[0].member?.user_id).toBe("user-1");
  });

  it("sets member to null if character has user_id but member is absent", () => {
    const characters = [makeCharacter({ id: "c1", user_id: "user-99" })];
    const members: CampaignMemberWithUser[] = [];

    const result = mergePlayersAndMembers(characters, members);

    expect(result).toHaveLength(1);
    expect(result[0].entryType).toBe("linked");
    expect(result[0].member).toBeNull();
  });
});

// ── Case D: DM member is omitted ─────────────────────────────────────────

describe("Case D — DM member omitted from list", () => {
  it("omits a campaign_member with role=dm", () => {
    const characters: PlayerCharacter[] = [];
    const members = [makeMember({ role: "dm", user_id: "user-dm" })];

    const result = mergePlayersAndMembers(characters, members);

    expect(result).toHaveLength(0);
  });

  it("includes player member but not DM member when both present", () => {
    const characters = [
      makeCharacter({ id: "c1", user_id: "user-player" }),
    ];
    const members = [
      makeMember({ id: "mem-dm", role: "dm", user_id: "user-dm" }),
      makeMember({ id: "mem-player", role: "player", user_id: "user-player" }),
    ];

    const result = mergePlayersAndMembers(characters, members);

    expect(result).toHaveLength(1);
    expect(result[0].member?.user_id).toBe("user-player");
  });
});

// ── Ordering ─────────────────────────────────────────────────────────────

describe("ordering", () => {
  it("places linked entries before character_only", () => {
    const characters = [
      makeCharacter({ id: "c-manual", user_id: null, name: "Legolas", created_at: "2026-01-01T00:00:00Z" }),
      makeCharacter({ id: "c-linked", user_id: "user-1", name: "Gimli", created_at: "2026-01-02T00:00:00Z" }),
    ];
    const members = [makeMember({ user_id: "user-1" })];

    const result = mergePlayersAndMembers(characters, members);

    expect(result[0].entryType).toBe("linked");
    expect(result[1].entryType).toBe("character_only");
  });

  it("sorts character_only entries alphabetically by name", () => {
    const characters = [
      makeCharacter({ id: "c2", user_id: null, name: "Zara" }),
      makeCharacter({ id: "c1", user_id: null, name: "Aela" }),
    ];

    const result = mergePlayersAndMembers(characters, []);

    expect(result[0].character?.name).toBe("Aela");
    expect(result[1].character?.name).toBe("Zara");
  });

  it("sorts linked entries by member joined_at ascending", () => {
    const characters = [
      makeCharacter({ id: "c1", user_id: "user-1" }),
      makeCharacter({ id: "c2", user_id: "user-2" }),
    ];
    const members = [
      makeMember({ id: "m1", user_id: "user-1", joined_at: "2026-02-01T00:00:00Z" }),
      makeMember({ id: "m2", user_id: "user-2", joined_at: "2026-01-01T00:00:00Z" }),
    ];

    const result = mergePlayersAndMembers(characters, members);

    expect(result[0].member?.user_id).toBe("user-2"); // joined earlier
    expect(result[1].member?.user_id).toBe("user-1");
  });
});
