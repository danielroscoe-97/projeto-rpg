// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.

// ---------------------------------------------------------------------------
// Supabase mock plumbing
//
// `detectInviteState` reads two tables via the service client:
//   - campaign_invites (FK-joined to campaigns + users)
//   - users  (SELECT display_name WHERE id = authUser.id)
//
// and one auth call (`getAuthUser`). We mock:
//   - `@/lib/supabase/server` → `createServiceClient` + `getAuthUser`
//
// Per-table builder state lets each test stub the exact result of the
// table access it exercises without having to track the full chain.
// ---------------------------------------------------------------------------

type DbError = { message: string } | null;
type DbResult<T> = { data: T | null; error: DbError };

type CampaignInviteJoinRow = {
  id: string;
  campaign_id: string;
  email: string | null;
  status: string;
  expires_at: string;
  campaigns:
    | {
        name: string;
        users: { display_name: string | null; email: string } | null;
      }
    | null;
};

type UsersRow = { display_name: string | null };

type State = {
  campaignInvitesResult: DbResult<CampaignInviteJoinRow>;
  usersResult: DbResult<UsersRow>;
  authUser: { id: string; email?: string; is_anonymous?: boolean } | null;
};

const state: State = {
  campaignInvitesResult: { data: null, error: null },
  usersResult: { data: null, error: null },
  authUser: null,
};

function makeBuilder(table: string): Record<string, unknown> {
  if (table === "campaign_invites") {
    const b: Record<string, unknown> = {};
    b.select = jest.fn(() => b);
    b.eq = jest.fn(() => b);
    b.maybeSingle = jest.fn(() => Promise.resolve(state.campaignInvitesResult));
    return b;
  }
  if (table === "users") {
    const b: Record<string, unknown> = {};
    b.select = jest.fn(() => b);
    b.eq = jest.fn(() => b);
    b.maybeSingle = jest.fn(() => Promise.resolve(state.usersResult));
    return b;
  }
  // Fallthrough: any unexpected table is a test authoring bug.
  throw new Error(`detect-invite-state test hit unmocked table: ${table}`);
}

const fromMock = jest.fn((table: string) => makeBuilder(table));

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: fromMock }),
  getAuthUser: jest.fn(() => Promise.resolve(state.authUser)),
}));

// Imports come after jest.mock so the mock is in place at module init.
import { detectInviteState } from "@/lib/identity/detect-invite-state";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOKEN = "00000000-0000-0000-0000-0000000000aa";
const INVITE_ID = "00000000-0000-0000-0000-000000000001";
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000002";
const USER_ID = "00000000-0000-0000-0000-000000000003";

function makeInviteRow(overrides: Partial<CampaignInviteJoinRow> = {}): CampaignInviteJoinRow {
  return {
    id: INVITE_ID,
    campaign_id: CAMPAIGN_ID,
    email: "maria@example.com",
    status: "pending",
    // 7 days in the future — not expired.
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    campaigns: {
      name: "Phandelver",
      users: { display_name: "Dani", email: "dani@example.com" },
    },
    ...overrides,
  };
}

function makeAuthUser(overrides: Partial<{ id: string; email: string; is_anonymous: boolean }> = {}) {
  return {
    id: USER_ID,
    email: "maria@example.com",
    is_anonymous: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  state.campaignInvitesResult = { data: null, error: null };
  state.usersResult = { data: null, error: null };
  state.authUser = null;
});

