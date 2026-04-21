/**
 * Unit tests for `lib/guest/guest-migrate-pending.ts` — the handshake surface
 * between GuestRecapFlow (Cluster α) and the post-auth continuation paths
 * (Cluster β). Covers:
 *
 *   - write + read round-trip
 *   - missing key
 *   - malformed JSON
 *   - unknown version
 *   - stale TTL (> 10 min) → self-cleaning + null
 *   - clear()
 *   - storage failure swallowed (no throw)
 */
import type { Combatant } from "@/lib/types/combat";
import {
  GUEST_MIGRATE_PENDING_KEY,
  GUEST_MIGRATE_PENDING_TTL_MS,
  writeGuestMigratePending,
  readGuestMigratePending,
  clearGuestMigratePending,
} from "@/lib/guest/guest-migrate-pending";

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "c-1",
    name: "Thorin",
    role: "player",
    is_player: true,
    is_hidden: false,
    max_hp: 30,
    current_hp: 18,
    temp_hp: 0,
    ac: 16,
    initiative: 0,
    initiative_modifier: 0,
    conditions: [],
    is_defeated: false,
    reaction_used: false,
    monster_id: null,
    monster_group_id: null,
    ...overrides,
  } as unknown as Combatant;
}

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("guest-migrate-pending", () => {
  it("write → read round-trip returns the same character and campaign", () => {
    const character = makeCombatant({ id: "c-42", name: "Vex" });
    writeGuestMigratePending({ guestCharacter: character, campaignId: "camp-9" });

    const got = readGuestMigratePending();
    expect(got).not.toBeNull();
    expect(got?.version).toBe(1);
    expect(got?.campaignId).toBe("camp-9");
    expect(got?.guestCharacter.id).toBe("c-42");
    expect(got?.guestCharacter.name).toBe("Vex");
    expect(typeof got?.selectedAt).toBe("string");
  });

  it("write without campaignId is allowed (guest with no campaign linked)", () => {
    writeGuestMigratePending({ guestCharacter: makeCombatant() });
    const got = readGuestMigratePending();
    expect(got).not.toBeNull();
    expect(got?.campaignId).toBeUndefined();
  });

  it("returns null when the key is missing", () => {
    expect(readGuestMigratePending()).toBeNull();
  });

  it("returns null when the stored JSON is malformed", () => {
    window.localStorage.setItem(GUEST_MIGRATE_PENDING_KEY, "not json{");
    expect(readGuestMigratePending()).toBeNull();
  });

  it("returns null when the version is unknown (forward-compat guard)", () => {
    window.localStorage.setItem(
      GUEST_MIGRATE_PENDING_KEY,
      JSON.stringify({
        version: 99,
        guestCharacter: makeCombatant(),
        selectedAt: new Date().toISOString(),
      }),
    );
    expect(readGuestMigratePending()).toBeNull();
  });

  it("returns null when `guestCharacter` is missing/invalid", () => {
    window.localStorage.setItem(
      GUEST_MIGRATE_PENDING_KEY,
      JSON.stringify({
        version: 1,
        guestCharacter: null,
        selectedAt: new Date().toISOString(),
      }),
    );
    expect(readGuestMigratePending()).toBeNull();
  });

  it("returns null and sweeps storage when `selectedAt` is older than TTL", () => {
    const stale = new Date(
      Date.now() - GUEST_MIGRATE_PENDING_TTL_MS - 1000,
    ).toISOString();
    window.localStorage.setItem(
      GUEST_MIGRATE_PENDING_KEY,
      JSON.stringify({
        version: 1,
        guestCharacter: makeCombatant(),
        selectedAt: stale,
      }),
    );
    expect(readGuestMigratePending()).toBeNull();
    // Stale entry self-removed on read
    expect(window.localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
  });

  it("returns a record written just inside the TTL boundary", () => {
    // ~9 minutes ago — inside the 10-min TTL.
    const fresh = new Date(Date.now() - 9 * 60 * 1000).toISOString();
    window.localStorage.setItem(
      GUEST_MIGRATE_PENDING_KEY,
      JSON.stringify({
        version: 1,
        guestCharacter: makeCombatant({ id: "fresh-1" }),
        selectedAt: fresh,
      }),
    );
    const got = readGuestMigratePending();
    expect(got?.guestCharacter.id).toBe("fresh-1");
  });

  it("clearGuestMigratePending removes the key", () => {
    writeGuestMigratePending({ guestCharacter: makeCombatant() });
    expect(readGuestMigratePending()).not.toBeNull();

    clearGuestMigratePending();
    expect(window.localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
    expect(readGuestMigratePending()).toBeNull();
  });

  it("swallows storage failures on write (quota / ITP / disabled)", () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceeded");
      });
    expect(() =>
      writeGuestMigratePending({ guestCharacter: makeCombatant() }),
    ).not.toThrow();
    expect(setItemSpy).toHaveBeenCalled();
  });

  it("returns null on read when getItem throws", () => {
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("access denied");
      });
    expect(readGuestMigratePending()).toBeNull();
  });

  it("clearGuestMigratePending swallows removeItem errors", () => {
    jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("oops");
      });
    expect(() => clearGuestMigratePending()).not.toThrow();
  });
});