describe("detectInviteState — invalid tokens", () => {
  it("returns invalid.not_found when token is empty string", async () => {
    const result = await detectInviteState("");
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.not_found when token is only whitespace (typo)", async () => {
    const result = await detectInviteState("   ");
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.not_found when DB lookup returns null (unknown token)", async () => {
    state.campaignInvitesResult = { data: null, error: null };
    const result = await detectInviteState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.not_found when campaign join is null (orphaned invite)", async () => {
    state.campaignInvitesResult = {
      data: makeInviteRow({ campaigns: null }),
      error: null,
    };
    const result = await detectInviteState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.accepted when invite.status is 'accepted'", async () => {
    state.campaignInvitesResult = {
      data: makeInviteRow({ status: "accepted" }),
      error: null,
    };
    const result = await detectInviteState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "accepted" });
  });

  it("returns invalid.expired when invite.status is 'expired' (explicitly marked)", async () => {
    state.campaignInvitesResult = {
      data: makeInviteRow({ status: "expired" }),
      error: null,
    };
    const result = await detectInviteState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "expired" });
  });

  it("returns invalid.expired when expires_at < NOW() but status is still 'pending' (unswept)", async () => {
    state.campaignInvitesResult = {
      data: makeInviteRow({
        status: "pending",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
      error: null,
    };
    const result = await detectInviteState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "expired" });
  });
});

describe("detectInviteState — guest state", () => {
  it("returns guest + invite when token is valid and no auth user", async () => {
    state.campaignInvitesResult = { data: makeInviteRow(), error: null };
    state.authUser = null;

    const result = await detectInviteState(TOKEN);

    expect(result.state).toBe("guest");
    if (result.state !== "guest") throw new Error("expected guest");
    expect(result.invite).toMatchObject({
      id: INVITE_ID,
      campaignId: CAMPAIGN_ID,
      campaignName: "Phandelver",
      dmName: "Dani",
      email: "maria@example.com",
      status: "pending",
    });
  });

  it("falls back to email when DM display_name is null", async () => {
    state.campaignInvitesResult = {
      data: makeInviteRow({
        campaigns: {
          name: "Phandelver",
          users: { display_name: null, email: "dani@example.com" },
        },
      }),
      error: null,
    };

    const result = await detectInviteState(TOKEN);

    if (result.state !== "guest") throw new Error("expected guest");
    expect(result.invite.dmName).toBe("dani@example.com");
  });
});

describe("detectInviteState — auth state (no display_name)", () => {
  it("returns auth + user when auth user has no display_name in public.users", async () => {
    state.campaignInvitesResult = { data: makeInviteRow(), error: null };
    state.authUser = makeAuthUser();
    state.usersResult = { data: { display_name: null }, error: null };

    const result = await detectInviteState(TOKEN);

    expect(result.state).toBe("auth");
    if (result.state !== "auth") throw new Error("expected auth");
    expect(result.user.id).toBe(USER_ID);
    expect(result.invite.campaignId).toBe(CAMPAIGN_ID);
  });

  it("returns auth + user when public.users row is missing entirely", async () => {
    state.campaignInvitesResult = { data: makeInviteRow(), error: null };
    state.authUser = makeAuthUser();
    state.usersResult = { data: null, error: null };

    const result = await detectInviteState(TOKEN);

    expect(result.state).toBe("auth");
  });

  it("returns auth (not auth-with-invite-pending) when display_name is empty whitespace", async () => {
    state.campaignInvitesResult = { data: makeInviteRow(), error: null };
    state.authUser = makeAuthUser();
    state.usersResult = { data: { display_name: "   " }, error: null };

    const result = await detectInviteState(TOKEN);

    expect(result.state).toBe("auth");
  });
});

describe("detectInviteState — auth-with-invite-pending state", () => {
  it("returns auth-with-invite-pending + displayName when user has display_name", async () => {
    state.campaignInvitesResult = { data: makeInviteRow(), error: null };
    state.authUser = makeAuthUser();
    state.usersResult = { data: { display_name: "Lucas" }, error: null };

    const result = await detectInviteState(TOKEN);

    expect(result.state).toBe("auth-with-invite-pending");
    if (result.state !== "auth-with-invite-pending") {
      throw new Error("expected auth-with-invite-pending");
    }
    expect(result.displayName).toBe("Lucas");
    expect(result.user.id).toBe(USER_ID);
    expect(result.invite.campaignName).toBe("Phandelver");
  });
});
